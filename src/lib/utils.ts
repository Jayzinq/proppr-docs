import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Bankroll display mode - Currency bankrolls show £/$/€; Units bankrolls show "u". */
export type BankrollLike = {
    type?: string | null;
    currency?: string | null;
    name?: string | null;
    id?: string | null;
    // IANA timezone: kickoff instants (bet.kickoff_utc) display and day-bucket in this zone.
    timezone?: string | null;
} | null | undefined;

export function getCurrencySymbol(code: string | undefined | null) {
    const c = String(code || "").trim().toUpperCase();
    if (!c) return "£";
    if (c === "GBP" || c === "£") return "£";
    if (c === "USD" || c === "$") return "$";
    if (c === "EUR" || c === "€") return "€";
    if (c === "AUD") return "A$";
    return c;
}

/**
 * True when the bankroll tracks cash (Currency mode), not abstract units.
 * Mirrors New Bet / Bets page logic so all track pages stay in sync.
 */
export function isCurrencyBankroll(bankroll: BankrollLike): boolean {
    if (!bankroll) return false;
    const typeLower = String(bankroll.type || "").toLowerCase();
    if (typeLower === "currency" || typeLower === "cash" || typeLower === "money") return true;
    if (typeLower === "units" || typeLower === "unit") return false;
    const cur = String(bankroll.currency || "").trim();
    return Boolean(cur && cur !== "u" && cur.toLowerCase() !== "units");
}

export type FormatBankrollOpts = {
    /** Prefix + for positive values (P/L style). */
    signed?: boolean;
    /** Decimal places (default 2). */
    digits?: number;
    /** Absolute value only (no sign). */
    abs?: boolean;
};

/**
 * Format a stake / bank / P/L amount for the active bankroll.
 * Currency mode → "£54.07" or "+£12.50"; units mode → "54.07u" or "+12.50u".
 */
export function formatBankrollAmount(
    value: number | string | null | undefined,
    bankroll: BankrollLike,
    opts: FormatBankrollOpts = {},
): string {
    const n = Number(value);
    const num = Number.isFinite(n) ? n : 0;
    const digits = opts.digits ?? 2;
    const display = opts.abs ? Math.abs(num) : num;
    const body = display.toFixed(digits);
    const currency = isCurrencyBankroll(bankroll);
    const symbol = currency ? getCurrencySymbol(bankroll?.currency) : "";
    const unit = currency ? "" : "u";

    if (opts.signed) {
        if (num > 0) return `+${symbol}${body}${unit}`;
        if (num < 0) return currency ? `-${symbol}${Math.abs(num).toFixed(digits)}` : body + unit;
        return `${symbol}${body}${unit}`;
    }
    // Unsigned: keep minus for negative currency as -£x
    if (!currency && num < 0) return body + unit;
    if (currency && num < 0) return `-${symbol}${Math.abs(num).toFixed(digits)}`;
    return `${symbol}${body}${unit}`;
}

/** Short axis-tick formatter (e.g. chart Y axis). */
export function formatBankrollTick(value: number, bankroll: BankrollLike): string {
    return formatBankrollAmount(value, bankroll, { digits: Number.isInteger(value) ? 0 : 1 });
}

/** Unit/cash noun for helper copy ("units" vs "cash"). */
export function bankrollUnitLabel(bankroll: BankrollLike, plural = true): string {
    if (isCurrencyBankroll(bankroll)) return plural ? "cash" : "cash";
    return plural ? "units" : "unit";
}

// Whether a bet should appear in the currently-viewed bankroll.
//
// A bet belongs to its own bankroll, but a bet with NO bankroll - or one whose
// bankroll_id points at a bankroll that no longer exists (deleted bankroll, stale
// id, half-finished create/delete) - must still be reachable, so it falls back to
// Personal. Without this, an "orphaned" bet matches no bankroll view and silently
// disappears from the whole app even though it is safe in the database.
//
// `knownIds` is the set of the user's current bankroll ids; pass it so orphans can
// be detected. When it is null/empty (not loaded yet) only the no-bankroll case
// falls back, matching the previous behaviour.
export function betInBankrollView(bet: any, activeId: string, knownIds?: Set<string> | null): boolean {
    const raw = bet?.bankroll_id;
    const bid = raw === undefined || raw === null ? '' : String(raw);
    if (bid && bid === String(activeId)) return true;
    const orphaned = !bid || (!!knownIds && knownIds.size > 0 && !knownIds.has(bid));
    return orphaned && String(activeId) === 'personal';
}

/**
 * DISPLAY-ONLY: abbreviate the word "Women"/"Woman" (incl. the possessive "Women's") to "(W)"
 * in a rendered string - e.g. "England Women" -> "England (W)", "Women's Super League" ->
 * "(W) Super League". Never mutate the stored document; wrap only the value passed to the UI.
 */
export function abbreviateWomen(value: any): string {
    const s = value == null ? '' : String(value);
    if (!s) return s;
    return s
        .replace(/\bwo(?:man|men)(?:['’]?s)?\b/gi, '(W)')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// Human-readable text fields on a bet where a "Women" team/league name can surface. Market,
// status, odds, ids etc. are deliberately excluded (never contain it, and branch logic reads them).
const WOMEN_DISPLAY_KEYS = [
    'match', 'searchEvent', 'fixture_name', 'selection', 'league', 'team',
    'player_name', 'home', 'away', 'home_team', 'away_team', 'event', 'match_name',
];

/**
 * DISPLAY-ONLY: return a SHALLOW COPY of a bet with its name fields "Women"->"(W)" abbreviated
 * (recursing into multi_bet_selections legs). The original object is never mutated, so nothing
 * that logic/save paths read is affected - wrap only the copy handed to the render loop.
 */
export function abbreviateWomenInBet<T extends Record<string, any>>(bet: T): T {
    if (!bet || typeof bet !== 'object') return bet;
    const copy: any = { ...bet };
    for (const key of WOMEN_DISPLAY_KEYS) {
        if (typeof copy[key] === 'string' && copy[key]) copy[key] = abbreviateWomen(copy[key]);
    }
    if (Array.isArray(copy.multi_bet_selections)) {
        copy.multi_bet_selections = copy.multi_bet_selections.map((leg: any) => abbreviateWomenInBet(leg));
    }
    return copy;
}

function isUnknownName(value: string) {
    const normalized = value.trim().toLowerCase();
    return !normalized || normalized === 'unknown player' || normalized === 'unknown';
}

// Canonical market labels that have been observed stored in player_name (usually from OCR/GPT
// imports). They are not people, so the UI must never render them as the player's name or prepend
// them to the selection.
const MARKET_LABEL_PLAYER_NAMES = new Set([
    'player yellow card', 'yellow card', 'player card', 'player cards', 'card', 'cards',
    'player booked first', 'booked first', 'first card', 'first booking',
    'to be booked', 'to be carded', 'booked', 'carded', 'booking', 'bookings',
    'player shots', 'player shots on target', 'player passes', 'player tackles',
    'player fouls', 'player fouls committed', 'player fouls won',
    'player goals', 'anytime goalscorer', 'player assists',
    'player corners', 'player saves', 'player throw ins', 'player free kicks',
    'player points', 'player rebounds', 'player assists',
    'player points + rebounds', 'player points + assists', 'player rebounds + assists',
    'player points + rebounds + assists',
]);

function isMarketLabelName(value: string) {
    return MARKET_LABEL_PLAYER_NAMES.has(value.trim().toLowerCase());
}

/** A team / match market (handicap, spread, result, BTTS, team or match totals, …) carries NO
 * player subject - its selection is a team + line, so a "+/-" or "Over X" prefix is the team/score,
 * not a player name. Player-prop markets (which may be mislabelled "Match Shots On Target") are
 * NOT matched here so their player is still extracted. */
export function isNonPlayerMarket(market: string): boolean {
    const m = String(market || '').toLowerCase();
    if (!m) return false; // unknown label -> allow extraction (could be a mislabelled player prop)
    if (m.includes('player') || m.includes('goalscorer') || m.includes('anytime') || m.includes('to assist')) return false;
    return /\b(handicap|spread|goal ?line|1x2|money ?line|double chance|draw no bet|both teams to score|btts|match result|full time result|half.?time result|result|team total|team (corners|cards|shots|tackles|fouls|offsides|saves|throw|free)|total (goals|corners|cards|shots|tackles|fouls|offsides|saves|throw|free)|asian (corners|cards)|corners totals)\b/.test(m);
}

/** Pull a player/team subject out of a selection line when it was only stored in `selection`. */
export function extractSubjectFromSelection(
    selection: string,
    market = '',
    direction = '',
    threshold?: string | number | null,
) {
    let text = String(selection || '').trim();
    if (!text) return '';
    // Team/match markets have no player subject - never mine the pick for one.
    if (isNonPlayerMarket(market)) return '';

    const marketLower = String(market || '').toLowerCase();
    const directionLower = String(direction || '').toLowerCase();
    const thresholdStr = threshold !== undefined && threshold !== null && threshold !== ''
        ? String(threshold)
        : '';

    const namedLine = text.match(/^(.+?)\s+(?:over|under|o|u)\s+([\d.]+)\b/i);
    if (namedLine) return namedLine[1].trim();

    const handicapLine = text.match(/^(.+?)\s+([+-]\d+(?:\.\d+)?)\b/);
    if (handicapLine) return handicapLine[1].trim();

    if (marketLower.includes('player') && !/^(over|under|yes|no)\b/i.test(text)) {
        if (directionLower && thresholdStr) {
            const prefix = new RegExp(
                `\\s+${directionLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+${thresholdStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b.*$`,
                'i',
            );
            text = text.replace(prefix, '').trim();
        }
        text = text.replace(
            /\b(?:player|match|team|total)\s+(?:passes?|shots?|sot|tackles?|cards?|corners?|fouls?|assists?|goals?|on target)\b.*$/i,
            '',
        ).trim();
        if (text && !/^(over|under|yes|no)\b/i.test(text)) return text;
    }

    return '';
}

export function resolvePlayerName(bet: any) {
    // A team/match market never has a player - ignore any player_name a stale save/derive left on it
    // (e.g. a handicap whose "(1-0) ABB 0.0," selection fragment got stored as player_name).
    if (isNonPlayerMarket(bet?.market || bet?.market_type || '')) return '';
    const explicit = String(bet?.player_name || bet?.playerName || '').trim();
    if (explicit && !isUnknownName(explicit) && !isMarketLabelName(explicit)) return explicit;

    const selection = resolveFullSelection(bet);
    const extracted = extractSubjectFromSelection(
        selection,
        bet?.market || bet?.market_type || '',
        bet?.bet_direction || bet?.betDirection || bet?.direction || '',
        bet?.threshold ?? bet?.line,
    );
    return extracted && !isUnknownName(extracted) && !isMarketLabelName(extracted) ? extracted : '';
}

/** Merge player/team name and direction line into one display selection string. */
export function resolveFullSelection(bet: any) {
    let selection = String(bet?.selection || '').trim();
    const playerName = String(bet?.player_name || bet?.playerName || '').trim();
    const teamName = String(bet?.team || bet?.teamName || '').trim();
    const direction = String(bet?.bet_direction || bet?.betDirection || bet?.direction || '').trim();
    const threshold = bet?.threshold ?? bet?.line;

    if (playerName && !isUnknownName(playerName) && !isMarketLabelName(playerName)) {
        if (!selection) {
            if (direction && threshold !== undefined && threshold !== null && threshold !== '') {
                selection = `${playerName} ${direction} ${threshold}`.trim();
            } else {
                selection = playerName;
            }
        } else if (!selection.toLowerCase().includes(playerName.toLowerCase())) {
            selection = `${playerName} ${selection}`.trim();
        }
    } else if (!selection && teamName) {
        if (direction && threshold !== undefined && threshold !== null && threshold !== '') {
            selection = `${teamName} ${direction} ${threshold}`.trim();
        } else {
            selection = teamName;
        }
    } else if (!selection && direction && threshold !== undefined && threshold !== null && threshold !== '') {
        selection = `${direction} ${threshold}`.trim();
    }

    if (!selection) {
        if (playerName && !isUnknownName(playerName)) return playerName;
        if (teamName) return teamName;
    }

    return selection;
}
