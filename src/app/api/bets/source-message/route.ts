import { NextRequest, NextResponse } from "next/server";
import { requireSessionOrLegacyRead } from "@/lib/server/auth";
import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const globalForSourceMsg = globalThis as typeof globalThis & {
    __propprSourceMsgMongoClient?: MongoClient;
};

function readEnvFile(filePath: string): Record<string, string> {
    try {
        const content = fs.readFileSync(filePath, "utf8");
        return Object.fromEntries(
            content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith("#") && line.includes("="))
                .map((line) => {
                    const idx = line.indexOf("=");
                    const key = line.slice(0, idx).trim();
                    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
                    return [key, value];
                })
        );
    } catch {
        return {};
    }
}

function getMongoConfig() {
    const serverEnv = readEnvFile("/opt/PROPPR/.env");
    const localEnv1 = readEnvFile(".env.local");
    const localEnv2 = readEnvFile(".env");
    const env = { ...serverEnv, ...localEnv2, ...localEnv1, ...process.env };
    return {
        uri:
            env.MONGODB_URI_OVERRIDE ||
            env.MONGO_CONNECTION_STRING ||
            env.MONGODB_CONNECTION_STRING ||
            env.MONGODB_URI_PRODUCTION ||
            env.MONGODB_URI_DEVELOPMENT ||
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprDocsSourceMsg&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getMongoClient() {
    const { uri } = getMongoConfig();
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached
    // forever (that outage silently emptied the "Original message" box everywhere).
    return getPooledMongoClient("source-message", uri);
}

function normalizeUserId(value: string | number | undefined | null) {
    if (value === undefined || value === null || value === "") return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? String(value) : numeric;
}

// GET /api/bets/source-message?userId=..&betId=..
// Returns the raw message a bet was parsed from (bet.original_message, falling back to its
// telegram_import_queue item) plus any slip images from the imported_message_sources sidecar.
export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get("userId");
    const betId = req.nextUrl.searchParams.get("betId");
    if (!userId || !betId) {
        return NextResponse.json({ error: "userId and betId required" }, { status: 400 });
    }
    const auth = requireSessionOrLegacyRead(req, userId);
    if (auth instanceof NextResponse) return auth;
    try {
        const client = await getMongoClient();
        const { dbName } = getMongoConfig();
        const db = client.db(dbName);
        const uid = normalizeUserId(userId);
        const idMatches = [uid, String(userId)].filter((v, i, a) => v !== null && a.indexOf(v) === i);

        const doc = await db.collection("user_tracked_bets").findOne(
            { user_id: { $in: idMatches }, "bets.bet_id": betId },
            { projection: { "bets.$": 1 } }
        );
        const bet: any = doc?.bets?.[0];
        if (!bet) return NextResponse.json({ found: false });

        let text: string = bet.original_message || "";
        const messageKey: string = bet.source_message_key || "";
        if (!text && messageKey) {
            const q = await db
                .collection("telegram_import_queue")
                .findOne({ message_key: messageKey }, { projection: { text: 1 } });
            text = (q?.text as string) || "";
        }

        let images: string[] = [];
        const imgKey = bet.source_image_key || messageKey || `bet:${betId}`;
        const src = await db
            .collection("imported_message_sources")
            .findOne({ message_key: imgKey }, { projection: { images: 1 } });
        if (src?.images?.length) images = src.images;

        return NextResponse.json({ found: Boolean(text || images.length), text, images });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "lookup failed" }, { status: 500 });
    }
}
