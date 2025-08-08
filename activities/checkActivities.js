import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fetchActivities from "./fetchActivities.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ACTIVITIES_FILE = path.join(__dirname, "../cache/activities.json");

export async function checkActivities(accessToken) {
  try {
    const data = await fs.readFile(ACTIVITIES_FILE, "utf-8");
    const activities = JSON.parse(data);

    if (activities.length === 0) {
      return await fetchActivities(accessToken);
    }

    return activities;
  } catch (err) {
    if (err.code === "ENOENT") {
      // console.log("⚠️ Problème lors de la récupération des activités.");
      console.log("Récupération des activités sur Strava.");
      return await fetchActivities(accessToken);
    }
    throw err;
  }
}
