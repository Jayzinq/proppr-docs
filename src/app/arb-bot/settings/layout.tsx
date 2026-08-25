import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Arb Bot Settings",
    description: "Personalise Arb Bot: bookmakers, profit thresholds and alert delivery.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
