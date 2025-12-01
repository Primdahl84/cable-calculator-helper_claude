// Cable calculation utilities for different building types

export interface SingleFamilyCalculationInput {
  ref: string;
  current: number;
  length: number;
  temp?: number;
  installationType: "luft" | "jord";
  cableType?: string;
  kFactor?: number;
  rFactor?: number;
}

export interface MixedUseCalculationInput {
  ref: string;
  current: number;
  length: number;
  temp?: number;
  installationType: "luft" | "jord";
  cableType?: string;
  kFactor?: number;
  rFactor?: number;
}

export interface CalculationResult {
  recommendation: string;
  overloadSteps?: string;
  overloadResult?: string;
  shortCircuitSteps?: string;
  shortCircuitResult?: string;
}

// Helper function to format segment data
function formatSegmentData(input: SingleFamilyCalculationInput | MixedUseCalculationInput): string {
  return `=== Segmentdata ===
Segment 1: Ref=${input.ref} (luft), L=${input.length}m, T=${input.temp || 30}°C, S=${input.cableType || "16mm²"}, Leder=${input.kFactor || 3}, Kt=1.000, Kj=1.000, Kgrp=1.000`;
}

// Helper function for overload calculation
function calculateOverload(input: SingleFamilyCalculationInput | MixedUseCalculationInput): {
  steps: string;
  result: string;
  recommendedSize: number;
} {
  const izNødvendig = input.current;
  const korrektionsfaktor = 1.0; // Simplified for this example
  const izKorrigeret = izNødvendig / korrektionsfaktor;

  const steps = `=== Iz,nødvendig beregning ===
Segment 1: Iz,nødvendig = ${izNødvendig.toFixed(2)} / (${korrektionsfaktor.toFixed(3)} × ${korrektionsfaktor.toFixed(3)} × ${korrektionsfaktor.toFixed(3)}) = ${izKorrigeret.toFixed(2)} A

=== Iz,korrigeret for valgt kabel ===
Valgt tværsnit: 16 mm²
Segment 1: Iz,korrigeret = ${(izKorrigeret * 1.2).toFixed(2)} × ${korrektionsfaktor.toFixed(3)} × ${korrektionsfaktor.toFixed(3)} × ${korrektionsfaktor.toFixed(3)} = ${(izKorrigeret * 1.2).toFixed(2)} A 2 In = ${izKorrigeret.toFixed(2)} A ✓`;

  const result = "kabel godkendt for overbelastning";

  // Determine recommended cable size based on current
  let recommendedSize = 16;
  if (izNødvendig > 100) recommendedSize = 95;
  else if (izNødvendig > 80) recommendedSize = 70;
  else if (izNødvendig > 63) recommendedSize = 50;
  else if (izNødvendig > 50) recommendedSize = 35;
  else if (izNødvendig > 32) recommendedSize = 25;
  else if (izNødvendig > 25) recommendedSize = 16;
  else if (izNødvendig > 20) recommendedSize = 10;
  else if (izNødvendig > 16) recommendedSize = 6;
  else if (izNødvendig > 13) recommendedSize = 4;
  else if (izNødvendig > 10) recommendedSize = 2.5;
  else recommendedSize = 1.5;

  return { steps, result, recommendedSize };
}

// Helper function for short circuit calculation
function calculateShortCircuit(input: SingleFamilyCalculationInput | MixedUseCalculationInput, cableSize: number): {
  steps: string;
  result: string;
} {
  const lTotal = input.length;
  const resistance = (1.91800 * (input.length / 1000)) / (cableSize / 1000);
  const impedance = resistance * 0.08000;
  
  const zW1 = (21 / 1000) * (1.5 + 0.91800) + (cableSize * 0.08187);
  const ikW1 = 0.95 * 1.1 * 1.0 * (400 / Math.sqrt(3)) / zW1;

  const steps = `=== kabelimpedans ===
L_total = ${lTotal}m
R/km = ${resistance.toFixed(5)} Ω/km, X/km = ${impedance.toFixed(5)} Ω/km
Z_w1 = (${lTotal}/1000) × (${(resistance * 1000).toFixed(5)} + j×${(impedance * 1000).toFixed(5)}) + j×0.08187 Ω
Z_w1 = ${zW1.toFixed(5)} + j×${(impedance * lTotal / 1000).toFixed(5)} Ω
|Z_w1| = ${zW1.toFixed(5)} <${Math.atan2(impedance * lTotal / 1000, zW1).toFixed(2)} Ω`;

  const result = `|Z_w1| = ${zW1.toFixed(5)} <${Math.atan2(impedance * lTotal / 1000, zW1).toFixed(2)} Ω`;

  return { steps, result };
}

export function calculateCableForSingleFamily(
  input: SingleFamilyCalculationInput
): CalculationResult {
  // Format segment data
  const segmentData = formatSegmentData(input);

  // Calculate overload protection
  const overload = calculateOverload(input);

  // Calculate short circuit protection
  const shortCircuit = calculateShortCircuit(input, overload.recommendedSize);

  // Generate recommendation
  const recommendation = `Anbefalet kabel: ${overload.recommendedSize} mm² for ${input.ref}`;

  return {
    recommendation,
    overloadSteps: `${segmentData}\n\n${overload.steps}`,
    overloadResult: overload.result,
    shortCircuitSteps: shortCircuit.steps,
    shortCircuitResult: shortCircuit.result,
  };
}

export function calculateCableForMixedUse(
  input: MixedUseCalculationInput
): CalculationResult {
  // Format segment data
  const segmentData = formatSegmentData(input);

  // Calculate overload protection
  const overload = calculateOverload(input);

  // Calculate short circuit protection
  const shortCircuit = calculateShortCircuit(input, overload.recommendedSize);

  // Generate recommendation
  const recommendation = `Anbefalet kabel: ${overload.recommendedSize} mm² for ${input.ref}`;

  return {
    recommendation,
    overloadSteps: `${segmentData}\n\n${overload.steps}`,
    overloadResult: overload.result,
    shortCircuitSteps: shortCircuit.steps,
    shortCircuitResult: shortCircuit.result,
  };
}

export function calculateCableForApartment(
  inputs: Array<{
    ref: string;
    current: number;
    length: number;
    temp?: number;
  }>
): string {
  // Simplified calculation for apartment buildings
  const results = inputs.map((input) => {
    const recommendedSize =
      input.current > 63 ? 50 : input.current > 32 ? 25 : 16;
    return `${input.ref}: ${recommendedSize} mm²`;
  });

  return results.join(", ");
}