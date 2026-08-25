'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
    AlertCircle,
    CalendarClock,
    Check,
    CheckCircle2,
    Database,
    Download,
    FileSpreadsheet,
    Link2,
    Loader2,
    Search,
    ShieldCheck,
    Upload,
} from 'lucide-react';
import { MorphActionMenu, TrackAccordion } from '@/components/transitions/Motion';
import { formatAnyOdds, getActiveOddsFormat, type OddsFormat } from '@/lib/odds';

type ParsedRow = Record<string, string>;

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
    aliases?: string[];
};

type ImportBet = {
    id: string;
    rowNumber: number;
    date: string;
    time: string;
    event: string;
    selection: string;
    market: string;
    betDirection: string;
    bookmaker: string;
    odds: string;
    stake: string;
    status: string;
    group: string;
    sport: string;
    league: string;
    country: string;
    closingLineOdds: string;
    cashedOutOdds: string;
    comment: string;
    predictionMarket: string;
    predictionPosition: string;
    threshold: number | null;
    marketDirection: string;
    statType: string;
    apiTypeId: number | null;
    apiLocation: string;
    playerName: string;
    team: string;
    warnings: string[];
    matchedEvent?: EventSuggestion;
    matchScore: number;
    importFormat: string;
    isMultiple?: boolean;
    multiBetSelections?: MultiLeg[];
};

// One leg of an accumulator / bet-builder. Each leg carries its own fixture + selection so
// the backend resolves each game separately (home/away decided by date, not slot order).
type MultiLeg = {
    selection: string;
    market: string;
    team: string;
    player_name: string;
    bet_direction: string;
    match: string;
    date: string;
    time: string;
    league: string;
    country: string;
    sport: string;
    odds: string;
};

const resultLabels: Record<string, string> = {
    pending: 'Pending',
    won: 'Won',
    lost: 'Lost',
    void: 'Void',
    refund: 'Refund',
    'half win': 'Half win',
    'half loss': 'Half loss',
    'cashed out': 'Cashed out',
};

const statusBadgeClass: Record<string, string> = {
    won: 'bg-[#ecfdf5] text-[#047857]',
    'half win': 'bg-emerald-50 text-emerald-600',
    lost: 'bg-red-50 text-red-600',
    'half loss': 'bg-rose-50 text-rose-500',
    refund: 'bg-amber-50 text-amber-600',
    void: 'bg-slate-100 text-slate-500',
    'cashed out': 'bg-sky-50 text-sky-600',
    pending: 'bg-gray-100 text-gray-600',
};

function normalizeHeader(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function first(row: ParsedRow, keys: string[]) {
    for (const key of keys) {
        const target = normalizeHeader(key);
        const match = Object.entries(row).find(([header]) => normalizeHeader(header) === target);
        const value = match?.[1]?.trim();
        if (value) return value;
    }
    return '';
}

function splitCsvLine(line: string, delimiter: string) {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];
        if (char === '"' && next === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            cells.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    cells.push(current.trim());
    return cells.map((cell) => cell.replace(/^"|"$/g, '').trim());
}

function detectDelimiter(text: string) {
    const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || '';
    const comma = (firstLine.match(/,/g) || []).length;
    const semicolon = (firstLine.match(/;/g) || []).length;
    const tab = (firstLine.match(/\t/g) || []).length;
    if (tab > comma && tab > semicolon) return '\t';
    return semicolon > comma ? ';' : ',';
}

function parseCsv(text: string) {
    const delimiter = detectDelimiter(text);
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return { delimiter, rows: [] as ParsedRow[], headers: splitCsvLine(lines[0] || '', delimiter) };
    const headers = splitCsvLine(lines[0], delimiter);
    const rows = lines.slice(1).map((line) => {
        const cells = splitCsvLine(line, delimiter);
        return Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    });
    return { delimiter, rows, headers };
}

const MONTH_NUM: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// Normalize a time token into "HH:MM" (24h). Handles "8:00 PM", "12:30:00 PM",
// "13:00:00", and military "1600". Returns '' if it can't parse.
function normalizeTime(value: string): string {
    const s = (value || '').trim();
    if (!s) return '';
    const hm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?m\.?$/i);
    if (hm) {
        let h = parseInt(hm[1], 10);
        const ap = hm[3].toLowerCase();
        if (ap === 'p' && h < 12) h += 12;
        if (ap === 'a' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${hm[2]}`;
    }
    const h24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (h24) return `${h24[1].padStart(2, '0')}:${h24[2]}`;
    const mil = s.match(/^(\d{2})(\d{2})$/);           // "1600" -> 16:00
    if (mil && Number(mil[1]) < 24) return `${mil[1]}:${mil[2]}`;
    return '';
}

// Parse a date + time from a variety of tracker/spreadsheet formats. `yearHint` (e.g.
// a "Month" column like "April 2025") supplies the year for month-name dates that omit it.
function parseDateTime(dateValue: string, timeValue: string, yearHint?: string) {
    const dv = (dateValue || '').trim();
    // time may be its own column, or embedded in the date string
    let time = normalizeTime(timeValue);
    if (!time) {
        const embedded = dv.match(/\b\d{1,2}:\d{2}(?::\d{2})?\s*[ap]?\.?m?\.?\b/i);
        if (embedded) time = normalizeTime(embedded[0]);
    }
    if (!dv) return { date: '', time };

    const iso = dv.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, time };

    const euro = dv.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (euro) {
        // "a/b/YYYY" is ambiguous (D/M vs M/D - sheets differ: Charlie Free is D/M,
        // Charlie Premium is M/D). Resolve via the >12 rule, then the month hint, else
        // default to D/M (international).
        const d1 = parseInt(euro[1], 10);
        const d2 = parseInt(euro[2], 10);
        const hintMonth = (yearHint || '').toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
        const hm = hintMonth ? parseInt(MONTH_NUM[hintMonth[1]], 10) : 0;
        let day = d1, mon = d2;                              // default D/M
        if (d1 > 12) { day = d1; mon = d2; }                 // d1 can't be a month
        else if (d2 > 12) { day = d2; mon = d1; }            // d2 can't be a month -> M/D
        else if (hm && hm === d1 && hm !== d2) { day = d2; mon = d1; }  // hint says d1 is the month
        const year = euro[3].length === 2 ? `20${euro[3]}` : euro[3];
        return { date: `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`, time };
    }

    // DD MMM YY format ("16 Aug 26")
    const ddmmmyy = dv.match(/^(\d{1,2})\s+([a-z]{3,})\b.*?(\d{2,4})/i);
    if (ddmmmyy) {
        const day = parseInt(ddmmmyy[1], 10);
        const month = ddmmmyy[2].slice(0, 3).toLowerCase();
        const rawYear = ddmmmyy[3];
        const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
        
        if (MONTH_NUM[month]) {
            return { date: `${year}-${MONTH_NUM[month]}-${String(day).padStart(2, '0')}`, time };
        }
    }

    // Month-name + day ("Mar 4", "Apr 1", "January 17") - year from the hint column.
    const mn = dv.match(/^([a-z]{3,})\.?\s+(\d{1,2})\b/i);
    if (mn && MONTH_NUM[mn[1].slice(0, 3).toLowerCase()]) {
        const yr = (yearHint || '').match(/(20\d{2})/)?.[1] || String(new Date().getFullYear());
        return { date: `${yr}-${MONTH_NUM[mn[1].slice(0, 3).toLowerCase()]}-${mn[2].padStart(2, '0')}`, time };
    }

    const parsed = new Date(dv);
    if (!Number.isNaN(parsed.getTime())) return { date: parsed.toISOString().slice(0, 10), time };
    return { date: '', time };
}

// Rough human estimate of how long the background CLV backfill takes to reach `n` settled
// bets that are missing closing odds. The backfill fetches ~50 new fixtures per 30-min cycle
// (cache hits resolve sooner), so this treats each bet as ~1 fixture - an upper bound, since
// many bets share a fixture and obscure leagues/niche markets never get a closing line.
function estimateClvTime(n: number): string | null {
    if (n <= 0) return null;
    const FIXTURES_PER_RUN = 50;
    const RUN_INTERVAL_MIN = 30;
    const mins = Math.ceil(n / FIXTURES_PER_RUN) * RUN_INTERVAL_MIN;
    if (mins <= 60) return 'about an hour';
    if (mins < 60 * 24) {
        const hrs = Math.round(mins / 60);
        return `about ${hrs} hour${hrs === 1 ? '' : 's'}`;
    }
    const days = Math.round(mins / (60 * 24));
    return `about ${days} day${days === 1 ? '' : 's'}`;
}

function normalizeStatus(value: string, date: string) {
    const raw = value.trim().toLowerCase();
    const map: Record<string, string> = {
        w: 'won',
        win: 'won',
        won: 'won',
        hw: 'half win',
        halfwon: 'half win',
        halfwin: 'half win',
        l: 'lost',
        loss: 'lost',
        lost: 'lost',
        hl: 'half loss',
        halflost: 'half loss',
        halfloss: 'half loss',
        p: 'pending',
        open: 'pending',
        pending: 'pending',
        tbd: 'pending',
        r: 'refund',
        refund: 'refund',
        refunded: 'refund',
        push: 'refund',
        void: 'void',
        canceled: 'void',
        cancelled: 'void',
        c: 'void',
        cash: 'cashed out',
        cashed: 'cashed out',
        cashout: 'cashed out',
        cashedout: 'cashed out',
    };
    if (map[raw]) return map[raw];

    const eventDate = Date.parse(`${date}T23:59:59`);
    if (!Number.isNaN(eventDate) && eventDate > Date.now()) return 'pending';
    return 'pending';
}

function inferMarketAndDirection(marketValue: string, selectionValue: string) {
    const combined = `${selectionValue} ${marketValue}`.trim();
    const directionMatch = combined.match(/\b(over|under|yes|no|home|away|draw)\b/i);
    const betDirection = directionMatch ? directionMatch[1].slice(0, 1).toUpperCase() + directionMatch[1].slice(1).toLowerCase() : '';
    let market = marketValue.trim();

    if (!market) {
        const cleaned = combined
            .replace(/\b(over|under|yes|no)\b/gi, '')
            .replace(/\b\d+(\.\d+)?\+?\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        market = cleaned || selectionValue.trim();
    }

    return { market, betDirection };
}

function extractThreshold(...values: string[]) {
    const combined = values.filter(Boolean).join(' ');
    const plus = combined.match(/(\d+(?:\.\d+)?)\s*\+/);
    if (plus) return Number(plus[1]);
    const line = combined.match(/\b(?:over|under|o|u)\s*(\d+(?:\.\d+)?)\b/i);
    if (line) return Number(line[1]);
    const any = combined.match(/\b(\d+(?:\.\d+)?)\b/);
    return any ? Number(any[1]) : null;
}

// Whole numbers get a trailing ".0" so lines read "1.0" not "1".
function formatLine(value: string | number) {
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return Number.isInteger(num) ? num.toFixed(1) : String(num);
}

// The line exactly as it appears in the selection, preserving Asian split lines
// ("0.0,-0.5") rather than collapsing to a single parsed number.
function extractLineLabel(selection: string) {
    const s = String(selection || '');
    const split = s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (split) return `${split[1]},${split[2]}`;
    const ou = s.match(/\b(?:over|under|o|u)\s*(-?\d+(?:\.\d+)?)/i);
    if (ou) return formatLine(ou[1]);
    const hc = s.match(/([+-]\d+(?:\.\d+)?)/);
    if (hc) return formatLine(hc[1]);
    const any = s.match(/(?:^|[^0-9])(\d+(?:\.\d+)?)(?![0-9])/);
    return any ? formatLine(any[1]) : '';
}

// Tidy a market label for display: drop "O/U" and collapse the stray dash/comma
// separators left over from splitting "Player - Over X - Stat" selections.
function cleanMarketLabel(market: string) {
    return String(market || '')
        .replace(/\bO\s*\/\s*U\b/gi, '')
        .replace(/\bplayer\b/gi, ' ')            // "Player to be Booked" -> "to be Booked"
        .replace(/[,\-][\s,\-]*[,\-]/g, ' · ')   // runs of 2+ dash/comma -> ·
        .replace(/\s+-\s+/g, ' · ')              // spaced single dash -> ·
        .replace(/\s*·\s*/g, ' · ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s·,\-]+|[\s·,\-]+$/g, '')
        .trim();
}

// The clean "subject · market · direction · line X" breakdown shown under a bet.
function formatBreakdown(bet: ImportBet) {
    const parts: string[] = [cleanMarketLabel(bet.market) || 'No market'];
    if (bet.betDirection) parts.push(bet.betDirection);
    const line = extractLineLabel(bet.selection || '');
    if (line) parts.push(`line ${line}`);
    return parts.join(' · ');
}

// Player-prop markets whose canonical name doesn't literally contain "player"
// (pitcher/receptions/yards/etc.) - used to know when a selection's leading " - "
// segment is a player name worth extracting.
const PLAYER_PROP_MARKET_RE = /\b(player|pitcher|reception|rushing yards|receiving yards|passing yards|double double|strikeout|earned run|hits)\b/i;

// Tidy an import selection for display: drop a trailing "O/U" (and the sheet's own
// "OU"/"OJU" typos), flatten " - " separators to spaces, collapse whitespace. Turns
// "Kahleah Copper - Under 13.5 - Points O/U" -> "Kahleah Copper Under 13.5 Points".
function cleanImportSelection(raw: string) {
    return String(raw || '')
        .replace(/\s+O[\/J]{0,2}U\s*$/i, '')     // trailing "O/U" / "OU" / "OJU"
        .replace(/\s+-\s+/g, ' ')                // spaced single dash -> space
        // Drop the redundant market-noise word "Player" ("Kone Player to be Booked" ->
        // "Kone to be Booked"); the player's name already leads the selection.
        .replace(/\bplayer\b/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .replace(/^[\s,\-]+|[\s,\-]+$/g, '')
        .trim();
}

// True only for totals-style (over/under) markets. Result/yes-no/handicap/goalscorer
// markets have no Over/Under - defaulting their direction to "over" leaks a false
// "Over Full Time Result" / "Over Player to be Booked" onto the bet label.
// eSoccer / eFootball (FIFA/EA FC video-game matches) share real team names with real
// football, so they must be tagged as a distinct sport or they get graded/CLV'd against
// real fixtures. Two reliable signals in these sheets: (1) League == bare "FIFA" (the game;
// the real tournament is "FIFA World Cup"), or an eAdriatic/GT Sports/eSoccer league; (2)
// two single-token gamer handles ("Norway (Logan) vs France (Vangogh)"). Handle-less
// esoccer ("Arsenal vs Dortmund", League FIFA) is caught by the league signal alone.
// Count tell-tale single-token gamer handles ("(Logan)", "(Kostolom89)") in a string.
// Rejects real qualifiers ((W), (U21), region codes) and multi-word parens (multi-bet notation).
function countGamerHandles(text: string): number {
    return (String(text || '').match(/\(([^)]+)\)/g) || []).filter((p) => {
        const inner = p.slice(1, -1).trim();
        if (/\s/.test(inner)) return false;
        if (/^(w|women|reserves?|youth|u-?\d+|[a-z]{2,3}|am|pm)$/i.test(inner)) return false;
        return /[a-z]/i.test(inner) && inner.length >= 3;
    }).length;
}

const ESOCCER_META_RE = /(^|\s)fifa(\s|$)(?!\s*world)|efootball|e-?soccer|e-?adriatic|gt sports league|gt leagues?|esoccer|volta|e-?basket/i;

function isEsoccerBet(league: string, event: string): boolean {
    if (ESOCCER_META_RE.test(String(league || '').toLowerCase())) return true;
    return countGamerHandles(event) >= 2;
}

// Markets the video-game sports (eSoccer / eBasketball) NEVER price - they only offer team
// totals (result, over/under, BTTS, handicap, correct score). Player props, cards, corners,
// bookings, fouls, shots, tackles, bet builders exist only in REAL football/basketball. A bet on
// any of these is unmistakably a real-sport bet, so it must never match a video-game fixture even
// when the team names collide. This is the authoritative signal - it OVERRIDES a bland
// "FIFA"/"World Cup" league label (e.g. "Kudus to be Booked" in the FIFA Club World Cup).
const REAL_SPORT_ONLY_MARKET_RE = /\b(bet\s*build(?:er)?|book(?:ed|ing)|to be booked|cards?|corners?|fouls?|tackles?|shots?|offsides?|throw[\s-]?ins?|assists?|saves?|goalscorer|to score or|rebounds?|points?|threes?|three[\s-]?points?|steals?|blocks?|double[\s-]?double|triple[\s-]?double|player\s+props?)\b/i;
function betHasRealSportOnlyMarket(bet: ImportBet): boolean {
    const legs = (bet.multiBetSelections || []).map((l) => `${l.market || ''} ${l.selection || ''}`).join(' ');
    return REAL_SPORT_ONLY_MARKET_RE.test(`${bet.market || ''} ${bet.selection || ''} ${bet.group || ''} ${legs}`);
}

// A candidate index fixture is eSoccer when its metadata says so OR both teams carry a handle
// (eSoccer leagues sometimes mirror real names like "Premier League", so the handle is the tell).
function fixtureIsEsoccer(e: EventSuggestion): boolean {
    const meta = `${e.sport || ''} ${e.league || ''} ${e.country || ''} ${e.leagueSlug || ''}`.toLowerCase();
    if (ESOCCER_META_RE.test(meta)) return true;
    return countGamerHandles(e.home) >= 1 && countGamerHandles(e.away) >= 1;
}

// Whether a BET is a video-game (eSoccer/eBasketball) bet: its sheet metadata flags it, UNLESS it
// carries a real-sport-only market - that override is why "Kudus to be Booked" in the FIFA Club
// World Cup stays real.
function betIsEsoccer(bet: ImportBet): boolean {
    if (betHasRealSportOnlyMarket(bet)) return false;
    const sport = String(bet.sport || '').toLowerCase();
    return sport.includes('esoccer') || sport.includes('ebasket') || isEsoccerBet(bet.league || '', bet.event || '');
}

function isOverUnderMarket(market: string) {
    return /\b(total|goal line|shots on target|pitcher|team total)\b|player\s+(points|rebounds|assists|threes|hits|shots|goals|passes|tackles|fouls)|points\+|rebounds\+|hits\+|fouls won|reception|rushing yards|receiving yards|passing yards|\bmaps\b/i.test(market);
}

function inferGradingMeta(market: string, selection: string, direction: string, event: string) {
    const combined = normalizeText(`${market} ${selection}`);
    const marketLower = market.toLowerCase();
    const selectionLower = selection.toLowerCase();
    // Only totals markets carry an Over/Under. For everything else, honour an explicit
    // over/under in the text but never DEFAULT to "over" (that's the "Over Full Time
    // Result" leak) - leave it empty so no false side shows on the label.
    const marketDirection = direction
        ? direction.toLowerCase()
        : selectionLower.includes('under')
            ? 'under'
            : isOverUnderMarket(market)
                ? 'over'
                : selectionLower.includes('over')
                    ? 'over'
                    : '';
    let statType = '';
    let apiTypeId: number | null = null;
    let apiLocation = '';

    if (combined.includes('corner')) {
        statType = 'corners';
        apiTypeId = 34;
    } else if (combined.includes('card') || combined.includes('booking')) {
        statType = 'cards';
        apiTypeId = 84;
    } else if (combined.includes('shot on target') || combined.includes('sot')) {
        statType = 'shots_on_target';
        apiTypeId = 86;
    } else if (combined.includes('shot')) {
        statType = marketLower.includes('player') ? 'shots_total' : 'shots';
        apiTypeId = 42;
    } else if (combined.includes('tackle')) {
        statType = 'tackles';
        apiTypeId = 78;
    } else if (combined.includes('foul') && combined.includes('won')) {
        statType = 'fouls_won';
        apiTypeId = 96;
    } else if (combined.includes('foul')) {
        statType = 'fouls_committed';
        apiTypeId = 56;
    } else if (combined.includes('pass')) {
        statType = 'passes';
        apiTypeId = 80;
    } else if (combined.includes('assist')) {
        statType = 'assists';
        apiTypeId = 79;
    } else if (combined.includes('goal') || combined.includes('score')) {
        statType = 'goals';
        apiTypeId = 52;
    }

    if (combined.includes('home')) apiLocation = 'home';
    else if (combined.includes('away')) apiLocation = 'away';
    else if (combined.includes('total')) apiLocation = 'total';
    else if (marketLower.includes('handicap') || marketLower.includes('spread')) apiLocation = 'handicap_comparison';

    let team = '';
    let playerName = '';
    const sides = event.split(/\s+v(?:s|\.)?\s+/i).map((part) => part.trim()).filter(Boolean);
    if (apiLocation === 'home') team = sides[0] || '';
    if (apiLocation === 'away') team = sides[1] || '';

    if (marketLower.includes('player') || PLAYER_PROP_MARKET_RE.test(marketLower)) {
        // These sheets format player props as "<Player> - <Over/Under Line> - <Stat> O/U"
        // (combos joined by "/"). The player is the first " - "-delimited segment - only
        // trust it when the selection actually has that structure, otherwise leave the name
        // for the backend extractor (e.g. dashless "Drinan To Score at Any Time").
        const segs = selection.split(/\s+-\s+/);
        if (segs.length >= 2 && !/^(over|under|yes|no|draw)\b/i.test(segs[0].trim())) {
            playerName = segs[0].trim();
        }
    }

    return {
        threshold: extractThreshold(selection, market),
        marketDirection,
        statType,
        apiTypeId,
        apiLocation,
        team,
        playerName,
    };
}

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}


function identifyFormat(headers: string[]) {
    const normalized = headers.map(normalizeHeader);
    if (normalized.includes('state') && normalized.includes('label')) return 'Bet Analytix';
    if (normalized.includes('event') && normalized.includes('market') && normalized.includes('selection')) return 'Sharp template';
    if (normalized.includes('game') && normalized.includes('bookie')) return 'Generic tracker';
    return 'Custom CSV';
}

// Map a Bet Analytix "BetType" (+ selection text) to a market keyword the grader
// recognises. The grader matches on substrings (corner/card/total/handicap/...), so a
// canonical-ish market plus the intact selection line is enough for FotMob/Goaloo/SofaScore.
// Classify a bet into a CLEAN canonical market from its selection text (+ any market
// column). Runs for every format so the stored `market` is clean for display, analytics
// AND grading (the grader keys off `market` to pick the stat). Order matters - multi-bets
// and player props look like their leg/stat otherwise.
// Map the sheet's clean "Type" column (Unders / Player Props / Draw No Bet / Point spread /
// Anytime Goalscorer …) to a canonical market. Used AFTER the specific Bet-text keyword rules
// have all missed - at that point the Bet cell is ambiguous (bare fixture / lost detail) and
// Type is the best signal. Ambiguous types (Overs/Unders/Other) return '' so the generic
// Total-Goals/Player-Total guesses below still apply.
function marketFromType(typeHint: string, sport = ''): string {
    const t = String(typeHint || '').toLowerCase().trim();
    if (!t) return '';
    const ind = /tennis|darts|snooker|boxing|\bmma\b|ufc|table\s*tennis|badminton/i.test(sport);
    if (/corner/.test(t)) return /handicap/.test(t) ? 'Asian Handicap Corners' : 'Total Corners';
    if (/card/.test(t)) return /handicap/.test(t) ? 'Asian Handicap Cards' : 'Total Cards';
    if (/shots?\s+on\s+target/.test(t)) return 'Shots On Target';
    if (/shot/.test(t)) return 'Total Shots';
    if (/tackle/.test(t)) return 'Player Tackles';
    if (/anytime\s+goalscorer/.test(t)) return 'Anytime Goalscorer';
    if (/first\s+goalscorer/.test(t)) return 'First Goalscorer';
    if (/last\s+goalscorer/.test(t)) return 'Last Goalscorer';
    if (/draw\s+no\s+bet/.test(t)) return 'Draw No Bet';
    if (/double\s+chance/.test(t)) return 'Double Chance';
    if (/money\s*line/.test(t)) return ind ? 'Match Result' : 'Moneyline';
    if (/point\s*spread|\bspread\b/.test(t)) return 'Spread';
    if (/handicap|\basian\b/.test(t)) return 'Asian Handicap';       // "Asian", "Match Handicap"
    if (/match\s+winner|\bresult\b/.test(t)) return ind ? 'Match Result' : 'Full Time Result';
    if (/basketball\s+totals?/.test(t)) return 'Total Points';
    if (/player\s+props?/.test(t)) return 'Player Prop';
    return '';   // Overs / Unders / Other - too generic to pin a specific market
}

function detectMarket(marketCol: string, selection: string, sport = '', typeHint = ''): string {
    const sel = String(selection || '');
    const s = `${sel} ${marketCol || ''}`.toLowerCase();
    // Individual (1v1) sports call the win market "Match Result", not the football
    // "Full Time Result" (no draw). Golf is excluded - its "To Win" is an outright, not a H2H.
    const isIndividual = /tennis|darts|snooker|boxing|\bmma\b|ufc|table\s*tennis|badminton/i.test(sport);
    // In these tipster feeds the market is the LAST " - "-separated segment
    // ("AJ Green: 10Points - Points" -> "Points"; "Aaron Wan-Bissaka - Player to be Booked"
    // -> "Player to be Booked"). Used as the fallback so the long multi-sport tail comes out
    // clean (no subject/line) even when it isn't in the canonical list below.
    const dashParts = sel.split(/\s+-\s+/);
    const descriptor = dashParts.length > 1 ? dashParts[dashParts.length - 1].trim() : sel;

    // --- Explicit multi-bets / parlays (unambiguous keywords) ---
    if (/\bbet ?buil/.test(s)) return 'Bet Builder';   // incl. "Bet Builer" typo
    if (/\b(parlay|acca|accumulator|treble|fold)\b/.test(s)
        || /(?:four|five|six|seven|eight|nine|ten)\s*fold/.test(s)
        || /\d+\s*-?\s*(?:fold|leg)\b/.test(s)
        || /\((?:double|treble|parlay|acca|\d+-?leg)\)/.test(s)) return 'Multi-Bet';

    const isHcp = /spread|handicap/.test(s) || /(?:^|\s)[+-]\d/.test(sel);

    // --- Player props (name + stat, usually "O/U"). BEFORE the generic "&"/"/" multi check
    // below, because a stat combo like "Points, Assists & Rebounds" contains an "&". ---
    // Combined player stats incl. NBA abbreviations & same-game-parlay notation ("Pts & Reb",
    // "Pts/Ast/Reb", "PRA"). Here "&" / "/" joins STATS on ONE player (a combined market), NOT
    // separate legs - so these must run before the generic " & "/" / " multi check below.
    {
        const P = '(?:pts|points?)', R = '(?:reb|rebounds?)', A = '(?:ast|assists?)', C = '(?:[\\s,/&+]|and)+';
        if (new RegExp(`\\bpra\\b|${P}${C}${A}${C}${R}|${P}${C}${R}${C}${A}`).test(s)) return 'Player Points+Assists+Rebounds';
        if (new RegExp(`${P}${C}${A}`).test(s)) return 'Player Points+Assists';
        if (new RegExp(`${P}${C}${R}`).test(s)) return 'Player Points+Rebounds';
        if (new RegExp(`${R}${C}${A}`).test(s)) return 'Player Rebounds+Assists';
    }
    if (/pitcher\s+earned\s+runs/.test(s)) return 'Pitcher Earned Runs';
    if (/pitcher\s+outs/.test(s)) return 'Pitcher Outs';
    if (/pitcher\s+strikeouts|\bstrikeouts\b/.test(s)) return 'Pitcher Strikeouts';
    if (/(?:to\s+)?score\s+or\s+assist/.test(s)) return 'To Score Or Assist';
    if (/first\s+team\s+to\s+score/.test(s)) return 'First Team To Score';
    if (/last\s+team\s+to\s+score/.test(s)) return 'Last Team To Score';
    // "To score N+ (goals)" / "score N or more": 1+ IS just Anytime Goalscorer; 2+/3+ are
    // distinct hat-trick-style markets ("To Score 2+", "To Score 3+"). Runs before the generic
    // anytime rule so the number isn't swallowed.
    {
        const w: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
        const m = s.match(/(?:to\s+)?score\s+(?:(\d+)\s*\+|(\d+)\s+or\s+more|(one|two|three|four|five)(?:\s+or\s+more)?)/);
        if (m) {
            const n = m[1] ? Number(m[1]) : m[2] ? Number(m[2]) : (w[m[3]] || 1);
            return n >= 2 ? `To Score ${n}+` : 'Anytime Goalscorer';
        }
    }
    if (/anytime\s+(?:goalscorer|scorer)|score\s+anytime|to\s+score\b/.test(s)) return 'Anytime Goalscorer';
    if (/first\s+goalscorer/.test(s)) return 'First Goalscorer';
    if (/last\s+goalscorer/.test(s)) return 'Last Goalscorer';
    if (/to\s+be\s+booked|player\s+booking|\bbooking\b|to\s+be\s+carded/.test(s)) return 'Player to be Booked';
    if (/hits,?\s*runs\s*(?:&|and)\s*rbis?/.test(s)) return 'Player Hits+Runs+RBIs';
    if (/\bthrees?\b|3\s*point(?:er)?s?\s+made|\b3pm\b/.test(s)) return 'Player Threes';
    if (/\bblocks?\b|\bblk\b/.test(s)) return 'Player Blocks';
    if (/\bsteals?\b|\bstl\b/.test(s)) return 'Player Steals';
    if (/to\s+assist\b|player\s+to\s+assist/.test(s)) return 'Player Assists';
    // NBA/American abbreviations: Reb, Ast, Pts (as well as the full words).
    if (/\b(?:reb|rebounds?)\b/.test(s)) return 'Player Rebounds';
    if (/\b(?:ast|assists?)\b/.test(s) && !/goal/.test(s)) return 'Player Assists';
    if (/\b(?:pts|points?)\b/.test(s) && !/goal/.test(s)) return 'Player Points';
    if (/player\s+anytime|\bany\s*time\b/.test(s)) return 'Anytime Goalscorer';

    // --- Keyword-less multis (two clauses joined by " & " or " / ") ---
    if (/ & /.test(sel) || / \/ /.test(sel)) return 'Multi-Bet';

    // --- Team-stat markets ---
    if (/corner/.test(s)) return isHcp ? 'Asian Handicap Corners' : 'Total Corners';
    if (/card|booking/.test(s)) return isHcp ? 'Asian Handicap Cards' : 'Total Cards';
    if (/shots?\s+on\s+target/.test(s)) return 'Shots On Target';
    if (/offside/.test(s)) return 'Total Offsides';
    if (/throw.?in/.test(s)) return 'Total Throw-ins';
    if (/fouls?\s+won/.test(s)) return 'Fouls Won';
    if (/\bfoul/.test(s)) return 'Total Fouls';

    // --- Score / result markets ---
    if (/half.?time\s*\/?\s*full.?time|\bht\s*\/\s*ft\b/.test(s)) return 'Half-Time/Full-Time';
    if (/correct\s+score|final\s+score|\bscore:?\s*\d+\s*[-:]\s*\d+/.test(s)) return /half.?time|1st\s+half/.test(s) ? 'Half Time Correct Score' : 'Correct Score';
    if (/win\s+both\s+halves/.test(s)) return 'To Win Both Halves';
    if (/score\s+in\s+both\s+halves/.test(s)) return 'To Score In Both Halves';
    if (/both\s+teams\s+to\s+score|\bbtts\b/.test(s)) return 'Both Teams To Score';
    if (/draw\s+no\s+bet|\bdnb\b/.test(s)) return 'Draw No Bet';
    if (/double\s+chance/.test(s)) return 'Double Chance';
    if (/goal\s+line/.test(s)) return 'Goal Line';
    if (/total\s+maps|\bmaps\b/.test(s)) return 'Total Maps';
    if (/moneyline|money\s+line/.test(s)) return isIndividual ? 'Match Result' : 'Moneyline';
    if (/asian\s+handicap/.test(s)) return 'Asian Handicap';
    if (/full\s+time\s+result|match\s+result|match\s+winner|to\s+win\b|1x2|\bresult\b/.test(s)) return isIndividual ? 'Match Result' : 'Full Time Result';
    if (/team\s+total/.test(s)) return 'Team Total';
    if (/\bspread\b/.test(s)) return 'Spread';

    // The specific Bet-text keyword rules above have all missed - the Bet cell is ambiguous
    // here. The sheet's Type column is now the most reliable signal, so it wins over the
    // generic handicap/Total-Goals guesses below.
    const fromType = marketFromType(typeHint, sport);
    if (fromType) return fromType;

    if (isHcp) return 'Asian Handicap';
    // Totals family folds to the canonical "Goal Line" - never keep the line in the market
    // name ("Totals 2.75" is a Goal Line bet at 2.75, not its own market). Half markers in
    // the bet text pick the period variant.
    if (/total\s+goals|game\s+total|\bgoals?\b|\btotals?\s+\d|\bruns?\b/.test(s) || /\b(?:over|under|o|u)\s*[-+]?\d/.test(sel.toLowerCase())) {
        // Goal Line is FOOTBALL-ONLY. Other sports get their own totals market - dispatch on
        // the sport column first, then on stat words in the bet text (freshly imported rows
        // often have no sport yet, so "Runs"/"Points" in the text must be enough on their own).
        if (/basket|\bnba\b|\bwnba\b/i.test(sport) || /\bpoints?\b/.test(s)) return 'Total Points';
        if (/baseball|\bmlb\b|\bkbo\b|\bnpb\b/i.test(sport) || /\bruns?\b/.test(s)) return 'Total Runs';
        if (/tennis/i.test(sport)) return 'Total Games';
        if (/hockey|\bnhl\b/i.test(sport)) return 'Total Goals';
        if (/\b1h\b|1st\s+half|first\s+half/.test(s)) return '1st Half Goal Line';
        if (/\b2h\b|2nd\s+half|second\s+half/.test(s)) return '2nd Half Goal Line';
        return 'Goal Line';
    }

    // Fallback: a cleaned market column, else a generic label.
    // Descriptor is just a line/direction with no named stat ("Anthony Edwards - Over - 34.5")
    // -> the market is an unnamed player over/under; use a generic label rather than "34.5".
    if (/^[+-]?\d+(?:\.\d+)?$/.test(descriptor) || /^(over|under|player|yes|no)$/i.test(descriptor)) return 'Player Total';
    // Guard: when the "Bet" cell is really just the fixture (e.g. a bet-builder leg the
    // sheet recorded as "Wrexham v Chelsea player"), the descriptor is an event name, not a
    // market. Don't echo it as a market - call it Bet Builder (a bare "... player" suffix
    // implies a player builder) or Other.
    const looksLikeEvent = /\bvs?\b/i.test(descriptor) || /\bvs?\b/i.test(sel);
    if (looksLikeEvent) return /\bplayer\b/i.test(s) ? 'Bet Builder' : 'Other';
    return cleanMarketLabel(marketCol) || cleanMarketLabel(descriptor) || 'Other';
}

// "Newport County (vs AFC Wimbledon)" -> "Newport County vs AFC Wimbledon". The sheet names
// the BET team first and puts the opponent in "(vs …)"; the real fixture may have either team
// at home, so we just surface BOTH team names and let the date-based fixture matcher decide.
function parseFixtureNotation(raw: string): string {
    const s = String(raw || '').trim();
    const m = s.match(/^(.+?)\s*\(\s*v(?:s|\.)?\.?\s+(.+?)\s*\)\s*$/i);
    return m ? `${m[1].trim()} vs ${m[2].trim()}` : s;
}

// Strip a parlay/summary marker the sheet tacks onto a multi ("(Parlay)", "(Treble)", a
// trailing "- Treble under", or a bare trailing "unders"/"overs") so it doesn't leak into the
// last leg's selection/market.
function stripParlayMarkers(text: string): string {
    return String(text || '')
        .replace(/\((?:parlay|treble|double|acca|accumulator|\d+[-\s]?(?:fold|leg))\)/gi, ' ')
        .replace(/\s+-\s*(?:treble|double|parlay|acca|fold)\b[^+]*$/i, '')
        .replace(/\s+(?:unders?|overs?)\s*$/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function rowsToBets(rows: ParsedRow[], headers: string[], delimiter: string): ImportBet[] {
    const format = identifyFormat(headers);
    const isBetAnalytix = format === 'Bet Analytix';
    return rows.map((row, index): ImportBet | null => {
        const dateTime = parseDateTime(
            // Prefer an explicit event/match date over a "placed"/upload date column.
            first(row, ['match date', 'event date', 'date', 'placed date']),
            first(row, ['time gmt', 'time', 'kickoff', 'start time']),
            first(row, ['month', 'season', 'year']),
        );
        let eventDate = dateTime.date;
        let eventTime = dateTime.time;
        let event = first(row, ['event', 'game', 'match', 'label', 'fixture']);
        let rawMarket = first(row, ['market', 'bettype', 'bet type', 'category']);
        let rawSelection = first(row, ['selection', 'bet', 'pick', 'tip', 'bettype']);

        // Some rows have the odds spilled onto the end of the Match cell ("West Ham vs
        // Tottenham 41.00"). Strip it only when the trailing number equals the Odds column,
        // so real trailing numbers ("... vs Schalke 04") are left intact.
        const oddsRaw = first(row, ['odds', 'price']);
        if (oddsRaw && event) {
            const esc = oddsRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            event = event.replace(new RegExp('\\s+' + esc + '\\s*$'), '').trim();
        }

        if (isBetAnalytix) {
            // Label = "Home vs Away - Selection". Split off the selection (on the first
            // " - " that follows a "vs") so the event is a clean "Home vs Away" the backend
            // enrichment can resolve - otherwise the selection tokens tank the fixture match.
            const sep = event.indexOf(' - ');
            if (sep > 0 && /\bvs?\b/i.test(event.slice(0, sep))) {
                rawSelection = event.slice(sep + 3).trim();
                event = event.slice(0, sep).trim();
            }
            // The DATE is the real event day (dates span the whole season), but the TIME is a
            // placeholder (mostly 04:00/05:00). Keep the date so grading can disambiguate the
            // fixture; drop the time so the resolved fixture supplies the real kickoff.
            eventTime = '';
        }

        // Classify a CLEAN canonical market from the selection (+ any market column) for
        // EVERY format - replaces the old strip-based inference that left team-name/"- -"
        // debris in the market label. Direction still comes from inferMarketAndDirection.
        const market = detectMarket(first(row, ['market', 'bettype', 'bet type']), rawSelection, first(row, ['sport']), first(row, ['type', 'bet category', 'market category']));
        let { betDirection } = inferMarketAndDirection(rawMarket, rawSelection);
        // Over/Under only applies to totals-style markets. On result/handicap/goalscorer/
        // correct-score markets it's meaningless (e.g. a stray "Over" in the raw text turning
        // "Full Time Result" into "Over Full Time Result") - drop it there.
        if (/^(over|under)$/i.test(betDirection) && !isOverUnderMarket(market)) {
            betDirection = '';
        }
        const gradingMeta = inferGradingMeta(market, rawSelection, betDirection, event);
        const explicitThreshold = first(row, ['threshold', 'line']);
        const explicitDirection = first(row, ['market_direction', 'market direction', 'direction']);
        const odds = first(row, ['odds', 'price']);
        const stake = first(row, ['stake', 'units']);
        // Skip blank spreadsheet rows (Google-Sheets section spacers / subtotals) entirely so
        // they don't flood the preview with all-missing warnings and inflate the row count.
        if (!event && !rawSelection && !rawMarket && !odds && !stake) return null;

        const status = normalizeStatus(first(row, ['result', 'status', 'state']), eventDate);
        const warnings: string[] = [];

        if (!eventDate) warnings.push('Missing date');
        if (!event) warnings.push('Missing event');
        if (!rawSelection && !rawMarket) warnings.push('Missing selection');
        if (!odds) warnings.push('Missing odds');
        if (!stake) warnings.push('Missing stake');
        const sportVal = isEsoccerBet(first(row, ['league', 'competition']), event)
            ? (/basket/i.test(first(row, ['sport']) || '') ? 'eBasketball' : 'eSoccer')
            : first(row, ['sport']) || (format === 'Bet Analytix' ? first(row, ['sport']) : '');
        const leagueVal = first(row, ['league', 'competition']);
        const countryVal = first(row, ['country']);
        const typeVal = first(row, ['type', 'bet category', 'market category']);

        // Accumulator / bet-builder: the sheet joins legs with " + " in the Bet cell (and, when
        // the legs span different games, the Match cell too). Split into legs, pair each Bet-leg
        // to its Match-leg by index, and resolve each "Team (vs Opponent)" fixture - home/away is
        // decided later by the date-based fixture matcher, which keys on team tokens not order.
        const betLegs = stripParlayMarkers(rawSelection).split(/\s+\+\s+/).map((x) => x.trim()).filter(Boolean);
        const matchLegs = event.split(/\s+\+\s+/).map((x) => x.trim()).filter(Boolean);
        const isMultiple = betLegs.length > 1;
        let multiBetSelections: MultiLeg[] | undefined;
        let parentEvent = event;
        if (isMultiple) {
            multiBetSelections = betLegs.map((betLeg, li) => {
                const rawFix = matchLegs.length === betLegs.length ? matchLegs[li] : (matchLegs[0] || event);
                const legFixture = parseFixtureNotation(rawFix);
                const legMarket = detectMarket('', betLeg, sportVal, typeVal);
                let legDir = inferMarketAndDirection('', betLeg).betDirection;
                // Abbreviated over/under on NBA legs ("O12.5 Pts", "U39.5 Reb").
                if (!legDir && /(?:^|\s)o\s*\d/i.test(betLeg)) legDir = 'Over';
                else if (!legDir && /(?:^|\s)u\s*\d/i.test(betLeg)) legDir = 'Under';
                if (/^(over|under)$/i.test(legDir) && !isOverUnderMarket(legMarket)) legDir = '';
                const legMeta = inferGradingMeta(legMarket, betLeg, legDir, legFixture);
                return {
                    selection: cleanImportSelection(betLeg),
                    market: legMarket,
                    team: legMeta.team || '',
                    player_name: legMeta.playerName || '',
                    bet_direction: legDir,
                    match: legFixture,
                    date: eventDate,
                    time: eventTime || '',
                    league: leagueVal,
                    country: countryVal,
                    sport: sportVal,
                    odds: '',
                };
            });
            if (matchLegs.length > 1) parentEvent = matchLegs.map(parseFixtureNotation).join(' + ');
        } else if (/\s\/\s/.test(event) || /\s(?:&|\/)\s/.test(rawSelection) || /\b(double|treble|acca|accumulator|parlay)\b/i.test(market)) {
            // A multi we couldn't split into clean legs - flag for manual review.
            warnings.push('Multi-bet - review/grade manually');
        }

        return {
            id: `${Date.now()}-${index}`,
            rowNumber: index + 2,
            date: eventDate,
            time: eventTime || '00:00',
            event: parentEvent,
            selection: cleanImportSelection(rawSelection) || rawMarket,
            market: isMultiple ? 'Multi-Bet' : market,
            betDirection: isMultiple ? '' : betDirection,
            bookmaker: first(row, ['bookmaker', 'bookie', 'sportsbook']),
            odds,
            stake,
            status,
            // NB: 'tipster' is intentionally excluded - in these sheets it's an internal
            // identifier (e.g. "M 6822"), not a real group/bankroll, so it must be ignored.
            group: first(row, ['group', 'sheet', 'bankroll']),
            // Esports (FIFA / eBasket video-game matches) override the sheet's real-sport label
            // so they never grade or CLV-match against a real fixture of the same team names.
            sport: sportVal,
            league: leagueVal,
            country: countryVal,
            isMultiple,
            multiBetSelections,
            closingLineOdds: first(row, ['closing', 'closing odds', 'closinglineodds']),
            cashedOutOdds: first(row, ['cashout', 'cash out', 'co']),
            comment: first(row, ['comment', 'notes']),
            predictionMarket: first(row, ['prediction_market', 'prediction market', 'question', 'polymarket question']),
            predictionPosition: first(row, ['prediction_position', 'prediction position', 'position', 'outcome']),
            threshold: explicitThreshold ? Number(explicitThreshold) : gradingMeta.threshold,
            marketDirection: explicitDirection || gradingMeta.marketDirection,
            statType: gradingMeta.statType,
            apiTypeId: gradingMeta.apiTypeId,
            apiLocation: gradingMeta.apiLocation,
            playerName: first(row, ['player', 'player name']) || gradingMeta.playerName,
            team: first(row, ['team']) || gradingMeta.team,
            warnings,
            matchScore: 0,
            importFormat: `${format} (${delimiter === '\t' ? 'tab' : delimiter})`,
        };
    }).filter((b): b is ImportBet => b != null);
}

// Precomputed, normalized event index for fast candidate pruning. Scoring every row
// against the full 50k-event index synchronously froze the page ("Page Unresponsive")
// on large imports; here we index events by team token so each row only scores a handful.
type NormEvent = {
    event: EventSuggestion;
    home: string; away: string; name: string; meta: string; dateMs: number;
};

function buildEventIndex(events: EventSuggestion[]) {
    const norm: NormEvent[] = events.map((e) => ({
        event: e,
        home: normalizeText(e.home),
        away: normalizeText(e.away),
        name: normalizeText(e.searchEvent),
        meta: normalizeText(`${e.league} ${e.country} ${e.leagueSlug} ${(e.aliases || []).join(' ')}`),
        dateMs: e.date ? Date.parse(`${e.date}T00:00:00`) : NaN,
    }));
    const tokenMap = new Map<string, number[]>();
    norm.forEach((n, i) => {
        for (const tok of new Set(`${n.home} ${n.away}`.split(' ').filter((t) => t.length >= 3))) {
            const arr = tokenMap.get(tok);
            if (arr) arr.push(i); else tokenMap.set(tok, [i]);
        }
    });
    return { norm, tokenMap };
}

// A query token "hits" a team only when it EQUALS one of that team's tokens, or is a short
// abbreviation of one (<=4 chars AND a prefix: "man"->"manchester", "mil"->"milwaukee",
// "bay"->"bayern"). This deliberately rejects two LONG words that merely share a prefix
// ("atletic" vs "atletico", "athletic" vs "athletico", "sporting" vs "sport") - the substring
// match (`home.includes(token)`) that stamped "Barcelona Atletic" onto "Atletico Madrid".
function teamTokenHit(token: string, teamTokens: string[]): boolean {
    if (token.length < 2) return false;
    for (const tt of teamTokens) {
        if (token === tt) return true;
        const [short, long] = token.length <= tt.length ? [token, tt] : [tt, token];
        if (short.length >= 2 && short.length <= 4 && long.startsWith(short)) return true;
    }
    return false;
}

function scoreNormEvent(bet: ImportBet, n: NormEvent): number {
    const query = normalizeText(bet.event);
    if (!query) return 0;
    // Never cross real football <-> eSoccer. eSoccer fixtures share real team names, so without
    // this a real "Aston Villa vs Newcastle" bet matches "Aston Villa (Liam) vs Newcastle (Cleo)"
    // and inherits its handle name + eSoccer sport. The bet's market is the authoritative signal.
    if (fixtureIsEsoccer(n.event) !== betIsEsoccer(bet)) return 0;
    let score = 0;
    if (query === n.name || query === `${n.home} ${n.away}`) score += 120;
    const homeToks = n.home.split(' ').filter(Boolean);
    const awayToks = n.away.split(' ').filter(Boolean);
    const tokens = query.split(' ').filter(Boolean);
    let homeHit = false, awayHit = false;
    for (const token of tokens) {
        // Whole-token (or short-abbreviation) match, NOT substring - see teamTokenHit.
        if (teamTokenHit(token, homeToks)) { score += 24; homeHit = true; }
        else if (teamTokenHit(token, awayToks)) { score += 24; awayHit = true; }
        else if (n.meta.includes(token)) score += 4;
        else score -= 12;
    }
    // Require overlap on BOTH teams for a confident match - a single shared token (e.g.
    // "Deportivo" matching a different Deportivo) is not enough.
    if (!(homeHit && awayHit)) score -= 60;
    if (bet.date && !Number.isNaN(n.dateMs)) {
        const days = Math.abs(Date.parse(`${bet.date}T00:00:00`) - n.dateMs) / 86_400_000;
        score += Math.max(0, 45 - days * 12);
    }
    if (n.event.sport === 'football') score += 6;
    return score;
}

export default function Page() {
    const [bets, setBets] = useState<ImportBet[]>([]);
    const [fileName, setFileName] = useState('');
    const [isMatching, setIsMatching] = useState(false);
    const [matchProgress, setMatchProgress] = useState<{ done: number; total: number } | null>(null);
    const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveResult, setSaveResult] = useState('');
    const [clvEstimate, setClvEstimate] = useState('');
    const [query, setQuery] = useState('');
    const [includePending, setIncludePending] = useState(true);
    const [autoMatch, setAutoMatch] = useState(true);
    const [skipWarnings, setSkipWarnings] = useState(false);
    // Excel workbook awaiting tab selection (a workbook has many sheets; only some hold bets).
    const [xlsxWorkbook, setXlsxWorkbook] = useState<any>(null);
    const [xlsxSheets, setXlsxSheets] = useState<string[]>([]);
    const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const [bankrolls, setBankrolls] = useState<{ id: string; name: string }[]>([]);
    const [bankrollId, setBankrollId] = useState<string>('personal');
    const [oddsFormat, setOddsFormat] = useState<OddsFormat>(() => getActiveOddsFormat());
    const inputRef = useRef<HTMLInputElement>(null);

    // Load the user's bankrolls and default the import target to their ACTIVE bankroll
    // (previously every row was hardcoded to "personal", so imports vanished from the
    // active-bankroll view).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const uid = localStorage.getItem('telegram_user_id');
        const active = localStorage.getItem('active_bankroll_id') || 'personal';
        setBankrollId(active);
        if (!uid) return;
        api.bankrolls.get(Number(uid)).then((data: any) => {
            const list = Array.isArray(data?.bankrolls) ? data.bankrolls : [];
            setBankrolls(list);
            if (!list.some((b: any) => b.id === active)) setBankrollId(list[0]?.id || 'personal');
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const syncOddsFormat = () => setOddsFormat(getActiveOddsFormat());
        window.addEventListener('bankroll_changed', syncOddsFormat);
        return () => window.removeEventListener('bankroll_changed', syncOddsFormat);
    }, []);

    const stats = useMemo(() => {
        const settled = bets.filter((bet) => bet.status !== 'pending').length;
        const matched = bets.filter((bet) => bet.matchedEvent).length;
        const warningRows = bets.filter((bet) => bet.warnings.length).length;
        return { settled, matched, warningRows, pending: bets.length - settled };
    }, [bets]);

    const filtered = useMemo(() => {
        const q = normalizeText(query);
        return bets.filter((bet) => {
            if (!includePending && bet.status === 'pending') return false;
            if (!q) return true;
            return normalizeText(`${bet.event} ${bet.selection} ${bet.market} ${bet.bookmaker} ${bet.group}`).includes(q);
        });
    }, [bets, includePending, query]);

    // Paginate the preview - rendering all 20k+ rows at once makes the page unscrollable
    // and crashes the tab. Only the current page is put in the DOM.
    const PAGE_SIZE = 100;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageClamped = Math.min(page, totalPages - 1);
    const paged = useMemo(
        () => filtered.slice(pageClamped * PAGE_SIZE, pageClamped * PAGE_SIZE + PAGE_SIZE),
        [filtered, pageClamped],
    );

    async function matchRows(nextBets: ImportBet[]) {
        setPage(0);
        setBets(nextBets);
        if (!nextBets.length || !autoMatch) {
            return;
        }
        setIsMatching(true);
        setMatchProgress({ done: 0, total: nextBets.length });
        try {
            const res = await fetch('/api/events/search?index=1&days=365');
            const data = await res.json();
            const events = Array.isArray(data.events) ? data.events : [];
            const { norm, tokenMap } = buildEventIndex(events);
            const result = [...nextBets];
            const CHUNK = 150;
            for (let i = 0; i < result.length; i += CHUNK) {
                const end = Math.min(i + CHUNK, result.length);
                for (let j = i; j < end; j++) {
                    const bet = result[j];
                    if (!bet.event) continue;
                    // Only score events that share a team token with this row.
                    const candidates = new Set<number>();
                    for (const tok of new Set(normalizeText(bet.event).split(' ').filter((t) => t.length >= 3))) {
                        const arr = tokenMap.get(tok);
                        if (arr) for (const idx of arr) candidates.add(idx);
                    }
                    let best: NormEvent | null = null;
                    let bestScore = 0;
                    for (const idx of candidates) {
                        const sc = scoreNormEvent(bet, norm[idx]);
                        if (sc > bestScore) { bestScore = sc; best = norm[idx]; }
                    }
                    if (best && bestScore > 45) {
                        result[j] = {
                            ...bet,
                            country: bet.country || best.event.country,
                            league: bet.league || best.event.league,
                            sport: bet.sport || best.event.sport,
                            matchedEvent: best.event,
                            matchScore: bestScore,
                        };
                    }
                }
                // Publish progress + partial results, then yield so the UI paints and stays
                // responsive (the old single synchronous pass froze the page).
                setMatchProgress({ done: end, total: result.length });
                setBets([...result]);
                await new Promise((r) => setTimeout(r, 0));
            }
        } catch {
            setBets(nextBets);
        } finally {
            setIsMatching(false);
            setMatchProgress(null);
        }
    }

    async function loadXlsx() {
        // SheetJS is ~400KB - code-split it so it only loads when an Excel file is dropped.
        const mod: any = await import('xlsx');
        return mod.read ? mod : mod.default;
    }

    async function handleFile(file: File) {
        setFileName(file.name);
        setSaveResult('');
        if (/\.xlsx?$/i.test(file.name)) {
            const XLSX = await loadXlsx();
            const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            setBets([]);
            setXlsxWorkbook(wb);
            setXlsxSheets(wb.SheetNames);
            // Pre-select the tabs that look like bet data; leave guide/pivot/template tabs off.
            setSelectedSheets(wb.SheetNames.filter((n: string) =>
                !/guide|instructions|readme|template|^\s*pl\s+by\b|summary|dashboard|settings|chart/i.test(n)));
            return; // wait for the user to choose tabs before parsing
        }
        setXlsxWorkbook(null);
        setXlsxSheets([]);
        const text = await file.text();
        const parsed = parseCsv(text);
        await matchRows(rowsToBets(parsed.rows, parsed.headers, parsed.delimiter));
    }

    function toggleSheet(name: string) {
        setSelectedSheets((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
    }

    async function importSelectedSheets() {
        if (!xlsxWorkbook || !selectedSheets.length) return;
        const XLSX = await loadXlsx();
        let merged: ImportBet[] = [];
        for (const name of selectedSheets) {
            const ws = xlsxWorkbook.Sheets[name];
            if (!ws) continue;
            // Convert the sheet to CSV and reuse the full CSV parse pipeline.
            const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
            const parsed = parseCsv(csv);
            merged = merged.concat(rowsToBets(parsed.rows, parsed.headers, parsed.delimiter));
        }
        setXlsxWorkbook(null);
        setXlsxSheets([]);
        await matchRows(merged);
    }

    async function handleInput(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) await handleFile(file);
    }

    function betToPayload(bet: ImportBet) {
        return {
            date: bet.date,
            time: bet.time,
            country: bet.country || bet.matchedEvent?.country || '',
            league: bet.league || bet.matchedEvent?.league || '',
            searchEvent: bet.matchedEvent?.searchEvent || bet.event,
            selection: bet.selection,
            market: bet.market,
            betDirection: bet.betDirection,
            bookmaker: bet.bookmaker,
            odds: bet.odds,
            stake: bet.stake,
            status: bet.status,
            bankrollId,
            closingLineOdds: bet.closingLineOdds,
            cashedOutOdds: bet.cashedOutOdds,
            predictionMarket: bet.predictionMarket,
            predictionPosition: bet.predictionPosition,
            threshold: bet.threshold,
            marketDirection: bet.marketDirection,
            statType: bet.statType,
            apiTypeId: bet.apiTypeId,
            apiLocation: bet.apiLocation,
            playerName: bet.playerName,
            team: bet.team,
            oddsApiEventId: bet.matchedEvent?.id || '',
            fixtureId: /^\d+$/.test(bet.matchedEvent?.id || '') ? bet.matchedEvent?.id : '',
            oddsApiLeagueSlug: bet.matchedEvent?.leagueSlug || '',
            eventSport: bet.sport || bet.matchedEvent?.sport || '',
            eventSource: bet.matchedEvent?.source || 'csv_import',
            ...(bet.isMultiple && bet.multiBetSelections
                ? { is_multiple: true, betStructure: 'multiple', multi_bet_selections: bet.multiBetSelections }
                : {}),
        };
    }

    async function saveImport() {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('telegram_user_id') : null;
        if (!userId) {
            setSaveResult('Not signed in - open the tracker from Telegram first.');
            return;
        }
        const rows = bets.filter((bet) => !skipWarnings || bet.warnings.length === 0);
        if (!rows.length) return;
        setIsSaving(true);
        setSaveResult('');
        setClvEstimate('');
        setSaveProgress({ done: 0, total: rows.length });
        let saved = 0;
        let failed = 0;
        // Chunk into bulk requests - ONE process inserts a whole chunk (see save_bet.py
        // isBulkImport), instead of a subprocess per bet. Large chunks pipe via stdin.
        const CHUNK = 500;
        for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK).map(betToPayload);
            try {
                const res = await fetch('/api/save-bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: Number(userId), isBulkImport: true, bets: chunk }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data?.success) {
                    saved += data.saved || 0;
                    failed += data.failed || 0;
                } else {
                    failed += chunk.length;
                }
            } catch {
                failed += chunk.length;
            }
            setSaveProgress({ done: Math.min(i + CHUNK, rows.length), total: rows.length });
        }

        setSaveProgress(null);
        setSaveResult(`${saved.toLocaleString()} imported${failed ? `, ${failed.toLocaleString()} failed` : ''} - fixtures & grading resolve in the background`);
        // Settled bets with no closing odds supplied enter the background CLV backfill queue;
        // give the user a rough ETA for when their closing lines will be filled in.
        const settledMissing = rows.filter(
            (bet) => bet.status !== 'pending' && !String(bet.closingLineOdds || '').trim(),
        ).length;
        const eta = estimateClvTime(Math.round(settledMissing * (saved / Math.max(rows.length, 1))));
        setClvEstimate(eta ? `${settledMissing.toLocaleString()} settled bet${settledMissing === 1 ? '' : 's'} queued for closing odds - most will be filled in automatically over ${eta}. Obscure leagues and niche markets may not have a closing line available.` : '');
        setIsSaving(false);
    }

    return (
        <div className="mx-auto max-w-[1420px] space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#10b981]">
                        <Database size={14} />
                        Import Data
                    </div>
                    <h1 className="mt-1 text-[30px] font-bold tracking-tight text-[#121212]">Import historical and future bets</h1>
                    <p className="mt-1 max-w-3xl text-[14px] font-medium text-gray-500">
                        Bring in CSVs from spreadsheets, Bet Analytix, Sharp templates, or custom trackers. Pending and future rows are matched to Proppr fixtures so they can still be graded later.
                    </p>
                </div>
                <MorphActionMenu label={<><Download size={16} className="text-[#10b981]" /> Import tools</>} menuClassName="p-1.5">
                    <a href="/templates/proppr_import_template.csv" download className="track-morph-menu-item rounded-xl">
                        <Download size={16} className="text-[#10b981]" />
                        Download template
                    </a>
                    <button type="button" onClick={() => inputRef.current?.click()} className="track-morph-menu-item rounded-xl">
                        <Upload size={16} className="text-[#10b981]" />
                        Upload CSV
                    </button>
                </MorphActionMenu>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-[17px] font-bold text-[#121212]">Upload CSV or Excel</h2>
                            <p className="mt-1 text-[13px] font-medium text-gray-500">Supports comma, semicolon, tab-delimited, and Excel (.xlsx) files.</p>
                        </div>
                        <FileSpreadsheet className="text-[#10b981]" size={22} />
                    </div>

                    <button
                        onClick={() => inputRef.current?.click()}
                        onDrop={(event) => {
                            event.preventDefault();
                            const file = event.dataTransfer.files?.[0];
                            if (file) void handleFile(file);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        className="mt-5 flex min-h-[170px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 text-center transition hover:border-[#10b981] hover:bg-[#ecfdf5]"
                    >
                        <Upload size={26} className="text-gray-500" />
                        <span className="mt-3 text-[14px] font-bold text-[#121212]">{fileName || 'Choose file or drop CSV / Excel here'}</span>
                        <span className="mt-1 text-[12px] font-semibold text-gray-500">Past results, open bets, and future fixtures are accepted.</span>
                    </button>
                    <input ref={inputRef} type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" className="hidden" onChange={handleInput} />

                    {xlsxSheets.length > 0 && (
                        <div className="mt-5 rounded-xl border border-[#bae6fd] bg-[#f0f9ff] p-4">
                            <div className="text-[13px] font-bold text-[#0369a1]">Select tabs to import</div>
                            <p className="mt-1 text-[12px] font-medium text-gray-500">
                                This workbook has {xlsxSheets.length} tabs - pick the one(s) with bet data (summary/guide tabs are pre-unchecked).
                            </p>
                            <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto">
                                {xlsxSheets.map((name) => (
                                    <label key={name} className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-[#121212]">
                                        <input
                                            type="checkbox"
                                            checked={selectedSheets.includes(name)}
                                            onChange={() => toggleSheet(name)}
                                            className="h-4 w-4 rounded border-gray-300 text-[#10b981] focus:ring-[#10b981]"
                                        />
                                        {name}
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={() => void importSelectedSheets()}
                                disabled={!selectedSheets.length}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#121212] px-4 py-2 text-[13px] font-bold text-white shadow-sm transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Upload size={15} /> Import {selectedSheets.length} tab{selectedSheets.length === 1 ? '' : 's'}
                            </button>
                        </div>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        {[
                            { label: 'Rows', value: bets.length, icon: FileSpreadsheet },
                            { label: 'Fixture matches', value: stats.matched, icon: Link2 },
                            { label: 'Pending/future', value: stats.pending, icon: CalendarClock },
                            { label: 'Warnings', value: stats.warningRows, icon: AlertCircle },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                <div className="flex items-center justify-between text-gray-500">
                                    <span className="text-[11px] font-bold uppercase tracking-wide">{item.label}</span>
                                    <item.icon size={14} />
                                </div>
                                <div className="mt-2 text-[24px] font-bold text-[#121212]">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <TrackAccordion
                        items={[
                            {
                                title: 'Import controls',
                                defaultOpen: true,
                                content: (
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        {[
                                            { label: 'Auto-match fixtures', value: autoMatch, setter: setAutoMatch, detail: 'Adds event IDs for grading.' },
                                            { label: 'Include pending', value: includePending, setter: setIncludePending, detail: 'Show open and future entries.' },
                                            { label: 'Skip warning rows', value: skipWarnings, setter: setSkipWarnings, detail: 'Only save clean rows.' },
                                        ].map((item) => (
                                            <button key={item.label} onClick={() => item.setter(!item.value)} className={`rounded-xl border p-4 text-left transition ${item.value ? 'border-[#10b981] bg-[#ecfdf5]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[13px] font-bold text-[#121212]">{item.label}</span>
                                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.value ? 'bg-[#10b981] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                        <Check size={13} />
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-[12px] font-medium text-gray-500">{item.detail}</p>
                                            </button>
                                        ))}
                                    </div>
                                ),
                            },
                            {
                                title: <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-[#10b981]" /> Auto-grading metadata</span>,
                                content: 'Imported rows with no final result stay pending. When a fixture match is found, Proppr saves the Odds API event ID, league slug, sport, and source so later grading can resolve the bet without another manual edit.',
                            },
                        ]}
                    />
                </section>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-[17px] font-bold text-[#121212]">Preview and approve</h2>
                        <p className="mt-1 text-[12px] font-semibold text-gray-500">
                            {isMatching
                                ? `Matching fixtures… ${matchProgress ? `${matchProgress.done.toLocaleString()}/${matchProgress.total.toLocaleString()}` : ''}`
                                : bets.length ? `${filtered.length} visible rows from ${bets[0]?.importFormat}` : 'Upload a CSV to preview mapped rows.'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Bankroll</span>
                            <select
                                value={bankrollId}
                                onChange={(e) => setBankrollId(e.target.value)}
                                className="cursor-pointer border-none bg-transparent text-[13px] font-bold text-[#121212] outline-none"
                            >
                                {(bankrolls.length ? bankrolls : [{ id: 'personal', name: 'Personal' }]).map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex min-w-[240px] items-center rounded-lg border border-gray-200 bg-white px-3 py-2">
                            <Search size={15} className="mr-2 text-gray-400" />
                            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search imported rows" className="w-full border-none bg-transparent text-[13px] font-medium outline-none" />
                        </div>
                        <button
                            onClick={saveImport}
                            disabled={!bets.length || isSaving}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#121212] px-4 py-2 text-[13px] font-bold text-white shadow-sm transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {isSaving
                                ? (saveProgress ? `Importing ${saveProgress.done.toLocaleString()}/${saveProgress.total.toLocaleString()}` : 'Importing…')
                                : 'Import rows'}
                        </button>
                    </div>
                </div>

                {bets.length > 0 && bets.length - stats.matched > 0 && !isMatching && (
                    <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-[#bae6fd] bg-[#f0f9ff] px-4 py-3 text-[12px] font-semibold text-[#0369a1]">
                        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                        <span>
                            {(bets.length - stats.matched).toLocaleString()} row{bets.length - stats.matched === 1 ? '' : 's'} didn&apos;t match a fixture in this preview - that&apos;s expected and they&apos;re not lost. After you import, every bet is automatically matched and graded in the background, so obscure leagues and friendlies resolve over the next cycles.
                        </span>
                    </div>
                )}

                {saveResult && (
                    <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] px-4 py-3 text-[13px] font-bold text-[#047857]">
                        <CheckCircle2 size={16} />
                        {saveResult}
                    </div>
                )}

                {clvEstimate && (
                    <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-[#bae6fd] bg-[#f0f9ff] px-4 py-3 text-[13px] font-semibold text-[#0369a1]">
                        <CalendarClock size={16} className="mt-0.5 shrink-0" />
                        <span>{clvEstimate}</span>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                                <th className="px-3 py-2.5 text-[11px]">Row</th>
                                <th className="px-3 py-2.5 text-[11px]">Date</th>
                                <th className="px-3 py-2.5 text-[11px]">Event</th>
                                <th className="px-3 py-2.5 text-[11px]">Bet</th>
                                <th className="px-3 py-2.5 text-[11px]">Odds</th>
                                <th className="px-3 py-2.5 text-[11px]">Stake</th>
                                <th className="px-3 py-2.5 text-[11px]">Status</th>
                                <th className="px-3 py-2.5 text-[11px]">Fixture metadata</th>
                                <th className="px-3 py-2.5 text-[11px]">Issues</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map((bet) => (
                                <tr key={bet.id} className="border-b border-gray-100 align-top text-[12px] last:border-0">
                                    <td className="px-3 py-2.5 font-bold text-gray-400">{bet.rowNumber}</td>
                                    <td className="px-3 py-2.5">
                                        <div className="font-bold text-[#121212]">{bet.date || '-'}</div>
                                        <div className="mt-1 text-[12px] font-semibold text-gray-400">{bet.time}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="font-bold text-[#121212]">{bet.event || '-'}</div>
                                        <div className="mt-1 text-[12px] font-semibold text-gray-400">{bet.league || bet.country || 'No league'}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="font-bold text-[#121212]">{bet.selection || '-'}</div>
                                        <div className="mt-1 text-[12px] font-semibold text-gray-400">
                                            {formatBreakdown(bet)}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 font-bold text-[#121212]">
                                        {formatAnyOdds(bet.odds, oddsFormat) || bet.odds || '-'}
                                    </td>
                                    <td className="px-3 py-2.5 font-bold text-[#121212]">{bet.stake || '-'}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass[bet.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {resultLabels[bet.status] || bet.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {bet.matchedEvent ? (
                                            <div>
                                                <div className="flex items-center gap-1.5 font-bold text-[#047857]">
                                                    <Link2 size={13} />
                                                    {bet.matchedEvent.searchEvent}
                                                </div>
                                                <div className="mt-1 text-[12px] font-semibold text-gray-400">
                                                    {bet.matchedEvent.date} · {bet.matchedEvent.league || bet.matchedEvent.source}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center gap-1.5 font-semibold text-gray-500">
                                                    <CalendarClock size={13} />
                                                    No match found
                                                </div>
                                                <div className="mt-1 text-[11px] font-medium text-[#0369a1]">
                                                    Will be enriched &amp; graded after import
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {bet.warnings.length ? (
                                            <div className="space-y-1">
                                                {bet.warnings.map((warning) => (
                                                    <div key={warning} className="flex items-center gap-1.5 text-[12px] font-bold text-amber-600">
                                                        <AlertCircle size={12} />
                                                        {warning}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#047857]">
                                                <CheckCircle2 size={13} />
                                                Ready
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!filtered.length && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-16 text-center">
                                        <FileSpreadsheet size={30} className="mx-auto text-gray-300" />
                                        <div className="mt-3 text-[14px] font-bold text-[#121212]">No imported rows yet</div>
                                        <div className="mt-1 text-[13px] font-medium text-gray-500">Upload a CSV or download the Proppr template to get started.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > PAGE_SIZE && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-[12px] font-semibold text-gray-500 sm:flex-row">
                        <span>
                            Showing {(pageClamped * PAGE_SIZE + 1).toLocaleString()}–{Math.min((pageClamped + 1) * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()} rows
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={pageClamped === 0}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 font-bold text-[#121212] transition hover:border-[#10b981] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Prev
                            </button>
                            <span className="tabular-nums">Page {(pageClamped + 1).toLocaleString()} of {totalPages.toLocaleString()}</span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={pageClamped >= totalPages - 1}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 font-bold text-[#121212] transition hover:border-[#10b981] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
