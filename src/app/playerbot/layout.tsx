import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Proppr Player Bot - Player Props on Telegram" },
    description: "Player-prop stats and value alerts in one Telegram command. Try it free.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
