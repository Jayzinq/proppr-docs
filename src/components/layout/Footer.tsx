"use client";

import Link from "next/link";
import Image from "next/image";
import { Send } from "lucide-react";

const botLinks = [
    { href: "https://t.me/propprplayerbot?start=1", label: "Player Bot" },
    { href: "https://t.me/propprteambot?start=1", label: "Team Bot" },
    { href: "https://t.me/propprarbbot?start=1", label: "Arb Bot" },
];

const docLinks = [
    { href: "/quickstart", label: "Quick Start" },
    { href: "/refer-and-earn", label: "Refer & Earn" },
    { href: "/player-bot", label: "Player Bot Guide" },
    { href: "/team-bot", label: "Team Bot Guide" },
    { href: "/arb-bot", label: "Arb Bot Guide" },
];

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm mt-24">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link href="/" className="inline-block mb-4">
                            <Image src="/proppr-logo-white.png" alt="Proppr" width={110} height={28} className="h-7 w-auto object-contain opacity-90" />
                        </Link>
                        <p className="text-sm text-zinc-500 leading-relaxed max-w-xs mb-6">
                            AI-Free Football Betting Intelligence. Mathematical edge across player props, team markets, and arbitrage - delivered via Telegram.
                        </p>
                        <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-medium">100% AI-Free Analysis</span>
                        </div>
                    </div>

                    {/* Bots */}
                    <div>
                        <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Join a Bot</h3>
                        <ul className="space-y-3">
                            {botLinks.map((l) => (
                                <li key={l.href}>
                                    <a href={l.href} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center space-x-2 text-sm text-zinc-400 hover:text-white transition-colors group">
                                        <Send className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                        <span>{l.label}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Docs */}
                    <div>
                        <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Documentation</h3>
                        <ul className="space-y-3">
                            {docLinks.map((l) => (
                                <li key={l.href}>
                                    <Link href={l.href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                    <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Proppr. All rights reserved.</p>
                    <p className="text-xs text-zinc-600">No AI hallucinations. Mathematical precision only.</p>
                </div>
            </div>
        </footer>
    );
}
