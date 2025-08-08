// === 3. Analyse auto : CTL, TSB, recommandations ===
export default function analyzeTimeline(timeline) {
  const lastDay = timeline[timeline.length - 1];
  const tsb = lastDay.tsb;
  const ctlNow = lastDay.ctl;

  const ctl14 = timeline.slice(-14);
  const ctlStart = ctl14[0].ctl;
  const ctlEnd = ctl14[ctl14.length - 1].ctl;
  const ctlDelta = ctlEnd - ctlStart;

  let status = "";
  let suggestion = "";
  let recovery = "";

  // Analyse TSB (fraîcheur)
  if (tsb > 10) {
    status += "🟢 Tu es très frais (TSB > +10)\n";
    suggestion += "➕ Augmente l’intensité ou prévois une compétition.\n";
  } else if (tsb > 5) {
    status += "✅ Tu es dans la zone optimale (TSB entre +5 et +10)\n";
    suggestion += "🎯 Parfait pour performer !\n";
  } else if (tsb > -5) {
    status += "🟡 Tu es en pleine charge (TSB entre -5 et +5)\n";
    suggestion += "✅ Continue à ce rythme, sans excès.\n";
  } else if (tsb > -10) {
    status += "🟠 Fatigue modérée (TSB entre -10 et -5)\n";
    suggestion += "⚠️ Surveille ton état, envisage un jour léger ou repos.\n";
  } else {
    status += "🔴 Risque de surentraînement (TSB < -10)\n";
    suggestion += "🛑 Programme au moins 1 à 2 jours de récupération.\n";
    recovery = "💤 Repos recommandé !\n";
  }

  // Analyse CTL (charge)
  if (ctlDelta > 5) {
    status +=
      "📈 CTL en forte progression (+" + ctlDelta.toFixed(1) + " en 14j)\n";
  } else if (ctlDelta > 1) {
    status += "↗️ CTL en légère hausse (+" + ctlDelta.toFixed(1) + " en 14j)\n";
  } else if (ctlDelta > -1) {
    status += "➡️ CTL stable (~" + ctlNow.toFixed(1) + ")\n";
  } else {
    status += "📉 CTL en baisse (" + ctlDelta.toFixed(1) + " en 14j)\n";
    suggestion += "⚠️ Attention à ne pas trop relâcher l'effort.\n";
  }

  console.log("\n=== 🧠 Analyse de forme ===");
  console.log(status);
  console.log("=== 💡 Conseils ===");
  console.log(suggestion);
  if (recovery) {
    console.log("=== 💤 Récupération recommandée ===");
    console.log(recovery);
  }
}
