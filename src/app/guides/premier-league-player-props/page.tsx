"use client";

import { motion } from "framer-motion";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { BookOpen, ArrowLeft, Target, TrendingUp, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PremierLeaguePlayerProps() {
    return (
        <DocsLayout>
            <div className="relative">

            <main className="flex-1 relative z-10">
                {/* Hero */}
                <section className="max-w-4xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Link href="/guides" className="inline-flex items-center gap-2 text-zinc-500 hover:text-purple-400 text-sm mb-8 transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Guides
                        </Link>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <span className="text-purple-400 font-mono text-[10px] uppercase tracking-widest font-bold">Premier League</span>
                                <span className="text-zinc-600 mx-2">·</span>
                                <span className="text-zinc-500 text-xs">7 min read</span>
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-white leading-[0.95] tracking-tight uppercase mb-6">
                            How Premier League<br />
                            <span className="text-purple-500">Player Props Work</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
                            A complete guide to the markets, strategies, and edge opportunities.
                        </p>
                    </motion.div>
                </section>

                {/* Content */}
                <section className="max-w-4xl mx-auto px-4 md:px-6 pb-20">
                    <article className="prose prose-invert prose-zinc max-w-none">

                        <h2 className="text-2xl font-black text-white mt-12 mb-4 uppercase tracking-tight">What Are Player Props?</h2>
                        <p className="text-zinc-400 mb-4">
                            Player prop bets focus on individual player performance rather than match outcome. Instead of betting on Arsenal to win, you bet on Saka to have 2+ shots on target.
                        </p>
                        <p className="text-zinc-400 mb-8">
                            The Premier League offers the deepest player prop markets of any football league. Here&apos;s what you need to know.
                        </p>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">The Major Markets</h2>

                        <div className="space-y-6 mb-12">
                            {[
                                {
                                    title: "Anytime Goalscorer",
                                    desc: "The most popular player prop market. Bet on a player to score at any point during the match. Own goals don't count.",
                                    tips: [
                                        "Look beyond strikers - midfielders crashing the box offer value",
                                        "Set pieces matter: corner threat players at good prices",
                                        "Late subs (super subs) are undervalued by bookmakers",
                                    ],
                                    color: "bg-emerald-500/10 border-emerald-500/20"
                                },
                                {
                                    title: "Shots on Target",
                                    desc: "A player's shot that would go in without a save or block. Crossbar/post doesn't count. Typically offered as Over/Under lines (1.5, 2.5, etc.)",
                                    tips: [
                                        "High-volume shooters have more consistent lines",
                                        "Position affects shot quality - central players get cleaner looks",
                                        "Game state matters: trailing teams shoot more",
                                    ],
                                    color: "bg-blue-500/10 border-blue-500/20"
                                },
                                {
                                    title: "Total Shots",
                                    desc: "All shot attempts regardless of accuracy. Includes shots on target, off target, and blocked shots.",
                                    tips: [
                                        "Looser market than shots on target - easier to hit",
                                        "Frustrated attackers take more speculative shots",
                                        "Check recent form for shot volume trends",
                                    ],
                                    color: "bg-purple-500/10 border-purple-500/20"
                                },
                                {
                                    title: "To Be Booked (Cards)",
                                    desc: "Player to receive a yellow or red card during the match. Red cards typically pay out separately.",
                                    tips: [
                                        "Defensive midfielders and aggressive full-backs offer value",
                                        "Referee tendencies vary significantly - check history",
                                        "Derby matches and relegation battles see more cards",
                                    ],
                                    color: "bg-amber-500/10 border-amber-500/20"
                                },
                                {
                                    title: "Tackles",
                                    desc: "Successful tackles completed by a player. Definition varies slightly by data provider.",
                                    tips: [
                                        "Defensive midfielders dominate this market",
                                        "High-pressing teams create more tackle opportunities",
                                        "Full-backs in defensive roles hit lines consistently",
                                    ],
                                    color: "bg-red-500/10 border-red-500/20"
                                },
                            ].map(({ title, desc, tips, color }) => (
                                <div key={title} className={`p-6 rounded-2xl border ${color}`}>
                                    <h3 className="font-bold text-white text-lg mb-3 uppercase">{title}</h3>
                                    <p className="text-zinc-400 mb-4">{desc}</p>
                                    <div className="space-y-2">
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Key Considerations:</p>
                                        {tips.map((tip) => (
                                            <div key={tip} className="flex items-start gap-2 text-zinc-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                                                {tip}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Other Markets Worth Knowing</h2>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-12">
                            {[
                                { market: "Assists", desc: "Final pass before goal" },
                                { market: "Fouls Committed", desc: "Player commits X fouls" },
                                { market: "Fouls Won", desc: "Player wins X fouls" },
                                { market: "Goalkeeper Saves", desc: "Saves made by keeper" },
                                { market: "Shots Outside Box", desc: "Long-range attempts" },
                                { market: "Score or Assist", desc: "Combined market" },
                            ].map(({ market, desc }) => (
                                <div key={market} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <p className="text-white font-bold text-sm">{market}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{desc}</p>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Where Edge Comes From</h2>
                        <p className="text-zinc-400 mb-6">
                            Bookmakers set player prop lines based on season averages and basic position data. Edge emerges when:
                        </p>

                        <div className="space-y-4 mb-12">
                            {[
                                { icon: Target, title: "Position Changes", desc: "A midfielder playing as a striker has different expectations. Bookmakers don't always adjust fast enough.", color: "text-blue-400" },
                                { icon: BarChart3, title: "Recent Form vs Season Average", desc: "Season stats lag reality. A striker on a cold streak still has inflated lines based on early-season goals.", color: "text-emerald-400" },
                                { icon: TrendingUp, title: "Opponent Context", desc: "Shot totals against a low block are very different from shots against a high press. Bookmakers underweight this.", color: "text-purple-400" },
                            ].map(({ icon: Icon, title, desc, color }) => (
                                <div key={title} className="flex items-start gap-4 p-5 bg-white/[0.03] border border-white/10 rounded-xl">
                                    <div className="bg-white/5 p-3 rounded-xl shrink-0">
                                        <Icon className={`w-6 h-6 ${color}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1 uppercase text-sm">{title}</h3>
                                        <p className="text-zinc-400">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">The Cerebro Model Advantage</h2>
                        <p className="text-zinc-400 mb-6">
                            Proppr&apos;s Player Bot uses the Cerebro statistical model to identify value in Premier League player props:
                        </p>

                        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-10">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Data Window", value: "Last 5 or 10 games (not full season)" },
                                    { label: "Position Modeling", value: "Primary + alternative positions" },
                                    { label: "Minutes Adjustment", value: "Per-90 extrapolation" },
                                    { label: "Opponent Factor", value: "Defensive strength weighted" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-black/40 border border-white/5 rounded-xl p-4">
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                                        <p className="text-white font-bold">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Premier League-Specific Tips</h2>

                        <div className="space-y-4 mb-10">
                            {[
                                "Big 6 matches see lower shot totals - tight, tactical games",
                                "Bottom-half teams at home often exceed expected cards",
                                "Set piece specialists (corners, free kicks) add hidden goal threat",
                                "Boxing Day and fixture congestion affects player minutes unpredictably",
                                "New signings are mispriced early - market hasn't calibrated yet",
                            ].map((tip, i) => (
                                <div key={tip} className="flex items-start gap-4">
                                    <span className="bg-purple-500/20 text-purple-400 font-mono text-sm w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">
                                        {i + 1}
                                    </span>
                                    <span className="text-zinc-400 pt-1">{tip}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                {/* CTA / Next */}
                <section className="border-t border-white/10 bg-white/[0.02]">
                    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div>
                                <p className="text-zinc-500 text-sm mb-1">Ready to find Premier League value?</p>
                                <p className="text-white font-bold">Start with the Player Bot</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <a href="https://t.me/propprplayerbot?start=1" target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-400 text-white font-black text-sm px-6 py-3 rounded-xl transition-all uppercase tracking-wide">
                                    <TrendingUp className="w-4 h-4" />
                                    Try Player Bot Free
                                </a>
                                <Link href="/guides/team-totals"
                                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-sm px-6 py-3 rounded-xl border border-white/10 transition-all group">
                                    Next Guide
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            </div>
        </DocsLayout>
    );
}
