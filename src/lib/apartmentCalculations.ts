// Belastningstyper (watt/m²)
export const LOAD_TYPES = {
  bolig: 30,
  supermarked: 110,
  detailhandel: 70,
  kontor: 40,
  lager: 10,
} as const;

export type LoadType = keyof typeof LOAD_TYPES;

export const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  bolig: "Bolig/lejlighed",
  supermarked: "Supermarked",
  detailhandel: "Detailhandel og håndværk",
  kontor: "Kontor",
  lager: "Lager",
};

// Velander-formel: P_B = k1 * W * n + k2 * √(W * n)
// For helårshuse uden elvarme: k1 = 0.24, k2 = 2.31
export function calculateVelanderPower(
  W_watts: number, // Gennemsnitlig energiforbrug pr. bolig
  n_units: number // Antal boliger
): number {
  const k1 = 0.24;
  const k2 = 2.31;
  const W_kw = W_watts / 1000;
  const P_B = k1 * W_kw * n_units + k2 * Math.sqrt(W_kw * n_units);
  return P_B * 1000; // Konverter til watt
}

// Beregn effekt baseret på m² og belastningstype
export function calculatePowerFromArea(
  area_m2: number,
  loadType: LoadType
): number {
  const wattPerM2 = LOAD_TYPES[loadType];
  return area_m2 * wattPerM2;
}

// Konverter watt til ampere
export function wattsToAmps(
  watts: number,
  voltage: number,
  phases: "1-faset" | "3-faset",
  cosPhi: number = 1.0
): number {
  if (phases === "3-faset") {
    // P = √3 × U × I × cos φ
    return watts / (Math.sqrt(3) * voltage * cosPhi);
  } else {
    // P = U × I × cos φ
    return watts / (voltage * cosPhi);
  }
}

// Beregn total effekt for flere lejligheder med diversitetsfaktor
export function calculateTotalPowerWithDiversity(
  apartmentPowers: number[], // Effekt pr. lejlighed i watt
  diversityFactor: number // 0.0 - 1.0
): number {
  const totalPower = apartmentPowers.reduce((sum, p) => sum + p, 0);
  return totalPower * diversityFactor;
}
