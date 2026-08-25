#!/usr/bin/env python3
"""Import/refresh a MANUAL season-handicap market (books OddsChecker doesn't list).

Usage:
    python3 scripts/import_season_handicap.py <league_key> "<league_label>" <fotmob_league_id> <bookmaker> <<'EOF'
    West Ham +0 @ 19.0
    Wolverhampton +6 @ 19.0
    ...
    EOF

Each line: "<Team> <+/-handicap> @ <decimal odds>". Upserts one doc per
(league_key, bookmaker) into season_handicap_manual - the /season-handicaps
page merges these with the OddsChecker-fed markets automatically.
"""
import re
import sys
from datetime import datetime, timezone

from pymongo import MongoClient

LINE = re.compile(r"^\s*(.+?)\s*([+-]\d+(?:\.\d+)?)\s*@\s*(\d+(?:\.\d+)?)\s*$")


def main() -> int:
    if len(sys.argv) != 5:
        print(__doc__)
        return 1
    league_key, league_label, fotmob_id, bookmaker = sys.argv[1:5]
    selections = []
    for raw in sys.stdin.read().splitlines():
        raw = raw.strip()
        if not raw:
            continue
        m = LINE.match(raw)
        if not m:
            print(f"SKIP unparseable line: {raw!r}")
            continue
        selections.append({"team": m.group(1), "handicap": float(m.group(2)), "odds": float(m.group(3))})
    if not selections:
        print("No selections parsed - nothing written.")
        return 1

    db = MongoClient("mongodb://127.0.0.1:27017/?directConnection=true", serverSelectionTimeoutMS=8000).Cerebro
    now = datetime.now(timezone.utc)
    db.season_handicap_manual.update_one(
        {"league_key": league_key, "bookmaker": bookmaker},
        {"$set": {
            "league_label": league_label,
            "fotmob_league_id": int(fotmob_id),
            "selections": selections,
            "active": True,
            "updated_at": now,
        }, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    print(f"Upserted {league_key}/{bookmaker}: {len(selections)} selections.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
