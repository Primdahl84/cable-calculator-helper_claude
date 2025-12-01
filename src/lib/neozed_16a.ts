// src/lib/neozed_16a.ts
// NEOZED D01/D02/D03 16 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; // kortslutningsstrøm [A]
  t: number;  // udløsningstid [s]
};

export const NEOZED_16A_POINTS: NeozedPoint[] = [
  { ik: 24.594, t: 3420.7 },
  { ik: 25.219, t: 2495.2 },
  { ik: 26.243, t: 1787.5 },
  { ik: 26.62,  t: 1213.1 },
  { ik: 28.002, t: 841.9 },
  { ik: 29.055, t: 586.7 },
  { ik: 29.879, t: 451.5 },
  { ik: 30.749, t: 312.97 },
  { ik: 31.881, t: 235.93 },
  { ik: 32.878, t: 161.86 },
  { ik: 34.462, t: 126.53 },
  { ik: 35.426, t: 92.31 },
  { ik: 36.632, t: 66.04 },
  { ik: 38.271, t: 45.81 },
  { ik: 40.268, t: 32.8 },
  { ik: 41.664, t: 24.69 },
  { ik: 43.528, t: 17.59 },
  { ik: 45.126, t: 12.769 },
  { ik: 46.782, t: 9.325 },
  { ik: 49.001, t: 6.846 },
  { ik: 51.525, t: 5.192 },
  { ik: 53.897, t: 3.7276 },
  { ik: 57.16,  t: 2.7843 },
  { ik: 58.979, t: 2.2499 },
  { ik: 61.935, t: 1.7661 },
  { ik: 64.24,  t: 1.5324 },
  { ik: 65.713, t: 1.27 },
  { ik: 69.007, t: 1.055 },
  { ik: 72.28,  t: 0.863 },
  { ik: 76.098, t: 0.688 },
  { ik: 79.71,  t: 0.5834 },
  { ik: 84.79,  t: 0.4699 },
  { ik: 88.81,  t: 0.4131 },
  { ik: 91.18,  t: 0.3972 },
  { ik: 96.43,  t: 0.30956 },
  { ik: 106.54, t: 0.22436 },
  { ik: 135.8,  t: 0.09762 },
  { ik: 144.45, t: 0.07702 },
  { ik: 151.3,  t: 0.06565 },
  { ik: 158.48, t: 0.05539 },
  { ik: 165.57, t: 0.04673 },
  { ik: 172.97, t: 0.038027 },
  { ik: 182.58, t: 0.031427 },
  { ik: 192.23, t: 0.026514 },
  { ik: 203.81, t: 0.022251 },
  { ik: 213.62, t: 0.018486 },
  { ik: 224.33, t: 0.014966 },
  { ik: 235.07, t: 0.012569 },
  { ik: 242.97, t: 0.0111 },
  { ik: 252.53, t: 0.009413 },
  { ik: 265.87, t: 0.008149 },
  { ik: 278.48, t: 0.007127 },
  { ik: 291.68, t: 0.006396 },
  { ik: 308.67, t: 0.00562 },
  { ik: 321.66, t: 0.004995 },
  { ik: 340.4,  t: 0.004279 },
  { ik: 359.3,  t: 0.0038604 },
  { ik: 379.87, t: 0.0034312 },
  { ik: 390.15, t: 0.0031092 },
  { ik: 418.23, t: 0.0026777 },
  { ik: 447.17, t: 0.002342 },
  { ik: 473.59, t: 0.002095 },
  { ik: 511.93, t: 0.0017927 },
  { ik: 549.42, t: 0.0015508 },
  { ik: 593.52, t: 0.0013356 },
  { ik: 646.56, t: 0.0011529 },
  { ik: 671.57, t: 0.0010646 },
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

// Funktion til resten af programmet
export function getNeozed16ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_16A_POINTS, ik);
}
