/**
 * Core electrical calculations for cable sizing
 * Ported from Python calculations.py
 */

import {
  IZ_TABLE_XLPE,
  IZ_TABLE_AL_XLPE,
  IZ_TABLE_PVC,
  IZ_TABLE_AL_PVC,
  KTEMP_LUFT,
  KTEMP_JORD,
  KGRP,
  NKT_R,
  NKT_XL,
} from "./tables";

export const Q_MATERIAL: Record<string, number> = {
  Cu: 0.0225,
  Al: 0.036,
};

export const LAMBDA_MATERIAL: Record<string, number> = {
  Cu: 0.08,
  Al: 0.08,
};

export const STANDARD_SIZES = [
  1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 
  70.0, 95.0, 120.0, 150.0, 185.0, 240.0, 300.0, 400.0
];

export interface SegmentData {
  installMethod: string;
  length: number;
  ambientTemp: number;
  loadedConductors: number;
  crossSection: number;
  cablesGrouped: number;
  kt: number;
  kgrp: number;
  insulationType?: "XLPE" | "PVC"; // Cable insulation type
}

export interface CableImpedance {
  R: number;
  X: number;
  Z: number;
}

/**
 * Calculate voltage drop for a cable segment
 */
export function calculateVoltageDrop(
  current: number,
  length: number,
  resistance: number,
  reactance: number,
  cosPhi: number,
  phases: string
): number {
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  const dropPerPhase = current * length * (resistance * cosPhi + reactance * sinPhi);
  
  if (phases === "3-faset") {
    return Math.sqrt(3) * dropPerPhase;
  }
  return 2 * dropPerPhase; // 1-phase: go and return
}

/**
 * Calculate short circuit current
 */
export function calculateShortCircuit(
  sourceVoltage: number,
  sourceImpedance: { R: number; X: number },
  cableImpedance: { R: number; X: number },
  phases: string
): { Ik: number; angle: number } {
  const totalR = sourceImpedance.R + cableImpedance.R;
  const totalX = sourceImpedance.X + cableImpedance.X;
  const totalZ = Math.sqrt(totalR * totalR + totalX * totalX);
  
  let voltage = sourceVoltage;
  if (phases === "3-faset") {
    voltage = sourceVoltage / Math.sqrt(3);
  }
  
  const Ik = voltage / totalZ;
  const angle = Math.atan2(totalX, totalR) * (180 / Math.PI);
  
  return { Ik, angle };
}

/**
 * Lookup Iz (tilladelig strømstyrke) fra IZ_TABLE / IZ_TABLE_AL.
 * Returnerer 0 hvis data ikke findes.
 */
export function lookupIz(
  material: string,
  refMethod: string,
  crossSection: number,
  loadedConductors: number,
  insulationType: "XLPE" | "PVC" = "XLPE"
): number {
  // Select the appropriate table based on material and insulation type
  const table = 
    material === "Cu" 
      ? (insulationType === "PVC" ? IZ_TABLE_PVC : IZ_TABLE_XLPE)
      : (insulationType === "PVC" ? IZ_TABLE_AL_PVC : IZ_TABLE_AL_XLPE);

  const refData = table[refMethod];
  if (!refData) return 0;

  const coreData = refData[loadedConductors];
  if (!coreData) return 0;

  if (coreData[crossSection] !== undefined) {
    return coreData[crossSection];
  }

  // Hvis ikke direkte opslag, brug nærmeste lavere tværsnit
  const sizes = Object.keys(coreData)
    .map(Number)
    .sort((a, b) => a - b);
  const lower = sizes.filter((s) => s <= crossSection);
  if (lower.length === 0) return 0;

  const sqUse = lower[lower.length - 1];
  return coreData[sqUse];
}

/**
 * Beregn temperaturfaktor Kt ud fra KTEMP-tabellerne.
 * Lineær interpolation mellem punkter.
 */
export function calculateKt(ambientTemp: number, environment: string): number {
  const table = environment === "jord" ? KTEMP_JORD : KTEMP_LUFT;

  const temps = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);

  if (ambientTemp <= temps[0]) return table[temps[0]];
  if (ambientTemp >= temps[temps.length - 1])
    return table[temps[temps.length - 1]];

  for (let i = 0; i < temps.length - 1; i++) {
    const t1 = temps[i];
    const t2 = temps[i + 1];
    if (ambientTemp >= t1 && ambientTemp <= t2) {
      const K1 = table[t1];
      const K2 = table[t2];
      const ratio = (ambientTemp - t1) / (t2 - t1);
      return K1 + ratio * (K2 - K1);
    }
  }

  return 1.0;
}

/**
 * Beregn kgrp (samlefaktor) ud fra KGRP-tabeller.
 * Bruger nærmeste lavere n i tabellen.
 */
export function calculateKgrp(cablesGrouped: number, refMethod: string): number {
  if (cablesGrouped <= 1) return 1.0;

  const kgrpTable = KGRP[refMethod];
  if (!kgrpTable) return 1.0;

  const ns = Object.keys(kgrpTable)
    .map(Number)
    .sort((a, b) => a - b);
  const candidates = ns.filter((n) => n <= cablesGrouped);
  if (candidates.length === 0) return 1.0;

  const n = candidates[candidates.length - 1];
  return kgrpTable[n];
}

/**
 * Get cable resistance and reactance per km from NKT tables
 */
export function getCableImpedancePerKm(
  crossSection: number,
  material: string,
  phase: string = "3-faset"
): CableImpedance {
  const matDataR = NKT_R[material];
  if (!matDataR || matDataR[crossSection] === undefined) {
    // Fallback hvis ikke i tabellen
    const resistivity = material === "Cu" ? 0.0175 : 0.0283;
    const R = (resistivity * 1000) / crossSection;
    const X = 0.08;
    return { R, X, Z: Math.sqrt(R * R + X * X) };
  }

  const R = matDataR[crossSection];

  const matDataX = NKT_XL[material];
  let X = 0.08; // fallback

  if (matDataX) {
    // For Cu: både "3-leder" og "4-leder"
    // For Al: kun "4-leder"
    if (material === "Cu") {
      const coreKey = phase === "3-faset" ? "3-leder" : "4-leder";
      const coreTab = matDataX[coreKey];
      if (coreTab && coreTab[crossSection] !== undefined) {
        X = coreTab[crossSection];
      }
    } else {
      // Al
      const coreTab = matDataX["4-leder"];
      if (coreTab && coreTab[crossSection] !== undefined) {
        X = coreTab[crossSection];
      }
    }
  }

  const Z = Math.sqrt(R * R + X * X);
  return { R, X, Z };
}

/**
 * Format current with angle for display
 */
export function formatCurrentWithAngle(magnitude: number, angle: number): string {
  return `${magnitude.toFixed(1)} A / ${angle.toFixed(1)}°`;
}

/**
 * Beregn Ik,min for stikledning (kompleks, som i Python ik_min_stik)
 */
export function ikMinStik(
  Uv: number,
  IminSupply: number,
  Zw1Min: { R: number; X: number },
): { Ik: number; angle: number } {
  const ZsupMin = Uv / IminSupply; // reel del
  const ZtotalRe = ZsupMin + 2 * Zw1Min.R;
  const ZtotalIm = 2 * Zw1Min.X;

  const denom = ZtotalRe * ZtotalRe + ZtotalIm * ZtotalIm;
  const Ire = (Uv * ZtotalRe) / denom;
  const Iim = (-Uv * ZtotalIm) / denom;

  const Ik = Math.sqrt(Ire * Ire + Iim * Iim);
  const angle = (Math.atan2(Iim, Ire) * 180) / Math.PI;
  return { Ik, angle };
}

/**
 * Beregn Ik,min for gruppe (ved gruppeudtag)
 */
export function ikMinGroup(
  Uv: number,
  IminSupply: number,
  ZstikMin: { R: number; X: number },
  ZgroupMin: { R: number; X: number },
): { Ik: number; angle: number } {
  const ZsupMin = Uv / IminSupply;
  const ZtotalRe = ZsupMin + 2 * (ZstikMin.R + ZgroupMin.R);
  const ZtotalIm = 2 * (ZstikMin.X + ZgroupMin.X);

  const denom = ZtotalRe * ZtotalRe + ZtotalIm * ZtotalIm;
  if (denom === 0) return { Ik: 0, angle: 0 };
  
  const Ire = (Uv * ZtotalRe) / denom;
  const Iim = (-Uv * ZtotalIm) / denom;

  const Ik = Math.sqrt(Ire * Ire + Iim * Iim);
  const angle = (Math.atan2(Iim, Ire) * 180) / Math.PI;
  return { Ik, angle };
}

/**
 * Beregn Ik,max for stikledning baseret på trafo (som i Python ik_max_stik)
 */
export function ikMaxStik(
  Uv: number,
  IkTrafo: number,
  cosTrafo: number,
  ZkabelMax: { R: number; X: number },
): { Ik: number; angle: number; Ztotal: number } {
  const sinTrafo = Math.sqrt(Math.max(0, 1 - cosTrafo * cosTrafo));
  const ZtrafoRe = (Uv / IkTrafo) * cosTrafo;
  const ZtrafoIm = -(Uv / IkTrafo) * sinTrafo;

  const ZtotalRe = ZtrafoRe + ZkabelMax.R;
  const ZtotalIm = ZtrafoIm + ZkabelMax.X;

  const denom = ZtotalRe * ZtotalRe + ZtotalIm * ZtotalIm;
  const Ire = (Uv * ZtotalRe) / denom;
  const Iim = (-Uv * ZtotalIm) / denom;

  const Ik = Math.sqrt(Ire * Ire + Iim * Iim);
  const angle = (Math.atan2(Iim, Ire) * 180) / Math.PI;
  const Ztotal = Math.sqrt(ZtotalRe * ZtotalRe + ZtotalIm * ZtotalIm);

  return { Ik, angle, Ztotal };
}

/**
 * Termisk kontrol for kabel ved kortslutning
 */
export function thermalOk(
  k: number,
  Smm2: number,
  Ik: number,
  t: number,
): { ok: boolean; Ekabel: number; Ebryde: number } {
  const Ekabel = k * k * Smm2 * Smm2;
  const Ebryde = Ik * Ik * t;
  return { ok: Ekabel > Ebryde, Ekabel, Ebryde };
}

/**
 * Auto-select cable size based on current and voltage drop
 */
export function autoSelectCableSize(
  current: number,
  length: number,
  maxVoltageDrop: number,
  voltage: number,
  cosPhi: number,
  phases: string,
  material: string,
  refMethod: string,
  kt: number,
  kgrp: number,
  loadedConductors: number,
  insulationType: "XLPE" | "PVC" = "XLPE"
): number | null {
  const correctionFactor = kt * kgrp;
  const requiredIz = current / correctionFactor;
  
  for (const size of STANDARD_SIZES) {
    const iz = lookupIz(material, refMethod, size, loadedConductors, insulationType);
    
    if (iz >= requiredIz) {
      // Check voltage drop (for stikledning bruger vi stadig impedans-metoden)
      const impedance = getCableImpedancePerKm(size, material);
      const vDrop = calculateVoltageDrop(
        current,
        length / 1000, // konverter til km
        impedance.R,
        impedance.X,
        cosPhi,
        phases
      );
      const vDropPercent = (vDrop / voltage) * 100;
      
      if (vDropPercent <= maxVoltageDrop) {
        return size;
      }
    }
  }
  
  return null;
}

/**
 * Spændingsfald efter DS-formlen.
 * Returnerer ΔU [V] og ΔU[%].
 */
export function voltageDropDs(
  Uv: number,
  current: number,
  material: string,
  crossSection: number,
  lengthMeters: number,
  phases: string,
  cosPhi: number = 1.0,
): { du: number; duPercent: number } {
  const b = phases === "3-faset" ? 1.0 : 2.0;
  const q = Q_MATERIAL[material];
  const lam = LAMBDA_MATERIAL[material];
  const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));

  const du =
    b * (q * (lengthMeters / crossSection) * cosPhi + lam * lengthMeters * sinPhi) * current;
  const duPercent = (du / Uv) * 100;

  return { du, duPercent };
}

