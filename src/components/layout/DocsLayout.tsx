"use client";

import { useState } from "react";
import { DocsHeader } from "./DocsHeader";
import { Sidebar } from "./Sidebar";
import { AIToolbar } from "@/components/ui/AIToolbar";

export function DocsLayout({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="relative flex min-h-screen flex-col">
            {/* Background gradients */}
            <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />

            <DocsHeader onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

            <div className="flex-1 flex max-w-7xl mx-auto w-full">
                <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
                <main className="flex-1 lg:pl-72 w-full">
                    <div className="mx-auto w-full px-4 py-6 md:px-8 lg:px-12 xl:px-24">
                        {/* AI Toolbar - top-right of content area */}
                        <div className="flex justify-end mb-6">
                            <AIToolbar />
                        </div>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
