import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Team Bot - Team Markets & Streaks",
    description: "Team stats, streaks and value alerts for match markets, corners and cards in Telegram.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
