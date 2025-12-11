# 🧪 Test-guide: Jordfejlsbeskyttelse (Phase 1)

## ✅ Build Status: SUCCESS
Projektet kompilerer uden fejl!

---

## 🎯 Hvad er implementeret (Phase 1)

### 1. **Beregningsfunktioner (Backend)**
✅ Komplet jordfejlsberegningsmotor i `src/lib/calculations.ts`:
- Minimum jordleder størrelse efter DS 183 Table 54.2
- Zs (jordfejlsløjfeimpedans) beregning
- Ia (jordfejlsstrøm) beregning for både TN og TT systemer
- Berøringsspænding beregning
- RCD-krav vurdering
- TN vs TT system håndtering

### 2. **UI-komponenter**
✅ Nyt "Jordleder" felt tilføjet til alle segment-inputs:
- Auto-beregner minimum størrelse baseret på faseleder
- Validering: kun gyldige størrelser kan vælges
- Markerer minimum størrelse med "(min)"

---

## 🧪 Hvordan du tester det

### Test 1: Verificer Jordleder Selector er Synlig

1. **Start udviklingsserver:**
   ```bash
   npm run dev
   ```

2. **Gå til "Gruppeledninger" tab**

3. **Opret en ny gruppe eller vælg eksisterende**

4. **Tjek segment-input felterne:**
   - Du skal nu se et nyt felt: **"Jordleder [mm²]"**
   - Det vises efter "Antal kabler (ks)"

5. **Test auto-beregning:**
   - Vælg "Tværsnit" = **10mm²**
   - Jordleder skal automatisk sættes til **10mm²** (samme som faseleder, fordi ≤16mm²)

   - Vælg "Tværsnit" = **25mm²**
   - Jordleder skal automatisk sættes til **16mm²** (DS 183 regel: 16-35mm² fase → 16mm² jord)

   - Vælg "Tværsnit" = **50mm²**
   - Jordleder skal automatisk sættes til **25mm²** (DS 183 regel: >35mm² fase → halv størrelse)

6. **Test validering:**
   - Med faseleder = 25mm²
   - Åbn "Jordleder" dropdown
   - Du skal se:
     - ❌ 1.5mm², 2.5mm², 4mm², 6mm², 10mm² (deaktiveret - for små)
     - ✅ **16mm² (min)** - markeret som minimum
     - ✅ 25mm² - tilladt

---

### Test 2: Verificer DS 183 Regler

#### Regel 1: S ≤ 16mm² → PE = S (samme størrelse)
```
Faseleder: 6mm²   → Jordleder minimum: 6mm²
Faseleder: 10mm²  → Jordleder minimum: 10mm²
Faseleder: 16mm²  → Jordleder minimum: 16mm²
```

#### Regel 2: 16mm² < S ≤ 35mm² → PE = 16mm²
```
Faseleder: 25mm²  → Jordleder minimum: 16mm²
Faseleder: 35mm²  → Jordleder minimum: 16mm²
```

#### Regel 3: S > 35mm² → PE = S/2 (halv størrelse)
```
Faseleder: 50mm²  → Jordleder minimum: 25mm²
Faseleder: 70mm²  → Jordleder minimum: 35mm²
Faseleder: 95mm²  → Jordleder minimum: 47.5mm² → nærmeste standard: 50mm²
Faseleder: 120mm² → Jordleder minimum: 60mm² → nærmeste standard: 70mm²
```

---

### Test 3: Persistering (LocalStorage)

1. **Opsæt en gruppe med:**
   - Tværsnit: 25mm²
   - Jordleder: 16mm²

2. **Genindlæs siden (F5)**

3. **Verificer:**
   - ✅ Jordleder-feltet viser stadig 16mm²
   - ✅ Ingen fejl i konsollen

4. **Tjek gamle data (migration):**
   - Hvis du havde gamle grupper uden jordleder
   - De skal automatisk få tildelt minimum jordleder
   - Ingen fejl eller advarsler

---

## 📊 Hvad der IKKE virker endnu (Phase 2)

### ⏳ Kommer i næste version:
- [ ] Systemtype vælger (TN / TT) i UI
- [ ] Source Zs input felt
- [ ] Ra (jordmodstand) input felt for TT-systemer
- [ ] RCD-krav badge i resultater
- [ ] Zs compliance status indikator
- [ ] Jordfejls-sektion i beregningslog
- [ ] Berøringsspænding display

**Hvorfor ikke nu?**
Backend-beregningerne er komplette, men UI-integrationen i results-sektionen kræver mere arbejde. Phase 1 fokuserede på at få jordleder-input korrekt implementeret.

---

## 🐛 Potentielle Problemer og Løsninger

### Problem: "Jordleder" felt vises ikke
**Løsning:**
1. Kontroller at du bruger opdateret build:
   ```bash
   npm run dev
   ```
2. Clear browser cache (Ctrl+Shift+R)
3. Tjek browser console for fejl

### Problem: Gamle data viser forkert jordleder størrelse
**Løsning:**
Kør cleanup script i browser console:
```javascript
// Clear all cable calculation data
localStorage.clear();
location.reload();
```

### Problem: TypeScript fejl ved import
**Løsning:**
Kør rebuild:
```bash
npm run build
```

---

## 📝 Test Checklist

Før du går videre til Phase 2, verificer følgende:

### Basis Funktionalitet
- [ ] "Jordleder [mm²]" felt vises i segment input
- [ ] Auto-beregner korrekt minimum størrelse
- [ ] Dropdown viser kun gyldige størrelser
- [ ] Markerer minimum med "(min)"
- [ ] Deaktiverer for små størrelser

### DS 183 Regler
- [ ] S ≤ 16mm²: PE = S ✓
- [ ] 16mm² < S ≤ 35mm²: PE = 16mm² ✓
- [ ] S > 35mm²: PE = S/2 ✓

### Data Persistering
- [ ] Jordleder gemmes korrekt i localStorage
- [ ] Overlever side-genindlæsning
- [ ] Gamle data får auto-assigned jordleder

### Build og Stabilitet
- [ ] `npm run build` succeeds uden fejl ✓
- [ ] Ingen TypeScript fejl
- [ ] Ingen runtime fejl i browser console

---

## 🚀 Næste Skridt (Phase 2)

Når du har verificeret at alt virker:

1. **UI Integration** - Tilføj system-type selector, Zs/Ra felter
2. **Results Display** - Vis jordfejlsberegninger i resultater
3. **Beregningslog** - Tilføj jordfejls-sektion til mellemregninger
4. **Warnings & Badges** - RCD-krav advarsler, Zs compliance badges
5. **Full Testing** - Test både TN og TT systemer med reelle værdier

---

## 💡 Elektroteknisk Baggrund

### Hvorfor er jordleder vigtig?
Ved jordfejl (isolationsbrud) skal fejlstrømmen kunne løbe tilbage gennem jordlederen for at udløse beskyttelsesanordningen.

### DS 183 Table 54.2 Logik:
- **Små kabler (≤16mm²)**: Termisk kapacitet tilstrækkelig med samme størrelse
- **Mellem kabler (16-35mm²)**: 16mm² jordleder er tilstrækkelig termisk
- **Store kabler (>35mm²)**: Halv størrelse OK pga. kortere fejl-tid ved høje strømme

### Hvad kommer i Phase 2:
**TN-systemer:**
- Zs = impedans gennem transformator + kabler tilbage til stjernepunkt
- Kan ofte klare 0.4s med sikring alene

**TT-systemer:**
- Høj jordmodstand (Ra = 10-100Ω) → lav fejlstrøm
- RCD ALTID påkrævet
- Kan ikke opfylde 0.4s-krav uden RCD

---

## ✅ Test Resultat

Når alle tests er grønne, er Phase 1 komplet og klar til Phase 2 integration! 🎉

---

**Spørgsmål eller problemer?**
Åbn en GitHub issue eller kontakt projektteamet.
