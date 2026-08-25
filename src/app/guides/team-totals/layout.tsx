import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Team Totals Guide",
    description: "Betting team totals: when they beat match totals and how to price them.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
