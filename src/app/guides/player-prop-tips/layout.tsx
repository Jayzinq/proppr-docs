import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Player Prop Tips",
    description: "Practical tips for betting player props: sample sizes, role changes, and line shopping.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
