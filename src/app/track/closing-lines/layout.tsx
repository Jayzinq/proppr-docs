import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Closing Lines | Proppr Track" },
    description: "Closing-line value for every tracked bet.",
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
