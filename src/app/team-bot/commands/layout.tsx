import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Team Bot Commands",
    description: "Every Team Bot command with examples: fixtures, streaks and stat lookups.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
