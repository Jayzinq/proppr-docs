import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: { absolute: "Share Your Record | Proppr Track" },
    description: "Publish a verifiable public record of your betting results.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
