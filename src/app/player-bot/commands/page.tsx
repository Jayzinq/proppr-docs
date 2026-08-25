"use client";

import { useRef } from "react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Code2, Search, BarChart2, FileImage } from "lucide-react";
import { PhoneSimulator, CommandResponse, PhoneSimulatorHandle } from "@/components/ui/PhoneSimulator";

/** Telegram-style inline keyboard rendered as button chips under a simulated message. */
const Keys = ({ rows }: { rows: string[][] }) => (
    <div className="mt-2 space-y-1">
        {rows.map((row, i) => (
            <div key={i} className="flex gap-1">
                {row.map((label) => (
                    <div key={label} className="flex-1 bg-white/10 border border-white/15 rounded-md py-1 px-1.5 text-center text-[9.5px] text-blue-200 leading-tight">
                        {label}
                    </div>
                ))}
            </div>
        ))}
    </div>
);

const Divider = () => <div className="my-3 border-t border-white/10" />;

const playerCommands: CommandResponse[] = [
    {
        command: "/value",
        name: "Find Value",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Top Value Bets</span><br />
                <span className="text-zinc-400">This section shows you the highest value bets that have been found by the bot, filtered according to your personal settings.</span>
                <Keys rows={[["⚙️ Use My Settings", "🎯 Choose Markets"], ["📅 Today's Value", "📆 Next 7 Days"]]} />
                <Divider />
                📊 <span className="text-white font-bold">Top Value Bets - Today (Page 1/5)</span><br />
                <span className="text-zinc-500 text-[10px]">✅ = Predicted to start | 🏥 = Potential Injury | ✓ = Started</span><br /><br />

                👤 <span className="text-white font-bold">[ST] Carlos Vinícius</span> <span className="text-zinc-400">(Gremio)</span> ✅<br />
                ⚖️ 🟢 62.45 (3rd) vs 🟡 54.82 (8th)<br />
                ⭐️ 8.10 Avg Rating<br />
                🇧🇷 Brasileiro Serie A<br />
                🏠 vs Fluminense (03 Dec 00:30)<br />
                ⚽️ To score anytime<br />
                📚 Odds: 3.4 (Model: 2.1 | 47.6% Chance)<br />
                📊 -, 3✓, 4✓, 2✓, 1, 2✓, 3✓, 5✓, 2✓<br />
                💰 Stake: 0.82u | 🔗 <span className="text-blue-300 underline">Bet365</span><br /><br />

                👤 <span className="text-white font-bold">[ST] Erling Haaland</span> <span className="text-zinc-400">(Man City)</span> ✅<br />
                ⚖️ 🟢 71.20 (1st) vs 🔴 48.10 (15th)<br />
                🔥 9.10 Avg Rating<br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ✈️ vs Nottm Forest (04 Dec 15:00)<br />
                🎯 Over 1.5 Shots on Target<br />
                📚 Odds: 2.1 (Model: 1.5 | 66.6% Chance)<br />
                📊 2✓, 1✓, 3✓, 1✓, 2✓, -, 4✓, 1✓, 2✓<br />
                💰 Stake: 1.50u | 🔗 <span className="text-blue-300 underline">Bet365</span>
                <Keys rows={[["🧾 Betslip: Vinícius", "🧾 Betslip: Haaland"], ["⬅️ Prev", "Next ➡️"], ["🔄 Refresh"], ["⬅️ Back to Timeframes"]]} />
            </div>
        )
    },
    {
        command: "/fixture",
        name: "Game Deep-Dive",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-emerald-400 font-bold">⚡️ PLAYER PROP VALUE ALERT ⚡️</span><br />
                🏟 <span className="text-white">Arsenal vs Chelsea</span><br />
                ⚖️ 🟢 62.45 (3rd) vs 🟡 54.82 (8th)<br />
                🏆 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ⏰ 03 Dec 20:15<br /><br />
                👤 <span className="text-white font-bold">Bukayo Saka (Arsenal)</span><br />
                ⭐️ 8.15 Avg Rating<br />
                🧩 Position: RW<br />
                🎯 <span className="text-emerald-300">Over 0.5 Shots On Target</span><br />
                📚 Bookmaker Odds: 1.85 (Bet365)<br />
                🖥 <span className="text-purple-300">Model Odds: 1.5 (67% chance)</span><br />
                📈 Value: 27.6%<br />
                💰 Recommended stake: 0.8u<br />
                📆 Appearances: 10(10) / 10<br />
                🕣 Avg Mins: 88<br />
                📊 Last 10: 1✓, 2✓, 1✓, 0✓, 3✓, 1✓, 2✓, 1✓, 2✓, 1✓<br />
                ✅ Predicted to start
                <Keys rows={[["🔇 Mute Fixture", "🔇 Mute League"], ["📊 Track Bet(s)", "📑 Generate Player Report"]]} />
                <Divider />
                ✅ <span className="text-zinc-300">Found 12 positive value alerts! 8 passed your filters (best odds shown per market).</span>
                <Keys rows={[["📊 Show Breakdown", "🔍 Show Filtered Alerts"], ["⚙️ Adjust Settings", "🔄 Refresh (fresh data)"]]} />
            </div>
        )
    },
    {
        command: "/sharp",
        name: "Sharp Edges",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-cyan-400 font-bold">🖥 SHARP PROP VALUE ALERT 🖥</span><br />
                🏟 <span className="text-white">Arsenal vs Chelsea</span><br />
                🏆 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ⏰ 03 Dec 20:15<br /><br />
                👤 <span className="text-white font-bold">Bukayo Saka (Arsenal)</span><br />
                🎯 <span className="text-emerald-300">Over 1.5 Shots On Target</span><br />
                📚 Bookmaker Odds: 3.30 (Bet365)<br />
                🖥 <span className="text-purple-300">Pinnacle Fair Odds: 2.85 (devigged)</span><br />
                📈 Edge: 15.8%<br />
                🎯 CLV: 🟢 +3.15% (open 3.30 → close 3.20)
                <Keys rows={[["📊 Track Bet(s)", "📑 Generate Player Report"]]} />
            </div>
        )
    },
    {
        command: "/stats",
        name: "Global Projections",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Please select a statistic:</span>
                <Keys rows={[["⚽ Goals", "🎯 Shots On Target"], ["👟 Total Shots", "🅰️ Assists"], ["🟨 Cards", "🛡 Tackles"], ["🕕 1st Half Statistics"]]} />
                <Divider />
                📊 <span className="text-white font-bold">Top Projections (Shots on Target)</span> (Page 1/10)<br />
                <span className="text-zinc-500 italic">⭐️ Indicates player is predicted to start</span><br /><br />

                📊<span className="text-white font-bold">Erling Haaland</span> (Man City) vs Nottm Forest - 2.15<br />
                🔥 9.10 Avg Rating<br />
                ⏰ 04 Dec, 15:00<br />
                📊 2*,1*,3*,1*,2*,0*,4*,1*,2*,2*<br /><br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-4 text-center border border-white/5">
                    <div className="text-zinc-400">1.5+</div><div className="text-zinc-400">2.5+</div><div className="text-zinc-400">3.5+</div><div className="text-zinc-400">4.5+</div>
                    <div className="text-white">66.6%</div><div className="text-white">35.2%</div><div className="text-white">12.1%</div><div className="text-white">4.3%</div>
                    <div className="text-blue-300">1.50</div><div className="text-blue-300">2.84</div><div className="text-blue-300">8.26</div><div className="text-blue-300">23.25</div>
                </div><br />

                📊<span className="text-white font-bold">Mohamed Salah</span> (Liverpool) vs Newcastle - 1.85<br />
                ⭐️ 8.60 Avg Rating<br />
                ⏰ 04 Dec, 19:30<br />
                📊 1*,2*,1*,1*,0*,3*,1*,2*,1*,0*
            </div>
        )
    },
    {
        command: "/streak",
        name: "Historical Patterns",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-zinc-500 text-[10px] italic">Menu chain: pick a stat → timeframe → threshold → streak length</span>
                <Divider />
                📊 <span className="text-white font-bold">Current 1.5+ Shots On Target Streaks (Next 7 Days) - 5+ Games</span> (Page 1/2)<br /><br />

                📊 <span className="text-white font-bold">Cole Palmer</span> (Chelsea) vs Nottm Forest - 1.85<br />
                ⏰ 04 Dec 15:00<br />
                📊 2,3,2,2,4,2,3,2<br /><br />

                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-4 text-center border border-white/5">
                    <div className="text-zinc-400">1.5+</div><div className="text-zinc-400">2.5+</div><div className="text-zinc-400">3.5+</div><div className="text-zinc-400">4.5+</div>
                    <div className="text-white">62.8%</div><div className="text-white">31.4%</div><div className="text-white">10.5%</div><div className="text-white">3.1%</div>
                    <div className="text-blue-300">1.59</div><div className="text-blue-300">3.18</div><div className="text-blue-300">9.52</div><div className="text-blue-300">32.25</div>
                </div><br />
            </div>
        )
    },
    {
        command: "/markets",
        name: "Market Toggles",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Enable/Disable Betting Markets:</span><br />
                <span className="text-zinc-400">Select which markets you'd like to receive alerts for.</span>
                <Keys rows={[
                    ["✅ Player Goals", "✅ Shots On Target"],
                    ["✅ Total Shots", "⬜️ Player Assists"],
                    ["✅ To Be Booked", "⬜️ Player Tackles"],
                    ["⬜️ Score 2+ Goals", "⬜️ To Score First"],
                    ["⬜️ Goal From Header", "⬜️ Fouls Won"],
                    ["⬜️ Passes", "⬜️ Offsides"],
                ]} />
                <span className="text-[10px] text-zinc-500 block mt-1">…24 markets in total, 2 per row</span>
                <Keys rows={[["✅ Enable All Markets", "⬜️ Disable All Markets"], ["⬅️ Back to Settings"]]} />
            </div>
        )
    },
    {
        command: "/unmute",
        name: "Unmute Alerts",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🔇 <span className="text-white font-bold">Muted Items</span><br /><br />
                Select an item to unmute it:<br /><br />
                🏟️ <span className="text-zinc-300 font-bold">Muted Fixtures:</span>
                <Keys rows={[["Everton vs Wolves"]]} />
                <br />
                🏆 <span className="text-zinc-300 font-bold">Muted Leagues:</span>
                <Keys rows={[["Ligue 1"]]} />
            </div>
        )
    },
    {
        command: "/today",
        name: "Today's Games",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📅 <span className="text-white font-bold">Today's Fixtures (Dec 03)</span><br />
                <span className="text-zinc-500 text-[10px]">Tap a fixture for instant analysis</span>
                <Keys rows={[
                    ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Arsenal vs Chelsea - 20:15"],
                    ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Fulham vs Brighton - 19:30"],
                    ["🇮🇹 Milan vs Monza - 19:45"],
                    ["◀️ Prev", "Next ▶️"],
                    ["🔃 Sort: League / Time"],
                    ["💡 PROPPR INSIGHTS 💡"],
                ]} />
            </div>
        )
    },
    {
        command: "/tomorrow",
        name: "Tomorrow's Games",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📅 <span className="text-white font-bold">Tomorrow's Fixtures (Dec 04)</span><br />
                <span className="text-zinc-500 text-[10px]">Tap a fixture for instant analysis</span>
                <Keys rows={[
                    ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Man City vs Nottm Forest - 15:00"],
                    ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Liverpool vs Everton - 17:30"],
                    ["◀️ Prev", "Next ▶️"],
                    ["🔃 Sort: League / Time"],
                    ["💡 PROPPR INSIGHTS 💡"],
                ]} />
            </div>
        )
    },
    {
        command: "/team",
        name: "Team Fixture Search",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-zinc-500 italic">User: /team Arsenal</span>
                <Divider />
                🔍 <span className="text-white font-bold">Did you mean one of these teams?</span>
                <Keys rows={[["Arsenal"], ["Arsenal Sarandi"]]} />
                <Divider />
                📅 <span className="text-white font-bold">Upcoming Fixtures - Arsenal</span>
                <Keys rows={[
                    ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Arsenal vs Chelsea - 03 Dec 20:15"],
                    ["🏆 Monaco vs Arsenal - 11 Dec 20:00"],
                ]} />
                <span className="text-[10px] text-zinc-500 block mt-1">❗ Requires an argument: /team Arsenal</span>
            </div>
        )
    },
    {
        command: "/league",
        name: "League Browser",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🌍 <span className="text-white font-bold">Select a league:</span> <span className="text-zinc-500">(Page 1/12)</span>
                <Keys rows={[
                    ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League", "🇪🇸 La Liga"],
                    ["🇮🇹 Serie A", "🇩🇪 Bundesliga"],
                    ["🇫🇷 Ligue 1", "🏆 Champions League"],
                    ["◀️ Prev", "Next ▶️"],
                ]} />
                <span className="text-[10px] text-zinc-500 block mt-1">With no arguments /league lists every enabled league; pass a name (e.g. /league Serie A) to jump straight to its fixtures.</span>
            </div>
        )
    },
    {
        command: "/weather",
        name: "Weather Alerts",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                ⚠️ <span className="text-amber-400 font-bold">Adverse Weather Alert</span> ⚠️<br />
                📅 Wednesday, 03 Dec<br /><br />
                Found 2 fixture(s) with adverse weather conditions:<br />
                📄 Page 1/1<br /><br />
                1. <span className="text-white font-bold">Everton vs Wolves</span><br />
                🏆 Premier League<br />
                ⏰ 20:15<br />
                🌧 Heavy rain (85% chance)<br />
                💨 Wind: 32 km/h<br /><br />
                2. <span className="text-white font-bold">Bayern vs Stuttgart</span><br />
                🏆 Bundesliga<br />
                ⏰ 19:30<br />
                ❄️ Snow showers<br />
                💨 Wind: 18 km/h
                <Keys rows={[["🔕 Disable Daily Weather Alerts"]]} />
                <span className="text-[10px] text-zinc-500 block mt-1">Covers today only (your timezone). World Cup 2026 venues are always shown with stadium details, and a daily weather push is sent automatically.</span>
            </div>
        )
    },
    {
        command: "/player",
        name: "Player Deep-Dive",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold tracking-wider">Bukayo Saka (Arsenal) vs Chelsea</span><br />
                📈 Data: Last 10 Games<br />
                ⏰ 03 Dec 20:15<br />
                <span className="text-xs text-zinc-500 italic">Page 1 of 6</span><br /><br />

                ⭐️ 8.15 Avg Rating<br /><br />

                ⚽ <span className="text-white font-bold">Player Goals - 0.40</span><br />
                📊 1✓, 0✓, 1✓, -, 0✓, 1✓, 0✓, 0, 1✓, 0✓<br />
                🎯 Penalties: 1/1 (100% Team Share)<br />
                ⚡️ First Goalscorer: 2 of last 10<br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-2 text-center border border-white/5 mt-1 mb-3">
                    <div className="text-zinc-400">1+</div><div className="text-zinc-400">2+</div>
                    <div className="text-white">36.5%</div><div className="text-white">7.2%</div>
                    <div className="text-emerald-400">2.74</div><div className="text-emerald-400">13.89</div>
                </div>

                🎯 <span className="text-white font-bold">Player Shots On Target - 1.15</span><br />
                📊 2✓, 1✓, 3✓, -, 1✓, 2✓, 1✓, 0, 2✓, 1✓<br />
                <div className="bg-black/30 p-2 rounded text-[10px] grid grid-cols-3 text-center border border-white/5 mt-1 mb-1">
                    <div className="text-zinc-400">1+</div><div className="text-zinc-400">2+</div><div className="text-zinc-400">3+</div>
                    <div className="text-white">68.4%</div><div className="text-white">31.2%</div><div className="text-white">11.5%</div>
                    <div className="text-emerald-400">1.46</div><div className="text-emerald-400">3.20</div><div className="text-emerald-400">8.70</div>
                </div>
                <span className="text-[10px] text-zinc-500 block">Each market header uses its own emoji. 4 markets per page across ~23 markets; &quot;-&quot; = stat not recorded that game.</span>
                <Keys rows={[["◀️ Previous", "Next ▶️"], ["📑 Generate Player Report"]]} />
            </div>
        )
    },
    {
        command: "/top",
        name: "Top Projections",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold tracking-wider">Top players for Shots On Target Last 10 Games (Global)</span><br /><br />

                1. 👤 Erling Haaland (Man City)<br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ⭐️ 8.64 Avg Rating<br />
                🧩 Position: ST<br />
                Total: 26 | 34.5% Team<br /><br />

                2. 👤 Mohamed Salah (Liverpool)<br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ⭐️ 8.12 Avg Rating<br />
                🧩 Position: RW<br />
                Total: 21 | 31.8% Team<br /><br />

                3. 👤 Bukayo Saka (Arsenal)<br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ⭐️ 8.01 Avg Rating<br />
                🧩 Position: RW<br />
                Total: 19 | 29.7% Team<br /><br />

                <span className="text-xs text-zinc-500">(Page 1/5)</span>
            </div>
        )
    },
    {
        command: "/topteam",
        name: "Top Team Players",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold tracking-wider">Top players for Tackles Last 10 Games (Arsenal)</span><br /><br />

                1. 👤 Declan Rice (Arsenal)<br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                🟡 7.45 Avg Rating<br />
                🧩 Position: CDM<br />
                Total: 28 | 32.4% Team<br /><br />

                2. 👤 Ben White (Arsenal)<br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                🟡 7.10 Avg Rating<br />
                🧩 Position: RB<br />
                Total: 19 | 22.0% Team<br /><br />

                3. 👤 Gabriel Magalhaes (Arsenal)<br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                🟡 7.25 Avg Rating<br />
                🧩 Position: CB<br />
                Total: 14 | 16.2% Team<br /><br />

                <span className="text-xs text-zinc-500">(Page 1/2) - requires an argument: /topteam Arsenal</span>
            </div>
        )
    },
    {
        command: "/topleague",
        name: "Top League Players",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold tracking-wider">Top players for Goals Last 10 Games (Serie A)</span><br /><br />

                1. 👤 Lautaro Martinez (Inter)<br />
                ⭐️ 8.15 Avg Rating<br />
                🧩 Position: ST<br />
                Total: 9 | 45.0% Team<br /><br />

                2. 👤 Dusan Vlahovic (Juventus)<br />
                🟡 7.65 Avg Rating<br />
                🧩 Position: ST<br />
                Total: 7 | 38.5% Team<br /><br />

                3. 👤 Victor Osimhen (Napoli)<br />
                ⭐️ 8.05 Avg Rating<br />
                🧩 Position: ST<br />
                Total: 6 | 40.0% Team<br /><br />

                <span className="text-xs text-zinc-500">(Page 1/5) - requires an argument: /topleague Serie A</span>
            </div>
        )
    },
    {
        command: "/supersub",
        name: "Supersubs",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-zinc-500 text-[10px] italic">Flow starts with a timeframe menu:</span>
                <Keys rows={[["📅 Next 24 Hours", "📆 Next 7 Days"]]} />
                <Divider />
                📊 <span className="text-white font-bold tracking-wider">Top players for Super Sub Goals (Global, Next 7 Days, Last 10 Games)</span><br /><br />
                <span className="text-zinc-500 text-[10px]">^ = supersub addition | ∗ = started</span><br /><br />

                1. 👤 Leandro Trossard (Arsenal) <span className="text-emerald-400">+0.6 Avg Gain</span><br />
                ⭐️ 8.12 Avg Rating<br />
                📊 0,0,1∗,0,0,1∗,1∗,0,0,0<br />
                🫂 0,1^,1∗,1^,0,1∗,1∗,0,1^,0<br /><br />
                Total: 3 | Total w/ sub: 6 | Biggest Gain: +1 | Avg Gain: +0.60<br /><br />

                2. 👤 Scott McTominay (Man Utd) <span className="text-emerald-400">+0.5 Avg Gain</span><br />
                🟡 7.25 Avg Rating<br />
                📊 0,0,0,1∗,0,1∗,0,0,0,0<br />
                🫂 1^,1^,0,1∗,0,1∗,1^,0,0,0<br /><br />
                Total: 2 | Total w/ sub: 5 | Biggest Gain: +1 | Avg Gain: +0.50<br /><br />

                <span className="text-xs text-zinc-500">(Page 1/5)</span>
            </div>
        )
    },
    {
        command: "/supersubteam",
        name: "Supersubs (Team)",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold tracking-wider">Top players for Super Sub Assists (Liverpool, Next 7 Days, Last 10 Games)</span><br /><br />
                <span className="text-zinc-500 text-[10px]">^ = supersub addition | ∗ = started</span><br /><br />

                1. 👤 Federico Chiesa (Liverpool) <span className="text-emerald-400">+0.4 Avg Gain</span><br />
                ⭐️ 8.10 Avg Rating<br />
                📊 0,1∗,0,0,1∗,0,1∗,0,0,0<br />
                🫂 1^,1∗,0,1^,1∗,0,1∗,1^,0,0<br /><br />
                Total: 3 | Total w/ sub: 6 | Biggest Gain: +1 | Avg Gain: +0.40<br /><br />

                <span className="text-xs text-zinc-500">(Page 1/1)</span>
            </div>
        )
    },
    {
        command: "/supersubleague",
        name: "Supersubs (League)",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold tracking-wider">Top players for Super Sub Goals (La Liga, Next 7 Days, Last 10 Games)</span><br /><br />
                <span className="text-zinc-500 text-[10px]">^ = supersub addition | ∗ = started</span><br /><br />

                1. 👤 Brahim Diaz (Real Madrid) <span className="text-emerald-400">+0.5 Avg Gain</span><br />
                ⭐️ 8.12 Avg Rating<br />
                📊 0,0,1∗,0,0,1∗,1∗,0,0,0<br />
                🫂 0,1^,1∗,1^,0,1∗,1∗,0,1^,0<br /><br />
                Total: 3 | Total w/ sub: 6 | Biggest Gain: +1 | Avg Gain: +0.50<br /><br />

                2. 👤 Marcus Rashford (Barcelona) <span className="text-emerald-400">+0.3 Avg Gain</span><br />
                🟡 7.25 Avg Rating<br />
                📊 0,0,0,1∗,0,1∗,0,0,0,0<br />
                🫂 1^,0,0,1∗,0,1∗,1^,0,0,0<br /><br />
                Total: 2 | Total w/ sub: 4 | Biggest Gain: +1 | Avg Gain: +0.33<br /><br />

                <span className="text-xs text-zinc-500">(Page 1/3)</span>
            </div>
        )
    },
    {
        command: "/either",
        name: "Either/Or Calculator",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                ⚽️ <span className="text-blue-400 font-bold">Either to Score</span><br />
                🏟 <span className="text-white">Arsenal vs Chelsea</span><br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ⏰ 03 Dec 20:15<br /><br />
                👤 <span className="text-white">Bukayo Saka (Arsenal)</span><br />
                🖥 Model Odds: 3.20 (31.2% Chance)<br /><br />
                👤 <span className="text-white">Cole Palmer (Chelsea)</span><br />
                🖥 Model Odds: 2.80 (35.7% Chance)<br /><br />
                🎯 <span className="text-emerald-400 font-bold">Combined Probability:</span><br />
                └─ 🖥 Model Odds: 1.85 (54.0% Chance)
                <Keys rows={[["📑 Generate Player Report", "➕ Add another player"], ["Change Stat", "Change Players"], ["Switch to Each", "Close"]]} />
                <span className="text-[10px] text-zinc-500 block mt-1">The header uses the stat's own emoji, and you can stack any number of players with ➕.</span>
            </div>
        )
    },
    {
        command: "/each",
        name: "Each Player Calculator",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🟨 <span className="text-purple-400 font-bold">Each To Receive A Card</span><br />
                🏟 <span className="text-white">Nottm Forest vs Everton</span><br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ⏰ 04 Dec 15:00<br /><br />
                👤 <span className="text-white">Ryan Yates (Nottm Forest)</span><br />
                🖥 Model Odds: 2.45 (40.8% Chance)<br /><br />
                👤 <span className="text-white">Idrissa Gueye (Everton)</span><br />
                🖥 Model Odds: 3.10 (32.2% Chance)<br /><br />
                🎯 <span className="text-emerald-400 font-bold">Combined Probability (BOTH):</span><br />
                └─ 🖥 Model Odds: 7.59 (13.1% Chance)
                <Keys rows={[["📑 Generate Player Report", "➕ Add another player"], ["Change Stat", "Change Players"], ["Switch to Either", "Close"]]} />
                <span className="text-[10px] text-zinc-500 block mt-1">Label reads (BOTH) with 2 players and (ALL) with 3 or more.</span>
            </div>
        )
    },
    {
        command: "/matchup",
        name: "H2H Matchups",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🎯 <span className="text-red-400 font-bold">Match Up Shots On Target</span><br />
                🏟 <span className="text-white">Arsenal vs Chelsea</span><br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ⏰ 03 Dec 20:15<br /><br />
                👤 <span className="text-white">Bukayo Saka (Arsenal)</span> to have more Shots On Target than<br />
                👤 <span className="text-white">Cole Palmer (Chelsea)</span><br />
                └─🖥 Model Odds: 2.14 (46.7% Chance)<br /><br />
                👤 <span className="text-white">Cole Palmer (Chelsea)</span> to have more Shots On Target than<br />
                👤 <span className="text-white">Bukayo Saka (Arsenal)</span><br />
                └─🖥 Model Odds: 1.87 (53.3% Chance)<br /><br />
                📊 <span className="text-zinc-300">Projections:</span><br />
                👤 Saka: 1.15 | 👤 Palmer: 1.28
                <Keys rows={[["📑 Generate Player Report"], ["Change Stat", "Change Players"], ["Close"]]} />
            </div>
        )
    },
    {
        command: "/settings",
        name: "Bot Settings",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                ⚙️ <span className="text-white font-bold">Player Alert Settings</span><br /><br />
                <span className="text-zinc-300">Current Configuration:</span><br />
                📊 Data Scope: Last 10 Games<br />
                🕒 Min Minutes: 80<br />
                🌍 Timezone: UTC<br />
                🔔 Notifications: ON
                <Keys rows={[
                    ["🏇 Optimal+ Presets"],
                    ["⚙️ Player Market Settings"],
                    ["📅 Alert Date Range", "📉 Dropping Odds Alerts"],
                    ["🏆 League Toggles", "📚 Bookmaker Toggles"],
                ]} />
                <span className="text-[10px] text-zinc-500 block mt-1">…19 menu rows in total - see the Settings &amp; Alerts page for the full breakdown.</span>
            </div>
        )
    },
    {
        command: "/track",
        name: "Bet Tracking",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                📊 <span className="text-white font-bold">Betting Statistics - @propprfan</span><br /><br />
                📈 <span className="text-zinc-300 font-bold">Performance</span><br />
                ├─ Total Bets: 73<br />
                ├─ Settled: 70<br />
                ├─ Wins: 42<br />
                ├─ Losses: 28<br />
                ├─ Refunds: 0<br />
                ├─ Pending: 3<br />
                └─ Win Rate: 60.0%<br /><br />
                💰 <span className="text-zinc-300 font-bold">Financials (settled only)</span><br />
                ├─ Staked: 61.50u<br />
                ├─ Returns: 70.23u<br />
                ├─ Profit/Loss: <span className="text-emerald-400">+8.73u</span><br />
                └─ ROI: <span className="text-emerald-400">+14.2%</span><br /><br />
                📝 <span className="text-zinc-300 font-bold">Recent Bets</span><br />
                ✅ Saka Over 0.5 SOT @ 1.85<br />
                ❌ Haaland To Score @ 2.10<br />
                ⏳ Palmer Over 1.5 SOT @ 2.30
                <Keys rows={[["➕ Add Bet", "⏳ View Pending Bets"], ["🏁 View Settled Bets", "📊 View All Bets"], ["🔄 Auto-Settle Bets"]]} />
                <span className="text-[10px] text-zinc-500 block mt-1">Settlement runs when you tap 🔄 Auto-Settle Bets - results are then graded from live data.</span>
            </div>
        )
    },
    {
        command: "/status",
        name: "Request Status",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🟢 <span className="text-white font-bold">Bot Status: Online</span><br /><br />
                📋 <span className="text-zinc-300 font-bold">Active Requests:</span><br /><br />
                1. Type: /fixture<br />
                &nbsp;&nbsp;&nbsp;State: processing<br />
                &nbsp;&nbsp;&nbsp;Started: 20:14:32<br />
                &nbsp;&nbsp;&nbsp;Age: 12s<br />
                &nbsp;&nbsp;&nbsp;Args: Arsenal vs Chelsea<br />
                &nbsp;&nbsp;&nbsp;Fixture: Arsenal vs Chelsea
                <Keys rows={[["🗑 Clear All Requests", "🔄 Refresh"]]} />
            </div>
        )
    },
    {
        command: "/pricing",
        name: "Pricing Tiers",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                💰 <span className="text-purple-400 font-bold">Proppr PlayerBot Subscription Tiers</span> 💰<br /><br />
                🪑 <span className="text-white font-bold">Reserve - FREE</span><br />
                • Basic alerts<br />
                • Limited /stats, /team access (3/day)<br /><br />
                🧤 <span className="text-white font-bold">Bench Player - £9.99</span><br />
                • Unlimited /stats, /team<br />
                • /league, /today access<br />
                • Enable/disable markets (/markets)<br /><br />
                ⚽️ <span className="text-white font-bold">Regular Starter - £23.99/mo</span><br />
                • All Bench Player features<br />
                • Customize all alert settings (/settings)<br /><br />
                🏆 <span className="text-white font-bold">Club Legend - £35.99/mo</span><br />
                • All Regular Starter features<br />
                • On-demand alerts (/fixture, /value, /sharp)<br />
                • /each, /either, /matchup, /combined, /lineups, /average, /position<br />
                • Exclusive channel access
                <Keys rows={[["Subscribe to Bench Player"], ["Subscribe to Regular Starter"], ["Subscribe to Club Legend"], ["🔄 Refresh Status"]]} />
            </div>
        )
    },
    {
        command: "/language",
        name: "Language",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🌐 <span className="text-white font-bold">Select your language / Selecciona tu idioma / Dil seçin</span><br /><br />
                <span className="text-zinc-400">Alerts will be sent in your selected language.</span>
                <Keys rows={[["🇬🇧 English", "🇪🇸 Español"], ["🇹🇷 Türkçe", "🇵🇹 Português"], ["🇩🇪 Deutsch", "🇫🇷 Français"], ["🇮🇹 Italiano"]]} />
            </div>
        )
    },
    {
        command: "/tutorial",
        name: "Tutorial",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🎓 <span className="text-blue-400 font-bold">Welcome to Proppr Academy!</span><br /><br />
                Let's get you set up to crush the books.<br />
                This tutorial takes 3 minutes.<br /><br />
                Step 1: <span className="text-white">Understanding Value (%)</span><br />
                The model compares bookmaker odds to its own statistical probabilities. When a bookmaker pays out better odds than the model's true probability, that's <span className="text-emerald-400">+EV (Expected Value)</span>.
                <Keys rows={[["➡️ Next Step"]]} />
            </div>
        )
    },
    {
        command: "/start",
        name: "Main Menu",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                ⚽️ <span className="text-white font-bold">Welcome to Proppr PlayerBot!</span><br />
                <span className="text-zinc-400 italic">Your stats-powered football betting companion.</span><br /><br />
                🔥 <span className="text-zinc-200 font-bold">VALUE &amp; ALERTS</span><br />
                • /value – See the top-rated value bets right now.<br />
                • /fixture – Get instant value alerts for a specific match.<br />
                • /unmute – Manage your muted fixtures &amp; leagues.<br /><br />
                📈 <span className="text-zinc-200 font-bold">ANALYSIS &amp; STATS</span><br />
                • /stats – View top player projections by Goals, Shots, etc.<br />
                • /player – Get a deep-dive analysis for any player.<br /><br />
                🏟 <span className="text-zinc-200 font-bold">BROWSE &amp; DISCOVER</span><br />
                • /today – Browse all fixtures happening today.<br />
                • /team – Find upcoming matches for any team.<br />
                • /league – View all fixtures for a specific league.<br /><br />
                ⚙️ <span className="text-zinc-200 font-bold">CUSTOMIZATION &amp; HELP</span><br />
                • /settings – Customize odds, value, minutes &amp; more.<br />
                • /markets – Enable or disable alerts for specific markets.<br />
                • /status – Check the status of your active requests.<br />
                • /tutorial – Run the interactive tutorial again.<br /><br />
                ⚡️Found a bug? Message @zinqgram or @professorxbets.
                <Divider />
                <Keys rows={[["🎓 Start Interactive Tutorial"], ["🔗 Join Group Chat"]]} />
            </div>
        )
    }
];

export default function PlayerBotCommands() {
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
                        <p className="text-lg text-zinc-400 leading-relaxed mb-12">
                            The Player Bot is operated entirely through Telegram commands and inline buttons. Below are the most important of its 40+ commands, categorized by use case. Tap any command to preview the real bot output in the simulator.
                        </p>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            1. Discovery &amp; Value (The Core)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/value" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                <p className="text-sm text-zinc-400">Best value bets right now across all global football leagues based on your settings. Opens with a mode menu (⚙️ Use My Settings / 🎯 Choose Markets), then a timeframe pick, then paginated results with betslip links.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/fixture" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                <p className="text-sm text-zinc-400">Get alerts for a specific match. The most popular command for deep-diving a single game - sends each ⚡️ PLAYER PROP VALUE ALERT then a filter summary with breakdown buttons.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/sharp" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                <p className="text-sm text-zinc-400">SHARP alerts - edges vs Pinnacle&apos;s devigged fair price, with CLV (closing line value) tracking on every play.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><code className="text-blue-400 bg-white/10 px-2 py-1 rounded">/average</code></h4>
                                <p className="text-sm text-zinc-400">Market-average opportunities - spots where one bookmaker is priced a consensus % above the rest of the market.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><code className="text-blue-400 bg-white/10 px-2 py-1 rounded">/betbuilder</code></h4>
                                <p className="text-sm text-zinc-400">Bet-builder combo builder - stack model-backed player legs into a single bet-builder with combined odds.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/markets" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                <p className="text-sm text-zinc-400">Enable or disable market alerts via a 24-market inline keyboard with ✅/⬜️ toggles plus Enable All / Disable All.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/unmute" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                <p className="text-sm text-zinc-400">Manage fixtures or leagues you previously muted - one button per muted item.</p>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            <Search className="mr-3 w-6 h-6 text-emerald-400" />
                            2. Fixture Navigation
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/today" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">Paginated list of today&apos;s fixtures - one button per fixture, league/time sort toggle, and a 💡 PROPPR INSIGHTS 💡 button.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/tomorrow" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">Same paginated browser for tomorrow&apos;s fixtures.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/team" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">Fixture search for one team (argument required, e.g. /team Arsenal). Replies &quot;Did you mean…?&quot; with team buttons, then that team&apos;s fixtures.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/league" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">With no arguments: a paginated league list. With a name: that league&apos;s fixtures.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <code className="text-emerald-400 font-mono block mb-1">/lineups</code>
                                <span className="text-xs text-zinc-400">Predicted / confirmed lineups plus sidelined players for a fixture.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <code className="text-emerald-400 font-mono block mb-1">/opta</code>
                                <span className="text-xs text-zinc-400">Opta Player of the Match / FIFA Fantasy Points top players for a fixture.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <Cmd cmd="/weather" customClass="text-emerald-400 font-mono block mb-1" />
                                <span className="text-xs text-zinc-400">Adverse weather report for today&apos;s fixtures (your timezone), plus a daily weather push.</span>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            <BarChart2 className="mr-3 w-6 h-6 text-purple-400" />
                            3. Player Analysis &amp; Stats
                        </h2>
                        <div className="space-y-4">
                            <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="w-32 bg-purple-500/10 p-4 flex items-center justify-center border-r border-white/5">
                                    <Cmd cmd="/player" customClass="text-purple-400 font-mono" />
                                </div>
                                <div className="p-4 flex-1">
                                    <p className="text-sm text-zinc-300 m-0">Deep-dive individual player analysis - ~23 markets paginated 4 per page, per-game form with ✓ for started games, penalty and first-goalscorer history on goal markets, plus a 📑 Generate Player Report button.</p>
                                </div>
                            </div>
                            <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="w-32 bg-purple-500/10 p-4 flex items-center justify-center border-r border-white/5">
                                    <Cmd cmd="/stats" customClass="text-purple-400 font-mono" />
                                </div>
                                <div className="p-4 flex-1">
                                    <p className="text-sm text-zinc-300 m-0">Top player projections globally. Opens a &quot;📊 Please select a statistic:&quot; grid first (including 1st-half stats), then paginated projections.</p>
                                </div>
                            </div>
                            <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="w-32 bg-purple-500/10 p-4 flex items-center justify-center border-r border-white/5">
                                    <Cmd cmd="/streak" customClass="text-purple-400 font-mono" />
                                </div>
                                <div className="p-4 flex-1">
                                    <p className="text-sm text-zinc-300 m-0">Discover player streaks by market via a menu chain: stat → timeframe → threshold → streak length. Use <code className="text-purple-300">/streakleague</code> for streaks scoped to a single league.</p>
                                </div>
                            </div>
                            <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="w-32 bg-purple-500/10 p-4 flex items-center justify-center border-r border-white/5">
                                    <code className="text-purple-400 font-mono">/position</code>
                                </div>
                                <div className="p-4 flex-1">
                                    <p className="text-sm text-zinc-300 m-0">Best positions against upcoming opponents - which roles (ST, RW, CDM…) profile best vs each defense.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><Cmd cmd="/top" customClass="text-sm text-purple-300" /><p className="text-xs text-zinc-500 mt-1">Top stats globally</p></div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><Cmd cmd="/topteam" customClass="text-sm text-purple-300" /><p className="text-xs text-zinc-500 mt-1">Top stats for a team (argument required)</p></div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><Cmd cmd="/topleague" customClass="text-sm text-purple-300" /><p className="text-xs text-zinc-500 mt-1">Top stats for a league (argument required)</p></div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><Cmd cmd="/supersub" customClass="text-sm text-purple-300" /><p className="text-[10px] text-zinc-500 mt-1">Global supersub gains</p></div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><Cmd cmd="/supersubteam" customClass="text-sm text-purple-300" /><p className="text-[10px] text-zinc-500 mt-1">Team supersub gains</p></div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5"><Cmd cmd="/supersubleague" customClass="text-sm text-purple-300" /><p className="text-[10px] text-zinc-500 mt-1">League supersub gains</p></div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">
                            4. Combinations &amp; Comparisons
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/either" customClass="text-amber-400" /></h4>
                                <p className="text-sm text-zinc-400">Combined odds for ANY of the selected players to achieve a stat (e.g. Saka OR Martinelli to score). Supports any number of players via ➕ Add another player.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/each" customClass="text-amber-400" /></h4>
                                <p className="text-sm text-zinc-400">Combined odds for ALL selected players to achieve a stat - labelled (BOTH) for 2 players, (ALL) for 3+.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><Cmd cmd="/matchup" customClass="text-amber-400" /></h4>
                                <p className="text-sm text-zinc-400">Player vs player: model odds for each player to out-perform the other on a stat, plus both projections.</p>
                            </div>
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                <h4 className="text-white font-mono mb-2 text-lg"><code className="text-amber-400">/combined</code></h4>
                                <p className="text-sm text-zinc-400">Two players&apos; combined total for a stat (e.g. Saka + Palmer combined 3+ shots on target).</p>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            <FileImage className="mr-3 w-6 h-6 text-pink-400" />
                            5. Infographic Player Report Cards
                        </h2>
                        <div className="bg-white/5 p-5 rounded-xl border border-white/10 mb-4">
                            <p className="text-sm text-zinc-400 m-0">
                                The bot renders trading-card style PNG player reports and sends them as photos - a shareable infographic of a player&apos;s form, projections and market stats. Tap <span className="text-pink-300 font-mono">📑 Generate Player Report</span> wherever it appears: on value and fixture alerts, on <code className="text-zinc-300">/player</code> pages, and on <code className="text-zinc-300">/either</code>, <code className="text-zinc-300">/each</code>, <code className="text-zinc-300">/matchup</code> and <code className="text-zinc-300">/combined</code> results. Combo boosts with 2+ player legs generate a multi-player card.
                            </p>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2">
                            6. Settings, Account &amp; Tracking
                        </h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 list-none pl-0">
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/settings" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Customize alert preferences (19-row menu)</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/track" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Track your bets and performance (free for all tiers)</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/status" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Bot status + your active requests</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/pricing" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Subscription tiers (alias: /plans)</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/language" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">7 languages via inline buttons</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><Cmd cmd="/tutorial" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Run interactive tutorial</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><code className="text-zinc-300 mb-1 font-mono">/refer</code><span className="text-xs text-zinc-500">Referral hub - payouts via subscription credit, cash or crypto, promo cards (/refercode to redeem)</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><code className="text-zinc-300 mb-1 font-mono">/connect</code><span className="text-xs text-zinc-500">Link bet tracking to your account</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><code className="text-zinc-300 mb-1 font-mono">/reset</code><span className="text-xs text-zinc-500">Reset your profile to defaults</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10"><code className="text-zinc-300 mb-1 font-mono">/cancel</code><span className="text-xs text-zinc-500">Cancel the current interactive flow</span></li>
                            <li className="bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-white/10 col-span-full sm:col-span-2"><Cmd cmd="/start" customClass="text-zinc-300 mb-1 font-mono" /><span className="text-xs text-zinc-500">Welcome message with command sections + Start Tutorial / Join Group buttons</span></li>
                        </ul>

                        <h3 className="text-xl font-heading font-semibold text-white mt-10 mb-4">Tier Access Matrix</h3>
                        <div className="overflow-x-auto mb-4">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="text-zinc-400 border-b border-white/10">
                                        <th className="py-2 pr-3 font-medium">Commands</th>
                                        <th className="py-2 px-3 font-medium">Reserve (Free)</th>
                                        <th className="py-2 px-3 font-medium">Bench Player</th>
                                        <th className="py-2 px-3 font-medium">Regular Starter</th>
                                        <th className="py-2 px-3 font-medium">Club Legend</th>
                                    </tr>
                                </thead>
                                <tbody className="text-zinc-300">
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 pr-3 font-mono text-zinc-400">/track</td>
                                        <td className="py-2 px-3 text-emerald-400" colSpan={4}>✓ Everyone - bypasses tiers entirely</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 pr-3 font-mono text-zinc-400">/stats, /streak</td>
                                        <td className="py-2 px-3">3/day</td>
                                        <td className="py-2 px-3">3/day</td>
                                        <td className="py-2 px-3 text-emerald-400">✓</td>
                                        <td className="py-2 px-3 text-emerald-400">✓</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 pr-3 font-mono text-zinc-400">/markets</td>
                                        <td className="py-2 px-3 text-zinc-600">-</td>
                                        <td className="py-2 px-3 text-emerald-400">✓</td>
                                        <td className="py-2 px-3 text-emerald-400">✓</td>
                                        <td className="py-2 px-3 text-emerald-400">✓</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 pr-3 font-mono text-zinc-400">/settings</td>
                                        <td className="py-2 px-3 text-zinc-600">-</td>
                                        <td className="py-2 px-3 text-zinc-600">-</td>
                                        <td className="py-2 px-3 text-emerald-400">✓</td>
                                        <td className="py-2 px-3 text-emerald-400">✓</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2 pr-3 font-mono text-zinc-400">/fixture, /value, /sharp</td>
                                        <td className="py-2 px-3 text-zinc-600">-</td>
                                        <td className="py-2 px-3 text-zinc-600">-</td>
                                        <td className="py-2 px-3 text-zinc-600">-</td>
                                        <td className="py-2 px-3 text-emerald-400">✓ *</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 pr-3 font-mono text-zinc-400">/each, /either, /matchup, /combined, /lineups, /average, /position</td>
                                        <td className="py-2 px-3 text-zinc-600">-</td>
                                        <td className="py-2 px-3 text-zinc-600">-</td>
                                        <td className="py-2 px-3 text-zinc-600">-</td>
                                        <td className="py-2 px-3 text-emerald-400">✓ **</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-zinc-500 mb-12">
                            * Also available to Proppr Founder and World Cup Package holders. ** Also available to Proppr Founder.
                        </p>

                    </div>
                </div>
                <div className="hidden lg:block w-[380px] shrink-0 sticky top-24 h-max">
                    <PhoneSimulator ref={phoneRef} hideButtons={true} commands={playerCommands} botName="Player Bot" botLogo="/player-bot-logo.png" initialCommand="/value" />
                </div>
            </div>
        </DocsLayout>
    );
}
