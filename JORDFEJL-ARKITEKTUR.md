# 🏗️ Jordfejlsbeskyttelse - Arkitektur Oversigt

## 📐 System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    JORDFEJLSMODUL                           │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Phase 1    │───▶│   Phase 2    │───▶│   Phase 3    │ │
│  │  (KOMPLET)   │    │  (PENDING)   │    │  (PENDING)   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Grundlæggende Infrastruktur ✅

### Arkitektur Lag:

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  SegmentInput.tsx                                 │  │
│  │  ├─ Jordleder [mm²] selector                      │  │
│  │  ├─ Auto-calculate minimum size                   │  │
│  │  └─ Validation (disable invalid sizes)            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               Calculation Engine                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  calculations.ts                                  │  │
│  │                                                   │  │
│  │  Earth Conductor Sizing:                         │  │
│  │  ├─ calculateMinimumEarthConductorSize()         │  │
│  │  │  └─ DS 183 Table 54.2 rules                   │  │
│  │  └─ getEarthConductorResistance()                │  │
│  │     └─ NKT table lookup                          │  │
│  │                                                   │  │
│  │  Earth Fault Protection:                         │  │
│  │  ├─ calculateEarthFaultLoopImpedance()           │  │
│  │  │  └─ Zs = Zs(source) + R₁ + R₂                 │  │
│  │  ├─ calculateEarthFaultCurrent()                 │  │
│  │  │  ├─ TN: Ia = U₀ / Zs                          │  │
│  │  │  └─ TT: Ia = U₀ / (Zs + Ra)                   │  │
│  │  ├─ calculateTouchVoltage()                      │  │
│  │  │  └─ Ut = Ia × R₂                              │  │
│  │  └─ determineRCDRequirement()                    │  │
│  │     ├─ TN system logic                           │  │
│  │     └─ TT system logic (RCD always required)     │  │
│  │                                                   │  │
│  │  Main Calculation:                               │  │
│  │  └─ calculateEarthFaultProtection()              │  │
│  │     ├─ Loop through segments                     │  │
│  │     ├─ Calculate total R₁ + R₂                   │  │
│  │     ├─ Compute Zs and Ia                         │  │
│  │     ├─ Check touch voltage < 50V                 │  │
│  │     ├─ Verify Zs ≤ Zs,max for disconnection      │  │
│  │     └─ Return EarthFaultResults                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  SegmentData Interface                            │  │
│  │  └─ earthConductorSize?: number                  │  │
│  │                                                   │  │
│  │  EarthFaultResults Interface                     │  │
│  │  ├─ systemType: "TN" | "TT"                      │  │
│  │  ├─ Zs: number                                   │  │
│  │  ├─ Ra?: number (for TT)                         │  │
│  │  ├─ Ia: number                                   │  │
│  │  ├─ touchVoltage: number                         │  │
│  │  ├─ rcdRequirement: RCDRequirement               │  │
│  │  ├─ complianceOk: boolean                        │  │
│  │  └─ warnings: string[]                           │  │
│  │                                                   │  │
│  │  RCDRequirement Interface                        │  │
│  │  ├─ required: boolean                            │  │
│  │  ├─ reason: string                               │  │
│  │  ├─ type: "30mA" | "300mA" | "None"              │  │
│  │  ├─ tripTime: string                             │  │
│  │  └─ location: string                             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## DS 183 Regelimplementering

### Table 54.2: Minimum Protective Conductor Size

```typescript
function calculateMinimumEarthConductorSize(S: number): number {
  if (S ≤ 16mm²)        return S;      // Same as phase
  if (S ≤ 35mm²)        return 16mm²;  // Fixed 16mm²
  if (S > 35mm²)        return S/2;    // Half of phase
}
```

**Eksempler:**
```
  S = 10mm²   →  PE = 10mm²
  S = 25mm²   →  PE = 16mm²
  S = 50mm²   →  PE = 25mm²
  S = 120mm²  →  PE = 60mm² → std: 70mm²
```

### §411.3: Automatic Disconnection of Supply

**TN Systems (§411.4):**
```
Zs × Ia ≥ U₀
Disconnection time: 0.4s (final circuits), 5s (distribution)

Beregning:
  Zs = Zs(source) + R₁ + R₂
  Ia = U₀ / Zs
  Zs,max = U₀ / Ia,required
```

**TT Systems (§411.5):**
```
Ra × IΔn ≤ 50V

Beregning:
  Ia = U₀ / (Zs + Ra)
  Ra = typisk 10-100Ω
  → RCD ALTID påkrævet (kan ikke klare 0.4s uden)
```

### §411.3.2: RCD Requirements

```typescript
30mA RCD mandatory for:
  ✓ Socket outlets ≤20A (TN systems)
  ✓ Bathrooms (all circuits)
  ✓ Outdoor circuits
  ✓ ALL final circuits (TT systems)

300mA RCD recommended for:
  ⚠ Distribution boards (fire protection)
```

---

## Data Flow Diagram

### Current Flow (Phase 1):

```
User Interaction
       │
       ▼
┌─────────────────┐
│ SegmentInput    │
│ - Select phase  │
│   conductor     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auto-calculate  │
│ minimum earth   │
│ conductor size  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update state    │
│ (earthConductor │
│  Size)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save to         │
│ localStorage    │
└─────────────────┘
```

### Future Flow (Phase 2):

```
User selects system type (TN/TT)
       │
       ▼
┌─────────────────┐
│ Input source    │
│ impedance       │
│ - Zs (TN)       │
│ - Ra (TT)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calculate       │
│ segments        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call calculate  │
│ EarthFault      │
│ Protection()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Display results │
│ - Zs value      │
│ - Ia value      │
│ - Touch voltage │
│ - RCD required? │
│ - Compliance OK │
└─────────────────┘
```

---

## File Structure

```
src/
├── lib/
│   ├── calculations.ts          ← Earth fault functions
│   │   ├── calculateMinimumEarthConductorSize()
│   │   ├── getEarthConductorResistance()
│   │   ├── calculateEarthFaultLoopImpedance()
│   │   ├── calculateEarthFaultCurrent()
│   │   ├── calculateTouchVoltage()
│   │   ├── determineRCDRequirement()
│   │   └── calculateEarthFaultProtection()
│   └── tables.ts                 ← NKT resistance tables
│
├── components/
│   ├── SegmentInput.tsx          ← Earth conductor selector
│   ├── GroupsTab.tsx             ← Phase 2: Integrate here
│   ├── ServiceCableTab.tsx       ← Phase 2: Integrate here
│   └── MainBoardTab.tsx          ← Phase 2: Integrate here
│
└── docs/
    ├── JORDFEJL-TEST-GUIDE.md    ← Testing instructions
    └── JORDFEJL-ARKITEKTUR.md    ← This file
```

---

## Type Definitions

### Core Types

```typescript
// Segment with earth conductor
interface SegmentData {
  installMethod: string;
  length: number;
  crossSection: number;
  earthConductorSize?: number;  // NEW in Phase 1
  // ... other fields
}

// Earth fault calculation results
interface EarthFaultResults {
  systemType: "TN" | "TT";
  Zs: number;                    // Loop impedance [Ω]
  Ra?: number;                   // Earth resistance (TT only) [Ω]
  ZsMax: number;                 // Max allowed Zs [Ω]
  Ia: number;                    // Earth fault current [A]
  IaRequired: number;            // Required for disconnection [A]
  disconnectionTime: number;     // Actual time [s]
  touchVoltage: number;          // Prospective touch voltage [V]
  rcdRequirement: RCDRequirement;
  complianceOk: boolean;
  warnings: string[];
}

// RCD requirement details
interface RCDRequirement {
  required: boolean;
  reason: string;
  type: "30mA" | "300mA" | "None";
  tripTime: "instantaneous" | "time-delayed";
  location: "final-circuit" | "distribution-board";
}
```

---

## Testing Strategy

### Unit Tests (Future)

```typescript
describe('calculateMinimumEarthConductorSize', () => {
  test('S ≤ 16mm²: PE = S', () => {
    expect(calculateMinimumEarthConductorSize(10, 'Cu')).toBe(10);
  });

  test('16mm² < S ≤ 35mm²: PE = 16mm²', () => {
    expect(calculateMinimumEarthConductorSize(25, 'Cu')).toBe(16);
  });

  test('S > 35mm²: PE = S/2', () => {
    expect(calculateMinimumEarthConductorSize(70, 'Cu')).toBe(35);
  });
});

describe('calculateEarthFaultProtection', () => {
  test('TN system with low Zs: no RCD required', () => {
    const result = calculateEarthFaultProtection(
      "TN", 0.1, 50, segments, "Cu", 230, 16, "lighting", "indoor", 0.4
    );
    expect(result.rcdRequirement.required).toBe(false);
  });

  test('TT system: RCD always required', () => {
    const result = calculateEarthFaultProtection(
      "TT", 0.1, 50, segments, "Cu", 230, 16, "socket", "indoor", 0.4
    );
    expect(result.rcdRequirement.required).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('SegmentInput with earth conductor', () => {
  test('Auto-calculates minimum earth conductor on mount', () => {
    const segment: SegmentData = {
      crossSection: 25,
      // earthConductorSize not set
    };

    render(<SegmentInput segment={segment} material="Cu" />);

    // Should auto-set to 16mm² (DS 183 rule)
    expect(segment.earthConductorSize).toBe(16);
  });
});
```

---

## Performance Considerations

### Calculation Complexity

```
calculateEarthFaultProtection():
  - O(n) where n = number of segments
  - Each segment: 2 resistance lookups (phase + earth)
  - Total: ~10-20 calculations per circuit
  - Execution time: < 5ms typical
```

### UI Responsiveness

```
SegmentInput rendering:
  - Dropdown options filtered based on phase conductor
  - Re-calculates on crossSection change
  - UseEffect hook ensures single calculation per change
```

---

## Sikkerhedskrav (Safety Requirements)

### DS 183 Compliance Checklist

- [x] Earth conductor sizing (Table 54.2)
- [x] TN system earth fault calculation (§411.4)
- [x] TT system earth fault calculation (§411.5)
- [x] Touch voltage limit (≤50V AC)
- [x] RCD requirement determination (§411.3.2)
- [ ] Disconnection time verification (0.4s/5s) - Phase 2
- [ ] Fuse coordination with earth fault - Phase 2

---

## Migration Strategy

### Gamle Data (LocalStorage)

Når brugere opdaterer til ny version:

```typescript
// Auto-migration i useState initializer
segments.map(seg => ({
  ...seg,
  earthConductorSize: seg.earthConductorSize ||
    calculateMinimumEarthConductorSize(seg.crossSection, material)
}))
```

**Ingen data går tabt** - alle gamle segments får automatisk tildelt korrekt jordleder.

---

## Fremtidige Udvidelser (Phase 3+)

### Avancerede Features

1. **Fuse Curve Integration**
   - Plot earth fault current på sikringskurve
   - Verificer faktisk udløsningstid (ikke blot 5×In estimat)

2. **PDF Export**
   - Inkluder jordfejlsberegninger i rapport
   - DS 183 compliance statement

3. **Multi-Language**
   - Engelsk oversættelse af advarsler
   - International standards (IEC 60364)

4. **Discrimination Analysis**
   - RCD selectivity (300mA → 30mA)
   - Time-graded coordination

---

## 📚 Referencer

- **DS 183:2024** - Danish electrical installation standard
- **IEC 60364-4-41** - Protection against electric shock
- **IEC 60364-5-54** - Earthing arrangements and protective conductors
- **NKT Cable Handbook** - Impedance and resistance tables

---

**Opdateret:** 2025-12-08
**Version:** Phase 1 Complete
