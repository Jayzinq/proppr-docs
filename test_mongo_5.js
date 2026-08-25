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
    
    // List collections
    const colls = await db.listCollections().toArray();
    console.log(colls.map(c => c.name));

    // Also check odds_api_events for Mexico vs Serbia
    const docs = await db.collection("odds_api_events").find({ $or: [{ home: /Mexico/i, away: /Serbia/i }, { home: /Serbia/i, away: /Mexico/i }] }).toArray();
    console.log("odds_api_events:", docs.map(d => `${d.home} vs ${d.away} - ${d.date} - ${d.league}`));

    await client.close();
}
run();
