import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ACTIVITIES_FILE = path.join(__dirname, "../cache/activities.json");

export default async function fetchActivities(accessToken) {
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
    id: act.id,
    date: act.start_date_local.split("T")[0],
    name: act.name,
    type: act.type,
    durationMin: Math.round(act.elapsed_time / 60),
    distanceKm: (act.distance / 1000).toFixed(1),
    elevationGain: act.total_elevation_gain,
    avgHR: act.average_heartrate,
  }));

  await fs.writeFile(
    ACTIVITIES_FILE,
    JSON.stringify(simplified, null, 2),
    "utf-8"
  );

  // console.table(simplified);
  return simplified;
}
