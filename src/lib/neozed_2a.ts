// src/lib/neozed_2a.ts
// NEOZED D01/D02/D03 2 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; // kortslutningsstrøm [A]
  t: number;  // udløsningstid [s]
};

export const NEOZED_2A_POINTS: NeozedPoint[] = [
  { ik: 4.0535, t: 3086.3 },
  { ik: 4.1602, t: 1612.8 },
  { ik: 4.2145, t: 1173.4 },
  { ik: 4.2696, t: 721.2 },
  { ik: 4.3536, t: 508 },
  { ik: 4.3819, t: 376.87 },
  { ik: 4.4105, t: 256.98 },
  { ik: 4.5559, t: 196.94 },
  { ik: 4.5856, t: 149.95 },
  { ik: 4.6909, t: 100.92 },
  { ik: 4.8143, t: 60.05 },
  { ik: 4.8773, t: 36.668 },
  { ik: 4.9893, t: 23.28 },
  { ik: 5.1205, t: 15.467 },
  { ik: 5.3933, t: 7.624 },
  { ik: 5.5352, t: 4.685 },
  { ik: 5.5894, t: 3.387 },
  { ik: 5.755,  t: 2.4484 },
  { ik: 5.8491, t: 1.6479 },
  { ik: 6.221,  t: 0.8229 },
  { ik: 6.7246, t: 0.4413 },
  { ik: 6.9238, t: 0.3009 },
  { ik: 7.269,  t: 0.23666 },
  { ik: 8.411,  t: 0.09789 },
  { ik: 8.888,  t: 0.078 },
  { ik: 9.86,   t: 0.05824 },
  { ik: 10.589, t: 0.04732 },
  { ik: 11.596, t: 0.037457 },
  { ik: 12.781, t: 0.02815 },
  { ik: 14.086, t: 0.022284 },
  { ik: 15.678, t: 0.017077 },
  { ik: 17.336, t: 0.013606 },
  { ik: 18.8,   t: 0.010911 },
  { ik: 21.128, t: 0.00875 },
  { ik: 23.667, t: 0.006793 },
  { ik: 26.255, t: 0.005483 },
  { ik: 29.506, t: 0.004257 },
  { ik: 33.16,  t: 0.0034358 },
  { ik: 37.387, t: 0.0027022 },
  { ik: 41.881, t: 0.0022096 },
  { ik: 46.612, t: 0.0017378 },
  { ik: 52.214, t: 0.001421 },
  { ik: 59.254, t: 0.0010889 },
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

// Funktion du kan bruge i resten af programmet
export function getNeozed2ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_2A_POINTS, ik);
}
