// Helper functions for circuit diagram generation

export interface CircuitData {
  // Stikledning data
  service: {
    voltage: number;
    phases: "1-faset" | "3-faset";
    fuseType: string;
    fuseRating: number;
    material: "Cu" | "Al";
    totalLength: number;
    crossSection: number;
    ikMax: number;
    ikMin: number;
    ikTrafo: number;
  };
  // Grupper data
  groups: Array<{
    id: string;
    name: string;
    fuseType: string;
    fuseRating: number;
    phase: "1-faset" | "3-faset";
    material: "Cu" | "Al";
    totalLength: number;
    crossSection: number;
    ikMin: number;
    ikMax: number;
    description?: string;
  }>;
}

// Cable colors according to Danish/EU standards
export const CABLE_COLORS = {
  L1: "#8B4513", // Brown
  L2: "#000000", // Black
  L3: "#808080", // Grey
  N: "#0000FF",  // Blue
  PE: "#00FF00", // Green/Yellow (simplified to green)
};

export function getCableColor(conductor: "L1" | "L2" | "L3" | "N" | "PE"): string {
  return CABLE_COLORS[conductor];
}

export function formatCurrent(value: number): string {
  return `${value.toFixed(1)} A`;
}

export function formatLength(value: number): string {
  return `${value.toFixed(1)}m`;
}

export function formatCrossSection(value: number): string {
  return `${value.toFixed(1)}mm²`;
}
