"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, BookOpen, ArrowLeft } from "lucide-react";

const docsLinks = [
    { href: "/quickstart", label: "Quick Start" },
    { href: "/player-bot", label: "Player Bot" },
    { href: "/team-bot", label: "Team Bot" },
    { href: "/arb-bot", label: "Arb Bot" },
];

interface DocsHeaderProps {
    onMenuToggle?: () => void;
}

export function DocsHeader({ onMenuToggle }: DocsHeaderProps) {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#101010]/80 backdrop-blur-xl">
            <div className="flex h-14 md:h-16 items-center px-4 md:px-6 max-w-7xl mx-auto w-full">
                {/* Mobile menu button */}
                <button
                    onClick={onMenuToggle}
                    className="lg:hidden mr-3 p-2 -ml-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Logo - hidden on mobile since sidebar has it */}
                <div className="hidden lg:flex mr-6">
                    <Link href="/" className="flex items-center space-x-3 shrink-0">
                        <Image src="/proppr-logo-white.png" alt="Proppr Logo" width={100} height={24} className="h-6 w-auto object-contain" />
                    </Link>
                </div>

                {/* Mobile: Current section indicator */}
                <div className="lg:hidden flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-zinc-300">Docs</span>
                </div>

                {/* Desktop nav - Docs links */}
                <nav className="hidden xl:flex items-center space-x-1 flex-1">
                    {docsLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-3 py-1.5 text-sm transition-colors rounded-md hover:bg-white/5 ${pathname === link.href || pathname.startsWith(link.href) ? "text-emerald-400 bg-emerald-500/5" : "text-zinc-400 hover:text-white"}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Right side actions */}
                <div className="flex items-center space-x-2 md:space-x-3 ml-auto">
                    {/* Docs indicator - desktop only */}
                    <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-400">Docs</span>
                    </div>

                    {/* Back to main site */}
                    <a
                        href="https://proppr.io"
                        className="inline-flex items-center space-x-1.5 text-zinc-400 hover:text-white text-sm font-medium px-2 md:px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5 border border-white/10"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Back to Proppr</span>
                    </a>
                </div>
            </div>
        </header>
    );
}
