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
    
    const doc1 = await db.collection("all_positive_alerts").findOne({});
    const doc2 = await db.collection("all_positive_ev_alerts").findOne({});
    const doc3 = await db.collection("all_positive_team_alerts").findOne({});
    console.log("all_positive_alerts has created_at:", !!(doc1 && doc1.created_at), "has Date:", !!(doc1 && doc1.Date));
    console.log("all_positive_ev_alerts has created_at:", !!(doc2 && doc2.created_at), "has Date:", !!(doc2 && doc2.Date));
    console.log("all_positive_team_alerts has created_at:", !!(doc3 && doc3.created_at), "has Date:", !!(doc3 && doc3.Date));

    await client.close();
}
run();
