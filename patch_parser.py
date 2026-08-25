import re

with open("/Users/zinq/PycharmProjects/Cerebro/proppr-docs/scripts/parser.py", "r") as f:
    content = f.read()

# We need to replace the extract_with_regex logic when multiple bets are detected
# We can do this in the `main` function

main_start = content.find("def main():")
main_end = content.find("if __name__ == \"__main__\":")

new_main = """def main():
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
                            {"role": "system", "content": "You are a sports betting parser. Extract all event details and bets from the user's text. Return ONLY a valid JSON array of objects `[ { ... } ]`, where each object represents a single bet. Each object must have these keys: searchEvent (e.g. 'TeamA vs TeamB'), date (YYYY-MM-DD), time (HH:MM), country, league, selection, market, betDirection, bookmaker, odds, stake. If you cannot find a field, return an empty string for it. If a single event has multiple bets, create a separate object for each bet but duplicate the event details (date, time, searchEvent, etc). Do NOT wrap in markdown code blocks. Ensure odds is a string (e.g. '1.800') and stake is a string (e.g. '0.75')."},
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
                            {"role": "system", "content": "You are a sports betting parser. Extract the event details from the user's text. Return ONLY a valid JSON object with these keys: searchEvent (e.g. 'TeamA vs TeamB'), date (YYYY-MM-DD), time (HH:MM), country, league, selection, bookmaker, odds, stake. If you cannot find a field, return an empty string for it. Do NOT wrap in markdown code blocks. Ensure odds is a string (e.g. '1.800') and stake is a string (e.g. '0.75')."},
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

"""

new_content = content[:main_start] + new_main + content[main_end:]
with open("/Users/zinq/PycharmProjects/Cerebro/proppr-docs/scripts/parser.py", "w") as f:
    f.write(new_content)
