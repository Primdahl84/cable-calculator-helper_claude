# tables.py
# Her samler vi alle tabeller til overbelastningsberegning.

# -------------------------------------------------------------
# INSTALLATIONSMETODER (tabel A.52.3)
# nummer -> reference-metode + miljø + Kj + beskrivelse
# -------------------------------------------------------------

INSTALLATIONSMETODER = {
    # 1–9
    1: {
        "reference": "A1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Isolerede ledere eller enlederkabler i rør i en termisk isoleret væg",
        "særlige_betingelser": "",
    },
    2: {
        "reference": "A2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Flerlederkabler i rør i en termisk isoleret væg",
        "særlige_betingelser": "",
    },
    3: {
        "reference": "A1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Flerlederkabel direkte i en termisk isoleret væg",
        "særlige_betingelser": "",
    },
    4: {
        "reference": "B1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Isolerede ledere eller enlederkabler i rør på en væg af træ eller murværk "
            "eller placeret i en afstand mindre end 0,3 × rørdiameteren fra den"
        ),
        "særlige_betingelser": "",
    },
    5: {
        "reference": "B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Flerlederkabler i rør på en væg af træ eller murværk "
            "eller placeret i en afstand mindre end 0,3 × rørdiameteren fra den"
        ),
        "særlige_betingelser": "",
    },
    6: {
        "reference": "B1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Isolerede ledere eller enlederkabler i kabelkanal (inkl. kabelkanal med flere rum) "
            "på en væg af træ eller murværk – vandret eller lodret forløb"
        ),
        "særlige_betingelser": "",
    },
    7: {
        "reference": "B1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Isolerede ledere eller enlederkabler i kabelkanal (inkl. kabelkanal med flere rum) "
            "på en væg af træ eller murværk – vandret eller lodret forløb"
        ),
        "særlige_betingelser": "",
    },
    8: {
        "reference": "B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Flerlederkabler i kabelkanal (inkl. kabelkanal med flere rum) "
            "på en væg af træ eller murværk – vandret eller lodret forløb"
        ),
        "særlige_betingelser": "Under overvejelse – installationsmetode B2 kan anvendes.",
    },
    9: {
        "reference": "B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Flerlederkabler i kabelkanal (inkl. kabelkanal med flere rum) "
            "på en væg af træ eller murværk – vandret eller lodret forløb"
        ),
        "særlige_betingelser": "Under overvejelse – installationsmetode B2 kan anvendes.",
    },

    # 10–12
    10: {
        "reference": "B1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Isolerede ledere eller enlederkabler i ophængt kabelkanal",
        "særlige_betingelser": "",
    },
    11: {
        "reference": "B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Flerlederkabel i ophængt kabelkanal",
        "særlige_betingelser": "",
    },
    12: {
        "reference": "A1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Isolerede ledere eller enlederkabler i profilliste",
        "særlige_betingelser": "",
    },

    # 13–14 – ikke anvendt
    13: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 13 i tabellen)",
        "særlige_betingelser": "",
    },
    14: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 14 i tabellen)",
        "særlige_betingelser": "",
    },

    # 15–16
    15: {
        "reference": "A1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Isolerede ledere i rør eller enlederkabler eller flerlederkabler i dørindfatning"
        ),
        "særlige_betingelser": "",
    },
    16: {
        "reference": "A1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Isolerede ledere i rør eller enlederkabler eller flerlederkabler i vinduesrammer"
        ),
        "særlige_betingelser": "",
    },

    # 17–19 – ikke anvendt
    17: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 17 i tabellen)",
        "særlige_betingelser": "",
    },
    18: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 18 i tabellen)",
        "særlige_betingelser": "",
    },
    19: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 19 i tabellen)",
        "særlige_betingelser": "",
    },

    # 20–23
    20: {
        "reference": "C",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabler fastgjort på eller placeret i en afstand "
            "mindre end 0,3 × kabeldiameteren fra en væg af træ eller murværk"
        ),
        "særlige_betingelser": "",
    },
    21: {
        "reference": "C",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabler fastgjort direkte under et loft af træ eller murværk"
        ),
        "særlige_betingelser": "Skal anvendes sammen med nr. 3 i tabel B.52.17.",
    },
    22: {
        "reference": "E",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Enleder- eller flerlederkabler fastgjort i en afstand fra et loft",
        "særlige_betingelser": "Under overvejelse – installationsmetode E kan anvendes.",
    },
    23: {
        "reference": "C",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Fast installation af nedhængt strømforbrugende materiel",
        "særlige_betingelser": "Skal anvendes sammen med nr. 3 i tabel B.52.17.",
    },

    # 24–29 – ikke anvendt
    24: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 24 i tabellen)",
        "særlige_betingelser": "",
    },
    25: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 25 i tabellen)",
        "særlige_betingelser": "",
    },
    26: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 26 i tabellen)",
        "særlige_betingelser": "",
    },
    27: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 27 i tabellen)",
        "særlige_betingelser": "",
    },
    28: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 28 i tabellen)",
        "særlige_betingelser": "",
    },
    29: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 29 i tabellen)",
        "særlige_betingelser": "",
    },

    # 30–36 – kabelbakker, stiger osv.
    30: {
        "reference": "C",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabler på uperforerede kabelbakker "
            "fremført vandret eller lodret"
        ),
        "særlige_betingelser": "C sammen med nr. 2 i tabel B.52.17.",
    },
    31: {
        "reference": "E/F",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabler på perforerede kabelbakker "
            "fremført vandret eller lodret"
        ),
        "særlige_betingelser": "Reference: E eller F.",
    },
    32: {
        "reference": "E/F",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabler på kabelknægte eller på kabelbakker af trådnet "
            "fremført vandret eller lodret"
        ),
        "særlige_betingelser": "Reference: E eller F.",
    },
    33: {
        "reference": "E/F/G",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabler i en større afstand end 0,3 gange kabeldiameteren "
            "fra en væg"
        ),
        "særlige_betingelser": "Reference: E eller F eller metode G.",
    },
    34: {
        "reference": "E/F",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Enleder- eller flerlederkabler på stiger",
        "særlige_betingelser": "Reference: E eller F.",
    },
    35: {
        "reference": "E/F",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabel nedhængt fra eller bygget sammen med en bærertråd"
        ),
        "særlige_betingelser": "Reference: E eller F.",
    },
    36: {
        "reference": "G",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Blottede eller isolerede ledere på isolatorer",
        "særlige_betingelser": "",
    },

    # 37–39 – ikke anvendt
    37: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 37 i tabellen)",
        "særlige_betingelser": "",
    },
    38: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 38 i tabellen)",
        "særlige_betingelser": "",
    },
    39: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 39 i tabellen)",
        "særlige_betingelser": "",
    },

    # 40–47 – bygningshulrum, kabelkanaler i murværk
    40: {
        "reference": "B1/B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Enleder- eller flerlederkabler i et bygningshulrum",
        "særlige_betingelser": "1,5·De ≤ V < 5·De ⇒ B2; 5·De ≤ V < 20·De ⇒ B1.",
    },
    41: {
        "reference": "B1/B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Isoleret leder i rør i et bygningshulrum",
        "særlige_betingelser": "1,5·De ≤ V < 20·De ⇒ B2; V ≥ 20·De ⇒ B1.",
    },
    42: {
        "reference": "B1/B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Enleder- eller flerlederkabler i rør i et bygningshulrum",
        "særlige_betingelser": (
            "Under overvejelse – følgende kan anvendes: 1,5·De ≤ V < 20·De ⇒ B2; V ≥ 20·De ⇒ B1."
        ),
    },
    43: {
        "reference": "B1/B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Isolerede ledere i lukket kabelkanal i et bygningshulrum",
        "særlige_betingelser": "1,5·De ≤ V < 20·De ⇒ B2; V ≥ 20·De ⇒ B1.",
    },
    44: {
        "reference": "B1/B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Enleder- eller flerlederkabel i lukket kabelkanal i et bygningshulrum",
        "særlige_betingelser": (
            "Under overvejelse – følgende kan anvendes: 1,5·De ≤ V < 20·De ⇒ B2; V ≥ 20·De ⇒ B1."
        ),
    },
    45: {
        "reference": "B1/B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Isolerede ledere i lukket kabelkanal i murværk med en termisk modstand på højst 2 K·m/W"
        ),
        "særlige_betingelser": "1,5·De ≤ V < 5·De ⇒ B2; 5·De ≤ V < 50·De ⇒ B1.",
    },
    46: {
        "reference": "B1/B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabler i lukket kabelkanal i murværk med en termisk "
            "modstand på højst 2 K·m/W"
        ),
        "særlige_betingelser": (
            "Under overvejelse – følgende kan anvendes: 1,5·De ≤ V < 20·De ⇒ B2; V ≥ 20·De ⇒ B1."
        ),
    },
    47: {
        "reference": "B1/B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Enleder- eller flerlederkabel i et lofthulrum eller under et hævet gulv",
        "særlige_betingelser": "1,5·De ≤ V < 5·De ⇒ B2; 5·De ≤ V < 50·De ⇒ B1.",
    },

    # 48–49 – ikke anvendt
    48: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 48 i tabellen)",
        "særlige_betingelser": "",
    },
    49: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 49 i tabellen)",
        "særlige_betingelser": "",
    },

    # 50–57 – gulvkanaler mv.
    50: {
        "reference": "B1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Isolerede ledere eller enlederkabel i planforsænket gulvkanal",
        "særlige_betingelser": "",
    },
    51: {
        "reference": "B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Flerlederkabel i planforsænket gulvkanal",
        "særlige_betingelser": "",
    },
    52: {
        "reference": "B1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Isolerede ledere eller enlederkabler i planforsænket kabelkanal",
        "særlige_betingelser": "",
    },
    53: {
        "reference": "B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Flerlederkabel i planforsænket kabelkanal",
        "særlige_betingelser": "",
    },
    54: {
        "reference": "B1/B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Isolerede ledere eller enlederkabler i en uventileret kabelkanal fremført "
            "vandret eller lodret"
        ),
        "særlige_betingelser": "1,5·De ≤ V < 20·De ⇒ B2; V ≥ 20·De ⇒ B1.",
    },
    55: {
        "reference": "B1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Isolerede ledere i rør i en åben eller ventileret kabelkanal i gulv",
        "særlige_betingelser": "",
    },
    56: {
        "reference": "B1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabel med kappe i en åben eller ventileret kabelkanal "
            "fremført vandret eller lodret"
        ),
        "særlige_betingelser": "",
    },
    57: {
        "reference": "C",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabler direkte i murværk med en termisk modstand "
            "på højst 2 K·m/W uden supplerende mekanisk beskyttelse"
        ),
        "særlige_betingelser": "",
    },

    # 58–60 – murværk med/uden rør
    58: {
        "reference": "C",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": (
            "Enleder- eller flerlederkabler direkte i murværk med en termisk modstand "
            "på højst 2 K·m/W med supplerende mekanisk beskyttelse"
        ),
        "særlige_betingelser": "",
    },
    59: {
        "reference": "B1",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Isolerede ledere eller enlederkabler i rør i murværk",
        "særlige_betingelser": "",
    },
    60: {
        "reference": "B2",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "Flerlederkabler i rør i murværk",
        "særlige_betingelser": "",
    },

    # 61–69 – ikke anvendt
    61: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 61 i tabellen)",
        "særlige_betingelser": "",
    },
    62: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 62 i tabellen)",
        "særlige_betingelser": "",
    },
    63: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 63 i tabellen)",
        "særlige_betingelser": "",
    },
    64: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 64 i tabellen)",
        "særlige_betingelser": "",
    },
    65: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 65 i tabellen)",
        "særlige_betingelser": "",
    },
    66: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 66 i tabellen)",
        "særlige_betingelser": "",
    },
    67: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 67 i tabellen)",
        "særlige_betingelser": "",
    },
    68: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 68 i tabellen)",
        "særlige_betingelser": "",
    },
    69: {
        "reference": "",
        "miljo": "luft",
        "kj": 1.0,
        "beskrivelse": "IKKE ANVENDT (ingen installationsmetode nr. 69 i tabellen)",
        "særlige_betingelser": "",
    },

    # 70–73 – jord
    70: {
        "reference": "D1",
        "miljo": "jord",
        "kj": 1.0,
        "beskrivelse": "Flerlederkabel i rør eller i lukket kabelkanal i jord",
        "særlige_betingelser": "",
    },
    71: {
        "reference": "D1",
        "miljo": "jord",
        "kj": 1.0,
        "beskrivelse": "Enlederkabel i rør eller i lukket kabelkanal i jord",
        "særlige_betingelser": "",
    },
    72: {
        "reference": "D2",
        "miljo": "jord",
        "kj": 1.5,
        "beskrivelse": (
            "Enleder- eller flerlederkabler med kappe direkte i jord uden supplerende mekanisk "
            "beskyttelse"
        ),
        "særlige_betingelser": "",
    },
    73: {
        "reference": "D2",
        "miljo": "jord",
        "kj": 1.5,
        "beskrivelse": (
            "Enleder- eller flerlederkabler med kappe direkte i jord med supplerende mekanisk "
            "beskyttelse"
        ),
        "særlige_betingelser": "",
    },
}


# -------------------------------------------------------------
# STRØMVÆRDIER (Iz) – anneks B
# Struktur: IZ_TABLE[reference_metode][antal_ledere][areal_mm2] = Iz [A]
# -------------------------------------------------------------

IZ_TABLE = {
    "A1": {
        2: {  # 2 belastede ledere – Tabel B.52.3, kobber
            1.5: 19,
            2.5: 26,
            4: 35,
            6: 45,
            10: 61,
            16: 81,
            25: 106,
            35: 131,
            50: 158,
            70: 200,
            95: 241,
            120: 278,
            150: 318,
            185: 362,
            240: 424,
            300: 486,
        },
        3: {  # 3 belastede ledere – Tabel B.52.5, kobber
            1.5: 17,
            2.5: 23,
            4: 31,
            6: 40,
            10: 54,
            16: 73,
            25: 95,
            35: 117,
            50: 141,
            70: 179,
            95: 216,
            120: 249,
            150: 285,
            185: 324,
            240: 380,
            300: 435,
        },
    },

    "A2": {
        2: {
            1.5: 18.5,
            2.5: 25,
            4: 33,
            6: 42,
            10: 57,
            16: 76,
            25: 99,
            35: 121,
            50: 145,
            70: 183,
            95: 220,
            120: 253,
            150: 290,
            185: 329,
            240: 386,
            300: 442,
        },
        3: {
            1.5: 16.5,
            2.5: 22,
            4: 30,
            6: 38,
            10: 51,
            16: 68,
            25: 89,
            35: 109,
            50: 130,
            70: 164,
            95: 197,
            120: 227,
            150: 259,
            185: 295,
            240: 346,
            300: 396,
        },
    },

    "B1": {
        2: {
            1.5: 23,
            2.5: 31,
            4: 42,
            6: 54,
            10: 75,
            16: 100,
            25: 133,
            35: 164,
            50: 198,
            70: 253,
            95: 306,
            120: 354,
            150: 393,
            185: 449,
            240: 528,
            300: 603,
        },
        3: {
            1.5: 20,
            2.5: 28,
            4: 37,
            6: 48,
            10: 66,
            16: 88,
            25: 117,
            35: 144,
            50: 175,
            70: 222,
            95: 269,
            120: 312,
            150: 342,
            185: 384,
            240: 450,
            300: 514,
        },
    },

    "B2": {
        2: {
            1.5: 22,
            2.5: 30,
            4: 40,
            6: 51,
            10: 69,
            16: 91,
            25: 119,
            35: 146,
            50: 175,
            70: 221,
            95: 265,
            120: 305,
            150: 334,
            185: 384,
            240: 459,
            300: 532,
        },
        3: {
            1.5: 19.5,
            2.5: 26,
            4: 35,
            6: 44,
            10: 60,
            16: 80,
            25: 105,
            35: 128,
            50: 154,
            70: 194,
            95: 233,
            120: 268,
            150: 300,
            185: 340,
            240: 398,
            300: 455,
        },
    },

    "C": {
        2: {
            1.5: 24,
            2.5: 33,
            4: 45,
            6: 58,
            10: 80,
            16: 107,
            25: 138,
            35: 171,
            50: 209,
            70: 269,
            95: 328,
            120: 382,
            150: 441,
            185: 506,
            240: 599,
            300: 693,
        },
        3: {
            1.5: 22,
            2.5: 30,
            4: 40,
            6: 52,
            10: 71,
            16: 96,
            25: 119,
            35: 147,
            50: 179,
            70: 229,
            95: 278,
            120: 322,
            150: 371,
            185: 424,
            240: 500,
            300: 576,
        },
    },

    "D1": {
        2: {
            1.5: 25,
            2.5: 33,
            4: 43,
            6: 53,
            10: 71,
            16: 91,
            25: 116,
            35: 139,
            50: 164,
            70: 203,
            95: 239,
            120: 271,
            150: 306,
            185: 343,
            240: 395,
            300: 446,
        },
        3: {
            1.5: 21,
            2.5: 28,
            4: 36,
            6: 44,
            10: 58,
            16: 75,
            25: 96,
            35: 115,
            50: 135,
            70: 157,
            95: 197,
            120: 223,
            150: 251,
            185: 281,
            240: 324,
            300: 365,
        },
    },

    "D2": {
        2: {
            1.5: 27,
            2.5: 35,
            4: 46,
            6: 58,
            10: 77,
            16: 100,
            25: 129,
            35: 155,
            50: 183,
            70: 225,
            95: 270,
            120: 306,
            150: 343,
            185: 387,
            240: 448,
            300: 502,
        },
        3: {
            1.5: 23,
            2.5: 30,
            4: 39,
            6: 49,
            10: 65,
            16: 84,
            25: 107,
            35: 129,
            50: 153,
            70: 188,
            95: 226,
            120: 257,
            150: 287,
            185: 324,
            240: 375,
            300: 419,
        },
    },
}

# Strømværdier for ALUMINIUM-ledere (Iz) – Tabel B.52.3 og B.52.5
# Struktur: IZ_TABLE_AL[reference_metode][antal_belastede_ledere][areal_mm2] = Iz [A]

IZ_TABLE_AL = {
    "A1": {
        2: {  # 2 belastede ledere – Tabel B.52.3, aluminium
            2.5: 20,
            4: 27,
            6: 35,
            10: 48,
            16: 64,
            25: 84,
            35: 103,
            50: 125,
            70: 158,
            95: 191,
            120: 220,
            150: 253,
            185: 288,
            240: 338,
            300: 387,
        },
        3: {  # 3 belastede ledere – Tabel B.52.5, aluminium
            2.5: 19,
            4: 25,
            6: 32,
            10: 44,
            16: 58,
            25: 76,
            35: 94,
            50: 113,
            70: 142,
            95: 171,
            120: 197,
            150: 226,
            185: 256,
            240: 300,
            300: 344,
        },
    },

    "A2": {
        2: {
            2.5: 19.5,
            4: 26,
            6: 33,
            10: 45,
            16: 60,
            25: 78,
            35: 96,
            50: 115,
            70: 145,
            95: 175,
            120: 201,
            150: 230,
            185: 262,
            240: 307,
            300: 352,
        },
        3: {
            2.5: 18,
            4: 24,
            6: 31,
            10: 41,
            16: 55,
            25: 71,
            35: 87,
            50: 104,
            70: 131,
            95: 157,
            120: 180,
            150: 206,
            185: 233,
            240: 273,
            300: 313,
        },
    },

    "B1": {
        2: {
            2.5: 25,
            4: 33,
            6: 43,
            10: 59,
            16: 79,
            25: 105,
            35: 130,
            50: 157,
            70: 200,
            95: 242,
            120: 281,
            150: 307,
            185: 351,
            240: 412,
            300: 471,
        },
        3: {
            2.5: 22,
            4: 29,
            6: 38,
            10: 52,
            16: 71,
            25: 93,
            35: 116,
            50: 140,
            70: 179,
            95: 217,
            120: 251,
            150: 267,
            185: 300,
            240: 351,
            300: 402,
        },
    },

    "B2": {
        2: {
            2.5: 23,
            4: 31,
            6: 40,
            10: 54,
            16: 72,
            25: 94,
            35: 115,
            50: 138,
            70: 175,
            95: 210,
            120: 242,
            150: 261,
            185: 300,
            240: 358,
            300: 415,
        },
        3: {
            2.5: 21,
            4: 28,
            6: 35,
            10: 48,
            16: 64,
            25: 84,
            35: 103,
            50: 124,
            70: 156,
            95: 188,
            120: 216,
            150: 240,
            185: 272,
            240: 318,
            300: 364,
        },
    },

    "C": {
        2: {
            2.5: 26,
            4: 35,
            6: 45,
            10: 62,
            16: 84,
            25: 101,
            35: 126,
            50: 154,
            70: 198,
            95: 241,
            120: 280,
            150: 324,
            185: 371,
            240: 439,
            300: 508,
        },
        3: {
            2.5: 24,
            4: 32,
            6: 41,
            10: 57,
            16: 76,
            25: 90,
            35: 112,
            50: 136,
            70: 174,
            95: 211,
            120: 245,
            150: 283,
            185: 323,
            240: 382,
            300: 440,
        },
    },

    "D1": {
        2: {
            2.5: 26,
            4: 33,
            6: 42,
            10: 55,
            16: 71,
            25: 90,
            35: 108,
            50: 128,
            70: 158,
            95: 186,
            120: 211,
            150: 238,
            185: 267,
            240: 307,
            300: 346,
        },
        3: {
            2.5: 22,
            4: 28,
            6: 35,
            10: 46,
            16: 59,
            25: 75,
            35: 90,
            50: 106,
            70: 130,
            95: 154,
            120: 174,
            150: 197,
            185: 220,
            240: 253,
            300: 286,
        },
    },

    "D2": {
        2: {
            # Bemærk: i tabellen er D2 kun angivet fra 16 mm² og op for aluminium
            16: 76,
            25: 98,
            35: 117,
            50: 139,
            70: 170,
            95: 204,
            120: 233,
            150: 261,
            185: 296,
            240: 343,
            300: 386,
        },
        3: {
            16: 64,
            25: 82,
            35: 98,
            50: 117,
            70: 144,
            95: 172,
            120: 197,
            150: 220,
            185: 250,
            240: 290,
            300: 326,
        },
    },
}

# E, F og G kan du evt. tilføje senere (de bruger andre tabeller: B.52.10–B.52.12)

# -------------------------------------------------------------
# Ktemp – temperaturkorrektion
# -------------------------------------------------------------

KTEMP_LUFT = {
    # omgivelsestemperatur [°C]: Ktemp
    10.0: 1.15,
    15.0: 1.12,
    20.0: 1.08,
    25.0: 1.04,
    30.0: 1.00,
    35.0: 0.96,
    40.0: 0.91,
    45.0: 0.87,
    50.0: 0.82,
    55.0: 0.76,
    60.0: 0.71,
    65.0: 0.65,
    70.0: 0.58,
    75.0: 0.50,
    80.0: 0.41,
    # Tilføj evt. flere temperaturer her
}

KTEMP_JORD = {
    # jordtemperatur [°C]: Ktemp
    10.0: 1.07,
    15.0: 1.04,
    20.0: 1.00,
    25.0: 0.96,
    30.0: 0.93,
    35.0: 0.89,
    40.0: 0.85,
    45.0: 0.80,
    50.0: 0.76,
    55.0: 0.71,
    60.0: 0.65,
    65.0: 0.60,
    70.0: 0.53,
    75.0: 0.46,
    80.0: 0.38,
    # Tilføj evt. flere temperaturer her
}

# -------------------------------------------------------------
# Kgrp – grupperingsfaktorer
# -------------------------------------------------------------

KGRP_ROW = {
    1: 1.00,
    2: 0.80,
    3: 0.70,
    4: 0.65,
    5: 0.60,
    6: 0.57,
    7: 0.54,
    8: 0.52,
    9: 0.50,
    12: 0.45,
    16: 0.41,
    20: 0.38,
}

KGRP = {
    "A1": dict(KGRP_ROW),
    "A2": dict(KGRP_ROW),
    "B1": dict(KGRP_ROW),
    "B2": dict(KGRP_ROW),
    "C": dict(KGRP_ROW),
    "D1": dict(KGRP_ROW),
    "D2": dict(KGRP_ROW),
}

# -------------------------------------------------------------
# NKT-kabeldata – R1 og X1 (50 Hz, 20°C) NOIKLX/NOIK/NOIKSLX
# Enhed: ohm/km
# -------------------------------------------------------------

NKT_R = {
    "Cu": {
        1.5: 12.10,
        2.5: 7.410,
        4.0: 4.610,
        6.0: 3.080,
        10.0: 1.830,
        16.0: 1.150,
        25.0: 0.727,
        35.0: 0.525,
        50.0: 0.388,
        70.0: 0.269,
        95.0: 0.194,
        120.0: 0.155,
        150.0: 0.126,
        185.0: 0.1017,
        240.0: 0.0787,
        300.0: 0.103,
    },
    "Al": {
        16.0: 1.910,
        25.0: 1.200,
        35.0: 0.868,
        50.0: 0.641,
        70.0: 0.444,
        95.0: 0.321,
        120.0: 0.254,
        150.0: 0.207,
        185.0: 0.166,
        240.0: 0.127,
        300.0: 0.103,
    },
}

NKT_XL = {
    "Cu": {
        "3-leder": {
            1.5: 0.103,
            2.5: 0.095,
            4.0: 0.089,
            6.0: 0.087,
            10.0: 0.082,
            16.0: 0.078,
            25.0: 0.074,
            35.0: 0.073,
            50.0: 0.070,
            70.0: 0.067,
            95.0: 0.065,
            120.0: 0.064,
            150.0: 0.063,
            185.0: 0.062,
            240.0: 0.061,
            300.0: 0.060,
        },
        "4-leder": {
            1.5: 0.110,
            2.5: 0.102,
            4.0: 0.096,
            6.0: 0.094,
            10.0: 0.089,
            16.0: 0.085,
            25.0: 0.086,
            35.0: 0.082,
            50.0: 0.084,
            70.0: 0.081,
            95.0: 0.082,
            120.0: 0.082,
            150.0: 0.084,
            185.0: 0.082,
            240.0: 0.083,
            300.0: 0.083,
        },
    },
    "Al": {
        "4-leder": {
            16.0: 0.089,
            25.0: 0.086,
            35.0: 0.082,
            50.0: 0.084,
            70.0: 0.081,
            95.0: 0.082,
            120.0: 0.082,
            150.0: 0.084,
            185.0: 0.082,
            240.0: 0.083,
            300.0: 0.083,
        }
    },
}
