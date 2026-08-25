export type SportMeta = {
    name: string;
    emoji: string;
    aliases: string[];
};

export const SPORT_CATALOG: SportMeta[] = [
    { name: "Football", emoji: "⚽", aliases: ["soccer", "fifa", "epl", "premier league"] },
    { name: "Tennis", emoji: "🎾", aliases: ["atp", "wta", "atp doubles", "atp-doubles"] },
    { name: "Basketball", emoji: "🏀", aliases: ["nba", "wnba", "ncaab", "euroleague", "bkfibaqeu", "bkfibaqaf", "bkfibaqam", "bkfibaqas"] },
    { name: "Baseball", emoji: "⚾", aliases: ["mlb"] },
    { name: "American Football", emoji: "🏈", aliases: ["nfl", "cfl", "ncaa football"] },
    { name: "Ice Hockey", emoji: "🏒", aliases: ["hockey", "nhl"] },
    { name: "Cricket", emoji: "🏏", aliases: ["ipl", "t20", "odi"] },
    { name: "Esports", emoji: "🎮", aliases: ["e-sports", "esport", "lol", "league of legends", "valorant", "cs2", "csgo", "dota", "mlp"] },
    { name: "MMA", emoji: "🥊", aliases: ["ufc", "ufc/mma"] },
    { name: "Boxing", emoji: "🥊", aliases: ["boxing"] },
    { name: "Rugby", emoji: "🏉", aliases: ["rugby league", "rugby union"] },
    { name: "Golf", emoji: "⛳", aliases: ["pga", "liv"] },
    { name: "Horse Racing", emoji: "🏇", aliases: ["racing", "horses"] },
    { name: "Table Tennis", emoji: "🏓", aliases: ["table-tennis", "ping pong"] },
    { name: "Lacrosse", emoji: "🥍", aliases: ["wll"] },
    { name: "Darts", emoji: "🎯", aliases: ["pdc", "bdo", "modus", "wdf"] },
    { name: "Snooker", emoji: "🎱", aliases: ["billiards", "pool"] },
];

// Sports contested by a single competitor (or 1v1). Markets like Match Winner, Set/Game
// Handicap and Correct Score are MATCH results here - NOT football-style "team props" /
// "player props". Used to keep bet-type classification sport-aware.
const INDIVIDUAL_SPORT_NAMES = new Set([
    "tennis", "table tennis", "darts", "snooker", "boxing", "mma", "ufc",
    "badminton", "squash", "golf", "horse racing", "cycling", "athletics", "chess",
]);

export function isIndividualSport(sport: unknown): boolean {
    const n = normalize(sport);
    if (!n) return false;
    if (INDIVIDUAL_SPORT_NAMES.has(n)) return true;
    return INDIVIDUAL_SPORT_NAMES.has(normalize(getSportMeta(sport).name));
}

// League/competition/fixture text hints for individual sports, for when an explicit
// sport isn't set on the bet (e.g. "ITF W15", "Modus Darts Super Series").
const INDIVIDUAL_SPORT_TEXT = /\b(atp|wta|itf|challenger|tennis|[wm](?:15|25|35|50|75|100|125)\b|darts|pdc|bdo|wdf|modus|snooker|boxing|ufc|mma|table tennis|tt elite|tt cup|tt star|setka|ping pong|badminton|squash|pga|liv golf)\b/i;

export function looksLikeIndividualSport(context: BetSportContext & { market?: string; selection?: string }): boolean {
    if (isIndividualSport(context.eventSport || context.sport)) return true;
    const hay = [context.eventSport, context.sport, context.league, context.country, context.match, (context as any).searchEvent, (context as any).market, (context as any).selection]
        .map((v) => String(v || ""))
        .join(" ");
    return INDIVIDUAL_SPORT_TEXT.test(hay);
}

function normalize(value: unknown) {
    return String(value || "")
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/[^a-z0-9\s/]+/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export const UNKNOWN_SPORT: SportMeta = { name: "", emoji: "-", aliases: [] };

export type BetSportContext = {
    sport?: string;
    eventSport?: string;
    league?: string;
    country?: string;
    match?: string;
    fixture_name?: string;
    searchEvent?: string;
    market?: string;
    selection?: string;
};

const MARKET_SPORT_HINTS: Array<{ sport: string; pattern: RegExp }> = [
    { sport: "Baseball", pattern: /\b(home runs?|total runs|match total runs|runs scored|strikeouts?|pitchers?|innings?|rbis?|bases?)\b/i },
    { sport: "Basketball", pattern: /\b(rebounds?|assists?|three pointers?|3-pointers?|free throws?|points scored)\b/i },
    { sport: "Ice Hockey", pattern: /\b(pucks?|power play|shutouts?|goalie saves?)\b/i },
    { sport: "Football", pattern: /\b(corners?|bookings?|cards?|offsides?|full time result|both teams to score|btts|match goals?|total goals?|player goals?|goalscorer|to score|clean sheet|asian handicap|double chance|half[- ]time|draw no bet|1x2|player (?:fouls|tackles)|fouls (?:committed|won))\b/i },
    { sport: "Tennis", pattern: /\b(aces?|double faults?|break points?|sets? won|games won)\b/i },
    { sport: "American Football", pattern: /\b(touchdowns?|passing yards|rushing yards|field goals?|quarterbacks?)\b/i },
];

const LEAGUE_SPORT_HINTS: Array<{ sport: string; pattern: RegExp }> = [
    { sport: "Basketball", pattern: /\b(fiba|nba|wnba|euroleague|ncaab|basketball)\b/i },
    { sport: "Baseball", pattern: /\b(mlb|baseball|world series)\b/i },
    { sport: "Football", pattern: /\b(premier league|serie [abc]|la liga|bundesliga|ligue 1|eredivisie|champions league|europa league|brasileiro|botola|soccer|fifa|world cup(?!\s*,\s*eu)|club friendly|friendly games?)\b/i },
    { sport: "Ice Hockey", pattern: /\b(nhl|hockey|khl)\b/i },
    { sport: "Tennis", pattern: /\b(atp|wta|tennis|grand slam)\b/i },
    { sport: "Esports", pattern: /\b(esports?|dota|valorant|cs2|csgo|counter-strike|league of legends)\b/i },
    { sport: "Cricket", pattern: /\b(ipl|t20|odi|cricket|ashes)\b/i },
    { sport: "Boxing", pattern: /\bboxing\b/i },
    { sport: "MMA", pattern: /\b(ufc|mma)\b/i },
    { sport: "American Football", pattern: /\b(nfl|cfl|ncaaf|super bowl)\b/i },
];

const TEAM_SPORT_HINTS: Array<{ sport: string; pattern: RegExp }> = [
    { sport: "Basketball", pattern: /\b(las vegas aces|indiana fever|wnba)\b/i },
    { sport: "Baseball", pattern: /\b(texas rangers|detroit tigers|chicago cubs|st\.? louis cardinals|new york yankees|los angeles dodgers|boston red sox)\b/i },
];

export function inferSportFromBet(bet: BetSportContext): string {
    const haystack = [
        bet.league,
        bet.country,
        bet.match,
        bet.fixture_name,
        bet.searchEvent,
        bet.market,
        bet.selection,
    ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    if (!haystack) return "";

    for (const { sport, pattern } of MARKET_SPORT_HINTS) {
        if (pattern.test(haystack)) return sport;
    }
    for (const { sport, pattern } of LEAGUE_SPORT_HINTS) {
        if (pattern.test(haystack)) return sport;
    }
    for (const { sport, pattern } of TEAM_SPORT_HINTS) {
        if (pattern.test(haystack)) return sport;
    }

    for (const sport of SPORT_CATALOG) {
        const names = [sport.name, ...sport.aliases];
        for (const name of names) {
            const key = normalize(name);
            if (key.length < 3) continue;
            const pattern = new RegExp(`(?:^|\\s)${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`, "i");
            if (pattern.test(haystack)) return sport.name;
        }
    }

    const matchText = [bet.match, bet.fixture_name, bet.searchEvent]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    const nonFootballFixture = /\b(esports?|enterprise|reborn|middlesex|essex|rangers|tigers|cubs|cardinals|yankees|dodgers|aces|fever|fiba|wnba|nba|mlb|nfl|nhl|cricket|hockey|tennis|ufc|mma)\b/i;
    const footballMarket = /\b(full time result|total goals?|btts|both teams|corners?|shots on target|booked|to score|player shots|spread|moneyline|money line|handicap|1x2|draw no bet)\b/i;

    const fixtureVsPattern = /\bv(?:s|\.)?\b/i;
    if (fixtureVsPattern.test(matchText) && !nonFootballFixture.test(haystack) && (footballMarket.test(haystack) || !/\b(basketball|baseball|cricket|hockey|tennis|mma|rugby|esports?)\b/i.test(haystack))) {
        return "Football";
    }

    return "";
}

export function normalizeSportName(value: unknown): string {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const key = normalize(raw);
    const aliases: Record<string, string> = {
        football: "Football",
        soccer: "Football",
        basketball: "Basketball",
        baseball: "Baseball",
        cricket: "Cricket",
        esports: "Esports",
        esport: "Esports",
        tennis: "Tennis",
        hockey: "Ice Hockey",
        "ice hockey": "Ice Hockey",
        mma: "MMA",
        "ufc/mma": "MMA",
        boxing: "Boxing",
        rugby: "Rugby",
    };
    if (aliases[key]) return aliases[key];
    return getSportMeta(raw).name;
}

export function resolveBetSport(bet: BetSportContext): string {
    const explicit = normalizeSportName(bet.sport || bet.eventSport || "");
    if (explicit) return explicit;
    return inferSportFromBet(bet);
}

export function getSportMeta(value: unknown): SportMeta {
    const raw = String(value || "").trim();
    if (!raw) return UNKNOWN_SPORT;
    const key = normalize(raw);
    const found = SPORT_CATALOG.find((sport) => {
        if (normalize(sport.name) === key) return true;
        return sport.aliases.some((alias) => normalize(alias) === key);
    });
    if (found) return found;
    const fallback = raw
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
    return { name: fallback, emoji: "🏟️", aliases: [] };
}

export function sportOptionLabel(value: unknown) {
    const meta = getSportMeta(value);
    if (!meta.name) return "Unknown sport";
    return `${meta.emoji} ${meta.name}`;
}
