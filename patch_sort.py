import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/api/events/search/route.ts"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """        db.collection("all_positive_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, limit: 5000 }).toArray(),
        db.collection("all_positive_ev_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, limit: 5000 }).toArray(),
        db.collection("all_positive_team_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, limit: 5000 }).toArray(),"""

new_logic = """        db.collection("all_positive_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),
        db.collection("all_positive_ev_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),
        db.collection("all_positive_team_alerts").find({ created_at: { $gte: pastDate } }, { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 15000 }).toArray(),"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched loadEvents to sort by created_at -1 and increase limit")
else:
    print("Marker not found")
