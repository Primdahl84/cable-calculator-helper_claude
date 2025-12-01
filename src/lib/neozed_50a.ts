// src/lib/neozed_50a.ts
// NEOZED D01/D02/D03 50 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; 
  t: number;  
};

export const NEOZED_50A_POINTS: NeozedPoint[] = [
  { ik: 74.141, t: 3485.5 },
  { ik: 77.66,  t: 2506.6 },
  { ik: 80.51,  t: 1907.7 },
  { ik: 82.18,  t: 1466.9 },
  { ik: 85.86,  t: 1116.4 },
  { ik: 88.55,  t: 871.8 },
  { ik: 91.16,  t: 701.6 },
  { ik: 95.91,  t: 515.5 },
  { ik: 101.13, t: 376.23 },
  { ik: 104.95, t: 289.5 },
  { ik: 109.37, t: 226.08 },
  { ik: 112.19, t: 201.76 },
  { ik: 116.94, t: 152.83 },
  { ik: 120.92, t: 126.31 },
  { ik: 124.46, t: 111.05 },
  { ik: 129.95, t: 88.52 },
  { ik: 135.07, t: 72.41 },
  { ik: 140.03, t: 61.4 },
  { ik: 144.79, t: 51.54 },
  { ik: 150.49, t: 40.04 },
  { ik: 155.17, t: 35.43 },
  { ik: 160.91, t: 29.093 },
  { ik: 165.1,  t: 25.055 },
  { ik: 171.16, t: 21.578 },
  { ik: 176.66, t: 19.5 },
  { ik: 180.67, t: 16.938 },
  { ik: 187.3,  t: 14.29 },
  { ik: 193.67, t: 12.628 },
  { ik: 201.13, t: 10.732 },
  { ik: 208.15, t: 8.942 },
  { ik: 216.9,  t: 7.466 },
  { ik: 224.28, t: 6.463 },
  { ik: 231.98, t: 5.464 },
  { ik: 237.35, t: 4.819 },
  { ik: 244.16, t: 4.369 },
  { ik: 251.82, t: 3.8612 },
  { ik: 259.72, t: 3.4121 },
  { ik: 267.57, t: 3.0072 },
  { ik: 276.28, t: 2.5308 },
  { ik: 282.75, t: 2.2249 },
  { ik: 293.88, t: 1.9261 },
  { ik: 304.63, t: 1.6986 },
  { ik: 312.61, t: 1.5119 },
  { ik: 325.75, t: 1.2821 },
  { ik: 335.11, t: 1.1213 },
  { ik: 344.73, t: 0.9909 },
  { ik: 355.94, t: 0.8876 },
  { ik: 370.5,  t: 0.7659 },
  { ik: 386.08, t: 0.6362 },
  { ik: 397.16, t: 0.5479 },
  { ik: 405.25, t: 0.4885 },
  { ik: 421.39, t: 0.4257 },
  { ik: 437.98, t: 0.37233 },
  { ik: 452.88, t: 0.32066 },
  { ik: 467.4,  t: 0.27592 },
  { ik: 474.36, t: 0.25041 },
  { ik: 495.58, t: 0.20695 },
  { ik: 511.13, t: 0.18101 },
  { ik: 528.52, t: 0.15508 },
  { ik: 550.74, t: 0.12751 },
  { ik: 578.35, t: 0.09958 },
  { ik: 604.22, t: 0.08187 },
  { ik: 628,    t: 0.06979 },
  { ik: 651.05, t: 0.05827 },
  { ik: 669.75, t: 0.04916 },
  { ik: 694.33, t: 0.04169 },
  { ik: 717.16, t: 0.035481 },
  { ik: 734.78, t: 0.030763 },
  { ik: 759.79, t: 0.025688 },
  { ik: 791.7,  t: 0.022467 },
  { ik: 816.5,  t: 0.019528 },
  { ik: 837.9,  t: 0.016408 },
  { ik: 868.6,  t: 0.013491 },
  { ik: 900.5,  t: 0.011861 },
  { ik: 929.6,  t: 0.010748 },
  { ik: 957.9,  t: 0.00912 },
  { ik: 1000.7, t: 0.007774 },
  { ik: 1034.8, t: 0.006977 },
  { ik: 1070,   t: 0.006326 },
  { ik: 1114.7, t: 0.005616 },
  { ik: 1158.9, t: 0.004864 },
  { ik: 1207.6, t: 0.004211 },
  { ik: 1274.6, t: 0.003702 },
  { ik: 1354.2, t: 0.003341 },
  { ik: 1409.2, t: 0.0030437 },
  { ik: 1476.1, t: 0.0027457 },
  { ik: 1554,   t: 0.0024014 },
  { ik: 1623.6, t: 0.0022114 },
  { ik: 1688.3, t: 0.0020935 },
  { ik: 1749.4, t: 0.0019143 },
  { ik: 1841.8, t: 0.0017358 },
  { ik: 1919.2, t: 0.0015984 },
  { ik: 2020.6, t: 0.0014643 },
  { ik: 2121.9, t: 0.0013485 },
  { ik: 2211.1, t: 0.0012741 },
  { ik: 2304,   t: 0.0011673 },
  { ik: 2432,   t: 0.001086 },
  { ik: 2489,   t: 0.0010422 },
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

export function getNeozed50ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_50A_POINTS, ik);
}
