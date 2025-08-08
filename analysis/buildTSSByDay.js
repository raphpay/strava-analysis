import { estimateTSS } from "./estimateTSS.js";

// === 2. Build daily TSS map ===
export default function buildTSSByDay(activities) {
  const map = {};

  for (const act of activities) {
    const date = act.date.split("T")[0];
    const tss = estimateTSS(act.durationMin, act.avgHR);

    map[date] = (map[date] || 0) + tss;
  }

  return map;
}
