import { NextRequest, NextResponse } from "next/server";
import { requireSessionForUser, requireSessionOrLegacyRead } from "@/lib/server/auth";
import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Replacement = { from: string; to: string };

type RulesBody = {
    action?: "get" | "save";
    userId?: string | number;
    whitelist?: string[];
    blacklist?: string[];
    whitelistOnly?: boolean;
    replacements?: Replacement[];
};

const globalForTelegramRules = globalThis as typeof globalThis & {
    __propprTelegramRulesMongoClient?: MongoClient;
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
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprDocsTelegramRules&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getMongoClient() {
    const { uri } = getMongoConfig();
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached
    // forever (that outage silently emptied the "Original message" box everywhere).
    return getPooledMongoClient("telegram-rules", uri);
}

function normalizeUserId(value: string | number | undefined) {
    if (!value) return 12345;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
}

function cleanList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of value) {
        const term = String(item ?? "").trim();
        if (!term) continue;
        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(term);
    }
    return out.slice(0, 2000);
}

function cleanReplacements(value: unknown): Replacement[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => ({
            from: String((item as Replacement)?.from ?? "").trim(),
            to: String((item as Replacement)?.to ?? ""),
        }))
        .filter((item) => item.from)
        .slice(0, 2000);
}

const DEFAULT_RULES = {
    whitelist: [] as string[],
    blacklist: [] as string[],
    whitelistOnly: false,
    replacements: [] as Replacement[],
};

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json().catch(() => ({}))) as RulesBody;
        const userId = normalizeUserId(body.userId);
        const action = body.action || "get";
        // "get" is a read dispatched over POST - legacy window; "save" is a mutation.
        const auth = action === "get"
            ? requireSessionOrLegacyRead(request, userId)
            : requireSessionForUser(request, userId);
        if (auth instanceof NextResponse) return auth;
        const client = await getMongoClient();
        const { dbName } = getMongoConfig();
        const collection = client.db(dbName).collection("telegram_sync_rules");

        if (action === "save") {
            const rules = {
                whitelist: cleanList(body.whitelist),
                blacklist: cleanList(body.blacklist),
                whitelistOnly: Boolean(body.whitelistOnly),
                replacements: cleanReplacements(body.replacements),
            };
            await collection.updateOne(
                { user_id: userId, source: "track_telegram_import" },
                {
                    $set: {
                        ...rules,
                        user_id: userId,
                        source: "track_telegram_import",
                        updated_at: new Date(),
                    },
                },
                { upsert: true }
            );
            return NextResponse.json({ success: true, rules });
        }

        const doc = await collection.findOne(
            { user_id: userId, source: "track_telegram_import" },
            { projection: { _id: 0 } }
        );

        return NextResponse.json({
            rules: {
                whitelist: cleanList(doc?.whitelist) ?? DEFAULT_RULES.whitelist,
                blacklist: cleanList(doc?.blacklist) ?? DEFAULT_RULES.blacklist,
                whitelistOnly: Boolean(doc?.whitelistOnly),
                replacements: cleanReplacements(doc?.replacements),
            },
        });
    } catch (error) {
        console.error("telegram rules request failed", error);
        return NextResponse.json({ rules: DEFAULT_RULES }, { status: 200 });
    }
}
