import { NextRequest, NextResponse } from "next/server";
import { requireSessionOrLegacyRead } from "@/lib/server/auth";
import { MongoClient } from "mongodb";
import fs from "fs";
import { getPooledMongoClient } from "@/lib/server/mongoClientPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const globalForUserBets = globalThis as typeof globalThis & {
    __propprUserBetsMongoClient?: MongoClient;
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
    // Pooled + liveness-checked: a dead topology is replaced instead of being cached
    // forever (that outage silently emptied the "Original message" box everywhere).
    return getPooledMongoClient("bets-user", uri);
}

function normalizeUserId(value: string | number | undefined | null) {
    if (value === undefined || value === null || value === "") return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? String(value) : numeric;
}

async function findTrackedBetsDoc(userId: string | number) {
    const client = await getMongoClient();
    const { dbName } = getMongoConfig();
    const col = client.db(dbName).collection("user_tracked_bets");
    const normalized = normalizeUserId(userId);

    // Bets are split across multiple overflow docs (16MB cap) - merge them all. Top-level
    // fields (bankrolls) live on the primary (oldest) doc.
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

// Trimmed field set for the paginated bets TABLE - drops the heavy per-bet payload
// (result_tracking, market_metadata, redundant timestamps) that the list view never reads.
// Full detail is still available via the un-paginated endpoint / a per-bet fetch on edit.
const LIST_FIELDS = [
    "bet_id", "alert_id", "bankroll_id", "date", "time", "event_date", "match", "selection",
    "market", "bet_type", "sport", "bookmaker", "status", "odds", "display_odds", "stake",
    "units_staked", "actual_stake", "returns", "profit_loss", "player_name", "team",
    "threshold", "market_direction", "cashed_out_odds", "entry_price_cents", "exit_price_cents",
    "closing_line_odds", "closing_odds_source", "pinnacle_closing_odds", "bet365_closing_odds",
    "searchEvent", "fixture_name", "sync_label", "tags", "is_multi_bet", "multi_bet_selections",
    "tracked_at", "created_at",
];

function escapeRegex(s: string) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Minimal field set the analytics / closing-lines / home aggregations actually read (dates,
// status, stake, profit, odds, CLV, sport/market/bookmaker/type). Returning ALL bets but only
// these fields keeps each page's existing client-side aggregation exactly intact while cutting
// the payload ~6-8x vs the full ~40MB list on a 20k-bet bankroll.
// Complete read-set of the analytics / closing-lines / home aggregations (audited from every
// bet.<field> access, incl. all the fallback aliases). Drops only the heavy fields none of
// them read - result_tracking, market_metadata, poly ids, closing snapshots, internal ids.
const LITE_FIELDS = [
    "bet_id", "id", "bankroll_id",
    "date", "time", "event_date", "eventDate", "event_time", "eventTime",
    "fixture_date", "fixtureDate", "fixture_time", "fixtureTime", "kickoff_date", "kickoff_time",
    "kickoff_utc",
    "tracked_at", "created_at", "graded_at", "settled_at",
    "status", "result",
    "profit_loss", "profit", "pnl", "p_l", "net_profit",
    "returns", "return_amount", "total_returns",
    "stake", "units_staked", "actual_stake", "recommended_stake",
    "odds", "display_odds", "displayOdds", "decimal_odds",
    "closing_line_odds", "closingLineOdds", "closing_odds_source",
    // Alert value metrics - the analytics Value % dimension reads these; omitting them made
    // EVERY bet render as "No value" regardless of what was stored.
    "value_percentage", "valuePercentage", "value", "chance_percentage", "model_odds",
    "sport", "event_sport", "eventSport",
    "market", "market_type", "market_name", "market_direction",
    "bet_type", "betType", "bookmaker",
    "player_name", "team", "selection", "match", "fixture_name", "searchEvent", "search_event",
    "competition", "league", "country", "threshold", "stat_name", "data_scope",
    "is_multiple", "is_multi_bet", "multi_bet_selections", "multi_bet_description",
    "tags", "sync_label",
];

// All bets (optionally bankroll-scoped), projected to LITE_FIELDS only. For pages that need
// every bet to aggregate (charts/calendars/CLV) but not the heavy per-bet payload.
async function liteBets(userId: string | number, sp: URLSearchParams) {
    const client = await getMongoClient();
    const { dbName } = getMongoConfig();
    const col = client.db(dbName).collection("user_tracked_bets");
    const normalized = normalizeUserId(userId);
    const { match, needs } = buildBetMatch(sp);
    const pipeline: any[] = [
        { $match: { $or: [{ user_id: normalized }, { user_id: String(userId) }, { linked_app_user_id: String(userId) }] } },
        { $project: { bets: 1 } },
        { $unwind: "$bets" },
        { $replaceRoot: { newRoot: "$bets" } },
    ];
    if (needs.size) pipeline.push({ $addFields: Object.fromEntries([...needs].map((k) => [k, COMPUTED[k]])) });
    if (match) pipeline.push({ $match: match });
    pipeline.push({ $project: Object.fromEntries(LITE_FIELDS.map((f) => [f, 1])) });
    const bets = await col.aggregate(pipeline, { allowDiskUse: true }).toArray();
    return { bets };
}

const ci = (v: string) => ({ $regex: `^${escapeRegex(v)}$`, $options: "i" });

// Build the bet-level $match (operates on bare bet docs) from the query filters, mirroring
// the bets page: a specific bankroll matches its id; 'personal' also includes orphaned bets
// (no/unknown bankroll_id - `known` carries the user's real bankroll ids). Returns the match
// plus which computed fields it references so the caller can $addFields them.
function buildBetMatch(sp: URLSearchParams) {
    const status = (sp.get("status") || "").trim();
    const bankroll = (sp.get("bankroll") || "").trim();
    const sport = (sp.get("sport") || "").trim();
    const bookmaker = (sp.get("bookmaker") || "").trim();
    const market = (sp.get("market") || "").trim();
    const marketType = (sp.get("marketType") || "").trim();
    // Date is now a range. `date` (single day) kept for back-compat -> from == to == that day.
    const dateFrom = (sp.get("dateFrom") || sp.get("date") || "").trim();
    const dateTo = (sp.get("dateTo") || sp.get("date") || "").trim();
    const search = (sp.get("search") || "").trim();
    const and: any[] = [];
    const needs = new Set<string>();

    if (bankroll === "personal") {
        const known = (sp.get("known") || "").split(",").map((s) => s.trim()).filter(Boolean);
        const or: any[] = [{ bankroll_id: "personal" }, { bankroll_id: { $in: [null, ""] } }, { bankroll_id: { $exists: false } }];
        if (known.length) or.push({ bankroll_id: { $nin: known } });
        and.push({ $or: or });
    } else if (bankroll && bankroll !== "all") {
        and.push({ bankroll_id: bankroll });
    }
    if (status) { and.push({ _status: status }); needs.add("_status"); }
    if (sport) { and.push({ _sport: sport.toLowerCase() }); needs.add("_sport"); }
    if (bookmaker) and.push({ bookmaker: ci(bookmaker) });
    if (market) and.push({ market: ci(market) });
    if (marketType) and.push({ $or: [{ bet_type: ci(marketType) }, { betType: ci(marketType) }] });
    if (dateFrom || dateTo) {
        const range: any = {};
        if (dateFrom) range.$gte = dateFrom;
        if (dateTo) range.$lte = dateTo;
        and.push({ _date: range });
        needs.add("_date");
    }
    // Placeholder promises "Search match or selection..." - so cover selection/player/team/market
    // too, not just the fixture-name fields.
    if (search) and.push({
        $or: [
            { match: { $regex: escapeRegex(search), $options: "i" } },
            { searchEvent: { $regex: escapeRegex(search), $options: "i" } },
            { fixture_name: { $regex: escapeRegex(search), $options: "i" } },
            { selection: { $regex: escapeRegex(search), $options: "i" } },
            { player_name: { $regex: escapeRegex(search), $options: "i" } },
            { team: { $regex: escapeRegex(search), $options: "i" } },
            { market: { $regex: escapeRegex(search), $options: "i" } },
            { sync_label: { $regex: escapeRegex(search), $options: "i" } },
            { tags: { $regex: escapeRegex(search), $options: "i" } },
        ],
    });
    return { match: and.length ? { $and: and } : null, needs };
}

const COMPUTED: Record<string, any> = {
    _status: { $replaceAll: { input: { $toLower: { $ifNull: ["$status", "pending"] } }, find: " ", replacement: "_" } },
    _sport: { $toLower: { $ifNull: ["$sport", ""] } },
    _stake: { $ifNull: ["$units_staked", { $ifNull: ["$actual_stake", "$stake"] }] },
    _returns: { $ifNull: ["$returns", 0] },
    _match: { $toLower: { $ifNull: ["$match", ""] } },
    _sel: { $toLower: { $ifNull: ["$selection", ""] } },
    // Sort/filter day. Prefer the event date; when blank (legacy telegram imports), fall
    // back to tracked_at/created_at so the row still appears under "Today" the same way the
    // client date column already does - empty `date` used to vanish only when a date filter
    // was applied (status "Pending" still showed it).
    _ts: {
        $concat: [
            {
                $let: {
                    vars: {
                        raw: { $ifNull: ["$date", { $ifNull: ["$event_date", ""] }] },
                    },
                    in: {
                        $cond: [
                            { $and: [{ $ne: ["$$raw", null] }, { $ne: ["$$raw", ""] }] },
                            { $substrCP: [{ $toString: "$$raw" }, 0, 10] },
                            {
                                $ifNull: [
                                    { $dateToString: { format: "%Y-%m-%d", date: "$tracked_at", onNull: null } },
                                    {
                                        $ifNull: [
                                            { $dateToString: { format: "%Y-%m-%d", date: "$created_at", onNull: null } },
                                            "",
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
            " ",
            { $ifNull: ["$time", "00:00"] },
        ],
    },
    // "YYYY-MM-DD" day string for range filtering - handles string dates, Date objects, and
    // empty-date legacy rows (tracked_at day).
    _date: {
        $let: {
            vars: {
                raw: { $ifNull: ["$date", { $ifNull: ["$event_date", ""] }] },
            },
            in: {
                $cond: [
                    { $and: [{ $ne: ["$$raw", null] }, { $ne: ["$$raw", ""] }] },
                    { $substrCP: [{ $toString: "$$raw" }, 0, 10] },
                    {
                        $ifNull: [
                            { $dateToString: { format: "%Y-%m-%d", date: "$tracked_at", onNull: null } },
                            {
                                $ifNull: [
                                    { $dateToString: { format: "%Y-%m-%d", date: "$created_at", onNull: null } },
                                    "",
                                ],
                            },
                        ],
                    },
                ],
            },
        },
    },
    // Numeric odds for sorting: odds can be a number OR a string ("1.95 (55¢)"), so pull the leading decimal.
    _odds: { $let: { vars: { m: { $regexFind: { input: { $toString: { $ifNull: ["$odds", { $ifNull: ["$display_odds", { $ifNull: ["$decimal_odds", ""] }] }] } }, regex: "[0-9]+(?:\\.[0-9]+)?" } } }, in: { $convert: { input: "$$m.match", to: "double", onError: 0, onNull: 0 } } } },
};

// Server-side pagination over the nested bets array (across overflow docs). Only computes the
// derived fields the active query needs, so a default date-sorted page stays ~150ms on 20k bets.
async function paginatedBets(userId: string | number, sp: URLSearchParams) {
    const client = await getMongoClient();
    const { dbName } = getMongoConfig();
    const col = client.db(dbName).collection("user_tracked_bets");
    const normalized = normalizeUserId(userId);

    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(sp.get("pageSize") || "25", 10) || 25));
    const sort = sp.get("sort") || "date";
    const dir = sp.get("dir") === "asc" ? 1 : -1;

    const { match, needs } = buildBetMatch(sp);
    const sortField = ({ date: "_ts", match: "_match", selection: "_sel", status: "_status", stake: "_stake", returns: "_returns", odds: "_odds" } as any)[sort] || "_ts";
    needs.add("_ts");
    if (["_match", "_sel", "_status", "_stake", "_returns", "_odds"].includes(sortField)) needs.add(sortField);

    const pipeline: any[] = [
        { $match: { $or: [{ user_id: normalized }, { user_id: String(userId) }, { linked_app_user_id: String(userId) }] } },
        { $project: { bets: 1 } },
        { $unwind: "$bets" },
        { $replaceRoot: { newRoot: "$bets" } },
        { $addFields: Object.fromEntries([...needs].map((k) => [k, COMPUTED[k]])) },
    ];
    if (match) pipeline.push({ $match: match });

    const projection = Object.fromEntries(LIST_FIELDS.map((f) => [f, 1]));
    // When sorting by date, sortField IS _ts, so a `{ _ts: dir, _ts: -1 }` literal would collide
    // (duplicate key -> last wins -> always desc). Only add _ts as a tiebreaker for OTHER columns.
    const sortSpec = sortField === "_ts" ? { _ts: dir } : { [sortField]: dir, _ts: -1 };
    pipeline.push({
        $facet: {
            data: [{ $sort: sortSpec }, { $skip: (page - 1) * pageSize }, { $limit: pageSize }, { $project: projection }],
            total: [{ $count: "n" }],
        },
    });

    const res = await col.aggregate(pipeline, { allowDiskUse: true }).toArray();
    const facet = res[0] || { data: [], total: [] };
    return { bets: facet.data || [], total: facet.total?.[0]?.n || 0, page, pageSize };
}

// Companion to the paginated table: distinct filter-menu options (unfiltered, so the menus
// stay complete) + the FULL list of matching bet_ids for the current filter (so "select all"
// works across pages). Fetched once per bankroll/filter change, not per page.
async function betsMeta(userId: string | number, sp: URLSearchParams) {
    const client = await getMongoClient();
    const { dbName } = getMongoConfig();
    const col = client.db(dbName).collection("user_tracked_bets");
    const normalized = normalizeUserId(userId);

    // bankroll-only scope for the filter MENUS (so options stay complete regardless of the
    // other active filters); the FULL filter is used only for the select-all id list.
    const bankrollSp = new URLSearchParams();
    if (sp.get("bankroll")) bankrollSp.set("bankroll", sp.get("bankroll")!);
    if (sp.get("known")) bankrollSp.set("known", sp.get("known")!);
    const { match: bankrollMatch } = buildBetMatch(bankrollSp);
    const { match: fullMatch, needs } = buildBetMatch(sp);

    const pipeline: any[] = [
        { $match: { $or: [{ user_id: normalized }, { user_id: String(userId) }, { linked_app_user_id: String(userId) }] } },
        { $project: { bets: 1 } },
        { $unwind: "$bets" },
        { $replaceRoot: { newRoot: "$bets" } },
    ];
    needs.add("_status");  // the pending-bets summary always needs it
    pipeline.push({ $addFields: Object.fromEntries([...needs].map((k) => [k, COMPUTED[k]])) });
    const menu = (field: string) => [
        ...(bankrollMatch ? [{ $match: bankrollMatch }] : []),
        { $group: { _id: `$${field}` } }, { $match: { _id: { $nin: [null, ""] } } },
    ];
    pipeline.push({
        $facet: {
            sports: menu("sport"),
            bookmakers: menu("bookmaker"),
            markets: menu("market"),
            betTypes: menu("bet_type"),
            ids: [...(fullMatch ? [{ $match: fullMatch }] : []), { $project: { _id: 0, bet_id: 1 } }],
            // Bankroll-scoped PENDING bets (small set) for the Active-bets/stake/potential tiles -
            // odds can be a string ("1.95 (55¢)"), so the client parses; we just ship the fields.
            pending: [
                ...(bankrollMatch ? [{ $match: bankrollMatch }] : []),
                { $match: { _status: "pending" } },
                { $project: { _id: 0, stake: 1, actual_stake: 1, units_staked: 1, odds: 1, display_odds: 1, status: 1 } },
            ],
        },
    });
    const res = (await col.aggregate(pipeline, { allowDiskUse: true }).toArray())[0] || {};
    const vals = (a: any[]) => (a || []).map((x) => x._id).filter(Boolean).sort();
    return {
        facets: {
            sports: vals(res.sports), bookmakers: vals(res.bookmakers),
            markets: vals(res.markets), betTypes: vals(res.betTypes),
        },
        ids: (res.ids || []).map((x: any) => x.bet_id).filter(Boolean),
        pendingBets: res.pending || [],
    };
}

// Distinct tag vocabulary for the tag autocomplete - was collected client-side from the full
// bet list. Mirrors collectTagsFromBets: array `tags`, comma-split string `tags`, + `sync_label`.
async function distinctTags(userId: string | number) {
    const client = await getMongoClient();
    const { dbName } = getMongoConfig();
    const col = client.db(dbName).collection("user_tracked_bets");
    const normalized = normalizeUserId(userId);
    const pipeline = [
        { $match: { $or: [{ user_id: normalized }, { user_id: String(userId) }, { linked_app_user_id: String(userId) }] } },
        { $project: { bets: 1 } },
        { $unwind: "$bets" },
        {
            $project: {
                vals: {
                    // Comma is a separator for EVERY source - split each array element and the
                    // sync_label on "," and flatten, so "Inplay Free's, Cyclops" is two tags.
                    $concatArrays: [
                        { $reduce: {
                            input: { $cond: [{ $isArray: "$bets.tags" }, "$bets.tags",
                                { $cond: [{ $eq: [{ $type: "$bets.tags" }, "string"] }, ["$bets.tags"], []] }] },
                            initialValue: [],
                            in: { $concatArrays: ["$$value", { $split: [{ $toString: "$$this" }, ","] }] },
                        } },
                        { $cond: [{ $and: [{ $ne: ["$bets.sync_label", null] }, { $ne: ["$bets.sync_label", ""] }] },
                            { $split: [{ $toString: "$bets.sync_label" }, ","] }, []] },
                    ],
                },
            },
        },
        { $unwind: "$vals" },
        { $project: { v: { $trim: { input: { $toString: "$vals" } } } } },
        { $match: { v: { $nin: [null, ""] } } },
        { $group: { _id: "$v" } },
    ];
    const res = await col.aggregate(pipeline, { allowDiskUse: true }).toArray();
    return res.map((x: any) => x._id).filter(Boolean).sort((a: string, b: string) => String(a).localeCompare(String(b)));
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

        const sp = new URL(_request.url).searchParams;
        // Single bet by id - for the edit form, which otherwise fetched the whole 40MB list
        // just to .find() one bet. Positional projection (bets.$) returns ONLY the matching
        // element (no $unwind), so it's a single fast doc read.
        const betId = (sp.get("betId") || "").trim();
        if (betId) {
            const client = await getMongoClient();
            const { dbName } = getMongoConfig();
            const col = client.db(dbName).collection("user_tracked_bets");
            const normalized = normalizeUserId(userId);
            const doc = await col.findOne(
                { $and: [{ $or: [{ user_id: normalized }, { user_id: String(userId) }, { linked_app_user_id: String(userId) }] }, { "bets.bet_id": betId }] },
                { projection: { "bets.$": 1 } }
            );
            return NextResponse.json({ bet: (doc as any)?.bets?.[0] || null }, { headers: { "Cache-Control": "no-store" } });
        }
        if (sp.get("tags") === "1") {
            const tags = await distinctTags(userId);
            return NextResponse.json({ tags }, { headers: { "Cache-Control": "no-store" } });
        }
        if (sp.get("lite") === "1") {
            const result = await liteBets(userId, sp);
            return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
        }
        // Opt-in paginated mode - leaves the full-list path (below) fully intact.
        if (sp.get("meta") === "1") {
            const meta = await betsMeta(userId, sp);
            return NextResponse.json(meta, { headers: { "Cache-Control": "no-store" } });
        }
        if (sp.has("page") || sp.get("paginated") === "1") {
            const result = await paginatedBets(userId, sp);
            return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
        }

        const doc = await findTrackedBetsDoc(userId);
        return NextResponse.json(
            {
                bets: Array.isArray(doc?.bets) ? doc.bets : [],
                bankrolls: Array.isArray(doc?.bankrolls) ? doc.bankrolls : [],
                updated_at: doc?.updated_at || doc?.last_updated || null,
            },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        console.error("user bets route failed", error);
        return NextResponse.json({ error: "Failed to fetch user bets" }, { status: 500 });
    }
}
