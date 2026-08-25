#!/usr/bin/env python3
"""One-off migration for full-cover multiples saved as plain accumulators.

Finds multi-bets whose source text or description names a full-cover type
(Trixie, Patent, Yankee, etc.), sets `multiple_type`, recomputes the total
stake from captions like "0.25U (1U total)", and resets them to pending so the
grader can settle them by combination.

Run with --dry-run to preview changes. Run without to apply.
"""

import argparse
import os
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

# Ensure the local PROPPR SharedServices are importable.
sys.path.insert(0, "/Users/zinq/PycharmProjects/Cerebro/PROPPR")

try:
    from SharedServices.tracking.bet_parser import (
        _extract_full_cover_total_stake,
        _normalise_full_cover_type,
        _ms_number_of_bets,
    )
except Exception as exc:  # pragma: no cover
    print(f"WARNING: could not import bet_parser helpers ({exc}); using inline fallbacks.")

    _FULL_COVER_TYPES = {
        "patent": {"include_singles": True, "combo_sizes": [2, 3]},
        "trixie": {"include_singles": False, "combo_sizes": [2, 3]},
        "yankee": {"include_singles": False, "combo_sizes": [2, 3, 4]},
        "lucky 15": {"include_singles": True, "combo_sizes": [2, 3, 4]},
        "canadian": {"include_singles": False, "combo_sizes": [2, 3, 4, 5]},
        "super yankee": {"include_singles": False, "combo_sizes": [2, 3, 4, 5]},
        "lucky 31": {"include_singles": True, "combo_sizes": [2, 3, 4, 5]},
        "heinz": {"include_singles": False, "combo_sizes": [2, 3, 4, 5, 6]},
        "lucky 63": {"include_singles": True, "combo_sizes": [2, 3, 4, 5, 6]},
        "super heinz": {"include_singles": False, "combo_sizes": [2, 3, 4, 5, 6, 7]},
        "goliath": {"include_singles": False, "combo_sizes": [2, 3, 4, 5, 6, 7, 8]},
    }

    def _ms_number_of_bets(bet_type: str, n_selections: int) -> int:
        cfg = _FULL_COVER_TYPES.get((bet_type or "").lower())
        if not cfg:
            return 1
        from itertools import combinations
        count = 0
        if cfg["include_singles"]:
            count += n_selections
        for size in cfg["combo_sizes"]:
            if size <= n_selections:
                count += len(list(combinations(range(n_selections), size)))
        return count

    def _normalise_full_cover_type(btype: str) -> str:
        btype = re.sub(r"\s+", " ", str(btype or "")).strip().lower()
        aliases = {
            "lucky15": "lucky 15", "lucky 15": "lucky 15",
            "lucky31": "lucky 31", "lucky 31": "lucky 31",
            "lucky63": "lucky 63", "lucky 63": "lucky 63",
            "superyankee": "super yankee", "super yankee": "super yankee",
            "superheinz": "super heinz", "super heinz": "super heinz",
        }
        return aliases.get(btype, btype)

    _FC_TOTAL_RE = re.compile(
        r"(?P<per_bet>[\d.]+)\s*(?:u|units?)\s*(?:each)?\s*\(\s*(?P<total>[\d.]+)\s*(?:u|units?)\s*total\s*\)"
        r"|"
        r"(?P<total2>[\d.]+)\s*(?:u|units?)\s*\(\s*(?P<per_bet2>[\d.]+)\s*(?:u|units?)?\s*(?:x|\*)\s*[\d.]+\s*(?:bets?)?(?:\s+\w+)?\s*\)"
        r"|"
        r"\(\s*(?P<total3>[\d.]+)\s*(?:u|units?)\s*total\s*\)",
        re.I | re.S,
    )

    def _extract_full_cover_total_stake(text: str, fc_type: str, n_legs: int) -> Tuple[Optional[float], Optional[float]]:
        flat = re.sub(r"[,+]", " ", text or "")
        per_bet: Optional[float] = None
        total: Optional[float] = None
        m = _FC_TOTAL_RE.search(flat)
        if m:
            try:
                per_bet = float(m.group("per_bet") or m.group("per_bet2")) if (m.group("per_bet") or m.group("per_bet2")) else None
            except (TypeError, ValueError):
                per_bet = None
            try:
                total = float(m.group("total") or m.group("total2") or m.group("total3")) if (m.group("total") or m.group("total2") or m.group("total3")) else None
            except (TypeError, ValueError):
                total = None
        if per_bet is None and total is None:
            bare = re.search(r"([\d.]+)\s*(?:u|units?)\b", flat, re.I)
            if bare:
                try:
                    per_bet = float(bare.group(1))
                except (TypeError, ValueError):
                    per_bet = None
        if per_bet is not None and total is None and fc_type and n_legs >= 2:
            n_bets = _ms_number_of_bets(fc_type, n_legs)
            if n_bets > 1:
                total = round(per_bet * n_bets, 6)
        return per_bet, total


_FULL_COVER_WORDS = {
    "patent", "trixie", "yankee", "lucky 15", "lucky15",
    "canadian", "super yankee", "superyankee",
    "lucky 31", "lucky31", "heinz", "lucky 63", "lucky63",
    "super heinz", "superheinz", "goliath",
}


def _detect_full_cover_type(text: str) -> Optional[str]:
    t = (text or "").lower()
    # Prefer longer/multi-word matches first to avoid "super yankee" matching "yankee".
    for name in sorted(_FULL_COVER_WORDS, key=len, reverse=True):
        if re.search(r"\b" + re.escape(name) + r"\b", t):
            return _normalise_full_cover_type(name)
    return None


def _safe_float(value: Any) -> float:
    try:
        return float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate mis-saved full-cover multiples.")
    parser.add_argument("--dry-run", action="store_true", help="Print changes without writing.")
    parser.add_argument("--user-id", type=str, default="", help="Limit to one user_id.")
    args = parser.parse_args()

    uri = (
        os.getenv("MONGODB_URI_OVERRIDE")
        or os.getenv("MONGO_CONNECTION_STRING")
        or os.getenv("MONGODB_CONNECTION_STRING")
        or os.getenv("MONGODB_URI_PRODUCTION")
        or os.getenv("MONGODB_URI")
        or "mongodb://127.0.0.1:27017"
    )
    db_name = os.getenv("MONGO_DATABASE") or os.getenv("MONGODB_DATABASE") or "Cerebro"

    from pymongo import MongoClient, UpdateOne

    client = MongoClient(uri)
    db = client[db_name]
    bets_col = db["user_tracked_bets"]
    queue_col = db["telegram_import_queue"]

    query: Dict[str, Any] = {"bets": {"$elemMatch": {"bet_type": "multiple", "$or": [{"multiple_type": {"$exists": False}}, {"multiple_type": ""}]}}}
    if args.user_id:
        query["user_id"] = int(args.user_id) if args.user_id.isdigit() else args.user_id

    docs = list(bets_col.find(query, {"user_id": 1, "bets": 1}))
    print(f"Found {len(docs)} user docs with candidate multi-bets.")

    updates: List[UpdateOne] = []
    affected_users: set = set()
    changed = 0

    for doc in docs:
        user_id = doc["user_id"]
        for bet in doc.get("bets") or []:
            if bet.get("bet_type") != "multiple":
                continue
            if bet.get("multiple_type"):
                continue

            legs = bet.get("multi_bet_selections") or []
            if not isinstance(legs, list) or len(legs) < 2:
                continue

            # Gather text sources to search for the full-cover type name.
            text_sources = [
                bet.get("selection", ""),
                bet.get("multi_bet_description", ""),
            ]
            source_key = bet.get("source_message_key") or ""
            if source_key:
                queue_doc = queue_col.find_one({"message_key": source_key}, {"text": 1, "ocr_text": 1})
                if queue_doc:
                    text_sources.append(queue_doc.get("text", ""))
                    text_sources.append(queue_doc.get("ocr_text", ""))

            combined_text = "\n".join(str(s) for s in text_sources)
            fc_type = _detect_full_cover_type(combined_text)
            if not fc_type:
                continue

            # Determine the total stake. Start from the currently stored stake and
            # override it if the caption clearly gives a per-bet/total breakdown.
            current_stake = _safe_float(bet.get("recommended_stake") or bet.get("units_staked") or bet.get("actual_stake"))
            per_bet, total = _extract_full_cover_total_stake(combined_text, fc_type, len(legs))
            new_stake = total if total is not None else current_stake

            if args.dry_run:
                print(
                    f"[DRY-RUN] user={user_id} bet_id={bet.get('bet_id')} "
                    f"type={fc_type} legs={len(legs)} "
                    f"old_stake={current_stake} new_stake={new_stake} "
                    f"selection={bet.get('selection')!r}"
                )
                changed += 1
                continue

            affected_users.add(user_id)
            changed += 1

            update_fields = {
                "bets.$.multiple_type": fc_type,
                "bets.$.recommended_stake": new_stake,
                "bets.$.units_staked": new_stake,
                "bets.$.actual_stake": new_stake,
                "bets.$.status": "pending",
                "bets.$.returns": 0.0,
                "bets.$.profit_loss": 0.0,
                "bets.$.settled_at": None,
                "bets.$.manual_override": False,
                "bets.$.manually_graded_at": None,
                "bets.$.result_changed_from": bet.get("status"),
                "bets.$.result_changed_reason": "migrated_to_full_cover_multiple",
                "bets.$.result_changed_at": None,
                "bets.$.reset_for_regrade": True,
                "bets.$.reset_reason": "migrated_to_full_cover_multiple",
                "bets.$.reset_at": None,
            }
            # Reset nested result_tracking status.
            update_fields["bets.$.result_tracking.result_status"] = "pending"

            # If the selection is a generic accumulator label, replace it with the full-cover name.
            sel = str(bet.get("selection") or "").lower()
            if sel in ("treble", "double", "accumulator", "multi-bet", "bet builder", "multi bet"):
                update_fields["bets.$.selection"] = fc_type.title().replace("Lucky15", "Lucky 15").replace("Lucky31", "Lucky 31").replace("Lucky63", "Lucky 63").replace("Superyankee", "Super Yankee").replace("Superheinz", "Super Heinz")

            updates.append(
                UpdateOne(
                    {"user_id": user_id, "bets.bet_id": bet.get("bet_id")},
                    {"$set": update_fields},
                )
            )

    if not args.dry_run and updates:
        result = bets_col.bulk_write(updates)
        print(f"Applied {result.modified_count} bet updates across {len(affected_users)} users.")
        # Trigger priority grading for affected users.
        try:
            from SharedServices.tracking.bet_tracking_system import BetTrackingSystem
            bts = BetTrackingSystem(uri, db_name)
            for uid in affected_users:
                try:
                    bts.auto_settle_user_bets(uid)
                    print(f"  → regraded user {uid}")
                except Exception as exc:
                    print(f"  → regrade failed for user {uid}: {exc}")
        except Exception as exc:
            print(f"Could not trigger regrade: {exc}")
    elif args.dry_run:
        print(f"Dry-run complete: {changed} bets would be updated.")
    else:
        print("No full-cover candidates found; nothing to migrate.")

    client.close()


if __name__ == "__main__":
    main()
