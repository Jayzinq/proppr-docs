import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Analytics | Proppr Track" },
    description: "Profit, ROI and closing-line value across your betting record.",
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
