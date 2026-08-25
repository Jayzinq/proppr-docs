import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Player Bot Commands",
    description: "Every Player Bot command with examples: /player, /fixture, /value and more.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
