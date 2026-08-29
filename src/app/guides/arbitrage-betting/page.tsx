"use client";

import { motion } from "framer-motion";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { TrendingUp, ArrowLeft, AlertTriangle, CheckCircle, Calculator, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ArbitrageBetting() {
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
                        <Link href="/guides" className="inline-flex items-center gap-2 text-zinc-500 hover:text-orange-400 text-sm mb-8 transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Guides
                        </Link>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-orange-400" />
                            </div>
                            <div>
                                <span className="text-orange-400 font-mono text-[10px] uppercase tracking-widest font-bold">Arbitrage Strategy</span>
                                <span className="text-zinc-600 mx-2">·</span>
                                <span className="text-zinc-500 text-xs">10 min read</span>
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-white leading-[0.95] tracking-tight uppercase mb-6">
                            Arbitrage Betting<br />
                            <span className="text-orange-500">Explained</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
                            The same return whichever way it goes, at the prices you capture. Here&apos;s how it works.
                        </p>
                    </motion.div>
                </section>

                {/* Content */}
                <section className="max-w-4xl mx-auto px-4 md:px-6 pb-20">
                    <article className="prose prose-invert prose-zinc max-w-none">

                        <h2 className="text-2xl font-black text-white mt-12 mb-4 uppercase tracking-tight">What is Arbitrage Betting?</h2>
                        <p className="text-zinc-400 mb-4">
                            Arbitrage betting (arbing) exploits price differences between bookmakers. When different bookmakers offer odds that, combined, create a situation where the total implied probability is below 100%, you can bet on all outcomes for the same return whichever way it goes, at those prices.
                        </p>
                        <p className="text-zinc-400 mb-8">
                            It&apos;s not gambling. It&apos;s mathematics.
                        </p>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl mb-10">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2 uppercase text-sm tracking-wide">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                The Core Concept
                            </h3>
                            <p className="text-zinc-300 leading-relaxed">
                                Bookmaker A offers Over 2.5 Goals @ 2.10. Bookmaker B offers Under 2.5 Goals @ 2.05. By betting the right amounts on both, you lock in profit no matter what happens.
                            </p>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">A Complete Example</h2>
                        <p className="text-zinc-400 mb-6">
                            Let&apos;s walk through a real arbitrage opportunity:
                        </p>

                        <div className="bg-black/60 border border-white/10 rounded-2xl p-6 mb-8">
                            <p className="text-zinc-500 text-xs mb-4 uppercase tracking-widest font-bold">Match: Arsenal vs Chelsea</p>
                            <div className="space-y-3 font-mono">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Bet365 - Over 2.5 Goals:</span>
                                    <span className="text-white font-bold text-lg">2.10</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Pinnacle - Under 2.5 Goals:</span>
                                    <span className="text-white font-bold text-lg">2.05</span>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-10 mb-4">Step 1: Calculate Implied Probabilities</h3>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-6 font-mono text-base space-y-2">
                            <div className="text-zinc-400">Over 2.5: 1/2.10 = <span className="text-white">47.62%</span></div>
                            <div className="text-zinc-400">Under 2.5: 1/2.05 = <span className="text-white">48.78%</span></div>
                            <div className="text-zinc-400 pt-2 border-t border-white/10">Total: 47.62% + 48.78% = <span className="text-emerald-400 font-bold">96.40%</span></div>
                        </div>
                        <p className="text-zinc-400 mb-8">
                            Total probability is below 100%. This means profit is possible.
                        </p>

                        <h3 className="text-xl font-bold text-white mt-10 mb-4">Step 2: Calculate Stakes</h3>
                        <p className="text-zinc-400 mb-4">
                            To guarantee equal profit regardless of outcome with a £100 total stake:
                        </p>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-8 font-mono text-base space-y-2">
                            <div className="text-zinc-400">Stake on Over 2.5: £100 × (48.78/96.40) = <span className="text-white font-bold">£50.60</span></div>
                            <div className="text-zinc-400">Stake on Under 2.5: £100 × (47.62/96.40) = <span className="text-white font-bold">£49.40</span></div>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-10 mb-4">Step 3: Calculate Returns</h3>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-10 font-mono text-base space-y-2">
                            <div className="text-zinc-400">If Over 2.5 wins: £50.60 × 2.10 = <span className="text-emerald-400 font-bold">£106.26</span></div>
                            <div className="text-zinc-400">If Under 2.5 wins: £49.40 × 2.05 = <span className="text-emerald-400 font-bold">£101.27</span></div>
                            <div className="pt-3 border-t border-white/10 space-y-1">
                                <div className="text-emerald-400 font-bold text-lg">Guaranteed minimum return: £101.27</div>
                                <div className="text-emerald-400">Profit: £1.27 - £6.26 (1.27% - 6.26%)</div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Three Stake Modes</h2>
                        <p className="text-zinc-400 mb-6">
                            Proppr&apos;s Arb Bot offers three different stake calculation methods:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                            {[
                                { mode: "Standard", desc: "Equal profit regardless of outcome. The safest, most common approach.", color: "bg-emerald-500/10 border-emerald-500/20" },
                                { mode: "RF High", desc: "Break even on the likely outcome, big profit if underdog wins.", color: "bg-blue-500/10 border-blue-500/20" },
                                { mode: "RF Low", desc: "Break even on unlikely outcome, steady profit on favorite.", color: "bg-purple-500/10 border-purple-500/20" }
                            ].map(({ mode, desc, color }) => (
                                <div key={mode} className={`p-6 rounded-2xl border ${color}`}>
                                    <h3 className="font-bold text-white mb-2 uppercase text-sm">{mode}</h3>
                                    <p className="text-sm text-zinc-400">{desc}</p>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Speed is Everything</h2>

                        <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl mb-10">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2 uppercase text-sm tracking-wide">
                                <Clock className="w-5 h-5 text-orange-400" />
                                Critical Warning
                            </h3>
                            <p className="text-zinc-300 mb-4 leading-relaxed">
                                Most arbitrage opportunities last 60-120 seconds before bookmakers correct their lines. High-value arbs (5%+) often vanish within 30 seconds.
                            </p>
                            <ul className="space-y-2 text-zinc-400">
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Enable Telegram push notifications for @PropprArbBot</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Have bookmaker accounts logged in and ready</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Place both bets within 60 seconds of alert</li>
                            </ul>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Bookmaker Coverage</h2>
                        <p className="text-zinc-400 mb-6">
                            Proppr&apos;s Arb Bot scans 150+ bookmakers across 30+ countries:
                        </p>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                            {["Bet365", "Betfair", "Pinnacle", "Smarkets", "Ladbrokes", "William Hill", "DraftKings", "FanDuel", "Winamax", "Coral", "Betway", "Unibet"].map((book) => (
                                <div key={book} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 text-center">
                                    {book}
                                </div>
                            ))}
                        </div>
                        <p className="text-zinc-500 text-sm mb-10">+ 130+ more. Enable only bookmakers where you have funded accounts.</p>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">LAY Betting on Exchanges</h2>
                        <p className="text-zinc-400 mb-6">
                            Exchanges like Betfair, Smarkets, and Matchbook let you &quot;lay&quot; outcomes (bet against them happening). This opens more arb opportunities:
                        </p>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-8 font-mono text-base space-y-2">
                            <div className="text-zinc-500 text-sm mb-2">Example:</div>
                            <div className="text-zinc-400">BACK Arsenal @ 2.50 (Bet365)</div>
                            <div className="text-zinc-400">LAY Arsenal @ 2.40 (Betfair)</div>
                            <div className="text-emerald-400 font-bold mt-3">Return from the price gap, at those odds</div>
                        </div>
                        <p className="text-zinc-400 mb-10">
                            The Arb Bot accounts for exchange commission (default 2%) in all profit calculations.
                        </p>

                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl mb-10">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2 uppercase text-sm tracking-wide">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                Account Limiting
                            </h3>
                            <p className="text-zinc-300 leading-relaxed">
                                Bookmakers don&apos;t like arbitrage bettors. Consistent arbing may result in account restrictions. Use multiple accounts, vary stake sizes, and mix arbs with recreational bets. This is a known trade-off.
                            </p>
                        </div>

                        <h2 className="text-2xl font-black text-white mt-16 mb-6 uppercase tracking-tight">Getting Started</h2>
                        <div className="space-y-4 mb-10">
                            {[
                                "Open accounts at 3-5 bookmakers with good arb coverage",
                                "Fund each account with working capital",
                                "Start @PropprArbBot and enable your bookmakers in /settings",
                                "Enable push notifications for instant alerts",
                                "Start with the Demo tier (free) to learn the flow",
                            ].map((step, i) => (
                                <div key={step} className="flex items-start gap-4">
                                    <span className="bg-orange-500/20 text-orange-400 font-mono text-sm w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">
                                        {i + 1}
                                    </span>
                                    <span className="text-zinc-400 pt-1">{step}</span>
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
                                <p className="text-zinc-500 text-sm mb-1">Ready to start arbing?</p>
                                <p className="text-white font-bold">Get instant arb alerts via Telegram</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <a href="https://t.me/propprarbbot?start=1" target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-black text-sm px-6 py-3 rounded-xl transition-all uppercase tracking-wide">
                                    <Calculator className="w-4 h-4" />
                                    Try Arb Bot Free
                                </a>
                                <Link href="/guides/premier-league-player-props"
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
