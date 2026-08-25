import { NextResponse } from "next/server";
import { getSeasonHandicapPayload } from "@/lib/server/seasonHandicapStore";

export const revalidate = 0;

// PUBLIC - live league tables merged with per-bookmaker season-handicap odds.
export async function GET() {
    const payload = await getSeasonHandicapPayload();
    return NextResponse.json(payload, {
        headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
    });
}
