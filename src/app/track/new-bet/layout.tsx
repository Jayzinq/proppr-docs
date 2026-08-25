import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Add a Bet | Proppr Track" },
    description: "Log a new bet to your tracker.",
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
