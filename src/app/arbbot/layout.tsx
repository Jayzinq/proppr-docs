import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Proppr Arb Bot - Arbitrage Alerts on Telegram" },
    description: "Real-time arbitrage alerts with stake calculations. Try it free.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
