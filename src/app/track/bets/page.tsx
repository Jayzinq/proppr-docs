'use client';

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getBookmakerButtonUrl, getBookmakerMeta } from '@/lib/bookmakers';
import { getSportMeta, resolveBetSport, sportOptionLabel, SPORT_CATALOG } from '@/lib/sports';
import { Search, ChevronDown, Check, LayoutGrid, List, TrendingUp, ChevronLeft, ChevronRight, CalendarDays, Download, X } from 'lucide-react';
import Link from 'next/link';
import NewBetForm from '../new-bet/NewBetForm';
import { MorphActionMenu, NumberPop } from '@/components/transitions/Motion';
import { resolveFullSelection, betInBankrollView, formatBankrollAmount, abbreviateWomenInBet } from '@/lib/utils';
import {
    oddsToDecimal,
    formatOddsDisplay as formatOddsDisplayShared,
    formatAnyOdds,
    normalizeOddsFormat,
} from '@/lib/odds';

function formatBookmaker(value: any) {
    return getBookmakerMeta(value).name;
}

function normalizeStatus(value: any) {
    return String(value || 'pending').toLowerCase().replace(/\s+/g, '_');
}

function titleCase(value: any) {
    return String(value || '')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function numericOdds(value: any) {
    return oddsToDecimal(value);
}

// Bankroll odds format is threaded via a module-level so the pure helper wrappers
// below stay simple; setOddsDisplayFormat is called whenever the active bankroll loads.
let _oddsDisplayFormat: string = 'decimal';
function setOddsDisplayFormat(fmt: unknown) {
    _oddsDisplayFormat = normalizeOddsFormat(fmt);
    try { localStorage.setItem('active_bankroll_odds_format', _oddsDisplayFormat); } catch { /* ignore */ }
}
function formatOddsDisplay(bet: any) {
    return formatOddsDisplayShared(bet, _oddsDisplayFormat);
}

function formatPrice(value: any) {
    return formatAnyOdds(value, _oddsDisplayFormat);
}

function formatProfitLoss(bet: any) {
    const profit = Number(bet.profit_loss || 0);
    if (profit !== 0) return profit;
    const stake = Number(bet.stake ?? bet.actual_stake ?? bet.units_staked ?? 0);
    const odds = numericOdds(bet.odds) || 1;
    const status = normalizeStatus(bet.status);
    if (status === 'won') return stake * (odds - 1);
    if (status === 'lost') return -stake;
    return 0;
}

function getBetId(bet: any) {
    return bet?.bet_id || (bet?._id && bet._id.$oid ? bet._id.$oid : bet?._id) || bet?.id || '';
}

function betSportName(bet: any) {
    return resolveBetSport(bet);
}

// Markets that belong to an individual player. Used to decide when it's safe to
// drop a leading first name in the Selection column VIEW. (Display only - the
// stored bet always keeps the full player name for grading / FotMob matching.)
function unwrapDateValue(value: any) {
    return value && typeof value === 'object' && value.$date ? value.$date : value;
}

function parseEventDateTime(dateValue: any, timeValue?: any) {
    const rawDate = unwrapDateValue(dateValue);
    if (!rawDate) return null;

    if (rawDate instanceof Date) return rawDate.getTime();

    const dateText = String(rawDate).trim();
    const timeText = String(timeValue || '').trim();

    const iso = dateText.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        const clock = /^(\d{1,2}):(\d{2})/.test(timeText) ? timeText : '00:00';
        const parsed = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T${clock}`);
        return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
    }

    const dayFirst = dateText.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dayFirst) {
        const year = dayFirst[3].length === 2 ? `20${dayFirst[3]}` : dayFirst[3];
        const clock = /^(\d{1,2}):(\d{2})/.test(timeText) ? timeText : '00:00';
        const parsed = new Date(`${year}-${dayFirst[2].padStart(2, '0')}-${dayFirst[1].padStart(2, '0')}T${clock}`);
        return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
    }

    const parsed = new Date(dateText);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

// Canonical instant display: bets carrying kickoff_utc render in the given timezone (the
// bankroll's, falling back to the browser's). Legacy bets without it keep their stored
// wall-clock strings untouched - never guess a timezone for those.
function kickoffDisplayParts(bet: any, tz?: string | null): { dateStr: string; timeStr: string } | null {
    const raw = bet?.kickoff_utc || bet?.kickoffUtc;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    let zone = String(tz || '');
    if (!zone) { try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* fall through */ } }
    try {
        return {
            dateStr: d.toLocaleDateString('en-GB', { timeZone: zone || undefined, day: '2-digit', month: 'short', year: '2-digit' }),
            timeStr: d.toLocaleTimeString('en-GB', { timeZone: zone || undefined, hour: '2-digit', minute: '2-digit', hour12: false }),
        };
    } catch {
        return null;
    }
}

function getBetEventTimestamp(bet: any) {
    // kickoff_utc is a true instant - when present it beats any wall-clock reconstruction.
    const ku = bet?.kickoff_utc || bet?.kickoffUtc;
    if (ku) {
        const t = new Date(ku).getTime();
        if (!Number.isNaN(t)) return t;
    }
    let eventDate = bet.date || bet.event_date || bet.eventDate || bet.fixture_date || bet.fixtureDate || bet.kickoff_date;
    let eventTime = bet.time || bet.event_time || bet.eventTime || bet.fixture_time || bet.fixtureTime || bet.kickoff_time;

    if (!eventDate && bet.multi_bet_selections && Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 0) {
        eventDate = bet.multi_bet_selections[0].date || bet.multi_bet_selections[0].event_date || bet.multi_bet_selections[0].eventDate;
        eventTime = bet.multi_bet_selections[0].time || bet.multi_bet_selections[0].event_time || bet.multi_bet_selections[0].eventTime;
    }

    const eventTs = parseEventDateTime(eventDate, eventTime);
    if (eventTs !== null) return eventTs;

    const fallback = unwrapDateValue(bet.tracked_at || bet.created_at);
    const fallbackTs = fallback ? new Date(fallback).getTime() : NaN;
    return Number.isNaN(fallbackTs) ? 0 : fallbackTs;
}

const PLAYER_MARKET_HINT = /\b(fouls?|shots?|sot|tackles?|cards?|booked|assists?|saves?|passes?|crosses?|dribbles?|clearances?|interceptions?|offsides?|blocks?|aerial|headed|to\s+score|anytime|scorer)\b/i;
// Markets that belong to a team/match - never strip a leading word here, so team
// names like "Aston Villa" / "Real Madrid" are left intact.
const TEAM_MARKET_HINT = /\b(team|total|match|both\s+teams|corners?|throw|handicap|double\s+chance|draw|correct\s+score|half\s+time|clean\s+sheet)\b/i;

// Keep a compound surname intact ("Jean Jacques", "El Aynaoui", "Van Dijk") by
// dropping only the first given-name token.
function surnameOf(fullName: string) {
    const parts = String(fullName || '').trim().split(/\s+/);
    return parts.length <= 1 ? fullName : parts.slice(1).join(' ');
}

// Drop the leading first name from a single player-prop leg, e.g.
// "Danley Jean Jacques 3+ Fouls" -> "Jean Jacques 3+ Fouls".
function dropFirstName(leg: string) {
    if (TEAM_MARKET_HINT.test(leg)) return leg;      // team/match market - leave alone
    if (!PLAYER_MARKET_HINT.test(leg)) return leg;   // not clearly a player market
    // Only strip when it starts "Firstname Surname…" (two capitalised tokens).
    return leg.replace(/^\s*[A-Z][A-Za-zÀ-ÿ'’.-]*\s+(?=[A-Z])/, '');
}

// Display-side normalisation to keep the Selection column compact and readable.
// View-only - never persisted. `playerName` (when known) is the safe anchor for
// first-name removal; the per-leg heuristic handles multi-player selections.
function shortenSelection(value: any, playerName?: any, market?: any) {
    let s = String(value || '');
    if (!s) return s;
    // Anchored: if we know the exact player full name, show just the surname.
    const full = String(playerName || '').trim();
    let didAnchorShorten = false;
    if (full && full !== 'Unknown Player' && full !== 'Unknown' && s.includes(full)) {
        s = s.split(full).join(surnameOf(full));
        didAnchorShorten = true;
    }
    // Heuristic: drop first names on any remaining player-prop legs - but skip when we
    // already shortened via the known player_name anchor (avoids "Gava Over 1.5" -> "Over 1.5"),
    // and NEVER on team/match markets: "Lanciano To Score - Yes" (Team Total) matched the
    // player hint via "to score" and lost its TEAM ("Hull City ..." -> "City ...").
    if (!didAnchorShorten && !TEAM_MARKET_HINT.test(String(market || ''))) {
        s = s.split(' & ').map(dropFirstName).join(' & ');
    }
    // Drop filler words that add no information in the table.
    s = s.replace(/\bCommitted\b/gi, '');
    // Over/Under -> O/U when used as a betting line (followed by a number).
    s = s.replace(/\bOver\b(?=\s*\d)/gi, 'O');
    s = s.replace(/\bUnder\b(?=\s*\d)/gi, 'U');
    // Tidy up doubled spaces / stray spaces around separators left by removals.
    s = s.replace(/\s{2,}/g, ' ').replace(/\s+&/g, ' &').replace(/&\s+/g, '& ').trim();
    return s;
}

function displayPersonName(value: any) {
    const s = String(value || '').trim();
    if (!s.includes(',')) return s;
    const [last, first] = s.split(',', 2).map((part) => part.trim());
    return first && last ? `${first} ${last}` : s;
}

function tennisTotalGamesSide(bet: any) {
    let side = String(
        bet?.team_assignment
        || bet?.api_location
        || bet?.result_tracking?.api_location
        || bet?.result_tracking?.side
        || ''
    ).toLowerCase();
    if (side === '1' || side === 'h') side = 'home';
    if (side === '2' || side === 'a') side = 'away';
    if (side === 'home' || side === 'away') return side;

    const selection = String(bet?.selection || '');
    const match = String(bet?.match || bet?.fixture_name || bet?.searchEvent || '');
    const parts = match.includes(' vs ') ? match.split(' vs ') : [];
    if (parts[0] && selection.toLowerCase().includes(parts[0].toLowerCase())) return 'home';
    if (parts[1] && selection.toLowerCase().includes(parts[1].toLowerCase())) return 'away';
    return '';
}

function isTennisTotalGamesBet(bet: any) {
    if (String(bet?.sport || '').toLowerCase() !== 'tennis') return false;
    const market = String(bet?.market || bet?.market_type || '').toLowerCase();
    const selection = String(bet?.selection || '').toLowerCase();
    return market.includes('player total games')
        || market.includes('games won')
        || (market.includes('team total') && (selection.includes('over') || selection.includes('under') || /\b[ou]\s*\d/.test(selection)));
}

function tennisTotalGamesSelection(bet: any) {
    const match = String(bet?.match || bet?.fixture_name || bet?.searchEvent || '');
    const parts = match.includes(' vs ') ? match.split(' vs ') : [];
    const side = tennisTotalGamesSide(bet);
    let subject = String(bet?.player_name || '').trim();
    if (!subject && side === 'home') subject = parts[0] || '';
    if (!subject && side === 'away') subject = parts[1] || '';
    if (!subject) {
        subject = String(bet?.selection || '').replace(/\b(?:over|under|o|u)\b.*$/i, '').trim();
    }
    subject = displayPersonName(subject);
    const directionRaw = String(bet?.market_direction || bet?.betDirection || bet?.bet_direction || '').toLowerCase();
    const selection = String(bet?.selection || '');
    const direction = directionRaw === 'under' || /\b(?:under|u)\b/i.test(selection) ? 'U'
        : directionRaw === 'over' || /\b(?:over|o)\b/i.test(selection) ? 'O'
        : '';
    const line = bet?.threshold ?? bet?.line ?? (selection.match(/\d+(?:\.\d+)?/)?.[0] || '');
    return [subject, direction, line, 'Games'].filter(Boolean).join(' ').trim();
}

// Drop a trailing market-noun phrase from the bold selection line so it shows just the
// bet line - the market name lives on the sub-line, so repeating it is noise. e.g.
// "Under 22.5 Match Shots" -> "Under 22.5", "Austria Over 3.5 Shots on Target" ->
// "Austria Over 3.5", "Turkiye -0.5 Asian Handicap Cards" -> "Turkiye -0.5". Keeps
// attached thresholds like "2+ Shots" intact (no space between number and "+").
const MARKET_TAIL_RE = /(\d(?:\.\d+)?)\s+(?:match|team|total|home|away|asian|handicap|spread|bookings?|shots?|sot|on|target|tackles?|cards?|corners?|fouls?|offsides?|saves?|passes?|assists?|goals?|throw[- ]?ins?)\b.*$/i;
// The edit-view URL for a bet row - used by the row's click handlers so middle-click and
// Ctrl/Cmd-click open the bet in a new tab, matching the sidebar's native <Link> behaviour.
const betEditHref = (bet: any) =>
    `/track/bets?editId=${bet.bet_id || (bet._id && bet._id.$oid ? bet._id.$oid : bet._id)}`;
function trimSelectionMarket(value: any) {
    let s = String(value || '');
    s = s.replace(/\s+-\s+/g, ' ');      // collapse stray " - " separators
    s = s.replace(MARKET_TAIL_RE, '$1'); // strip trailing market words after the line
    return s.replace(/\s{2,}/g, ' ').trim();
}

// Strip a trailing Home/Away qualifier from a market label for display - the team it
// refers to is already shown on the bold selection line (e.g. "Team Shots On Target
// Away" -> "Team Shots On Target"). Also drop a leading/trailing Yes/No - that's the
// Polymarket outcome (already shown on the selection line), not part of the market name
// (e.g. "Yes Moneyline" -> "Moneyline", "Both Teams To Score No" -> "Both Teams To Score").
// View-only; the stored market keeps everything.
function cleanMarketLabel(value: any) {
    let s = String(value || '')
        .replace(/^\s*(?:yes|no)\s+/i, '')
        .replace(/\s+(?:yes|no)\s*$/i, '')
        .replace(/\s+(?:home|away)\s*$/i, '')
        // "Player" is redundant in the market label (the selection already names the
        // player): "Player to be Booked" -> "to be Booked", "Player Points" -> "Points".
        .replace(/\bplayer\b/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        // Leading Home/Away/Draw on an outcome market is the pick (already on the
        // selection line), not part of the market name: "Home Full Time Result" ->
        // "Full Time Result". Gated to result markets so "Home Team Goals" is kept.
        .replace(/^\s*(?:home|away|draw)\s+(?=(?:full[- ]?time result|half[- ]?time result|match result|match betting|1x2|double chance|draw no bet|result|moneyline|money line)\b)/i, '')
        .trim();
    // Canonical card-market display names.
    const lower = s.toLowerCase();
    if (lower === 'card' || lower === 'cards' || lower === 'yellow card' || lower === 'yellow cards' || lower === 'to be booked' || lower === 'booked' || lower === 'player card' || lower === 'player cards') return 'Yellow Card';
    if (lower === 'booked first' || lower === '1st card' || lower === 'first card' || lower === 'first booking' || lower === 'player booked first') return '1st Card';
    return s;
}

const FULL_COVER_DISPLAY_NAMES: Record<string, string> = {
    patent: 'Patent',
    trixie: 'Trixie',
    yankee: 'Yankee',
    'lucky 15': 'Lucky 15',
    canadian: 'Canadian',
    'super yankee': 'Super Yankee',
    'lucky 31': 'Lucky 31',
    heinz: 'Heinz',
    'lucky 63': 'Lucky 63',
    'super heinz': 'Super Heinz',
    goliath: 'Goliath',
};

function fullCoverDisplayName(multipleType: string | undefined): string | null {
    if (!multipleType) return null;
    return FULL_COVER_DISPLAY_NAMES[multipleType.toLowerCase()] || null;
}

function BetsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState<string | null>(null);
    const prevEditIdRef = useRef<string | null>(null);
    const [bets, setBets] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [activeBankrollId, setActiveBankrollId] = useState('personal');

    // Edit Modal State
    const [editingBet, setEditingBet] = useState<any>(null);
    const [editStatus, setEditStatus] = useState('');
    const [editClo, setEditClo] = useState('');
    const [editCoOdds, setEditCoOdds] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sportFilter, setSportFilter] = useState('');
    const [bookmakerFilter, setBookmakerFilter] = useState('');
    const [marketTypeFilter, setMarketTypeFilter] = useState('');
    const [marketFilter, setMarketFilter] = useState('');
    const [bankroll, setBankroll] = useState<any>(null);
    const [allBankrolls, setAllBankrolls] = useState<any[]>([]);
    const [knownBankrollIds, setKnownBankrollIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // The global header search (Enter) lands here as /track/bets?q=… - apply it to the table
    // search. Read from window on mount (not useSearchParams) so the page stays static-prerenderable.
    useEffect(() => {
        try {
            const q = new URLSearchParams(window.location.search).get('q');
            if (q) setSearchQuery(q);
        } catch { /* no-op */ }
    }, []);
    const [sortCol, setSortCol] = useState('date');
    const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

    // Pagination
    const [pageSize, setPageSize] = useState<number>(25); // 0 = show all
    const [currentPage, setCurrentPage] = useState(1);

    // Server-side pagination state: `bets` now holds ONLY the current page; the table's
    // filter/sort/paginate is done in Mongo (a 20k-bet bankroll shipped 40MB before).
    const [totalCount, setTotalCount] = useState(0);
    const [serverFacets, setServerFacets] = useState<{ sports: string[]; bookmakers: string[]; markets: string[]; betTypes: string[] }>({ sports: [], bookmakers: [], markets: [], betTypes: [] });
    const [serverIds, setServerIds] = useState<string[]>([]);
    const [serverPending, setServerPending] = useState<any[]>([]);  // bankroll pending bets → top tiles
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Bulk actions
    const [selectedBets, setSelectedBets] = useState<string[]>([]);

    // Export
    const [exporting, setExporting] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportTemplate, setExportTemplate] = useState<'proppr' | 'traditional'>('traditional');
    const [exportBankrollIds, setExportBankrollIds] = useState<Set<string>>(new Set());

    const exportBankrollOptions = useMemo(() => {
        const options = allBankrolls.slice();
        if (!options.some((b: any) => b.id === 'personal')) {
            options.unshift({ id: 'personal', name: 'Personal' });
        }
        return options;
    }, [allBankrolls]);

    useEffect(() => {
        // Default export selection to the currently active bankroll.
        if (activeBankrollId) {
            setExportBankrollIds(new Set([activeBankrollId]));
        }
    }, [activeBankrollId]);

    const openExportModal = () => {
        setExportTemplate('traditional');
        setExportBankrollIds(new Set([activeBankrollId || 'personal']));
        setExportModalOpen(true);
    };

    const handleExport = async () => {
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId || exporting) return;
        setExporting(true);
        try {
            const ids = Array.from(exportBankrollIds);
            const blob = await api.bets.exportUserBets(Number(userId), 'csv', exportTemplate, ids);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `proppr_bets_${exportTemplate}_${userId}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setExportModalOpen(false);
        } catch (e: any) {
            alert(e?.message || 'Failed to export bets');
        } finally {
            setExporting(false);
        }
    };

    const handleBulkAction = async (action: string) => {
        if (!selectedBets.length) return;
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId) return;

        if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedBets.length} bets?`)) return;

        setLoading(true);

        try {
            if (action === 'delete') {
                // Delete in chunks: one atomic $pull per chunk. A single delete of many
                // thousands of bets exceeded the gateway timeout (504); chunking keeps each
                // request small. (Each chunk is still ONE bulk op, not N subprocesses.)
                const ids = [...selectedBets];
                const CHUNK = 1000;
                let failed = 0;
                for (let i = 0; i < ids.length; i += CHUNK) {
                    const chunk = ids.slice(i, i + CHUNK);
                    try {
                        const res = await fetch('/api/save-bet', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId, isDelete: true, betIds: chunk }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok || data?.error) failed += chunk.length;
                    } catch { failed += chunk.length; }
                }
                if (failed) {
                    alert(`Failed to delete ${failed.toLocaleString()} bet(s). Please refresh and try again.`);
                }
            } else {
                // ONE atomic bulk status update. Firing N single-update requests spawned N
                // heavy save_bet.py subprocesses that saturated the box and left the app blank
                // until they all finished; a single bulk_write pass is near-instant.
                const res = await fetch('/api/save-bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, isBulkStatus: true, betIds: selectedBets, status: action }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data?.error) {
                    alert(`Failed to ${action} ${selectedBets.length} bet(s): ${data?.error || res.status}. Please refresh and try again.`);
                }
            }

            setSelectedBets([]);
            loadData();                        // stats
            setRefreshTick((t) => t + 1);      // current page
            fetchBetsMeta();                   // filter menus + select-all ids
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const fetchBankroll = async () => {
        const userId = localStorage.getItem('telegram_user_id');
        if (userId) {
            try {
                const data = await api.bankrolls.get(Number(userId));
                const bankrolls = data.bankrolls || [];
                const activeId = localStorage.getItem('active_bankroll_id') || 'personal';
                const br = bankrolls.find((b: any) => b.id === activeId) || bankrolls[0];
                setBankroll(br);
                setAllBankrolls(bankrolls);
                setOddsDisplayFormat(br?.odds_format);
                setKnownBankrollIds(new Set(bankrolls.map((b: any) => String(b.id))));
            } catch (e) {
                console.error(e);
            }
        }
    };

    const [needsAuth, setNeedsAuth] = useState(false);

    const [refreshTick, setRefreshTick] = useState(0);

    // Server params from the current filters/sort/page. pageSize 0 ("show all") maps to the
    // server max page (500) - a 20k "show all" was the very thing we're fixing.
    const buildBetQuery = () => ({
        page: currentPage,
        pageSize: pageSize && pageSize > 0 ? pageSize : 500,
        sort: sortCol, dir: sortDir,
        status: statusFilter, sport: sportFilter, bookmaker: bookmakerFilter,
        market: marketFilter, marketType: marketTypeFilter, dateFrom, dateTo,
        search: debouncedSearch, bankroll: activeBankrollId,
        known: Array.from(knownBankrollIds).join(','),
    });

    const fetchBetsPage = async () => {
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId) return;
        try {
            const res = await api.bets.getUserBetsPaged(Number(userId), buildBetQuery());
            setBets(Array.isArray(res.bets) ? res.bets : []);
            setTotalCount(Number(res.total) || 0);
        } catch (e) { console.error(e); }
    };

    const fetchBetsMeta = async () => {
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId) return;
        try {
            const res = await api.bets.getUserBetsMeta(Number(userId), {
                bankroll: activeBankrollId, known: Array.from(knownBankrollIds).join(','),
                status: statusFilter, sport: sportFilter, bookmaker: bookmakerFilter,
                market: marketFilter, marketType: marketTypeFilter, dateFrom, dateTo, search: debouncedSearch,
            });
            setServerFacets(res.facets || { sports: [], bookmakers: [], markets: [], betTypes: [] });
            setServerIds(Array.isArray(res.ids) ? res.ids : []);
            setServerPending(Array.isArray(res.pendingBets) ? res.pendingBets : []);
        } catch (e) { console.error(e); }
    };

    const loadData = () => {
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId) {
            setNeedsAuth(true);
            setBets([
                { id: 1, team: 'Arsenal', market: 'To Win', odds: 1.95, actual_stake: 100, profit_loss: 95, status: 'won', tracked_at: new Date().toISOString() },
                { id: 2, team: 'Liverpool', market: 'Over 2.5 Goals', odds: 1.85, actual_stake: 150, profit_loss: -150, status: 'lost', tracked_at: new Date(Date.now() - 86400000).toISOString() },
                { id: 3, team: 'Man City', market: 'BTTS - Yes', odds: 2.10, actual_stake: 200, profit_loss: 220, status: 'won', tracked_at: new Date(Date.now() - 172800000).toISOString() }
            ]);
            setLoading(false);
            return;
        }
        setActiveBankrollId(localStorage.getItem('active_bankroll_id') || 'personal');
        // Bets now load via the paginated effects below; loadData only refreshes stats + auth.
        api.stats.getUserStats(Number(userId))
            .then((statsData) => setStats(statsData))
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    };

    // Debounce the search box so filtering doesn't refetch on every keystroke.
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Any filter/sort/bankroll change resets to page 1 (not a page change itself).
    useEffect(() => { setCurrentPage(1); }, [statusFilter, sportFilter, bookmakerFilter, marketFilter, marketTypeFilter, dateFrom, dateTo, debouncedSearch, sortCol, sortDir, activeBankrollId, pageSize]);

    // Fetch the current page whenever the query or the periodic refresh tick changes.
    useEffect(() => {
        if (needsAuth) return;
        fetchBetsPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, pageSize, sortCol, sortDir, statusFilter, sportFilter, bookmakerFilter, marketFilter, marketTypeFilter, dateFrom, dateTo, debouncedSearch, activeBankrollId, knownBankrollIds, refreshTick, needsAuth]);

    // Fetch filter-menu options + select-all id list when the filter set / bankroll changes.
    useEffect(() => {
        if (needsAuth) return;
        fetchBetsMeta();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, sportFilter, bookmakerFilter, marketFilter, marketTypeFilter, dateFrom, dateTo, debouncedSearch, activeBankrollId, knownBankrollIds, needsAuth]);

    useEffect(() => {
        loadData();
        fetchBankroll();
        // Live refresh: drift_monitor updates each pending bet's live_clv every 2 min, so
        // reload periodically to keep the current CLV fresh until close. Skip while an edit
        // form is open (?editId) so a background reload doesn't disturb editing.
        const refreshId = setInterval(() => {
            if (!new URLSearchParams(window.location.search).get('editId')) { loadData(); setRefreshTick((t) => t + 1); }
        }, 120000);
        const handleBankrollChange = () => {
            setActiveBankrollId(localStorage.getItem('active_bankroll_id') || 'personal');
            fetchBankroll();
        };
        window.addEventListener('bankroll_changed', handleBankrollChange);
        return () => {
            clearInterval(refreshId);
            window.removeEventListener('bankroll_changed', handleBankrollChange);
        };
    }, [router]);

    // Drive the edit view off the URL's ?editId. useSearchParams reacts to Next.js
    // <Link> client navigation (the sidebar "Bets" link, which uses pushState and fires
    // NO popstate) as well as browser back/forward - so leaving the edit form always
    // resets it and refreshes the list (fixes: sidebar nav changed the URL but the edit
    // form stayed on screen / list showed stale pre-edit data).
    useEffect(() => {
        const id = searchParams.get('editId') || null;
        if (prevEditIdRef.current && !id) { loadData(); setRefreshTick((t) => t + 1); }  // edit -> list: show just-saved data
        prevEditIdRef.current = id;
        setEditId(id);
    }, [searchParams]);

    // bfcache restores don't re-run effects; resync from the URL on pageshow.
    useEffect(() => {
        const onShow = (e: PageTransitionEvent) => {
            if (!e.persisted) return;
            const id = new URLSearchParams(window.location.search).get('editId') || null;
            prevEditIdRef.current = id;
            setEditId(id);
            if (!id) loadData();
        };
        window.addEventListener('pageshow', onShow);
        return () => window.removeEventListener('pageshow', onShow);
    }, []);

    // The server already scopes the page to the active bankroll + filters + sort, so these are
    // pass-throughs; the render/mutation code below still reads the same names. `bets` now holds
    // ONLY the current page (was the full 20k-bet, 40MB list).
    const activeBankrollBets = bets;

    const sportWorkerRanRef = useRef(false);
    useEffect(() => {
        if (loading || needsAuth) return;
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId || sportWorkerRanRef.current) return;
        const missingSport = bets.some((bet) => !String(bet.sport || bet.eventSport || '').trim());
        if (!missingSport) return;
        sportWorkerRanRef.current = true;
        fetch('/api/fill-sports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        })
            .then((res) => res.json())
            .then((data) => { if (data?.updated > 0) { loadData(); setRefreshTick((t) => t + 1); } })
            .catch(console.error);
    }, [bets, loading, needsAuth]);

    // Filter-menu options come from the server (distinct over the whole bankroll), not the page.
    const sports = useMemo(() => [...serverFacets.sports].sort((a, b) => a.localeCompare(b)), [serverFacets.sports]);
    const sportChoices = useMemo(() => {
        const names = new Set(SPORT_CATALOG.map((sport) => sport.name));
        serverFacets.sports.forEach((s) => { if (s) names.add(getSportMeta(s).name); });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [serverFacets.sports]);
    const bookmakers = serverFacets.bookmakers;
    const marketTypes = serverFacets.betTypes;
    const markets = serverFacets.markets;

    // Server-filtered + server-sorted current page.
    const filteredBets = bets;
    const filteredBetIds = serverIds;                       // ALL matching ids (select-all across pages)
    const allFilteredSelected = useMemo(
        () => filteredBetIds.length > 0 && filteredBetIds.every((id) => selectedBets.includes(id)),
        [filteredBetIds, selectedBets],
    );

    // Pagination driven by the server `total`; `bets` IS the current page.
    const effPageSize = pageSize && pageSize > 0 ? pageSize : (totalCount || 1);
    const totalPages = Math.max(1, Math.ceil(totalCount / effPageSize));
    const page = Math.min(currentPage, totalPages);
    const pagedBets = bets;
    const pageStart = totalCount === 0 ? 0 : (page - 1) * effPageSize + 1;
    const pageEnd = Math.min(page * effPageSize, totalCount);

    useEffect(() => {
        setSelectedBets((current) => {
            const visible = new Set(filteredBetIds);
            const next = current.filter((id) => visible.has(id));
            return next.length === current.length ? current : next;
        });
    }, [serverIds]);

    const openEditModal = (bet: any) => {
        setEditingBet(bet);
        const st = bet.status || 'pending';
        setEditStatus(st.includes('cash') ? 'cashed_out' : st);
        setEditClo(bet.closing_line_odds != null && bet.closing_line_odds !== ''
            ? (formatAnyOdds(bet.closing_line_odds, _oddsDisplayFormat) || String(bet.closing_line_odds))
            : '');
        setEditCoOdds(bet.cashed_out_odds != null && bet.cashed_out_odds !== ''
            ? (formatAnyOdds(bet.cashed_out_odds, _oddsDisplayFormat) || String(bet.cashed_out_odds))
            : '');
    };

    const handleStatusChange = async (bet: any, newStatus: string) => {
        const userId = localStorage.getItem('telegram_user_id');
        const betId = bet.bet_id || bet._id || bet.id;
        if (!userId || !betId) return;

        let cashoutValue = bet.cashed_out_odds ? String(bet.cashed_out_odds) : '';
        if (newStatus === 'cashed_out' && !cashoutValue) {
            cashoutValue = window.prompt('Cashout odds or exit price (e.g. 1.34, 67¢ or 67c)', '') || '';
            if (!cashoutValue.trim()) return;
        }

        const previousStatus = bet.status || 'pending';
        setBets((current) => current.map((item) => {
            const itemId = item.bet_id || item._id || item.id;
            return itemId === betId ? { ...item, status: newStatus } : item;
        }));

        try {
            const payload = {
                userId,
                betId,
                isUpdate: true,
                status: newStatus,
                odds: bet.display_odds || bet.displayOdds || bet.odds || '',
                cashedOutOdds: cashoutValue,
            };
            const res = await fetch('/api/save-bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to update bet status');
            }
            if (res.ok) {
                // Refresh current page + menus + stats (the status change may move the bet
                // in/out of the active filter).
                setRefreshTick((t) => t + 1);
                fetchBetsMeta();
                api.stats.getUserStats(Number(payload.userId)).then(setStats).catch(console.error);
            }
        } catch (e) {
            console.error(e);
            setBets((current) => current.map((item) => {
                const itemId = item.bet_id || item._id || item.id;
                return itemId === betId ? { ...item, status: previousStatus } : item;
            }));
        }
    };

    const handleSportChange = async (bet: any, newSport: string) => {
        const userId = localStorage.getItem('telegram_user_id');
        const betId = getBetId(bet);
        if (!userId || !betId) return;

        const previousSport = bet.sport || bet.eventSport || '';
        setBets((current) => current.map((item) => (
            getBetId(item) === betId ? { ...item, sport: newSport, eventSport: newSport } : item
        )));

        try {
            const res = await fetch('/api/save-bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    betId,
                    isUpdate: true,
                    eventSport: newSport,
                }),
            });
            if (!res.ok) throw new Error('Failed to update sport');
        } catch (e) {
            console.error(e);
            setBets((current) => current.map((item) => (
                getBetId(item) === betId ? { ...item, sport: previousSport, eventSport: previousSport } : item
            )));
        }
    };

    // CLV cell: free-type while focused (any format); format to bankroll odds style when idle.
    const [clvDraft, setClvDraft] = useState<Record<string, string>>({});
    const [clvFocusId, setClvFocusId] = useState<string | null>(null);

    const handleCLVChange = async (bet: any, newCLV: string) => {
        const userId = localStorage.getItem('telegram_user_id');
        const betId = bet.bet_id || bet._id || bet.id;
        if (!userId || !betId) return;

        const previousCLV = bet.closing_line_odds ?? bet.closingLineOdds ?? '';
        // Optimistic: store raw typed value; save_bet normalises to decimal.
        setBets((current) => current.map((item) => {
            const itemId = item.bet_id || item._id || item.id;
            return itemId === betId ? { ...item, closing_line_odds: newCLV } : item;
        }));

        try {
            const payload = {
                userId,
                betId,
                isUpdate: true,
                closingLineOdds: newCLV,
            };
            const res = await fetch('/api/save-bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update CLV');
            // After save, show bankroll-format display of the normalised price.
            const normalised = formatPrice(newCLV) || newCLV;
            setBets((current) => current.map((item) => {
                const itemId = item.bet_id || item._id || item.id;
                // Keep numeric-ish storage via oddsToDecimal when possible so reloads match.
                const dec = oddsToDecimal(newCLV);
                return itemId === betId
                    ? { ...item, closing_line_odds: dec > 1 ? dec : newCLV }
                    : item;
            }));
            setClvDraft((d) => {
                const next = { ...d };
                delete next[String(betId)];
                return next;
            });
            void normalised;
        } catch (e) {
            console.error(e);
            setBets((current) => current.map((item) => {
                const itemId = item.bet_id || item._id || item.id;
                return itemId === betId ? { ...item, closing_line_odds: previousCLV } : item;
            }));
        }
    };

    if (editId) {
        return <NewBetForm returnTo="/track/bets" />;
    }

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
                <div className="mb-5">
                    <div className="track-skeleton h-9 w-40 rounded-lg bg-gray-200" />
                    <div className="track-skeleton h-4 w-full max-w-lg rounded bg-gray-100 mt-3" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
                            <div className="track-skeleton w-12 h-12 rounded-lg bg-gray-100" />
                            <div className="flex-1">
                                <div className="track-skeleton h-6 w-20 rounded bg-gray-200" />
                                <div className="track-skeleton h-3 w-24 rounded bg-gray-100 mt-2" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="track-skeleton h-14 w-full rounded-xl bg-gray-100" />
                <div className="flex flex-col gap-3">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="track-skeleton h-20 w-full rounded-xl bg-gray-100" />
                    ))}
                </div>
            </div>
        );
    }

    // Top tiles are bankroll-wide (not page-scoped): computed from the server's pending-bets set.
    const activeBetsCount = serverPending.length;
    const activeStake = serverPending.reduce((acc, b) => acc + (b.stake || b.actual_stake || b.units_staked || 0), 0);
    const potentialProfits = serverPending.reduce((acc, b) => acc + ((b.stake || b.actual_stake || b.units_staked || 0) * ((numericOdds(b.odds) || 1) - 1)), 0);

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
                            Connect your Telegram account to view and edit your bet history, track your bankroll, and auto-sync your bets.
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
        <div className={`max-w-[1400px] mx-auto space-y-6 pb-12 ${needsAuth ? 'opacity-50 pointer-events-none select-none overflow-hidden h-[80vh]' : ''}`}>

            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-[32px] font-bold tracking-tight text-[#121212]">Bets</h1>
                        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[12px] font-bold text-gray-500">
                            {totalCount} bets
                        </span>
                    </div>
                    <p className="mt-1 text-[14px] font-medium text-gray-500">
                        View and manage your entire betting history. Click any bet to edit its status or closing line odds.
                    </p>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="track-card-motion bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                        <List size={24} className="text-[#10b981]" />
                    </div>
                    <div>
                        <div className="text-[24px] font-bold text-[#121212] tracking-tight">
                            <NumberPop value={activeBetsCount} />
                        </div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Active bets
                        </div>
                    </div>
                </div>

                <div className="track-card-motion bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                        <LayoutGrid size={24} className="text-[#121212]" />
                    </div>
                    <div>
                        <div className="text-[24px] font-bold text-[#121212] tracking-tight">
                            <NumberPop value={formatBankrollAmount(activeStake, bankroll)} />
                        </div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Active stake
                        </div>
                    </div>
                </div>

                <div className="track-card-motion bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                        <TrendingUp size={24} className="text-[#3b82f6]" />
                    </div>
                    <div>
                        <div className="text-[24px] font-bold text-[#121212] tracking-tight">
                            <NumberPop value={formatBankrollAmount(potentialProfits, bankroll)} />
                        </div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Potential profits
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="track-card-motion flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text"
                        placeholder="Search match or selection..."
                        className="w-full bg-gray-50 border border-gray-200 text-[#121212] text-[13px] font-semibold rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-[#10b981] focus:bg-white transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {/* Date range (from – to). Each opens the native calendar on click; the from/to
                    cross-constrain so you can't pick an inverted range. */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto sm:min-w-[240px]">
                    {([
                        { val: dateFrom, set: setDateFrom, label: 'From date', max: dateTo || undefined, min: undefined as string | undefined },
                        { val: dateTo, set: setDateTo, label: 'To date', min: dateFrom || undefined, max: undefined as string | undefined },
                    ] as const).map((f, i) => (
                        <div key={i} className="relative flex-1 min-w-[104px] flex items-center gap-1.5">
                            {i === 1 && <span className="text-gray-400 text-[13px] font-semibold shrink-0 -ml-1">–</span>}
                            <div className="relative flex-1">
                                <input
                                    type="date"
                                    aria-label={f.label}
                                    title={f.label}
                                    min={f.min}
                                    max={f.max}
                                    className="w-full appearance-none bg-transparent border border-gray-200 text-[#121212] text-[13px] font-semibold rounded-lg pl-2.5 pr-8 py-2.5 outline-none focus:border-[#10b981] transition-colors cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                                    value={f.val}
                                    onChange={(e) => f.set(e.target.value)}
                                    onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* older browsers: native indicator still opens it */ } }}
                                />
                                <CalendarDays size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="relative min-w-[140px]">
                    <select 
                        className="w-full appearance-none bg-transparent border border-gray-200 text-[#121212] text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-[#10b981] transition-colors"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Status</option>
                        <option value="pending">Pending</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="half_win">Half Win</option>
                        <option value="half_loss">Half Loss</option>
                        <option value="void">Void</option>
                        <option value="refund">Refund</option>
                        <option value="cashed_out">Cashed Out</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative min-w-[140px]">
                    <select 
                        className="w-full appearance-none bg-transparent border border-gray-200 text-[#121212] text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-[#10b981] transition-colors"
                        value={sportFilter}
                        onChange={(e) => setSportFilter(e.target.value)}
                    >
                        <option value="">Sport</option>
                        {sportChoices.map((s: string) => <option key={s} value={s}>{sportOptionLabel(s)}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative min-w-[150px]">
                    <select 
                        className="w-full appearance-none bg-transparent border border-gray-200 text-[#121212] text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-[#10b981] transition-colors"
                        value={bookmakerFilter}
                        onChange={(e) => setBookmakerFilter(e.target.value)}
                    >
                        <option value="">Bookmaker</option>
                        {bookmakers.map((b: any) => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative min-w-[160px]">
                    <select 
                        className="w-full appearance-none bg-transparent border border-gray-200 text-[#121212] text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-[#10b981] transition-colors"
                        value={marketTypeFilter}
                        onChange={(e) => setMarketTypeFilter(e.target.value)}
                    >
                        <option value="">Market Type</option>
                        {marketTypes.map((mt: any) => <option key={mt} value={mt}>{mt}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative min-w-[160px]">
                    <select 
                        className="w-full appearance-none bg-transparent border border-gray-200 text-[#121212] text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-[#10b981] transition-colors"
                        value={marketFilter}
                        onChange={(e) => setMarketFilter(e.target.value)}
                    >
                        <option value="">Market</option>
                        {markets.map((m: any) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={openExportModal}
                        disabled={exporting}
                        className="inline-flex items-center justify-center gap-2 min-h-[40px] rounded-xl border border-gray-200 bg-white px-4 text-[13px] font-extrabold text-[#121212] shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:pointer-events-none transition-colors"
                    >
                        <Download size={16} />
                        {exporting ? 'Exporting…' : 'Export'}
                    </button>
                    <MorphActionMenu label="Add Bet" menuClassName="p-1.5">
                        <Link href="/track/new-bet" className="track-morph-menu-item rounded-xl">
                            Add manually
                        </Link>
                        <Link href="/track/import" className="track-morph-menu-item rounded-xl">
                            Import CSV
                        </Link>
                        <Link href="/track/telegram-import" className="track-morph-menu-item rounded-xl">
                            Import Telegram
                        </Link>
                    </MorphActionMenu>
                </div>
            </div>

            {selectedBets.length > 0 && (
                <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center bg-[#10b981] text-white rounded-full text-xs font-bold shadow-sm">
                            {selectedBets.length}
                        </span>
                        <span className="text-[#121212] font-semibold text-sm">bets selected</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => handleBulkAction('won')} className="text-xs font-bold bg-white border border-gray-200 hover:border-[#10b981] hover:text-[#10b981] px-4 py-2 rounded-lg transition-colors text-gray-700 shadow-sm">Mark as Won</button>
                        <button onClick={() => handleBulkAction('lost')} className="text-xs font-bold bg-white border border-gray-200 hover:border-red-500 hover:text-red-500 px-4 py-2 rounded-lg transition-colors text-gray-700 shadow-sm">Mark as Lost</button>
                        <button onClick={() => handleBulkAction('void')} className="text-xs font-bold bg-white border border-gray-200 hover:border-orange-500 hover:text-orange-500 px-4 py-2 rounded-lg transition-colors text-gray-700 shadow-sm">Void / Refund</button>
                        <button onClick={() => handleBulkAction('pending')} className="text-xs font-bold bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-500 px-4 py-2 rounded-lg transition-colors text-gray-700 shadow-sm">Mark as Pending</button>
                        <div className="w-px h-4 bg-gray-300 mx-1 hidden sm:block"></div>
                        <button onClick={() => handleBulkAction('delete')} className="text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-lg transition-colors shadow-sm">Delete</button>
                    </div>
                </div>
            )}

            {/* Table Area */}
            <div className="track-card-motion track-bets-table-card bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="track-bets-table-wrap min-h-[400px]">
                    <table className="track-bets-table w-full text-left">
                        <thead>
                            <tr className="text-left font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                <th className="track-bets-col-check py-3">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-[#10b981] focus:ring-[#10b981] cursor-pointer w-4 h-4"
                                        checked={allFilteredSelected}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedBets(filteredBetIds);
                                            else setSelectedBets((current) => current.filter((id) => !filteredBetIds.includes(id)));
                                        }}
                                    />
                                </th>
                                {(() => {
                                    const SortIcon = ({ col }: { col: string }) => sortCol === col ? (sortDir === 'asc' ? <span className="ml-1 inline-block">↑</span> : <span className="ml-1 inline-block">↓</span>) : null;
                                    const headerClass = "py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none";
                                    const handleSort = (col: string) => {
                                        if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                                        else { setSortCol(col); setSortDir('asc'); }
                                    };
                                    return <>
                                        <th className={`track-bets-col-date ${headerClass}`} onClick={() => handleSort('date')}>Date<SortIcon col="date" /></th>
                                        <th className="track-bets-col-sport py-3">Sport</th>
                                        <th className={`track-bets-col-match ${headerClass}`} onClick={() => handleSort('match')}>Match<SortIcon col="match" /></th>
                                        <th className={`track-bets-col-selection ${headerClass}`} onClick={() => handleSort('selection')}>Selection<SortIcon col="selection" /></th>
                                        <th className={`track-bets-col-odds text-right ${headerClass}`} onClick={() => handleSort('odds')}>Odds<SortIcon col="odds" /></th>
                                        <th className="track-bets-col-bookmaker py-3">Bookmakers</th>
                                        <th className={`track-bets-col-status text-center ${headerClass}`} onClick={() => handleSort('status')}>Status<SortIcon col="status" /></th>
                                        <th className={`track-bets-col-stake text-right ${headerClass}`} onClick={() => handleSort('stake')}>Stake<SortIcon col="stake" /></th>
                                        <th className={`track-bets-col-returns text-right ${headerClass}`} onClick={() => handleSort('returns')}>Returns<SortIcon col="returns" /></th>
                                        <th className="track-bets-col-clv py-3 text-right">CLV</th>
                                    </>;
                                })()}
                            </tr>
                        </thead>
                        <tbody>
                            {pagedBets.map(abbreviateWomenInBet).map((bet: any, i) => (
                                <tr
                                    key={i}
                                    style={{ ['--row-index' as string]: i }}
                                    onClick={(e) => {
                                        // Ctrl/Cmd/Shift-click opens a new tab like a native link; plain click navigates in place.
                                        if (e.ctrlKey || e.metaKey || e.shiftKey) window.open(betEditHref(bet), '_blank');
                                        else window.location.href = betEditHref(bet);
                                    }}
                                    onAuxClick={(e) => {
                                        // Middle-click (mouse wheel) → open the bet in a new tab, matching the sidebar links.
                                        if (e.button === 1) { e.preventDefault(); window.open(betEditHref(bet), '_blank'); }
                                    }}
                                    onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} /* suppress middle-click autoscroll */
                                    className="track-row-motion border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70 transition-colors cursor-pointer align-middle">
                                    <td className="track-bets-col-check py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 text-[#10b981] focus:ring-[#10b981] cursor-pointer w-4 h-4"
                                            checked={selectedBets.includes(getBetId(bet))}
                                            onChange={(e) => {
                                                const id = getBetId(bet);
                                                if (e.target.checked) {
                                                    setSelectedBets(prev => [...prev, id]);
                                                } else {
                                                    setSelectedBets(prev => prev.filter(x => x !== id));
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="track-bets-col-date py-4 align-middle text-[#121212] font-semibold">
                                        {(() => {
                                            const kp = kickoffDisplayParts(bet, (bankroll as any)?.timezone);
                                            if (kp) {
                                                return (
                                                    <div className="leading-tight">
                                                        <div>{kp.dateStr}</div>
                                                        <div className="text-gray-400 text-[0.85em] font-medium mt-0.5">{kp.timeStr}</div>
                                                    </div>
                                                );
                                            }
                                            const ts = getBetEventTimestamp(bet);
                                            if (ts) {
                                                const dt = new Date(ts);
                                                let eventTime = bet.time || bet.event_time || bet.eventTime;
                                                if (!eventTime && bet.multi_bet_selections && Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 0) {
                                                    eventTime = bet.multi_bet_selections[0].time || bet.multi_bet_selections[0].event_time || bet.multi_bet_selections[0].eventTime;
                                                }
                                                const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
                                                const timeStr = eventTime ? String(eventTime).slice(0, 5) : '';
                                                return (
                                                    <div className="leading-tight">
                                                        <div>{dateStr}</div>
                                                        {timeStr && <div className="text-gray-400 text-[0.85em] font-medium mt-0.5">{timeStr}</div>}
                                                    </div>
                                                );
                                            }
                                            return '-';
                                        })()}
                                    </td>
                                    <td className="track-bets-col-sport py-4 align-middle font-semibold text-gray-600" onClick={(e) => e.stopPropagation()}>
                                        <div className="track-bets-sport-cell">
                                            <select
                                                className="track-bets-sport-select text-[0.95em] text-gray-600 outline-none"
                                                value={betSportName(bet) || ''}
                                                onChange={(e) => handleSportChange(bet, e.target.value)}
                                                title={sportOptionLabel(betSportName(bet) || '') || 'Sport'}
                                            >
                                                <option value="">-</option>
                                                {sportChoices.map((sport) => (
                                                    <option key={sport} value={sport}>{sportOptionLabel(sport)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="track-bets-col-match py-4 align-middle">
                                        <div className="track-bets-match font-bold text-[#121212]">
                                            {(() => {
                                                let m = bet.fixture_name || bet.searchEvent || bet.match || 'Event';
                                                // A multi (Double / Bet Builder / accumulator) stores a placeholder
                                                // parent match ("Event", "N selections"). Show the real leg fixtures:
                                                // 1-3 distinct fixtures each on its own line; 4+ collapse to "N Matches".
                                                if (Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 0) {
                                                    const events: string[] = Array.from(new Set<string>(bet.multi_bet_selections
                                                        .map((s: any) => String(s.match || s.searchEvent || s.fixture_name || '').trim())
                                                        .filter((x: string) => !!x)));
                                                    if (events.length >= 4) {
                                                        return <>{events.length} Matches</>;
                                                    }
                                                    if (events.length > 0) {
                                                        return <>{events.map((ev: string, idx: number) => <div key={idx}>{ev}</div>)}</>;
                                                    }
                                                }
                                                if (typeof m === 'string') {
                                                    m = m.replace(/\s+multi-bet$/i, '').replace(/\s+accumulator$/i, '').replace(/\s+bet builder$/i, '');
                                                }
                                                return m;
                                            })()}
                                        </div>
                                    </td>
                                    <td className="track-bets-col-selection py-4 align-middle">
                                        <div className="track-bets-selection font-semibold text-[#121212] text-[1.02em] leading-tight">
                                            {(() => {
                                                const marketLower = String(bet.market || '').toLowerCase();
                                                const isMulti = bet.bet_type === 'multiple' || bet.is_multiple || marketLower.includes('multi-bet') || marketLower.includes('accumulator') || marketLower.includes('bet builder');
                                                if (isMulti) {
                                                    const fullCoverName = fullCoverDisplayName(bet.multiple_type);
                                                    if (fullCoverName) return fullCoverName;

                                                    let numMatches = 0;
                                                    let maxSels = 0;
                                                    
                                                    if (bet.multi_bet_description) {
                                                        const legs = bet.multi_bet_description.split('|');
                                                        const descCounts: Record<string, number> = {};
                                                        legs.forEach((leg: string) => {
                                                            const mMatch = leg.match(/🏟\s*([^🎯\n]+)/);
                                                            if (mMatch) {
                                                                const m = mMatch[1].trim();
                                                                descCounts[m] = (descCounts[m] || 0) + 1;
                                                            }
                                                        });
                                                        if (Object.keys(descCounts).length > 0) {
                                                            numMatches = Object.keys(descCounts).length;
                                                            maxSels = Math.max(...Object.values(descCounts));
                                                        }
                                                    }
                                                    
                                                    if (numMatches === 0 && bet.multi_bet_selections && Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 0) {
                                                        const matchCounts: Record<string, number> = {};
                                                        bet.multi_bet_selections.forEach((sel: any) => {
                                                            const m = sel.match || sel.searchEvent || sel.fixture_name || 'Unknown Match';
                                                            matchCounts[m] = (matchCounts[m] || 0) + 1;
                                                        });
                                                        const matchNames = Object.keys(matchCounts);
                                                        if (matchNames.length === 1 && /multi-match/i.test(matchNames[0])) {
                                                            const mMatch = matchNames[0].match(/(\d+)\s+selections/i);
                                                            if (mMatch) {
                                                                numMatches = parseInt(mMatch[1], 10);
                                                                maxSels = 1;
                                                            }
                                                        } else {
                                                            numMatches = matchNames.length;
                                                            maxSels = Math.max(...Object.values(matchCounts));
                                                        }
                                                    }
                                                    
                                                    if (maxSels >= 2) return 'Bet Builder';
                                                    if (numMatches === 2) return 'Double';
                                                    if (numMatches === 3) return 'Treble';
                                                    if (numMatches >= 4) return 'Accumulator';
                                                    return 'Bet Builder';
                                                }

                                                if (isTennisTotalGamesBet(bet)) {
                                                    return tennisTotalGamesSelection(bet);
                                                }

                                                let s = resolveFullSelection(bet);
                                                let side = bet.side || bet.api_location || bet.result_tracking?.api_location;
                                                
                                                if ((!s || s === '-' || s === 'Match Total' || s === 'Unknown Player' || s === 'Unknown') && side) {
                                                    const matchStr = bet.fixture_name || bet.searchEvent || bet.match || '';
                                                    if (matchStr.includes(' vs ')) {
                                                        const parts = matchStr.split(' vs ');
                                                        if (side === 'home' && parts.length > 0) s = parts[0].trim();
                                                        else if (side === 'away' && parts.length > 1) s = parts[1].trim();
                                                    }
                                                }

                                                if (!s || s === '-' || s === 'Unknown Player' || s === 'Unknown') s = 'Match Total';
                                                return shortenSelection(trimSelectionMarket(s), bet.player_name, bet.market);
                                            })()}
                                        </div>
                                        <div className="track-bets-market text-[0.92em] text-gray-500 mt-0.5">
                                            {(() => {
                                                const oddsDisplay = formatOddsDisplay(bet);
                                                const withOdds = (label: any) => (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span>{label}</span>
                                                        {oddsDisplay && (
                                                            <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[0.78em] font-bold text-gray-600 border border-gray-200">
                                                                @ {oddsDisplay}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                                const marketLower = String(bet.market || '').toLowerCase();
                                                const isMulti = bet.bet_type === 'multiple' || bet.is_multiple || marketLower.includes('multi-bet') || marketLower.includes('accumulator') || marketLower.includes('bet builder');
                                                if (isMulti) {
                                                    const fullCoverName = fullCoverDisplayName(bet.multiple_type);

                                                    // The N-leg label ("Treble"/"Double"/…) reads better than a market name.
                                                    const legN = Array.isArray(bet.multi_bet_selections) ? bet.multi_bet_selections.length : 0;
                                                    const legWord = fullCoverName
                                                        || ({ 2: 'Double', 3: 'Treble', 4: 'Fourfold', 5: 'Fivefold' } as Record<number, string>)[legN];
                                                    if (!bet.multi_bet_selections || !Array.isArray(bet.multi_bet_selections) || bet.multi_bet_selections.length === 0) {
                                                        if (bet.multi_bet_description) {
                                                            const lowerDesc = bet.multi_bet_description.toLowerCase();
                                                            const isPlayer = lowerDesc.includes('player');
                                                            return withOdds(isPlayer ? 'Player Props' : 'Team Props');
                                                        }
                                                        return withOdds('Mixed');
                                                    }
                                                    let hasPlayer = false;
                                                    let hasTeam = false;
                                                    let hasMatch = false;
                                                    bet.multi_bet_selections.forEach((sel: any) => {
                                                        // Three-way leg classification: player (player market OR a real player
                                                        // name), match RESULT (FTR/moneyline/1X2 family - these are not "team
                                                        // props"), else team stat. A goal-line + 2×FTR treble is Mixed, not
                                                        // Team Props.
                                                        const m = String(sel.market || '').toLowerCase();
                                                        const isPlayerMarket = m.includes('player');
                                                        const hasPlayerName = sel.player_name && sel.player_name !== 'Unknown Player' && sel.player_name !== 'Unknown';
                                                        const isResultMarket = /\b(full time result|match result|half-?time result|moneyline|money line|1x2|draw no bet|double chance|correct score|to qualify|2nd half result)\b/.test(m);

                                                        if (isPlayerMarket || hasPlayerName) hasPlayer = true;
                                                        else if (isResultMarket) hasMatch = true;
                                                        else hasTeam = true;
                                                    });
                                                    const kinds: string[] = [];
                                                    if (hasPlayer) kinds.push('Player Props');
                                                    if (hasMatch) kinds.push('Match Result');
                                                    if (hasTeam) kinds.push('Team Props');
                                                    const kind = kinds.length === 1 ? kinds[0] : 'Mixed';
                                                    return withOdds(legWord ? `${legWord} · ${kind}` : kind);
                                                }

                                                const marketName = bet.market || bet.market_type || '';
                                                if (isTennisTotalGamesBet(bet)) {
                                                    return withOdds('Player Total Games');
                                                }
                                                let md = bet.market_direction || bet.betDirection || bet.bet_direction || '';
                                                if (typeof md === 'string') {
                                                    const lmd = md.toLowerCase();
                                                    if (lmd === 'positive' || lmd === 'plus') md = '+';
                                                    else if (lmd === 'negative' || lmd === 'minus') md = '-';
                                                }

                                                const selectionText = String(bet.selection || '');
                                                const marketIsHandicap = /\b(handicap|spread)\b/i.test(String(marketName));
                                                const selectionShowsLine = /\d/.test(selectionText);
                                                if (marketName && (marketIsHandicap || selectionShowsLine)) {
                                                    return withOdds(titleCase(cleanMarketLabel(marketName)));
                                                }

                                                let thresh = bet.threshold || bet.line || '';
                                                let prefix = '';
                                                if (md && thresh) {
                                                    prefix = (md === '+' || md === '-') ? `${md}${thresh}` : `${md} ${thresh}`;
                                                } else if (md) {
                                                    prefix = md;
                                                } else if (thresh) {
                                                    prefix = thresh;
                                                }

                                                let m = [prefix, marketName].filter(Boolean).join(' ');
                                                if (!m) m = marketName || 'Unknown Market';

                                                return withOdds(titleCase(cleanMarketLabel(m)));
                                            })()}
                                        </div>
                                    </td>
                                    <td className="track-bets-col-odds py-4 align-middle text-right font-semibold text-[#121212]">
                                        {formatOddsDisplay(bet) || '-'}
                                    </td>
                                    <td className="track-bets-col-bookmaker py-4 align-middle">
                                        {(() => {
                                            const bookmakerMeta = getBookmakerMeta(bet.bookmaker);
                                            const bookmakerName = bookmakerMeta.name;
                                            const isPolymarket = bookmakerMeta.slug === 'polymarket' || /poly\s*market/i.test(String(bet.bookmaker || ''));
                                            const logoUrl = isPolymarket ? '' : getBookmakerButtonUrl(bet.bookmaker);
                                            if (isPolymarket) {
                                                return (
                                                    <span className="track-bets-bookmaker-logo inline-flex h-7 w-[86px] items-center justify-center gap-1 overflow-hidden rounded-md border border-[#20242c] bg-[#111418] px-2 text-[10px] font-bold text-white shadow-sm">
                                                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-white/35 text-[9px] leading-none">◩</span>
                                                        <span>Polymarket</span>
                                                    </span>
                                                );
                                            }
                                            return logoUrl ? (
                                                <span className="track-bets-bookmaker-logo inline-flex h-7 w-[86px] items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
                                                    <img
                                                        src={logoUrl}
                                                        alt={bookmakerName}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover"
                                                        onError={(event) => {
                                                            event.currentTarget.style.display = 'none';
                                                            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                                            if (fallback) fallback.style.display = 'inline';
                                                        }}
                                                    />
                                                    <span className="hidden px-2 text-xs font-bold text-[#10b981]">{bookmakerName}</span>
                                                </span>
                                            ) : (
                                                <span className="track-bets-bookmaker-fallback inline-block rounded border border-[#10b981]/20 bg-[#10b981]/10 px-2 py-0.5 text-xs font-bold text-[#10b981]">
                                                    {bookmakerName}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="track-bets-col-status py-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            className={`track-bets-status-select appearance-none bg-transparent font-bold text-[0.95em] text-center outline-none cursor-pointer ${
                                                normalizeStatus(bet.status) === 'won' ? 'text-[#10b981]' :
                                                normalizeStatus(bet.status) === 'lost' ? 'text-red-500' :
                                                normalizeStatus(bet.status) === 'cashed_out' ? 'text-orange-500' :
                                                ['void', 'refund', 'refunded', 'push'].includes(normalizeStatus(bet.status)) ? 'text-yellow-500' :
                                                'text-gray-500'
                                            }`}
                                            value={normalizeStatus(bet.status)}
                                            onChange={(e) => handleStatusChange(bet, e.target.value)}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="won">Won</option>
                                            <option value="lost">Lost</option>
                                            <option value="half_win">Half Win</option>
                                            <option value="half_loss">Half Loss</option>
                                            <option value="void">Void</option>
                                            <option value="refund">Refund</option>
                                            <option value="cashed_out">Cashed Out</option>
                                        </select>
                                    </td>
                                    <td className="track-bets-col-stake py-4 align-middle text-right font-bold text-gray-600">
                                        {formatBankrollAmount(bet.stake !== undefined ? bet.stake : (bet.actual_stake !== undefined ? bet.actual_stake : (bet.units_staked || 0)), bankroll)}
                                    </td>
                                    <td className="track-bets-col-returns py-4 align-middle text-right text-[#121212] font-semibold">
                                        <NumberPop value={
                                            [normalizeStatus(bet.status), normalizeStatus(bet.result)].some(s => s === 'void' || s === 'refund' || s === 'refunded' || s === 'push') ? formatBankrollAmount(0, bankroll) :
                                            formatBankrollAmount(bet.profit_loss || bet.profitLoss || 0, bankroll, { signed: true })
                                        } />
                                    </td>
                                    <td className="track-bets-col-clv py-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                        {(() => {
                                            const betId = String(getBetId(bet));
                                            const storedClosingLine = bet.closing_line_odds ?? bet.closingLineOdds ?? '';
                                            const hasStoredClosingLine = storedClosingLine !== null
                                                && storedClosingLine !== undefined
                                                && String(storedClosingLine).trim() !== '';
                                            const cloFormatted = hasStoredClosingLine
                                                ? formatPrice(storedClosingLine)
                                                : '';
                                            const focused = clvFocusId === betId;
                                            const cloValue = focused
                                                ? (clvDraft[betId] ?? cloFormatted)
                                                : cloFormatted;
                                            return (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={cloValue}
                                                        onFocus={() => {
                                                            setClvFocusId(betId);
                                                            setClvDraft((d) => ({
                                                                ...d,
                                                                [betId]: cloFormatted || '',
                                                            }));
                                                        }}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setClvDraft((d) => ({ ...d, [betId]: v }));
                                                        }}
                                                        onBlur={(e) => {
                                                            setClvFocusId(null);
                                                            const v = e.target.value.trim();
                                                            // Skip no-op blur (same as stored formatted value)
                                                            const prevFmt = hasStoredClosingLine ? formatPrice(storedClosingLine) : '';
                                                            if (v === prevFmt || (v === '' && !hasStoredClosingLine)) {
                                                                setClvDraft((d) => {
                                                                    const next = { ...d };
                                                                    delete next[betId];
                                                                    return next;
                                                                });
                                                                return;
                                                            }
                                                            void handleCLVChange(bet, v);
                                                        }}
                                                        placeholder=""
                                                        title="Decimal, American (+150/-110), or fractional (5/2) - displayed in your bankroll odds format"
                                                        className="w-[80px] text-right bg-transparent font-bold text-[12px] text-[#121212] outline-none border-b border-transparent focus:border-[#10b981] transition-colors"
                                                    />
                                                </div>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                            {filteredBets.length === 0 && (
                                <tr className="track-bets-empty">
                                    <td className="px-6 py-16 text-center text-gray-500 font-semibold">
                                        No bets found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className="text-[12px] font-semibold text-gray-500">
                            {totalCount === 0 ? 'No bets' : `Showing ${pageStart}–${pageEnd} of ${totalCount}`}
                        </span>
                        <div className="relative">
                            <select
                                className="appearance-none bg-gray-50 border border-gray-200 text-[#121212] text-[12px] font-semibold rounded-lg pl-3 pr-8 py-1.5 outline-none focus:border-[#10b981] cursor-pointer"
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                            >
                                <option value={25}>25 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                                <option value={250}>250 / page</option>
                                <option value={0}>Show all</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    {pageSize > 0 && totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(page - 1)} disabled={page <= 1} className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-bold rounded-lg border border-gray-200 text-gray-600 hover:border-[#10b981] hover:text-[#10b981] disabled:opacity-40 disabled:pointer-events-none transition-colors"><ChevronLeft size={14} />Prev</button>
                            <span className="px-3 text-[12px] font-semibold text-gray-500">Page {page} of {totalPages}</span>
                            <button onClick={() => setCurrentPage(page + 1)} disabled={page >= totalPages} className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-bold rounded-lg border border-gray-200 text-gray-600 hover:border-[#10b981] hover:text-[#10b981] disabled:opacity-40 disabled:pointer-events-none transition-colors">Next<ChevronRight size={14} /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* Export modal */}
            {exportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-[18px] font-bold text-[#121212]">Export Bets</h2>
                            <button onClick={() => setExportModalOpen(false)} className="text-gray-400 hover:text-[#121212] transition-colors" aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div>
                                <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Format</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setExportTemplate('traditional')}
                                        className={`text-left px-3 py-2.5 rounded-xl border text-[13px] font-semibold transition-colors ${exportTemplate === 'traditional' ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                    >
                                        Traditional CSV
                                        <span className="block text-[10px] font-medium opacity-70">For other trackers</span>
                                    </button>
                                    <button
                                        onClick={() => setExportTemplate('proppr')}
                                        className={`text-left px-3 py-2.5 rounded-xl border text-[13px] font-semibold transition-colors ${exportTemplate === 'proppr' ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                    >
                                        Full CSV
                                        <span className="block text-[10px] font-medium opacity-70">Backup with all fields</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Bankrolls</label>
                                <div className="max-h-[220px] overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-[#10b981] focus:ring-[#10b981]"
                                            checked={exportBankrollOptions.length > 0 && exportBankrollOptions.every((b: any) => exportBankrollIds.has(b.id))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setExportBankrollIds(new Set(exportBankrollOptions.map((b: any) => b.id)));
                                                } else {
                                                    setExportBankrollIds(new Set());
                                                }
                                            }}
                                        />
                                        <span className="text-[13px] font-semibold text-[#121212]">Select all</span>
                                    </label>
                                    {exportBankrollOptions.map((br: any) => (
                                        <label key={br.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-[#10b981] focus:ring-[#10b981]"
                                                checked={exportBankrollIds.has(br.id)}
                                                onChange={(e) => {
                                                    const next = new Set(exportBankrollIds);
                                                    if (e.target.checked) next.add(br.id);
                                                    else next.delete(br.id);
                                                    setExportBankrollIds(next);
                                                }}
                                            />
                                            <span className="text-[13px] font-semibold text-[#121212]">{br.name || br.id}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setExportModalOpen(false)}
                                className="px-4 py-2 text-[13px] font-bold text-gray-600 hover:text-[#121212] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exporting || exportBankrollIds.size === 0}
                                className="px-5 py-2 rounded-xl bg-[#10b981] text-white text-[13px] font-extrabold hover:bg-[#0ea574] disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                                {exporting ? 'Exporting…' : `Export ${exportBankrollIds.size} bankroll${exportBankrollIds.size === 1 ? '' : 's'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}

// useSearchParams() requires a Suspense boundary since /track/bets is prerendered.
export default function BetsPage() {
    return (
        <Suspense fallback={null}>
            <BetsPageInner />
        </Suspense>
    );
}
