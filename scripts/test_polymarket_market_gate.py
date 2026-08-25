"""apply_polymarket_source must not adopt a NEIGHBOURING market's identity.

The fuzzy source lookup is event-dominated (team tokens + date clear its threshold on
their own), so it routinely returns a different market of the right game. Anything that
identifies a market may only be copied when the market itself is confirmed.

    python3 test_polymarket_market_gate.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from save_bet import apply_polymarket_source, polymarket_market_confirms  # noqa: E402

FAILS = []


def check(name, got, want):
    ok = got == want
    print("%-56s %s  got=%r" % (name, "PASS" if ok else "FAIL", got))
    if not ok:
        FAILS.append(name)


# The live failure: an NRFI bet fuzzy-matched "Total Runs Over/Under" on the same game.
NRFI_BET = {
    "match": "Kansas City Royals vs Minnesota Twins", "market": "NRFI",
    "selection": "Yes", "date": "2026-08-05",
}
TOTAL_RUNS_SOURCE = {
    "question": "Total Runs Over/Under", "market_name": "Total Runs Over/Under",
    "home": "Kansas City Royals", "away": "Minnesota Twins",
    "polymarket_market_id": "3317940",
    "condition_id": "0xd33764afdcf9d7fabc8e17cda7c55cf5707cec8a56cb02b267ed2a24a008ba9c",
    "token_id": "99455216005177459154076127528739056671392532208824338598267899676743497736829",
    "polymarket_url": "https://polymarket.com/event/mlb-min-kc-2026-08-04",
    "sharp_source": "PIN", "sharp_odds": {"hdp": 9.5, "over": "2.07", "under": "1.8"},
    "market_hdp": 9.5, "bet_side": "under", "event_id": 63299399,
    "bookmaker_odds": {"over": 2.128, "under": 1.8519, "hdp": 9.5},
    "result_tracking": {"status": "won", "market_resolution": {"outcome": "Over"}},
}

check("wrong market is not confirmed",
      polymarket_market_confirms(TOTAL_RUNS_SOURCE, NRFI_BET), False)

bet = dict(NRFI_BET)
out = apply_polymarket_source(bet, dict(TOTAL_RUNS_SOURCE), "polymarket_alerts")
check("returns the bet doc (caller returns it through)", out is bet, True)
check("no foreign market id", bet.get("polymarket_market_id"), None)
check("no foreign condition id", bet.get("condition_id"), None)
check("no foreign token id", bet.get("token_id"), None)
check("no foreign line", bet.get("market_hdp"), None)
check("no foreign side", bet.get("bet_side"), None)
check("no foreign sharp odds", bet.get("entry_sharp_odds"), None)
check("no foreign book odds", bet.get("entry_book_odds"), None)
check("no foreign resolution", (bet.get("result_tracking") or {}).get("polymarket_resolution"), None)
check("scope recorded as event-only", bet.get("polymarket_source_scope"), "event")
# Event-level facts are true of every market on the game, so they still apply.
check("event-level url still adopted", bet.get("polymarket_url"),
      "https://polymarket.com/event/mlb-min-kc-2026-08-04")

# The CORRECT market for the same bet must still be adopted in full.
NRFI_SOURCE = dict(TOTAL_RUNS_SOURCE)
NRFI_SOURCE.update({"question": "Run Scored In The First Inning", "market_name": "NRFI",
                    "polymarket_market_id": "3201575", "market_hdp": 0.5,
                    "bet_side": "yes", "sharp_odds": {"hdp": 0.5, "yes": "2.08"}})
bet2 = dict(NRFI_BET)
apply_polymarket_source(bet2, NRFI_SOURCE, "polymarket_alerts")
check("right market IS confirmed", polymarket_market_confirms(NRFI_SOURCE, NRFI_BET), True)
check("right market id adopted", bet2.get("polymarket_market_id"), "3201575")
check("right sharp line adopted", bet2.get("market_hdp"), 0.5)
check("scope recorded as market", bet2.get("polymarket_source_scope"), "market")

# A player prop is identified by its player as much as its stat wording.
PROP_BET = {"match": "New York Yankees vs St. Louis Cardinals", "market": "Player Strikeouts",
            "player_name": "Ryan Weathers", "selection": "Ryan Weathers Over 5.5"}
check("player prop matches on the player",
      polymarket_market_confirms({"question": "Player Props - Ryan Weathers (Strikeouts)"}, PROP_BET), True)
check("other player's prop is rejected",
      polymarket_market_confirms({"question": "Player Props - Cody Bellinger (Hits)"}, PROP_BET), False)

# An id-level hit is the bet's own market by construction, whatever the wording.
check("matching condition id confirms regardless of wording",
      polymarket_market_confirms({"question": "Some Renamed Market", "condition_id": "0xABC"},
                                 {"market": "NRFI", "condition_id": "0xabc"}), True)
# Unconfirmable must fail CLOSED — a missing id is recoverable, a wrong one misgrades.
check("blank market cannot confirm",
      polymarket_market_confirms({"question": "Total Runs Over/Under"}, {"market": ""}), False)

print("\n" + ("ALL PASS" if not FAILS else "FAILURES: %r" % FAILS))
sys.exit(1 if FAILS else 0)
