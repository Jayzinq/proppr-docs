"use client";

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Send, BookOpen, Trophy, Bot, TrendingUp, Star, LineChart } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SuccessCheck } from "@/components/transitions/Motion";

/* ──────────────────────────────────────────────────────────────
   DATA
─────────────────────────────────────────────────────────────── */

const playerLinks = {
  Reserve: "https://t.me/PropprManagerBot",
  "Bench Player": "https://t.me/PropprManagerBot?start=p_bench",
  "Regular Starter": "https://t.me/PropprManagerBot?start=p_regular",
  "Club Legend": "https://t.me/PropprManagerBot?start=p_legend",
};

const teamLinks = {
  Reserve: "https://t.me/PropprManagerBot",
  "Regular Starter": "https://t.me/PropprManagerBot?start=t_regular",
  "Club Legend": "https://t.me/PropprManagerBot?start=t_legend",
};

const arbLinks = {
  Demo: "https://t.me/PropprManagerBot",
  Premium: "https://t.me/PropprManagerBot?start=arb_bot",
};

// Feature rows - stat-table treatment, not cards
const featureRows = [
  { rank: "01", label: "THE 4-TAB KILLER", desc: "Oddschecker for odds, SofaScore for lineups, FlashScore for stats, FotMob for form. One Telegram command replaces them all.", stat: "4 Sites → 1 Bot", bar: 100 },
  { rank: "02", label: "CEBRO STATISTICAL MODEL", desc: "Hard-coded mathematics - not AI, not ML. Position-aware modeling with 60-70% confidence on value plays.", stat: "100% Verified", bar: 100 },
  { rank: "03", label: "SUB-5-SECOND RESEARCH", desc: "/value, /fixture, /stats - full match analysis lands in your DMs before you could open the first tab.", stat: "< 5s Response", bar: 97 },
  { rank: "04", label: "100+ LEAGUES DEEP", desc: "Premier League to Saudi Pro League. Every player, every team, every market with live odds from 150+ bookmakers.", stat: "100+ Leagues", bar: 95 },
  { rank: "05", label: "ZERO HALLUCINATIONS", desc: "No ChatGPT guessing player stats. Every projection verified against live squad data. The model doesn't make things up.", stat: "0 AI Errors", bar: 100 },
];

const playerTiers = [
  { name: "Reserve", price: "FREE", period: "forever", billing: "", desc: "Experience the bot before committing", features: ["Basic player prop alerts", "Essential value identification", "Telegram integration", "Free forever"], popular: false },
  { name: "Bench Player", price: "£9.99", period: "per month", billing: "£2.99/wk · £9.99/mo · £124.99/yr", desc: "Full stats and market access", features: ["Full player prop access", "All market coverage", "Customizable settings", "Unlimited usage"], popular: false },
  { name: "Regular Starter", price: "£23.99", period: "per month", billing: "£6.99/wk · £23.99/mo · £311.99/yr", desc: "Complete customization control", features: ["Complete feature access", "Advanced customization", "Real-time alerts", "Enhanced filtering", "Performance tracking"], popular: false },
  { name: "Club Legend", price: "£35.99", period: "per month", billing: "£9.99/wk · £35.99/mo · £467.99/yr", desc: "Ultimate tier - the full edge", features: ["All premium features", "On-demand /fixture & /value", "Priority support", "Advanced analytics", "Early feature access"], popular: true },
];

const teamTiers = [
  { name: "Reserve", price: "FREE", period: "forever", billing: "", desc: "Basic team alerts and limited access", features: ["Basic team prop alerts", "Limited team/stats access", "Telegram integration", "Free forever"], popular: false },
  { name: "Regular Starter", price: "£11.99", period: "per month", billing: "£3.99/wk · £11.99/mo · £155.99/yr", desc: "Full access with customization", features: ["Full stats access", "All team & league data", "All market controls", "Customizable alert settings", "Real-time updates"], popular: true },
  { name: "Club Legend", price: "£19.99", period: "per month", billing: "£5.99/wk · £19.99/mo · £249.99/yr", desc: "Ultimate tier", features: ["All features included", "On-demand /fixture & /value", "Exclusive access", "Premium support", "Priority alerts"], popular: false },
];

const arbTiers = [
  { name: "Demo", price: "FREE", period: "forever", billing: "", desc: "Try arbitrage betting risk-free", features: ["Arbs up to 1% margin", "5-min cooldown between alerts", "Max 6 alerts per hour", "Full bookmaker selection", "Stake calculator"], popular: false },
  { name: "Premium", price: "£23.99", period: "per month", billing: "£6.99/wk · £23.99/mo · £311.99/yr", desc: "Unlimited arbitrage opportunities", features: ["ALL arbs – no margin cap", "Unlimited alerts 24/7", "No rate limiting", "High-value arbs (5%+ margins)", "150+ bookmakers", "Priority support"], popular: true },
];

const bundleTiers = [
  { name: "Club Legend Bundle", price: "£45.99", period: "per month", billing: "£11.99/wk · £45.99/mo · £592.99/yr", tag: "PLAYER + TEAM", link: "https://t.me/PropprManagerBot?start=p_legend_bundle", desc: "Both bots at full Club Legend tier - one subscription", features: ["Everything in Player Club Legend", "Everything in Team Club Legend", "Unified bet-builder workflow", "Priority support across both bots"], popular: false },
  { name: "Lifetime - All Bots", price: "£429.99", period: "one-time", billing: "Player + Team + Arb · pay once, keep forever", tag: "ALL BOTS", link: "https://t.me/PropprManagerBot?start=lifetime", desc: "One payment. Every bot. Forever.", features: ["Lifetime Player Bot access", "Lifetime Team Bot access", "Lifetime Arb Bot access", "All future features included", "No recurring billing"], popular: false },
];

const faqs = [
  { q: "Is the bot a tipster?", a: "No. The bot identifies potential value plays - not guaranteed winners. As Jay (Prof. X) says: 'There will be just as many losing alerts as winning alerts. The edge comes from long-term volume on positive EV plays.' Use it as a research tool, not a blind following system." },
  { q: "What makes this different from other betting tools?", a: "The Cebro model is hard-coded mathematics - not AI, not machine learning. It analyzes position-specific data from last 5-10 games with 60-70% model confidence. No hallucinated stats, no guessing, no ChatGPT outputs." },
  { q: "What does 'Value %' mean?", a: "Value % = ((Bookmaker Odds ÷ Model Odds) − 1) × 100. Example: Bookmaker offers 8.5, model calculates 2.86 fair odds = 197.2% value. You're being paid nearly 3x what the math says is fair." },
  { q: "How does arbitrage work?", a: "The Arb Bot finds price discrepancies between bookmakers for the same event. By backing both sides at different books, you lock in guaranteed profit regardless of outcome. Example: £100 total stake → £102.44 return = 2.44% locked profit." },
  { q: "What leagues are covered?", a: "100+ leagues worldwide: Premier League, La Liga, Serie A, Bundesliga, MLS, Liga MX, Saudi Pro League, Eredivisie, Ligue 1, and major South American/Asian competitions. If bookmakers price it, we analyze it." },
  { q: "How fast do arb opportunities disappear?", a: "Most arbitrage opportunities last 60-120 seconds before bookmakers correct their lines. High-value arbs (5%+) often vanish within 30 seconds. Enable Telegram push notifications and have bookmaker accounts open." },
  { q: "Which bookmakers does the Arb Bot cover?", a: "150+ bookmakers including Bet365, Betfair Exchange, Pinnacle, Smarkets, Ladbrokes, William Hill, DraftKings, FanDuel, Winamax, and more across 30+ countries. Enable only the books where you have funded accounts." },
  { q: "Can I try before subscribing?", a: "Yes. All three bots have a free tier - Reserve for Player/Team Bot, Demo for Arb Bot. Use them indefinitely at the free level. No credit card required. Upgrade when the value is obvious." },
];

/* ──────────────────────────────────────────────────────────────
   NUMBER POP-IN (transitions.dev #02) - per-digit blurred slide
─────────────────────────────────────────────────────────────── */
function PopInNumber({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const chars = `${to.toLocaleString()}${suffix}`.split("");
  return (
    <span ref={ref} className={`t-digit-group ${inView ? "is-animating" : ""}`}>
      {chars.map((ch, i) => {
        const stagger = i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined;
        return (
          <span key={i} className="t-digit" data-stagger={stagger}>{ch}</span>
        );
      })}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
   SLIDING TABS (transitions.dev #16) - pill follows active tab
─────────────────────────────────────────────────────────────── */
function SlidingTabs({ tabs, value, onChange }: { tabs: { k: string; label: string; icon: typeof Trophy }[]; value: string; onChange: (k: string) => void }) {
  const pillRef = useRef<HTMLSpanElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const first = useRef(true);

  const move = (animate: boolean) => {
    const tab = btnRefs.current[value];
    const pill = pillRef.current;
    if (!tab || !pill) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
    }
  };

  useEffect(() => {
    move(!first.current);
    first.current = false;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => move(false);
    requestAnimationFrame(() => move(false));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="t-tabs"
      role="tablist"
      style={{ "--tabs-bar-bg": "rgba(255,255,255,0.05)", "--tabs-pill-bg": "#10b981", "--tabs-text-active": "#000", "--tabs-text-muted": "rgba(255,255,255,0.55)" } as CSSProperties}
    >
      <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
      {tabs.map(({ k, label, icon: Icon }) => (
        <button
          key={k}
          ref={(el) => { btnRefs.current[k] = el; }}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className="t-tab flex items-center gap-2 !h-auto !px-5 !py-2.5 font-bold text-sm uppercase tracking-wide whitespace-nowrap"
        >
          <Icon className="w-4 h-4" />{label}
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   TILT CARD (transitions.dev #19) - 3D pointer tilt + glare
─────────────────────────────────────────────────────────────── */
function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tilt = outer.current;
    const el = card.current;
    if (!tilt || !el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const MAX = 12;

    const reset = () => {
      tilt.classList.remove("is-hover");
      el.classList.remove("is-tilting");
      el.style.setProperty("--tilt-rx", "0deg");
      el.style.setProperty("--tilt-ry", "0deg");
    };
    const track = (e: PointerEvent) => {
      if (reduce.matches) return;
      const r = tilt.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      tilt.classList.add("is-hover");
      el.classList.add("is-tilting");
      el.style.setProperty("--tilt-ry", ((px - 0.5) * MAX).toFixed(2) + "deg");
      el.style.setProperty("--tilt-rx", ((0.5 - py) * MAX).toFixed(2) + "deg");
      el.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%");
      el.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%");
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") { try { tilt.setPointerCapture(e.pointerId); } catch { /* noop */ } }
    };
    const leave = (e: PointerEvent) => { if (e.pointerType === "mouse") reset(); };

    tilt.addEventListener("pointerdown", down);
    tilt.addEventListener("pointermove", track);
    tilt.addEventListener("pointerup", reset);
    tilt.addEventListener("pointercancel", reset);
    tilt.addEventListener("pointerleave", leave);
    return () => {
      tilt.removeEventListener("pointerdown", down);
      tilt.removeEventListener("pointermove", track);
      tilt.removeEventListener("pointerup", reset);
      tilt.removeEventListener("pointercancel", reset);
      tilt.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={outer} className={`t-tilt ${className}`}>
      <div ref={card} className="t-tilt-card h-full">
        {children}
        <div className="t-tilt-glare" />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   AVATAR GROUP HOVER (transitions.dev #11) - distance-falloff lift
─────────────────────────────────────────────────────────────── */
function AvatarGroup({ items, className = "" }: { items: ReactNode[]; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const setShifts = (activeIdx: number | null, phase: "in" | "out") => {
    if (!rootRef.current) return;
    const cs = getComputedStyle(document.documentElement);
    const num = (name: string, fb: number) => { const v = parseFloat(cs.getPropertyValue(name)); return Number.isFinite(v) ? v : fb; };
    const ease = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
    const lift = num("--avatar-lift", -4);
    const falloff = num("--avatar-falloff", 0.45);
    const scale = num("--avatar-scale", 1.05);
    const tf = phase === "out"
      ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
      : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");
    rootRef.current.querySelectorAll<HTMLElement>(".t-avatar").forEach((el, i) => {
      el.style.transitionTimingFunction = tf;
      if (activeIdx == null) {
        el.style.setProperty("--shift", "0px");
        el.style.setProperty("--scale-active", "1");
        return;
      }
      const d = Math.abs(i - activeIdx);
      el.style.setProperty("--shift", (lift * Math.pow(falloff, d)).toFixed(3) + "px");
      el.style.setProperty("--scale-active", i === activeIdx ? String(scale) : "1");
    });
  };
  return (
    <div ref={rootRef} className={className} onMouseLeave={() => setShifts(null, "out")}>
      {items.map((node, i) => (
        <div key={i} className="t-avatar" onMouseEnter={() => setShifts(i, "in")}>{node}</div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SKELETON REVEAL (transitions.dev #14) - pulse → cross-fade
─────────────────────────────────────────────────────────────── */
function SkeletonReveal({ skeleton, children, delay = 1100, className = "" }: { skeleton: ReactNode; children: ReactNode; delay?: number; className?: string }) {
  const [revealed, setRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(t);
  }, [inView, delay]);
  return (
    <div ref={ref} className={`t-skel ${revealed ? "is-revealed" : ""} ${className}`}>
      <div className="t-skel-skeleton is-pulsing">{skeleton}</div>
      <div className="t-skel-content" style={{ position: "relative", inset: "auto" } as CSSProperties}>{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   TEXTS REVEAL (transitions.dev #18) - staggered blurred rise
─────────────────────────────────────────────────────────────── */
function TextsReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className={`t-stagger ${inView ? "is-shown" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PRICING CARD
─────────────────────────────────────────────────────────────── */
const accent = {
  emerald: { badge: "bg-emerald-500 text-black", check: "text-emerald-400", btnFill: "bg-emerald-500 text-black hover:bg-emerald-400", btnOutline: "border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10", ring: "border-emerald-500/60 ring-1 ring-emerald-500/30" },
  amber: { badge: "bg-amber-400 text-black", check: "text-amber-400", btnFill: "bg-amber-400 text-black hover:bg-amber-300", btnOutline: "border border-amber-400/40 text-amber-400 hover:bg-amber-400/10", ring: "border-amber-400/60 ring-1 ring-amber-400/30" },
  blue: { badge: "bg-sky-500 text-white", check: "text-sky-400", btnFill: "bg-sky-500 text-white hover:bg-sky-400", btnOutline: "border border-sky-500/40 text-sky-400 hover:bg-sky-500/10", ring: "border-sky-500/60 ring-1 ring-sky-500/30" },
};

function TierCard({ tier, accentKey, link }: { tier: typeof playerTiers[0] & { tag?: string }; accentKey: keyof typeof accent; link: string }) {
  const s = accent[accentKey];
  return (
    <TiltCard className="h-full">
      <div className={`relative flex flex-col border rounded-xl p-6 bg-[#101010] h-full ${tier.popular ? s.ring : "border-white/10"}`}>
        {tier.popular && (
          <div className={`absolute top-3 right-3 ${s.badge} text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 tracking-widest z-10`}>
            <Star className="w-3 h-3" /><span>POPULAR</span>
          </div>
        )}
        {tier.tag && (
          <div className="mb-2 inline-block self-start font-mono text-[9px] font-black px-2 py-0.5 rounded-full border border-white/15 text-zinc-400 tracking-widest">{tier.tag}</div>
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
          {tier.features.map((f, i) => (
            <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
              <SuccessCheck className={`mt-0.5 shrink-0 ${s.check}`} size={16} delay={120 + i * 90} />{f}
            </li>
          ))}
        </ul>
        <a href={link} target="_blank" rel="noopener noreferrer"
          className={`relative z-10 w-full text-center py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 ${tier.popular ? s.btnFill : s.btnOutline}`}>
          Get Started
        </a>
      </div>
    </TiltCard>
  );
}

/* ──────────────────────────────────────────────────────────────
   FAQ ITEM
─────────────────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`t-acc border-b border-white/5 transition-colors ${open ? "" : "hover:bg-white/[0.02]"}`} data-open={open}>
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="t-acc-head w-full flex items-center justify-between py-5 px-1 text-left">
        <span className="font-semibold text-white pr-4 text-sm sm:text-base">{q}</span>
        <span className={`t-acc-chevron shrink-0 ${open ? "text-emerald-400" : "text-zinc-500"}`}>
          <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6.5L8 10.5L12 6.5" />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel">
        <div className="t-acc-panel-inner">
          <div className="pb-5 px-1 text-sm text-zinc-400 leading-relaxed border-l-2 border-emerald-500/40 pl-4 ml-1">
            {a}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PAGE
─────────────────────────────────────────────────────────────── */
export default function Home() {
  const [pricingTab, setPricingTab] = useState<"player" | "team" | "arb">("player");

  const statsSection = useRef(null);
  const statsInView = useInView(statsSection, { once: true, margin: "-100px" });

  return (
    <div className="relative min-h-screen flex flex-col bg-[#101010] text-foreground overflow-x-hidden">

      {/* ── Background pitch grid ────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <Header />

        {/* ════════════════════════════════════════════════════
                    HERO - mostly text, no cards, editorial density
                ════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 pb-8 w-full">
          <div className="grid lg:grid-cols-[1fr_480px] gap-12 items-start">

            {/* Left: all text */}
            <div>
              {/* Eyebrow */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
                className="flex items-center gap-2 mb-8">
                <span className="w-8 h-px bg-emerald-500" />
                <span className="text-emerald-400 font-mono text-xs tracking-[0.2em] uppercase">
                  Live ·{" "}
                  <span
                    className="t-shimmer"
                    data-text="Analyzing Odds"
                    style={{ "--shimmer-base": "rgba(52,211,153,0.65)", "--shimmer-highlight": "#ffffff" } as CSSProperties}
                  >
                    Analyzing Odds
                  </span>{" "}· 1,000+ Users
                </span>
              </motion.div>

              {/* Giant headline - condensed, editorial */}
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[clamp(2.5rem,7vw,6rem)] font-black leading-[0.92] tracking-tighter text-white mb-8 uppercase">
                Stop Juggling<br />
                <span className="text-emerald-400">4 Tabs</span><br />
                to Place<br />
                One Bet
              </motion.h1>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="text-zinc-400 text-lg leading-relaxed max-w-xl mb-10 font-light">
                Player props, team stats, and arbitrage alerts - all via Telegram.
                Mathematical precision powered by Cebro. No AI hallucinations.
                Then log every bet and watch your P&amp;L with{" "}
                <Link href="/track" className="text-emerald-400 font-medium hover:text-emerald-300 underline decoration-emerald-500/30 underline-offset-4 transition-colors">Proppr Track</Link>
                {" "}<span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/70 align-middle">Beta</span>.
              </motion.p>

              {/* CTAs */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
                className="flex flex-wrap gap-3 mb-6">
                <a href="https://t.me/propprplayerbot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm px-6 py-3 rounded-lg transition-all hover:scale-105 active:scale-95 tracking-wide uppercase">
                  <Send className="w-4 h-4" />Player Bot
                </a>
                <a href="https://t.me/propprteambot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 text-white font-black text-sm px-6 py-3 rounded-lg border border-white/15 transition-all hover:scale-105 active:scale-95 tracking-wide uppercase">
                  <Send className="w-4 h-4" />Team Bot
                </a>
                <a href="https://t.me/propprarbbot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-sm px-6 py-3 rounded-lg transition-all hover:scale-105 active:scale-95 tracking-wide uppercase">
                  <Send className="w-4 h-4" />Arb Bot
                </a>
                <Link href="/track"
                  className="relative inline-flex items-center gap-2 bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white font-black text-sm px-6 py-3 rounded-lg border border-dashed border-white/20 hover:border-emerald-500/40 transition-all hover:scale-105 active:scale-95 tracking-wide uppercase">
                  <LineChart className="w-4 h-4" />Track
                  <span className="bg-emerald-500 text-black text-[8px] font-black px-1 py-px rounded-full leading-none tracking-tight">BETA</span>
                </Link>
              </motion.div>

              {/* Trust badge */}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.5 }}
                className="text-zinc-600 text-xs mb-12 font-mono uppercase tracking-wide">
                Free tier available on all bots. No card required.
              </motion.p>

              {/* Stat ticker - big numbers like sports broadcast */}
              <motion.div ref={statsSection} initial={{ opacity: 0 }} animate={{ opacity: statsInView ? 1 : 0 }} transition={{ duration: 0.6 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-white/10 rounded-xl overflow-hidden">
                {[
                  { val: 1000, suffix: "+", label: "Active Users", tip: "Bettors using Proppr bots right now" },
                  { val: 100, suffix: "+", label: "Leagues", tip: "Premier League to the Saudi Pro League" },
                  { val: 150, suffix: "+", label: "Bookmakers", tip: "Live odds pulled from 150+ books" },
                  { val: 24, suffix: "/7", label: "Live Analysis", tip: "The Cebro model never sleeps" },
                ].map(({ val, suffix, label, tip }, i) => (
                  <div key={label} className={`py-4 sm:py-5 px-3 sm:px-4 text-center ${i % 2 === 0 ? "border-r border-white/10 sm:border-r" : ""} ${i < 2 ? "border-b border-white/10 sm:border-b-0" : ""} ${i === 2 ? "sm:border-r" : ""}`}>
                    <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                      {statsInView ? <PopInNumber to={val} suffix={suffix} /> : "0"}
                    </div>
                    <span className="t-tt-wrap mt-1 cursor-help">
                      <span className="t-tt-trigger text-[11px] text-zinc-500 uppercase tracking-wider font-mono border-b border-dashed border-white/15">{label}</span>
                      <span className="t-tt text-xs font-medium normal-case tracking-normal" role="tooltip">{tip}</span>
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Verbatim bot output - the "honest element" */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
              className="hidden lg:block sticky top-24">
              <div className="bg-[#101010] border border-white/10 rounded-2xl overflow-hidden">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/60" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-zinc-600 font-mono text-xs ml-2">Proppr Player Bot · Live Output</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />online
                  </span>
                </div>

                {/* Verbatim alert - raw, no beautification (skeleton → reveal, transitions.dev #14) */}
                <SkeletonReveal
                  delay={1300}
                  skeleton={
                    <div className="p-5 space-y-3">
                      {[40, 65, 30, 55, 70, 50, 60, 45, 58, 35, 52, 48].map((w, i) => (
                        <div key={i} className="h-2.5 rounded bg-white/10" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  }
                >
                  <div className="p-5 font-mono text-[12px] leading-[1.8] text-zinc-300 space-y-0.5">
                    <div className="text-amber-400 font-bold">⚡️ PLAYER PROP VALUE ALERT ⚡️</div>
                    <div>🏟 <span className="text-white">Milan vs Monza</span></div>
                    <div>🏆 Serie A</div>
                    <div>⏰ Sat, 24 May 18:45</div>
                    <div className="pt-1">👤 <span className="text-white font-bold">Samuele Birindelli (Monza)</span></div>
                    <div>🧩 Position: RM (Alt: LM)</div>
                    <div>⚽️ <span className="text-emerald-300">To score anytime</span></div>
                    <div className="pt-1">📚 Bookmaker Odds: <span className="text-white">8.5</span></div>
                    <div>🖥 Model Odds: <span className="text-sky-300">2.86</span></div>
                    <div className="text-emerald-400 font-bold">📈 Value: 197.2%</div>
                    <div>💰 Stake: <span className="text-white">0.5u</span></div>
                    <div className="pt-1">📆 Appearances: 10</div>
                    <div>🕣 Avg Mins: 77</div>
                    <div>📊 Per Game: 1, 0, 0, 0, 0, 0, 0, 0, 0, 1</div>
                  </div>
                </SkeletonReveal>

                {/* Second alert - Arb */}
                <div className="border-t border-white/5 p-5 font-mono text-[12px] leading-[1.8] text-zinc-300 space-y-0.5">
                  <div className="text-amber-400 font-bold">💰 ARBITRAGE OPPORTUNITY 💰</div>
                  <div>🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship</div>
                  <div>⚽️ <span className="text-white">Blackburn Rovers vs Charlton</span></div>
                  <div className="pt-1">🎯 <span className="text-emerald-300">Market: Totals (UNDER 2.25)</span></div>
                  <div>🏦 Bet365: <span className="text-white">2.10</span></div>
                  <div>🏦 Pinnacle: <span className="text-white">2.05</span></div>
                  <div className="text-emerald-400 font-bold pt-1">💵 Arb Target: 3.6%</div>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ════════════════════════════════════════════════════
                    PROBLEM - match stats table format
                ════════════════════════════════════════════════════ */}
        <section className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-20">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-14">
              <div className="inline-block font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-4">The Problem</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Old Way vs Proppr Way</h2>
            </motion.div>

            {/* Match stat table - inspired by football broadcast stats */}
            <div className="border border-white/10 rounded-2xl overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_1fr] bg-white/5 border-b border-white/10">
                <div className="p-4 font-mono text-xs text-red-400 uppercase tracking-widest font-bold text-center">Old Way</div>
                <div className="p-4 border-x border-white/10 font-mono text-xs text-zinc-500 uppercase tracking-widest text-center w-36">Category</div>
                <div className="p-4 font-mono text-xs text-emerald-400 uppercase tracking-widest font-bold text-center">Proppr</div>
              </div>
              {[
                ["4+ tabs open: Oddschecker, SofaScore, FlashScore, FotMob", "Workflow", "1 Telegram command"],
                ["5-15 minutes per bet setup", "Research Time", "< 5 seconds to full breakdown"],
                ["Manual EV calculation (if you even bother)", "Value Detection", "Auto-calculated with stake recommendation"],
                ["Odds moved while you researched", "Speed", "Alert → Place in under 60 seconds"],
                ["Spreadsheet tracking (or nothing)", "Record Keeping", "/track - automated P&L"],
                ["Generic 'tips' from unknown tipsters", "Analysis Source", "Cebro model: position-aware mathematics"],
              ].map(([old, cat, proppr], i) => (
                <motion.div key={cat} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-[1fr_auto_1fr] border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <div className="p-4 text-sm text-zinc-500 text-center flex items-center justify-center">{old}</div>
                  <div className="p-4 border-x border-white/10 font-mono text-xs text-zinc-600 uppercase tracking-widest text-center w-36 flex items-center justify-center">{cat}</div>
                  <div className="p-4 text-sm text-emerald-300 font-medium text-center flex items-center justify-center">{proppr}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
                    FEATURES - stat table rows, not cards
                ════════════════════════════════════════════════════ */}
        <section id="features" className="max-w-7xl mx-auto px-4 md:px-6 py-24 w-full">
          <TextsReveal className="mb-14">
            <div className="t-stagger-line t-stagger-line--1 font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-3">Why Proppr</div>
            <h2 className="t-stagger-line t-stagger-line--2 text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Platform Features</h2>
          </TextsReveal>

          <div className="space-y-0 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
            {featureRows.map((f, i) => (
              <motion.div key={f.rank}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="grid grid-cols-1 sm:grid-cols-[80px_1fr_auto] gap-4 sm:gap-8 p-6 hover:bg-white/[0.02] transition-colors group">
                <div className="font-black text-4xl sm:text-5xl text-white/10 group-hover:text-emerald-500/20 transition-colors tabular-nums leading-none">
                  {f.rank}
                </div>
                <div>
                  <div className="font-mono text-xs text-emerald-400 uppercase tracking-[0.15em] mb-1">{f.label}</div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
                  {/* Progress bar - the data visualization touch */}
                  <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden w-48">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${f.bar}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 + i * 0.07 }}
                      className="h-full bg-emerald-500 rounded-full" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-white text-sm sm:text-base whitespace-nowrap">{f.stat}</div>
                  <div className="font-mono text-xs text-zinc-600 mt-1"><PopInNumber to={f.bar} suffix="%" /></div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
                    HOW IT WORKS - 3 column, numbered, tight
                ════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-16">
              <div className="font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-3">Process</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">How It Works</h2>
              <p className="text-zinc-500 mt-3 text-sm">Three steps. No app downloads. No complex setup.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-0 border border-white/10 rounded-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-white/10">
              {[
                { n: "01", icon: "📱", title: "Open Telegram", desc: "Click any bot link. Send /start. No app downloads, no email verification, no payment upfront. Under 10 seconds." },
                { n: "02", icon: "⚙️", title: "Set Your Filters", desc: "Run /settings to customize: odds range, minimum EV%, leagues, markets, and bookmakers. The bot learns your preferences." },
                { n: "03", icon: "🎯", title: "Receive Value Alerts", desc: "Value plays land in your DMs with full breakdown: bookmaker odds, model odds, EV%, recommended stake. Research done." },
              ].map((s, i) => (
                <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                  className="p-8 hover:bg-white/[0.02] transition-colors group">
                  <div className="font-black text-6xl text-white/5 group-hover:text-emerald-500/10 transition-colors tabular-nums mb-6 leading-none">{s.n}</div>
                  <div className="text-2xl mb-3">{s.icon}</div>
                  <h3 className="text-white font-black text-lg uppercase tracking-tight mb-3">{s.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/quickstart" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-mono text-sm uppercase tracking-widest transition-colors">
                <span>Read the Quick Start Guide</span><ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
                    PRICING
                ════════════════════════════════════════════════════ */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 md:px-6 py-24 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <div className="font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-3">Pricing</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Choose Your Edge</h2>
            <p className="text-zinc-500 mt-3 text-sm max-w-lg mx-auto">Every bot has a free tier. No credit card. Start now, upgrade when the value is obvious.</p>
          </motion.div>

          {/* Tab switcher - sliding pill (transitions.dev #16) */}
          <div className="flex items-center justify-center mb-10">
            <SlidingTabs
              value={pricingTab}
              onChange={(k) => setPricingTab(k as "player" | "team" | "arb")}
              tabs={[
                { k: "player", label: "Player Bot", icon: Trophy },
                { k: "team", label: "Team Bot", icon: Bot },
                { k: "arb", label: "Arb Bot", icon: TrendingUp },
              ]}
            />
          </div>

          {pricingTab === "player" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {playerTiers.map((t) => <TierCard key={t.name} tier={t} accentKey="emerald" link={playerLinks[t.name as keyof typeof playerLinks]} />)}
            </div>
          )}
          {pricingTab === "team" && (
            <div className="grid md:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {teamTiers.map((t) => <TierCard key={t.name} tier={t} accentKey="emerald" link={teamLinks[t.name as keyof typeof teamLinks]} />)}
            </div>
          )}
          {pricingTab === "arb" && (
            <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
              {arbTiers.map((t) => <TierCard key={t.name} tier={t} accentKey="blue" link={arbLinks[t.name as keyof typeof arbLinks]} />)}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 font-mono text-xs text-zinc-600 uppercase tracking-widest">
            {["No contracts · cancel anytime", "100% AI-Free analysis", "Mathematical precision only"].map((t, i) => (
              <div key={t} className="flex items-center gap-2">
                <SuccessCheck className="text-emerald-400" size={14} delay={i * 160} />{t}
              </div>
            ))}
          </div>

          {/* Bundles · World Cup · Lifetime */}
          <div className="mt-20">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-10">
              <div className="font-mono text-amber-400 text-xs tracking-[0.2em] uppercase mb-3">Bundles & Deals</div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Subscribe to Multiple Bots</h3>
              <p className="text-zinc-500 mt-3 text-sm max-w-lg mx-auto">Combine Player + Team Bot, grab the World Cup special, or own every bot for life.</p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-5">
              {bundleTiers.map((t) => (
                <TierCard key={t.name} tier={t} accentKey="amber" link={t.link} />
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
                    FAQ
                ════════════════════════════════════════════════════ */}
        <section id="faq" className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-12">
              <div className="font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-3">Questions</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">FAQ</h2>
            </motion.div>
            <div>
              {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
                    FINAL CTA - full-bleed dark green
                ════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 w-full">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative border border-emerald-500/20 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.12),transparent_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="relative z-10 p-12 sm:p-20 text-center">
              <div className="font-mono text-emerald-400 text-xs tracking-[0.2em] uppercase mb-6">Your Edge Awaits</div>
              <TextsReveal>
                <strong className="t-stagger-line t-stagger-line--1 text-4xl sm:text-5xl font-black text-white tracking-tight uppercase mb-4">
                  Close The Tabs.<br />Open Telegram.
                </strong>
                <span className="t-stagger-line t-stagger-line--2 text-zinc-400 max-w-md mx-auto mb-10 text-sm leading-relaxed">
                  1,000+ bettors already replaced their 4-tab workflow with one command. Free tier on every bot. Start finding edge in 30 seconds.
                </span>
              </TextsReveal>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="https://t.me/propprplayerbot?start=1" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-3.5 rounded-xl transition-all hover:scale-105 active:scale-95 uppercase tracking-wide">
                  <Send className="w-4 h-4" />Open Player Bot
                </a>
                <Link href="/quickstart"
                  className="inline-flex items-center gap-2 text-zinc-400 hover:text-white border border-white/10 hover:border-white/25 font-bold px-8 py-3.5 rounded-xl transition-all uppercase tracking-wide text-sm">
                  <BookOpen className="w-4 h-4" />Read the Docs
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════
                    DOCS QUICK LINKS - editorial, data-style
                ════════════════════════════════════════════════════ */}
        <section className="border-t border-white/5 bg-[#101010]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
            <div className="font-mono text-zinc-600 text-xs tracking-[0.2em] uppercase mb-8">Documentation</div>
            <AvatarGroup
              className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3"
              items={[
                { href: "/quickstart", title: "Quick Start", desc: "Setup and first bets", Icon: BookOpen, accent: "text-emerald-400" },
                { href: "/guides", title: "Guides", desc: "Value betting, arbs, strategy", Icon: BookOpen, accent: "text-purple-400" },
                { href: "/player-bot", title: "Player Bot", desc: "Player props and commands", Icon: Trophy, accent: "text-sky-400" },
                { href: "/team-bot", title: "Team Bot", desc: "Team markets and streaks", Icon: Bot, accent: "text-amber-400" },
                { href: "/arb-bot", title: "Arb Bot", desc: "Arbitrage and stake calc", Icon: TrendingUp, accent: "text-red-400" },
              ].map(({ href, title, desc, Icon, accent: ac }) => (
                <Link key={href} href={href}
                  className="group flex items-start gap-4 bg-white/[0.03] border border-white/8 rounded-xl p-5 hover:bg-white/5 hover:border-white/15 transition-all h-full">
                  <Icon className={`w-5 h-5 ${ac} shrink-0 mt-0.5`} />
                  <div className="min-w-0">
                    <div className="text-white font-bold text-sm mb-1 group-hover:text-emerald-300 transition-colors">{title}</div>
                    <div className="text-zinc-600 text-xs leading-relaxed">{desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 shrink-0 mt-0.5 transition-colors ml-auto" />
                </Link>
              ))}
            />
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
