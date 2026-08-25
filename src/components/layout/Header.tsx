"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Send, X, ChevronDown, Calculator, Target, TrendingUp, BookOpen, BarChart3, LineChart } from "lucide-react";

const navLinks = [
    { href: "/season-handicaps", label: "Season Handicaps" },
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/quickstart", label: "Docs" },
];

const guideLinks = [
    { href: "/guides/value-betting-101", label: "Value Betting 101", icon: Calculator },
    { href: "/guides/player-prop-tips", label: "Player Prop Tips", icon: Target },
    { href: "/guides/arbitrage-betting", label: "Arbitrage Explained", icon: TrendingUp },
    { href: "/guides/premier-league-player-props", label: "Premier League Props", icon: BookOpen },
    { href: "/guides/team-totals", label: "Team Totals", icon: BarChart3 },
];

const botLinks = [
    { href: "/playerbot", label: "Player Bot", icon: "/player-bot-logo.png" },
    { href: "/teambot", label: "Team Bot", icon: "/team-bot-logo.png" },
    { href: "/arbbot", label: "Arb Bot", icon: "/arb-bot-logo.png" },
];

export function Header() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [guidesOpen, setGuidesOpen] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isGuidesActive = pathname.startsWith("/guides");

    const handleMouseEnter = useCallback(() => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setGuidesOpen(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        closeTimeoutRef.current = setTimeout(() => {
            setGuidesOpen(false);
        }, 150);
    }, []);

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-white/10 glass bg-background/50 backdrop-blur-xl">
                <div className="flex h-16 items-center px-4 md:px-6 max-w-7xl mx-auto w-full">
                    <div className="mr-6 flex">
                        <Link href="/" className="flex items-center space-x-3 shrink-0">
                            <Image src="/proppr-logo-white.png" alt="Proppr Logo" width={100} height={24} priority className="h-6 w-auto object-contain" />
                        </Link>
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden xl:flex items-center space-x-1 flex-1">
                        {botLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-1.5 text-sm transition-colors rounded-md hover:bg-white/5 flex items-center gap-2 ${pathname === link.href ? "text-emerald-400 bg-emerald-500/5" : "text-zinc-400 hover:text-white"}`}
                            >
                                {link.icon && (
                                    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/10">
                                        <Image src={link.icon} alt={link.label} width={20} height={20} priority className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <span className="whitespace-nowrap">{link.label}</span>
                            </Link>
                        ))}

                        {/* Guides dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <Link
                                href="/guides"
                                className={`px-3 py-1.5 text-sm transition-colors rounded-md hover:bg-white/5 flex items-center gap-1 ${isGuidesActive ? "text-emerald-400 bg-emerald-500/5" : "text-zinc-400 hover:text-white"}`}
                            >
                                <span>Guides</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${guidesOpen ? "rotate-180" : ""}`} />
                            </Link>

                            {(
                                <div className={`t-dropdown absolute top-full left-0 pt-2 w-64 z-50 ${guidesOpen ? "is-open" : ""}`} data-origin="top-left">
                                    <div className="bg-[#101010] border border-white/10 rounded-xl shadow-2xl py-2">
                                    <Link
                                        href="/guides"
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <BookOpen className="w-4 h-4 text-emerald-400" />
                                        <span className="font-medium">All Guides</span>
                                    </Link>
                                    <div className="border-t border-white/5 my-1" />
                                    {guideLinks.map((guide) => (
                                        <Link
                                            key={guide.href}
                                            href={guide.href}
                                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${pathname === guide.href ? "text-emerald-400" : "text-zinc-400 hover:text-white"}`}
                                        >
                                            <guide.icon className="w-4 h-4" />
                                            <span>{guide.label}</span>
                                        </Link>
                                    ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-1.5 text-sm transition-colors rounded-md hover:bg-white/5 flex items-center gap-2 ${pathname === link.href || pathname.startsWith(link.href + "/") ? "text-emerald-400 bg-emerald-500/5" : "text-zinc-400 hover:text-white"}`}
                            >
                                <span className="whitespace-nowrap">{link.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="xl:hidden mr-4 p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>

                    <div className="flex items-center space-x-2 sm:space-x-3 ml-auto">
                        {/* Track CTA - proppr.io/track (in dev) */}
                        <Link
                            href="/track"
                            className="relative inline-flex items-center space-x-1.5 bg-white/8 hover:bg-white/12 text-white font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-white/15 transition-all hover:scale-105 active:scale-95 uppercase tracking-wide"
                        >
                            <LineChart className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Track</span>
                            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-black text-[8px] font-black px-1 py-px rounded-full leading-none tracking-tight">BETA</span>
                        </Link>
                        {/* Join Bot CTA */}
                        <a
                            href="https://t.me/propprplayerbot?start=1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative inline-flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 uppercase tracking-wide"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Join Bot</span>
                            <span className="t-badge" data-open="true" aria-hidden>
                                <span className="t-badge-dot block w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#101010]" />
                            </span>
                        </a>
                    </div>
                </div>
            </header>

            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div
                    className="xl:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile menu drawer */}
            <div
                className={`xl:hidden fixed top-16 left-0 right-0 z-50 bg-[#101010] border-b border-white/10 transform transition-all duration-300 ease-in-out ${
                    mobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
                }`}
            >
                <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1">
                    {/* Bot links */}
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2">Bots</div>
                    {botLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${pathname === link.href ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-300 hover:text-white hover:bg-white/5"}`}
                        >
                            {link.icon && (
                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                                    <Image src={link.icon} alt={link.label} width={32} height={32} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <span className="font-medium">{link.label}</span>
                        </Link>
                    ))}

                    {/* Divider */}
                    <div className="border-t border-white/10 my-3" />

                    {/* Guides */}
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2">Guides</div>
                    <Link
                        href="/guides"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${pathname === "/guides" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-300 hover:text-white hover:bg-white/5"}`}
                    >
                        <BookOpen className="w-5 h-5 text-emerald-400" />
                        <span className="font-medium">All Guides</span>
                    </Link>
                    {guideLinks.map((guide) => (
                        <Link
                            key={guide.href}
                            href={guide.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 pl-6 rounded-lg transition-colors ${pathname === guide.href ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                        >
                            <guide.icon className="w-4 h-4" />
                            <span className="text-sm">{guide.label}</span>
                        </Link>
                    ))}

                    {/* Divider */}
                    <div className="border-t border-white/10 my-3" />

                    {/* Nav links */}
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2">Navigation</div>
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${pathname === link.href || pathname.startsWith(link.href + "/") ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-300 hover:text-white hover:bg-white/5"}`}
                        >
                            <span className="font-medium">{link.label}</span>
                        </Link>
                    ))}

                    {/* CTA in mobile menu */}
                    <div className="pt-4 space-y-2">
                        <Link
                            href="/track"
                            onClick={() => setMobileMenuOpen(false)}
                            className="relative flex items-center justify-center gap-2 w-full bg-white/8 hover:bg-white/12 text-white font-black text-sm px-4 py-3 rounded-lg border border-white/15 transition-all uppercase tracking-wide"
                        >
                            <LineChart className="w-4 h-4" />
                            <span>Track Your Bets</span>
                            <span className="bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none tracking-tight">BETA</span>
                        </Link>
                        <a
                            href="https://t.me/propprplayerbot?start=1"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm px-4 py-3 rounded-lg transition-all uppercase tracking-wide"
                        >
                            <Send className="w-4 h-4" />
                            <span>Join Bot on Telegram</span>
                        </a>
                    </div>
                </nav>
            </div>
        </>
    );
}
