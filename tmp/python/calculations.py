import math
import cmath

from Tabel import (
    KTEMP_LUFT,
    KTEMP_JORD,
    IZ_TABLE,
    IZ_TABLE_AL,
    NKT_R,
    NKT_XL,
    INSTALLATIONSMETODER,
    KGRP,
)

# ---------------------------------------------------------------------------
# Grunddata (materialekonstanter)
# ---------------------------------------------------------------------------
Q_MATERIAL = {
    "Cu": 0.0225,
    "Al": 0.0360,
}

LAMBDA_MATERIAL = {
    "Cu": 0.08,
    "Al": 0.08,
}

# Standard tværsnit (mm²)
STANDARD_SIZES = [
    1.5,
    2.5,
    4.0,
    6.0,
    10.0,
    16.0,
    25.0,
    35.0,
    50.0,
    70.0,
    95.0,
    120.0,
    150.0,
    185.0,
    240.0,
    300.0,
    400.0,
]

# ---------------------------------------------------------------------------
# INSTALLATIONSMETODER – bygges direkte fra Tabel.INSTALLATIONSMETODER
# ---------------------------------------------------------------------------


def _build_install_methods():
    """
    Laver den liste som SegmentFrame bruger:

        INSTALL_METHODS = [(nr, reference, tekst), ...]

    - springer dem over hvor reference == "" (IKKE ANVENDT)
    - teksten bliver: "nr – beskrivelse (reference)"
    """
    methods = []
    for nr in sorted(INSTALLATIONSMETODER.keys()):
        data = INSTALLATIONSMETODER[nr]
        ref = data.get("reference", "")
        if not ref:
            # Rækker der bare er "IKKE ANVENDT"
            continue

        beskrivelse = data.get("beskrivelse", "").strip()
        tekst = f"{nr} – {beskrivelse} ({ref})"
        methods.append((nr, ref, tekst))
    return methods


INSTALL_METHODS = _build_install_methods()
INSTALL_TEXTS = [t[2] for t in INSTALL_METHODS]

# ---------------------------------------------------------------------------
# Temperaturfaktor Kt ud fra KTEMP-tabeller
# ---------------------------------------------------------------------------


def lookup_Kt(env: str, T_amb: float) -> float:
    """
    Lookup af temperaturfaktor Kt for omgivelser:
      env = "luft" eller "jord"

    T_amb: omgivelsestemperatur [°C]

    Der interpoleres lineært mellem nærmeste punkter i KTEMP-tabellerne.
    """
    if env == "luft":
        table = KTEMP_LUFT
    elif env == "jord":
        table = KTEMP_JORD
    else:
        raise ValueError(f"Ugyldigt miljø for Kt: {env}")

    temps = sorted(table.keys())

    # Hvis T_amb ligger udenfor tabellen, brug kanten
    if T_amb <= temps[0]:
        return table[temps[0]]
    if T_amb >= temps[-1]:
        return table[temps[-1]]

    # Find interval
    for t1, t2 in zip(temps[:-1], temps[1:]):
        if t1 <= T_amb <= t2:
            K1 = table[t1]
            K2 = table[t2]
            ratio = (T_amb - t1) / (t2 - t1)
            return K1 + ratio * (K2 - K1)

    # fallback (burde ikke ske)
    return 1.0


# ---------------------------------------------------------------------------
# Iz-lookup for XLPE-kabler
# ---------------------------------------------------------------------------


def lookup_iz_xlpe(material: str, ref_method: str, cores: int, sq: float) -> float:
    """
    Opslag af Iz (tilladelig strøm) for XLPE-kabel i tabellen IZ_TABLE / IZ_TABLE_AL.
    Returnerer None hvis der ikke er data.
    """
    table = IZ_TABLE if material == "Cu" else IZ_TABLE_AL

    try:
        core_data = table[ref_method][cores]
    except KeyError:
        return None

    # Direkte opslag
    if sq in core_data:
        return core_data[sq]

    # Hvis ikke direkte i tabellen, brug nærmeste lavere tværsnit
    sizes = sorted(core_data.keys())
    lower = [s for s in sizes if s <= sq]
    if not lower:
        return None

    sq_use = max(lower)
    return core_data[sq_use]


# ---------------------------------------------------------------------------
# Kabelimpedans fra NKT-tabeller
# ---------------------------------------------------------------------------


def _lookup_XL_km(material: str, sq: float, phase: str) -> float:
    """
    Hjælpefunktion til at finde X_L [Ω/km] for kabeltværsnit og fasesystem.

    Understøtter både:
      NKT_XL["Cu"][S] = XL
    og
      NKT_XL["Cu"]["3-leder"][S], NKT_XL["Cu"]["4-leder"][S]
    samt evt. struktur med "1f"/"3f".
    """
    mat_data = NKT_XL[material]

    # Hvis mat_data[S] findes direkte (simpel tabel)
    if sq in mat_data and not isinstance(mat_data[sq], dict):
        return mat_data[sq]

    # Hvis der er nøgle "3-leder"/"4-leder" (eller lignende)
    if isinstance(mat_data, dict) and any(
        isinstance(v, dict) for v in mat_data.values()
    ):
        # Forsøg at gætte struktur
        if "3-leder" in mat_data or "4-leder" in mat_data:
            if phase == "3-faset":
                core_key = "3-leder"
            else:
                # 1-faset med 3-leder kabel (L+N+PE) behandles som 4-leder i tabellerne
                core_key = "4-leder" if "4-leder" in mat_data else "3-leder"
            core_tab = mat_data[core_key]
            return core_tab[sq]

        # Alternativ: 1f / 3f struktur
        if "1f" in mat_data or "3f" in mat_data:
            if phase == "3-faset":
                key = "3f"
            else:
                key = "1f"
            core_tab = mat_data[key]
            return core_tab[sq]

    # Fald tilbage – antag mat_data[sq] eksisterer
    return mat_data[sq]


def cable_impedance_NKT(
    L_m: float,
    material: str,
    sq: float,
    phase: str,
    R_factor: float = 1.5,
):
    """
    Kabelimpedans for længde L_m.

    - Ik,min : R_factor = 1.5  -> 1,5·R + j·X
    - Ik,max : R_factor = 1.0  -> 1,0·R + j·X

    Returnerer kompleks impedans Z = R + jX [Ω].
    """
    R_km = NKT_R[material][sq]
    XL_km = _lookup_XL_km(material, sq, phase)
    z_per_km = R_factor * R_km + 1j * XL_km
    return (L_m / 1000.0) * z_per_km


# ---------------------------------------------------------------------------
# Ik,min – stikledning og grupper
# ---------------------------------------------------------------------------


def ik_min_stik(U_v: float, I_min_supply: float, Z_w1_min: complex) -> float:
    """
    Ik,min i tavlen for stikledning.
    """
    Z_sup_min = U_v / I_min_supply
    Z_total = Z_sup_min + 2 * Z_w1_min
    return U_v / Z_total


def ik_min_group(
    U_v: float,
    I_min_supply: float,
    Z_stik_min: complex,
    Z_group_min: complex,
) -> float:
    """
    Ik,min i gruppeudtag.

    Z_total_min = Z_sup_min + 2*(Z_stik_min + Z_group_min)
    """
    Z_sup_min = U_v / I_min_supply
    Z_kabel = Z_stik_min + Z_group_min
    Z_total = Z_sup_min + 2 * Z_kabel
    return U_v / Z_total


# ---------------------------------------------------------------------------
# Ik,max – stikledning (bruges også som grundlag for grupper)
# ---------------------------------------------------------------------------


def ik_max_stik(
    U_v: float,
    Ik_trafo: float,
    cos_trafo: float,
    Z_kabel_max: complex,
):
    """
    Beregner Ik,max baseret på trafoens Ik og cosφ + kabelimpedans.
    Returnerer (Ik_max, Z_total).
    """
    sin_trafo = math.sqrt(max(0.0, 1.0 - cos_trafo**2))
    Z_trafo = U_v / Ik_trafo * complex(cos_trafo, -sin_trafo)

    Z_total = Z_trafo + Z_kabel_max
    Ik_max = U_v / Z_total
    return Ik_max, Z_total


# ---------------------------------------------------------------------------
# Termisk betingelse – k²·S² vs. I²·t
# ---------------------------------------------------------------------------


def thermal_ok(k: float, S_mm2: float, Ik: float, t: float):
    """
    Termisk kontrol for kabel ved kortslutning.

    k: konstant afhængig af materiale og isolation (Cu-XLPE ≈ 143, Al-XLPE ≈ 94)
    S_mm2: tværsnit [mm²]
    Ik: kortslutningsstrøm [A]
    t: udkoblingstid [s]

    Returnerer (ok: bool, E_kabel, E_bryde)
    """
    E_kabel = (k**2) * (S_mm2**2)
    E_bryde = (Ik**2) * t
    return E_kabel > E_bryde, E_kabel, E_bryde


# ---------------------------------------------------------------------------
# Spændingsfald – DS-formlen
# ---------------------------------------------------------------------------


def voltage_drop_ds(
    U_v: float,
    I: float,
    material: str,
    S_mm2: float,
    length_m: float,
    phase: str,
    cosphi: float = 1.0,
):
    """
    Spændingsfald efter DS-formlen.
    Returnerer (ΔU [V], ΔU[%]).
    """
    if phase == "3-faset":
        b = 1.0
    else:
        b = 2.0

    q = Q_MATERIAL[material]
    lam = LAMBDA_MATERIAL[material]

    # sinφ = sqrt(1 - cos²φ), men sikrer ikke-negativ pga. afrundingsfejl
    sinphi = math.sqrt(max(0.0, 1.0 - cosphi**2))

    du = b * (q * length_m / S_mm2 * cosphi + lam * length_m * sinphi) * I
    du_percent = du / U_v * 100.0
    return du, du_percent


# ---------------------------------------------------------------------------
# Sikring – udløsningstid ud fra kurvepunkter
# ---------------------------------------------------------------------------


def fuse_trip_time_explain(
    In_curve: float,
    Ik: float,
    curve_points,
):
    """
    Beregner udløsningstiden t for en sikring,
    ud fra en m–t-kurve (liste af punkter (m, t)).

    In_curve: den mærkestrøm [A], som kurven er optegnet for
    Ik: kortslutningsstrøm [A] (typisk Ik,min eller Ik,max)
    curve_points: liste af (m, t) fra fuse_curves.py

    Returnerer:
      (t, forklaring_tekst)
    """
    lines = []
    if In_curve <= 0:
        lines.append("Ugyldig In for sikring (≤ 0).")
        return 0.0, "\n".join(lines)

    if Ik <= 0:
        lines.append("Ik ≤ 0 A – ingen udkobling.")
        return 0.0, "\n".join(lines)

    m = Ik / In_curve
    lines.append(f"Ik = {Ik:.1f} A, In,kurve = {In_curve:.1f} A ⇒ m = Ik/In ≈ {m:.2f}")

    # Sorter punkter efter m
    pts = sorted(curve_points, key=lambda p: p[0])

    # Hvis m ligger uden for kurven
    if m <= pts[0][0]:
        t = pts[0][1]
        lines.append(
            "m ligger til venstre for første punkt på kurven – bruger første punkt."
        )
        lines.append(f"t ≈ {t:.3f} s")
        return t, "\n".join(lines)

    if m >= pts[-1][0]:
        t = pts[-1][1]
        lines.append(
            "m ligger til højre for sidste punkt på kurven – bruger sidste punkt."
        )
        lines.append(f"t ≈ {t:.3f} s")
        return t, "\n".join(lines)

    # Find interval og interpolér log-log
    for (m1, t1), (m2, t2) in zip(pts[:-1], pts[1:]):
        if m1 <= m <= m2:
            # log–log interpolation
            log_m1, log_m2 = math.log10(m1), math.log10(m2)
            log_t1, log_t2 = math.log10(t1), math.log10(t2)
            log_m = math.log10(m)

            if log_m2 == log_m1:
                log_t = log_t1
            else:
                ratio = (log_m - log_m1) / (log_m2 - log_m1)
                log_t = log_t1 + ratio * (log_t2 - log_t1)

            t = 10**log_t
            lines.append(
                "Interpolerer mellem to kurvepunkter i log–log-skala "
                f"({m1:.2f},{t1:.3f}) og ({m2:.2f},{t2:.3f})."
            )
            lines.append(f"t ≈ {t:.3f} s")
            return t, "\n".join(lines)

    # Burde ikke ske
    lines.append("Kunne ikke interpolere på sikringskurven.")
    return 0.0, "\n".join(lines)
