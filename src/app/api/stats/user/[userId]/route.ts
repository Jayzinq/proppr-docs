import { NextRequest, NextResponse } from "next/server";
import { requireSessionOrLegacyRead } from "@/lib/server/auth";
import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalForUserStats = globalThis as typeof globalThis & {
    __propprUserStatsMongoClient?: MongoClient;
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
            "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=PropprDocsUserStats&tls=false",
        dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
    };
}

async function getMongoClient() {
    const { uri } = getMongoConfig();
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached
    // forever (that outage silently emptied the "Original message" box everywhere).
    return getPooledMongoClient("stats-user", uri);
}

function normalizeUserId(value: string | number | undefined | null) {
    if (value === undefined || value === null || value === "") return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? String(value) : numeric;
}

function normalizeStatus(value: any) {
    return String(value || "pending").toLowerCase().replace(/[\s-]+/g, "_");
}

function numberValue(...values: any[]) {
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
        if (match) return Number(match[0]);
    }
    return 0;
}

function stakeValue(bet: any) {
    return numberValue(bet.actual_stake, bet.units_staked, bet.recommended_stake, bet.stake);
}

function oddsValue(bet: any) {
    return numberValue(bet.odds, bet.display_odds, bet.displayOdds) || 1;
}

function profitLossValue(bet: any) {
    const explicit = numberValue(bet.profit_loss, bet.profitLoss, bet.profit, bet.pnl);
    if (explicit !== 0) return explicit;

    const stake = stakeValue(bet);
    const odds = oddsValue(bet);
    const status = normalizeStatus(bet.status);
    if (status === "won" || status === "win") return stake * (odds - 1);
    if (status === "lost" || status === "loss") return -stake;
    if (status === "half_win" || status === "half_won") return (stake * (odds - 1)) / 2;
    if (status === "half_loss" || status === "half_lost") return -(stake / 2);
    if (status === "cashed_out") {
        const cashoutOdds = numberValue(bet.cashed_out_odds, bet.cashedOutOdds);
        return cashoutOdds ? stake * (cashoutOdds - 1) : explicit;
    }
    return 0;
}

async function findTrackedBetsDoc(userId: string | number) {
    const client = await getMongoClient();
    const { dbName } = getMongoConfig();
    const col = client.db(dbName).collection("user_tracked_bets");
    const normalized = normalizeUserId(userId);

    // Bets span multiple overflow docs (16MB cap) - merge them; bankrolls live on the
    // primary (oldest) doc.
    const docs = await col
        .find(
            {
                $or: [
                    { user_id: normalized },
                    { user_id: String(userId) },
                    { linked_app_user_id: String(userId) },
                ],
            },
            { projection: { _id: 0, bets: 1, bankrolls: 1, updated_at: 1, last_updated: 1, created_at: 1 } }
        )
        .sort({ created_at: 1 })
        .toArray();
    if (!docs.length) return null;

    const bets = docs.flatMap((d: any) => (Array.isArray(d.bets) ? d.bets : []));
    let updated: any = null;
    for (const d of docs) {
        const t = d.updated_at || d.last_updated;
        if (t && (!updated || t > updated)) updated = t;
    }
    return { bets, bankrolls: Array.isArray(docs[0].bankrolls) ? docs[0].bankrolls : [], updated_at: updated, last_updated: updated };
}

function buildStats(bets: any[]) {
    let activeStake = 0;
    let settledStake = 0;
    let totalStake = 0;
    let profitLoss = 0;
    let activeBets = 0;
    let settledBets = 0;
    let wins = 0;
    let losses = 0;
    let refunds = 0;
    let voids = 0;
    let oddsTotal = 0;
    let oddsCount = 0;

    for (const bet of bets) {
        const status = normalizeStatus(bet.status);
        const stake = stakeValue(bet);
        const odds = oddsValue(bet);
        const profit = profitLossValue(bet);
        totalStake += stake;
        if (odds > 1) {
            oddsTotal += odds;
            oddsCount += 1;
        }

        if (status === "pending" || status === "open") {
            activeBets += 1;
            activeStake += stake;
            continue;
        }

        settledBets += 1;
        settledStake += stake;
        profitLoss += profit;
        if (status === "won" || status === "win" || status === "half_win" || status === "half_won") wins += 1;
        if (status === "lost" || status === "loss" || status === "half_loss" || status === "half_lost") losses += 1;
        if (status === "refund" || status === "refunded") refunds += 1;
        if (status === "void") voids += 1;
    }

    const resolved = wins + losses;
    const roi = settledStake ? (profitLoss / settledStake) * 100 : 0;
    const winRate = resolved ? (wins / resolved) * 100 : 0;
    const averageOdds = oddsCount ? oddsTotal / oddsCount : 0;

    return {
        total_bets: bets.length,
        totalBets: bets.length,
        active_bets: activeBets,
        activeBets,
        pending_bets: activeBets,
        pendingBets: activeBets,
        settled_bets: settledBets,
        settledBets,
        won_bets: wins,
        wonBets: wins,
        lost_bets: losses,
        lostBets: losses,
        refunded_bets: refunds,
        void_bets: voids,
        total_staked: totalStake,
        totalStake,
        active_stake: activeStake,
        activeStake,
        settled_stake: settledStake,
        settledStake,
        total_profit: profitLoss,
        totalProfit: profitLoss,
        profit_loss: profitLoss,
        profitLoss,
        roi,
        win_rate: winRate,
        winRate,
        average_odds: averageOdds,
        averageOdds,
    };
}

export async function GET(_request: NextRequest, context: any) {
    try {
        const params = await Promise.resolve(context?.params);
        const userId = params?.userId;
        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const auth = requireSessionOrLegacyRead(_request, userId);
        if (auth instanceof NextResponse) return auth;

        const doc = await findTrackedBetsDoc(userId);
        const bets = Array.isArray(doc?.bets) ? doc.bets : [];
        return NextResponse.json(
            {
                ...buildStats(bets),
                bankrolls: Array.isArray(doc?.bankrolls) ? doc.bankrolls : [],
                updated_at: doc?.updated_at || doc?.last_updated || null,
            },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        console.error("user stats route failed", error);
        return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
    }
}
