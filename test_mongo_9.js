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
    
    // Check odds_api_events for ANY match with Mexico
    const docs = await db.collection("odds_api_events").find({ $or: [{home: /Mexico/i}, {away: /Mexico/i}] }).limit(20).toArray();
    console.log("odds_api_events:", docs.map(d => `${d.home} vs ${d.away} - ${d.date} - ${d.league}`));

    // Check historical_events_cache
    const docs2 = await db.collection("historical_events_cache").find({ $or: [{home: /Mexico/i}, {away: /Mexico/i}] }).limit(5).toArray();
    console.log("historical_events_cache:", docs2.map(d => `${d.home} vs ${d.away} - ${d.date} - ${d.league}`));

    // Check sports_odds
    const docs3 = await db.collection("sports_odds").find({ home_team: /Mexico/i }).limit(5).toArray();
    console.log("sports_odds:", docs3.map(d => `${d.home_team} vs ${d.away_team} - ${d.commence_time}`));

    await client.close();
}
run();
