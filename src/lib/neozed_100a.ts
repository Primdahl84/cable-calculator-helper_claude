// src/lib/neozed_100a.ts
// NEOZED D01/D02/D03 100 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; 
  t: number;  
};

export const NEOZED_100A_POINTS: NeozedPoint[] = [
  { ik: 153.14, t: 3599.4 },
  { ik: 156.27, t: 2961 },
  { ik: 161.46, t: 2483.6 },
  { ik: 165.54, t: 1930.3 },
  { ik: 170.97, t: 1489.8 },
  { ik: 175.93, t: 1199.5 },
  { ik: 179.93, t: 993.8 },
  { ik: 183.65, t: 885.9 },
  { ik: 190.52, t: 685.1 },
  { ik: 194.46, t: 567.6 },
  { ik: 201.1,  t: 475.1 },
  { ik: 206.39, t: 396.1 },
  { ik: 212.31, t: 311.18 },
  { ik: 220.27, t: 249.52 },
  { ik: 225.27, t: 218.03 },
  { ik: 228.96, t: 212.43 },
  { ik: 234.67, t: 169.21 },
  { ik: 244.96, t: 134.03 },
  { ik: 250.73, t: 113.92 },
  { ik: 256.22, t: 100.67 },
  { ik: 263.12, t: 83.07 },
  { ik: 274.09, t: 69.39 },
  { ik: 283.2,  t: 57.73 },
  { ik: 291.42, t: 49.83 },
  { ik: 304.19, t: 40.95 },
  { ik: 312.6,  t: 34.509 },
  { ik: 322.76, t: 28.456 },
  { ik: 331.45, t: 25.171 },
  { ik: 343.17, t: 21.46 },
  { ik: 351.31, t: 18.993 },
  { ik: 359.68, t: 16.251 },
  { ik: 370.87, t: 13.969 },
  { ik: 382.41, t: 12.156 },
  { ik: 390.31, t: 11.156 },
  { ik: 399.98, t: 10.453 },
  { ik: 409.92, t: 8.765 },
  { ik: 427.02, t: 7.292 },
  { ik: 442.11, t: 6.423 },
  { ik: 456.8,  t: 5.522 },
  { ik: 473.91, t: 4.65 },
  { ik: 492.67, t: 3.997 },
  { ik: 511.78, t: 3.4228 },
  { ik: 525.96, t: 2.8703 },
  { ik: 544.55, t: 2.539 },
  { ik: 559.2,  t: 2.2551 },
  { ik: 573.08, t: 2.0359 },
  { ik: 590.28, t: 1.9334 },
  { ik: 605.59, t: 1.6325 },
  { ik: 628.27, t: 1.4382 },
  { ik: 654.47, t: 1.2566 },
  { ik: 681.77, t: 1.0583 },
  { ik: 702.99, t: 0.94 },
  { ik: 717.08, t: 0.8872 },
  { ik: 744.37, t: 0.7507 },
  { ik: 778.6,  t: 0.6559 },
  { ik: 801.2,  t: 0.5755 },
  { ik: 827.1,  t: 0.5011 },
  { ik: 855.3,  t: 0.4322 },
  { ik: 883.7,  t: 0.37612 },
  { ik: 913.1,  t: 0.32864 },
  { ik: 964.9,  t: 0.26461 },
  { ik: 1001,   t: 0.22468 },
  { ik: 1031.1, t: 0.1968 },
  { ik: 1066.5, t: 0.17224 },
  { ik: 1106.4, t: 0.14506 },
  { ik: 1143.2, t: 0.12779 },
  { ik: 1189.3, t: 0.10831 },
  { ik: 1227.9, t: 0.09289 },
  { ik: 1255.9, t: 0.08184 },
  { ik: 1297.6, t: 0.07151 },
  { ik: 1346.2, t: 0.06351 },
  { ik: 1399.5, t: 0.05349 },
  { ik: 1454.9, t: 0.04579 },
  { ik: 1494,   t: 0.03968 },
  { ik: 1521.7, t: 0.036399 },
  { ik: 1582,   t: 0.031691 },
  { ik: 1624.6, t: 0.027691 },
  { ik: 1692.3, t: 0.023609 },
  { ik: 1755.1, t: 0.02056 },
  { ik: 1788.3, t: 0.019087 },
  { ik: 1855.3, t: 0.016141 },
  { ik: 1940.6, t: 0.013705 },
  { ik: 2001,   t: 0.012173 },
  { ik: 2088.7, t: 0.01055 },
  { ik: 2166.9, t: 0.009294 },
  { ik: 2257.3, t: 0.008021 },
  { ik: 2346.6, t: 0.007009 },
  { ik: 2434.6, t: 0.006149 },
  { ik: 2523.8, t: 0.005613 },
  { ik: 2620.4, t: 0.004891 },
  { ik: 2735.2, t: 0.004256 },
  { ik: 2861,   t: 0.0038422 },
  { ik: 2968.1, t: 0.0034547 },
  { ik: 3026.4, t: 0.0032539 },
  { ik: 3110.9, t: 0.0029334 },
  { ik: 3214.3, t: 0.0026701 },
  { ik: 3334.7, t: 0.0024604 },
  { ik: 3459.6, t: 0.0022032 },
  { ik: 3560,   t: 0.0020637 },
  { ik: 3676.5, t: 0.0019868 },
  { ik: 3761.9, t: 0.0018179 },
  { ik: 3894.8, t: 0.0016615 },
  { ik: 3975.2, t: 0.0015949 },
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

export function getNeozed100ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_100A_POINTS, ik);
}
