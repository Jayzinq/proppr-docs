import sys
import os
import json
import re
import logging

# Suppress fotmob_service logs which pollute stdout
logging.getLogger().setLevel(logging.CRITICAL)

# Add Cerebro root to path (local and production)
sys.path.append("/Users/zinq/PycharmProjects/Cerebro")
sys.path.append("/opt")  # If deployed to /opt/PROPPR
sys.path.append("/opt/proppr")

# Deferred FotMob import to speed up script execution when not needed

FLAG_TO_COUNTRY = {
    "🌍": "International",
    "🌎": "International",
    "🌏": "International",
    "🇪🇺": "Europe",
    "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "England",
    "🇪🇸": "Spain",
    "🇩🇪": "Germany",
    "🇮🇹": "Italy",
    "🇫🇷": "France",
    "🇳🇱": "Netherlands",
    "🇵🇹": "Portugal",
    "🇧🇷": "Brazil",
    "🇦🇷": "Argentina",
    "🇺🇸": "USA",
    "🇲🇽": "Mexico",
    "🇸🇦": "Saudi Arabia",
    "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "Scotland",
    "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "Wales",
    "🇧🇪": "Belgium"
}

MARKET_ALIASES = {
    "goal line": "Goal Line",
    "goalline": "Goal Line",
    "total goals": "Total Goals",
    "match goals": "Match Goals",
    "asian cards": "Asian Total Cards",
    "asian total cards": "Asian Total Cards",
    "asian corners": "Asian Corners",
    "asian total corners": "Asian Corners",
    "asian handicap corners": "Asian Handicap Corners",
    "corners asian handicap": "Asian Handicap Corners",
    "corner asian handicap": "Asian Handicap Corners",
    "asian handicap cards": "Asian Handicap Cards",
    "cards asian handicap": "Asian Handicap Cards",
    "card asian handicap": "Asian Handicap Cards",
    "corners": "Team Corners",
    "cards": "Team Cards",
    "fouls": "Player Fouls Committed",
    "fouls committed": "Player Fouls Committed",
    "shots": "Player Shots Total",
    "shots total": "Player Shots Total",
    "shots on target": "Player Shots On Target",
    "sot": "Player Shots On Target",
    "tackles": "Player Tackles",
    "match tackles": "Match Tackles",
    "match shots": "Match Shots",
    "match shots on target": "Match Shots On Target",
    "total points": "Total Points",
    "match total points": "Total Points",
    "match points": "Total Points",
    "total runs": "Total Runs",
    "match total runs": "Total Runs",
    "match runs": "Total Runs",
    "total match cards": "Total Cards",
    "match total cards": "Total Cards",
    "total match corners": "Total Corners",
    "match total corners": "Total Corners",
    "to score or assist": "Player To Score or Assist",
    "score or assist": "Player Score or Assist",
    "player home runs": "Player Home Runs",
    "home runs": "Player Home Runs",
    "player rebounds": "Player Rebounds",
    "rebounds": "Player Rebounds",
    "player points": "Player Points",
    "points": "Player Points",
    "3 point fg": "Player 3 Point FG",
    "three point fg": "Player 3 Point FG",
    "player 3 point fg": "Player 3 Point FG",
}

BOOKMAKER_ALIASES = {
    "365": "bet365",
    "bet365": "bet365",
    "bet 365": "bet365",
    "bfex": "betfair exchange",
    "bf exchange": "betfair exchange",
    "betfair exchange": "betfair exchange",
    "betfair": "betfair",
    "betmgm": "betmgm",
    "betvic": "betvictor",
    "betvictor": "betvictor",
    "ladb": "ladbrokes",
    "ladbrokes": "ladbrokes",
    "paddy": "paddy power",
    "paddy power": "paddy power",
    "pinnacle": "pinnacle",
    "polymarket": "polymarket",
    "skybet": "skybet",
    "sky bet": "skybet",
    "willhill": "william hill",
    "william hill": "william hill",
    "virginbet": "virgin bet",
    "virgin bet": "virgin bet",
    "unibet": "unibet",
    "quinnbet": "quinnbet",
    "boyles": "boylesports",
    "boylesports": "boylesports",
    "spreadex": "spreadex",
    "pricedup": "pricedup",
    "betfred": "betfred",
    "betway": "betway",
    "kambi": "kambi",
}

def normalize_market(value):
    market = re.sub(r'\s+', ' ', value or '').strip()
    if not market:
        return ""
    return MARKET_ALIASES.get(market.lower(), market)

def normalize_bookmaker(value):
    bookmaker = re.sub(r'\s+', ' ', value or '').strip()
    if not bookmaker:
        return ""
    return BOOKMAKER_ALIASES.get(bookmaker.lower(), bookmaker.lower())

def extract_direction(selection):
    selection = (selection or "").strip().lower()
    for direction in ("over", "under", "yes", "no", "home", "away", "draw"):
        if selection == direction or selection.startswith(f"{direction} "):
            return direction.capitalize()
    return ""

def clean_line(line):
    line = (line or "").replace("\xa0", " ")
    line = re.sub(r'\s+', ' ', line).strip()
    return line

def strip_leading_icons(value):
    value = re.sub(r'^[^\w\s\[\]\+\-\'"]+', '', value or '').strip()
    return re.sub(r'\s+', ' ', value).strip()

def parse_date(raw_date):
    from datetime import datetime
    raw_date = raw_date.strip()
    
    # Strip comma
    raw_date = raw_date.replace(",", "")
    
    # Try various date formats
    for fmt in (
        "%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y", "%m/%d/%Y",
        "%d %b %Y", "%d %B %Y", "%B %d %Y", "%b %d %Y",
        "%d/%m/%y", "%d.%m.%y", "%m/%d/%y", "%d %b %y", "%d %B %y", "%b %d %y", "%B %d %y"
    ):
        try:
            parsed = datetime.strptime(raw_date, fmt)
            # Handle 2-digit years - assume 2000-2099
            if parsed.year < 2000 and parsed.year >= 0:
                parsed = parsed.replace(year=2000 + parsed.year)
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            pass
            
    return raw_date

def parse_date_time(line, parsed):
    from datetime import date, timedelta

    lowered = line.lower()
    if not parsed.get("date"):
        if re.search(r'\btoday\b', lowered):
            parsed["date"] = date.today().strftime("%Y-%m-%d")
        elif re.search(r'\btomorrow\b', lowered):
            parsed["date"] = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

    time_match = re.search(r'(\d{1,2}:\d{2})', line)
    if time_match and not parsed.get("time"):
        parsed["time"] = time_match.group(1).zfill(5)

    date_match = re.search(r'(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})', line)
    if not date_match:
        date_match = re.search(r'(\d{1,2}[./]\d{1,2}[./]\d{2,4})', line)
    if date_match and not parsed.get("date"):
        parsed["date"] = parse_date(date_match.group(1))

def parse_event_line(line):
    if "@" in line or "http" in line.lower():
        return ""
    cleaned = strip_leading_icons(line)
    cleaned = re.sub(r'[\U0001F1E6-\U0001F1FF]{2}', '', cleaned).strip()
    cleaned = re.sub(r'\s+', ' ', cleaned)
    match = re.search(r"(.+?)\s+(?:vs|v)\s+(.+)", cleaned, re.IGNORECASE)
    if not match:
        return ""
    left = re.sub(r'^[^\w\'"]+', '', match.group(1)).strip()
    right = re.sub(r'[^\w\s\'"\.\-&]+$', '', match.group(2)).strip()
    if not left or not right:
        return ""
    return f"{left} vs {right}"

def apply_selection_market(selection_text, parsed):
    selection_text = strip_leading_icons(selection_text)
    if not selection_text or parsed.get("selection"):
        return

    match_ou = re.match(r'^(Over|Under)\s+([\d.]+)\s+(.+)$', selection_text, re.IGNORECASE)
    if match_ou:
        parsed["selection"] = f"{match_ou.group(1).capitalize()} {match_ou.group(2)}"
        parsed["betDirection"] = match_ou.group(1).capitalize()
        parsed["market"] = normalize_market(match_ou.group(3))
        return

    match_yn = re.match(r'^(Yes|No)\s+(.+)$', selection_text, re.IGNORECASE)
    if match_yn:
        parsed["selection"] = match_yn.group(1).capitalize()
        parsed["betDirection"] = match_yn.group(1).capitalize()
        parsed["market"] = normalize_market(match_yn.group(2))
        return

    match_named_ou = re.match(r'^(.+?)\s+(Over|Under|O|U)\s+([\d.]+)\s+(.+)$', selection_text, re.IGNORECASE)
    if match_named_ou:
        name = match_named_ou.group(1).strip()
        raw_direction = match_named_ou.group(2).lower()
        direction = "Over" if raw_direction in ("over", "o") else "Under"
        parsed["selection"] = f"{name} {direction} {match_named_ou.group(3)}"
        parsed["betDirection"] = direction
        parsed["market"] = normalize_market(match_named_ou.group(4))
        return

    match_handicap = re.match(r'^(.+?)\s+([+-]\d+(?:\.\d+)?)\s+(.+)$', selection_text)
    if match_handicap:
        parsed["selection"] = f"{match_handicap.group(1).strip()} {match_handicap.group(2)}"
        parsed["market"] = normalize_market(match_handicap.group(3))
        return

    parsed["selection"] = selection_text
    parsed["betDirection"] = extract_direction(selection_text)

def parse_bet_line(line, parsed):
    if parsed.get("selection"):
        return False
    if "@" not in line:
        return False

    left, right = line.split("@", 1)
    left = strip_leading_icons(left)
    if not left:
        return False

    odds_match = re.search(r'(?<![\d.])(\d+(?:\.\d+)?)(?![\d.])', right)
    if odds_match and not parsed.get("odds"):
        parsed["odds"] = odds_match.group(1)

    parens = re.findall(r'\(([^)]*)\)', right)
    for value in reversed(parens):
        if "¢" in value or not value.strip():
            continue
        parsed["bookmaker"] = normalize_bookmaker(value)
        break
    if not parsed.get("bookmaker") and ("polymarket" in right.lower() or "¢" in right):
        parsed["bookmaker"] = "polymarket"

    apply_selection_market(left, parsed)
    return True

def parse_odds_bookmaker_line(line, parsed, full_text):
    lower = line.lower()
    has_odds_context = "@" in line or "odds" in lower or "bookmaker" in lower
    if "@" in line:
        stake_units = re.search(r'(\d+(?:\.\d+)?)\s*(?:u|unit|units)\b', line, re.IGNORECASE)
        if stake_units and not parsed.get("stake"):
            parsed["stake"] = stake_units.group(1)
        odds_match = re.search(r'@\s*(\d+(?:\.\d+)?)', line)
        if odds_match and not parsed.get("odds"):
            parsed["odds"] = odds_match.group(1)
    elif "odds" in lower:
        odds_match = re.search(r'odds:\s*(\d+(?:\.\d+)?)', line, re.IGNORECASE)
        if odds_match and not parsed.get("odds"):
            parsed["odds"] = odds_match.group(1)

    if has_odds_context:
        parens = re.findall(r'\(([^)]*)\)', line)
        for value in reversed(parens):
            if "¢" in value or not value.strip():
                continue
            if not parsed.get("bookmaker"):
                parsed["bookmaker"] = normalize_bookmaker(value)
            break
    if not parsed.get("bookmaker") and ("polymarket" in full_text.lower() or (has_odds_context and "¢" in line)):
        parsed["bookmaker"] = "polymarket"

def parse_stake_line(line, parsed):
    stake_match = re.search(r'(?:stake|recommended stake):\s*([\d.]+)\s*u?', line, re.IGNORECASE)
    if not stake_match:
        stake_match = re.search(r'([\d.]+)\s*(?:u|unit|units)\b', line, re.IGNORECASE)
    if stake_match and not parsed.get("stake"):
        parsed["stake"] = stake_match.group(1)

def looks_like_selection_only(line):
    lowered = line.lower()
    if len(line) < 5 or any(skip in lowered for skip in ("free vip", "value alert", "bookmaker", "odds:", "stake", "http", "arbitrage", "profit")):
        return False
    return bool(
        re.match(r'^[^\n@]+?\s+(?:over|under|o|u)\s+\d+(?:\.\d+)?\s+.+$', line, re.IGNORECASE)
        or re.match(r'^(?:over|under)\s+\d+(?:\.\d+)?\s+.+$', line, re.IGNORECASE)
        or re.match(r'^[^\n@]+?\s+[+-]\d+(?:\.\d+)?\s+.+$', line)
    )

def parse_market_odds_row(line, pending_market, parsed):
    if parsed.get("selection") or not pending_market:
        return False
    match = re.match(r'^\(([^)]+)\)\s+(.+?)\s+-\s+(\d+(?:\.\d+)?)$', line)
    if not match:
        return False

    label = match.group(1).strip()
    value = match.group(2).strip()
    odds = match.group(3).strip()
    parsed["market"] = normalize_market(pending_market)
    parsed["odds"] = odds

    if label.lower() in ("over", "under"):
        parsed["selection"] = f"{label.capitalize()} {value}"
        parsed["betDirection"] = label.capitalize()
    else:
        parsed["selection"] = f"{label} {value}"
        parsed["betDirection"] = extract_direction(label)
    return True

def is_market_heading(line):
    lowered = line.lower().strip()
    if lowered in {"goal line", "total goals", "match goals"}:
        return True
    if not line or any(token in lowered for token in ("new odds", "football -", "stake", "odds", " vs ", " v ")):
        return False
    if re.search(r'\d', line):
        return False
    market_words = (
        "handicap", "corners", "cards", "shots", "tackles", "fouls", "goals",
        "offsides", "saves", "passes", "throw", "bookings", "match bet"
    )
    return any(word in lowered for word in market_words)

def extract_with_regex(text):
    parsed = {
        "searchEvent": "", "date": "", "time": "", "country": "", 
        "league": "", "selection": "", "market": "", "betDirection": "", "bookmaker": "", "odds": "", "stake": ""
    }
    
    # Handle both literal newlines and escaped \n
    full_text = text.replace("\\n", "\n")
    lines = full_text.split("\n")
    pending_market = ""
    
    for line in lines:
        line = clean_line(line)
        if not line:
            continue

        parse_date_time(line, parsed)

        if "🏟" in line:
            parsed["searchEvent"] = line.replace("🏟", "").strip()
        elif not parsed.get("searchEvent"):
            event = parse_event_line(line)
            if event:
                parsed["searchEvent"] = event

        if line.lower().startswith("new odds released on ") and not parsed.get("bookmaker"):
            parsed["bookmaker"] = normalize_bookmaker(line.split("on ", 1)[1])

        if line.lower().startswith("football - ") and not parsed.get("league"):
            parsed["league"] = line.split("-", 1)[1].strip()

        if "🌍" in line or "🌎" in line or "🌏" in line or "🇪🇺" in line or any(flag in line for flag in FLAG_TO_COUNTRY.keys()):
            # Find which flag it is
            for flag, country in FLAG_TO_COUNTRY.items():
                if flag in line:
                    is_event_flag_line = bool(re.search(r'\s+(?:vs|v)\s+', line, re.IGNORECASE))
                    if not parsed.get("country") and not is_event_flag_line:
                        parsed["country"] = country
                    league = line.replace(flag, "").strip()
                    if league and not is_event_flag_line and not parsed.get("league"):
                        parsed["league"] = league
                    break

        parse_stake_line(line, parsed)
        parse_odds_bookmaker_line(line, parsed, full_text)

        if parse_bet_line(line, parsed):
            if pending_market and normalize_market(pending_market) in {"Goal Line", "Total Goals", "Match Goals"}:
                parsed["market"] = normalize_market(pending_market)
            continue

        if parse_market_odds_row(line, pending_market, parsed):
            continue

        if not parsed.get("selection") and looks_like_selection_only(line):
            apply_selection_market(line, parsed)

        if is_market_heading(line):
            pending_market = line
    return parsed

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No text provided"}))
        return
        
    text = sys.argv[1]
    
    # Check if we should use bulk GPT parsing
    is_bulk = text.count("@") > 1 or text.count("💰") > 1 or text.lower().count("stake:") > 1 or text.count("🏟") > 1
    
    if is_bulk:
        from dotenv import load_dotenv
        load_dotenv("/Users/zinq/PycharmProjects/Cerebro/PROPPR/.env")
        load_dotenv("/opt/PROPPR/.env")
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            import requests
            try:
                response = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": "You are a sports betting parser. Extract all event details and bets from the user's text. Return ONLY a valid JSON array of objects `[ { ... } ]`, where each object represents a single bet. Each object must have these keys: searchEvent (e.g. 'TeamA vs TeamB'), date (YYYY-MM-DD), time (HH:MM), country, league, selection, market, betDirection, bookmaker, odds, stake. If you cannot find a field, return an empty string for it. For 'country', if the event is an international tournament (e.g. World Cup, Euros, Copa America) or involves national teams playing each other, you MUST output 'International'. If a single event has multiple bets, create a separate object for each bet but duplicate the event details. For 'betDirection', extract the precise direction (e.g. 'Over', 'Under', 'Yes', 'No', 'Home', 'Away', 'Draw', '+', '-'). If the selection implies Over (e.g. '0.5 SOT'), output 'Over'. If a handicap (e.g. '+0.5'), output '+'. For the 'market' field, you MUST map the bet to one of the following EXACT canonical markets if possible (e.g. map 'SOT outside box' to 'Player SOT Outside Box', map 'Asian Cards' to 'Asian Total Cards'): Alternative Corners, Asian Total Cards, Bet Builder, Bookings Spread, Bookings Totals, Both Teams To Score, Card Handicap, Corner Handicap, Corners 2-Way, Corners Match Bet, Corners Spread, Corners Totals, Correct Score, Double Chance, Draw No Bet, First Goal Scorer, Free Kicks, Goal Kicks, Goalkeeper Saves, Half Time Full Time, Half Time Result, Match Corners, Match Offsides, Match Result, Match Shots, Match Shots On Target, Match Tackles, Player Accurate Passes, Player Aerial Duels Won, Player Assists, Player Blocks, Player Booked First, Player Cards, Player Clearances, Player Crosses, Player Dribbles, Player Fast Break Shots, Player Fouls Committed, Player Fouls Won, Player Free Kick Shots, Player Free Kick SOT, Player Goal From Header, Player Goal From Outside Box, Player Goals, Player Headed Shots, Player Headed Shots On Target, Player Interceptions, Player Key Passes, Player Offsides, Player Passes, Player Red Card, Player Score 2+ Goals, Player Score 3+ Goals, Player Score or Assist, Player Set Piece Shots, Player Set Piece SOT, Player Shots From Outside Box, Player Shots On Target, Player Shots Total, Player SOT Outside Box, Player Tackles, Player Throw-in Shots, Player To Assist, Player To Score or Assist, Player Yellow Card, Team Cards, Team Corners, Team Fouls, Team Free Kicks, Team Goal Kicks, Team Goals, Team Goals Outside Box, Team Headed Goals, Team Headed Shots, Team Headed Shots On Target, Team Offsides, Team Red Cards, Team Saves, Team Shots, Team Shots On Target, Team Shots On Target Outside Box, Team Shots Outside Box, Team Tackles, Team Throw-ins, Team Total Goals, Throw-ins, To Be Booked First, To Score First, Total Cards, Total Corners, Total Fouls, Total Free Kicks, Total Goal Kicks, Total Goals, Total Goals Outside Box, Total Headed Goals, Total Headed Shots, Total Headed Shots On Target, Total Offsides, Total Penalties, Total Points, Total Red Cards, Total Saves, Total Shots, Total Shots On Target, Total Shots On Target Outside Box, Total Shots Outside Box, Total Tackles, Total Throw-ins. CRITICAL: If the selection contains multiple bets combined with '&' or '+' (e.g. 'Over 5.5 Corners & Most Corners'), you MUST map the market to 'Bet Builder' and set betDirection to an empty string ''. Do NOT wrap in markdown code blocks. Ensure odds is a string (e.g. '1.800') and stake is a string (e.g. '0.75')."},
                            {"role": "user", "content": text}
                        ],
                        "temperature": 0
                    }
                )
                response_data = response.json()
                if "error" not in response_data:
                    parsed_str = response_data["choices"][0]["message"]["content"].strip()
                    if parsed_str.startswith("```json"): parsed_str = parsed_str[7:-3]
                    elif parsed_str.startswith("```"): parsed_str = parsed_str[3:-3]
                    ai_data = json.loads(parsed_str)
                    if isinstance(ai_data, list):
                        for b in ai_data:
                            b["market"] = normalize_market(b.get("market", ""))
                            b["bookmaker"] = normalize_bookmaker(b.get("bookmaker", ""))
                            b["betDirection"] = b.get("betDirection") or extract_direction(b.get("selection", ""))
                        print(json.dumps({"bets": ai_data}))
                        return
            except Exception as e:
                pass

    # Try regex first
    parsed_data = extract_with_regex(text)
    
    # Common Telegram formats should be regex-complete. Only spend API credits
    # when the local parser cannot identify a usable betting line.
    has_betting_line = bool(parsed_data.get("selection") and (parsed_data.get("odds") or parsed_data.get("stake") or parsed_data.get("market")))
    needs_ai = not has_betting_line
    
    if needs_ai:
        from dotenv import load_dotenv
        load_dotenv("/Users/zinq/PycharmProjects/Cerebro/PROPPR/.env")
        # Try to load from /opt/PROPPR/.env as well
        load_dotenv("/opt/PROPPR/.env")
        
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                import requests
                response = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": "You are a sports betting parser. Extract the event details from the user's text. Return ONLY a valid JSON object with these keys: searchEvent (e.g. 'TeamA vs TeamB'), date (YYYY-MM-DD), time (HH:MM), country, league, selection, bookmaker, odds, stake, betDirection. If you cannot find a field, return an empty string for it. For 'country', if the event is an international tournament (e.g. World Cup, Euros, Copa America) or involves national teams playing each other, you MUST output 'International'. For 'betDirection', extract the precise direction (e.g. 'Over', 'Under', 'Yes', 'No', 'Home', 'Away', 'Draw', '+', '-'). If the selection implies Over (e.g. '0.5 SOT'), output 'Over'. If a handicap (e.g. '+0.5'), output '+'. Do NOT wrap in markdown code blocks. Ensure odds is a string (e.g. '1.800') and stake is a string (e.g. '0.75')."},
                            {"role": "user", "content": text}
                        ],
                        "temperature": 0
                    }
                )
                response_data = response.json()
                if "error" not in response_data:
                    parsed_str = response_data["choices"][0]["message"]["content"].strip()
                    if parsed_str.startswith("```json"): parsed_str = parsed_str[7:-3]
                    elif parsed_str.startswith("```"): parsed_str = parsed_str[3:-3]
                    ai_data = json.loads(parsed_str)
                    # Merge AI data, preferring Regex if it already found something
                    for k, v in ai_data.items():
                        if not parsed_data.get(k) and v:
                            parsed_data[k] = v
            except Exception as e:
                pass

    parsed_data["market"] = normalize_market(parsed_data.get("market", ""))
    parsed_data["betDirection"] = parsed_data.get("betDirection") or extract_direction(parsed_data.get("selection", ""))
    parsed_data["bookmaker"] = normalize_bookmaker(parsed_data.get("bookmaker", ""))
            
    # Search FotMob to enrich data ONLY if crucial info is missing
    search_event = parsed_data.get("searchEvent", "")
    has_date_time = bool(parsed_data.get("date") and parsed_data.get("time"))
    has_league = bool(parsed_data.get("league"))
    
    # Skip FotMob if we already have the event, date, time, and league
    needs_fotmob = search_event and not has_betting_line and (not has_date_time or not has_league)
    
    if needs_fotmob:
        try:
            from PROPPR.SharedServices.api.fotmob_service import FotMobAPIService
            fm_service = FotMobAPIService()
            results = fm_service.search(search_event)
            if results and isinstance(results, dict) and results.get("matches"):
                matches = results["matches"]
                if len(matches) > 0:
                    best_match = matches[0]
                    parsed_data["searchEvent"] = f"{best_match.get('homeTeamName', '')} vs {best_match.get('awayTeamName', '')}"
                    if best_match.get("leagueName") and not parsed_data.get("league"):
                        parsed_data["league"] = best_match.get("leagueName")
        except Exception:
            pass # Use whatever we got from parser if FotMob fails
                        
    print(json.dumps(parsed_data))

if __name__ == "__main__":
    main()
