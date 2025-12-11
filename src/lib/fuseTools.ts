interface CurvePoint {
  I: number;
  t: number;
}

type CurveData = CurvePoint[] | [number, number][];
type FuseSeries = Record<number, CurveData>;

export function getFuseTime(series: FuseSeries, size: number, Ik: number) {
  const curve = series[size];
  if (!curve) return null;
  if (!Array.isArray(curve) || curve.length < 2) return null;

  // Check if curve uses {I, t} format or [I, t] format
  const isObjectFormat = curve[0] && typeof curve[0] === 'object' && 'I' in curve[0];

  // Convert to normalized format for easier processing
  const normalizedCurve: CurvePoint[] = isObjectFormat
    ? (curve as CurvePoint[]).map((p) => ({ I: p.I, t: p.t }))
    : (curve as [number, number][]).map((p) => ({ I: p[0], t: p[1] }));

  // Assume curve sorted by I ascending
  for (let i = 0; i < normalizedCurve.length - 1; i++) {
    const p1 = normalizedCurve[i];
    const p2 = normalizedCurve[i + 1];
    
    if (Ik === p1.I) return p1.t;
    if (Ik === p2.I) return p2.t;
    
    if (Ik > p1.I && Ik < p2.I) {
      // Linear interpolation in log-log space for better accuracy
      const logIk1 = Math.log10(p1.I);
      const logIk2 = Math.log10(p2.I);
      const logT1 = Math.log10(p1.t);
      const logT2 = Math.log10(p2.t);
      const logIk = Math.log10(Ik);
      
      const ratio = (logIk - logIk1) / (logIk2 - logIk1);
      const logT = logT1 + ratio * (logT2 - logT1);
      return Math.pow(10, logT);
    }
  }

  // If Ik is beyond the last point, extrapolate using the last segment
  const lastIdx = normalizedCurve.length - 1;
  if (Ik > normalizedCurve[lastIdx].I) {
    return normalizedCurve[lastIdx].t;
  }

  // If Ik is below first point, use first point
  if (Ik < normalizedCurve[0].I) {
    return normalizedCurve[0].t;
  }

  return null;
}
