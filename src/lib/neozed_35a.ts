// src/lib/neozed_35a.ts
// NEOZED D01/D02/D03 35 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; // kortslutningsstrøm [A]
  t: number;  // udløsningstid [s]
};

export const NEOZED_35A_POINTS: NeozedPoint[] = [
  { ik: 52.867, t: 3509.2 },
  { ik: 54.433, t: 2926 },
  { ik: 55.863, t: 2424 },
  { ik: 57.893, t: 1881.9 },
  { ik: 60.386, t: 1387.1 },
  { ik: 61.973, t: 1141.7 },
  { ik: 64.224, t: 863.7 },
  { ik: 66.774, t: 632.5 },
  { ik: 68.307, t: 537.7 },
  { ik: 70.33,  t: 463.2 },
  { ik: 72.414, t: 352.65 },
  { ik: 73.598, t: 290.25 },
  { ik: 77.02,  t: 248.38 },
  { ik: 79.56,  t: 177.23 },
  { ik: 83.52,  t: 136.71 },
  { ik: 85.44,  t: 113.25 },
  { ik: 89.99,  t: 82.94 },
  { ik: 93.26,  t: 65.23 },
  { ik: 96.02,  t: 51.64 },
  { ik: 98.87,  t: 43.62 },
  { ik: 102.46, t: 34.53 },
  { ik: 105.15, t: 27.513 },
  { ik: 110.04, t: 23.24 },
  { ik: 112.56, t: 20.279 },
  { ik: 115.15, t: 19.004 },
  { ik: 118.17, t: 15.744 },
  { ik: 122.86, t: 13.127 },
  { ik: 126.91, t: 11.089 },
  { ik: 129.41, t: 10.192 },
  { ik: 134.11, t: 8.721 },
  { ik: 136.74, t: 7.272 },
  { ik: 142.17, t: 6.064 },
  { ik: 145.43, t: 5.325 },
  { ik: 149.74, t: 4.44 },
  { ik: 154.68, t: 3.7753 },
  { ik: 158.74, t: 3.2729 },
  { ik: 163.45, t: 2.931 },
  { ik: 167.74, t: 2.5409 },
  { ik: 171.59, t: 2.2461 },
  { ik: 177.83, t: 1.9346 },
  { ik: 180.73, t: 1.7897 },
  { ik: 186.09, t: 1.6131 },
  { ik: 189.74, t: 1.4352 },
  { ik: 197.27, t: 1.2524 },
  { ik: 203.78, t: 1.107 },
  { ik: 214.63, t: 0.9112 },
  { ik: 220.27, t: 0.832 },
  { ik: 232,    t: 0.6672 },
  { ik: 241.21, t: 0.586 },
  { ik: 250.78, t: 0.5147 },
  { ik: 257.37, t: 0.4669 },
  { ik: 266.72, t: 0.4022 },
  { ik: 272.62, t: 0.37444 },
  { ik: 280.7,  t: 0.33641 },
  { ik: 287.84, t: 0.30372 },
  { ik: 296.85, t: 0.27331 },
  { ik: 305.89, t: 0.24756 },
  { ik: 316.48, t: 0.22422 },
  { ik: 325.07, t: 0.2021 },
  { ik: 332.53, t: 0.18575 },
  { ik: 344.61, t: 0.1642 },
  { ik: 358.28, t: 0.14143 },
  { ik: 371.29, t: 0.12502 },
  { ik: 379.82, t: 0.11416 },
  { ik: 392.34, t: 0.09833 },
  { ik: 407.91, t: 0.0858 },
  { ik: 424.1,  t: 0.07294 },
  { ik: 442.36, t: 0.06365 },
  { ik: 461.41, t: 0.05239 },
  { ik: 478.17, t: 0.04571 },
  { ik: 498.76, t: 0.037868 },
  { ik: 511.87, t: 0.032829 },
  { ik: 528.55, t: 0.028481 },
  { ik: 553.62, t: 0.023058 },
  { ik: 572.46, t: 0.020376 },
  { ik: 590.38, t: 0.018543 },
  { ik: 613.66, t: 0.015587 },
  { ik: 639.46, t: 0.013355 },
  { ik: 662.92, t: 0.011621 },
  { ik: 689.83, t: 0.010474 },
  { ik: 721.7,  t: 0.008708 },
  { ik: 759.82, t: 0.007385 },
  { ik: 795.9,  t: 0.006295 },
  { ik: 840.1,  t: 0.005338 },
  { ik: 884.4,  t: 0.004645 },
  { ik: 921.6,  t: 0.004083 },
  { ik: 965.3,  t: 0.0035531 },
  { ik: 1018,   t: 0.0031724 },
  { ik: 1061.8, t: 0.0028033 },
  { ik: 1117.9, t: 0.0024519 },
  { ik: 1170.9, t: 0.0021667 },
  { ik: 1252.8, t: 0.001937 },
  { ik: 1284.6, t: 0.0017814 },
  { ik: 1369.9, t: 0.00155 },
  { ik: 1438.6, t: 0.0014274 },
  { ik: 1526.3, t: 0.0012942 },
  { ik: 1582.3, t: 0.0012138 },
  { ik: 1648.9, t: 0.0011496 },
  { ik: 1696.2, t: 0.0010696 },
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

      const ratio = (logIk - logI1) / (logI2 - logI1);
      const logT = logT1 + (logT2 - logT1) * ratio;
      return 10 ** logT;
    }
  }

  return null;
}

// Offentlig funktion
export function getNeozed35ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_35A_POINTS, ik);
}
