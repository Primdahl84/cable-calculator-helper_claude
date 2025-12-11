# Test af XLPE vs PVC forskelle

## Hvorfor ser du ingen forskel?

Ved **50A total strøm** fordelt på **3 parallelle kabler**:
- Strøm per kabel = 50A ÷ 3 = **16.67A**

For **10mm² kobber, metode C, 3 ledere**:
- **XLPE (90°C)**: Iz = 65A
- **PVC (70°C)**: Iz = 50A

Begge isoleringstyper kan sagtens klare 16.67A, så **10mm² er tilstrækkeligt for begge**.

---

## Test-scenarier hvor du VIL se forskel

### Scenario 1: Øg strømmen
Ændr til:
- **Total strøm: 150A** (eller øg antallet af enheder)
- Antal parallelle kabler: 1

Forventet resultat:
- XLPE: Vælger 35mm² (Iz = 129A > 150A ved korrigering)
- PVC: Vælger 50mm² (Iz = 116A ikke nok, skal til 50mm²)

### Scenario 2: Fjern parallelle kabler
Behold:
- Total strøm: 50A
- Ændr til: **1 kabel** (ikke 3 parallelle)

Forventet resultat:
- XLPE: 10mm² (Iz = 65A > 50A ✓)
- PVC: 16mm² (Iz = 50A ikke nok for 50A, skal til 64A)

### Scenario 3: Højere temperatur
Behold nuværende setup men ændr:
- Temperatur omgivelse: **45°C** (i stedet for 30°C)

Dette vil reducere Iz via korrektionsfaktoren Kt, og PVC vil påvirkes mere end XLPE.

---

## Konklusion

Din kode virker **KORREKT**!

Forskellen mellem XLPE og PVC vises kun når:
1. Strømbelastningen er høj nok til at udnytte XLPE's højere kapacitet
2. Korrektionsfaktorer (temperatur, gruppering) reducerer den tilladte strøm betydeligt

Ved lav belastning (som 16.67A per kabel) kan begge isoleringstyper klare det med samme tværsnit.
