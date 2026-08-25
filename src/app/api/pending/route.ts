import { NextRequest, NextResponse } from "next/server";
import { requireSessionForUser, requireSessionOrLegacyRead } from "@/lib/server/auth";
import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalForPending = globalThis as typeof globalThis & {
    __propprMongoClient?: MongoClient;
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
    const localEnv1 = readEnvFile(".env.local") || {};
    const localEnv2 = readEnvFile(".env") || {};
    const env = { ...serverEnv, ...localEnv2, ...localEnv1, ...process.env };

    return {
        uri:
            env.MONGODB_URI_OVERRIDE ||
            env.MONGO_CONNECTION_STRING ||
            env.MONGODB_CONNECTION_STRING ||
            env.MONGODB_URI_PRODUCTION ||
            env.MONGODB_URI_DEVELOPMENT ||
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprDocsPending&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getMongoClient() {
    const { uri } = getMongoConfig();
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached
    // forever (that outage silently emptied the "Original message" box everywhere).
    return getPooledMongoClient("pending", uri);
}

// Match queue docs by user_id regardless of whether it was stored as a number
// or a string (the bot writes the same value localStorage exposes as
// telegram_user_id, but type can differ between ingestion paths).
function userIdMatch(userId: string) {
    const asNum = Number(userId);
    const values: Array<string | number> = [userId];
    if (Number.isFinite(asNum) && String(asNum) === userId) values.push(asNum);
    return { $in: values };
}

export async function GET(req: NextRequest) {
    const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
    const bankrollId = (req.nextUrl.searchParams.get("bankrollId") || "").trim();
    if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const auth = requireSessionOrLegacyRead(req, userId);
    if (auth instanceof NextResponse) return auth;

    try {
        const client = await getMongoClient();
        const { dbName } = getMongoConfig();
        const db = client.db(dbName);

        const query: Record<string, any> = { user_id: userIdMatch(userId), status: "pending_review" };
        if (bankrollId) {
            query.bankroll_id = bankrollId === "personal"
                ? { $in: ["personal", null, ""] }
                : bankrollId;
        }

        const docs = await db
            .collection("telegram_import_queue")
            .find(
                query,
                {
                    projection: {
                        message_key: 1,
                        user_id: 1,
                        bankroll_id: 1,
                        bankroll_name: 1,
                        text: 1,
                        ocr_text: 1,
                        confidence: 1,
                        pending_bets: 1,
                        review_reasons: 1,
                        created_at: 1,
                        received_at: 1,
                        processed_at: 1,
                        chat_title: 1,
                    },
                    sort: { processed_at: -1, received_at: -1 },
                    limit: 200,
                }
            )
            .toArray();

        const items = docs.map((d) => ({
            message_key: d.message_key,
            bankroll_id: d.bankroll_id || "personal",
            bankroll_name: d.bankroll_name || "Personal",
            text: d.text || "",
            ocr_text: d.ocr_text || "",
            confidence: Number(d.confidence || 0),
            pending_bets: Array.isArray(d.pending_bets) ? d.pending_bets : [],
            review_reasons: Array.isArray(d.review_reasons) ? d.review_reasons : [],
            created_at: d.created_at || d.received_at ? new Date(d.created_at || d.received_at).toISOString() : null,
            processed_at: d.processed_at ? new Date(d.processed_at).toISOString() : null,
            source: d.chat_title || "",
        }));

        return NextResponse.json({ items });
    } catch (error: any) {
        return NextResponse.json(
            { items: [], error: error?.message || "Failed to load pending" },
            { status: 500 }
        );
    }
}

// Dismiss a pending queue doc (user rejected the bet, or already handled it
// elsewhere). Approval/promotion goes through /api/save-bet separately; the
// caller then POSTs here with action "resolve" to clear the queue entry.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const userId = String(body.userId || "").trim();
        const messageKey = String(body.message_key || "").trim();
        const action = String(body.action || "dismiss").trim();

        if (!userId || !messageKey) {
            return NextResponse.json(
                { error: "userId and message_key required" },
                { status: 400 }
            );
        }

        const auth = requireSessionForUser(req, userId);
        if (auth instanceof NextResponse) return auth;

        const newStatus = action === "resolve" ? "imported" : "dismissed";

        const client = await getMongoClient();
        const { dbName } = getMongoConfig();
        const db = client.db(dbName);

        const result = await db.collection("telegram_import_queue").updateOne(
            { message_key: messageKey, user_id: userIdMatch(userId), status: "pending_review" },
            {
                $set: {
                    status: newStatus,
                    resolved_at: new Date(),
                    resolved_via: "pending_ui",
                },
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: "Pending item not found or already handled" },
                { status: 404 }
            );
        }

        return NextResponse.json({ ok: true, status: newStatus });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to update pending" },
            { status: 500 }
        );
    }
}
