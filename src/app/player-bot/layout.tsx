import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Player Bot - Player Props in Telegram",
    description: "Shots, tackles, cards and more: player-prop stats and value alerts in one Telegram command.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
