import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/api/events/search/route.ts"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """    try {
        const items = await getCachedEvents();
        const suggestions = items
            .map((item) => ({ ...item, score: scoreEvent(query, item) }))
            .filter((item) => item.score && item.score > 0)
            .sort((a, b) => {
                if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
            })
            .slice(0, 8)
            .map(({ score, ...item }) => item);

        return NextResponse.json({
            suggestions,
            cacheAgeMs: Date.now() - cache.loadedAt,
        });"""

new_logic = """    try {
        const items = await getCachedEvents();
        let suggestions = items
            .map((item) => ({ ...item, score: scoreEvent(query, item) }))
            .filter((item) => item.score && item.score > 0)
            .sort((a, b) => {
                if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
            })
            .slice(0, 8)
            .map(({ score, ...item }) => item);

        // If not enough suggestions from cache, query MongoDB directly for older past matches
        if (suggestions.length < 5) {
            try {
                const client = await getMongoClient();
                const { dbName } = getMongoConfig();
                const db = client.db(dbName);
                
                const qTokens = query.split(/\s+vs\s+|\s+/i).filter(Boolean);
                if (qTokens.length >= 2) {
                    const regex = new RegExp(qTokens.join(".*"), "i");
                    const pastDocs = await db.collection("all_positive_team_alerts").find(
                        { Match: { $regex: regex } },
                        { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
                    ).toArray();
                    
                    const seenIds = new Set(suggestions.map(s => s.searchEvent));
                    for (const doc of pastDocs) {
                        const parts = String(doc.Match).split(' vs ');
                        if (parts.length !== 2) continue;
                        const home = parts[0].trim();
                        const away = parts[1].trim();
                        const se = `${home} vs ${away}`;
                        if (seenIds.has(se)) continue;
                        seenIds.add(se);
                        
                        suggestions.push({
                            id: `dynamic-${doc._id}`,
                            searchEvent: se,
                            home,
                            away,
                            date: String(doc.Date || ""),
                            time: String(doc.Time || "00:00"),
                            country: String(doc.Country || "").trim(),
                            league: String(doc.League || "").trim(),
                            leagueSlug: "",
                            sport: "football",
                            source: "past_alerts_dynamic",
                            aliases: [],
                        });
                    }
                }
            } catch (e) {
                console.error("Dynamic past query error:", e);
            }
        }

        return NextResponse.json({
            suggestions,
            cacheAgeMs: Date.now() - cache.loadedAt,
        });"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched route.ts successfully")
else:
    print("Marker not found")
