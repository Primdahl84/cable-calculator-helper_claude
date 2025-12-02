// Sikringskurver og opslag – portet fra Python fuse_curves.py
// Bruges til termisk kontrol (k²S² vs. I²·t) og udløsningstid

// Import DIAZED D2/D3/D4 kurver
import { DIAZED_D2D3D4_2A_POINTS } from './diazed_d2d3d4_2a';
import { DIAZED_D2D3D4_4A_POINTS } from './diazed_d2d3d4_4a';
import { DIAZED_D2D3D4_6A_POINTS } from './diazed_d2d3d4_6a';
import { DIAZED_D2D3D4_10A_POINTS } from './diazed_d2d3d4_10a';
import { DIAZED_D2D3D4_16A_POINTS } from './diazed_d2d3d4_16a';
import { DIAZED_D2D3D4_20A_POINTS } from './diazed_d2d3d4_20a';
import { DIAZED_D2D3D4_25A_POINTS } from './diazed_d2d3d4_25a';
import { DIAZED_D2D3D4_35A_POINTS } from './diazed_d2d3d4_35a';
import { DIAZED_D2D3D4_50A_POINTS } from './diazed_d2d3d4_50a';
import { DIAZED_D2D3D4_63A_POINTS } from './diazed_d2d3d4_63a';
import { DIAZED_D2D3D4_80A_POINTS } from './diazed_d2d3d4_80a';
import { DIAZED_D2D3D4_100A_POINTS } from './diazed_d2d3d4_100a';

export type CurvePoint = [number, number];

type FuseCurves = Record<number, CurvePoint[]>;

interface FuseDbEntry {
  IminFactor: number;
  curves: FuseCurves;
}

// ================================================================
// DIAZED gG – 60 punkter (fælles normeret form for DII/DIII/DIV)
// ================================================================

export const DIAZED_CURVE_60: CurvePoint[] = [
  [3.0, 1.50], [3.1346, 1.33], [3.27, 1.17],
  [3.414, 1.04], [3.565, 0.93], [3.723, 0.835],
  [3.888, 0.75], [4.059, 0.67], [4.238, 0.60],
  [4.424, 0.54], [4.617, 0.49], [4.818, 0.445],
  [5.027, 0.405], [5.244, 0.37], [5.47, 0.335],
  [5.704, 0.305], [5.947, 0.28], [6.2, 0.255],
  [6.462, 0.235], [6.734, 0.215], [7.017, 0.20],
  [7.31, 0.185], [7.614, 0.17], [7.93, 0.158],
  [8.258, 0.146], [8.598, 0.135], [8.951, 0.125],
  [9.318, 0.116], [9.698, 0.108], [10.093, 0.10],
  [10.504, 0.094], [10.93, 0.088], [11.372, 0.082],
  [11.831, 0.077], [12.307, 0.072], [12.801, 0.068],
  [13.314, 0.064], [13.846, 0.060], [14.398, 0.057],
  [14.97, 0.054], [15.563, 0.051], [16.178, 0.048],
  [16.815, 0.0455], [17.475, 0.043], [18.159, 0.0405],
  [18.868, 0.0385], [19.602, 0.0365], [20.363, 0.0345],
  [21.151, 0.033], [21.967, 0.0315], [22.812, 0.030],
  [23.687, 0.0285], [24.592, 0.027], [25.529, 0.026],
  [26.498, 0.025], [27.501, 0.024], [28.539, 0.023],
  [29.612, 0.022], [30.722, 0.021], [31.87, 0.020],
];

export const DIAZED_SIZES = [
  2, 4, 6, 10, 13, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100,
];

export const DIAZED_CURVES: FuseCurves = Object.fromEntries(
  DIAZED_SIZES.map((In) => [In, DIAZED_CURVE_60])
);

// ================================================================
// DIAZED D2/D3/D4 – præcise kurver fra Engauge-udtræk
// ================================================================

// DIAZED D2/D3/D4 kurver bruger absolutte Ik-værdier (ikke multiplier)
// Vi beholder dem som absolutte værdier for korrekt interpolation
function convertDiazedPointsToAbsolute(points: { ik: number; t: number }[]): CurvePoint[] {
  return points.map(p => [p.ik, p.t]);
}

export const DIAZED_D2D3D4_SIZES = [2, 4, 6, 10, 13, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100];

// Bemærk: Disse kurver bruger absolutte Ik-værdier (ikke m = Ik/In)
// For størrelser uden præcis kurve (13, 32, 40) bruges nærmeste kurve
export const DIAZED_D2D3D4_CURVES: FuseCurves = {
  2: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_2A_POINTS),
  4: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_4A_POINTS),
  6: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_6A_POINTS),
  10: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_10A_POINTS),
  13: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_10A_POINTS), // Bruger 10A kurve
  16: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_16A_POINTS),
  20: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_20A_POINTS),
  25: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_25A_POINTS),
  32: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_35A_POINTS), // Bruger 35A kurve
  35: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_35A_POINTS),
  40: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_35A_POINTS), // Bruger 35A kurve
  50: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_50A_POINTS),
  63: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_63A_POINTS),
  80: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_80A_POINTS),
  100: convertDiazedPointsToAbsolute(DIAZED_D2D3D4_100A_POINTS),
};

// ================================================================
// NEOZED gG – præcise kurver fra CSV data (DO1/DO2/DO3 2…100 A)
// ================================================================

import {
  NEOZED_35A_POINTS,
  NEOZED_2A_POINTS,
  NEOZED_4A_POINTS,
  NEOZED_6A_POINTS,
  NEOZED_10A_POINTS,
  NEOZED_16A_POINTS,
  NEOZED_20A_POINTS,
  NEOZED_25A_POINTS,
  NEOZED_50A_POINTS,
  NEOZED_63A_POINTS,
  NEOZED_80A_POINTS,
  NEOZED_100A_POINTS,
} from './neozedData';

export const NEOZED_SIZES = [2, 4, 6, 10, 16, 20, 25, 35, 50, 63, 80, 100];

// Fallback curve for sizes without data yet
const FALLBACK_CURVE: CurvePoint[] = [[3.0, 10.0], [10.0, 1.0], [40.0, 0.029]];

export const NEOZED_CURVES: FuseCurves = {
  2: NEOZED_2A_POINTS.length > 0 ? NEOZED_2A_POINTS : FALLBACK_CURVE,
  4: NEOZED_4A_POINTS.length > 0 ? NEOZED_4A_POINTS : FALLBACK_CURVE,
  6: NEOZED_6A_POINTS.length > 0 ? NEOZED_6A_POINTS : FALLBACK_CURVE,
  10: NEOZED_10A_POINTS.length > 0 ? NEOZED_10A_POINTS : FALLBACK_CURVE,
  16: NEOZED_16A_POINTS.length > 0 ? NEOZED_16A_POINTS : FALLBACK_CURVE,
  20: NEOZED_20A_POINTS.length > 0 ? NEOZED_20A_POINTS : FALLBACK_CURVE,
  25: NEOZED_25A_POINTS.length > 0 ? NEOZED_25A_POINTS : FALLBACK_CURVE,
  35: NEOZED_35A_POINTS,
  50: NEOZED_50A_POINTS.length > 0 ? NEOZED_50A_POINTS : FALLBACK_CURVE,
  63: NEOZED_63A_POINTS.length > 0 ? NEOZED_63A_POINTS : FALLBACK_CURVE,
  80: NEOZED_80A_POINTS.length > 0 ? NEOZED_80A_POINTS : FALLBACK_CURVE,
  100: NEOZED_100A_POINTS.length > 0 ? NEOZED_100A_POINTS : FALLBACK_CURVE,
};

// Export individual curves for reference
export const NEOZED_2A_CURVE = NEOZED_CURVES[2];
export const NEOZED_4A_CURVE = NEOZED_CURVES[4];
export const NEOZED_6A_CURVE = NEOZED_CURVES[6];
export const NEOZED_10A_CURVE = NEOZED_CURVES[10];
export const NEOZED_16A_CURVE = NEOZED_CURVES[16];
export const NEOZED_20A_CURVE = NEOZED_CURVES[20];
export const NEOZED_25A_CURVE = NEOZED_CURVES[25];
export const NEOZED_35A_CURVE = NEOZED_CURVES[35];
export const NEOZED_50A_CURVE = NEOZED_CURVES[50];
export const NEOZED_63A_CURVE = NEOZED_CURVES[63];
export const NEOZED_80A_CURVE = NEOZED_CURVES[80];
export const NEOZED_100A_CURVE = NEOZED_CURVES[100];

// ================================================================
// KNIVSIKRING gG – præcise kurver fra Engauge-udtræk
// ================================================================

import { NH00 } from './nh00';
import { NH0 } from './nh0';
import { NH1 } from './nh1';

// NH00, NH0 og NH1 kurver bruger absolutte Ik-værdier (ikke multiplier)
function convertKnivPointsToAbsolute(points: { I: number; t: number }[]): CurvePoint[] {
  return points.map(p => [p.I, p.t]);
}

// NH00 størrelser (2A-160A)
export const NH00_SIZES = [
  2, 4, 6, 10, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160,
];

export const NH00_CURVES: FuseCurves = {
  2: convertKnivPointsToAbsolute(NH00[2]),
  4: convertKnivPointsToAbsolute(NH00[4]),
  6: convertKnivPointsToAbsolute(NH00[6]),
  10: convertKnivPointsToAbsolute(NH00[10]),
  16: convertKnivPointsToAbsolute(NH00[16]),
  20: convertKnivPointsToAbsolute(NH00[20]),
  25: convertKnivPointsToAbsolute(NH00[25]),
  32: convertKnivPointsToAbsolute(NH00[32]),
  35: convertKnivPointsToAbsolute(NH00[35]),
  40: convertKnivPointsToAbsolute(NH00[40]),
  50: convertKnivPointsToAbsolute(NH00[50]),
  63: convertKnivPointsToAbsolute(NH00[63]),
  80: convertKnivPointsToAbsolute(NH00[80]),
  100: convertKnivPointsToAbsolute(NH00[100]),
  125: convertKnivPointsToAbsolute(NH00[125]),
  160: convertKnivPointsToAbsolute(NH00[160]),
};

// NH0 størrelser (6A-160A)
export const NH0_SIZES = [
  6, 10, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160,
];

export const NH0_CURVES: FuseCurves = {
  6: convertKnivPointsToAbsolute(NH0[6]),
  10: convertKnivPointsToAbsolute(NH0[10]),
  16: convertKnivPointsToAbsolute(NH0[16]),
  20: convertKnivPointsToAbsolute(NH0[20]),
  25: convertKnivPointsToAbsolute(NH0[25]),
  32: convertKnivPointsToAbsolute(NH0[32]),
  35: convertKnivPointsToAbsolute(NH0[35]),
  40: convertKnivPointsToAbsolute(NH0[40]),
  50: convertKnivPointsToAbsolute(NH0[50]),
  63: convertKnivPointsToAbsolute(NH0[63]),
  80: convertKnivPointsToAbsolute(NH0[80]),
  100: convertKnivPointsToAbsolute(NH0[100]),
  125: convertKnivPointsToAbsolute(NH0[125]),
  160: convertKnivPointsToAbsolute(NH0[160]),
};

// NH1 størrelser (16A-250A)
export const NH1_SIZES = [
  16, 20, 25, 35, 40, 50, 63, 80, 100, 125, 160, 200, 224, 250,
];

export const NH1_CURVES: FuseCurves = {
  16: convertKnivPointsToAbsolute(NH1[16]),
  20: convertKnivPointsToAbsolute(NH1[20]),
  25: convertKnivPointsToAbsolute(NH1[25]),
  35: convertKnivPointsToAbsolute(NH1[35]),
  40: convertKnivPointsToAbsolute(NH1[40]),
  50: convertKnivPointsToAbsolute(NH1[50]),
  63: convertKnivPointsToAbsolute(NH1[63]),
  80: convertKnivPointsToAbsolute(NH1[80]),
  100: convertKnivPointsToAbsolute(NH1[100]),
  125: convertKnivPointsToAbsolute(NH1[125]),
  160: convertKnivPointsToAbsolute(NH1[160]),
  200: convertKnivPointsToAbsolute(NH1[200]),
  224: convertKnivPointsToAbsolute(NH1[224]),
  250: convertKnivPointsToAbsolute(NH1[250]),
};

// Legacy support: KNIV_CURVES points to NH00 for backward compatibility
export const KNIV_SIZES = NH00_SIZES;
export const KNIV_CURVES = NH00_CURVES;

// ================================================================
// MCB B og C – analytiske modeller (genererer 60 punkter)
// ================================================================

function mcbBTime(m: number): number {
  if (m <= 1.45) return 3600.0;
  if (m <= 2.55) {
    const p = 7.2526632648363;
    return 3600.0 * (1.45 / m) ** p;
  }
  if (m <= 3.0) {
    // Termisk zone
    const q = 4.74143567257599;
    return 60.0 * (2.55 / m) ** q;
  }
  // MCB B: Magnetisk udløsning ved 3-5× In (øjeblikkelig)
  // Return meget kort tid for simulering af magnetisk udløsning
  return 0.01; // 10 millisekunder
}

function mcbCTime(m: number): number {
  if (m <= 1.45) return 3600.0;
  if (m <= 2.55) {
    const p = 7.2526632648363;
    return 3600.0 * (1.45 / m) ** p;
  }
  if (m <= 5.0) {
    // Termisk zone
    const q = 4.54785634237691;
    return 60.0 * (2.55 / m) ** q;
  }
  // MCB C: Magnetisk udløsning ved 5-10× In (øjeblikkelig)
  // Return meget kort tid for simulering af magnetisk udløsning
  return 0.01; // 10 millisekunder
}

function mcbDTime(m: number): number {
  if (m <= 1.45) return 3600.0;
  if (m <= 2.55) {
    const p = 7.2526632648363;
    return 3600.0 * (1.45 / m) ** p;
  }
  if (m <= 10.0) {
    // Termisk zone
    const q = 4.3;
    return 60.0 * (2.8 / m) ** q;
  }
  // MCB D: Magnetisk udløsning ved 10-20× In (øjeblikkelig)
  // Return meget kort tid for simulering af magnetisk udløsning
  return 0.01; // 10 millisekunder
}

function generateMcbCurve(kind: "B" | "C" | "D", nPoints = 60): CurvePoint[] {
  const mMin = 1.45;
  const mMax = kind === "B" ? 20.0 : kind === "C" ? 30.0 : 40.0;
  const timeFn = kind === "B" ? mcbBTime : kind === "C" ? mcbCTime : mcbDTime;

  const logMin = Math.log10(mMin);
  const logMax = Math.log10(mMax);

  const points: CurvePoint[] = [];
  for (let i = 0; i < nPoints; i++) {
    const logM = logMin + ((logMax - logMin) * i) / (nPoints - 1);
    const m = 10 ** logM;
    const t = timeFn(m);
    points.push([Number(m.toFixed(4)), Number(t.toFixed(4))]);
  }
  return points;
}

export const MCB_SIZES = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];

export const MCB_B_CURVE_60 = generateMcbCurve("B", 60);
export const MCB_C_CURVE_60 = generateMcbCurve("C", 60);
export const MCB_D_CURVE_60 = generateMcbCurve("D", 60);

export const MCB_B_CURVES: FuseCurves = Object.fromEntries(
  MCB_SIZES.map((In) => [In, MCB_B_CURVE_60])
);

export const MCB_C_CURVES: FuseCurves = Object.fromEntries(
  MCB_SIZES.map((In) => [In, MCB_C_CURVE_60])
);

export const MCB_D_CURVES: FuseCurves = Object.fromEntries(
  MCB_SIZES.map((In) => [In, MCB_D_CURVE_60])
);

// ================================================================
// Samlet database (producer-uafhængig: "Standard")
// ================================================================

const FUSE_DB: Record<string, FuseDbEntry> = {
  "Standard|Diazed gG": {
    IminFactor: 5.0,
    curves: DIAZED_D2D3D4_CURVES, // Bruger præcise D2/D3/D4 målinger
  },
  "Standard|Diazed D2/D3/D4": {
    IminFactor: 5.0,
    curves: DIAZED_D2D3D4_CURVES, // Same as Diazed gG
  },
  "Standard|Neozed gG": {
    IminFactor: 5.0,
    curves: NEOZED_CURVES,
  },
  "Standard|Knivsikring NH00": {
    IminFactor: 5.0,
    curves: NH00_CURVES,
  },
  "Standard|Knivsikring NH0": {
    IminFactor: 5.0,
    curves: NH0_CURVES,
  },
  "Standard|Knivsikring NH1": {
    IminFactor: 5.0,
    curves: NH1_CURVES,
  },
  // Legacy support for old "Knivsikring gG" (defaults to NH00)
  "Standard|Knivsikring gG": {
    IminFactor: 5.0,
    curves: NH00_CURVES,
  },
  "Standard|MCB B": {
    IminFactor: 5.0,
    curves: MCB_B_CURVES,
  },
  "Standard|MCB C": {
    IminFactor: 10.0,
    curves: MCB_C_CURVES,
  },
  "Standard|MCB D": {
    IminFactor: 20.0,
    curves: MCB_D_CURVES,
  },
};

function fuseKey(manu: string, type: string): string {
  return `${manu}|${type}`;
}

// Auto-select MCB type based on absolute Ik,min value (Danish/European standard)
export function autoSelectMcbType(installMethod: string, In: number, IkMin?: number): "MCB B" | "MCB C" | "MCB D" {
  // MCB type selection based on absolute Ik,min thresholds:
  // MCB B: 50A < Ik,min ≤ 100A
  // MCB C: 100A < Ik,min ≤ 200A
  // MCB D: Ik,min > 200A
  
  if (IkMin !== undefined && IkMin > 0) {
    // Use absolute Ik,min thresholds
    if (IkMin > 200) {
      return "MCB D";
    }
    
    if (IkMin > 100) {
      return "MCB C";
    }
    
    if (IkMin > 50) {
      return "MCB B";
    }
    
    // If Ik,min ≤ 50A, default to MCB B (but this is very low)
    return "MCB B";
  }
  
  // Fallback heuristic if no Ik,min available
  if (In > 63) {
    return "MCB D";
  }
  
  const isAirInstall = installMethod && (
    installMethod.startsWith("A") || 
    installMethod.startsWith("B") || 
    installMethod === "C"
  );
  
  if (In <= 16 && isAirInstall) {
    return "MCB B";
  }
  
  return "MCB C";
}

// Check if a fuse type exists and get available sizes
export function getAvailableFuseSizes(
  manufacturer: string,
  fuseType: string,
): number[] {
  const key = fuseKey(manufacturer, fuseType);
  const entry = FUSE_DB[key];
  if (!entry) {
    return [];
  }
  return Object.keys(entry.curves)
    .map((k) => Number(k))
    .sort((a, b) => a - b);
}

// Check if a specific fuse size is available for a fuse type
export function isFuseSizeAvailable(
  manufacturer: string,
  fuseType: string,
  In: number,
): boolean {
  const sizes = getAvailableFuseSizes(manufacturer, fuseType);
  const InInt = Math.round(In);
  return sizes.includes(InInt);
}

export function getFuseData(
  manufacturer: string,
  fuseType: string,
  In: number,
): { curvePoints: CurvePoint[]; InCurve: number; IminFactor: number } {
  const key = fuseKey(manufacturer, fuseType);
  const entry = FUSE_DB[key];
  if (!entry) {
    throw new Error(`Ukendt sikringsdata for ${manufacturer} / ${fuseType}`);
  }

  const InInt = Math.round(In);
  const curveSizes = Object.keys(entry.curves).map((k) => Number(k));
  const nearest = curveSizes.reduce((best, current) =>
    Math.abs(current - InInt) < Math.abs(best - InInt) ? current : best,
  curveSizes[0]);

  return {
    curvePoints: entry.curves[nearest],
    InCurve: nearest,
    IminFactor: entry.IminFactor ?? 5.0,
  };
}

// ================================================================
// Udløsningstid ud fra kurvepunkter (log–log interpolation)
// ================================================================

export function fuseTripTimeExplain(
  InCurve: number,
  Ik: number,
  curvePoints: CurvePoint[],
  useAbsoluteIk: boolean = false, // For NEOZED data where curve points are (Ik_absolute, time)
): { time: number; explanation: string } {
  const lines: string[] = [];

  if (InCurve <= 0) {
    lines.push("Ugyldig In for sikring (≤ 0).");
    return { time: 0.0, explanation: lines.join("\n") };
  }
  if (Ik <= 0) {
    lines.push("Ik ≤ 0 A – ingen udkobling.");
    return { time: 0.0, explanation: lines.join("\n") };
  }
  if (!curvePoints || curvePoints.length === 0) {
    lines.push("FEJL: Ingen kurvepunkter tilgængelige for denne sikring.");
    console.error('No curve points available!', { InCurve, Ik, useAbsoluteIk });
    return { time: 0.0, explanation: lines.join("\n") };
  }

  const pts = [...curvePoints].sort((a, b) => a[0] - b[0]);

  // For NEOZED: curve points are (Ik_absolute, time), so we interpolate directly on Ik
  if (useAbsoluteIk) {
    lines.push(`Ik = ${Ik.toFixed(1)} A, In,kurve = ${InCurve.toFixed(1)} A`);
    
    // Check bounds
    if (Ik <= pts[0][0]) {
      const t = pts[0][1];
      lines.push(`Ik ligger under første punkt (${pts[0][0].toFixed(1)} A) – bruger første punkt.`);
      lines.push(`t ≈ ${t.toFixed(3)} s`);
      return { time: t, explanation: lines.join("\n") };
    }

    if (Ik >= pts[pts.length - 1][0]) {
      const t = pts[pts.length - 1][1];
      lines.push(`Ik ligger over sidste punkt (${pts[pts.length - 1][0].toFixed(1)} A) – bruger sidste punkt.`);
      lines.push(`t ≈ ${t.toFixed(3)} s`);
      return { time: t, explanation: lines.join("\n") };
    }

    // Log-log interpolation on (Ik, time) pairs - required for accurate fuse curves
    for (let i = 0; i < pts.length - 1; i++) {
      const [Ik1, t1] = pts[i];
      const [Ik2, t2] = pts[i + 1];
      if (Ik1 <= Ik && Ik <= Ik2) {
        // Log-log interpolation
        const logIk1 = Math.log10(Ik1);
        const logIk2 = Math.log10(Ik2);
        const logT1 = Math.log10(t1);
        const logT2 = Math.log10(t2);
        const logIk = Math.log10(Ik);
        
        const ratio = (logIk - logIk1) / (logIk2 - logIk1);
        const logT = logT1 + (logT2 - logT1) * ratio;
        const t = 10 ** logT;
        
        lines.push(
          `Log-log interpolation mellem punkter (${Ik1.toFixed(1)} A, ${t1.toFixed(3)} s) og (${Ik2.toFixed(1)} A, ${t2.toFixed(3)} s).`,
        );
        lines.push(`t ≈ ${t.toFixed(3)} s`);
        return { time: t, explanation: lines.join("\n") };
      }
    }
  } else {
    // Standard m-based interpolation for other fuse types
    const m = Ik / InCurve;
    lines.push(`Ik = ${Ik.toFixed(1)} A, In,kurve = ${InCurve.toFixed(1)} A ⇒ m = Ik/In ≈ ${m.toFixed(2)}`);

    if (m <= pts[0][0]) {
      const t = pts[0][1];
      lines.push("m ligger til venstre for første punkt på kurven – bruger første punkt.");
      lines.push(`t ≈ ${t.toFixed(3)} s`);
      return { time: t, explanation: lines.join("\n") };
    }

    if (m >= pts[pts.length - 1][0]) {
      const t = pts[pts.length - 1][1];
      lines.push("m ligger til højre for sidste punkt på kurven – bruger sidste punkt.");
      lines.push(`t ≈ ${t.toFixed(3)} s`);
      return { time: t, explanation: lines.join("\n") };
    }

    for (let i = 0; i < pts.length - 1; i++) {
      const [m1, t1] = pts[i];
      const [m2, t2] = pts[i + 1];
      if (m1 <= m && m <= m2) {
        const logM1 = Math.log10(m1);
        const logM2 = Math.log10(m2);
        const logT1 = Math.log10(t1);
        const logT2 = Math.log10(t2);
        const logM = Math.log10(m);

        let logT: number;
        if (logM2 === logM1) {
          logT = logT1;
        } else {
          const ratio = (logM - logM1) / (logM2 - logM1);
          logT = logT1 + ratio * (logT2 - logT1);
        }

        const t = 10 ** logT;
        lines.push(
          `Interpolerer mellem to kurvepunkter i log–log-skala (${m1.toFixed(2)},${t1.toFixed(3)}) og (${m2.toFixed(2)},${t2.toFixed(3)}).`,
        );
        lines.push(`t ≈ ${t.toFixed(3)} s`);
        return { time: t, explanation: lines.join("\n") };
      }
    }
  }

  lines.push("Kunne ikke interpolere på sikringskurven.");
  return { time: 0.0, explanation: lines.join("\n") };
}
