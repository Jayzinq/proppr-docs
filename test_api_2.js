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
    
    const query = "Portugal vs Uzbekistan";
    const qTokens = query.split(/\s+vs\s+|\s+/i).filter(Boolean);
    const regex = new RegExp(qTokens.join(".*"), "i");
    const pastDocs = await db.collection("all_positive_team_alerts").find(
        { Match: { $regex: regex } },
        { projection: { Match: 1, Date: 1, Time: 1, League: 1, Country: 1 }, sort: { created_at: -1 }, limit: 10 }
    ).toArray();

    console.log(pastDocs);

    await client.close();
}
run();
