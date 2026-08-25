import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/api/events/search/route.ts"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """                    const regex = new RegExp(qTokens.join(".*"), "i");
                    const pastDocs = await db.collection("all_positive_team_alerts").find(
                        { Match: { $regex: regex } },
                        { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
                    ).toArray();"""

new_logic = """                    const regex = new RegExp(qTokens.join(".*"), "i");
                    const [docs1, docs2, docs3] = await Promise.all([
                        db.collection("all_positive_alerts").find(
                            { Match: { $regex: regex } },
                            { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
                        ).toArray(),
                        db.collection("all_positive_ev_alerts").find(
                            { Match: { $regex: regex } },
                            { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
                        ).toArray(),
                        db.collection("all_positive_team_alerts").find(
                            { Match: { $regex: regex } },
                            { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
                        ).toArray()
                    ]);
                    const pastDocs = [...docs1, ...docs2, ...docs3];"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched route.ts successfully for all collections")
else:
    print("Marker not found")
