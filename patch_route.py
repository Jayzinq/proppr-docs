import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/api/events/search/route.ts"
with open(filepath, "r") as f:
    content = f.read()

old_logic_1 = """        db.collection("all_positive_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),
        db.collection("all_positive_ev_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),
        db.collection("all_positive_team_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),
    ]);"""

new_logic_1 = """        db.collection("all_positive_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),
        db.collection("all_positive_team_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),
    ]);"""

old_logic_2 = """                    const [docs1, docs2, docs3] = await Promise.all([
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

new_logic_2 = """                    const [docs1, docs3] = await Promise.all([
                        db.collection("all_positive_alerts").find(
                            { Match: { $regex: regex } },
                            { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
                        ).toArray(),
                        db.collection("all_positive_team_alerts").find(
                            { Match: { $regex: regex } },
                            { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
                        ).toArray()
                    ]);
                    const pastDocs = [...docs1, ...docs3];"""

if old_logic_1 in content and old_logic_2 in content:
    content = content.replace(old_logic_1, new_logic_1).replace(old_logic_2, new_logic_2)
    # Also fix the array destructuring `const [docs, teamMappings, leagueMappings, alertsDocs, evDocs, teamDocs] = await Promise.all([`
    content = content.replace("const [docs, teamMappings, leagueMappings, alertsDocs, evDocs, teamDocs] = await Promise.all([", "const [docs, teamMappings, leagueMappings, alertsDocs, teamDocs] = await Promise.all([")
    
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched route.ts successfully")
else:
    print("Markers not found in route.ts")
