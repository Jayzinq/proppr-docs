/**
 * Native multi-format odds helpers for track pages.
 *
 * Accepts decimal (1.90), fractional (5/2, 9/10), American (+150, -110, 110),
 * Polymarket cents (50¢), and evens. Always stores math as decimal odds > 1.
 */

export type OddsFormat = 'decimal' | 'fractional' | 'american' | 'cents' | 'auto';

export type ParsedOdds = {
    /** Decimal odds used for P/L (e.g. 2.5). 0 if unparseable. */
    decimal: number;
    /** Preferred UI string (preserves original form when useful). */
    display: string;
    /** Polymarket entry price in cents, if applicable. */
    entryPriceCents: number | null;
    /** Detected input format. */
    format: OddsFormat;
};

function clean(value: unknown): string {
    return String(value ?? '')
        .replace(/\u00a0/g, ' ')
        .trim();
}

function fmtDec(n: number): string {
    if (!Number.isFinite(n)) return '';
    const s = n.toFixed(4).replace(/\.?0+$/, '');
    return s || '0';
}

function extractCents(raw: string): number | null {
    const m = raw.match(/(\d+(?:\.\d+)?)\s*(?:¢|c\b)/i);
    if (!m) return null;
    const cents = Number(m[1]);
    return cents > 0 ? cents : null;
}

function americanToDec(n: number): number {
    if (!Number.isFinite(n) || n === 0) return 0;
    if (n > 0) return 1 + n / 100;
    return 1 + 100 / Math.abs(n);
}

function decToAmerican(dec: number): string {
    if (!Number.isFinite(dec) || dec < 1.01) return '';
    if (dec >= 2) return `+${Math.round((dec - 1) * 100)}`;
    return String(Math.round(-100 / (dec - 1)));
}

function gcd(a: number, b: number): number {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) {
        const t = b;
        b = a % b;
        a = t;
    }
    return a || 1;
}

/** Convert decimal odds to a readable fraction via continued fractions. */
function decToFraction(dec: number): string {
    if (!Number.isFinite(dec) || dec <= 1) return '';
    const target = dec - 1; // profit fraction
    if (target <= 0) return '';
    // Continued fraction approximation (max den 100 keeps UI tidy)
    let x = target;
    const a0 = Math.floor(x);
    let h0 = 1;
    let k0 = 0;
    let h1 = a0;
    let k1 = 1;
    for (let i = 0; i < 12; i++) {
        const frac = x - Math.floor(x);
        if (frac < 1e-9) break;
        x = 1 / frac;
        const a = Math.floor(x + 1e-9);
        const h = a * h1 + h0;
        const k = a * k1 + k0;
        if (k > 100) break;
        h0 = h1;
        k0 = k1;
        h1 = h;
        k1 = k;
        if (Math.abs(h1 / k1 - target) < 1e-4) break;
    }
    if (k1 <= 0) {
        const den = 100;
        const num = Math.round(target * den);
        const d = gcd(num, den);
        return `${num / d}/${den / d}`;
    }
    const d = gcd(h1, k1);
    return `${h1 / d}/${k1 / d}`;
}

/** Normalize bankroll / UI odds format labels. */
export function normalizeOddsFormat(value: unknown): OddsFormat {
    const v = String(value || '').toLowerCase().trim();
    if (v === 'american' || v === 'us' || v === 'american odds') return 'american';
    if (v === 'fractional' || v === 'fraction' || v === 'frac' || v === 'uk') return 'fractional';
    if (v === 'cents' || v === '¢' || v === 'polymarket') return 'cents';
    if (v === 'auto') return 'auto';
    return 'decimal';
}

/**
 * Render a decimal price in the user's preferred display format.
 * Math always stays decimal; this is display-only.
 */
export function formatDecimalAs(dec: number, format: OddsFormat = 'decimal'): string {
    if (!Number.isFinite(dec) || dec <= 1) return '';
    const fmt = normalizeOddsFormat(format);
    if (fmt === 'american') return decToAmerican(dec);
    if (fmt === 'fractional') return decToFraction(dec);
    if (fmt === 'cents') {
        const cents = 100 / dec;
        const s = cents.toFixed(2).replace(/\.?0+$/, '');
        return `${s}¢`;
    }
    return fmtDec(dec);
}

/**
 * Parse free-typed odds in any common format into decimal + display.
 * Prefer an explicit `preferredFormat` when the UI selector is set; otherwise auto-detect.
 */
export function parseOdds(value: unknown, preferredFormat: OddsFormat = 'auto'): ParsedOdds {
    const raw = clean(value);
    if (!raw) return { decimal: 0, display: '', entryPriceCents: null, format: 'auto' };

    // Evens
    if (/^(evs|evens|even)$/i.test(raw)) {
        return { decimal: 2, display: '2 (evens)', entryPriceCents: null, format: 'fractional' };
    }

    const cents = extractCents(raw);

    // Explicit American from preferred format (signed or bare integer)
    if (preferredFormat === 'american') {
        const american = Number(String(raw).replace(/[()\s]/g, ''));
        if (Number.isFinite(american) && Math.abs(american) >= 100) {
            const dec = americanToDec(american);
            const label = american > 0 ? `+${american}` : String(american);
            return {
                decimal: dec,
                display: `${fmtDec(dec)} (${label})`,
                entryPriceCents: null,
                format: 'american',
            };
        }
    }

    // American: +150 / -110 / (+200) - require |n|>=100 so handicaps (+1.5) never match.
    // Bare unsigned integers (e.g. "450") are treated as decimal below, because decimal
    // longshots are common for player props and bet builders.
    const us = raw.match(/^\(?\s*([+-]\d{3,5})\s*\)?$/);
    if (!cents && us) {
        const n = Number(us[1]);
        if (Math.abs(n) >= 100) {
            const dec = americanToDec(n);
            return {
                decimal: dec,
                display: `${fmtDec(dec)} (${us[1]})`,
                entryPriceCents: null,
                format: 'american',
            };
        }
    }

    // Fractional: 5/2, 9/10, 3/1
    const frac = raw.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
    if (!cents && (preferredFormat === 'fractional' || frac) && frac) {
        const den = Number(frac[2]);
        if (den > 0) {
            const dec = 1 + Number(frac[1]) / den;
            return {
                decimal: dec,
                display: `${fmtDec(dec)} (${frac[1]}/${frac[2]})`,
                entryPriceCents: null,
                format: 'fractional',
            };
        }
    }

    // Polymarket cents
    if (cents != null || preferredFormat === 'cents') {
        const c = cents ?? Number(raw);
        if (c > 0 && c < 100) {
            // Prefer an explicit decimal also present in the string
            const decimalCandidates = [
                ...raw.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)(?![\d.]|\s*(?:¢|c\b))/gi),
            ]
                .map((m) => Number(m[1]))
                .filter((n) => Number.isFinite(n) && n !== c && n >= 1 && n <= 100);
            const dec = decimalCandidates[0] ?? 100 / c;
            return {
                decimal: dec,
                display: `${fmtDec(dec)} (${String(c).replace(/\.0+$/, '')}¢)`,
                entryPriceCents: c,
                format: 'cents',
            };
        }
    }

    // Decimal odds (includes bare integers: 450 is decimal 450.0, not +450).
    const decMatch = raw.match(/(?<![\d.])(\d+(?:\.\d+)?)(?![\d.])/);
    if (decMatch) {
        const dec = Number(decMatch[1]);
        if (Number.isFinite(dec) && dec > 1 && dec <= 1000) {
            return {
                decimal: dec,
                display: fmtDec(dec),
                entryPriceCents: null,
                format: 'decimal',
            };
        }
    }

    return { decimal: 0, display: raw, entryPriceCents: null, format: preferredFormat };
}

/** Numeric decimal odds for math (P/L, charts). Returns 0 if unparseable. */
export function oddsToDecimal(value: unknown, preferredFormat: OddsFormat = 'auto'): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        // Numeric database values are canonical decimal prices. American input remains a
        // string ("+150" / "-110"), so a legitimate longshot price such as 110.0 must not
        // silently become +110 (2.10) when it is read back from storage.
        return value > 1 ? value : 0;
    }
    return parseOdds(value, preferredFormat).decimal;
}

/**
 * Display string for a bet row.
 *
 * `preferredFormat` comes from the active bankroll (decimal / american / fractional / cents).
 * - decimal (default): show decimal; keep Polymarket hybrid "1.92 (52¢)" when present
 * - american / fractional / cents: convert the stored decimal into that format
 */
export function formatOddsDisplay(
    bet: {
        odds?: unknown;
        display_odds?: unknown;
        displayOdds?: unknown;
        entry_price_cents?: unknown;
        entryPriceCents?: unknown;
    },
    preferredFormat: OddsFormat | string = 'decimal',
): string {
    const fmt = normalizeOddsFormat(preferredFormat);
    // `odds` is canonical database data, so an unsigned numeric string such as "110"
    // means decimal 110.0 even when the viewer selected American display. Human-form
    // fallbacks can still auto-detect explicit +150/-110, fractions, and cents.
    let dec = oddsToDecimal(bet.odds, 'decimal');
    if (!(dec > 1)) dec = oddsToDecimal(bet.display_odds ?? bet.displayOdds, 'auto');
    if (!(dec > 1)) {
        // Fall back to raw display string if we can't parse
        return clean(bet.display_odds ?? bet.displayOdds ?? bet.odds);
    }

    // Decimal mode: prefer stored hybrid display for Polymarket (1.92 (52¢)) or a
    // plain decimal string. If display_odds is an American (+450) or fractional (5/2)
    // string it does not belong in decimal display, so render from the canonical value.
    if (fmt === 'decimal' || fmt === 'auto') {
        const display = clean(bet.display_odds ?? bet.displayOdds);
        if (display && !/^\(?\s*[+-]/.test(display) && !display.includes('/')) {
            return display;
        }
        return fmtDec(dec);
    }

    // Cents: use stored entry cents when available
    if (fmt === 'cents') {
        const centsRaw = bet.entry_price_cents ?? bet.entryPriceCents;
        const cents = centsRaw != null && centsRaw !== '' ? Number(centsRaw) : null;
        if (cents != null && Number.isFinite(cents) && cents > 0) {
            return `${String(cents).replace(/\.0+$/, '')}¢`;
        }
        return formatDecimalAs(dec, 'cents');
    }

    return formatDecimalAs(dec, fmt);
}

export function formatDecimal(dec: number): string {
    return fmtDec(dec);
}

export function toAmerican(dec: number): string {
    return decToAmerican(dec);
}

export function toFractional(dec: number): string {
    return decToFraction(dec);
}

/**
 * Format any odds-like value (entry, CLV, cashout, live sharp) for display.
 * Complete prices convert into the bankroll format; incomplete free-typed text is left as-is.
 */
export function formatAnyOdds(
    value: unknown,
    preferredFormat: OddsFormat | string = 'decimal',
): string {
    if (value === null || value === undefined || value === '') return '';
    const fmt = normalizeOddsFormat(preferredFormat);
    const dec = oddsToDecimal(value, fmt);
    if (dec > 1) return formatDecimalAs(dec, fmt);
    // Mid-edit / unparseable - keep the raw string so typing isn't clobbered.
    return clean(value);
}

/** Active bankroll odds format from localStorage (set by BankrollSelector). */
export function getActiveOddsFormat(): OddsFormat {
    try {
        return normalizeOddsFormat(
            typeof localStorage !== 'undefined'
                ? localStorage.getItem('active_bankroll_odds_format')
                : 'decimal',
        );
    } catch {
        return 'decimal';
    }
}

/** Placeholder for odds inputs by format preference. */
export function oddsPlaceholder(format: OddsFormat | string): string {
    switch (normalizeOddsFormat(format)) {
        case 'fractional':
            return '5/2 or 9/10';
        case 'american':
            return '+150 or -110';
        case 'cents':
            return '52.6¢';
        default:
            return '1.90, +150, 5/2…';
    }
}

export const ODDS_FORMAT_OPTIONS: { value: OddsFormat; label: string; hint: string }[] = [
    { value: 'decimal', label: 'Decimal', hint: '1.90, 2.50' },
    { value: 'american', label: 'American (US)', hint: '+150, -110' },
    { value: 'fractional', label: 'Fractional (UK)', hint: '5/2, 9/10' },
    { value: 'cents', label: 'Cents (Polymarket)', hint: '52¢' },
];
