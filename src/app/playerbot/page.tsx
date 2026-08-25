"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Send,
  Check,
  ArrowRight,
  Star,
  Trophy,
  Target,
  BarChart3,
  Zap,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TiltCard, TextsReveal } from "@/components/transitions/Motion";

/* ──────────────────────────────────────────────────────────────
   DATA
─────────────────────────────────────────────────────────────── */

const playerLinks = {
  Reserve: "https://t.me/PropprManagerBot",
  "Bench Player": "https://t.me/PropprManagerBot?start=p_bench",
  "Regular Starter": "https://t.me/PropprManagerBot?start=p_regular",
  "Club Legend": "https://t.me/PropprManagerBot?start=p_legend",
};

const markets = [
  { emoji: "⚽️", name: "Anytime Goalscorer", abbr: "AGS" },
  { emoji: "🎯", name: "Shots on Target", abbr: "SOT" },
  { emoji: "🟨", name: "Cards", abbr: "CARDS" },
  { emoji: "🦵", name: "Tackles", abbr: "TKLS" },
  { emoji: "⚠️", name: "Fouls", abbr: "FOULS" },
  { emoji: "🅰️", name: "Assists", abbr: "ASST" },
  { emoji: "🧤", name: "Saves", abbr: "SAVES" },
  { emoji: "🎮", name: "Score or Assist", abbr: "SOA" },
  { emoji: "🔫", name: "Shots", abbr: "SHOTS" },
  { emoji: "🏆", name: "Man of the Match", abbr: "MOTM" },
];

const commandGroups = [
  {
    category: "Core Commands",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    commands: [
      { cmd: "/start", desc: "Activate the bot and begin setup" },
      { cmd: "/toggle", desc: "Enable or disable all alerts instantly" },
      { cmd: "/today", desc: "See all fixtures with value plays today" },
      { cmd: "/tomorrow", desc: "Preview tomorrow's fixtures and early prices" },
    ],
  },
  {
    category: "Research Commands",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10 border-sky-500/20",
    commands: [
      { cmd: "/fixture", desc: "Full breakdown for any specific match" },
      { cmd: "/stats", desc: "Global player stats across all tracked leagues" },
      { cmd: "/player", desc: "Deep-dive into one player's form and projections" },
      { cmd: "/team", desc: "Full squad overview and team stats" },
      { cmd: "/league", desc: "Top value plays across an entire league" },
      { cmd: "/streak", desc: "Players on 5+ game performance streaks" },
    ],
  },
  {
    category: "Value Detection",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    commands: [
      { cmd: "/value", desc: "On-demand value scan across all active markets" },
      { cmd: "/average", desc: "Compare bookmaker odds vs Cerebro model averages" },
    ],
  },
  {
    category: "Top Picks",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    commands: [
      { cmd: "/top", desc: "Highest EV player prop plays right now" },
      { cmd: "/topteam", desc: "Best value plays filtered by team" },
      { cmd: "/topleague", desc: "Best value plays filtered by league" },
      { cmd: "/supersub", desc: "Best super-sub prop value plays" },
      { cmd: "/supersubteam", desc: "Super-sub plays filtered by team" },
      { cmd: "/supersubleague", desc: "Super-sub plays filtered by league" },
    ],
  },
  {
    category: "Combination Markets",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/20",
    commands: [
      { cmd: "/either", desc: "Value if either of two players performs" },
      { cmd: "/each", desc: "Value on each player in a pair independently" },
      { cmd: "/matchup", desc: "Head-to-head player prop comparison" },
    ],
  },
  {
    category: "Management",
    color: "text-zinc-400",
    bgColor: "bg-white/5 border-white/10",
    commands: [
      { cmd: "/track", desc: "Log a bet for automated P&L tracking" },
      { cmd: "/unmute", desc: "Re-enable alerts for a muted fixture or league" },
      { cmd: "/status", desc: "Bot health check and subscription status" },
      { cmd: "/weather", desc: "Live weather at the stadium - impacts play style" },
      { cmd: "/tutorial", desc: "Guided onboarding walkthrough" },
      { cmd: "/markets", desc: "Enable or disable specific prop markets" },
      { cmd: "/settings", desc: "Full customization of filters and preferences" },
    ],
  },
];

const tiers = [
  {
    name: "Reserve",
    price: "FREE",
    period: "forever",
    billing: "",
    desc: "Experience the bot before committing",
    features: ["Basic player prop alerts", "Essential value identification", "Telegram integration", "Free forever"],
    popular: false,
  },
  {
    name: "Bench Player",
    price: "£9.99",
    period: "per month",
    billing: "£2.99/wk · £9.99/mo · £124.99/yr",
    desc: "Full stats and market access",
    features: ["Full player prop access", "All 10 market coverage", "Customizable settings", "Unlimited alerts"],
    popular: false,
  },
  {
    name: "Regular Starter",
    price: "£23.99",
    period: "per month",
    billing: "£6.99/wk · £23.99/mo · £311.99/yr",
    desc: "Complete customization control",
    features: ["All Bench Player features", "Advanced per-market filters", "Real-time high-value alerts", "Form period selection (L5/L10)", "Performance tracking via /track"],
    popular: false,
  },
  {
    name: "Club Legend",
    price: "£35.99",
    period: "per month",
    billing: "£9.99/wk · £35.99/mo · £467.99/yr",
    desc: "Ultimate tier - the full edge",
    features: ["All features unlocked", "On-demand /fixture & /value", "/top, /supersub, /matchup access", "Priority support", "Early feature access"],
    popular: true,
  },
];

const faqs = [
  {
    q: "What is the Cerebro model?",
    a: "Cerebro is a hard-coded statistical model - not AI, not machine learning. It uses position-specific data (last 5-10 games), squad context, opponent strength, and market odds to identify value plays with ~60-70% model confidence. No hallucinated stats. Everything is verifiable.",
  },
  {
    q: "What does the Value % number mean?",
    a: "Value % = ((Bookmaker Odds ÷ Model Odds) − 1) × 100. Example: Bookmaker prices a player at 8.5 to score. Cerebro calculates the fair odds at 2.86. That's 197.2% value - you're being paid nearly 3× what the math says is fair.",
  },
  {
    q: "How does the min avg minutes filter work?",
    a: "This is the single most impactful setting. It filters out players who rarely play, reducing alert volume and focusing on players with consistent stats. Set it to 45+ mins for only guaranteed starters, or 30+ mins to catch impactful subs.",
  },
  {
    q: "What's the difference between /today and /value?",
    a: "/today shows all fixtures with value plays detected at the time of scanning. /value runs a fresh on-demand scan right now across all active fixtures. Use /today for morning planning, /value before kick-off for the freshest prices.",
  },
  {
    q: "Can I use the bot for accumulators?",
    a: "Yes - /each gives independent value on two players, perfect for doubles. /value and /top identify the highest-EV singles to combine. The Cerebro model provides EV% per pick so you can build informed accumulators rather than guessing.",
  },
];

/* ──────────────────────────────────────────────────────────────
   SUB-COMPONENTS
─────────────────────────────────────────────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`t-acc border-b border-white/5 transition-colors ${open ? "" : "hover:bg-white/[0.02]"}`} data-open={open}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="t-acc-head w-full flex items-center justify-between py-5 px-1 text-left">
        <span className="font-semibold text-white pr-4 text-sm sm:text-base">{q}</span>
        <span className={`t-acc-chevron shrink-0 ${open ? "text-emerald-400" : "text-zinc-500"}`}>
          <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6.5L8 10.5L12 6.5" />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel">
        <div className="t-acc-panel-inner">
          <div className="pb-5 px-1 text-sm text-zinc-400 leading-relaxed border-l-2 border-emerald-500/40 pl-4 ml-1">{a}</div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PAGE
─────────────────────────────────────────────────────────────── */
export default function PlayerBotMarketing() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#101010] text-foreground overflow-x-hidden">

      {/* Background grid */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <Header />

        {/* ════════════════════ HERO ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 pb-12 w-full">
          <div className="grid lg:grid-cols-[1fr_440px] gap-12 items-start">

            {/* Left */}
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
                className="flex items-center gap-2 mb-8">
                <span className="w-8 h-px bg-emerald-500" />
                <span className="text-emerald-400 font-mono text-xs tracking-[0.2em] uppercase">Player Props · 10 Markets · 25+ Commands</span>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
                className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                  <Image src="/player-bot-logo.png" alt="Player Bot" width={48} height={48} className="w-full h-full object-cover" />
                </div>
                <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Proppr Player Bot</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-[0.92] tracking-tighter text-white mb-6 uppercase">
                Player Props.<br />
                <span className="text-emerald-400">Mathematically</span><br />
                Identified.
              </motion.h1>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="text-zinc-400 text-lg leading-relaxed max-w-xl mb-8 font-light">
                The Cerebro model analyzes 25+ player prop markets across 100+ leagues. 
                Every alert includes bookmaker odds, model odds, EV%, recommended stake, and 10-game form. 
                No spreadsheets. No guesswork. No AI.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
                className="flex flex-wrap gap-3 mb-6">
                <a href="https://t.me/propprplayerbot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm px-6 py-3 rounded-lg transition-all hover:scale-105 active:scale-95 tracking-wide uppercase">
                  <Send className="w-4 h-4" />Join Player Bot
                </a>
                <Link href="/player-bot"
                  className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 text-white font-bold text-sm px-6 py-3 rounded-lg border border-white/15 transition-all hover:scale-105 active:scale-95 tracking-wide uppercase">
                  <BookOpen className="w-4 h-4" />View Docs
                </Link>
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.5 }}
                className="text-zinc-600 text-xs font-mono uppercase tracking-wide">
                Free tier available · No card required · Cancel anytime
              </motion.p>
            </div>

            {/* Right: live alert preview */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
              className="hidden lg:block sticky top-24">
              <div className="bg-[#101010] border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/60" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-zinc-600 font-mono text-xs ml-2">Proppr Player Bot · Live Alert</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />online
                  </span>
                </div>
                <div className="p-5 font-mono text-[12px] leading-[1.8] text-zinc-300 space-y-0.5">
                  <div className="text-amber-400 font-bold">⚡️ PLAYER PROP VALUE ALERT ⚡️</div>
                  <div>🏟 <span className="text-white">Arsenal vs Chelsea</span></div>
                  <div>🏆 Premier League</div>
                  <div>⏰ Sat, 12 Apr 12:30</div>
                  <div className="pt-1">👤 <span className="text-white font-bold">Bukayo Saka (Arsenal)</span></div>
                  <div>🧩 Position: RW (Alt: LW)</div>
                  <div>⚽️ <span className="text-emerald-300">Anytime Goalscorer</span></div>
                  <div className="pt-1">📚 Bookmaker Odds: <span className="text-white">6.0</span></div>
                  <div>🖥 Model Odds: <span className="text-sky-300">3.12</span></div>
                  <div className="text-emerald-400 font-bold">📈 Value: 92.3%</div>
                  <div>💰 Stake: <span className="text-white">0.75u</span></div>
                  <div className="pt-1">📆 Appearances: 10</div>
                  <div>🕣 Avg Mins: 82</div>
                  <div>📊 Per Game: 1, 0, 1, 0, 1, 1, 0, 1, 0, 1</div>
                  <div className="pt-1 text-zinc-600 text-[11px]">→ click to track bet</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════ MARKETS ════════════════════ */}
        <section className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-20">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-14">
              <div className="inline-block font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-4">Coverage</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">10 Player Prop Markets</h2>
              <p className="text-zinc-500 mt-3 text-sm max-w-lg mx-auto">
                All analyzed by the Cerebro model with position-specific intelligence. 
                Enable only the markets you bet on.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {markets.map((m, i) => (
                <motion.div key={m.abbr}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#101010] border border-white/10 rounded-xl p-4 text-center hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group">
                  <div className="text-2xl mb-2">{m.emoji}</div>
                  <div className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest mb-1">{m.abbr}</div>
                  <div className="text-xs text-zinc-400 group-hover:text-white transition-colors">{m.name}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ CEREBRO MODEL ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-4">The Model</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mb-6">
                The Cerebro<br />Statistical Model
              </h2>
              <div className="space-y-5">
                {[
                  { icon: ShieldCheck, title: "Zero AI Hallucinations", desc: "Hard-coded mathematics only. No ChatGPT, no machine learning, no guessed stats. Every projection is verifiable against live squad data." },
                  { icon: Target, title: "Position-Aware Analysis", desc: "A central midfielder and a striker have different expected stats. Cerebro models each position separately for accurate projections." },
                  { icon: BarChart3, title: "Last 5 or Last 10 Game Form", desc: "Configure your preferred form window. Last 5 for hot streaks, Last 10 for long-term averages. Switchable per user in /settings." },
                  { icon: Zap, title: "60-70% Model Confidence", desc: "The model marks confidence on every alert. Focus on high-confidence plays during lower leagues or unfamiliar competitions." },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <motion.div key={title}
                    initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm mb-1">{title}</div>
                      <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Value formula panel */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="bg-[#101010] border border-white/10 rounded-2xl p-8">
              <div className="font-mono text-xs text-zinc-600 uppercase tracking-widest mb-6">How Value % Is Calculated</div>
              <div className="space-y-6">
                <div>
                  <div className="font-mono text-xs text-emerald-400 uppercase tracking-widest mb-2">Formula</div>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-sm text-white border border-white/5">
                    Value % = ((Bookie Odds ÷ Model Odds) − 1) × 100
                  </div>
                </div>
                <div>
                  <div className="font-mono text-xs text-emerald-400 uppercase tracking-widest mb-3">Example</div>
                  <div className="space-y-2">
                    {[
                      { label: "Bookmaker Offers", val: "8.5", color: "text-white" },
                      { label: "Cerebro Fair Odds", val: "2.86", color: "text-sky-300" },
                      { label: "Value %", val: "197.2%", color: "text-emerald-400 font-bold text-lg" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-zinc-500 text-sm">{label}</span>
                        <span className={`font-mono ${color}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 mt-4 leading-relaxed">
                    You're being paid nearly 3× what the mathematics says is the fair price. 
                    Over volume, positive EV bets build a sustainable edge.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════ COMMANDS ════════════════════ */}
        <section className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-14">
              <div className="inline-block font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-4">Reference</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">25+ Commands</h2>
              <p className="text-zinc-500 mt-3 text-sm">Every command, categorized. Full docs at <Link href="/player-bot/commands" className="text-emerald-400 hover:text-emerald-300 transition-colors">/player-bot/commands</Link>.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {commandGroups.map((group, gi) => (
                <motion.div key={group.category}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: gi * 0.07 }}
                  className="bg-[#101010] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
                  <div className={`px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2`}>
                    <span className={`font-mono text-xs uppercase tracking-widest font-bold ${group.color}`}>{group.category}</span>
                  </div>
                  <div className="p-3 space-y-1">
                    {group.commands.map((c) => (
                      <div key={c.cmd} className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group">
                        <code className="font-mono text-[11px] text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{c.cmd}</code>
                        <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors leading-relaxed">{c.desc}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/player-bot/commands"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-mono text-sm uppercase tracking-widest transition-colors">
                <span>Full Command Reference</span><ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ════════════════════ SETTINGS ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-14">
            <div className="inline-block font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-4">Customization</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Every Setting, Explained</h2>
          </motion.div>

          <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
            {[
              { setting: "Min/Max Odds Range", impact: "High", desc: "Filter alerts to only odds you can actually bet. Set 2.0–10.0 for typical range, or narrow to your bookmaker's limits." },
              { setting: "Minimum EV %", impact: "High", desc: "Only receive alerts above your edge threshold. 50% keeps volume high; 100%+ means only screaming value." },
              { setting: "Min Avg Minutes", impact: "Very High", desc: "Single biggest filter for quality. Set 45+ for guaranteed starters only. 30+ catches impactful subs." },
              { setting: "Form Window (L5/L10)", impact: "Medium", desc: "Last 5 games for current form and hot streaks. Last 10 for stable long-term projections." },
              { setting: "Market Toggles", impact: "Medium", desc: "Enable only the 10 markets you actively bet: AGS, Shots, SOT, Cards, Tackles, Fouls, Assists, Saves, SOA, Shots." },
              { setting: "Time Zone", impact: "Low", desc: "All fixture times display in your local time zone." },
              { setting: "Muted Fixtures/Leagues", impact: "Medium", desc: "Suppress alerts for competitions you don't bet on. Use /unmute to restore any time." },
            ].map(({ setting, impact, desc }, i) => (
              <motion.div key={setting}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="grid grid-cols-1 sm:grid-cols-[1fr_80px_2fr] gap-4 p-5 hover:bg-white/[0.02] transition-colors">
                <div>
                  <div className="font-mono text-xs text-emerald-400 uppercase tracking-widest mb-1">{setting}</div>
                </div>
                <div>
                  <span className={`font-mono text-[11px] px-2 py-0.5 rounded ${impact === "Very High" ? "bg-emerald-500/20 text-emerald-400" : impact === "High" ? "bg-sky-500/20 text-sky-400" : impact === "Medium" ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-zinc-500"}`}>
                    {impact}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/player-bot/settings"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-mono text-sm uppercase tracking-widest transition-colors">
              <span>Full Settings Guide</span><ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ════════════════════ PRICING ════════════════════ */}
        <section id="pricing" className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-12">
              <div className="font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-3">Pricing</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Player Bot Tiers</h2>
              <p className="text-zinc-500 mt-3 text-sm max-w-lg mx-auto">Start free. Upgrade when the value is obvious.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {tiers.map((tier, i) => (
                <motion.div key={tier.name}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}>
                  <TiltCard className="h-full">
                    <div className={`relative flex flex-col h-full border rounded-2xl p-6 bg-[#101010] ${tier.popular ? "border-emerald-500/60 ring-1 ring-emerald-500/30" : "border-white/10"}`}>
                      {tier.popular && (
                        <div className="absolute top-3 right-3 bg-emerald-500 text-black text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1 tracking-widest">
                          <Star className="w-3 h-3" /><span>POPULAR</span>
                        </div>
                      )}
                      <div className="mb-1 font-mono text-xs text-zinc-600 uppercase tracking-widest">{tier.name}</div>
                      <p className="text-xs text-zinc-500 mb-4">{tier.desc}</p>
                      <div className="mb-6">
                        <div>
                          <span className="text-4xl font-black text-white tracking-tight">{tier.price}</span>
                          <span className="text-sm text-zinc-600 ml-2">{tier.period}</span>
                        </div>
                        {tier.billing && (
                          <div className="mt-2 font-mono text-[11px] text-zinc-500 tracking-tight">{tier.billing}</div>
                        )}
                      </div>
                      <ul className="space-y-2 mb-6 flex-1">
                        {tier.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                            <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />{f}
                          </li>
                        ))}
                      </ul>
                      <a href={playerLinks[tier.name as keyof typeof playerLinks]} target="_blank" rel="noopener noreferrer"
                        className={`w-full text-center py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 ${tier.popular ? "bg-emerald-500 text-black hover:bg-emerald-400" : "border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"}`}>
                        Get Started
                      </a>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>

            {/* Bundles & Deals */}
            <div className="mt-16">
              <div className="text-center mb-8">
                <div className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase mb-2">Bundles & Deals</div>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase">Pair It With Team Bot - Or Go Lifetime</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { name: "Club Legend Bundle", tag: "PLAYER + TEAM", price: "£45.99/mo", billing: "£11.99/wk · £45.99/mo · £592.99/yr", link: "https://t.me/PropprManagerBot?start=p_legend_bundle" },
                  { name: "Lifetime - All Bots", tag: "ALL BOTS", price: "£429.99", billing: "One-time · pay once, keep forever", link: "https://t.me/PropprManagerBot?start=lifetime" },
                ].map((b) => (
                  <a key={b.name} href={b.link} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col border border-amber-400/25 rounded-2xl p-5 bg-[#101010] hover:border-amber-400/50 transition-colors">
                    <div className="font-mono text-[9px] font-black px-2 py-0.5 rounded-full border border-white/15 text-zinc-400 tracking-widest self-start mb-3">{b.tag}</div>
                    <div className="font-mono text-xs text-zinc-600 uppercase tracking-widest mb-1">{b.name}</div>
                    <div className="text-2xl font-black text-white tracking-tight">{b.price}</div>
                    <div className="mt-1 font-mono text-[11px] text-zinc-500">{b.billing}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════ FAQ ════════════════════ */}
        <section className="max-w-3xl mx-auto px-4 md:px-6 py-24 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <div className="font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-3">Questions</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Player Bot FAQ</h2>
          </motion.div>
          <div>
            {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </section>

        {/* ════════════════════ FINAL CTA ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-24 w-full">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative border border-emerald-500/20 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.12),transparent_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="relative z-10 p-12 sm:p-20 text-center">
              <div className="font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-6">Ready to Start?</div>
              <TextsReveal>
                <h2 className="t-stagger-line t-stagger-line--1 text-4xl sm:text-5xl font-black text-white tracking-tight uppercase mb-4">
                  Your First Alert<br />Is Waiting.
                </h2>
                <p className="t-stagger-line t-stagger-line--2 text-zinc-400 max-w-md mx-auto mb-10 text-sm leading-relaxed">
                  Free tier forever. No card. Your first value alert arrives within minutes of setup.
                </p>
              </TextsReveal>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="https://t.me/propprplayerbot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-3.5 rounded-xl transition-all hover:scale-105 active:scale-95 uppercase tracking-wide">
                  <Send className="w-4 h-4" />Open Player Bot
                </a>
                <Link href="/quickstart"
                  className="inline-flex items-center gap-2 text-zinc-400 hover:text-white border border-white/10 hover:border-white/25 font-bold px-8 py-3.5 rounded-xl transition-all uppercase tracking-wide text-sm">
                  <BookOpen className="w-4 h-4" />Quick Start Guide
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
