import { DocsLayout } from "@/components/layout/DocsLayout";
import { Settings, BellRing, SlidersHorizontal, Clock, BarChart2, BookOpen, Globe } from "lucide-react";

export default function PlayerBotSettings() {
    return (
        <DocsLayout>
            <div className="max-w-3xl">
                <div className="mb-8 flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-400/10 flex items-center justify-center">
                        <Settings className="w-6 h-6 text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-heading font-bold text-white">Settings &amp; Alerts</h1>
                </div>

                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                    The <code className="text-white bg-white/10 px-1.5 py-0.5 rounded">/settings</code> menu is the most important thing to configure correctly. Every filter directly impacts the alerts you receive. Use <code className="text-white bg-white/10 px-1.5 py-0.5 rounded">/markets</code> to toggle specific markets on or off.
                </p>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-12 text-sm text-amber-300">
                    <strong className="text-amber-200">Tier gating:</strong> Reserve and Bench Player tiers cannot open <code className="bg-white/10 px-1 rounded">/settings</code> at all - Bench Player gets <code className="bg-white/10 px-1 rounded">/markets</code> only. Reserve and Bench Player are also limited to 3 <code className="bg-white/10 px-1 rounded">/stats</code> queries per day. Full settings access starts at Regular Starter.
                </div>

                {/* The /settings menu */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-2 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <SlidersHorizontal className="w-5 h-5 mr-3 text-blue-400" />
                    The /settings Menu
                </h2>
                <p className="text-zinc-400 mb-4 text-sm">
                    Opening <code className="text-white bg-white/10 px-1 rounded">/settings</code> shows your current configuration (Data Scope, Min Minutes, Timezone, Notifications) above a 19-row inline keyboard:
                </p>
                <div className="space-y-3 mb-12">
                    {[
                        {
                            setting: "🏇 Optimal+ Presets",
                            desc: "One-tap strategy presets - Route One, Shoot on Sight, Gegenpress and Tiki-Taka - plus a Generate-A-Preset wizard that builds a custom preset from your answers."
                        },
                        {
                            setting: "🧑‍⚖️ Referee Stats",
                            desc: "Toggle referee card/foul stats lines inside alerts."
                        },
                        {
                            setting: "📊 Data Scope",
                            desc: "The historical window for all stat calculations: Last 5 Games, Last 10 Games, or full SEASON. Last 5 = recent form; Last 10 = larger sample; Season = maximum stability."
                        },
                        {
                            setting: "🆕 Market Release Alerts",
                            desc: "Get notified the moment Bet365 releases a new market for a fixture. Opens a submenu with per-group and per-market toggles."
                        },
                        {
                            setting: "🔨 Bet Builder Alerts",
                            desc: "Toggle bet-builder value alerts on or off."
                        },
                        {
                            setting: "⚙️ Player Market Settings",
                            desc: "The per-market editor - min/max odds, value %, chance %, lines and more, individually for every market. See the section below."
                        },
                        {
                            setting: "📅 Alert Date Range",
                            desc: "How far ahead of kickoff you want value alerts: anywhere from 1 Hour to 14 Days."
                        },
                        {
                            setting: "📉 Dropping Odds Date Range",
                            desc: "A separate window for dropping-odds alerts: 5 Minutes to 14 Days before kickoff."
                        },
                        {
                            setting: "🕒 Min Avg Minutes",
                            desc: "Filter out players below an average-minutes threshold. Default is 80 - already strict, so lower it if you want squad rotation and supersub plays included."
                        },
                        {
                            setting: "🌍 Timezone",
                            desc: "All match times and alert timestamps shown in your local timezone. Default UTC."
                        },
                        {
                            setting: "🔔 Notifications",
                            desc: "Master on/off switch for push alerts."
                        },
                        {
                            setting: "🔔 Predicted Position Changes",
                            desc: "Alerts when a player is predicted to play a different position - with attacking, defensive and master toggles."
                        },
                        {
                            setting: "🚨 Confirmed Position Changes",
                            desc: "Alerts when a lineup confirms a position change."
                        },
                        {
                            setting: "📈 Market Avg Alerts",
                            desc: "Toggle market-average (consensus %) alerts."
                        },
                        {
                            setting: "🚫 Exclude Bet365 Market Avg",
                            desc: "Exclude Bet365 from the market-average calculation."
                        },
                        {
                            setting: "👤 Player Sidelined Info",
                            desc: "Toggle injury/suspension (sidelined) lines inside alerts."
                        },
                        {
                            setting: "📉 Dropping Odds Alerts",
                            desc: "Toggle the dropping-odds alert class on or off."
                        },
                        {
                            setting: "🚔 Prison FC Filter",
                            desc: "Filter out card-magnet chaos fixtures/teams from alerts."
                        },
                        {
                            setting: "🏆 League Toggles / 📚 Bookmaker Toggles / 🪞 Bookmaker Clones",
                            desc: "Enable or disable individual leagues (with enable-all, disable-all and top-leagues-only shortcuts), toggle 45+ bookmakers (only Bet365 is on by default), and mirror one bookmaker's settings onto another with clones."
                        },
                    ].map(({ setting, desc }) => (
                        <div key={setting} className="glass p-4 rounded-xl border border-white/10">
                            <h3 className="font-semibold text-white text-sm mb-1">{setting}</h3>
                            <p className="text-sm text-zinc-400 m-0">{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Per-market editor */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <BellRing className="w-5 h-5 mr-3 text-amber-400" />
                    Player Market Settings (Per-Market Filters)
                </h2>
                <div className="glass p-6 rounded-xl border border-white/10 mb-6">
                    <p className="text-zinc-400 mb-4 text-sm">
                        Min/Max Odds and Min Value % are <strong className="text-white">per-market</strong>, not global - every market has its own editor with its own non-zero defaults. Each market exposes:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                        {[
                            "Min / Max Odds",
                            "Min / Max Value %",
                            "Min / Max Chance %",
                            "Min / Max Line",
                            "Min Drop %",
                            "Min Market %",
                            "Bookmaker Settings",
                            "Alert Date Range",
                        ].map((f) => (
                            <div key={f} className="bg-black/30 border border-white/5 rounded-lg p-2.5 text-xs text-zinc-300 text-center">{f}</div>
                        ))}
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-lg p-3 mb-4">
                        <p className="text-xs text-zinc-400 mb-1 font-medium">Example defaults - Player Shots On Target</p>
                        <code className="text-emerald-400 text-xs">Min Odds 1.2 · Max Odds 25 · Min Value 2.0% · Line 0.5–10.5</code>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300">
                        💡 Use <strong>🔧 Change All Markets</strong> to bulk-edit one setting (Min Odds, Max Odds, Min Value %, Min Chance %, Min Drop %, or Alert Date Range) across every market at once.
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-12 text-sm text-zinc-400">
                    <strong className="text-white">Tuning tip:</strong> Min Value % is still the single most effective per-market filter - raise it per market when a market gets noisy. And since Min Avg Minutes defaults to 80, most bench players are already filtered out; lower it deliberately if you hunt supersub value.
                </div>

                {/* Markets */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <BookOpen className="w-5 h-5 mr-3 text-emerald-400" />
                    Market Toggles (/markets)
                </h2>
                <p className="text-zinc-400 mb-4 text-sm">
                    <code className="text-white bg-white/10 px-1 rounded">/markets</code> shows 24 markets as a two-column inline keyboard with ✅/⬜️ toggles plus Enable All / Disable All buttons. Enable only markets you actually bet - alerts for markets you don&apos;t use dilute the signal.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                    {[
                        { name: "Anytime Goalscorer", active: true },
                        { name: "Score 2+ Goals", active: false },
                        { name: "Score 3+ Goals", active: false },
                        { name: "To Score First", active: false },
                        { name: "Goal From Header", active: false },
                        { name: "Goal From Outside Box", active: false },
                        { name: "Shots on Target", active: true },
                        { name: "Total Shots", active: true },
                        { name: "SOT Outside Box", active: false },
                        { name: "Headed Shots", active: false },
                        { name: "Headed SOT", active: false },
                        { name: "Shots Outside Box", active: false },
                        { name: "To be Booked", active: true },
                        { name: "Booked First", active: false },
                        { name: "Red Card", active: false },
                        { name: "Tackles", active: true },
                        { name: "Fouls", active: true },
                        { name: "Fouls Won", active: false },
                        { name: "Assists", active: false },
                        { name: "Shots Created", active: false },
                        { name: "Passes", active: false },
                        { name: "Offsides", active: false },
                        { name: "Goalkeeper Saves", active: false },
                        { name: "Score or Assist", active: false },
                    ].map(({ name, active }) => (
                        <div key={name} className={`rounded-lg p-3 text-xs border flex items-center space-x-2 ${active ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/10 text-zinc-400"}`}>
                            <span>{active ? "✅" : "⬜️"}</span>
                            <span>{name}</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-zinc-500 mb-12">
                    Around 40 markets are configurable in total via Player Market Settings - including Bet Builder, Interceptions, Dribbles, Blocks, Clearances, Crosses, Key Passes, Aerial Duels Won, Free Kick / Set Piece / Throw-in / Fast Break Shots, and Player H2H.
                </p>

                {/* Leagues & Bookmakers */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <Globe className="w-5 h-5 mr-3 text-blue-400" />
                    Leagues, Bookmakers &amp; Clones
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                    <div className="glass p-5 rounded-xl border border-white/10">
                        <h3 className="font-semibold text-white text-sm mb-2">🏆 League Toggles</h3>
                        <p className="text-xs text-zinc-400 m-0">Turn individual leagues on/off, with Enable All, Disable All and a top-leagues-only shortcut.</p>
                    </div>
                    <div className="glass p-5 rounded-xl border border-white/10">
                        <h3 className="font-semibold text-white text-sm mb-2">📚 Bookmaker Toggles</h3>
                        <p className="text-xs text-zinc-400 m-0">45+ bookmakers can be toggled - only <strong className="text-white">Bet365</strong> is enabled by default. Turn on the books you actually hold accounts with.</p>
                    </div>
                    <div className="glass p-5 rounded-xl border border-white/10">
                        <h3 className="font-semibold text-white text-sm mb-2">🪞 Bookmaker Clones</h3>
                        <p className="text-xs text-zinc-400 m-0">Mirror one bookmaker&apos;s settings onto another so identically-priced clone books inherit your filters automatically.</p>
                    </div>
                </div>

                {/* Alert classes */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <BellRing className="w-5 h-5 mr-3 text-red-400" />
                    Alert Types You Can Receive
                </h2>
                <p className="text-zinc-400 mb-2 text-sm">
                    Push alerts come in several distinct classes, each with its own header and its own toggles in /settings:
                </p>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4 text-xs text-blue-300">
                    ℹ️ Receiving alerts requires membership of the <strong>@PropprChat</strong> group.
                </div>
                <div className="space-y-3 mb-12">
                    {[
                        {
                            title: "⚡️ PLAYER PROP VALUE ALERT",
                            desc: "The core model-vs-bookmaker value alert: fixture header with ⚖️ power rankings, league and kickoff, then per-player position, market, odds, value %, recommended stake, appearances, minutes and per-game form."
                        },
                        {
                            title: "📉 DROPPING ODDS ALERT",
                            desc: "Fires when a price is being cut: shows old → new odds with the drop % and the bookmaker. Has its own toggle and its own date-range window (5 Mins – 14 Days)."
                        },
                        {
                            title: "🖥 SHARP PROP VALUE ALERT",
                            desc: "Edges vs Pinnacle's devigged fair price, including a CLV line, e.g. \"🎯 CLV: 🟢 +3.15% (open 3.30 → close 3.20)\"."
                        },
                        {
                            title: "📈 PLAYER PROP MARKET % ALERT",
                            desc: "Consensus alerts - a bookmaker is out of line with the market average by your Min Market % threshold. Toggle via Market Avg Alerts (optionally excluding Bet365 from the average)."
                        },
                        {
                            title: "🚀 BOOSTED ODDS ALERT",
                            desc: "Bookmaker price boosts that the model still rates as value."
                        },
                        {
                            title: "🔨 BET BUILDER VALUE",
                            desc: "Multi-leg bet-builder combos with combined model value. Toggle via Bet Builder Alerts."
                        },
                        {
                            title: "🆕 Market Release Alerts",
                            desc: "Notification the moment Bet365 releases a new market for a fixture - configurable per market group or per market."
                        },
                        {
                            title: "🔔 / 🚨 Position-Change Alerts",
                            desc: "Predicted (attacking/defensive/master toggles) and confirmed position changes - a striker moving to the wing changes every projection."
                        },
                        {
                            title: "💡PROPPR INSIGHT💡",
                            desc: "Context messages drawn from 35 insight types (streaks, matchup angles, referee quirks and more). Club Legend gated."
                        },
                        {
                            title: "🌧 Weather & Polymarket extras",
                            desc: "Alerts can carry weather lines for the fixture, and Polymarket odds shown in cents alongside liquidity lines where a matching market trades."
                        },
                    ].map(({ title, desc }) => (
                        <div key={title} className="glass p-4 rounded-xl border border-white/10">
                            <h3 className="font-mono text-white text-sm mb-1">{title}</h3>
                            <p className="text-sm text-zinc-400 m-0">{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Bankroll */}
                <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                    <BarChart2 className="w-5 h-5 mr-3 text-purple-400" />
                    Unit Sizing &amp; Bankroll Guidance
                </h2>
                <div className="glass p-6 rounded-xl border border-white/10 mb-8">
                    <p className="text-zinc-400 mb-4 text-sm">
                        The bot recommends stakes in units (u), ranging from 0.1u to 2.0u. 1u = your standard bet size - define this yourself. The base stake comes from the bookmaker-odds band, then gets adjusted by how far the model&apos;s chance sits above the bookmaker&apos;s implied probability:
                    </p>
                    <div className="space-y-2">
                        {[
                            { stake: "0.1u", label: "Bookmaker odds ≥ 15" },
                            { stake: "0.2u", label: "Odds ≥ 10" },
                            { stake: "0.25u", label: "Odds ≥ 7 or ≥ 5" },
                            { stake: "0.5u", label: "Odds ≥ 3" },
                            { stake: "0.75u", label: "Odds ≥ 2" },
                            { stake: "1.0u", label: "Odds below 2" },
                        ].map(({ stake, label }) => (
                            <div key={stake + label} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg p-3">
                                <code className="text-emerald-400 text-sm font-mono">{stake}</code>
                                <p className="text-sm text-zinc-400">{label}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-3">
                        The band stake is then scaled up or down by the delta between model chance and implied probability - a big model edge pushes the recommendation toward the 2.0u ceiling.
                    </p>
                    <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                        <p className="text-xs text-zinc-400">
                            <strong className="text-white">Community guideline:</strong> Never stake more than 1–2% of your total bankroll on a single bet. Taking negative-value plays is exactly what bookmakers want.
                        </p>
                    </div>
                </div>

                {/* Time-based filters */}
                <div className="glass p-6 rounded-xl border border-white/10">
                    <div className="flex items-center space-x-3 mb-4">
                        <Clock className="w-5 h-5 text-zinc-400" />
                        <h3 className="font-semibold text-white">Early Research Commands</h3>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">Don&apos;t just wait for alerts - use these to get ahead of the market:</p>
                    <div className="space-y-2">
                        {[
                            { cmd: "/today", desc: "Browse today's fixtures - one tap per fixture for instant analysis" },
                            { cmd: "/tomorrow", desc: "Tomorrow's fixtures - best time to capture early value before odds sharpen" },
                            { cmd: "/value", desc: "Current top value plays across your markets (Club Legend / Founder / World Cup Package)" },
                        ].map(({ cmd, desc }) => (
                            <div key={cmd} className="flex items-start space-x-3 bg-black/30 border border-white/5 rounded-lg p-3">
                                <code className="text-emerald-400 text-sm font-mono shrink-0">{cmd}</code>
                                <p className="text-sm text-zinc-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DocsLayout>
    );
}
