"use client";

import { useRef } from "react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Code2, Search, BarChart2 } from "lucide-react";
import { PhoneSimulator, CommandResponse, PhoneSimulatorHandle } from "@/components/ui/PhoneSimulator";

// Inline-keyboard button chips (mirrors Telegram's inline keyboard under a message)
const Kb = ({ label }: { label: string }) => (
    <span className="flex-1 text-center text-[10px] bg-white/10 border border-white/15 rounded-md px-1.5 py-1 text-blue-300 truncate">
        {label}
    </span>
);
const KbRow = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-1 mt-1">{children}</div>
);

const TierBadge = ({ tier }: { tier: string }) => (
    <span className="ml-2 text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 align-middle">
        {tier}
    </span>
);

const teamCommands: CommandResponse[] = [
    {
        command: "/value",
        name: "Find Value",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Top Value Bets</span><br />
                How would you like to browse?
                <KbRow><Kb label="⚙️ Use My Settings" /><Kb label="🎯 Choose Markets" /></KbRow>
                <div className="border-t border-white/10 my-2" />
                🕒 Select a timeframe:
                <KbRow><Kb label="📅 Today" /><Kb label="📅 Tomorrow" /><Kb label="📅 Next 7 Days" /></KbRow>
                <div className="border-t border-white/10 my-2" />
                📊 <span className="text-white font-bold">Top Value Bets - Today (Page 1/5)</span><br /><br />
                🎯 <span className="text-emerald-300">Burnley Over 2.5 Shots On Target (Bet365)</span><br />
                ⚖️ 🟢 74.20 vs 🟠 41.80<br />
                ✈️ vs Tottenham (16 Aug 14:00) | Proj. 2.81<br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                📚 Odds: 1.83 (Model: 1.45 | 69.0% Chance)<br />
                🕒 Last 10 For: 3, 4, 1, 5, 2, 3, 4<br />
                🕒 Opponent Against: 2, 1, 4, 2, 3, 2, 5<br />
                💰 Stake: 0.5u | 🔗 Bet365
                <KbRow><Kb label="⚡ Add To Betslip" /></KbRow>
                <KbRow><Kb label="⬅️ Prev" /><Kb label="Next ➡️" /></KbRow>
                <KbRow><Kb label="🔄 Refresh" /><Kb label="⬅️ Back to Timeframes" /></KbRow>
            </div>
        )
    },
    {
        command: "/fixture",
        name: "Fixture Scan",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                💬 Please send me the fixture you&apos;re looking for, e.g., &apos;Arsenal vs Chelsea&apos; or just &apos;Chelsea&apos;.<br />
                <span className="text-blue-300 italic">› Real Madrid vs Barcelona</span><br />
                🔍 Processing your request...<br /><br />
                ✅ Fixture found: Real Madrid vs Barcelona.<br />
                🕒 Processing all markets...<br />
                <span className="text-zinc-500 italic">(full scans can take up to 180 seconds - alerts arrive as they&apos;re found)</span>
                <div className="border-t border-white/10 my-2" />
                ✅ Found 12 total positive alerts! 8 match your settings and have been sent.<br /><br />
                💡 4 alerts were filtered out.
                <KbRow><Kb label="📊 Why Were Alerts Filtered?" /><Kb label="🔍 Show Filtered Alerts" /></KbRow>
                <KbRow><Kb label="⚙️ Adjust Settings" /><Kb label="🔄 Refresh" /></KbRow>
            </div>
        )
    },
    {
        command: "/stats",
        name: "Top Stat Projections",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 Select a stat:
                <KbRow><Kb label="⚽ Goals" /><Kb label="🚩 Corners" /></KbRow>
                <KbRow><Kb label="📒 Cards" /><Kb label="🎯 SOT" /></KbRow>
                <span className="text-zinc-500 italic">…~70 stats in the grid</span>
                <div className="border-t border-white/10 my-2" />
                🕒 Select a time range:
                <KbRow><Kb label="📅 Today" /><Kb label="📅 Tomorrow" /><Kb label="📅 Next 7 Days" /></KbRow>
                <div className="border-t border-white/10 my-2" />
                📒 <span className="text-white font-bold">Top teams for Team Cards (Today)</span> (Page 1/5)<br /><br />
                📒🏠 Getafe (vs Sevilla) - 4.20<br />
                ⏰ 15 May 20:00<br />
                🇪🇸 La Liga<br />
                📊 For: 5, 4, 3, 5, 4<br />
                📊 Against: 3, 2, 4, 3, 2<br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-3 text-center border border-white/5 mt-1">
                    <div className="text-zinc-400">O2.5</div><div className="text-zinc-400">O3.5</div><div className="text-zinc-400">O4.5</div>
                    <div className="text-white">90.0%</div><div className="text-white">65.0%</div><div className="text-white">40.0%</div>
                    <div className="text-emerald-400">1.11</div><div className="text-emerald-400">1.54</div><div className="text-emerald-400">2.50</div>
                </div>
                <KbRow><Kb label="⬅️ Prev" /><Kb label="Next ➡️" /></KbRow>
                <KbRow><Kb label="Show Unders ⬇️" /><Kb label="🔙 Back to Stats" /></KbRow>
            </div>
        )
    },
    {
        command: "/streak",
        name: "Streak Finder",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🚩 <span className="text-white font-bold">Current 5+ Team Corners Streaks (Today) - 5+ Games</span> (Page 1/3)<br /><br />
                🚩🏠 Arsenal (vs Chelsea) - 6.80<br />
                ⏰ 15 May 20:00<br />
                📊 Per Match: 7, 6, 8, 5, 9<br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-4 text-center border border-white/5 mt-1">
                    <div className="text-zinc-400">O4.5</div><div className="text-zinc-400">O5.5</div><div className="text-zinc-400">O6.5</div><div className="text-zinc-400">O7.5</div>
                    <div className="text-white">88.5%</div><div className="text-white">66.5%</div><div className="text-white">42.8%</div><div className="text-white">25.9%</div>
                    <div className="text-emerald-400">1.13</div><div className="text-emerald-400">1.50</div><div className="text-emerald-400">2.34</div><div className="text-emerald-400">3.86</div>
                </div><br />
                🚩✈️ Man City (vs Nottm Forest) - 6.50<br />
                ⏰ 15 May 15:00<br />
                📊 Per Match: 5, 7, 8, 5, 6<br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-4 text-center border border-white/5 mt-1">
                    <div className="text-zinc-400">O4.5</div><div className="text-zinc-400">O5.5</div><div className="text-zinc-400">O6.5</div><div className="text-zinc-400">O7.5</div>
                    <div className="text-white">82.3%</div><div className="text-white">60.2%</div><div className="text-white">38.4%</div><div className="text-white">20.5%</div>
                    <div className="text-emerald-400">1.21</div><div className="text-emerald-400">1.66</div><div className="text-emerald-400">2.60</div><div className="text-emerald-400">4.88</div>
                </div>
                <KbRow><Kb label="⬅️ Prev" /><Kb label="Next ➡️" /></KbRow>
            </div>
        )
    },
    {
        command: "/markets",
        name: "Market Toggles",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Enable/Disable Betting Markets:</span>
                <KbRow><Kb label="✅ Team Corners" /><Kb label="✅ Team Cards" /></KbRow>
                <KbRow><Kb label="⬜️ Team Fouls" /><Kb label="✅ Team Shots" /></KbRow>
                <KbRow><Kb label="✅ Team Shots On Target" /><Kb label="⬜️ Team Offsides" /></KbRow>
                <KbRow><Kb label="✅ Both Teams To Score" /><Kb label="✅ Total Goals" /></KbRow>
                <span className="text-zinc-500 italic">…~55 markets in a two-column keyboard</span>
                <KbRow><Kb label="✅ Enable All Markets" /><Kb label="⬜️ Disable All Markets" /></KbRow>
            </div>
        )
    },
    {
        command: "/unmute",
        name: "Unmute Alerts",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🔇 <span className="text-white font-bold">Muted Items</span><br />
                Select an item to unmute it:<br /><br />
                <span className="text-zinc-300 font-bold">Fixtures:</span>
                <KbRow><Kb label="Real Madrid vs Barcelona" /></KbRow>
                <span className="text-zinc-300 font-bold">Leagues:</span>
                <KbRow><Kb label="Italian Serie B" /></KbRow>
            </div>
        )
    },
    {
        command: "/today",
        name: "Today's Games",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📅 <span className="text-white font-bold">Today&apos;s Fixtures (Page 1/4)</span><br /><br />
                <span className="text-zinc-200 font-bold">Champions League</span><br />
                – Real Madrid vs Dortmund (20:00)<br />
                – PSG vs AC Milan (20:00)<br /><br />
                <span className="text-zinc-200 font-bold">Premier League</span><br />
                – Arsenal vs Chelsea (17:30)<br /><br />
                <span className="text-zinc-500">(3 Fixtures have no projections)</span>
                <KbRow><Kb label="Real Madrid vs Dortmund" /></KbRow>
                <KbRow><Kb label="PSG vs AC Milan" /></KbRow>
                <KbRow><Kb label="Arsenal vs Chelsea" /></KbRow>
                <KbRow><Kb label="🕐 Time View" /></KbRow>
                <KbRow><Kb label="⬅️ Prev" /><Kb label="Next ➡️" /></KbRow>
            </div>
        )
    },
    {
        command: "/tomorrow",
        name: "Tomorrow's Games",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📅 <span className="text-white font-bold">Tomorrow&apos;s Fixtures (Page 1/3)</span><br /><br />
                <span className="text-zinc-200 font-bold">Europa League</span><br />
                – Roma vs Leverkusen (20:00)<br />
                – Marseille vs Atalanta (20:00)<br /><br />
                <span className="text-zinc-500">(2 Fixtures have no projections)</span>
                <KbRow><Kb label="Roma vs Leverkusen" /></KbRow>
                <KbRow><Kb label="Marseille vs Atalanta" /></KbRow>
                <KbRow><Kb label="🕐 Time View" /></KbRow>
                <KbRow><Kb label="⬅️ Prev" /><Kb label="Next ➡️" /></KbRow>
            </div>
        )
    },
    {
        command: "/team Arsenal",
        name: "Team Projections",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">🏠Arsenal</span> vs Chelsea<br />
                <span className="italic text-zinc-400">Team Markets - Page 1 of 3</span><br /><br />
                🎯 <span className="font-bold">Shots On Target - 6.50</span><br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-4 text-center border border-white/5 mt-1">
                    <div className="text-zinc-400">O4.5</div><div className="text-zinc-400">O5.5</div><div className="text-zinc-400">O6.5</div><div className="text-zinc-400">O7.5</div>
                    <div className="text-white">87.5%</div><div className="text-white">72.1%</div><div className="text-white">53.6%</div><div className="text-white">35.4%</div>
                </div><br />
                🚩 <span className="font-bold">Corners - 5.80</span><br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-4 text-center border border-white/5 mt-1">
                    <div className="text-zinc-400">O3.5</div><div className="text-zinc-400">O4.5</div><div className="text-zinc-400">O5.5</div><div className="text-zinc-400">O6.5</div>
                    <div className="text-white">85.3%</div><div className="text-white">70.3%</div><div className="text-white">52.8%</div><div className="text-white">35.9%</div>
                </div><br />
                <span className="text-zinc-500 italic">…4 markets per page</span>
                <KbRow><Kb label="🕕 1st Half" /></KbRow>
                <KbRow><Kb label="⬅️ Prev" /><Kb label="Next ➡️" /></KbRow>
            </div>
        )
    },
    {
        command: "/league",
        name: "League Rankings",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🎯 <span className="text-white font-bold">Top teams for Team Shots On Target (Premier League - Today)</span> (Page 1/2)<br /><br />
                🎯🏠 Arsenal (vs Chelsea) - 6.50<br />
                ⏰ 15 May 20:00<br />
                📊 For: 8, 12, 9, 11, 10<br />
                📊 Against: 4, 5, 3, 6, 4<br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-4 text-center border border-white/5 mt-1">
                    <div className="text-zinc-400">O4.5</div><div className="text-zinc-400">O5.5</div><div className="text-zinc-400">O6.5</div><div className="text-zinc-400">O7.5</div>
                    <div className="text-white">87.5%</div><div className="text-white">72.1%</div><div className="text-white">53.6%</div><div className="text-white">35.4%</div>
                    <div className="text-emerald-400">1.14</div><div className="text-emerald-400">1.39</div><div className="text-emerald-400">1.87</div><div className="text-emerald-400">2.82</div>
                </div><br />
                🎯🏠 Man City (vs Nottm Forest) - 6.20<br />
                ⏰ 15 May 15:00<br />
                📊 For: 7, 5, 8, 9, 6<br />
                📊 Against: 3, 4, 2, 5, 3<br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-4 text-center border border-white/5 mt-1">
                    <div className="text-zinc-400">O4.5</div><div className="text-zinc-400">O5.5</div><div className="text-zinc-400">O6.5</div><div className="text-zinc-400">O7.5</div>
                    <div className="text-white">83.3%</div><div className="text-white">66.5%</div><div className="text-white">47.8%</div><div className="text-white">30.6%</div>
                    <div className="text-emerald-400">1.20</div><div className="text-emerald-400">1.50</div><div className="text-emerald-400">2.09</div><div className="text-emerald-400">3.26</div>
                </div>
                <KbRow><Kb label="⬅️ Prev" /><Kb label="Next ➡️" /></KbRow>
            </div>
        )
    },
    {
        command: "/weather",
        name: "Weather Alerts",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-blue-400 font-bold">⚠️ Adverse Weather Alert ⚠️</span><br />
                📅 Saturday, 16 Aug<br />
                Found 3 fixture(s) with adverse weather.<br />
                📄 Page 1/2<br /><br />
                1. <span className="text-white font-bold">Everton vs Wolves</span><br />
                <span className="pl-4 block">🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League</span>
                <span className="pl-4 block">⏰ 15:00</span>
                <span className="pl-4 block">🌧 Heavy Rain</span>
                <span className="pl-4 block">💨 Wind: 45 km/h</span><br />
                2. <span className="text-white font-bold">Bayern vs Stuttgart</span><br />
                <span className="pl-4 block">🇩🇪 Bundesliga</span>
                <span className="pl-4 block">⏰ 17:30</span>
                <span className="pl-4 block">❄️ Snow Showers</span>
                <KbRow><Kb label="⬅️ Prev" /><Kb label="Next ➡️" /></KbRow>
            </div>
        )
    },
    {
        command: "/top",
        name: "Top Match Projections",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Top Teams - 🎯 SOT</span><br />
                <span className="italic text-zinc-400">Global Rankings (All Leagues)</span><br /><br />
                🥇 <span className="font-bold">Arsenal</span><br />
                <span className="pl-4">6.50/match | +20.5% vs avg</span><br />
                <span className="pl-4 italic text-zinc-400">Premier League</span><br /><br />
                🥈 <span className="font-bold">Real Madrid</span><br />
                <span className="pl-4">6.40/match | +18.2% vs avg</span><br />
                <span className="pl-4 italic text-zinc-400">La Liga</span><br /><br />
                🥉 <span className="font-bold">Man City</span><br />
                <span className="pl-4">6.20/match | +15.2% vs avg</span><br />
                <span className="pl-4 italic text-zinc-400">Premier League</span><br /><br />
                <span className="text-zinc-500 italic">…15 entries shown</span>
                <KbRow><Kb label="🏆 Filter by League" /><Kb label="🔙 Back to Stats" /></KbRow>
            </div>
        )
    },
    {
        command: "/topteam Arsenal",
        name: "Top Team Stats",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Arsenal</span><br />
                <span className="italic text-zinc-400">Team Shots on Target</span><br /><br />
                <span className="font-bold">Average:</span> 6.50/match<br />
                <span className="font-bold">Home:</span> 7.00/match<br />
                <span className="font-bold">Away:</span> 6.00/match<br /><br />
                <span className="font-bold">League Rank:</span> #1 of 20<br />
                <span className="font-bold">vs League Avg:</span> <span className="text-green-400">+20.5%</span><br />
                <span className="font-bold">League Avg:</span> 5.40/match<br />
            </div>
        )
    },
    {
        command: "/topleague Premier League",
        name: "Top League Stats",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Top Teams - Team Shots on Target</span><br />
                <span className="italic text-zinc-400">Premier League</span><br /><br />
                🥇 <span className="font-bold">Arsenal</span><br />
                <span className="pl-4">6.50/match | +20.5% vs avg</span><br /><br />
                🥈 <span className="font-bold">Man City</span><br />
                <span className="pl-4">6.20/match | +15.2% vs avg</span><br /><br />
                🥉 <span className="font-bold">Liverpool</span><br />
                <span className="pl-4">5.80/match | +10.1% vs avg</span><br /><br />
                4. <span className="font-bold">Tottenham</span><br />
                <span className="pl-4">5.65/match | +8.4% vs avg</span><br />
            </div>
        )
    },
    {
        command: "/settings",
        name: "Settings Menu",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                ⚙️ <span className="text-white font-bold">Settings Menu</span><br />
                Current Configuration:<br />
                📊 Data Scope: Last 10 Games<br />
                🌍 Timezone: UTC<br />
                🔔 Notifications: ON<br />
                🧠 Active Preset: Gegenpress
                <KbRow><Kb label="🧠 Optimal+ Presets" /></KbRow>
                <KbRow><Kb label="🃏 Advanced Card Stats" /><Kb label="🧑‍⚖️ Referee Stats" /></KbRow>
                <KbRow><Kb label="📊 Data Scope" /><Kb label="⚡️ Market Release Alerts" /></KbRow>
                <KbRow><Kb label="🔨 Bet Builder Alerts" /><Kb label="📊 Team Market Settings" /></KbRow>
                <KbRow><Kb label="📅 Alert Date Range" /><Kb label="🌍 Timezone" /></KbRow>
                <KbRow><Kb label="🔔 Notifications" /><Kb label="📉 Dropping Odds Alerts" /></KbRow>
                <KbRow><Kb label="🚨 XI Change Alerts" /><Kb label="🧊 Freeze Alerts" /></KbRow>
                <KbRow><Kb label="🏆 League Toggles" /><Kb label="📚 Bookmaker Toggles" /></KbRow>
                <KbRow><Kb label="🔄 Bookmaker Clones" /><Kb label="🧊 Freeze Settings" /></KbRow>
            </div>
        )
    },
    {
        command: "/track",
        name: "Bet Tracker",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Betting Statistics - @user</span><br /><br />
                📈 <span className="text-zinc-200 font-bold">Performance</span><br />
                ├ Total Bets: 37<br />
                ├ Settled: 36<br />
                ├ Wins: 24<br />
                ├ Losses: 11<br />
                ├ Refunds: 1<br />
                ├ Pending: 1<br />
                └ Win Rate: 68.6%<br /><br />
                💰 <span className="text-zinc-200 font-bold">Financials (settled only)</span><br />
                ├ Staked: 21.50u<br />
                ├ Returns: 25.46u<br />
                ├ Profit/Loss: <span className="text-emerald-400">+3.96u</span><br />
                └ ROI: <span className="text-emerald-400">+18.4%</span><br /><br />
                📝 <span className="text-zinc-200 font-bold">Recent Bets</span><br />
                <span className="text-zinc-400">• Burnley Over 2.5 SOT @ 1.83 - ✅ Won</span><br />
                <span className="text-zinc-400">• Getafe Over 3.5 Cards @ 2.10 - ⏳ Pending</span>
                <KbRow><Kb label="➕ Add Bet" /><Kb label="⏳ View Pending" /></KbRow>
                <KbRow><Kb label="🏁 View Settled" /><Kb label="📊 View All Bets" /></KbRow>
                <KbRow><Kb label="🔄 Auto-Settle Bets" /></KbRow>
            </div>
        )
    },
    {
        command: "/status",
        name: "Bot Status",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🟢 <b><span className="text-emerald-400">Bot Status: Online</span></b><br /><br />
                📋 <b><span className="text-white">Your Active Requests (1):</span></b><br /><br />
                <b>Type:</b> fixture<br />
                <b>State:</b> Processing...<br />
                <b>Started:</b> 14:02:33 UTC<br />
                <b>Age:</b> 12s<br />
                <b>Args:</b> Real Madrid vs Barcelona<br />
                <b>Fixture:</b> Real Madrid vs Barcelona
                <KbRow><Kb label="🗑 Clear All Requests" /><Kb label="🔄 Refresh" /></KbRow>
            </div>
        )
    },
    {
        command: "/pricing",
        name: "Pricing Tiers",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                💎 <span className="text-purple-400 font-bold">Proppr Team Bot Plans</span><br /><br />
                🆓 <span className="text-white font-bold">Reserve - FREE</span><br />
                <span className="text-zinc-400">Alerts with default settings. Limited: /stats 3×/day, /team 1×/24h. No /fixture, /value or settings changes.</span><br /><br />
                ⚽ <span className="text-white font-bold">Regular Starter - £11.99/mo</span><br />
                <span className="text-zinc-400">Full settings control, unlimited stats &amp; 7-day ranges. Still no /fixture or /value.</span><br /><br />
                👑 <span className="text-white font-bold">Club Legend - £19.99/mo</span><br />
                <span className="text-zinc-400">Everything unlocked: /fixture, /value, Proppr Insights, Optimal+ presets.</span>
                <KbRow><Kb label="⚽ Subscribe: Regular Starter" /></KbRow>
                <KbRow><Kb label="👑 Subscribe: Club Legend" /></KbRow>
                <KbRow><Kb label="🔄 Refresh Status" /></KbRow>
            </div>
        )
    },
    {
        command: "/language",
        name: "Language",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🌍 <span className="text-white font-bold">Select your language:</span>
                <KbRow><Kb label="✓ 🇬🇧 English" /><Kb label="🇪🇸 Español" /></KbRow>
                <KbRow><Kb label="🇹🇷 Türkçe" /><Kb label="🇵🇹 Português" /></KbRow>
                <KbRow><Kb label="🇩🇪 Deutsch" /><Kb label="🇫🇷 Français" /></KbRow>
                <KbRow><Kb label="🇮🇹 Italiano" /></KbRow>
            </div>
        )
    },
    {
        command: "/tutorial",
        name: "Tutorial",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                Ready to turn your football knowledge into actual profit? 💰 This 5-minute crash course walks you through finding, filtering and tracking value bets - all inside Telegram.
                <KbRow><Kb label="🚀 Let's Go! Show Me The Money!" /></KbRow>
            </div>
        )
    },
    {
        command: "/start",
        name: "Main Menu",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                ⚽️ <span className="text-white font-bold">Welcome to Proppr teamBot!</span><br /><br />
                <span className="text-zinc-200 font-bold">VALUE &amp; ALERTS</span><br />
                /value · /fixture · /markets · /unmute<br /><br />
                <span className="text-zinc-200 font-bold">ANALYSIS &amp; STATS</span><br />
                /stats · /streak · /team · /top · /topteam · /topleague · /each · /teammost<br /><br />
                <span className="text-zinc-200 font-bold">BROWSE &amp; DISCOVER</span><br />
                /today · /tomorrow · /league · /weather · /freeze · /outrights · /live<br /><br />
                <span className="text-zinc-200 font-bold">CUSTOMIZATION &amp; HELP</span><br />
                /settings · /language · /tutorial · /track · /refer · /pricing
                <div className="border-t border-white/10 my-2" />
                What would you like to do first?
                <KbRow><Kb label="🎓 Start Interactive Tutorial" /></KbRow>
                <KbRow><Kb label="📊 Market Settings" /><Kb label="⚙️ Settings" /></KbRow>
                <KbRow><Kb label="🔗 Join Group Chat" /></KbRow>
            </div>
        )
    }
];

export default function TeamBotCommands() {
    const phoneRef = useRef<PhoneSimulatorHandle>(null);

    const handleTrigger = (cmd: string) => {
        phoneRef.current?.triggerCommand(cmd);
    };

    const Cmd = ({ cmd, customClass }: { cmd: string, customClass: string }) => (
        <button onClick={() => handleTrigger(cmd)} className={`cursor-pointer transition-transform inline-flex items-center active:scale-95 ${customClass}`}>
            {cmd}
        </button>
    );

    return (
        <DocsLayout>
            <div className="flex flex-col lg:flex-row gap-8 pb-20">
                <div className="flex-1 max-w-4xl">
                    <div className="mb-8 flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-400/10 flex items-center justify-center">
                            <Code2 className="w-6 h-6 text-blue-400" />
                        </div>
                        <h1 className="text-4xl font-heading font-bold text-white">Complete Command Guide</h1>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                            The Team Bot powers the Player Bot underneath. It is operated entirely through Telegram commands and inline keyboards. Every user-facing command is covered below (a handful of admin-only commands exist but are hidden).
                        </p>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-12">
                            <p className="text-amber-200 text-sm m-0">
                                <strong>Membership gate:</strong> new users must join the <a href="https://t.me/PropprChat" className="text-amber-300 underline">@PropprChat</a> group before the bot unlocks - <code className="bg-white/10 px-1 rounded">/start</code> shows a join prompt until you&apos;re a member.
                            </p>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            1. Discovery &amp; Value (The Core)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/value" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /><TierBadge tier="Club Legend" /></h4>
                                <p className="text-sm text-zinc-400">Browse the top-ranked value bets. Choose your settings or hand-pick markets, pick a timeframe (Today / Tomorrow / Next 7 Days), then page through ranked entries with power rankings, projections and one-tap betslip adds. Club Legend / World Cup Package only.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/fixture" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /><TierBadge tier="Club Legend" /></h4>
                                <p className="text-sm text-zinc-400">Scan one match across every market. Send a fixture (or just one team name), the bot processes all markets (up to 180s) and sends each positive alert, then a summary with a breakdown of anything your settings filtered out. Club Legend / World Cup Package only.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/markets" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                <p className="text-sm text-zinc-400">Tap-to-toggle inline keyboard of ~55 alertable markets (✅/⬜️), with Enable All / Disable All shortcuts.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/unmute" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                <p className="text-sm text-zinc-400">Lists your muted fixtures and leagues as buttons - tap one to unmute it. Shows &ldquo;You have no muted fixtures or leagues.&rdquo; when empty.</p>
                            </div>
                        </div>

                        <h3 className="text-xl font-heading font-semibold text-white mt-10 mb-4">The Automated Value Alert</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            Separate from <code className="text-white bg-white/10 px-1 rounded">/value</code>, the bot pushes alerts the moment its models find an edge. This is the card that lands in your chat:
                        </p>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-12 font-mono text-[11px] leading-relaxed max-w-md">
                            <span className="text-purple-400 font-bold tracking-wider">⚡️ TEAM PROP VALUE ALERT ⚡️</span><br />
                            🏟 <span className="text-white">Tottenham Hotspur vs Burnley</span><br />
                            ⚖️ 🔥 91.20 vs 🟠 44.10<br />
                            🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                            ⏰ 16 Aug 14:00<br />
                            🌧 Heavy Rain<br />
                            💨 Wind warning: strong gusts expected<br /><br />
                            🎯 <span className="text-emerald-300">Burnley Over 2.5 Shots On Target</span><br />
                            📚 Bookmaker Odds: 1.83 (Bet365)<br />
                            🖥 <span className="text-purple-300">Model Odds: 1.45 (69% chance)</span><br />
                            🧠 Adv. Model Odds: 1.52 (66% chance)<br />
                            📈 Value: 26.4%<br />
                            💰 Recommended stake: 0.5u<br /><br />
                            ✈️ Burnley Projected (Last 10): 2.81<br />
                            📊 Team Average: 2.55<br />
                            🚨 Burnley confirmed 4 starting XI changes<br />
                            🕒 Last 10 For: 3, 4, 1, 5, 2, 3, 4<br />
                            🕒 Last 10 Opponent Against: 2, 1, 4, 2, 3, 2, 5
                            <KbRow><Kb label="◀️ Prev" /><Kb label="Next ▶️" /></KbRow>
                            <KbRow><Kb label="🔇 Mute Fixture" /><Kb label="🔇 Mute League" /></KbRow>
                            <KbRow><Kb label="🔗 Bet365" /><Kb label="⚡️ Polygun" /></KbRow>
                            <KbRow><Kb label="⚡ Add To Betslip" /><Kb label="📝 Track Bet" /></KbRow>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            <Search className="mr-3 w-6 h-6 text-emerald-400" />
                            2. Fixture Navigation
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/today" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">Today&apos;s fixtures grouped by league, one button per fixture, with a Time View / League View toggle. Fixtures without projections are hidden and counted.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/tomorrow" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">Same browser for tomorrow&apos;s schedule.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/team Arsenal" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">Requires a team name (&ldquo;❗ Usage: /team &lt;team name&gt;&rdquo;). Shows projection probability tables (4 markets per page) with a 🕕 1st Half / 🕐 Full Match toggle - not value bets. Reserve tier: 1 use per 24h.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/league" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">No argument opens a paginated league picker; with an argument it fuzzy-searches. Ranks the league&apos;s teams for a chosen stat.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/weather" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">Adverse weather report: paginated, numbered fixtures with league, kickoff, conditions and wind.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <span className="text-emerald-400 font-mono block mb-1">/live</span>
                                <span className="text-xs text-zinc-400">In-play projections: pick a live fixture, then a stat, then drill into either team.</span>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            <BarChart2 className="mr-3 w-6 h-6 text-purple-400" />
                            3. Team Stats &amp; Analysis
                        </h2>
                        <div className="space-y-4">
                            <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="w-40 bg-purple-500/10 p-4 flex items-center justify-center border-r border-white/5">
                                    <Cmd cmd="/stats" customClass="text-purple-400 font-mono" />
                                </div>
                                <div className="p-4 flex-1">
                                    <p className="text-sm text-zinc-300 m-0">Three-step browser: pick a stat (~70 available), pick a time range, get up to 25 top teams (5 pages × 5) with For/Against history and threshold tables. Includes a Show Unders ⬇️ / Show Overs ⬆️ toggle. Reserve tier: 3 uses/day; the 7-day range needs Regular Starter.</p>
                                </div>
                            </div>
                            <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="w-40 bg-purple-500/10 p-4 flex items-center justify-center border-r border-white/5">
                                    <Cmd cmd="/streak" customClass="text-purple-400 font-mono" />
                                </div>
                                <div className="p-4 flex-1">
                                    <p className="text-sm text-zinc-300 m-0">Four-step wizard: stat → timeframe → integer threshold (N+) → streak length (3+/5+/10+/20+ games). Finds teams that have hit the threshold in every one of their last N matches.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><Cmd cmd="/top" customClass="text-sm text-purple-300" /><p className="text-xs text-zinc-500 mt-1">Global top 15 for a stat, with league filter</p></div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><Cmd cmd="/topteam Arsenal" customClass="text-sm text-purple-300" /><p className="text-xs text-zinc-500 mt-1">Requires a team name - that team&apos;s stat profile</p></div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><Cmd cmd="/topleague Premier League" customClass="text-sm text-purple-300" /><p className="text-xs text-zinc-500 mt-1">Requires a league name - that league&apos;s rankings</p></div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><span className="text-sm text-purple-300 font-mono">/each</span><p className="text-xs text-zinc-500 mt-1">&ldquo;Each Team&rdquo; probability calculator: /each, /each &lt;team&gt;, or /each &lt;team&gt; vs &lt;team&gt; - full-match, 1H and 2H menus</p></div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><span className="text-sm text-purple-300 font-mono">/teammost</span><p className="text-xs text-zinc-500 mt-1">Team To Get The Most - 13 stats with Yes/No probability + odds tables and a W/D/L strip</p></div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">
                            4. Extra Value Streams
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <span className="text-blue-300 font-mono block mb-1">/freeze</span>
                                <span className="text-xs text-zinc-400">Sky Acca Freeze opportunities, rated A+ to C-. Note: the Skybet freeze poller is currently disabled due to bookmaker rate limits, so data may be stale.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <span className="text-blue-300 font-mono block mb-1">/outrights</span>
                                <span className="text-xs text-zinc-400">OddsChecker outright value - league winners, relegation and more, with EV filters (0/2/5/10%) and 4 sort modes.</span>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">
                            5. Settings, Alerts &amp; Tracking
                        </h2>
                        <div className="bg-white/5 p-5 rounded-xl border border-white/10 mb-4">
                            <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/settings" customClass="text-zinc-300 bg-white/10 px-2 py-1 rounded" /></h4>
                            <p className="text-sm text-zinc-400 mb-3">The control centre - a 17-row keyboard covering everything the bot sends you. Highlights:</p>
                            <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-5 m-0">
                                <li><strong className="text-zinc-300">Optimal+ Presets</strong> (Club Legend+): 5 backtested presets - Route One, Shoot On Sight, Work The Space, Gegenpress, Tiki-Taka - with 7-day ROI shown, one-tap apply/restore, plus a Generate-A-Preset wizard.</li>
                                <li><strong className="text-zinc-300">Team Market Settings</strong>: a per-market editor with 14 filters - Enabled, Alert Date Range, Bookmakers, Min Odds (1.0), Max Odds (50.0), Min Value % (2.5), Min Chance % (2.0), Dropping-Odds toggle, Min Drop % (0.5), Max Line (5.5), Min Line, Max Line Handicap, Max Chance % (95.0), Direction (Both/Over/Under) - plus a 🔧 Change All Markets bulk screen. Value thresholds live here, per market, not globally.</li>
                                <li><strong className="text-zinc-300">Data Scope</strong> (Last 5 / Last 10 / Season), <strong className="text-zinc-300">Alert Date Range</strong> (24h–336h, default 14 days), Timezone, Notifications.</li>
                                <li>Toggles &amp; sub-menus: Advanced Card Stats, Referee Stats, Market Release Alerts, Bet Builder Alerts, Dropping Odds Alerts, XI Change Alerts (default OFF), Freeze Alerts, League Toggles (paginated, Enable/Disable All, Top Only), Bookmaker Toggles, Bookmaker Clones, Freeze Settings (min/max odds 1.5–51, min rating, freeze leagues, date range).</li>
                            </ul>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 list-none pl-0">
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/track" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Unified bet tracker: performance + financials + recent bets, with auto-settling</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/status" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Bot health + your active requests</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/pricing" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Tiers &amp; subscribe links (/plans is an alias)</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/language" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">7 languages, tap to switch</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/tutorial" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Button-driven 5-minute crash course</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/start" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Welcome + categorised command list</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><span className="text-zinc-300 mb-1 font-mono">/refer · /refercode</span><span className="text-xs text-zinc-500">Referral hub: codes, commission, Stripe/cash/crypto payouts, shareable image cards</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><span className="text-zinc-300 mb-1 font-mono">/connect</span><span className="text-xs text-zinc-500">Link your bet-tracking account</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><span className="text-zinc-300 mb-1 font-mono">/reset · /cancel</span><span className="text-xs text-zinc-500">Reset your profile (with confirmation) / abort any conversation</span></li>
                        </ul>
                    </div>
                </div>
                <div className="hidden lg:block w-[380px] shrink-0 sticky top-24 h-max">
                    <PhoneSimulator ref={phoneRef} hideButtons={true} commands={teamCommands} botName="Team Bot" botLogo="/team-bot-logo.png" initialCommand="/value" />
                </div>
            </div>
        </DocsLayout>
    );
}
