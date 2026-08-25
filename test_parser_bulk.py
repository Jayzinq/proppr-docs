import sys
import os
import json
import requests
from dotenv import load_dotenv

sys.path.append("/Users/zinq/PycharmProjects/Cerebro/proppr-docs/scripts")
from parser import normalize_market, normalize_bookmaker, extract_direction

def test_bulk(text):
    load_dotenv("/Users/zinq/PycharmProjects/Cerebro/PROPPR/.env")
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("No API Key")
        return
        
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
            print(json.dumps({"bets": ai_data}, indent=2))
        else:
            print(json.dumps(ai_data, indent=2))
    else:
        print(response_data)

if __name__ == "__main__":
    with open("test_text_multi.txt", "r") as f:
        test_bulk(f.read())
