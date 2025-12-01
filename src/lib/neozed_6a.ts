// src/lib/neozed_6a.ts
// NEOZED D01/D02/D03 6 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; // kortslutningsstrøm [A]
  t: number;  // udløsningstid [s]
};

export const NEOZED_6A_POINTS: NeozedPoint[] = [
  { ik: 11.441, t: 3084.6 },
  { ik: 11.531, t: 2182.2 },
  { ik: 11.742, t: 1611.9 },
  { ik: 11.963, t: 1116 },
  { ik: 12.209, t: 799.7 },
  { ik: 12.31,  t: 575.5 },
  { ik: 12.859, t: 417.9 },
  { ik: 12.877, t: 319.39 },
  { ik: 13.37,  t: 224.1 },
  { ik: 13.524, t: 160.7 },
  { ik: 14.082, t: 117.1 },
  { ik: 14.616, t: 82.18 },
  { ik: 15.351, t: 51.99 },
  { ik: 16.033, t: 35.474 },
  { ik: 16.388, t: 26.157 },
  { ik: 17.331, t: 19.024 },
  { ik: 17.93,  t: 14.282 },
  { ik: 18.734, t: 10.202 },
  { ik: 19.616, t: 7.069 },
  { ik: 20.783, t: 5.194 },
  { ik: 21.994, t: 3.4988 },
  { ik: 23.056, t: 2.7856 },
  { ik: 23.77,  t: 2.0901 },
  { ik: 24.863, t: 1.6898 },
  { ik: 25.577, t: 1.4939 },
  { ik: 26.435, t: 1.1135 },
  { ik: 27.648, t: 0.9122 },
  { ik: 29.278, t: 0.6544 },
  { ik: 31.072, t: 0.502 },
  { ik: 32.295, t: 0.4039 },
  { ik: 34.92,  t: 0.27631 },
  { ik: 36.656, t: 0.23163 },
  { ik: 43.519, t: 0.09655 },
  { ik: 45.149, t: 0.07555 },
  { ik: 49.396, t: 0.05229 },
  { ik: 52.518, t: 0.04025 },
  { ik: 56.067, t: 0.030477 },
  { ik: 61.001, t: 0.023453 },
  { ik: 65.484, t: 0.018058 },
  { ik: 72.207, t: 0.013247 },
  { ik: 79.35,  t: 0.00962 },
  { ik: 87.17,  t: 0.007589 },
  { ik: 97.31,  t: 0.005623 },
  { ik: 106.49, t: 0.004423 },
  { ik: 119.75, t: 0.0034334 },
  { ik: 125.4,  t: 0.0028208 },
  { ik: 137.19, t: 0.0023951 },
  { ik: 147.38, t: 0.0020963 },
  { ik: 161.55, t: 0.001685 },
  { ik: 176.02, t: 0.0014783 },
  { ik: 186.14, t: 0.0013136 },
  { ik: 200.61, t: 0.0011194 },
  { ik: 205.58, t: 0.0010658 },
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
export function getNeozed6ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_6A_POINTS, ik);
}
