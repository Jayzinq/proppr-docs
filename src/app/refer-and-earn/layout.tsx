import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Refer & Earn",
    description: "Invite friends to Proppr and earn free premium time for every signup.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
