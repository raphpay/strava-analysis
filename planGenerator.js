const fs = require("fs");
const path = require("path");
const { parseISO, differenceInCalendarWeeks, format } = require("date-fns");

// Utilitaires simples pour affichage
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Charger le fichier activities
const timelinePath = path.join(__dirname, "cache", "activities.json");
const goalPath = path.join(__dirname, "cache", "goal.json");

if (!fs.existsSync(timelinePath)) {
  console.error(
    "❌ Fichier activities.json introuvable. Veuillez lancer l'analyse avant."
  );
  process.exit(1);
}
if (!fs.existsSync(goalPath)) {
  console.error(
    "❌ Fichier goal.json introuvable. Veuillez le créer dans le dossier cache."
  );
  process.exit(1);
}

const timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
const goal = JSON.parse(fs.readFileSync(goalPath, "utf8"));

const today = new Date();
const goalDate = parseISO(goal.date);
const weeksToGoal = differenceInCalendarWeeks(goalDate, today);

if (weeksToGoal < 1) {
  console.error(
    "⚠️ L'objectif est trop proche pour générer un plan structuré."
  );
  process.exit(1);
}

// Générateur de séance simple selon le focus
function generateSession(focus, type) {
  const sessions = {
    technique: [
      {
        type,
        label: "Session descente technique en sous-bois",
        duration: "1h30",
        intensity: "haute",
      },
      {
        type,
        label: "Maniabilité en virages serrés",
        duration: "1h",
        intensity: "modérée",
      },
    ],
    explosif: [
      {
        type,
        label: "Relances en côte (30s / 30s)",
        duration: "1h",
        intensity: "très haute",
      },
      {
        type,
        label: "Sprint en montée + descente",
        duration: "1h30",
        intensity: "haute",
      },
    ],
    résistance: [
      {
        type,
        label: "Sortie en faux plat montant long",
        duration: "2h",
        intensity: "modérée",
      },
      {
        type,
        label: "Descente longue chronométrée",
        duration: "1h30",
        intensity: "haute",
      },
    ],
    endurant: [
      {
        type,
        label: "Sortie longue avec D+",
        duration: "3h",
        intensity: "modérée",
      },
      { type, label: "Rando active récup", duration: "1h", intensity: "basse" },
    ],
    polyvalent: [
      {
        type,
        label: "Sortie mixte montée/descente",
        duration: "2h",
        intensity: "modérée",
      },
      {
        type,
        label: "Travail relance et technique",
        duration: "1h30",
        intensity: "haute",
      },
    ],
  };
  return sessions[focus] || sessions.polyvalent;
}

function generateWeekPlan(weekIndex, state, goal) {
  const focus = goal.focus || "polyvalent";
  const type = goal.type === "foot" ? "Trail" : "VTT";
  const sessions = generateSession(focus, type);
  const fatigue =
    state < -10
      ? "fatigue importante"
      : state < 0
      ? "fatigue légère"
      : "forme correcte";

  return {
    week: weekIndex + 1,
    tsbLevel: fatigue,
    sessions: sessions.slice(0, 2),
  };
}

console.log("📅 Génération du plan personnalisé pour :", goal.title);
console.log(`🎯 Objectif le ${goal.date} (${weeksToGoal} semaines restantes)`);

const recentTSBs = timeline.slice(-7).map((d) => d.tsb || 0);
const tsbAvg = recentTSBs.reduce((a, b) => a + b, 0) / recentTSBs.length;

const plan = [];
for (let i = 0; i < Math.min(4, weeksToGoal); i++) {
  plan.push(generateWeekPlan(i, tsbAvg, goal));
}

plan.forEach((week) => {
  console.log(`\n📦 Semaine ${week.week} - ${capitalize(week.tsbLevel)}:`);
  week.sessions.forEach((s, i) => {
    console.log(
      `  ${i + 1}. [${s.type}] ${s.label} (${s.duration}, Intensité: ${
        s.intensity
      })`
    );
  });
});
