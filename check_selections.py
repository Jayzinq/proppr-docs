import os
import pymongo
import certifi
import json

from dotenv import load_dotenv

local_env = "/Users/zinq/PycharmProjects/Cerebro/PROPPR/.env"
if os.path.exists(local_env):
    load_dotenv(local_env)

MONGO_CONN_STR = os.getenv("MONGO_CONNECTION_STRING") or os.getenv("MONGODB_CONNECTION_STRING")
try:
    client = pymongo.MongoClient(MONGO_CONN_STR, tlsCAFile=certifi.where())
except TypeError:
    client = pymongo.MongoClient(MONGO_CONN_STR)

db = client["Cerebro"]
col = db["user_tracked_bets"]

doc = col.find_one({"user_id": 1046187426}) or col.find_one({"user_id": "1046187426"})

if doc and doc.get('bets'):
    for bet in doc['bets'][:3]:
        # Print selection relevant fields
        print({k: bet.get(k) for k in ['bet_id', 'selection', 'player_name', 'bet_type', 'is_multiple', 'market', 'stake', 'odds']})
else:
    print("User or bets not found")
