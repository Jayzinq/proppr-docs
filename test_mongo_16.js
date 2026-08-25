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
    
    const now = new Date();
    const pastDate = new Date(now.getTime() - 90 * 86_400_000);

    const count1 = await db.collection("all_positive_alerts").countDocuments({ created_at: { $gte: pastDate } });
    const count2 = await db.collection("all_positive_ev_alerts").countDocuments({ created_at: { $gte: pastDate } });
    const count3 = await db.collection("all_positive_team_alerts").countDocuments({ created_at: { $gte: pastDate } });
    console.log("Counts in last 90 days:", count1, count2, count3);

    await client.close();
}
run();
