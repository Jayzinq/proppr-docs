import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Public Bankroll | Proppr Track" },
    description: "A public, verifiable betting record tracked with Proppr.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
