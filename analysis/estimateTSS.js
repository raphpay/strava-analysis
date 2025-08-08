// === 1. Estimation TSS ===
export function estimateTSS(durationMin, hrAvg) {
  const hrMax = 190;
  const IF = hrAvg ? hrAvg / hrMax : 0.7; // intensité approx
  return durationMin * IF * IF;
}
