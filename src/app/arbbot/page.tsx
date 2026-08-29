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
  TrendingUp,
  BookOpen,
  Calculator,
  Zap,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TiltCard, TextsReveal } from "@/components/transitions/Motion";

/* ──────────────────────────────────────────────────────────────
   DATA
─────────────────────────────────────────────────────────────── */

const bookmakerGroups = [
  {
    region: "🇬🇧 United Kingdom",
    books: ["Bet365", "Betfair Exchange", "William Hill", "Ladbrokes", "Coral", "Paddy Power", "Sky Bet", "Betway", "Unibet", "10Bet"],
  },
  {
    region: "🌍 Global / Sharp",
    books: ["Pinnacle", "Smarkets", "Betfair", "Matchbook", "Betcris", "1xBet", "Bet-at-home"],
  },
  {
    region: "🇺🇸 United States",
    books: ["DraftKings", "FanDuel", "BetMGM", "Caesars", "PointsBet", "WynnBET", "Barstool"],
  },
  {
    region: "🇪🇺 Europe",
    books: ["Winamax", "Bwin", "Betsson", "Interwetten", "Tipico", "Betano", "Parimatch"],
  },
  {
    region: "🌎 Americas / Other",
    books: ["Betway", "Bet9ja", "Sportingbet", "Betcris", "SportsBet", "TAB", "Neds"],
  },
];

const arbLinks: Record<string, string> = {
  Demo: "https://t.me/PropprManagerBot",
  Premium: "https://t.me/PropprManagerBot?start=arb_bot",
};

const tiers = [
  {
    name: "Demo",
    price: "FREE",
    period: "forever",
    billing: "",
    desc: "Try arbitrage betting at no cost",
    features: ["Arbs up to 1% margin", "5-min cooldown between alerts", "Max 6 alerts per hour", "Full bookmaker selection", "Stake calculator included"],
    popular: false,
  },
  {
    name: "Premium",
    price: "£23.99",
    period: "per month",
    billing: "£6.99/wk · £23.99/mo · £311.99/yr",
    desc: "Unlimited arbitrage opportunities",
    features: ["ALL arbs - no margin cap", "Unlimited alerts 24/7", "Zero rate limiting", "High-value arbs (5%+ margins)", "150+ bookmakers covered", "Priority support"],
    popular: true,
  },
];

const faqs = [
  {
    q: "What exactly is arbitrage betting?",
    a: "Arbitrage (arbing) exploits price discrepancies between bookmakers. By backing different outcomes at different books, the arithmetic returns the same amount whichever way it goes — at the prices you captured, and only if every leg actually gets on. Example: Bet365 offers 2.10 on Under 2.5 goals. Pinnacle offers 2.05 on Over 2.5. Total implied probability = 47.6% + 48.8% = 96.4%. That 3.6% gap is your margin at those prices.",
  },
  {
    q: "How fast do opportunities disappear?",
    a: "Most arb opportunities last 60-120 seconds before bookmakers adjust. High-value arbs (5%+) can vanish in under 30 seconds. Enable Telegram push notifications, have accounts open in separate browser tabs, and place simultaneously. Speed is the primary skill.",
  },
  {
    q: "Will my accounts get restricted?",
    a: "Regular arbing at high stakes will eventually flag accounts. Best practices: vary stake sizes, don't always arb the same bookmaker pairs, follow normal betting patterns, and avoid the same market repeatedly. The Arb Bot alerts you to the opportunity - stake management is your responsibility.",
  },
  {
    q: "What is the 'RF' (risk-free low/high) staking mode?",
    a: "Rather than backing both sides at equal profit, the RF strategy maximizes your return on one outcome while still covering the other with a smaller stake for downside protection. The Arb Bot's stake calculator provides both the standard arb breakdown and an RF breakdown for every alert.",
  },
  {
    q: "Do I need accounts at all 150+ bookmakers?",
    a: "No. Enable only the bookmakers where you have funded accounts in /settings. The bot will only alert you on arbs that involve your active books. Start with 5-10 books and expand. Tier 1 recommended: Pinnacle + Betfair Exchange + Bet365 + Smarkets + any sharp European book.",
  },
  {
    q: "What margin do I need to make profit?",
    a: "After accounting for potential stake limitation and single-side settlement, aim for arbs at 2%+ consistently. The Demo tier shows arbs up to 1% - useful for learning. Premium delivers all arbs including 5%+ high-value opportunities where you lock substantial profit per bet.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`t-acc border-b border-white/5 transition-colors ${open ? "" : "hover:bg-white/[0.02]"}`} data-open={open}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="t-acc-head w-full flex items-center justify-between py-5 px-1 text-left">
        <span className="font-semibold text-white pr-4 text-sm sm:text-base">{q}</span>
        <span className={`t-acc-chevron shrink-0 ${open ? "text-sky-400" : "text-zinc-500"}`}>
          <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6.5L8 10.5L12 6.5" />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel">
        <div className="t-acc-panel-inner">
          <div className="pb-5 px-1 text-sm text-zinc-400 leading-relaxed border-l-2 border-sky-500/40 pl-4 ml-1">{a}</div>
        </div>
      </div>
    </div>
  );
}

export default function ArbBotMarketing() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#101010] text-foreground overflow-x-hidden">

      {/* Background grid - sky/blue tint for Arb Bot */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.02)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-sky-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <Header />

        {/* ════════════════════ HERO ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 pb-12 w-full">
          <div className="grid lg:grid-cols-[1fr_440px] gap-12 items-start">
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
                className="flex items-center gap-2 mb-8">
                <span className="w-8 h-px bg-sky-500" />
                <span className="text-sky-400 font-mono text-xs tracking-[0.2em] uppercase">150+ Bookmakers · Balanced Returns · Real-Time Alerts</span>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
                className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                  <Image src="/arb-bot-logo.png" alt="Arb Bot" width={48} height={48} className="w-full h-full object-cover" />
                </div>
                <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Proppr Arb Bot</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-[0.92] tracking-tighter text-white mb-6 uppercase">
                Guaranteed.<br />
                <span className="text-sky-400">Profit.</span><br />
                Every Bet.
              </motion.h1>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="text-zinc-400 text-lg leading-relaxed max-w-xl mb-8 font-light">
                The Arb Bot scans 150+ bookmakers 24/7 for price discrepancies. 
                When two books disagree on the same event, you back both sides 
                and lock in profit regardless of the result.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
                className="flex flex-wrap gap-3 mb-6">
                <a href="https://t.me/propprarbbot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-black text-sm px-6 py-3 rounded-lg transition-all hover:scale-105 active:scale-95 tracking-wide uppercase">
                  <Send className="w-4 h-4" />Join Arb Bot
                </a>
                <Link href="/arb-bot"
                  className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 text-white font-bold text-sm px-6 py-3 rounded-lg border border-white/15 transition-all hover:scale-105 active:scale-95 tracking-wide uppercase">
                  <BookOpen className="w-4 h-4" />View Docs
                </Link>
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.5 }}
                className="text-zinc-600 text-xs font-mono uppercase tracking-wide">
                Free Demo tier · No card required · Upgrade for unlimited arbs
              </motion.p>
            </div>

            {/* Right: live arb alert */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
              className="hidden lg:block sticky top-24">
              <div className="bg-[#101010] border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/60" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-zinc-600 font-mono text-xs ml-2">Proppr Arb Bot · Live Alert</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />online
                  </span>
                </div>
                <div className="p-5 font-mono text-[12px] leading-[1.8] text-zinc-300 space-y-0.5">
                  <div className="text-amber-400 font-bold">💰 ARBITRAGE OPPORTUNITY 💰</div>
                  <div>🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League</div>
                  <div>⚽️ <span className="text-white">Blackburn Rovers vs Charlton</span></div>
                  <div className="pt-1">🎯 <span className="text-sky-300">Market: Totals (UNDER 2.25)</span></div>
                  <div className="pt-1">🏦 <span className="text-white font-bold">BET 1 - Bet365</span></div>
                  <div>   Selection: Under 2.25</div>
                  <div>   Odds: <span className="text-white">2.10</span></div>
                  <div>   Stake: <span className="text-emerald-300">£48.78</span></div>
                  <div className="pt-1">🏦 <span className="text-white font-bold">BET 2 - Pinnacle</span></div>
                  <div>   Selection: Over 2.25</div>
                  <div>   Odds: <span className="text-white">2.05</span></div>
                  <div>   Stake: <span className="text-emerald-300">£51.22</span></div>
                  <div className="pt-1 text-emerald-400 font-bold">💵 Arb Target: 3.6%</div>
                  <div>💵 Total Stake: <span className="text-white">£100.00</span></div>
                  <div className="text-emerald-400">💵 Return at the captured prices: £102.44</div>
                  <div className="text-zinc-600 text-[11px] pt-1">⏱ Alert age: 8 seconds · Act fast</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════ HOW ARB WORKS ════════════════════ */}
        <section className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-16">
              <div className="font-mono text-sky-400 text-xs tracking-[0.2em] uppercase mb-3">The Maths</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">How Arbitrage Works</h2>
              <p className="text-zinc-500 mt-3 text-sm max-w-lg mx-auto">No AI. No prediction. Pure mathematics.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Math worked example */}
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="bg-[#101010] border border-white/10 rounded-2xl p-8">
                <div className="font-mono text-xs text-zinc-600 uppercase tracking-widest mb-6">Worked Example - 3.6% Arb</div>
                <div className="space-y-4">
                  {[
                    { label: "Bet365 → Under 2.5 goals", val: "2.10", color: "text-white", sub: "Implied: 47.6%" },
                    { label: "Pinnacle → Over 2.5 goals", val: "2.05", color: "text-white", sub: "Implied: 48.8%" },
                    { label: "Combined Implied %", val: "96.4%", color: "text-sky-400", sub: "3.6% gap = your profit" },
                    { label: "Stake £100 total", val: "+£3.60", color: "text-emerald-400 font-bold text-lg", sub: "Regardless of result" },
                  ].map(({ label, val, color, sub }) => (
                    <div key={label} className="flex items-start justify-between py-3 border-b border-white/5 last:border-0 gap-4">
                      <div>
                        <div className="text-zinc-400 text-sm">{label}</div>
                        <div className="text-zinc-600 text-xs mt-0.5">{sub}</div>
                      </div>
                      <span className={`font-mono shrink-0 ${color}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* 4 key facts */}
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="space-y-4">
                {[
                  { icon: ShieldCheck, title: "Balanced Return", desc: "Both outcomes are covered. One wins, one loses. The margin is your return at the captured prices, provided both legs get on." },
                  { icon: Calculator, title: "Stake Calculator Built-In", desc: "Every alert includes the exact stake split per bookmaker. No manual calculation needed - just place the amounts shown." },
                  { icon: Zap, title: "60-120 Second Windows", desc: "Bookmakers close lines fast. Enable Telegram push notifications and have accounts open. Speed is the only skill required." },
                  { icon: Globe, title: "150+ Bookmakers Scanned", desc: "The more books you have accounts with, the more arbs you'll see. UK, EU, US, Africa, and sharp exchanges all included." },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <motion.div key={title}
                    initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-4 bg-[#101010] border border-white/10 rounded-xl p-5 hover:border-sky-500/20 hover:bg-sky-500/5 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm mb-1">{title}</div>
                      <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ════════════════════ EXECUTION GUIDE ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <div className="font-mono text-sky-400 text-xs tracking-[0.2em] uppercase mb-3">Execution</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">How to Place an Arb</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border border-white/10 rounded-2xl overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-white/10">
            {[
              { n: "01", title: "Receive Alert", desc: "Telegram push notification arrives with exact stake amounts, bookmakers, selections, and the return those prices lock in." },
              { n: "02", title: "Open Both Books", desc: "Have both bookmaker accounts open in separate tabs simultaneously. Log in before you need to place - don't log in under time pressure." },
              { n: "03", title: "Place Bet 1 First", desc: "Start with the less liquid book (not Betfair Exchange). Confirm Bet 1 is placed before moving to Bet 2." },
              { n: "04", title: "Place Bet 2 Immediately", desc: "Place Bet 2 within seconds. If odds have moved, recalculate your stake using the formula in /arb-bot/commands or walk away." },
            ].map((s, i) => (
              <motion.div key={s.n}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 hover:bg-white/[0.02] transition-colors group">
                <div className="font-black text-6xl text-white/5 group-hover:text-sky-500/10 transition-colors tabular-nums mb-6 leading-none">{s.n}</div>
                <h3 className="text-white font-black text-base uppercase tracking-tight mb-3">{s.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/arb-bot/commands"
              className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-mono text-sm uppercase tracking-widest transition-colors">
              <span>Full Execution Guide</span><ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ════════════════════ BOOKMAKERS ════════════════════ */}
        <section className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-14">
              <div className="font-mono text-sky-400 text-xs tracking-[0.2em] uppercase mb-3">Coverage</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">150+ Bookmakers</h2>
              <p className="text-zinc-500 mt-3 text-sm max-w-lg mx-auto">
                Enable only the books where you have funded accounts. The more books you activate, 
                the more arbs the bot can surface.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {bookmakerGroups.map((group, gi) => (
                <motion.div key={group.region}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: gi * 0.07 }}
                  className="bg-[#101010] border border-white/10 rounded-xl overflow-hidden hover:border-sky-500/20 transition-all">
                  <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                    <span className="font-mono text-xs text-sky-400 uppercase tracking-widest">{group.region}</span>
                  </div>
                  <div className="p-4 flex flex-wrap gap-2">
                    {group.books.map((b) => (
                      <span key={b} className="text-[11px] text-zinc-400 bg-white/5 border border-white/5 rounded-md px-2 py-1 font-mono">{b}</span>
                    ))}
                    <span className="text-[11px] text-zinc-600 bg-white/[0.02] border border-white/5 rounded-md px-2 py-1 font-mono">+many more</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/arb-bot/settings"
                className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-mono text-sm uppercase tracking-widest transition-colors">
                <span>Manage Your Bookmaker List</span><ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ════════════════════ PRICING ════════════════════ */}
        <section id="pricing" className="max-w-5xl mx-auto px-4 md:px-6 py-24 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <div className="font-mono text-sky-400 text-xs tracking-[0.2em] uppercase mb-3">Pricing</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Arb Bot Tiers</h2>
            <p className="text-zinc-500 mt-3 text-sm">Demo is free forever. Premium unlocks all arbs with no limits.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {tiers.map((tier, i) => (
              <motion.div key={tier.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}>
                <TiltCard className="h-full">
                  <div className={`relative flex flex-col h-full border rounded-2xl p-6 bg-[#101010] ${tier.popular ? "border-sky-500/60 ring-1 ring-sky-500/30" : "border-white/10"}`}>
                    {tier.popular && (
                      <div className="absolute top-3 right-3 bg-sky-500 text-white text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1 tracking-widest">
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
                          <Check className="w-4 h-4 mt-0.5 shrink-0 text-sky-400" />{f}
                        </li>
                      ))}
                    </ul>
                    <a href={arbLinks[tier.name] ?? "https://t.me/PropprManagerBot"} target="_blank" rel="noopener noreferrer"
                      className={`w-full text-center py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 ${tier.popular ? "bg-sky-500 text-white hover:bg-sky-400" : "border border-sky-500/40 text-sky-400 hover:bg-sky-500/10"}`}>
                      Get Started
                    </a>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>

          {/* Comparison note */}
          <div className="mt-8 bg-white/[0.02] border border-white/8 rounded-xl p-5 max-w-2xl mx-auto">
            <div className="grid grid-cols-3 gap-4 text-center text-xs font-mono">
              {[
                { label: "Demo Margin Cap", demo: "≤ 1%", premium: "No cap" },
                { label: "Alert Rate", demo: "Max 6/hr", premium: "Unlimited" },
                { label: "Cooldown", demo: "5 minutes", premium: "None" },
              ].map(({ label, demo, premium }) => (
                <div key={label}>
                  <div className="text-zinc-600 uppercase tracking-widest mb-2 text-[10px]">{label}</div>
                  <div className="text-zinc-400">{demo}</div>
                  <div className="text-sky-400 font-bold">{premium}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-[10px] font-mono mt-2">
              <div />
              <div className="text-zinc-600">DEMO</div>
              <div className="text-sky-400">PREMIUM</div>
            </div>
          </div>

          {/* Lifetime deal */}
          <a href="https://t.me/PropprManagerBot?start=lifetime" target="_blank" rel="noopener noreferrer"
            className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto border border-amber-400/30 rounded-2xl p-6 bg-[#101010] hover:border-amber-400/60 transition-colors">
            <div>
              <div className="font-mono text-[9px] font-black px-2 py-0.5 rounded-full border border-white/15 text-zinc-400 tracking-widest inline-block mb-2">ALL BOTS</div>
              <div className="text-white font-black text-lg uppercase tracking-tight">Lifetime - All Bots</div>
              <div className="text-zinc-500 text-sm">Player + Team + Arb. One payment, keep forever - no recurring billing.</div>
            </div>
            <div className="text-3xl font-black text-amber-400 tracking-tight shrink-0">£429.99</div>
          </a>
        </section>

        {/* ════════════════════ FAQ ════════════════════ */}
        <section className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-12">
              <div className="font-mono text-sky-400 text-xs tracking-[0.2em] uppercase mb-3">Questions</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Arb Bot FAQ</h2>
            </motion.div>
            <div>
              {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </div>
        </section>

        {/* ════════════════════ FINAL CTA ════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-24 w-full">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative border border-sky-500/20 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,165,233,0.10),transparent_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="relative z-10 p-12 sm:p-20 text-center">
              <div className="font-mono text-sky-400 text-xs tracking-[0.2em] uppercase mb-6">Balanced Returns</div>
              <TextsReveal>
                <h2 className="t-stagger-line t-stagger-line--1 text-4xl sm:text-5xl font-black text-white tracking-tight uppercase mb-4">
                  The Only Bet<br />You Can&apos;t Lose.
                </h2>
                <p className="t-stagger-line t-stagger-line--2 text-zinc-400 max-w-md mx-auto mb-10 text-sm leading-relaxed">
                  Free Demo tier includes real arb alerts. No card required.
                  Your first guaranteed-profit opportunity is waiting right now.
                </p>
              </TextsReveal>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="https://t.me/propprarbbot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-black px-8 py-3.5 rounded-xl transition-all hover:scale-105 active:scale-95 uppercase tracking-wide">
                  <Send className="w-4 h-4" />Open Arb Bot
                </a>
                <Link href="/arb-bot"
                  className="inline-flex items-center gap-2 text-zinc-400 hover:text-white border border-white/10 hover:border-white/25 font-bold px-8 py-3.5 rounded-xl transition-all uppercase tracking-wide text-sm">
                  <TrendingUp className="w-4 h-4" />Read the Docs
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
