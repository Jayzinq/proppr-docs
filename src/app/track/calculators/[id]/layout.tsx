import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Calculator | Proppr Track" },
    description: "Free betting calculator.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
