import { NextRequest, NextResponse } from "next/server";
import { requireSessionForUser, requireSessionOrLegacyRead } from "@/lib/server/auth";
import { listProfiles, upsertProfile, deleteProfile } from "@/lib/server/publicBankrollStore";

export const revalidate = 0;

// Owner management API for public bankroll profiles. Follows the app's existing
// trust-the-client userId convention (same as /api/pending, /api/save-bet).
export async function GET(req: NextRequest) {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    const auth = requireSessionOrLegacyRead(req, userId);
    if (auth instanceof NextResponse) return auth;
    const profiles = await listProfiles(userId);
    return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, action } = body || {};
        if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        const auth = requireSessionForUser(req, userId);
        if (auth instanceof NextResponse) return auth;

        if (action === "delete") {
            const r = await deleteProfile(userId, String(body.slug || ""));
            return NextResponse.json(r);
        }
        // create / update
        const r = await upsertProfile(userId, body);
        if ((r as any).error) return NextResponse.json(r, { status: 409 });
        return NextResponse.json(r);
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
    }
}
