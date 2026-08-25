import { DocsLayout } from "@/components/layout/DocsLayout";
import { Bot, Target, LineChart, Shield, Zap, Globe, Activity, BarChart3 } from "lucide-react";
import Link from "next/link";
import { TiltCard } from "@/components/transitions/Motion";

export default function TeamBotDocs() {
    return (
        <DocsLayout>
            <div className="max-w-3xl">
                {/* GEO-optimized header */}
                <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">Team Market Analysis</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">
                        Corners, Cards, and Team Totals - Without Opening FlashScore
                    </h1>
                    <p className="text-sm text-zinc-400">
                        The statistical backbone that powers the entire Proppr ecosystem. Predicted lines for 15+ team metrics, streak detection, and early value alerts before lineups are confirmed.
                    </p>
                </div>

                <div className="mb-6 flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-white">Team Bot Guide</h2>
                </div>

                <p className="text-base text-zinc-400 leading-relaxed mb-4">
                    <a href="https://t.me/PropprTeamBot" className="text-purple-400 font-medium">@PropprTeamBot</a> specializes in team-level statistics - corners, cards, shots, possession. It&apos;s the statistical foundation that makes Player Bot projections possible.
                </p>

                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-12">
                    <p className="text-purple-300 text-sm font-medium">&ldquo;The team bot powers the player bot - with no team bot there&apos;s no player.&rdquo;</p>
                    <p className="text-zinc-500 text-xs mt-1">- Jay (Prof. X), Creator</p>
                </div>

                {/* Relationship to Player Bot */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">The Foundation of the Ecosystem</h2>
                <div className="glass p-6 rounded-xl border border-white/10 mb-12">
                    <p className="text-zinc-400 mb-4">
                        Team Bot is not just a standalone product - it&apos;s the statistical backbone that makes the Player Bot possible. The same models predicting team shots, corners, and cards derive individual player expectations.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { label: "100+ Leagues", desc: "Global football coverage" },
                            { label: "~55 Markets", desc: "Alertable, incl. advanced metrics" },
                            { label: "1st/2nd Half", desc: "Split analysis available" },
                        ].map(({ label, desc }) => (
                            <div key={label} className="bg-black/30 border border-white/5 rounded-lg p-3 text-center">
                                <p className="text-white font-semibold text-lg">{label}</p>
                                <p className="text-xs text-zinc-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Markets Covered */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Markets Covered</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-12">
                    {[
                        "Team Tackles",
                        "Team Shots",
                        "Team Shots on Target",
                        "Team Cards",
                        "Team Corners",
                        "Team Fouls",
                        "Team Offsides",
                        "Team Throw-ins",
                        "Team Free Kicks",
                        "Team Goal Kicks",
                        "Team Possession",
                    ].map((market) => (
                        <div key={market} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-zinc-300 flex items-center space-x-2">
                            <span className="text-purple-400">•</span>
                            <span>{market}</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-zinc-500 -mt-8 mb-12">
                    …and coverage extends to ~55 alertable markets in total: Bet Builder, Spreads, Handicaps, Corner Match Bet, Red Cards, Saves, Penalties, many shot-type variants and 1H/2H variants.
                </p>

                {/* Key Features */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Unique Features</h2>
                <div className="space-y-4 mb-12">
                    {[
                        {
                            icon: Zap,
                            color: "text-yellow-400",
                            bg: "bg-yellow-500/20",
                            title: "/freeze - Sky Acca Freeze",
                            desc: "A+ to C- rated (💎/✅/❇️…) opportunities to back teams to Score First AND Lead Anytime. Note: the Skybet freeze poller is currently paused due to bookmaker rate limits, so freeze data can lag."
                        },
                        {
                            icon: LineChart,
                            color: "text-emerald-400",
                            bg: "bg-emerald-500/20",
                            title: "/streak - Historical Pattern Detection",
                            desc: "Find teams on notable statistical streaks: corners, cards, shots. Discover patterns like 'this team has hit 6+ corners in each of their last 5 matches'."
                        },
                        {
                            icon: Globe,
                            color: "text-blue-400",
                            bg: "bg-blue-500/20",
                            title: "Predicted Lines",
                            desc: "Comprehensive projections for every match covering 15+ metrics: goals, corners, cards, shots, fouls, tackles, offsides, throw-ins, free kicks, possession, and more."
                        },
                        {
                            icon: Target,
                            color: "text-red-400",
                            bg: "bg-red-500/20",
                            title: "Team Most Statistics",
                            desc: "Find which team is projected to have MORE corners, MORE cards, MORE shots. Useful for 'Team Most' bookmaker markets that are often overlooked."
                        },
                        {
                            icon: Shield,
                            color: "text-zinc-400",
                            bg: "bg-zinc-500/20",
                            title: "XI Change Alerts",
                            desc: "🚨 confirmed (3+ changes) and 🔔 predicted lineup notifications ~75 minutes before kickoff. Opt-in - they're OFF by default, enable them in /settings."
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

                {/* Also in the box */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Also in the Box</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
                    {[
                        { label: "New Market Release Alerts", desc: "“⚡️🕐 NEW MARKET RELEASE 🕐⚡️” the moment Bet365 lists a market." },
                        { label: "Bet Builder Value Alerts", desc: "“🔨 BET BUILDER VALUE 🔨” multi-leg combo opportunities." },
                        { label: "Optimal+ Presets", desc: "Five backtested settings presets with 7-day ROI, plus a preset-generator wizard." },
                        { label: "Polymarket / Polygun", desc: "Prediction-market odds like “47¢ (2.13) (Polymarket)” with liquidity shown." },
                        { label: "Bet-Tracking Suite", desc: "/track performance & financials, betslip adds, auto-settling." },
                        { label: "“Why Were Alerts Filtered?”", desc: "Per-scan breakdown of exactly which setting blocked each alert." },
                        { label: "Weather & Wind Lines", desc: "Rain/wind on alerts, with World Cup stadium roofs handled." },
                        { label: "Referee & Advanced Card Stats", desc: "Optional referee context and advanced card modelling on card markets." },
                        { label: "Bookmaker Clones", desc: "Toggle clone books so odds map to the brands you actually use." },
                        { label: "Multi-Sport /value", desc: "Value coverage beyond football: basketball, NFL, baseball, hockey, tennis and more." },
                        { label: "Referral Programme", desc: "/refer - codes, commission, and Stripe/cash/crypto payouts." },
                        { label: "@PropprChat Gate", desc: "New users join the @PropprChat group to unlock the bot." },
                    ].map(({ label, desc }) => (
                        <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <p className="text-sm font-medium text-white mb-1">{label}</p>
                            <p className="text-xs text-zinc-400">{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Pro Tip */}
                <div className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-xl mb-12">
                    <h3 className="font-semibold text-white mb-2">Pro-Tip: Use Team Bot for Live Bet Building</h3>
                    <p className="text-zinc-300 text-sm">
                        Team totals are highly game-state dependent. If a heavy favorite goes down 1-0 early, their corners projection drastically increases. Use pre-match insights to find value before the market adjusts.
                    </p>
                </div>

                {/* Navigation */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Continue Reading</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TiltCard>
                        <Link href="/team-bot/commands" className="block glass p-5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group h-full">
                            <h3 className="text-white font-medium mb-2 group-hover:text-purple-400 transition-colors">Commands &amp; Stats →</h3>
                            <p className="text-sm text-zinc-400">Full command reference with examples for all Team Bot commands.</p>
                        </Link>
                    </TiltCard>
                    <TiltCard>
                        <Link href="/team-bot/insights" className="block glass p-5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group h-full">
                            <h3 className="text-white font-medium mb-2 group-hover:text-purple-400 transition-colors">Insights &amp; Streaks →</h3>
                            <p className="text-sm text-zinc-400">How to read projection tables and use streak detection for value.</p>
                        </Link>
                    </TiltCard>
                </div>
            </div>
        </DocsLayout>
    );
}
