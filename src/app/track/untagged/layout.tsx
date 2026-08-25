import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Untagged Bets | Proppr Track" },
    description: "Bets awaiting tags or fixture matches.",
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
