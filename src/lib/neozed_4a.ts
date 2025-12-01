// src/lib/neozed_4a.ts
// NEOZED D01/D02/D03 4 A – hårdkodede punkter fra Engauge (Ik [A], t [s])

export type NeozedPoint = {
  ik: number; // kortslutningsstrøm [A]
  t: number;  // udløsningstid [s]
};

export const NEOZED_4A_POINTS: NeozedPoint[] = [
  { ik: 8.061, t: 3422.8 },
  { ik: 8.381, t: 1788.6 },
  { ik: 8.453, t: 1231.3 },
  { ik: 8.699, t: 818.1 },
  { ik: 8.842, t: 561.6 },
  { ik: 9.06,  t: 386.63 },
  { ik: 9.419, t: 202.03 },
  { ik: 9.635, t: 117.8 },
  { ik: 9.834, t: 76.37 },
  { ik: 10.161, t: 46.76 },
  { ik: 10.45,  t: 29.586 },
  { ik: 10.865, t: 15.46 },
  { ik: 11.117, t: 10.216 },
  { ik: 11.44,  t: 6.843 },
  { ik: 11.594, t: 4.807 },
  { ik: 12.054, t: 2.5118 },
  { ik: 12.263, t: 1.6767 },
  { ik: 12.532, t: 1.3125 },
  { ik: 12.568, t: 0.908 },
  { ik: 13.253, t: 0.6601 },
  { ik: 13.806, t: 0.4458 },
  { ik: 15.424, t: 0.20244 },
  { ik: 16.06,  t: 0.16171 },
  { ik: 17.561, t: 0.11142 },
  { ik: 18.154, t: 0.08974 },
  { ik: 19.781, t: 0.06741 },
  { ik: 21.378, t: 0.05188 },
  { ik: 22.36,  t: 0.04406 },
  { ik: 23.975, t: 0.036482 },
  { ik: 26.33,  t: 0.027192 },
  { ik: 28.749, t: 0.021704 },
  { ik: 31.516, t: 0.016511 },
  { ik: 34.924, t: 0.012913 },
  { ik: 37.57,  t: 0.01053 },
  { ik: 41.103, t: 0.008039 },
  { ik: 46.085, t: 0.006606 },
  { ik: 51.883, t: 0.005002 },
  { ik: 55.842, t: 0.004111 },
  { ik: 61.006, t: 0.0036177 },
  { ik: 64.956, t: 0.0030874 },
  { ik: 69.913, t: 0.0026866 },
  { ik: 76.057, t: 0.0022669 },
  { ik: 80,     t: 0.0019689 },
  { ik: 86.46,  t: 0.0016994 },
  { ik: 94.98,  t: 0.0014667 },
  { ik: 103.49, t: 0.0012252 },
  { ik: 110.03, t: 0.0010926 },
  { ik: 111.85, t: 0.0010403 },
];

// Log-log interpolation mellem to punkter
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
export function getNeozed4ATripTime(ik: number): number | null {
  return interpolateNeozed(NEOZED_4A_POINTS, ik);
}
