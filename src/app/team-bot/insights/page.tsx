import { DocsLayout } from "@/components/layout/DocsLayout";
import { Search, Flame, TrendingUp, Info, BarChart2, Lightbulb } from "lucide-react";

// Inline-keyboard button chips (mirrors Telegram's inline keyboard under a message)
const Kb = ({ label }: { label: string }) => (
    <span className="flex-1 text-center text-[10px] bg-white/10 border border-white/15 rounded-md px-1.5 py-1 text-blue-300 truncate">
        {label}
    </span>
);
const KbRow = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-1 mt-1">{children}</div>
);

export default function TeamBotInsights() {
    return (
        <DocsLayout>
            <div className="max-w-3xl">
                <div className="mb-8 flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-400/10 flex items-center justify-center">
                        <Search className="w-6 h-6 text-purple-400" />
                    </div>
                    <h1 className="text-4xl font-heading font-bold text-white">Insights &amp; Streaks</h1>
                </div>

                <p className="text-lg text-zinc-400 leading-relaxed mb-12">
                    While value betting identifies mathematical pricing errors, the Team Bot&apos;s Insights &amp; Streaks surface historical patterns to guide bet builders and accumulators. The <code className="text-white bg-white/10 px-1 rounded">/streak</code> engine does the research of a data team in seconds.
                </p>

                {/* /streak explained */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-2 mb-6 border-b border-white/10 pb-2">How /streak Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="glass p-6 rounded-xl border border-white/10">
                        <div className="bg-orange-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                            <Flame className="w-5 h-5 text-orange-400" />
                        </div>
                        <h3 className="font-semibold text-white mb-2">A Four-Step Wizard</h3>
                        <p className="text-sm text-zinc-400">
                            <code className="text-white bg-white/10 px-1 rounded text-xs">/streak</code> walks you through: <strong className="text-zinc-300">1)</strong> a stat grid (~70 stats, including First To Score and First Booked), <strong className="text-zinc-300">2)</strong> a timeframe (Today / Tomorrow / Next 7 Days), <strong className="text-zinc-300">3)</strong> an integer threshold (N+ buttons), <strong className="text-zinc-300">4)</strong> a streak length - 3+, 5+, 10+ or 20+ games.
                        </p>
                    </div>
                    <div className="glass p-6 rounded-xl border border-white/10">
                        <div className="bg-emerald-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h3 className="font-semibold text-white mb-2">How Streaks Are Detected</h3>
                        <p className="text-sm text-zinc-400">
                            A team qualifies when every one of its last N per-match values meets or beats your threshold. Streaks always use full-season data (the 🏠/✈️ icon just shows which side the team plays next), and results are sorted by streak length, then projection.
                        </p>
                    </div>
                </div>

                {/* Reading Output */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Reading the Output</h2>
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4 font-mono text-[11px] leading-relaxed">
                    🚩 <span className="text-white font-bold">Current 6+ Team Corners Streaks (Today) - 5+ Games</span> (Page 1/3)<br /><br />
                    🚩🏠 Arsenal (vs Chelsea) - 6.80<br />
                    ⏰ 15 May 20:00<br />
                    📊 Per Match: <span className="text-white">7, 6, 8, 5, 9</span><br />
                    <div className="grid grid-cols-4 gap-1 text-[10px] bg-black/30 p-2 rounded mt-1 text-center border border-white/5">
                        <span className="text-zinc-400">O4.5</span>
                        <span className="text-zinc-400">O5.5</span>
                        <span className="text-zinc-400">O6.5</span>
                        <span className="text-zinc-400">O7.5</span>
                        <span className="text-white">88.5%</span>
                        <span className="text-white">66.5%</span>
                        <span className="text-white">42.8%</span>
                        <span className="text-white">25.9%</span>
                        <span className="text-emerald-400">1.13</span>
                        <span className="text-emerald-400">1.50</span>
                        <span className="text-emerald-400">2.34</span>
                        <span className="text-emerald-400">3.86</span>
                    </div>
                    <KbRow><Kb label="⬅️ Prev" /><Kb label="Next ➡️" /></KbRow>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
                    {[
                        { label: "Header", desc: "Your threshold (6+), stat, timeframe and streak length (5+ Games) - the emoji is stat-specific (🚩 corners, 📒 cards, 🎯 SOT…)." },
                        { label: "Per Match", desc: "The streak values in chronological order: oldest on the left, most recent on the right." },
                        { label: "Probability Table", desc: "Poisson probabilities for each Over line based on the projection, with the implied fair odds beneath." },
                    ].map(({ label, desc }) => (
                        <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <p className="text-sm font-medium text-white mb-1">{label}</p>
                            <p className="text-xs text-zinc-400">{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Proppr Insights */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">
                    <Lightbulb className="inline w-5 h-5 mr-2 text-yellow-400" />
                    Proppr Insights
                </h2>
                <div className="bg-black/30 p-6 rounded-xl border border-white/10 space-y-6 mb-12">
                    <div className="border-l-2 border-purple-500 pl-4">
                        <h4 className="text-white font-medium mb-2">💡 PROPPR INSIGHTS 💡 button <span className="ml-2 text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 align-middle">Club Legend+</span></h4>
                        <p className="text-sm text-zinc-400 mb-2">
                            On <code className="text-white bg-white/10 px-1 rounded text-xs">/today</code> and fixture screens, the 💡 PROPPR INSIGHTS 💡 button opens paginated, per-fixture insights generated by a correlation-scoring engine. It only surfaces stats relevant to the bet - opponent offensive stats are never shown for a team bet.
                        </p>
                    </div>
                    <div className="border-l-2 border-emerald-500 pl-4">
                        <h4 className="text-white font-medium mb-2">👨‍🏫⚽️ PROPPR INSIGHT ALERT ⚽️👨‍🏫 broadcast</h4>
                        <p className="text-sm text-zinc-400 mb-2">
                            A pushed digest covering fixtures in the next 48 hours - the top 20 ranked by alert density - so the busiest boards land in your chat automatically.
                        </p>
                        <div className="max-w-xs">
                            <KbRow><Kb label="🔇 Mute League" /><Kb label="🔇 Mute All" /></KbRow>
                            <KbRow><Kb label="📊 View Projections" /></KbRow>
                        </div>
                    </div>
                </div>

                {/* /stats Global Projections */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">
                    <BarChart2 className="inline w-5 h-5 mr-2 text-purple-400" />
                    /stats - Global Projections
                </h2>
                <div className="glass p-6 rounded-xl border border-white/10 mb-8">
                    <p className="text-zinc-400 text-sm mb-4">
                        <code className="text-white bg-white/10 px-1 rounded">/stats</code> gives a paginated, globally-ranked list of top projections for any stat. Interactive selection - choose the stat, then a time range, then browse up to 25 teams (5 pages × 5) with full projection tables. The stat grid carries ~70 options, including 1st/2nd-half and Team-Most sub-menus. A sample:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {["Total Goals", "Team Total Goals", "Total Corners", "Team Corners", "Total Cards", "Team Cards", "Total Shots", "Team Shots on Target", "Fouls", "Tackles", "Offsides", "Throw-ins", "Free Kicks", "Possession", "Passes", "Touches In Box", "Shots Created", "Set-Piece / Headed / OTB variants"].map((stat) => (
                            <div key={stat} className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-300">
                                {stat}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-3 mb-0">
                        Note: Corners Spread and Bookings Spread are alert markets only - they don&apos;t appear in the /stats menu.
                    </p>
                </div>

                <div className="flex items-start space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
                    <Info className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-400">
                        <strong className="text-white">Important:</strong> Streaks are a guide, not a guarantee. Always pair an insight with a mathematical value check using <code className="text-white bg-white/10 px-1 rounded">/value</code> or <code className="text-white bg-white/10 px-1 rounded">/fixture</code> before placing bets.
                    </p>
                </div>
            </div>
        </DocsLayout>
    );
}
