"""
Sikringskurver (Diazed/Neozed/Kniv gG + MCB B/C) og opslag på dem.
Alle tider er ca.-værdier i sekunder som funktion af m = Ik / In.

- Diazed gG:  60 faste punkter (normeret gG-kurve)
- Neozed gG:  60 faste punkter (egen gG-kurve)
- Knivsikring gG (NH): genbruger Diazed-kurven (gG-standard)
- MCB B/C:    60 punkter genereret analytisk som i Schneider/Siemens C60-kurver
"""

import math

# ================================================================
# DIAZED gG – 60 punkter (fælles normeret form for DII/DIII/DIV)
# ================================================================

DIAZED_CURVE_60 = [
    (3.0000, 1.5000),     (3.1346, 1.3300),     (3.2700, 1.1700),
    (3.4140, 1.0400),     (3.5650, 0.9300),      (3.7230, 0.8350),
    (3.8880, 0.7500),      (4.0590, 0.6700),      (4.2380, 0.6000),
    (4.4240, 0.5400),      (4.6170, 0.4900),      (4.8180, 0.4450),
    (5.0270, 0.4050),      (5.2440, 0.3700),      (5.4700, 0.3350),
    (5.7040, 0.3050),      (5.9470, 0.2800),      (6.2000, 0.2550),
    (6.4620, 0.2350),      (6.7340, 0.2150),      (7.0170, 0.2000),
    (7.3100, 0.1850),      (7.6140, 0.1700),      (7.9300, 0.1580),
    (8.2580, 0.1460),      (8.5980, 0.1350),      (8.9510, 0.1250),
    (9.3180, 0.1160),      (9.6980, 0.1080),      (10.093, 0.1000),
    (10.504, 0.0940),      (10.930, 0.0880),      (11.372, 0.0820),
    (11.831, 0.0770),      (12.307, 0.0720),      (12.801, 0.0680),
    (13.314, 0.0640),      (13.846, 0.0600),      (14.398, 0.0570),
    (14.970, 0.0540),      (15.563, 0.0510),      (16.178, 0.0480),
    (16.815, 0.0455),      (17.475, 0.0430),      (18.159, 0.0405),
    (18.868, 0.0385),      (19.602, 0.0365),      (20.363, 0.0345),
    (21.151, 0.0330),      (21.967, 0.0315),      (22.812, 0.0300),
    (23.687, 0.0285),      (24.592, 0.0270),      (25.529, 0.0260),
    (26.498, 0.0250),      (27.501, 0.0240),      (28.539, 0.0230),
    (29.612, 0.0220),      (30.722, 0.0210),      (31.870, 0.0200),
]

# Diazed-størrelser fra datablad (DII, DIII, DIV)
DIAZED_SIZES = (2, 4, 6, 10, 13, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100)
DIAZED_CURVES = {In: DIAZED_CURVE_60 for In in DIAZED_SIZES}

# ================================================================
# NEOZED gG – 60 punkter (DO1/DO2/DO3 2…100 A)
# ================================================================

NEOZED_CURVE_60 = [
    (3.0000, 1.4000),     (3.1346, 1.24275),     (3.2753, 1.10316),
    (3.4223, 0.97926),      (3.5759, 0.86927),      (3.7364, 0.77163),
    (3.9041, 0.68496),      (4.0793, 0.60802),      (4.2624, 0.53973),
    (4.4537, 0.47911),      (4.6536, 0.42529),      (4.8625, 0.37752),
    (5.0807, 0.33603),      (5.3087, 0.30052),      (5.5470, 0.26875),
    (5.7959, 0.24035),      (6.0560, 0.21495),      (6.3278, 0.19223),
    (6.6118, 0.17191),      (6.9086, 0.15374),      (7.2187, 0.13749),
    (7.5426, 0.12296),      (7.8812, 0.10997),      (8.2349, 0.09834),
    (8.6045, 0.08795),      (8.9906, 0.07865),      (9.3941, 0.07034),
    (9.8158, 0.06291),      (10.2563, 0.05690),     (10.7166, 0.05189),
    (11.1976, 0.04732),     (11.7001, 0.04315),     (12.2252, 0.03935),
    (12.7739, 0.03589),     (13.3472, 0.03273),     (13.9463, 0.02984),
    (14.5722, 0.02722),     (15.2262, 0.02482),     (15.9096, 0.02263),
    (16.6236, 0.02064),     (17.3697, 0.01882),     (18.1492, 0.01717),
    (18.9638, 0.01565),     (19.8149, 0.01428),     (20.7042, 0.01315),
    (21.6334, 0.01215),     (22.6044, 0.01122),     (23.6189, 0.01037),
    (24.6789, 0.00957),     (25.7865, 0.00884),     (26.9438, 0.00817),
    (28.1531, 0.00755),     (29.4166, 0.00697),     (30.7369, 0.00644),
    (32.1164, 0.00595),     (33.5578, 0.00549),     (35.0639, 0.00508),
    (36.6376, 0.00469),     (38.2819, 0.00433),     (40.0000, 0.0400),
]

NEOZED_SIZES = (2, 4, 6, 10, 13, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100)
NEOZED_CURVES = {In: NEOZED_CURVE_60 for In in NEOZED_SIZES}

# ================================================================
# KNIVSIKRING gG (NH gG) – genbruger Diazed-kurven
# ================================================================

KNIV_SIZES = (25, 35, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400)
KNIV_CURVES = {In: DIAZED_CURVE_60 for In in KNIV_SIZES}

# ================================================================
# MCB B og C – analytiske modeller (genererer 60 punkter)
# ================================================================

def _mcb_B_time(m: float) -> float:
    """
    Tilnærmet Schneider/Siemens C60 B-kurve.
    m = Ik / In.
    """
    if m <= 1.45:
        # ingen udkobling indenfor 1 time under 1,45·In
        return 3600.0
    if m <= 2.55:
        # termisk område: t(1.45) ≈ 3600 s, t(2.55) ≈ 60 s
        p = 7.2526632648363
        return 3600.0 * (1.45 / m) ** p
    if m <= 5.0:
        # overgang termisk → magnetisk: t(2.55) ≈ 60 s, t(5) ≈ 0.4 s
        q = 4.74143567257599
        return 60.0 * (2.55 / m) ** q
    # hurtig magnetisk: t(5) ≈ 0.4 s, t(20) ≈ 0.012 s
    r = 2.5294468445267846
    return 0.4 * (5.0 / m) ** r


def _mcb_C_time(m: float) -> float:
    """
    Tilnærmet Schneider/Siemens C60 C-kurve.
    m = Ik / In.
    """
    if m <= 1.45:
        return 3600.0
    if m <= 2.55:
        # samme termiske del som B-kurven
        p = 7.2526632648363
        return 3600.0 * (1.45 / m) ** p
    if m <= 10.0:
        # overgang: t(2.55) ≈ 60 s, t(10) ≈ 0.12 s
        q = 4.54785634237691
        return 60.0 * (2.55 / m) ** q
    # magnetisk: t(10) ≈ 0.12 s, t(30) ≈ 0.009 s
    r = 2.3577627814322994
    return 0.12 * (10.0 / m) ** r


def _generate_mcb_curve(kind: str, n_points: int = 60):
    """
    Genererer n points (m, t)-punkter for MCB 'B' eller 'C'
    logaritmisk fordelt i m-aksen.
    """
    kind = kind.upper()
    if kind == "B":
        m_min, m_max, func = 1.45, 20.0, _mcb_B_time
    elif kind == "C":
        m_min, m_max, func = 1.45, 30.0, _mcb_C_time
    else:
        raise ValueError(f"Ukendt MCB-type: {kind}")

    log_min = math.log10(m_min)
    log_max = math.log10(m_max)

    points = []
    for i in range(n_points):
        log_m = log_min + (log_max - log_min) * i / (n_points - 1)
        m = 10 ** log_m
        t = func(m)
        points.append((round(m, 4), round(t, 4)))
    return points


# MCB-størrelser bruges kun til at vælge nærmeste In i log/mellemregning
MCB_SIZES = (6, 10, 13, 16, 20, 25, 32, 40, 50, 63)

MCB_B_CURVE_60 = _generate_mcb_curve("B", 60)
MCB_C_CURVE_60 = _generate_mcb_curve("C", 60)

MCB_B_CURVES = {In: MCB_B_CURVE_60 for In in MCB_SIZES}
MCB_C_CURVES = {In: MCB_C_CURVE_60 for In in MCB_SIZES}

# ================================================================
# Samlet database (producer-uafhængig: "Standard")
# ================================================================

FUSE_DB = {
    ("Standard", "Diazed gG"): {
        "Imin_factor": 5.0,
        "curves": DIAZED_CURVES,
    },
    ("Standard", "Neozed gG"): {
        "Imin_factor": 5.0,
        "curves": NEOZED_CURVES,
    },
    ("Standard", "Knivsikring gG"): {
        "Imin_factor": 5.0,
        "curves": KNIV_CURVES,
    },
    ("Standard", "MCB B"): {
        "Imin_factor": 5.0,
        "curves": MCB_B_CURVES,
    },
    ("Standard", "MCB C"): {
        "Imin_factor": 10.0,
        "curves": MCB_C_CURVES,
    },
}

# ================================================================
# Opslagsfunktion – bruges af main/group_calc
# ================================================================

def get_fuse_data(manu: str, fuse_type: str, In: float):
    """
    Finder nærmeste sikringskurve og Imin_factor for en given mærkestrøm.

    Parametre:
        manu       - producent (fx "Standard")
        fuse_type  - type (fx "Diazed gG", "Neozed gG", "Knivsikring gG", "MCB B", "MCB C")
        In         - mærkestrøm i A (float)

    Returnerer:
        (curve_points, In_curve, Imin_factor)
        - curve_points: liste af (m, t) – 60 punkter
        - In_curve: den mærkestrøm [A], som kurven faktisk stammer fra
        - Imin_factor: faktor til Ik,min (fx 5 eller 10)
    """
    key = (manu, fuse_type)
    data = FUSE_DB[key]
    curves = data["curves"]
    Imin_factor = data.get("Imin_factor", 5.0)

    In_int = int(round(In))
    nearest = min(curves.keys(), key=lambda k: abs(k - In_int))

    return curves[nearest], nearest, Imin_factor
