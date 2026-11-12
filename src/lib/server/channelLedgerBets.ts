import type { Db } from "mongodb";

const COLLECTIONS: Record<string, string> = {
    onlygoals: "onlygoals_daily_ledger",
    onlycards: "onlycards_daily_ledger",
};

function numeric(value: unknown): number {
    const raw = String(value ?? "").replace(/u$/i, "").trim().split("/")[0].trim();
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

function legResult(status: string, stake: number, odds: number) {
    switch (status) {
        case "won": return { profit: stake * (odds - 1), returned: stake * odds };
        case "half_win": return { profit: stake * (odds - 1) / 2, returned: stake * (1 + (odds - 1) / 2) };
        case "lost": return { profit: -stake, returned: 0 };
        case "half_loss": return { profit: -stake / 2, returned: stake / 2 };
        case "refund":
        case "refunded":
        case "void":
        case "push": return { profit: 0, returned: stake };
        default: return { profit: 0, returned: 0 };
    }
}

/** Map channel daily-ledger picks into the bet shape consumed by Tracker analytics. */
export async function channelLedgerBets(db: Db, channel: string): Promise<Record<string, unknown>[] | null> {
    const collection = COLLECTIONS[String(channel)];
    if (!collection) return null;    const docs = await db.collection(collection).find(
        { picks: { $exists: true, $ne: [] } },
        { projection: { card_date: 1, picks: 1, settled: 1 } },
    ).sort({ card_date: 1 }).toArray();

    const sourceIds = [...new Set(docs.flatMap((day) =>
        (Array.isArray(day.picks) ? day.picks : [])
            .map((pick: any) => pick?.source_alert_id)
            .filter((id: unknown) => id !== null && id !== undefined && String(id) !== ""),
    ))];
    const sourceResults = new Map<string, string>();
    if (sourceIds.length) {
        const alerts = await db.collection("all_positive_alerts").find(
            { _id: { $in: sourceIds } },
            { projection: { _id: 1, result_tracking: 1 } },
        ).toArray();
        for (const alert of alerts) {
            const result = String(alert.result_tracking?.result_status || "").toLowerCase();
            if (["won", "lost", "refund", "half_win", "half_loss"].includes(result)) {
                sourceResults.set(String(alert._id), result);
            }
        }
    }

    const bets: Record<string, unknown>[] = [];
    for (const day of docs) {
        const picks = Array.isArray(day.picks) ? day.picks : [];
        const outcomes = Array.isArray(day.settled) ? day.settled : [];
        for (let index = 0; index < picks.length; index += 1) {
            const pick = picks[index] || {};
            const alertId = pick.source_alert_id;
            const status = (alertId !== null && alertId !== undefined
                ? sourceResults.get(String(alertId))
                : undefined) || String(outcomes[index]?.status || "pending").toLowerCase();

            const stake = numeric(pick.stake);
            const odds = numeric(pick.bookmakerOdds);
            const result = legResult(status, stake, odds);
            const player = String(pick.player || "");
            const match = String(pick.match || "");
            const date = String(day.card_date || "");
            bets.push({
                bet_id: `${channel}:${date}:${pick.fixture_id ?? "fixture"}:${pick.source_alert_id ?? index}`,
                channel,
                bankroll_id: channel,
                date,
                event_date: date,
                match,
                fixture_name: match,
                selection: player,
                player_name: player,
                team: String(pick.team || ""),
                league: String(pick.league || ""),
                country: String(pick.country || ""),
                market: channel === "onlycards" ? "Player Yellow Card" : "Player Goals",
                sport: "Football",
                bookmaker: String(pick.bookmaker || ""),
                status,
                odds,
                stake,
                actual_stake: stake,
                units_staked: stake,
                profit_loss: result.profit,
                returns: result.returned,
                closing_line_odds: Number(pick.closingLineOdds || pick.closing_line_odds || 0) || undefined,
                tags: [channel],
                source: "channel_daily_ledger",
            });
        }
    }
    return bets;
}
