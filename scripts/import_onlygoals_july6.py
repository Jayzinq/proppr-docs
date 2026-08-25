#!/usr/bin/env python3
"""Fix EARLY OnlyGoals bets and import missing LATE picks for 2026-07-06."""
import os
import uuid
from datetime import datetime, timezone

import certifi
import pymongo

USER_ID = 1046187426
BANKROLL_ID = "1bdc59ed-7393-4705-9c9d-623d344f97b0"
SYNC_LABEL = "OnlyGoals"

EARLY_FIXES = {
    "b83da476": ("Brommapojkarna vs GAIS", "Max Andersson", "", "6.00", "0.25", "2026-07-06", "18:00", "Sweden", "Allsvenskan"),
    "6056fe84": ("Brommapojkarna vs GAIS", "Simon Strand", "", "8.00", "0.25", "2026-07-06", "18:00", "Sweden", "Allsvenskan"),
    "a30a2951": ("Häcken vs Djurgården", "Mikael Anderson", "", "4.33", "0.50", "2026-07-06", "18:00", "Sweden", "Allsvenskan"),
    "0d594d20": ("Häcken vs Djurgården", "Silas Andersen", "", "7.00", "0.25", "2026-07-06", "18:00", "Sweden", "Allsvenskan"),
    "0575f015": ("Portugal vs Spain", "Bruno Fernandes", "", "5.56", "0.25", "2026-07-06", "20:00", "International", "World Cup"),
    "72e21ae4": ("Portugal vs Spain", "Renato Veiga", "Header", "41.00", "0.10", "2026-07-06", "20:00", "International", "World Cup"),
    "11268b65": ("Universidad Catolica vs Mushuc Runa", "Ronie Carrillo", "", "4.33", "0.50", "2026-07-06", "22:30", "Ecuador", "Serie A"),
}

LATE_NEW = [
    ("Botafogo SP vs Avai FC", "Jean Lucas", "", "5.50", "0.25", "2026-07-06", "23:00", "Brazil", "Serie B", "Bet365"),
    ("Vila Nova vs Sao Bernardo", "Andre Luis", "", "4.75", "0.50", "2026-07-06", "23:00", "Brazil", "Serie B", "Bet365"),
    ("Vila Nova vs Sao Bernardo", "Nathan Camargo", "Header", "41.00", "0.10", "2026-07-06", "23:00", "Brazil", "Serie B", "Bet365"),
    ("Orense vs Tecnico Universitario", "Bagner Delgado", "", "7.50", "0.25", "2026-07-07", "01:00", "Ecuador", "Serie A", "Bet365"),
    ("USA vs Belgium", "Leandro Trossard", "", "4.33", "0.50", "2026-07-07", "01:00", "International", "World Cup", "Bet365"),
    ("USA vs Belgium", "Hans Vanaken", "Header", "19.00", "0.10", "2026-07-07", "01:00", "International", "World Cup", "Bet365"),
]


def selection(player, goal_type):
    return f"{player} ({goal_type})" if goal_type else player


def bet_key(match, player):
    return f"{match.lower()}|{player.lower()}"


def main():
    conn = os.getenv("MONGODB_URI_DEVELOPMENT") or os.getenv("MONGODB_URI_PRODUCTION")
    if not conn:
        print("No Mongo connection string")
        return 1

    try:
        client = pymongo.MongoClient(conn, tlsCAFile=certifi.where())
    except (TypeError, pymongo.errors.ConfigurationError):
        client = pymongo.MongoClient(conn)

    col = client["Cerebro"]["user_tracked_bets"]
    doc = col.find_one({"user_id": USER_ID})
    if not doc:
        print("User not found")
        return 1

    now = datetime.now(timezone.utc)
    existing_keys = {
        bet_key(b.get("match", ""), b.get("player_name") or b.get("selection", ""))
        for b in doc.get("bets", [])
        if b.get("bankroll_id") == BANKROLL_ID
    }

    fixed = 0
    for bet in doc.get("bets", []):
        bid = bet.get("bet_id", "")
        prefix = bid[:8] if bid else ""
        if prefix not in EARLY_FIXES or bet.get("bankroll_id") != BANKROLL_ID:
            continue
        match, player, goal_type, odds, stake, date, time, country, league = EARLY_FIXES[prefix]
        sel = selection(player, goal_type)
        bookmaker = "Polymarket" if "Polymarket" in str(bet.get("bookmaker", "")) or prefix == "0575f015" else "Bet365"
        r = col.update_one(
            {"user_id": USER_ID, "bets.bet_id": bid},
            {"$set": {
                "bets.$.match": match,
                "bets.$.selection": sel,
                "bets.$.player_name": player,
                "bets.$.sport": "Football",
                "bets.$.market": "Player Goals",
                "bets.$.date": date,
                "bets.$.time": time,
                "bets.$.country": country,
                "bets.$.league": league,
                "bets.$.odds": float(odds),
                "bets.$.display_odds": float(odds),
                "bets.$.actual_stake": float(stake),
                "bets.$.units_staked": float(stake),
                "bets.$.recommended_stake": float(stake),
                "bets.$.bookmaker": bookmaker,
            }},
        )
        if r.modified_count:
            fixed += 1
            print(f"Fixed {prefix}: {sel}")

    inserted = 0
    for row in LATE_NEW:
        match, player, goal_type, odds, stake, date, time, country, league, bookmaker = row
        key = bet_key(match, player)
        if key in existing_keys:
            print(f"Skip existing {player} @ {match}")
            continue
        bet_id = str(uuid.uuid4())
        sel = selection(player, goal_type)
        bet_doc = {
            "bet_id": bet_id,
            "alert_id": f"import|{bet_id}",
            "tracked_at": now,
            "date": date,
            "time": time,
            "country": country,
            "league": league,
            "match": match,
            "selection": sel,
            "player_name": player,
            "sport": "Football",
            "market": "Player Goals",
            "bet_direction": "",
            "market_direction": "",
            "odds": float(odds),
            "display_odds": float(odds),
            "recommended_stake": float(stake),
            "units_staked": float(stake),
            "actual_stake": float(stake),
            "bookmaker": bookmaker,
            "bet_type": "single",
            "status": "pending",
            "bankroll_id": BANKROLL_ID,
            "sync_label": SYNC_LABEL,
            "tags": [SYNC_LABEL],
            "source": "web_app",
            "needs_enrichment": True,
            "created_at": now,
        }
        col.update_one(
            {"user_id": USER_ID},
            {"$push": {"bets": bet_doc}, "$set": {"updated_at": now}},
        )
        existing_keys.add(key)
        inserted += 1
        print(f"Inserted {player} @ {match}")

    print(f"Done: fixed={fixed}, inserted={inserted}")
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())