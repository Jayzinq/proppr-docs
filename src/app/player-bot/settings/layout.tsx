import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Player Bot Settings & Alerts",
    description: "Personalise Player Bot alerts: leagues, markets, odds ranges and delivery.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
