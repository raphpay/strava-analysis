// training/generatePlan.js
export function generatePlan(metrics, goal) {
  const weeksUntilGoal = Math.ceil(
    (new Date(goal.date) - new Date()) / (1000 * 60 * 60 * 24 * 7)
  );

  const plan = [];

  for (let week = 1; week <= weeksUntilGoal; week++) {
    let semaine = [];

    // Exemple basique : ajuster le volume/intensité
    if (week < weeksUntilGoal - 2) {
      // Phase de développement
      semaine.push({ type: "Endurance fondamentale", duree: "60-90 min" });
      semaine.push({ type: "Seuil / Tempo", duree: "40 min" });
      semaine.push({ type: "Intervalles", duree: "6 x 3 min" });
      semaine.push({ type: "Sortie longue", duree: "90-120 min" });
    } else if (week < weeksUntilGoal) {
      // Phase spécifique
      semaine.push({ type: "Endurance", duree: "60 min" });
      semaine.push({ type: "Travail spécifique objectif", duree: "45-60 min" });
      semaine.push({
        type: "Sortie longue avec intensité",
        duree: "90-100 min",
      });
    } else {
      // Affûtage
      semaine.push({ type: "Endurance légère", duree: "45 min" });
      semaine.push({ type: "Rappel intensité", duree: "3 x 3 min" });
    }

    plan.push({
      semaine: week,
      objectifHebdo: `${Math.round(metrics.ctl + week * 2)} CTL estimé`,
      seances: semaine,
    });
  }

  return plan;
}
