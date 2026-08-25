import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Premier League Player Props",
    description: "How to bet Premier League player props with data instead of gut feel.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
