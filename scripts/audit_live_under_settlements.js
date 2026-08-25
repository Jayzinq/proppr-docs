const fs = require("fs");
const { MongoClient } = require("mongodb");

const D = String.fromCharCode(36);
const LIVE_SOURCES = new Set([
  "live24_score_cache",
  "betburger_live_score",
  "live24_tennis_games",
  "inplay_live",
  "inplay_live_events",
  "live_events",
]);

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

function splitMatch(match) {
  const parts = String(match || "").split(" vs ");
  return parts.length === 2 ? parts.map((part) => part.trim()) : ["", ""];
}

function statusText(doc) {
  const ev = doc && doc.ev && typeof doc.ev === "object" ? doc.ev : (doc || {});
  const st = ev.status && typeof ev.status === "object" ? ev.status : {};
  return [
    doc && doc.status,
    st.type,
    st.description,
    st.code,
    ev.status,
  ].map((part) => String(part || "").toLowerCase()).join(" ");
}

function isFinished(doc) {
  const text = statusText(doc);
  return ["finished", "ended", "final", "after penalties", "ft", "full time"].some((token) => text.includes(token));
}

function isExplicitlyLive(doc) {
  const text = statusText(doc);
  return ["inprogress", "in progress", "live", "notstarted", "not started"].some((token) => text.includes(token));
}

function lineFrom(value) {
  const direct = Number(value && (value.threshold ?? value.Threshold ?? value.market_hdp ?? value.hdp));
  if (Number.isFinite(direct)) return direct;
  const selection = String(value && (value.selection || value.Selection || value.market_name || "") || "");
  const m = selection.match(/\b(?:under|u)\s*([+-]?\d+(?:\.\d+)?)\b/i)
    || selection.match(/\b([+-]?\d+(?:\.\d+)?)\s*(?:points?|goals?|games?|runs?)\b/i);
  return m ? Number(m[1]) : null;
}

function scoreSideFromText(text, home, away) {
  const folded = norm(text);
  const h = norm(home);
  const a = norm(away);
  if (h && (folded.includes(h) || h.includes(folded))) return "home";
  if (a && (folded.includes(a) || a.includes(folded))) return "away";
  return null;
}

function currentScores(doc) {
  const ev = doc && doc.ev && typeof doc.ev === "object" ? doc.ev : (doc || {});
  const scoreObj = ev.score || doc.score || {};
  let h = Number(ev.home_score ?? ev.homeScoreCurrent ?? ev.homeScore?.current ?? scoreObj.home);
  let a = Number(ev.away_score ?? ev.awayScoreCurrent ?? ev.awayScore?.current ?? scoreObj.away);
  if (Number.isFinite(h) && Number.isFinite(a)) return [h, a];

  const raw = ev.live_score || doc.live_score || ev.current_score || doc.current_score
    || (ev.live_stats && ev.live_stats.MAIN) || (doc.live_stats && doc.live_stats.MAIN);
  const m = String(raw || "").match(/(\d+(?:\.\d+)?)\s*[-:]\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function tennisGameScores(doc) {
  const ev = doc && doc.ev && typeof doc.ev === "object" ? doc.ev : (doc || {});
  const homeScore = ev.homeScore || doc.homeScore || {};
  const awayScore = ev.awayScore || doc.awayScore || {};
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

async function findLiveDoc(db, bet) {
  const [home, away] = splitMatch(bet.match || bet.Match || `${bet.home || ""} vs ${bet.away || ""}`);
  const dateKey = String(bet.date || bet.Date || bet.fixture_datetime || bet.match_date || "").slice(0, 10);
  if (home && away && dateKey) {
    const live24 = await db.collection("live24_results").findOne({ _id: `${norm(home)}|${norm(away)}|${dateKey}` });
    if (live24) return { source: "live24_results", doc: live24, home, away };
  }
  const eventId = bet.event_id || bet.betburger_event_id || bet.bookmaker_event_id;
  const ids = [...new Set([eventId, eventId != null ? String(eventId) : null].filter((x) => x != null && x !== ""))];
  for (const name of ["inplay_live_events", "live_events"]) {
    if (!ids.length) continue;
    const doc = await db.collection(name).findOne({ [D + "or"]: [{ _id: { [D + "in"]: ids } }, { id: { [D + "in"]: ids } }, { event_id: { [D + "in"]: ids } }] });
    if (doc) return { source: name, doc, home, away };
  }
  if (ids.length) {
    const doc = await db.collection("all_value_bets").findOne(
      { source: "betburger_live", event_id: { [D + "in"]: ids } },
      { sort: { last_updated: -1, created_at: -1 } }
    );
    if (doc) return { source: "all_value_bets", doc, home, away };
  }
  return null;
}

function actualForUnder(bet, live) {
  const sport = String(bet.sport || bet.Sport || live.doc.sport || live.doc.ev?.sport || "").toLowerCase();
  const market = String(bet.market || bet.Market || bet.market_name || "").toLowerCase();
  const selection = String(bet.selection || bet.Selection || bet.market_name || "");
  const scores = sport === "tennis" ? tennisGameScores(live.doc) : currentScores(live.doc);
  if (!scores) return null;
  const isTeamTotal = market.includes("team total")
    || market.includes("player total games")
    || market.includes("games won")
    || market.includes("player points")
    || /(?:points?|games? won)\b/i.test(selection);
  const side = String(bet.api_location || bet.team_assignment || bet.result_tracking?.api_location || bet.result_tracking?.side || "").toLowerCase()
    || scoreSideFromText(selection, live.home, live.away);
  if (isTeamTotal && (side === "home" || side === "away")) {
    return { actual: side === "home" ? scores[0] : scores[1], actualResult: `${scores[0]}-${scores[1]}` };
  }
  return { actual: scores[0] + scores[1], actualResult: `${scores[0]}-${scores[1]}` };
}

function sourceIsLiveGrade(bet) {
  const src = String(bet.grading_source || bet.result_tracking?.grading_source || "").toLowerCase();
  return !src || LIVE_SOURCES.has(src);
}

async function auditTrackedBets(db) {
  const col = db.collection("user_tracked_bets");
  const rows = await col.aggregate([
    { [D + "unwind"]: D + "bets" },
    {
      [D + "match"]: {
        "bets.status": "won",
        [D + "or"]: [
          { "bets.market_direction": /^under$/i },
          { "bets.bet_direction": /^under$/i },
          { "bets.selection": /\b(?:under|u)\s*[+-]?\d/i },
        ],
      },
    },
    { [D + "project"]: { user_id: 1, bet: D + "bets" } },
  ]).toArray();

  const repaired = [];
  for (const row of rows) {
    const bet = row.bet;
    if (!sourceIsLiveGrade(bet)) continue;
    const line = lineFrom(bet);
    if (!Number.isFinite(line)) continue;
    const live = await findLiveDoc(db, bet);
    if (!live || isFinished(live.doc) || !isExplicitlyLive(live.doc)) continue;
    const measured = actualForUnder(bet, live);
    if (!measured) continue;

    const now = new Date();
    if (measured.actual > line) {
      const stake = Number(bet.actual_stake ?? bet.units_staked ?? bet.stake ?? 0);
      await col.updateOne(
        { user_id: row.user_id, "bets.bet_id": bet.bet_id },
        { [D + "set"]: {
          "bets.$.status": "lost",
          "bets.$.returns": 0,
          "bets.$.profit_loss": -stake,
          "bets.$.settled_at": now,
          "bets.$.actual_value": measured.actual,
          "bets.$.actual_result": measured.actualResult,
          "bets.$.grading_source": "live_under_crossed_audit",
          "bets.$.result_tracking.result_status": "lost",
          "bets.$.result_tracking.actual_value": measured.actual,
          "bets.$.result_tracking.actual_result": measured.actualResult,
          "bets.$.result_tracking.graded_at": now,
          "bets.$.result_tracking.grading_source": "live_under_crossed_audit",
          last_updated: now,
        } }
      );
      repaired.push({ bet_id: bet.bet_id, action: "won_to_lost", selection: bet.selection, line, actual: measured.actual, live_source: live.source });
    } else {
      await col.updateOne(
        { user_id: row.user_id, "bets.bet_id": bet.bet_id },
        { [D + "set"]: {
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
          last_updated: now,
        } }
      );
      repaired.push({ bet_id: bet.bet_id, action: "won_to_pending", selection: bet.selection, line, actual: measured.actual, live_source: live.source });
    }
  }
  return { checked: rows.length, repaired };
}

async function auditAlertDocs(db) {
  const col = db.collection("all_positive_inplay_alerts");
  const rows = await col.find({
    is_live: true,
    bet_side: /^under$/i,
    "result_tracking.result_status": { [D + "in"]: ["win", "won"] },
  }).limit(1000).toArray();
  const repaired = [];
  for (const alert of rows) {
    const line = lineFrom(alert);
    if (!Number.isFinite(line)) continue;
    const live = await findLiveDoc(db, {
      ...alert,
      match: `${alert.home || ""} vs ${alert.away || ""}`,
      date: alert.kickoff_utc || alert.fixture_datetime || alert.match_date,
    });
    if (!live || isFinished(live.doc) || !isExplicitlyLive(live.doc)) continue;
    const measured = actualForUnder({
      ...alert,
      match: `${alert.home || ""} vs ${alert.away || ""}`,
      market: alert.market_name,
      selection: alert.market_name,
      market_direction: "under",
    }, live);
    if (!measured) continue;
    const now = new Date();
    if (measured.actual > line) {
      await col.updateOne(
        { _id: alert._id },
        { [D + "set"]: {
          "result_tracking.result_status": "loss",
          "result_tracking.actual_value": measured.actual,
          "result_tracking.graded_at": now,
          "result_tracking.grading_source": "live_under_crossed_audit",
        } }
      );
      repaired.push({ _id: alert._id, action: "win_to_loss", line, actual: measured.actual, live_source: live.source });
    } else {
      await col.updateOne(
        { _id: alert._id },
        { [D + "set"]: {
          "result_tracking.result_status": "pending",
          "result_tracking.actual_value": null,
          "result_tracking.graded_at": null,
          "result_tracking.grading_source": null,
        } }
      );
      repaired.push({ _id: alert._id, action: "win_to_pending", line, actual: measured.actual, live_source: live.source });
    }
  }
  return { checked: rows.length, repaired };
}

async function main() {
  const { uri, dbName } = mongoConfig();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const tracked = await auditTrackedBets(db);
  const alerts = await auditAlertDocs(db);
  console.log(JSON.stringify({ tracked, alerts }, null, 2));
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
