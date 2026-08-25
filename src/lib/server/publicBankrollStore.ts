import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

// ---------------------------------------------------------------------------
// Public Bankroll profiles - server-side store + public payload computation.
//
// A profile publishes ONE bankroll's settled performance at /bankroll/<slug>.
// Only aggregate stats + settled bet rows ever leave this module: no user ids,
// no notes, no pending bets, no bankroll balances.
// ---------------------------------------------------------------------------

const globalStore = globalThis as unknown as { __propprPublicBankrollClient?: MongoClient };

function readEnvFile(path: string): Record<string, string> {
    try {
        const text = fs.readFileSync(path, "utf8");
        const env: Record<string, string> = {};
        for (const line of text.split("\n")) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
            if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
        }
        return env;
    } catch {
        return {};
    }
}

function getMongoConfig() {
    const serverEnv = readEnvFile("/opt/PROPPR/.env");
    const localEnv1 = readEnvFile(".env.local");
    const localEnv2 = readEnvFile(".env");
    const env = { ...serverEnv, ...localEnv2, ...localEnv1, ...process.env };
    return {
        uri:
            env.MONGODB_URI_OVERRIDE ||
            env.MONGO_CONNECTION_STRING ||
            env.MONGODB_CONNECTION_STRING ||
            env.MONGODB_URI_PRODUCTION ||
            env.MONGODB_URI_DEVELOPMENT ||
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprPublicBankroll&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getClient() {
    const { uri } = getMongoConfig();
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached
    // forever (that outage silently emptied the "Original message" box everywhere).
    return getPooledMongoClient("public-bankroll", uri);
}

async function profilesCol() {
    const client = await getClient();
    const { dbName } = getMongoConfig();
    const col = client.db(dbName).collection("public_bankroll_profiles");
    // Idempotent; slug is the public identity so it must be globally unique.
    await col.createIndex({ slug: 1 }, { unique: true }).catch(() => {});
    await col.createIndex({ user_id: 1 }).catch(() => {});
    return col;
}

function normalizeUserId(value: string | number | null | undefined) {
    if (value === undefined || value === null || value === "") return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? String(value) : numeric;
}

export function sanitizeSlug(raw: string): string {
    return String(raw || "")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}

export const DEFAULT_TOGGLES = {
    summary: true,
    equityCurve: true,
    monthlyResults: true,
    recentBets: true,
    marketBreakdown: true,
    showStakes: true,
    showClv: true,
    // Settled bets only by default - pending/open bets stay private unless the owner opts in.
    settledOnly: true,
};

export type ProfileDoc = {
    user_id: string | number;
    bankroll_id: string;
    slug: string;
    name: string;
    bio: string;
    public: boolean;
    toggles: typeof DEFAULT_TOGGLES;
    links: { telegram?: string; x?: string; website?: string };
    cta: { text?: string; url?: string };
    created_at: Date;
    updated_at: Date;
};

// ------------------------- management (owner) API --------------------------

export async function listProfiles(userId: string | number) {
    const col = await profilesCol();
    const uid = normalizeUserId(userId);
    return col
        .find({ $or: [{ user_id: uid }, { user_id: String(userId) }] }, { projection: { _id: 0 } })
        .sort({ created_at: 1 })
        .toArray();
}

export async function upsertProfile(userId: string | number, input: Partial<ProfileDoc> & { slug: string }) {
    const col = await profilesCol();
    const uid = normalizeUserId(userId);
    const slug = sanitizeSlug(input.slug);
    if (!slug || slug.length < 3) return { error: "Slug must be at least 3 characters (a-z, 0-9, hyphens)." };

    // Slug collision with ANOTHER user's (or another of this user's) profile?
    const existing = await col.findOne({ slug });
    const ownedByUser = existing && (String(existing.user_id) === String(uid));
    if (existing && !ownedByUser) return { error: "That URL is already taken - pick another slug." };

    const now = new Date();
    // How amounts render on the public page/card: bankroll's own setting, abstract units, or a currency.
    const displayUnit = ["default", "u", "GBP", "USD", "EUR"].includes(String((input as any).display_unit))
        ? String((input as any).display_unit) : "default";
    const doc = {
        user_id: uid,
        bankroll_id: String(input.bankroll_id || "personal"),
        slug,
        name: String(input.name || "").slice(0, 60) || "My Bankroll",
        bio: String(input.bio || "").slice(0, 300),
        public: Boolean(input.public),
        display_unit: displayUnit,
        toggles: { ...DEFAULT_TOGGLES, ...(input.toggles || {}) },
        links: {
            telegram: String(input.links?.telegram || "").slice(0, 200),
            x: String(input.links?.x || "").slice(0, 200),
            website: String(input.links?.website || "").slice(0, 200),
        },
        cta: {
            text: String(input.cta?.text || "").slice(0, 40),
            url: String(input.cta?.url || "").slice(0, 200),
        },
        updated_at: now,
    };
    await col.updateOne({ slug }, { $set: doc, $setOnInsert: { created_at: now } }, { upsert: true });
    return { ok: true, slug };
}

export async function deleteProfile(userId: string | number, slug: string) {
    const col = await profilesCol();
    const uid = normalizeUserId(userId);
    const r = await col.deleteOne({ slug: sanitizeSlug(slug), $or: [{ user_id: uid }, { user_id: String(userId) }] });
    return { ok: r.deletedCount > 0 };
}

// ---------------------------- public payload -------------------------------

function num(...values: any[]) {
    for (const v of values) {
        if (v === null || v === undefined || v === "") continue;
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return 0;
}

function statusOf(bet: any) {
    return String(bet?.status || bet?.result || "pending").toLowerCase().replace(/\s+/g, "_");
}

const SETTLED = new Set(["won", "lost", "push", "void", "refund", "refunded", "half_win", "half_loss", "cashout", "cashed_out"]);

function isWin(bet: any) {
    return ["won", "half_win", "cashout", "cashed_out"].includes(statusOf(bet)) && profitOf(bet) > 0;
}
function isLoss(bet: any) {
    const s = statusOf(bet);
    return s === "lost" || s === "half_loss";
}

function profitOf(bet: any) {
    const explicit = num(bet.profit_loss, bet.profit, bet.pnl, bet.net_profit);
    if (explicit !== 0) return explicit;
    const stake = num(bet.units_staked, bet.actual_stake, bet.stake);
    const odds = num(bet.odds, bet.decimal_odds);
    const s = statusOf(bet);
    if (s === "won") return stake * Math.max(odds - 1, 0);
    if (s === "lost") return -stake;
    if (s === "half_win") return (stake * Math.max(odds - 1, 0)) / 2;
    if (s === "half_loss") return -stake / 2;
    return 0;
}

function betDate(bet: any): Date | null {
    // kickoff_utc is the canonical instant - beats wall-clock reconstruction when present.
    const ku = bet?.kickoff_utc || bet?.kickoffUtc;
    if (ku) {
        const d = new Date(ku);
        if (!Number.isNaN(d.getTime())) return d;
    }
    const raw = bet.date?.$date || bet.date || bet.event_date || bet.tracked_at?.$date || bet.tracked_at || bet.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

// Day anchoring: kickoff_utc bets bucket by the bankroll timezone's calendar day; legacy
// wall-clock bets keep their stored day (UTC slice of a date-only string IS the stored day).
function betDayKey(bet: any, date: Date, tz?: string | null): string {
    const ku = bet?.kickoff_utc || bet?.kickoffUtc;
    if (ku && tz) {
        try {
            const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
            const o = Object.fromEntries(parts.map((p) => [p.type, p.value]));
            return `${o.year}-${o.month}-${o.day}`;
        } catch { /* fall through */ }
    }
    return date.toISOString().slice(0, 10);
}

function inBankroll(bet: any, bankrollId: string, knownIds: Set<string>) {
    const bid = bet?.bankroll_id === undefined || bet?.bankroll_id === null ? "" : String(bet.bankroll_id);
    if (bid && bid === bankrollId) return true;
    const orphaned = !bid || (knownIds.size > 0 && !knownIds.has(bid));
    return orphaned && bankrollId === "personal";
}

export async function getProfileMeta(slug: string) {
    const col = await profilesCol();
    return col.findOne({ slug: sanitizeSlug(slug) }, { projection: { _id: 0, name: 1, bio: 1, public: 1 } });
}

function publicBetRow({ bet, date }: any, tz?: string | null) {
    const ku = bet?.kickoff_utc || bet?.kickoffUtc;
    let timeStr = String(bet.time || "");
    if (ku && date && tz) {
        try {
            timeStr = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
        } catch { /* keep stored time */ }
    }
    return {
        date: date ? betDayKey(bet, date, tz) : null,
        time: timeStr,
        match: String(bet.match || bet.fixture_name || bet.searchEvent || "").slice(0, 80),
        selection: String(bet.selection || "").slice(0, 80),
        market: String(bet.market || "").slice(0, 50),
        odds: num(bet.odds, bet.decimal_odds) || null,
        stake: num(bet.units_staked, bet.actual_stake, bet.stake) || null,
        profit: Number(profitOf(bet).toFixed(2)),
        status: statusOf(bet),
    };
}

async function loadScopedBets(profile: any) {
    const client = await getClient();
    const { dbName } = getMongoConfig();
    const betsCol = client.db(dbName).collection("user_tracked_bets");
    const uid = normalizeUserId(profile.user_id);
    const docs = await betsCol
        .find(
            { $or: [{ user_id: uid }, { user_id: String(profile.user_id) }, { linked_app_user_id: String(profile.user_id) }] },
            { projection: { _id: 0, bets: 1, bankrolls: 1, created_at: 1 } }
        )
        .sort({ created_at: 1 })
        .toArray();
    const allBets = docs.flatMap((d: any) => (Array.isArray(d.bets) ? d.bets : []));
    const bankrolls: any[] = Array.isArray(docs[0]?.bankrolls) ? docs[0].bankrolls : [];
    const knownIds = new Set<string>(bankrolls.map((b: any) => String(b.id)));
    return {
        scoped: allBets.filter((b: any) => inBankroll(b, String(profile.bankroll_id), knownIds)),
        bankrolls,
    };
}

// Flat-stake lens (same as /track/analytics): every bet re-priced to a 1u stake with
// per-unit P/L, so a few big stakes can't distort the record. Presentation-only.
function flattenStakes(entries: { bet: any; date: Date | null }[]) {
    return entries.map(({ bet, date }) => {
        const stake = num(bet.units_staked, bet.actual_stake, bet.stake);
        const pl = profitOf(bet);
        return {
            date,
            bet: {
                ...bet,
                units_staked: 1, actual_stake: 1, stake: 1,
                profit_loss: stake ? Number((pl / stake).toFixed(4)) : 0,
                profit: null, pnl: null, net_profit: null,
                returns: null, return_amount: null, total_returns: null,
            },
        };
    });
}

// Full settled-bet history, newest first, for the public page's paginated table.
export async function getPublicBetsPage(slug: string, page: number, pageSize: number, flat = false) {
    const col = await profilesCol();
    const profile = await col.findOne({ slug: sanitizeSlug(slug) });
    if (!profile || !profile.public) return null;
    const safeSize = Math.min(50, Math.max(5, pageSize || 12));
    const { scoped, bankrolls: pageBankrolls } = await loadScopedBets(profile);
    const pageBankroll = pageBankrolls.find((b: any) => String(b.id) === String(profile.bankroll_id)) || null;
    let settled = scoped
        .filter((b: any) => SETTLED.has(statusOf(b)))
        .map((b: any) => ({ bet: b, date: betDate(b) }))
        .filter((x: any) => x.date)
        .sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
    if (flat) settled = flattenStakes(settled);
    const total = settled.length;
    const safePage = Math.max(1, Math.min(page || 1, Math.max(1, Math.ceil(total / safeSize))));
    const rows = settled.slice((safePage - 1) * safeSize, safePage * safeSize).map((e: any) => publicBetRow(e, pageBankroll?.timezone));
    return { bets: rows, total, page: safePage, pageSize: safeSize, flat };
}

export async function getPublicPayload(slug: string, flat = false) {
    const col = await profilesCol();
    const profile = await col.findOne({ slug: sanitizeSlug(slug) });
    if (!profile || !profile.public) return null;

    const client = await getClient();
    const { dbName } = getMongoConfig();
    const betsCol = client.db(dbName).collection("user_tracked_bets");
    const uid = normalizeUserId(profile.user_id);
    const docs = await betsCol
        .find(
            { $or: [{ user_id: uid }, { user_id: String(profile.user_id) }, { linked_app_user_id: String(profile.user_id) }] },
            { projection: { _id: 0, bets: 1, bankrolls: 1, created_at: 1 } }
        )
        .sort({ created_at: 1 })
        .toArray();
    const allBets = docs.flatMap((d: any) => (Array.isArray(d.bets) ? d.bets : []));
    const bankrolls: any[] = Array.isArray(docs[0]?.bankrolls) ? docs[0].bankrolls : [];
    const knownIds = new Set<string>(bankrolls.map((b: any) => String(b.id)));
    const bankroll = bankrolls.find((b: any) => String(b.id) === String(profile.bankroll_id)) || null;

    const scoped = allBets.filter((b: any) => inBankroll(b, String(profile.bankroll_id), knownIds));
    let settled = scoped
        .filter((b: any) => SETTLED.has(statusOf(b)))
        .map((b: any) => ({ bet: b, date: betDate(b) }))
        .filter((x: any) => x.date)
        .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
    if (flat) settled = flattenStakes(settled);

    // Aggregate stats
    let staked = 0, profit = 0, wins = 0, losses = 0, pushes = 0, oddsSum = 0, oddsCount = 0, clvSum = 0, clvCount = 0;
    const curve: { date: string; profit: number }[] = [];
    const monthly = new Map<string, number>();
    // Per-day P/L for the public page's daily profit calendar (mirrors /track/analytics).
    const daily = new Map<string, { profit: number; bets: number }>();
    let cumulative = 0;
    for (const { bet, date } of settled) {
        const stake = num(bet.units_staked, bet.actual_stake, bet.stake);
        const pl = profitOf(bet);
        staked += stake;
        profit += pl;
        cumulative += pl;
        if (isWin(bet)) wins += 1;
        else if (isLoss(bet)) losses += 1;
        else pushes += 1;
        const odds = num(bet.odds, bet.decimal_odds);
        if (odds > 1) { oddsSum += odds; oddsCount += 1; }
        const clo = num(bet.closing_line_odds, bet.closingLineOdds);
        if (odds > 1 && clo > 1) { clvSum += odds / clo - 1; clvCount += 1; }
        const dayKey = betDayKey(bet, date!, bankroll?.timezone);
        curve.push({ date: dayKey, profit: Number(cumulative.toFixed(2)) });
        const mk = new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
        monthly.set(mk, Number(((monthly.get(mk) || 0) + pl).toFixed(2)));
        const day = daily.get(dayKey) || { profit: 0, bets: 0 };
        day.profit = Number((day.profit + pl).toFixed(2));
        day.bets += 1;
        daily.set(dayKey, day);
    }

    // Market breakdown (top 8 by bets)
    const markets = new Map<string, { market: string; bets: number; staked: number; profit: number; wins: number; losses: number }>();
    for (const { bet } of settled) {
        const m = String(bet.market || "Unknown").trim() || "Unknown";
        const item = markets.get(m) || { market: m, bets: 0, staked: 0, profit: 0, wins: 0, losses: 0 };
        item.bets += 1;
        item.staked += num(bet.units_staked, bet.actual_stake, bet.stake);
        item.profit += profitOf(bet);
        if (isWin(bet)) item.wins += 1;
        if (isLoss(bet)) item.losses += 1;
        markets.set(m, item);
    }
    const marketRows = Array.from(markets.values())
        .sort((a, b) => b.bets - a.bets)
        .slice(0, 8)
        .map((m) => ({
            market: m.market,
            bets: m.bets,
            profit: Number(m.profit.toFixed(2)),
            roi: m.staked ? Number(((m.profit / m.staked) * 100).toFixed(1)) : 0,
            winRate: m.wins + m.losses ? Number(((m.wins / (m.wins + m.losses)) * 100).toFixed(1)) : 0,
        }));

    // Latest settled bets (most recent first)
    const recent = settled
        .slice(-12)
        .reverse()
        .map((entry: any) => publicBetRow(entry, bankroll?.timezone));

    // Pending/open bets are OPT-IN (settledOnly=false). Off by default: an open bet is a live
    // position - never publish it unless the owner explicitly chooses to.
    const toggles = { ...DEFAULT_TOGGLES, ...(profile.toggles || {}) };
    let pending: any[] = [];
    if (toggles.settledOnly === false) {
        pending = scoped
            .filter((b: any) => !SETTLED.has(statusOf(b)))
            .map((b: any) => ({ bet: b, date: betDate(b) }))
            .sort((a: any, b: any) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
            .slice(0, 12)
            .map(({ bet, date }: any) => ({
                date: date ? date.toISOString().slice(0, 10) : null,
                time: String(bet.time || ""),
                match: String(bet.match || bet.fixture_name || bet.searchEvent || "").slice(0, 80),
                selection: String(bet.selection || "").slice(0, 80),
                market: String(bet.market || "").slice(0, 50),
                odds: num(bet.odds, bet.decimal_odds) || null,
                stake: num(bet.units_staked, bet.actual_stake, bet.stake) || null,
            }));
    }

    return {
        name: profile.name,
        bio: profile.bio,
        slug: profile.slug,
        toggles,
        links: profile.links || {},
        cta: profile.cta || {},
        bankroll: (() => {
            const base = bankroll
                ? { name: bankroll.name || "Bankroll", type: bankroll.type || "units", currency: bankroll.currency || "u" }
                : { name: "Personal", type: "units", currency: "u" };
            // Flat-stake mode always reads in units - every bet is exactly 1u.
            if (flat) return { ...base, type: "units", currency: "u" };
            // Owner's display override: same numbers, different presentation (u / £ / $ / €).
            const du = String(profile.display_unit || "default");
            if (du === "u") return { ...base, type: "units", currency: "u" };
            if (["GBP", "USD", "EUR"].includes(du)) return { ...base, type: "currency", currency: du };
            return base;
        })(),
        flat,
        stats: {
            totalBets: settled.length,
            staked: Number(staked.toFixed(2)),
            profit: Number(profit.toFixed(2)),
            roi: staked ? Number(((profit / staked) * 100).toFixed(2)) : 0,
            winRate: wins + losses ? Number(((wins / (wins + losses)) * 100).toFixed(1)) : 0,
            wins, losses, pushes,
            avgOdds: oddsCount ? Number((oddsSum / oddsCount).toFixed(2)) : 0,
            avgClv: clvCount ? Number(((clvSum / clvCount) * 100).toFixed(2)) : null,
            firstDate: settled.length ? settled[0].date!.toISOString().slice(0, 10) : null,
            lastDate: settled.length ? settled[settled.length - 1].date!.toISOString().slice(0, 10) : null,
        },
        curve,
        monthly: Array.from(monthly.entries()).map(([month, p]) => ({ month, profit: p })),
        daily: Array.from(daily.entries()).map(([date, d]) => ({ date, profit: d.profit, bets: d.bets })),
        markets: marketRows,
        recent,
        pending,
    };
}
