import { NextRequest, NextResponse } from "next/server";
import { getPublicPayload, getPublicBetsPage } from "@/lib/server/publicBankrollStore";

export const revalidate = 0;

// PUBLIC endpoint - no auth. Returns aggregate performance for a published
// bankroll profile, or 404 when the slug is unknown / the page is hidden.
// ?bets=1&page=N&pageSize=M pages through the FULL settled history instead.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const sp = new URL(req.url).searchParams;

    const flat = sp.get("flat") === "1";

    if (sp.get("bets")) {
        const pageData = await getPublicBetsPage(
            slug,
            parseInt(sp.get("page") || "1", 10) || 1,
            parseInt(sp.get("pageSize") || "12", 10) || 12,
            flat,
        );
        if (!pageData) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(pageData, {
            headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
        });
    }

    const payload = await getPublicPayload(slug, flat);
    if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(payload, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
}
