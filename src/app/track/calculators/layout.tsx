import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Betting Calculators | Proppr Track" },
    description: "Free calculators: arbitrage stakes, expected value, Kelly and more.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
