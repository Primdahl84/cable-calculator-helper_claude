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
  NKT_R_70,
  NKT_R_90,
  NKT_XL,
  NKT_XL_70,
  NKT_XL_90,
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
  cableType?: "multi-core" | "single-core" | "armored"; // Cable construction type
  earthConductorSize?: number; // Protective earth conductor cross-section [mm²]
}

export interface CableImpedance {
  R: number;
  X: number;
  Z: number;
}

export interface RCDRequirement {
  required: boolean;
  reason: string;
  type: "30mA" | "300mA" | "None";
  tripTime: "instantaneous" | "time-delayed";
  location: "final-circuit" | "distribution-board";
}

export interface EarthFaultResults {
  systemType: "TN" | "TT"; // Earthing system type
  Zs: number;              // Earth fault loop impedance (Ω)
  Ra?: number;             // Earth electrode resistance for TT systems (Ω)
  ZsMax: number;           // Maximum allowed Zs for disconnection time (Ω)
  Ia: number;              // Actual earth fault current (A)
  IaRequired: number;      // Required earth fault current for disconnection (A)
  disconnectionTime: number; // Actual disconnection time (s)
  touchVoltage: number;    // Prospective touch voltage (V)
  rcdRequirement: RCDRequirement;
  complianceOk: boolean;   // Whether earth fault protection is adequate
  warnings: string[];      // List of warning messages
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
 *
 * @param cablesGrouped Antal kabler i gruppe
 * @param refMethod Installationsmetode (reference-metode)
 * @param cableSpacingM Afstand mellem kabler i meter (kun for D1/D2 i jord) - valgfrit
 * @returns Korrigeret samlefaktor
 *
 * DS 183 regel: For D1/D2 i jord med afstand > 0,5m = ingen korrektionsfaktor (Kgrp = 1,0)
 */
export function calculateKgrp(
  cablesGrouped: number,
  refMethod: string,
  cableSpacingM?: number
): number {
  if (cablesGrouped <= 1) return 1.0;

  // DS 183 regel for jordjordede kabler: hvis afstand > 0,5m, ingen korrektionsfaktor
  if (cableSpacingM !== undefined && cableSpacingM > 0.5) {
    // Check if this is a soil installation method (D1, D2)
    if (refMethod && (refMethod.startsWith("D1") || refMethod.startsWith("D2"))) {
      return 1.0; // Ingen korrektionsfaktor ved stor afstand
    }
  }

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
  phase: string = "3-faset",
  temperature: number = 20
): CableImpedance {
  // Vælg R-tabel baseret på temperatur
  let nkt_r_table: Record<string, Record<number, number>>;
  let nkt_xl_table: Record<string, Record<string, Record<number, number>>>;

  if (temperature === 70) {
    nkt_r_table = NKT_R_70;
    nkt_xl_table = NKT_XL_70;
  } else if (temperature === 90) {
    nkt_r_table = NKT_R_90;
    nkt_xl_table = NKT_XL_90;
  } else {
    // Default til 20°C
    nkt_r_table = NKT_R;
    nkt_xl_table = NKT_XL;
  }

  const matDataR = nkt_r_table[material];
  if (!matDataR || matDataR[crossSection] === undefined) {
    // Fallback hvis ikke i tabellen
    const resistivity = material === "Cu" ? 0.0175 : 0.0283;
    const R = (resistivity * 1000) / crossSection;
    const X = 0.08;
    return { R, X, Z: Math.sqrt(R * R + X * X) };
  }

  const R = matDataR[crossSection];

  const matDataX = nkt_xl_table[material];
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
 * Calculate transformer impedance from technical data
 * Z_trafo = (Ek% × U_trafo²) / (100 × S_trafo)
 * cos(φ) = P_cu × U_trafo² / (S_trafo² × Z)
 *
 * @param S_trafo Transformer apparent power [VA]
 * @param U_trafo Transformer voltage [V]
 * @param Ek_percent Impedance percentage [%]
 * @param P_cu Copper losses [W]
 * @returns Impedance magnitude, cos(φ), sin(φ), and complex components
 */
export function calculateTransformerImpedance(
  S_trafo: number,
  U_trafo: number,
  Ek_percent: number,
  P_cu: number,
): {
  Z: number;
  cos_phi: number;
  sin_phi: number;
  R: number;
  X: number;
  angle_deg: number;
} {
  // Calculate impedance magnitude
  const Z = (Ek_percent * U_trafo * U_trafo) / (100 * S_trafo);

  // Calculate cos(φ) from copper losses
  // cos(φ) = P_cu × U² / (S² × Z)
  const cos_phi = Math.max(0, Math.min(1, (P_cu * U_trafo * U_trafo) / (S_trafo * S_trafo * Z)));
  const sin_phi = Math.sqrt(Math.max(0, 1 - cos_phi * cos_phi));

  // Decompose into R and X components
  // Z = R + jX, where R = Z × cos(φ), X = Z × sin(φ)
  const R = Z * cos_phi;
  const X = Z * sin_phi;

  const angle_deg = Math.atan2(X, R) * (180 / Math.PI);

  return { Z, cos_phi, sin_phi, R, X, angle_deg };
}

/**
 * Calculate reduced neutral conductor size
 * S = √(I² × t) / k
 *
 * @param Ik Short circuit current [A]
 * @param t Trip time [s]
 * @param k Thermal constant (Cu: 143, Al: 94)
 * @returns Cross-section [mm²]
 */
export function calculateReducedNeutral(
  Ik: number,
  t: number,
  k: number = 143, // Default for copper
): number {
  if (Ik <= 0 || t <= 0 || k <= 0) return 0;
  const numerator = Math.sqrt(Ik * Ik * t);
  return numerator / k;
}

/**
 * Calculate network impedance with angle
 * Zn = U² / Sk_max ∠ arctan(1/r_x)
 *
 * @param U System voltage [V]
 * @param Sk_max Network short circuit power [VA]
 * @param R_X_ratio R/X ratio of network
 * @returns Impedance with real/imaginary components and angle
 */
export function calculateNetworkImpedance(
  U: number,
  Sk_max: number,
  R_X_ratio: number = 0.3,
): {
  Z: number;
  R: number;
  X: number;
  angle_deg: number;
  cos_phi: number;
  sin_phi: number;
} {
  if (Sk_max <= 0) {
    return { Z: 0, R: 0, X: 0, angle_deg: 0, cos_phi: 1, sin_phi: 0 };
  }

  // Impedance magnitude
  const Z = (U * U) / Sk_max;

  // Angle from R/X ratio: φ = arctan(1/r_x) = arctan(x/r)
  // If r_x = R/X = 0.3, then X/R = 1/0.3 = 3.333
  const angle_rad = Math.atan(1 / R_X_ratio);
  const angle_deg = angle_rad * (180 / Math.PI);

  // Decompose impedance
  const cos_phi = Math.cos(angle_rad);
  const sin_phi = Math.sin(angle_rad);

  const R = Z * cos_phi;
  const X = Z * sin_phi;

  return { Z, R, X, angle_deg, cos_phi, sin_phi };
}

/**
 * Add complex currents (phasor addition for multiple loads)
 * Useful for combining motor currents with different power factors
 *
 * @param currents Array of {magnitude: I [A], cos_phi: power factor}
 * @returns Total current magnitude and power factor
 */
export function addComplexCurrents(
  currents: Array<{ magnitude: number; cos_phi: number }>,
): {
  total_magnitude: number;
  total_cos_phi: number;
  total_angle_deg: number;
  real: number;
  imaginary: number;
} {
  let real_sum = 0;
  let imag_sum = 0;

  for (const current of currents) {
    const sin_phi = Math.sqrt(Math.max(0, 1 - current.cos_phi * current.cos_phi));
    real_sum += current.magnitude * current.cos_phi;
    imag_sum += current.magnitude * sin_phi;
  }

  const total_magnitude = Math.sqrt(real_sum * real_sum + imag_sum * imag_sum);
  const total_angle_rad = Math.atan2(imag_sum, real_sum);
  const total_angle_deg = total_angle_rad * (180 / Math.PI);

  // Calculate resulting power factor
  const total_cos_phi = total_magnitude > 0
    ? real_sum / total_magnitude
    : 1;

  return {
    total_magnitude,
    total_cos_phi,
    total_angle_deg,
    real: real_sum,
    imaginary: imag_sum,
  };
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

/**
 * Beregn strømfordeling i parallelforbundne kabler med muligt ulige impedanser.
 *
 * Formler (fra DS 183):
 * I1 = I_total × (Z2 / (Z1 + Z2))
 * I2 = I_total × (Z1 / (Z1 + Z2))
 *
 * @param totalCurrent Total strøm gennem begge kabler [A]
 * @param impedance1 Impedans for kabel 1 [Ω/km]
 * @param impedance2 Impedans for kabel 2 [Ω/km]
 * @returns Strøm i hver kabel og advarsel hvis forskel > 10%
 */
export function calculateParallelCableCurrents(
  totalCurrent: number,
  impedance1: number,
  impedance2: number
): {
  current1: number;
  current2: number;
  ratio1: number;
  ratio2: number;
  imbalance: number;
  warning: boolean;
  message: string;
} {
  if (impedance1 <= 0 || impedance2 <= 0) {
    return {
      current1: totalCurrent / 2,
      current2: totalCurrent / 2,
      ratio1: 50,
      ratio2: 50,
      imbalance: 0,
      warning: false,
      message: "Begge impedanser skal være positive",
    };
  }

  const totalImpedance = impedance1 + impedance2;

  // I1 = I_total × (Z2 / (Z1 + Z2))
  const current1 = totalCurrent * (impedance2 / totalImpedance);
  // I2 = I_total × (Z1 / (Z1 + Z2))
  const current2 = totalCurrent * (impedance1 / totalImpedance);

  const ratio1 = (current1 / totalCurrent) * 100;
  const ratio2 = (current2 / totalCurrent) * 100;

  // Imbalance calculation: difference from 50%
  const imbalance = Math.abs(ratio1 - 50);
  const warning = imbalance > 10;

  let message = "Strømfordelingen er ligevægt";
  if (warning) {
    message = `ADVARSEL: Uligevægtlig strømfordeling! ${ratio1.toFixed(1)}% / ${ratio2.toFixed(1)}% (forskel: ${imbalance.toFixed(1)}%). DS 183 anbefaler ca. 50%/50% eller højere impedans-værdier.`;
  }

  return {
    current1,
    current2,
    ratio1,
    ratio2,
    imbalance,
    warning,
    message,
  };
}

/**
 * Check soil cable spacing requirements for D1/D2 installation methods.
 *
 * DS 183 regel:
 * - D1 (i kanal): Afstand > 0,5m eliminerer gruppekorrektionsfaktor
 * - D2 (direkte jordet): Afstand > 0,5m eliminerer gruppekorrektionsfaktor
 *
 * @param refMethod Reference installationsmetode
 * @param cableSpacingM Afstand mellem kabler i meter
 * @param cablesGrouped Antal kabler i gruppe
 * @returns Status og anbefalinger for afstanden
 */
export function checkSoilCableSpacing(
  refMethod: string,
  cableSpacingM: number,
  cablesGrouped: number
): {
  isValidMethod: boolean;
  meetsSpacingRequirement: boolean;
  spacing: number;
  recommendation: string;
  benefit: string;
} {
  const isSoilMethod = refMethod && (refMethod.startsWith("D1") || refMethod.startsWith("D2"));

  if (!isSoilMethod) {
    return {
      isValidMethod: false,
      meetsSpacingRequirement: false,
      spacing: cableSpacingM,
      recommendation: "Afstandskrav gælder kun for D1 (kanal) og D2 (direkte jordet)",
      benefit: "",
    };
  }

  const meetsRequirement = cableSpacingM > 0.5;

  let recommendation = "";
  let benefit = "";

  if (meetsRequirement) {
    recommendation = `✓ Afstand ${cableSpacingM.toFixed(2)}m > 0,5m - gruppekorrektionsfaktor kan elimineres!`;
    benefit = `Kgrp = 1,0 (ingen reduktion) i stedet for lille værdi ved ${cablesGrouped} kabler`;
  } else {
    recommendation = `✗ Afstand ${cableSpacingM.toFixed(2)}m ≤ 0,5m - gruppekorrektionsfaktor gælder`;
    benefit = `For at undgå gruppekorrektion: øg afstand til > 0,5m`;
  }

  return {
    isValidMethod: true,
    meetsSpacingRequirement: meetsRequirement,
    spacing: cableSpacingM,
    recommendation,
    benefit,
  };
}

/**
 * Check bundling vs. single-layer cable layout and provide recommendations.
 *
 * DS 183 regel: Bundtning giver meget dårlig samlefaktor (f.eks. Kgrp = 0,45 ved 12 kabler),
 * mens enkelt-lag layout giver meget bedre værdier (f.eks. Kgrp = 0,78-0,87).
 *
 * @param currentKgrp Nuværende (bundlet) Kgrp værdi
 * @param bundledCables Antal kabler i bundel
 * @returns Advarsel og forbedringspotentiale
 */
export function checkBundlingWarning(
  currentKgrp: number,
  bundledCables: number
): {
  isBundled: boolean;
  warning: boolean;
  currentKgrp: number;
  recommendedKgrp: number;
  improvement: number;
  improvementPercent: number;
  message: string;
  recommendation: string;
} {
  // Empiriske værdier fra DS 183 for bundlet vs. enkelt-lag
  const bundledFactors: Record<number, number> = {
    2: 0.80,
    3: 0.73,
    4: 0.65,
    5: 0.60,
    6: 0.56,
    7: 0.52,
    8: 0.50,
    9: 0.48,
    10: 0.46,
    12: 0.45,
  };

  const singleLayerFactors: Record<number, number> = {
    2: 0.90,
    3: 0.87,
    4: 0.85,
    5: 0.83,
    6: 0.81,
    7: 0.79,
    8: 0.78,
    9: 0.77,
    10: 0.76,
    12: 0.75,
  };

  // Find the closest cable count in the tables
  const cableCountKey = Object.keys(bundledFactors)
    .map(Number)
    .sort((a, b) => Math.abs(a - bundledCables) - Math.abs(b - bundledCables))[0];

  const bundledValue = bundledFactors[cableCountKey];
  const singleLayerValue = singleLayerFactors[cableCountKey];

  const improvement = singleLayerValue - bundledValue;
  const improvementPercent = (improvement / bundledValue) * 100;

  let message = "Samlefaktor er tilfredsstillende";
  let recommendation = "";
  let isBundled = false;
  let warning = false;

  // Check if the current Kgrp suggests bundling (bundled factors are lower than single-layer)
  if (currentKgrp <= bundledValue + 0.05) {
    isBundled = true;
    warning = improvement > 0.05; // Warning if improvement is > 5%

    if (warning) {
      message = `ADVARSEL: Bundtning med ${bundledCables} kabler giver dårlig samlefaktor (Kgrp = ${currentKgrp.toFixed(3)})`;
      recommendation = `Overvej enkelt-lag layout: Kgrp ville være ca. ${singleLayerValue.toFixed(3)} (+${improvementPercent.toFixed(1)}% forbedring). Dette giver større tilladt strømstyrke (Iz) uden at øge kabelstørrelsen.`;
    }
  }

  return {
    isBundled,
    warning,
    currentKgrp,
    recommendedKgrp: singleLayerValue,
    improvement,
    improvementPercent,
    message,
    recommendation,
  };
}

/**
 * Check short circuit protection for parallel cables.
 *
 * DS 183 regel: Hvis der er fejl i én leder, kan andre ledere fortsætte med at føre strøm.
 * Dette kræver beskyttelse på flere steder:
 * - Enkelt beskyttelse (forsyningsende): Kun én beskyttelse, krystalfibrerne kan åbne
 * - Dobbelt beskyttelse (forsynings- og belastningsende): Bedre sikkerhed
 * - Individuel beskyttelse (hver kabel): Højeste sikkerhed
 *
 * @param protectionScheme Beskyttelsestype: "single", "double", eller "individual"
 * @param shortCircuitCurrent Kortslutningsstrøm [A]
 * @param protectionDeviceRating Beskyttelsesanordnings nominalstrøm [A]
 * @param cable1Current Strøm i kabel 1 [A]
 * @param cable2Current Strøm i kabel 2 [A]
 * @returns Status for beskyttelse og anbefalinger
 */
export function checkParallelCableProtection(
  protectionScheme: "single" | "double" | "individual",
  shortCircuitCurrent: number,
  protectionDeviceRating: number,
  cable1Current: number,
  cable2Current: number
): {
  scheme: string;
  isAdequate: boolean;
  shortCircuitCurrent: number;
  protectionRating: number;
  cable1Current: number;
  cable2Current: number;
  message: string;
  recommendation: string;
} {
  let isAdequate = false;
  let message = "";
  let recommendation = "";

  // Check if protection device can handle short circuit current
  const canTrip = shortCircuitCurrent >= protectionDeviceRating * 2; // Typical sensitivity threshold

  if (protectionScheme === "single") {
    message = `Enkelt beskyttelse (forsyningsende): Beskyttelse ved ${protectionDeviceRating}A`;
    isAdequate = canTrip;

    if (!isAdequate) {
      recommendation = `⚠️ ADVARSEL: Kortslutningsstrøm (${shortCircuitCurrent.toFixed(0)}A) kan være utilstrækkelig til at trigger beskyttelse. Overvej dobbel eller individuel beskyttelse.`;
    } else {
      recommendation = `✓ Beskyttelse kan klare kortslutning (${shortCircuitCurrent.toFixed(0)}A >> ${protectionDeviceRating}A), men husk at hvis én leder fejler, fortsætter anden med strøm.`;
    }
  } else if (protectionScheme === "double") {
    message = `Dobbelt beskyttelse (forsynings- og belastningsende): Hver med ${protectionDeviceRating}A`;
    isAdequate = canTrip;

    if (!isAdequate) {
      recommendation = `⚠️ ADVARSEL: Kortslutningsstrøm (${shortCircuitCurrent.toFixed(0)}A) kan være utilstrækkelig. Begge beskyttelser bør kunne trigger.`;
    } else {
      recommendation = `✓ Dobbelt beskyttelse giver god sikkerhed: hver beskyttelse kan isolere sin del af systemet ved fejl. Kortslutningsstrøm (${shortCircuitCurrent.toFixed(0)}A) >> ${protectionDeviceRating}A.`;
    }
  } else if (protectionScheme === "individual") {
    message = `Individuel beskyttelse (hver kabel): Kabel 1: ${cable1Current.toFixed(1)}A, Kabel 2: ${cable2Current.toFixed(1)}A`;
    isAdequate = canTrip;

    if (!isAdequate) {
      recommendation = `⚠️ ADVARSEL: Hver kabel skal have individuel beskyttelse justeret til sin strømandel. Kortslutningsstrøm kontrolleres af hver beskyttelse individuelt.`;
    } else {
      recommendation = `✓ Højeste sikkerhedsniveau: hver kabel er uafhængigt beskyttet. Hvis én fejler, er den isoleret. Hver beskyttelse skal være justeret til sin strømandel.`;
    }
  }

  return {
    scheme: protectionScheme,
    isAdequate,
    shortCircuitCurrent,
    protectionRating: protectionDeviceRating,
    cable1Current,
    cable2Current,
    message,
    recommendation,
  };
}

/**
 * Calculate minimum main earth conductor size per DS 183 §542.3.1
 * (Hovedjordledning til tavle)
 *
 * @param material Cable material (Cu or Al)
 * @param isProtected Whether conductor is mechanically protected
 * @returns Minimum main earth conductor size [mm²]
 */
export function calculateMinimumMainEarthConductor(
  material: "Cu" | "Al",
  isProtected: boolean = true
): number {
  // DS 183 §542.3.1: Hovedjordledning
  if (material === "Cu") {
    return isProtected ? 6 : 16; // 6mm² beskyttet, 16mm² ubeskyttet
  } else {
    return isProtected ? 16 : 25; // 16mm² beskyttet, 25mm² ubeskyttet
  }
}

/**
 * Calculate earth conductor size per DS 183 Table 54.2 and §543.1.1
 *
 * @param phaseConductorSize Phase conductor cross-section [mm²]
 * @param material Cable material (Cu or Al)
 * @param cableType Cable construction type
 * @returns Minimum required earth conductor size [mm²]
 */
export function calculateMinimumEarthConductorSize(
  phaseConductorSize: number,
  material: "Cu" | "Al",
  cableType: "multi-core" | "single-core" | "armored" = "single-core",
  earthSystem?: "TN" | "TT",
  circuitType?: "distribution" | "final"
): number {
  // DS 183 §542.3.1: TT-system hovedjordledning (main earth conductor to earth electrode)
  // For TT-system stikledning: The service cable does NOT include PE from grid
  // Instead, there's a local earth spike (jordspyd) connection: min 6mm² Cu protected
  if (earthSystem === "TT" && circuitType === "distribution") {
    return material === "Cu" ? 6 : 10; // 6mm² Cu or 10mm² Al (mechanically protected)
  }

  // DS 183 §543.1.1: Flerleder-kabler (integrated earth in cable)
  // PE er fysisk integreret i kablet og har ALTID samme størrelse som faselederne
  // Eksempel: 5×25mm² PFXP har PE = 25mm² (kan ikke reduceres)
  if (cableType === "multi-core") {
    return phaseConductorSize; // Altid samme størrelse når integreret
  }

  // DS 183 Table 54.2 (separate earth conductor - enkeltledere eller armering):
  // If S ≤ 16mm²: PE = S (same size as phase)
  // If 16mm² < S ≤ 35mm²: PE = 16mm² (kan reduceres)
  // If S > 35mm²: PE = S/2 (kan reduceres til halv størrelse)

  if (phaseConductorSize <= 16) {
    return phaseConductorSize;
  } else if (phaseConductorSize <= 35) {
    return 16;
  } else {
    return phaseConductorSize / 2;
  }
}

/**
 * Calculate earth conductor resistance per km
 * Uses same formula as phase conductor resistance
 *
 * @param crossSection Earth conductor cross-section [mm²]
 * @param material Cable material (Cu or Al)
 * @param temperature Conductor temperature [°C] (default 20°C for earth conductor)
 * @returns Resistance [Ω/km]
 */
export function getEarthConductorResistance(
  crossSection: number,
  material: "Cu" | "Al",
  temperature: number = 20
): number {
  // Use NKT tables if available, otherwise calculate
  const nkt_r_table = temperature === 70 ? NKT_R_70 :
                      temperature === 90 ? NKT_R_90 :
                      NKT_R;

  const matDataR = nkt_r_table?.[material];
  if (matDataR && matDataR[crossSection] !== undefined) {
    return matDataR[crossSection];
  }

  // Fallback calculation using resistivity
  const resistivity = material === "Cu" ? 0.0175 : 0.0283; // Ω·mm²/m at 20°C
  return (resistivity * 1000) / crossSection; // Ω/km
}

/**
 * Calculate earth fault loop impedance (Zs)
 * Zs = Zs(source) + R₁ + R₂
 *
 * @param sourceZs Source earth fault loop impedance [Ω]
 * @param phaseResistance Phase conductor resistance [Ω]
 * @param earthResistance Earth conductor resistance [Ω]
 * @returns Earth fault loop impedance [Ω]
 */
export function calculateEarthFaultLoopImpedance(
  sourceZs: number,
  phaseResistance: number,
  earthResistance: number
): number {
  // Zs = Zs(forsyning) + R₁ + R₂
  // R₁ = phase conductor resistance
  // R₂ = earth conductor resistance
  return sourceZs + phaseResistance + earthResistance;
}

/**
 * Calculate earth fault current
 *
 * @param voltage Phase-to-earth voltage [V] (typically 230V for TN systems)
 * @param Zs Earth fault loop impedance [Ω]
 * @returns Earth fault current [A]
 */
export function calculateEarthFaultCurrent(
  voltage: number,
  Zs: number
): number {
  if (Zs <= 0) return 0;
  return voltage / Zs;
}

/**
 * Calculate prospective touch voltage
 *
 * @param earthFaultCurrent Earth fault current [A]
 * @param earthResistance Earth conductor resistance [Ω]
 * @returns Touch voltage [V]
 */
export function calculateTouchVoltage(
  earthFaultCurrent: number,
  earthResistance: number
): number {
  // Touch voltage = Ia × R₂
  return earthFaultCurrent * earthResistance;
}

/**
 * Determine RCD requirement per DS 183 §411.3
 *
 * @param systemType Earthing system type ("TN" | "TT")
 * @param circuitType Type of circuit ("socket" | "fixed-equipment" | "distribution" | "lighting")
 * @param current Circuit rated current [A]
 * @param location Location ("bathroom" | "outdoor" | "indoor")
 * @param ZsCompliant Whether Zs allows proper disconnection with fuse/MCB alone
 * @returns RCD requirement details
 */
export function determineRCDRequirement(
  systemType: "TN" | "TT",
  circuitType: "socket" | "fixed-equipment" | "distribution" | "lighting",
  current: number,
  location: "bathroom" | "outdoor" | "indoor",
  ZsCompliant: boolean
): RCDRequirement {
  // DS 183 §411.3.2: 30mA RCD mandatory for:
  // - All socket outlets ≤20A (TN systems)
  // - Bathrooms (all circuits)
  // - Outdoor circuits
  // - ALL final circuits in TT systems (cannot achieve 0.4s without RCD)

  // TT systems: RCD ALWAYS required for final circuits
  if (systemType === "TT" && circuitType !== "distribution") {
    return {
      required: true,
      reason: "TT-system - RCD påkrævet for alle slutgrupper (DS 183 §411.5.3)",
      type: "30mA",
      tripTime: "instantaneous",
      location: "final-circuit"
    };
  }

  // Check for mandatory 30mA RCD in TN systems
  if (circuitType === "socket" && current <= 20) {
    return {
      required: true,
      reason: "Stikkontakt ≤20A (DS 183 §411.3.2)",
      type: "30mA",
      tripTime: "instantaneous",
      location: "final-circuit"
    };
  }

  if (location === "bathroom") {
    return {
      required: true,
      reason: "Badeværelsesgruppe (DS 183 §701.411.3.3)",
      type: "30mA",
      tripTime: "instantaneous",
      location: "final-circuit"
    };
  }

  if (location === "outdoor") {
    return {
      required: true,
      reason: "Udendørs gruppe (DS 183 §411.3.2)",
      type: "30mA",
      tripTime: "instantaneous",
      location: "final-circuit"
    };
  }

  // Check if Zs is too high (fuse/MCB cannot disconnect in time)
  if (!ZsCompliant) {
    return {
      required: true,
      reason: "Zs for høj - sikring kan ikke udløse inden 0,4s",
      type: "30mA",
      tripTime: "instantaneous",
      location: "final-circuit"
    };
  }

  // Distribution boards: recommend 300mA for fire protection
  if (circuitType === "distribution") {
    return {
      required: false, // Not strictly required, but recommended
      reason: "Anbefalet for brandsbeskyttelse (DS 183 §422.3.9)",
      type: "300mA",
      tripTime: "time-delayed",
      location: "distribution-board"
    };
  }

  // No RCD required
  return {
    required: false,
    reason: "Ingen RCD-krav for denne gruppe",
    type: "None",
    tripTime: "instantaneous",
    location: "final-circuit"
  };
}

/**
 * Calculate complete earth fault protection for a circuit
 *
 * @param systemType Earthing system type ("TN" | "TT")
 * @param sourceZs Source earth fault loop impedance [Ω] (for TN systems)
 * @param earthResistance Earth electrode resistance [Ω] (for TT systems, typical 10-100Ω)
 * @param segments Array of cable segments
 * @param material Cable material
 * @param voltage Phase-to-earth voltage [V] (default 230V)
 * @param protectionDeviceRating Protection device rating [A]
 * @param circuitType Type of circuit
 * @param location Circuit location
 * @param requiredDisconnectionTime Required disconnection time [s] (0.4s for final circuits, 5s for distribution)
 * @returns Complete earth fault protection results
 */
export function calculateEarthFaultProtection(
  systemType: "TN" | "TT",
  sourceZs: number,
  earthResistance: number,
  segments: SegmentData[],
  material: "Cu" | "Al",
  voltage: number = 230,
  protectionDeviceRating: number,
  circuitType: "socket" | "fixed-equipment" | "distribution" | "lighting",
  location: "bathroom" | "outdoor" | "indoor",
  requiredDisconnectionTime: number = 0.4
): EarthFaultResults {
  const warnings: string[] = [];

  // Calculate total phase and earth conductor resistance
  let totalPhaseResistance = 0;
  let totalEarthResistance = 0;

  for (const seg of segments) {
    const lengthKm = seg.length / 1000;

    // Phase conductor resistance
    const { R: phaseR } = getCableImpedancePerKm(seg.crossSection, material, "3-faset", 70);
    totalPhaseResistance += phaseR * lengthKm;

    // Earth conductor resistance
    const earthSize = seg.earthConductorSize || calculateMinimumEarthConductorSize(seg.crossSection, material);
    const earthR = getEarthConductorResistance(earthSize, material, 20);
    totalEarthResistance += earthR * lengthKm;

    // Check if earth conductor is undersized
    const cableType = seg.cableType || "single-core";
    const minEarthSize = calculateMinimumEarthConductorSize(seg.crossSection, material, cableType);
    if (earthSize < minEarthSize) {
      warnings.push(`Segment: Jordleder ${earthSize}mm² < minimum ${minEarthSize}mm² (DS 183 Table 54.2)`);
    }
  }

  // Check hovedjordledning minimum (DS 183 §542.3.1)
  // For hovedtavle-tilslutninger skal jordleder være minimum 6mm² Cu (beskyttet)
  const minMainEarthSize = calculateMinimumMainEarthConductor(material, true);
  const minSegmentEarthSize = Math.min(...segments.map(s => s.earthConductorSize || calculateMinimumEarthConductorSize(s.crossSection, material, s.cableType || "single-core")));
  if (circuitType === "distribution" && minSegmentEarthSize < minMainEarthSize) {
    warnings.push(`⚠️ ADVARSEL: Hovedjordledning ${minSegmentEarthSize}mm² < minimum ${minMainEarthSize}mm² ${material} (DS 183 §542.3.1)`);
  }

  // Calculate Zs (cable impedance only for TN, includes Ra for TT)
  const Zs = calculateEarthFaultLoopImpedance(sourceZs, totalPhaseResistance, totalEarthResistance);

  // Calculate earth fault current based on system type
  let Ia: number;
  let effectiveZs: number;

  if (systemType === "TT") {
    // TT system: Ia = U0 / (Zs + Ra)
    effectiveZs = Zs + earthResistance;
    Ia = calculateEarthFaultCurrent(voltage, effectiveZs);

    if (earthResistance > 100) {
      warnings.push(`⚠️ TT-system: Høj jordmodstand Ra=${earthResistance.toFixed(1)}Ω (typisk 10-100Ω) - meget lav jordfejlsstrøm`);
    }
  } else {
    // TN system: Ia = U0 / Zs
    effectiveZs = Zs;
    Ia = calculateEarthFaultCurrent(voltage, Zs);
  }

  // Calculate touch voltage
  const touchVoltage = calculateTouchVoltage(Ia, totalEarthResistance);

  // Check touch voltage limit (50V AC per DS 183 §411.3.2.2)
  if (touchVoltage > 50) {
    warnings.push(`Berøringsspænding ${touchVoltage.toFixed(1)}V > 50V grænse`);
  }

  // Required earth fault current for disconnection
  // For fuses: typically 5 × In for 5s, higher for 0.4s
  // For MCBs: Type B = 5 × In, Type C = 10 × In, Type D = 20 × In
  // Conservative estimate: 5 × In for 0.4s disconnection
  const IaRequired = protectionDeviceRating * 5;

  // Maximum allowed Zs for required disconnection time
  const ZsMax = voltage / IaRequired;

  // Check if Zs allows proper disconnection
  const ZsCompliant = effectiveZs <= ZsMax;

  if (!ZsCompliant && systemType === "TN") {
    warnings.push(`Zs (${effectiveZs.toFixed(4)}Ω) > Zs,max (${ZsMax.toFixed(4)}Ω) - sikring kan ikke udløse i tide`);
  }

  if (systemType === "TT" && !ZsCompliant) {
    warnings.push(`TT-system: Zs+Ra (${effectiveZs.toFixed(4)}Ω) >> Zs,max (${ZsMax.toFixed(4)}Ω) - RCD PÅKRÆVET`);
  }

  // Determine RCD requirement
  const rcdRequirement = determineRCDRequirement(systemType, circuitType, protectionDeviceRating, location, ZsCompliant);

  // Estimate disconnection time (simplified - actual depends on fuse curve)
  const disconnectionTime = ZsCompliant ? requiredDisconnectionTime : Infinity;

  // Overall compliance
  // For TT systems, RCD is mandatory - compliance depends on RCD being present
  // For TN systems, compliance requires either Zs compliance OR RCD
  const complianceOk = systemType === "TT" ? rcdRequirement.required : (ZsCompliant || rcdRequirement.required);

  if (!complianceOk) {
    warnings.push("ADVARSEL: Jordfejlsbeskyttelse utilstrækkelig - RCD påkrævet!");
  }

  return {
    systemType,
    Zs,
    Ra: systemType === "TT" ? earthResistance : undefined,
    ZsMax,
    Ia,
    IaRequired,
    disconnectionTime,
    touchVoltage,
    rcdRequirement,
    complianceOk,
    warnings
  };
}



