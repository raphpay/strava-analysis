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

export default async function advancedMetrics(
  activities,
  timeline,
  accessToken,
  userMaxHr = 200
) {
  const results = {
    timeline: timeline,
    tss: timeline.map((d) => d.tss),
    volumeWeekly: null,
    intensityAvg: null,
    zone45Percent: null,
    chargeRecovery: [],
    anaerobic: {
      samples: [],
      avg: null,
    },
  };

  // --- Calcul volume hebdo ---
  const totalDistance = activities.reduce(
    (sum, a) => sum + (a.distance || 0),
    0
  ); // en mètres
  const weeks = Math.max(1, timeline.length / 7);
  results.volumeWeekly = (totalDistance / weeks / 1000).toFixed(1); // en km

  // --- Intensité moyenne ---
  const intensities = activities.map((a) => a.suffer_score || 0);
  results.intensityAvg = (
    intensities.reduce((a, b) => a + b, 0) / intensities.length
  ).toFixed(1);

  // --- Ratio charge/récup ---
  for (const d of [7, 14]) {
    const ratio = computeChargeRecovery(timeline, d);
    results.chargeRecovery.push(ratio);
  }

  // --- Zones 4–5 sur 3 dernières sorties ---
  let totalZone45Time = 0;
  let totalHrTime = 0;
  let collected = 0;

  for (let i = 0; i < activities.length && collected < 3; i++) {
    const act = activities[i];
    if (!act.avgHR) continue;

    const stream = await getHeartRateStream(act.id, accessToken);
    if (stream) {
      const percent = computeAnaerobicPercentage(stream, userMaxHr);
      if (percent != null) {
        results.anaerobic.samples.push({
          activityName: act.name,
          percent,
        });

        // Ajout pour calcul % global
        totalZone45Time += percent;
        totalHrTime += 100; // chaque activité = 100% du temps
        collected++;
      }
    }
  }

  if (results.anaerobic.samples.length > 0) {
    results.anaerobic.avg =
      results.anaerobic.samples.reduce((a, b) => a + b.percent, 0) /
      results.anaerobic.samples.length;
    results.zone45Percent = Number((totalZone45Time / collected).toFixed(1));
  }

  console.log("res", results);

  return results;
}
