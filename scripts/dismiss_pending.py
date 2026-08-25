#!/usr/bin/env python3
import pymongo

client = pymongo.MongoClient(
    "mongodb://10.0.0.2:27017/?directConnection=true&serverSelectionTimeoutMS=5000&tls=false"
)
col = client["Cerebro"]["telegram_import_queue"]
keys = [
    "e49126d718f1b108cbeee8c3f4cf9efcb879ca12",
    "e867a51ecf2d85167113cc206416a56b2850faab",
]
for k in keys:
    r = col.update_one(
        {"message_key": k, "status": "pending_review"},
        {"$set": {"status": "imported", "resolved_via": "already_imported_july6"}},
    )
    print(k, "matched", r.matched_count)
client.close()