const { MongoClient } = require('mongodb');
const fs = require('fs');

function readEnvFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf8");
        return Object.fromEntries(
            content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith("#") && line.includes("="))
                .map((line) => {
                    const idx = line.indexOf("=");
                    const key = line.slice(0, idx).trim();
                    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
                    return [key, value];
                })
        );
    } catch {
        return {};
    }
}

async function run() {
    const localEnv = readEnvFile("/Users/zinq/PycharmProjects/Cerebro/PROPPR/.env");
    const uri = localEnv.MONGODB_URI_OVERRIDE || localEnv.MONGO_CONNECTION_STRING || "mongodb://127.0.0.1:27017/";
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("Cerebro");
    
    const colls = ['all_value_bets', 'sports_odds', 'live_fixtures_stats', 'historical_events_cache', 'team_fixture_registry', 'team_odds'];
    
    for (const c of colls) {
        const count = await db.collection(c).countDocuments({ $text: { $search: "Mexico Serbia" } }).catch(() => 0);
        console.log(c, count);
        
        // try regex
        const docs = await db.collection(c).find({ $and: [{ $or: [{home: /Mexico/i}, {away: /Mexico/i}, {Match: /Mexico/i}] }, { $or: [{home: /Serbia/i}, {away: /Serbia/i}, {Match: /Serbia/i}] }] }).limit(1).toArray();
        if (docs.length) {
            console.log("Found in", c, docs[0]);
        }
    }

    await client.close();
}
run();
