import { NextRequest, NextResponse } from "next/server";
import { getSession, requireSessionForUser, requireSessionOrLegacyRead } from "@/lib/server/auth";
import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InitBody = {
    action?: "init" | "delete";
    userId?: string | number;
    sourceType?: "channel" | "group";
    dateFrom?: string;
    dateTo?: string;
    bankrollId?: string;
    bankrollName?: string;
    label?: string;
    code?: string;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_TTL_MS = 6 * 60 * 60_000;
const globalForTelegramSync = globalThis as typeof globalThis & {
    __propprTelegramSyncMongoClient?: MongoClient;
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
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprDocsTelegramSync&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getMongoClient() {
    const { uri } = getMongoConfig();
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached
    // forever (that outage silently emptied the "Original message" box everywhere).
    return getPooledMongoClient("telegram-sync", uri);
}

function createConnectCode() {
    return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
}

function serializeCodeDoc(doc: any) {
    if (!doc) {
        return { status: "missing", linked: false };
    }

    const expiresAt = doc.expires_at instanceof Date ? doc.expires_at : new Date(doc.expires_at);
    const hasValidExpiry = !Number.isNaN(expiresAt.getTime());
    const expired = !doc.used && hasValidExpiry && expiresAt.getTime() < Date.now();
    const linked = Boolean(doc.used || doc.synced_at || doc.telegram_user_id || doc.telegram_id || doc.telegram_chat_id || doc.chat_id);

    return {
        status: linked ? "synced" : expired ? "expired" : "waiting",
        linked,
        code: doc.code || doc.connect_code,
        expiresAt: hasValidExpiry ? expiresAt.toISOString() : null,
        usedAt: doc.used_at || doc.synced_at || null,
        telegramUserId: doc.telegram_user_id || doc.telegram_id || null,
        chatId: doc.telegram_chat_id || doc.chat_id || null,
        chatTitle: doc.chat_title || doc.group_title || doc.channel_title || null,
        sourceType: doc.sync_type || doc.source_type || null,
        bankrollId: doc.bankroll_id || null,
        bankrollName: doc.bankroll_name || null,
        label: doc.label || doc.chat_title || doc.group_title || doc.channel_title || null,
        dateFrom: doc.date_from || null,
        dateTo: doc.date_to || null,
    };
}

function normalizeUserId(value: string | number | undefined) {
    if (!value) return 12345;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json().catch(() => ({}))) as InitBody;
        const userId = normalizeUserId(body.userId);
        const auth = requireSessionForUser(request, userId);
        if (auth instanceof NextResponse) return auth;
        const action = body.action || "init";
        const sourceType = body.sourceType === "group" ? "group" : "channel";
        const now = new Date();
        const client = await getMongoClient();
        const { dbName } = getMongoConfig();
        const db = client.db(dbName);
        const connectionCodes = db.collection("connection_codes");
        const webAppConnectCodes = db.collection("web_app_connect_codes");

        if (action === "delete") {
            const code = body.code?.trim().toUpperCase();
            if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
            await Promise.all([
                connectionCodes.deleteMany({ code, user_id: userId, source: "track_telegram_import" }),
                webAppConnectCodes.deleteMany({ connect_code: code, app_user_id: userId, source: "track_telegram_import" }),
            ]);
            return NextResponse.json({ success: true });
        }

        const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

        let code = createConnectCode();
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const [existingConnectionCode, existingWebAppCode] = await Promise.all([
                connectionCodes.findOne({ code, used: false }, { projection: { _id: 1 } }),
                webAppConnectCodes.findOne({ connect_code: code, telegram_id: null }, { projection: { _id: 1 } }),
            ]);
            const existing = existingConnectionCode || existingWebAppCode;
            if (!existing) break;
            code = createConnectCode();
        }

        const commonFields = {
            created_at: now,
            expires_at: expiresAt,
            source: "track_telegram_import",
            sync_type: sourceType,
            requested_bot: "PropprTrackerBot",
            date_from: body.dateFrom || null,
            date_to: body.dateTo || null,
            bankroll_id: body.bankrollId || "personal",
            bankroll_name: body.bankrollName || "Personal",
            label: body.label || null,
        };

        await Promise.all([
            connectionCodes.insertOne({
                ...commonFields,
                code,
                user_id: userId,
                used: false,
            }),
            webAppConnectCodes.insertOne({
                ...commonFields,
                connect_code: code,
                app_user_id: userId,
                telegram_id: null,
            }),
        ]);

        return NextResponse.json({
            status: "waiting",
            linked: false,
            code,
            expiresAt: expiresAt.toISOString(),
            sourceType,
            bankrollId: body.bankrollId || "personal",
            bankrollName: body.bankrollName || "Personal",
            label: body.label || null,
            dateFrom: body.dateFrom || null,
            dateTo: body.dateTo || null,
        });
    } catch (error) {
        console.error("telegram sync init failed", error);
        return NextResponse.json({ error: "Failed to create Telegram sync code" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const client = await getMongoClient();
        const { dbName } = getMongoConfig();
        const db = client.db(dbName);
        const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
        if (!code) {
            const userId = normalizeUserId(request.nextUrl.searchParams.get("userId") || undefined);
            const auth = requireSessionOrLegacyRead(request, userId);
            if (auth instanceof NextResponse) return auth;
            const [webDocs, connectionDocs] = await Promise.all([
                db
                    .collection("web_app_connect_codes")
                    .find({ app_user_id: userId, source: "track_telegram_import" }, { projection: { _id: 0 } })
                    .sort({ created_at: -1 })
                    .limit(50)
                    .toArray(),
                db
                    .collection("connection_codes")
                    .find({ user_id: userId, source: "track_telegram_import" }, { projection: { _id: 0 } })
                    .sort({ created_at: -1 })
                    .limit(50)
                    .toArray(),
            ]);

            const byCode = new Map<string, any>();
            for (const doc of [...webDocs, ...connectionDocs]) {
                const serialized = serializeCodeDoc(doc);
                const key = serialized.code;
                if (!key) continue;
                const existing = byCode.get(key);
                if (!existing || (serialized.linked && !existing.linked)) {
                    byCode.set(key, serialized);
                }
            }

            const syncs = Array.from(byCode.values()).sort((a, b) => {
                const aTime = a.usedAt ? new Date(a.usedAt).getTime() : a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
                const bTime = b.usedAt ? new Date(b.usedAt).getTime() : b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
                return bTime - aTime;
            });

            return NextResponse.json({ syncs });
        }

        const [connectionCodeDoc, webAppCodeDoc] = await Promise.all([
            db
                .collection("connection_codes")
                .findOne({ code, source: "track_telegram_import" }, { projection: { _id: 0 }, sort: { created_at: -1 } }),
            db
                .collection("web_app_connect_codes")
                .findOne({ connect_code: code, source: "track_telegram_import" }, { projection: { _id: 0 }, sort: { created_at: -1 } }),
        ]);

        const linkedDoc = [connectionCodeDoc, webAppCodeDoc].find((doc) => doc && serializeCodeDoc(doc).linked);
        const payload = serializeCodeDoc(linkedDoc || connectionCodeDoc || webAppCodeDoc);
        // Code-only lookups are anonymous by design (pre-link polling); never hand a
        // Telegram identity to a caller who only knows a code.
        if (!getSession(request)) {
            payload.telegramUserId = null;
            payload.chatId = null;
        }
        return NextResponse.json(payload);
    } catch (error) {
        console.error("telegram sync status failed", error);
        return NextResponse.json({ error: "Failed to read Telegram sync status" }, { status: 500 });
    }
}
