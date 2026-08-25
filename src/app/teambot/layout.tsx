import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Proppr Team Bot - Team Stats & Streaks on Telegram" },
    description: "Team markets, streaks and value alerts in one Telegram command. Try it free.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
