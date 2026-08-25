'use client';

// Public bankroll performance page - /bankroll/<slug>. No auth; renders the payload
// from /api/bankroll/<slug>. Dark, on-brand, and deliberately NOT the rival's layout:
// hero header with a green accent bar, stat strip, equity curve + outcome donut,
// monthly bars + market edge table, latest bets, then the "Track your bets like this" CTA.

import { useEffect, useState } from 'react';
import {
    Activity, ArrowUpRight, BarChart3, CalendarDays, CircleDollarSign, Globe,
    LineChart as LineChartIcon, Send, Target, TrendingUp, Trophy, X as XIcon,
} from 'lucide-react';
import {
    Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
    ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { formatBankrollAmount, type BankrollLike } from '@/lib/utils';

const GREEN = '#10b981';
const RED = '#ef4444';
const GREY = '#64748b';

type Payload = any;

function fmtPct(v: number) {
    return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtRange(a: string | null, b: string | null) {
    const f = (s: string | null) =>
        s ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
    const from = f(a);
    return from ? `${from} - Today` : 'No settled bets yet';
}

const BETS_PAGE_SIZE = 12;

// 42-cell month grid (Mon-first), mirroring /track/analytics' profit calendar.
function calendarCells(month: Date, daily: Map<string, { profit: number; bets: number }>) {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return { date, key, inMonth: date.getMonth() === month.getMonth(), data: daily.get(key) || { profit: 0, bets: 0 } };
    });
}

export function PublicBankrollClient({ slug }: { slug: string }) {
    const [data, setData] = useState<Payload | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
    const [calMonth, setCalMonth] = useState<Date | null>(null);
    // Full settled history, paginated. Page 1 rides in the initial payload (`recent`);
    // later pages are fetched on demand from ?bets=1.
    const [betsPage, setBetsPage] = useState(1);
    const [betsRows, setBetsRows] = useState<any[] | null>(null);
    const [betsLoading, setBetsLoading] = useState(false);
    // Flat-stake lens (same as /track/analytics): server re-prices every bet to 1u.
    const [flatStake, setFlatStake] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (state === 'ready') setRefreshing(true);
        fetch(`/api/bankroll/${encodeURIComponent(slug)}${flatStake ? '?flat=1' : ''}`, { cache: 'no-store' })
            .then(async (r) => {
                if (!r.ok) throw new Error('missing');
                setData(await r.json());
                setState('ready');
                setBetsPage(1);
                setBetsRows(null);
            })
            .catch(() => setState((prev) => (prev === 'ready' ? prev : 'missing')))
            .finally(() => setRefreshing(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, flatStake]);

    const goToPage = async (page: number) => {
        setBetsPage(page);
        if (page === 1) { setBetsRows(null); return; } // page 1 is the payload's recent rows
        setBetsLoading(true);
        try {
            const r = await fetch(`/api/bankroll/${encodeURIComponent(slug)}?bets=1&page=${page}&pageSize=${BETS_PAGE_SIZE}${flatStake ? '&flat=1' : ''}`, { cache: 'no-store' });
            if (r.ok) setBetsRows((await r.json()).bets || []);
        } finally {
            setBetsLoading(false);
        }
    };

    if (state === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#070b10]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-[#10b981]" />
            </div>
        );
    }

    if (state === 'missing' || !data) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#070b10] px-6 text-center">
                <div className="text-[42px] font-black text-white/90">404</div>
                <p className="max-w-sm text-[14px] font-medium text-slate-400">
                    This bankroll page doesn&apos;t exist or its owner has set it to private.
                </p>
                <a href="https://proppr.io/track" className="mt-3 rounded-xl bg-[#10b981] px-5 py-2.5 text-[13px] font-bold text-[#06251b] hover:brightness-110 transition-all">
                    Track your own bets on Proppr
                </a>
            </div>
        );
    }

    const bk: BankrollLike = data.bankroll;
    const s = data.stats;
    const t = data.toggles || {};
    const donut = [
        { name: 'Won', value: s.wins, color: GREEN },
        { name: 'Lost', value: s.losses, color: RED },
        { name: 'Push', value: s.pushes, color: GREY },
    ].filter((d) => d.value > 0);
    const links = data.links || {};
    // A CTA with text but no URL falls back to the first social link - a configured
    // "Join my Telegram" button should never silently vanish just because the URL
    // field was left blank when the Telegram link says where to go.
    const ctaText = data.cta?.text || '';
    const ctaUrl = data.cta?.url || links.telegram || links.website || links.x || '';

    const statCards = [
        { label: 'Total Bets', value: String(s.totalBets), icon: Target, tone: 'text-white' },
        { label: 'Profit', value: formatBankrollAmount(s.profit, bk, { signed: true }), icon: TrendingUp, tone: s.profit >= 0 ? 'text-[#10b981]' : 'text-red-400' },
        { label: 'ROI', value: fmtPct(s.roi), icon: Activity, tone: s.roi >= 0 ? 'text-[#10b981]' : 'text-red-400' },
        { label: 'Win Rate', value: `${s.winRate.toFixed(1)}%`, icon: Trophy, tone: 'text-white' },
        { label: 'Avg Odds', value: s.avgOdds ? `@${s.avgOdds.toFixed(2)}` : '-', icon: BarChart3, tone: 'text-white' },
        ...(t.showClv && s.avgClv !== null ? [{ label: 'Avg CLV', value: fmtPct(s.avgClv), icon: LineChartIcon, tone: s.avgClv >= 0 ? 'text-[#10b981]' : 'text-red-400' }] : []),
    ];

    return (
        <div className="min-h-screen bg-[#070b10] font-sans text-slate-200 selection:bg-[#10b981] selection:text-[#06251b]">
            {/* Top utility bar - Proppr wordmark left, join-the-product right (app-header style) */}
            <div className="border-b border-white/5">
                <div className="mx-auto flex max-w-[1080px] items-center justify-between px-5 py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <a href="https://proppr.io"><img src="/proppr-logo-white.png" alt="Proppr" className="h-5 w-auto" /></a>
                    <a href="https://proppr.io/track" className="rounded-lg border border-dashed border-white/20 px-3.5 py-1.5 text-[12px] font-bold text-slate-300 hover:border-[#10b981] hover:text-[#34d399] transition-colors">
                        Track your bets
                    </a>
                </div>
            </div>

            {/* Hero - docs.proppr.io landing language: mono live ticker, heavy Outfit headline
                with the last word in brand green. Deliberately NOT an avatar-card header. */}
            <div className="border-b border-white/5 bg-gradient-to-b from-[#0b1420] to-[#070b10]">
                <div className="mx-auto max-w-[1080px] px-5 pb-9 pt-9">
                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#34d399]">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]" />
                        </span>
                        Live · Tracked on Proppr · {s.totalBets.toLocaleString()} bets graded
                    </div>
                    <h1
                        className="mt-3 text-[40px] font-black uppercase leading-[1.02] tracking-tight text-white sm:text-[52px]"
                        style={{ fontFamily: 'var(--font-outfit), var(--font-inter), sans-serif' }}
                    >
                        {data.name.trim().split(/\s+/).slice(0, -1).join(' ')}{' '}
                        <span className="text-[#10b981]">{data.name.trim().split(/\s+/).slice(-1)[0]}</span>
                    </h1>
                    {data.bio && <p className="mt-2 max-w-xl text-[15px] font-medium leading-relaxed text-slate-400">{data.bio}</p>}

                    <div className="mt-5 flex flex-wrap items-center gap-2.5">
                        {(ctaText && ctaUrl) && (
                            <a
                                href={ctaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-[#10b981] px-5 py-2.5 text-[13px] font-bold text-[#06251b] shadow-lg shadow-[#10b981]/25 hover:brightness-110 transition-all"
                            >
                                {ctaText} <ArrowUpRight size={15} />
                            </a>
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] font-bold text-slate-300 ring-1 ring-white/10">
                            {data.bankroll?.name || 'Bankroll'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] font-bold text-slate-300 ring-1 ring-white/10">
                            <CalendarDays size={12} className="text-[#34d399]" /> {fmtRange(s.firstDate, s.lastDate)}
                        </span>
                        {links.telegram && (
                            <a href={links.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] font-bold text-slate-300 ring-1 ring-white/10 hover:text-white transition-colors">
                                <Send size={12} /> Telegram
                            </a>
                        )}
                        {links.x && (
                            <a href={links.x} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] font-bold text-slate-300 ring-1 ring-white/10 hover:text-white transition-colors">
                                <XIcon size={12} /> X
                            </a>
                        )}
                        {links.website && (
                            <a href={links.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] font-bold text-slate-300 ring-1 ring-white/10 hover:text-white transition-colors">
                                <Globe size={12} /> Website
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-[1080px] space-y-5 px-5 py-8">
                {/* Staking lens - the analytics page's flat-stake toggle, viewer-flippable. */}
                <div className="flex items-center justify-end gap-2.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Staking</span>
                    <div className="flex overflow-hidden rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10">
                        <button
                            onClick={() => setFlatStake(false)}
                            className={`rounded-md px-3 py-1.5 text-[12px] font-bold transition-colors ${!flatStake ? 'bg-[#10b981] text-[#06251b]' : 'text-slate-400 hover:text-white'}`}
                        >
                            Actual
                        </button>
                        <button
                            onClick={() => setFlatStake(true)}
                            title="Every bet re-priced to a level 1u stake - pure edge, stake-sizing removed"
                            className={`rounded-md px-3 py-1.5 text-[12px] font-bold transition-colors ${flatStake ? 'bg-[#10b981] text-[#06251b]' : 'text-slate-400 hover:text-white'}`}
                        >
                            Flat 1u
                        </button>
                    </div>
                </div>

                {/* Stat strip - mirrors the /track/analytics cards: label left, icon in a soft
                    rounded box top-right, big number beneath. */}
                <div className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 lg:grid-cols-6 ${refreshing ? 'opacity-50' : ''}`}>
                    {statCards.map((card) => (
                        <div key={card.label} className="rounded-xl border border-white/5 bg-[#0b1420] p-4">
                            <div className="mb-2 flex items-start justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                                    <card.icon size={15} className="text-[#34d399]" />
                                </div>
                            </div>
                            <div className={`text-[22px] font-bold tracking-tight ${card.tone}`}>{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* Equity curve + donut */}
                {(t.equityCurve || t.summary) && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.65fr_1fr]">
                        {t.equityCurve && (
                            <div className="rounded-2xl border border-white/5 bg-[#0b1420] p-5">
                                <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#34d399]">- Performance</div>
                                <h2 className="text-[15px] font-bold text-white">Profit Trajectory</h2>
                                <p className="text-[12px] font-medium text-slate-500">Cumulative {formatBankrollAmount(0, bk).replace(/[\d.]/g, '') === 'u' ? 'units' : 'profit'}, every settled bet</p>
                                <div className="mt-3 h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.curve} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="pbEquity" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid stroke="#16202e" strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} stroke="#475569" minTickGap={40} />
                                            <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="#475569" />
                                            <RechartsTooltip contentStyle={{ background: '#0b1420', borderRadius: 10, border: '1px solid #1e293b', color: '#e2e8f0' }} />
                                            <Area type="monotone" dataKey="profit" stroke={GREEN} strokeWidth={2.5} fill="url(#pbEquity)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                        {t.summary && (
                            <div className="rounded-2xl border border-white/5 bg-[#0b1420] p-5">
                                <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#34d399]">- Results</div>
                                <h2 className="text-[15px] font-bold text-white">Outcomes</h2>
                                <p className="text-[12px] font-medium text-slate-500">{s.totalBets} settled bets</p>
                                <div className="relative mt-2 h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={donut} dataKey="value" innerRadius={62} outerRadius={84} paddingAngle={3} strokeWidth={0}>
                                                {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="text-[26px] font-black text-white">{s.winRate.toFixed(1)}%</div>
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Win rate</div>
                                    </div>
                                </div>
                                <div className="mt-2 flex justify-center gap-4 text-[12px] font-semibold">
                                    <span className="text-[#34d399]">● Won {s.wins}</span>
                                    <span className="text-red-400">● Lost {s.losses}</span>
                                    {s.pushes > 0 && <span className="text-slate-400">● Push {s.pushes}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Daily profit calendar + market edge */}
                {(t.monthlyResults || t.marketBreakdown) && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {t.monthlyResults && (() => {
                            const dailyMap = new Map<string, { profit: number; bets: number }>(
                                (data.daily || []).map((d: any) => [d.date, { profit: d.profit, bets: d.bets }]),
                            );
                            const lastActive = s.lastDate ? new Date(s.lastDate + 'T00:00:00') : new Date();
                            const firstActive = s.firstDate ? new Date(s.firstDate + 'T00:00:00') : lastActive;
                            const month = calMonth || new Date(lastActive.getFullYear(), lastActive.getMonth(), 1);
                            const cells = calendarCells(month, dailyMap);
                            const monthProfit = cells.filter((c) => c.inMonth).reduce((sum, c) => sum + c.data.profit, 0);
                            const canPrev = month > new Date(firstActive.getFullYear(), firstActive.getMonth(), 1);
                            const canNext = month < new Date(lastActive.getFullYear(), lastActive.getMonth(), 1);
                            return (
                                <div className="rounded-2xl border border-white/5 bg-[#0b1420] p-5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#34d399]">- Daily form</div>
                                            <h2 className="text-[15px] font-bold text-white">
                                                {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                            </h2>
                                            <p className="text-[12px] font-medium text-slate-500">
                                                Daily profit calendar · month {formatBankrollAmount(monthProfit, bk, { signed: true })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setCalMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                                                disabled={!canPrev}
                                                aria-label="Previous month"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 ring-1 ring-white/10 hover:text-white disabled:opacity-30"
                                            >
                                                ‹
                                            </button>
                                            <button
                                                onClick={() => setCalMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                                                disabled={!canNext}
                                                aria-label="Next month"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 ring-1 ring-white/10 hover:text-white disabled:opacity-30"
                                            >
                                                ›
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase tracking-wider text-slate-600">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}
                                    </div>
                                    <div className="mt-1 grid grid-cols-7 gap-1">
                                        {cells.map((c) => {
                                            const active = c.data.bets > 0;
                                            const bg = !active
                                                ? 'bg-white/[0.03] text-slate-700'
                                                : c.data.profit > 0
                                                    ? 'bg-[#10b981] text-[#06251b]'
                                                    : c.data.profit < 0
                                                        ? 'bg-red-500/90 text-white'
                                                        : 'bg-amber-400/90 text-[#3a2b00]';
                                            return (
                                                <div key={c.key} className={`aspect-[1.15] rounded-md p-1 text-left ${bg} ${c.inMonth ? '' : 'opacity-30'}`}>
                                                    <div className="text-[10px] font-bold">{c.date.getDate()}</div>
                                                    {active && (
                                                        <div className="truncate text-[10px] font-black">
                                                            {c.data.profit > 0 ? '+' : ''}{c.data.profit.toFixed(1)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 flex gap-2 text-[11px] font-bold">
                                        <span className="rounded-lg bg-[#10b981]/10 px-2.5 py-1 text-[#34d399]">Green: profit</span>
                                        <span className="rounded-lg bg-red-500/10 px-2.5 py-1 text-red-400">Red: loss</span>
                                        <span className="rounded-lg bg-white/5 px-2.5 py-1 text-slate-500">Blank: no bets</span>
                                    </div>
                                </div>
                            );
                        })()}
                        {t.marketBreakdown && (
                            <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0b1420]">
                                <div className="p-5 pb-3">
                                    <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#34d399]">- Where the edge is</div>
                                <h2 className="text-[15px] font-bold text-white">Market Edge</h2>
                                    <p className="text-[12px] font-medium text-slate-500">Where the profit comes from</p>
                                </div>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            <th className="px-5 py-2">Market</th>
                                            <th className="px-3 py-2 text-right">Bets</th>
                                            <th className="px-3 py-2 text-right">Profit</th>
                                            <th className="px-5 py-2 text-right">ROI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px]">
                                        {(data.markets || []).map((m: any) => (
                                            <tr key={m.market} className="border-t border-white/5">
                                                <td className="max-w-[180px] truncate px-5 py-2.5 font-semibold text-slate-200">{m.market}</td>
                                                <td className="px-3 py-2.5 text-right font-medium text-slate-400">{m.bets}</td>
                                                <td className={`px-3 py-2.5 text-right font-bold ${m.profit >= 0 ? 'text-[#34d399]' : 'text-red-400'}`}>{formatBankrollAmount(m.profit, bk, { signed: true })}</td>
                                                <td className={`px-5 py-2.5 text-right font-bold ${m.roi >= 0 ? 'text-[#34d399]' : 'text-red-400'}`}>{fmtPct(m.roi)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Settled bet history - full record, paginated */}
                {t.recentBets && (data.recent || []).length > 0 && (() => {
                    const totalPages = Math.max(1, Math.ceil(s.totalBets / BETS_PAGE_SIZE));
                    const rows = betsPage === 1 ? data.recent : (betsRows || []);
                    const from = (betsPage - 1) * BETS_PAGE_SIZE + 1;
                    const to = Math.min(betsPage * BETS_PAGE_SIZE, s.totalBets);
                    return (
                        <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0b1420]">
                            <div className="flex items-center justify-between p-5 pb-3">
                                <div>
                                    <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#34d399]">- Every settled bet</div>
                                <h2 className="text-[15px] font-bold text-white">Bet History</h2>
                                    <p className="text-[12px] font-medium text-slate-500">Every settled bet, newest first</p>
                                </div>
                                <span className="text-[11px] font-bold text-slate-500">{from}–{to} of {s.totalBets}</span>
                            </div>
                            <div className={`overflow-x-auto transition-opacity ${betsLoading ? 'opacity-40' : ''}`}>
                                <table className="w-full min-w-[640px] text-left">
                                    <thead>
                                        <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            <th className="px-5 py-2">Date</th>
                                            <th className="px-3 py-2">Match</th>
                                            <th className="px-3 py-2">Selection</th>
                                            {t.showStakes && <th className="px-3 py-2 text-right">Stake</th>}
                                            <th className="px-3 py-2 text-right">Odds</th>
                                            <th className="px-5 py-2 text-right">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px]">
                                        {rows.map((b: any, i: number) => (
                                            <tr key={`${betsPage}-${i}`} className="border-t border-white/5">
                                                <td className="whitespace-nowrap px-5 py-2.5 font-medium text-slate-400">
                                                    {b.date ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                                                </td>
                                                <td className="max-w-[200px] truncate px-3 py-2.5 font-semibold text-slate-200">{b.match}</td>
                                                <td className="max-w-[220px] truncate px-3 py-2.5 font-medium text-slate-300">{b.selection}</td>
                                                {t.showStakes && <td className="px-3 py-2.5 text-right font-medium text-slate-400">{b.stake ? formatBankrollAmount(b.stake, bk) : '-'}</td>}
                                                <td className="px-3 py-2.5 text-right font-medium text-slate-400">{b.odds ? b.odds.toFixed(2) : '-'}</td>
                                                <td className={`px-5 py-2.5 text-right font-bold ${b.profit > 0 ? 'text-[#34d399]' : b.profit < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                    {formatBankrollAmount(b.profit, bk, { signed: true })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-white/5 px-5 py-3">
                                    <button
                                        onClick={() => goToPage(betsPage - 1)}
                                        disabled={betsPage <= 1 || betsLoading}
                                        className="rounded-lg bg-white/5 px-4 py-2 text-[12px] font-bold text-slate-300 ring-1 ring-white/10 transition-colors hover:text-white disabled:opacity-30"
                                    >
                                        ← Previous
                                    </button>
                                    <span className="text-[12px] font-bold text-slate-500">Page {betsPage} of {totalPages}</span>
                                    <button
                                        onClick={() => goToPage(betsPage + 1)}
                                        disabled={betsPage >= totalPages || betsLoading}
                                        className="rounded-lg bg-white/5 px-4 py-2 text-[12px] font-bold text-slate-300 ring-1 ring-white/10 transition-colors hover:text-white disabled:opacity-30"
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Open bets - only present when the owner opted OUT of settled-only */}
                {(data.pending || []).length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0b1420]">
                        <div className="flex items-center gap-2 p-5 pb-3">
                            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                            <h2 className="text-[15px] font-bold text-white">Open Bets</h2>
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Live positions</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-left">
                                <thead>
                                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-5 py-2">Date</th>
                                        <th className="px-3 py-2">Match</th>
                                        <th className="px-3 py-2">Selection</th>
                                        {t.showStakes && <th className="px-3 py-2 text-right">Stake</th>}
                                        <th className="px-5 py-2 text-right">Odds</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13px]">
                                    {data.pending.map((b: any, i: number) => (
                                        <tr key={i} className="border-t border-white/5">
                                            <td className="whitespace-nowrap px-5 py-2.5 font-medium text-slate-400">
                                                {b.date ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '-'}
                                            </td>
                                            <td className="max-w-[200px] truncate px-3 py-2.5 font-semibold text-slate-200">{b.match}</td>
                                            <td className="max-w-[220px] truncate px-3 py-2.5 font-medium text-slate-300">{b.selection}</td>
                                            {t.showStakes && <td className="px-3 py-2.5 text-right font-medium text-slate-400">{b.stake ? formatBankrollAmount(b.stake, bk) : '-'}</td>}
                                            <td className="px-5 py-2.5 text-right font-medium text-amber-300">{b.odds ? b.odds.toFixed(2) : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Track-your-bets CTA */}
                <div className="rounded-2xl border border-[#10b981]/20 bg-gradient-to-b from-[#10b981]/10 to-transparent p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10b981]/15 text-[#10b981] ring-1 ring-[#10b981]/30">
                        <CircleDollarSign size={22} />
                    </div>
                    <h2 className="mt-4 text-[20px] font-black text-white">Track your bets like this</h2>
                    <p className="mx-auto mt-1 max-w-md text-[13px] font-medium text-slate-400">
                        Proppr tracks and grades every bet automatically - from Telegram, CSV or paste - and builds a
                        verified public page for your bankroll.
                    </p>
                    <a
                        href="https://proppr.io/track"
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#10b981] px-6 py-3 text-[14px] font-bold text-[#06251b] shadow-lg shadow-[#10b981]/25 hover:brightness-110 transition-all"
                    >
                        Start tracking free <ArrowUpRight size={16} />
                    </a>
                </div>

                <div className="pb-6 pt-2 text-center text-[12px] font-semibold text-slate-600">
                    Powered by <a href="https://proppr.io" className="text-slate-400 hover:text-[#34d399] transition-colors">Proppr</a>
                </div>
            </div>
        </div>
    );
}
