const fs = require("fs");
const { MongoClient } = require("mongodb");

const D = String.fromCharCode(36);

function readEnv(path) {
  try {
    return Object.fromEntries(
      fs.readFileSync(path, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const idx = line.indexOf("=");
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "")];
        })
    );
  } catch {
    return {};
  }
}

function norm(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function displayName(value) {
  const text = String(value || "").trim();
  if (!text.includes(",")) return text;
  const [last, first] = text.split(",", 2).map((part) => part.trim());
  return first && last ? `${first} ${last}` : text;
}

function splitMatch(match) {
  const parts = String(match || "").split(" vs ");
  return parts.length === 2 ? parts.map((part) => part.trim()) : ["", ""];
}

function formatLine(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value || "");
  return Number.isInteger(num) ? num.toFixed(1) : String(num);
}

function tennisGameScores(ev) {
  const homeScore = (ev && ev.homeScore) || {};
  const awayScore = (ev && ev.awayScore) || {};
  let home = 0;
  let away = 0;
  let found = false;
  for (const key of Object.keys(homeScore)) {
    if (!/^period\d+$/.test(key)) continue;
    const h = Number(homeScore[key]);
    const a = Number(awayScore[key]);
    if (Number.isFinite(h) && Number.isFinite(a)) {
      home += h;
      away += a;
      found = true;
    }
  }
  return found ? [home, away] : null;
}

function isFinished(ev) {
  const type = String(ev && ev.status && ev.status.type || "").toLowerCase();
  return ["finished", "ended", "final"].some((token) => type.includes(token));
}

function mongoConfig() {
  const env = {
    ...readEnv("/opt/PROPPR/.env"),
    ...readEnv(".env"),
    ...readEnv(".env.local"),
    ...process.env,
  };
  return {
    uri: env.MONGODB_URI_OVERRIDE
      || env.MONGO_CONNECTION_STRING
      || env.MONGODB_CONNECTION_STRING
      || env.MONGODB_URI_PRODUCTION
      || env.MONGODB_URI_DEVELOPMENT
      || "mongodb://127.0.0.1:27017",
    dbName: env.MONGODB_DB_OVERRIDE || env.MONGODB_DATABASE || "Cerebro",
  };
}

async function main() {
  const { uri, dbName } = mongoConfig();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const col = db.collection("user_tracked_bets");
  const now = new Date();

  const rows = await col.aggregate([
    { [D + "unwind"]: D + "bets" },
    {
      [D + "match"]: {
        "bets.sport": "Tennis",
        "bets.market": "Team Total",
        "bets.selection": /[A-Za-zÀ-ÿ'’.-]+,\s*[A-Za-zÀ-ÿ'’.-]+/,
      },
    },
    { [D + "project"]: { user_id: 1, bet: D + "bets" } },
  ]).toArray();

  const updates = [];
  for (const row of rows) {
    const bet = row.bet;
    const [home, away] = splitMatch(bet.match);
    if (!home || !away || !bet.bet_id) continue;

    const side = String(
      (bet.result_tracking && bet.result_tracking.api_location)
      || bet.api_location
      || ""
    ).toLowerCase();
    const subject = displayName(side === "away" ? away : home);
    const direction = String(bet.market_direction || bet.bet_direction || bet.betDirection || "")
      .toLowerCase()
      .startsWith("under") ? "under" : "over";
    const line = Number(bet.threshold ?? bet.market_hdp);
    const selection = `${subject} ${direction === "under" ? "Under" : "Over"} ${formatLine(line)} Games Won`;
    const key = `${norm(home)}|${norm(away)}|${String(bet.date || "").slice(0, 10)}`;
    const live24 = await db.collection("live24_results").findOne({ _id: key });
    const gameScore = live24 ? tennisGameScores(live24.ev) : null;
    const finished = live24 ? isFinished(live24.ev) : false;

    let status = "pending";
    let actualValue = null;
    let actualResult = null;
    let returns = 0;
    let profit = 0;
    let settledAt = null;

    if (gameScore && Number.isFinite(line)) {
      const actual = side === "away" ? gameScore[1] : gameScore[0];
      actualValue = actual;
      actualResult = `${gameScore[0]}-${gameScore[1]}`;
      if (actual === line) {
        if (finished) status = "refund";
      } else if (direction === "over") {
        if (actual > line || finished) status = actual > line ? "won" : "lost";
      } else if (actual > line) {
        status = "lost";
      } else if (finished) {
        status = "won";
      }

      const stake = Number(bet.actual_stake ?? bet.units_staked ?? bet.stake ?? 0);
      const odds = Number(bet.odds ?? 0);
      if (status === "won") {
        returns = stake * odds;
        profit = stake * (odds - 1);
        settledAt = now;
      } else if (status === "lost") {
        returns = 0;
        profit = -stake;
        settledAt = now;
      } else if (status === "refund") {
        returns = stake;
        profit = 0;
        settledAt = now;
      } else {
        actualValue = null;
        actualResult = null;
      }
    }

    const set = {
      "bets.$.market": "Player Total Games",
      "bets.$.selection": selection,
      "bets.$.player_name": subject,
      "bets.$.result_tracking.stat_type": "games",
      "bets.$.result_tracking.api_type_id": null,
      "bets.$.result_tracking.expected_threshold": Number.isFinite(line) ? line : null,
      last_updated: now,
    };

    if (status === "pending") {
      Object.assign(set, {
        "bets.$.status": "pending",
        "bets.$.returns": 0,
        "bets.$.profit_loss": 0,
        "bets.$.settled_at": null,
        "bets.$.actual_value": null,
        "bets.$.actual_result": null,
        "bets.$.grading_source": null,
        "bets.$.result_tracking.result_status": "pending",
        "bets.$.result_tracking.actual_value": null,
        "bets.$.result_tracking.actual_result": null,
        "bets.$.result_tracking.graded_at": null,
        "bets.$.result_tracking.grading_source": null,
      });
    } else {
      Object.assign(set, {
        "bets.$.status": status,
        "bets.$.returns": returns,
        "bets.$.profit_loss": profit,
        "bets.$.settled_at": settledAt,
        "bets.$.actual_value": actualValue,
        "bets.$.actual_result": actualResult,
        "bets.$.grading_source": "live24_tennis_games",
        "bets.$.result_tracking.result_status": status,
        "bets.$.result_tracking.actual_value": actualValue,
        "bets.$.result_tracking.actual_result": actualResult,
        "bets.$.result_tracking.graded_at": settledAt,
        "bets.$.result_tracking.grading_source": "live24_tennis_games",
      });
    }

    const result = await col.updateOne(
      { user_id: row.user_id, "bets.bet_id": bet.bet_id },
      { [D + "set"]: set }
    );
    updates.push({
      bet_id: bet.bet_id,
      old: bet.selection,
      selection,
      status,
      actualResult,
      actualValue,
      modified: result.modifiedCount,
    });
  }

  console.log(JSON.stringify({ candidate_rows: rows.length, updates }, null, 2));
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
