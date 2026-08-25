#!/usr/bin/env python3
"""One-off fix for Only Goals bets with wrong selections/sport."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from save_bet import format_goalscorer_selection, normalize_goalscorer_fields

import certifi
import pymongo
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "PROPPR", ".env"))

USER_ID = 1046187426
BANKROLL_ID = "1bdc59ed-7393-4705-9c9d-623d344f97b0"

FIXES = {
    "b83da476": ("Max Andersson", ""),
    "6056fe84": ("Simon Strand", ""),
    "a30a2951": ("Mikael Anderson", ""),
    "0d594d20": ("Silas Andersen", ""),
    "0575f015": ("Bruno Fernandes", ""),
    "72e21ae4": ("Renato Veiga", "Header"),
    "11268b65": ("Ronie Carrillo", ""),
}


def main():
    conn = os.getenv("MONGODB_URI_DEVELOPMENT") or os.getenv("MONGODB_URI_PRODUCTION")
    if not conn:
        print("No Mongo connection string")
        sys.exit(1)

    try:
        client = pymongo.MongoClient(conn, tlsCAFile=certifi.where())
    except (TypeError, pymongo.errors.ConfigurationError):
        client = pymongo.MongoClient(conn)

    col = client["Cerebro"]["user_tracked_bets"]
    doc = col.find_one({"user_id": USER_ID})
    if not doc:
        print("User not found")
        sys.exit(1)

    updated = 0
    for bet in doc.get("bets", []):
        bet_id = bet.get("bet_id", "")
        prefix = bet_id[:8] if bet_id else ""
        if prefix not in FIXES:
            continue
        if bet.get("bankroll_id") != BANKROLL_ID:
            continue

        player, goal_type = FIXES[prefix]
        selection = format_goalscorer_selection(player, goal_type) if goal_type else player

        result = col.update_one(
            {"user_id": USER_ID, "bets.bet_id": bet_id},
            {"$set": {
                "bets.$.selection": selection,
                "bets.$.player_name": player,
                "bets.$.sport": "Football",
                "bets.$.market": "Player Goals",
            }},
        )
        if result.modified_count:
            updated += 1
            print(f"Fixed {bet_id}: {selection} / Football")
        else:
            print(f"No change for {bet_id} (already correct?)")

    # Also fix duplicate bankroll with sport: None
    ALT_BANKROLL = "8ccbba18-28fb-48b0-af54-295794dd3676"
    for bet in doc.get("bets", []):
        if bet.get("bankroll_id") != ALT_BANKROLL:
            continue
        market = str(bet.get("market", "")).lower()
        if "player goals" not in market and "goalscorer" not in market:
            continue
        if bet.get("sport"):
            continue
        bet_id = bet.get("bet_id")
        if not bet_id:
            continue
        col.update_one(
            {"user_id": USER_ID, "bets.bet_id": bet_id},
            {"$set": {"bets.$.sport": "Football"}},
        )
        print(f"Set sport Football on alt bankroll bet {bet_id[:8]}")

    print(f"Done. Updated {updated} primary bankroll bets.")
    client.close()


if __name__ == "__main__":
    main()