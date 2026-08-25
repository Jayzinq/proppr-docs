import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Quick Start",
    description: "Set up Proppr in Telegram and get your first player-prop, team and arbitrage alerts in minutes.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
