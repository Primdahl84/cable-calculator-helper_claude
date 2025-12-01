// src/lib/diazed_d2d3d4_10a.ts
// DIAZED D2/D3/D4 10 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type DiazedPoint = {
  ik: number;
  t: number;
};

export const DIAZED_D2D3D4_10A_POINTS: DiazedPoint[] = [
  { ik: 17.029, t: 3485.2 },
  { ik: 17.4,   t: 2724.3 },
  { ik: 17.659, t: 2317.5 },
  { ik: 18.055, t: 1990.6 },
  { ik: 18.525, t: 1480.1 },
  { ik: 19.009, t: 1169.8 },
  { ik: 19.578, t: 884.7 },
  { ik: 20.238, t: 684 },
  { ik: 20.691, t: 532.8 },
  { ik: 21.231, t: 427.34 },
  { ik: 21.706, t: 355.6 },
  { ik: 22.11,  t: 274.93 },
  { ik: 22.356, t: 237.35 },
  { ik: 23.084, t: 184.16 },
  { ik: 23.626, t: 147.19 },
  { ik: 23.889, t: 118.93 },
  { ik: 24.475, t: 105.19 },
  { ik: 24.969, t: 83.57 },
  { ik: 25.433, t: 71.09 },
  { ik: 26.002, t: 58.73 },
  { ik: 26.486, t: 49.59 },
  { ik: 26.978, t: 42.498 },
  { ik: 27.581, t: 33.344 },
  { ik: 28.198, t: 27.141 },
  { ik: 28.495, t: 23.622 },
  { ik: 29.365, t: 19.641 },
  { ik: 30.132, t: 16.956 },
  { ik: 30.927, t: 13.492 },
  { ik: 31.611, t: 12.003 },
  { ik: 32.198, t: 10.286 },
  { ik: 33.162, t: 8.311 },
  { ik: 34.28,  t: 6.865 },
  { ik: 35.047, t: 5.84 },
  { ik: 35.698, t: 5.042 },
  { ik: 36.362, t: 4.352 },
  { ik: 37.733, t: 3.6517 },
  { ik: 38.571, t: 3.1729 },
  { ik: 39.872, t: 2.6794 },
  { ik: 40.914, t: 2.3473 },
  { ik: 41.923, t: 2.135 },
  { ik: 42.606, t: 1.8282 },
  { ik: 43.399, t: 1.5899 },
  { ik: 44.533, t: 1.4135 },
  { ik: 46.037, t: 1.2194 },
  { ik: 47.587, t: 1.0534 },
  { ik: 49.192, t: 0.9161 },
  { ik: 50.554, t: 0.8394 },
  { ik: 52.18,  t: 0.7294 },
  { ik: 53.741, t: 0.6581 },
  { ik: 55.349, t: 0.5851 },
  { ik: 57.005, t: 0.5279 },
  { ik: 57.498, t: 0.5024 },
  { ik: 59.803, t: 0.436 },
  { ik: 60.467, t: 0.39922 },
  { ik: 63.435, t: 0.35233 },
  { ik: 65.395, t: 0.2937 },
  { ik: 67.536, t: 0.25874 },
  { ik: 70.071, t: 0.22835 },
  { ik: 72.168, t: 0.20152 },
  { ik: 75.252, t: 0.17577 },
  { ik: 77.975, t: 0.15241 },
  { ik: 79.718, t: 0.13451 },
  { ik: 81.802, t: 0.11871 },
  { ik: 85.59,  t: 0.10519 },
  { ik: 90.74,  t: 0.08137 },
  { ik: 93.75,  t: 0.07148 },
  { ik: 96.2,   t: 0.06402 },
  { ik: 100.18, t: 0.05567 },
  { ik: 103.21, t: 0.0487 },
  { ik: 107.45, t: 0.042417 },
  { ik: 111.07, t: 0.036618 },
  { ik: 114.4,  t: 0.033037 },
  { ik: 118.77, t: 0.02847 },
  { ik: 123.15, t: 0.024621 },
  { ik: 127.77, t: 0.020488 },
  { ik: 135.08, t: 0.017038 },
  { ik: 138.05, t: 0.015724 },
  { ik: 143.23, t: 0.013181 },
  { ik: 147.52, t: 0.011892 },
  { ik: 153.63, t: 0.010196 },
  { ik: 157.63, t: 0.008994 },
  { ik: 162.35, t: 0.007996 },
  { ik: 169.07, t: 0.006954 },
  { ik: 176.79, t: 0.006102 },
  { ik: 178.02, t: 0.005496 },
  { ik: 184.02, t: 0.004851 },
  { ik: 189.53, t: 0.0042808 },
  { ik: 193.05, t: 0.0040661 },
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

export function getDiazedD2D3D4_10ATripTime(ik: number): number | null {
  return interpolateDiazed(DIAZED_D2D3D4_10A_POINTS, ik);
}
