import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Arbitrage Betting Guide",
    description: "How arbitrage betting works, the risks, and how Proppr's Arb Bot surfaces opportunities.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
