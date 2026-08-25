'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ImageIcon, ArrowRight, TrendingUp, Activity, BarChart2, History as HistoryIcon, PieChart as PieChartIcon, Coins as CoinsIcon, Target as TargetIcon, Wallet, LockKeyhole, Banknote, Eye, EyeOff } from 'lucide-react';
import { Area, AreaChart, BarChart, Bar, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { NumberPop, SlidingTabs } from '@/components/transitions/Motion';
import { betInBankrollView, formatBankrollAmount, formatBankrollTick, bankrollUnitLabel, type BankrollLike } from '@/lib/utils';
import { oddsToDecimal, formatOddsDisplay, normalizeOddsFormat } from '@/lib/odds';

function numericOdds(value: any) {
    return oddsToDecimal(value);
}

function oddsFmt(): string {
    try {
        return normalizeOddsFormat(localStorage.getItem('active_bankroll_odds_format'));
    } catch {
        return 'decimal';
    }
}

const MONTHLY_START_BANKROLL = 100;

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

// Prefer fixture kickoff over when the slip was posted - matches the Bets table.
function betDateValue(bet: any) {
    // kickoff_utc is the canonical instant - beats wall-clock reconstruction when present.
    const ku = bet?.kickoff_utc || bet?.kickoffUtc;
    if (ku) {
        const d = new Date(ku);
        if (!Number.isNaN(d.getTime())) return d;
    }
    let eventDate = bet.date || bet.event_date || bet.eventDate || bet.fixture_date || bet.fixtureDate || bet.kickoff_date;
    let eventTime = bet.time || bet.event_time || bet.eventTime || bet.fixture_time || bet.fixtureTime || bet.kickoff_time;

    if (!eventDate && bet.multi_bet_selections && Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 0) {
        eventDate = bet.multi_bet_selections[0].date || bet.multi_bet_selections[0].event_date || bet.multi_bet_selections[0].eventDate;
        eventTime = bet.multi_bet_selections[0].time || bet.multi_bet_selections[0].event_time || bet.multi_bet_selections[0].eventTime;
    }

    const eventTs = parseEventDateTime(eventDate, eventTime);
    if (eventTs !== null) return new Date(eventTs);

    const fallback = unwrapDateValue(bet.tracked_at || bet.created_at);
    if (!fallback) return null;
    const date = new Date(fallback);
    return Number.isNaN(date.getTime()) ? null : date;
}

function betDateTimestamp(bet: any) {
    return betDateValue(bet)?.getTime() ?? 0;
}

function stakeUnits(bet: any) {
    return Number(bet.stake ?? bet.actual_stake ?? bet.units_staked ?? bet.recommended_stake ?? 0) || 0;
}

function statusKey(bet: any) {
    return String(bet.status || 'pending').toLowerCase().replace(/\s+/g, '_');
}

function profitLossUnits(bet: any) {
    const stored = Number(bet.profit_loss || 0);
    if (stored !== 0) return stored;
    const stake = stakeUnits(bet);
    const odds = numericOdds(bet.odds) || 1;
    const status = statusKey(bet);
    if (status === 'won') return stake * (odds - 1);
    if (status === 'lost') return -stake;
    if (status === 'half_win') return (stake * (odds - 1)) / 2;
    if (status === 'half_loss') return -(stake / 2);
    return 0;
}

function isSettledBet(bet: any) {
    return statusKey(bet) !== 'pending';
}

function isWonBet(bet: any) {
    const status = statusKey(bet);
    return status === 'won' || status === 'half_win';
}

function isLostBet(bet: any) {
    const status = statusKey(bet);
    return status === 'lost' || status === 'half_loss';
}

function isNeutralBet(bet: any) {
    return ['refund', 'refunded', 'void', 'push'].includes(statusKey(bet));
}

function belongsToBankroll(bet: any, bankrollId: string, knownIds?: Set<string> | null) {
    return betInBankrollView(bet, bankrollId, knownIds);
}

function timeframeStart(timeframe: string, now = new Date()) {
    if (timeframe === '24H') {
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    if (timeframe === '7D') {
        const past = new Date(now);
        past.setDate(now.getDate() - 7);
        return past;
    }
    if (timeframe === '1M') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (timeframe === '3M') {
        const past = new Date(now);
        past.setMonth(now.getMonth() - 3);
        return past;
    }
    if (timeframe === 'YTD') return new Date(now.getFullYear(), 0, 1);
    if (timeframe === '12M') {
        const past = new Date(now);
        past.setFullYear(now.getFullYear() - 1);
        return past;
    }
    return null;
}

function monthlyBankrollStats(bets: any[]) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let monthlyProfit = 0;
    let openStake = 0;
    let settledCount = 0;
    let openCount = 0;

    for (const bet of bets) {
        const status = statusKey(bet);
        if (status === 'pending') {
            const pendingDate = betDateValue(bet);
            if (pendingDate && pendingDate >= monthStart && pendingDate < nextMonthStart) {
                openStake += stakeUnits(bet);
                openCount += 1;
            }
            continue;
        }
        const d = betDateValue(bet);
        if (d && d >= monthStart && d < nextMonthStart) {
            monthlyProfit += profitLossUnits(bet);
            settledCount += 1;
        }
    }

    const currentBankroll = MONTHLY_START_BANKROLL + monthlyProfit;
    return {
        startBankroll: MONTHLY_START_BANKROLL,
        monthlyProfit,
        currentBankroll,
        openStake,
        availableBankroll: currentBankroll - openStake,
        settledCount,
        openCount,
        monthLabel: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
    };
}

export default function TrackDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [allBets, setAllBets] = useState<any[]>([]);
    const [activeBankrollId, setActiveBankrollId] = useState('personal');
    const [activeBankrollName, setActiveBankrollName] = useState('Personal');
    const [activeBankroll, setActiveBankroll] = useState<BankrollLike>(null);
    const [knownBankrollIds, setKnownBankrollIds] = useState<Set<string>>(new Set());
    
    const [timeframe, setTimeframe] = useState('ALL');
    const [unitSize, setUnitSize] = useState(50);
    // Dashboard bankroll tracker card (Current Bank / Remaining / Open Stake / Month P/L)
    const [showBankrollCard, setShowBankrollCard] = useState(true);

    const [needsAuth, setNeedsAuth] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('dashboard_hide_bankroll_card');
            if (raw === '1' || raw === 'true') setShowBankrollCard(false);
        } catch {
            /* ignore */
        }
    }, []);

    const toggleBankrollCard = () => {
        setShowBankrollCard((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('dashboard_hide_bankroll_card', next ? '0' : '1');
            } catch {
                /* ignore */
            }
            return next;
        });
    };

    const loadData = () => {
        const userId = localStorage.getItem('telegram_user_id');
        const bankrollId = localStorage.getItem('active_bankroll_id') || 'personal';
        setActiveBankrollId(bankrollId);
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

        api.bets.getUserBetsLite(Number(userId)).then((betsData) => {
            const userBets = betsData.bets || [];
            
            const sorted = [...userBets].sort((a: any, b: any) => {
                const dateA = a.tracked_at || a.created_at;
                const dateB = b.tracked_at || b.created_at;
                if (!dateA) return 1;
                if (!dateB) return -1;
                let tA = typeof dateA === 'object' && dateA.$date ? dateA.$date : dateA;
                let tB = typeof dateB === 'object' && dateB.$date ? dateB.$date : dateB;
                return new Date(tB).getTime() - new Date(tA).getTime();
            });
            setAllBets(sorted);
            setLoading(false);
        }).catch(e => {
            console.error(e);
            setLoading(false);
        });
    };

    const syncActiveBankroll = async () => {
        const bankrollId = localStorage.getItem('active_bankroll_id') || 'personal';
        setActiveBankrollId(bankrollId);

        const userId = localStorage.getItem('telegram_user_id');
        if (!userId) {
            setActiveBankrollName(bankrollId === 'personal' ? 'Personal' : bankrollId);
            return;
        }

        try {
            const data = await api.bankrolls.get(Number(userId));
            setKnownBankrollIds(new Set((data.bankrolls || []).map((item: any) => String(item.id))));
            const bankroll = data.bankrolls?.find((item: any) => String(item.id) === String(bankrollId));
            setActiveBankroll(bankroll || { id: bankrollId, name: bankrollId === 'personal' ? 'Personal' : bankrollId, type: 'units', currency: 'u' });
            setActiveBankrollName(bankroll?.name || (bankrollId === 'personal' ? 'Personal' : bankrollId));
            try {
                localStorage.setItem(
                    'active_bankroll_odds_format',
                    normalizeOddsFormat(bankroll?.odds_format),
                );
            } catch { /* ignore */ }
        } catch (e) {
            console.error(e);
            setActiveBankroll({ id: bankrollId, name: bankrollId === 'personal' ? 'Personal' : bankrollId, type: 'units', currency: 'u' });
            setActiveBankrollName(bankrollId === 'personal' ? 'Personal' : bankrollId);
        }
    };

    useEffect(() => {
        loadData();
        syncActiveBankroll();
        const handleBankrollChange = () => {
            syncActiveBankroll();
        };
        window.addEventListener('bankroll_changed', handleBankrollChange);
        return () => window.removeEventListener('bankroll_changed', handleBankrollChange);
    }, [router]);

    const bankrollBets = useMemo(() => allBets.filter((bet) => belongsToBankroll(bet, activeBankrollId, knownBankrollIds)), [allBets, activeBankrollId, knownBankrollIds]);

    const bets = useMemo(() => {
        if (timeframe === 'ALL') return bankrollBets;
        const past = timeframeStart(timeframe);
        if (!past) return bankrollBets;

        return bankrollBets.filter((bet) => {
            const d = betDateValue(bet);
            return d ? d >= past : false;
        });
    }, [bankrollBets, timeframe]);

    const { chartData, monthlyData, wonBets, lostBets, settledBets, totalProfit, totalStaked } = useMemo(() => {
        const chronologicalBets = [...bets].sort((a: any, b: any) => betDateTimestamp(a) - betDateTimestamp(b));
        
        let cumulative = 0; let staked = 0; let w = 0; let l = 0; let s = 0;
        const monthlyMap = new Map();
        
        const now = new Date();
        const startLimit = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        let earliestDate = new Date();
        
        if (chronologicalBets.length > 0) {
            earliestDate = betDateValue(chronologicalBets[0]) || earliestDate;
        }
        
        // Always show 12 months
        const actualStart = startLimit;
        const iter = new Date(actualStart.getFullYear(), actualStart.getMonth(), 1);
        const endIter = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Pre-fill the last up-to-12 months
        while (iter <= endIter) {
            // Using "MMM 'YY" ensures no collisions if exactly 12 months span the same month name,
            // but the user's previous chart just used short month. We'll stick to short month as they only span 12 max.
            const mStr = iter.toLocaleString('default', { month: 'short' });
            // Let's append year if we want to be super safe: iter.toLocaleString('default', { month: 'short', year: '2-digit' })
            // Wait, let's just use short month to match their "Dec" requirement.
            monthlyMap.set(mStr, 0);
            iter.setMonth(iter.getMonth() + 1);
        }
        
        const validMonths = Array.from(monthlyMap.keys());
        
        const data = chronologicalBets.filter(isSettledBet).map((bet) => {
            const pl = profitLossUnits(bet);
            cumulative += pl;
            staked += stakeUnits(bet);
            s++;
            if (isWonBet(bet)) w++;
            else if (isLostBet(bet)) l++;

            // Monthly agg
            const d = betDateValue(bet);
            let month = 'Unknown';
            let name = 'Unknown';
            if (d) {
                month = d.toLocaleString('default', { month: 'short' });
                name = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                // Only add to the chart if it's within the 12-month pre-filled window
                if (d >= startLimit && monthlyMap.has(month)) {
                    monthlyMap.set(month, monthlyMap.get(month) + pl);
                }
            }

            return {
                name,
                value: Number(cumulative.toFixed(2)),
            };
        });
        
        const mData = validMonths.map(month => ({
            month, value: Number(monthlyMap.get(month).toFixed(2))
        }));

        return {
            chartData: [{ name: 'Start', value: 0 }, ...data],
            monthlyData: mData,
            wonBets: w, lostBets: l, settledBets: s, totalProfit: cumulative, totalStaked: staked
        };
    }, [bets]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#10b981] rounded-full animate-spin"></div>
            </div>
        );
    }

    const resolvedBets = wonBets + lostBets;
    const winRate = resolvedBets > 0 ? Number(((wonBets / resolvedBets) * 100).toFixed(1)) : 0;
    const yieldPct = totalStaked > 0 ? ((totalProfit / totalStaked) * 100).toFixed(2) : '0.00';
    const roc = totalStaked > 0 ? (totalProfit / (totalStaked * 0.1) * 100).toFixed(1) : '0.0';
    const oddsSample = bets.map((b) => numericOdds(b.odds)).filter(Boolean);
    const avgOdds = oddsSample.length > 0 ? (oddsSample.reduce((acc, value) => acc + value, 0) / oddsSample.length).toFixed(2) : '0.00';
    const monthlyBankroll = monthlyBankrollStats(bankrollBets);

    const donutData = [
        { name: 'Won', value: winRate, color: '#10b981' },
        { name: 'Lost', value: 100 - winRate, color: '#e5e7eb' },
    ];

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
                            Connect your Telegram account to view your live betting dashboard, track your bankroll, and auto-sync your bets.
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
            
            <div className={`max-w-[1400px] mx-auto space-y-4 animate-in fade-in duration-700 ${needsAuth ? 'opacity-50 pointer-events-none select-none overflow-hidden h-[80vh]' : ''}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-[32px] font-bold text-[#121212] tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-[14px] text-gray-500 font-medium mt-1">
                        {activeBankrollName} · Updated {new Date().toLocaleTimeString()} · {bets.length === bankrollBets.length ? `${bankrollBets.length} bets` : `${bets.length} of ${bankrollBets.length} bets`}
                    </p>
                </div>
                <SlidingTabs
                    value={timeframe}
                    onChange={setTimeframe}
                    className="rounded-xl"
                    buttonClassName="h-9 px-3"
                    items={[
                        { id: '24H', label: '24H' },
                        { id: '7D', label: '7D' },
                        { id: '1M', label: '1M' },
                        { id: '3M', label: '3M' },
                        { id: 'YTD', label: 'YTD' },
                        { id: '12M', label: '12M' },
                        { id: 'ALL', label: 'All' },
                    ]}
                />
            </div>



            {/* Monthly Bankroll Tracker - can be hidden via the eye toggle (persists in localStorage) */}
            {showBankrollCard ? (
                <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Wallet size={18} className="text-[#10b981] shrink-0" />
                                <h2 className="text-[18px] font-bold text-[#121212]">{activeBankrollName} Bankroll</h2>
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">{monthlyBankroll.monthLabel}</span>
                                <button
                                    type="button"
                                    onClick={toggleBankrollCard}
                                    className="ml-auto lg:ml-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-[#121212] hover:border-gray-300 transition-colors"
                                    title="Hide bankroll section"
                                    aria-label="Hide bankroll section"
                                >
                                    <EyeOff size={14} />
                                    Hide
                                </button>
                            </div>
                            <p className="mt-1 text-[13px] font-medium text-gray-500">
                                Starts at {formatBankrollAmount(monthlyBankroll.startBankroll, activeBankroll)}. Settled P/L changes the bank; open stakes reduce available {bankrollUnitLabel(activeBankroll)}.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[620px]">
                            {[
                                { label: 'Current Bank', value: formatBankrollAmount(monthlyBankroll.currentBankroll, activeBankroll), icon: Banknote, tone: monthlyBankroll.currentBankroll >= monthlyBankroll.startBankroll ? 'text-[#10b981]' : 'text-red-500' },
                                { label: 'Remaining', value: formatBankrollAmount(monthlyBankroll.availableBankroll, activeBankroll), icon: Wallet, tone: monthlyBankroll.availableBankroll >= 0 ? 'text-[#121212]' : 'text-red-500' },
                                { label: 'Open Stake', value: formatBankrollAmount(monthlyBankroll.openStake, activeBankroll), icon: LockKeyhole, tone: 'text-amber-500' },
                                { label: 'Month P/L', value: formatBankrollAmount(monthlyBankroll.monthlyProfit, activeBankroll, { signed: true }), icon: TrendingUp, tone: monthlyBankroll.monthlyProfit >= 0 ? 'text-[#10b981]' : 'text-red-500' },
                            ].map((item) => (
                                <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{item.label}</span>
                                        <item.icon size={15} className={item.tone} />
                                    </div>
                                    <div className={`mt-1 text-[20px] font-bold tracking-tight ${item.tone}`}>
                                        <NumberPop value={item.value} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="track-card-motion flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-2.5">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500 min-w-0">
                        <Wallet size={16} className="text-gray-400 shrink-0" />
                        <span className="truncate">{activeBankrollName} bankroll section hidden</span>
                    </div>
                    <button
                        type="button"
                        onClick={toggleBankrollCard}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-bold text-[#121212] hover:border-[#10b981] hover:text-[#10b981] transition-colors shrink-0"
                        title="Show bankroll section"
                        aria-label="Show bankroll section"
                    >
                        <Eye size={14} />
                        Show bankroll
                    </button>
                </div>
            )}

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                {[
                    { label: 'Total Profit', value: formatBankrollAmount(totalProfit, activeBankroll, { signed: true }), icon: TrendingUp, color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
                    { label: 'Yield', value: `${totalProfit > 0 ? '+' : ''}${yieldPct}%`, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Win Rate', value: `${winRate}%`, icon: PieChartIcon, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: 'Turnover', value: formatBankrollAmount(totalStaked, activeBankroll), icon: CoinsIcon, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { label: 'Avg Odds', value: `@${avgOdds}`, icon: TargetIcon, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                    { label: 'Sample Size', value: settledBets, icon: HistoryIcon, color: 'text-gray-500', bg: 'bg-gray-100' }
                ].map((m, i) => (
                    <div key={i} className="bg-[#ffffff] border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between overflow-hidden">
                        <div className="flex justify-between items-start mb-3">
                            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide truncate pr-2">
                                {m.label}
                            </div>
                            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${m.bg}`}>
                                <m.icon size={16} className={m.color} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="text-[24px] font-bold text-[#121212] tracking-tight truncate">
                            <NumberPop value={m.value} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Cumulative P/L Area Chart */}
                <div className="lg:col-span-2 bg-[#ffffff] border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-[18px] font-bold text-[#121212]">Cumulative P/L</h3>
                            <p className="text-[13px] text-gray-500 font-medium">Trajectory over selected period</p>
                        </div>
                        <div className="text-[20px] font-bold text-[#121212]">
                            {formatBankrollAmount(totalProfit, activeBankroll, { signed: true })}
                        </div>
                    </div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatBankrollTick(Number(value), activeBankroll)} dx={-10} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#121212', borderColor: '#121212', borderRadius: '8px', color: '#ffffff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: 'none' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart & Monthly */}
                <div className="flex flex-col gap-4">
                    {/* Win Rate Donut */}
                    <div className="bg-[#ffffff] border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-center relative">
                        <h3 className="text-[16px] font-bold text-[#121212] mb-2">Outcome Summary</h3>
                        <div className="h-[180px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {donutData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#121212', borderColor: '#121212', borderRadius: '8px', color: '#ffffff' }}
                                        itemStyle={{ color: '#ffffff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[28px] font-bold text-[#121212]">{winRate}%</span>
                                <span className="text-[12px] font-medium text-gray-500">Won</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 px-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
                                <span className="text-[13px] font-semibold text-[#121212]">Won <span className="text-gray-500 font-medium ml-1">{wonBets}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-gray-200"></div>
                                <span className="text-[13px] font-semibold text-[#121212]">Lost <span className="text-gray-500 font-medium ml-1">{lostBets}</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Monthly Results & Open Positions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Monthly Results */}
                <div className="bg-[#ffffff] border border-gray-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-[16px] font-bold text-[#121212] mb-6">Monthly Results</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                                <RechartsTooltip 
                                    cursor={{ fill: '#ffffff' }}
                                    contentStyle={{ backgroundColor: '#121212', borderColor: '#121212', borderRadius: '8px', color: '#ffffff' }}
                                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" fill="#121212" radius={[4, 4, 0, 0]}>
                                    {
                                        monthlyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#121212' : '#eb4444'} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Open Positions Table */}
                <div className="lg:col-span-2 bg-[#ffffff] border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-[16px] font-bold text-[#121212]">Recent Activity</h3>
                        <Link href="/track/bets" className="text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            View All
                        </Link>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3 font-semibold">Match</th>
                                    <th className="px-4 py-3 font-semibold">Selection</th>
                                    <th className="px-4 py-3 font-semibold text-right">Odds</th>
                                    <th className="px-4 py-3 font-semibold text-right">Stake</th>
                                    <th className="px-4 py-3 font-semibold text-right">Result</th>
                                </tr>
                            </thead>
                            <tbody className="text-[14px]">
                                {bets.slice(0, 6).map((bet: any, i) => (
                                    <tr
                                        key={i}
                                        onClick={() => { if (bet.bet_id) router.push(`/track/bets?editId=${encodeURIComponent(bet.bet_id)}`); }}
                                        title={bet.bet_id ? 'Open bet editor' : undefined}
                                        className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors ${bet.bet_id ? 'cursor-pointer' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#121212]">
                                                {(() => {
                                                    let m = bet.fixture_name || bet.match || bet.search_event || 'Event';
                                                    if (typeof m === 'string') {
                                                        m = m.replace(/\s+multi-bet$/i, '').replace(/\s+accumulator$/i, '').replace(/\s+bet builder$/i, '');
                                                    }
                                                    return m;
                                                })()}
                                            </div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">{(() => {
                                                const d = betDateValue(bet);
                                                if (!d) return 'Unknown Date';
                                                const eventTime = bet.time || bet.event_time || bet.eventTime;
                                                const dateLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                                                return eventTime ? `${dateLabel} ${eventTime}` : dateLabel;
                                            })()}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#121212]">
                                                {(() => {
                                                    const betTypeLower = String(bet.bet_type || '').toLowerCase();
                                                    const marketLower = String(bet.market || '').toLowerCase();
                                                    const combinedText = `${marketLower} ${String(bet.market_direction || '').toLowerCase()} ${String(bet.threshold || '').toLowerCase()} ${String(bet.selection || '').toLowerCase()}`;
                                                    const isMulti = betTypeLower === 'multiple' || bet.is_multiple || combinedText.includes('multi-bet') || combinedText.includes('accumulator') || combinedText.includes('bet builder') || combinedText.includes('multi');
                                                    if (isMulti) {
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
                                                            } else {
                                                                if (legs.length >= 2) {
                                                                    maxSels = legs.length;
                                                                    numMatches = 1;
                                                                }
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
                                                                } else {
                                                                    numMatches = bet.multi_bet_selections.length;
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
                                                    const s = bet.selection || bet.player_name || bet.team;
                                                    if (!s || s === 'Unknown Player' || s === 'Unknown') return 'Unknown Selection';
                                                    return s;
                                                })()}
                                            </div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">
                                                {(() => {
                                                    const betTypeLower = String(bet.bet_type || '').toLowerCase();
                                                    const marketLower = String(bet.market || '').toLowerCase();
                                                    const combinedText = `${marketLower} ${String(bet.market_direction || '').toLowerCase()} ${String(bet.threshold || '').toLowerCase()} ${String(bet.selection || '').toLowerCase()}`;
                                                    const isMulti = betTypeLower === 'multiple' || bet.is_multiple || combinedText.includes('multi-bet') || combinedText.includes('accumulator') || combinedText.includes('bet builder') || combinedText.includes('multi');
                                                    if (isMulti) {
                                                        if (!bet.multi_bet_selections || !Array.isArray(bet.multi_bet_selections) || bet.multi_bet_selections.length === 0) {
                                                            if (bet.multi_bet_description) {
                                                                const lowerDesc = bet.multi_bet_description.toLowerCase();
                                                                const isPlayer = lowerDesc.includes('player') || lowerDesc.includes('sot') || lowerDesc.includes('shots') || lowerDesc.includes('foul') || lowerDesc.includes('assist') || lowerDesc.includes('goalscorer') || lowerDesc.includes('tackle');
                                                                const isTeam = lowerDesc.includes('team') || lowerDesc.includes('match') || lowerDesc.includes('result') || lowerDesc.includes('corner') || lowerDesc.includes('card') || lowerDesc.includes('handicap');
                                                                
                                                                if (isPlayer && isTeam) return 'Mixed';
                                                                if (isPlayer) return 'Player Props';
                                                                if (isTeam) return 'Team Props';
                                                                return 'Mixed';
                                                            }
                                                            return 'Mixed';
                                                        }
                                                        let hasPlayer = false;
                                                        let hasTeam = false;
                                                        bet.multi_bet_selections.forEach((sel: any) => {
                                                            const mLower = String(sel.market || '').toLowerCase();
                                                            const isPlayerMarket = mLower.includes('player') || mLower.includes('sot') || mLower.includes('shots') || mLower.includes('goalscorer') || mLower.includes('assist') || mLower.includes('foul') || mLower.includes('tackle') || mLower.includes('pass');
                                                            const isTeamMarket = mLower.includes('team') || mLower.includes('match') || mLower.includes('result') || mLower.includes('corner') || mLower.includes('card') || mLower.includes('handicap') || mLower.includes('goals') || mLower.includes('both teams');
                                                            const hasPlayerName = sel.player_name && sel.player_name !== 'Unknown Player' && sel.player_name !== 'Unknown';
                                                            
                                                            if (isPlayerMarket || hasPlayerName) {
                                                                hasPlayer = true;
                                                            } else if (isTeamMarket) {
                                                                hasTeam = true;
                                                            } else {
                                                                hasTeam = true;
                                                            }
                                                        });
                                                        if (hasPlayer && !hasTeam) return 'Player Props';
                                                        if (!hasPlayer && hasTeam) return 'Team Props';
                                                        return 'Mixed';
                                                    }
                                                    let md = bet.market_direction || '';
                                                    if (typeof md === 'string') {
                                                        const lmd = md.toLowerCase();
                                                        if (lmd === 'positive' || lmd === 'plus') md = '+';
                                                        else if (lmd === 'negative' || lmd === 'minus') md = '-';
                                                    }
                                                    
                                                    let thresh = bet.threshold || '';
                                                    let prefix = '';
                                                    if (md && thresh) {
                                                        prefix = (md === '+' || md === '-') ? `${md}${thresh}` : `${md} ${thresh}`;
                                                    } else if (md) {
                                                        prefix = md;
                                                    } else if (thresh) {
                                                        prefix = thresh;
                                                    }
                                                    
                                                    let m = [prefix, bet.market].filter(Boolean).join(' ');
                                                    if (!m) m = bet.market || 'Unknown Market';
                                                    
                                                    return m.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-[#121212]">
                                            {formatOddsDisplay(bet, oddsFmt()) || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-600">
                                            {formatBankrollAmount(
                                                bet.stake !== undefined && bet.stake !== 0
                                                    ? bet.stake
                                                    : (bet.units_staked !== undefined && bet.units_staked !== 0
                                                        ? bet.units_staked
                                                        : (bet.actual_stake || 0)),
                                                activeBankroll,
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-bold ${
                                                bet.status === 'won' ? 'bg-[#10b981]/20 text-green-700' :
                                                bet.status === 'lost' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {bet.status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {bets.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                                            No bets found. Paste a slip to begin tracking.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}
