'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity,
    BarChart3,
    BookOpen,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    Filter,
    Globe,
    Globe2,
    Layers,
    LineChart as LineChartIcon,
    PieChart as PieChartIcon,
    Plus,
    Percent,
    Bookmark as BookmarkIcon,
    RefreshCcw,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Target,
    Trophy,
    WalletCards,
    Tag,
    X,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { DateInput } from '@/components/DateInput';
import { normalizeBetTags } from '@/lib/tags';
import { betInBankrollView, formatBankrollAmount, type BankrollLike } from '@/lib/utils';
import { regionOf, REGION_ORDER } from '@/lib/regions';
import { NumberPop, SlidingTabs, TrackAccordion } from '@/components/transitions/Motion';

type Timeframe = '24H' | '7D' | '30D' | '90D' | 'YTD' | 'ALL' | 'CUSTOM';
// Every dimension can be a filter, a group-by (breakdown) and - via facets - a value picker.
type DimId =
    | 'market' | 'league' | 'region' | 'country' | 'bookmaker' | 'sport' | 'betType'
    | 'result' | 'oddsBand' | 'stakeBand' | 'valueBand' | 'month' | 'weekday' | 'tags';
type Breakdown = DimId;
type ChartMetric = 'profit' | 'roi' | 'winRate' | 'clv';

type Bet = Record<string, any>;

const GREEN = '#10b981';
const RED = '#ef4444';
const AMBER = '#f59e0b';
const BLUE = '#3b82f6';

const quickReports: { id: Breakdown; label: string; icon: any }[] = [
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'market', label: 'Market', icon: Target },
    { id: 'league', label: 'League', icon: Trophy },
    { id: 'region', label: 'Region', icon: Globe2 },
    { id: 'country', label: 'Country', icon: Globe },
    { id: 'bookmaker', label: 'Bookmaker', icon: BookOpen },
    { id: 'sport', label: 'Sport', icon: Activity },
    { id: 'betType', label: 'Bet Type', icon: Layers },
    { id: 'oddsBand', label: 'Odds', icon: BarChart3 },
    { id: 'stakeBand', label: 'Stake', icon: CircleDollarSign },
    { id: 'valueBand', label: 'Value %', icon: Percent },
    { id: 'result', label: 'Result', icon: Target },
    { id: 'month', label: 'Month', icon: CalendarDays },
    { id: 'weekday', label: 'Weekday', icon: CalendarDays },
];

function mongoDate(value: any) {
    const raw = value?.$date || value;
    if (!raw) return null;
    // Date-only strings ("2026-07-30") parse as UTC MIDNIGHT per spec, which dayKey (local getters)
    // then rolls back to the 29th for any viewer west of UTC - bets list said 30 Jul, calendar
    // bucketed 29 Jul. Parse them as LOCAL midnight so the calendar day matches the stored day.
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
        const date = new Date(`${raw.trim()}T00:00:00`);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
}

function betDate(bet: Bet) {
    // kickoff_utc is the canonical instant - beats wall-clock reconstruction when present.
    const ku = (bet as any)?.kickoff_utc || (bet as any)?.kickoffUtc;
    if (ku) {
        const d = new Date(ku);
        if (!Number.isNaN(d.getTime())) return d;
    }
    // Prefer the fixture/event date over when the slip was tracked, graded or settled. Bulk imports
    // (e.g. Telegram import) stamp tracked_at/settled_at/created_at at the single import moment, which
    // would otherwise collapse every imported bet onto one calendar day and break the profit calendar
    // + trajectory. Matches the dashboard's betDateValue + the Bets table ("prefer kickoff over post").
    const eventDate =
        mongoDate(bet.date) ||
        mongoDate(bet.event_date) || mongoDate(bet.eventDate) ||
        mongoDate(bet.fixture_date) || mongoDate(bet.fixtureDate) || mongoDate(bet.kickoff_date);
    if (eventDate) return eventDate;

    // Multi-bet: fall back to the first leg's event date before any tracking timestamp.
    const legs = bet.multi_bet_selections;
    if (Array.isArray(legs) && legs.length) {
        const legDate = mongoDate(legs[0]?.date) || mongoDate(legs[0]?.event_date) || mongoDate(legs[0]?.eventDate);
        if (legDate) return legDate;
    }

    return mongoDate(bet.tracked_at) || mongoDate(bet.created_at) || mongoDate(bet.settled_at) || mongoDate(bet.graded_at);
}

function numberValue(...values: any[]) {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function stakeOf(bet: Bet) {
    return numberValue(bet.stake, bet.units_staked, bet.actual_stake);
}

function oddsOf(bet: Bet) {
    return numberValue(bet.odds, bet.decimal_odds);
}

function statusOf(bet: Bet) {
    return String(bet.status || bet.result || 'pending').toLowerCase().replace(/\s+/g, '_');
}

function profitOf(bet: Bet) {
    const explicit = numberValue(bet.profit_loss, bet.profit, bet.pnl, bet.p_l, bet.net_profit);
    if (explicit !== 0) return explicit;

    const status = statusOf(bet);
    const stake = stakeOf(bet);
    const odds = oddsOf(bet);
    if (status === 'won') return stake * Math.max(odds - 1, 0);
    if (status === 'lost') return -stake;
    if (status === 'half_win') return stake * Math.max(odds - 1, 0) / 2;
    if (status === 'half_loss') return -stake / 2;
    return 0;
}

function returnsOf(bet: Bet) {
    const explicit = numberValue(bet.returns, bet.return_amount, bet.total_returns);
    if (explicit !== 0) return explicit;

    const stake = stakeOf(bet);
    const profit = profitOf(bet);
    const status = statusOf(bet);
    if (['refund', 'refunded', 'void', 'push'].includes(status)) return stake;
    if (status === 'lost' || status === 'half_loss') return 0;
    if (status === 'pending' || status === 'open') return 0;
    return Math.max(0, stake + profit);
}

function parseDateInput(value: string, endOfDay = false) {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (endOfDay) date.setHours(23, 59, 59, 999);
    return Number.isNaN(date.getTime()) ? null : date;
}

function clvOf(bet: Bet) {
    const odds = oddsOf(bet);
    const clo = numberValue(bet.closing_line_odds, bet.closingLineOdds);
    if (!odds || !clo) return 0;
    return (odds / clo) - 1;
}

function isSettled(bet: Bet) {
    return ['won', 'lost', 'push', 'void', 'refund', 'refunded', 'half_win', 'half_loss', 'cashout', 'cashed_out'].includes(statusOf(bet));
}

function isLost(bet: Bet) {
    const status = statusOf(bet);
    return status === 'lost' || status === 'half_loss';
}

function isNeutral(bet: Bet) {
    return ['push', 'void', 'refund', 'refunded'].includes(statusOf(bet));
}

function isWin(bet: Bet) {
    return ['won', 'half_win', 'cashout', 'cashed_out'].includes(statusOf(bet)) && profitOf(bet) > 0;
}

function labelOf(value: any, fallback = 'Unknown') {
    const text = String(value || '').trim();
    return text && text.toLowerCase() !== 'unknown' ? text : fallback;
}

// Fold market names that are the SAME market stored under variant spellings into one canonical
// label, so the breakdown doesn't split a market across near-duplicates. Two kinds of folding:
//   1. Home/away SIDE - "Team Total Home"/"Team Total Away" -> "Team Total" (side lives in
//      team_assignment). Only touches "Team …"-prefixed names, so "Home Runs" is left alone.
//   2. Synonyms - variant names for one market: Match Result == Full Time Result, Total Goals ==
//      Goal Line (canonical: Goal Line), Team Total Goals == Team Total, Halftime == Half-Time Result.
//      Canonical direction picked to match the backend's dominant/alias-target spelling.
function canonicalMarketName(name: string): string {
    let s = name.trim();
    // (1) side folding
    s = s.replace(/^(?:home|away)\s+team\b/i, 'Team');           // "Home Team Offsides" -> "Team …"
    if (/^team\b/i.test(s)) s = s.replace(/\s+(?:home|away)$/i, ''); // "Team Corners Home" -> "Team …"
    s = s.replace(/\s{2,}/g, ' ').trim();

    // (2) synonym folding - ORDER MATTERS: strip "Team Total Goals" before the Total Goals->Goal Line
    // rule so it can't become "Team Goal Line".
    s = s.replace(/\bteam total goals\b/gi, 'Team Total');       // "Team Total Goals" == "Team Total"
    s = s.replace(/\btotal goals\b/gi, 'Goal Line');            // "Total Goals"/"1st Half Total Goals" -> Goal Line
    // Whole-string result synonyms (exact match so combos like "Match Result/Both Teams To Score"
    // and period variants like "2nd Half Result" are never touched).
    const exact: Record<string, string> = {
        'match result': 'Full Time Result',
        'halftime result': 'Half-Time Result',
        'half time result': 'Half-Time Result',
    };
    const folded = exact[s.toLowerCase()];
    return (folded || s).replace(/\s{2,}/g, ' ').trim();
}

function marketOf(bet: Bet) {
    const raw = labelOf(bet.market || bet.market_name || bet.stat_name, 'Unknown Market');
    // Drop the redundant "Player" prefix so "Player Points" groups as "Points" etc.
    const cleaned = raw.replace(/\bplayer\b/gi, ' ').replace(/\s{2,}/g, ' ').trim();
    return canonicalMarketName(cleaned || raw);
}

function sportOf(bet: Bet) {
    const sport = labelOf(bet.sport || bet.event_sport || bet.data_scope, 'Unknown Sport');
    return sport.charAt(0).toUpperCase() + sport.slice(1);
}

function betTypeOf(bet: Bet) {
    if (bet.is_multiple || statusOf(bet).includes('acca')) return 'Multiple';
    const type = String(bet.bet_type || bet.betType || '').toLowerCase();
    if (type.includes('multiple')) return 'Multiple';
    if (type.includes('player')) return 'Player Props';
    if (type.includes('team')) return 'Team Props';
    return 'Single';
}

function oddsBand(odds: number) {
    if (!odds) return 'No odds';
    // Fine-grained through the 1.5-3.0 cluster, widening into the longshot tail (odds run to 500+).
    if (odds < 1.5) return '1.00 - 1.49';
    if (odds < 2) return '1.50 - 1.99';
    if (odds < 2.5) return '2.00 - 2.49';
    if (odds < 3) return '2.50 - 2.99';
    if (odds < 4) return '3.00 - 3.99';
    if (odds < 5) return '4.00 - 4.99';
    if (odds < 7.5) return '5.00 - 7.49';
    if (odds < 10) return '7.50 - 9.99';
    if (odds < 20) return '10.00 - 19.99';
    if (odds < 50) return '20.00 - 49.99';
    if (odds < 100) return '50.00 - 99.99';
    return '100+';
}

function stakeBand(stake: number, bankroll?: BankrollLike) {
    const suffix = formatBankrollAmount(1, bankroll).replace(/[\d.+-]/g, '') || 'u'; // "£" or "u"
    const band = (lo: string, hi: string) =>
        suffix === 'u' || !suffix ? `${lo} - ${hi}u` : `${suffix}${lo} - ${suffix}${hi}`;
    if (stake <= 0) return 'No stake';
    // Fine-grained low end (most stakes cluster below 1u), widening as stakes grow.
    if (stake < 0.25) return band('0', '0.24');
    if (stake < 0.5) return band('0.25', '0.49');
    if (stake < 0.75) return band('0.50', '0.74');
    if (stake < 1) return band('0.75', '0.99');
    if (stake < 1.5) return band('1.00', '1.49');
    if (stake < 2) return band('1.50', '1.99');
    if (stake < 3) return band('2.00', '2.99');
    if (stake < 4) return band('3.00', '3.99');
    if (stake < 5) return band('4.00', '4.99');
    if (stake < 7.5) return band('5.00', '7.49');
    if (stake < 10) return band('7.50', '9.99');
    return suffix === 'u' || !suffix ? '10u+' : `${suffix}10+`;
}

function valueOf(bet: Bet) {
    // Stored on the 100+ convention (100 = fair, 114.40 = +14.4% edge) - the exact figure the alert
    // prints as "📈 Value: X%" (expected_value). 0 / missing = no value tagged.
    return numberValue(bet.value_percentage, bet.valuePercentage, bet.value);
}

function valueBand(v: number) {
    if (!v || v <= 100) return 'No value'; // 100 = fair line; 0 / unset = untagged
    if (v < 103) return '100 - 103%';
    if (v < 105) return '103 - 105%';
    if (v < 110) return '105 - 110%';
    if (v < 120) return '110 - 120%';
    if (v < 150) return '120 - 150%';
    return '150%+';
}

function resultLabel(bet: Bet) {
    const s = statusOf(bet);
    if (s === 'won' || s === 'cashout' || s === 'cashed_out') return 'Won';
    if (s === 'half_win') return 'Half Won';
    if (s === 'lost') return 'Lost';
    if (s === 'half_loss') return 'Half Lost';
    if (['push', 'void', 'refund', 'refunded'].includes(s)) return 'Push / Void';
    return 'Pending';
}

// Chronological order key for a "July 2026"-style month label (app locale is English).
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function monthOrder(label: string) {
    const [mon, yr] = label.toLowerCase().split(' ');
    const mi = MONTH_NAMES.indexOf(mon);
    return (parseInt(yr, 10) || 0) * 12 + (mi < 0 ? 0 : mi);
}

// Single source of truth: each dimension can be a filter, a group-by and a facet source.
// `values` returns the bet's value(s) for that dimension - one element for all but tags.
interface DimDef {
    id: DimId;
    label: string;
    icon: any;
    range?: boolean; // ordered bands -> sort segments by numeric lower bound, not profit
    values: (bet: Bet, bankroll?: BankrollLike) => string[];
    numeric?: (bet: Bet, bankroll?: BankrollLike) => number; // raw value behind a range dim, for custom min/max filters
}

const DIM_DEFS: DimDef[] = [
    { id: 'market', label: 'Market', icon: Target, values: (b) => [marketOf(b)] },
    { id: 'league', label: 'League', icon: Trophy, values: (b) => [labelOf(b.league || b.competition, 'Unknown League')] },
    { id: 'region', label: 'Region', icon: Globe2, values: (b) => [regionOf(b.country)] },
    { id: 'country', label: 'Country', icon: Globe, values: (b) => [labelOf(b.country, 'Unknown Country')] },
    { id: 'bookmaker', label: 'Bookmaker', icon: BookOpen, values: (b) => [labelOf(b.bookmaker, 'Unknown Bookmaker')] },
    { id: 'sport', label: 'Sport', icon: Activity, values: (b) => [sportOf(b)] },
    { id: 'betType', label: 'Bet Type', icon: Layers, values: (b) => [betTypeOf(b)] },
    { id: 'result', label: 'Result', icon: Target, values: (b) => [resultLabel(b)] },
    { id: 'oddsBand', label: 'Odds', icon: BarChart3, range: true, values: (b) => [oddsBand(oddsOf(b))], numeric: (b) => oddsOf(b) },
    { id: 'stakeBand', label: 'Stake', icon: CircleDollarSign, range: true, values: (b, bk) => [stakeBand(stakeOf(b), bk)], numeric: (b) => stakeOf(b) },
    { id: 'valueBand', label: 'Value %', icon: Percent, range: true, values: (b) => [valueBand(valueOf(b))], numeric: (b) => valueOf(b) },
    { id: 'month', label: 'Month', icon: CalendarDays, values: (b) => { const d = betDate(b); return [d ? monthLabel(d) : 'Unknown Month']; } },
    { id: 'weekday', label: 'Weekday', icon: CalendarDays, values: (b) => { const d = betDate(b); return [d ? d.toLocaleDateString(undefined, { weekday: 'short' }) : 'Unknown Day']; } },
    { id: 'tags', label: 'Tags', icon: Tag, values: (b) => { const t = normalizeBetTags(b); return t.length ? t : ['No Tag']; } },
];

const DIM_MAP: Record<DimId, DimDef> = DIM_DEFS.reduce((acc, d) => { acc[d.id] = d; return acc; }, {} as Record<DimId, DimDef>);

function dimValues(bet: Bet, dim: DimId, bankroll?: BankrollLike): string[] {
    return DIM_MAP[dim].values(bet, bankroll);
}

function fmtUnits(value: number, bankroll?: BankrollLike) {
    return formatBankrollAmount(value, bankroll, { signed: true });
}

function fmtPct(value: number) {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function startForTimeframe(timeframe: Timeframe) {
    const now = new Date();
    if (timeframe === '24H') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (timeframe === 'ALL') return null;
    if (timeframe === 'YTD') return new Date(now.getFullYear(), 0, 1);
    if (timeframe === 'CUSTOM') return null;
    const start = new Date(now);
    if (timeframe === '7D') start.setDate(now.getDate() - 7);
    if (timeframe === '30D') start.setDate(now.getDate() - 30);
    if (timeframe === '90D') start.setDate(now.getDate() - 90);
    // Day-granular ranges must include the WHOLE starting day - an instant cutoff at the current
    // time-of-day would clip a boundary day's earlier bets (event dates stamp midnight), so a day
    // still inside the window would lose its calendar square.
    start.setHours(0, 0, 0, 0);
    return start;
}

function dayKey(date: Date) {
    // LOCAL calendar day, not UTC. toISOString() would shift a local-midnight date back a day in any
    // UTC+ timezone (e.g. UK summer: local 20 Jul 00:00 -> "2026-07-19"), so the calendar cell and the
    // bet bucket landed on different days and every bet appeared one square late.
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function betDayKey(bet: Bet, tz?: string | null) {
    // Day anchoring: kickoff_utc bets bucket by the BANKROLL timezone's calendar day; legacy
    // wall-clock bets keep their stored/local day (their strings carry no timezone to convert).
    const ku = (bet as any)?.kickoff_utc || (bet as any)?.kickoffUtc;
    if (ku && tz) {
        const d = new Date(ku);
        if (!Number.isNaN(d.getTime())) {
            try {
                const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
                const o = Object.fromEntries(parts.map((p) => [p.type, p.value]));
                return `${o.year}-${o.month}-${o.day}`;
            } catch { /* fall through to local day */ }
        }
    }
    const d = betDate(bet);
    return d ? dayKey(d) : '';
}

function monthLabel(date: Date) {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// Numeric lower bound of a range-band label ("0.25 - 0.49u" -> 0.25, "10u+" -> 10,
// "No stake" -> -1) so ordered dimensions (stake/odds/value) display in range order, not by profit.
function bandLower(key: string): number {
    if (/^no /i.test(key)) return -1;
    const m = key.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : Number.MAX_SAFE_INTEGER;
}

// Custom min/max typed into a range dimension's filter card. Raw strings (they back the
// inputs directly); parseRange() turns them into usable bounds, null when both are blank.
type RangeInput = { min: string; max: string };

function parseRange(r?: RangeInput): { min: number | null; max: number | null } | null {
    if (!r) return null;
    const min = r.min.trim() === '' ? NaN : parseFloat(r.min);
    const max = r.max.trim() === '' ? NaN : parseFloat(r.max);
    if (!Number.isFinite(min) && !Number.isFinite(max)) return null;
    return { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null };
}

function fmtRangeLabel(range: { min: number | null; max: number | null }): string {
    if (range.min !== null && range.max !== null) return `${range.min} - ${range.max}`;
    if (range.min !== null) return `>= ${range.min}`;
    return `<= ${range.max}`;
}

// A saved Filter Builder configuration: dimension ticks + custom ranges + market focus.
// Stored per-browser in localStorage; sanitized on load so stale dims from old builds drop out.
interface FilterPreset {
    name: string;
    dimFilters: Partial<Record<DimId, string[]>>;
    rangeFilters: Partial<Record<DimId, RangeInput>>;
    focusMarket: string | null;
}

const PRESETS_STORAGE_KEY = 'analytics_filter_presets';

function sanitizePresets(raw: unknown): FilterPreset[] {
    if (!Array.isArray(raw)) return [];
    const out: FilterPreset[] = [];
    for (const p of raw) {
        if (!p || typeof p.name !== 'string' || !p.name.trim()) continue;
        const dims: FilterPreset['dimFilters'] = {};
        for (const [k, v] of Object.entries(p.dimFilters || {})) {
            if (DIM_MAP[k as DimId] && Array.isArray(v) && v.every((x) => typeof x === 'string') && v.length) dims[k as DimId] = v as string[];
        }
        const ranges: FilterPreset['rangeFilters'] = {};
        for (const [k, v] of Object.entries(p.rangeFilters || {}) as [string, any][]) {
            if (DIM_MAP[k as DimId] && v && typeof v.min === 'string' && typeof v.max === 'string' && (v.min.trim() || v.max.trim())) {
                ranges[k as DimId] = { min: v.min, max: v.max };
            }
        }
        out.push({ name: p.name.trim(), dimFilters: dims, rangeFilters: ranges, focusMarket: typeof p.focusMarket === 'string' ? p.focusMarket : null });
    }
    return out;
}

const RANGE_BREAKDOWNS: Breakdown[] = ['stakeBand', 'oddsBand', 'valueBand'];

function aggregate(rows: Bet[], breakdown: Breakdown, bankroll?: BankrollLike) {
    const map = new Map<string, any>();
    for (const bet of rows) {
        // Tags are multi-valued: a bet tagged ["Inplay Free's", "Cyclops"] counts under BOTH
        // tags, not one joined "Inplay Free's, Cyclops" bucket. Every other dimension is single.
        const keys = dimValues(bet, breakdown, bankroll);
        const clv = clvOf(bet);
        const hasClo = clv !== 0 || Boolean(numberValue(bet.closing_line_odds, bet.closingLineOdds));
        for (const key of keys) {
            const item = map.get(key) || { key, bets: 0, settled: 0, wins: 0, losses: 0, pushes: 0, stake: 0, profit: 0, oddsTotal: 0, cloCount: 0, clvTotal: 0 };
            item.bets += 1;
            item.stake += stakeOf(bet);
            item.profit += profitOf(bet);
            item.oddsTotal += oddsOf(bet);
            if (hasClo) {
                item.cloCount += 1;
                item.clvTotal += clv;
            }
            if (isSettled(bet)) item.settled += 1;
            if (isWin(bet)) item.wins += 1;
            if (statusOf(bet) === 'lost' || statusOf(bet) === 'half_loss') item.losses += 1;
            if (isNeutral(bet)) item.pushes += 1;
            map.set(key, item);
        }
    }

    return Array.from(map.values())
        .map((item) => ({
            ...item,
            roi: item.stake ? (item.profit / item.stake) * 100 : 0,
            winRate: (item.wins + item.losses) ? (item.wins / (item.wins + item.losses)) * 100 : 0,
            avgOdds: item.bets ? item.oddsTotal / item.bets : 0,
            avgClv: item.cloCount ? (item.clvTotal / item.cloCount) * 100 : 0,
        }))
        .sort((a, b) => {
            if (breakdown === 'month') return monthOrder(a.key) - monthOrder(b.key); // chronological
            if (RANGE_BREAKDOWNS.includes(breakdown)) return bandLower(a.key) - bandLower(b.key); // range order
            return b.profit - a.profit;
        });
}

function calendarDays(month: Date, daily: Map<string, any>) {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    const offset = (first.getDay() + 6) % 7;
    start.setDate(first.getDate() - offset);

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = dayKey(date);
        return {
            date,
            key,
            inMonth: date.getMonth() === month.getMonth(),
            data: daily.get(key) || { profit: 0, bets: 0, wins: 0, losses: 0, stake: 0, clvTotal: 0, cloCount: 0 },
        };
    });
}

export default function AnalyticsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [allBets, setAllBets] = useState<Bet[]>([]);
    const [timeframe, setTimeframe] = useState<Timeframe>('30D');
    const [breakdown, setBreakdown] = useState<Breakdown>('market');
    const [chartMetric, setChartMetric] = useState<ChartMetric>('profit');
    const [resultFilter, setResultFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [includePending, setIncludePending] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [activeBankrollId, setActiveBankrollId] = useState('personal');
    const [activeBankroll, setActiveBankroll] = useState<BankrollLike>(null);
    const [knownBankrollIds, setKnownBankrollIds] = useState<Set<string>>(new Set());
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Filter Builder: stackable per-dimension multi-selects, AND'd together (pivot-style).
    const [dimFilters, setDimFilters] = useState<Partial<Record<DimId, string[]>>>({});
    // Custom min/max on range dims (odds/stake/value) - ORs with that dim's ticked bands.
    const [rangeFilters, setRangeFilters] = useState<Partial<Record<DimId, RangeInput>>>({});
    const [openDim, setOpenDim] = useState<DimId | null>(null); // which facet checklist is expanded
    const [addingFilter, setAddingFilter] = useState(false);    // dimension picker open
    const [valueQuery, setValueQuery] = useState('');           // search within a facet list

    // Saved filter presets (localStorage-backed, loaded once on mount).
    const [presets, setPresets] = useState<FilterPreset[]>([]);
    const [savingPreset, setSavingPreset] = useState(false);
    const [presetName, setPresetName] = useState('');
    useEffect(() => {
        try { setPresets(sanitizePresets(JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '[]'))); } catch { /* corrupt store - start empty */ }
    }, []);

    // Interactive assistance controls.
    const [excludeBadDays, setExcludeBadDays] = useState(false); // drop calendar days that hemorrhaged
    const [flatStake, setFlatStake] = useState(false);          // normalise every stake to 1u (confidence-adjusted ROI)
    const [minSample, setMinSample] = useState(0);              // sample guard: hide/grey segments below N bets
    const [focusMarket, setFocusMarket] = useState<string | null>(null); // pin analysis to one market

    const [needsAuth, setNeedsAuth] = useState(false);

    useEffect(() => {
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId) {
            setNeedsAuth(true);
            setAllBets([
                { id: 1, team: 'Arsenal', market: 'To Win', odds: 1.95, actual_stake: 100, profit_loss: 95, status: 'won', tracked_at: new Date().toISOString() },
                { id: 2, team: 'Liverpool', market: 'Over 2.5 Goals', odds: 1.85, actual_stake: 150, profit_loss: -150, status: 'lost', tracked_at: new Date(Date.now() - 86400000).toISOString() },
                { id: 3, team: 'Man City', market: 'BTTS - Yes', odds: 2.10, actual_stake: 200, profit_loss: 220, status: 'won', tracked_at: new Date(Date.now() - 172800000).toISOString() }
            ]);
            setLoading(false);
            return;
        }

        const bankrollId = localStorage.getItem('active_bankroll_id') || 'personal';
        setActiveBankrollId(bankrollId);

        api.bets.getUserBetsLite(Number(userId))
            .then((data) => setAllBets(Array.isArray(data.bets) ? data.bets : []))
            .catch((error) => console.error(error))
            .finally(() => setLoading(false));

        const loadBankrolls = () => {
            const id = localStorage.getItem('active_bankroll_id') || 'personal';
            setActiveBankrollId(id);
            api.bankrolls.get(Number(userId))
                .then((data) => {
                    const list = data.bankrolls || [];
                    setKnownBankrollIds(new Set(list.map((b: any) => String(b.id))));
                    const br = list.find((b: any) => String(b.id) === String(id));
                    setActiveBankroll(br || { id, type: 'units', currency: 'u' });
                })
                .catch(() => {});
        };
        loadBankrolls();
            
        const handleBankrollChange = () => loadBankrolls();
        window.addEventListener('bankroll_changed', handleBankrollChange);
        return () => window.removeEventListener('bankroll_changed', handleBankrollChange);
    }, [router]);

    // Base scope: timeframe / date / result / pending / free-text search - everything EXCEPT the
    // stackable dimension filters and the assistance controls (those layer on top below).
    const baseBets = useMemo(() => {
        const useCustomRange = timeframe === 'CUSTOM' || Boolean(dateFrom || dateTo);
        const presetStart = useCustomRange ? null : startForTimeframe(timeframe);
        const rangeStart = parseDateInput(dateFrom);
        const rangeEnd = parseDateInput(dateTo, true);
        const q = search.toLowerCase().trim();

        return allBets.filter((bet) => {
            if (!betInBankrollView(bet, activeBankrollId, knownBankrollIds)) return false;

            const date = betDate(bet);
            if (useCustomRange) {
                if (rangeStart && (!date || date < rangeStart)) return false;
                if (rangeEnd && (!date || date > rangeEnd)) return false;
            } else if (presetStart && (!date || date < presetStart)) {
                return false;
            }
            if (!includePending && !isSettled(bet)) return false;
            if (resultFilter !== 'all' && statusOf(bet) !== resultFilter) return false;
            if (!q) return true;
            const haystack = [
                bet.match,
                bet.fixture_name,
                bet.searchEvent,
                bet.search_event,
                bet.selection,
                bet.player_name,
                bet.team,
                bet.league,
                bet.country,
                bet.bookmaker,
                bet.market,
            ].join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }, [allBets, activeBankrollId, knownBankrollIds, timeframe, dateFrom, dateTo, resultFilter, includePending, search]);

    // One predicate per constrained dimension: ticked bands OR the custom min/max range.
    // Both empty -> the dimension is unconstrained and contributes no predicate.
    const dimPredicates = useMemo(() => {
        const dims = new Set<DimId>([
            ...(Object.entries(dimFilters).filter(([, v]) => v && v.length).map(([d]) => d) as DimId[]),
            ...(Object.keys(rangeFilters).filter((d) => parseRange(rangeFilters[d as DimId])) as DimId[]),
        ]);
        const out = new Map<DimId, (bet: Bet) => boolean>();
        for (const dim of dims) {
            const vals = dimFilters[dim] || [];
            const range = parseRange(rangeFilters[dim]);
            const numeric = DIM_MAP[dim].numeric;
            out.set(dim, (bet: Bet) => {
                if (vals.length && dimValues(bet, dim, activeBankroll).some((v) => vals.includes(v))) return true;
                if (range && numeric) {
                    const n = numeric(bet, activeBankroll);
                    // n<=0 means "no odds"/"no stake"/untagged - a numeric bound never matches those.
                    if (n > 0 && (range.min === null || n >= range.min) && (range.max === null || n <= range.max)) return true;
                }
                return false;
            });
        }
        return out;
    }, [dimFilters, rangeFilters, activeBankroll]);

    // Distinct values + counts per dimension, each computed against the OTHER active filters
    // (leave-one-out) so the count tells you exactly what adding that value would surface.
    const facets = useMemo(() => {
        const out = {} as Record<DimId, { value: string; count: number }[]>;
        for (const def of DIM_DEFS) {
            const subset = baseBets.filter((bet) => {
                for (const [dim, pass] of dimPredicates) {
                    if (dim === def.id) continue;
                    if (!pass(bet)) return false;
                }
                if (focusMarket && def.id !== 'market' && marketOf(bet) !== focusMarket) return false;
                return true;
            });
            const counts = new Map<string, number>();
            for (const bet of subset) for (const v of dimValues(bet, def.id, activeBankroll)) counts.set(v, (counts.get(v) || 0) + 1);
            out[def.id] = Array.from(counts.entries())
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => {
                    if (def.id === 'month') return monthOrder(b.value) - monthOrder(a.value); // newest first
                    if (def.id === 'region') return REGION_ORDER.indexOf(a.value as never) - REGION_ORDER.indexOf(b.value as never);
                    if (def.range) return bandLower(a.value) - bandLower(b.value);
                    return b.count - a.count;
                });
        }
        return out;
    }, [baseBets, dimPredicates, focusMarket, activeBankroll]);

    // Apply the stackable dimension filters (AND across dimensions, OR within) + market focus.
    const dimFilteredBets = useMemo(() => {
        return baseBets.filter((bet) => {
            for (const [, pass] of dimPredicates) {
                if (!pass(bet)) return false;
            }
            if (focusMarket && marketOf(bet) !== focusMarket) return false;
            return true;
        });
    }, [baseBets, dimPredicates, focusMarket]);

    // Bad days = calendar days that lost money AND took >=3 losses. Flagged on the filtered set so
    // the "exclude bad days" toggle can strip the tilt/variance days from every downstream stat.
    const badDayKeys = useMemo(() => {
        const days = new Map<string, { profit: number; losses: number }>();
        for (const bet of dimFilteredBets) {
            const k = betDayKey(bet, activeBankroll?.timezone);
            if (!k) continue;
            const acc = days.get(k) || { profit: 0, losses: 0 };
            acc.profit += profitOf(bet);
            if (isLost(bet)) acc.losses += 1;
            days.set(k, acc);
        }
        const bad = new Set<string>();
        for (const [k, v] of days) if (v.losses >= 3 && v.profit < 0) bad.add(k);
        return bad;
    }, [dimFilteredBets, activeBankroll]);

    const filteredBets = useMemo(() => (
        excludeBadDays
            ? dimFilteredBets.filter((bet) => { const k = betDayKey(bet, activeBankroll?.timezone); return !k || !badDayKeys.has(k); })
            : dimFilteredBets
    ), [dimFilteredBets, excludeBadDays, badDayKeys, activeBankroll]);

    // Flat-stake lens: normalise every stake to 1u so a handful of big stakes can't distort ROI -
    // a confidence-agnostic view of edge. profit/return are recomputed per-unit; membership is unchanged.
    const statBets = useMemo(() => {
        if (!flatStake) return filteredBets;
        return filteredBets.map((bet) => {
            const stake = stakeOf(bet);
            const plPerUnit = stake ? profitOf(bet) / stake : 0;
            return { ...bet, stake: 1, actual_stake: 1, units_staked: 1, profit_loss: plPerUnit, profit: '', pnl: '', p_l: '', net_profit: '', returns: '', return_amount: '', total_returns: '' } as Bet;
        });
    }, [filteredBets, flatStake]);

    const activeFilterCount = useMemo(
        () => dimPredicates.size + (focusMarket ? 1 : 0),
        [dimPredicates, focusMarket],
    );

    const analytics = useMemo(() => {
        const sorted = [...statBets].sort((a, b) => (betDate(a)?.getTime() || 0) - (betDate(b)?.getTime() || 0));
        let cumulative = 0;
        const daily = new Map<string, any>();
        const curve = sorted.map((bet) => {
            const date = betDate(bet) || new Date();
            const profit = profitOf(bet);
            const stake = stakeOf(bet);
            const clv = clvOf(bet);
            cumulative += profit;
            const key = betDayKey(bet, activeBankroll?.timezone) || dayKey(date);
            const item = daily.get(key) || { profit: 0, bets: 0, wins: 0, losses: 0, stake: 0, clvTotal: 0, cloCount: 0 };
            item.profit += profit;
            item.stake += stake;
            item.bets += 1;
            if (clv !== 0 || numberValue(bet.closing_line_odds, bet.closingLineOdds)) {
                item.cloCount += 1;
                item.clvTotal += clv;
            }
            if (isWin(bet)) item.wins += 1;
            if (statusOf(bet) === 'lost' || statusOf(bet) === 'half_loss') item.losses += 1;
            daily.set(key, item);

            return {
                date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                profit: Number(cumulative.toFixed(2)),
                roi: stake ? Number(((profit / stake) * 100).toFixed(1)) : 0,
                winRate: isWin(bet) ? 100 : 0,
                clv: clv ? Number((clv * 100).toFixed(1)) : 0,
            };
        });

        const settled = statBets.filter(isSettled);
        const wins = statBets.filter(isWin).length;
        const losses = statBets.filter((bet) => statusOf(bet) === 'lost' || statusOf(bet) === 'half_loss').length;
        const stake = statBets.reduce((sum, bet) => sum + stakeOf(bet), 0);
        const returned = statBets.reduce((sum, bet) => sum + returnsOf(bet), 0);
        const profit = statBets.reduce((sum, bet) => sum + profitOf(bet), 0);
        const avgOdds = statBets.length ? statBets.reduce((sum, bet) => sum + oddsOf(bet), 0) / statBets.length : 0;
        const betsWithClo = statBets.filter(bet => numberValue(bet.closing_line_odds, bet.closingLineOdds));
        const avgClv = betsWithClo.length ? (betsWithClo.reduce((sum, bet) => sum + clvOf(bet), 0) / betsWithClo.length) * 100 : 0;
        const breakdownRows = aggregate(statBets, breakdown, activeBankroll);

        const weekdayRows = aggregate(statBets, 'weekday', activeBankroll);
        const marketRows = aggregate(statBets, 'market', activeBankroll);
        // Compute best/worst by profit explicitly - breakdownRows may now be in range order.
        const best = [...breakdownRows].sort((a, b) => b.profit - a.profit)[0];
        const worst = [...breakdownRows].sort((a, b) => a.profit - b.profit)[0];

        return {
            curve: [{ date: 'Start', profit: 0, roi: 0, winRate: 0, clv: 0 }, ...curve],
            daily,
            settled: settled.length,
            wins,
            losses,
            stake,
            returned,
            profit,
            roi: stake ? (profit / stake) * 100 : 0,
            winRate: (wins + losses) ? (wins / (wins + losses)) * 100 : 0,
            avgOdds,
            avgClv,
            breakdownRows,
            weekdayRows,
            marketRows,
            best,
            worst,
        };
    }, [statBets, breakdown, activeBankroll]);

    // Segments meeting the sample guard (>= minSample bets). Used for the chart, best/worst notes
    // and to grey the sub-threshold rows in the table - thin samples stop masquerading as signal.
    const guardedRows = useMemo(
        () => analytics.breakdownRows.filter((r) => r.bets >= minSample),
        [analytics.breakdownRows, minSample],
    );
    const guardedBest = useMemo(() => [...guardedRows].sort((a, b) => b.profit - a.profit)[0], [guardedRows]);
    const guardedWorst = useMemo(() => [...guardedRows].sort((a, b) => a.profit - b.profit)[0], [guardedRows]);
    const topMarket = analytics.marketRows[0]?.key as string | undefined;

    const activeDims = Array.from(dimPredicates.keys());
    const toggleDimValue = (dim: DimId, value: string) => setDimFilters((prev) => {
        const cur = prev[dim] || [];
        const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
        const copy = { ...prev };
        if (next.length) copy[dim] = next; else delete copy[dim];
        return copy;
    });
    const setDimRange = (dim: DimId, part: 'min' | 'max', raw: string) => setRangeFilters((prev) => {
        const cur = { min: '', max: '', ...prev[dim], [part]: raw };
        const copy = { ...prev };
        if (cur.min.trim() === '' && cur.max.trim() === '') delete copy[dim]; else copy[dim] = cur;
        return copy;
    });
    const clearDim = (dim: DimId) => {
        setDimFilters((prev) => { const c = { ...prev }; delete c[dim]; return c; });
        setRangeFilters((prev) => { const c = { ...prev }; delete c[dim]; return c; });
    };

    const persistPresets = (next: FilterPreset[]) => {
        try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage full/blocked - keep in-memory */ }
    };
    const savePreset = () => {
        const name = presetName.trim();
        if (!name) return;
        const preset: FilterPreset = { name, dimFilters, rangeFilters, focusMarket };
        setPresets((prev) => { const next = [...prev.filter((p) => p.name !== name), preset]; persistPresets(next); return next; });
        setSavingPreset(false);
        setPresetName('');
    };
    const applyPreset = (p: FilterPreset) => {
        setDimFilters(p.dimFilters);
        setRangeFilters(p.rangeFilters);
        setFocusMarket(p.focusMarket);
        setOpenDim(null);
        setAddingFilter(false);
    };
    const deletePreset = (name: string) => setPresets((prev) => { const next = prev.filter((p) => p.name !== name); persistPresets(next); return next; });

    const monthDays = useMemo(() => calendarDays(calendarMonth, analytics.daily), [calendarMonth, analytics.daily]);
    const chartColor = chartMetric === 'profit' ? GREEN : chartMetric === 'roi' ? BLUE : AMBER;

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-[#10b981] animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative h-full">
            {needsAuth && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-start pt-[15vh] bg-white/40 backdrop-blur-md rounded-2xl" style={{ margin: '-1rem', padding: '1rem' }}>
                    <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-xl max-w-md w-full text-center sticky top-32">
                        <div className="w-16 h-16 bg-[#10b981]/10 text-[#10b981] rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-[#121212] mb-2">Connect Telegram</h2>
                        <p className="text-gray-500 mb-6 text-sm">
                            Connect your Telegram account to view your live betting analytics, track your bankroll, and auto-sync your bets.
                        </p>
                        <button 
                            onClick={() => router.push('/connect')}
                            className="w-full bg-[#121212] hover:bg-black text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md"
                        >
                            Connect Telegram Now
                        </button>
                    </div>
                </div>
            )}
        <div className={`max-w-[1700px] mx-auto ${needsAuth ? 'opacity-50 pointer-events-none select-none overflow-hidden h-[80vh]' : ''}`}>
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-[32px] font-bold tracking-tight text-[#121212]">Analytics</h1>
                        <span className="track-badge-motion rounded-full border border-gray-200 bg-white px-3 py-1 text-[12px] font-bold text-gray-500">
                            <NumberPop value={`${filteredBets.length} bets`} />
                        </span>
                    </div>
                    <p className="mt-1 text-[14px] font-medium text-gray-500">
                        Find what actually works by period, market, sport, bookmaker, stake and odds profile.
                    </p>
                </div>
                <div className="flex flex-col items-stretch gap-3 sm:items-end">
                    <SlidingTabs
                        value={timeframe}
                        onChange={(value) => {
                            setTimeframe(value as Timeframe);
                            if (value !== 'CUSTOM') {
                                setDateFrom('');
                                setDateTo('');
                            }
                        }}
                        className="rounded-xl"
                        buttonClassName="h-9 px-3"
                        items={(['24H', '7D', '30D', '90D', 'YTD', 'ALL', 'CUSTOM'] as Timeframe[]).map((item) => ({
                            id: item,
                            label: item === 'CUSTOM' ? 'Custom' : item,
                        }))}
                    />
                    {(timeframe === 'CUSTOM' || dateFrom || dateTo) && (
                        <div className="flex flex-wrap items-center gap-2">
                            <DateInput
                                value={dateFrom}
                                onChange={(value) => {
                                    setDateFrom(value);
                                    setTimeframe('CUSTOM');
                                }}
                                className="rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-[13px] font-semibold outline-none focus:border-[#10b981]"
                            />
                            <span className="text-[12px] font-semibold text-gray-400">to</span>
                            <DateInput
                                value={dateTo}
                                onChange={(value) => {
                                    setDateTo(value);
                                    setTimeframe('CUSTOM');
                                }}
                                className="rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-[13px] font-semibold outline-none focus:border-[#10b981]"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
                <aside className="space-y-4">
                    <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
                                <Filter size={14} /> Filters
                            </div>
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setResultFilter('all');
                                    setIncludePending(false);
                                    setBreakdown('market');
                                    setChartMetric('profit');
                                    setTimeframe('30D');
                                    setDateFrom('');
                                    setDateTo('');
                                    setDimFilters({});
                                    setOpenDim(null);
                                    setAddingFilter(false);
                                    setValueQuery('');
                                    setExcludeBadDays(false);
                                    setFlatStake(false);
                                    setMinSample(0);
                                    setFocusMarket(null);
                                }}
                                className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[12px] font-semibold text-gray-500 hover:text-[#121212]"
                            >
                                <RefreshCcw size={12} /> Reset
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search team, player, selection…"
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-[13px] font-medium outline-none focus:border-[#10b981] focus:bg-white"
                            />
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Date range</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <DateInput
                                        value={dateFrom}
                                        onChange={(value) => {
                                            setDateFrom(value);
                                            setTimeframe('CUSTOM');
                                        }}
                                        className="w-full rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2.5 text-[13px] font-semibold outline-none focus:border-[#10b981]"
                                    />
                                    <DateInput
                                        value={dateTo}
                                        onChange={(value) => {
                                            setDateTo(value);
                                            setTimeframe('CUSTOM');
                                        }}
                                        className="w-full rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2.5 text-[13px] font-semibold outline-none focus:border-[#10b981]"
                                    />
                                </div>
                                <p className="mt-1.5 text-[11px] font-medium text-gray-400">Leave blank for open-ended range.</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Result</label>
                                <select
                                    value={resultFilter}
                                    onChange={(event) => setResultFilter(event.target.value)}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-[#10b981]"
                                >
                                    <option value="all">All settled</option>
                                    <option value="won">Won</option>
                                    <option value="lost">Lost</option>
                                    <option value="push">Push</option>
                                    <option value="refunded">Refunded</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-semibold text-[#121212]">
                                Include pending/open bets
                                <input
                                    type="checkbox"
                                    checked={includePending}
                                    onChange={(event) => setIncludePending(event.target.checked)}
                                    className="h-4 w-4 accent-[#10b981]"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
                                <SlidersHorizontal size={14} /> Filter Builder
                                {activeFilterCount > 0 && (
                                    <span className="rounded-full bg-[#10b981]/10 px-2 py-0.5 text-[10px] font-bold text-[#047857]">{activeFilterCount}</span>
                                )}
                            </div>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={() => { setDimFilters({}); setRangeFilters({}); setFocusMarket(null); setOpenDim(null); }}
                                    className="text-[11px] font-semibold text-gray-400 hover:text-[#121212]"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                        <p className="mb-3 text-[11px] font-medium text-gray-400">
                            Stack any dimensions - they combine with AND, values within one combine with OR.
                        </p>

                        {/* Saved presets: click to apply, x to delete. Save appears once filters are active. */}
                        {(presets.length > 0 || activeFilterCount > 0) && (
                            <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                {presets.map((p) => (
                                    <span key={p.name} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold text-gray-600">
                                        <BookmarkIcon size={11} className="text-gray-400" />
                                        <button onClick={() => applyPreset(p)} className="hover:text-[#047857]" title="Apply this preset">{p.name}</button>
                                        <button onClick={() => deletePreset(p.name)} className="ml-0.5 text-gray-300 hover:text-red-500" title="Delete preset"><X size={11} /></button>
                                    </span>
                                ))}
                                {activeFilterCount > 0 && !savingPreset && (
                                    <button
                                        onClick={() => { setSavingPreset(true); setPresetName(''); }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-[11px] font-bold text-gray-500 hover:border-[#10b981] hover:text-[#047857]"
                                    >
                                        <Plus size={11} /> Save preset
                                    </button>
                                )}
                                {savingPreset && (
                                    <span className="inline-flex items-center gap-1">
                                        <input
                                            autoFocus
                                            value={presetName}
                                            onChange={(e) => setPresetName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') { setSavingPreset(false); setPresetName(''); } }}
                                            placeholder="Preset name"
                                            className="w-28 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#10b981]"
                                        />
                                        <button onClick={savePreset} className="text-[11px] font-bold text-[#047857] hover:underline">Save</button>
                                        <button onClick={() => { setSavingPreset(false); setPresetName(''); }} className="text-gray-400 hover:text-[#121212]"><X size={11} /></button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Active filter pills */}
                        {(activeDims.length > 0 || focusMarket) && (
                            <div className="mb-3 flex flex-wrap gap-1.5">
                                {focusMarket && (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-[#10b981]/40 bg-[#10b981]/10 px-2 py-1 text-[11px] font-bold text-[#047857]">
                                        <Target size={11} /> {focusMarket}
                                        <button onClick={() => setFocusMarket(null)} className="ml-0.5 text-[#047857]/70 hover:text-[#047857]"><X size={11} /></button>
                                    </span>
                                )}
                                {activeDims.map((dim) => {
                                    const vals = dimFilters[dim] || [];
                                    const range = parseRange(rangeFilters[dim]);
                                    const summary = range
                                        ? (vals.length ? `${vals.length} selected + ${fmtRangeLabel(range)}` : fmtRangeLabel(range))
                                        : vals.length === 1 ? vals[0] : `${vals.length} selected`;
                                    return (
                                        <button
                                            key={dim}
                                            onClick={() => { setOpenDim(openDim === dim ? null : dim); setAddingFilter(false); setValueQuery(''); }}
                                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
                                                openDim === dim ? 'border-[#10b981] bg-[#10b981]/10 text-[#047857]' : 'border-gray-200 bg-gray-50 text-gray-600 hover:text-[#121212]'
                                            }`}
                                        >
                                            <span className="text-gray-400">{DIM_MAP[dim].label}:</span> <span className="max-w-[110px] truncate">{summary}</span>
                                            <span onClick={(e) => { e.stopPropagation(); clearDim(dim); if (openDim === dim) setOpenDim(null); }} className="ml-0.5 text-gray-400 hover:text-red-500"><X size={11} /></span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Add-filter dimension picker */}
                        <div className="relative">
                            <button
                                onClick={() => { setAddingFilter((v) => !v); setOpenDim(null); }}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-[12px] font-bold text-gray-500 hover:border-[#10b981] hover:text-[#047857]"
                            >
                                <Plus size={13} /> Add filter
                            </button>
                            {addingFilter && (
                                <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2">
                                    {DIM_DEFS.map((def) => (
                                        <button
                                            key={def.id}
                                            onClick={() => { setOpenDim(def.id); setAddingFilter(false); setValueQuery(''); }}
                                            className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 hover:text-[#121212] border border-gray-100"
                                        >
                                            <def.icon size={12} /> {def.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Value checklist for the open dimension */}
                        {openDim && (() => {
                            const def = DIM_MAP[openDim];
                            const all = facets[openDim] || [];
                            const q = valueQuery.toLowerCase().trim();
                            const list = q ? all.filter((f) => f.value.toLowerCase().includes(q)) : all;
                            const selected = dimFilters[openDim] || [];
                            return (
                                <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2">
                                    <div className="mb-2 flex items-center justify-between px-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{def.label}</span>
                                        <div className="flex items-center gap-2">
                                            {list.length > 0 && (
                                                <button
                                                    onClick={() => setDimFilters((prev) => {
                                                        const cur = prev[openDim] || [];
                                                        const values = list.map((f) => f.value);
                                                        const allSel = values.every((v) => cur.includes(v));
                                                        const next = allSel ? cur.filter((v) => !values.includes(v)) : Array.from(new Set([...cur, ...values]));
                                                        const c = { ...prev };
                                                        if (next.length) c[openDim] = next; else delete c[openDim];
                                                        return c;
                                                    })}
                                                    className="text-[11px] font-semibold text-[#047857] hover:underline"
                                                >
                                                    {list.every((f) => selected.includes(f.value)) ? 'Deselect all' : 'Select all'}
                                                </button>
                                            )}
                                            {selected.length > 0 && (
                                                <button onClick={() => clearDim(openDim)} className="text-[11px] font-semibold text-gray-400 hover:text-red-500">Clear</button>
                                            )}
                                            <button onClick={() => setOpenDim(null)} className="text-gray-400 hover:text-[#121212]"><X size={13} /></button>
                                        </div>
                                    </div>
                                    {def.range && (
                                        <div className="mb-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-semibold text-gray-500">Custom:</span>
                                                <input
                                                    inputMode="decimal"
                                                    value={rangeFilters[openDim]?.min ?? ''}
                                                    onChange={(e) => setDimRange(openDim, 'min', e.target.value)}
                                                    placeholder="min"
                                                    className="w-16 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[12px] outline-none focus:border-[#10b981]"
                                                />
                                                <span className="text-[11px] text-gray-400">to</span>
                                                <input
                                                    inputMode="decimal"
                                                    value={rangeFilters[openDim]?.max ?? ''}
                                                    onChange={(e) => setDimRange(openDim, 'max', e.target.value)}
                                                    placeholder="max"
                                                    className="w-16 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[12px] outline-none focus:border-[#10b981]"
                                                />
                                                {rangeFilters[openDim] && (
                                                    <button
                                                        onClick={() => setRangeFilters((prev) => { const c = { ...prev }; delete c[openDim]; return c; })}
                                                        className="ml-auto text-gray-400 hover:text-red-500"
                                                    ><X size={12} /></button>
                                                )}
                                            </div>
                                            <p className="mt-1 text-[10px] font-medium text-gray-400">Leave one side blank for open-ended. Combines (OR) with ticked bands.</p>
                                        </div>
                                    )}
                                    {all.length > 8 && (
                                        <input
                                            value={valueQuery}
                                            onChange={(e) => setValueQuery(e.target.value)}
                                            placeholder={`Filter ${def.label.toLowerCase()}…`}
                                            className="mb-2 w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] outline-none focus:border-[#10b981]"
                                        />
                                    )}
                                    <div className="max-h-56 space-y-0.5 overflow-y-auto">
                                        {list.length === 0 && <p className="px-1 py-2 text-[12px] text-gray-400">No matching values.</p>}
                                        {list.map((f) => {
                                            const on = selected.includes(f.value);
                                            return (
                                                <button
                                                    key={f.value}
                                                    onClick={() => toggleDimValue(openDim, f.value)}
                                                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12px] font-semibold transition-colors ${
                                                        on ? 'bg-[#10b981]/10 text-[#047857]' : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2 truncate">
                                                        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${on ? 'border-[#10b981] bg-[#10b981] text-white' : 'border-gray-300'}`}>
                                                            {on && <Check size={10} strokeWidth={3} />}
                                                        </span>
                                                        <span className="truncate">{f.value}</span>
                                                    </span>
                                                    <span className="shrink-0 text-[11px] font-bold text-gray-400">{f.count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
                            <SlidersHorizontal size={14} /> Quick Reports
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {quickReports.map((report) => (
                                <button
                                    key={report.id}
                                    onClick={() => setBreakdown(report.id)}
                                    aria-selected={breakdown === report.id}
                                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] font-bold transition-all ${
                                        breakdown === report.id
                                            ? 'border-[#10b981] bg-[#10b981]/10 text-[#047857]'
                                            : 'border-gray-200 bg-white text-gray-600 hover:text-[#121212]'
                                    }`}
                                >
                                    <report.icon size={14} />
                                    {report.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
                            <ShieldCheck size={14} /> Assistance
                        </div>
                        <div className="space-y-2">
                            {/* Bad-day detection - strip high-loss losing days from every stat. */}
                            <div className="track-panel-reveal rounded-lg bg-gray-50 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] font-bold text-[#121212]">Bad-day filter</span>
                                    <button
                                        role="switch"
                                        aria-checked={excludeBadDays}
                                        onClick={() => setExcludeBadDays((v) => !v)}
                                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${excludeBadDays ? 'bg-[#10b981]' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${excludeBadDays ? 'left-[18px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                                <p className="mt-1 text-[11px] font-medium text-gray-400">
                                    {excludeBadDays ? `Excluding ${badDayKeys.size} tilt day${badDayKeys.size === 1 ? '' : 's'} (3+ losses, net down).` : 'Drop days with 3+ losses that ended negative.'}
                                </p>
                            </div>

                            {/* Stake confidence - flat 1u staking so big stakes don't distort ROI. */}
                            <div className="track-panel-reveal rounded-lg bg-gray-50 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] font-bold text-[#121212]">Flat-stake ROI</span>
                                    <button
                                        role="switch"
                                        aria-checked={flatStake}
                                        onClick={() => setFlatStake((v) => !v)}
                                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${flatStake ? 'bg-[#10b981]' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${flatStake ? 'left-[18px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                                <p className="mt-1 text-[11px] font-medium text-gray-400">
                                    {flatStake ? 'Every bet normalised to 1u - pure edge, stake-sizing removed.' : 'Normalise all stakes to 1u for confidence-agnostic ROI.'}
                                </p>
                            </div>

                            {/* Sample guard - hide/grey segments below N bets. */}
                            <div className="track-panel-reveal rounded-lg bg-gray-50 px-3 py-2.5">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <span className="text-[13px] font-bold text-[#121212]">Sample guard</span>
                                    <span className="text-[11px] font-bold text-gray-400">{minSample === 0 ? 'Off' : `${minSample}+ bets`}</span>
                                </div>
                                <div className="flex gap-1">
                                    {[0, 5, 10, 20].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setMinSample(n)}
                                            className={`flex-1 rounded-md border px-2 py-1 text-[11px] font-bold transition-colors ${
                                                minSample === n ? 'border-[#10b981] bg-[#10b981]/10 text-[#047857]' : 'border-gray-200 bg-white text-gray-500 hover:text-[#121212]'
                                            }`}
                                        >
                                            {n === 0 ? 'Off' : n}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-1 text-[11px] font-medium text-gray-400">Grey out segments below the threshold.</p>
                            </div>

                            {/* Market focus - pin all analysis to the top market. */}
                            <div className="track-panel-reveal rounded-lg bg-gray-50 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] font-bold text-[#121212]">Market focus</span>
                                    <button
                                        role="switch"
                                        aria-checked={Boolean(focusMarket)}
                                        disabled={!topMarket && !focusMarket}
                                        onClick={() => setFocusMarket((cur) => (cur ? null : topMarket || null))}
                                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40 ${focusMarket ? 'bg-[#10b981]' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${focusMarket ? 'left-[18px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                                <p className="mt-1 text-[11px] font-medium text-gray-400">
                                    {focusMarket ? `Pinned to ${focusMarket}.` : topMarket ? `Pin everything to ${topMarket} (top market).` : 'No market to focus yet.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-7">
                        {[
                            { label: 'Total Staked', value: formatBankrollAmount(analytics.stake, activeBankroll), icon: CircleDollarSign, tone: 'text-[#121212]' },
                            { label: 'Total Returned', value: formatBankrollAmount(analytics.returned, activeBankroll), icon: WalletCards, tone: 'text-[#121212]' },
                            { label: 'Profit', value: fmtUnits(analytics.profit, activeBankroll), icon: LineChartIcon, tone: analytics.profit >= 0 ? 'text-[#10b981]' : 'text-red-500' },
                            { label: 'ROI', value: fmtPct(analytics.roi), icon: Activity, tone: analytics.roi >= 0 ? 'text-[#10b981]' : 'text-red-500' },
                            { label: 'Win Rate', value: fmtPct(analytics.winRate).replace('+', ''), icon: Target, tone: 'text-[#121212]' },
                            { label: 'Avg Odds', value: analytics.avgOdds ? analytics.avgOdds.toFixed(2) : '-', icon: Trophy, tone: 'text-[#121212]' },
                            { label: 'CLV', value: analytics.avgClv ? fmtPct(analytics.avgClv) : '-', icon: BarChart3, tone: analytics.avgClv >= 0 ? 'text-[#10b981]' : 'text-red-500' },
                        ].map((card) => (
                            <div key={card.label} className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{card.label}</span>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                                        <card.icon size={16} className={card.tone} />
                                    </div>
                                </div>
                                <div className={`text-[24px] font-bold tracking-tight ${card.tone}`}>
                                    <NumberPop value={card.value} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-[16px] font-bold text-[#121212]">Profit Over Time</h2>
                                    <p className="text-[12px] font-medium text-gray-500">Filtered bet trajectory</p>
                                </div>
                                <SlidingTabs
                                    value={chartMetric}
                                    onChange={setChartMetric}
                                    className="rounded-lg"
                                    buttonClassName="h-8 px-3 capitalize"
                                    items={(['profit', 'roi', 'winRate', 'clv'] as ChartMetric[]).map((metric) => ({
                                        id: metric,
                                        label: metric === 'winRate' ? 'Win %' : metric === 'clv' ? 'CLV' : metric,
                                    }))}
                                />
                            </div>
                            <div className="h-[310px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.curve} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="analyticsProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.26} />
                                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} stroke="#9ca3af" minTickGap={28} />
                                        <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="#9ca3af" />
                                        <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                        <Area type="monotone" dataKey={chartMetric} stroke={chartColor} strokeWidth={3} fill="url(#analyticsProfit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-[16px] font-bold text-[#121212]">{monthLabel(calendarMonth)}</h2>
                                    <p className="text-[12px] font-medium text-gray-500">Daily profit calendar</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setCalendarMonth(new Date())}
                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-bold text-gray-600 hover:bg-gray-50"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day}>{day}</div>)}
                            </div>
                            <div className="mt-2 grid grid-cols-7 gap-1">
                                {monthDays.map((day) => {
                                    const profit = day.data.profit;
                                    const active = day.data.bets > 0;
                                    const bg = !active ? 'bg-gray-50' : profit > 0 ? 'bg-[#10b981]' : profit < 0 ? 'bg-red-500' : 'bg-amber-400';
                                    return (
                                        <div
                                            key={day.key}
                                            style={{ ['--row-index' as string]: day.date.getDate() % 14 }}
                                            className={`aspect-[1.15] rounded-md border p-1.5 text-left transition-all ${
                                                active ? `${bg} border-transparent text-white shadow-sm` : 'border-gray-100 bg-gray-50 text-gray-300'
                                            } ${day.inMonth ? '' : 'opacity-40'} track-row-motion`}
                                        >
                                            <div className="text-[11px] font-bold">{day.date.getDate()}</div>
                                            {active && (
                                                <div className="mt-1 truncate text-[11px] font-black">
                                                    {profit > 0 ? '+' : ''}{profit.toFixed(1)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2 text-[12px] font-bold">
                                <div className="rounded-lg bg-[#10b981]/10 px-3 py-2 text-[#047857]">Green: profit</div>
                                <div className="rounded-lg bg-red-50 px-3 py-2 text-red-600">Red: loss</div>
                                <div className="rounded-lg bg-gray-50 px-3 py-2 text-gray-500">Blank: no bets</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
                        <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[16px] font-bold text-[#121212]">By {quickReports.find((r) => r.id === breakdown)?.label}</h2>
                                    <p className="text-[12px] font-medium text-gray-500">
                                        Best: {guardedBest?.key || '-'} · Worst: {guardedWorst?.key || '-'}
                                    </p>
                                </div>
                                <PieChartIcon size={18} className="text-gray-400" />
                            </div>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={guardedRows.slice(0, 8)} layout="vertical" margin={{ left: 22, right: 20, top: 4, bottom: 4 }}>
                                        <CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="#9ca3af" />
                                        <YAxis type="category" dataKey="key" tickLine={false} axisLine={false} fontSize={11} width={95} stroke="#6b7280" />
                                        <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                        <Bar dataKey="profit" radius={[0, 6, 6, 0]}>
                                            {guardedRows.slice(0, 8).map((row) => (
                                                <Cell key={row.key} fill={row.profit >= 0 ? GREEN : RED} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="track-card-motion overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-100 p-4">
                                <h2 className="text-[16px] font-bold text-[#121212]">Breakdown Table</h2>
                                <p className="text-[12px] font-medium text-gray-500">
                                    {breakdown === 'month' ? 'Chronological' : RANGE_BREAKDOWNS.includes(breakdown) ? 'Sorted by range' : 'Sorted by profit'}
                                    {minSample > 0 ? ` · segments under ${minSample} bets greyed` : ''}{flatStake ? ' · flat 1u stakes' : ''}
                                </p>
                            </div>
                            <div className="max-h-[520px] overflow-auto">
                                <table className="w-full min-w-[760px] border-collapse text-left">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                            <th className="bg-gray-50 px-4 py-3">Segment</th>
                                            <th className="bg-gray-50 px-4 py-3 text-right">Bets</th>
                                            <th className="bg-gray-50 px-4 py-3 text-right">Stake</th>
                                            <th className="bg-gray-50 px-4 py-3 text-right">Profit</th>
                                            <th className="bg-gray-50 px-4 py-3 text-right">ROI</th>
                                            <th className="bg-gray-50 px-4 py-3 text-right">Win %</th>
                                            <th className="bg-gray-50 px-4 py-3 text-right">CLV</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px]">
                                        {analytics.breakdownRows.map((row, index) => {
                                            const low = minSample > 0 && row.bets < minSample;
                                            return (
                                            <tr key={row.key} style={{ ['--row-index' as string]: index }} className={`track-row-motion border-t border-gray-100 hover:bg-gray-50/70 ${low ? 'opacity-40' : ''}`}>
                                                <td className="px-4 py-3 font-bold text-[#121212]">
                                                    <button onClick={() => breakdown !== 'tags' && toggleDimValue(breakdown, row.key)} className="text-left hover:text-[#047857]" title="Add to filters">{row.key}</button>
                                                    {low && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">low</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-600">{row.bets}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-600">{formatBankrollAmount(row.stake, activeBankroll)}</td>
                                                <td className={`px-4 py-3 text-right font-bold ${row.profit >= 0 ? 'text-[#047857]' : 'text-red-600'}`}>{fmtUnits(row.profit, activeBankroll)}</td>
                                                <td className={`px-4 py-3 text-right font-bold ${row.roi >= 0 ? 'text-[#047857]' : 'text-red-600'}`}>{fmtPct(row.roi)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-[#121212]">{row.winRate.toFixed(1)}%</td>
                                                <td className={`px-4 py-3 text-right font-bold ${row.avgClv ? (row.avgClv >= 0 ? 'text-[#047857]' : 'text-red-600') : 'text-gray-500'}`}>{row.avgClv ? fmtPct(row.avgClv) : '-'}</td>
                                            </tr>
                                            );
                                        })}
                                        {analytics.breakdownRows.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-10 text-center text-[14px] font-semibold text-gray-500">
                                                    No bets match these filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="mb-4">
                                <h2 className="text-[16px] font-bold text-[#121212]">Weekday Edge</h2>
                                <p className="text-[12px] font-medium text-gray-500">Spot recurring timing patterns</p>
                            </div>
                            <div className="h-[230px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analytics.weekdayRows} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                        <CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={11} stroke="#9ca3af" />
                                        <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="#9ca3af" />
                                        <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                        <Line type="monotone" dataKey="roi" stroke={BLUE} strokeWidth={3} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <LineChartIcon size={18} className="text-gray-400" />
                                <div>
                                    <h2 className="text-[16px] font-bold text-[#121212]">Actionable Notes</h2>
                                    <p className="text-[12px] font-medium text-gray-500">Generated from current filters</p>
                                </div>
                            </div>
                            <TrackAccordion
                                items={[
                                    {
                                        title: 'Best segment',
                                        content: guardedBest ? `Best segment is ${guardedBest.key} at ${fmtUnits(guardedBest.profit, activeBankroll)} across ${guardedBest.bets} bets.` : 'Add more settled bets to identify your best segment.',
                                        defaultOpen: true,
                                    },
                                    {
                                        title: 'Worst segment',
                                        content: guardedWorst ? `Worst segment is ${guardedWorst.key} at ${fmtUnits(guardedWorst.profit, activeBankroll)}. Reduce stake or isolate why it underperforms.` : 'No negative segment is visible in the current filters.',
                                    },
                                    {
                                        title: 'Sample guard',
                                        content: analytics.settled < 20 ? 'Sample size is still thin. Treat ROI by segment as directional until 20+ settled bets.' : `Sample size is ${analytics.settled} settled bets, enough to start comparing broad segments.`,
                                    },
                                    {
                                        title: 'ROI note',
                                        content: analytics.roi < 0 ? 'Overall ROI is negative in this view. Check bookmaker, odds and stake breakdowns before increasing unit size.' : 'Overall ROI is positive in this view. Look for repeatable segments rather than one-off spikes.',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
        </div>
    );
}
