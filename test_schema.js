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
    
    // Find a bet with bet_type="multi" or bet_type="accumulator"
    const doc = await db.collection("user_tracked_bets").findOne({ "bets.bet_type": { $in: ["multi", "accumulator", "bet_builder"] } });
    if (doc) {
        console.log("Found multi bet document!");
        console.dir(doc.bets.find(b => ["multi", "accumulator", "bet_builder"].includes(b.bet_type)), { depth: null });
    } else {
        console.log("No multi bets found.");
    }

    await client.close();
}
run();
