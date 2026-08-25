"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Code2, BookOpen, Bot, TrendingUp, Trophy, Settings, Search, X, Calculator, Target, BarChart3 } from "lucide-react";

const navigationGroups = [
    {
        title: "Overview",
        items: [
            { name: "Quick Start", href: "/quickstart", icon: BookOpen },
        ]
    },
    {
        title: "Guides",
        items: [
            { name: "All Guides", href: "/guides", icon: BookOpen },
            { name: "Value Betting 101", href: "/guides/value-betting-101", icon: Calculator },
            { name: "Player Prop Tips", href: "/guides/player-prop-tips", icon: Target },
            { name: "Arbitrage Explained", href: "/guides/arbitrage-betting", icon: TrendingUp },
            { name: "Premier League Props", href: "/guides/premier-league-player-props", icon: Trophy },
            { name: "Team Totals", href: "/guides/team-totals", icon: BarChart3 },
        ]
    },
    {
        title: "Player Bot User Guide",
        items: [
            { name: "Overview", href: "/player-bot", icon: Trophy },
            { name: "Commands & Features", href: "/player-bot/commands", icon: Code2 },
            { name: "Settings & Alerts", href: "/player-bot/settings", icon: Settings },
        ]
    },
    {
        title: "Team Bot User Guide",
        items: [
            { name: "Overview", href: "/team-bot", icon: Bot },
            { name: "Commands & Stats", href: "/team-bot/commands", icon: Code2 },
            { name: "Insights & Streaks", href: "/team-bot/insights", icon: Search },
        ]
    },
    {
        title: "Arb Bot User Guide",
        items: [
            { name: "Overview", href: "/arb-bot", icon: TrendingUp },
            { name: "Executing Arbs", href: "/arb-bot/commands", icon: Code2 },
            { name: "Personalization", href: "/arb-bot/settings", icon: Settings },
        ]
    }
];

interface SidebarProps {
    mobileOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();

    const NavContent = () => (
        <nav className="flex-1 px-4 space-y-6">
            {navigationGroups.map((group) => (
                <div key={group.title}>
                    <div className="text-xs font-heading font-semibold text-white/50 uppercase tracking-wider mb-2 px-2">
                        {group.title}
                    </div>
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={onClose}
                                    className={cn(
                                        "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            "mr-3 flex-shrink-0 h-4 w-4 transition-colors",
                                            isActive ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300"
                                        )}
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            {/* Starts below the sticky DocsHeader (h-16 at lg) - the header owns the logo. */}
            <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:top-16 lg:bottom-0 border-r border-white/10 glass bg-background/50 z-40">
                <div className="flex-1 flex flex-col min-h-0 pt-6 pb-4 overflow-y-auto overflow-x-hidden">
                    <NavContent />
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <div
                className={cn(
                    "lg:hidden fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-[#101010] border-r border-white/10 transform transition-transform duration-300 ease-in-out",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
                    <Link href="/" onClick={onClose} className="flex items-center">
                        <Image src="/proppr-logo-white.png" alt="Proppr Logo" width={100} height={24} className="h-5 w-auto object-contain" />
                    </Link>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 flex flex-col min-h-0 pt-6 pb-4 overflow-y-auto">
                    <NavContent />
                </div>
            </div>
        </>
    );
}
