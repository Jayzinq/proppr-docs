"use client";

import { motion } from "framer-motion";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Calculator, ArrowLeft, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ValueBetting101() {
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
                        <Link href="/guides" className="inline-flex items-center gap-2 text-zinc-500 hover:text-emerald-400 text-sm mb-8 transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Guides
                        </Link>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Calculator className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <span className="text-emerald-400 font-mono text-[10px] uppercase tracking-widest font-bold">Fundamentals</span>
                                <span className="text-zinc-600 mx-2">·</span>
                                <span className="text-zinc-500 text-xs">8 min read</span>
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-white leading-[0.95] tracking-tight uppercase mb-6">
                            Value Betting 101:<br />
                            <span className="text-emerald-500">How to Calculate Expected Value</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
                            The mathematical foundation of profitable betting. No gambling system, no magic formula - just mathematics.
                        </p>
                    </motion.div>
                </section>

                {/* Content */}
                <section className="max-w-4xl mx-auto px-4 md:px-6 pb-20">
                    <article className="prose prose-invert prose-zinc max-w-none">

                        <h2 className="text-2xl font-black text-white mt-12 mb-4 uppercase tracking-tight">What is Value Betting?</h2>
                        <p className="text-zinc-400 mb-4 text-base leading-relaxed">
                            Value betting is placing bets where the odds offered by bookmakers are higher than the true probability of an outcome. Over thousands of bets, this mathematical edge compounds into profit.
                        </p>
                        <p className="text-zinc-400 mb-8 text-base leading-relaxed">
                            It&apos;s not about predicting winners. It&apos;s about finding prices that don&apos;t reflect reality.
                        </p>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl mb-10">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2 uppercase text-sm tracking-wide">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                The Core Principle
                            </h3>
                            <p className="text-zinc-300 leading-relaxed">
                                If a coin flip pays 2.10 for heads (implied probability: 47.6%) but the true probability is 50%, you have a +4.76% edge. Flip enough times and you profit - regardless of individual outcomes.
                            </p>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">The Mathematics: EV Formula</h2>

                        <div className="bg-black/60 border border-white/10 rounded-2xl p-6 mb-8">
                            <p className="text-zinc-500 text-xs mb-3 uppercase tracking-widest font-bold">Expected Value Formula</p>
                            <code className="text-emerald-400 text-xl font-mono font-bold">EV = (Probability × Odds) - 1</code>
                            <p className="text-zinc-500 text-sm mt-4">If EV &gt; 0, you have a value bet.</p>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-10 mb-4">Example Calculation</h3>
                        <p className="text-zinc-400 mb-4">
                            A bookmaker offers 3.00 odds on a player to score anytime. Your model calculates the true probability at 40%.
                        </p>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-8 font-mono text-base space-y-2">
                            <div className="text-zinc-400">EV = (0.40 × 3.00) - 1</div>
                            <div className="text-zinc-400">EV = 1.20 - 1</div>
                            <div className="text-emerald-400 font-bold text-lg">EV = +0.20 (20% value)</div>
                        </div>
                        <p className="text-zinc-400 mb-8">
                            This bet has 20% positive expected value. Place enough of these and the mathematics work in your favor.
                        </p>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Implied Probability: Reading Bookmaker Odds</h2>
                        <p className="text-zinc-400 mb-6">
                            Every set of odds implies a probability. To find value, compare implied probability to true probability.
                        </p>

                        <div className="bg-black/60 border border-white/10 rounded-2xl p-6 mb-8">
                            <p className="text-zinc-500 text-xs mb-3 uppercase tracking-widest font-bold">Implied Probability Formula</p>
                            <code className="text-emerald-400 text-xl font-mono font-bold">Implied Probability = 1 / Decimal Odds</code>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-12">
                            {[
                                { odds: "2.00", prob: "50%" },
                                { odds: "3.00", prob: "33.3%" },
                                { odds: "5.00", prob: "20%" },
                                { odds: "8.00", prob: "12.5%" },
                                { odds: "10.00", prob: "10%" },
                                { odds: "15.00", prob: "6.7%" },
                            ].map(({ odds, prob }) => (
                                <div key={odds} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                    <div className="text-white font-mono font-bold text-lg">{odds}</div>
                                    <div className="text-xs text-zinc-500 mt-1">{prob}</div>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Value Percentage: The Proppr Way</h2>
                        <p className="text-zinc-400 mb-6">
                            Proppr displays value as a percentage - how much &quot;extra&quot; you&apos;re being paid compared to fair odds.
                        </p>

                        <div className="bg-black/60 border border-white/10 rounded-2xl p-6 mb-8">
                            <p className="text-zinc-500 text-xs mb-3 uppercase tracking-widest font-bold">Value Percentage Formula</p>
                            <code className="text-emerald-400 text-lg font-mono font-bold">Value % = ((Bookmaker Odds ÷ Model Odds) - 1) × 100</code>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-10 mb-4">Real Example from Proppr</h3>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-8 font-mono text-base space-y-2">
                            <div className="text-zinc-400">Bookmaker Odds: <span className="text-white font-bold">8.5</span></div>
                            <div className="text-zinc-400">Cerebro Model Odds: <span className="text-sky-400 font-bold">2.86</span></div>
                            <div className="text-zinc-500">Value % = ((8.5 ÷ 2.86) - 1) × 100</div>
                            <div className="text-emerald-400 font-bold text-xl mt-2">Value % = 197.2%</div>
                        </div>
                        <p className="text-zinc-400 mb-10">
                            The bookmaker is paying nearly 3x what the mathematics say is fair. This is an extreme example - most value plays are in the 10-50% range.
                        </p>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Why Individual Results Don&apos;t Matter</h2>

                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl mb-8">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2 uppercase text-sm tracking-wide">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                Critical Mindset Shift
                            </h3>
                            <p className="text-zinc-300 leading-relaxed">
                                A +20% EV bet will still lose most of the time if the probability is 40%. You&apos;ll lose 6 out of 10 on average. But when you win, you win big - and the mathematics compound over hundreds of bets.
                            </p>
                        </div>

                        <p className="text-zinc-400 mb-4">
                            As Jay (Prof. X), the Proppr creator, says:
                        </p>
                        <blockquote className="border-l-4 border-emerald-500/40 pl-6 py-2 text-zinc-300 italic text-lg mb-10">
                            &quot;There will be just as many losing alerts as winning alerts. The edge comes from long-term volume on positive EV plays.&quot;
                        </blockquote>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">How Proppr Finds Value</h2>
                        <p className="text-zinc-400 mb-6">
                            The Cerebro model is a hard-coded statistical engine (not AI, not machine learning) that:
                        </p>
                        <ul className="space-y-3 mb-10">
                            {[
                                "Analyzes last 5-10 games of player/team performance",
                                "Accounts for primary and alternative positions",
                                "Factors in opponent strength adjustments",
                                "Compares calculated fair odds to live bookmaker prices",
                                "Alerts when value exceeds your minimum threshold",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3 text-zinc-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </article>
                </section>

                {/* CTA / Next */}
                <section className="border-t border-white/10 bg-white/[0.02]">
                    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div>
                                <p className="text-zinc-500 text-sm mb-1">Ready to apply this?</p>
                                <p className="text-white font-bold">Start finding value bets with Proppr</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <a href="https://t.me/propprplayerbot?start=1" target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm px-6 py-3 rounded-xl transition-all uppercase tracking-wide">
                                    <TrendingUp className="w-4 h-4" />
                                    Try Player Bot Free
                                </a>
                                <Link href="/guides/player-prop-tips"
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
