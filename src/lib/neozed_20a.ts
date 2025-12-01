// src/lib/neozed_20a.ts
// NEOZED D01/D02/D03 20 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; // kortslutningsstrøm [A]
  t: number;  // udløsningstid [s]
};

export const NEOZED_20A_POINTS: NeozedPoint[] = [
  { ik: 30.661, t: 3420.3 },
  { ik: 31.891, t: 2547.6 },
  { ik: 32.717, t: 1834.3 },
  { ik: 34.046, t: 1261 },
  { ik: 35.827, t: 778.7 },
  { ik: 36.946, t: 584.6 },
  { ik: 38.728, t: 417.6 },
  { ik: 39.604, t: 296.55 },
  { ik: 41.324, t: 218.22 },
  { ik: 42.453, t: 156.71 },
  { ik: 44.669, t: 117.03 },
  { ik: 46.069, t: 84.86 },
  { ik: 48.583, t: 56.85 },
  { ik: 51.522, t: 35.451 },
  { ik: 53.371, t: 26.571 },
  { ik: 56.42,  t: 19.012 },
  { ik: 58.153, t: 13.927 },
  { ik: 61.784, t: 10.196 },
  { ik: 64.408, t: 7.542 },
  { ik: 68.541, t: 5.328 },
  { ik: 72.216, t: 4.018 },
  { ik: 74.008, t: 3.3839 },
  { ik: 77.03,  t: 2.9322 },
  { ik: 81.63,  t: 2.0381 },
  { ik: 87.51,  t: 1.4695 },
  { ik: 93.04,  t: 1.1592 },
  { ik: 98.56,  t: 0.9115 },
  { ik: 103.04, t: 0.7577 },
  { ik: 108.67, t: 0.6075 },
  { ik: 113.68, t: 0.5149 },
  { ik: 119.37, t: 0.4239 },
  { ik: 124.89, t: 0.35797 },
  { ik: 131.54, t: 0.28337 },
  { ik: 137.65, t: 0.24407 },
  { ik: 145.45, t: 0.20219 },
  { ik: 152.54, t: 0.16963 },
  { ik: 162.18, t: 0.13602 },
  { ik: 169.95, t: 0.11421 },
  { ik: 181.1,  t: 0.09037 },
  { ik: 189.42, t: 0.07246 },
  { ik: 202.22, t: 0.05716 },
  { ik: 217.66, t: 0.04509 },
  { ik: 232.03, t: 0.035503 },
  { ik: 245.04, t: 0.028995 },
  { ik: 259.46, t: 0.023441 },
  { ik: 271.11, t: 0.020054 },
  { ik: 288.54, t: 0.015574 },
  { ik: 316.78, t: 0.011327 },
  { ik: 335.64, t: 0.009379 },
  { ik: 356.85, t: 0.007771 },
  { ik: 379.41, t: 0.006491 },
  { ik: 405.32, t: 0.005619 },
  { ik: 423.66, t: 0.004916 },
  { ik: 461.62, t: 0.00414 },
  { ik: 488.79, t: 0.0036618 },
  { ik: 511.91, t: 0.0032571 },
  { ik: 541.36, t: 0.0027956 },
  { ik: 597.13, t: 0.0023352 },
  { ik: 638.22, t: 0.0019887 },
  { ik: 686.12, t: 0.0017254 },
  { ik: 744.55, t: 0.0014892 },
  { ik: 795.7,  t: 0.0013126 },
  { ik: 841.6,  t: 0.0011652 },
  { ik: 873.2,  t: 0.0010737 },
];

// Log-log interpolation
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

// Offentlig funktion som resten af systemet kan bruge
export function getNeozed20ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_20A_POINTS, ik);
}
