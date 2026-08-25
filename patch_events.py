import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/api/events/search/route.ts"
with open(filepath, "r") as f:
    content = f.read()

# We need to add queries to all_positive_alerts, all_positive_ev_alerts, and all_positive_team_alerts in loadEvents()
old_logic = """    const [docs, teamMappings, leagueMappings] = await Promise.all([
        db
        .collection("odds_api_events")
        .find(
            { date: { $gte: now }, home: { $type: "string" }, away: { $type: "string" } },
            {
                projection: {
                    _id: 0,
                    id: 1,
                    home: 1,
                    away: 1,
                    league: 1,
                    league_slug: 1,
                    country: 1,
                    date: 1,
                    sport: 1,
                },
                sort: { date: 1 },
                limit: MAX_CACHE_ITEMS,
            }
        )
        .toArray(),"""

new_logic = """    const pastDate = new Date(now.getTime() - 90 * 86_400_000); // Past 90 days
    const [docs, teamMappings, leagueMappings, alertsDocs, evDocs, teamDocs] = await Promise.all([
        db
        .collection("odds_api_events")
        .find(
            { date: { $gte: now }, home: { $type: "string" }, away: { $type: "string" } },
            {
                projection: {
                    _id: 0,
                    id: 1,
                    home: 1,
                    away: 1,
                    league: 1,
                    league_slug: 1,
                    country: 1,
                    date: 1,
                    sport: 1,
                },
                sort: { date: 1 },
                limit: MAX_CACHE_ITEMS,
            }
        )
        .toArray(),"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    
    old_logic2 = """            .toArray(),
    ]);"""
    
    new_logic2 = """            .toArray(),
        db.collection("all_positive_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, limit: 5000 }).toArray(),
        db.collection("all_positive_ev_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, limit: 5000 }).toArray(),
        db.collection("all_positive_team_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, limit: 5000 }).toArray(),
    ]);"""
    
    if old_logic2 in content:
        content = content.replace(old_logic2, new_logic2)
        
        # Now process the past docs
        old_logic3 = """    const items: EventSuggestion[] = [];

    for (const doc of docs) {"""
    
        new_logic3 = """    const items: EventSuggestion[] = [];

    const pastDocs = [...alertsDocs, ...evDocs, ...teamDocs];
    for (const doc of pastDocs) {
        if (!doc.Match) continue;
        const parts = String(doc.Match).split(' vs ');
        if (parts.length !== 2) continue;
        const home = parts[0].trim();
        const away = parts[1].trim();
        if (!home || !away) continue;

        let dateStr = doc.Date;
        let timeStr = doc.Time;
        if (!dateStr) continue;
        
        const key = `${home}|${away}|${dateStr}|${timeStr || '00:00'}`;
        if (seen.has(key)) continue;
        seen.add(key);

        items.push({
            id: `past-${key}`,
            searchEvent: `${home} vs ${away}`,
            home,
            away,
            date: String(dateStr),
            time: String(timeStr || '00:00'),
            country: String(doc.Country || "").trim(),
            league: String(doc.League || "").trim(),
            leagueSlug: "",
            sport: "football",
            source: "past_alerts",
            aliases: [],
        });
    }

    for (const doc of docs) {"""
        if old_logic3 in content:
            content = content.replace(old_logic3, new_logic3)
            with open(filepath, "w") as f:
                f.write(content)
            print("Patched loadEvents to include past fixtures")
        else:
            print("Marker 3 not found")
    else:
        print("Marker 2 not found")
else:
    print("Marker 1 not found")
