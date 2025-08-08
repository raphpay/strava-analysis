import dotenv from "dotenv";
import analyzeTimeline from "./analyzeTimeline.js";
import buildTSSByDay from "./buildTSSByDay.js";
import computeLoadTimeline from "./computeLoadTimeline.js";

dotenv.config();

export async function analyseActivities(activities, accessToken) {
  const tssMap = buildTSSByDay(activities);
  const timeline = computeLoadTimeline(tssMap);
  // Affiche les 10 derniers jours
  console.table(timeline.slice(-10));
  analyzeTimeline(timeline);
  return timeline;
}
