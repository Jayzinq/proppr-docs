import { NextRequest, NextResponse } from "next/server";
import { requireSessionOrLegacyRead } from "@/lib/server/auth";
import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const globalForExport = globalThis as typeof globalThis & {
    __propprExportMongoClient?: MongoClient;
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
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprDocsUserBets&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getMongoClient() {
    const { uri } = getMongoConfig();
    return getPooledMongoClient("bets-export", uri);
}

function normalizeUserId(value: string | number | undefined | null) {
    if (value === undefined || value === null || value === "") return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? String(value) : numeric;
}

function stripEmojis(text: string): string {
    // Remove flag sequences (two regional indicator symbols) and common emoji/code-point ranges.
    return text
        .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "")
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeCsv(value: any): string {
    const text = stripEmojis(String(value ?? "").replace(/\r?\n/g, " "));
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function statusToResultCode(status: string): string {
    switch ((status || "").toLowerCase()) {
        case "won": return "W";
        case "lost": return "L";
        case "half_win": return "HW";
        case "half_loss": return "HL";
        case "refund":
        case "void": return "R";
        case "pending": return "TBD";
        default: return status ? status.toUpperCase() : "TBD";
    }
}

function displayMarketName(market: string, selection: string): string {
    const m = String(market || "").trim();
    const s = String(selection || "").trim();
    // Common normalisations to match the traditional tracker look.
    if (/match\s*odds|1x2|full\s*time\s*result/i.test(m)) return "Full Time Result";
    if (/asian\s*handicap/i.test(m)) return "Asian Handicap";
    if (/over\s*\/\s*under|goals\s*over\/under|points\s*over\/under/i.test(m)) return "Over/Under";
    if (/both\s*teams\s*to\s*score/i.test(m)) return "Both Teams To Score";
    if (/draw\s*no\s*bet/i.test(m)) return "Draw No Bet";
    if (/double\s*chance/i.test(m)) return "Double Chance";
    if (/correct\s*score/i.test(m)) return "Correct Score";
    if (/player\s*props?/i.test(m)) {
        // Derive a readable market from the selection if possible.
        const lower = s.toLowerCase();
        if (lower.includes("shot") && lower.includes("target")) return "Shots On Target";
        if (lower.includes("foul")) return "Fouls";
        if (lower.includes("tackle")) return "Tackles";
        if (lower.includes("corner")) return "Corners";
        if (lower.includes("card")) return "Cards";
        if (lower.includes("goal")) return "Goals";
        if (lower.includes("assist")) return "Assists";
        return "Player Prop";
    }
    return m;
}

async function fetchAllBets(userId: string | number, bankrollIds?: string[]) {
    const client = await getMongoClient();
    const { dbName } = getMongoConfig();
    const col = client.db(dbName).collection("user_tracked_bets");
    const normalized = normalizeUserId(userId);

    const match: any = {
        $or: [
            { user_id: normalized },
            { user_id: String(userId) },
            { linked_app_user_id: String(userId) },
        ],
    };

    const docs = await col
        .find(match, { projection: { _id: 0, bets: 1 } } as any)
        .toArray();

    let bets = docs.flatMap((d: any) => (Array.isArray(d.bets) ? d.bets : []));

    if (bankrollIds && bankrollIds.length) {
        const ids = new Set(bankrollIds);
        // 'personal' also covers legacy bets with no/empty bankroll_id.
        bets = bets.filter((b: any) => {
            const bid = b.bankroll_id;
            if (ids.has(bid)) return true;
            if (ids.has("personal") && (!bid || bid === "" || bid === "personal")) return true;
            return false;
        });
    }

    return bets;
}

function propprCsv(bets: any[]): string {
    const rows: string[] = [
        [
            "bet_id", "date", "sport", "league", "match", "market", "selection",
            "odds", "stake", "bookmaker", "bankroll_id", "status",
            "returns", "profit_loss", "actual_result", "graded_at", "created_at",
        ].map(escapeCsv).join(","),
    ];
    for (const bet of bets) {
        rows.push(
            [
                bet.bet_id,
                bet.date,
                bet.sport,
                bet.league,
                bet.match,
                displayMarketName(bet.market, bet.selection),
                bet.selection,
                bet.odds,
                bet.actual_stake ?? bet.stake,
                bet.bookmaker,
                bet.bankroll_id,
                bet.status,
                bet.returns,
                bet.profit_loss,
                bet.actual_result,
                bet.settled_at || bet.result_tracking?.graded_at,
                bet.created_at,
            ].map(escapeCsv).join(",")
        );
    }
    return rows.join("\n");
}

function traditionalCsv(bets: any[]): string {
    const rows: string[] = [
        ["Date", "Time", "Country", "League", "Match", "Bet", "Stake", "Odds", "Result", "CO", "Sport", "Bookie"]
            .map(escapeCsv)
            .join(","),
    ];
    for (const bet of bets) {
        const market = displayMarketName(bet.market, bet.selection);
        const selection = String(bet.selection || "");
        const betDescriptor = market && market !== selection ? `${selection} - ${market}` : selection;
        rows.push(
            [
                bet.date,
                bet.time,
                bet.country,
                bet.league,
                bet.match,
                betDescriptor,
                bet.actual_stake ?? bet.stake,
                bet.odds,
                statusToResultCode(bet.status),
                bet.closing_line_odds,
                bet.sport,
                bet.bookmaker,
            ].map(escapeCsv).join(",")
        );
    }
    return rows.join("\n");
}

export async function GET(request: NextRequest, context: any) {
    try {
        const params = await Promise.resolve(context?.params);
        const userId = params?.userId;
        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const auth = requireSessionOrLegacyRead(request, userId);
        if (auth instanceof NextResponse) return auth;

        const sp = new URL(request.url).searchParams;
        const template = sp.get("template") || "proppr";
        const bankrollIdsParam = sp.get("bankrollIds");
        const bankrollIds = bankrollIdsParam ? bankrollIdsParam.split(",").filter(Boolean) : undefined;
        const bets = await fetchAllBets(userId, bankrollIds);

        const csv = template === "traditional" ? traditionalCsv(bets) : propprCsv(bets);
        const filename = `proppr_bets_${template}_${userId}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("user bets export route failed", error);
        return NextResponse.json({ error: "Failed to export bets" }, { status: 500 });
    }
}
