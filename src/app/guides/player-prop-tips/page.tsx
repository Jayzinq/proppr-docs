"use client";

import { motion } from "framer-motion";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Target, ArrowLeft, AlertTriangle, CheckCircle, XCircle, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PlayerPropTips() {
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
                        <Link href="/guides" className="inline-flex items-center gap-2 text-zinc-500 hover:text-blue-400 text-sm mb-8 transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Guides
                        </Link>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <Target className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <span className="text-blue-400 font-mono text-[10px] uppercase tracking-widest font-bold">Player Props</span>
                                <span className="text-zinc-600 mx-2">·</span>
                                <span className="text-zinc-500 text-xs">6 min read</span>
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-white leading-[0.95] tracking-tight uppercase mb-6">
                            Why Most Player Prop<br />
                            <span className="text-blue-500">Tips Fail</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
                            And what to look for instead of blindly following tipsters.
                        </p>
                    </motion.div>
                </section>

                {/* Content */}
                <section className="max-w-4xl mx-auto px-4 md:px-6 pb-20">
                    <article className="prose prose-invert prose-zinc max-w-none">

                        <h2 className="text-2xl font-black text-white mt-12 mb-4 uppercase tracking-tight">The Tipster Problem</h2>
                        <p className="text-zinc-400 mb-4">
                            Twitter is full of &quot;player prop tips&quot; accounts. Most post selections without context: &quot;Haaland 2+ shots on target @ 2.10&quot;. No reasoning. No methodology. No accountability.
                        </p>
                        <p className="text-zinc-400 mb-8">
                            Here&apos;s why this approach fails long-term:
                        </p>

                        <div className="space-y-4 mb-12">
                            {[
                                { title: "No Value Context", desc: "A tip at 2.10 means nothing. Is that good value? What should the fair price be? Without comparing to true probability, you're gambling blind." },
                                { title: "Cherry-Picked Results", desc: "Tipsters post winners, hide losers. A 60% strike rate sounds good until you realize the average odds were 1.50 - negative EV overall." },
                                { title: "No Position Awareness", desc: "A midfielder playing as a winger has different shot expectations. A right-back asked to push forward changes tackle predictions. Position matters." },
                                { title: "Static Analysis", desc: "Last season's stats don't account for new managers, formations, or fitness. The market moves - static analysis doesn't." },
                            ].map(({ title, desc }) => (
                                <div key={title} className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl">
                                    <h3 className="text-white font-bold mb-2 flex items-center gap-2 uppercase text-sm tracking-wide">
                                        <XCircle className="w-5 h-5 text-red-400" />
                                        {title}
                                    </h3>
                                    <p className="text-zinc-400">{desc}</p>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">What to Look For Instead</h2>
                        <p className="text-zinc-400 mb-8">
                            The difference between losing bettors and sharp bettors isn&apos;t prediction accuracy - it&apos;s process.
                        </p>

                        <div className="space-y-4 mb-12">
                            {[
                                { title: "Value Percentage", desc: "Don't just know the odds - know if they're good odds. A 10.00 shot on a player with 5% true probability is terrible value. A 3.00 shot on 40% probability is excellent." },
                                { title: "Recent Form (Not Season Stats)", desc: "Last 5-10 games matter more than season averages. A striker returning from injury won't match his pre-injury xG immediately." },
                                { title: "Position Context", desc: "Primary vs alternative position changes everything. A natural striker playing on the wing will have fewer shot opportunities." },
                                { title: "Minutes Played", desc: "A player averaging 60 minutes per game has different expectations than a 90-minute starter. The model must account for this." },
                                { title: "Opponent Adjustment", desc: "Shot totals against Burnley's deep block differ from shots against City's high press. Context matters." },
                            ].map(({ title, desc }) => (
                                <div key={title} className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl">
                                    <h3 className="text-white font-bold mb-2 flex items-center gap-2 uppercase text-sm tracking-wide">
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        {title}
                                    </h3>
                                    <p className="text-zinc-400">{desc}</p>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">The Cerebro Model Approach</h2>
                        <p className="text-zinc-400 mb-6">
                            Proppr&apos;s Player Bot uses the Cerebro statistical model - hard-coded mathematics, not AI. Here&apos;s what makes it different:
                        </p>

                        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-10">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Data Window", value: "Last 5 or Last 10 games" },
                                    { label: "Position Modeling", value: "Primary + alternative positions" },
                                    { label: "Model Confidence", value: "60-70% on value plays" },
                                    { label: "Markets Covered", value: "10+ per player" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-black/40 border border-white/5 rounded-xl p-4">
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                                        <p className="text-white font-bold">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Markets That Offer Edge</h2>
                        <p className="text-zinc-400 mb-6">
                            Not all player prop markets are created equal. Some have lower bookmaker margins, meaning more edge potential:
                        </p>

                        <div className="grid grid-cols-3 gap-3 mb-10">
                            {[
                                "Anytime Goalscorer",
                                "Shots on Target",
                                "Total Shots",
                                "To be Booked",
                                "Tackles",
                                "Fouls Committed",
                                "Assists",
                                "Goalkeeper Saves",
                                "Shots Outside Box",
                            ].map((market) => (
                                <div key={market} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-zinc-300 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    {market}
                                </div>
                            ))}
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl mb-10">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2 uppercase text-sm tracking-wide">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                The Super Sub Edge
                            </h3>
                            <p className="text-zinc-300 leading-relaxed">
                                Bookmakers undervalue substitutes. Fresh legs against tired defenders at 70th minute create value. The /supersub command surfaces bench players with edge - prices the market ignores.
                            </p>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Use It As a Tool, Not a Tipster</h2>
                        <p className="text-zinc-400 mb-4">
                            As Jay (Prof. X), the Proppr creator, says:
                        </p>
                        <blockquote className="border-l-4 border-blue-500/40 pl-6 py-2 text-zinc-300 italic text-lg mb-8">
                            &quot;The main thing with the bot is it&apos;s NOT a tipster, taking every alert it sends isn&apos;t the way to go, but use it as a tool to point you in the right direction you can&apos;t go wrong.&quot;
                        </blockquote>
                        <p className="text-zinc-400 mb-10">
                            The bot identifies mathematical value. You decide whether the context supports the bet. That&apos;s the difference between a tipster and a research tool.
                        </p>
                    </article>
                </section>

                {/* CTA / Next */}
                <section className="border-t border-white/10 bg-white/[0.02]">
                    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div>
                                <p className="text-zinc-500 text-sm mb-1">Ready to find real value?</p>
                                <p className="text-white font-bold">Start using the Player Bot</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <a href="https://t.me/propprplayerbot?start=1" target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-black text-sm px-6 py-3 rounded-xl transition-all uppercase tracking-wide">
                                    <TrendingUp className="w-4 h-4" />
                                    Try Player Bot Free
                                </a>
                                <Link href="/guides/arbitrage-betting"
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
