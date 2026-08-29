"use client";

import { motion } from "framer-motion";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Calculator, Target, TrendingUp, BookOpen, BarChart3, ArrowRight, Zap, Brain, DollarSign } from "lucide-react";
import Link from "next/link";
import { TiltCard, TextsReveal } from "@/components/transitions/Motion";

const guides = [
    {
        href: "/guides/value-betting-101",
        title: "Value Betting 101",
        subtitle: "How to Calculate Expected Value on Football Markets",
        desc: "Learn the mathematical foundation of profitable betting. Understand EV, implied probability, and why long-term edge beats short-term luck.",
        icon: Calculator,
        color: "emerald",
        readTime: "8 min read",
        topics: ["Expected Value", "Implied Probability", "Stake Sizing", "Long-term Edge"],
    },
    {
        href: "/guides/player-prop-tips",
        title: "Player Prop Tips",
        subtitle: "Why Most Tips Fail - And What to Look For Instead",
        desc: "The difference between following tipsters and finding value yourself. Position-aware analysis, form context, and the metrics that matter.",
        icon: Target,
        color: "blue",
        readTime: "6 min read",
        topics: ["Tipster Problems", "Position Analysis", "Form Context", "Statistical Edge"],
    },
    {
        href: "/guides/arbitrage-betting",
        title: "Arbitrage Explained",
        subtitle: "A Beginner's Guide to Arbitrage Betting",
        desc: "How to lock in the same return whichever way it goes, at the prices you capture. Stake calculation, finding arbs, and managing bookmaker accounts.",
        icon: TrendingUp,
        color: "orange",
        readTime: "10 min read",
        topics: ["What is Arbitrage", "Stake Modes", "Execution Speed", "Account Management"],
    },
    {
        href: "/guides/premier-league-player-props",
        title: "Premier League Props",
        subtitle: "The Complete Guide to Player Prop Markets",
        desc: "Anytime goalscorer, shots on target, cards, tackles. Understanding the markets, finding edges, and using statistics effectively.",
        icon: BookOpen,
        color: "purple",
        readTime: "7 min read",
        topics: ["Market Types", "Anytime Goalscorer", "Shots on Target", "Cards & Tackles"],
    },
    {
        href: "/guides/team-totals",
        title: "Team Totals",
        subtitle: "Corners, Cards, and The Underrated Markets",
        desc: "Why the sharps love team totals. Lower margin markets, streak patterns, and how game state changes everything.",
        icon: BarChart3,
        color: "amber",
        readTime: "6 min read",
        topics: ["Corners Strategy", "Team Cards", "Lower Margins", "Streak Patterns"],
    },
];

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", glow: "shadow-blue-500/20" },
    orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", glow: "shadow-orange-500/20" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", glow: "shadow-purple-500/20" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", glow: "shadow-amber-500/20" },
};

const concepts = [
    { icon: DollarSign, label: "Expected Value", desc: "The mathematical edge that separates winners from losers" },
    { icon: Brain, label: "Position-Aware Models", desc: "Why a striker's shots differ from a midfielder's" },
    { icon: Zap, label: "Execution Speed", desc: "Arbs disappear in seconds - preparation is everything" },
];

export default function GuidesPage() {
    return (
        <DocsLayout>
            <div className="relative">

            <main className="flex-1 relative z-10">
                {/* Hero */}
                <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-3xl"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8 backdrop-blur-sm">
                            <BookOpen className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-400 font-mono text-[10px] uppercase tracking-widest font-bold">Learning Center</span>
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-black text-white leading-[0.9] tracking-tighter uppercase mb-6 italic">
                            BETTING<br />
                            <span className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">EDUCATION.</span>
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-xl mb-10 font-light border-l-2 border-emerald-500/30 pl-6">
                            From expected value basics to advanced arbitrage execution.
                            Learn the mathematics behind profitable betting - no fluff, no &quot;guaranteed winners.&quot;
                        </p>
                    </motion.div>
                </section>

                {/* Core Concepts */}
                <section className="border-y border-white/10 bg-white/[0.02]">
                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
                        <div className="grid md:grid-cols-3 gap-8">
                            {concepts.map((c, i) => (
                                <motion.div
                                    key={c.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-4"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                        <c.icon className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold uppercase text-sm tracking-tight mb-1">{c.label}</div>
                                        <div className="text-zinc-500 text-sm">{c.desc}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Guides Grid */}
                <section className="py-24 max-w-7xl mx-auto px-4 md:px-6">
                    <div className="mb-12">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4 italic">All Guides</h2>
                        <p className="text-zinc-500">Deep dives into value betting, arbitrage, and market analysis.</p>
                    </div>

                    <div className="space-y-6">
                        {guides.map((guide, i) => {
                            const colors = colorMap[guide.color];
                            return (
                                <motion.div
                                    key={guide.href}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <TiltCard>
                                    <Link
                                        href={guide.href}
                                        className={`group block relative p-8 bg-zinc-900/30 border ${colors.border} rounded-2xl overflow-hidden hover:border-opacity-60 transition-all hover:shadow-xl ${colors.glow}`}
                                    >
                                        <div className="absolute -right-8 -top-8 text-[140px] font-black text-white/[0.02] select-none uppercase tracking-tighter">
                                            {String(i + 1).padStart(2, '0')}
                                        </div>
                                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
                                            <div className={`w-16 h-16 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}>
                                                <guide.icon className={`w-8 h-8 ${colors.text}`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${colors.text} font-bold`}>{guide.readTime}</span>
                                                </div>
                                                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1 group-hover:text-emerald-400 transition-colors">
                                                    {guide.title}
                                                </h3>
                                                <p className="text-zinc-500 text-sm mb-4">{guide.subtitle}</p>
                                                <p className="text-zinc-400 text-sm leading-relaxed mb-4">{guide.desc}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {guide.topics.map((topic) => (
                                                        <span key={topic} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-400 uppercase tracking-wider">
                                                            {topic}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="lg:pl-8">
                                                <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                    <ArrowRight className={`w-5 h-5 ${colors.text}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                    </TiltCard>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* CTA */}
                <section className="py-24 bg-emerald-500/5 border-y border-emerald-500/10">
                    <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
                        <TextsReveal>
                            <h2 className="t-stagger-line t-stagger-line--1 text-4xl font-black text-white uppercase tracking-tight mb-4 italic">Ready to Apply?</h2>
                            <p className="t-stagger-line t-stagger-line--2 text-zinc-400 mb-10 max-w-lg mx-auto">
                                Start with the free tier on any Proppr bot. See the mathematics in action.
                            </p>
                        </TextsReveal>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a href="https://t.me/propprplayerbot?start=1" target="_blank" rel="noopener noreferrer"
                                className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-4 rounded-xl transition-all hover:scale-105 uppercase tracking-wider">
                                Player Bot
                            </a>
                            <a href="https://t.me/propprteambot?start=1" target="_blank" rel="noopener noreferrer"
                                className="bg-white/10 hover:bg-white/15 text-white font-black px-8 py-4 rounded-xl border border-white/10 transition-all uppercase tracking-wider">
                                Team Bot
                            </a>
                            <a href="https://t.me/propprarbbot?start=1" target="_blank" rel="noopener noreferrer"
                                className="bg-sky-600 hover:bg-sky-500 text-white font-black px-8 py-4 rounded-xl transition-all uppercase tracking-wider">
                                Arb Bot
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            </div>
        </DocsLayout>
    );
}
