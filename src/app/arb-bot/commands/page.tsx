"use client";

import { useRef } from "react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Code2, Target, Settings, Activity, Users } from "lucide-react";
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

const arbCommands: CommandResponse[] = [
    {
        command: "/scan",
        name: "Scan Stored Arbs",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-white font-bold">SCAN RESULTS</span><br />
                Found <span className="text-white">12</span> arbs<br />
                Showing 1-3 of 12
                <KbRow><Kb label="See More (9 remaining)" /></KbRow>
                <div className="border-t border-white/10 my-2" />
                <span className="text-orange-400 font-bold tracking-wider">💰 ARBITRAGE OPPORTUNITY 💰</span><br /><br />
                ⚽️ <span className="text-white">Blackburn Rovers vs Charlton</span><br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship<br />
                ⏰ 04 Jan 15:00<br />
                ⭐️ Over/Under 2.25 Goals<br />
                📚 Bet365 (Over 2.25) @ 2.10 | Pinnacle (Under 2.25) @ 2.05<br /><br />
                🧠 <span className="text-emerald-400 font-bold">Arb Margin: 3.60%</span><br /><br />
                💷 £49.40 @ 2.10 (Bet365)<br />
                💷 £50.60 @ 2.05 (Pinnacle)<br />
                💰 <span className="text-emerald-300 font-bold">Profit: £3.73 (Either outcome)</span><br /><br />
                ⸻<br /><br />
                💰 RF Low (Under 2.25 Goals wins)<br />
                • £47.62 @ 2.10 – Bet365<br />
                • £52.38 @ 2.05 – Pinnacle<br />
                → Profit: £7.38 (RF ROI: 7.38%)<br /><br />
                💰 RF High (Over 2.25 Goals wins)<br />
                • £51.22 @ 2.10 – Bet365<br />
                • £48.78 @ 2.05 – Pinnacle<br />
                → Profit: £7.56 (RF ROI: 7.56%)
                <KbRow><Kb label="🔗 Bet365" /><Kb label="🔗 Pinnacle" /></KbRow>
                <KbRow><Kb label="✏️ Edit (Over Stake)" /><Kb label="✏️ Edit (Under Stake)" /></KbRow>
                <KbRow><Kb label="💰 Edit Total Stake" /></KbRow>
                <KbRow><Kb label="📚 Edit (Over Odds)" /><Kb label="📚 Edit (Under Odds)" /></KbRow>
                <KbRow><Kb label="🔇 Mute Fixture" /></KbRow>
            </div>
        )
    },
    {
        command: "/custom",
        name: "Custom Arb",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                Let&apos;s create a custom arbitrage opportunity.<br /><br />
                Please provide the odds for Bet #1 (e.g., 1.20).<br />
                <span className="text-blue-300 italic">› 2.50</span><br />
                Great. Now, please provide the odds for Bet #2 (e.g., 6.50).<br />
                <span className="text-blue-300 italic">› 1.70</span><br />
                Excellent. Finally, what is your total stake? (e.g., 100).<br />
                <span className="text-blue-300 italic">› 1000</span>
                <div className="border-t border-white/10 my-2" />
                <span className="text-orange-400 font-bold tracking-wider">💰 CUSTOM ARBITRAGE OPPORTUNITY 💰</span><br /><br />
                ⭐️ Custom Market<br />
                📚 Bet #1 @ 2.50 | Bet #2 @ 1.70<br /><br />
                🧠 <span className="text-emerald-400 font-bold">Arb Margin: 1.19%</span><br /><br />
                💷 £404.76 @ 2.50 (Bet #1)<br />
                💷 £595.24 @ 1.70 (Bet #2)<br />
                💰 <span className="text-emerald-300 font-bold">Profit: £11.90 (Either outcome)</span><br /><br />
                ⸻<br /><br />
                💰 RF Low (Bet #2 wins)<br />
                • £400.00 @ 2.50 – Bet #1<br />
                • £600.00 @ 1.70 – Bet #2<br />
                → Profit: £20.00 (RF ROI: 2.00%)<br /><br />
                💰 RF High (Bet #1 wins)<br />
                • £411.76 @ 2.50 – Bet #1<br />
                • £588.24 @ 1.70 – Bet #2<br />
                → Profit: £29.41 (RF ROI: 2.94%)
                <KbRow><Kb label="✏️ Edit (Bet #1 Stake)" /><Kb label="✏️ Edit (Bet #2 Stake)" /></KbRow>
                <KbRow><Kb label="💰 Edit Total Stake" /></KbRow>
                <KbRow><Kb label="📚 Edit (Bet #1 Odds)" /><Kb label="📚 Edit (Bet #2 Odds)" /></KbRow>
            </div>
        )
    },
    {
        command: "/settings",
        name: "Configuration",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-emerald-400 font-bold tracking-wider">⚙️ YOUR ARBITRAGE BOT SETTINGS</span><br /><br />
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
                <KbRow><Kb label="💷 Change Stake" /><Kb label="📊 Min Margin" /></KbRow>
                <KbRow><Kb label="📚 Bookmakers" /><Kb label="⚽️ Sports Filter" /></KbRow>
                <KbRow><Kb label="🔄 Bookmaker Clones" /><Kb label="⏰ Time" /></KbRow>
                <KbRow><Kb label="🏦 Exchange Commissions" /></KbRow>
                <KbRow><Kb label="🔔 Disable Alerts" /></KbRow>
                <KbRow><Kb label="🔄 LAY Arbs: ON" /></KbRow>
                <KbRow><Kb label="🔴 Live Arbs ▸ OFF" /></KbRow>
                <KbRow><Kb label="✅ Done" /></KbRow>
            </div>
        )
    },
    {
        command: "/stats",
        name: "Bot Statistics",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-purple-400 font-bold tracking-wider">📊 ARBITRAGE BOT STATISTICS</span><br /><br />
                🎯 Active Arbitrages: 143<br />
                📈 Total Stored: 28,410<br />
                💹 Average Margin: 1.8%<br />
                🔝 Max Margin: 12.4%<br /><br />
                <span className="text-zinc-500 italic">Global bot-wide figures, not your personal usage.</span>
            </div>
        )
    },
    {
        command: "/plans",
        name: "Subscription",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-purple-400 font-bold tracking-wider">💰 Proppr Arb Bot Subscription 💰</span><br /><br />
                🔓 <span className="text-white font-bold">Your Status: DEMO USER</span> (1% arb margin cap)<br /><br />
                📋 <span className="text-white">Available Plan:</span><br /><br />
                ✨ <span className="text-white font-bold">Premium Plan</span><br />
                <span className="text-white font-bold">£6.99/week · £23.99/month · £311.99/year</span><br />
                • Unlimited arbitrage alerts 24/7<br />
                • NO margin cap (receive ALL arbs)<br />
                • Access to all markets<br />
                • Priority support<br />
                • Customize all settings<br /><br />
                🚫 <span className="text-red-400">Demo Limitations:</span><br />
                • Arbs capped at 1% margin only<br />
                • Missing high-value opportunities<br />
                • Limited alerts<br /><br />
                For questions, contact @zinqgram or @professorxbets.
                <KbRow><Kb label="🔥 View Premium Plans" /></KbRow>
                <KbRow><Kb label="🔄 Refresh Subscription Status" /></KbRow>
                <KbRow><Kb label="⚙️ Manage Subscription" /></KbRow>
            </div>
        )
    },
    {
        command: "/help",
        name: "Help & Commands",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-blue-400 font-bold">PropprArbBot Help</span><br /><br />
                Commands:<br />
                /start - Start the bot<br />
                /settings - Manage your settings<br />
                /scan - Search for arbs by bookmaker<br />
                /stats - View statistics<br />
                /plans - View subscription plans<br />
                /test - Test with sample data<br /><br />
                Settings:<br />
                - Default Stake - Your base betting amount<br />
                - Min Arb Margin - Minimum profit margin %<br />
                - Enabled Bookmakers - Which bookmakers to include<br /><br />
                Alert Types:<br />
                - Standard - Equal profit either outcome<br />
                - RF High - Higher risk/return on first outcome<br />
                - RF Low - Lower risk/return on first outcome
            </div>
        )
    },
    {
        command: "/language",
        name: "Language",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🌐 <span className="text-white font-bold">Select your language:</span>
                <KbRow><Kb label="✅ English 🇬🇧" /></KbRow>
                <KbRow><Kb label="Español 🇪🇸" /></KbRow>
                <KbRow><Kb label="Türkçe 🇹🇷" /></KbRow>
                <KbRow><Kb label="Português 🇵🇹" /></KbRow>
                <KbRow><Kb label="Deutsch 🇩🇪" /></KbRow>
                <KbRow><Kb label="Français 🇫🇷" /></KbRow>
                <KbRow><Kb label="Italiano 🇮🇹" /></KbRow>
            </div>
        )
    },
    {
        command: "/start",
        name: "Welcome & Setup",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                🎯 <span className="text-white font-bold">Welcome to PropprArbBot, Alex!</span><br /><br />
                🔓 <span className="text-white font-bold">DEMO USER</span><br /><br />
                📊 <span className="text-white">Your Current Settings:</span><br />
                💰 Min Arb Margin: 1.0% (Demo cap: 1%)<br />
                📚 Enabled Bookmakers: 9<br /><br />
                ⚠️ <span className="text-orange-300">Demo Limitations:</span><br />
                • Arbs capped at 1% margin<br />
                • Cooldown between alerts<br />
                • Max 6 alerts per hour<br /><br />
                ⚙️ <span className="text-white">Important: Configure Your Settings</span><br /><br />
                <span className="text-white">Recommended Actions:</span><br />
                1️⃣ Set your minimum arb margin<br />
                &nbsp;&nbsp;&nbsp;Current: 1.0% - Use /settings to change<br />
                2️⃣ Review bookmakers<br />
                &nbsp;&nbsp;&nbsp;Current: 9 enabled - Use /settings → Bookmakers<br />
                &nbsp;&nbsp;&nbsp;💡 More bookmakers = more arbitrage opportunities!<br />
                3️⃣ Join our community for tips &amp; support<br />
                &nbsp;&nbsp;&nbsp;Chat: @PropprChat<br /><br />
                💎 <span className="text-purple-300">Upgrade to Premium</span> - use /plans to unlock all arbs.
            </div>
        )
    },
    {
        command: "/refer",
        name: "Referral Hub",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                💸 <span className="text-white font-bold">Proppr Referral Hub</span><br />
                Grow the Proppr network, bring in new subscribers, and earn recurring commission from your referral chain.<br /><br />
                🪪 Your Referral Tag<br />
                <span className="text-white">ALEX23</span><br /><br />
                🔗 Your Invite Link<br />
                <span className="text-blue-300">t.me/PropprArbBot?start=ref_ALEX23</span><br /><br />
                💰 Earnings Overview<br />
                Available Now: £24.50<br />
                Processing: £6.00<br />
                Lifetime Earned: £102.30<br /><br />
                ⚙️ Payout Preference<br />
                Selected: Bank Transfer (Stripe)
                <KbRow><Kb label="💸 Claim Earnings" /></KbRow>
                <KbRow><Kb label="⚙️ Payout Method" /></KbRow>
                <KbRow><Kb label="🖼️ Generate Card" /><Kb label="📋 Copy Link" /></KbRow>
                <KbRow><Kb label="🔄 Refresh" /><Kb label="✏️ Change Code" /></KbRow>
            </div>
        )
    },
    {
        command: "/refercode",
        name: "Custom Referral Code",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                Use /refercode newcode<br /><br />
                This can only be done once. Changing your code will forfeit any currently unclaimed referral commission.
            </div>
        )
    },
    {
        command: "/test",
        name: "Sample Alert",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                <span className="text-orange-400 font-bold tracking-wider">💰 ARBITRAGE OPPORTUNITY 💰</span><br /><br />
                ⚽️ <span className="text-white">Manchester United vs Liverpool</span><br />
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League<br />
                ⏰ 15 Nov 20:00<br />
                ⭐️ Over/Under 2.5 Goals<br />
                📚 Bet365 (Over 2.5) @ 2.10 | Polymarket (Under 2.5) @ 2.05<br /><br />
                🧠 <span className="text-emerald-400 font-bold">Arb Margin: 3.60%</span><br /><br />
                💷 £49.40 @ 2.10 (Bet365)<br />
                💷 £50.60 @ 2.05 (Polymarket)<br />
                💰 <span className="text-emerald-300 font-bold">Profit: £3.73 (Either outcome)</span><br /><br />
                <span className="text-zinc-500 italic">Sample data - use /test any time to preview the full alert layout.</span>
            </div>
        )
    },
    {
        command: "/connect",
        name: "Link Proppr App",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                Please provide the 6-digit connection code from the app.<br />
                Usage: <span className="text-white">/connect XXXXXX</span>
            </div>
        )
    },
    {
        command: "/cancel",
        name: "Abort Conversation",
        response: (
            <div className="text-[12px] font-mono leading-relaxed tracking-tight">
                Custom arbitrage creation cancelled.
            </div>
        )
    }
];

export default function ArbBotCommands() {
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
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <Code2 className="w-6 h-6 text-orange-400" />
                        </div>
                        <h1 className="text-4xl font-heading font-bold text-white">Executing Arbs</h1>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-lg text-zinc-400 leading-relaxed mb-8">
                            Receiving an alert is just the beginning. Profitable arbing depends on fast, precise execution across two bookmakers simultaneously. This guide covers every step from alert to confirmation.
                        </p>

                        {/* Membership gate */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-12">
                            <h3 className="text-white font-semibold mb-2">Before anything works: join @PropprChat</h3>
                            <p className="text-sm text-zinc-300 mb-3">
                                Every command is gated behind membership of the community group. New users get a prompt with two buttons - tap <strong>Join @PropprChat</strong>, then <strong>I Joined. Unlock The Bot</strong> to verify. Until you do, the bot will not respond to commands.
                            </p>
                            <div className="flex flex-col gap-1 max-w-[260px]">
                                <span className="text-center text-xs bg-white/10 border border-white/15 rounded-md px-2 py-1.5 text-blue-300">Join @PropprChat</span>
                                <span className="text-center text-xs bg-white/10 border border-white/15 rounded-md px-2 py-1.5 text-blue-300">I Joined. Unlock The Bot</span>
                            </div>
                        </div>

                        {/* Step by step execution */}
                        <h2 className="text-2xl font-heading font-semibold text-white mt-2 mb-6 border-b border-white/10 pb-2">Step-by-Step: Executing a Standard Arb</h2>
                        <div className="space-y-3 mb-10">
                            {[
                                {
                                    num: "1",
                                    title: "Receive the alert - read the full breakdown",
                                    desc: "Note both bookmakers, the odds, and the pre-calculated stakes. The bot shows you exactly how much to place on each side, plus RF Low and RF High scenarios."
                                },
                                {
                                    num: "2",
                                    title: "Open both bookmakers simultaneously",
                                    desc: "Tap the 🔗 bookmaker buttons on the alert to jump straight to each site. Use two browser tabs, two devices, or their mobile apps."
                                },
                                {
                                    num: "3",
                                    title: "Check current odds match the alert",
                                    desc: "If odds have moved, press an 'Edit Odds' button on the alert. The bot recalculates margins and stakes instantly. If it's no longer an arb, don't place."
                                },
                                {
                                    num: "4",
                                    title: "Place the smaller stake first",
                                    desc: "Start with the bookmaker requiring the smaller stake. Less capital is at risk during the gap between placing both bets."
                                },
                                {
                                    num: "5",
                                    title: "Place the second bet within seconds",
                                    desc: "Confirm both bets are accepted and screenshot your bet slips. Record the arb manually or in the Proppr Track web app. Most arbs close within 60–120 seconds of appearing."
                                },
                            ].map(({ num, title, desc }) => (
                                <div key={num} className="flex items-start space-x-4 bg-white/5 border border-white/10 rounded-xl p-4">
                                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                                        <span className="text-orange-400 font-bold text-sm">{num}</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium text-sm mb-1">{title}</p>
                                        <p className="text-xs text-zinc-400">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Alert interaction guide */}
                        <h2 className="text-2xl font-heading font-semibold text-white mt-8 mb-6 border-b border-white/10 pb-2">Reading the Alert Buttons</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
                            {[
                                { btn: "🔗 Bookmaker links", desc: "One button per leg - opens the bookmaker's page for that fixture so you can place the bet immediately." },
                                { btn: "✏️ Edit (Side Stake)", desc: "Modify one side's stake - the other side auto-recalculates to maintain the arb." },
                                { btn: "💰 Edit Total Stake", desc: "Change the total amount across both sides and the bot re-splits automatically." },
                                { btn: "📚 Edit (Side Odds)", desc: "If odds have moved, enter the new price. Bot recalculates the margin and tells you if it's still an arb." },
                                { btn: "🔇 Mute Fixture", desc: "Opens a submenu: mute this fixture at bookmaker A, at bookmaker B, or stop all alerts for the fixture entirely." },
                            ].map(({ btn, desc }) => (
                                <div key={btn} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <code className="text-orange-400 text-xs font-mono mb-2 block">{btn}</code>
                                    <p className="text-xs text-zinc-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-10">
                            <p className="text-sm text-zinc-300 mb-1 font-medium">Standard, RF Low and RF High are not modes you switch between.</p>
                            <p className="text-xs text-zinc-400">
                                Every alert prints all three stake scenarios together: the Standard split (equal profit either outcome), RF Low (break even on one side, moderate profit on the other) and RF High (break even the other way, bigger profit on the higher-odds side). Pick whichever line suits your risk appetite and place those stakes.
                            </p>
                        </div>

                        {/* Common mistakes */}
                        <h2 className="text-2xl font-heading font-semibold text-white mt-8 mb-6 border-b border-white/10 pb-2">Common Mistakes to Avoid</h2>
                        <div className="space-y-2 mb-10">
                            {[
                                { mistake: "Placing one side and assuming the other is still available", fix: "Always verify the second book's odds haven't moved before placing the first bet." },
                                { mistake: "Assuming exchange commission was forgotten", fix: "It wasn't - a 2% default is applied automatically to any exchange leg (back or lay). Override the rate per exchange in /settings → Exchange Commissions." },
                                { mistake: "Using the stake calculator number exactly (looks like arbing)", fix: "Round to nearest £5 or £10 to look less mechanical to bookmakers." },
                                { mistake: "Taking sub-1% margin arbs during busy periods", fix: "These are rarely worth the effort. Set minimum margin to 1.5%+ in /settings." },
                            ].map(({ mistake, fix }) => (
                                <div key={mistake} className="bg-black/30 border border-white/5 rounded-xl p-4">
                                    <p className="text-red-400 text-sm font-medium mb-1">❌ {mistake}</p>
                                    <p className="text-xs text-zinc-400">✅ {fix}</p>
                                </div>
                            ))}
                        </div>

                        {/* /custom */}
                        <h2 className="text-2xl font-heading font-semibold text-white mt-8 mb-6 border-b border-white/10 pb-2">Custom Arb - For Boosted Odds</h2>
                        <div className="glass p-5 rounded-xl border border-white/10 mb-10">
                            <p className="text-zinc-400 text-sm mb-4">
                                If you spot a bookmaker boost or price error not in the automated feed, send a bare <code className="text-white bg-white/10 px-1 rounded">/custom</code> - the command takes no arguments; the bot walks you through a 3-question conversation instead.
                            </p>
                            <ol className="space-y-1.5 text-sm text-zinc-400 list-decimal ml-4">
                                <li>Bot asks for Bet #1 odds → enter the boosted/back price</li>
                                <li>Bot asks for Bet #2 odds → enter the opposing price</li>
                                <li>Bot asks for total stake → enter your amount</li>
                                <li>Bot replies with the standard alert layout, headed &ldquo;💰 CUSTOM ARBITRAGE OPPORTUNITY 💰&rdquo;, legs labelled Bet #1 / Bet #2, plus RF Low / RF High and edit buttons</li>
                            </ol>
                            <p className="text-xs text-zinc-500 mt-3">Send <code className="text-white bg-white/10 px-1 rounded">/cancel</code> at any point to abort the conversation.</p>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            <Target className="mr-3 w-6 h-6 text-blue-400" />
                            1. Finding &amp; Calculating Arbs
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="relative z-10">
                                    <h4 className="text-white font-mono mb-2 text-xl"><Cmd cmd="/scan" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                    <p className="text-sm text-zinc-400">
                                        Premium 3-step wizard that searches the bot&apos;s <strong>stored</strong> arbs (live arbs excluded): Step 1/3 pick Bookmaker 1 from a paginated list, Step 2/3 pick Bookmaker 2 (or use the 📗 My Bookmakers / 📚 All Bookmakers shortcuts), Step 3/3 pick a time range (1/2/3/6/12/24/48 hours or 7 days). Results arrive as &ldquo;SCAN RESULTS - Found N arbs&rdquo; three at a time with a See More paginator. Non-premium users see a Premium Feature gate pointing at /plans.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="relative z-10">
                                    <h4 className="text-white font-mono mb-2 text-xl"><Cmd cmd="/custom" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                    <p className="text-sm text-zinc-400">Custom arb calculator as a guided conversation (odds #1 → odds #2 → total stake). Great for odds boosts and promos. Ignores any inline arguments - just send /custom.</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="relative z-10">
                                    <h4 className="text-white font-mono mb-2 text-xl"><Cmd cmd="/test" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                    <p className="text-sm text-zinc-400">Sends a sample arbitrage alert with your default stake - the fastest way to learn the alert layout before real money is involved.</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="relative z-10">
                                    <h4 className="text-white font-mono mb-2 text-xl"><Cmd cmd="/cancel" customClass="text-blue-400 bg-white/10 px-2 py-1 rounded" /></h4>
                                    <p className="text-sm text-zinc-400">Aborts any in-progress conversation - custom arb creation, stake/odds edits, or settings inputs.</p>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            <Settings className="mr-3 w-6 h-6 text-emerald-400" />
                            2. Configuration
                        </h2>
                        <div className="space-y-4">
                            <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="w-40 bg-emerald-500/10 p-4 flex items-center justify-center border-r border-white/5">
                                    <Cmd cmd="/settings" customClass="text-emerald-400 font-mono text-lg" />
                                </div>
                                <div className="p-4 flex-1">
                                    <p className="text-sm text-zinc-300 m-0">The heart of Arb Bot controls. Set your default stake and minimum arb margin, toggle bookmakers, sports, LAY arbs, live arbs and the alerts master switch, pick bookmaker clones, tune exchange commissions and the time filter. Available to all users, demo included.</p>
                                </div>
                            </div>
                            <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="w-40 bg-emerald-500/10 p-4 flex items-center justify-center border-r border-white/5">
                                    <Cmd cmd="/language" customClass="text-emerald-400 font-mono text-lg" />
                                </div>
                                <div className="p-4 flex-1">
                                    <p className="text-sm text-zinc-300 m-0">Interface language - 7 options (English, Español, Türkçe, Português, Deutsch, Français, Italiano) shown as inline buttons with a ✅ on your current choice. Tap a button to switch; no typing needed.</p>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            <Activity className="mr-3 w-6 h-6 text-purple-400" />
                            3. Account &amp; Support
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col">
                                <Cmd cmd="/stats" customClass="text-purple-400 font-mono block mb-2 text-lg" />
                                <span className="text-sm text-zinc-400">Global bot statistics - active arbitrages, total stored, average and max margin. Not personal usage stats.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col">
                                <Cmd cmd="/plans" customClass="text-purple-400 font-mono block mb-2 text-lg" />
                                <span className="text-sm text-zinc-400">Premium plan (£6.99/wk · £23.99/mo · £311.99/yr), your PREMIUM/DEMO status, and View Plans / Refresh / Manage buttons. The bot works free in demo mode - settings and demo alerts included.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col">
                                <Cmd cmd="/help" customClass="text-purple-400 font-mono block mb-2 text-lg" />
                                <span className="text-sm text-zinc-400">Command list plus a Settings and Alert Types glossary (Standard / RF High / RF Low).</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col">
                                <Cmd cmd="/connect" customClass="text-purple-400 font-mono block mb-2 text-lg" />
                                <span className="text-sm text-zinc-400">Link your Telegram account to the Proppr app with the 6-digit code from the app.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col lg:col-span-2">
                                <Cmd cmd="/start" customClass="text-purple-400 font-mono block mb-2 text-lg" />
                                <span className="text-sm text-zinc-400">Welcome message with your PREMIUM/DEMO status, current min margin, enabled bookmaker count, demo limitations and three recommended setup actions. Also re-enables alerts if they were auto-disabled after blocking the bot.</span>
                            </div>
                        </div>

                        <h2 className="text-2xl font-heading font-semibold text-white mt-12 mb-6 border-b border-white/10 pb-2 flex items-center">
                            <Users className="mr-3 w-6 h-6 text-orange-400" />
                            4. Referrals
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col">
                                <Cmd cmd="/refer" customClass="text-orange-400 font-mono block mb-2 text-lg" />
                                <span className="text-sm text-zinc-400">Your referral hub: invite link, earnings overview, payout via Stripe bank transfer, crypto or subscription credit, plus a shareable referral card generator.</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col">
                                <Cmd cmd="/refercode" customClass="text-orange-400 font-mono block mb-2 text-lg" />
                                <span className="text-sm text-zinc-400">Set a custom referral code - one-time change; unclaimed commission is forfeited when you switch.</span>
                            </div>
                        </div>

                    </div>
                </div>
                <div className="hidden lg:block w-[380px] shrink-0 sticky top-24 h-max">
                    <PhoneSimulator ref={phoneRef} hideButtons={true} commands={arbCommands} botName="Arb Bot" botLogo="/arb-bot-logo.png" initialCommand="/scan" />
                </div>
            </div>
        </DocsLayout>
    );
}
