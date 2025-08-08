// helper : estimation TSS simple (comme utilisé ailleurs)
function estimateTSS(durationMin, hrAvg, userMaxHr = 190) {
  if (!durationMin) return 0;
  const IF = hrAvg ? hrAvg / userMaxHr : 0.7; // fallback IF
  const tss = durationMin * IF * IF;
  return tss;
}

/**
 * Compute intensity summary for a list of activities.
 * - activities: array of Strava activity objects
 * - opts: { userMaxHr, ftp } (ftp optional)
 *
 * Returns { avgIf, avgPercent, classification, byActivity: [...] }
 */
export function computeIntensity(activities, opts = {}) {
  const { userMaxHr = 190, ftp = null } = opts;

  const byActivity = [];
  let weightedIfSum = 0;
  let weightSum = 0;

  for (const a of activities) {
    // get duration in hours (use movingTime if available)
    const durationSec = a.movingTime ?? a.elapsedTime ?? 0;
    const durationH = durationSec / 3600;
    if (!durationSec || durationSec < 30) {
      // ignore super short activities
      continue;
    }

    let IF = null;

    // 1) If power and FTP available -> IF = avg_power / FTP
    if (a.average_watts && ftp && ftp > 0) {
      IF = a.average_watts / ftp;
    }

    // 2) Else if heart rate available -> IF ~ avgHR / HRmax
    else if (a.avgHR) {
      IF = a.avgHR / userMaxHr;
    }

    // 3) Else fallback: estimate TSS from HR or default IF and deduce IF
    else {
      const durationMin = durationSec / 60;
      const tss = estimateTSS(durationMin, a.avgHR || null, userMaxHr);
      // recall: tss = durationMin * IF^2  => IF^2 = tss / durationMin
      const if2 = durationMin > 0 ? tss / durationMin : 0;
      IF = if2 > 0 ? Math.sqrt(if2) : 0.65; // fallback IF ~0.65
    }

    // sanitize IF
    IF = Math.max(0, IF); // no negatives
    // clamp to reasonable bounds
    IF = Math.min(IF, 2.5);

    byActivity.push({
      id: a.id,
      name: a.name,
      type: a.type,
      durationH: Number(durationH.toFixed(2)),
      IF: Number(IF.toFixed(3)),
      percent: Number((IF * 100).toFixed(1)),
    });

    // weight by duration (hours)
    weightedIfSum += IF * durationH;
    weightSum += durationH;
  }

  // final aggregates
  const avgIf = weightSum > 0 ? weightedIfSum / weightSum : 0;
  const avgPercent = avgIf * 100;

  // classification (simple heuristic)
  let classification = "faible";
  if (avgIf >= 0.9) classification = "très élevée";
  else if (avgIf >= 0.75) classification = "élevée";
  else if (avgIf >= 0.6) classification = "modérée";
  else classification = "faible";

  return {
    avgIf: Number(avgIf.toFixed(3)),
    avgPercent: Number(avgPercent.toFixed(1)),
    classification,
    byActivity,
    weightSumHours: Number(weightSum.toFixed(2)),
  };
}
