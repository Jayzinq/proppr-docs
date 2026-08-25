import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Betting Guides",
    description: "Value betting, arbitrage and player-prop strategy guides from the Proppr team.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
