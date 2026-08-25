import re

# Update src/app/api/parse/route.ts
with open('src/app/api/parse/route.ts', 'r') as f:
    route_content = f.read()

prompt_addition = "For 'country', if the event is an international tournament (e.g. World Cup, Euros, Copa America) or involves national teams playing each other, you MUST output 'International'. "
route_content = route_content.replace(
    "If a single event has multiple bets",
    prompt_addition + "If a single event has multiple bets"
)

with open('src/app/api/parse/route.ts', 'w') as f:
    f.write(route_content)

# Update scripts/parser.py
with open('scripts/parser.py', 'r') as f:
    parser_content = f.read()

parser_content = parser_content.replace(
    "If a single event has multiple bets",
    prompt_addition + "If a single event has multiple bets"
)
parser_content = parser_content.replace(
    "If you cannot find a field, return an empty string for it. For 'betDirection'",
    "If you cannot find a field, return an empty string for it. " + prompt_addition + "For 'betDirection'"
)

with open('scripts/parser.py', 'w') as f:
    f.write(parser_content)

print("Updated AI prompts for country 'International'")
