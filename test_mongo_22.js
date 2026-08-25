const { MongoClient } = require('mongodb');
function normalizeText(value) {
    return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function scoreEvent(query, item) {
    const q = normalizeText(query);
    if (!q) return 0;
    const tokens = q.split(" ").filter(Boolean);
    let score = 0;
    const metadata = normalizeText(`${item.league} ${item.country} ${item.leagueSlug}`);
    for (const token of tokens) {
        const home = normalizeText(item.home);
        const away = normalizeText(item.away);
        if (home === token || away === token) score += 90;
        else if (home.startsWith(token) || away.startsWith(token)) score += 65;
        else if (home.includes(token) || away.includes(token)) score += 30;
        else if (metadata.includes(token)) score += 6;
        else return 0;
    }
    const eventTime = Date.parse(`${item.date}T${item.time || "00:00"}:00Z`);
    if (!Number.isNaN(eventTime)) {
        const daysAway = Math.max(0, (eventTime - Date.now()) / 86_400_000);
        score += Math.max(0, 120 - Math.min(daysAway * 5, 120));
    }
    if (item.sport === "football") score += 8;
    if (item.source === "odds_api_events") score += 50;
    return score;
}
async function run() {
    const uri = "mongodb://127.0.0.1:27017/?directConnection=true";
    const client = new MongoClient(uri);
    try {
        const db = client.db("Cerebro");
        const query = "Coco Gauff";
        const qTokens = query.split(/\s+vs\s+|\s+/i).filter(Boolean);
        const regex = new RegExp(qTokens.join("|"), "i");
        const docs = await db.collection("odds_api_events").find({
            $or: [ { home: { $regex: regex } }, { away: { $regex: regex } } ]
        }).toArray();
        for (const doc of docs) {
            let d = doc.date;
            if (d instanceof Date) d = d.toISOString().slice(0, 10);
            else if (typeof d === "string" && d.length >= 10) d = d.slice(0, 10);
            else d = "";
            const item = {
                id: `dynamic-odds-${doc._id}`,
                searchEvent: `${doc.home} vs ${doc.away}`,
                home: doc.home, away: doc.away, date: d, time: doc.time || "00:00",
                country: doc.country, league: doc.league, leagueSlug: "",
                sport: doc.sport, source: "odds_api_events", aliases: []
            };
            item.score = scoreEvent(query, item);
            console.log("Item:", item.searchEvent, "Score:", item.score);
        }
    } finally { await client.close(); }
}
run().catch(console.error);
