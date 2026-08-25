import type { Metadata } from "next";
import { getProfileMeta } from "@/lib/server/publicBankrollStore";
import { PublicBankrollClient } from "./PublicBankrollClient";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const meta = await getProfileMeta(slug).catch(() => null);
    if (!meta || !meta.public) {
        return { title: "Bankroll not found | Proppr", robots: { index: false } };
    }
    const title = `${meta.name} - Verified Bankroll | Proppr`;
    const description = meta.bio || `Live betting performance for ${meta.name}, tracked bet-by-bet on Proppr.`;
    return {
        title,
        description,
        openGraph: { title, description, type: "website" },
        twitter: { card: "summary_large_image", title, description },
    };
}

export default async function PublicBankrollPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return <PublicBankrollClient slug={slug} />;
}
