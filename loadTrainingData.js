import dayjs from "dayjs";
import dotenv from "dotenv";
import fetch from "node-fetch";
import withCache from "./cache/withCache";

dotenv.config();

const TOKENS_FILE = "./cache/tokens.json";
const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

// === 2. Estimation TSS ===
function estimateTSS(durationMin, hrAvg) {
  const hrMax = 190;
  const IF = hrAvg ? hrAvg / hrMax : 0.7; // intensité approx
  return durationMin * IF * IF;
}

// === 3. Load activities from Strava ===
async function fetchActivities(accessToken) {
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

// === 4. Build daily TSS map ===
function buildTSSByDay(activities) {
  const map = {};

  for (const act of activities) {
    // const date = act.start_date_local.split("T")[0];
    const date = act.date.split("T")[0];
    const durationMin = act.elapsed_time / 60;
    const tss = estimateTSS(durationMin, act.average_heartrate);

    map[date] = (map[date] || 0) + tss;
  }

  return map;
}

// === Analyse auto : CTL, TSB, recommandations ===
function analyzeTimeline(timeline) {
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

// === 5. Build full timeline + CTL/ATL/TSB ===
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

async function getHeartRateStream(activityId, accessToken) {
  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=heartrate&key_by_type=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    console.warn(`⚠️ Pas de données cardio pour l'activité ${activityId}`);
    return null;
  }

  const data = await res.json();
  return data.heartrate?.data || null;
}

function computeChargeRecovery(timeline, days) {
  const recent = timeline.slice(-days);

  const chargeDays = recent.filter((d) => d.tss > 50).length;
  const recoveryDays = recent.filter((d) => d.tss < 20).length;

  const ratio = recoveryDays === 0 ? chargeDays : chargeDays / recoveryDays;

  return {
    days,
    chargeDays,
    recoveryDays,
    ratio: Number(ratio.toFixed(2)),
  };
}

function computeAnaerobicPercentage(heartRateArray, userMaxHr) {
  if (!heartRateArray || heartRateArray.length === 0) return null;

  let zone4 = 0;
  let zone5 = 0;
  const total = heartRateArray.length;

  for (const hr of heartRateArray) {
    const percent = (hr / userMaxHr) * 100;
    if (percent >= 90) zone5++;
    else if (percent >= 80) zone4++;
  }

  const anaerobicTime = zone4 + zone5;
  return Number(((anaerobicTime / total) * 100).toFixed(1));
}

async function advancedMetrics(
  activities,
  timeline,
  accessToken,
  userMaxHr = 200
) {
  console.log("\n=== 📈 Analyse approfondie ===");

  // Ratio charge/récup
  for (const d of [7, 14]) {
    const ratio = computeChargeRecovery(timeline, d);
    console.log(
      `🔄 Sur ${d} jours : ${ratio.chargeDays} jours de charge, ${ratio.recoveryDays} de récup (ratio = ${ratio.ratio})`
    );
  }

  // Anaérobie (analyse 3 dernières activités avec HR)
  const hrSamples = [];
  let collected = 0;

  for (let i = 0; i <= activities.length - 1 && collected < 3; i++) {
    const act = activities[i];
    if (!act.has_heartrate) continue;

    const stream = await getHeartRateStream(act.id, accessToken);
    if (stream) {
      const percent = computeAnaerobicPercentage(stream, userMaxHr);
      if (percent != null) {
        console.log(`🔥 ${act.name} : ${percent}% en zone anaérobie`);
        hrSamples.push(percent);
        collected++;
      }
    }
  }

  if (hrSamples.length > 0) {
    const avg = hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length;
    console.log(`📊 Moyenne anaérobie (3 sorties) : ${avg.toFixed(1)}%`);
  } else {
    console.log("❌ Pas assez de données cardiaques disponibles.");
  }
}

// === 6. Main ===
// 👇 Main
(async () => {
  const args = process.argv.slice(2);
  const shouldRefresh = args.includes("--refresh");
  const tokens = await withCache(
    "cache/tokens.json",
    async () => {
      return await getAccessToken();
    },
    shouldRefresh
  );

  const accessToken = tokens["access_token"];

  console.log("📥 Récupération des activités Strava (avec cache)...");
  const activities = await withCache(
    "cache/activities.json",
    async () => {
      return await fetchActivities(accessToken);
    },
    shouldRefresh
  );

  console.log(`📊 ${activities.length} activités récupérées.`);

  const tssMap = buildTSSByDay(activities);
  const timeline = computeLoadTimeline(tssMap);

  // Affiche les 10 derniers jours
  console.table(timeline.slice(-10));

  analyzeTimeline(timeline);

  await advancedMetrics(activities, timeline, accessToken);
})();
