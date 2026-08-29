import { DocsLayout } from "@/components/layout/DocsLayout";
import { TrendingUp, Activity, Lock, Calculator, AlertTriangle, Globe, Percent, Radio, Gem, Scale } from "lucide-react";
import Link from "next/link";
import { TiltCard } from "@/components/transitions/Motion";

export default function ArbBotDocs() {
    return (
        <DocsLayout>
            <div className="max-w-3xl">
                {/* GEO-optimized header */}
                <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Percent className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-medium text-orange-400 uppercase tracking-wider">Arbitrage</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">
                        A Balanced Return at the Captured Prices, Whichever Way It Goes
                    </h1>
                    <p className="text-sm text-zinc-400">
                        100+ bookmakers scanned in real-time. Stakes auto-calculated. Place both sides, lock in profit. Example: £100 stake → £103.74 return = 3.60% locked.
                    </p>
                </div>

                <div className="mb-6 flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-white">Arbitrage Bot Guide</h2>
                </div>

                <p className="text-base text-zinc-400 leading-relaxed mb-12">
                    <a href="https://t.me/PropprArbBot" className="text-orange-400 font-medium">@PropprArbBot</a> finds mathematical price discrepancies across 100+ bookmakers - place bets on all outcomes for a balanced return at the captured prices — provided every leg is actually placed, and prices can move before you get them on.
                </p>

                {/* What is Arbing */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">
                    What is Arbitrage Betting?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="glass p-6 rounded-xl border border-white/10">
                        <div className="bg-orange-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                            <Activity className="w-5 h-5 text-orange-400" />
                        </div>
                        <h3 className="font-semibold text-white mb-2">The Setup</h3>
                        <p className="text-sm text-zinc-400">
                            Different bookmakers price the same outcome differently. When the combined implied probability across all outcomes falls below 100%, the odds allow a balanced return across every outcome.
                        </p>
                    </div>
                    <div className="glass p-6 rounded-xl border border-white/10">
                        <div className="bg-emerald-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                            <Lock className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h3 className="font-semibold text-white mb-2">The Lock</h3>
                        <p className="text-sm text-zinc-400">
                            Bet365 Over 2.5 @ 2.10 + Pinnacle Under 2.5 @ 2.05. Stake £49.40/£50.60 = £100 total. Return at those prices: £103.74. Margin: <strong className="text-emerald-400">3.60%</strong>.
                        </p>
                    </div>
                </div>

                {/* Custom Arb Example */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-12 font-mono text-xs md:text-sm overflow-x-auto">
                    <p className="text-zinc-400 text-xs mb-2 uppercase tracking-wider font-sans">Custom Arb Example Output</p>
                    <span className="text-emerald-400 font-bold">💰 CUSTOM ARBITRAGE OPPORTUNITY 💰</span><br />
                    Bet #1: <span className="text-white">£41.86 @ 2.50</span><br />
                    Bet #2: <span className="text-white">£58.14 @ 1.80</span><br />
                    Total Stake: <span className="text-white">£100.00</span><br />
                    <span className="text-emerald-400">💰 Return at the captured prices: £104.65 - Margin £4.65 (4.65%)</span>
                </div>

                {/* Three Stake Scenarios */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">
                    Three Stake Scenarios in Every Alert
                </h2>
                <p className="text-sm text-zinc-400 mb-4">
                    Every alert prints all three splits together - there is nothing to switch. Pick the line that suits your risk appetite and place those stakes.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                    {[
                        {
                            mode: "Standard",
                            desc: "Equal profit regardless of outcome. The safest split.",
                            color: "border-emerald-500/30 bg-emerald-500/5"
                        },
                        {
                            mode: "RF High",
                            desc: "Break even on the likely outcome, big profit if the underdog wins.",
                            color: "border-blue-500/30 bg-blue-500/5"
                        },
                        {
                            mode: "RF Low",
                            desc: "Break even on the unlikely outcome. Moderate, steady profit on the likely winner.",
                            color: "border-purple-500/30 bg-purple-500/5"
                        }
                    ].map(({ mode, desc, color }) => (
                        <div key={mode} className={`glass p-5 rounded-xl border ${color}`}>
                            <h3 className="font-semibold text-white mb-2">{mode}</h3>
                            <p className="text-sm text-zinc-400">{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Bookmaker Coverage */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">
                    100+ Bookmakers Across 30+ Countries
                </h2>
                <div className="glass p-6 rounded-xl border border-white/10 mb-12">
                    <div className="flex items-center space-x-2 mb-4">
                        <Globe className="w-4 h-4 text-orange-400" />
                        <p className="text-sm text-zinc-400">Includes (but not limited to):</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {["Bet365", "Pinnacle", "Ladbrokes", "William Hill", "DraftKings", "Winamax", "Coral", "Betway", "Unibet", "888sport", "Sky Bet", "BetUK"].map((book) => (
                            <div key={book} className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-300 text-center">
                                {book}
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-zinc-400 mt-5 mb-2">Exchanges &amp; prediction markets:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {["Betfair Exchange", "BetfairIT", "Smarkets", "Kalshi", "Limitless", "Polymarket", "SxBet"].map((book) => (
                            <div key={book} className="bg-orange-500/5 border border-orange-500/20 rounded-md px-2 py-1.5 text-xs text-zinc-300 text-center">
                                {book}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-3">New bookmakers are auto-discovered from the arb feed. Enable only the bookmakers where you have funded accounts.</p>
                </div>

                {/* Pricing */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Pricing</h2>
                <div className="overflow-x-auto mb-12">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-zinc-400 text-left">
                                <th className="pb-3 pr-2 md:pr-6 font-medium">Tier</th>
                                <th className="pb-3 pr-2 md:pr-6 font-medium">Price</th>
                                <th className="pb-3 font-medium">Limitations</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-white/5">
                                <td className="py-3 pr-2 md:pr-6 text-white font-medium">Demo</td>
                                <td className="py-3 pr-2 md:pr-6 text-emerald-400 font-mono">Free</td>
                                <td className="py-3 text-zinc-400">Arbs capped at 1% margin, ~9-minute cooldown (530s), 6 alerts/hour. Arbs between 1% and 7.5% are silently dropped; above 7.5% you get an occasional upgrade prompt instead of the alert.</td>
                            </tr>
                            <tr>
                                <td className="py-3 pr-2 md:pr-6 text-white font-medium">Premium</td>
                                <td className="py-3 pr-2 md:pr-6 text-emerald-400 font-mono">£6.99/wk · £23.99/mo · £311.99/yr</td>
                                <td className="py-3 text-zinc-400">Unlimited arbs, all markets, no rate limits, live arbs, /scan, priority support</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Key Features */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Key Features</h2>
                <div className="space-y-4 mb-12">
                    {[
                        {
                            icon: Calculator,
                            color: "text-orange-400",
                            bg: "bg-orange-500/20",
                            title: "Automatic Stake Calculation",
                            desc: "No manual math. The bot calculates optimal stakes for all three scenarios. Edit any stake or odds - the other side auto-recalculates. Bookmaker link buttons open each site; you place the bets yourself."
                        },
                        {
                            icon: Activity,
                            color: "text-emerald-400",
                            bg: "bg-emerald-500/20",
                            title: "LAY Betting & Exchange Support",
                            desc: "Betfair Exchange, BetfairIT, Smarkets, Kalshi, Limitless, Polymarket and SxBet. A 2% commission (default, editable per exchange) is automatically applied to any exchange leg - back or lay - in all profit calculations."
                        },
                        {
                            icon: Radio,
                            color: "text-red-400",
                            bg: "bg-red-500/20",
                            title: "Live Arbs (Premium, Opt-In)",
                            desc: "In-play surebets with their own minimum-margin floor, separate from prematch. Alerts show the current score, and a \"⏸️ ON BREAK/PAUSE\" banner flags paused matches where odds are frozen. Choose Break/Pause-only or all in-play in /settings."
                        },
                        {
                            icon: Gem,
                            color: "text-cyan-400",
                            bg: "bg-cyan-500/20",
                            title: "Middle Arbs",
                            desc: "\"💰💎 MIDDLE ARBITRAGE OPPORTUNITY 💎💰\" alerts flag line gaps where BOTH bets can win - e.g. Over 2.0 / Under 3.0. A middle is NOT arbitrage: only the gap outcome wins both legs, and every other outcome loses one. The alert shows the cost when the gap misses alongside the return if it lands."
                        },
                        {
                            icon: Scale,
                            color: "text-yellow-400",
                            bg: "bg-yellow-500/20",
                            title: "Prediction Markets & Liquidity Capping",
                            desc: "Polymarket and Kalshi legs show cents pricing like \"2.38 (42¢)\" with USD stakes and a ⚡️ Polygun quick-buy button. Exchange liquidity is displayed per leg, and stakes are automatically capped: \"⚖️ Total stake capped by liquidity: £X\"."
                        },
                        {
                            icon: TrendingUp,
                            color: "text-blue-400",
                            bg: "bg-blue-500/20",
                            title: "/custom - Create Your Own",
                            desc: "Found a boosted odds offer? Send /custom and answer three questions (Bet #1 odds, Bet #2 odds, total stake). The bot builds the full arb calculation instantly - great for promotions and price errors."
                        },
                        {
                            icon: Globe,
                            color: "text-purple-400",
                            bg: "bg-purple-500/20",
                            title: "50+ Sports Covered",
                            desc: "While football is the core, arbs are found across Tennis, Basketball, Ice Hockey, American Football, Baseball, Cricket, and Esports (Dota 2, CS:GO, LoL)."
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

                {/* Speed Warning */}
                <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-xl mb-12">
                    <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        <h3 className="font-semibold text-white">Speed is Critical</h3>
                    </div>
                    <p className="text-zinc-300 text-sm">
                        Arbitrage opportunities typically last 60–120 seconds before bookmakers correct their lines. <strong>Enable Telegram push notifications for @PropprArbBot</strong> and have both bookmaker accounts open when you place bets. Most profitable arbs (above 2%) vanish within 60 seconds.
                    </p>
                </div>

                {/* Navigation */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">Continue Reading</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TiltCard>
                        <Link href="/arb-bot/commands" className="block glass p-5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group h-full">
                            <h3 className="text-white font-medium mb-2 group-hover:text-orange-400 transition-colors">Executing Arbs →</h3>
                            <p className="text-sm text-zinc-400">Step-by-step placement guide, LAY betting, and custom arb creation.</p>
                        </Link>
                    </TiltCard>
                    <TiltCard>
                        <Link href="/arb-bot/settings" className="block glass p-5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group h-full">
                            <h3 className="text-white font-medium mb-2 group-hover:text-orange-400 transition-colors">Personalization →</h3>
                            <p className="text-sm text-zinc-400">Configure bookmakers, margins, sports filters, and stake sizes.</p>
                        </Link>
                    </TiltCard>
                </div>
            </div>
        </DocsLayout>
    );
}
