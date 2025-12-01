// src/lib/diazed_d2d3d4_4a.ts
// DIAZED D2/D3/D4 4 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type DiazedPoint = {
  ik: number;
  t: number;
};

export const DIAZED_D2D3D4_4A_POINTS: DiazedPoint[] = [
  { ik: 7.4639, t: 3526.1 },
  { ik: 7.5518, t: 2634 },
  { ik: 7.8216, t: 1856 },
  { ik: 7.96,   t: 1487 },
  { ik: 8.1485, t: 1110.7 },
  { ik: 8.2444, t: 859.3 },
  { ik: 8.3904, t: 619.8 },
  { ik: 8.539,  t: 479.4 },
  { ik: 8.69,   t: 366.6 },
  { ik: 8.844,  t: 267.53 },
  { ik: 9.001,  t: 216.84 },
  { ik: 9.322,  t: 156.41 },
  { ik: 9.487,  t: 102.76 },
  { ik: 9.769,  t: 63.69 },
  { ik: 10.0,   t: 45.94 },
  { ik: 10.418, t: 23.348 },
  { ik: 10.479, t: 19.147 },
  { ik: 10.602, t: 14.986 },
  { ik: 10.79,  t: 11.729 },
  { ik: 10.981, t: 9.507 },
  { ik: 11.176, t: 8.074 },
  { ik: 11.307, t: 6.469 },
  { ik: 11.507, t: 5.063 },
  { ik: 11.78,  t: 3.6946 },
  { ik: 11.918, t: 2.9599 },
  { ik: 12.059, t: 2.211 },
  { ik: 12.272, t: 1.6135 },
  { ik: 12.417, t: 1.3544 },
  { ik: 12.563, t: 1.0851 },
  { ik: 12.711, t: 0.9003 },
  { ik: 12.936, t: 0.6804 },
  { ik: 13.165, t: 0.5515 },
  { ik: 13.476, t: 0.41197 },
  { ik: 14.122, t: 0.315 },
  { ik: 14.456, t: 0.26135 },
  { ik: 14.973, t: 0.21939 },
  { ik: 15.508, t: 0.17992 },
  { ik: 16.062, t: 0.14927 },
  { ik: 16.538, t: 0.12531 },
  { ik: 17.433, t: 0.10519 },
  { ik: 18.161, t: 0.08933 },
  { ik: 18.483, t: 0.07587 },
  { ik: 20.06,  t: 0.06295 },
  { ik: 20.899, t: 0.05472 },
  { ik: 22.029, t: 0.04488 },
  { ik: 23.356, t: 0.038561 },
  { ik: 24.908, t: 0.033134 },
  { ik: 26.409, t: 0.028804 },
  { ik: 28.164, t: 0.02475 },
  { ik: 30.036, t: 0.021516 },
  { ik: 32.032, t: 0.018062 },
  { ik: 33.962, t: 0.01552 },
  { ik: 35.589, t: 0.01365 },
  { ik: 37.513, t: 0.011867 },
  { ik: 40.954, t: 0.009961 },
  { ik: 42.916, t: 0.008968 },
  { ik: 44.71,  t: 0.007617 },
  { ik: 49.385, t: 0.006394 },
  { ik: 50.554, t: 0.005961 },
  { ik: 52.36,  t: 0.005182 },
  { ik: 56.168, t: 0.004505 },
  { ik: 58.859, t: 0.0041519 },
];

// Log-log interpolation
function interpolateDiazed(points: DiazedPoint[], ik: number): number | null {
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

// Offentlig funktion
export function getDiazedD2D3D4_4ATripTime(ik: number): number | null {
  return interpolateDiazed(DIAZED_D2D3D4_4A_POINTS, ik);
}
