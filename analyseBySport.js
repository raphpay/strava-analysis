import dayjs from "dayjs";
import dotenv from "dotenv";
import fs from "fs/promises";
import fetch from "node-fetch";
import readline from "readline";

dotenv.config();

const TOKENS_FILE = "./tokens.json";
const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

// === 1. Token handling ===
async function loadTokens() {
  return JSON.parse(await fs.readFile(TOKENS_FILE, "utf-8"));
}

async function saveTokens(tokens) {
  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch("https://www.strava.com/api/v3/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  await saveTokens(data);
  return data.access_token;
}

async function getAccessToken() {
  const tokens = await loadTokens();
  const now = Math.floor(Date.now() / 1000);

  if (now >= tokens.expires_at) {
    return await refreshAccessToken(tokens.refresh_token);
  }

  return tokens.access_token;
}

// === 2. Estimation TSS ===
function estimateTSS(durationMin, hrAvg) {
  const hrMax = 190;
  const IF = hrAvg ? hrAvg / hrMax : 0.7;
  return durationMin * IF * IF;
}

// === 3. Load activities ===
async function fetchActivities() {
  const accessToken = await getAccessToken();
  const activities = [];

  let page = 1;
  const perPage = 100;
  let keepGoing = true;

  while (keepGoing) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    activities.push(...data);
    if (data.length < perPage) keepGoing = false;
    else page++;
  }

  return activities;
}

// === 4. Filter by chosen sport ===
function filterActivitiesBySport(activities, sportChoice) {
  if (sportChoice === "Bike") {
    return activities.filter(
      (act) => act.type === "Ride" || act.type === "EBikeRide"
    );
  }

  if (sportChoice === "Foot") {
    return activities.filter((act) =>
      ["Run", "Hike", "TrailRun"].includes(act.type)
    );
  }

  return [];
}

// === 5. Build TSS map ===
function buildTSSByDay(filteredActivities) {
  const map = {};

  for (const act of filteredActivities) {
    const date = act.start_date_local.split("T")[0];
    const durationMin = act.elapsed_time / 60;
    const tss = estimateTSS(durationMin, act.average_heartrate);

    map[date] = (map[date] || 0) + tss;
  }

  return map;
}

// === 6. Compute CTL / ATL / TSB ===
function computeLoadTimeline(tssMap) {
  const days = 180;
  const today = dayjs().startOf("day");
  const timeline = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = today.subtract(i, "day").format("YYYY-MM-DD");
    const tss = tssMap[date] || 0;

    timeline.push({ date, tss });
  }

  for (let i = 0; i < timeline.length; i++) {
    const ctlWindow = timeline.slice(Math.max(0, i - 41), i + 1);
    const atlWindow = timeline.slice(Math.max(0, i - 6), i + 1);

    const ctl = ctlWindow.reduce((sum, d) => sum + d.tss, 0) / ctlWindow.length;
    const atl = atlWindow.reduce((sum, d) => sum + d.tss, 0) / atlWindow.length;
    const tsb = ctl - atl;

    timeline[i].ctl = Number(ctl.toFixed(1));
    timeline[i].atl = Number(atl.toFixed(1));
    timeline[i].tsb = Number(tsb.toFixed(1));
  }

  return timeline;
}

// === 7. User prompt ===
async function askSportChoice() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Choisis un sport à analyser (Bike ou Foot) : ", (answer) => {
      rl.close();
      const choice = answer.trim().toLowerCase();
      if (choice === "bike") resolve("Bike");
      else resolve("Foot");
    });
  });
}

// === 8. Main ===
(async () => {
  const sportChoice = await askSportChoice();
  console.log(`🚴‍ Analyser les activités : ${sportChoice}`);

  const activities = await fetchActivities();
  const filtered = filterActivitiesBySport(activities, sportChoice);

  console.log(`📊 ${filtered.length} activités "${sportChoice}" récupérées.`);

  const tssMap = buildTSSByDay(filtered);
  const timeline = computeLoadTimeline(tssMap);

  console.table(timeline.slice(-10));
})();
