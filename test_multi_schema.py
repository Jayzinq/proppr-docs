import pymongo
import certifi
import json
from dotenv import load_dotenv

load_dotenv("/Users/zinq/PycharmProjects/Cerebro/PROPPR/.env")
import os
MONGO = os.getenv("MONGO_CONNECTION_STRING") or os.getenv("MONGODB_CONNECTION_STRING")
client = pymongo.MongoClient(MONGO, tlsCAFile=certifi.where())
db = client["Cerebro"]

# Find a document that has a bet with "multi_bet_selections" or "is_multiple": True
doc = db.user_tracked_bets.find_one({"bets.multi_bet_selections": {"$exists": True}})
if doc:
    for bet in doc.get("bets", []):
        if "multi_bet_selections" in bet:
            print("Found multi bet!")
            # convert datetime to string for printing
            for k, v in bet.items():
                if hasattr(v, "isoformat"):
                    bet[k] = v.isoformat()
            print(json.dumps(bet, indent=2))
            break
else:
    print("No multi bets found with multi_bet_selections.")
client.close()
