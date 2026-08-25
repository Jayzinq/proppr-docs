import { DocsLayout } from "@/components/layout/DocsLayout";
import { Settings, AlertTriangle, SlidersHorizontal, Globe, Clock, Radio } from "lucide-react";

export default function ArbBotSettings() {
    return (
        <DocsLayout>
            <div className="max-w-3xl">
                <div className="mb-8 flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-400/10 flex items-center justify-center">
                        <Settings className="w-6 h-6 text-orange-400" />
                    </div>
                    <h1 className="text-4xl font-heading font-bold text-white">Personalization</h1>
                </div>

                <p className="text-lg text-zinc-400 leading-relaxed mb-8">
                    Arb Bot only works if you have funded accounts at the bookmakers in the alert. The <code className="text-white bg-white/10 px-1.5 py-0.5 rounded">/settings</code> menu lets you configure exactly which books, sports, margins, and stake sizes you want - making every alert actionable.
                </p>

                {/* Real /settings output */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-12 font-mono text-xs md:text-sm overflow-x-auto">
                    <p className="text-zinc-400 text-xs mb-2 uppercase tracking-wider font-sans">What /settings looks like</p>
                    <span className="text-emerald-400 font-bold">⚙️ YOUR ARBITRAGE BOT SETTINGS</span><br /><br />
                    💷 Default Stake: £100<br />
                    📊 Minimum Arb Margin: 1.0%<br />
                    🔔 Alerts: ✅ Enabled<br />
                    🔄 LAY Arbs: ✅ ON<br />
                    🔴 Live Arbs: ❌ OFF<br /><br />
                    📚 Enabled Bookmakers (9):<br />
                    &nbsp;&nbsp;• Bet365<br />
                    &nbsp;&nbsp;• Betfair<br />
                    &nbsp;&nbsp;• Betfair Exchange<br />
                    &nbsp;&nbsp;• BetUK<br />
                    &nbsp;&nbsp;• Ladbrokes<br />
                    &nbsp;&nbsp;... and 4 more<br /><br />
                    ⚽️ Enabled Sports (14):<br />
                    &nbsp;&nbsp;• Soccer<br />
                    &nbsp;&nbsp;• American Football<br />
                    &nbsp;&nbsp;• Basketball<br />
                    &nbsp;&nbsp;• Tennis<br />
                    &nbsp;&nbsp;• Cricket<br />
                    &nbsp;&nbsp;... and 9 more<br /><br />
                    ⏰ Time Filter: 7 days
                    <div className="mt-3 space-y-1 font-sans not-italic">
                        {[
                            ["💷 Change Stake", "📊 Min Margin"],
                            ["📚 Bookmakers", "⚽️ Sports Filter"],
                            ["🔄 Bookmaker Clones", "⏰ Time"],
                            ["🏦 Exchange Commissions"],
                            ["🔔 Disable Alerts"],
                            ["🔄 LAY Arbs: ON"],
                            ["🔴 Live Arbs ▸ OFF"],
                            ["✅ Done"],
                        ].map((row, i) => (
                            <div key={i} className="flex gap-1">
                                {row.map((label) => (
                                    <span key={label} className="flex-1 text-center text-[11px] bg-white/10 border border-white/15 rounded-md px-2 py-1 text-blue-300">
                                        {label}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Settings Menu Options */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-2 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <SlidersHorizontal className="w-5 h-5 mr-3 text-orange-400" />
                    Settings Menu Options
                </h2>
                <div className="space-y-4 mb-12">
                    {[
                        {
                            setting: "💷 Default Stake",
                            desc: "Set your total amount per arb. The bot splits this automatically across both sides based on the odds. Example: £100 total at 2.10/2.05 → £49.40/£50.60 per side.",
                            tip: "Start conservative (£10–50) until you're comfortable with the execution speed required."
                        },
                        {
                            setting: "📊 Minimum Margin",
                            desc: "Filter out arbs below this profit %. Default is 1.0%. Most users set 1.5–2.0% to avoid very tight arbs that disappear before placement.",
                            tip: "Most profitable arbs are above 1.5% - the Demo tier caps at 1.0%. Upgrade to capture the best ones."
                        },
                        {
                            setting: "🔔 Alerts (master switch)",
                            desc: "Turn all alerts on or off with one toggle. If you block the bot, alerts are automatically disabled to save resources - sending /start re-enables them.",
                            tip: null
                        },
                        {
                            setting: "📚 Bookmakers",
                            desc: "Paginated menu, two bookmakers per row with country flags. 9 are enabled by default: Bet365, Betfair, Betfair Exchange, BetUK, Ladbrokes, VBET, William Hill, Sky Bet, Coral. New bookmakers appearing in the arb feed are auto-discovered and added to the list beyond the 51 defaults. Note: \"Kambi\" is an umbrella platform, not a directly toggleable book - enable the branded sites it powers instead.",
                            tip: "Only enable books where you have an active, funded account - otherwise the alert is useless to you. More enabled books = more opportunities found."
                        },
                        {
                            setting: "⚽ Sports Filter",
                            desc: "Select which sports to receive alerts for. Football, Tennis, Basketball, Hockey, Baseball, Cricket, Esports, and more.",
                            tip: "Tennis produces the most frequent arbs - two-way markets move quickly and create price disparities regularly."
                        },
                        {
                            setting: "🔄 Bookmaker Clones",
                            desc: "Many bookmakers share the same platform and prices - the bot maps 17 clone groups covering a 195-name lookup. Pick your preferred brand per family and every alert rewrites both the bookmaker name AND the deep link to your choice. With no explicit preference, it falls back to whichever family member you have enabled.",
                            tip: null
                        },
                        {
                            setting: "⏰ Time Filter",
                            desc: "Only receive alerts for events within a certain time window. Options: 1, 2, 3, 6, or 12 hours; 1, 3, or 7 days. Default: 7 days.",
                            tip: "Tighter time filters = higher conviction arbs that are more likely to still be available when you execute."
                        },
                        {
                            setting: "🏦 Exchange Commissions",
                            desc: "Exchanges and prediction markets: Betfair Exchange, BetfairIT, Smarkets, Kalshi, Limitless, Polymarket, SxBet. A 2% default is automatically applied to any exchange leg - back or lay - and you can override the rate per exchange here. Polymarket is back-only (no lay bets).",
                            tip: null
                        },
                        {
                            setting: "🔄 LAY Arbs",
                            desc: "Toggle whether to receive arbs that involve laying on a betting exchange. ON by default. Requires a funded exchange account (Betfair Exchange, Smarkets, etc.).",
                            tip: "LAY arbs often have higher margins - leave enabled if you use exchanges."
                        },
                    ].map(({ setting, desc, tip }) => (
                        <div key={setting} className="glass p-5 rounded-xl border border-white/10">
                            <h3 className="font-medium text-white mb-2">{setting}</h3>
                            <p className="text-sm text-zinc-400 mb-3">{desc}</p>
                            {tip && (
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-xs text-orange-300">
                                    💡 {tip}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Live Arbs */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <Radio className="w-5 h-5 mr-3 text-red-400" />
                    Live Arbs (Premium)
                </h2>
                <div className="glass p-6 rounded-xl border border-white/10 mb-12">
                    <p className="text-zinc-400 text-sm mb-4">
                        In-play surebets update every few seconds and are configured separately from your prematch arbs, in the <strong className="text-white">🔴 Live Arbs ▸</strong> submenu. The toggle is premium-gated - demo users see a lock pointing at /plans.
                    </p>
                    <div className="space-y-3">
                        {[
                            { label: "Mode", desc: "⏸ Break/Pause only (alerts only when the match is paused and odds are frozen - easier to execute) or ▶️ All in-play." },
                            { label: "Min Live Margin", desc: "Its own margin floor, separate from prematch: presets 0.1 / 0.25 / 0.5 / 1 / 2%, or type a custom value between 0 and 50." },
                            { label: "Live Bookmakers", desc: "A separate, live-only bookmaker list - your prematch bookmaker selection is untouched." },
                        ].map(({ label, desc }) => (
                            <div key={label} className="bg-black/30 border border-white/5 rounded-lg p-4">
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
                                <p className="text-sm text-zinc-300">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bookmaker setup guide */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <Globe className="w-5 h-5 mr-3 text-emerald-400" />
                    Recommended Bookmaker Setup
                </h2>
                <div className="glass p-6 rounded-xl border border-white/10 mb-12">
                    <p className="text-zinc-400 text-sm mb-5">To start arbing effectively, you need at least 5 funded accounts. Here is the recommended setup:</p>
                    <div className="space-y-3">
                        {[
                            { tier: "Tier 1 - Essential", books: ["Bet365", "Betfair Exchange"], desc: "Highest limits and coverage. Non-negotiable." },
                            { tier: "Tier 2 - Recommended", books: ["Pinnacle", "Smarkets"], desc: "Sharp books that rarely restrict winners. Great for LAY arbs." },
                            { tier: "Tier 3 - Expand", books: ["Ladbrokes", "William Hill", "Coral"], desc: "UK high-street books. Good for local market arbs." },
                        ].map(({ tier, books, desc }) => (
                            <div key={tier} className="bg-black/30 border border-white/5 rounded-lg p-4">
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">{tier}</p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {books.map((b) => (
                                        <span key={b} className="bg-white/10 border border-white/10 rounded px-2 py-0.5 text-xs text-white">{b}</span>
                                    ))}
                                </div>
                                <p className="text-xs text-zinc-500">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Account management */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <Clock className="w-5 h-5 mr-3 text-purple-400" />
                    Account &amp; Bankroll Management
                </h2>
                <div className="space-y-4 mb-8">
                    <div className="glass p-5 rounded-xl border border-white/10">
                        <h3 className="font-medium text-white mb-2">Bankroll Distribution</h3>
                        <p className="text-sm text-zinc-400 mb-3">Split funds across books. Example for £1,000 across your accounts:</p>
                        <div className="space-y-2">
                            {[
                                { book: "Bet365 + Betfair", pct: "30% each", amount: "£300 each" },
                                { book: "Pinnacle + Ladbrokes", pct: "20% each", amount: "£200 each" },
                            ].map(({ book, pct, amount }) => (
                                <div key={book} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg p-3 text-sm">
                                    <span className="text-zinc-300">{book}</span>
                                    <div className="flex space-x-3 text-right">
                                        <span className="text-zinc-500">{pct}</span>
                                        <span className="text-emerald-400 font-mono">{amount}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="glass p-5 rounded-xl border border-white/10">
                        <h3 className="font-medium text-white mb-2">Avoiding Gubbing (Account Restrictions)</h3>
                        <ul className="space-y-2 text-sm text-zinc-400 list-disc ml-4">
                            <li>Round your stakes (£25 instead of £24.73) - pattern recognition</li>
                            <li>Don&apos;t always bet the maximum allowed</li>
                            <li>Mix in occasional non-arb bets on accounts you want to keep</li>
                            <li>Don&apos;t withdraw immediately after every won arb</li>
                        </ul>
                    </div>
                </div>

                {/* Palpable errors warning */}
                <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <h3 className="font-semibold text-white">Palpable Errors</h3>
                    </div>
                    <p className="text-zinc-300 text-sm">
                        When a bookmaker accidentally offers clearly incorrect odds (e.g., 20.0 instead of 2.0), they can void bets citing &ldquo;palpable error&rdquo;. The bot automatically rejects arbs above 50% margin as data errors and flags anything above 30% for review. Still, as a habit, sanity-check unusually large margins yourself before placing - a too-good-to-be-true arb usually is.
                    </p>
                </div>
            </div>
        </DocsLayout>
    );
}
