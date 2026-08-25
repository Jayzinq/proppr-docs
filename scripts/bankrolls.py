import sys
import json
import uuid
import os
from datetime import datetime, timezone

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No payload provided"}))
        sys.exit(1)
        
    try:
        payload = json.loads(sys.argv[1])
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
        
    action = payload.get("action", "get")
    
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
        
    MONGO_CONN_STR = (
        os.getenv("MONGODB_URI_OVERRIDE") or
        os.getenv("MONGO_CONNECTION_STRING") or
        os.getenv("MONGODB_CONNECTION_STRING") or
        os.getenv("MONGODB_URI_PRODUCTION") or
        os.getenv("MONGODB_URI_DEVELOPMENT") or
        "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&tls=false"
    )
    
    if not MONGO_CONN_STR:
        print(json.dumps({"error": "Mongo connection string not found"}))
        sys.exit(1)
        
    try:
        client = pymongo.MongoClient(MONGO_CONN_STR, tlsCAFile=certifi.where())
    except (TypeError, pymongo.errors.ConfigurationError):
        client = pymongo.MongoClient(MONGO_CONN_STR)
        
    db = client["Cerebro"]
    col = db["user_tracked_bets"]
    
    now = datetime.now(timezone.utc)
    
    # bankrolls is a per-user field that lives on the PRIMARY (oldest) tracked-bets doc -
    # bets themselves may be split across additional overflow docs.
    doc = col.find_one({"user_id": user_id}, sort=[("created_at", 1)])
    bankrolls = doc.get("bankrolls", []) if doc else []
    primary_id = doc["_id"] if doc else None

    # Ensure default Personal bankroll exists if empty
    if not bankrolls:
        bankrolls = [{
            "id": "personal",
            "name": "Personal",
            "type": "units",
            "unit_size": 1,
            "currency": "GBP"
        }]
        if primary_id is not None:
            col.update_one({"_id": primary_id}, {"$set": {"bankrolls": bankrolls, "updated_at": now}})
        else:
            primary_id = col.insert_one({"user_id": user_id, "bets": [], "bankrolls": bankrolls, "created_at": now, "updated_at": now}).inserted_id

    if action == "get":
        print(json.dumps({"success": True, "bankrolls": bankrolls}))
        sys.exit(0)
        
    elif action == "create":
        new_b = {
            "id": str(uuid.uuid4()),
            "name": payload.get("name", "New Bankroll"),
            "type": payload.get("type", "currency"),
            "unit_size": payload.get("unit_size", 1),
            "currency": payload.get("currency", "GBP"),
            # Fallbacks for parsed/imported bets missing these fields (any source).
            "default_stake": payload.get("default_stake"),
            "default_bookmaker": payload.get("default_bookmaker") or "",
            # Event kickoffs on this bankroll display in this timezone (IANA).
            "timezone": payload.get("timezone") or "",
            # How odds are shown site-wide for this bankroll: decimal | american | fractional | cents.
            "odds_format": payload.get("odds_format") or "decimal",
        }
        col.update_one({"_id": primary_id}, {"$push": {"bankrolls": new_b}, "$set": {"updated_at": now}})
        print(json.dumps({"success": True, "bankroll": new_b}))
        sys.exit(0)
        
    elif action == "update":
        b_id = payload.get("bankrollId")
        name = payload.get("name")
        b_type = payload.get("type")
        u_size = payload.get("unit_size")
        currency = payload.get("currency")
        
        updated = False
        for b in bankrolls:
            if b["id"] == b_id:
                if name is not None: b["name"] = name
                if b_type is not None: b["type"] = b_type
                if u_size is not None: b["unit_size"] = u_size
                if currency is not None: b["currency"] = currency
                # Key-presence (not None) so an explicit null CLEARS a default.
                if "default_stake" in payload: b["default_stake"] = payload.get("default_stake")
                if "default_bookmaker" in payload: b["default_bookmaker"] = payload.get("default_bookmaker") or ""
                if "timezone" in payload: b["timezone"] = payload.get("timezone") or ""
                if "odds_format" in payload: b["odds_format"] = payload.get("odds_format") or "decimal"
                updated = True
                break
                
        if updated:
            col.update_one({"_id": primary_id}, {"$set": {"bankrolls": bankrolls, "updated_at": now}})
            print(json.dumps({"success": True, "bankrolls": bankrolls}))
        else:
            print(json.dumps({"error": "Bankroll not found"}))
        sys.exit(0 if updated else 1)
        
    elif action == "delete":
        b_id = payload.get("bankrollId")
        if b_id == "personal":
            print(json.dumps({"error": "Cannot delete default bankroll"}))
            sys.exit(1)
            
        new_bankrolls = [b for b in bankrolls if b["id"] != b_id]
        if len(new_bankrolls) < len(bankrolls):
            col.update_one({"_id": primary_id}, {"$set": {"bankrolls": new_bankrolls, "updated_at": now}})
            
            # Optionally reassign bets to personal
            # col.update_many(
            #    {"user_id": user_id, "bets.bankroll_id": b_id},
            #    {"$set": {"bets.$[elem].bankroll_id": "personal"}},
            #    array_filters=[{"elem.bankroll_id": b_id}]
            # )
            
            # update_MANY: bets for this bankroll may be spread across overflow docs.
            col.update_many(
                {"user_id": user_id, "bets.bankroll_id": b_id},
                {"$set": {"bets.$[bet].bankroll_id": "personal", "updated_at": now}},
                array_filters=[{"bet.bankroll_id": b_id}],
            )
            
            print(json.dumps({"success": True, "bankrolls": new_bankrolls}))
            sys.exit(0)
        else:
            print(json.dumps({"error": "Bankroll not found"}))
            sys.exit(1)

if __name__ == "__main__":
    main()
