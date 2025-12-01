// src/lib/diazed_d2d3d4_6a.ts
// DIAZED D2/D3/D4 6 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type DiazedPoint = {
  ik: number;
  t: number;
};

export const DIAZED_D2D3D4_6A_POINTS: DiazedPoint[] = [
  { ik: 11.046, t: 3326.3 },
  { ik: 11.176, t: 2727.8 },
  { ik: 11.307, t: 2211 },
  { ik: 11.44,  t: 1856 },
  { ik: 11.643, t: 1370.3 },
  { ik: 11.849, t: 1035.6 },
  { ik: 12.059, t: 664.7 },
  { ik: 12.094, t: 815.3 },
  { ik: 12.489, t: 476.7 },
  { ik: 12.711, t: 353.99 },
  { ik: 12.898, t: 275.44 },
  { ik: 13.165, t: 197.52 },
  { ik: 13.398, t: 148.41 },
  { ik: 13.635, t: 110.21 },
  { ik: 13.836, t: 82.33 },
  { ik: 13.917, t: 71.57 },
  { ik: 14.081, t: 58.35 },
  { ik: 14.33,  t: 47.3 },
  { ik: 14.499, t: 42.582 },
  { ik: 14.627, t: 31.439 },
  { ik: 14.842, t: 23.484 },
  { ik: 15.149, t: 18.167 },
  { ik: 15.327, t: 16.261 },
  { ik: 15.599, t: 12.876 },
  { ik: 15.736, t: 11.661 },
  { ik: 15.875, t: 9.073 },
  { ik: 16.203, t: 7.185 },
  { ik: 16.442, t: 4.946 },
  { ik: 16.587, t: 3.9625 },
  { ik: 16.831, t: 3.2119 },
  { ik: 17.029, t: 2.7598 },
  { ik: 17.331, t: 2.1226 },
  { ik: 17.484, t: 1.7714 },
  { ik: 17.845, t: 1.5399 },
  { ik: 17.95,  t: 1.3703 },
  { ik: 18.429, t: 1.0296 },
  { ik: 18.7,   t: 0.8795 },
  { ik: 19.312, t: 0.657 },
  { ik: 19.943, t: 0.5451 },
  { ik: 20.296, t: 0.5024 },
  { ik: 20.899, t: 0.40482 },
  { ik: 21.394, t: 0.35399 },
  { ik: 21.709, t: 0.32432 },
  { ik: 22.288, t: 0.28693 },
  { ik: 22.616, t: 0.26288 },
  { ik: 23.287, t: 0.22721 },
  { ik: 24.19,  t: 0.19296 },
  { ik: 25.349, t: 0.17171 },
  { ik: 25.798, t: 0.15015 },
  { ik: 26.564, t: 0.13677 },
  { ik: 28.082, t: 0.11481 },
  { ik: 29.17,  t: 0.10276 },
  { ik: 30.389, t: 0.08986 },
  { ik: 31.567, t: 0.07766 },
  { ik: 32.983, t: 0.06992 },
  { ik: 34.362, t: 0.06295 },
  { ik: 36.008, t: 0.05602 },
  { ik: 37.513, t: 0.04985 },
  { ik: 39.196, t: 0.042582 },
  { ik: 40.954, t: 0.039472 },
  { ik: 42.541, t: 0.035124 },
  { ik: 44.972, t: 0.030714 },
  { ik: 47.265, t: 0.027014 },
  { ik: 48.81,  t: 0.02475 },
  { ik: 51.149, t: 0.022024 },
  { ik: 54.072, t: 0.019599 },
  { ik: 56.497, t: 0.01744 },
  { ik: 59.552, t: 0.015886 },
  { ik: 60.962, t: 0.014054 },
  { ik: 63.883, t: 0.012876 },
  { ik: 67.533, t: 0.011458 },
  { ik: 70.976, t: 0.010437 },
  { ik: 73.512, t: 0.009288 },
  { ik: 78.628, t: 0.007934 },
  { ik: 81.675, t: 0.007398 },
  { ik: 85.59,  t: 0.006699 },
  { ik: 89.69,  t: 0.005996 },
  { ik: 94.26,  t: 0.005305 },
  { ik: 98.78,  t: 0.004804 },
  { ik: 103.21, t: 0.0042998 },
  { ik: 105.34, t: 0.0041277 },
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

export function getDiazedD2D3D4_6ATripTime(ik: number): number | null {
  return interpolateDiazed(DIAZED_D2D3D4_6A_POINTS, ik);
}
