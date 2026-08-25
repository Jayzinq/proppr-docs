import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/scripts/save_bet.py"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """    if event_source:
        bet_doc["event_source"] = event_source
    
    # Insert or update
    telegram_doc = user_tracked_bets_col.find_one({"user_id": user_id})"""

new_logic = """    if event_source:
        bet_doc["event_source"] = event_source
        
    if "is_multiple" in payload:
        bet_doc["is_multiple"] = payload["is_multiple"]
        bet_doc["bet_type"] = "multiple"
        
    if "multi_bet_selections" in payload:
        bet_doc["multi_bet_selections"] = payload["multi_bet_selections"]
        bet_doc["bet_type"] = "multiple"
    
    # Insert or update
    telegram_doc = user_tracked_bets_col.find_one({"user_id": user_id})"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched save_bet.py logic")
else:
    print("Marker not found in save_bet.py")
