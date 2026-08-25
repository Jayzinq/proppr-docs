#!/usr/bin/env python3
"""Remove semantic duplicate bets from user_tracked_bets, keeping the oldest copy."""
import json
import os
import sys
from datetime import datetime, timezone

import certifi
import pymongo
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(SCRIPT_DIR, "..", "..", "PROPPR", ".env"))
load_dotenv(os.path.join(SCRIPT_DIR, "..", ".env"))

sys.path.insert(0, SCRIPT_DIR)
from save_bet import bet_dedup_key


def _mongo_client():
    conn = (
        os.getenv("MONGODB_URI_OVERRIDE")
        or os.getenv("MONGODB_CONNECTION_STRING")
        or os.getenv("MONGODB_URI_PRODUCTION")
        or os.getenv("MONGODB_URI_DEVELOPMENT")
        or "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&tls=false"
    )
    uri_lower = conn.lower()
    use_tls = ("tls=true" in uri_lower) or ("ssl=true" in uri_lower) or uri_lower.startswith("mongodb+srv://")
    try:
        if use_tls:
            return pymongo.MongoClient(conn, tlsCAFile=certifi.where())
        return pymongo.MongoClient(conn)
    except (TypeError, pymongo.errors.ConfigurationError):
        return pymongo.MongoClient(conn)


def dedupe_user(col, user_id, dry_run=False):
    doc = col.find_one({"user_id": user_id})
    if not doc:
        return {"user_id": user_id, "removed": 0, "kept": 0}

    bets = doc.get("bets", [])
    seen = {}
    remove_ids = []
    for bet in bets:
        key = bet_dedup_key(bet, include_message_key=False)
        if key in seen:
            remove_ids.append(bet.get("bet_id"))
        else:
            seen[key] = bet.get("bet_id")

    if not dry_run and remove_ids:
        col.update_one(
            {"user_id": user_id},
            {
                "$pull": {"bets": {"bet_id": {"$in": remove_ids}}},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    return {"user_id": user_id, "removed": len(remove_ids), "kept": len(bets) - len(remove_ids), "removed_ids": remove_ids}


def main():
    payload = {}
    if len(sys.argv) > 1 and sys.argv[1].strip():
        payload = json.loads(sys.argv[1])

    user_id = payload.get("userId") or payload.get("user_id")
    all_users = payload.get("allUsers") is True or not user_id
    dry_run = payload.get("dryRun") is True

    client = _mongo_client()
    col = client["Cerebro"]["user_tracked_bets"]

    results = []
    if all_users:
        for doc in col.find({}, {"user_id": 1}):
            results.append(dedupe_user(col, doc["user_id"], dry_run=dry_run))
    else:
        uid = int(user_id) if str(user_id).isdigit() else user_id
        results.append(dedupe_user(col, uid, dry_run=dry_run))

    client.close()
    print(json.dumps({
        "success": True,
        "dry_run": dry_run,
        "removed": sum(r["removed"] for r in results),
        "details": results,
    }))


if __name__ == "__main__":
    main()