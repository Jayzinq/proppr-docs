import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Pending Review | Proppr Track" },
    description: "Review and approve imported bets.",
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
