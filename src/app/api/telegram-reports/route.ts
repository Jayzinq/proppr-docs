import { NextRequest, NextResponse } from "next/server";
import { requireSessionForUser, requireSessionOrLegacyRead } from "@/lib/server/auth";
import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportBody = {
    action?: "init" | "delete" | "schedule";
    userId?: string | number;
    reportType?: "today" | "open" | "pnl";
    bankrollId?: string;
    bankrollName?: string;
    label?: string;
    code?: string;
    sendTime?: string;
    timezone?: string;
};

const DEFAULT_SEND_TIME = "09:00";
const DEFAULT_TIMEZONE = "Europe/London";

function normalizeSendTime(value: string | undefined | null): string | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTimezone(value: string | undefined | null): string | null {
    const tz = (value || "").trim();
    if (!tz) return null;
    try {
        new Intl.DateTimeFormat("en-GB", { timeZone: tz });
        return tz;
    } catch {
        return null;
    }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_TTL_MS = 6 * 60 * 60_000;
const globalForTelegramReports = globalThis as typeof globalThis & {
    __propprTelegramReportsMongoClient?: MongoClient;
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
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprDocsTelegramReports&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getMongoClient() {
    const { uri } = getMongoConfig();
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached
    // forever (that outage silently emptied the "Original message" box everywhere).
    return getPooledMongoClient("telegram-reports", uri);
}

function createCode() {
    return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
}

function normalizeUserId(value: string | number | undefined | null) {
    if (!value) return 12345;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
}

function serializeReportCode(doc: any) {
    if (!doc) return { status: "missing", linked: false };

    const expiresAt = doc.expires_at instanceof Date ? doc.expires_at : new Date(doc.expires_at);
    const hasValidExpiry = !Number.isNaN(expiresAt.getTime());
    const expired = !doc.used && hasValidExpiry && expiresAt.getTime() < Date.now();
    const linked = Boolean(doc.used || doc.synced_at || doc.chat_id || doc.telegram_chat_id);

    return {
        status: linked ? "synced" : expired ? "expired" : "waiting",
        linked,
        code: doc.code,
        expiresAt: hasValidExpiry ? expiresAt.toISOString() : null,
        usedAt: doc.used_at || doc.synced_at || null,
        chatId: doc.chat_id || doc.telegram_chat_id || null,
        chatTitle: doc.chat_title || null,
        chatType: doc.chat_type || null,
        messageThreadId: doc.message_thread_id ?? null,
        reportType: doc.report_type || "today",
        bankrollId: doc.bankroll_id || "personal",
        bankrollName: doc.bankroll_name || "Personal",
        label: doc.label || null,
        messageId: doc.message_id || null,
        sendTime: doc.send_time || DEFAULT_SEND_TIME,
        timezone: doc.timezone || DEFAULT_TIMEZONE,
    };
}

function serializeRoute(doc: any) {
    return {
        status: "synced",
        linked: true,
        code: doc.code || "",
        usedAt: doc.connected_at || doc.updated_at || null,
        chatId: doc.chat_id || null,
        chatTitle: doc.chat_title || null,
        chatType: doc.chat_type || null,
        messageThreadId: doc.message_thread_id ?? null,
        reportType: doc.report_type || "today",
        bankrollId: doc.bankroll_id || "personal",
        bankrollName: doc.bankroll_name || "Personal",
        label: doc.label || null,
        messageId: doc.message_id || null,
        sendTime: doc.send_time || DEFAULT_SEND_TIME,
        timezone: doc.timezone || DEFAULT_TIMEZONE,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json().catch(() => ({}))) as ReportBody;
        const userId = normalizeUserId(body.userId);
        const auth = requireSessionForUser(request, userId);
        if (auth instanceof NextResponse) return auth;
        const client = await getMongoClient();
        const { dbName } = getMongoConfig();
        const db = client.db(dbName);

        if ((body.action || "init") === "delete") {
            const code = body.code?.trim().toUpperCase();
            if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
            await Promise.all([
                db.collection("telegram_report_codes").deleteMany({ code, app_user_id: userId, source: "track_telegram_reports" }),
                db.collection("telegram_bet_report_routes").deleteMany({ code, user_id: userId, source: "PropprTrackerBot" }),
            ]);
            return NextResponse.json({ success: true });
        }

        if (body.action === "schedule") {
            const code = body.code?.trim().toUpperCase();
            if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
            const sendTime = normalizeSendTime(body.sendTime);
            const timezone = normalizeTimezone(body.timezone);
            if (!sendTime && !timezone) return NextResponse.json({ error: "Nothing to update - provide a valid sendTime (HH:MM) and/or timezone" }, { status: 400 });
            const update: Record<string, any> = { updated_at: new Date() };
            if (sendTime) update.send_time = sendTime;
            if (timezone) update.timezone = timezone;
            await Promise.all([
                db.collection("telegram_report_codes").updateMany({ code, app_user_id: userId, source: "track_telegram_reports" }, { $set: update }),
                db.collection("telegram_bet_report_routes").updateMany({ code, user_id: userId, source: "PropprTrackerBot" }, { $set: update }),
            ]);
            return NextResponse.json({ success: true, sendTime: sendTime || undefined, timezone: timezone || undefined });
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
        let code = createCode();
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const existing = await db.collection("telegram_report_codes").findOne(
                { code, used: false, source: "track_telegram_reports" },
                { projection: { _id: 1 } }
            );
            if (!existing) break;
            code = createCode();
        }

        const reportType = body.reportType && ["today", "open", "pnl"].includes(body.reportType) ? body.reportType : "today";
        const doc = {
            code,
            source: "track_telegram_reports",
            requested_bot: "PropprTrackerBot",
            app_user_id: userId,
            user_id: userId,
            report_type: reportType,
            bankroll_id: body.bankrollId || "personal",
            bankroll_name: body.bankrollName || "Personal",
            label: body.label || null,
            send_time: normalizeSendTime(body.sendTime) || DEFAULT_SEND_TIME,
            timezone: normalizeTimezone(body.timezone) || DEFAULT_TIMEZONE,
            used: false,
            created_at: now,
            expires_at: expiresAt,
        };

        await db.collection("telegram_report_codes").insertOne(doc);
        return NextResponse.json(serializeReportCode(doc));
    } catch (error) {
        console.error("telegram report init failed", error);
        return NextResponse.json({ error: "Failed to create Telegram report code" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const client = await getMongoClient();
        const { dbName } = getMongoConfig();
        const db = client.db(dbName);
        const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();

        if (code) {
            const [codeDoc, routeDoc] = await Promise.all([
                db.collection("telegram_report_codes").findOne({ code, source: "track_telegram_reports" }, { projection: { _id: 0 }, sort: { created_at: -1 } }),
                db.collection("telegram_bet_report_routes").findOne({ code, source: "PropprTrackerBot" }, { projection: { _id: 0 }, sort: { updated_at: -1 } }),
            ]);
            return NextResponse.json(routeDoc ? serializeRoute(routeDoc) : serializeReportCode(codeDoc));
        }

        const userId = normalizeUserId(request.nextUrl.searchParams.get("userId"));
        const auth = requireSessionOrLegacyRead(request, userId);
        if (auth instanceof NextResponse) return auth;
        const [codes, routes] = await Promise.all([
            db.collection("telegram_report_codes")
                .find({ app_user_id: userId, source: "track_telegram_reports" }, { projection: { _id: 0 } })
                .sort({ created_at: -1 })
                .limit(50)
                .toArray(),
            db.collection("telegram_bet_report_routes")
                .find({ user_id: userId, source: "PropprTrackerBot" }, { projection: { _id: 0 } })
                .sort({ updated_at: -1 })
                .limit(50)
                .toArray(),
        ]);

        const reportsByKey = new Map<string, any>();
        for (const doc of codes) {
            const item = serializeReportCode(doc);
            reportsByKey.set(item.code || `${item.reportType}:${item.chatId}:${item.messageThreadId}`, item);
        }
        for (const doc of routes) {
            const item = serializeRoute(doc);
            const key = item.code || `${item.reportType}:${item.chatId}:${item.messageThreadId}:${item.bankrollId}`;
            reportsByKey.set(key, item);
        }

        return NextResponse.json({ reports: Array.from(reportsByKey.values()) });
    } catch (error) {
        console.error("telegram report status failed", error);
        return NextResponse.json({ error: "Failed to read Telegram report status" }, { status: 500 });
    }
}
