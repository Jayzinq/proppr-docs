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
  BarChart3,
  TrendingUp,
  BookOpen,
  Layers,
  GitCompare,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TiltCard, TextsReveal } from "@/components/transitions/Motion";

/* ──────────────────────────────────────────────────────────────
   DATA
─────────────────────────────────────────────────────────────── */

const teamMarkets = [
  { emoji: "🦵", name: "Tackles", abbr: "TKLS" },
  { emoji: "🔫", name: "Shots", abbr: "SHOTS" },
  { emoji: "🎯", name: "Shots on Target", abbr: "SOT" },
  { emoji: "🟨", name: "Cards", abbr: "CARDS" },
  { emoji: "📐", name: "Corners", abbr: "CORN" },
  { emoji: "⚠️", name: "Fouls", abbr: "FOULS" },
  { emoji: "⛔", name: "Offsides", abbr: "OFFS" },
  { emoji: "🎮", name: "Passes", abbr: "PASS" },
  { emoji: "↩️", name: "Throw-ins", abbr: "THRW" },
  { emoji: "🆓", name: "Free Kicks", abbr: "FK" },
  { emoji: "⛳", name: "Goal Kicks", abbr: "GK" },
  { emoji: "⚽️", name: "Ball Possession %", abbr: "POSS" },
];

const commands = [
  { cmd: "/value", desc: "On-demand team prop value scan across all active fixtures" },
  { cmd: "/fixture", desc: "Full team breakdown for any specific match" },
  { cmd: "/team", desc: "Deep squad stats for any team in any league" },
  { cmd: "/stats", desc: "Global projected team stats across all tracked leagues" },
  { cmd: "/league", desc: "Top team prop value plays filtered by league" },
  { cmd: "/streak", desc: "Teams on 5+ game performance streaks (any market)" },
  { cmd: "/top", desc: "Highest EV team prop plays right now" },
  { cmd: "/topteam", desc: "Best value plays filtered by a specific team" },
  { cmd: "/topleague", desc: "Best value plays filtered by a specific league" },
  { cmd: "/markets", desc: "Enable or disable specific team markets" },
  { cmd: "/settings", desc: "Full customization of filters and preferences" },
  { cmd: "/toggle", desc: "Enable or disable all alerts instantly" },
  { cmd: "/today", desc: "All fixtures with team prop value plays today" },
  { cmd: "/tomorrow", desc: "Preview fixtures and early prices for tomorrow" },
  { cmd: "/weather", desc: "Live stadium weather - affects play style and corners/fouls" },
  { cmd: "/tutorial", desc: "Guided onboarding walkthrough for new users" },
];

const teamLinks: Record<string, string> = {
  Reserve: "https://t.me/PropprManagerBot",
  "Regular Starter": "https://t.me/PropprManagerBot?start=t_regular",
  "Club Legend": "https://t.me/PropprManagerBot?start=t_legend",
};

const tiers = [
  {
    name: "Reserve",
    price: "FREE",
    period: "forever",
    billing: "",
    desc: "Basic team alerts and limited access",
    features: ["Basic team prop alerts", "Limited team & stats access", "Telegram integration", "Free forever"],
    popular: false,
  },
  {
    name: "Regular Starter",
    price: "£11.99",
    period: "per month",
    billing: "£3.99/wk · £11.99/mo · £155.99/yr",
    desc: "Full access with 12-market coverage",
    features: ["Full stats access for all teams", "All 12 team & league markets", "All market control toggles", "Customizable alert settings", "Real-time updates & streaks"],
    popular: true,
  },
  {
    name: "Club Legend",
    price: "£19.99",
    period: "per month",
    billing: "£5.99/wk · £19.99/mo · £249.99/yr",
    desc: "Ultimate tier",
    features: ["All Regular Starter features", "On-demand /fixture & /value", "Exclusive /streak & /top access", "Premium priority support", "Early feature access"],
    popular: false,
  },
];

const faqs = [
  {
    q: "How does the Team Bot power the Player Bot?",
    a: "The Cerebro model pulls live team context - formation, press intensity, opponent defensive stats - to inform player prop projections. A player in a high-corners, low-defensive team has different AGS odds than the same player in a low-block side. Team Bot exposes this underlying data.",
  },
  {
    q: "What's the most useful use case for Team Bot?",
    a: "Bet builder construction. Before placing a team total corners bet, run /stats for corners per game. Before betting Under total shots, check /streak for teams on long Under streaks. Team Bot turns guesswork into data-backed decisions in under 10 seconds.",
  },
  {
    q: "What does /streak actually show?",
    a: "/streak identifies teams on 5+ consecutive game streaks in any market. Example: 'Brighton Over 5.5 Corners for 8 straight matches'. These are among the highest-confidence team total plays because bookmakers often lag behind persistent trends.",
  },
  {
    q: "Can I use Team Bot for live in-play betting?",
    a: "Yes. Run /fixture any time for a live view of the game's projected stats. Combine with /weather for pitch condition context. Many users run /value at half-time to scan for second-half team total value based on first-half data.",
  },
  {
    q: "Do I need Player Bot and Team Bot separately?",
    a: "They're different products optimized for different markets. Player Bot is for player prop specialists. Team Bot is for team total and match market bettors. Both share the same Cerebro model infrastructure. Many users run both simultaneously.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`t-acc border-b border-white/5 transition-colors ${open ? "" : "hover:bg-white/[0.02]"}`} data-open={open}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="t-acc-head w-full flex items-center justify-between py-5 px-1 text-left">
        <span className="font-semibold text-white pr-4 text-sm sm:text-base">{q}</span>
        <span className={`t-acc-chevron shrink-0 ${open ? "text-amber-400" : "text-zinc-500"}`}>
          <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6.5L8 10.5L12 6.5" />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel">
        <div className="t-acc-panel-inner">
          <div className="pb-5 px-1 text-sm text-zinc-400 leading-relaxed border-l-2 border-amber-500/40 pl-4 ml-1">{a}</div>
        </div>
      </div>
    </div>
  );
}

export default function TeamBotMarketing() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#101010] text-foreground overflow-x-hidden">

      {/* Background grid - amber tint for Team Bot */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.02)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <Header />

        {/* ════════════════════ HERO ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 pb-12 w-full">
          <div className="grid lg:grid-cols-[1fr_440px] gap-12 items-start">
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
                className="flex items-center gap-2 mb-8">
                <span className="w-8 h-px bg-amber-500" />
                <span className="text-amber-400 font-mono text-xs tracking-[0.2em] uppercase">12 Team Markets · Streaks · Bet Builders</span>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
                className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                  <Image src="/team-bot-logo.png" alt="Team Bot" width={48} height={48} className="w-full h-full object-cover" />
                </div>
                <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Proppr Team Bot</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-[0.92] tracking-tighter text-white mb-6 uppercase">
                Team Stats.<br />
                <span className="text-amber-400">Streak</span><br />
                Intelligence.
              </motion.h1>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="text-zinc-400 text-lg leading-relaxed max-w-xl mb-8 font-light">
                Corners, cards, shots, passes, possession and 8 more markets - analyzed by Cerebro
                across every fixture. Find teams on winning streaks before the bookmakers adjust.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
                className="flex flex-wrap gap-3 mb-6">
                <a href="https://t.me/propprteambot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm px-6 py-3 rounded-lg transition-all hover:scale-105 active:scale-95 tracking-wide uppercase">
                  <Send className="w-4 h-4" />Join Team Bot
                </a>
                <Link href="/team-bot"
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
                  <span className="text-zinc-600 font-mono text-xs ml-2">Proppr Team Bot · Streak Alert</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />online
                  </span>
                </div>
                <div className="p-5 font-mono text-[12px] leading-[1.8] text-zinc-300 space-y-0.5">
                  <div className="text-amber-400 font-bold">🔥 TEAM STREAK ALERT 🔥</div>
                  <div>🏟 <span className="text-white">Brighton vs Everton</span></div>
                  <div>🏆 Premier League - Sat 12 Apr 15:00</div>
                  <div className="pt-1">📊 Market: <span className="text-emerald-300">Corners Over 9.5</span></div>
                  <div>📚 Bookmaker: <span className="text-white">1.85</span></div>
                  <div>🖥 Model: <span className="text-sky-300">1.52</span></div>
                  <div className="text-emerald-400 font-bold">📈 Value: 21.7%</div>
                  <div className="pt-1 text-amber-400">⚡ <span className="text-white">Brighton</span>: Corners Over 9.5</div>
                  <div className="text-zinc-400">8 straight matches</div>
                  <div>📊 Last 8: 11, 13, 10, 14, 9, 12, 11, 10</div>
                  <div>📆 Avg: <span className="text-white">11.25 corners/game</span></div>
                </div>

                <div className="border-t border-white/5 p-5 font-mono text-[12px] leading-[1.8] text-zinc-300 space-y-0.5">
                  <div className="text-amber-400 font-bold">⚽️ TEAM PROP VALUE ALERT ⚽️</div>
                  <div>🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship</div>
                  <div>🏟 <span className="text-white">Leeds vs Middlesbrough</span></div>
                  <div className="pt-1">📊 <span className="text-emerald-300">Total Shots Over 22.5</span></div>
                  <div>📚 Odds: <span className="text-white">2.10</span> · Model: <span className="text-sky-300">1.61</span></div>
                  <div className="text-emerald-400 font-bold">📈 Value: 30.4%</div>
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
              <div className="inline-block font-mono text-amber-400 text-xs tracking-[0.2em] uppercase mb-4">Coverage</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">12 Team Markets</h2>
              <p className="text-zinc-500 mt-3 text-sm max-w-lg mx-auto">
                All powering the Cerebro player model - and available individually for team total betting.
              </p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {teamMarkets.map((m, i) => (
                <motion.div key={m.abbr}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-[#101010] border border-white/10 rounded-xl p-4 text-center hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group">
                  <div className="text-2xl mb-2">{m.emoji}</div>
                  <div className="font-mono text-[10px] text-amber-400 uppercase tracking-widest mb-1">{m.abbr}</div>
                  <div className="text-xs text-zinc-400 group-hover:text-white transition-colors">{m.name}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ USE CASES ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-14">
            <div className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase mb-3">How Bettors Use It</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Three Core Use Cases</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-0 border border-white/10 rounded-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-white/10">
            {[
              {
                n: "01", icon: TrendingUp, title: "Value Betting",
                desc: "Run /value before kick-off for real-time team total value scans. Every alert includes bookmaker odds vs model odds with EV%. Focus on Cerebro markets where you have the mathematical edge.",
                example: "/value → Total Corners Over 9.5 @ 1.85 · Value: 21.7%",
              },
              {
                n: "02", icon: Layers, title: "Bet Builder Construction",
                desc: "Stack team stats with player props for higher-odds builders. Check /stats for corners leaders, combine with Player Bot's /top for a player corners builder with data-backed confidence on every leg.",
                example: "/stats corners → Top 3 corners teams week 34",
              },
              {
                n: "03", icon: GitCompare, title: "Fixture Research",
                desc: "Open /fixture for a complete match preview: both teams' last 10 games, projected totals per market, head-to-head context, and live odds. Full research in under 10 seconds.",
                example: "/fixture Arsenal Chelsea → Full analysis instantly",
              },
            ].map((s, i) => (
              <motion.div key={s.n}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="p-8 hover:bg-white/[0.02] transition-colors group">
                <div className="font-black text-6xl text-white/5 group-hover:text-amber-500/10 transition-colors tabular-nums mb-6 leading-none">{s.n}</div>
                <s.icon className="w-6 h-6 text-amber-400 mb-4" />
                <h3 className="text-white font-black text-lg uppercase tracking-tight mb-3">{s.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-4">{s.desc}</p>
                <div className="bg-black/40 border border-white/5 rounded-lg p-3 font-mono text-[11px] text-emerald-300">{s.example}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════════════════════ HOW STREAK WORKS ════════════════════ */}
        <section className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-24">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase mb-4">Insights</div>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mb-6">
                  How /streak<br />Works
                </h2>
                <div className="space-y-5 text-sm text-zinc-500 leading-relaxed">
                  <p>
                    /streak identifies teams that have hit the same over/under threshold for 5+ consecutive games 
                    in any of the 12 tracked markets. These are among the highest-confidence plays available.
                  </p>
                  <p>
                    Bookmakers typically update odds reactively - they lag behind long-running trends. 
                    A team averaging 11+ corners per game for 8 straight matches often still gets priced 
                    at Over 9.5 at 1.85, which represents genuine mathematical edge.
                  </p>
                  <p>
                    Each streak result shows: the market, consecutive game count, last 8 results, 
                    the market average, and any bookmaker odds available for the next fixture.
                  </p>
                </div>
                <Link href="/team-bot/insights"
                  className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:text-amber-300 font-mono text-sm uppercase tracking-widest transition-colors">
                  <span>Read the Streaks Guide</span><ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              {/* Streak output example */}
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="bg-[#101010] border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                    <span className="font-mono text-xs text-zinc-600 uppercase tracking-widest">/streak output · Premier League</span>
                  </div>
                  <div className="p-5 font-mono text-[12px] leading-[1.85]">
                    {[
                      { team: "Brighton", market: "Corners Over 9.5", games: "8 straight", avg: "11.25", color: "text-amber-400" },
                      { team: "Man City", market: "Shots Over 14.5", games: "7 straight", avg: "16.4", color: "text-emerald-400" },
                      { team: "Brentford", market: "Cards Over 3.5", games: "6 straight", avg: "4.3", color: "text-sky-400" },
                      { team: "Wolves", market: "Fouls Over 11.5", games: "5 straight", avg: "12.8", color: "text-purple-400" },
                    ].map((s) => (
                      <div key={s.team} className="py-2 border-b border-white/5 last:border-0">
                        <div className={`font-bold ${s.color}`}>🔥 {s.team}</div>
                        <div className="text-zinc-300">{s.market}</div>
                        <div className="text-zinc-600">{s.games} · Avg {s.avg}/match</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ════════════════════ COMMANDS ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-14">
            <div className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase mb-4">Reference</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">All Commands</h2>
          </motion.div>

          <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
            {commands.map((c, i) => (
              <motion.div key={c.cmd}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 p-5 hover:bg-white/[0.02] transition-colors">
                <code className="font-mono text-sm text-amber-300 bg-amber-500/10 px-3 py-1 rounded-lg self-start">{c.cmd}</code>
                <p className="text-sm text-zinc-500 leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/team-bot/commands"
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-mono text-sm uppercase tracking-widest transition-colors">
              <span>Full Command Reference</span><ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ════════════════════ PRICING ════════════════════ */}
        <section id="pricing" className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-12">
              <div className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase mb-3">Pricing</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Team Bot Tiers</h2>
              <p className="text-zinc-500 mt-3 text-sm">Free tier forever. No card required.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-5">
              {tiers.map((tier, i) => (
                <motion.div key={tier.name}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}>
                  <TiltCard className="h-full">
                    <div className={`relative flex flex-col h-full border rounded-2xl p-6 bg-[#101010] ${tier.popular ? "border-amber-400/60 ring-1 ring-amber-400/30" : "border-white/10"}`}>
                      {tier.popular && (
                        <div className="absolute top-3 right-3 bg-amber-400 text-black text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1 tracking-widest">
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
                            <Check className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />{f}
                          </li>
                        ))}
                      </ul>
                      <a href={teamLinks[tier.name] ?? "https://t.me/PropprManagerBot"} target="_blank" rel="noopener noreferrer"
                        className={`w-full text-center py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 ${tier.popular ? "bg-amber-400 text-black hover:bg-amber-300" : "border border-amber-400/40 text-amber-400 hover:bg-amber-400/10"}`}>
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
                <h3 className="text-2xl font-black text-white tracking-tight uppercase">Pair It With Player Bot - Or Go Lifetime</h3>
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
            <div className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase mb-3">Questions</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Team Bot FAQ</h2>
          </motion.div>
          <div>
            {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </section>

        {/* ════════════════════ FINAL CTA ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-24 w-full">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative border border-amber-500/20 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.10),transparent_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="relative z-10 p-12 sm:p-20 text-center">
              <div className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase mb-6">The Numbers Don&apos;t Lie</div>
              <TextsReveal>
                <h2 className="t-stagger-line t-stagger-line--1 text-4xl sm:text-5xl font-black text-white tracking-tight uppercase mb-4">
                  Find the Streak.<br />Place the Bet.
                </h2>
                <p className="t-stagger-line t-stagger-line--2 text-zinc-400 max-w-md mx-auto mb-10 text-sm leading-relaxed">
                  Free tier forever. Run /streak right now and see which teams are on multi-game hot streaks
                  the bookmakers haven't caught up to yet.
                </p>
              </TextsReveal>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="https://t.me/propprteambot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-8 py-3.5 rounded-xl transition-all hover:scale-105 active:scale-95 uppercase tracking-wide">
                  <Send className="w-4 h-4" />Open Team Bot
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
