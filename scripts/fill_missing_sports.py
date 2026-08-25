#!/usr/bin/env python3
"""Backfill missing sport fields on user_tracked_bets.

Designed to run from cron or via /api/fill-sports. Scans every bet with an empty
sport, infers from match/market/league context, and writes Football etc. back to
Mongo without touching other fields.
"""
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
from save_bet import clean_string, infer_sport_from_bet, normalize_sport_name


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


def _needs_sport(bet):
    return not clean_string(bet.get("sport") or bet.get("event_sport") or bet.get("eventSport") or "")


def _infer_sport(bet):
    source = {
        "league": bet.get("league", ""),
        "country": bet.get("country", ""),
        "match": bet.get("match") or bet.get("searchEvent") or bet.get("fixture_name") or "",
        "fixture_name": bet.get("fixture_name", ""),
        "searchEvent": bet.get("searchEvent") or bet.get("match") or "",
        "market": bet.get("market", ""),
        "selection": bet.get("selection", ""),
        "player_name": bet.get("player_name", ""),
        "multi_bet_description": bet.get("multi_bet_description", ""),
        "multi_bet_selections": bet.get("multi_bet_selections") or [],
    }
    sport = infer_sport_from_bet(source)
    return normalize_sport_name(sport) if sport else ""


def fill_for_user(col, user_id, dry_run=False):
    doc = col.find_one({"user_id": user_id})
    if not doc:
        return {"user_id": user_id, "updated": 0, "skipped": 0}

    updated = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    for bet in doc.get("bets", []):
        if not _needs_sport(bet):
            continue
        sport = _infer_sport(bet)
        if not sport:
            skipped += 1
            continue
        bet_id = bet.get("bet_id")
        if not bet_id:
            skipped += 1
            continue
        if dry_run:
            updated += 1
            continue
        col.update_one(
            {"user_id": user_id, "bets.bet_id": bet_id},
            {"$set": {"bets.$.sport": sport, "bets.$.updated_at": now, "updated_at": now}},
        )
        updated += 1

    return {"user_id": user_id, "updated": updated, "skipped": skipped}


def main():
    payload = {}
    if len(sys.argv) > 1 and sys.argv[1].strip():
        try:
            payload = json.loads(sys.argv[1])
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON payload"}))
            sys.exit(1)

    user_id = payload.get("userId") or payload.get("user_id")
    all_users = payload.get("allUsers") is True or not user_id
    dry_run = payload.get("dryRun") is True

    client = _mongo_client()
    col = client["Cerebro"]["user_tracked_bets"]

    results = []
    if all_users:
        for doc in col.find({}, {"user_id": 1}):
            results.append(fill_for_user(col, doc["user_id"], dry_run=dry_run))
    else:
        uid = int(user_id) if str(user_id).isdigit() else user_id
        results.append(fill_for_user(col, uid, dry_run=dry_run))

    client.close()
    summary = {
        "success": True,
        "dry_run": dry_run,
        "users": len(results),
        "updated": sum(r["updated"] for r in results),
        "skipped": sum(r["skipped"] for r in results),
        "details": results,
    }
    print(json.dumps(summary))


if __name__ == "__main__":
    main()