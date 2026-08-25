import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Team Bot Insights & Streaks",
    description: "How Team Bot's insights and streak detection work, and how to read them.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
