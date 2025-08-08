import dayjs from "dayjs";

// === Build full timeline + CTL/ATL/TSB ===
export default function computeLoadTimeline(tssMap) {
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
