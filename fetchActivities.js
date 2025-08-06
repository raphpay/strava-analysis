import dotenv from "dotenv";
import fs from "fs/promises";
import fetch from "node-fetch";

dotenv.config();

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const TOKENS_FILE = "./tokens.json";

async function loadTokens() {
  const data = await fs.readFile(TOKENS_FILE, "utf-8");
  return JSON.parse(data);
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
  if (!res.ok) {
    throw new Error("❌ Échec du refresh token : " + JSON.stringify(data));
  }

  await saveTokens(data);
  console.log("🔁 Access token rafraîchi.");
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

async function fetchActivities() {
  const accessToken = await getAccessToken();

  const response = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=100",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const activities = await response.json();
  if (!response.ok) {
    console.error("❌ Erreur lors du fetch :", activities);
    return;
  }

  const simplified = activities.map((act) => ({
    date: act.start_date_local.split("T")[0],
    name: act.name,
    type: act.type,
    durationMin: Math.round(act.elapsed_time / 60),
    distanceKm: (act.distance / 1000).toFixed(1),
    elevationGain: act.total_elevation_gain,
    avgHR: act.average_heartrate,
  }));

  console.table(simplified);
}

fetchActivities().catch(console.error);
