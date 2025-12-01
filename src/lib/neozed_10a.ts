// src/lib/neozed_10a.ts
// NEOZED D01/D02/D03 10 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; // kortslutningsstrøm [A]
  t: number;  // udløsningstid [s]
};

export const NEOZED_10A_POINTS: NeozedPoint[] = [
  { ik: 17.328, t: 3421.3 },
  { ik: 18.251, t: 1787.8 },
  { ik: 19.099, t: 1029.7 },
  { ik: 19.793, t: 706.7 },
  { ik: 20.512, t: 501 },
  { ik: 20.915, t: 366.9 },
  { ik: 21.886, t: 268.69 },
  { ik: 22.681, t: 185.6 },
  { ik: 23.353, t: 140.4 },
  { ik: 23.89,  t: 110.43 },
  { ik: 24.838, t: 84.63 },
  { ik: 25.824, t: 60.38 },
  { ik: 27.023, t: 42.81 },
  { ik: 28.005, t: 32.806 },
  { ik: 30.667, t: 17.593 },
  { ik: 32.196, t: 12.392 },
  { ik: 34.021, t: 9.435 },
  { ik: 35.328, t: 7.302 },
  { ik: 37.256, t: 5.329 },
  { ik: 38.809, t: 3.987 },
  { ik: 41.33,  t: 2.858 },
  { ik: 42.984, t: 2.249 },
  { ik: 45.85,  t: 1.573 },
  { ik: 48.59,  t: 1.1787 },
  { ik: 51.529, t: 0.9119 },
  { ik: 54.479, t: 0.7099 },
  { ik: 59.432, t: 0.5151 },
  { ik: 61.584, t: 0.4346 },
  { ik: 74.319, t: 0.195 },
  { ik: 77.1,   t: 0.16157 },
  { ik: 81.64,  t: 0.11841 },
  { ik: 86.8,   t: 0.08331 },
  { ik: 91.91,  t: 0.06206 },
  { ik: 95.36,  t: 0.04977 },
  { ik: 102.48, t: 0.036453 },
  { ik: 105.18, t: 0.030717 },
  { ik: 110.02, t: 0.024631 },
  { ik: 116.68, t: 0.020063 },
  { ik: 121.85, t: 0.016364 },
  { ik: 127.98, t: 0.013782 },
  { ik: 136.33, t: 0.011332 },
  { ik: 142.9,  t: 0.009617 },
  { ik: 156.34, t: 0.006991 },
  { ik: 171.05, t: 0.005381 },
  { ik: 184.86, t: 0.004176 },
  { ik: 203.82, t: 0.0033444 },
  { ik: 215.03, t: 0.002797 },
  { ik: 233.34, t: 0.0022798 },
  { ik: 250.83, t: 0.002042 },
  { ik: 268.11, t: 0.0016983 },
  { ik: 288.57, t: 0.001442 },
  { ik: 312.72, t: 0.0012468 },
  { ik: 332.93, t: 0.0010655 },
];

// Log-log interpolation mellem punkterne
function interpolateNeozed(points: NeozedPoint[], ik: number): number | null {
  if (!points.length || ik <= 0 || !Number.isFinite(ik)) return null;

  const sorted = [...points].sort((a, b) => a.ik - b.ik);

  if (ik <= sorted[0].ik) return sorted[0].t;
  if (ik >= sorted[sorted.length - 1].ik) return sorted[sorted.length - 1].t;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];

    if (ik >= p1.ik && ik <= p2.ik) {
      const logI1 = Math.log10(p1.ik);
      const logI2 = Math.log10(p2.ik);
      const logT1 = Math.log10(p1.t);
      const logT2 = Math.log10(p2.t);
      const logIk = Math.log10(ik);

      if (
        !Number.isFinite(logI1) || !Number.isFinite(logI2) ||
        logI1 === logI2 ||
        !Number.isFinite(logT1) || !Number.isFinite(logT2)
      ) {
        const ratio = (ik - p1.ik) / (p2.ik - p1.ik);
        return p1.t + (p2.t - p1.t) * ratio;
      }

      const ratio = (logIk - logI1) / (logI2 - logI1);
      const logT = logT1 + (logT2 - logT1) * ratio;
      return 10 ** logT;
    }
  }

  return null;
}

// Offentlig funktion til resten af programmet
export function getNeozed10ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_10A_POINTS, ik);
}
