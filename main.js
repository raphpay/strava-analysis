import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { checkActivities } from "./activities/checkActivities.js";
import advancedMetrics from "./analysis/advancedMetrics.js";
import { analyseActivities } from "./analysis/analyseActivities.js";
import { checkAuth } from "./auth/checkAuth.js";
import { computeMetrics } from "./training/computeMetrics.js";
import { generatePlan } from "./training/generatePlan.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GOAL_FILE = path.join(__dirname, "./cache/goal.json");

(async () => {
  console.log("🚀 Lancement du coach Strava...");

  // 1️⃣ Authentification
  const tokens = await checkAuth();
  const accessToken = tokens.access_token;

  // 2️⃣ Récupération des activités (avec cache)
  console.log("📥 Récupération des activités...");
  const activities = await checkActivities(accessToken);
  console.log(`📊 ${activities.length} activités récupérées.`);

  // 3️⃣ Analyse brute
  const timeline = await analyseActivities(activities, accessToken);

  // 4️⃣ Calcul des métriques d'entraînement
  const analysis = await advancedMetrics(activities, timeline, accessToken);
  const metrics = computeMetrics(analysis);

  // 4️⃣ Lecture de l’objectif
  const goal = JSON.parse(await fs.readFile(GOAL_FILE, "utf-8"));

  // 5️⃣ Génération du plan
  const plan = generatePlan(metrics, goal);

  console.log("📅 Plan d'entraînement :");
  for (const weekPlan of plan) {
    console.log("Plan semaine:", weekPlan);
  }
})();
