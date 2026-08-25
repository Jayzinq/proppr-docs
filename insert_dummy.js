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
    
    // Insert dummy Mexico vs Serbia
    await db.collection("all_positive_team_alerts").insertOne({
        Match: "Mexico vs Serbia",
        Date: "2026-06-04",
        Time: "20:00:00",
        League: "International Friendly",
        Country: "International",
        created_at: new Date()
    });

    console.log("Inserted dummy match");
    await client.close();
}
run();
