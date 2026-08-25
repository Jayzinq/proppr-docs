import os
import base64
import requests
import json
import uuid
import shutil
from dotenv import load_dotenv

load_dotenv("/Users/zinq/PycharmProjects/Cerebro/PROPPR/.env")
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("No OpenAI API Key found!")
    exit(1)

SYSTEM_PROMPT = """You are a sports betting parser. Extract all event details and bets from the user's images and text. Return ONLY a valid JSON array of objects `[ { ... } ]`, where each object represents a single bet. Each object must have these keys: searchEvent (e.g. 'TeamA vs TeamB'), date (YYYY-MM-DD), time (HH:MM), country, league, selection, market, betDirection, bookmaker, odds, stake. If you cannot find a field, return an empty string for it. For 'country', if the event is an international tournament (e.g. World Cup, Euros, Copa America) or involves national teams playing each other, you MUST output 'International'. If a single event has multiple bets, create a separate object for each bet but duplicate the event details. For 'betDirection', extract the precise direction (e.g. 'Over', 'Under', 'Yes', 'No', 'Home', 'Away', 'Draw', '+', '-'). If the selection implies Over (e.g. '0.5 SOT'), output 'Over'. If a handicap (e.g. '+0.5'), output '+'. For the 'market' field, you MUST map the bet to one of the following EXACT canonical markets if possible: Alternative Corners, Asian Total Cards, Bet Builder, Bookings Spread, Bookings Totals, Both Teams To Score, Card Handicap, Corner Handicap, Corners 2-Way, Corners Match Bet, Corners Spread, Corners Totals, Correct Score, Double Chance, Draw No Bet, First Goal Scorer, Free Kicks, Goal Kicks, Goalkeeper Saves, Half Time Full Time, Half Time Result, Match Corners, Match Offsides, Match Result, Match Shots, Match Shots On Target, Match Tackles, Player Accurate Passes, Player Aerial Duels Won, Player Assists, Player Blocks, Player Booked First, Player Cards, Player Clearances, Player Crosses, Player Dribbles, Player Fast Break Shots, Player Fouls Committed, Player Fouls Won, Player Free Kick Shots, Player Free Kick SOT, Player Goal From Header, Player Goal From Outside Box, Player Goals, Player Headed Shots, Player Headed Shots On Target, Player Interceptions, Player Key Passes, Player Offsides, Player Passes, Player Red Card, Player Score 2+ Goals, Player Score 3+ Goals, Player Score or Assist, Player Set Piece Shots, Player Set Piece SOT, Player Shots From Outside Box, Player Shots On Target, Player Shots Total, Player SOT Outside Box, Player Tackles, Player Throw-in Shots, Player To Assist, Player To Score or Assist, Player Yellow Card, Team Cards, Team Corners, Team Fouls, Team Free Kicks, Team Goal Kicks, Team Goals, Team Goals Outside Box, Team Headed Goals, Team Headed Shots, Team Headed Shots On Target, Team Offsides, Team Red Cards, Team Saves, Team Shots, Team Shots On Target, Team Shots On Target Outside Box, Team Shots Outside Box, Team Tackles, Team Throw-ins, Team Total Goals, Throw-ins, To Be Booked First, To Score First, Total Cards, Total Corners, Total Fouls, Total Free Kicks, Total Goal Kicks, Total Goals, Total Goals Outside Box, Total Headed Goals, Total Headed Shots, Total Headed Shots On Target, Total Offsides, Total Penalties, Total Red Cards, Total Saves, Total Shots, Total Shots On Target, Total Shots On Target Outside Box, Total Shots Outside Box, Total Tackles, Total Throw-ins. CRITICAL: If the selection contains multiple bets combined with '&' or '+' (e.g. 'Over 5.5 Corners & Most Corners'), you MUST map the market to 'Bet Builder' and set betDirection to an empty string ''. Do NOT wrap in markdown code blocks. Ensure odds is a string (e.g. '1.800') and stake is a string (e.g. '0.75')."""

images = [
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-betway-gb-en-sports-event-16879959-2026-06-24-17_19_20.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-quinnbet-uk-sports-football-event-scotland-v-brazil-bg-4554213-2026-06-24-17_19_59.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-betmgm-co-uk-sports-2026-06-24-17_20_36.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-betfair-exchange-plus-football-market-1-258369694-2026-06-24-17_21_09.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-virginbet-sports-football-world-cup-2026-scotland-brazil-SBTE-2-1025862024-2026-06-24-17_21_38.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-boylesports-sports-football-event-international-world-cup-scotland-v-brazil-2026-06-24-17_22_10.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-skybet-football-fifa-world-cup-scotland-v-brazil-e-35625834-2026-06-24-17_22_32.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-sports-williamhill-betting-en-gb-football-OB-EV39908945-2026-06-24-17_22_48.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-betvictor-en-gb-sports-100-meetings-726764210-events-2789106700-2026-06-24-17_23_17.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-ladbrokes-en-sports-event-football-international-world-cup-2026-scotland-v-brazil-256213397-main-markets-2026-06-24-17_23_29.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-coral-co-uk-en-sports-event-football-football-international-world-cup-2026-scotland-v-brazil-43696878-main-markets-2026-06-24-17_23_43.png",
    "/Volumes/ZINQ 1TB/Google Drive/55. Saudi Pro League/screencapture-spreadex-sports-en-GB-spread-betting-football-fifa-world-cup-2026-scotland-v-brazil-fo-p8836440-2026-06-24-17_23_53.png"
]

results = []

for photo_path in images:
    if not os.path.exists(photo_path):
        results.append({"file": photo_path, "error": "File does not exist"})
        continue

    with open(photo_path, "rb") as image_file:
        base64_img = base64.b64encode(image_file.read()).decode('utf-8')
    
    url = f"data:image/png;base64,{base64_img}"
    
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": [
                        {"type": "image_url", "image_url": {"url": url}}
                    ]}
                ],
                "temperature": 0
            }
        )
        data = response.json()
        if "error" in data:
            results.append({"file": photo_path, "error": data["error"]})
        else:
            raw = data["choices"][0]["message"]["content"].strip()
            if raw.startswith("```json"): raw = raw[7:-3].strip()
            elif raw.startswith("```"): raw = raw[3:-3].strip()
            parsed = json.loads(raw)
            results.append({"file": photo_path, "parsed": parsed})
    except Exception as e:
        results.append({"file": photo_path, "error": str(e)})

artifact_path = "/Users/zinq/.gemini/antigravity-cli/brain/77ef7c1b-7e56-4663-b977-04ab15b6fdfe/ocr_bookmaker_test_results.md"

md_content = "# OCR Bookmaker Variance Test Results\n\nTesting Scotland vs Brazil bet slips across different bookmakers to evaluate extraction quality of localized player names and layouts.\n\n"

for i, res in enumerate(results):
    basename = os.path.basename(res['file'])
    bookmaker = basename.split('-')[1] if len(basename.split('-')) > 1 else basename
    md_content += f"## Image {i+1}: `{bookmaker}` ({basename})\n"
    
    # Check if exists to copy for rendering
    if not "error" in res or res["error"] != "File does not exist":
        dest_path = f"/Users/zinq/.gemini/antigravity-cli/brain/77ef7c1b-7e56-4663-b977-04ab15b6fdfe/bm_sample_{i+1}.png"
        shutil.copy2(res['file'], dest_path)
        md_content += f"![{bookmaker}]({dest_path})\n\n"
    
    md_content += "### Parsed JSON Output\n"
    if "error" in res:
        md_content += f"```\nERROR: {res['error']}\n```\n\n"
    else:
        md_content += f"```json\n{json.dumps(res['parsed'], indent=2)}\n```\n\n"

with open(artifact_path, "w") as f:
    f.write(md_content)

print(f"Testing complete. Artifact written to {artifact_path}")
