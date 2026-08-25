import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Arb Bot - Arbitrage Alerts",
    description: "Real-time arbitrage alerts with stake calculations, delivered in Telegram.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
