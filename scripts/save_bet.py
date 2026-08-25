import sys
import json
import uuid
import os
import re
import threading
from datetime import datetime, timezone


def trigger_instant_grade_for_user(user_id):
    """Kick off a background auto-grade pass for a single user after a new bet is saved.

    Mirrors the tracker-bot helper but lives in the web-save path so Telegram/web
    imports get the same priority grading behaviour.
    """
    def _instant_grade():
        try:
            from SharedServices.tracking.bet_tracking_system import BetTrackingSystem
            uri = (
                os.getenv("MONGO_CONNECTION_STRING")
                or os.getenv("MONGODB_URI")
                or os.getenv("MONGODB_CONNECTION_STRING")
                or os.getenv("MONGODB_URI_PRODUCTION")
                or os.getenv("MONGODB_URI_DEVELOPMENT")
                or "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&tls=false"
            )
            db_name = os.getenv("MONGO_DATABASE") or os.getenv("MONGODB_DATABASE") or "Cerebro"
            bts = BetTrackingSystem(uri, db_name)
            bts.auto_settle_user_bets(user_id)
        except Exception:
            pass
    try:
        threading.Thread(target=_instant_grade, daemon=True).start()
    except Exception:
        pass


MARKET_ALIASES = {
    "asian cards": "Asian Total Cards",
    "asian total cards": "Asian Total Cards",
    "asian corners": "Asian Corners",
    "asian total corners": "Asian Corners",
    "total match cards": "Total Cards",
    "match total cards": "Total Cards",
    "total match corners": "Total Corners",
    "match total corners": "Total Corners",
}

BOOKMAKER_ALIASES = {
    "365": "Bet365",
    "bet365": "Bet365",
    "bet 365": "Bet365",
    "bet-365": "Bet365",
    "bet 365.com": "Bet365",
    "pinnacle": "Pinnacle",
    "polymarket": "Polymarket",
    "kambi": "Kambi",
    "betfair exchange": "Betfair Exchange",
    "betfair sportsbook": "Betfair",
    "betfair": "Betfair",
    "williamhill": "WilliamHill",
    "william hill": "WilliamHill",
    "skybet": "Skybet",
    "sky bet": "Skybet",
    "virginbet": "Virgin Bet",
    "virgin bet": "Virgin Bet",
    "boylesports": "BoyleSports",
    "boyle sports": "BoyleSports",
}

def normalize_market(value):
    market = re.sub(r"\s+", " ", value or "").strip()
    if not market:
        return ""
    # "Player Props - <Player Name> (<Stat>)" (Polymarket / parser format) leaks the player
    # name into the market label, which fragments the analytics breakdown into one row per
    # player instead of grouping under the stat. Reduce it to the canonical "Player <Stat>"
    # (e.g. "Player Props - Eduardo Rodriguez (Strikeouts)" -> "Player Strikeouts"). The stat
    # is the parenthetical when present, otherwise the text after the dash ("... - Goals").
    pp = re.match(r"(?i)^player\s+props\s*-\s*(.+)$", market)
    if pp:
        rest = pp.group(1).strip()
        paren = re.search(r"\(([^)]+)\)\s*$", rest)
        stat = (paren.group(1) if paren else rest).strip().strip("-").strip()
        if stat:
            market = "Player " + stat.title()
    return MARKET_ALIASES.get(market.lower(), market)

def normalize_bookmaker(value):
    bookmaker = re.sub(r"\s+", " ", value or "").strip()
    if not bookmaker:
        return ""
    if bookmaker.lower() in {"odds", "bookmaker odds", "price", "prices", "chance", "probability"}:
        return ""
    return BOOKMAKER_ALIASES.get(bookmaker.lower(), bookmaker.lower())

def normalize_direction(value):
    direction = re.sub(r"\s+", " ", value or "").strip()
    if not direction:
        return ""
    return direction[:1].upper() + direction[1:].lower()

def clean_string(value):
    text = str(value or "")
    # Remove regional-indicator flag sequences and common emoji/code-point ranges.
    text = re.sub(r"[\U0001F1E6-\U0001F1FF]{2}", "", text)
    text = re.sub(
        r"["
        r"\U0001F300-\U0001F9FF"
        r"\U00002600-\U000026FF"
        r"\U00002700-\U000027BF"
        r"\U0001F900-\U0001F9FF"
        r"\U0001F600-\U0001F64F"
        r"\U0001F680-\U0001F6FF"
        r"\U0001F700-\U0001F77F"
        r"\U0001F780-\U0001F7FF"
        r"\U0001F800-\U0001F8FF"
        r"\U0001FA00-\U0001FA6F"
        r"\U0001FA70-\U0001FAFF"
        r"\U00002300-\U000023FF"
        r"]",
        "",
        text,
    )
    return re.sub(r"\s+", " ", text).strip()

def normalize_text(value):
    text = clean_string(value).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()

# A CSV `searchEvent` cell frequently carries the SELECTION as well as the fixture, in one of
# three shapes seen in real imports:
#     "Philadelphia 76ers vs Boston Celtics | Under"
#     "NaLyssa Smith - Over 6.5 - Rebounds O/U - Golden State Valkyries vs Las Vegas Aces"
#     "Ipswich Force - Spread +6.5 - South West Metro Pirates Women vs Ipswich Force Women"
# Stored verbatim, `match` then fails every downstream fixture join — `_bet_teams` splits on
# " vs " and gets "Boston Celtics | Under" as the away side, which matches nothing. 1,899 bets
# were written this way before this was caught (2026-08-04); 1,890 were recoverable because the
# real fixture was present in the string all along.
_MARKET_FRAGMENT = re.compile(
    r"\s[-|]\s*(spread|total|moneyline|over|under|handicap|goal\s*line|asian|"
    r"rebounds|assists|points|strikeouts|shots)\b", re.I)
_VS_SPLIT = re.compile(r"\s+v(?:s)?\.?\s+", re.I)


def extract_fixture(value):
    """The bare "Home vs Away" out of a CSV event cell; the input unchanged if none is found.

    Deliberately conservative: it only rewrites when a market fragment is present AND a clean
    two-sided fixture can be isolated. Anything it cannot parse is returned untouched rather
    than guessed at, so a wrong split can never silently replace a usable value.
    """
    text = clean_string(value)
    if not text or not _MARKET_FRAGMENT.search(text):
        return text
    # Shape 2/3: the fixture trails a chain of " - " separated selection parts. Scan from the
    # right so the LAST clean "A vs B" wins — the leading parts are the selection.
    for part in reversed([p.strip() for p in text.split(" - ")]):
        if _VS_SPLIT.search(part) and not _MARKET_FRAGMENT.search(part):
            sides = _VS_SPLIT.split(part, maxsplit=1)
            if len(sides) == 2 and sides[0].strip() and sides[1].strip():
                return "%s vs %s" % (sides[0].strip(), sides[1].strip())
    # Shape 1: fixture first, market tag after a pipe.
    if "|" in text:
        head = text.split("|", 1)[0].strip()
        if _VS_SPLIT.search(head):
            sides = _VS_SPLIT.split(head, maxsplit=1)
            if len(sides) == 2 and sides[0].strip() and sides[1].strip():
                return "%s vs %s" % (sides[0].strip(), sides[1].strip())
    return text

def selection_with_subject(selection, market="", player_name="", team=""):
    selection = clean_string(selection)
    market_lower = clean_string(market).lower()
    subject = clean_string(player_name)
    if not subject and "player" not in market_lower:
        subject = clean_string(team)
    if subject and selection and not selection.lower().startswith(subject.lower()) and subject.lower() not in selection.lower():
        return f"{subject} {selection}".strip()
    if not selection and subject:
        return subject
    return selection

def split_player_team(player_name, team=""):
    player_name = clean_string(player_name)
    team = clean_string(team)
    match = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", player_name)
    if match:
        player_name = clean_string(match.group(1))
        if not team:
            team = clean_string(match.group(2))
    return player_name, team

def is_low_quality_import_payload(payload):
    match_name = clean_string(
        payload.get("searchEvent")
        or payload.get("match")
        or payload.get("fixture_name")
        or payload.get("match_name")
        or ""
    )
    selection = clean_string(payload.get("selection") or payload.get("player_name") or "")
    market = clean_string(payload.get("market") or payload.get("market_type") or "").lower()
    odds = clean_string(payload.get("odds") or payload.get("display_odds") or payload.get("displayOdds") or "")

    normalized_match = re.sub(r"[^a-z0-9]+", " ", match_name.lower()).strip()
    normalized_selection = re.sub(r"[^a-z0-9]+", " ", selection.lower()).strip()

    if normalized_match in ("", "event", "match", "fixture"):
        return True
    if normalized_selection in ("", "selection", "unknown"):
        return True
    if len(match_name) > 120:
        return True
    if re.search(r"⏰|👤|📍|https?://|bet365\.com|recommended stake|avg rating|model odds|appearances|per game", match_name, re.I):
        return True
    if len(selection) > 180:
        return True
    if re.search(r"\*\*|event/teams|total odds|to return|bookmaker odds|market:|selection:|⏰|👤|📍|https?://|bet365\.com|recommended stake|avg rating|model odds|appearances|per game", selection, re.I):
        return True
    if market in ("", "unknown", "unknown market") and not odds:
        return True
    return False

_GOALSCORER_GOAL_TYPES = frozenset({
    "header", "left foot", "right foot", "penalty", "outside the box",
    "outside box", "free kick", "volley", "tap in", "tap-in",
})

def _goal_type_from_parens(paren_content):
    if not paren_content:
        return ""
    parts = [part.strip() for part in re.split(r",|/", paren_content) if part.strip()]
    if not parts:
        return ""
    if parts[0].lower() in _GOALSCORER_GOAL_TYPES:
        return "Header" if parts[0].lower() == "header" else parts[0].strip().title()
    for part in parts:
        if part.strip().lower() in _GOALSCORER_GOAL_TYPES:
            return "Header" if part.strip().lower() == "header" else part.strip().title()
    return ""

def format_goalscorer_selection(player, paren_content=""):
    player = clean_string(player)
    goal_type = _goal_type_from_parens(paren_content)
    if goal_type:
        return f"{player} ({goal_type})"
    return player

def normalize_goalscorer_fields(selection, market=""):
    market_lower = clean_string(market).lower()
    if "player goals" not in market_lower and "goalscorer" not in market_lower:
        return selection, ""
    text = clean_string(selection)
    if not text:
        return text, ""
    match = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", text)
    if not match:
        return text, text
    player = clean_string(match.group(1))
    parens = match.group(2)
    goal_type = _goal_type_from_parens(parens)
    if goal_type:
        return format_goalscorer_selection(player, parens), player
    return player, player

def extract_player_name_from_selection(selection, market="", direction="", threshold=None):
    text = clean_string(selection)
    if not text:
        return ""

    market_lower = clean_string(market).lower()
    direction_lower = clean_string(direction).lower()
    threshold_str = ""
    if threshold not in (None, ""):
        try:
            threshold_str = str(float(threshold)).rstrip("0").rstrip(".") if isinstance(threshold, (int, float)) else str(threshold)
        except (TypeError, ValueError):
            threshold_str = str(threshold)

    # Strip a trailing " -" left by "<Player> - Over 13.5 - ..." style selections so the
    # name is "Kahleah Copper", not "Kahleah Copper -".
    named_line = re.match(r"^(.+?)\s+-?\s*(?:over|under|o|u)\s+([\d.]+)\b", text, re.I)
    if named_line:
        return clean_string(named_line.group(1)).rstrip(" -")

    handicap_line = re.match(r"^(.+?)\s+([+-]\d+(?:\.\d+)?)\b", text)
    if handicap_line:
        return clean_string(handicap_line.group(1)).rstrip(" -")

    if "player" in market_lower and not re.match(r"^(over|under|yes|no)\b", text, re.I):
        if direction_lower and threshold_str:
            text = re.sub(
                rf"\s+{re.escape(direction_lower)}\s+{re.escape(threshold_str)}\b.*$",
                "",
                text,
                flags=re.I,
            ).strip()
        text = re.sub(
            r"\b(?:player|match|team|total)\s+(?:passes?|shots?|sot|tackles?|cards?|corners?|fouls?|assists?|goals?|on target)\b.*$",
            "",
            text,
            flags=re.I,
        ).strip()
        if text and not re.match(r"^(over|under|yes|no)\b", text, re.I):
            return text

    return ""

def resolve_player_name(payload_or_bet):
    explicit = clean_string(
        payload_or_bet.get("playerName")
        or payload_or_bet.get("player_name")
        or ""
    )
    if explicit and explicit.lower() not in ("unknown player", "unknown"):
        return explicit

    selection = clean_string(payload_or_bet.get("selection") or "")
    market = payload_or_bet.get("market") or payload_or_bet.get("market_type") or ""
    direction = (
        payload_or_bet.get("betDirection")
        or payload_or_bet.get("bet_direction")
        or payload_or_bet.get("direction")
        or ""
    )
    threshold = payload_or_bet.get("threshold") or payload_or_bet.get("line")
    extracted = extract_player_name_from_selection(selection, market, direction, threshold)
    return extracted if extracted and extracted.lower() not in ("unknown player", "unknown") else explicit

MARKET_SPORT_HINTS = [
    ("Baseball", re.compile(r"\b(home runs?|total runs|match total runs|runs scored|strikeouts?|pitchers?|innings?|rbis?|bases?)\b", re.I)),
    ("Basketball", re.compile(r"\b(rebounds?|assists?|three pointers?|3-pointers?|free throws?|points scored)\b", re.I)),
    ("Ice Hockey", re.compile(r"\b(pucks?|power play|shutouts?|goalie saves?)\b", re.I)),
    ("Football", re.compile(r"\b(corners?|bookings?|cards?|offsides?|full time result|both teams to score|btts|match goals?|total goals?|goal line|player goals?|goalscorer|to score|clean sheet|asian handicap|double chance|half[- ]time|draw no bet|1x2|player (?:fouls|tackles)|fouls (?:committed|won))\b", re.I)),
    ("Tennis", re.compile(r"\b(total aces|player aces|double faults?|break points?|sets? won|games won|total games)\b", re.I)),
    ("American Football", re.compile(r"\b(touchdowns?|passing yards|rushing yards|field goals?|quarterbacks?)\b", re.I)),
]

LEAGUE_SPORT_HINTS = [
    # Specific esports titles first - alerts name the game as the sport ("Dota 2",
    # "CS2 - Counter-Strike", "CoD - ..."); e-soccer before Football so "Esoccer Battle"
    # league names never read as football.
    ("E Soccer", re.compile(r"\be[- ]?soccer\b", re.I)),
    ("Dota 2", re.compile(r"\bdota\b", re.I)),
    ("Counter-Strike", re.compile(r"\b(counter[- ]strike|cs2|cs:? ?go)\b", re.I)),
    ("Call of Duty", re.compile(r"\bcall of duty\b|\bcod\b(?=\s*[-\u2013|])", re.I)),
    ("Valorant", re.compile(r"\bvalorant\b", re.I)),
    ("League of Legends", re.compile(r"\bleague of legends\b|\blol\b(?=\s*[-\u2013|])", re.I)),
    ("Rainbow Six", re.compile(r"\brainbow six\b", re.I)),
    ("Rocket League", re.compile(r"\brocket league\b", re.I)),
    ("Basketball", re.compile(r"\b(fiba|nba|wnba|euroleague|ncaab|basketball)\b", re.I)),
    ("Baseball", re.compile(r"\b(mlb|baseball|world series)\b", re.I)),
    ("Football", re.compile(r"\b(premier league|serie [abc]|la liga|bundesliga|ligue 1|eredivisie|champions league|europa league|brasileiro|botola|soccer|fifa|world cup(?!\s*,\s*eu)|club friendly|friendly games?)\b", re.I)),
    ("Ice Hockey", re.compile(r"\b(nhl|hockey|khl)\b", re.I)),
    ("Tennis", re.compile(r"\b(atp|wta|tennis|grand slam)\b", re.I)),
    ("Esports", re.compile(r"\b(esports?)\b", re.I)),
    ("Cricket", re.compile(r"\b(ipl|t20|odi|cricket|ashes)\b", re.I)),
    ("MMA", re.compile(r"\b(ufc|mma|boxing)\b", re.I)),
    ("American Football", re.compile(r"\b(nfl|cfl|ncaaf|super bowl)\b", re.I)),
]

TEAM_SPORT_HINTS = [
    ("Basketball", re.compile(r"\b(las vegas aces|indiana fever|wnba)\b", re.I)),
    ("Baseball", re.compile(r"\b(texas rangers|detroit tigers|chicago cubs|st\.? louis cardinals|new york yankees|los angeles dodgers|boston red sox)\b", re.I)),
]

def normalize_sport_name(value):
    raw = clean_string(value)
    if not raw:
        return ""
    key = raw.lower().replace("_", " ")
    aliases = {
        "football": "Football",
        "soccer": "Football",
        "basketball": "Basketball",
        "baseball": "Baseball",
        "cricket": "Cricket",
        "esports": "Esports",
        "esport": "Esports",
        "e soccer": "E Soccer",
        "e-soccer": "E Soccer",
        "esoccer": "E Soccer",
        "dota": "Dota 2",
        "dota 2": "Dota 2",
        "counter-strike": "Counter-Strike",
        "counter strike": "Counter-Strike",
        "cs2": "Counter-Strike",
        "call of duty": "Call of Duty",
        "league of legends": "League of Legends",
        "tennis": "Tennis",
        "hockey": "Ice Hockey",
        "ice hockey": "Ice Hockey",
        "mma": "MMA",
        "ufc/mma": "MMA",
        "rugby": "Rugby",
        # Gridiron ALWAYS normalises to "American Football" — never "US Football" and never
        # anything containing a bare "Football", which would collide with soccer in every
        # sport-keyed alias map and route NFL bets into the football-only graders. The CSV
        # importer used to pass its own column through verbatim, which is how the same sport
        # ended up split across two labels (NFL/CFL as "American Football", NCAA/UFL as
        # "US Football") and how both landed at 0% CLV.
        "american football": "American Football",
        "us football": "American Football",
        "usa football": "American Football",
        "gridiron": "American Football",
        "nfl": "American Football",
        "cfl": "American Football",
        "ufl": "American Football",
        "college football": "American Football",
        "ncaa football": "American Football",
        "canadian football": "American Football",
    }
    return aliases.get(key, raw[:1].upper() + raw[1:] if raw else "")

FIXTURE_VS_PATTERN = re.compile(r"\bv(?:s|\.)?\b", re.I)

def _infer_sport_from_context(haystack, match_text):
    if not haystack and not match_text:
        return ""
    non_football = re.compile(
        r"\b(esports?|enterprise|reborn|middlesex|essex|tigers|cubs|cardinals|yankees|dodgers|fever|fiba|wnba|nba|mlb|nfl|nhl|cricket|hockey|tennis|ufc|mma)\b",
        re.I,
    )
    football_market = re.compile(
        r"\b(full time result|total goals?|player goals?|goalscorer|btts|both teams|corners?|shots on target|booked|to score|player shots|spread|moneyline|money line|handicap|asian handicap|double chance|half time|1x2|draw no bet)\b",
        re.I,
    )
    if FIXTURE_VS_PATTERN.search(match_text) and not non_football.search(haystack):
        if football_market.search(haystack) or not re.search(r"\b(basketball|baseball|cricket|hockey|tennis|mma|rugby|esports?)\b", haystack, re.I):
            return "Football"
    return ""

def infer_sport_from_bet(source):
    haystack = " ".join(
        clean_string(source.get(key, ""))
        for key in ("league", "country", "match", "fixture_name", "searchEvent", "market", "selection", "multi_bet_description")
    ).lower()
    if not haystack:
        return ""

    for sport, pattern in MARKET_SPORT_HINTS + LEAGUE_SPORT_HINTS + TEAM_SPORT_HINTS:
        if pattern.search(haystack):
            return sport

    match_text = " ".join(
        clean_string(source.get(key, ""))
        for key in ("match", "fixture_name", "searchEvent")
    ).lower()
    inferred = _infer_sport_from_context(haystack, match_text)
    if inferred:
        return inferred

    multi = source.get("multi_bet_selections") or []
    if isinstance(multi, list):
        for leg in multi:
            if not isinstance(leg, dict):
                continue
            leg_haystack = " ".join(
                clean_string(leg.get(key, ""))
                for key in ("league", "country", "match", "fixture_name", "searchEvent", "market", "selection", "event", "description")
            ).lower()
            leg_match = " ".join(
                clean_string(leg.get(key, ""))
                for key in ("match", "fixture_name", "searchEvent", "event")
            ).lower()
            for sport, pattern in MARKET_SPORT_HINTS + LEAGUE_SPORT_HINTS + TEAM_SPORT_HINTS:
                if pattern.search(leg_haystack):
                    return sport
            inferred = _infer_sport_from_context(leg_haystack, leg_match)
            if inferred:
                return inferred
    return ""

def polymarket_fuzzy_query(bet_doc):
    match = clean_string(bet_doc.get("match") or bet_doc.get("searchEvent") or bet_doc.get("fixture_name") or "")
    selection = clean_string(bet_doc.get("selection") or "")
    market = clean_string(bet_doc.get("market") or "")
    if not match and not selection:
        return None

    clauses = []
    if match and re.search(r"\bvs\b", match, re.I):
        teams = re.split(r"\s+v(?:s|\.)?\s+", match, flags=re.I)
        team_terms = [re.escape(team.strip()) for team in teams if len(team.strip()) >= 3]
        if team_terms:
            team_regex = ".*".join(team_terms)
            for field in ("match", "event_name", "event", "event_title", "game", "title"):
                clauses.append({field: {"$regex": team_regex, "$options": "i"}})
            home, away = teams[0].strip(), teams[-1].strip()
            if home and away:
                clauses.append({"home": {"$regex": re.escape(home), "$options": "i"}, "away": {"$regex": re.escape(away), "$options": "i"}})
                clauses.append({"home_team": {"$regex": re.escape(home), "$options": "i"}, "away_team": {"$regex": re.escape(away), "$options": "i"}})
    elif match:
        for field in ("match", "event_name", "event", "event_title", "title"):
            clauses.append({field: {"$regex": re.escape(match), "$options": "i"}})

    if selection:
        for field in ("selection", "market", "market_name", "question", "player"):
            clauses.append({field: {"$regex": re.escape(selection[:80]), "$options": "i"}})
    if market:
        for field in ("market", "market_name"):
            clauses.append({field: {"$regex": re.escape(market[:80]), "$options": "i"}})
    return {"$or": clauses} if clauses else None

def polymarket_doc_score(doc, bet_doc):
    text = " ".join(
        clean_string(doc.get(key, ""))
        for key in ("match", "event_name", "event", "event_title", "game", "title", "home", "away", "home_team", "away_team", "selection", "market", "market_name", "question", "player", "sport", "league")
    ).lower()
    match = clean_string(bet_doc.get("match") or bet_doc.get("searchEvent") or "").lower()
    selection = clean_string(bet_doc.get("selection") or "").lower()
    market = clean_string(bet_doc.get("market") or "").lower()
    score = 0
    for token in match.split():
        if len(token) > 2 and token in text:
            score += 8
    for token in selection.split():
        if len(token) > 2 and token in text:
            score += 12
    for token in market.split():
        if len(token) > 3 and token in text:
            score += 5
    if selection and selection in text:
        score += 30
    date = clean_string(bet_doc.get("date") or "")[:10]
    if date and date in str(doc):
        score += 20
    return score

def polymarket_event_tokens(value):
    text = normalize_text(value)
    stop = {
        "the", "and", "vs", "v", "fc", "sc", "cf", "afc", "bk", "bc", "club",
        "city", "united", "esports", "gaming", "league", "summer", "nba",
        "basketball", "football", "soccer", "baseball", "tennis", "cricket",
    }
    return [token for token in text.split() if len(token) > 2 and token not in stop]

def polymarket_source_event_matches(source, bet_doc):
    match_text = clean_string(bet_doc.get("match") or bet_doc.get("searchEvent") or "")
    wanted_tokens = polymarket_event_tokens(match_text)
    if not wanted_tokens:
        return True

    source_text = " ".join(str(source.get(k) or "") for k in (
        "event_name", "match", "event", "event_title", "game", "title", "question",
        "home", "away", "home_team", "away_team", "polymarket_url", "polymarket_slug",
        "slug", "ticker",
    ))
    source_tokens = set(polymarket_event_tokens(source_text))
    if not source_tokens:
        return True

    hits = [token for token in wanted_tokens if token in source_tokens]
    if len(wanted_tokens) >= 2:
        return len(hits) >= 2
    return bool(hits)

def find_polymarket_source(db, bet_doc):
    market_id = clean_string(bet_doc.get("polymarket_market_id"))
    condition_id = clean_string(bet_doc.get("condition_id"))
    token_id = clean_string(bet_doc.get("token_id"))
    slug = clean_string(bet_doc.get("polymarket_slug"))
    url = clean_string(bet_doc.get("polymarket_url"))
    query = polymarket_query_from_ids(market_id, condition_id, token_id, slug, url)
    if query:
        for collection_name in ("polymarket_alerts", "polymarket_sent_alerts", "all_value_bets"):
            doc = db[collection_name].find_one(query)
            if doc and polymarket_source_event_matches(doc, bet_doc):
                return doc, collection_name

    fuzzy_query = polymarket_fuzzy_query(bet_doc)
    if not fuzzy_query:
        return None, None
    best = None
    for collection_name in ("polymarket_alerts", "polymarket_sent_alerts", "all_value_bets"):
        try:
            docs = list(db[collection_name].find(fuzzy_query).limit(25))
        except Exception:
            continue
        for doc in docs:
            if not polymarket_source_event_matches(doc, bet_doc):
                continue
            score = polymarket_doc_score(doc, bet_doc)
            if score <= 0:
                continue
            if not best or score > best[0]:
                best = (score, collection_name, doc)
    if not best or best[0] < 35:
        return None, None
    return best[2], best[1]

POLY_GENERIC_MARKET_TOKENS = {
    "over", "under", "total", "totals", "yes", "no", "the", "and", "market", "markets",
    "props", "prop", "player", "line", "lines", "spread", "team", "match", "result",
    "full", "time", "game", "odds", "bet",
}


def _poly_market_tokens(value):
    return {t for t in normalize_text(value).split()
            if len(t) > 2 and t not in POLY_GENERIC_MARKET_TOKENS}


def polymarket_market_confirms(source, bet_doc):
    """Is `source` the bet's OWN market, or merely another market of the same event?

    polymarket_doc_score is event-dominated: five team tokens (8 each) plus the date (+20)
    clear its threshold of 35 on their own while the market contributes nothing, so a fuzzy
    hit routinely lands on a DIFFERENT market of the right game. Everything that identifies
    a market — the ids, the resolution, the sharp-line snapshot — must therefore be gated on
    the market itself agreeing. An NRFI bet took "Total Runs Over/Under"'s market id,
    condition/token and 9.5 line this way: its Polygun deep link opened the wrong market and
    its CLV inputs described a different bet entirely.

    Fails CLOSED — an unconfirmable market means the bet keeps no id rather than a wrong one
    (a missing id is recoverable by backfill; a wrong one misgrades silently).
    """
    # An id-level hit IS the bet's own market by construction.
    for key in ("polymarket_market_id", "condition_id", "token_id"):
        mine = clean_string(bet_doc.get(key)).lower()
        theirs = clean_string(source.get(key) or (source.get("market_id") if key == "polymarket_market_id" else "")).lower()
        if mine and theirs and mine == theirs:
            return True
    # A player prop is identified by its player as much as by its stat.
    bet_tokens = _poly_market_tokens(bet_doc.get("market")) | _poly_market_tokens(bet_doc.get("player_name"))
    source_tokens = _poly_market_tokens(" ".join(
        str(source.get(k) or "") for k in ("market_name", "market", "question", "selection", "player")))
    if not bet_tokens or not source_tokens:
        return False
    return bool(bet_tokens & source_tokens)


def apply_polymarket_source(bet_doc, source, collection_name):
    event_name = clean_string(source.get("event_name") or source.get("match") or "")
    if not event_name:
        home = clean_string(source.get("home") or source.get("home_team") or source.get("polymarket_home"))
        away = clean_string(source.get("away") or source.get("away_team") or source.get("polymarket_away"))
        if home and away:
            event_name = f"{home} vs {away}"

    if event_name and not clean_string(bet_doc.get("match")):
        bet_doc["match"] = event_name
    sport_value = normalize_sport_name(source.get("sport") or source.get("event_sport") or source.get("eventSport") or "")
    if sport_value and not clean_string(bet_doc.get("sport")):
        bet_doc["sport"] = sport_value
    if source.get("league") and not clean_string(bet_doc.get("league")):
        bet_doc["league"] = clean_string(source.get("league"))
    if source.get("country") and not clean_string(bet_doc.get("country")):
        bet_doc["country"] = clean_string(source.get("country"))

    match_dt = clean_string(source.get("match_date") or source.get("game_date") or source.get("date") or "")
    if match_dt:
        if not clean_string(bet_doc.get("date")):
            bet_doc["date"] = match_dt[:10]
        if not clean_string(bet_doc.get("time")) and "T" in match_dt:
            bet_doc["time"] = match_dt.split("T", 1)[1][:5]

    bet_doc["polymarket_metadata_source"] = collection_name
    # Only a CONFIRMED same-market source may hand over market identity; an event-level
    # match still supplies the event fields above (teams/sport/league/date), which are true
    # of every market on the game. polymarket_url/slug are event-scoped, so they stay.
    market_confirmed = polymarket_market_confirms(source, bet_doc)
    bet_doc["polymarket_source_scope"] = "market" if market_confirmed else "event"
    id_keys = ("polymarket_url", "polymarket_slug")
    if market_confirmed:
        id_keys = ("polymarket_market_id", "condition_id", "token_id") + id_keys + ("market_id",)
    for key in id_keys:
        if source.get(key) and not clean_string(bet_doc.get(key if key != "market_id" else "polymarket_market_id")):
            target = "polymarket_market_id" if key == "market_id" else key
            bet_doc[target] = clean_string(source.get(key))
    if market_confirmed and source.get("market_name") and not clean_string(bet_doc.get("market")):
        bet_doc["market"] = normalize_market(clean_string(source.get("market_name")))

    rt = source.get("result_tracking") if isinstance(source.get("result_tracking"), dict) else None
    if rt and not market_confirmed:
        # Another market's resolution would settle this bet on the wrong question.
        rt = None
    if rt:
        bet_doc.setdefault("result_tracking", {})
        bet_doc["result_tracking"]["polymarket_resolution"] = rt.get("market_resolution") or {}
        bet_doc["result_tracking"]["polymarket_source"] = collection_name
        if rt.get("status") and clean_string(bet_doc.get("status", "")).lower() == "pending":
            bet_doc["result_tracking"]["resolved_status_candidate"] = clean_string(rt.get("status")).lower()

    # --- Sharp-line snapshot at track-time (CLV + live drift monitoring) ---
    # The source alert leaves the live feeds once the game kicks off, so the
    # sharp source + line and the selection anchor (event_id/market/side/hdp)
    # MUST be captured NOW; they cannot be reconstructed later. sharp_source is
    # per-alert ("PIN"/"365"/"FBS"/…) - never assume Pinnacle. Only stamp what's
    # missing so a later re-save never overwrites the original entry snapshot.
    if not market_confirmed:
        # The sharp snapshot (source/line/side/event anchor) describes a SPECIFIC market.
        # Taken from a neighbouring market it is worse than absent: it silently anchors CLV
        # and drift to a different bet — this is where the NRFI bet got hdp 9.5 / side
        # "under" off a Total Runs line.
        return bet_doc
    if bet_doc.get("sharp_source") is None and source.get("sharp_source") is not None:
        bet_doc["sharp_source"] = source.get("sharp_source")
    if bet_doc.get("entry_sharp_odds") is None and source.get("sharp_odds") is not None:
        # Guard against a transient WRONG-LINE sharp (the Polymarket resolver can briefly stamp a
        # different rung's price onto sharp_odds); fall back to the stable opening when it's a
        # big outlier, so entry_sharp reflects the bet's actual line.
        _side = str(bet_doc.get("bet_side") or source.get("bet_side") or "").lower()
        try:
            from SharedServices.tracking.sharp_entry_guard import sanitize_entry_sharp as _sanitize
            _eso, _ovr = _sanitize(source.get("sharp_odds"), source.get("opening_sharp_odds"), _side)
        except Exception:
            _eso, _ovr = source.get("sharp_odds"), False
        bet_doc["entry_sharp_odds"] = _eso
        if _ovr:
            bet_doc["entry_sharp_glitch_guarded"] = True
        bet_doc["sharp_captured_at"] = datetime.now(timezone.utc)
    if bet_doc.get("event_id") is None:
        ev = source.get("event_id") or source.get("id") or source.get("historical_event_id")
        if ev is not None:
            bet_doc["event_id"] = ev
    if bet_doc.get("market_hdp") is None and source.get("market_hdp") is not None:
        bet_doc["market_hdp"] = source.get("market_hdp")
    if bet_doc.get("bet_side") is None:
        side = source.get("bet_side") or source.get("betSide") or source.get("side")
        if side is not None:
            bet_doc["bet_side"] = side
    if bet_doc.get("entry_book_odds") is None and source.get("bookmaker_odds") is not None:
        bet_doc["entry_book_odds"] = source.get("bookmaker_odds")
    return bet_doc

def clean_number(value, default=None):
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

def clean_int(value, default=None):
    if value in (None, ""):
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default

def bet_dedup_key(bet, include_message_key=True):
    """Stable fingerprint for duplicate detection and delete tombstones."""
    bankroll_id = clean_string(bet.get("bankroll_id") or bet.get("bankrollId") or "personal") or "personal"
    match_name = clean_string(bet.get("match") or bet.get("searchEvent") or bet.get("fixture_name") or "").lower()
    selection = clean_string(bet.get("selection") or "").lower()
    market = clean_string(bet.get("market") or "").lower()
    try:
        odds = round(parse_odds_value(bet.get("odds") or bet.get("display_odds")) or 0, 4)
    except (TypeError, ValueError):
        odds = 0.0
    try:
        stake = round(float(bet.get("recommended_stake") or bet.get("actual_stake") or bet.get("units_staked") or bet.get("stake") or 0), 4)
    except (TypeError, ValueError):
        stake = 0.0
    date = clean_string(bet.get("date") or "")[:10]
    parts = [bankroll_id, match_name, selection, market, f"{odds:.4f}", f"{stake:.4f}", date]
    if include_message_key:
        source_key = clean_string(bet.get("source_message_key") or bet.get("sourceMessageKey") or "")
        if source_key:
            parts.append(source_key)
    return "|".join(parts)


def _web_pending_bet_view(payload, candidate, reason):
    """Shape a web new-bet payload into the pending_bets item the /track/pending review UI
    renders - same fields as the Telegram path's _pending_view - so an approved item rebuilds a
    complete save payload."""
    tags, sync_label = normalize_tags(payload)
    return {
        "bet_id": None,
        "alert_id": clean_string(payload.get("alertId") or payload.get("alert_id") or ""),
        "bet_type": "multiple" if payload.get("multi_bet_selections") else "single",
        "searchEvent": clean_string(candidate.get("match") or payload.get("searchEvent") or ""),
        "date": clean_string(candidate.get("date") or payload.get("date") or ""),
        "time": clean_string(payload.get("time") or ""),
        # Canonical kickoff instant (UTC ISO) - display layers render it in the bankroll timezone.
        "kickoff_utc": clean_string(payload.get("kickoffUtc") or payload.get("kickoff_utc") or "") or None,
        "country": clean_string(payload.get("country") or ""),
        "league": clean_string(payload.get("league") or ""),
        "selection": clean_string(candidate.get("selection") or payload.get("selection") or ""),
        "market": clean_string(candidate.get("market") or payload.get("market") or ""),
        "betDirection": clean_string(payload.get("betDirection") or ""),
        "player_name": clean_string(payload.get("player_name") or payload.get("playerName") or ""),
        "threshold": payload.get("threshold"),
        "odds": candidate.get("odds"),
        "stake": candidate.get("recommended_stake"),
        "bookmaker": clean_string(payload.get("bookmaker") or ""),
        # Alert value (100+ convention) must survive the pending-review detour, or an approved
        # duplicate imports with value_percentage=0 ("No value" in analytics).
        "value_percentage": candidate.get("value_percentage") or clean_number(payload.get("valuePercentage") or payload.get("value_percentage"), 0),
        "model_odds": candidate.get("model_odds") or clean_number(payload.get("modelOdds") or payload.get("model_odds")),
        "chance_percentage": candidate.get("chance_percentage") or clean_number(payload.get("chancePercentage") or payload.get("chance_percentage")),
        "sync_label": sync_label or "",
        "tags": tags,
        "multi_bet_selections": payload.get("multi_bet_selections") or [],
        "multi_bet_description": clean_string(payload.get("multi_bet_description") or payload.get("multiBetDescription") or ""),
        "status": clean_string(payload.get("status") or "pending"),
        "reasons": [reason],
    }


def resolve_original_message(db, payload, source_message_key):
    """The raw alert/slip text the bet was parsed from. Web imports send it in the payload;
    live-synced bets already have it on their telegram_import_queue item, so copy it from
    there. Stored on the bet (truncated) so the edit view can always show the source."""
    text = clean_string(payload.get("originalMessage") or payload.get("original_message") or "")
    if not text and source_message_key:
        q = db["telegram_import_queue"].find_one({"message_key": source_message_key}, {"text": 1})
        if q:
            text = clean_string(q.get("text") or "")
    return text[:4000] if text else ""


def store_source_images(db, message_key, user_id, images):
    """Slip screenshots go to a sidecar collection keyed by the message - NEVER inline on the
    bet: user_tracked_bets docs already run close to the 16MB limit and base64 images inside
    the bets array would blow it. Returns True when at least one image was stored."""
    imgs = [i for i in (images or [])
            if isinstance(i, str) and i.startswith("data:image/") and len(i) <= 2_000_000][:3]
    if not (message_key and imgs):
        return False
    db["imported_message_sources"].update_one(
        {"message_key": message_key, "user_id": user_id},
        {"$set": {"images": imgs, "saved_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return True


def send_web_bet_to_pending(col, user_id, payload, candidate, target_bankroll_id, bankroll_name, reason, dup_bet):
    """Route a web-saved bet flagged as a duplicate into the SAME Pending Review queue the
    Telegram-import path uses (telegram_import_queue, status=pending_review), so it is surfaced for
    the user to confirm or discard instead of being silently dropped. Returns the message_key."""
    mk = "webdup|" + str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    col.database["telegram_import_queue"].insert_one({
        "message_key": mk,
        "user_id": user_id,
        "bankroll_id": target_bankroll_id,
        "bankroll_name": bankroll_name or ("Personal" if target_bankroll_id == "personal" else target_bankroll_id),
        "status": "pending_review",
        "source": "web_new_bet",
        "chat_title": "Web · New Bet",
        "text": clean_string(candidate.get("selection") or candidate.get("match") or ""),
        "confidence": 0,
        "pending_bets": [_web_pending_bet_view(payload, candidate, reason)],
        "review_reasons": [reason],
        "duplicate_of_bet_id": (dup_bet or {}).get("bet_id"),
        "created_at": now,
        "received_at": now,
        "processed_at": now,
    })
    return mk


def is_bet_dismissed(user_doc, bet_or_key):
    dismissed = user_doc.get("dismissed_bet_fingerprints") if user_doc else []
    if not dismissed:
        return False
    key = bet_or_key if isinstance(bet_or_key, str) else bet_dedup_key(bet_or_key)
    return key in dismissed


def normalize_tags(payload):
    tags = []
    raw_tags = payload.get("tags")
    if isinstance(raw_tags, list):
        tags.extend(clean_string(tag) for tag in raw_tags)
    elif isinstance(raw_tags, str):
        tags.extend(clean_string(tag) for tag in raw_tags.split(","))

    sync_label = clean_string(payload.get("syncLabel") or payload.get("sync_label"))
    if sync_label:
        tags.append(sync_label)

    seen = set()
    out = []
    for tag in tags:
        key = tag.lower()
        if tag and key not in seen:
            seen.add(key)
            out.append(tag)
    return out, sync_label

def _format_decimal(value):
    formatted = f"{value:.2f}"
    return formatted.rstrip("0").rstrip(".") if "." in formatted else formatted

def _format_cents(value):
    return f"{value:.2f}".rstrip("0").rstrip(".")

def _extract_cents(value):
    match = re.search(r"(\d+(?:\.\d+)?)\s*(?:¢|c\b)", str(value or ""), re.IGNORECASE)
    if not match:
        return None
    try:
        cents = float(match.group(1))
    except ValueError:
        return None
    return cents if cents > 0 else None

def _lift_price_from_selection(payload):
    """If odds is blank, try trailing American/decimal on the selection line.

    Tipster cards: 'Dynamo Dresden - Spread 0.0 (-128)' - price lives in parentheses.
    Returns (maybe_updated_payload_dict, odds_raw_or_empty). Does not mutate caller's dict
    unless we write back a cleaned selection.
    """
    if not isinstance(payload, dict):
        return payload, ""
    raw_odds = clean_string(
        payload.get("displayOdds") or payload.get("display_odds") or payload.get("odds") or ""
    )
    if raw_odds:
        return payload, ""
    sel = clean_string(payload.get("selection") or "")
    if not sel:
        return payload, ""
    # Parenthesized American |n|≥100
    m = re.search(r"\s*\(\s*([+-]?\d{3,5})\s*\)\s*$", sel)
    if m and abs(int(m.group(1))) >= 100:
        n = int(m.group(1))
        odds_raw = f"+{n}" if n > 0 else str(n)
        payload["selection"] = sel[: m.start()].strip(" -–")
        return payload, odds_raw
    m2 = re.search(r"\s*@\s*([+-]?\d+(?:\.\d+)?|\d+\s*/\s*\d+)\s*$", sel)
    if m2:
        payload["selection"] = sel[: m2.start()].strip(" -–")
        return payload, clean_string(m2.group(1))
    return payload, ""


def parse_odds_payload(payload, fallback=None):
    """Accept decimal, fractional, American, Polymarket cents, and evens.

    Returns (decimal_odds, display_string, entry_price_cents|None).
    Free-typed values from any track page (new-bet / pending / import / CLV)
    go through here so users never need a format selector.
    """
    if not isinstance(payload, dict):
        payload = {"odds": payload}
    # Lift embedded tipster price off selection when odds field is empty.
    payload, lifted = _lift_price_from_selection(payload)
    raw = clean_string(
        payload.get("displayOdds")
        or payload.get("display_odds")
        or payload.get("odds")
        or lifted
        or fallback
        or ""
    )
    entry_cents = clean_number(payload.get("entryPriceCents") or payload.get("entry_price_cents"))
    cents = _extract_cents(raw) or entry_cents
    odds = None

    # Evens
    if re.fullmatch(r"(?:evs|evens|even)", raw, re.I):
        return 2.0, "2 (evens)", None

    # American odds ("-111" / "+150", optionally parenthesized): three+ digits so a
    # handicap token ("+1") can never read as a price. Bare unsigned integers are
    # treated as decimal below, because decimal longshots (25, 50, 100, 450) are
    # common for player props and bet builders and must not be misread as American.
    us = re.fullmatch(r"\(?\s*([+-]\d{3,5})\s*\)?", raw)
    if not cents and us and abs(int(us.group(1))) >= 100:
        n = int(us.group(1))
        odds = 1 + (n / 100.0 if n > 0 else 100.0 / abs(n))
        label = us.group(1)
        return odds, f"{_format_decimal(odds)} ({label})", None

    # Fractional ("9/10", "5/2") - must not fall through to bare-number (would save 9.0).
    frac = re.fullmatch(r"\s*(\d+)\s*/\s*(\d+)\s*", raw)
    if not cents and frac and float(frac.group(2)):
        odds = 1 + float(frac.group(1)) / float(frac.group(2))
        return odds, f"{_format_decimal(odds)} ({frac.group(1)}/{frac.group(2)})", None

    if cents:
        candidates = [
            m.group(1)
            for m in re.finditer(r"(?<![\d.])(\d+(?:\.\d+)?)(?![\d.]|\s*(?:¢|c\b))", raw, re.IGNORECASE)
            if clean_number(m.group(1)) != cents
        ]
        for candidate in candidates:
            parsed = clean_number(candidate)
            if parsed and 1.0 <= parsed <= 100.0:
                odds = parsed
                break
        if odds is None:
            odds = 100.0 / cents
        return odds, f"{_format_decimal(odds)} ({_format_cents(cents)}¢)", cents

    match = re.search(r"(?<![\d.])(\d+(?:\.\d+)?)(?![\d.])", raw)
    if match:
        odds = clean_number(match.group(1), 0.0)
        return odds or 0.0, _format_decimal(odds or 0.0), None
    return 0.0, raw, None


def parse_odds_value(value, fallback=None):
    """Parse a bare odds string/number (closing line, leg price, etc.) to decimal."""
    if value in (None, ""):
        if fallback in (None, ""):
            return None
        value = fallback
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        n = float(value)
        # Stored decimals are 1–50; American integers are |n|>=100.
        if 1.0 < n < 100.0:
            return n
        if abs(n) >= 100:
            return 1 + (n / 100.0 if n > 0 else 100.0 / abs(n))
        return n if n > 1 else None
    dec, _disp, _cents = parse_odds_payload({"odds": value}, fallback)
    return dec if dec and dec > 1 else None

def parse_cashout_payload(value, entry_cents=None):
    raw = clean_string(value)
    if not raw:
        return None, None
    exit_cents = _extract_cents(raw)
    if exit_cents is None:
        exit_cents = clean_number(raw) if raw.endswith("c") else None
    if exit_cents is not None:
        multiplier = (exit_cents / entry_cents) if entry_cents else None
        return multiplier, exit_cents
    return clean_number(raw), None

def settle_returns(status, stake, odds, cashed_out_odds=None):
    status = clean_string(status).lower().replace("_", " ")
    returns = 0.0
    profit_loss = 0.0
    if status == "won":
        returns = stake * odds
        profit_loss = returns - stake
    elif status == "lost":
        profit_loss = -stake
    elif status in ("refund", "void", "push", "refunded"):
        status = "refund" if status in ("push", "refunded") else status
        returns = stake
    elif status == "half win":
        returns = stake + ((stake * (odds - 1.0)) / 2.0)
        profit_loss = returns - stake
    elif status == "half loss":
        returns = stake / 2.0
        profit_loss = -(stake / 2.0)
    elif status == "cashed out":
        if cashed_out_odds:
            returns = stake * cashed_out_odds
            profit_loss = returns - stake
    return status, returns, profit_loss

def build_status_settlement_fields(existing_bet, status, now):
    """Compute the ($set, $unset) field dicts to move a bet to `status`, using the
    bet's own stake/odds. Mirrors the single-bet status-update path exactly, including
    the manual_reset_to_pending branch that clears manual_override so the grader
    re-picks the bet up. Shared by the bulk-status path so mass changes need ONE pass."""
    status = clean_string(status).lower()
    stake = existing_bet.get("actual_stake", existing_bet.get("units_staked", 0.0))
    try:
        stake = float(stake)
    except (TypeError, ValueError):
        stake = 0.0
    odds = parse_odds_value(
        existing_bet.get("odds"),
        existing_bet.get("display_odds"),
    ) or 0.0
    co_odds = existing_bet.get("cashed_out_odds")
    status, returns, profit_loss = settle_returns(status, stake, odds, co_odds)
    is_manual = status != "pending"

    set_fields = {
        "bets.$.status": status,
        "bets.$.returns": returns,
        "bets.$.profit_loss": profit_loss,
        "bets.$.manual_override": is_manual,
        "bets.$.last_updated": now,
        "bets.$.updated_at": now,
    }
    unset_fields = {}
    if is_manual:
        set_fields["bets.$.manually_graded_at"] = now
        set_fields["bets.$.settled_at"] = now
        set_fields["bets.$.result_tracking.result_status"] = status
        set_fields["bets.$.result_tracking.result_changed_at"] = now
        set_fields["bets.$.result_tracking.result_changed_reason"] = "manual_override"
        set_fields["bets.$.result_tracking.manually_graded_at"] = now
        set_fields["bets.$.result_tracking.graded_at"] = now
    else:
        unset_fields["bets.$.manually_graded_at"] = ""
        unset_fields["bets.$.settled_at"] = ""
        unset_fields["bets.$.result_tracking.manually_graded_at"] = ""
        set_fields["bets.$.result_tracking.result_status"] = status
        set_fields["bets.$.result_tracking.result_changed_at"] = now
        set_fields["bets.$.result_tracking.result_changed_reason"] = "manual_reset_to_pending"
        set_fields["bets.$.result_tracking.graded_at"] = None
    return set_fields, unset_fields

def normalize_multi_selection(sel):
    # Per-leg closing line (multi-EVENT bets): each leg carries its own close; the parent's
    # closing_line_odds is their product. Preserve it (+ source) so edits/re-saves don't strip
    # a value clv_recovery attached. Accept a manual entry from the edit form too.
    leg_close = parse_odds_value(sel.get("closing_line_odds") or sel.get("closingLineOdds"))
    leg_odds = parse_odds_value(sel.get("odds") or sel.get("display_odds") or sel.get("displayOdds"))
    result = {
        "market": clean_string(sel.get("market", "")),
        "selection": clean_string(sel.get("selection", "")),
        "player_name": clean_string(sel.get("player_name") or sel.get("playerName") or ""),
        "team": clean_string(sel.get("team") or sel.get("teamName") or ""),
        "direction": normalize_direction(sel.get("bet_direction") or sel.get("betDirection") or sel.get("direction") or ""),
        "odds": leg_odds if leg_odds is not None else (sel.get("odds", 0) or 0),
        "match": clean_string(sel.get("match") or sel.get("searchEvent") or ""),
        "date": clean_string(sel.get("date", "")),
        "time": clean_string(sel.get("time", "")),
        "country": clean_string(sel.get("country", "")),
        "league": clean_string(sel.get("league", "")),
        "sport": clean_string(sel.get("sport") or sel.get("eventSport") or ""),
        "polymarket_market_id": clean_string(sel.get("polymarket_market_id") or sel.get("polymarketMarketId") or sel.get("market_id")),
        "condition_id": clean_string(sel.get("condition_id") or sel.get("conditionId")),
        "token_id": clean_string(sel.get("token_id") or sel.get("tokenId")),
        "polymarket_url": clean_string(sel.get("polymarket_url") or sel.get("polymarketUrl")),
        "polymarket_slug": clean_string(sel.get("polymarket_slug") or sel.get("polymarketSlug")),
    }
    if leg_close is not None:
        result["closing_line_odds"] = leg_close
        src = clean_string(sel.get("closing_odds_source"))
        if src:
            result["closing_odds_source"] = src
    return result

def polymarket_query_from_ids(market_id="", condition_id="", token_id="", slug="", url=""):
    clauses = []
    if market_id:
        clauses.extend([
            {"polymarket_market_id": market_id},
            {"market_id": market_id},
            {"id": market_id},
            {"result_tracking.market_resolution.market_id": market_id},
        ])
    if condition_id:
        clauses.extend([
            {"condition_id": condition_id.lower()},
            {"condition_id": condition_id},
            {"result_tracking.market_resolution.condition_id": condition_id.lower()},
            {"result_tracking.market_resolution.condition_id": condition_id},
        ])
    if token_id:
        clauses.append({"token_id": token_id})
    if slug:
        clauses.extend([
            {"polymarket_slug": slug},
            {"slug": slug},
        ])
    if url:
        clauses.append({"polymarket_url": url})
    return {"$or": clauses} if clauses else None

def enrich_with_polymarket_metadata(db, bet_doc):
    source, collection_name = find_polymarket_source(db, bet_doc)
    if not source:
        return bet_doc
    return apply_polymarket_source(bet_doc, source, collection_name)

# ---- Overflow-document storage --------------------------------------------------
# A user's bets are split across MULTIPLE user_tracked_bets docs (same user_id) so no
# single doc hits MongoDB's 16MB cap. A user's full bet list = the union of every
# doc's `bets` array. Positional updates ({user_id, "bets.bet_id": id}) still target
# the one doc holding that bet, so grading/settle writes need no change.
BETS_PER_DOC = 1000  # ~9KB/heavy bet -> ~9MB/doc, comfortably under 16MB

def iter_user_bet_docs(col, user_id, projection=None):
    """All user_tracked_bets docs for a user (oldest first)."""
    return list(col.find({"user_id": user_id}, projection).sort("created_at", 1))

def all_user_bets(col, user_id):
    """Flattened list of every bet across a user's overflow docs."""
    out = []
    for d in iter_user_bet_docs(col, user_id, {"bets": 1, "created_at": 1}):
        out.extend(d.get("bets") or [])
    return out

def append_user_bets(col, user_id, new_bets, now):
    """Append bets, filling docs that have room and spilling into fresh docs so none
    exceeds BETS_PER_DOC. Handles a single bet or a bulk batch uniformly."""
    remaining = list(new_bets)
    while remaining:
        agg = list(col.aggregate([
            {"$match": {"user_id": user_id}},
            {"$project": {"n": {"$size": {"$ifNull": ["$bets", []]}}}},
            {"$match": {"n": {"$lt": BETS_PER_DOC}}},
            {"$sort": {"n": -1}},   # top up the fullest doc-with-room first
            {"$limit": 1},
        ]))
        if agg:
            room = BETS_PER_DOC - int(agg[0].get("n", 0))
            chunk, remaining = remaining[:room], remaining[room:]
            col.update_one({"_id": agg[0]["_id"]},
                           {"$push": {"bets": {"$each": chunk}}, "$set": {"updated_at": now}})
        else:
            chunk, remaining = remaining[:BETS_PER_DOC], remaining[BETS_PER_DOC:]
            col.insert_one({"user_id": user_id, "bets": chunk,
                            "created_at": now, "updated_at": now})

def primary_user_doc_id(col, user_id):
    """The user's OLDEST tracked-bets doc - the single home for user-level fields
    (dismissed_bet_fingerprints) that must not be split across overflow docs."""
    d = col.find_one({"user_id": user_id}, {"_id": 1}, sort=[("created_at", 1)])
    return d["_id"] if d else None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No payload provided"}))
        sys.exit(1)

    # A payload of "-" means it's piped via stdin - used for large bulk-import bodies that
    # would exceed the OS single-argument length limit (~128KB on Linux).
    raw_payload = sys.stdin.read() if sys.argv[1] == "-" else sys.argv[1]
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON payload: {e}"}))
        sys.exit(1)
        
    user_id_str = payload.get("userId")
    if not user_id_str:
        print(json.dumps({"error": "Missing user_id"}))
        sys.exit(1)
        
    try:
        user_id = int(user_id_str)
    except ValueError:
        user_id = user_id_str
        
    # Import config from PROPPR
    import pymongo
    import certifi
    from dotenv import load_dotenv
    
    local_env = "/Users/zinq/PycharmProjects/Cerebro/PROPPR/.env"
    server_env = "/opt/proppr/.env"
    server_env_upper = "/opt/PROPPR/.env"
    
    if os.path.exists(local_env):
        load_dotenv(local_env)
        sys.path.append("/Users/zinq/PycharmProjects/Cerebro/PROPPR")
    elif os.path.exists(server_env_upper):
        load_dotenv(server_env_upper)
        sys.path.append("/opt/PROPPR")
    else:
        load_dotenv(server_env)
        sys.path.append("/opt/proppr")
        
    # Canonical market -> grading-stat resolver (stat_type/api_type_id/api_location).
    # Imported AFTER the PROPPR path is on sys.path (above). Guarded so a save never
    # fails if the shared parser can't be imported - it just falls back to no metadata.
    try:
        from SharedServices.tracking.bet_parser import market_metadata as _market_metadata
        from SharedServices.tracking.bet_parser import _PLAYER_STAT_MARKETS as _PLAYER_STAT_MARKETS
        from SharedServices.tracking.bet_parser import canonicalize_bet_fields as _canonicalize_bet_fields
        from SharedServices.tracking.bet_parser import derive_handicap_side as _derive_handicap_side
        from SharedServices.tracking.multiple_settlement import is_full_cover_type, _number_of_bets
    except Exception:
        def _market_metadata(_market):
            return {}
        _PLAYER_STAT_MARKETS = {}
        def _canonicalize_bet_fields(_parsed):
            return _parsed
        def _derive_handicap_side(_selection, _home, _away):
            return ""
        def is_full_cover_type(_t):
            return False
        def _number_of_bets(_t, _n):
            return 1

    MONGO_CONN_STR = (
        os.getenv("MONGODB_URI_OVERRIDE") or
        os.getenv("MONGO_CONNECTION_STRING") or
        os.getenv("MONGODB_CONNECTION_STRING") or
        os.getenv("MONGODB_URI_PRODUCTION") or
        os.getenv("MONGODB_URI_DEVELOPMENT") or
        "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&tls=false"
    )
    
    if not MONGO_CONN_STR:
        print(json.dumps({"error": "Mongo connection string not found in PROPPR/.env"}))
        sys.exit(1)
        
    try:
        client = pymongo.MongoClient(MONGO_CONN_STR, tlsCAFile=certifi.where())
    except (TypeError, pymongo.errors.ConfigurationError):
        client = pymongo.MongoClient(MONGO_CONN_STR)
        
    db = client["Cerebro"]
    user_tracked_bets_col = db["user_tracked_bets"]

    if payload.get("enrichOnly"):
        bet_doc = {
            "match": clean_string(payload.get("searchEvent") or payload.get("match") or payload.get("fixture_name") or ""),
            "selection": clean_string(payload.get("selection") or ""),
            "market": clean_string(payload.get("market") or ""),
            "date": clean_string(payload.get("date") or ""),
            "time": clean_string(payload.get("time") or ""),
            "kickoff_utc": clean_string(payload.get("kickoffUtc") or payload.get("kickoff_utc") or "") or None,
            "country": clean_string(payload.get("country") or ""),
            "league": clean_string(payload.get("league") or ""),
            "sport": normalize_sport_name(payload.get("eventSport") or payload.get("sport") or ""),
            "polymarket_market_id": clean_string(payload.get("polymarketMarketId") or payload.get("polymarket_market_id") or payload.get("market_id") or ""),
            "condition_id": clean_string(payload.get("conditionId") or payload.get("condition_id") or ""),
            "token_id": clean_string(payload.get("tokenId") or payload.get("token_id") or ""),
            "polymarket_url": clean_string(payload.get("polymarketUrl") or payload.get("polymarket_url") or ""),
            "polymarket_slug": clean_string(payload.get("polymarketSlug") or payload.get("polymarket_slug") or ""),
        }
        bet_doc = enrich_with_polymarket_metadata(db, bet_doc)
        if not clean_string(bet_doc.get("sport")):
            inferred_sport = infer_sport_from_bet(bet_doc)
            if inferred_sport:
                bet_doc["sport"] = inferred_sport
        client.close()
        print(json.dumps({
            "success": True,
            "enriched": {
                "searchEvent": clean_string(bet_doc.get("match") or ""),
                "date": clean_string(bet_doc.get("date") or ""),
                "time": clean_string(bet_doc.get("time") or ""),
                "country": clean_string(bet_doc.get("country") or ""),
                "league": clean_string(bet_doc.get("league") or ""),
                "sport": clean_string(bet_doc.get("sport") or ""),
                "eventSport": clean_string(bet_doc.get("sport") or ""),
                "polymarket_metadata_source": clean_string(bet_doc.get("polymarket_metadata_source") or ""),
                "polymarket_market_id": clean_string(bet_doc.get("polymarket_market_id") or ""),
                "condition_id": clean_string(bet_doc.get("condition_id") or ""),
                "token_id": clean_string(bet_doc.get("token_id") or ""),
                "polymarket_url": clean_string(bet_doc.get("polymarket_url") or ""),
                "polymarket_slug": clean_string(bet_doc.get("polymarket_slug") or ""),
            },
        }))
        sys.exit(0)
    
    # Bulk CSV / Excel import: build one doc per row and $push them all in a SINGLE update,
    # so a 20k-row import is a handful of processes instead of 20k save_bet.py subprocess
    # spawns (which saturate the box). Leaner than the single-save path - the background
    # enrich_web_bets pass backfills fixture/metadata just like it does for telegram bets.
    if payload.get("isBulkImport"):
        import uuid as _uuid
        items = payload.get("bets") or []
        if not isinstance(items, list) or not items:
            print(json.dumps({"error": "No bets in bulk import"}))
            sys.exit(1)
        now = datetime.now(timezone.utc)

        def _build_import_doc(item):
            odds, display_odds, entry_price_cents = parse_odds_payload(item, None)
            try:
                stake = float(clean_number(item.get("stake"), 0.0) or 0.0)
            except (TypeError, ValueError):
                stake = 0.0
            status = (clean_string(item.get("status")) or "pending").lower()
            co_odds, exit_price_cents = parse_cashout_payload(item.get("cashedOutOdds"), entry_price_cents)
            status, returns, profit_loss = settle_returns(status, stake, odds, co_odds)
            closing_line_odds = parse_odds_value(item.get("closingLineOdds"))
            threshold = clean_number(item.get("threshold"))
            market_direction = clean_string(item.get("marketDirection") or item.get("betDirection") or "").lower()
            normalized_market = normalize_market(item.get("market", ""))
            market_meta_doc = _market_metadata(normalized_market) or {}
            stat_type = clean_string(item.get("statType")) or clean_string(market_meta_doc.get("stat_type"))
            api_type_id = clean_int(item.get("apiTypeId"))
            if api_type_id is None:
                api_type_id = clean_int(market_meta_doc.get("api_type_id"))
            api_location = clean_string(item.get("apiLocation")) or clean_string(market_meta_doc.get("api_location"))
            fixture_id = clean_int(item.get("fixtureId"))
            raw_selection = clean_string(item.get("selection") or "")
            selection, goalscorer_player = normalize_goalscorer_fields(raw_selection, item.get("market") or "")
            src = {**item, "selection": selection}
            if goalscorer_player:
                src["player_name"] = goalscorer_player
            player_name = resolve_player_name(src)
            player_name, team = split_player_team(player_name, clean_string(item.get("team")))
            stored_selection = selection_with_subject(selection or raw_selection, normalized_market, player_name, team)
            tags, sync_label = normalize_tags(item)
            result_tracking = item.get("resultTracking") or item.get("result_tracking") or {
                "result_status": status, "stat_type": stat_type or None, "api_type_id": api_type_id,
                "api_location": api_location or None, "expected_threshold": threshold,
                "market_direction": market_direction or None, "actual_value": None, "expected_result": None,
                "actual_result": None, "graded_at": None, "calculated_at": None, "api_response_id": None,
                "stat_source": None, "side": api_location or None, "lineup_status": None, "refund_reason": None,
                "result_changed_from": None, "result_changed_reason": None, "result_changed_at": None,
                "reset_for_regrade": None, "reset_reason": None, "reset_at": None,
            }
            bet_id = str(_uuid.uuid4())
            # Strip any selection text the CSV packed into the event cell — see extract_fixture.
            # The original is kept in `match_raw` (only when it differed) so an import can still
            # be traced back to exactly what the file contained.
            _import_match_raw = clean_string(item.get("searchEvent") or item.get("match"))
            _import_match = extract_fixture(_import_match_raw)
            if _import_match == _import_match_raw:
                _import_match_raw = None
            doc = {
                "bet_id": bet_id,
                "alert_id": clean_string(item.get("alertId")) or ("import|" + bet_id),
                "source_message_key": None,
                "tracked_at": now, "created_at": now,
                "date": clean_string(item.get("date")), "time": clean_string(item.get("time")),
                "country": clean_string(item.get("country")), "league": clean_string(item.get("league")),
                "match": _import_match, "match_raw": _import_match_raw,
                "selection": stored_selection, "team": team, "player_name": player_name,
                "threshold": threshold, "odds": odds, "display_odds": display_odds,
                "recommended_stake": stake, "units_staked": stake, "actual_stake": stake, "unit_size": 1,
                "bookmaker": normalize_bookmaker(item.get("bookmaker", "")),
                "bet_type": "single", "status": status, "returns": returns, "profit_loss": profit_loss,
                "cashed_out_odds": co_odds if status == "cashed out" else None,
                "closing_line_odds": closing_line_odds,
                "entry_price_cents": entry_price_cents, "exit_price_cents": exit_price_cents,
                "prediction_market": clean_string(item.get("predictionMarket")),
                "prediction_position": clean_string(item.get("predictionPosition")),
                "source": "csv_import", "sync_label": sync_label, "tags": tags,
                "needs_enrichment": True, "market": normalized_market,
                "market_metadata": market_meta_doc or None,
                "bet_direction": normalize_direction(item.get("betDirection", "")),
                "market_direction": market_direction,
                "bankroll_id": clean_string(item.get("bankrollId")) or "personal",
                "data_scope": "import", "value_percentage": 0, "model_odds": None, "chance_percentage": None,
                "result_tracking": result_tracking,
            }
            if fixture_id is not None:
                doc["fixture_id"] = fixture_id
            if api_type_id is not None:
                doc["api_type_id"] = api_type_id
            if stat_type:
                doc["stat_type"] = stat_type
            if api_location:
                doc["api_location"] = api_location
            event_sport = clean_string(item.get("eventSport") or item.get("sport"))
            if event_sport:
                doc["sport"] = normalize_sport_name(event_sport)
            else:
                inferred = infer_sport_from_bet({"league": doc.get("league", ""), "country": doc.get("country", ""),
                                                 "match": doc.get("match", ""), "market": doc.get("market", ""),
                                                 "selection": doc.get("selection", "")})
                if inferred:
                    doc["sport"] = inferred
            for src_key, dst_key in (("eventSource", "event_source"), ("oddsApiEventId", "odds_api_event_id"),
                                     ("oddsApiLeagueSlug", "odds_api_league_slug")):
                val = clean_string(item.get(src_key))
                if val:
                    doc[dst_key] = val
            # Accumulator / bet-builder: the sheet joins legs with " + ". The frontend split them
            # into multi_bet_selections; store as a proper multi-bet so each leg resolves its own
            # fixture (team tokens + date) during enrichment instead of collapsing to one event.
            multi_sel = item.get("multi_bet_selections") or item.get("multiBetSelections") or []
            legs = [normalize_multi_selection(s) for s in multi_sel if isinstance(s, dict)]
            if len(legs) > 1 and (item.get("is_multiple") is True or item.get("isMultiple") is True
                                  or isinstance(multi_sel, list)):
                doc["bet_type"] = "multiple"
                doc["is_multi_bet"] = True
                doc["multi_bet_selections"] = legs
                doc["market"] = normalized_market or "Multi-Bet"
                doc["multi_bet_description"] = stored_selection
            return doc

        docs, failed = [], 0
        for item in items:
            try:
                docs.append(_build_import_doc(item))
            except Exception:
                failed += 1
        if docs:
            append_user_bets(user_tracked_bets_col, user_id, docs, now)
            trigger_instant_grade_for_user(user_id)
        client.close()
        print(json.dumps({"success": True, "saved": len(docs), "failed": failed}))
        sys.exit(0)

    # Check if delete
    is_delete = payload.get("isDelete", False)
    if is_delete:
        # Accept a single betId OR a betIds[] array. Bulk deletes MUST be one atomic
        # operation: firing N concurrent single-delete requests spawns N Python
        # subprocesses that overwhelm the box (some time out) and a thrown fetch rejects
        # the whole batch, so only some bets actually get removed.
        raw_ids = payload.get("betIds")
        if not isinstance(raw_ids, list):
            single = payload.get("betId") or payload.get("bet_id")
            raw_ids = [single] if single else []
        bet_ids = [b for b in raw_ids if b]
        if not bet_ids:
            print(json.dumps({"error": "Missing betId for delete"}))
            sys.exit(1)

        now = datetime.now(timezone.utc)
        # Bets may span multiple overflow docs - read the union.
        all_bets = all_user_bets(user_tracked_bets_col, user_id)
        if not all_bets:
            client.close()
            print(json.dumps({"error": "Bet not found"}))
            sys.exit(1)

        id_set = set(bet_ids)
        matched = [b for b in all_bets if b.get("bet_id") in id_set]

        # Tombstones exist only to stop the LIVE telegram sync from re-adding a bet you
        # manually deleted - so only live-sync bets (those with a source_message_key) need
        # one. Imported/manual bets have no source_message_key; skipping them keeps a bulk
        # import-cleanup delete from piling up tens of thousands of useless fingerprints.
        tombstones = set()
        for bet in matched:
            source_key = clean_string(bet.get("source_message_key") or "")
            if not source_key:
                continue
            tombstones.add(bet_dedup_key(bet, include_message_key=True))
            tombstones.add(bet_dedup_key(bet, include_message_key=False))
            alert_id = clean_string(bet.get("alert_id") or "")
            if alert_id and not alert_id.startswith("import|"):
                tombstones.add(f"alert:{alert_id}")
            tombstones.add(f"msg:{source_key}")

        # A bet could live in any overflow doc -> update_MANY to pull from all of them.
        user_tracked_bets_col.update_many(
            {"user_id": user_id},
            {"$pull": {"bets": {"bet_id": {"$in": bet_ids}}}, "$set": {"updated_at": now}})
        # Tombstones (dismissed fingerprints) live on the primary doc only.
        if tombstones:
            pid = primary_user_doc_id(user_tracked_bets_col, user_id)
            if pid:
                user_tracked_bets_col.update_one(
                    {"_id": pid},
                    {"$addToSet": {"dismissed_bet_fingerprints": {"$each": sorted(tombstones)}}})
        client.close()
        print(json.dumps({"success": True, "deleted": len(matched), "bet_ids": bet_ids,
                          "message": f"Deleted {len(matched)} bet(s)"}))
        sys.exit(0)

    # Bulk status update (Mark as Won/Lost/Void/Pending on many selected bets). MUST be
    # one atomic pass: firing N single-update requests spawns N heavy save_bet.py
    # subprocesses that saturate the box and hang the app until they all finish. Here a
    # single process builds one bulk_write of per-bet positional updates.
    is_bulk_status = payload.get("isBulkStatus", False)
    if is_bulk_status:
        from pymongo import UpdateOne
        raw_ids = payload.get("betIds")
        if not isinstance(raw_ids, list):
            single = payload.get("betId") or payload.get("bet_id")
            raw_ids = [single] if single else []
        bet_ids = [b for b in raw_ids if b]
        status = clean_string(payload.get("status", "")).lower()
        if not bet_ids or not status:
            print(json.dumps({"error": "Missing betIds or status for bulk status update"}))
            sys.exit(1)

        now = datetime.now(timezone.utc)
        all_bets = all_user_bets(user_tracked_bets_col, user_id)
        if not all_bets:
            client.close()
            print(json.dumps({"error": "Bet not found"}))
            sys.exit(1)

        id_set = set(bet_ids)
        ops = []
        for bet in all_bets:
            bid = bet.get("bet_id")
            if bid not in id_set:
                continue
            set_fields, unset_fields = build_status_settlement_fields(bet, status, now)
            upd = {"$set": set_fields}
            if unset_fields:
                upd["$unset"] = unset_fields
            ops.append(UpdateOne({"user_id": user_id, "bets.bet_id": bid}, upd))

        if ops:
            user_tracked_bets_col.bulk_write(ops, ordered=False)
            user_tracked_bets_col.update_one({"user_id": user_id}, {"$set": {"updated_at": now}})
        client.close()
        print(json.dumps({"success": True, "updated": len(ops), "status": status,
                          "message": f"Updated {len(ops)} bet(s) to {status}"}))
        sys.exit(0)

    # Check if update
    is_update = payload.get("isUpdate", False)
    if is_update:
        bet_id = payload.get("betId") or payload.get("bet_id")
        if not bet_id:
            print(json.dumps({"error": "Missing betId for update"}))
            sys.exit(1)
        now = datetime.now(timezone.utc)
            
        doc = user_tracked_bets_col.find_one({"user_id": user_id, "bets.bet_id": bet_id}, {"bets.$": 1})
        if not doc or not doc.get("bets"):
            print(json.dumps({"error": "Bet not found"}))
            sys.exit(1)
            
        existing_bet = doc["bets"][0]

        core_edit_keys = {
            "date", "time", "country", "league", "searchEvent", "match", "selection",
            "playerName", "player_name", "team", "market", "bookmaker", "betType",
            "bet_type", "betDirection", "marketDirection", "threshold", "stake",
            "bankrollId", "tags", "syncLabel", "oddsApiEventId", "oddsApiLeagueSlug",
            "eventSport", "eventSource", "predictionMarket", "predictionPosition",
            "multi_bet_selections", "is_multiple", "betStructure", "enrichFromPolymarket",
        }
        is_partial_update = not any(key in payload for key in core_edit_keys)
        if is_partial_update and any(key in payload for key in ("status", "closingLineOdds", "cashedOutOdds", "odds", "manualOverride")):
            status = clean_string(payload.get("status", existing_bet.get("status", "pending"))).lower()
            odds, display_odds, entry_price_cents = parse_odds_payload(
                payload,
                existing_bet.get("display_odds", existing_bet.get("odds", 0.0))
            )
            if entry_price_cents is None:
                entry_price_cents = clean_number(existing_bet.get("entry_price_cents"))

            stake = existing_bet.get("actual_stake", existing_bet.get("units_staked", 0.0))
            try:
                stake = float(stake)
            except (TypeError, ValueError):
                stake = 0.0

            co_odds = existing_bet.get("cashed_out_odds")
            exit_price_cents = clean_number(existing_bet.get("exit_price_cents"))
            if status in ("cashed_out", "cashed out", "won", "lost"):
                co_odds, parsed_exit_cents = parse_cashout_payload(
                    payload.get("cashedOutOdds", existing_bet.get("cashed_out_odds")),
                    entry_price_cents,
                )
                if parsed_exit_cents is not None:
                    exit_price_cents = parsed_exit_cents
                    if parsed_exit_cents >= 100:
                        status = "won"
                    elif parsed_exit_cents <= 0:
                        status = "lost"

            status, returns, profit_loss = settle_returns(status, stake, odds, co_odds)
            is_manual_settlement = status != "pending"
            # Explicit auto-grading toggle from the edit form overrides the status default:
            # toggle OFF -> manual_override True (skip auto-grading, keep my result);
            # toggle ON -> False (let the grader settle it). Honored only when non-pending
            # by the grader (a pending bet always auto-grades).
            if "manualOverride" in payload:
                is_manual_settlement = bool(payload.get("manualOverride"))

            set_fields = {
                "bets.$.status": status,
                "bets.$.returns": returns,
                "bets.$.profit_loss": profit_loss,
                "bets.$.odds": odds,
                "bets.$.display_odds": display_odds,
                "bets.$.manual_override": is_manual_settlement,
                "bets.$.last_updated": now,
                "bets.$.updated_at": now,
                "updated_at": now,
            }
            unset_fields = {}

            if exit_price_cents is not None:
                set_fields["bets.$.exit_price_cents"] = exit_price_cents
            if entry_price_cents is not None:
                set_fields["bets.$.entry_price_cents"] = entry_price_cents
            if status == "cashed out" and co_odds is not None:
                set_fields["bets.$.cashed_out_odds"] = co_odds
            if "closingLineOdds" in payload:
                clo = parse_odds_value(payload.get("closingLineOdds"))
                set_fields["bets.$.closing_line_odds"] = clo
                # Stamp the provenance: a USER-entered closing is authoritative and must
                # never be stripped by the automated plausibility purge (drift_monitor.
                # purge_bad_closings skips source containing "user").
                set_fields["bets.$.closing_odds_source"] = "user" if clo is not None else None
                set_fields["bets.$.closing_odds_at"] = now if clo is not None else None

            if is_manual_settlement:
                set_fields["bets.$.manually_graded_at"] = now
                set_fields["bets.$.settled_at"] = now
                set_fields["bets.$.result_tracking.result_status"] = status
                set_fields["bets.$.result_tracking.result_changed_at"] = now
                set_fields["bets.$.result_tracking.result_changed_reason"] = "manual_override"
                set_fields["bets.$.result_tracking.manually_graded_at"] = now
                set_fields["bets.$.result_tracking.graded_at"] = now
            else:
                unset_fields["bets.$.manually_graded_at"] = ""
                unset_fields["bets.$.settled_at"] = ""
                unset_fields["bets.$.result_tracking.manually_graded_at"] = ""
                set_fields["bets.$.result_tracking.result_status"] = status
                set_fields["bets.$.result_tracking.result_changed_at"] = now
                set_fields["bets.$.result_tracking.result_changed_reason"] = "manual_reset_to_pending"
                set_fields["bets.$.result_tracking.graded_at"] = None

            update_doc = {"$set": set_fields}
            if unset_fields:
                update_doc["$unset"] = unset_fields

            user_tracked_bets_col.update_one(
                {"user_id": user_id, "bets.bet_id": bet_id},
                update_doc
            )

            client.close()
            print(json.dumps({"success": True, "bet_id": bet_id, "message": "Bet updated successfully"}))
            sys.exit(0)
        
        if "status" in payload:
            status = payload["status"].lower()
            existing_bet["status"] = status
        else:
            status = existing_bet.get("status", "pending")
            
        odds, display_odds, entry_price_cents = parse_odds_payload(
            payload,
            existing_bet.get("display_odds", existing_bet.get("odds", 0.0))
        )
        if entry_price_cents is None:
            entry_price_cents = clean_number(existing_bet.get("entry_price_cents"))
        
        stake = payload.get("stake", existing_bet.get("actual_stake", existing_bet.get("units_staked", 0.0)))
        try: stake = float(stake)
        except ValueError: stake = 0.0

        co_odds = None
        exit_price_cents = clean_number(existing_bet.get("exit_price_cents"))
        if status in ("cashed_out", "cashed out", "won", "lost"):
            co_odds, parsed_exit_cents = parse_cashout_payload(
                payload.get("cashedOutOdds", existing_bet.get("cashed_out_odds")),
                entry_price_cents,
            )
            if parsed_exit_cents is not None:
                exit_price_cents = parsed_exit_cents
                if parsed_exit_cents >= 100:
                    status = "won"
                elif parsed_exit_cents <= 0:
                    status = "lost"

        status, returns, profit_loss = settle_returns(status, stake, odds, co_odds)

        existing_bet["returns"] = returns
        existing_bet["profit_loss"] = profit_loss
        existing_bet["status"] = status
        existing_bet["odds"] = odds
        existing_bet["display_odds"] = display_odds
        prev_date, prev_time = existing_bet.get("date", ""), existing_bet.get("time", "")
        existing_bet["date"] = payload.get("date", prev_date)
        existing_bet["time"] = payload.get("time", prev_time)
        # kickoff_utc is the canonical instant: take a fresh one from the payload, otherwise
        # DROP it when the user hand-edited date/time - a stale instant that disagrees with
        # the edited wall-clock is worse than none.
        new_kutc = clean_string(payload.get("kickoffUtc") or payload.get("kickoff_utc") or "")
        if new_kutc:
            existing_bet["kickoff_utc"] = new_kutc
        elif (existing_bet["date"] != prev_date or existing_bet["time"] != prev_time) and existing_bet.get("kickoff_utc"):
            existing_bet["kickoff_utc"] = None

        # Pasting the source alert into auto-fill on an EXISTING bet attaches it, so an older
        # bet can gain its "Original message" box. Never overwrite one already stored.
        _upd_msg = clean_string(payload.get("originalMessage") or payload.get("original_message") or "")
        if _upd_msg and not clean_string(existing_bet.get("original_message") or ""):
            existing_bet["original_message"] = _upd_msg[:4000]
        existing_bet["country"] = payload.get("country", existing_bet.get("country", ""))
        existing_bet["league"] = payload.get("league", existing_bet.get("league", ""))
        existing_bet["match"] = clean_string(payload.get("searchEvent") or payload.get("match") or existing_bet.get("match", ""))
        existing_market = normalize_market(payload.get("market", existing_bet.get("market", "")))
        raw_selection = clean_string(payload.get("selection", existing_bet.get("selection", "")))
        selection, goalscorer_player = normalize_goalscorer_fields(raw_selection, existing_market)
        existing_bet["market"] = existing_market
        if goalscorer_player:
            existing_bet["player_name"] = goalscorer_player
        existing_bet["bookmaker"] = normalize_bookmaker(payload.get("bookmaker", existing_bet.get("bookmaker", "")))
        existing_bet["bet_type"] = clean_string(payload.get("betType") or payload.get("bet_type") or existing_bet.get("bet_type", "single")).lower()
        existing_bet["bet_direction"] = normalize_direction(payload.get("betDirection", existing_bet.get("bet_direction", "")))
        existing_bet["market_direction"] = clean_string(payload.get("marketDirection") or payload.get("market_direction") or payload.get("betDirection") or existing_bet.get("market_direction", "")).lower()
        existing_bet["threshold"] = clean_number(payload.get("threshold"), existing_bet.get("threshold"))
        existing_bet["team"] = clean_string(payload.get("team", existing_bet.get("team", "")))
        existing_bet["player_name"] = resolve_player_name({**existing_bet, **payload}) or existing_bet.get("player_name", "")
        existing_bet["player_name"], existing_bet["team"] = split_player_team(existing_bet.get("player_name", ""), existing_bet.get("team", ""))
        existing_bet["selection"] = selection_with_subject(selection or raw_selection, existing_market, existing_bet.get("player_name", ""), existing_bet.get("team", ""))
        if re.search(r"handicap|spread", existing_market, re.I):
            _parts = re.split(r"\s+v(?:s)?\.?\s+", existing_bet.get("match", ""), maxsplit=1, flags=re.I)
            if len(_parts) == 2:
                _side = _derive_handicap_side(existing_bet["selection"], _parts[0], _parts[1])
                if _side:
                    existing_bet["bet_direction"] = _side
                    existing_bet["market_direction"] = _side.lower()
                    existing_bet["bet_side"] = _side.lower()
                    rt = existing_bet.get("result_tracking")
                    if isinstance(rt, dict):
                        rt["market_direction"] = _side.lower()
                        rt["side"] = _side.lower()
        existing_bet["recommended_stake"] = stake
        existing_bet["units_staked"] = stake
        existing_bet["actual_stake"] = stake
        existing_bet["last_updated"] = now
        existing_bet["updated_at"] = now
        tags, sync_label = normalize_tags(payload)
        if tags:
            existing = existing_bet.get("tags") if isinstance(existing_bet.get("tags"), list) else []
            merged = []
            seen = set()
            for tag in [*existing, *tags]:
                tag = clean_string(tag)
                key = tag.lower()
                if tag and key not in seen:
                    seen.add(key)
                    merged.append(tag)
            existing_bet["tags"] = merged
        if sync_label:
            existing_bet["sync_label"] = sync_label
        if entry_price_cents is not None:
            existing_bet["entry_price_cents"] = entry_price_cents
        if exit_price_cents is not None:
            existing_bet["exit_price_cents"] = exit_price_cents
        for source_key, stored_key in (
            ("oddsApiEventId", "odds_api_event_id"),
            ("oddsApiLeagueSlug", "odds_api_league_slug"),
            ("eventSport", "sport"),
            ("eventSource", "event_source"),
            ("predictionMarket", "prediction_market"),
            ("predictionPosition", "prediction_position"),
        ):
            if source_key in payload:
                existing_bet[stored_key] = payload.get(source_key) or existing_bet.get(stored_key, "")
        existing_bet = enrich_with_polymarket_metadata(db, existing_bet)
        if not existing_bet.get("bookmaker") and (
            clean_string(payload.get("polymarketUrl") or payload.get("polymarket_url") or existing_bet.get("polymarket_url"))
            or clean_string(payload.get("polymarketSlug") or payload.get("polymarket_slug") or existing_bet.get("polymarket_slug"))
            or clean_string(payload.get("polymarketMarketId") or payload.get("polymarket_market_id") or payload.get("market_id") or existing_bet.get("polymarket_market_id"))
            or clean_string(payload.get("conditionId") or payload.get("condition_id") or existing_bet.get("condition_id"))
            or clean_string(payload.get("tokenId") or payload.get("token_id") or existing_bet.get("token_id"))
            or "polymarket" in clean_string(payload.get("predictionMarket") or existing_bet.get("prediction_market") or "").lower()
            or entry_price_cents is not None
        ):
            existing_bet["bookmaker"] = "Polymarket"
        if not clean_string(existing_bet.get("sport")):
            inferred_sport = infer_sport_from_bet(existing_bet)
            if inferred_sport:
                existing_bet["sport"] = inferred_sport
        is_manual_settlement = status != "pending"
        existing_bet["manual_override"] = is_manual_settlement
        if is_manual_settlement:
            existing_bet["manually_graded_at"] = now
            existing_bet["settled_at"] = now
        else:
            existing_bet.pop("manually_graded_at", None)
            existing_bet.pop("settled_at", None)
        if isinstance(existing_bet.get("result_tracking"), dict):
            existing_bet["result_tracking"]["result_status"] = status
            existing_bet["result_tracking"]["result_changed_at"] = now
            existing_bet["result_tracking"]["result_changed_reason"] = "manual_override" if is_manual_settlement else "manual_reset_to_pending"
            if is_manual_settlement:
                existing_bet["result_tracking"]["manually_graded_at"] = now
                existing_bet["result_tracking"]["graded_at"] = now
            else:
                existing_bet["result_tracking"].pop("manually_graded_at", None)
                existing_bet["result_tracking"]["graded_at"] = None
        
        if "closingLineOdds" in payload:
            existing_bet["closing_line_odds"] = parse_odds_value(payload.get("closingLineOdds"))
            
        if status == "cashed out" and co_odds is not None:
            existing_bet["cashed_out_odds"] = co_odds

        if "bankrollId" in payload:
            existing_bet["bankroll_id"] = payload["bankrollId"]
            
        multi_selections = payload.get("multi_bet_selections")
        has_multi_selections = isinstance(multi_selections, list) and len(multi_selections) > 0
        is_multiple_payload = payload.get("is_multiple") is True

        if payload.get("betStructure") == "single" and not is_multiple_payload:
            existing_bet["is_multi_bet"] = False
            existing_bet.pop("multi_bet_selections", None)
        elif is_multiple_payload or has_multi_selections:
            existing_bet["is_multi_bet"] = True
            existing_bet["bet_type"] = "multiple"
            existing_bet["market"] = "Multi-Bet"
            existing_bet["market_direction"] = "multi"
            existing_bet["bet_direction"] = "multi"
            if has_multi_selections:
                existing_bet["multi_bet_selections"] = [normalize_multi_selection(s) for s in multi_selections]
            
        user_tracked_bets_col.update_one(
            {"user_id": user_id, "bets.bet_id": bet_id},
            {"$set": {"bets.$": existing_bet, "updated_at": now}}
        )
        
        client.close()
        print(json.dumps({"success": True, "bet_id": bet_id, "message": "Bet updated successfully"}))
        sys.exit(0)

    # Construct new bet document
    now = datetime.now(timezone.utc)
    
    odds, display_odds, entry_price_cents = parse_odds_payload(payload)
        
    stake = payload.get("stake")
    if stake:
        try: stake = float(stake)
        except ValueError: stake = 0.0
    else: stake = 0.0

    # Bankroll defaults: a parsed message with no stake and/or bookmaker (e.g. a bare
    # multi-pick digest "Pafos TT o1.5 (-125)") falls back to the TARGET bankroll's
    # default_stake / default_bookmaker (set in Edit Bankroll). Server-side so every
    # source - web paste, image OCR, telegram import/approve - gets the same fill.
    if (not stake) or not clean_string(payload.get("bookmaker")):
        try:
            _tgt = clean_string(payload.get("bankrollId")) or "personal"
            _pd = user_tracked_bets_col.find_one(
                {"user_id": user_id, "bankrolls": {"$exists": True}},
                {"bankrolls": 1}, sort=[("created_at", 1)])
            for _b in (_pd or {}).get("bankrolls") or []:
                if str(_b.get("id")) == _tgt:
                    if not stake and _b.get("default_stake"):
                        try:
                            stake = float(_b["default_stake"])
                        except (TypeError, ValueError):
                            pass
                    if not clean_string(payload.get("bookmaker")) and _b.get("default_bookmaker"):
                        payload["bookmaker"] = _b["default_bookmaker"]
                    break
        except Exception:
            pass

    # Guard: reject junk saves that never resolved to a real bet - no market AND no
    # valid price (decimal odds must be > 1.0). These are failed web/import saves
    # (market 'Unknown'/'' with odds 0.0) that silently pollute the tracker and are
    # never real bets. Multi-bets are exempt: their market resolves to "Multi-Bet"
    # downstream and they always carry total odds.
    _is_multi = payload.get("is_multiple") is True or (
        isinstance(payload.get("multi_bet_selections"), list)
        and len(payload.get("multi_bet_selections") or []) > 0
    )
    if _is_multi:
        multi_selections = payload.get("multi_bet_selections") or []
        filtered_multi_selections = [
            selection for selection in multi_selections
            if isinstance(selection, dict) and not is_low_quality_import_payload(selection)
        ]
        payload["multi_bet_selections"] = filtered_multi_selections
        if not filtered_multi_selections:
            print(json.dumps({
                "success": False, "rejected": True,
                "error": "Bet not saved: multi-bet only contained low-quality parsed legs",
            }))
            sys.exit(0)
        # Parent odds for an accumulator = the TOTAL, not a single leg. Telegram parses store the
        # FIRST leg's odds as the parent when the "Total odds:" line is missed (e.g. a Treble
        # imported at 1.925 instead of 5.74). Prefer an explicit total; else recompute the product
        # of the leg odds when they all carry one. (CSV multis leave leg odds blank and pass the
        # real total as `odds`, so they fall through untouched.)
        _explicit_total = parse_odds_value(payload.get("total_odds") or payload.get("totalOdds"))
        _leg_odds = [parse_odds_value(s.get("odds") or s.get("display_odds") or s.get("displayOdds"))
                     for s in filtered_multi_selections]
        _leg_odds = [o for o in _leg_odds if o and o > 1.0]
        _new_total = None
        if _explicit_total and _explicit_total > 1.0:
            _new_total = _explicit_total
        elif len(_leg_odds) >= 2 and len(_leg_odds) == len(filtered_multi_selections):
            _prod = 1.0
            for _o in _leg_odds:
                _prod *= _o
            _new_total = round(_prod, 4)
        if _new_total and abs(_new_total - float(odds or 0)) > 1e-6:
            odds, display_odds, entry_price_cents = parse_odds_payload({"odds": _new_total}, None)
        # Parent closing line (CLV) for a multi-EVENT bet = product of the per-leg closes. When
        # every leg carries a closing line (manually entered, or attached by clv_recovery), roll
        # them up so the CLV column shows the combined close.
        _closes = [parse_odds_value(s.get("closing_line_odds") or s.get("closingLineOdds"))
                   for s in filtered_multi_selections]
        _closes = [c for c in _closes if c and c > 1.0]
        if len(_closes) >= 2 and len(_closes) == len(filtered_multi_selections):
            _cp = 1.0
            for _c in _closes:
                _cp *= _c
            payload["closingLineOdds"] = round(_cp, 4)
        # Full-cover multiples (Patent, Yankee, etc.) are one wager split into many
        # constituent bets. Record the type and divide the total stake by the number of
        # bets so P/L is calculated per constituent.
        _multiple_type = clean_string(
            payload.get("multipleType") or payload.get("multiple_type") or payload.get("bet_type") or ""
        ).lower()
        if is_full_cover_type(_multiple_type):
            _n_bets = _number_of_bets(_multiple_type, len(filtered_multi_selections))
            if _n_bets > 1 and stake > 0:
                stake = round(stake / _n_bets, 6)
    elif is_low_quality_import_payload(payload):
        print(json.dumps({
            "success": False, "rejected": True,
            "error": "Bet not saved: low-quality parsed Telegram import ignored",
        }))
        sys.exit(0)

    _market_norm = clean_string(payload.get("market") or payload.get("market_type") or "").lower()
    _has_real_market = _market_norm not in ("", "unknown", "unknown market")
    try:
        _has_valid_price = odds is not None and float(odds) > 1.0
    except (TypeError, ValueError):
        _has_valid_price = False
    if not _is_multi and not _has_real_market and not _has_valid_price:
        print(json.dumps({
            "success": False, "rejected": True,
            "error": "Bet not saved: no market and no valid odds (junk import ignored)",
        }))
        sys.exit(0)

    match_name = clean_string(payload.get("searchEvent") or payload.get("match", ""))
    selection_name = clean_string(payload.get("selection", ""))

    # Dedup must be scoped to the target bankroll: the SAME bet legitimately lives in
    # more than one bankroll (e.g. both sides of an arb, or the same tip logged in two
    # banks). Matching across every bankroll silently drops those as "duplicates".
    # Legacy bets predate bankroll_id, so treat a Personal target as {personal | missing}.
    target_bankroll_id = clean_string(payload.get("bankrollId")) or "personal"
    bankroll_match = {"$in": ["personal", None]} if target_bankroll_id == "personal" else target_bankroll_id

    # Tombstones live on the primary (oldest) doc - read from there.
    user_doc = user_tracked_bets_col.find_one(
        {"user_id": user_id}, {"dismissed_bet_fingerprints": 1}, sort=[("created_at", 1)]) or {}
    candidate = {
        "bankroll_id": target_bankroll_id,
        "match": match_name,
        "selection": selection_name,
        "market": clean_string(payload.get("market", "")),
        "odds": odds,
        "recommended_stake": stake,
        "date": clean_string(payload.get("date", ""))[:10],
    }

    source_message_key = clean_string(payload.get("sourceMessageKey") or payload.get("source_message_key"))
    alert_id = clean_string(payload.get("alertId") or payload.get("alert_id") or "")
    # A delete leaves a tombstone so the LIVE SYNC won't re-add a bet you removed. But an
    # explicit manual re-import/add is the opposite intent - honour it: clear the matching
    # tombstone(s) and proceed instead of silently skipping (which left re-imports at 0 bets).
    force_save = bool(payload.get("forceSave") or payload.get("force"))
    # A save whose source message is a queue item STILL in Pending Review is the user approving
    # that item - force it so the duplicate guard (which put it in review) can't re-block the very
    # bet they just confirmed and silently drop it. Covers both Telegram-import and web (webdup|)
    # pending items, and needs no client change since approval re-saves with this sourceMessageKey.
    if not force_save and source_message_key and user_tracked_bets_col.database["telegram_import_queue"].find_one(
            {"message_key": source_message_key, "status": "pending_review"}, {"_id": 1}):
        force_save = True
    dismissed = set(user_doc.get("dismissed_bet_fingerprints") or [])
    if source_message_key:
        candidate["source_message_key"] = source_message_key
    matched_tombstones = [t for t in (
        bet_dedup_key(candidate, include_message_key=True),
        bet_dedup_key(candidate, include_message_key=False),
        f"msg:{source_message_key}" if source_message_key else "",
        f"alert:{alert_id}" if alert_id else "",
    ) if t and t in dismissed]
    if matched_tombstones:
        if force_save:
            user_tracked_bets_col.update_many(
                {"user_id": user_id},
                {"$pull": {"dismissed_bet_fingerprints": {"$in": matched_tombstones}}},
            )
        else:
            client.close()
            print(json.dumps({"success": True, "duplicate": True, "dismissed": True, "message": "Previously deleted bet ignored."}))
            sys.exit(0)

    if source_message_key:
        source_existing = user_tracked_bets_col.find_one(
            {
                "user_id": user_id,
                "bets": {
                    "$elemMatch": {
                        "source_message_key": source_message_key,
                        "match": match_name,
                        "selection": selection_name,
                        "odds": odds,
                        "recommended_stake": stake,
                        "bankroll_id": bankroll_match
                    }
                }
            },
            {"bets.$": 1}
        )
        if source_existing and source_existing.get("bets"):
            dup_bet_id = source_existing["bets"][0].get("bet_id")
            client.close()
            print(json.dumps({"success": True, "bet_id": dup_bet_id, "duplicate": True, "message": "Duplicate source message detected, ignored."}))
            sys.exit(0)

    # Semantic duplication (same bankroll). Both the exact $elemMatch here and the fuzzy check
    # below route a detected duplicate to Pending Review (like the Telegram-import path) instead of
    # silently dropping it, so the user confirms or discards it. Skipped on an explicit force-save
    # (the Pending "Approve" re-saves with force, so approval is never re-blocked here).
    if not force_save:
        dup_bet = None
        semantic_existing = user_tracked_bets_col.find_one(
            {
                "user_id": user_id,
                "bets": {
                    "$elemMatch": {
                        "match": match_name,
                        "selection": selection_name,
                        "odds": odds,
                        "recommended_stake": stake,
                        "bankroll_id": bankroll_match
                    }
                }
            },
            {"bets.$": 1}
        )
        if semantic_existing and semantic_existing.get("bets"):
            dup_bet = semantic_existing["bets"][0]

        # Fuzzy near-duplicate: the exact match above only catches byte-identical copies. The SAME
        # bet re-imported via a different channel (web vs telegram) or re-parsed from the slip
        # arrives with a "(0-0)" score prefix, an "FC"/"vs." in the fixture, a 2.47-vs-2.475 odds
        # wobble, or a mis-resolved date - all of which defeat exact matching. The shared semantic
        # dedup collapses them (date-agnostic; never merges bets whose event ids differ).
        if dup_bet is None:
            try:
                from SharedServices.tracking.bet_dedup import find_duplicate as _find_dup_bet
            except Exception:
                _find_dup_bet = None
            if _find_dup_bet is not None:
                fuzzy_candidate = dict(candidate)
                fuzzy_candidate["event_id"] = clean_string(payload.get("eventId") or payload.get("event_id") or "")
                fuzzy_candidate["betburger_valuebet_id"] = clean_string(
                    payload.get("betburgerValuebetId") or payload.get("betburger_valuebet_id") or "")
                existing_same_bankroll = []
                for doc in user_tracked_bets_col.find(
                    {"user_id": user_id},
                    {"bets.match": 1, "bets.searchEvent": 1, "bets.selection": 1, "bets.market": 1,
                     "bets.odds": 1, "bets.display_odds": 1, "bets.recommended_stake": 1,
                     "bets.actual_stake": 1, "bets.stake": 1, "bets.bankroll_id": 1,
                     "bets.event_id": 1, "bets.betburger_valuebet_id": 1, "bets.bet_id": 1},
                ):
                    for eb in doc.get("bets", []):
                        eb_bankroll = clean_string(eb.get("bankroll_id") or "personal") or "personal"
                        if target_bankroll_id == "personal":
                            if eb_bankroll != "personal":
                                continue
                        elif eb_bankroll != target_bankroll_id:
                            continue
                        existing_same_bankroll.append(eb)
                dup_bet = _find_dup_bet(fuzzy_candidate, existing_same_bankroll)

        if dup_bet is not None:
            mk = send_web_bet_to_pending(
                user_tracked_bets_col, user_id, payload, candidate,
                target_bankroll_id, None, "possible_duplicate", dup_bet)
            client.close()
            print(json.dumps({"success": True, "duplicate": True, "pending_review": True,
                "bet_id": dup_bet.get("bet_id"), "message_key": mk,
                "duplicate_of_bet_id": dup_bet.get("bet_id"),
                "message": "Looks like a duplicate of an existing bet - sent to Pending Review to confirm."}))
            sys.exit(0)

    bet_id = str(uuid.uuid4())
    tags, sync_label = normalize_tags(payload)

    
    initial_multi_selections = payload.get("multi_bet_selections")
    initial_has_multi_selections = isinstance(initial_multi_selections, list) and len(initial_multi_selections) > 0
    initial_is_multiple = payload.get("is_multiple") is True or initial_has_multi_selections
    bet_type = payload.get("betType", "single").lower()
    if bet_type == "multiple" and not initial_is_multiple:
        bet_type = "single"
    
    status = (payload.get("status") or "pending").lower()  # blank/None -> pending (gradeable)
    co_odds, exit_price_cents = parse_cashout_payload(payload.get("cashedOutOdds"), entry_price_cents)
    if exit_price_cents is not None:
        if exit_price_cents >= 100:
            status = "won"
        elif exit_price_cents <= 0:
            status = "lost"
        elif status in ("pending", ""):
            status = "cashed out"
    status, returns, profit_loss = settle_returns(status, stake, odds, co_odds)

    # Accept decimal / fractional / American for CLV too (same free-typed support).
    closing_line_odds = parse_odds_value(payload.get("closingLineOdds"))

    
    threshold = clean_number(payload.get("threshold"))
    if threshold is None:
        # The new-bet form has no threshold field - the line rides in the selection text
        # ('Over 2.0'). Recover it via the shared parser (same logic the /api/parse pipeline
        # uses) so the bet grades + displays its line instead of landing with threshold=None.
        # Payload value always wins; this only fills a genuine gap.
        try:
            _derived = _canonicalize_bet_fields({
                "selection": payload.get("selection") or "",
                "market": payload.get("market") or payload.get("market_type") or "",
                "betDirection": payload.get("betDirection") or "",
                "threshold": "",
                "searchEvent": payload.get("searchEvent") or "",
                "league": payload.get("league") or "",
            })
            threshold = clean_number(_derived.get("threshold"))
        except Exception:
            pass
    market_direction = clean_string(payload.get("marketDirection") or payload.get("market_direction") or payload.get("betDirection", "")).lower()
    stat_type = clean_string(payload.get("statType") or payload.get("stat_type"))
    api_type_id = clean_int(payload.get("apiTypeId") or payload.get("api_type_id"))
    api_location = clean_string(payload.get("apiLocation") or payload.get("api_location"))
    # Derive the grading stat from the market label when the payload omits it (parser /
    # Telegram imports usually do). Without this the bet saves with a null stat_type, and
    # the sibling fast-settle then matches ANY alert on the fixture and inherits the wrong
    # stat's value (see project_sibling_alert_cross_stat). Payload values always win.
    normalized_market = normalize_market(payload.get("market", ""))
    market_meta_doc = _market_metadata(normalized_market) or {}
    if not stat_type:
        stat_type = clean_string(market_meta_doc.get("stat_type"))
    if api_type_id is None:
        api_type_id = clean_int(market_meta_doc.get("api_type_id"))
    if not api_location:
        api_location = clean_string(market_meta_doc.get("api_location"))
    fixture_id = clean_int(payload.get("fixtureId") or payload.get("fixture_id"))
    player_id = clean_int(payload.get("playerId") or payload.get("player_id"))
    team_id = clean_int(payload.get("teamId") or payload.get("team_id"))
    raw_selection = clean_string(payload.get("selection") or "")
    raw_market = payload.get("market") or payload.get("market_type") or ""
    selection, goalscorer_player = normalize_goalscorer_fields(raw_selection, raw_market)
    if goalscorer_player:
        payload = {**payload, "selection": selection, "player_name": goalscorer_player, "playerName": goalscorer_player}
    elif selection != raw_selection:
        payload = {**payload, "selection": selection}

    player_name = resolve_player_name(payload)
    team = clean_string(payload.get("team"))
    player_name, team = split_player_team(player_name, team)

    # Player/Match mislabel repair. A team-total stat market ("Match Shots On Target",
    # "Match Shots", ...) that actually names a REAL player (Ronaldo, Bellingham) is a
    # player prop and must grade against the player's line, not the match total - promote
    # it to the Player market. Conversely a "player_name" that is one of the fixture's
    # own teams is not a player at all (parser mis-extraction), so drop it. The subject
    # is a fixture team iff it overlaps a side of the "A vs B" match string.
    _match_str = clean_string(payload.get("searchEvent") or payload.get("match") or "")
    _team_parts = re.split(r"\s+v(?:s)?\.?\s+", _match_str, maxsplit=1)

    def _name_tokens(value):
        return set(re.findall(r"[a-z0-9]{3,}", str(value or "").lower()))

    _team_tok_sets = [_name_tokens(p) for p in _team_parts] if len(_team_parts) == 2 else []
    _subject = clean_string(player_name)
    if _subject.lower() in ("unknown player", "unknown", "n/a"):
        _subject = ""  # placeholder, not a real player -> no promotion
    _subject_toks = _name_tokens(_subject)
    # A subject is a fixture team (not a player) when its name tokens are contained in a
    # team's tokens (or vice versa) - token-based so short team names can't accidentally
    # substring-match inside a real player's name (e.g. "A" inside "Haaland").
    _subject_is_team = bool(_subject_toks) and any(
        tt and (_subject_toks <= tt or tt <= _subject_toks) for tt in _team_tok_sets)
    _player_market = _PLAYER_STAT_MARKETS.get(clean_string(market_meta_doc.get("stat_type")))
    if _subject and _subject_is_team:
        # a fixture team wrongly captured as a player -> team bet, drop the bogus name
        player_name = ""
    elif _subject and _player_market and market_meta_doc.get("api_location") in ("total", "dynamic", "home", "away"):
        # a genuine player under a team/match-total market -> promote to the Player market
        normalized_market = normalize_market(_player_market)
        market_meta_doc = _market_metadata(normalized_market) or market_meta_doc
        stat_type = clean_string(market_meta_doc.get("stat_type")) or stat_type
        _promoted_type = clean_int(market_meta_doc.get("api_type_id"))
        if _promoted_type is not None:
            api_type_id = _promoted_type
        api_location = clean_string(market_meta_doc.get("api_location")) or "player"

    stored_selection = selection_with_subject(selection or payload.get("selection", ""), normalized_market, player_name, team)
    if re.search(r"handicap|spread", normalized_market, re.I):
        _parts = re.split(r"\s+v(?:s)?\.?\s+", _match_str, maxsplit=1, flags=re.I)
        if len(_parts) == 2:
            _side = _derive_handicap_side(stored_selection, _parts[0], _parts[1])
            if _side:
                market_direction = _side.lower()
                payload = {**payload, "betDirection": _side, "marketDirection": market_direction, "side": market_direction}

    result_tracking = payload.get("resultTracking") or payload.get("result_tracking") or {
        "result_status": status,
        "stat_type": stat_type or None,
        "api_type_id": api_type_id,
        "api_location": api_location or None,
        "expected_threshold": threshold,
        "market_direction": market_direction or None,
        "actual_value": payload.get("actualValue") or payload.get("actual_value"),
        "expected_result": None,
        "actual_result": payload.get("actualResult") or payload.get("actual_result"),
        "graded_at": None,
        "calculated_at": None,
        "api_response_id": None,
        "stat_source": None,
        "side": payload.get("side") or None,
        "lineup_status": None,
        "refund_reason": None,
        "result_changed_from": None,
        "result_changed_reason": None,
        "result_changed_at": None,
        "reset_for_regrade": None,
        "reset_reason": None,
        "reset_at": None,
    }

    bet_doc = {
        "bet_id": bet_id,
        "alert_id": payload.get("alertId") or payload.get("alert_id") or f"import|{bet_id}",
        "source_message_key": source_message_key or payload.get("source_message_key"),
        "tracked_at": now,
        "date": payload.get("date", ""),
        "time": payload.get("time", ""),
        "kickoff_utc": clean_string(payload.get("kickoffUtc") or payload.get("kickoff_utc") or "") or None,
        "country": payload.get("country", ""),
        "league": payload.get("league", ""),
        "match": payload.get("searchEvent", ""),
        "selection": stored_selection,
        "team": team,
        "player_name": player_name,
        "threshold": threshold,
        "odds": odds,
        "recommended_stake": stake,
        "units_staked": stake,
        "actual_stake": stake,
        "unit_size": clean_number(payload.get("unitSize") or payload.get("unit_size"), 1),
        "bookmaker": normalize_bookmaker(payload.get("bookmaker", "")),
        "bet_type": bet_type,

        "status": status,
        "returns": returns,
        "profit_loss": profit_loss,
        "cashed_out_odds": co_odds if status == "cashed out" else None,
        "closing_line_odds": closing_line_odds,
        "created_at": now,
        "display_odds": display_odds,
        "entry_price_cents": entry_price_cents,
        "exit_price_cents": exit_price_cents,
        "prediction_market": clean_string(payload.get("predictionMarket") or payload.get("prediction_market")),
        "prediction_position": clean_string(payload.get("predictionPosition") or payload.get("prediction_position")),

        # Polymarket identity from the Polygun deeplink / event URL. Persist so the grader
        # settles by the EXACT Gamma market id (authoritative, free) instead of a fuzzy
        # search/sibling match. These flow from bet_parser's polygun extraction.
        "polymarket_market_id": clean_string(payload.get("polymarketMarketId") or payload.get("polymarket_market_id") or payload.get("market_id")),
        "polymarket_slug": clean_string(payload.get("polymarketSlug") or payload.get("polymarket_slug")),
        "polymarket_url": clean_string(payload.get("polymarketUrl") or payload.get("polymarket_url")),
        "condition_id": clean_string(payload.get("conditionId") or payload.get("condition_id")),
        "token_id": clean_string(payload.get("tokenId") or payload.get("token_id")),

        "source": "web_app",
        "sync_label": sync_label,
        "tags": tags,
        "needs_enrichment": True,
        "market": normalized_market,
        "market_metadata": market_meta_doc or None,
        "bet_direction": normalize_direction(payload.get("betDirection", "")),
        "market_direction": market_direction,
        "bankroll_id": payload.get("bankrollId", "personal"),
        "data_scope": payload.get("dataScope") or payload.get("data_scope") or "import",
        "value_percentage": clean_number(payload.get("valuePercentage") or payload.get("value_percentage"), 0),
        "model_odds": clean_number(payload.get("modelOdds") or payload.get("model_odds")),
        "chance_percentage": clean_number(payload.get("chancePercentage") or payload.get("chance_percentage")),
        "result_tracking": result_tracking,
    }

    # Source message: the raw text the bet was parsed from (edit view shows it), plus any
    # slip screenshot into the imported_message_sources sidecar (keyed by message, falling
    # back to the bet id for manual/web saves without a message key).
    _orig_msg = resolve_original_message(db, payload, source_message_key)
    if _orig_msg:
        bet_doc["original_message"] = _orig_msg
    _img_key = source_message_key or f"bet:{bet_id}"
    _new_images_stored = store_source_images(db, _img_key, user_id, payload.get("sourceImages") or payload.get("source_images"))
    # Pending-page approvals send sourceMessageKey but not the images; the tracker bot already
    # archived them under the same message key. Link the bet to any existing source images.
    _existing_images = False
    if not _new_images_stored:
        try:
            _existing_doc = db["imported_message_sources"].find_one(
                {"message_key": _img_key},
                {"_id": 0, "images": {"$slice": 1}},
            )
            if not _existing_doc and source_message_key:
                # Some ingestion paths archive slip screenshots under the bet id rather than the
                # queue message key. Fall back to that key so pending approvals still link them.
                _existing_doc = db["imported_message_sources"].find_one(
                    {"message_key": f"bet:{bet_id}"},
                    {"_id": 0, "images": {"$slice": 1}},
                )
                if _existing_doc and _existing_doc.get("images"):
                    _img_key = f"bet:{bet_id}"
            _existing_images = bool(_existing_doc and _existing_doc.get("images"))
        except Exception:
            _existing_images = False
    if _new_images_stored or _existing_images:
        bet_doc["has_source_image"] = True
        bet_doc["source_image_key"] = _img_key

    if fixture_id is not None:
        bet_doc["fixture_id"] = fixture_id
    if api_type_id is not None:
        bet_doc["api_type_id"] = api_type_id
    if stat_type:
        bet_doc["stat_type"] = stat_type
    if api_location:
        bet_doc["api_location"] = api_location
    if player_id is not None:
        bet_doc["player_id"] = player_id
    if team_id is not None:
        bet_doc["team_id"] = team_id

    odds_api_event_id = clean_string(payload.get("oddsApiEventId", ""))
    odds_api_league_slug = clean_string(payload.get("oddsApiLeagueSlug", ""))
    event_sport = clean_string(payload.get("eventSport", ""))
    event_source = clean_string(payload.get("eventSource", ""))
    polymarket_market_id = clean_string(payload.get("polymarketMarketId") or payload.get("polymarket_market_id") or payload.get("market_id"))
    condition_id = clean_string(payload.get("conditionId") or payload.get("condition_id"))
    token_id = clean_string(payload.get("tokenId") or payload.get("token_id"))
    polymarket_url = clean_string(payload.get("polymarketUrl") or payload.get("polymarket_url"))
    polymarket_slug = clean_string(payload.get("polymarketSlug") or payload.get("polymarket_slug"))

    if not bet_doc.get("bookmaker") and (
        polymarket_url
        or polymarket_slug
        or polymarket_market_id
        or condition_id
        or token_id
        or "polymarket" in clean_string(payload.get("predictionMarket") or "").lower()
        or entry_price_cents is not None
    ):
        bet_doc["bookmaker"] = "Polymarket"

    if odds_api_event_id:
        bet_doc["odds_api_event_id"] = odds_api_event_id
    if odds_api_league_slug:
        bet_doc["odds_api_league_slug"] = odds_api_league_slug
    if event_sport:
        bet_doc["sport"] = normalize_sport_name(event_sport)
    elif not bet_doc.get("sport"):
        inferred_sport = infer_sport_from_bet({
            "league": bet_doc.get("league", ""),
            "country": bet_doc.get("country", ""),
            "match": bet_doc.get("match", ""),
            "market": bet_doc.get("market", ""),
            "selection": bet_doc.get("selection", ""),
        })
        if inferred_sport:
            bet_doc["sport"] = inferred_sport
    if event_source:
        bet_doc["event_source"] = event_source
    if polymarket_market_id:
        bet_doc["polymarket_market_id"] = polymarket_market_id
    if condition_id:
        bet_doc["condition_id"] = condition_id.lower()
    if token_id:
        bet_doc["token_id"] = token_id
    if polymarket_url:
        bet_doc["polymarket_url"] = polymarket_url
    if polymarket_slug:
        bet_doc["polymarket_slug"] = polymarket_slug
        
    multi_selections = payload.get("multi_bet_selections")
    has_multi_selections = isinstance(multi_selections, list) and len(multi_selections) > 0
    is_multiple_payload = payload.get("is_multiple") is True
    if is_multiple_payload or has_multi_selections:
        bet_doc["is_multi_bet"] = True
        bet_doc["bet_type"] = "multiple"
        bet_doc["market"] = "Multi-Bet"
        bet_doc["market_direction"] = "multi"
        bet_doc["bet_direction"] = "multi"
        _multiple_type = clean_string(
            payload.get("multipleType") or payload.get("multiple_type") or payload.get("bet_type") or ""
        ).lower()
        if is_full_cover_type(_multiple_type):
            bet_doc["multiple_type"] = _multiple_type
        if has_multi_selections:
            bet_doc["multi_bet_selections"] = [normalize_multi_selection(s) for s in multi_selections]
            # A multi-bet parent carries no event date of its own - the date lives on each leg.
            # Inherit the EARLIEST leg's date/time so the parent groups by its fixture date on
            # the analytics calendar / profit timeline (which key off `date`) instead of
            # collapsing onto tracked_at. Only fill when the parent has no date already.
            if not clean_string(bet_doc.get("date")):
                leg_dt = sorted(
                    (clean_string(leg.get("date"))[:10], clean_string(leg.get("time")))
                    for leg in bet_doc["multi_bet_selections"]
                    if isinstance(leg, dict) and clean_string(leg.get("date"))
                )
                if leg_dt:
                    bet_doc["date"] = leg_dt[0][0]
                    if not clean_string(bet_doc.get("time")):
                        bet_doc["time"] = leg_dt[0][1]

    bet_doc = enrich_with_polymarket_metadata(db, bet_doc)
    if not clean_string(bet_doc.get("sport")):
        inferred_sport = infer_sport_from_bet(bet_doc)
        if inferred_sport:
            bet_doc["sport"] = inferred_sport

    # Insert into an overflow-aware doc (fills one with room, else creates a new doc).
    append_user_bets(user_tracked_bets_col, user_id, [bet_doc], now)

    # Priority grading: newly-imported bets should be checked immediately against live/
    # finished fixtures just like tracker-bot imports.
    trigger_instant_grade_for_user(user_id)

    # Close connection
    client.close()

    print(json.dumps({"success": True, "bet_id": bet_id, "message": "Bet saved successfully to DB"}))
    sys.exit(0)

if __name__ == "__main__":
    main()
