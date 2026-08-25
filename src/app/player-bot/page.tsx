import { DocsLayout } from "@/components/layout/DocsLayout";
import { Trophy, Zap, Search, BarChart2, Users, Clock, GitBranch, Shield, Target } from "lucide-react";
import Link from "next/link";
import { TiltCard } from "@/components/transitions/Motion";

export default function PlayerBotDocs() {
    return (
        <DocsLayout>
            <div className="max-w-3xl">
                {/* GEO-optimized header */}
                <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">Player Prop Value Betting</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">
                        Stop Researching Anytime Goalscorers Across 4 Different Sites
                    </h1>
                    <p className="text-sm text-zinc-400">
                        One command. Full player analysis. The Cerebro model identifies mispriced odds on shots, cards, tackles, goals, and assists across 100+ leagues - while you&apos;re still opening your first browser tab.
                    </p>
                </div>

                <div className="mb-6 flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-white">Player Bot Guide</h2>
                </div>

                <p className="text-base text-zinc-400 leading-relaxed mb-4">
                    <a href="https://t.me/PropprPlayerBot" className="text-blue-400 font-medium">@PropprPlayerBot</a> identifies mathematical value in player prop markets. Not a tipster - a research tool that shows where bookmaker odds exceed fair value.
                </p>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-12 text-sm text-blue-300 italic">
                    &ldquo;The main thing with the bot is it&apos;s NOT a tipster, taking every alert it sends isn&apos;t the way to go, but use it as a tool to point you in the right direction you can&apos;t go wrong.&rdquo; - Jay (Prof. X), Creator
                </div>

                {/* The Cerebro Model */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">The Cerebro Model</h2>
                <div className="glass p-6 rounded-xl border border-white/10 mb-12">
                    <p className="text-zinc-400 mb-4">
                        Cerebro is a hard-coded statistical model (not AI, not machine learning) that analyzes player performance from recent matches to predict likelihood of events. When bookmaker odds offer more than fair value, you get an alert.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { icon: BarChart2, label: "Data Points", value: "Last 5, Last 10 or full Season per player" },
                            { icon: GitBranch, label: "Position Intelligence", value: "Primary + alternative positions modeled" },
                            { icon: Users, label: "Opponent Adjustments", value: "Opponent strength factored in" },
                            { icon: Clock, label: "Probability Filters", value: "Per-market Min/Max Chance % filters" },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="bg-black/30 border border-white/5 rounded-lg p-3">
                                <div className="flex items-center space-x-2 mb-1">
                                    <Icon className="w-4 h-4 text-blue-400" />
                                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
                                </div>
                                <p className="text-sm text-white">{value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 bg-black/30 border border-white/5 rounded-lg p-3">
                        <p className="text-xs text-zinc-400 mb-1 font-medium">Value Formula</p>
                        <code className="text-emerald-400 text-sm">Value % = ((Bookmaker Odds ÷ Model Odds) − 1) × 100</code>
                        <p className="text-xs text-zinc-500 mt-1">Example: Bookmaker 8.5 ÷ Model 2.86 = 197.2% value</p>
                    </div>
                </div>

                {/* Markets Covered */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Headline Markets</h2>
                <p className="text-sm text-zinc-400 mb-4">The most-used markets are below - around 40 markets are configurable in total via <code className="text-white bg-white/10 px-1 rounded">/settings</code> and <code className="text-white bg-white/10 px-1 rounded">/markets</code>.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-12">
                    {[
                        "Anytime Goalscorer",
                        "Shots on Target",
                        "Total Shots",
                        "To be Booked (Cards)",
                        "Tackles",
                        "Fouls",
                        "Assists",
                        "Goalkeeper Saves",
                        "Score or Assist",
                        "Shots Outside Box",
                    ].map((market) => (
                        <div key={market} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-zinc-300 flex items-center space-x-2">
                            <span className="text-blue-400">•</span>
                            <span>{market}</span>
                        </div>
                    ))}
                </div>

                {/* Key Features */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Key Features</h2>
                <div className="space-y-4 mb-12">
                    {[
                        {
                            icon: Zap,
                            color: "text-yellow-400",
                            bg: "bg-yellow-500/20",
                            title: "Real-Time Value Alerts",
                            desc: "Instant push notifications the moment a mispriced market appears. Price drops are highlighted with 📉 - act fast before bookmakers correct the line."
                        },
                        {
                            icon: Search,
                            color: "text-emerald-400",
                            bg: "bg-emerald-500/20",
                            title: "/fixture - Deep-Dive Any Game",
                            desc: "The community's most-used command. Returns all value alerts matching your settings for a specific match in under 60 seconds. Club Legend, Proppr Founder and World Cup Package tiers."
                        },
                        {
                            icon: Trophy,
                            color: "text-blue-400",
                            bg: "bg-blue-500/20",
                            title: "Super Sub Strategy",
                            desc: "Dedicated commands (/supersub, /supersubteam, /supersubleague) quantify how much a player's output improves when substitute appearances are included - gain leaderboards that spotlight impact off the bench."
                        },
                        {
                            icon: Shield,
                            color: "text-purple-400",
                            bg: "bg-purple-500/20",
                            title: "Position-Based Modeling",
                            desc: "No competitor comes close. Primary and alternative positions are modeled separately, creating more accurate probability estimates for each market."
                        },
                    ].map(({ icon: Icon, color, bg, title, desc }) => (
                        <TiltCard key={title}>
                            <div className="glass p-6 rounded-xl border border-white/10 h-full">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className={`${bg} p-2 rounded-lg`}>
                                        <Icon className={`w-5 h-5 ${color}`} />
                                    </div>
                                    <h3 className="font-semibold text-white">{title}</h3>
                                </div>
                                <p className="text-sm text-zinc-400">{desc}</p>
                            </div>
                        </TiltCard>
                    ))}
                </div>

                {/* Navigation */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Continue Reading</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TiltCard>
                        <Link href="/player-bot/commands" className="block glass p-5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group h-full">
                            <h3 className="text-white font-medium mb-2 group-hover:text-blue-400 transition-colors">Commands &amp; Features →</h3>
                            <p className="text-sm text-zinc-400">40+ commands with usage examples, categories, and pro tips.</p>
                        </Link>
                    </TiltCard>
                    <TiltCard>
                        <Link href="/player-bot/settings" className="block glass p-5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group h-full">
                            <h3 className="text-white font-medium mb-2 group-hover:text-blue-400 transition-colors">Settings &amp; Alerts →</h3>
                            <p className="text-sm text-zinc-400">Every configurable filter explained, plus bankroll and unit guidance.</p>
                        </Link>
                    </TiltCard>
                </div>
            </div>
        </DocsLayout>
    );
}
