import sys

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/scripts/save_bet.py"

with open(filepath, "r") as f:
    content = f.read()

# Replace hardcoded status="pending"
content = content.replace('"status": "pending",', '"status": payload.get("status", "pending").lower(),')

# Add returns and profit_loss logic before bet_doc creation
logic = """
    bet_type = payload.get("betType", "single").lower()
    
    status = payload.get("status", "pending").lower()
    returns = 0.0
    profit_loss = 0.0
    
    if status == "won":
        returns = stake * odds
        profit_loss = returns - stake
    elif status == "lost":
        returns = 0.0
        profit_loss = -stake
    elif status == "refund" or status == "void":
        returns = stake
        profit_loss = 0.0
    elif status == "half_win" or status == "half win":
        status = "half win"
        returns = stake + ((stake * (odds - 1.0)) / 2.0)
        profit_loss = returns - stake
    elif status == "half_loss" or status == "half loss":
        status = "half loss"
        returns = stake / 2.0
        profit_loss = -(stake / 2.0)
    elif status == "cashed_out" or status == "cashed out":
        status = "cashed out"
        co_odds = payload.get("cashedOutOdds")
        if co_odds:
            try:
                co_odds = float(co_odds)
            except ValueError:
                co_odds = 1.0
            returns = stake * co_odds
            profit_loss = returns - stake
"""

content = content.replace('    bet_type = payload.get("betType", "single").lower()', logic)

# Add returns and profit_loss to bet_doc
doc_addition = """
        "status": status,
        "returns": returns,
        "profit_loss": profit_loss,
        "cashed_out_odds": payload.get("cashedOutOdds") if status == "cashed out" else None,
        "created_at": now,
"""

content = content.replace('        "status": payload.get("status", "pending").lower(),\n        "created_at": now,', doc_addition)

with open(filepath, "w") as f:
    f.write(content)
