// src/lib/neozed_80a.ts
// NEOZED D01/D02/D03 80 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number;
  t: number;
};

export const NEOZED_80A_POINTS: NeozedPoint[] = [
  { ik: 121.25, t: 3417.7 },
  { ik: 125.08, t: 2545.7 },
  { ik: 128.18, t: 2135.2 },
  { ik: 131.07, t: 1832.9 },
  { ik: 133.53, t: 1361.8 },
  { ik: 137.68, t: 1114.6 },
  { ik: 141.1,  t: 950.3 },
  { ik: 143.53, t: 819.6 },
  { ik: 147.59, t: 641.8 },
  { ik: 150.02, t: 560.8 },
  { ik: 154.37, t: 480.1 },
  { ik: 157.18, t: 439.5 },
  { ik: 160.49, t: 344.72 },
  { ik: 167.52, t: 274.17 },
  { ik: 172.12, t: 235.71 },
  { ik: 175.22, t: 200.12 },
  { ik: 180.68, t: 169.92 },
  { ik: 186.68, t: 143.11 },
  { ik: 190.95, t: 126.41 },
  { ik: 197.27, t: 102.34 },
  { ik: 203.83, t: 82.74 },
  { ik: 212.33, t: 67.72 },
  { ik: 222.09, t: 54.75 },
  { ik: 230.41, t: 45.92 },
  { ik: 236.61, t: 38.991 },
  { ik: 241.17, t: 36.353 },
  { ik: 251.05, t: 29.166 },
  { ik: 258.87, t: 25.589 },
  { ik: 265.29, t: 22.177 },
  { ik: 274.58, t: 20.008 },
  { ik: 283.21, t: 16.253 },
  { ik: 292.03, t: 14.495 },
  { ik: 302.35, t: 12.665 },
  { ik: 312.61, t: 11.012 },
  { ik: 321.46, t: 9.282 },
  { ik: 336.93, t: 7.504 },
  { ik: 346.7,  t: 6.72 },
  { ik: 353.86, t: 5.968 },
  { ik: 365.27, t: 5.463 },
  { ik: 378.54, t: 4.747 },
  { ik: 391.12, t: 4.131 },
  { ik: 399.19, t: 3.8064 },
  { ik: 409.94, t: 3.2854 },
  { ik: 421.3,  t: 3.0065 },
  { ik: 435.85, t: 2.5917 },
  { ik: 448.5,  t: 2.2738 },
  { ik: 464.35, t: 1.9787 },
  { ik: 476.84, t: 1.7937 },
  { ik: 485.92, t: 1.6982 },
  { ik: 500.81, t: 1.4502 },
  { ik: 517.45, t: 1.2517 },
  { ik: 532.46, t: 1.1208 },
  { ik: 546.8,  t: 0.9955 },
  { ik: 560.45, t: 0.9107 },
  { ik: 576.63, t: 0.7757 },
  { ik: 595.79, t: 0.6723 },
  { ik: 623.18, t: 0.5732 },
  { ik: 646.41, t: 0.5012 },
  { ik: 666.64, t: 0.4235 },
  { ik: 683.19, t: 0.3871 },
  { ik: 707.33, t: 0.32869 },
  { ik: 735.95, t: 0.28311 },
  { ik: 755.13, t: 0.24287 },
  { ik: 788.2,  t: 0.21395 },
  { ik: 802.9,  t: 0.19715 },
  { ik: 824.5,  t: 0.17227 },
  { ik: 848.4,  t: 0.15363 },
  { ik: 876.6,  t: 0.13314 },
  { ik: 903.9,  t: 0.11398 },
  { ik: 924.4,  t: 0.09919 },
  { ik: 963,    t: 0.08491 },
  { ik: 999,    t: 0.06893 },
  { ik: 1038.6, t: 0.05877 },
  { ik: 1077.5, t: 0.0499 },
  { ik: 1108.7, t: 0.04203 },
  { ik: 1144,   t: 0.036405 },
  { ik: 1171.6, t: 0.031438 },
  { ik: 1205.6, t: 0.027923 },
  { ik: 1230.5, t: 0.0247 },
  { ik: 1274,   t: 0.021232 },
  { ik: 1302.4, t: 0.020036 },
  { ik: 1338,   t: 0.017095 },
  { ik: 1393.8, t: 0.014575 },
  { ik: 1431.4, t: 0.012998 },
  { ik: 1502.2, t: 0.011317 },
  { ik: 1534.3, t: 0.01017 },
  { ik: 1585.3, t: 0.009033 },
  { ik: 1661.6, t: 0.007925 },
  { ik: 1723.8, t: 0.007039 },
  { ik: 1781.1, t: 0.006459 },
  { ik: 1832.8, t: 0.005856 },
  { ik: 1905.3, t: 0.005265 },
  { ik: 2024.4, t: 0.004561 },
  { ik: 2067.5, t: 0.004187 },
  { ik: 2140.6, t: 0.0038586 },
  { ik: 2220.8, t: 0.0034979 },
  { ik: 2322.9, t: 0.0031194 },
  { ik: 2395.2, t: 0.0029338 },
  { ik: 2491.4, t: 0.0027849 },
  { ik: 2546.5, t: 0.0025116 },
  { ik: 2652.7, t: 0.0023049 },
  { ik: 2763.4, t: 0.0021152 },
  { ik: 2914.1, t: 0.0019096 },
  { ik: 3106,   t: 0.0017003 },
  { ik: 3201.3, t: 0.0015565 },
  { ik: 3355.3, t: 0.0014342 },
  { ik: 3538.3, t: 0.0012948 },
  { ik: 3746.6, t: 0.0011786 },
  { ik: 3922.9, t: 0.0010935 },
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
      const logT  = logT1 + (logT2 - logT1) * ratio;

      return 10 ** logT;
    }
  }

  return null;
}

export function getNeozed80ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_80A_POINTS, ik);
}
