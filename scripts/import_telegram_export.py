#!/usr/bin/env python3
"""Import bets from a Telegram Desktop HTML export into user_tracked_bets."""
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from html import unescape

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def parse_export(html_path):
    html = open(html_path, encoding="utf-8").read()
    bets = []
    for m in re.finditer(
        r'title="(\d{2})\.(\d{2})\.(\d{4}) (\d{2}:\d{2}:\d{2})[^"]*".*?<div class="text">(.*?)</div>',
        html,
        re.S,
    ):
        d, mo, y, tm, body = m.group(1), m.group(2), m.group(3), m.group(4), unescape(re.sub(r"<[^>]+>", "\n", m.group(5)))
        posted = f"{y}-{mo}-{d}"
        if not any(k in body for k in ("Asian", "Stake:", "Bookmaker Odds", "Min odds", "⭐️", "⛳", "⚽️", "Spread")):
            continue
        if "http" not in body and "bet365" not in body.lower():
            continue

        stake_m = re.search(r"(?:💰 Stake:|^|\n)(\d+(?:\.\d+)?)u", body)
        stake = stake_m.group(1) if stake_m else "1"
        odds_m = re.search(r"@\s*([\d.]+)", body)
        odds = odds_m.group(1) if odds_m else ""
        sel_m = re.search(r"⭐️\s*([^\n@]+?)\s*@", body) or re.search(r"⛳\s*([^\n]+)", body) or re.search(r"⚽️\s*([^\n]+)", body)
        selection = sel_m.group(1).strip() if sel_m else ""
        match_m = re.search(r"🏟\s*([^\n]+)", body)
        match = match_m.group(1).strip() if match_m else ""
        date_m = re.search(r"[📅⏰]\s*(\d{2} \w{3} \d{2})\s*(\d{2}:\d{2})", body)
        ev_date = ev_time = ""
        if date_m:
            dt = datetime.strptime(f"{date_m.group(1)} {date_m.group(2)}", "%d %b %y %H:%M")
            ev_date = dt.strftime("%Y-%m-%d")
            ev_time = dt.strftime("%H:%M")
        market = ""
        for line in body.split("\n"):
            line = line.strip()
            if any(line.startswith(x) for x in ("Asian", "Full Time", "Both Teams", "Goal Line", "Match Goals", "1st Half", "Spread")):
                market = line
                break
        if not market:
            mkt = re.match(r"^(\d+(?:\.\d+)?)u\s*\n(.+)", body)
            if mkt:
                market = mkt.group(2).strip().split("\n")[0]
        league = ""
        league_m = re.search(r"(?:🇪🇺|🇧🇬|🇩🇰|🇳🇱|🇮🇸|🏴[^\n]*)\s*([^\n]+)", body)
        if league_m:
            league = league_m.group(1).strip()

        if not match or not selection:
            continue
        bets.append({
            "posted": posted,
            "searchEvent": match,
            "selection": selection,
            "market": market or "Unknown",
            "odds": odds,
            "stake": stake,
            "date": ev_date,
            "time": ev_time,
            "league": league,
            "bookmaker": "Bet365",
        })
    return bets


def main():
    payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    html_path = payload.get("htmlPath") or payload.get("html_path")
    user_id = payload.get("userId") or payload.get("user_id") or 1046187426
    bankroll_id = payload.get("bankrollId") or payload.get("bankroll_id") or "84fbba71-8751-4a56-be63-3aa0f36a3e52"
    sync_label = payload.get("syncLabel") or "EV+ VIP export"
    dry_run = payload.get("dryRun") is True

    if not html_path or not os.path.exists(html_path):
        print(json.dumps({"error": f"HTML export not found: {html_path}"}))
        sys.exit(1)

    bets = parse_export(html_path)
    save_script = os.path.join(SCRIPT_DIR, "save_bet.py")
    imported = 0
    skipped = 0
    errors = []

    for bet in bets:
        req = {
            "userId": user_id,
            "bankrollId": bankroll_id,
            "searchEvent": bet["searchEvent"],
            "selection": bet["selection"],
            "market": bet["market"],
            "odds": bet["odds"],
            "displayOdds": bet["odds"],
            "stake": bet["stake"],
            "date": bet["date"],
            "time": bet["time"],
            "league": bet["league"],
            "bookmaker": bet["bookmaker"],
            "syncLabel": sync_label,
            "tags": [sync_label],
            "status": "pending",
        }
        if dry_run:
            imported += 1
            continue
        proc = subprocess.run(
            ["python3", save_script, json.dumps(req)],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            errors.append({"bet": bet["searchEvent"], "stderr": proc.stderr[-200:]})
            continue
        try:
            result = json.loads(proc.stdout.strip().split("\n")[-1])
            if result.get("duplicate"):
                skipped += 1
            elif result.get("success"):
                imported += 1
            else:
                errors.append({"bet": bet["searchEvent"], "result": result})
        except json.JSONDecodeError:
            errors.append({"bet": bet["searchEvent"], "raw": proc.stdout[-200:]})

    print(json.dumps({
        "success": True,
        "parsed": len(bets),
        "imported": imported,
        "skipped_duplicates": skipped,
        "errors": errors[:10],
    }))


if __name__ == "__main__":
    main()