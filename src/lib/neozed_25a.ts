// src/lib/neozed_25a.ts
// NEOZED D01/D02/D03 25 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; // kortslutningsstrøm [A]
  t: number;  // udløsningstid [s]
};

export const NEOZED_25A_POINTS: NeozedPoint[] = [
  { ik: 39.23,  t: 3509.8 },
  { ik: 40.655, t: 2724.9 },
  { ik: 41.454, t: 2257.3 },
  { ik: 42.406, t: 1882.2 },
  { ik: 44.089, t: 1325.7 },
  { ik: 45.395, t: 1049.5 },
  { ik: 46.438, t: 863.8 },
  { ik: 48.281, t: 596.7 },
  { ik: 50.197, t: 463.2 },
  { ik: 51.019, t: 343.68 },
  { ik: 53.562, t: 242.07 },
  { ik: 55.508, t: 174.98 },
  { ik: 57.898, t: 129.82 },
  { ik: 59.614, t: 100.13 },
  { ik: 61.98,  t: 78.25 },
  { ik: 63.609, t: 62.35 },
  { ik: 66.134, t: 45.36 },
  { ik: 68.536, t: 34.537 },
  { ik: 70.338, t: 28.06 },
  { ik: 72.421, t: 22.213 },
  { ik: 75.052, t: 18.522 },
  { ik: 77.53,  t: 14.473 },
  { ik: 80.34,  t: 10.807 },
  { ik: 84.62,  t: 7.914 },
  { ik: 87.41,  t: 6.347 },
  { ik: 91.18,  t: 5.19 },
  { ik: 93.57,  t: 4.558 },
  { ik: 96.66,  t: 3.562 },
  { ik: 100.17, t: 3.1487 },
  { ik: 102.47, t: 2.8566 },
  { ik: 106.19, t: 2.4604 },
  { ik: 111.48, t: 2.012 },
  { ik: 115.53, t: 1.7442 },
  { ik: 119.73, t: 1.6135 },
  { ik: 123.27, t: 1.3541 },
  { ik: 128.58, t: 1.1513 },
  { ik: 134.12, t: 1.0243 },
  { ik: 138.09, t: 0.9114 },
  { ik: 141.72, t: 0.8162 },
  { ik: 147.82, t: 0.7075 },
  { ik: 154.69, t: 0.5938 },
  { ik: 161.35, t: 0.5148 },
  { ik: 165.06, t: 0.464 },
  { ik: 171.05, t: 0.3971 },
  { ik: 177.84, t: 0.33759 },
  { ik: 186.1,  t: 0.29077 },
  { ik: 193.48, t: 0.24562 },
  { ik: 202.47, t: 0.21853 },
  { ik: 202.47, t: 0.20347 },
  { ik: 207.46, t: 0.1846 },
  { ik: 213.6,  t: 0.16531 },
  { ik: 218.51, t: 0.14949 },
  { ik: 224.98, t: 0.13387 },
  { ik: 231.64, t: 0.11834 },
  { ik: 239.28, t: 0.10632 },
  { ik: 245.17, t: 0.09835 },
  { ik: 249.99, t: 0.09098 },
  { ik: 258.23, t: 0.07939 },
  { ik: 270.22, t: 0.06577 },
  { ik: 287.39, t: 0.05413 },
  { ik: 298.8,  t: 0.04572 },
  { ik: 311.67, t: 0.038874 },
  { ik: 320.9,  t: 0.035497 },
  { ik: 333.63, t: 0.030376 },
  { ik: 350.26, t: 0.025659 },
  { ik: 361.81, t: 0.022829 },
  { ik: 374.95, t: 0.02005 },
  { ik: 391.1,  t: 0.017047 },
  { ik: 407.94, t: 0.014778 },
  { ik: 422.75, t: 0.013063 },
  { ik: 443.83, t: 0.011623 },
  { ik: 451.08, t: 0.010011 },
  { ik: 472.04, t: 0.008735 },
  { ik: 492.36, t: 0.007874 },
  { ik: 506.94, t: 0.007005 },
  { ik: 527.06, t: 0.006355 },
  { ik: 553.33, t: 0.005618 },
  { ik: 569.72, t: 0.004998 },
  { ik: 590.41, t: 0.004333 },
  { ik: 621.86, t: 0.003957 },
  { ik: 648.63, t: 0.0035896 },
  { ik: 663.53, t: 0.0033423 },
  { ik: 696.6,  t: 0.0029544 },
  { ik: 724.25, t: 0.0026286 },
  { ik: 755.43, t: 0.0023388 },
  { ik: 788.0,  t: 0.002108 },
  { ik: 816.6,  t: 0.0019884 },
  { ik: 851.7,  t: 0.0017691 },
  { ik: 891.3,  t: 0.001574 },
  { ik: 929.7,  t: 0.0014655 },
  { ik: 972.9,  t: 0.0012955 },
  { ik: 1024.7, t: 0.0011753 },
  { ik: 1065.3, t: 0.0010802 },
  { ik: 1086.3, t: 0.0010389 },
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

// Funktion til resten af programmet
export function getNeozed25ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_25A_POINTS, ik);
}
