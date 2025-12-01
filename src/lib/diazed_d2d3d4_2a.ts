// src/lib/diazed_d2d3d4_2a.ts
// DIAZED D2/D3/D4 2 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type DiazedPoint = {
  ik: number; // kortslutningsstrøm [A]
  t: number;  // udløsningstid [s]
};

export const DIAZED_D2D3D4_2A_POINTS: DiazedPoint[] = [
  { ik: 3.7646, t: 3485.2 },
  { ik: 3.8537, t: 1944.7 },
  { ik: 3.9,    t: 1382.9 },
  { ik: 3.9916, t: 573.7 },
  { ik: 4.1814, t: 320.1 },
  { ik: 4.24,   t: 187.07 },
  { ik: 4.3195, t: 70.74 },
  { ik: 4.4209, t: 49.76 },
  { ik: 4.4622, t: 22.644 },
  { ik: 4.5248, t: 17.964 },
  { ik: 4.567,  t: 14.12 },
  { ik: 4.6526, t: 10.996 },
  { ik: 4.696,  t: 7.248 },
  { ik: 4.7571, t: 4.832 },
  { ik: 4.7619, t: 5.697 },
  { ik: 4.784,  t: 3.2382 },
  { ik: 4.8512, t: 2.2151 },
  { ik: 4.8697, t: 2.6961 },
  { ik: 4.9421, t: 1.6623 },
  { ik: 4.9651, t: 1.1584 },
  { ik: 5.0817, t: 0.7025 },
  { ik: 5.1054, t: 0.9105 },
  { ik: 5.1631, t: 0.5645 },
  { ik: 5.5385, t: 0.32244 },
  { ik: 5.7072, t: 0.2513 },
  { ik: 6.082,  t: 0.20218 },
  { ik: 6.4097, t: 0.16566 },
  { ik: 6.6832, t: 0.14551 },
  { ik: 7.0811, t: 0.121 },
  { ik: 7.4364, t: 0.1014 },
  { ik: 8.1485, t: 0.08329 },
  { ik: 8.789,  t: 0.06872 },
  { ik: 9.942,  t: 0.05346 },
  { ik: 10.732, t: 0.04406 },
  { ik: 11.988, t: 0.035124 },
  { ik: 12.862, t: 0.029861 },
  { ik: 13.536, t: 0.025988 },
  { ik: 14.456, t: 0.022544 },
  { ik: 15.487, t: 0.019323 },
  { ik: 16.682, t: 0.016205 },
  { ik: 17.638, t: 0.01447 },
  { ik: 18.476, t: 0.01262 },
  { ik: 20.296, t: 0.010437 },
  { ik: 21.635, t: 0.008958 },
  { ik: 23.196, t: 0.007513 },
  { ik: 24.763, t: 0.006699 },
  { ik: 27.416, t: 0.005187 },
  { ik: 29.861, t: 0.004401 },
  { ik: 30.364, t: 0.0041533 },
];

// Log-log interpolation mellem punkterne
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
      const logT = logT1 + (logT2 - logT1) * ratio;

      return 10 ** logT;
    }
  }

  return null;
}

// Offentlig funktion til resten af programmet
export function getDiazedD2D3D4_2ATripTime(ik: number): number | null {
  return interpolateDiazed(DIAZED_D2D3D4_2A_POINTS, ik);
}
