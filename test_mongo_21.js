const { MongoClient } = require('mongodb');
const fs = require('fs');
async function run() {
    const uri = "mongodb://127.0.0.1:27017/?directConnection=true";
    const client = new MongoClient(uri);
    try {
        const db = client.db("Cerebro");
        const qTokens = ["Coco", "Gauff"];
        const q = { $or: [ { home: { $regex: new RegExp(qTokens.join("|"), "i") } }, { away: { $regex: new RegExp(qTokens.join("|"), "i") } } ] };
        console.log("Query:", q);
        const docs = await db.collection("odds_api_events").find(q).toArray();
        console.log("Found:", docs.length);
        console.log("First doc:", docs[0]);
    } finally {
        await client.close();
    }
}
run().catch(console.error);
