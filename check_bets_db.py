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

doc = col.find_one({"user_id": 1046187426})
if not doc:
    doc = col.find_one({"user_id": "1046187426"})

if doc:
    print(f"User found, {len(doc.get('bets', []))} bets.")
    if len(doc.get('bets', [])) > 0:
        # Print the first bet's keys and types to see what's wrong with the date
        first_bet = doc['bets'][0]
        for k, v in first_bet.items():
            print(f"{k}: {type(v)} = {v}")
else:
    print("User not found.")
