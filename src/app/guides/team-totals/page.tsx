"use client";

import { motion } from "framer-motion";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { BarChart3, ArrowLeft, TrendingUp, AlertTriangle, Target, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function TeamTotals() {
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
                        <Link href="/guides" className="inline-flex items-center gap-2 text-zinc-500 hover:text-amber-400 text-sm mb-8 transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Guides
                        </Link>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-amber-400" />
                            </div>
                            <div>
                                <span className="text-amber-400 font-mono text-[10px] uppercase tracking-widest font-bold">Team Markets</span>
                                <span className="text-zinc-600 mx-2">·</span>
                                <span className="text-zinc-500 text-xs">6 min read</span>
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-white leading-[0.95] tracking-tight uppercase mb-6">
                            Corners, Cards, and<br />
                            <span className="text-amber-500">Team Totals</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
                            The underrated markets that sharp bettors love.
                        </p>
                    </motion.div>
                </section>

                {/* Content */}
                <section className="max-w-4xl mx-auto px-4 md:px-6 pb-20">
                    <article className="prose prose-invert prose-zinc max-w-none">

                        <h2 className="text-2xl font-black text-white mt-12 mb-4 uppercase tracking-tight">Why Team Totals?</h2>
                        <p className="text-zinc-400 mb-6">
                            Most recreational bettors focus on match result. Sharps know that team-level markets - corners, cards, shots - offer better opportunities:
                        </p>

                        <div className="space-y-4 mb-12">
                            {[
                                { title: "Lower Margins", desc: "Bookmakers apply tighter margins to team totals than match results. More of your stake goes to potential winnings." },
                                { title: "More Predictable", desc: "Team corner averages are more stable than match outcomes. A team's style (pressing, possession, direct) creates consistent patterns." },
                                { title: "Less Public Attention", desc: "Recreational money floods match result markets. Team totals see less sharp action, meaning slower line movement and more opportunity." },
                            ].map(({ title, desc }) => (
                                <div key={title} className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl">
                                    <h3 className="text-white font-bold mb-2 uppercase text-sm">{title}</h3>
                                    <p className="text-zinc-400">{desc}</p>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">The Major Markets</h2>

                        <h3 className="text-xl font-bold text-white mt-10 mb-4">Team Corners</h3>
                        <p className="text-zinc-400 mb-4">
                            Corners are heavily influenced by match state. A team chasing a game attacks more, crosses more, and wins more corners.
                        </p>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-8">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-bold">Key Factors:</p>
                            <ul className="space-y-2 text-zinc-400">
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Playing style: width, crossing frequency</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Opponent defensive shape (low block = more corners)</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Game state expectation (trailing team gets more)</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Home/away split - some teams wildly different at home</li>
                            </ul>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-10 mb-4">Team Cards</h3>
                        <p className="text-zinc-400 mb-4">
                            Card totals depend on referee tendencies, team aggression, and match importance. Derby matches and relegation battles see spikes.
                        </p>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-8">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-bold">Key Factors:</p>
                            <ul className="space-y-2 text-zinc-400">
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Referee card average (varies significantly)</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Team fouling rate and tactical aggression</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Match context: stakes, rivalry, history</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Individual hot-heads in the squad</li>
                            </ul>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-10 mb-4">Team Shots</h3>
                        <p className="text-zinc-400 mb-4">
                            Shot totals reflect attacking intent and quality of chances created. High xG teams tend to have higher shot volumes.
                        </p>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-10">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-bold">Key Factors:</p>
                            <ul className="space-y-2 text-zinc-400">
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Attacking personnel available (injuries matter)</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Opponent defensive quality</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Game state: trailing teams shoot more desperately</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Home advantage: more shooting in front of home fans</li>
                            </ul>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Other Team Markets</h2>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-12">
                            {[
                                { market: "Team Tackles", desc: "Defensive workload" },
                                { market: "Team Fouls", desc: "Aggression measure" },
                                { market: "Team Offsides", desc: "High line indicator" },
                                { market: "Team Passes", desc: "Possession proxy" },
                                { market: "Team Throw-ins", desc: "Width of play" },
                                { market: "Ball Possession", desc: "Control metric" },
                            ].map(({ market, desc }) => (
                                <div key={market} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <p className="text-white font-bold text-sm">{market}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{desc}</p>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">The Streak Factor</h2>
                        <p className="text-zinc-400 mb-6">
                            Team statistics often run in streaks. A team that&apos;s seen Over 10.5 corners in 7 straight away matches isn&apos;t random - it&apos;s a pattern worth investigating.
                        </p>

                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl mb-10">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2 uppercase text-sm tracking-wide">
                                <Target className="w-5 h-5 text-amber-400" />
                                The /streak Command
                            </h3>
                            <p className="text-zinc-300 leading-relaxed">
                                Proppr&apos;s Team Bot includes /streak to find teams on notable statistical runs. &quot;Crystal Palace have seen Over 9.5 corners in their last 6 home matches&quot; - that&apos;s actionable data.
                            </p>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Game State Dynamics</h2>
                        <p className="text-zinc-400 mb-6">
                            Team totals are highly game-state dependent. Understanding how lines shift based on scoreline creates edge:
                        </p>

                        <div className="space-y-4 mb-12">
                            {[
                                { state: "Trailing by 1+", effect: "Corners UP, shots UP, cards UP (frustration fouls)" },
                                { state: "Leading by 2+", effect: "Corners DOWN (protecting lead), cards UP (time-wasting)" },
                                { state: "Level Game", effect: "Most unpredictable - can swing either way late" },
                                { state: "Must-Win Scenario", effect: "Attacking stats inflate, defensive discipline drops" },
                            ].map(({ state, effect }) => (
                                <div key={state} className="flex items-start gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                                    <span className="bg-amber-500/20 text-amber-400 font-mono text-xs px-3 py-1.5 rounded-lg shrink-0 font-bold">
                                        {state}
                                    </span>
                                    <span className="text-zinc-400 pt-1">{effect}</span>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">The Team Bot Advantage</h2>
                        <p className="text-zinc-400 mb-6">
                            Proppr&apos;s Team Bot provides predicted lines for every match across 15+ metrics:
                        </p>

                        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-10">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Predicted Lines", value: "Goals, corners, cards, shots, fouls, tackles, offsides, throw-ins, free kicks, possession" },
                                    { label: "Half Splits", value: "1st half and 2nd half analysis" },
                                    { label: "Team Most", value: "Which team will have MORE of each stat" },
                                    { label: "Early Value", value: "A+ to C-rated opportunities before lineups" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-black/40 border border-white/5 rounded-xl p-4">
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                                        <p className="text-white font-bold text-sm">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl mb-10">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2 uppercase text-sm tracking-wide">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                Pro Tip
                            </h3>
                            <p className="text-zinc-300 leading-relaxed">
                                The Team Bot powers the Player Bot. Team shot predictions inform player shot expectations. Team corner totals affect set-piece goal probability. Understanding team-level data makes player props clearer.
                            </p>
                        </div>
                    </article>
                </section>

                {/* CTA / Next */}
                <section className="border-t border-white/10 bg-white/[0.02]">
                    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div>
                                <p className="text-zinc-500 text-sm mb-1">Ready to explore team markets?</p>
                                <p className="text-white font-bold">Start with the Team Bot - free tier available</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <a href="https://t.me/propprteambot?start=1" target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm px-6 py-3 rounded-xl transition-all uppercase tracking-wide">
                                    <TrendingUp className="w-4 h-4" />
                                    Try Team Bot Free
                                </a>
                                <Link href="/guides"
                                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-sm px-6 py-3 rounded-xl border border-white/10 transition-all group">
                                    All Guides
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
