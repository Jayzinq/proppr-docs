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
    
    // Check if Mexico vs Serbia exists
    const docs1 = await db.collection("all_positive_alerts").find({ Match: { $regex: /Mexico|Serbia/i } }).limit(5).toArray();
    console.log("all_positive_alerts:", docs1.map(d => `${d.Match} - ${d.Date} - ${d.League}`));
    
    const docs2 = await db.collection("all_positive_ev_alerts").find({ Match: { $regex: /Mexico|Serbia/i } }).limit(5).toArray();
    console.log("all_positive_ev_alerts:", docs2.map(d => `${d.Match} - ${d.Date} - ${d.League}`));

    const docs3 = await db.collection("all_positive_team_alerts").find({ Match: { $regex: /Mexico|Serbia/i } }).limit(5).toArray();
    console.log("all_positive_team_alerts:", docs3.map(d => `${d.Match} - ${d.Date} - ${d.League}`));

    await client.close();
}
run();
