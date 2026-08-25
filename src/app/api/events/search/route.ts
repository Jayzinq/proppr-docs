import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventSuggestion = {
    id: string;
    searchEvent: string;
    home: string;
    away: string;
    date: string;
    time: string;
    country: string;
    league: string;
    leagueSlug: string;
    sport: string;
    source: string;
    aliases: string[];
    score?: number;
    kickoffUtc?: string;
};

type CacheState = {
    loadedAt: number;
    items: EventSuggestion[];
    loading?: Promise<EventSuggestion[]>;
};

// Odds feeds title qualifier ties with a stale placeholder segment even after the slot
// resolves - "Winner Europa / Shkendija" is just Shkendija. Adopting that name verbatim
// puts a phantom team on the bet and breaks every name-based grading search downstream,
// so strip the placeholder half (keep the real team on the other side of the slash).
function stripPlaceholderTeam(name: string): string {
    const raw = String(name || "").trim();
    if (!raw || !/\b(winner|loser)s?\b/i.test(raw)) return raw;
    const cleaned = raw
        .replace(/^\s*(?:winner|loser)s?\b[^/]*\/\s*/i, "")
        .replace(/\s*\/\s*(?:winner|loser)s?\b[^/]*$/i, "")
        .trim();
    return cleaned || raw;
}

function stripPlaceholderNames(s: EventSuggestion): EventSuggestion {
    const home = stripPlaceholderTeam(s.home);
    const away = stripPlaceholderTeam(s.away);
    if (home === s.home && away === s.away) return s;
    return { ...s, home, away, searchEvent: `${home} vs ${away}` };
}

const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ITEMS = 50_000;

const globalForEvents = globalThis as typeof globalThis & {
    __propprEventSearchCache?: CacheState;
    __propprMongoClient?: MongoClient;
};

const cache: CacheState = globalForEvents.__propprEventSearchCache ?? {
    loadedAt: 0,
    items: [],
};
globalForEvents.__propprEventSearchCache = cache;

function readEnvFile(filePath: string): Record<string, string> {
    try {
        const content = fs.readFileSync(filePath, "utf8");
        return Object.fromEntries(
            content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith("#") && line.includes("="))
                .map((line) => {
                    const idx = line.indexOf("=");
                    const key = line.slice(0, idx).trim();
                    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
                    return [key, value];
                })
        );
    } catch {
        return {};
    }
}

function getMongoConfig() {
    const serverEnv = readEnvFile("/opt/PROPPR/.env");
    const localEnv1 = readEnvFile(".env.local") || {};
    const localEnv2 = readEnvFile(".env") || {};
    const env = { ...serverEnv, ...localEnv2, ...localEnv1, ...process.env };

    return {
        uri:
            env.MONGODB_URI_OVERRIDE ||
            env.MONGO_CONNECTION_STRING ||
            env.MONGODB_CONNECTION_STRING ||
            env.MONGODB_URI_PRODUCTION ||
            env.MONGODB_URI_DEVELOPMENT ||
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprDocsEventSearch&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getMongoClient() {
    const { uri } = getMongoConfig();
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached
    // forever (that outage silently emptied the "Original message" box everywhere).
    return getPooledMongoClient("events-search", uri);
}

/** Parse event date+time into epoch ms. time may be "HH:mm" or "HH:mm:ss". */
function eventDateTimeMs(dateStr: string, timeStr?: string): number {
    const d = String(dateStr || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return NaN;
    let t = String(timeStr || "00:00").trim();
    // Avoid "16:00:00:00Z" which Date.parse treats as invalid
    if (/^\d{1,2}:\d{2}$/.test(t)) t = `${t}:00`;
    else if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
        // already ok
    } else if (!t) t = "00:00:00";
    return Date.parse(`${d}T${t}Z`);
}

const DEFAULT_EVENT_TZ = "Europe/London";

function isValidTz(tz: string): boolean {
    try {
        new Intl.DateTimeFormat("en-GB", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

function tzOffsetMs(tz: string, at: Date): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(at);
    const o = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const asUtc = Date.parse(`${o.year}-${o.month}-${o.day}T${o.hour === "24" ? "00" : o.hour}:${o.minute}:${o.second}Z`);
    return asUtc - at.getTime();
}

// Response-boundary time handling (the shared event cache stays single-timezone so concurrent
// requests with different tz values can't poison it):
//  - every item with a real kickoff gains `kickoffUtc`, the TRUE instant - the canonical value
//    the client stores on bets (display layers render it in the bankroll timezone);
//  - with ?tz= (the bankroll's timezone), date/time are ALSO re-expressed in that zone for display.
// time "00:00" is the known midnight placeholder (no real kickoff) - no instant exists, and
// shifting it would move the DATE, so those pass through untouched.
function shiftEventsTz<T extends { date?: string; time?: string }>(items: T[], tz: string | null): T[] {
    const shiftDisplay = Boolean(tz && tz !== DEFAULT_EVENT_TZ && isValidTz(tz));
    return items.map((item) => {
        const { date, time } = item;
        // time format doubles as the timezone marker: formatDateParts paths emit London "HH:MM";
        // the past_alerts passthrough keeps the alert stores' raw UTC "HH:MM:SS".
        if (!date || !time || time.startsWith("00:00") || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) return item;
        const naive = Date.parse(`${date}T${time.slice(0, 5)}:00Z`);
        if (Number.isNaN(naive)) return item;
        let utc = naive;
        if (time.length === 5) {
            // London wall-clock -> instant, two-pass for DST boundaries.
            utc = naive - tzOffsetMs(DEFAULT_EVENT_TZ, new Date(naive));
            utc = naive - tzOffsetMs(DEFAULT_EVENT_TZ, new Date(utc));
        }
        const out: T & { kickoffUtc?: string } = { ...item, kickoffUtc: new Date(utc).toISOString() };
        if (shiftDisplay) Object.assign(out, formatDateParts(new Date(utc), tz as string));
        return out;
    });
}

function formatDateParts(value: unknown, tz: string = DEFAULT_EVENT_TZ) {
    const date = value instanceof Date ? value : new Date(String(value || ""));
    if (Number.isNaN(date.getTime())) {
        return { date: "", time: "" };
    }
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
        date: `${byType.year}-${byType.month}-${byType.day}`,
        time: `${byType.hour}:${byType.minute}`,
    };
}

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function normalizeSport(value: unknown) {
    const raw = String(value || "").trim();
    const key = normalizeText(raw).replace(/\s+/g, " ");
    const aliases: Record<string, string> = {
        soccer: "Football",
        football: "Football",
        tennis: "Tennis",
        basketball: "Basketball",
        bkfibaqeu: "Basketball",
        bkfibaqaf: "Basketball",
        bkfibaqam: "Basketball",
        bkfibaqas: "Basketball",
        baseball: "Baseball",
        esports: "Esports",
        esport: "Esports",
        "e sports": "Esports",
        cricket: "Cricket",
        mma: "MMA",
        "ufc mma": "MMA",
        ufc: "MMA",
        hockey: "Ice Hockey",
        "ice hockey": "Ice Hockey",
        "american football": "American Football",
        nfl: "American Football",
        cfl: "American Football",
        lacrosse: "Lacrosse",
        "table tennis": "Table Tennis",
        mlp: "Esports",
    };
    if (aliases[key]) return aliases[key];
    return raw ? raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}

// Infer the sport from a competition name when it names a sport-UNIQUE league. ITF/ATP/WTA are
// Tennis, NBA/FIBA Basketball, etc. Deliberately does NOT infer Football: many feeds DEFAULT an
// unknown fixture's sport to "football" (an ITF tennis match arrives tagged football), so a
// generic football label must never win - only a positive non-football signal corrects it.
function leagueImpliedSport(s: EventSuggestion): string {
    const t = normalizeText(`${s.league || ""} ${s.leagueSlug || ""} ${s.country || ""}`);
    if (/\b(itf|atp|wta|tennis|challenger)\b/.test(t)) return "Tennis";
    if (/\b(nba|wnba|euroleague|fiba|basketball|ncaab)\b/.test(t)) return "Basketball";
    if (/\b(mlb|baseball|npb|kbo)\b/.test(t)) return "Baseball";
    if (/\b(nfl|cfl|american football|ncaaf)\b/.test(t)) return "American Football";
    if (/\b(nhl|ice hockey|hockey|khl)\b/.test(t)) return "Ice Hockey";
    if (/\b(cricket|t20|odi|ipl|psl)\b/.test(t)) return "Cricket";
    if (/\b(ufc|mma|bellator|pfl)\b/.test(t)) return "MMA";
    if (/\b(valorant|cs2|csgo|counter strike|dota|lol|league of legends|esports?|rainbow six|overwatch|starcraft|mobile legends|king of glory|call of duty|cod|rocket league)\b/.test(t)) return "Esports";
    if (/\b(pdc|darts)\b/.test(t)) return "Darts";
    if (/\b(snooker)\b/.test(t)) return "Snooker";
    if (/\b(handball|ehf)\b/.test(t)) return "Handball";
    if (/\b(table tennis|tt cup|setka)\b/.test(t)) return "Table Tennis";
    if (/\b(volleyball|cev)\b/.test(t)) return "Volleyball";
    if (/\b(rugby)\b/.test(t)) return "Rugby";
    return "";
}

// A stated sport is only trustworthy if it's a RECOGNISED sport. Some feeds stuff the league name
// into the sport field ("ITF Kursumlijska Banja"), which normalizeSport would happily titlecase
// into a fake sport and pollute the dedup grouping - reject anything not in this set.
const KNOWN_SPORTS = new Set([
    "Football", "Tennis", "Basketball", "Baseball", "Esports", "Cricket", "MMA", "Ice Hockey",
    "American Football", "Lacrosse", "Table Tennis", "Darts", "Snooker", "Handball", "Volleyball", "Rugby",
]);
function canonicalSport(raw: unknown): string {
    const s = normalizeSport(raw);
    return KNOWN_SPORTS.has(s) ? s : "";
}

// The sport we TRUST for a suggestion: a sport-unique league beats the stated (often defaulted or
// league-polluted) sport field, so a football-labelled ITF fixture reads as Tennis.
function effectiveSport(s: EventSuggestion): string {
    return leagueImpliedSport(s) || canonicalSport(s.sport);
}

// Metadata richness EXCLUDING sport (sport is corrected separately): pick the record with the
// fullest league/slug/country so the survivor keeps "ITF Men Kursumlijska Banja - SF" over "SF".
function metaRichness(s: EventSuggestion): number {
    let r = 0;
    if (s.league) r += 100 + Math.min(String(s.league).length, 60);
    if (s.leagueSlug) r += 50;
    if (s.country) r += 25;
    if (s.time && s.time !== "00:00") r += 10;
    return r;
}

// Club designators that vary between feeds ("Inter Miami" vs "Inter Miami CF"). Excludes
// women/reserve markers ("women", "w") on purpose - those DISTINGUISH fixtures and must never be
// stripped, or a women's match would merge into the men's.
const DEDUP_SUFFIX_TOKENS = new Set(["afc", "cf", "fc", "sc", "ec", "club", "clube", "rj"]);
const SAME_EVENT_TOL_MS = 6 * 60 * 60 * 1000;

// Stamp the trustworthy sport on a survivor: corrects a lone row whose sport field holds a league
// name ("ITF Kursumlijska Banja") or a defaulted "football" on an ITF tennis match.
function finalizeSuggestion(s: EventSuggestion): EventSuggestion {
    const eff = effectiveSport(s);
    return eff && eff !== normalizeSport(s.sport) ? { ...s, sport: eff } : s;
}

// Collapse rows that are the SAME meeting into one: keep the richest league metadata but stamp the
// corrected league-implied sport. A cluster spanning 2+ genuinely different effective sports
// (impossible for identical participants at the same time) is left intact rather than force-merged.
function collapseCluster(cluster: EventSuggestion[]): EventSuggestion[] {
    if (cluster.length === 1) return [finalizeSuggestion(cluster[0])];
    const effSports = new Set(cluster.map(effectiveSport).filter(Boolean));
    if (effSports.size > 1) return cluster.map(finalizeSuggestion);
    const groupSport = effSports.size === 1 ? [...effSports][0] : "";
    const base = cluster.reduce((best, cur) => (metaRichness(cur) > metaRichness(best) ? cur : best));
    return [groupSport ? { ...base, sport: groupSport } : finalizeSuggestion(base)];
}

function dedupeSameEvent(items: EventSuggestion[]): EventSuggestion[] {
    // The same fixture arrives from multiple sources that disagree on participant ORDER ("A vs B" /
    // "B vs A"), name FORMAT ("Coria, Alden"), club SUFFIX ("Inter Miami CF"), kickoff TIME, the
    // calendar DATE when a kickoff straddles midnight in different feed timezones (23:30 vs 00:30),
    // and the SPORT (one "Tennis", others defaulted to "football"). Group by an order-independent,
    // suffix-stripped team-token key; within each group split into distinct MEETINGS by time
    // proximity (same date OR within 6h), so the midnight-split collapses but a real next-day
    // rematch stays separate; then collapse each meeting to one richest, correctly-sported row.
    // Input order (score-sorted) is preserved.
    const groups = new Map<string, EventSuggestion[]>();
    const order: string[] = [];
    for (const item of items) {
        const teamKey = Array.from(
            new Set(
                normalizeText(`${item.home} ${item.away}`)
                    .split(" ")
                    .filter((t) => t.length >= 2 && !DEDUP_SUFFIX_TOKENS.has(t))
            )
        ).sort().join(" ");
        if (!groups.has(teamKey)) {
            groups.set(teamKey, []);
            order.push(teamKey);
        }
        groups.get(teamKey)!.push(item);
    }
    const out: EventSuggestion[] = [];
    for (const teamKey of order) {
        const group = groups.get(teamKey)!;
        if (group.length === 1) {
            out.push(finalizeSuggestion(group[0]));
            continue;
        }
        const sorted = group
            .map((g) => ({ g, ts: eventDateTimeMs(g.date, g.time), d: String(g.date || "").slice(0, 10) }))
            .sort((a, b) => (Number.isNaN(a.ts) ? Infinity : a.ts) - (Number.isNaN(b.ts) ? Infinity : b.ts));
        const clusters: EventSuggestion[][] = [];
        let lastTs = NaN;
        let lastD = "";
        for (const { g, ts, d } of sorted) {
            const bridge =
                clusters.length > 0 &&
                ((d && d === lastD) ||
                    (!Number.isNaN(ts) && !Number.isNaN(lastTs) && Math.abs(ts - lastTs) <= SAME_EVENT_TOL_MS));
            if (bridge) clusters[clusters.length - 1].push(g);
            else clusters.push([g]);
            if (!Number.isNaN(ts)) lastTs = ts;
            if (d) lastD = d;
        }
        for (const cluster of clusters) out.push(...collapseCluster(cluster));
    }
    return out;
}

const FIXTURE_CONNECTOR_TOKENS = new Set(["v", "vs"]);
const TEAM_SUFFIX_TOKENS = new Set([
    "afc",
    "cf",
    "club",
    "clube",
    "ec",
    "fc",
    "rj",
    "sc",
    "women",
    "w",
]);

function queryTokens(value: string) {
    const rawTokens = normalizeText(value).split(" ").filter(Boolean);
    const meaningful = rawTokens.filter((token) => !FIXTURE_CONNECTOR_TOKENS.has(token) && !TEAM_SUFFIX_TOKENS.has(token));
    return meaningful.length ? meaningful : rawTokens.filter((token) => !FIXTURE_CONNECTOR_TOKENS.has(token));
}

function addAlias(target: Set<string>, value: unknown) {
    const alias = String(value || "").trim();
    if (alias) target.add(alias);
}

// eSoccer / eFootball games ("Norway (Logan) vs France (Vangogh)", eAdriatic / GT Sports
// League) share team names with real football but are a different sport. Without a gate,
// their many near-future rows crowd out the real fixture - and a real bet gets matched to
// an esports game (or vice-versa). We detect them from league/sport metadata plus the
// tell-tale gamer handle in parens.
function gamerHandleCount(text: unknown): number {
    const parens = String(text || "").match(/\(([^)]+)\)/g) || [];
    return parens.filter((p) => {
        const inner = p.slice(1, -1).trim();
        // A gamer handle is a SINGLE nickname token ("Logan", "Kostolom89", "mko1919").
        // Reject multi-word parens (multi-bet notation like "(vs AFC Wimbledon)") and real
        // qualifiers ((W), (U21), 2-3 letter region/country codes).
        if (/\s/.test(inner)) return false;
        if (/^(w|women|reserves?|youth|u-?\d+|[a-z]{2,3}|am|pm)$/i.test(inner)) return false;
        return /[a-z]/i.test(inner) && inner.length >= 3;
    }).length;
}
// Bare "FIFA" league = the video game (esoccer); real World Cup is "FIFA World Cup".
const ESOCCER_META_RE = /(^|\s)fifa(\s|$)(?!\s*world)|efootball|e-?soccer|e-?basket|e-?sports?|e-?adriatic|gt\s+(sports\s+)?league|gt\s+leagues|volta|esoccer\s+battle|\b(8|10|12)\s*min\b/;
function isEsoccerItem(item: EventSuggestion): boolean {
    const meta = `${item.sport || ""} ${item.league || ""} ${item.country || ""} ${item.leagueSlug || ""}`.toLowerCase();
    if (ESOCCER_META_RE.test(meta)) return true;
    // A handle on BOTH participants (real teams carry at most one paren qualifier).
    return gamerHandleCount(item.home) >= 1 && gamerHandleCount(item.away) >= 1;
}
function queryLooksEsoccer(query: string): boolean {
    return gamerHandleCount(query) >= 2 || /\b(esoccer|efootball|e-?sports?)\b/i.test(query);
}

function scoreEvent(query: string, item: EventSuggestion) {
    const q = normalizeText(query);
    if (!q) return 0;

    // Never cross real sport <-> eSoccer. A handle-carrying esports query only matches
    // esports fixtures; a plain real-fixture query never matches eSoccer.
    if (isEsoccerItem(item) !== queryLooksEsoccer(query)) return 0;

    const teams = normalizeText(`${item.home} ${item.away}`);
    const eventName = normalizeText(item.searchEvent);
    const metadata = normalizeText(`${item.league} ${item.country} ${item.leagueSlug} ${item.sport} ${item.aliases.join(" ")}`);
    const tokens = queryTokens(query);

    let score = 0;
    if (eventName === q) score += 180;
    if (teams === q) score += 140;
    if (tokens.length > 1 && teams.startsWith(q)) score += 100;
    if (tokens.length > 1 && eventName.includes(q)) score += 80;
    else if (normalizeText(item.home) === q || normalizeText(item.away) === q) score += 80;
    else if (normalizeText(item.home).startsWith(q) || normalizeText(item.away).startsWith(q)) score += 60;
    else if (metadata.includes(q)) score += 8;

    const home = normalizeText(item.home);
    const away = normalizeText(item.away);
    let matchedHome = false;
    let matchedAway = false;
    let unmatched = 0;
    for (const token of tokens) {
        if (home === token || away === token) {
            score += 90;
            if (home === token) matchedHome = true; else matchedAway = true;
        } else if (home.startsWith(token) || away.startsWith(token)) {
            score += 65;
            if (home.startsWith(token)) matchedHome = true; else matchedAway = true;
        } else if (home.includes(token) || away.includes(token)) {
            score += 30;
            if (home.includes(token)) matchedHome = true; else matchedAway = true;
        } else if (metadata.includes(token)) {
            score += 6;
        } else {
            // Unknown team token. A feed often abbreviates a sponsored club name - the slip
            // says "Nyasa Big Bullets FC" but the fixture is stored as "Big Bullets", so the
            // sponsor-prefix token "nyasa" hits nothing. Tolerate such stray tokens ONLY when
            // the query has otherwise identified BOTH teams of THIS fixture and the majority of
            // tokens matched - otherwise it's a genuine mismatch we must reject (this gate keeps
            // "EWC Dota 2 Winner" and other noise off unrelated real fixtures).
            unmatched += 1;
            score -= 15;
        }
    }
    if (unmatched > 0 && !(matchedHome && matchedAway && unmatched <= tokens.length - unmatched)) {
        return 0;
    }

    const eventTime = eventDateTimeMs(item.date, item.time);
    if (!Number.isNaN(eventTime)) {
        const daysAway = Math.max(0, (eventTime - Date.now()) / 86_400_000);
        score += Math.max(0, 120 - Math.min(daysAway * 5, 120));
    }
    // Prefer real kickoffs over Odds API midnight placeholders (00:00)
    const tNorm = String(item.time || "00:00").slice(0, 5);
    if (tNorm && tNorm !== "00:00") score += 30;
    if (normalizeText(item.sport).includes(q)) score += 45;
    if (item.source === "odds_api_events") score += 150;
    if (item.source === "fotmob_suggest") score += 140;
    if (item.source === "sports_odds") score += 140;
    if (item.source === "polymarket_events") score += 130;
    // Live Gamma hits fill DB gaps (esports / not-yet-ingested poly fixtures).
    if (item.source === "polymarket_gamma") score += 125;
    // SofaScore (Mac-cached) is the obscure-league last resort - rank just below Gamma.
    if (item.source === "sofascore") score += 120;
    return score;
}

// Final fallback when our own cache/DB can't date a fixture: query Fotmob's public
// search-suggest endpoint (same endpoint the Python FotMobAPIService.search uses). It needs
// no auth - only browser-mimicking headers - and returns matches with an ISO matchDate.
const FOTMOB_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.fotmob.com/",
    Origin: "https://www.fotmob.com",
};

// Polymarket Gamma public-search - free, no auth. Mirrors what PolymarketBot's
// gamma_service.search_event_by_name uses. Covers esports / poly-only fixtures that
// never landed in odds_api_events or the polymarket_events cache yet.
const GAMMA_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Parse a Gamma event title into home/away/sport/league.
 * Examples:
 *   "Dota 2: MOUZ vs Vici Gaming (BO2) - Esports World Cup Group C"
 *   "Team A vs Team B"
 *   "Lakers vs Celtics - NBA"
 */
function parseGammaEventTitle(title: string): {
    sport: string;
    home: string;
    away: string;
    league: string;
} {
    let sport = "";
    let league = "";
    let rest = String(title || "").trim();
    if (!rest) return { sport, home: "", away: "", league };

    const sportMatch = rest.match(/^([^:]+):\s*(.+)$/);
    if (sportMatch && /\bvs\.?\b|\bv\b|@/i.test(sportMatch[2])) {
        sport = sportMatch[1].trim();
        rest = sportMatch[2].trim();
    }

    // "Fixture - Competition" - keep splitting from the right when the left has vs
    const dashParts = rest.split(/\s+[-–]\s+/);
    if (dashParts.length >= 2 && /\bvs\.?\b|\bv\b|@/i.test(dashParts[0])) {
        rest = dashParts[0].trim();
        league = dashParts.slice(1).join(" - ").trim();
    }

    // Drop format tags like (BO2), (BO3)
    rest = rest.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();

    let home = "";
    let away = "";
    const vsParts = rest.split(/\s+vs\.?\s+|\s+v\s+|\s+@\s+/i);
    if (vsParts.length >= 2) {
        home = vsParts[0].trim();
        away = vsParts.slice(1).join(" vs ").trim();
    }

    return { sport, home, away, league };
}

function sportFromGammaEvent(event: any, parsedSport: string): string {
    if (parsedSport) return normalizeSport(parsedSport);
    const tags: any[] = Array.isArray(event?.tags) ? event.tags : [];
    const tagLabels = tags
        .map((t) => String(t?.label || t?.slug || "").trim())
        .filter(Boolean);
    // Prefer concrete game tags over generic "Esports"/"Sports"
    for (const label of tagLabels) {
        const n = normalizeText(label);
        if (n === "esports" || n === "sports" || n === "games" || n === "games") continue;
        const sport = normalizeSport(label);
        if (sport) return sport;
    }
    if (tagLabels.some((l) => /esport/i.test(l))) return "Esports";
    const series = Array.isArray(event?.series) ? event.series[0] : event?.series;
    if (series?.title) return normalizeSport(series.title) || "Esports";
    return parsedSport ? normalizeSport(parsedSport) : "";
}

async function fetchGammaMatches(query: string): Promise<EventSuggestion[]> {
    const term = query.replace(/\s+v\s+/i, " vs ").trim();
    if (term.length < 2) return [];

    // Query shapes Gamma ranks differently - accumulate ALL, don't stop at the first
    // page of outrights ("shallowest hero pool") when a later variation finds the fixture.
    const variations: string[] = [term];
    if (/\bvs\b/i.test(term)) {
        const [home, away] = term.split(/\s+vs\s+/i).map((s) => s.trim());
        if (home && away) {
            variations.push(`${home} ${away}`);
            variations.push(`${away} vs ${home}`);
            // Drop sport noise: "dota2 mouz vici" style often works better without prefix
            const bare = `${home} ${away}`.replace(/\b(dota2?|cs2?|csgo|valorant|lol|esports?)\b/gi, " ").replace(/\s+/g, " ").trim();
            if (bare && bare !== `${home} ${away}`) variations.push(bare);
        }
    } else {
        // "dota2 mouz vici" → also try without sport tokens
        const bare = term.replace(/\b(dota2?|cs2?|csgo|valorant|lol|esports?)\b/gi, " ").replace(/\s+/g, " ").trim();
        if (bare && bare !== term) variations.push(bare);
        const tokens = bare.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) variations.push(`${tokens[0]} vs ${tokens.slice(1).join(" ")}`);
    }

    const promises = variations.map(async (v) => {
        if (!v || v.length < 2) return [];
        const url = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(v)}`;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4500);
            const res = await fetch(url, { headers: GAMMA_HEADERS, signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data?.events) ? data.events : [];
        } catch {
            return [];
        }
    });

    const eventsById = new Map<string, any>();
    const resultsArray = await Promise.all(promises);
    for (const list of resultsArray) {
        for (const event of list) {
            const key = String(event?.id || event?.slug || "");
            if (key && !eventsById.has(key)) eventsById.set(key, event);
        }
    }

    const queryTokens = new Set(
        normalizeText(term).split(" ").filter((t) => t.length >= 2 && t !== "vs" && t !== "v")
    );

    const seen = new Set<string>();
    const out: EventSuggestion[] = [];
    for (const event of eventsById.values()) {
        if (!event || event.closed === true || event.archived === true) continue;
        const title = String(event.title || "").trim();
        if (!title) continue;

        const parsed = parseGammaEventTitle(title);
        let home = parsed.home;
        let away = parsed.away;

        // Fallback: outcomes / groupItemTitle on markets (moneyline legs often name teams)
        if (!home || !away) {
            const markets: any[] = Array.isArray(event.markets) ? event.markets : [];
            const names = markets
                .map((m) => String(m?.groupItemTitle || "").trim())
                .filter((n) => n && !/^(yes|no|over|under|draw)$/i.test(n));
            if (names.length >= 2) {
                home = home || names[0];
                away = away || names[1];
            }
        }
        // Skip pure outrights / prop cards that don't resolve to a two-sided fixture
        if (!home || !away) continue;

        // Require team-token overlap with the user query so "EWC Dota 2 Winner" doesn't
        // pollute results for "MOUZ vs Vici".
        const teamToks = normalizeText(`${home} ${away}`).split(" ").filter((t) => t.length >= 2);
        const teamHits = teamToks.filter((t) => queryTokens.has(t));
        if (queryTokens.size > 0 && teamHits.length === 0) continue;

        const when = event.startTime || event.eventDate || event.endDate || event.createdAt;
        const { date, time } = formatDateParts(when);
        // Keep undated poly markets (some outrights) only when we at least have a date
        if (!date) continue;

        const se = `${home} vs ${away}`;
        const slug = String(event.slug || "").trim();
        const id = String(event.id || slug || `${se}|${date}`);
        const key = `${normalizeText(se)}|${date}|${slug || id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const series = Array.isArray(event.series) ? event.series[0] : event.series;
        const league =
            parsed.league ||
            String(series?.title || event.seriesSlug || "").trim();

        const sport = sportFromGammaEvent(event, parsed.sport);

        out.push({
            id: slug ? `gamma-${slug}` : `gamma-${id}`,
            searchEvent: se,
            home,
            away,
            date,
            time: time || "00:00",
            country: sport === "Esports" || /esport|dota|cs2|valorant|lol/i.test(sport) ? "International" : "",
            league,
            leagueSlug: String(series?.slug || event.seriesSlug || "").trim(),
            sport,
            source: "polymarket_gamma",
            aliases: [title, slug, String(event.ticker || "")].filter(Boolean).slice(0, 10),
        });
    }
    return out;
}

async function fetchFotmobMatches(query: string): Promise<EventSuggestion[]> {
    const term = query.replace(/\s+vs\s+/i, " vs ").trim();
    if (!term) return [];
    
    // FotMob short-names teams ("Haukar", "Magni") - long arb names like
    // "Haukar Hafnarfjordur" / "IF Magni Grenivik" return zero hits. Try short forms.
    const variations: string[] = [term];
    const push = (v: string) => {
        const t = v.replace(/\s+/g, " ").trim();
        if (t && !variations.includes(t)) variations.push(t);
    };
    if (term.includes(" vs ")) {
        const [home, away] = term.split(/\s+vs\s+/i).map((s) => s.trim());
        if (home && away) {
            const homeShort = home.split(/\s+/)[0];
            const awayShort = away.split(/\s+/)[0];
            push(`${away} vs ${home}`);
            push(`${home} vs ${awayShort}`);
            push(`${homeShort} vs ${awayShort}`);
            push(`${awayShort} vs ${homeShort}`);
            push(`${homeShort} ${awayShort}`);
            push(`${awayShort} ${homeShort}`);
            push(homeShort);
            push(awayShort);
        }
    } else if (term.includes(" ")) {
        const parts = term.split(/\s+/).filter(Boolean);
        push(parts[0]);
        if (parts.length >= 2) {
            push(`${parts[0]} ${parts[1]}`);
            push(`${parts[parts.length - 1]} ${parts[0]}`);
        }
    }

    const seen = new Set<string>();
    const out: EventSuggestion[] = [];
    // Fire all requests in parallel rather than sequentially waiting.
    const promises = variations.slice(0, 6).map(async (v) => {
        const url = `https://www.fotmob.com/api/data/search/suggest?hits=50&lang=en&term=${encodeURIComponent(v)}`;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(url, { headers: FOTMOB_HEADERS, signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) return [];
            const data = await res.json();
            if (!Array.isArray(data)) return [];
            
            const results: EventSuggestion[] = [];
            for (const category of data as any[]) {
                const suggestions = Array.isArray(category?.suggestions) ? category.suggestions : [];
                for (const item of suggestions) {
                    if (!item || item.type !== "match") continue;
                    const home = String(item.homeTeamName || "").trim();
                    const away = String(item.awayTeamName || "").trim();
                    if (!home || !away) continue;
                    const { date, time } = formatDateParts(item.matchDate);
                    if (!date) continue;
                    const se = `${home} vs ${away}`;
                    const key = `${se}|${date}|${time}`;
                    results.push({
                        id: `fotmob-${item.id || key}`,
                        searchEvent: se,
                        home,
                        away,
                        date,
                        time,
                        country: "",
                        league: String(item.leagueName || "").trim(),
                        leagueSlug: "",
                        sport: "football",
                        source: "fotmob_suggest",
                        aliases: [],
                    });
                }
            }
            return results;
        } catch {
            return [];
        }
    });

    const resultsArray = await Promise.all(promises);
    for (const results of resultsArray) {
        for (const item of results) {
            const key = `${item.searchEvent}|${item.date}|${item.time}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(item);
        }
        if (out.length >= 8) break;
    }
    
    return out;
}

// --- SofaScore fixture-suggestion bridge (async, Mac-populated) -----------------
// SofaScore's API is Cloudflare-locked to the Mac, so the web server can't query it
// live like Fotmob/Gamma. Instead the Mac daemon drains `sofascore_search_requests`
// and writes normalized events into `sofascore_search_results`. Here we READ that
// cache and ENQUEUE misses; results "pop in" a few seconds after the daemon fetches.
// The key MUST match the Python side (sofascore/cache.py `qkey`): NFKD -> drop
// non-ascii -> lower -> collapse whitespace -> trim.
function sofaQueryKey(query: string): string {
    return query
        .normalize("NFKD")
        .replace(/[^\x00-\x7F]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

// SofaScore's search matches poorly on the verbose parsed fixture names - extra qualifier tokens
// ("Porto Alegre", "Women", "RS") make "Sao Jose RS Porto Alegre vs Treze" return nothing while
// "Sao Jose RS vs Treze" hits, and "AFC Toronto Women vs Vancouver Rise Women" misses while
// "AFC Toronto vs Vancouver Rise" hits. Strip known noise words, then keep the first 3 significant
// tokens of each side of "vs" (the core club name). Used only for the SofaScore FETCH query; the
// original parsed event still drives result scoring, so precision isn't lost.
const _SOFA_NOISE = /\b(women|men|reserves?|res|youth|academy|amateur|u\d{2})\b/gi;
function cleanSofaQuery(query: string): string {
    const core = (name: string): string => {
        const toks = name
            .replace(_SOFA_NOISE, " ")
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .split(/\s+/)
            .filter((t) => t.length > 1);
        return toks.slice(0, 3).join(" ");
    };
    const parts = query.split(/\s+vs?\.?\s+/i);
    if (parts.length !== 2) return query;
    const a = core(parts[0]);
    const b = core(parts[1]);
    return a && b ? `${a} vs ${b}` : query;
}

// A 0-event SofaScore cache is retried after this long - obscure/in-play fixtures may become
// findable as the game progresses or SofaScore ingests them, and old caches predate query-cleaning.
const SOFA_REFETCH_MS = 20 * 60 * 1000;

function sofaEventToSuggestion(ev: any): EventSuggestion {
    const home = String(ev.home || "").trim();
    const away = String(ev.away || "").trim();
    return {
        id: `sofa-${ev.id}`,
        searchEvent: `${home} vs ${away}`,
        home,
        away,
        date: String(ev.date || ""),
        time: String(ev.time || "00:00"),
        country: String(ev.country || "").trim(),
        league: String(ev.league || "").trim(),
        leagueSlug: "",
        sport: normalizeSport(ev.sport) || "football",
        source: "sofascore",
        aliases: [],
    };
}

async function readSofascoreCached(db: any, key: string): Promise<{ hit: boolean; events: EventSuggestion[]; stale: boolean }> {
    const doc = await db.collection("sofascore_search_results").findOne({ _id: key });
    if (!doc) return { hit: false, events: [], stale: false };
    const events = Array.isArray(doc.events) ? doc.events.map(sofaEventToSuggestion) : [];
    // A cached 0-event result is "stale" (worth another fetch) once it's older than the refetch
    // window - obscure fixtures come and go, and old caches predate the query-cleaning below.
    const fetchedAt = doc.fetched_at ? new Date(doc.fetched_at).getTime() : 0;
    const stale = events.length === 0 && (Date.now() - fetchedAt) > SOFA_REFETCH_MS;
    return { hit: true, events, stale };
}

async function enqueueSofascoreSearch(db: any, key: string, query: string): Promise<void> {
    const now = new Date();
    // Feed the Mac daemon the CLEANED query; the result is still keyed by the original query so the
    // read side finds it. Reset status to pending so a stale/done request re-fetches.
    await db.collection("sofascore_search_requests").updateOne(
        { _id: key },
        {
            $set: {
                status: "pending",
                query: cleanSofaQuery(query),
                next_retry_at: now,
                // TTL (index on expire_at) cleans up the request ~1h later; the result
                // doc has its own longer TTL and drives when a refetch is needed.
                expire_at: new Date(now.getTime() + 3_600_000),
            },
            $setOnInsert: { created_at: now },
        },
        { upsert: true }
    );
}

async function loadEvents() {
    const client = await getMongoClient();
    const { dbName } = getMongoConfig();
    const db = client.db(dbName);
    const now = new Date();
    // Include from start of *yesterday* so today's in-play fixtures (often stored as
    // midnight UTC date with separate time, or already kicked off) stay searchable.
    const indexFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    // oddspapi_fixtures stores startTime as an ISO *string* (verbatim from the API), so it must be
    // filtered with an ISO-string bound - a Date $gte silently matches nothing against a string field.
    const indexFromISO = indexFrom.toISOString();

    const pastDate = new Date(now.getTime() - 90 * 86_400_000); // Past 90 days
    const [docs, sportsDocs, polymarketDocs, teamMappings, leagueMappings, alertsDocs, teamDocs, oddspapiDocs, inplayDocs, goalooDocs] = await Promise.all([
        db
        .collection("odds_api_events")
        .find(
            { date: { $gte: indexFrom }, home: { $type: "string" }, away: { $type: "string" } },
            {
                projection: {
                    _id: 0,
                    id: 1,
                    home: 1,
                    away: 1,
                    league: 1,
                    league_slug: 1,
                    country: 1,
                    date: 1,
                    sport: 1,
                },
                sort: { date: 1 },
                limit: MAX_CACHE_ITEMS,
            }
        )
        .toArray(),
        db
            .collection("sports_odds")
            .find(
                { date: { $gte: indexFrom }, home: { $type: "string" }, away: { $type: "string" } },
                {
                    projection: {
                        _id: 0,
                        id: 1,
                        home: 1,
                        away: 1,
                        league: 1,
                        country: 1,
                        date: 1,
                        sport: 1,
                    },
                    sort: { date: 1 },
                    limit: MAX_CACHE_ITEMS,
                }
            )
            .toArray(),
        db
            .collection("polymarket_events")
            .find(
                { date: { $gte: indexFrom }, home: { $type: "string" }, away: { $type: "string" } },
                {
                    projection: {
                        _id: 0,
                        polymarket_id: 1,
                        polymarket_slug: 1,
                        home: 1,
                        away: 1,
                        league: 1,
                        league_normalized: 1,
                        country: 1,
                        date: 1,
                        sport: 1,
                        polymarket_home: 1,
                        polymarket_away: 1,
                    },
                    sort: { date: 1 },
                    limit: MAX_CACHE_ITEMS,
                }
            )
            .toArray(),
        db
            .collection("inplay_team_mappings")
            .find(
                {},
                {
                    projection: {
                        _id: 0,
                        alert_team_name: 1,
                        odds_api_team_name: 1,
                        odds_api_league_slug: 1,
                    },
                    limit: 20_000,
                }
            )
            .toArray(),
        db
            .collection("inplay_league_mappings")
            .find(
                {},
                {
                    projection: {
                        _id: 0,
                        alert_league: 1,
                        odds_api_league_name: 1,
                        odds_api_slug: 1,
                    },
                    limit: 10_000,
                }
            )
            .toArray(),
        db.collection("all_positive_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),
        db.collection("all_positive_team_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),
        // oddspapi_fixtures covers obscure small leagues (U20 Amazonense, national youth, etc.) that
        // FotMob/odds_api never ingest - without it those bets show "No event match" despite a live
        // fixture. Filtered by ISO-string startTime; ~10k future rows, well under MAX_CACHE_ITEMS.
        db
            .collection("oddspapi_fixtures")
            .find(
                { startTime: { $gte: indexFromISO }, participant1Name: { $type: "string" }, participant2Name: { $type: "string" } },
                {
                    projection: {
                        _id: 1,
                        participant1Name: 1,
                        participant2Name: 1,
                        participant1ShortName: 1,
                        participant2ShortName: 1,
                        startTime: 1,
                        tournamentName: 1,
                        tournamentSlug: 1,
                        categoryName: 1,
                        sportName: 1,
                    },
                    sort: { startTime: 1 },
                    limit: MAX_CACHE_ITEMS,
                }
            )
            .toArray(),
        // all_positive_inplay_alerts: the live betburger in-play feed carries event metadata
        // (home/away + event_id + league/country/sport + fixture_datetime) for fixtures that are
        // in-play RIGHT NOW and often aren't in odds_api/oddspapi yet - lets those resolve too.
        db.collection("all_positive_inplay_alerts").find(
            { created_at: { $gte: pastDate }, home: { $type: "string" }, away: { $type: "string" } },
            { projection: { _id: 0, event_id: 1, home: 1, away: 1, league: 1, country: 1, sport: 1, fixture_datetime: 1, match_date: 1 },
              sort: { created_at: -1 }, limit: 15000 }).toArray(),
        // goaloo_free_matches: the Goaloo free-livescore store (match-id/team-id keyed) covers
        // obscure regional/youth/women's leagues that are often in NO other source. Rolling window,
        // so filter by last_seen (a Date). No scoreEvent bonus - it only wins its own-only fixtures.
        db.collection("goaloo_free_matches").find(
            { last_seen: { $gte: indexFrom }, home: { $type: "string" }, away: { $type: "string" } },
            { projection: { _id: 0, match_id: 1, home: 1, away: 1, kickoff: 1, country: 1, league_name: 1, league_short: 1, sclass_id: 1 },
              sort: { last_seen: -1 }, limit: 15000 }).toArray(),
    ]);

    const teamAliasesByName = new Map<string, Set<string>>();
    const teamAliasesBySlug = new Map<string, Set<string>>();
    for (const mapping of teamMappings) {
        const alertName = String(mapping.alert_team_name || "").trim();
        if (!alertName) continue;

        const teamName = normalizeText(String(mapping.odds_api_team_name || ""));
        if (teamName) {
            const aliases = teamAliasesByName.get(teamName) ?? new Set<string>();
            aliases.add(alertName);
            teamAliasesByName.set(teamName, aliases);
        }

        const slug = normalizeText(String(mapping.odds_api_league_slug || ""));
        if (slug) {
            const aliases = teamAliasesBySlug.get(slug) ?? new Set<string>();
            aliases.add(alertName);
            teamAliasesBySlug.set(slug, aliases);
        }
    }

    const leagueAliasesBySlug = new Map<string, Set<string>>();
    for (const mapping of leagueMappings) {
        const slug = normalizeText(String(mapping.odds_api_slug || ""));
        if (!slug) continue;
        const aliases = leagueAliasesBySlug.get(slug) ?? new Set<string>();
        addAlias(aliases, mapping.alert_league);
        addAlias(aliases, mapping.odds_api_league_name);
        leagueAliasesBySlug.set(slug, aliases);
    }

    const seen = new Set<string>();
    const items: EventSuggestion[] = [];

    const pastDocs = [...alertsDocs, ...teamDocs];
    for (const doc of pastDocs) {
        if (!doc.Match) continue;
        const parts = String(doc.Match).split(' vs ');
        if (parts.length !== 2) continue;
        const home = parts[0].trim();
        const away = parts[1].trim();
        if (!home || !away) continue;

        let dateStr = doc.Date;
        let timeStr = doc.Time;
        if (!dateStr) continue;
        
        const key = `${home}|${away}|${dateStr}|${timeStr || '00:00'}`;
        if (seen.has(key)) continue;
        seen.add(key);

        items.push({
            id: `past-${key}`,
            searchEvent: `${home} vs ${away}`,
            home,
            away,
            date: String(dateStr),
            time: String(timeStr || '00:00'),
            country: String(doc.Country || "").trim(),
            league: String(doc.League || "").trim(),
            leagueSlug: "",
            sport: "football",
            source: "past_alerts",
            aliases: [],
        });
    }

    const pushEventDoc = (doc: any, source: string) => {
        const home = String(doc.home || "").trim();
        const away = String(doc.away || "").trim();
        if (!home || !away) return;

        const { date, time } = formatDateParts(doc.date);
        const key = `${home}|${away}|${date}|${time}`;
        if (seen.has(key)) return;
        seen.add(key);

        const leagueSlug = String(doc.league_slug || "").trim();
        const aliasSet = new Set<string>();
        for (const alias of teamAliasesByName.get(normalizeText(home)) ?? []) aliasSet.add(alias);
        for (const alias of teamAliasesByName.get(normalizeText(away)) ?? []) aliasSet.add(alias);
        for (const alias of teamAliasesBySlug.get(normalizeText(leagueSlug)) ?? []) aliasSet.add(alias);
        for (const alias of leagueAliasesBySlug.get(normalizeText(leagueSlug)) ?? []) aliasSet.add(alias);

        items.push({
            id: String(doc.id || doc.polymarket_id || doc.polymarket_slug || key),
            searchEvent: `${home} vs ${away}`,
            home,
            away,
            date,
            time,
            country: String(doc.country || "").trim(),
            league: String(doc.league || doc.league_normalized || "").trim(),
            leagueSlug,
            sport: normalizeSport(doc.sport),
            source,
            aliases: Array.from(new Set([
                ...Array.from(aliasSet),
                doc.polymarket_home,
                doc.polymarket_away,
                doc.polymarket_slug,
            ].filter(Boolean).map(String))).slice(0, 20),
        });
    };

    for (const doc of docs) {
        pushEventDoc(doc, "odds_api_events");
    }
    for (const doc of sportsDocs) {
        pushEventDoc(doc, "sports_odds");
    }
    for (const doc of polymarketDocs) {
        pushEventDoc(doc, "polymarket_events");
    }
    // all_positive_inplay_alerts carries home/away + event_id + fixture_datetime; normalise to the
    // shape pushEventDoc expects. Many rows per event (one per alert) - pushEventDoc dedups by
    // home|away|date|time, so the first (most recent) wins.
    for (const doc of inplayDocs) {
        pushEventDoc(
            {
                id: doc.event_id,
                home: doc.home,
                away: doc.away,
                date: doc.fixture_datetime || doc.match_date,
                country: doc.country,
                league: doc.league,
                sport: doc.sport,
            },
            "all_positive_inplay_alerts"
        );
    }
    // oddspapi_fixtures uses participant1/2Name + ISO startTime + tournament/category, so normalise
    // to the shape pushEventDoc expects. Runs last, so it only fills fixtures no richer source has.
    for (const doc of oddspapiDocs) {
        const home = String(doc.participant1Name || doc.participant1ShortName || "").trim();
        const away = String(doc.participant2Name || doc.participant2ShortName || "").trim();
        if (!home || !away) continue;
        pushEventDoc(
            {
                id: doc._id,
                home,
                away,
                date: doc.startTime, // ISO string; formatDateParts parses it
                country: doc.categoryName,
                league: doc.tournamentName,
                league_slug: doc.tournamentSlug,
                sport: doc.sportName, // "Soccer" -> Football
            },
            "oddspapi_fixtures"
        );
    }
    // goaloo_free_matches: obscure leagues no other source carries. kickoff is a space-separated
    // wall-clock string ("2026-07-20 09:30:00"); T-ify it so formatDateParts/Date parse it. Runs
    // last so it only fills fixtures nothing richer already provided.
    for (const doc of goalooDocs) {
        const home = String(doc.home || "").trim();
        const away = String(doc.away || "").trim();
        if (!home || !away) continue;
        pushEventDoc(
            {
                id: doc.match_id != null ? `goaloo-${doc.match_id}` : undefined,
                home,
                away,
                date: String(doc.kickoff || "").replace(" ", "T"),
                country: doc.country,
                league: doc.league_name || doc.league_short,
                sport: "Soccer", // -> Football via normalizeSport
            },
            "goaloo_free_matches"
        );
    }

    cache.loadedAt = Date.now();
    cache.items = items;
    return items;
}

async function getCachedEvents() {
    const isFresh = cache.items.length > 0 && Date.now() - cache.loadedAt < CACHE_TTL_MS;
    if (isFresh) return cache.items;
    if (!cache.loading) {
        cache.loading = loadEvents().finally(() => {
            cache.loading = undefined;
        });
    }
    return cache.loading;
}

export async function GET(req: NextRequest) {
    const query = (req.nextUrl.searchParams.get("q") || "").trim();
    const wantsIndex = req.nextUrl.searchParams.get("index") === "1";
    const wantsSports = req.nextUrl.searchParams.get("sports") === "1";
    const wantsPast = req.nextUrl.searchParams.get("past") === "1";
    const daysParam = Number(req.nextUrl.searchParams.get("days") || "");
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 0;
    const viewerTz = (req.nextUrl.searchParams.get("tz") || "").trim() || null;

    const filterByDays = (items: EventSuggestion[]) => {
        if (!days) return items;
        const cutoff = Date.now() + days * 86_400_000;
        return items.filter((item) => {
            const eventTime = eventDateTimeMs(item.date, item.time);
            return !Number.isNaN(eventTime) && eventTime <= cutoff;
        });
    };

    if (wantsSports) {
        try {
            const items = await getCachedEvents();
            const sports = Array.from(new Set(items.map((item) => normalizeSport(item.sport)).filter(Boolean))).sort();
            return NextResponse.json({ sports, cacheAgeMs: Date.now() - cache.loadedAt });
        } catch (error: any) {
            return NextResponse.json({ sports: [], error: error?.message || "Sports index failed" }, { status: 500 });
        }
    }

    if (wantsIndex) {
        try {
            const items = filterByDays(await getCachedEvents());
            return NextResponse.json({
                events: shiftEventsTz(items.map(({ id, searchEvent, home, away, date, time, country, league, leagueSlug, sport, source, aliases }) => stripPlaceholderNames({
                    id,
                    searchEvent,
                    home,
                    away,
                    date,
                    time,
                    country,
                    league,
                    leagueSlug,
                    sport,
                    source,
                    aliases,
                } as EventSuggestion)), viewerTz),
                cacheAgeMs: Date.now() - cache.loadedAt,
            });
        } catch (error: any) {
            return NextResponse.json(
                { events: [], error: error?.message || "Event index failed" },
                { status: 500 }
            );
        }
    }

    if (query.length < 2) {
        return NextResponse.json({ suggestions: [] });
    }

    try {
        const items = await getCachedEvents();
        let suggestions: EventSuggestion[] = dedupeSameEvent(
            items
                .map((item) => ({ ...item, score: scoreEvent(query, item) }))
                .filter((item) => item.score && item.score > 0)
                .filter((item) => {
                    if (!wantsPast) return true;
                    const eventTime = eventDateTimeMs(item.date, item.time);
                    return !Number.isNaN(eventTime) && eventTime < Date.now();
                })
                .sort((a, b) => {
                    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                    return wantsPast
                        ? `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
                        : `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
                })
        ).slice(0, 8);

        // If not enough suggestions from cache, query MongoDB directly for older past matches
        if (wantsPast || suggestions.length < 5) {
            try {
                const client = await getMongoClient();
                const { dbName } = getMongoConfig();
                const db = client.db(dbName);
                
                const qTokens = query.split(/\s+vs\s+|\s+/i).filter(Boolean);
                if (qTokens.length >= 2) {
                    const regex = new RegExp(qTokens.join(".*"), "i");
                    const [docs1, docs3, oddsDocs, sportsOddsDocs, polymarketEventDocs, oddspapiDynDocs, inplayDynDocs, goalooDynDocs] = await Promise.all([
                        db.collection("all_positive_alerts").find(
                            { Match: { $regex: regex } },
                            { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
                        ).toArray(),
                        db.collection("all_positive_team_alerts").find(
                            { Match: { $regex: regex } },
                            { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
                        ).toArray(),
                        db.collection("odds_api_events").find(
                            { $or: [ { home: { $regex: qTokens.join("|"), $options: "i" } }, { away: { $regex: qTokens.join("|"), $options: "i" } } ] },
                            { projection: { id: 1, home: 1, away: 1, date: 1, time: 1, league: 1, country: 1, sport: 1 }, sort: { date: -1 }, limit: 50 }
                        ).toArray(),
                        db.collection("sports_odds").find(
                            { $or: [ { home: { $regex: qTokens.join("|"), $options: "i" } }, { away: { $regex: qTokens.join("|"), $options: "i" } }, { sport: { $regex: qTokens.join("|"), $options: "i" } } ] },
                            { projection: { id: 1, home: 1, away: 1, date: 1, league: 1, country: 1, sport: 1 }, sort: { date: -1 }, limit: 50 }
                        ).toArray(),
                        db.collection("polymarket_events").find(
                            { $or: [ { home: { $regex: qTokens.join("|"), $options: "i" } }, { away: { $regex: qTokens.join("|"), $options: "i" } }, { polymarket_home: { $regex: qTokens.join("|"), $options: "i" } }, { polymarket_away: { $regex: qTokens.join("|"), $options: "i" } }, { sport: { $regex: qTokens.join("|"), $options: "i" } } ] },
                            { projection: { polymarket_id: 1, polymarket_slug: 1, home: 1, away: 1, date: 1, league: 1, league_normalized: 1, country: 1, sport: 1 }, sort: { date: -1 }, limit: 50 }
                        ).toArray(),
                        // oddspapi_fixtures direct hit: the cache is future-only, so this is the ONLY way
                        // a PAST small-league fixture (past=1 deep search) can be found. Match on participant names.
                        db.collection("oddspapi_fixtures").find(
                            { $or: [ { participant1Name: { $regex: qTokens.join("|"), $options: "i" } }, { participant2Name: { $regex: qTokens.join("|"), $options: "i" } } ] },
                            { projection: { _id: 1, participant1Name: 1, participant2Name: 1, participant1ShortName: 1, participant2ShortName: 1, startTime: 1, tournamentName: 1, tournamentSlug: 1, categoryName: 1, sportName: 1 }, sort: { startTime: -1 }, limit: 50 }
                        ).toArray(),
                        // all_positive_inplay_alerts: resolve a live in-play fixture immediately,
                        // before the cached index next refreshes.
                        db.collection("all_positive_inplay_alerts").find(
                            { $or: [ { home: { $regex: qTokens.join("|"), $options: "i" } }, { away: { $regex: qTokens.join("|"), $options: "i" } } ] },
                            { projection: { event_id: 1, home: 1, away: 1, fixture_datetime: 1, match_date: 1, league: 1, country: 1, sport: 1 }, sort: { created_at: -1 }, limit: 50 }
                        ).toArray(),
                        // goaloo_free_matches direct hit: obscure-league fixtures (incl. finished ones
                        // finalized after they rolled off the feed) that no other source carries.
                        db.collection("goaloo_free_matches").find(
                            { $or: [ { home: { $regex: qTokens.join("|"), $options: "i" } }, { away: { $regex: qTokens.join("|"), $options: "i" } } ] },
                            { projection: { match_id: 1, home: 1, away: 1, kickoff: 1, league_name: 1, league_short: 1, country: 1 }, sort: { last_seen: -1 }, limit: 50 }
                        ).toArray()
                    ]);
                    const pastDocs = [...docs1, ...docs3];
                    
                    const seenIds = new Set(suggestions.map(s => s.searchEvent));
                    for (const doc of pastDocs) {
                        const parts = String(doc.Match).split(' vs ');
                        if (parts.length !== 2) continue;
                        const home = parts[0].trim();
                        const away = parts[1].trim();
                        const se = `${home} vs ${away}`;
                        if (seenIds.has(se)) continue;
                        seenIds.add(se);
                        
                        suggestions.push({
                            id: `dynamic-${doc._id}`,
                            searchEvent: se,
                            home,
                            away,
                            date: String(doc.Date || ""),
                            time: String(doc.Time || "00:00"),
                            country: String(doc.Country || "").trim(),
                            league: String(doc.League || "").trim(),
                            leagueSlug: "",
                            sport: "football",
                            source: "past_alerts_dynamic",
                            aliases: [],
                        });
                    }
                    
                    const dynamicEventDocs = [
                        ...oddsDocs.map((doc: any) => ({ ...doc, __source: "odds_api_events" })),
                        ...sportsOddsDocs.map((doc: any) => ({ ...doc, __source: "sports_odds" })),
                        ...polymarketEventDocs.map((doc: any) => ({ ...doc, __source: "polymarket_events" })),
                        // Normalise oddspapi's participant/startTime shape to the home/away/date/time the
                        // loop below expects (formatDateParts turns the ISO startTime into London date+time).
                        ...oddspapiDynDocs.map((doc: any) => {
                            const { date, time } = formatDateParts(doc.startTime);
                            return {
                                _id: doc._id,
                                home: doc.participant1Name || doc.participant1ShortName,
                                away: doc.participant2Name || doc.participant2ShortName,
                                date,
                                time,
                                country: doc.categoryName,
                                league: doc.tournamentName,
                                sport: doc.sportName,
                                __source: "oddspapi_fixtures",
                            };
                        }),
                        ...inplayDynDocs.map((doc: any) => {
                            const { date, time } = formatDateParts(doc.fixture_datetime || doc.match_date);
                            return {
                                _id: doc.event_id,
                                home: doc.home,
                                away: doc.away,
                                date,
                                time,
                                country: doc.country,
                                league: doc.league,
                                sport: doc.sport,
                                __source: "all_positive_inplay_alerts",
                            };
                        }),
                        ...goalooDynDocs.map((doc: any) => {
                            const { date, time } = formatDateParts(String(doc.kickoff || "").replace(" ", "T"));
                            return {
                                _id: doc.match_id != null ? `goaloo-${doc.match_id}` : undefined,
                                home: doc.home,
                                away: doc.away,
                                date,
                                time,
                                country: doc.country,
                                league: doc.league_name || doc.league_short,
                                sport: "Soccer",
                                __source: "goaloo_free_matches",
                            };
                        }),
                    ];
                    for (const doc of dynamicEventDocs) {
                        const home = String(doc.home || "").trim();
                        const away = String(doc.away || "").trim();
                        if (!home || !away) continue;
                        const se = `${home} vs ${away}`;
                        if (seenIds.has(se)) continue;
                        seenIds.add(se);
                        
                        let d = doc.date;
                        if (d instanceof Date) {
                            d = d.toISOString().slice(0, 10);
                        } else if (typeof d === "string" && d.length >= 10) {
                            d = d.slice(0, 10);
                        } else {
                            d = "";
                        }
                        
                        const item: EventSuggestion = {
                            id: `dynamic-${doc._id || doc.id || doc.polymarket_id || doc.polymarket_slug}`,
                            searchEvent: se,
                            home,
                            away,
                            date: d,
                            time: String(doc.time || "00:00"),
                            country: String(doc.country || "").trim(),
                            league: String(doc.league || doc.league_normalized || "").trim(),
                            leagueSlug: "",
                            sport: normalizeSport(doc.sport),
                            source: doc.__source,
                            aliases: [],
                        };
                        item.score = scoreEvent(query, item);
                        if (wantsPast) {
                            const eventTime = eventDateTimeMs(item.date, item.time);
                            if (Number.isNaN(eventTime) || eventTime >= Date.now()) continue;
                        }
                        if (item.score > 0) suggestions.push(item);
                    }
                    
                    suggestions.sort((a, b) => {
                        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                        return wantsPast
                            ? `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
                            : `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
                    });
                }
            } catch (e) {
                console.error("Dynamic past query error:", e);
            }
        }

        // Live fallbacks when cache/DB coverage is thin. Fotmob covers football friendlies /
        // internationals; Gamma covers Polymarket/esports fixtures not yet in polymarket_events.
        if (suggestions.length < 5) {
            const queryTokens = new Set(
                normalizeText(query).split(" ").filter((t) => t.length >= 2 && t !== "vs" && t !== "v")
            );
            const seenSe = new Set(suggestions.map((s) => normalizeText(s.searchEvent)));
            const mergeLive = (matches: EventSuggestion[]) => {
                for (const match of matches) {
                    // Never cross real sport <-> eSoccer, even via the live-rescue score below
                    // (a real "Norway vs France" fotmob hit must not attach to an esports bet).
                    if (isEsoccerItem(match) !== queryLooksEsoccer(query)) continue;
                    // Require team-side overlap with the query (ignore pure sport noise like "dota2")
                    const teamTokens = normalizeText(`${match.home} ${match.away}`).split(" ").filter((t) => t.length >= 2);
                    const teamOverlaps = teamTokens.filter((t) => queryTokens.has(t));
                    if (teamOverlaps.length === 0 && queryTokens.size > 0) continue;

                    // scoreEvent hard-fails when ANY query token is unknown (e.g. "dota2" on an
                    // Esports-tagged row). Live Gamma/Fotmob already matched server-side - keep a
                    // solid base score from team overlap so coverage isn't zeroed out.
                    let score = scoreEvent(query, match);
                    if (score <= 0) {
                        score = 40 + teamOverlaps.length * 40;
                        if (match.source === "polymarket_gamma") score += 50;
                        if (match.source === "fotmob_suggest") score += 40;
                        if (match.source === "sofascore") score += 45;
                    }
                    match.score = score;
                    if (wantsPast) {
                        const eventTime = eventDateTimeMs(match.date, match.time);
                        if (Number.isNaN(eventTime) || eventTime >= Date.now()) continue;
                    }

                    const seKey = normalizeText(match.searchEvent);
                    // Prefer richer live metadata (slug/league/date) over a weak DB hit
                    // that only has the bare team names (e.g. past_alerts with empty date).
                    const existingIdx = suggestions.findIndex((s) => normalizeText(s.searchEvent) === seKey);
                    if (existingIdx >= 0) {
                        const existing = suggestions[existingIdx];
                        const existingWeak =
                            !existing.date ||
                            existing.source === "past_alerts" ||
                            existing.source === "past_alerts_dynamic";
                        const incomingBetter =
                            match.source === "polymarket_gamma" ||
                            match.source === "fotmob_suggest" ||
                            (match.date && !existing.date) ||
                            (match.score || 0) > (existing.score || 0);
                        if (existingWeak && incomingBetter) {
                            suggestions[existingIdx] = match;
                        }
                        continue;
                    }
                    seenSe.add(seKey);
                    suggestions.push(match);
                }
            };

            // Fetch Fotmob and Gamma in parallel for performance.
            await Promise.allSettled([
                (async () => {
                    try {
                        const fotmobMatches = await fetchFotmobMatches(query);
                        if (fotmobMatches.length) mergeLive(fotmobMatches);
                    } catch (e) {
                        console.error("Fotmob fallback error:", e);
                    }
                })(),
                (async () => {
                    try {
                        const gammaMatches = await fetchGammaMatches(query);
                        if (gammaMatches.length) mergeLive(gammaMatches);
                    } catch (e) {
                        console.error("Gamma fallback error:", e);
                    }
                })()
            ]);

            // SofaScore (async, Mac-populated cache) - last resort for obscure leagues /
            // friendlies that Fotmob AND Gamma miss. Serve any already-cached events for
            // this query; on a first-time miss, enqueue it so the Mac daemon fetches it
            // (subsequent keystrokes/searches surface the results).
            try {
                const client = await getMongoClient();
                const { dbName } = getMongoConfig();
                const db = client.db(dbName);
                const sofaKey = sofaQueryKey(query);
                const { hit, events, stale } = await readSofascoreCached(db, sofaKey);
                if (events.length) mergeLive(events);
                // Enqueue a Mac fetch when this query is uncached OR its cached result is an empty,
                // stale one (worth retrying with the cleaned query), specific enough, AND still thin
                // after Fotmob/Gamma - otherwise we'd flood the queue with obscure-ish keystrokes.
                if ((!hit || stale) && query.length >= 4 && suggestions.length < 5) {
                    await enqueueSofascoreSearch(db, sofaKey, query);
                }
            } catch (e) {
                console.error("SofaScore cache fallback error:", e);
            }

            suggestions.sort((a, b) => {
                if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                return wantsPast
                    ? `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
                    : `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
            });
        }

        return NextResponse.json({
            suggestions: shiftEventsTz(dedupeSameEvent(suggestions).slice(0, 8).map(stripPlaceholderNames), viewerTz),
            cacheAgeMs: Date.now() - cache.loadedAt,
        });
    } catch (error: any) {
        return NextResponse.json(
            { suggestions: [], error: error?.message || "Event search failed" },
            { status: 500 }
        );
    }
}
