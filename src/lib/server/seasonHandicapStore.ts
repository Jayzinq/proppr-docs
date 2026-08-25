import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

// ---------------------------------------------------------------------------
// Season Handicaps - merge live FotMob league tables (league_standings_fm,
// refreshed by the StatsUpdateFM pipeline) with bookmaker season-handicap
// odds (outright_odds via OddsChecker + season_handicap_manual for markets
// only listed at books OddsChecker doesn't cover yet).
// ---------------------------------------------------------------------------

const globalStore = globalThis as unknown as { __propprSeasonHcpClient?: MongoClient };

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
    const env = { ...readEnvFile("/opt/PROPPR/.env"), ...readEnvFile(".env"), ...readEnvFile(".env.local"), ...process.env };
    return {
        uri:
            env.MONGODB_URI_OVERRIDE || env.MONGO_CONNECTION_STRING || env.MONGODB_CONNECTION_STRING ||
            env.MONGODB_URI_PRODUCTION || env.MONGODB_URI_DEVELOPMENT ||
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprSeasonHandicaps&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getDb() {
    const { uri, dbName } = getMongoConfig();
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached forever.
    const client = await getPooledMongoClient("season-handicaps", uri);
    return client.db(dbName);
}

// Leagues with a season-handicap market. urlRegex finds the OddsChecker market in
// outright_odds; fotmobId keys the live table in league_standings_fm. Manual-only
// leagues (books OddsChecker doesn't list) come from season_handicap_manual and
// need only appear there - no entry here required.
const LEAGUES: { key: string; label: string; fotmobId: number; urlRegex: RegExp }[] = [
    { key: "premier-league", label: "Premier League", fotmobId: 47, urlRegex: /premier-league\/season-han/i },
    { key: "scottish-premiership", label: "Scottish Premiership", fotmobId: 64, urlRegex: /scottish-premiership\/season-handicap/i },
];

// OddsChecker short names -> FotMob full-name tokens that a subset match can't bridge.
const TEAM_ALIASES: Record<string, string> = {
    "man city": "manchester city",
    "man utd": "manchester united",
    "man united": "manchester united",
    "spurs": "tottenham hotspur",
    "wolves": "wolverhampton wanderers",
    "sheff utd": "sheffield united",
    "sheff wed": "sheffield wednesday",
    "nott'm forest": "nottingham forest",
    "west brom": "west bromwich albion",
    "qpr": "queens park rangers",
    "hearts": "heart of midlothian",
    "hibs": "hibernian",
};

function norm(s: string) {
    return String(s || "").toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, " ")
        .replace(/\butd\b/g, "united").trim();
}

function tokens(s: string) {
    return new Set(norm(s).split(" ").filter(Boolean));
}

// Alias keys pass through the same normaliser as lookups ("Sheff Utd" -> "sheff united"),
// so rewrites inside norm() can never orphan an alias key.
const NORM_ALIASES: Record<string, string> = Object.fromEntries(
    Object.entries(TEAM_ALIASES).map(([k, v]) => [norm(k), v]),
);

// Match a bookmaker selection team to a FotMob table team.
function matchTeam(selName: string, tableNames: string[]): string | null {
    const aliased = NORM_ALIASES[norm(selName)] || selName;
    const st = tokens(aliased);
    if (!st.size) return null;
    let best: string | null = null;
    let bestScore = 0;
    for (const t of tableNames) {
        const tt = tokens(t);
        if (norm(t) === norm(aliased)) return t;               // exact
        const inter = [...st].filter((x) => tt.has(x)).length;
        const subset = [...st].every((x) => tt.has(x));
        const score = (subset ? 100 : 0) + inter;
        if (score > bestScore && inter > 0) { bestScore = score; best = t; }
    }
    return bestScore >= 100 || bestScore >= Math.max(1, tokens(aliased).size) ? best : null;
}

// "Nottingham Forest +30" / "Hearts -5" -> {team, handicap}
function parseSelection(name: string): { team: string; handicap: number } | null {
    const m = String(name || "").trim().match(/^(.*?)\s*([+-]\d+(?:\.\d+)?)$/);
    if (!m) return null;
    return { team: m[1].trim(), handicap: Number(m[2]) };
}

export async function getSeasonHandicapPayload() {
    const db = await getDb();
    const leaguesOut: any[] = [];

    // Manual markets grouped by league (may introduce leagues not in LEAGUES).
    const manualDocs = await db.collection("season_handicap_manual")
        .find({ active: { $ne: false } }).toArray();

    const manualByLeague = new Map<string, any[]>();
    for (const m of manualDocs) {
        const k = String(m.league_key || "");
        if (!k) continue;
        if (!manualByLeague.has(k)) manualByLeague.set(k, []);
        manualByLeague.get(k)!.push(m);
    }

    const leagueDefs: { key: string; label: string; fotmobId: number; urlRegex: RegExp | null }[] = [...LEAGUES];
    for (const [k, docs] of manualByLeague) {
        if (!leagueDefs.some((l) => l.key === k)) {
            leagueDefs.push({ key: k, label: docs[0].league_label || k, fotmobId: Number(docs[0].fotmob_league_id) || 0, urlRegex: null });
        }
    }

    for (const lg of leagueDefs) {
        const standings = lg.fotmobId
            ? await db.collection("league_standings_fm").findOne({ league_id: lg.fotmobId })
            : null;
        const table: any[] = (standings?.table || []).map((r: any) => ({
            team: r.team_name, position: r.position, played: r.played,
            wins: r.wins, draws: r.draws, losses: r.losses,
            gd: r.goal_diff, points: r.points,
        }));
        const tableNames = table.map((r) => r.team);

        // (book -> team -> {handicap, odds}) merged from OddsChecker + manual docs.
        const perBook = new Map<string, Map<string, { handicap: number; odds: number }>>();
        let oddsUpdated: Date | null = null;

        if (lg.urlRegex) {
            const oddsDoc = await db.collection("outright_odds").findOne({ market_url: { $regex: lg.urlRegex } });
            if (oddsDoc) {
                oddsUpdated = oddsDoc.last_updated || null;
                for (const sel of oddsDoc.selections || []) {
                    const parsed = parseSelection(sel.name);
                    if (!parsed) continue;
                    const teamName = matchTeam(parsed.team, tableNames) || parsed.team;
                    for (const [book, price] of Object.entries(sel.odds || {})) {
                        const p = Number(price);
                        if (!p || p <= 1) continue;
                        if (!perBook.has(book)) perBook.set(book, new Map());
                        // A book lists ONE handicap per team; keep the freshest/last seen.
                        perBook.get(book)!.set(teamName, { handicap: parsed.handicap, odds: p });
                    }
                }
            }
        }
        for (const m of manualByLeague.get(lg.key) || []) {
            const book = String(m.bookmaker || "Bet365");
            if (!perBook.has(book)) perBook.set(book, new Map());
            for (const sel of m.selections || []) {
                const parsed = sel.team && sel.handicap !== undefined
                    ? { team: String(sel.team), handicap: Number(sel.handicap) }
                    : parseSelection(sel.name);
                if (!parsed) continue;
                const teamName = matchTeam(parsed.team, tableNames) || parsed.team;
                perBook.get(book)!.set(teamName, { handicap: parsed.handicap, odds: Number(sel.odds) || 0 });
            }
            const mu = m.updated_at ? new Date(m.updated_at) : null;
            if (mu && (!oddsUpdated || mu > oddsUpdated)) oddsUpdated = mu;
        }

        if (!perBook.size && !table.length) continue;

        const books = [...perBook.keys()].sort();
        // Teams present in the table OR priced by any book (covers table gaps).
        const allTeams = new Set<string>(tableNames);
        for (const teamMap of perBook.values()) for (const t of teamMap.keys()) allTeams.add(t);

        const teams = [...allTeams].map((name) => {
            const row = table.find((r) => r.team === name);
            const booksOut: Record<string, { handicap: number; odds: number }> = {};
            for (const [book, teamMap] of perBook) {
                const e = teamMap.get(name);
                if (e) booksOut[book] = e;
            }
            return {
                team: name,
                position: row?.position ?? null, played: row?.played ?? 0,
                wins: row?.wins ?? 0, draws: row?.draws ?? 0, losses: row?.losses ?? 0,
                gd: row?.gd ?? 0, points: row?.points ?? 0,
                books: booksOut,
            };
        });

        leaguesOut.push({
            key: lg.key,
            label: lg.label,
            books,
            tableUpdated: standings?.last_updated || null,
            oddsUpdated,
            teams,
        });
    }

    return { leagues: leaguesOut };
}
