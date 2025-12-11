# Jordfejlsbeskyttelse - Test Scenarios

## 🎯 Test Plan - Phase 2 Integration

Development server: **http://localhost:8080/**

---

## Test 1: ServiceCableTab - TT-system (Parcelhus)

### Setup:
1. Gå til **"Input – stikledning"** tab
2. Scroll ned til den blå **"Jordfejlsbeskyttelse (DS 183)"** card

### Forventet standard:
- ✅ Jordsystem: **TT (Jordspyd - parcelhus)** (default)
- ✅ Jordmodstand Ra: **50 Ω** (default)
- ✅ Beskrivelse: "TT-system: Typisk for parcelhuse med jordspyd (6mm² Cu)"
- ✅ Note under Ra input: "Jordspyd typisk 6mm² Cu beskyttet"

### Test A - Standard parcelhus scenario:
**Input:**
- Sikringstype: Diazed gG
- Sikringsstørrelse: 35 A
- Netspænding: 230 V
- Fasesystem: 3-faset
- Materiale: Cu
- Jordsystem: TT
- Jordmodstand Ra: 50 Ω
- Tværsnit: 10 mm²

**Klik "Beregn stikledning"**

**Forventet resultat i "Resultater – stikledning":**
- ✅ Ny sektion: **"Jordfejlsbeskyttelse"**
- ✅ Badge: **"✓ OK"** eller **"✗ IKKE OK"** (afhænger af Ia beregning)
- ✅ Jordfejlsstrøm Ia: Ca. 4.6 A (230V / 50Ω)
- ✅ HPFI krav badge: **"300mA"** (fordi Ia er for lav til at udløse 35A sikring)

**Gå til "Mellemregninger" tab:**
- ✅ Find "Stikledning – beregning"
- ✅ Se ny sektion: **"=== Jordfejlsbeskyttelse (DS 183) ==="**
- ✅ Systemtype: TT (Egen jord)
- ✅ Jordmodstand: Ra = 50.0 Ω
- ✅ Jordfejlsstrøm: Ia beregnet
- ✅ HPFI påkrævet: 300 mA besked
- ✅ Status: ✓ eller ✗

### Test B - Skift til TN-system:
**Ændre:**
- Jordsystem: **TN (PE-leder - stor bygning)**

**Forventet ændring:**
- ✅ Ra felt forsvinder
- ✅ Nyt felt vises: **Kildeimpedans Zs [Ω]** med default 0.15
- ✅ Beskrivelse ændrer sig til: "TN-system: Typisk for større bygninger med PE-leder"

**Klik "Beregn stikledning"**

**Forventet resultat:**
- ✅ Sløjfeimpedans Zs: Beregnet værdi (Zs,source + Zkabel)
- ✅ Jordfejlsstrøm Ia: Meget højere (230V / Zs_total)
- ✅ HPFI krav: Sandsynligvis "none" hvis Ia er høj nok

---

## Test 2: GroupsTab - Standard gruppe (TN-system default)

### Setup:
1. Gå til **"Grupper"** tab
2. Scroll ned til den blå **"Jordfejlsbeskyttelse (DS 183)"** card

### Forventet standard:
- ✅ Jordsystem: **TN (TN-C-S/TN-S)** (default for grupper)
- ✅ Kildeimpedans Zs: **0.15 Ω** (default)
- ✅ Beskrivelse: "TN-system: Typisk for større bygninger med PE-leder"

### Test A - Standard gruppe scenario:
**Input:**
- Gruppenavn: W1
- Sikringstype: MCB B
- Sikringsstørrelse: 10 A
- Fasesystem: 1-faset
- Materiale: Cu
- Jordsystem: TN
- Kildeimpedans Zs: 0.15 Ω
- Auto tværsnit: Ja

**Automatisk beregning kører** (ingen knap at trykke på)

**Forventet resultat i "Resultater":**
- ✅ Ny sektion under resultaterne: **"Jordfejlsbeskyttelse"**
- ✅ Badge: **"✓ OK"** (grøn) eller **"✗ IKKE OK"** (rød)
- ✅ Sløjfeimpedans Zs: Beregnet værdi
- ✅ Jordfejlsstrøm Ia: Beregnet værdi
- ✅ HPFI krav badge: vises hvis påkrævet

**Gå til "Mellemregninger" tab:**
- ✅ Find "Gruppe W1"
- ✅ Se ny sektion: **"=== Jordfejlsbeskyttelse (DS 183) ==="**
- ✅ Systemtype: TN (TN-C-S/TN-S)
- ✅ Kildeimpedans: Zs,source = 0.150 Ω
- ✅ Total sløjfeimpedans: Zs beregnet
- ✅ Jordfejlsstrøm: Ia beregnet
- ✅ Sikring info

---

## Test 3: MainBoardTab - Hovedtavle (TN-system default)

### Setup:
1. Gå til **"Hovedtavle"** tab
2. Scroll ned til den blå **"Jordfejlsbeskyttelse (DS 183)"** card
3. Den ligger mellem "Parallelle kabler" og "Kabelstykker"

### Forventet standard:
- ✅ Jordsystem: **TN (PE-leder - stor bygning)** (default)
- ✅ Kildeimpedans Zs: **0.15 Ω** (default)

### Test A - Standard hovedtavle scenario:
**Input:**
- Ikmax Trafo: 16000 A
- cos φ trafo: 0.3
- Sikringstype: Neozed gG
- Sikringsstørrelse: 63 A (auto)
- Materiale: Cu
- Jordsystem: TN
- Kildeimpedans Zs: 0.15 Ω

**Klik "Beregn hovedtavle"**

**Forventet resultat før sikringskurver:**
- ✅ Ny sektion: **"Jordfejlsbeskyttelse"**
- ✅ Badge: **"✓ OK"** (grøn) eller **"✗ IKKE OK"** (rød)
- ✅ Sløjfeimpedans Zs: Beregnet værdi
- ✅ Jordfejlsstrøm Ia: Høj værdi (400V system)
- ✅ HPFI krav: vises hvis påkrævet

**Gå til "Mellemregninger" tab:**
- ✅ Find "Hovedtavle – beregning"
- ✅ Se ny sektion: **"=== Jordfejlsbeskyttelse (DS 183) ==="**

---

## Test 4: Kabel-type regler (Multi-core cables)

### Setup:
1. Gå til **GroupsTab**
2. Scroll til "Segment af kabel 1"

### Test A - Single-core kabel (Enkeltledere):
**Input:**
- Kabel-type: **Enkeltledere**
- Tværsnit: 25 mm²

**Forventet:**
- ✅ Jordleder dropdown: **Aktiv** (kan ændres)
- ✅ Default jordleder: 16 mm² (per DS 183 Table 54.2)

### Test B - Multi-core kabel (Flerleder 5×25mm²):
**Ændre:**
- Kabel-type: **Flerleder (5×...mm²)**

**Forventet:**
- ✅ Jordleder dropdown: **Disabled** (gråt)
- ✅ Jordleder locked til: **25 mm²** (samme som fase)
- ✅ Tooltip/note: "PE er integreret i kablet"

**Gå til Mellemregninger:**
- ✅ Check advarsler - skal IKKE advare om undersized PE

### Test C - Ændre fase tværsnit:
**Ændre:**
- Tværsnit: 50 mm²

**Forventet:**
- ✅ Jordleder opdaterer automatisk til: **50 mm²** (locked)

---

## Test 5: Main Earth Conductor Warnings (Hovedjordledning)

### Setup:
1. Gå til **GroupsTab** eller **ServiceCableTab**
2. Det skal være en "distribution" circuit

### Test A - Undersized main earth conductor:
**Input:**
- CircuitType: distribution (stikledning eller hovedtavle)
- Materiale: Cu
- Jordleder: Sæt til **2.5 mm²** (under minimum)

**Klik beregn**

**Forventet i Mellemregninger:**
- ✅ Advarsel: **"⚠️ ADVARSEL: Hovedjordledning 2.5mm² < minimum 6mm² Cu (DS 183 §542.3.1)"**

---

## Test 6: RCD Requirements (HPFI krav)

### Scenario A - Ingen HPFI påkrævet:
**Conditions:**
- TN-system
- Ia høj nok (> 5 × In for MCB)
- Normal tør installation

**Forventet:**
- ✅ Ingen HPFI badge vises
- ✅ Log: "✓ HPFI ikke påkrævet (sikkerhedskrav opfyldt)"

### Scenario B - 300mA HPFI påkrævet:
**Conditions:**
- TT-system MED højmodstands jord (Ra > 50Ω)
- Eller TN-system hvor Ia ikke kan udløse sikring hurtigt nok

**Forventet:**
- ✅ HPFI badge: **"300mA"** (orange/outline)
- ✅ Log: "⚠️ HPFI påkrævet: 300 mA (Sikkerhedskrav ikke opfyldt)"

### Scenario C - 30mA HPFI påkrævet:
**Note:** Dette kræver bruger-input om badeværelse/udendørs
**I denne version:** 30mA vises kun hvis specifikt angivet i koden

**Forventet:**
- ✅ HPFI badge: **"30mA"** (orange/outline)
- ✅ Log: "⚠️ HPFI påkrævet: 30 mA (Badeværelse/udendørs)"

---

## Test 7: TN vs TT System Differences

### Create side-by-side comparison:

#### TN-system (stor bygning):
- Input field: **Zs [Ω]** (source impedance)
- Beregning: Ia = U / (Zs,source + Zkabel)
- Typisk Ia: **Høj** (hundredvis af ampere)
- RCD krav: Sjældent (kun hvis Ia for lav)

#### TT-system (parcelhus):
- Input field: **Ra [Ω]** (earth resistance)
- Beregning: Ia = U / Ra (kabel impedans ignoreret)
- Typisk Ia: **Lav** (4-5 ampere)
- RCD krav: Næsten altid 300mA

**Test:**
1. Samme installation med TN og Ra=0.15Ω
2. Samme installation med TT og Ra=50Ω
3. Sammenlign Ia værdierne - skal være drastisk forskellige!

---

## ✅ Success Criteria

Efter alle tests er kørt:

- [ ] Alle 3 tabs viser jordfejlsbeskyttelse sektion
- [ ] TN/TT selector virker og ændrer input fields
- [ ] Beregninger giver fornuftige Ia værdier
- [ ] RCD badges vises korrekt
- [ ] Multi-core cable rules fungerer (PE = fase)
- [ ] Main earth conductor warnings vises
- [ ] Mellemregninger viser detaljerede logs
- [ ] Ingen console errors
- [ ] Ingen TypeScript errors

---

## 🐛 Bug Report Template

Hvis du finder fejl:

```
**Component:** [ServiceCableTab / GroupsTab / MainBoardTab]
**Test:** [Test nummer og navn]
**Input:**
- [List input values]

**Forventet:**
- [Hvad du forventede]

**Faktisk:**
- [Hvad der skete]

**Console errors:**
- [Paste fra browser console]
```

---

## 📊 Test Status

| Test | Status | Notes |
|------|--------|-------|
| ServiceCableTab TT | ⏳ Pending | |
| ServiceCableTab TN | ⏳ Pending | |
| GroupsTab TN | ⏳ Pending | |
| MainBoardTab TN | ⏳ Pending | |
| Multi-core cables | ⏳ Pending | |
| Main earth warnings | ⏳ Pending | |
| RCD requirements | ⏳ Pending | |
| TN vs TT comparison | ⏳ Pending | |

---

**Development Server:** http://localhost:8080/

**God test!** 🚀
