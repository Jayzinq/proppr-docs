'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
    Check, TrendingUp, TrendingDown, Calendar, ArrowRight,
    Percent, Target, Award, CircleCheck, CircleAlert, Activity,
} from 'lucide-react';
import { betInBankrollView, abbreviateWomenInBet } from '@/lib/utils';
import { formatOddsDisplay, getActiveOddsFormat, oddsPlaceholder, oddsToDecimal } from '@/lib/odds';

function normalizeStatus(value: any) {
    return String(value || 'pending').toLowerCase().replace(/\s+/g, '_');
}

const SETTLED_STATUSES = ['won', 'lost', 'void', 'cashed_out', 'half_won', 'half_lost'];

// Closing-line value (CLV) for a decimal-odds back bet: taken/closing - 1. Positive means
// you took a bigger price than the market closed at - you BEAT the closing line.
function computeClvStats(bets: any[]) {
    let capturedSettled = 0;
    let missing = 0;
    const clvs: number[] = [];
    for (const b of bets) {
        const isSettled = SETTLED_STATUSES.includes(normalizeStatus(b.status));
        const closing = oddsToDecimal(b.closing_line_odds ?? b.closingLineOdds, 'decimal');
        const taken = oddsToDecimal(b.odds ?? b.display_odds ?? b.displayOdds, 'decimal');
        const hasClosing = closing > 1;
        if (hasClosing && taken > 1) {
            clvs.push((taken / closing - 1) * 100);
            if (isSettled) capturedSettled++;
        } else if (isSettled) {
            missing++;
        }
    }
    const captured = clvs.length;
    const beaten = clvs.filter((c) => c > 0.0001);
    const missed = clvs.filter((c) => c < -0.0001);
    const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    return {
        captured,
        missing,
        coverage: capturedSettled + missing ? (capturedSettled / (capturedSettled + missing)) * 100 : 0,
        avgClv: avg(clvs),
        beaten: beaten.length,
        missedCount: missed.length,
        beatRate: captured ? (beaten.length / captured) * 100 : 0,
        avgBeat: avg(beaten),
        avgMiss: avg(missed),
        bestClv: clvs.length ? Math.max(...clvs) : 0,
        worstClv: clvs.length ? Math.min(...clvs) : 0,
    };
}

type Tone = 'pos' | 'neg' | 'neutral';

// Matches the analytics-page KPI card (rounded-xl / icon chip / 24px value).
function StatCard({ label, value, sub, tone = 'neutral', icon: Icon }: {
    label: string; value: string; sub?: string; tone?: Tone;
    icon?: any;
}) {
    const toneClass = tone === 'pos' ? 'text-[#10b981]' : tone === 'neg' ? 'text-red-500' : 'text-[#121212]';
    return (
        <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                {Icon && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                        <Icon size={16} className={toneClass} />
                    </div>
                )}
            </div>
            <div className={`text-[24px] font-bold tracking-tight tabular-nums ${toneClass}`}>{value}</div>
            {sub && <div className="mt-0.5 text-[12px] font-medium text-gray-400 truncate">{sub}</div>}
        </div>
    );
}

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

// Does a chunk of market/selection text describe a PLAYER prop? Imported multis rarely carry a
// per-leg player_name (it's usually ""), so the player identity lives in the market/selection
// text - "Anytime Goalscorer", "Omar Marmoush 1+ Shots on Target", "Player Assists". This is a
// text classifier calibrated against the live corpus: it must fire on player markets but NOT on
// team/match markets, which the same corpus labels with "Total …", "Team …", "Match Result",
// "Full Time Result", "Handicap", "Corners", "Total Cards". Notably "shots" is player UNLESS
// prefixed by total/team ("Total Shots"/"Team Shots" are match/team totals), and bare "goals"
// is team unless it's the "N+ Goals" goalscorer form.
const looksLikePlayerMarket = (text: string): boolean => {
    const t = String(text || '').toLowerCase();
    if (!t) return false;
    // "To Score 2+", "To Score Or Assist", "X to score" - player. But NOT "Both Teams To Score".
    if (/\bto score\b/.test(t) && !/both teams to score|teams to score|team to score/.test(t)) return true;
    if (/scorer|\bany\s?time/.test(t)) return true;                    // (Anytime/First) Goalscorer, "Any Time"
    if (/\bplayer\b/.test(t)) return true;                             // Player Assists / Shots / to be Booked …
    if (/goalkeeper|\bsaves\b/.test(t)) return true;
    if (/fouls?\s+(won|committed)/.test(t)) return true;              // NOT bare "fouls" (Total Fouls is team)
    if (/\bassists?\b/.test(t)) return true;                          // no team "assists" market exists
    if (/\brebounds?\b|\bthrees?\b/.test(t)) return true;             // NBA player props
    if (/points\s*\+|\+\s*assists|\+\s*rebounds/.test(t)) return true; // "Player Points+Assists+Rebounds"
    if (/\b[uo]\d+(\.\d+)?\s*(pa|pr|par|pra|pts|reb|ast)\b/.test(t)) return true; // "U19.5 PA", "O4.5 REB"
    if (/\bbooked\b|\bcarded\b/.test(t)) return true;                 // player card props; no team "booked" market
    if (/\d\s*\+\s*goals?\b/.test(t)) return true;                    // "Haaland 2+ Goals" (NOT "Over 2.5 Goals")
    if (/\bshots?\b/.test(t) && !/\btotal\b|\bteam\b/.test(t)) return true; // player shots; excludes Total/Team Shots
    return false;
};

// stat_type that is UNAMBIGUOUSLY a player stat - a backstop for text-less imports ("Fouls
// treble"). Deliberately excludes shots/cards/corners/goals: the corpus shows those stat_types
// on team bets too (Total Cards, Asian Total Corners, Total Shots, Over 2.5 Goals accas).
const PLAYER_STAT_TYPES = new Set(['assists', 'fouls_won', 'fouls_committed', 'passes']);

// A leg of a multi is a player prop when it carries a real per-leg player_name OR its own
// market/selection text reads as a player market.
const legIsPlayerProp = (sel: any): boolean => {
    const playerName = String(sel?.player_name || '').trim();
    if (playerName && playerName !== 'Unknown Player' && playerName !== 'Unknown') return true;
    return looksLikePlayerMarket(`${sel?.market || sel?.market_type || ''} ${sel?.selection || ''}`);
};

// Player props are the biggest CLV blank (most aren't trackable for closing lines), so a toggle
// can drop them from the summary. A bet is excluded when it is a player-prop SINGLE (form's
// "Player Props" bet type, or a market named "Player …") OR a multi/bet-builder where EVEN ONE
// leg is a player prop - a "Team Result + Anytime Goalscorer" builder is still untrackable, so
// it must drop too. Detection spans structured legs, the top-level selection/description text,
// and a player-only stat_type, because imported multis expose their legs in different shapes.
// A multi / parlay / accumulator / bet-builder. CLV is a per-single-selection metric - a
// parlay has no single closing line (the backend's backfill_bets also skips multi_bet_selections)
// - so these are excluded from the closing-lines page ENTIRELY, toggle or no toggle.
const isMultiBet = (bet: any): boolean => {
    const betType = String(bet?.bet_type || bet?.betType || '').toLowerCase();
    const market = String(bet?.market || bet?.market_type || '').toLowerCase();
    if (betType === 'multiple' || bet?.is_multiple || bet?.is_multi_bet) return true;
    if (Array.isArray(bet?.multi_bet_selections) && bet.multi_bet_selections.length > 0) return true;
    return /multi-?bet|accumulator|\bacca\b|bet builder|parlay|fold|treble|\d+\s*-?\s*leg/.test(market);
};

const isPlayerPropBet = (bet: any) => {
    const betType = String(bet?.bet_type || bet?.betType || '').toLowerCase();
    const market = String(bet?.market || bet?.market_type || '').toLowerCase();
    if (betType === 'player' || market.startsWith('player')) return true;
    if (!isMultiBet(bet)) return false;

    const legs = bet?.multi_bet_selections;
    if (Array.isArray(legs) && legs.length > 0 && legs.some(legIsPlayerProp)) return true;
    // No usable structured legs (imported multis often store everything in the selection string).
    if (looksLikePlayerMarket(bet?.selection) || looksLikePlayerMarket(bet?.multi_bet_description)) return true;
    return !!bet?.stat_type && PLAYER_STAT_TYPES.has(String(bet.stat_type));
};

// Markets Pinnacle does NOT price at team/match level. OddsPapi's authoritative markets_dict
// (football) covers goals, CORNERS and CARDS/BOOKINGS at team/match level - but NOT throw-ins,
// free-kicks, goal-kicks, offsides, fouls, tackles, passes, shots or saves. Bets on those can
// never receive an automatic closing line, so a second toggle drops them from the coverage
// denominator too. NB: corners and cards/bookings are deliberately absent here - they ARE
// Pinnacle markets and must stay counted.
const looksLikeNonPinnacleMarket = (text: string): boolean => {
    const t = String(text || '').toLowerCase();
    if (!t) return false;
    if (/throw|free\s*-?\s*kick|goal\s*-?\s*kick/.test(t)) return true;   // throw-ins / free-kicks / goal-kicks
    if (/\boffsides?\b/.test(t)) return true;                             // team/total offsides (only a player prop on Pinnacle)
    if (/\bfouls?\b/.test(t)) return true;                               // Total Fouls (player fouls handled by the player filter)
    if (/\btackles?\b/.test(t)) return true;
    if (/\bpasses\b/.test(t)) return true;
    if (/\bshots?\b/.test(t)) return true;                              // no team/match shots market on Pinnacle
    if (/\bsaves?\b/.test(t)) return true;
    if (/\binterceptions?\b|\bclearances?\b|\bpossession\b/.test(t)) return true;
    return false;
};

const legIsNonPinnacle = (sel: any): boolean =>
    looksLikeNonPinnacleMarket(`${sel?.market || sel?.market_type || ''} ${sel?.selection || ''}`);

// Mirror of isPlayerPropBet: a bet is non-Pinnacle when its own market/selection reads as an
// unpriced team stat, or (for a multi/builder) ANY leg does.
const isNonPinnacleBet = (bet: any): boolean => {
    if (looksLikeNonPinnacleMarket(`${bet?.market || bet?.market_type || ''} ${bet?.selection || ''}`)) return true;
    const legs = bet?.multi_bet_selections;
    if (Array.isArray(legs) && legs.length > 0 && legs.some(legIsNonPinnacle)) return true;
    return looksLikeNonPinnacleMarket(bet?.multi_bet_description);
};

export default function ClosingLinesPage() {
    const [bets, setBets] = useState<any[]>([]);
    const [allBets, setAllBets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [clvInputs, setClvInputs] = useState<Record<string, string>>({});
    const [page, setPage] = useState(0);
    const [hidePlayerProps, setHidePlayerProps] = useState(false);
    const [hideNonPinnacle, setHideNonPinnacle] = useState(false);

    // Render one page at a time - a bankroll can have 20k+ settled bets missing CLV, and
    // mounting them all at once is what makes this page crawl.
    const PAGE_SIZE = 50;

    const loadData = async () => {
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            const betsData = await api.bets.getUserBetsLite(Number(userId));
            const allUserBets = betsData.bets || [];

            // Scope to the ACTIVE bankroll, exactly like the Bets page - otherwise this page
            // shows settled bets from every bankroll (orphan bets -> Personal).
            let activeId = 'personal';
            let knownIds: Set<string> | null = null;
            try {
                activeId = localStorage.getItem('active_bankroll_id') || 'personal';
                const bkData = await api.bankrolls.get(Number(userId));
                knownIds = new Set((bkData.bankrolls || []).map((b: any) => String(b.id)));
            } catch { /* fall back to unscoped ids */ }
            const userBets = allUserBets
                .filter((bet: any) => betInBankrollView(bet, activeId, knownIds))
                // Multis/parlays can never carry a single closing line - drop them from the CLV
                // page entirely so they don't inflate the "missing" count or the denominator.
                .filter((bet: any) => !isMultiBet(bet));
            // Whole active-bankroll view drives the CLV summary (coverage/avg/beat rate) -
            // it needs the captured-CLV bets too, not just the ones still missing.
            setAllBets(userBets);

            // Filter: settled bets (won, lost, void, cashed_out, half_won, half_lost)
            // without closing_line_odds or closingLineOdds
            const settledStatuses = ['won', 'lost', 'void', 'cashed_out', 'half_won', 'half_lost'];
            
            const missingCLV = userBets.filter((bet: any) => {
                const status = normalizeStatus(bet.status);
                const isSettled = settledStatuses.includes(status);
                const hasCLV = !!(bet.closingLineOdds || bet.closing_line_odds);
                return isSettled && !hasCLV;
            });

            // Sort by event date or tracked_at descending (newest first)
            missingCLV.sort((a: any, b: any) => {
                const dA = a.tracked_at || a.created_at || 0;
                const dB = b.tracked_at || b.created_at || 0;
                const timeA = typeof dA === 'object' && dA.$date ? new Date(dA.$date).getTime() : new Date(dA).getTime();
                const timeB = typeof dB === 'object' && dB.$date ? new Date(dB.$date).getTime() : new Date(dB).getTime();
                return timeB - timeA;
            });

            setBets(missingCLV);
            setPage(0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const onBankrollChange = () => loadData();
        window.addEventListener('bankroll_changed', onBankrollChange);
        return () => window.removeEventListener('bankroll_changed', onBankrollChange);
    }, []);

    const handleSave = async (bet: any) => {
        const userId = localStorage.getItem('telegram_user_id');
        const betId = bet.bet_id || bet._id || bet.id;
        const newCLV = clvInputs[betId];

        if (!userId || !betId || !newCLV?.trim()) return;

        setSavingId(betId);

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
            if (!res.ok) throw new Error('Failed to save CLV');

            // On success, remove from the list
            setBets((prev) => prev.filter((b) => (b.bet_id || b._id || b.id) !== betId));
            
            // Clear input
            setClvInputs((prev) => {
                const next = { ...prev };
                delete next[betId];
                return next;
            });

        } catch (e) {
            console.error(e);
            alert('Failed to save closing line odds.');
        } finally {
            setSavingId(null);
        }
    };

    // Hooks must run on every render - keep useMemo above the early `loading` return so
    // hook order stays stable (React crashes if a hook is skipped between renders).
    const visibleAllBets = useMemo(
        () => allBets.filter((b) => !(hidePlayerProps && isPlayerPropBet(b))
            && !(hideNonPinnacle && isNonPinnacleBet(b))),
        [allBets, hidePlayerProps, hideNonPinnacle]);
    const stats = useMemo(() => computeClvStats(visibleAllBets), [visibleAllBets]);
    const hasClvData = stats.captured > 0 || stats.missing > 0;
    // Counts excluded by each toggle (for the labels), independent of toggle state.
    const playerPropCount = useMemo(() => allBets.filter(isPlayerPropBet).length, [allBets]);
    const nonPinnacleCount = useMemo(() => allBets.filter(isNonPinnacleBet).length, [allBets]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin h-8 w-8 border-4 border-[#10b981] border-t-transparent rounded-full" />
            </div>
        );
    }

    const visibleBets = bets.filter((b) => !(hidePlayerProps && isPlayerPropBet(b))
        && !(hideNonPinnacle && isNonPinnacleBet(b)));
    const totalPages = Math.max(1, Math.ceil(visibleBets.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pageStart = safePage * PAGE_SIZE;
    const pageBets = visibleBets.slice(pageStart, pageStart + PAGE_SIZE);

    // Two stat rails flank the list on desktop; on mobile they collapse into one grid above it.
    const leftStats = [
        { label: 'CLV coverage', value: `${stats.coverage.toFixed(0)}%`,
          sub: `${stats.captured.toLocaleString()} of ${(stats.captured + stats.missing).toLocaleString()} settled`,
          icon: Percent, tone: 'neutral' as Tone },
        { label: 'Odds added', value: stats.captured.toLocaleString(),
          sub: 'closing odds recorded', icon: CircleCheck, tone: 'pos' as Tone },
        { label: 'Missing', value: stats.missing.toLocaleString(),
          sub: 'awaiting closing odds', icon: CircleAlert,
          tone: (stats.missing > 0 ? 'neg' : 'neutral') as Tone },
        { label: 'Avg CLV', value: fmtPct(stats.avgClv), sub: 'taken vs closing', icon: Activity,
          tone: (stats.avgClv > 0.0001 ? 'pos' : stats.avgClv < -0.0001 ? 'neg' : 'neutral') as Tone },
    ];
    const rightStats = [
        { label: 'Beat rate', value: `${stats.beatRate.toFixed(0)}%`,
          sub: `${stats.beaten.toLocaleString()} of ${stats.captured.toLocaleString()} priced`,
          icon: Target, tone: (stats.beatRate >= 50 ? 'pos' : 'neutral') as Tone },
        { label: 'Beat close', value: stats.beaten.toLocaleString(),
          sub: stats.avgBeat ? `avg +${stats.avgBeat.toFixed(2)}%` : 'bets over closing',
          icon: TrendingUp, tone: 'pos' as Tone },
        { label: 'Lost to close', value: stats.missedCount.toLocaleString(),
          sub: stats.avgMiss ? `avg ${stats.avgMiss.toFixed(2)}%` : 'bets under closing',
          icon: TrendingDown, tone: (stats.missedCount > 0 ? 'neg' : 'neutral') as Tone },
        { label: 'Best CLV', value: fmtPct(stats.bestClv), sub: 'biggest edge', icon: Award,
          tone: (stats.bestClv > 0.0001 ? 'pos' : 'neutral') as Tone },
    ];

    const listBody = visibleBets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-[#10b981]" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
                    <p className="text-gray-500 mt-2">All your settled bets have closing lines recorded.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {pageBets.map(abbreviateWomenInBet).map((bet) => {
                        const betId = bet.bet_id || bet._id || bet.id;
                        const match = bet.match || bet.fixture_name || bet.searchEvent || 'Unknown Event';
                        const selection = bet.selection || bet.player_name || bet.team || 'Unknown Selection';
                        const market = bet.market || 'Unknown Market';
                        const activeOddsFormat = getActiveOddsFormat();
                        const odds = formatOddsDisplay(bet, activeOddsFormat) || '-';
                        
                        let displayDate = '-';
                        const d = bet.date || bet.event_date || bet.eventDate || bet.tracked_at || bet.created_at;
                        if (d) {
                            try {
                                const t = typeof d === 'object' && d.$date ? d.$date : d;
                                displayDate = new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                            } catch (e) {}
                        }

                        const status = normalizeStatus(bet.status);
                        const isWon = status === 'won' || status === 'half_won';
                        const isLost = status === 'lost' || status === 'half_lost';

                        return (
                            <div key={betId} className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${
                                            isWon ? 'bg-emerald-50 text-emerald-600' :
                                            isLost ? 'bg-red-50 text-red-600' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {status.replace('_', ' ')}
                                        </span>
                                        <span className="flex items-center text-xs font-semibold text-gray-400 gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {displayDate}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-base md:text-lg leading-tight truncate">
                                        {selection}
                                    </h3>
                                    <p className="text-sm font-medium text-gray-500 mt-0.5 truncate flex items-center gap-1.5">
                                        <span>{market}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span className="text-gray-400">{match}</span>
                                    </p>
                                </div>
                                
                                <div className="flex flex-row items-center gap-4 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0 shrink-0">
                                    <div className="text-right flex flex-col justify-center">
                                        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Taken @</div>
                                        <div className="font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 tabular-nums inline-block">
                                            {odds}
                                        </div>
                                    </div>
                                    
                                    <div className="text-gray-300 shrink-0 hidden md:block">
                                        <ArrowRight strokeWidth={2} />
                                    </div>

                                    <div className="flex flex-col flex-1 md:flex-none">
                                        <div className="text-[11px] font-semibold text-[#10b981] uppercase tracking-wide mb-1">Closing Odds</div>
                                        <div className="flex gap-2 relative">
                                            <input 
                                                type="text" 
                                                placeholder={oddsPlaceholder(activeOddsFormat)}
                                                value={clvInputs[betId] || ''}
                                                onChange={(e) => setClvInputs({ ...clvInputs, [betId]: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSave(bet);
                                                }}
                                                className="w-24 md:w-28 text-sm font-bold text-gray-900 bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all tabular-nums"
                                            />
                                            <button 
                                                onClick={() => handleSave(bet)}
                                                disabled={savingId === betId || !(clvInputs[betId]?.trim())}
                                                className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:hover:bg-[#10b981] text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                            >
                                                {savingId === betId ? '...' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-4 mt-2 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={safePage === 0}
                                className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                ← Prev
                            </button>
                            <span className="text-sm font-semibold text-gray-500 tabular-nums">
                                {safePage + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={safePage >= totalPages - 1}
                                className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            );

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <TrendingUp className="text-[#10b981]" />
                    Closing Lines
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Systematically add missing closing lines to your settled bets.
                </p>
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800 max-w-3xl">
                    <CircleAlert className="w-4 h-4 mt-[1px] shrink-0" />
                    <span>
                        Automatic closing lines are currently only captured for <strong>events after January 2026</strong> and <strong>non&#8209;player&#8209;prop</strong> markets. Older events and player props won&apos;t auto&#8209;populate&nbsp;- add those manually below.
                    </span>
                </div>
                {playerPropCount > 0 && (
                    <label className="mt-3 inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={hidePlayerProps}
                            onChange={(e) => { setHidePlayerProps(e.target.checked); setPage(0); }}
                            className="peer sr-only"
                        />
                        <span className="relative h-5 w-9 rounded-full bg-gray-200 transition-colors peer-checked:bg-[#10b981] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
                        <span className="text-[12px] font-semibold text-gray-600">
                            Exclude player props <span className="text-gray-400 font-medium">({playerPropCount.toLocaleString()})</span>
                        </span>
                    </label>
                )}
                {nonPinnacleCount > 0 && (
                    <label className="mt-3 sm:ml-4 inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={hideNonPinnacle}
                            onChange={(e) => { setHideNonPinnacle(e.target.checked); setPage(0); }}
                            className="peer sr-only"
                        />
                        <span className="relative h-5 w-9 rounded-full bg-gray-200 transition-colors peer-checked:bg-[#10b981] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
                        <span className="text-[12px] font-semibold text-gray-600">
                            Exclude non&#8209;Pinnacle markets <span className="text-gray-400 font-medium">({nonPinnacleCount.toLocaleString()})</span>
                        </span>
                    </label>
                )}
                {visibleBets.length > 0 && (
                    <p className="text-gray-400 text-xs mt-2 font-medium">
                        {visibleBets.length.toLocaleString()} settled {visibleBets.length === 1 ? 'bet' : 'bets'} missing closing odds
                        {totalPages > 1 && <> · page {safePage + 1} of {totalPages}</>}
                    </p>
                )}
            </div>

            {hasClvData ? (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[15rem_minmax(0,1fr)_15rem]">
                    {/* left rail (desktop) */}
                    <aside className="hidden xl:flex flex-col gap-4">
                        {leftStats.map((c) => <StatCard key={c.label} {...c} />)}
                    </aside>
                    {/* both rails collapsed above the list (mobile/tablet) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:hidden">
                        {[...leftStats, ...rightStats].map((c) => <StatCard key={c.label} {...c} />)}
                    </div>
                    {/* center list */}
                    <div className="min-w-0">
                        {listBody}
                    </div>
                    {/* right rail (desktop) */}
                    <aside className="hidden xl:flex flex-col gap-4">
                        {rightStats.map((c) => <StatCard key={c.label} {...c} />)}
                    </aside>
                </div>
            ) : (
                <div className="max-w-3xl">
                    {listBody}
                </div>
            )}
        </div>
    );
}
