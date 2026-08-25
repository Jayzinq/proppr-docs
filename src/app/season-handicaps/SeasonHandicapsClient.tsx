'use client';

// Season Handicaps - /season-handicaps. The season-handicap outright (final league
// table with a per-team points handicap) is near-impossible to track by hand: this
// page merges the LIVE FotMob table with each bookmaker's handicaps and re-ranks by
// adjusted points (live points + handicap) as the season unfolds.
//
// Design language mirrors the proppr.io landing: shared <Header/>, zinc/emerald
// tokens, terminal-style cards (traffic-light dots), mono uppercase kickers.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Trophy } from 'lucide-react';
import { Header } from '@/components/layout/Header';

type TeamRow = {
    team: string;
    position: number | null;
    played: number; wins: number; draws: number; losses: number;
    gd: number; points: number;
    books: Record<string, { handicap: number; odds: number }>;
};
type League = {
    key: string; label: string; books: string[];
    tableUpdated: string | null; oddsUpdated: string | null;
    teams: TeamRow[];
};

function fmtWhen(s: string | null) {
    if (!s) return '-';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function SeasonHandicapsClient() {
    const [data, setData] = useState<{ leagues: League[] } | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [leagueKey, setLeagueKey] = useState<string>('');
    const [book, setBook] = useState<string>('');

    useEffect(() => {
        fetch('/api/season-handicaps', { cache: 'no-store' })
            .then(async (r) => {
                if (!r.ok) throw new Error('failed');
                const d = await r.json();
                setData(d);
                const first = d.leagues?.[0];
                if (first) {
                    setLeagueKey(first.key);
                    setBook(first.books?.[0] || '');
                }
                setState('ready');
            })
            .catch(() => setState('error'));
    }, []);

    const league = useMemo(() => data?.leagues.find((l) => l.key === leagueKey) || null, [data, leagueKey]);

    // Keep the bookmaker valid when switching league.
    useEffect(() => {
        if (league && !league.books.includes(book)) setBook(league.books[0] || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leagueKey]);

    const rows = useMemo(() => {
        if (!league || !book) return [];
        return league.teams
            .filter((t) => t.books[book])
            .map((t) => ({
                ...t,
                handicap: t.books[book].handicap,
                odds: t.books[book].odds,
                adjusted: t.points + t.books[book].handicap,
            }))
            .sort((a, b) => b.adjusted - a.adjusted || b.gd - a.gd || a.team.localeCompare(b.team));
    }, [league, book]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />

            {/* Hero */}
            <section className="relative overflow-hidden border-b border-white/5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]" />
                <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-6">
                    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-emerald-400">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        Live · {data?.leagues.length ?? '…'} leagues · tables updated {fmtWhen(league?.tableUpdated ?? null)}
                    </div>
                    <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
                        Season <span className="text-emerald-400">Handicaps</span>,<br className="hidden md:block" /> finally trackable
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
                        Bookmakers give every team a points head-start for the season - but nobody shows you the live
                        handicap table. This page applies each bookmaker&apos;s exact handicaps to the live standings.
                        The top of this table is the current winner of the <em>bet</em>, not the league.
                    </p>
                </div>
            </section>

            <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 md:px-6">
                {state === 'loading' && (
                    <div className="space-y-6" aria-busy="true" aria-label="Loading season handicap markets">
                        <div className="flex flex-wrap gap-1.5">
                            {[96, 148, 118].map((w) => (
                                <div key={w} className="h-9 animate-pulse rounded-md bg-white/5" style={{ width: w }} />
                            ))}
                        </div>
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                            <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                                <div className="h-3 w-3 rounded-full bg-white/10" />
                                <div className="h-3 w-3 rounded-full bg-white/10" />
                                <div className="h-3 w-3 rounded-full bg-white/10" />
                                <div className="ml-2 h-3 w-40 animate-pulse rounded bg-white/5" />
                            </div>
                            <div className="space-y-0 px-4 py-2 md:px-6">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 border-t border-white/5 py-3 first:border-t-0">
                                        <div className="h-3 w-5 animate-pulse rounded bg-white/5" />
                                        <div className="h-3 animate-pulse rounded bg-white/10" style={{ width: 120 + ((i * 37) % 80) }} />
                                        <div className="ml-auto h-3 w-10 animate-pulse rounded bg-white/5" />
                                        <div className="h-3 w-12 animate-pulse rounded bg-white/5" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {state === 'error' && (
                    <div className="py-20 text-center">
                        <p className="text-sm text-zinc-400">Couldn&apos;t load the markets.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/40 transition-colors hover:bg-emerald-500/10"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {state === 'ready' && data && (
                    <>
                        {/* League + bookmaker toggles */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-1.5">
                                {data.leagues.map((l) => (
                                    <button
                                        key={l.key}
                                        onClick={() => setLeagueKey(l.key)}
                                        className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${leagueKey === l.key ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/40' : 'text-zinc-400 ring-1 ring-white/10 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Bookmaker</span>
                                <div className="flex overflow-hidden rounded-md p-0.5 ring-1 ring-white/10">
                                    {(league?.books || []).map((b) => (
                                        <button
                                            key={b}
                                            onClick={() => setBook(b)}
                                            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${book === b ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Handicap table - landing terminal-card style */}
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                            <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                                <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                                <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
                                <span className="ml-2 font-mono text-xs text-zinc-600">
                                    {league?.label.toLowerCase().replace(/\s+/g, '-')} · {book.toLowerCase().replace(/\s+/g, '-')}
                                </span>
                                <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
                                    <Trophy className="h-3 w-3" /> odds updated {fmtWhen(league?.oddsUpdated ?? null)}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[680px] text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                                            <th className="px-4 py-2.5 md:px-6">#</th>
                                            <th className="px-3 py-2.5">Team</th>
                                            <th className="px-3 py-2.5 text-right">P</th>
                                            <th className="px-3 py-2.5 text-right">W-D-L</th>
                                            <th className="px-3 py-2.5 text-right">GD</th>
                                            <th className="px-3 py-2.5 text-right">Pts</th>
                                            <th className="px-3 py-2.5 text-right">Hcp</th>
                                            <th className="px-3 py-2.5 text-right">Adj</th>
                                            <th className="px-4 py-2.5 text-right md:px-6">Odds</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {rows.map((r, i) => (
                                            <tr key={r.team} className={`border-t border-white/5 transition-colors hover:bg-white/[0.03] ${i === 0 ? 'bg-emerald-500/[0.06]' : ''}`}>
                                                <td className={`px-4 py-2.5 font-mono text-xs md:px-6 ${i === 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>{i + 1}</td>
                                                <td className="px-3 py-2.5 font-medium text-zinc-200">
                                                    {r.team}
                                                    {i === 0 && <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-emerald-400">Leader</span>}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-zinc-500">{r.played}</td>
                                                <td className="px-3 py-2.5 text-right text-zinc-500">{r.wins}-{r.draws}-{r.losses}</td>
                                                <td className="px-3 py-2.5 text-right text-zinc-500">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                                                <td className="px-3 py-2.5 text-right font-semibold text-white">{r.points}</td>
                                                <td className={`px-3 py-2.5 text-right font-mono text-xs ${r.handicap > 0 ? 'text-emerald-400' : r.handicap < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                                    {r.handicap > 0 ? `+${r.handicap}` : r.handicap}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-bold text-white">{r.adjusted}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-400 md:px-6">{r.odds ? r.odds.toFixed(2) : '-'}</td>
                                            </tr>
                                        ))}
                                        {rows.length === 0 && (
                                            <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-zinc-500">No priced teams for this bookmaker yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Explainer */}
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                            <div className="font-mono text-xs uppercase tracking-widest text-emerald-400">How it works</div>
                            <h2 className="mt-2 text-lg font-semibold text-white">What is a season handicap?</h2>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
                                Back any team and it wins the bet if it tops the table <em>after</em> its handicap is added to its
                                final points total - favourites get +0, outsiders get big cushions. Each bookmaker sets its own
                                handicaps, so switching bookmaker above re-ranks the table. Tables refresh with our results
                                pipeline; handicaps and odds are captured per bookmaker.
                            </p>
                        </div>

                        {/* CTA - landing style */}
                        <div className="rounded-xl border border-emerald-500/20 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(16,185,129,0.1),transparent)] p-8 text-center">
                            <h2 className="text-xl font-bold text-white">Track your season handicap bets</h2>
                            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                                Log the bet once and Proppr Track keeps score for you - alongside every other bet you make.
                            </p>
                            <Link href="/track" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400">
                                Start tracking free <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
