'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Search as SearchIcon, Calendar, Clock, Globe, Trophy, ChevronDown, Check, Info, Image as ImageIcon, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { CANONICAL_MARKETS, MARKET_DIRECTIONS } from './markets';
import { BOOKMAKER_SUGGESTIONS, getBookmakerButtonUrl, getBookmakerMeta } from '@/lib/bookmakers';
import { SPORT_CATALOG, getSportMeta, resolveBetSport, sportOptionLabel, looksLikeIndividualSport } from '@/lib/sports';
import { resolveFullSelection, resolvePlayerName } from '@/lib/utils';
import { SlidingTabs } from '@/components/transitions/Motion';
import { parseOdds, oddsPlaceholder, type OddsFormat } from '@/lib/odds';

function parseBetDateTime(bet: any) {
    let topDate = '';
    let topTime = '';
    if (bet.date) {
        if (typeof bet.date === 'object' && bet.date.$date) {
            const d = new Date(bet.date.$date);
            topDate = d.toISOString().split('T')[0];
            if (!bet.time || bet.time === 'N/A') topTime = d.toISOString().split('T')[1].substring(0, 5);
        } else if (typeof bet.date === 'string') {
            if (bet.date.includes('T')) {
                topDate = bet.date.split('T')[0];
                if (!bet.time || bet.time === 'N/A') topTime = new Date(bet.date).toISOString().split('T')[1].substring(0, 5);
            } else {
                topDate = bet.date;
            }
        }
    }
    if (bet.time && bet.time !== 'N/A') topTime = bet.time;
    return { topDate, topTime };
}

function editableOddsValue(source: any) {
    const display = String(source?.display_odds || source?.displayOdds || '').trim();
    const rawOdds = source?.odds !== undefined && source?.odds !== null && source?.odds !== '' ? String(source.odds) : '';
    // Prefer the human form (American/fraction/cents) when we stored it in display_odds.
    if (source?.entry_price_cents || /¢/.test(display) || /[+\-]\d{3,}/.test(display) || /\d+\/\d+/.test(display)) {
        return display || rawOdds;
    }
    return rawOdds || (display.match(/\d+(?:\.\d+)?/)?.[0] || display);
}

function splitPlayerTeam(value: unknown, existingTeam = '') {
    const raw = String(value || '').trim();
    const match = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (!match) return { player: raw, team: existingTeam };
    return { player: match[1].trim(), team: existingTeam || match[2].trim() };
}

/** Local YYYY-MM-DD / HH:MM - used for in-play bets so we track "placed now". */
function localDateTimeNow() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
}

function isInPlayBet(bet: any) {
    if (!bet) return false;
    if (bet.is_in_play === true || bet.isInPlay === true) return true;
    const flag = String(bet.is_in_play ?? bet.isInPlay ?? '').toLowerCase();
    if (flag === 'true' || flag === '1' || flag === 'yes') return true;
    const blob = [
        bet.selection, bet.market, bet.searchEvent, bet.league, bet.sport,
    ].map((v) => String(v || '')).join(' ');
    return /\bin[- ]?play\b|\blive\b|\bhalf[- ]?time\b|\bht\b|\bgoal\s*line\s*in[- ]?play\b/i.test(blob)
        || /^\(\s*\d{1,2}\s*[-–]\s*\d{1,2}\s*\)/.test(String(bet.selection || ''));
}

/** Prefer parser date/time; for in-play always fall back to now (never scheduled kickoff). */
function resolveBetDateTime(parsed: any, resolvedEvent?: { date?: string; time?: string } | null) {
    const now = localDateTimeNow();
    const inPlay = isInPlayBet(parsed);
    if (inPlay) {
        return {
            date: String(parsed?.date || '').trim() || now.date,
            time: String(parsed?.time || '').trim() || now.time,
            inPlay: true,
        };
    }
    return {
        date: String(parsed?.date || '').trim() || String(resolvedEvent?.date || '').trim(),
        time: String(parsed?.time || '').trim() || String(resolvedEvent?.time || '').trim(),
        inPlay: false,
    };
}

function collectTagsFromBets(bets: any[]): string[] {
    const tagSet = new Set<string>();
    for (const bet of bets || []) {
        const raw = bet?.tags;
        if (Array.isArray(raw)) {
            raw.forEach((tag) => {
                const value = String(tag || '').trim();
                if (value) tagSet.add(value);
            });
        } else if (typeof raw === 'string' && raw.trim()) {
            raw.split(',').forEach((tag) => {
                const value = tag.trim();
                if (value) tagSet.add(value);
            });
        }
        const syncLabel = String(bet?.sync_label || bet?.syncLabel || '').trim();
        if (syncLabel) tagSet.add(syncLabel);
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

// Event kickoffs from /api/events/search arrive as wall-clock in this timezone: the active
// bankroll's timezone when set, else the browser's. Module-level (several fetch helpers live
// outside the component), fed by the bankroll effect below via __activeBankrollTz.
function eventsTz(): string {
    if (typeof window === 'undefined') return '';
    try {
        return (window as any).__activeBankrollTz || Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
        return '';
    }
}

function eventsTzParam(): string {
    const tz = eventsTz();
    return tz ? `&tz=${encodeURIComponent(tz)}` : '';
}

function selectedTagsFromInput(value: string): string[] {
    const idx = value.lastIndexOf(',');
    const prefix = idx === -1 ? '' : value.slice(0, idx);
    return prefix.split(',').map((tag) => tag.trim()).filter(Boolean);
}

// Normalize a bet's `tags` (parser gives an array; some paths carry a comma string) to a clean
// string[] for the save payload.
function toTagArray(tags: unknown): string[] {
    if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
    if (typeof tags === 'string' && tags.trim()) return tags.split(',').map((t) => t.trim()).filter(Boolean);
    return [];
}

function currentTagFragment(value: string): string {
    const idx = value.lastIndexOf(',');
    return (idx === -1 ? value : value.slice(idx + 1)).trim();
}

async function fetchEnrichedBetFields(userId: string, bet: any, topDate: string, topTime: string) {
    const res = await fetch('/api/save-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId,
            enrichOnly: true,
            searchEvent: bet.match || bet.searchEvent || bet.fixture_name || '',
            selection: resolveFullSelection(bet),
            market: bet.market || bet.market_type || '',
            date: topDate,
            time: topTime,
            country: bet.country || '',
            league: bet.league || '',
            eventSport: bet.sport || bet.eventSport || '',
            polymarketMarketId: bet.polymarket_market_id || bet.polymarketMarketId || bet.market_id || '',
            conditionId: bet.condition_id || bet.conditionId || '',
            tokenId: bet.token_id || bet.tokenId || '',
            polymarketUrl: bet.polymarket_url || bet.polymarketUrl || '',
            polymarketSlug: bet.polymarket_slug || bet.polymarketSlug || '',
        }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const enriched = data.enriched || null;
    if (!enriched) return null;

    const needsEventLookup = !enriched.country || !enriched.league || !enriched.sport;
    const query = String(enriched.searchEvent || bet.match || bet.searchEvent || bet.fixture_name || '').trim();
    if (needsEventLookup && query.length >= 3) {
        try {
            const eventRes = await fetch(`/api/events/search?q=${encodeURIComponent(query)}${eventsTzParam()}`);
            const eventData = await eventRes.json();
            const suggestion = Array.isArray(eventData.suggestions) ? eventData.suggestions[0] : null;
            if (suggestion) {
                if (!enriched.country && suggestion.country) enriched.country = suggestion.country;
                if (!enriched.league && suggestion.league) enriched.league = suggestion.league;
                if (!enriched.sport && suggestion.sport) enriched.sport = getSportMeta(suggestion.sport).name;
                if (!enriched.date && suggestion.date) enriched.date = suggestion.date;
                if (!enriched.time && suggestion.time) enriched.time = suggestion.time;
            }
        } catch {
            // polymarket + inference values are still usable
        }
    }

    return enriched;
}

type EventSuggestion = {
    id: string;
    searchEvent: string;
    home?: string;
    away?: string;
    date: string;
    time: string;
    country: string;
    league: string;
    leagueSlug?: string;
    sport: string;
    source?: string;
    aliases?: string[];
    score?: number;
    kickoffUtc?: string;
};

function getCurrencySymbol(code: string | undefined) {
    if (!code) return '£';
    if (code === 'GBP') return '£';
    if (code === 'USD') return '$';
    if (code === 'EUR') return '€';
    if (code === 'AUD') return 'A$';
    return code;
}

/** Detect stake currency from explicit field or $ / £ / € symbols on the amount. */
function detectStakeCurrency(bet: any): string {
    const explicit = String(bet?.stake_currency || bet?.stakeCurrency || bet?.currency || '').trim().toUpperCase();
    if (explicit === 'USD' || explicit === 'GBP' || explicit === 'EUR' || explicit === 'AUD') return explicit;
    const raw = String(bet?.stake ?? bet?.amount ?? '');
    if (raw.includes('$') || /\bUSD\b/i.test(raw)) return 'USD';
    if (raw.includes('£') || /\bGBP\b/i.test(raw)) return 'GBP';
    if (raw.includes('€') || /\bEUR\b/i.test(raw)) return 'EUR';
    return '';
}

function parseStakeNumber(value: unknown): number | null {
    const n = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
}

// Session-cached FX table keyed by base currency (open.er-api.com, no key).
const fxCache: { base: string; rates: Record<string, number>; fetchedAt: number } = {
    base: '',
    rates: {},
    fetchedAt: 0,
};

async function getFxRate(from: string, to: string): Promise<number | null> {
    const src = from.toUpperCase();
    const dst = to.toUpperCase();
    if (!src || !dst || src === dst) return 1;
    const now = Date.now();
    if (fxCache.base === src && now - fxCache.fetchedAt < 60 * 60 * 1000 && fxCache.rates[dst]) {
        return fxCache.rates[dst];
    }
    try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(src)}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.result !== 'success' || !data?.rates) return null;
        fxCache.base = src;
        fxCache.rates = data.rates;
        fxCache.fetchedAt = now;
        return typeof data.rates[dst] === 'number' ? data.rates[dst] : null;
    } catch {
        return null;
    }
}

/**
 * Convert a parsed stake into the active bankroll currency when the slip uses a
 * different currency (e.g. Polymarket $72.48 → £ for a GBP Arbs bankroll).
 * Returns { stake, converted, from, to, rate } - stake is a string amount.
 */
async function convertStakeToBankroll(
    bet: any,
    bankrollCurrency: string | undefined,
): Promise<{ stake: string; converted: boolean; from: string; to: string; rate: number | null }> {
    const amount = parseStakeNumber(bet?.stake);
    const from = detectStakeCurrency(bet);
    const to = String(bankrollCurrency || '').trim().toUpperCase() || 'GBP';
    if (amount == null) {
        return { stake: String(bet?.stake || ''), converted: false, from, to, rate: null };
    }
    if (!from || from === to) {
        return { stake: amount.toFixed(2), converted: false, from: from || to, to, rate: 1 };
    }
    const rate = await getFxRate(from, to);
    if (rate == null || rate <= 0) {
        return { stake: amount.toFixed(2), converted: false, from, to, rate: null };
    }
    const converted = Math.round(amount * rate * 100) / 100;
    return { stake: converted.toFixed(2), converted: true, from, to, rate };
}

export default function NewBetForm({ returnTo = '/track/bets' }: { returnTo?: string }) {
    const [betStructure, setBetStructure] = useState<'single' | 'multiple'>('single');
    const [betType, setBetType] = useState<'match' | 'team' | 'player'>('match');
    
    const [oddsFormat, setOddsFormat] = useState<OddsFormat>('auto');
    const [stakeFormat, setStakeFormat] = useState<'units' | 'currency'>('units');

    // Form fields state
    const [editId, setEditId] = useState<string | null>(null);
    const [sourceMessage, setSourceMessage] = useState<{ text: string; images: string[] } | null>(null);
    // Hide/show for the Original message box - HIDDEN by default; the choice is persisted
    // so one click applies to every edit view (same pattern as the dashboard bankroll card).
    const [showSourceBox, setShowSourceBox] = useState(false);
    useEffect(() => {
        try {
            const raw = localStorage.getItem('edit_hide_original_message');
            if (raw === '0' || raw === 'false') setShowSourceBox(true);
        } catch { /* ignore */ }
    }, []);
    const toggleSourceBox = () => {
        setShowSourceBox((prev) => {
            const next = !prev;
            try { localStorage.setItem('edit_hide_original_message', next ? '0' : '1'); } catch { /* ignore */ }
            return next;
        });
    };
    const [parseText, setParseText] = useState('');
    const [parseImages, setParseImages] = useState<string[]>([]);
    const [searchEvent, setSearchEvent] = useState('');
    const [date, setDate] = useState('');
    // Canonical kickoff instant (UTC ISO) from the picked catalog event; cleared on manual
    // date/time edits so a hand-corrected kickoff never disagrees with the stored instant.
    const [kickoffUtc, setKickoffUtc] = useState('');
    const [time, setTime] = useState('');
    const [country, setCountry] = useState('');
    const [league, setLeague] = useState('');
    const [eventSport, setEventSport] = useState('');
    const [selection, setSelection] = useState('');
    const [market, setMarket] = useState('');
    const [betDirection, setBetDirection] = useState('');
    const [bookmaker, setBookmaker] = useState('');
    const [odds, setOdds] = useState('');
    const [stake, setStake] = useState('');
    const [status, setStatus] = useState('pending');
    const [cashedOutOdds, setCashedOutOdds] = useState('');
    const [closingLineOdds, setClosingLineOdds] = useState('');
    // Parser-extracted alert metrics (value 100+ / model odds / chance%) - no visible form field,
    // but they must survive parse -> save or imported EV alerts store value_percentage=0.
    const [parsedValuePct, setParsedValuePct] = useState<string | number>('');
    const [parsedModelOdds, setParsedModelOdds] = useState<string | number>('');
    const [parsedChancePct, setParsedChancePct] = useState<string | number>('');
    const [tags, setTags] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [teamName, setTeamName] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<EventSuggestion | null>(null);
    const [bulkBets, setBulkBets] = useState<any[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    // Combined-multi odds sanity. Legs must each carry their OWN price - the parent total is
    // their product (save_bet.py recomputes it when no explicit total is set). The classic
    // mistake is typing the slip's TOTAL into every leg: a 1.85/1.75 double then saves as
    // 3.23 x 3.23 = 10.43. Surface the product live and flag the identical-legs pattern.
    const builderOddsSanity = useMemo(() => {
        if (betStructure !== 'single' || bulkBets.length < 2) return null;
        const legs = bulkBets.map(b => parseFloat(String(b.odds || '').replace(',', '.')));
        if (!legs.every(o => Number.isFinite(o) && o > 1)) return null;
        const product = legs.reduce((acc, o) => acc * o, 1);
        const explicitRaw = parseFloat(String(bulkBets[0].total_odds || bulkBets[0].totalOdds || '').replace(',', '.'));
        const explicitTotal = Number.isFinite(explicitRaw) && explicitRaw > 1 ? explicitRaw : null;
        const identicalLegs = legs.every(o => Math.abs(o - legs[0]) / legs[0] < 0.005);
        // Identical legs matching the entered total = the total was typed into every leg.
        const totalInEveryLeg = identicalLegs && explicitTotal !== null && Math.abs(legs[0] - explicitTotal) / explicitTotal < 0.005;
        const totalMismatch = !totalInEveryLeg && explicitTotal !== null && Math.abs(product - explicitTotal) / explicitTotal > 0.02;
        return { legs, product, explicitTotal, identicalLegs, totalInEveryLeg, totalMismatch };
    }, [betStructure, bulkBets]);

    // Autocomplete state
    const [showMarketDropdown, setShowMarketDropdown] = useState(false);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [existingTags, setExistingTags] = useState<string[]>([]);
    const [eventIndex, setEventIndex] = useState<EventSuggestion[]>([]);
    const [sportOptions, setSportOptions] = useState<string[]>(SPORT_CATALOG.map((sport) => sport.name));
    const [showEventSuggestions, setShowEventSuggestions] = useState(false);
    const [eventSearchLoading, setEventSearchLoading] = useState(false);
    const [pastEventSuggestions, setPastEventSuggestions] = useState<EventSuggestion[]>([]);
    const [pastEventSearchLoading, setPastEventSearchLoading] = useState(false);
    // Bulk-card event autocomplete (same catalog as single Search Event)
    const [bulkEventActiveIdx, setBulkEventActiveIdx] = useState<number | null>(null);
    const [bulkPastEventSuggestions, setBulkPastEventSuggestions] = useState<EventSuggestion[]>([]);
    const [bulkPastEventSearchLoading, setBulkPastEventSearchLoading] = useState(false);
    const [bulkLiveEventSuggestions, setBulkLiveEventSuggestions] = useState<EventSuggestion[]>([]);
    const [bulkLiveEventSearchLoading, setBulkLiveEventSearchLoading] = useState(false);
    const bulkLiveSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [activeBankrollId, setActiveBankrollId] = useState('personal');
    const [bankrolls, setBankrolls] = useState<any[]>([]);
    const marketRef = useRef<HTMLDivElement>(null);
    const tagRef = useRef<HTMLDivElement>(null);
    const eventSearchRef = useRef<HTMLDivElement>(null);
    const bulkEventSearchRef = useRef<HTMLDivElement>(null);
    const selectedEventSuggestionRef = useRef(false);
    // True once the user actually focuses/types in the event search - so the suggestions
    // dropdown never auto-opens just because we PROGRAMMATICALLY set searchEvent (edit prefill).
    const eventFieldTouchedRef = useRef(false);
    // While true, ignore focus/async-suggestion effects that would open the event menu.
    // Set on editId prefill; cleared on the next real pointer/keyboard interaction with the field.
    const suppressEventDropdownRef = useRef(false);
    // User dismissed the menu (click outside). Stay closed until they type or re-engage the field.
    const eventDropdownDismissedRef = useRef(false);

    useEffect(() => {
        const userId = localStorage.getItem('telegram_user_id');
        if (userId) {
            api.bankrolls.get(Number(userId))
                .then(data => {
                    if (data.bankrolls) setBankrolls(data.bankrolls);
                }).catch(console.error);
            api.bets.getUserBets(Number(userId))
                .then((data) => setExistingTags(collectTagsFromBets(data.bets || [])))
                .catch(console.error);
        }
        if (!window.location.search.includes('editId')) {
            setActiveBankrollId(localStorage.getItem('active_bankroll_id') || 'personal');
        }

        fetch('/api/events/search?sports=1')
            .then((res) => res.json())
            .then((data) => {
                const merged = new Set<string>(SPORT_CATALOG.map((sport) => sport.name));
                for (const sport of data.sports || []) {
                    const name = getSportMeta(sport).name;
                    if (name) merged.add(name);
                }
                setSportOptions(Array.from(merged).sort());
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!bankrolls.length || !activeBankrollId) return;
        const br = bankrolls.find(b => b.id === activeBankrollId);
        // Prefer bankroll display format for the odds input selector (still accepts any typed format).
        if (br?.odds_format) {
            const fmt = String(br.odds_format).toLowerCase();
            if (['decimal', 'american', 'fractional', 'cents', 'auto'].includes(fmt)) {
                setOddsFormat(fmt as any);
            }
            try { localStorage.setItem('active_bankroll_odds_format', fmt); } catch { /* ignore */ }
        }
        if (br) {
            const typeLower = String(br.type || '').toLowerCase();
            const isCurrency = typeLower === 'currency' || typeLower === 'cash' || typeLower === 'money' || (typeLower !== 'units' && br.currency && br.currency !== 'u' && br.currency !== 'Units');
            setStakeFormat(isCurrency ? 'currency' : 'units');
        }
        (window as any).__activeBankrollTz = br?.timezone || '';
    }, [activeBankrollId, bankrolls]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('editId');
        if (id) {
            setEditId(id);
            const userId = localStorage.getItem('telegram_user_id');
            if (userId) {
                // Original message: the raw alert/slip this bet was parsed from (+ any image).
                fetch(`/api/bets/source-message?userId=${encodeURIComponent(userId)}&betId=${encodeURIComponent(id)}`)
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => { if (d?.found) setSourceMessage({ text: d.text || '', images: d.images || [] }); })
                    .catch(() => {});
                api.bets.getBetById(Number(userId), id)
                    .then(async (data) => {
                        const bet = data.bet;
                        if (bet) {
                            const { topDate, topTime } = parseBetDateTime(bet);
                            // Prefill must not open the Search Event dropdown (focus/async
                            // suggestions would otherwise treat the filled match name as a query).
                            suppressEventDropdownRef.current = true;
                            eventFieldTouchedRef.current = false;
                            eventDropdownDismissedRef.current = true;
                            setShowEventSuggestions(false);
                            setPastEventSuggestions([]);
                            setSearchEvent(bet.match || bet.searchEvent || bet.fixture_name || '');
                            setDate(topDate);
                            setTime(topTime);
                            setCountry(bet.country || '');
                            setLeague(bet.league || '');
                            setEventSport(resolveBetSport(bet));
                            const splitExisting = splitPlayerTeam(bet.player_name || bet.playerName || '', bet.team || bet.teamName || '');
                            const fullSelection = resolveFullSelection({ ...bet, player_name: splitExisting.player, team: splitExisting.team });
                            const resolvedPlayerName = resolvePlayerName({ ...bet, player_name: splitExisting.player, team: splitExisting.team, selection: fullSelection });
                            setSelection(fullSelection);
                            setPlayerName(resolvedPlayerName);
                            setTeamName(splitExisting.team);
                            setMarket(bet.market || bet.market_type || '');
                            setBetDirection(bet.bet_direction || bet.betDirection || bet.direction || '');
                            setBookmaker(bet.bookmaker || '');
                            setOdds(editableOddsValue(bet));
                            setStake(bet.actual_stake ? String(bet.actual_stake) : (bet.units_staked ? String(bet.units_staked) : ''));
                            setStatus(bet.status || 'pending');
                            setCashedOutOdds(bet.cashed_out_odds ? String(bet.cashed_out_odds) : '');
                            setClosingLineOdds(bet.closing_line_odds ? String(bet.closing_line_odds) : '');
                            setTags(Array.isArray(bet.tags) ? bet.tags.join(', ') : (bet.tags || ''));
                            setActiveBankrollId(bet.bankroll_id || 'personal');
                            
                            const isMulti = bet.bet_type === 'multiple' || bet.is_multiple || bet.is_multi_bet || String(bet.market || '').toLowerCase().includes('multi-bet') || String(bet.market_direction || '').toLowerCase().includes('multi');
                            if (isMulti) {
                                if (bet.multi_bet_selections && bet.multi_bet_selections.length > 0) {
                                    setBetStructure('single');
                                } else {
                                    setBetStructure('multiple');
                                }
                            } else {
                                setBetStructure('single');
                            }
                            
                            if (isMulti && bet.multi_bet_selections) {
                                let hasPlayer = false;
                                let hasTeam = false;
                                bet.multi_bet_selections.forEach((sel: any) => {
                                    const mLower = String(sel.market || '').toLowerCase();
                                    const hasPlayerName = sel.player_name && sel.player_name !== 'Unknown Player' && sel.player_name !== 'Unknown';
                                    const isPlayerMarket = mLower.includes('player') || mLower.includes('goalscorer') || hasPlayerName;
                                    
                                    if (isPlayerMarket) hasPlayer = true;
                                    else hasTeam = true;
                                });
                                
                                if (hasPlayer && !hasTeam) setBetType('player');
                                else if (!hasPlayer && hasTeam) setBetType('team');
                                else setBetType('match');

                                setBulkBets(bet.multi_bet_selections.map((s: any) => {
                                    let parsedDate = '';
                                    let parsedTime = '';
                                    if (s.date) {
                                        if (typeof s.date === 'object' && s.date.$date) {
                                            const d = new Date(s.date.$date);
                                            parsedDate = d.toISOString().split('T')[0];
                                            if (!s.time || s.time === 'N/A') parsedTime = d.toISOString().split('T')[1].substring(0, 5);
                                        } else if (typeof s.date === 'string') {
                                            if (s.date.includes('T')) {
                                                parsedDate = s.date.split('T')[0];
                                                if (!s.time || s.time === 'N/A') parsedTime = new Date(s.date).toISOString().split('T')[1].substring(0, 5);
                                            } else {
                                                parsedDate = s.date;
                                            }
                                        }
                                    }
                                    if (s.time && s.time !== 'N/A') parsedTime = s.time;

                                    let constructedSelection = resolveFullSelection(s);
                                    if (!constructedSelection) {
                                        const prefix = s.player_name && s.player_name !== 'Unknown Player' && s.player_name !== 'Unknown' ? `${s.player_name} ` : '';
                                        const marketStr = s.market_display || s.market || '';
                                        let lineStr = '';
                                        if (s.direction && s.threshold !== undefined && s.threshold !== null) {
                                            lineStr = ` ${s.direction.charAt(0).toUpperCase() + s.direction.slice(1)} ${s.threshold}`;
                                        } else if (s.direction) {
                                            lineStr = ` ${s.direction.charAt(0).toUpperCase() + s.direction.slice(1)}`;
                                        } else if (s.threshold !== undefined && s.threshold !== null) {
                                            lineStr = ` ${s.threshold}`;
                                        }
                                        constructedSelection = `${prefix}${marketStr}${lineStr}`.trim();
                                    }

                                    return {
                                        ...s,
                                        date: parsedDate,
                                        time: parsedTime,
                                        selection: constructedSelection,
                                        betDirection: s.direction || s.bet_direction || s.betDirection || '',
                                        searchEvent: s.match || s.searchEvent || s.fixture_name || s.match_name || '',
                                        eventSport: s.sport || '',
                                        total_odds: bet.display_odds || bet.displayOdds || bet.odds || '',
                                        totalOdds: bet.display_odds || bet.displayOdds || bet.odds || '',
                                        total_stake: bet.actual_stake || bet.units_staked || bet.recommended_stake || '',
                                        totalStake: bet.actual_stake || bet.units_staked || bet.recommended_stake || '',
                                        bookmaker: bet.bookmaker || s.bookmaker || '',
                                        status: bet.status || s.status || 'pending',
                                        // Each leg's OWN closing line (a multi-event bet's CLV is the product of these).
                                        closingLineOdds: s.closing_line_odds ?? s.closingLineOdds ?? '',
                                        manualOverride: bet.manual_override ?? bet.manualOverride ?? false
                                    };
                                }));
                            } else {
                                setBetType(
                                    bet.bet_type === 'multiple'
                                        ? 'match'
                                        : inferBetType(fullSelection, bet.market || bet.market_type || '', bet)
                                );
                            }

                            try {
                                const enriched = await fetchEnrichedBetFields(userId, bet, topDate, topTime);
                                const country = enriched?.country || bet.country || '';
                                const league = enriched?.league || bet.league || '';
                                const sport = enriched?.sport || enriched?.eventSport || resolveBetSport({ ...bet, country, league }) || '';
                                const eventName = enriched?.searchEvent || bet.match || bet.searchEvent || bet.fixture_name || '';
                                const date = enriched?.date || topDate;
                                const time = enriched?.time || topTime;

                                if (country) setCountry(country);
                                if (league) setLeague(league);
                                if (sport) setEventSport(sport);
                                if (eventName) setSearchEvent(eventName);
                                if (date) setDate(date);
                                if (time) setTime(time);

                                const filledGaps = Boolean(
                                    (!bet.country && country)
                                    || (!bet.league && league)
                                    || (!(bet.sport || bet.eventSport) && sport)
                                );
                                if (filledGaps) {
                                    await fetch('/api/save-bet', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            userId,
                                            betId: id,
                                            isUpdate: true,
                                            enrichFromPolymarket: true,
                                            searchEvent: eventName,
                                            country,
                                            league,
                                            eventSport: sport,
                                            date,
                                            time,
                                        }),
                                    });
                                }
                            } catch (error) {
                                console.error('Bet enrichment failed', error);
                            }
                        }
                    })
                    .catch(console.error);
            }
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (marketRef.current && !marketRef.current.contains(event.target as Node)) {
                setShowMarketDropdown(false);
            }
            if (eventSearchRef.current && !eventSearchRef.current.contains(event.target as Node)) {
                setShowEventSuggestions(false);
                eventDropdownDismissedRef.current = true;
                // Blur so the field doesn't look "still active" with an open menu state.
                if (document.activeElement instanceof HTMLElement
                    && eventSearchRef.current.contains(document.activeElement)) {
                    document.activeElement.blur();
                }
            }
            if (bulkEventSearchRef.current && !bulkEventSearchRef.current.contains(event.target as Node)) {
                setBulkEventActiveIdx(null);
            }
            if (tagRef.current && !tagRef.current.contains(event.target as Node)) {
                setShowTagDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const mergeEvents = (current: EventSuggestion[], incoming: EventSuggestion[]) => {
            const seen = new Set(current.map((event) => event.id));
            const merged = [...current];
            for (const event of incoming) {
                if (!seen.has(event.id)) {
                    seen.add(event.id);
                    merged.push(event);
                }
            }
            return merged;
        };

        const fetchEventIndex = async (url: string) => {
            const res = await fetch(url, { signal: controller.signal });
            const data = await res.json();
            return Array.isArray(data.events) ? data.events : [];
        };

        const loadEventIndex = async () => {
            setEventSearchLoading(true);
            try {
                const initialEvents = await fetchEventIndex('/api/events/search?index=1&days=21' + eventsTzParam());
                setEventIndex(initialEvents);

                window.setTimeout(async () => {
                    if (controller.signal.aborted || selectedEventSuggestionRef.current) return;
                    try {
                        const fullEvents = await fetchEventIndex('/api/events/search?index=1' + eventsTzParam());
                        setEventIndex((current) => mergeEvents(current, fullEvents));
                    } catch {
                        // The near-term index is already enough for the primary flow.
                    }
                }, 900);
            } catch (error: any) {
                if (error?.name !== 'AbortError') {
                    setEventIndex([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setEventSearchLoading(false);
                }
            }
        };

        // Load order matters for perceived speed. When EDITING, the bet's core fields
        // (selection/market/bookmaker/odds/stake) come from the fast single-bet fetch and
        // should paint immediately; the heavy event autocomplete catalog is only needed if
        // the user changes the event, so defer it to browser idle so it can't compete with
        // the core render. New-bet keeps it eager (the user searches right away).
        const isEditing = new URLSearchParams(window.location.search).has('editId');
        if (isEditing) {
            const w = window as any;
            if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(() => loadEventIndex(), { timeout: 2500 });
            else window.setTimeout(() => loadEventIndex(), 1200);
        } else {
            loadEventIndex();
        }
        return () => controller.abort();
    }, []);

    const filteredMarkets = CANONICAL_MARKETS.filter(m => m.toLowerCase().includes(market.toLowerCase()));

    const filteredTagSuggestions = useMemo(() => {
        const selected = new Set(selectedTagsFromInput(tags));
        const fragment = currentTagFragment(tags).toLowerCase();
        return existingTags
            .filter((tag) => !selected.has(tag))
            .filter((tag) => !fragment || tag.toLowerCase().includes(fragment))
            .slice(0, 8);
    }, [existingTags, tags]);

    const applyTagSuggestion = (suggestion: string) => {
        const selected = selectedTagsFromInput(tags);
        if (!selected.includes(suggestion)) selected.push(suggestion);
        setTags(`${selected.join(', ')}, `);
        setShowTagDropdown(true);
    };

    const normalizeSearchText = (value: string) => {
        return value
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    };

    const eventDateTimeMs = (dateStr: string, timeStr?: string) => {
        const d = String(dateStr || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return NaN;
        let t = String(timeStr || '00:00').trim();
        // "16:00" + ":00Z" must not become "16:00:00:00Z" (invalid)
        if (/^\d{1,2}:\d{2}$/.test(t)) t = `${t}:00`;
        else if (!/^\d{1,2}:\d{2}:\d{2}$/.test(t)) t = '00:00:00';
        return Date.parse(`${d}T${t}Z`);
    };

    const scoreEventSuggestion = (query: string, event: EventSuggestion) => {
        const q = normalizeSearchText(query);
        if (!q) return 0;

        const home = normalizeSearchText(event.home || event.searchEvent.split(' vs ')[0] || '');
        const away = normalizeSearchText(event.away || event.searchEvent.split(' vs ')[1] || '');
        const teams = `${home} ${away}`.trim();
        const eventName = normalizeSearchText(event.searchEvent);
        const metadata = normalizeSearchText(`${event.league} ${event.country} ${event.leagueSlug || ''} ${event.sport || ''} ${(event.aliases || []).join(' ')}`);
        const tokens = q.split(' ').filter(Boolean);

        let score = 0;
        if (eventName === q) score += 180;
        if (teams === q) score += 140;
        if (tokens.length > 1 && teams.startsWith(q)) score += 100;
        if (tokens.length > 1 && eventName.includes(q)) score += 80;
        else if (home === q || away === q) score += 80;
        else if (home.startsWith(q) || away.startsWith(q)) score += 60;
        else if (metadata.includes(q)) score += 8;

        for (const token of tokens) {
            // Skip pure connectors if any slipped through
            if (token === 'vs' || token === 'v') continue;
            if (home === token || away === token) score += 90;
            else if (home.startsWith(token) || away.startsWith(token)) score += 65;
            // "gaming" in "vici gaming" - must count (mirrors server scoreEvent)
            else if (home.includes(token) || away.includes(token)) score += 30;
            else if (metadata.includes(token)) score += 6;
            else return 0;
        }

        const eventTime = eventDateTimeMs(event.date, event.time);
        if (!Number.isNaN(eventTime)) {
            // Past/live fixtures still get the recency bonus floor (not penalised to 0)
            const daysAway = Math.max(0, (eventTime - Date.now()) / 86_400_000);
            score += Math.max(0, 120 - Math.min(daysAway * 5, 120));
        }
        // Prefer real kickoffs over midnight placeholders from odds_api
        const tNorm = String(event.time || '00:00').slice(0, 5);
        if (tNorm && tNorm !== '00:00') score += 30;
        return score;
    };

    const splitFixtureSides = (value: string) => {
        const normalized = value
            .replace(/\s+v\s+/i, ' vs ')
            .replace(/\s+vs?\.\s+/i, ' vs ');
        const parts = normalized.split(/\s+vs\s+/i).map((part) => normalizeSearchText(part)).filter(Boolean);
        return parts.length >= 2 ? [parts[0], parts.slice(1).join(' ')] : [];
    };

    /** True when a parsed side like "haukar hafnarfjordur" matches catalog "Haukar". */
    const sideMatchesTeam = (side: string, team: string) => {
        if (!side || !team) return false;
        if (team === side || team.includes(side) || side.includes(team)) return true;
        const sideTokens = side.split(' ').filter((t) => t.length >= 3);
        const teamTokens = team.split(' ').filter(Boolean);
        return sideTokens.some((st) =>
            teamTokens.some((tt) => tt === st || tt.startsWith(st) || st.startsWith(tt))
        );
    };

    const eventContainsSide = (event: EventSuggestion, side: string) => {
        if (!side) return false;
        const home = normalizeSearchText(event.home || event.searchEvent.split(' vs ')[0] || '');
        const away = normalizeSearchText(event.away || event.searchEvent.split(' vs ')[1] || '');
        const eventName = normalizeSearchText(event.searchEvent);
        return (
            sideMatchesTeam(side, home) ||
            sideMatchesTeam(side, away) ||
            eventName.includes(side) ||
            side.split(' ').filter((t) => t.length >= 3).some((t) => eventName.includes(t))
        );
    };

    const sameParsedDate = (parsedDate: string, eventDate: string) => {
        if (!parsedDate || !eventDate) return true;
        return parsedDate.slice(0, 10) === eventDate.slice(0, 10);
    };

    const isCompatibleParsedEvent = (parsed: any, event: EventSuggestion, score: number) => {
        const parsedEvent = String(parsed?.searchEvent || '').trim();
        if (!parsedEvent) return false;

        // Pre-match: if the parser had an explicit kickoff date, never replace it with a different date.
        // In-play slips use "now" as the placed date - still allow matching today's/live fixture.
        if (
            !isInPlayBet(parsed)
            && parsed?.date
            && event.date
            && !sameParsedDate(String(parsed.date), String(event.date))
        ) {
            return false;
        }

        // If the parser named both sides, require both sides to appear in the suggested event.
        const sides = splitFixtureSides(parsedEvent);
        if (sides.length === 2 && (!eventContainsSide(event, sides[0]) || !eventContainsSide(event, sides[1]))) {
            return false;
        }

        return score >= (sides.length === 2 ? 120 : 80);
    };

    const normalizeGoalscorerBet = (bet: any) => {
        const market = String(bet?.market || '').toLowerCase();
        const isGoalscorer = market.includes('player goals') || market.includes('goalscorer');
        if (!isGoalscorer) return bet;
        return {
            ...bet,
            sport: 'Football',
            eventSport: 'Football',
        };
    };

    const resolveParsedEvent = async (parsed: any) => {
        if (!parsed?.searchEvent) return null;

        let matches: Array<{ event: EventSuggestion; score: number }> = [];
        if (eventIndex.length > 0) {
            matches = eventIndex
                .map((e) => ({ event: e, score: scoreEventSuggestion(parsed.searchEvent, e) }))
                .filter(({ event, score }) => score > 0 && isCompatibleParsedEvent(parsed, event, score))
                .sort((a, b) => b.score - a.score);
        }

        if (matches[0]) return matches[0].event;

        try {
            const qRes = await fetch('/api/events/search?q=' + encodeURIComponent(parsed.searchEvent) + eventsTzParam());
            const qData = await qRes.json();
            const suggestions: EventSuggestion[] = Array.isArray(qData.suggestions) ? qData.suggestions : [];
            const apiMatches: Array<{ event: EventSuggestion; score: number }> = suggestions
                .map((event: EventSuggestion) => {
                    // Prefer server score when present (already includes Gamma ranking),
                    // fall back to local scorer for older responses.
                    const local = scoreEventSuggestion(parsed.searchEvent, event);
                    const server = typeof event.score === 'number' ? event.score : 0;
                    return { event, score: Math.max(local, server) };
                })
                .filter((match: { event: EventSuggestion; score: number }) => match.score > 0 && isCompatibleParsedEvent(parsed, match.event, match.score))
                .sort((a: { score: number }, b: { score: number }) => b.score - a.score);
            if (apiMatches[0]) return apiMatches[0].event;

            // Last resort: first API suggestion that contains both team sides, even if the
            // local scorer was too strict (esports multi-word team names, live Gamma rows).
            const sides = splitFixtureSides(String(parsed.searchEvent || ''));
            if (sides.length === 2) {
                const loose = suggestions.find(
                    (event) => eventContainsSide(event, sides[0]) && eventContainsSide(event, sides[1])
                );
                if (loose) return loose;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const rankEventSuggestions = (query: string, extra: EventSuggestion[] = []) => {
        const q = query.trim();
        if (q.length < 2) return [] as EventSuggestion[];
        const seen = new Set<string>();
        const ranked = eventIndex
            .map((event) => ({ event, score: scoreEventSuggestion(q, event) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return `${a.event.date}T${a.event.time}`.localeCompare(`${b.event.date}T${b.event.time}`);
            })
            .slice(0, 8)
            .map(({ event }) => event);
        const merged: EventSuggestion[] = [];
        for (const event of [...ranked, ...extra]) {
            const key = `${normalizeSearchText(event.searchEvent)}|${event.date}|${event.time || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(event);
        }
        return merged;
    };

    const eventSuggestions = useMemo(() => {
        return rankEventSuggestions(searchEvent);
    }, [eventIndex, searchEvent]);

    const mergedEventSuggestions = useMemo(() => {
        return rankEventSuggestions(searchEvent, pastEventSuggestions);
    }, [eventIndex, searchEvent, pastEventSuggestions]);

    const bulkEventQuery = bulkEventActiveIdx !== null
        ? String(bulkBets[bulkEventActiveIdx]?.searchEvent || '').trim()
        : '';

    const mergedBulkEventSuggestions = useMemo(() => {
        if (bulkEventActiveIdx === null) return [] as EventSuggestion[];
        // Local index + live API (FotMob/DB) + optional past search results
        return rankEventSuggestions(bulkEventQuery, [
            ...bulkLiveEventSuggestions,
            ...bulkPastEventSuggestions,
        ]);
    }, [eventIndex, bulkEventActiveIdx, bulkEventQuery, bulkLiveEventSuggestions, bulkPastEventSuggestions, bulkBets]);

    // Debounced live event search for bulk cards (hits /api/events/search → Mongo + FotMob).
    // Local eventIndex alone misses Iceland lower-league / in-play fixtures.
    useEffect(() => {
        if (bulkEventActiveIdx === null) return;
        const q = bulkEventQuery;
        if (q.length < 2) {
            setBulkLiveEventSuggestions([]);
            return;
        }
        if (bulkLiveSearchTimer.current) clearTimeout(bulkLiveSearchTimer.current);
        bulkLiveSearchTimer.current = setTimeout(async () => {
            setBulkLiveEventSearchLoading(true);
            try {
                const res = await fetch('/api/events/search?q=' + encodeURIComponent(q) + eventsTzParam());
                const data = await res.json();
                setBulkLiveEventSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
            } catch (e) {
                console.error('Bulk live event search failed', e);
                setBulkLiveEventSuggestions([]);
            } finally {
                setBulkLiveEventSearchLoading(false);
            }
        }, 280);
        return () => {
            if (bulkLiveSearchTimer.current) clearTimeout(bulkLiveSearchTimer.current);
        };
    }, [bulkEventActiveIdx, bulkEventQuery]);

    const searchPastEvents = async () => {
        const query = searchEvent.trim();
        if (query.length < 2 || pastEventSearchLoading) return;
        setPastEventSearchLoading(true);
        setShowEventSuggestions(true);
        try {
            const res = await fetch('/api/events/search?q=' + encodeURIComponent(query) + '&past=1' + eventsTzParam());
            const data = await res.json();
            setPastEventSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        } catch (e) {
            console.error('Past event search failed', e);
            setPastEventSuggestions([]);
        } finally {
            setPastEventSearchLoading(false);
        }
    };

    const searchBulkPastEvents = async (idx: number) => {
        const query = String(bulkBets[idx]?.searchEvent || '').trim();
        if (query.length < 2 || bulkPastEventSearchLoading) return;
        setBulkPastEventSearchLoading(true);
        setBulkEventActiveIdx(idx);
        try {
            const res = await fetch('/api/events/search?q=' + encodeURIComponent(query) + '&past=1' + eventsTzParam());
            const data = await res.json();
            setBulkPastEventSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        } catch (e) {
            console.error('Bulk past event search failed', e);
            setBulkPastEventSuggestions([]);
        } finally {
            setBulkPastEventSearchLoading(false);
        }
    };

    useEffect(() => {
        // Only re-open when the user is actively searching (async suggestions arriving after
        // they typed) - never on edit prefill, and never after they clicked away.
        if (
            !suppressEventDropdownRef.current
            && !eventDropdownDismissedRef.current
            && eventFieldTouchedRef.current
            && searchEvent.trim().length >= 2
            && mergedEventSuggestions.length > 0
        ) {
            setShowEventSuggestions(true);
        }
    }, [mergedEventSuggestions, searchEvent]);

    const markEventFieldInteracted = () => {
        suppressEventDropdownRef.current = false;
        eventDropdownDismissedRef.current = false;
        eventFieldTouchedRef.current = true;
    };

    const closeEventSuggestions = () => {
        setShowEventSuggestions(false);
        eventDropdownDismissedRef.current = true;
    };

    const normalizeBookmaker = (value: string) => {
        const raw = value.trim();
        if (!raw) return '';
        // Map common shorthands onto catalog keys (spaces matter for BOOKMAKER_META).
        const aliases: Record<string, string> = {
            '365': 'bet 365',
            'bet365': 'bet 365',
            'bet 365': 'bet 365',
            'bfex': 'betfair exchange',
            'bf exchange': 'betfair exchange',
            'betfair exchange': 'betfair exchange',
            'betfair': 'betfair',
            'betmgm': 'betmgm',
            'betvic': 'betvictor',
            'betvictor': 'betvictor',
            'ladb': 'ladbrokes',
            'ladbrokes': 'ladbrokes',
            'paddy': 'paddy power',
            'paddypower': 'paddy power',
            'paddy power': 'paddy power',
            'pinnacle': 'pinnacle',
            'pinny': 'pinnacle',
            'polymarket': 'polymarket',
            'sky': 'sky bet',
            'skybet': 'sky bet',
            'sky bet': 'sky bet',
            'willhill': 'william hill',
            'williamhill': 'william hill',
            'william hill': 'william hill',
            'virginbet': 'virgin bet',
            'virgin bet': 'virgin bet',
            'unibet': 'unibet',
            'quinnbet': 'quinnbet',
            'boyles': 'boylesports',
            'boylesports': 'boylesports',
            'spreadex': 'spreadex',
            'pricedup': 'pricedup',
            'betfred': 'betfred',
            'betway': 'betway',
            'kambi': 'kambi',
            'coral': 'coral',
        };
        const key = aliases[raw.toLowerCase()] || raw.toLowerCase();
        // Prefer the catalog display name so icons + save payload match real bookmakers.
        const meta = getBookmakerMeta(key);
        if (meta?.name && meta.name !== '-') return meta.name;
        // Collapsed lookup: "skybet" → match slug "skybet" or "Sky Bet"
        const collapsed = key.replace(/[\s._-]+/g, '');
        const bySlug = BOOKMAKER_SUGGESTIONS.find((name) => {
            const m = getBookmakerMeta(name);
            return m.slug === collapsed || name.toLowerCase().replace(/[\s._-]+/g, '') === collapsed;
        });
        if (bySlug) return bySlug;
        return raw;
    };

    const normalizeMarket = (value: string) => {
        const normalized = value.trim().replace(/\s+/g, ' ');
        // Strip live/in-play suffixes so "Goal Line In-Play" matches "Goal Line".
        const stripped = normalized.replace(/\s*[-–]?\s*(?:in[- ]?play|live)\s*$/i, '').trim() || normalized;
        const aliases: Record<string, string> = {
            'asian cards': 'Asian Total Cards',
            'asian total cards': 'Asian Total Cards',
            // Canonical is "Asian Total Corners" (matches parser + alert imports) - the old
            // 'Asian Corners' direction split the same market into two buckets.
            'asian corners': 'Asian Total Corners',
            'asian total corners': 'Asian Total Corners',
            // Result markets: one canonical spelling each.
            'match result': 'Full Time Result',
            'halftime result': 'Half-Time Result',
            'half time result': 'Half-Time Result',
            'half-time result': 'Half-Time Result',
            // Team totals: side lives in team_assignment, never the label.
            'team total goals': 'Team Total',
            'team total home': 'Team Total',
            'team total away': 'Team Total',
            'team corners home': 'Team Corners',
            'team corners away': 'Team Corners',
            'team shots home': 'Team Shots',
            'team shots away': 'Team Shots',
            'team shots on target home': 'Team Shots On Target',
            'team shots on target away': 'Team Shots On Target',
            'team cards home': 'Team Cards',
            'team cards away': 'Team Cards',
            'team tackles home': 'Team Tackles',
            'team tackles away': 'Team Tackles',
            'team offsides home': 'Team Offsides',
            'team offsides away': 'Team Offsides',
            '1st half total goals': '1st Half Goal Line',
            '2nd half total goals': '2nd Half Goal Line',
            'total match cards': 'Total Cards',
            'match total cards': 'Total Cards',
            'total match corners': 'Total Corners',
            'match total corners': 'Total Corners',
            // bet365 Goal Line / Match O/U Goals / Total Goals = ONE market. Canonical spelling is
            // "Goal Line" (what alert auto-imports store) - the old 'goal line'→'Total Goals'
            // direction split the same market into two analytics buckets.
            'total goals': 'Goal Line',
            'goals line': 'Goal Line',
            'asian goal line': 'Goal Line',
            'match over/under goals': 'Goal Line',
            'match over under goals': 'Goal Line',
            'over/under goals': 'Goal Line',
            'over under goals': 'Goal Line',
            'match goals': 'Goal Line',
            'total match goals': 'Goal Line',
            'goals over under': 'Goal Line',
        };
        const key = stripped.toLowerCase();
        return aliases[key] || aliases[normalized.toLowerCase()] || stripped;
    };

    const inferBetType = (selectionValue: string, marketValue: string, betItem?: any) => {
        if (betItem && betItem.betType) return betItem.betType;
        // Canonicalise free-text markets first so Goal Line / Goal Line In-Play
        // classify the same as Total Goals (Team Props), not Match Result.
        const marketCanonical = normalizeMarket(String(marketValue || ''));
        const market = marketCanonical.toLowerCase().trim();
        const sel = String(selectionValue || '').toLowerCase();
        const searchString = `${sel} ${market}`;
        const hasPlayerName = !!(betItem && betItem.player_name && betItem.player_name !== 'Unknown Player' && betItem.player_name !== 'Unknown');

        // Match-RESULT markets are a Match Result for EVERY sport - winner / result / moneyline /
        // 1X2 / to-win / draw-no-bet / double chance. This must win before the player/team
        // heuristics so the SAME fixture doesn't get "Full Time Result" -> Player and "Match
        // Betting" -> Team just because one carries a competitor name. (Excludes "Match Goals /
        // Shots / Corners", which are team totals, not results.)
        if (/\b(full[\s-]?time result|match (result|winner|betting|odds)|money\s?line|1\s*x\s*2|to win(\s+match)?|draw no bet|double chance)\b/.test(market)
            && !/\b(goals?|shots|corners|cards|tackles|fouls)\b/.test(market)) {
            return 'match';
        }

        // Individual / 1v1 sports (tennis, darts, snooker, boxing, MMA...) have no "teams",
        // and the competitor's name is not a football-style "player prop". Match Winner,
        // Set/Game Handicap, Correct Score etc. are all MATCH results. Only a competitor's
        // own stat line (aces, 180s, checkouts, total games) is a genuine prop.
        if (looksLikeIndividualSport({ ...(betItem || {}), market: marketCanonical, selection: selectionValue })) {
            if (market.startsWith('player ')
                || /\b(aces?|180s?|180'?s|checkouts?|double faults?|breaks? of serve|total games|games? won|legs? won|sets? won|most 180s|highest checkout)\b/.test(searchString)) {
                return 'player';
            }
            return 'match';
        }

        // Trust the canonical market name first. 'Match Shots', 'Total Corners', 'Team Cards'
        // / 'Total Goals' / 'Goal Line' are combined-team / team markets even though they
        // contain stat words - they must NOT be classed as player props or match results.
        if (market.startsWith('player ') || market.includes('goalscorer') || market.includes('booked')) return 'player';
        if (market.startsWith('match ') || market.startsWith('total ') || market.startsWith('team ')
            || /\bgoal\s*line\b/.test(market)
            || /\btotal (shots|corners|cards|goals|tackles|fouls)\b/.test(searchString)
            || /\b(goals?|shots|corners|cards|tackles|fouls)\b/.test(market)) return 'team';
        // Handicap / spread / result markets are team/match bets - never player, even if a stray
        // player_name (a handicap selection fragment) got stored on the bet.
        if (/\b(handicap|spread|goal ?line|both teams to score|btts|draw no bet|double chance)\b/.test(market)) return 'team';
        if (hasPlayerName) return 'player';

        // Fallback heuristics when the market name is unknown/free-text.
        if (searchString.includes('team ')) return 'team';
        if (searchString.includes('player') || searchString.includes(' sot')) return 'player';
        if (searchString.includes('tackles') || searchString.includes('corners') || searchString.includes('cards')) return 'team';
        if (searchString.includes('shots') || searchString.includes('fouls') || searchString.includes('passes') || searchString.includes('assist')) {
            return hasPlayerName ? 'player' : 'team';
        }
        return 'match';
    };

    const marketDirectionMode = market ? MARKET_DIRECTIONS[market] : undefined;
    const marketDirectionOptions = marketDirectionMode === 'none'
        ? []
        : marketDirectionMode === 'both'
        ? ['Over', 'Under', '+', '-']
        : ['Over', 'Under', 'Yes', 'No', 'Home', 'Away', 'Draw', '+', '-'];

    const handleSelectEventSuggestion = (event: EventSuggestion) => {
        selectedEventSuggestionRef.current = true;
        setSelectedEvent(event);
        setSearchEvent(event.searchEvent);
        if (event.date) setDate(event.date);
        if (event.time) setTime(event.time);
        setKickoffUtc(event.kickoffUtc || '');
        if (event.country) setCountry(event.country);
        if (event.league) setLeague(event.league);
        if (event.sport) setEventSport(event.sport);
        setShowEventSuggestions(false);
        // Stay closed after pick - setSearchEvent would otherwise re-trigger the open effect.
        eventDropdownDismissedRef.current = true;
    };

    /** Apply a catalog event onto one bulk card; mirror fixture fields onto sibling cards that share the same (or empty) event. */
    const handleSelectBulkEventSuggestion = (idx: number, event: EventSuggestion) => {
        const prevName = normalizeSearchText(String(bulkBets[idx]?.searchEvent || ''));
        setBulkBets((prev) => {
            const applyToAllSameFixture = prev.every((b) => {
                const n = normalizeSearchText(String(b?.searchEvent || ''));
                return !n || n === prevName;
            });
            return prev.map((bet, i) => {
                if (i !== idx && !applyToAllSameFixture) return bet;
                // When fixtures differ, only update the focused card.
                if (i !== idx) {
                    const n = normalizeSearchText(String(bet?.searchEvent || ''));
                    if (n && n !== prevName) return bet;
                }
                return {
                    ...bet,
                    searchEvent: event.searchEvent,
                    date: event.date || bet.date || '',
                    time: event.time || bet.time || '',
                    kickoffUtc: event.kickoffUtc || '',
                    country: event.country || bet.country || '',
                    league: event.league || bet.league || '',
                    sport: event.sport || bet.sport || bet.eventSport || '',
                    eventSport: event.sport || bet.eventSport || bet.sport || '',
                    eventResolved: true, // user picked a catalog event -> matched
                };
            });
        });
        setBulkPastEventSuggestions([]);
        setBulkEventActiveIdx(null);
    };

    
    const updateBulkBet = (idx: number, field: string, value: string | string[]) => {
        const updated = [...bulkBets];
        updated[idx] = { ...updated[idx], [field]: value };
        // Editing the event by hand clears the parse-time "unmatched" flag - don't nag while typing;
        // it re-flags only if a fresh parse leaves it unresolved.
        if (field === 'searchEvent') updated[idx].eventResolved = undefined;
        setBulkBets(updated);
        if (field === 'searchEvent') {
            setBulkEventActiveIdx(idx);
            setBulkPastEventSuggestions([]);
            // live suggestions refreshed by debounced effect on bulkEventQuery
        }
    };

    const handleSaveBulk = async (e: any) => {
        const btn = e && e.currentTarget ? e.currentTarget : document.getElementById('saveBulkBtn');
        const originalText = btn ? btn.innerHTML : 'Save';
        if (btn) btn.innerHTML = 'Saving All...';
        // When any bet fails to save we keep the parsed state so nothing is silently lost.
        let bulkSaveHadFailures = false;
        try {
            const userId = localStorage.getItem('telegram_user_id');
            if (!userId) {
                alert("You must be logged in to save a bet. Please connect your Telegram account first.");
                return;
            }
            
            if (betStructure === 'multiple') {
                const failedBets: any[] = [];
                let savedCount = 0;
                for (const bet of bulkBets) {
                    const normalizedBet = normalizeGoalscorerBet(bet);
                    const isGoalscorer = /player goals|goalscorer/i.test(normalizedBet.market || '');
                    const payload = {
                            userId,
                            betStructure: 'single',
                            betType: inferBetType(normalizedBet.selection || '', normalizedBet.market || '', normalizedBet),
                            date: normalizedBet.date || '',
                            time: normalizedBet.time || '',
                            country: normalizedBet.country || '',
                            league: normalizedBet.league || '',
                            searchEvent: normalizedBet.searchEvent || '',
                            bookmaker: normalizedBet.bookmaker || '',
                            odds: normalizedBet.odds || '',
                            displayOdds: normalizedBet.display_odds || normalizedBet.displayOdds || normalizedBet.odds || '',
                            entryPriceCents: normalizedBet.entry_price_cents || normalizedBet.entryPriceCents || null,
                            exitPriceCents: normalizedBet.exit_price_cents || normalizedBet.exitPriceCents || null,
                            stake: normalizedBet.stake || '',
                            oddsApiEventId: normalizedBet.oddsApiEventId || '',
                            kickoffUtc: normalizedBet.kickoffUtc || '',
                            originalMessage: parseText || '',
                            sourceImages: parseImages,
                            oddsApiLeagueSlug: normalizedBet.oddsApiLeagueSlug || '',
                            eventSport: normalizedBet.eventSport || normalizedBet.sport || (isGoalscorer ? 'Football' : ''),
                            eventSource: bet.eventSource || '',
                            status: bet.status || 'pending',
                            manualOverride: bet.manualOverride ?? false,
                            cashedOutOdds: bet.cashedOutOdds || '',
                            predictionMarket: bet.prediction_market || bet.predictionMarket || '',
                            predictionPosition: bet.prediction_position || bet.predictionPosition || '',
                            polymarketMarketId: bet.polymarket_market_id || bet.polymarketMarketId || bet.market_id || '',
                            conditionId: bet.condition_id || bet.conditionId || '',
                            tokenId: bet.token_id || bet.tokenId || '',
                            polymarketUrl: bet.polymarket_url || bet.polymarketUrl || '',
                            polymarketSlug: bet.polymarket_slug || bet.polymarketSlug || '',
                            closingLineOdds: bet.closingLineOdds || '',
                            // Parser-extracted alert value (100+ convention) - the payload used to
                            // drop it, so imported EV alerts stored value_percentage=0 ("No value").
                            valuePercentage: bet.value_percentage || bet.valuePercentage || '',
                            modelOdds: bet.model_odds || bet.modelOdds || '',
                            chancePercentage: bet.chance_percentage || bet.chancePercentage || '',
                            bankrollId: activeBankrollId,
                            isUpdate: !!editId,
                            betId: editId || undefined,
                            // Preserve parser-derived tags (e.g. codenames like "Magneto") on each
                            // bulk single - the bulk-save payload used to drop them entirely.
                            tags: toTagArray(bet.tags),
                            selection: normalizedBet.selection || '',
                            playerName: normalizedBet.playerName || normalizedBet.player_name || '',
                            team: normalizedBet.teamName || normalizedBet.team || '',
                            market: normalizedBet.market || '',
                            betDirection: normalizedBet.betDirection || '',
                            // YC Model doubles/trebles (and other multi products) arrive as one bulk
                            // row with nested multi_bet_selections - keep that structure on save so
                            // each leg grades, instead of collapsing to a single selection string.
                            is_multiple: !!(
                                bet.is_multiple
                                || bet.is_multi_bet
                                || bet.bet_type === 'multiple'
                                || (Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 1)
                            ),
                            multi_bet_selections: (Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 1)
                                ? bet.multi_bet_selections.map((leg: any) => ({
                                    market: leg.market || '',
                                    selection: leg.selection || '',
                                    player_name: leg.player_name || leg.playerName || '',
                                    team: leg.team || leg.teamName || '',
                                    bet_direction: leg.betDirection || leg.bet_direction || '',
                                    odds: leg.display_odds || leg.displayOdds || leg.odds || '',
                                    match: leg.searchEvent || leg.match || normalizedBet.searchEvent || '',
                                    date: leg.date || normalizedBet.date || '',
                                    time: leg.time || normalizedBet.time || '',
                                    country: leg.country || normalizedBet.country || '',
                                    league: leg.league || normalizedBet.league || '',
                                    sport: leg.sport || normalizedBet.eventSport || normalizedBet.sport || '',
                                }))
                                : undefined,
                    };

                    // Save with retry on transient failures (e.g. server restarting mid-deploy).
                    // Never abandon the rest of the batch - collect failures and keep them for retry.
                    let ok = false;
                    let lastErr = '';
                    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
                        try {
                            const res = await fetch('/api/save-bet', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            });
                            if (!res.ok) {
                                lastErr = 'HTTP ' + res.status;
                                if (res.status >= 500) { await new Promise(r => setTimeout(r, 500 * (attempt + 1))); continue; }
                                break; // 4xx won't be fixed by retrying
                            }
                            const data = await res.json();
                            if (data.error) { lastErr = data.error; break; }
                            ok = true;
                            savedCount++;
                        } catch (err: any) {
                            lastErr = err?.message || 'network error';
                            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                        }
                    }
                    if (!ok) failedBets.push({ bet, error: lastErr });
                }

                if (failedBets.length) {
                    bulkSaveHadFailures = true;
                    setBulkBets(failedBets.map((f: any) => f.bet)); // keep only unsaved bets for retry
                    alert(
                        `Saved ${savedCount} of ${bulkBets.length} bets. ${failedBets.length} could not be saved and are kept below so you can retry:\n\n` +
                        failedBets.map((f: any) => `• ${f.bet.searchEvent || f.bet.selection || 'bet'} - ${f.error}`).join('\n')
                    );
                }

            } else if (betStructure === 'single') {
                const firstBet = bulkBets[0];
                const searchEvent = bulkBets.every(b => b.searchEvent === firstBet.searchEvent) ? firstBet.searchEvent : (bulkBets.length + ' selections');
                const totalOdds = firstBet.total_odds || firstBet.totalOdds || firstBet.parent_odds || firstBet.odds || '';
                // Guard the total-odds-in-every-leg mistake before it reaches save_bet.py, which
                // (absent an explicit total) recomputes the parent as the PRODUCT of the legs -
                // identical mis-filled legs silently save at total^n (the 3.23 -> 10.43 incident).
                if (builderOddsSanity && (builderOddsSanity.totalInEveryLeg || (builderOddsSanity.identicalLegs && !builderOddsSanity.explicitTotal))) {
                    const ok = window.confirm(
                        `All ${bulkBets.length} legs have identical odds (${builderOddsSanity.legs[0].toFixed(2)}).\n\n` +
                        `If that's the slip's TOTAL, cancel and enter each leg's own price - ` +
                        `otherwise the bet saves with total odds ${builderOddsSanity.product.toFixed(2)} (the product of the legs).\n\n` +
                        `Save anyway?`
                    );
                    if (!ok) { if (btn) btn.innerHTML = originalText; return; }
                }
                const totalStake = firstBet.total_stake || firstBet.totalStake || firstBet.stake || '';

                const res = await fetch('/api/save-bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        betStructure: 'single',
                        betType: betType,
                        is_multiple: true,
                        date: firstBet.date || '',
                        time: firstBet.time || '',
                        kickoffUtc: firstBet.kickoffUtc || '',
                        originalMessage: parseText || '',
                        sourceImages: parseImages,
                        country: firstBet.country || '',
                        league: firstBet.league || '',
                        searchEvent: searchEvent,
                        bookmaker: firstBet.bookmaker || '',
                        odds: totalOdds,
                        displayOdds: firstBet.display_odds || firstBet.displayOdds || totalOdds,
                        entryPriceCents: firstBet.entry_price_cents || firstBet.entryPriceCents || null,
                        exitPriceCents: firstBet.exit_price_cents || firstBet.exitPriceCents || null,
                        stake: totalStake,
                        oddsApiEventId: firstBet.oddsApiEventId || '',
                        oddsApiLeagueSlug: firstBet.oddsApiLeagueSlug || '',
                        eventSport: firstBet.eventSport || '',
                        eventSource: firstBet.eventSource || '',
                        status: firstBet.status || 'pending',
                        manualOverride: firstBet.manualOverride ?? false,
                        cashedOutOdds: firstBet.cashedOutOdds || '',
                        predictionMarket: firstBet.prediction_market || firstBet.predictionMarket || '',
                        predictionPosition: firstBet.prediction_position || firstBet.predictionPosition || '',
                        polymarketMarketId: firstBet.polymarket_market_id || firstBet.polymarketMarketId || firstBet.market_id || '',
                        conditionId: firstBet.condition_id || firstBet.conditionId || '',
                        tokenId: firstBet.token_id || firstBet.tokenId || '',
                        polymarketUrl: firstBet.polymarket_url || firstBet.polymarketUrl || '',
                        polymarketSlug: firstBet.polymarket_slug || firstBet.polymarketSlug || '',
                        closingLineOdds: firstBet.closingLineOdds || '',
                        bankrollId: activeBankrollId,
                        isUpdate: !!editId,
                        betId: editId || undefined,
                        // Parser-extracted alert value (100+ convention) rides on the parent bet.
                        valuePercentage: firstBet.value_percentage || firstBet.valuePercentage || '',
                        modelOdds: firstBet.model_odds || firstBet.modelOdds || '',
                        chancePercentage: firstBet.chance_percentage || firstBet.chancePercentage || '',
                        // A Bet Builder inherits the union of its legs' parser tags (codenames etc.).
                        tags: Array.from(new Set(bulkBets.flatMap((b: any) => toTagArray(b.tags)))),
                        multi_bet_selections: bulkBets.map((bet: any) => ({
                            market: bet.market || '',
                            selection: bet.selection || '',
                            player_name: bet.playerName || bet.player_name || '',
                            team: bet.teamName || bet.team || '',
                            bet_direction: bet.betDirection || '',
                            odds: bet.display_odds || bet.displayOdds || bet.odds || '',
                            match: bet.searchEvent || '',
                            date: bet.date || '',
                            time: bet.time || '',
                            country: bet.country || '',
                            league: bet.league || '',
                            sport: bet.eventSport || bet.sport || '',
                            closing_line_odds: bet.closingLineOdds || bet.closing_line_odds || '',
                            polymarket_market_id: bet.polymarket_market_id || bet.polymarketMarketId || bet.market_id || '',
                            condition_id: bet.condition_id || bet.conditionId || '',
                            token_id: bet.token_id || bet.tokenId || '',
                            polymarket_url: bet.polymarket_url || bet.polymarketUrl || '',
                            polymarket_slug: bet.polymarket_slug || bet.polymarketSlug || ''
                        }))
                    })
                });
                
                const data = await res.json();
                if (data.error) {
                    bulkSaveHadFailures = true;
                    alert('Error saving bet builder: ' + data.error);
                    return;
                }

            }
            setBetStructure('single');
            if (editId) {
                window.location.href = returnTo;
                return;
            }
        } catch (error) {
            console.error(error);
            bulkSaveHadFailures = true;
            alert("An error occurred while saving. Your parsed bets have been kept so you can retry.");
        } finally {
            if (btn) btn.innerHTML = originalText;
            // Only clear the parsed state on a fully successful save - otherwise keep the bets/text for retry.
            if (!editId && !bulkSaveHadFailures) {
                setBulkBets([]);
                setParseText('');
                setParseImages([]);
                setSearchEvent('');
                setDate('');
                setKickoffUtc('');
                setTime('');
                setCountry('');
                setLeague('');
                setEventSport('');
                setSelection('');
                setMarket('');
                setBetDirection('');
                setBookmaker('');
                setOdds('');
                setStake('');
                setStatus('pending');
                setCashedOutOdds('');
                setClosingLineOdds('');
                setParsedValuePct('');
                setParsedModelOdds('');
                setParsedChancePct('');
                setTags('');
                setPlayerName('');
                setTeamName('');
                setSelectedEvent(null);
            }
        }
    };

    const handleParse = async () => {
        if (!parseText.trim() && parseImages.length === 0) return;
        
        const btn = document.getElementById('newBetParseBtn');
        if (btn) btn.innerText = 'Parsing...';
        
        try {
            const res = await fetch('/api/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: parseText, images: parseImages })
            });
            
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                alert('Parse failed: ' + (errBody.error || errBody.details || res.statusText || 'server error'));
                return;
            }
            const data = await res.json();

            if (data.error) {
                alert('Error parsing text: ' + data.error);
            } else if (!Array.isArray(data.bets) || data.bets.length === 0) {
                alert('No bets found in that text. Try pasting the full arb header + both legs (book / odds / stake).');
            } else if (data.bets.length > 1) {
                const brCurrency = bankrolls.find((b) => b.id === activeBankrollId)?.currency || 'GBP';
                const resolvedBets = await Promise.all(data.bets.map(async (bet: any) => {
                    bet.betDirection = bet.betDirection || bet.bet_direction || bet.direction || '';
                    let enriched = normalizeGoalscorerBet(bet);
                    if (enriched.market) {
                        enriched = { ...enriched, market: normalizeMarket(String(enriched.market)) };
                    }
                    if (enriched.bookmaker) {
                        enriched = { ...enriched, bookmaker: normalizeBookmaker(String(enriched.bookmaker)) };
                    }
                    // Polymarket cents → keep display odds; convert $ stake → bankroll currency.
                    if (enriched.display_odds || enriched.displayOdds) {
                        enriched = { ...enriched, odds: enriched.display_odds || enriched.displayOdds || enriched.odds };
                    }
                    if (enriched.stake) {
                        const fx = await convertStakeToBankroll(enriched, brCurrency);
                        enriched = {
                            ...enriched,
                            stake: fx.stake,
                            stake_currency: fx.to,
                            stake_converted_from: fx.converted ? fx.from : undefined,
                            stake_fx_rate: fx.converted ? fx.rate : undefined,
                        };
                    }
                    const parsedEvent = String(enriched.searchEvent || '').trim();
                    if (parsedEvent) {
                        const resolvedEvent = await resolveParsedEvent(enriched);
                        if (resolvedEvent) {
                            const dt = resolveBetDateTime(enriched, resolvedEvent);
                            const resolvedName = String(resolvedEvent.searchEvent || '').trim();
                            enriched = {
                                ...enriched,
                                // Never blank out a parser event with an empty resolve result.
                                // Prefer resolved catalog name only when present; keep arb-tool
                                // e-soccer names like "Jordan (Sensei) vs Canada (Razvan)" otherwise.
                                searchEvent: resolvedName || parsedEvent,
                                date: dt.date,
                                time: dt.time,
                                // The instant is only valid when the catalog event's kickoff won the
                                // date/time merge - a parser-supplied wall-clock has no instant.
                                kickoffUtc: (dt.date === resolvedEvent.date && dt.time === resolvedEvent.time && (resolvedEvent as any).kickoffUtc) || '',
                                is_in_play: dt.inPlay || enriched.is_in_play,
                                country: enriched.country || resolvedEvent.country,
                                league: enriched.league || resolvedEvent.league,
                                sport: enriched.sport || resolvedEvent.sport || enriched.sport,
                                eventSport: enriched.eventSport || enriched.sport || resolvedEvent.sport || '',
                                eventResolved: true,
                            };
                        } else {
                            const dt = resolveBetDateTime(enriched, null);
                            enriched = {
                                ...enriched,
                                searchEvent: parsedEvent,
                                date: dt.date,
                                time: dt.time,
                                is_in_play: dt.inPlay || enriched.is_in_play,
                                // Parser named a fixture but it matched no catalog entry (obscure /
                                // relay-pending) - flag it so the card renders amber "unmatched".
                                eventResolved: false,
                            };
                        }
                    } else {
                        const dt = resolveBetDateTime(enriched, null);
                        enriched = { ...enriched, date: dt.date, time: dt.time, is_in_play: dt.inPlay || enriched.is_in_play };
                    }
                    return enriched;
                }));
                // When bulk legs share a kickoff (typical arb / multi-leg same fixture),
                // promote the best resolved event name onto every card so one leg isn't
                // left on a partial match ("magni") while another has the full catalog name.
                let syncedBets = resolvedBets;
                if (resolvedBets.length > 1) {
                    const anchor = resolvedBets[0];
                    const sameKickoff = resolvedBets.every(
                        (b: any) =>
                            String(b.date || '') === String(anchor.date || '') &&
                            String(b.time || '') === String(anchor.time || '')
                    );
                    const best = resolvedBets.reduce((acc: any, b: any) => {
                        const cur = String(b.searchEvent || '');
                        const accName = String(acc?.searchEvent || '');
                        const curScore = (/\bvs\b/i.test(cur) ? 1000 : 0) + cur.length;
                        const accScore = (/\bvs\b/i.test(accName) ? 1000 : 0) + accName.length;
                        return curScore > accScore ? b : acc;
                    }, resolvedBets[0]);
                    if (sameKickoff && best?.searchEvent) {
                        // Same kickoff time does NOT mean same fixture - two independent in-play
                        // singles can both kick off at 16:00. Only promote the best event name onto
                        // a card that is actually the SAME fixture (shares a team token) or is a
                        // partial/empty fragment to be completed; never overwrite a card that already
                        // names a DIFFERENT "X vs Y" fixture.
                        const tokenize = (s: string) => new Set(
                            String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
                        const bestTokens = tokenize(best.searchEvent);
                        const sameFixture = (b: any) => {
                            const name = String(b.searchEvent || '');
                            if (!name || !/\bvs\b/i.test(name)) return true; // partial/empty -> complete it
                            for (const w of tokenize(name)) if (bestTokens.has(w)) return true;
                            return false; // a distinct full fixture -> leave it alone
                        };
                        syncedBets = resolvedBets.map((b: any) => sameFixture(b) ? ({
                            ...b,
                            searchEvent: best.searchEvent || b.searchEvent,
                            date: best.date || b.date,
                            time: best.time || b.time,
                            kickoffUtc: best.date && best.time ? ((best as any).kickoffUtc || '') : ((b as any).kickoffUtc || ''),
                            country: b.country || best.country,
                            league: b.league || best.league,
                            sport: b.sport || best.sport,
                            eventSport: b.eventSport || best.eventSport || best.sport,
                            // Inheriting a resolved sibling's fixture name clears this card's unmatched flag.
                            eventResolved: b.eventResolved || best.eventResolved,
                        }) : b);
                    }
                }
                setBulkBets(syncedBets);
                
                // If all bets belong to the exact same game, AND they don't have distinct individual odds/stakes, it's a Bet Builder
                // Trust the LLM's visual determination of whether this is a single slip with multiple legs (accumulator/builder)
                // or multiple completely independent bets
                let isAccumulatorOrBuilder = resolvedBets.length > 1
                    && resolvedBets.some((b: any) => b.is_accumulator_or_builder === true);
                
                console.log("=== NEW BET HEURISTIC ===", { resolvedBets, isAccumulatorOrBuilder });
                
                if (isAccumulatorOrBuilder) {
                    setBetStructure('single');
                    let hasPlayer = false;
                    let hasTeam = false;
                    
                    const combinedSelections = resolvedBets.map((sel: any) => {
                        const mLower = String(sel.market || '').toLowerCase();
                        const hasPlayerName = sel.player_name && sel.player_name !== 'Unknown Player' && sel.player_name !== 'Unknown';
                        const isPlayerMarket = mLower.includes('player') || mLower.includes('goalscorer') || mLower.includes('booked') || hasPlayerName;
                        // Any non-player leg (team line OR match/total like 'Match Shots') is a team/match
                        // leg - otherwise a mixed builder with totals is wrongly forced to 'player'.
                        if (isPlayerMarket) hasPlayer = true;
                        else hasTeam = true;

                        let legStr = String(sel.selection || '').trim();
                        if (sel.threshold && !legStr.includes(sel.threshold)) legStr += ' ' + sel.threshold;
                        return legStr;
                    }).filter(Boolean).join(' + ');
                    
                    setSelection(combinedSelections);

                    // A builder mixing player props and team/match totals is 'match' (mixed) - matches
                    // the edit-load path and lets the dashboard render the 'Mixed' label.
                    if (hasPlayer && hasTeam) setBetType('match');
                    else if (hasPlayer) setBetType('player');
                    else if (hasTeam) setBetType('team');
                    else setBetType('match');
                    
                    // We DO NOT clear bulkBets here anymore!
                    // By keeping bulkBets, the UI will render the "Bet Builder Selections" cards (without individual stakes/odds)
                    // and the "Bet Builder Details" block at the bottom.
                    // This allows the user to edit the individual legs before saving the Bet Builder via handleSaveBulk.
                    
                } else {
                    setBetStructure('multiple');
                }
            } else {
                const singleBetData = (data.bets && data.bets.length === 1) ? data.bets[0] : data;
                let rEvent = null;
                if (singleBetData.searchEvent) {
                    rEvent = await resolveParsedEvent(singleBetData);
                }

                const dt = resolveBetDateTime(singleBetData, rEvent);
                const brCurrency = bankrolls.find((b) => b.id === activeBankrollId)?.currency || 'GBP';

                if (rEvent) {
                    setSearchEvent(rEvent.searchEvent || singleBetData.searchEvent || '');
                    // Parser date wins when present; otherwise use resolved fixture kickoff
                    // (critical for PolyGun slips that omit a timestamp).
                    setDate(dt.date || rEvent.date || '');
                    setTime(dt.time || rEvent.time || '');
                    setCountry(singleBetData.country || rEvent.country || '');
                    // League = competition (Esports World Cup…); Sport = game (Dota 2).
                    // Prefer resolved catalog values - parser often only knows the game title
                    // and used to wrongly put it in both fields.
                    const parserLeague = String(singleBetData.league || '').trim();
                    const parserSport = String(singleBetData.sport || '').trim();
                    const resolvedLeague = String(rEvent.league || '').trim();
                    const resolvedSport = String(rEvent.sport || '').trim();
                    const leagueLooksLikeSport =
                        !parserLeague
                        || (parserSport && parserLeague.toLowerCase() === parserSport.toLowerCase())
                        || /^(dota\s*2|cs2?|valorant|lol|league of legends|esports?)$/i.test(parserLeague);
                    setLeague(
                        (!leagueLooksLikeSport && parserLeague)
                            ? parserLeague
                            : (resolvedLeague || parserLeague || '')
                    );
                    setEventSport(
                        resolvedSport
                        || (parserSport && parserSport.toLowerCase() !== 'esports' ? parserSport : '')
                        || parserSport
                        || ''
                    );
                    if (rEvent.id) setSelectedEvent(rEvent);
                } else {
                    if (singleBetData.searchEvent) setSearchEvent(singleBetData.searchEvent);
                    if (dt.date) setDate(dt.date);
                    if (dt.time) setTime(dt.time);
                    if (singleBetData.country) setCountry(singleBetData.country);
                    if (singleBetData.league) setLeague(singleBetData.league);
                    if (singleBetData.sport) setEventSport(singleBetData.sport);
                }
                const normalizedMarket = singleBetData.market ? normalizeMarket(singleBetData.market) : '';
                const parsedPlayerTeam = splitPlayerTeam(singleBetData.player_name || singleBetData.playerName || '', singleBetData.team || singleBetData.teamName || '');
                if (parsedPlayerTeam.player) setPlayerName(parsedPlayerTeam.player);
                if (parsedPlayerTeam.team) setTeamName(parsedPlayerTeam.team);
                const parsedSelection = resolveFullSelection({
                    ...singleBetData,
                    player_name: parsedPlayerTeam.player,
                    team: parsedPlayerTeam.team,
                }) || singleBetData.selection || '';
                if (parsedSelection) {
                    setSelection(parsedSelection);
                }
                if (normalizedMarket) setMarket(normalizedMarket);
                // Carry the alert's value/model/chance through to the save payload.
                setParsedValuePct(singleBetData.value_percentage || singleBetData.valuePercentage || '');
                setParsedModelOdds(singleBetData.model_odds || singleBetData.modelOdds || '');
                setParsedChancePct(singleBetData.chance_percentage || singleBetData.chancePercentage || '');
                if (singleBetData.betDirection) {
                    setBetDirection(singleBetData.betDirection);
                } else {
                    const selLower = parsedSelection.toLowerCase();
                    if (selLower.startsWith('over')) setBetDirection('Over');
                    else if (selLower.startsWith('under')) setBetDirection('Under');
                    else if (selLower.startsWith('yes')) setBetDirection('Yes');
                    else if (selLower.startsWith('no')) setBetDirection('No');
                    else setBetDirection('');
                }
                if (singleBetData.bookmaker) setBookmaker(normalizeBookmaker(singleBetData.bookmaker));
                // Keep Polymarket cents in the editable field, but strip bookmaker/model
                // suffixes from normal decimal odds.
                const oddsValue = editableOddsValue(singleBetData);
                if (oddsValue) {
                    setOdds(String(oddsValue));
                    setOddsFormat('decimal');
                }
                if (singleBetData.stake) {
                    const fx = await convertStakeToBankroll(singleBetData, brCurrency);
                    setStake(fx.stake);
                    // Currency bankrolls track cash - flip stake format so £ shows correctly.
                    const br = bankrolls.find((b) => b.id === activeBankrollId);
                    const typeLower = String(br?.type || '').toLowerCase();
                    const isCurrency = typeLower === 'currency' || typeLower === 'cash' || typeLower === 'money'
                        || (typeLower !== 'units' && br?.currency && br.currency !== 'u' && br.currency !== 'Units');
                    if (isCurrency || fx.converted) setStakeFormat('currency');
                }

                // Tags the parser lifted from the message (PropprLiveBot X-Men codenames like
                // "Cyclops"/"Magneto", "👁️ <insight>") - merge them into whatever the user has
                // already typed instead of dropping them on the floor.
                const parsedTags = Array.isArray(singleBetData.tags)
                    ? singleBetData.tags
                    : (singleBetData.tags ? [String(singleBetData.tags)] : []);
                if (parsedTags.length) {
                    setTags(prev => {
                        const merged = prev.split(',').map(t => t.trim()).filter(Boolean);
                        for (const t of parsedTags) {
                            const tag = String(t).trim();
                            if (tag && !merged.includes(tag)) merged.push(tag);
                        }
                        return merged.join(', ');
                    });
                }

                setBetType(inferBetType(parsedSelection, normalizedMarket, singleBetData));
            }
        } catch (error) {
            alert('Error parsing text');
            console.error(error);
        } finally {
            if (btn) btn.innerHTML = 'Parse <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
        }
    };

    return (
        <div className="max-w-[850px] mx-auto space-y-3 animate-in fade-in duration-700 pb-0">
            
            {/* Header */}
            <div className="flex items-center gap-4">
                {editId && (
                    // Full navigation (not a soft <Link>): the edit form renders INSIDE the
                    // Bets page, so a soft nav would drop ?editId from the URL without
                    // remounting - leaving the edit form on screen over a stale list. A real
                    // navigation remounts the list and refetches.
                    <a
                        href={returnTo}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:bg-gray-50 hover:text-[#121212]"
                    >
                        <ArrowLeft size={18} />
                    </a>
                )}
                <div>
                    <h1 className="text-[24px] font-bold text-[#121212] tracking-tight">
                        {editId ? 'Edit Bet' : 'Add New Bet'}
                    </h1>
                    <p className="text-[13px] text-gray-500 font-medium mt-0.5">
                        {editId ? 'Update your bet details below.' : 'Manually track a new position. Use search to auto-fill event details.'}
                    </p>
                </div>
            </div>

            {/* Original message: the raw alert/slip text (and image) this bet was parsed from */}
            {editId && sourceMessage && (sourceMessage.text || sourceMessage.images.length > 0) && (
                showSourceBox ? (
                    <div className="bg-gray-50/60 border border-gray-200 rounded-2xl shadow-sm p-4">
                        <div className="flex items-center mb-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Original message</div>
                            <button
                                type="button"
                                onClick={toggleSourceBox}
                                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-[#121212] hover:border-gray-300 transition-colors"
                                title="Hide original message"
                                aria-label="Hide original message"
                            >
                                <EyeOff size={14} />
                                Hide
                            </button>
                        </div>
                        {sourceMessage.text && (
                            <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-gray-700 bg-white border border-gray-100 rounded-xl p-3 max-h-64 overflow-y-auto">{sourceMessage.text}</pre>
                        )}
                        {sourceMessage.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {sourceMessage.images.map((img, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={i} src={img} alt={`Bet slip ${i + 1}`} className="max-h-56 rounded-xl border border-gray-200" />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-gray-50/60 border border-gray-200 rounded-2xl shadow-sm px-4 py-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Original message</div>
                        <button
                            type="button"
                            onClick={toggleSourceBox}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-bold text-[#121212] hover:border-[#10b981] hover:text-[#10b981] transition-colors shrink-0"
                            title="Show original message"
                            aria-label="Show original message"
                        >
                            <Eye size={14} />
                            Show
                        </button>
                    </div>
                )
            )}

            <div className="bg-[#ffffff] border border-gray-200 rounded-2xl shadow-sm overflow-visible">

                {/* Top Toggles */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        {/* Structure Toggle */}
                        <div className="space-y-2">
                            <label className="track-tooltip text-[12px] font-bold text-gray-500 uppercase tracking-wider" data-tooltip="Choose whether this saves as one tracked bet or multiple entries.">Bet Structure</label>
                            <SlidingTabs
                                value={betStructure}
                                onChange={setBetStructure as any}
                                className="rounded-lg"
                                buttonClassName="h-9 px-5"
                                items={[
                                    ...(bulkBets.length > 0 ? [
                                        { id: 'single', label: 'Single Bet (Builder)' },
                                        { id: 'multiple', label: 'Independent Singles' }
                                    ] : [
                                        { id: 'single', label: 'Single Bet' },
                                        { id: 'multiple', label: 'Multiple Bets' }
                                    ])
                                ]}
                            />
                        </div>

                        {/* Type Toggle */}
                        <div className="space-y-2">
                            <label className="track-tooltip text-[12px] font-bold text-gray-500 uppercase tracking-wider" data-tooltip="Controls the canonical market list and grading metadata.">Bet Type</label>
                            <SlidingTabs
                                value={betType}
                                onChange={setBetType}
                                className="rounded-lg"
                                buttonClassName="h-9 px-4"
                                items={[
                                    { id: 'match', label: 'Match Result' },
                                    { id: 'team', label: 'Team Props' },
                                    { id: 'player', label: 'Player Props' },
                                ]}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    
                    {/* Parse Area */}
                    <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-[12px] font-bold text-[#10b981] tracking-wider uppercase mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                            Proppr Auto-Fill
                        </div>
                        <div 
                            className={`relative border-2 border-dashed rounded-lg transition-all ${isDragging ? 'border-[#10b981] bg-[#10b981]/5' : 'border-transparent'}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const files = Array.from(e.dataTransfer.files);
                                const imageFiles = files.filter(file => file.type.startsWith('image/'));
                                if (imageFiles.length > 0) {
                                    if (parseImages.length + imageFiles.length > 5) {
                                        alert('Maximum of 5 images allowed');
                                        return;
                                    }
                                    imageFiles.forEach(file => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            const base64String = reader.result as string;
                                            setParseImages(prev => [...prev, base64String]);
                                        };
                                        reader.readAsDataURL(file);
                                    });
                                }
                            }}
                        >
                            <textarea 
                                className="w-full h-20 bg-white border border-gray-200 rounded-lg p-4 text-[14px] text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all resize-none shadow-sm"
                                placeholder="Paste or drag & drop images/text here to auto-fill this form..."
                                id="newBetParseTextarea"
                                value={parseText}
                                onChange={(e) => setParseText(e.target.value)}
                                onPaste={(e) => {
                                    const items = Array.from(e.clipboardData.items);
                                    const imageItems = items.filter(item => item.type.startsWith('image/'));
                                    
                                    if (imageItems.length > 0) {
                                        if (parseImages.length + imageItems.length > 5) {
                                            alert('Maximum of 5 images allowed');
                                            return;
                                        }
                                        imageItems.forEach(item => {
                                            const file = item.getAsFile();
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                const base64String = reader.result as string;
                                                setParseImages(prev => [...prev, base64String]);
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                    }
                                }}
                            ></textarea>
                            {parseImages.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                                    {parseImages.map((img, idx) => (
                                        <div key={idx} className="relative group">
                                            <img src={img} alt={`Upload ${idx}`} className="h-16 w-16 object-cover rounded-md border border-gray-200" />
                                            <button 
                                                onClick={() => setParseImages(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between items-center mt-3">
                                <div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        multiple 
                                        className="hidden" 
                                        id="parseImageUpload" 
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (parseImages.length + files.length > 5) {
                                                alert('Maximum of 5 images allowed');
                                                return;
                                            }
                                            files.forEach(file => {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    const base64String = reader.result as string;
                                                    setParseImages(prev => [...prev, base64String]);
                                                };
                                                reader.readAsDataURL(file);
                                            });
                                            e.target.value = '';
                                        }}
                                    />
                                    <button 
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium text-gray-600 hover:text-[#121212] hover:bg-gray-200 transition-all bg-white border border-gray-200 shadow-sm"
                                        onClick={() => document.getElementById('parseImageUpload')?.click()}
                                    >
                                        <ImageIcon size={14} /> Attach Photo
                                    </button>
                                </div>
                                <button 
                                    className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-bold text-[#121212] bg-[#10b981] hover:bg-[#23cf3f] rounded-md shadow-sm transition-all"
                                    onClick={handleParse}
                                    id="newBetParseBtn"
                                >
                                    Parse <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center my-2">
                        <div className="h-px bg-gray-100 w-full"></div>
                        <span className="px-4 text-[12px] font-bold text-gray-400 uppercase tracking-wider">OR</span>
                        <div className="h-px bg-gray-100 w-full"></div>
                    </div>

                    {bulkBets.length > 0 ? (
                        <div className="space-y-6 animate-in fade-in">
                            <datalist id="canonicalMarkets">
                                {CANONICAL_MARKETS.map(m => <option key={m} value={m} />)}
                            </datalist>
                            <datalist id="bookmaker-options">
                                {BOOKMAKER_SUGGESTIONS.map((name) => <option key={name} value={name} />)}
                            </datalist>
                            <datalist id="marketDirections">
                                <option value="Over"/>
                                <option value="Under"/>
                                <option value="Yes"/>
                                <option value="No"/>
                                <option value="Home"/>
                                <option value="Away"/>
                                <option value="Draw"/>
                                <option value="+"/>
                                <option value="-"/>
                            </datalist>
                            <div className="flex items-center justify-between">
                                <h3 className="text-[16px] font-bold text-[#121212]">{betStructure === 'single' ? 'Bet Builder Selections' : 'Bulk Bets Detected'} ({bulkBets.length})</h3>
                                <button
                                    onClick={() => setBulkBets([])}
                                    className="text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-wider"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="space-y-3">
                                {bulkBets.map((bet, idx) => (
                                    <div key={idx} className={`p-3 bg-white border rounded-xl space-y-1.5 shadow-sm relative group transition-colors ${bet.searchEvent && bet.eventResolved === false ? 'border-amber-300 hover:border-amber-400' : 'border-gray-200 hover:border-[#10b981]'}`}>
                                        <button 
                                            onClick={() => setBulkBets(bulkBets.filter((_, i) => i !== idx))}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                        </button>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                            <div className="md:col-span-2 space-y-1 relative z-20" ref={bulkEventActiveIdx === idx ? bulkEventSearchRef : undefined}>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Event</label>
                                                    {bet.searchEvent && bet.eventResolved === false && (
                                                        <span
                                                            className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-[1px] uppercase tracking-wide"
                                                            title="No catalog match - pick a suggestion to link it, or leave it: the bet still saves under this name and grades via the live relay."
                                                        >Unmatched</span>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all"
                                                        value={bet.searchEvent || ''}
                                                        onChange={(e) => updateBulkBet(idx, 'searchEvent', e.target.value)}
                                                        onFocus={() => {
                                                            setBulkEventActiveIdx(idx);
                                                            setBulkPastEventSuggestions([]);
                                                        }}
                                                        placeholder="Search team / fixture..."
                                                        autoComplete="off"
                                                    />
                                                    {bulkEventActiveIdx === idx && String(bet.searchEvent || '').trim().length >= 2 && (
                                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                                            {bulkLiveEventSearchLoading && mergedBulkEventSuggestions.length === 0 ? (
                                                                <div className="px-3 py-2 text-[12px] text-gray-400">Searching FotMob / DB…</div>
                                                            ) : mergedBulkEventSuggestions.length > 0 ? (
                                                                mergedBulkEventSuggestions.map((event) => (
                                                                    <button
                                                                        key={event.id || `${event.searchEvent}-${event.date}-${event.time}`}
                                                                        type="button"
                                                                        className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={() => handleSelectBulkEventSuggestion(idx, event)}
                                                                    >
                                                                        <div className="text-[13px] font-semibold text-[#121212]">{event.searchEvent}</div>
                                                                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] font-medium text-gray-500">
                                                                            {event.date && <span>{event.date}</span>}
                                                                            {event.time && <span>{event.time}</span>}
                                                                            {event.country && <span>{event.country}</span>}
                                                                            {event.league && <span>{event.league}</span>}
                                                                            {event.source === 'fotmob_suggest' && <span className="text-[#10b981]">FotMob</span>}
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="px-3 py-2 text-[12px] text-gray-400">No matches yet - try past events below</div>
                                                            )}
                                                            <button
                                                                type="button"
                                                                className="sticky bottom-0 w-full border-t border-gray-100 bg-white px-3 py-2 text-left text-[12px] font-bold text-[#10b981] hover:bg-[#10b981]/5 transition-colors"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => searchBulkPastEvents(idx)}
                                                            >
                                                                {bulkPastEventSearchLoading
                                                                    ? 'Searching past events...'
                                                                    : `Search past events for "${String(bet.searchEvent || '').trim()}"`}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</label>
                                                <input type="date" className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.date || ''} onChange={(e) => updateBulkBet(idx, 'date', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time</label>
                                                <input type="time" className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.time || ''} onChange={(e) => updateBulkBet(idx, 'time', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Country</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.country || ''} onChange={(e) => updateBulkBet(idx, 'country', e.target.value)} placeholder="e.g. England" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">League</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.league || ''} onChange={(e) => updateBulkBet(idx, 'league', e.target.value)} placeholder="e.g. Premier League" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selection</label>
                                            <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.selection || ''} onChange={(e) => updateBulkBet(idx, 'selection', e.target.value)} placeholder="e.g. Cole Palmer Over 1.5 Shots on Target" />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Market</label>
                                                <input list="canonicalMarkets" className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.market || ''} onChange={(e) => updateBulkBet(idx, 'market', e.target.value)} placeholder="e.g. Asian Total Cards" />
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                                    Bet Direction
                                                    <select 
                                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold outline-none cursor-pointer appearance-none ${inferBetType(bet.selection || '', bet.market || '', bet) === 'player' ? 'bg-blue-100 text-blue-700' : inferBetType(bet.selection || '', bet.market || '', bet) === 'team' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}
                                                        value={inferBetType(bet.selection || '', bet.market || '', bet)}
                                                        onChange={(e) => updateBulkBet(idx, 'betType', e.target.value)}
                                                    >
                                                        <option value="player">Player Props</option>
                                                        <option value="team">Team Props</option>
                                                        <option value="match">Match Result</option>
                                                    </select>
                                                </label>
                                                <input list="marketDirections" className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.betDirection || ''} onChange={(e) => updateBulkBet(idx, 'betDirection', e.target.value)} placeholder="e.g. Over, +, Yes" />
                                            </div>
                                        </div>

                                        {Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 1 && (
                                            <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5">
                                                <span className="font-bold text-gray-600 uppercase tracking-wide mr-1">{bet.multi_bet_selections.length}-leg multi:</span>
                                                {bet.multi_bet_selections.map((l: any) => l.selection || l.player_name || l.market).filter(Boolean).join(' · ')}
                                            </div>
                                        )}

                                        {/* Per-event closing line - a multi-EVENT bet's CLV is the product of the leg closes. */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider">Closing Odds</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.closingLineOdds || ''} onChange={(e) => updateBulkBet(idx, 'closingLineOdds', e.target.value)} placeholder="e.g. 1.80 - this event's close" />
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tags</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={toTagArray(bet.tags).join(', ')} onChange={(e) => updateBulkBet(idx, 'tags', toTagArray(e.target.value))} placeholder="e.g. Magneto" />
                                            </div>
                                        </div>

                                        {betStructure === 'multiple' && (
                                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-3 pt-3 border-t border-gray-100">
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bookmaker</label>
                                                    <input list="bookmaker-options" className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.bookmaker || ''} onChange={(e) => updateBulkBet(idx, 'bookmaker', e.target.value)} placeholder="e.g. bet365" />
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Odds</label>
                                                    <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.odds || ''} onChange={(e) => updateBulkBet(idx, 'odds', e.target.value)} placeholder="1.90" />
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stake</label>
                                                    <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bet.stake || ''} onChange={(e) => updateBulkBet(idx, 'stake', e.target.value)} placeholder="1.0" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            {bulkBets.length > 0 && betStructure === 'single' && (
                                <div className="p-4 mt-4 bg-white border border-gray-200 rounded-xl space-y-3 shadow-sm">
                                    <h4 className="text-[13px] font-bold text-[#121212]">Bet Builder Details</h4>
                                    {builderOddsSanity?.totalInEveryLeg && (
                                        <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600">
                                            Every leg carries the slip's TOTAL odds ({builderOddsSanity.explicitTotal?.toFixed(2)}). Enter each leg's own price instead - the parent saves as the product of the legs ({builderOddsSanity.product.toFixed(2)} as entered).
                                        </p>
                                    )}
                                    {builderOddsSanity?.totalMismatch && (
                                        <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700">
                                            Total Odds ({builderOddsSanity.explicitTotal?.toFixed(2)}) doesn't match the product of the legs ({builderOddsSanity.product.toFixed(2)}). One of them is off - the explicit total wins on save.
                                        </p>
                                    )}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bookmaker</label>
                                            <input list="bookmaker-options" className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all capitalize" value={bulkBets[0].bookmaker || ''} onChange={(e) => { const v = e.target.value; setBulkBets(bulkBets.map(b => ({...b, bookmaker: v}))); }} placeholder="e.g. bet365" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Odds</label>
                                            <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bulkBets[0].total_odds || bulkBets[0].totalOdds || bulkBets[0].odds || ''} onChange={(e) => { const v = e.target.value; setBulkBets(bulkBets.map(b => ({...b, total_odds: v, totalOdds: v}))); }} placeholder="1.90" />
                                            {builderOddsSanity && (
                                                <p className="text-[10px] font-medium text-gray-400">Legs multiply to {builderOddsSanity.product.toFixed(2)}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Stake</label>
                                            <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bulkBets[0].total_stake || bulkBets[0].totalStake || bulkBets[0].stake || ''} onChange={(e) => { const v = e.target.value; setBulkBets(bulkBets.map(b => ({...b, total_stake: v, totalStake: v}))); }} placeholder="1.0" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Result</label>
                                            <select value={bulkBets[0].status || 'pending'} onChange={(e) => { const v = e.target.value; setBulkBets(bulkBets.map(b => ({...b, status: v}))); }} className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all">
                                                <option value="pending">Pending</option>
                                                <option value="won">Won</option>
                                                <option value="lost">Lost</option>
                                                <option value="void">Void</option>
                                                <option value="refund">Refund</option>
                                                <option value="half win">Half Win</option>
                                                <option value="half loss">Half Loss</option>
                                                <option value="cashed out">Cashed Out</option>
                                            </select>
                                        </div>
                                        {editId && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Auto-grade</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setBulkBets(bulkBets.map(b => ({ ...b, manualOverride: !b.manualOverride })))}
                                                    title="On: the grader settles this bet automatically. Off: keep your manually-set result (applies only once the bet is settled - a pending bet always auto-grades)."
                                                    className={`w-full flex items-center justify-between text-[13px] font-semibold rounded-md px-2 py-1 border transition-all ${!bulkBets[0].manualOverride ? 'text-[#10b981] bg-[#10b981]/5 border-[#10b981]/30' : 'text-gray-500 bg-gray-50 border-gray-100'}`}
                                                >
                                                    <span>{!bulkBets[0].manualOverride ? 'On' : 'Off'}</span>
                                                    <span className={`inline-block w-8 h-4 rounded-full relative transition-colors ${!bulkBets[0].manualOverride ? 'bg-[#10b981]' : 'bg-gray-300'}`}>
                                                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${!bulkBets[0].manualOverride ? 'left-[18px]' : 'left-0.5'}`} />
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {bulkBets[0].status !== 'pending' && (
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                            {bulkBets[0].status === 'cashed out' && (
                                                <div className="md:col-start-4 space-y-1">
                                                    <label className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider">Cashed Out Odds</label>
                                                    <input className="w-full text-[13px] font-semibold text-[#10b981] bg-[#10b981]/5 border border-[#10b981]/30 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all" value={bulkBets[0].cashedOutOdds || ''} onChange={(e) => { const v = e.target.value; setBulkBets(bulkBets.map(b => ({...b, cashedOutOdds: v}))); }} placeholder="67¢ / 67c or 1.34" type="text" />
                                                </div>
                                            )}
                                            <div className={bulkBets[0].status === 'cashed out' ? "md:col-start-5 space-y-1" : "md:col-start-5 space-y-1"}>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Closing Odds</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all" value={bulkBets[0].closingLineOdds || ''} onChange={(e) => { const v = e.target.value; setBulkBets(bulkBets.map(b => ({...b, closingLineOdds: v}))); }} placeholder="1.80 / -110 / 5/2" type="text" title="Decimal, American, or fractional" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="flex gap-3 mt-4 w-full sm:w-auto">
                                {editId && (
                                    <button
                                        className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all"
                                        onClick={async () => {
                                            if (confirm('Are you sure you want to delete this bet? This cannot be undone.')) {
                                                try {
                                                    const userId = localStorage.getItem('telegram_user_id');
                                                    const res = await fetch('/api/save-bet', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ userId, isDelete: true, betId: editId })
                                                    });
                                                    const data = await res.json();
                                                    if (data.error) alert(data.error);
                                                    else window.location.href = returnTo;
                                                } catch (e) {
                                                    alert('Failed to delete bet');
                                                }
                                            }
                                        }}
                                    >
                                        Delete Bet
                                    </button>
                                )}
                                <button 
                                    id="saveBulkBtn"
                                    className="flex items-center justify-center gap-2 px-8 py-2.5 text-[14px] font-bold text-white bg-[#121212] hover:bg-black rounded-xl shadow-md hover:-translate-y-0.5 transition-all w-full sm:w-auto"
                                    onClick={(e) => handleSaveBulk(e as any)}
                                >
                                    {editId ? 'Save Changes' : betStructure === 'single' ? 'Save 1 Bet Builder' : `Save All ${bulkBets.length} Bets`}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
{/* Autofill Search */}
                    <div className="relative z-40 space-y-1.5" ref={eventSearchRef}>
                        <label className="text-[13px] font-bold text-[#121212]">Search Event</label>
                        <div className="relative">
                            <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search by team, player, or league (e.g. Arsenal vs Chelsea)..."
                                className="w-full pl-11 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[14px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all shadow-sm"
                                value={searchEvent}
                                onPointerDown={markEventFieldInteracted}
                                onKeyDown={markEventFieldInteracted}
                                onChange={(e) => {
                                    markEventFieldInteracted();
                                    selectedEventSuggestionRef.current = false;
                                    setSelectedEvent(null);
                                    setPastEventSuggestions([]);
                                    setSearchEvent(e.target.value);
                                    setShowEventSuggestions(true);
                                }}
                                onFocus={() => {
                                    // Programmatic focus after edit prefill must not open the menu.
                                    // Real clicks set suppress=false via onPointerDown before focus.
                                    if (suppressEventDropdownRef.current) return;
                                    markEventFieldInteracted();
                                    if (mergedEventSuggestions.length > 0 || searchEvent.trim().length >= 2) {
                                        setShowEventSuggestions(true);
                                    }
                                }}
                            />
                            {eventSearchLoading && (
                                <div className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-gray-200 border-t-[#10b981] animate-spin" />
                            )}
                            {showEventSuggestions
                                && !suppressEventDropdownRef.current
                                && (mergedEventSuggestions.length > 0 || searchEvent.trim().length >= 2) && (
                                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                                    {mergedEventSuggestions.map((event) => (
                                        <button
                                            key={event.id}
                                            type="button"
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                            onClick={() => handleSelectEventSuggestion(event)}
                                        >
                                            <div className="text-[14px] font-semibold text-[#121212]">
                                                {event.searchEvent}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-gray-500">
                                                {event.date && <span>{event.date}</span>}
                                                {event.time && <span>{event.time}</span>}
                                                {event.country && <span>{event.country}</span>}
                                                {event.league && <span>{event.league}</span>}
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        className="sticky bottom-0 w-full border-t border-gray-100 bg-white px-4 py-3 text-left text-[13px] font-bold text-[#10b981] hover:bg-[#10b981]/5 transition-colors"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={searchPastEvents}
                                    >
                                        {pastEventSearchLoading ? 'Searching past events...' : `Search past events for "${searchEvent.trim()}"`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12}/> Date</label>
                            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setKickoffUtc(''); }} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-[#121212] focus:outline-none focus:border-[#10b981]" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Clock size={12}/> Time</label>
                            <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setKickoffUtc(''); }} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-[#121212] focus:outline-none focus:border-[#10b981]" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Globe size={12}/> Country</label>
                            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. England" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-[#121212] focus:outline-none focus:border-[#10b981]" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Trophy size={12}/> League</label>
                            <input type="text" value={league} onChange={(e) => setLeague(e.target.value)} placeholder="e.g. Premier League" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-[#121212] focus:outline-none focus:border-[#10b981]" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="m11 13.73-4 6.93"/></svg> Sport</label>
                            <input
                                type="text"
                                list="sport-options"
                                value={eventSport}
                                onChange={(e) => setEventSport(e.target.value)}
                                onBlur={() => {
                                    if (eventSport.trim()) setEventSport(getSportMeta(eventSport).name);
                                }}
                                placeholder="e.g. Tennis"
                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-[#121212] focus:outline-none focus:border-[#10b981]"
                            />
                            <datalist id="sport-options">
                                {sportOptions.map((sport) => (
                                    <option key={sport} value={getSportMeta(sport).name} label={sportOptionLabel(sport)} />
                                ))}
                            </datalist>
                        </div>
                    </div>

                    
                    {/* Compact Main Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4">
                        
                        {/* Selection */}
                        <div className="md:col-span-6 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Selection</label>
                            <input 
                                type="text" 
                                value={selection}
                                onChange={(e) => setSelection(e.target.value)}
                                placeholder={betType === 'player' ? "e.g. Cole Palmer Over 1.5 Shots on Target" : betType === 'team' ? "e.g. Arsenal Over 5.5 Corners" : "e.g. Arsenal Full Time Result"}
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                            />
                        </div>

                        {/* Market */}
                        <div className="md:col-span-3 space-y-1" ref={marketRef}>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Market</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={market}
                                    onChange={(e) => {
                                        setMarket(e.target.value);
                                        setShowMarketDropdown(true);
                                    }}
                                    onFocus={() => setShowMarketDropdown(true)}
                                    placeholder="e.g. Asian Total Cards"
                                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                                />
                                {showMarketDropdown && filteredMarkets.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filteredMarkets.map((m, idx) => (
                                            <div 
                                                key={idx}
                                                className="px-3 py-2 text-[12px] text-[#121212] hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                                onClick={() => {
                                                    setMarket(m);
                                                    setShowMarketDropdown(false);
                                                }}
                                            >
                                                {m}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Market Direction */}
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Direction</label>
                            <div className="relative">
                                <select value={betDirection} onChange={(e) => setBetDirection(e.target.value)} className="w-full pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm appearance-none cursor-pointer">
                                    <option value="">Select...</option>
                                    {marketDirectionOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Player Name */}
                        {betType === 'player' && (
                            <div className="md:col-span-6 space-y-1">
                                <label className="text-[11px] font-bold text-[#3b82f6] uppercase tracking-wider">Player Name</label>
                                <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="e.g. Cole Palmer" className="w-full px-3 py-1.5 bg-[#3b82f6]/5 border border-[#3b82f6]/20 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] transition-all shadow-sm" />
                            </div>
                        )}

                        {/* Team Name */}
                        {(betType === 'player' || betType === 'team') && (
                            <div className={`md:col-span-6 space-y-1`}>
                                <label className={`text-[11px] font-bold ${betType === 'player' ? 'text-gray-500' : 'text-[#10b981]'} uppercase tracking-wider`}>Team</label>
                                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Chelsea" className={`w-full px-3 py-1.5 ${betType === 'player' ? 'bg-white border-gray-200 focus:ring-[#10b981]' : 'bg-[#10b981]/5 border-[#10b981]/20 focus:ring-[#10b981]'} border rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 transition-all shadow-sm`} />
                            </div>
                        )}

                        {/* Bookmaker */}
                        <div className="md:col-span-4 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bookmaker</label>
                            <div className="relative">
                                <input
                                    list="bookmaker-options"
                                    value={bookmaker}
                                    onChange={(e) => setBookmaker(e.target.value)}
                                    placeholder="Select or type..."
                                    autoComplete="off"
                                    className="w-full pl-3 pr-16 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                                />
                                <datalist id="bookmaker-options">
                                    {BOOKMAKER_SUGGESTIONS.map((name) => (
                                        <option key={name} value={name} />
                                    ))}
                                </datalist>
                                {bookmaker.trim() ? (
                                    <img
                                        src={getBookmakerButtonUrl(bookmaker)}
                                        alt={getBookmakerMeta(bookmaker).name}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 max-w-[52px] object-contain rounded-sm pointer-events-none"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                                    />
                                ) : (
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                )}
                            </div>
                        </div>

                        {/* Odds */}
                        <div className="md:col-span-4 space-y-1">
                            <div className="flex justify-between items-center h-4">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Odds</label>
                                <select 
                                    className="text-[9px] font-bold text-gray-400 bg-transparent uppercase tracking-wider outline-none cursor-pointer hover:text-[#121212]"
                                    value={oddsFormat}
                                    onChange={(e: any) => setOddsFormat(e.target.value as OddsFormat)}
                                >
                                    <option value="auto">Auto</option>
                                    <option value="decimal">Dec</option>
                                    <option value="fractional">Frac</option>
                                    <option value="american">US</option>
                                    <option value="cents">¢</option>
                                </select>
                            </div>
                            <input
                                type="text"
                                value={odds}
                                onChange={(e) => setOdds(e.target.value)}
                                placeholder={oddsPlaceholder(oddsFormat)}
                                title="Decimal (1.90), American (+150 / -110), fractional (5/2), or cents (50¢) - all accepted natively"
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                            />
                            {(() => {
                                const parsed = parseOdds(odds, oddsFormat === 'auto' ? 'auto' : oddsFormat);
                                if (!odds || !(parsed.decimal > 1)) return null;
                                // Only show conversion hint when user typed a non-decimal form
                                if (parsed.format === 'decimal' && !/[\/+\-¢c]/i.test(odds)) return null;
                                return (
                                    <p className="text-[10px] text-gray-400 font-medium pt-0.5">
                                        = {parsed.decimal.toFixed(3).replace(/\.?0+$/, '')} decimal
                                        {parsed.format !== 'auto' ? ` · ${parsed.format}` : ''}
                                    </p>
                                );
                            })()}
                        </div>

                        {/* Stake */}
                        <div className="md:col-span-4 space-y-1">
                            <div className="flex justify-between items-center h-4">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stake</label>
                                <select 
                                    className="text-[9px] font-bold text-gray-400 bg-transparent uppercase tracking-wider outline-none cursor-pointer hover:text-[#121212]"
                                    value={stakeFormat}
                                    onChange={(e: any) => setStakeFormat(e.target.value)}
                                >
                                    <option value="units">Units</option>
                                    <option value="currency">Cur</option>
                                </select>
                            </div>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={stake}
                                    onChange={(e) => setStake(e.target.value)}
                                    placeholder={stakeFormat === 'units' ? "1.5" : "50.00"}
                                    className="w-full pl-3 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400 pointer-events-none">
                                    {stakeFormat === 'units' ? 'u' : getCurrencySymbol(bankrolls.find(b => b.id === activeBankrollId)?.currency)}
                                </span>
                            </div>
                        </div>
                        
                        {/* Result / Status */}
                        <div className="md:col-span-4 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Result</label>
                            <div className="relative">
                                <select 
                                    value={status} 
                                    onChange={(e) => setStatus(e.target.value)} 
                                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm appearance-none cursor-pointer"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="won">Won</option>
                                    <option value="lost">Lost</option>
                                    <option value="void">Void</option>
                                    <option value="refund">Refund</option>
                                    <option value="half win">Half Win</option>
                                    <option value="half loss">Half Loss</option>
                                    <option value="cashed out">Cashed Out</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {status === 'cashed out' && (
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[11px] font-bold text-[#10b981] uppercase tracking-wider">Cashed Out Odds</label>
                                <input 
                                    type="text"
                                    value={cashedOutOdds}
                                    onChange={(e) => setCashedOutOdds(e.target.value)}
                                    placeholder="67¢ / 67c or 1.34"
                                    className="w-full px-3 py-1.5 bg-[#10b981]/5 border border-[#10b981]/30 rounded-lg text-[13px] font-medium text-[#10b981] placeholder:text-[#10b981]/50 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                                />
                            </div>
                        )}
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bankroll</label>
                            <div className="relative">
                                <select 
                                    value={activeBankrollId}
                                    onChange={(e) => setActiveBankrollId(e.target.value)}
                                    className="w-full appearance-none px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                                >
                                    {bankrolls.map(br => (
                                        <option key={br.id} value={br.id}>{br.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className={status === 'cashed out' ? "md:col-span-2 space-y-1" : "md:col-span-2 space-y-1"}>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Closing Odds</label>
                            <input 
                                type="text"
                                inputMode="decimal"
                                value={closingLineOdds}
                                onChange={(e) => setClosingLineOdds(e.target.value)}
                                placeholder="1.80 / -110 / 5/2"
                                title="Decimal, American, or fractional"
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                            />
                            <p className="text-[10px] text-gray-400 leading-snug">
                                Auto CLV covers events after Jan 2026 &amp; non&#8209;player&#8209;prop markets only - add older events / player props here manually.
                            </p>
                        </div>
                        <div className="md:col-span-2 space-y-1" ref={tagRef}>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tags</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => {
                                        setTags(e.target.value);
                                        setShowTagDropdown(true);
                                    }}
                                    onFocus={() => setShowTagDropdown(true)}
                                    placeholder="e.g. Underdogs, Free Bet"
                                    autoComplete="off"
                                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                                />
                                {showTagDropdown && filteredTagSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filteredTagSuggestions.map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-[12px] text-[#121212] hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => applyTagSuggestion(tag)}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Submit Area */}
                    <div className="relative z-0 pt-6 border-t border-gray-100 flex items-center justify-end gap-4">
                        <button 
                            className="px-6 py-3 text-[14px] font-semibold text-gray-500 hover:text-[#121212] transition-colors"
                            onClick={() => {
                                if (editId) {
                                    window.location.href = returnTo;
                                    return;
                                }
                                setParseText('');
                                setSearchEvent('');
                                setDate('');
                                setKickoffUtc('');
                                setTime('');
                                setCountry('');
                                setLeague('');
                                setSelection('');
                                setMarket('');
                                setBetDirection('');
                                setBookmaker('');
                                setOdds('');
                                setStake('');
                                setStatus('pending');
                                setCashedOutOdds('');
                                setClosingLineOdds('');
                                setParsedValuePct('');
                                setParsedModelOdds('');
                                setParsedChancePct('');
                                setPlayerName('');
                                setTeamName('');
                                setSelectedEvent(null);
                            }}
                        >
                            Cancel
                        </button>
                        <button 
                            className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold text-[#121212] bg-[#10b981] hover:bg-[#23cf3f] rounded-xl shadow-sm shadow-[#10b981]/20 hover:shadow-md hover:shadow-[#10b981]/30 hover:-translate-y-0.5 transition-all"
                            onClick={async (e) => {
                                const btn = e.currentTarget;
                                const originalText = btn.innerHTML;
                                btn.innerHTML = 'Saving...';
                                try {
                                    const userId = localStorage.getItem('telegram_user_id');
                                    if (!userId) {
                                        alert("You must be logged in to save a bet. Please connect your Telegram account first.");
                                        return;
                                    }
                                    
                                    const res = await fetch('/api/save-bet', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            userId,
                                            betStructure,
                                            betType,
                                            date,
                                            time,
                                            kickoffUtc: kickoffUtc || selectedEvent?.kickoffUtc || '',
                                            // Raw pasted alert/slip this bet was auto-filled from, so the edit
                                            // view's "Original message" box works for web saves too (not just
                                            // Telegram-synced bets). Empty on a hand-typed bet - nothing to show.
                                            originalMessage: parseText || '',
                                            sourceImages: parseImages,
                                            country,
                                            league,
                                            searchEvent,
                                            selection,
                                            playerName,
                                            team: teamName,
                                            market,
                                            betDirection,
                                            bookmaker,
                                            odds,
                                            displayOdds: odds,
                                            stake,
                                            oddsApiEventId: selectedEvent?.id || '',
                                            oddsApiLeagueSlug: selectedEvent?.leagueSlug || '',
                                            eventSport: eventSport || selectedEvent?.sport || resolveBetSport({
                                                league,
                                                country,
                                                searchEvent,
                                                match: searchEvent,
                                                market,
                                                selection,
                                            }) || '',
                                            eventSource: selectedEvent?.source || '',
                                            status: status,
                                            cashedOutOdds: cashedOutOdds,
                                            closingLineOdds: closingLineOdds,
                                            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                                            valuePercentage: parsedValuePct || '',
                                            modelOdds: parsedModelOdds || '',
                                            chancePercentage: parsedChancePct || '',
                                            isUpdate: !!editId,
                                            betId: editId || undefined,
                                            bankrollId: activeBankrollId
                                        })
                                    });
                                    
                                    const data = await res.json();
                                    if (data.error) {
                                        alert('Error saving bet: ' + data.error);
                                    } else {
                                        const savedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
                                        if (savedTags.length) {
                                            setExistingTags((prev) => Array.from(new Set([...prev, ...savedTags])).sort((a, b) => a.localeCompare(b)));
                                        }
                                        if (editId) {
                                            window.location.href = returnTo;
                                            return;
                                        }
                                        // Reset form
                                        setSearchEvent('');
                                        setSelection('');
                                        setMarket('');
                                        setBetDirection('');
                                        setOdds('');
                                        setStake('');
                                        setStatus('pending');
                                        setCashedOutOdds('');
                                        setClosingLineOdds('');
                                        setParsedValuePct('');
                                        setParsedModelOdds('');
                                        setParsedChancePct('');
                                        setTags('');
                                        setSelectedEvent(null);
                                        setParseText('');
                                        setParseImages([]);
                                        setDate('');
                                        setKickoffUtc('');
                                        setTime('');
                                        setCountry('');
                                        setLeague('');
                                        setEventSport('');
                                        setBookmaker('');
                                        setPlayerName('');
                                        setTeamName('');
                                    }
                                } catch (error) {
                                    alert('Error saving bet');
                                    console.error(error);
                                } finally {
                                    btn.innerHTML = originalText;
                                }
                            }}
                        >
                            <Check size={18} strokeWidth={2.5} />
                            {editId ? 'Save Changes' : 'Save Bet'}
                        </button>
                    </div>
                    {editId && (
                        <div className="pt-4 flex justify-end">
                            <button
                                className="text-[13px] font-bold text-red-500 hover:text-red-700 underline"
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete this bet?')) {
                                        const userId = localStorage.getItem('telegram_user_id');
                                        const res = await fetch('/api/save-bet', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ userId, isDelete: true, betId: editId })
                                        });
                                        const data = await res.json();
                                        if (data.error) alert(data.error);
                                        else window.location.href = returnTo;
                                    }
                                }}
                            >
                                Delete Bet
                            </button>
                        </div>
                    )}
                    </>
                    )}

                </div>
            </div>
        </div>
    );
}

