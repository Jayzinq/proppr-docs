import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Arb Bot Commands",
    description: "Every Arb Bot command with examples, plus how to execute an arb from an alert.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
