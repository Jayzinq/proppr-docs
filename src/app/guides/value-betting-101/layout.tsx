import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Value Betting 101",
    description: "What value betting is, why it works, and how to find positive-EV bets with Proppr.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
