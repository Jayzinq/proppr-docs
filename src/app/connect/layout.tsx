import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Connect Telegram",
    description: "Link your Telegram account to Proppr to unlock alerts and bet tracking.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
