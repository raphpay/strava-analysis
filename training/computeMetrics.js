export function computeMetrics(analysis) {
  // Exemple : extraire les valeurs clés utiles au plan
  const totalTSS7 = analysis.tss.slice(-7).reduce((a, b) => a + b, 0);
  const totalTSS14 = analysis.tss.slice(-14).reduce((a, b) => a + b, 0);

  return {
    ctl: analysis.timeline.at(-1)?.ctl || 0, // charge chronique
    atl: analysis.timeline.at(-1)?.atl || 0, // charge aiguë
    tsb: analysis.timeline.at(-1)?.tsb || 0, // balance de stress
    tss7: totalTSS7,
    tss14: totalTSS14,
    volumeSemHebdo: analysis.volumeWeekly || 0,
    intensiteMoyenne: analysis.intensityAvg || 0,
    zone45: analysis.zone45Percent || 0, // % temps en zone 4-5
  };
}
