import os
import tkinter as tk
from tkinter import ttk

from calculations import (
    STANDARD_SIZES,
    lookup_Kt,
    INSTALL_METHODS,
    INSTALL_TEXTS,
)
from Tabel import INSTALLATIONSMETODER, KGRP, KGRP_ROW


class SegmentFrame(ttk.Frame):
    """
    Ét segment (både til stikledning og grupper).

    Indeholder:
      - installationsmetode (nr / reference)
      - længde
      - omgivelsestemperatur
      - antal belastede ledere
      - tværsnit
      - antal kabler samlet (ks) → kgrp
      - Kt (temperaturfaktor) og kgrp (samlefaktor) beregnet automatisk
    """

    def __init__(
        self,
        master,
        number: int,
        image_cache: dict,
        is_stikledning: bool = False,
        *args,
        **kwargs,
    ):
        # is_stikledning er kun et flag fra Main.py; ttk.Frame kender det ikke,
        # så vi gemmer det på objektet og sender resten videre til ttk.Frame.
        self.is_stikledning = is_stikledning
        super().__init__(master, *args, **kwargs)

        self.number = number
        self.image_cache = image_cache

        # interne felter
        self.install_nr = None          # installations-nummer fra Tabel.INSTALLATIONSMETODER
        self.ref_method = None          # reference-metode, fx "A1", "B1", "D2", ...
        self.Kt_value = 1.0
        self.kgrp_value = 1.0

        self._build_widgets()

    # ------------------------------------------------------------------
    # GUI-opbygning
    # ------------------------------------------------------------------
    def _build_widgets(self) -> None:
        # Overskrift
        title = ttk.Label(
            self,
            text=f"Segment {self.number}",
            font=("TkDefaultFont", 9, "bold"),
        )
        title.grid(row=0, column=0, sticky="w", padx=(0, 0), pady=(4, 2))

        # Installationsmetode
        ttk.Label(self, text="Installationsmetode:").grid(
            row=1, column=0, sticky="w"
        )

        self.install_combo = ttk.Combobox(
            self,
            values=INSTALL_TEXTS,
            state="readonly",
            width=55,
        )
        self.install_combo.current(0)
        self.install_combo.grid(row=1, column=1, columnspan=4, sticky="w")
        self.install_combo.bind("<<ComboboxSelected>>", self.on_install_change)

        # ------------------------------------------------------------
        # Billede (venstre) – kan være tomt
        # ------------------------------------------------------------
        self.image_label = ttk.Label(self)
        self.image_label.grid(row=2, column=0, rowspan=3, sticky="w", pady=(4, 2))

        # ------------------------------------------------------------
        # Længde, temperatur, belastede ledere, tværsnit
        # ------------------------------------------------------------
        ttk.Label(self, text="Længde [m]:").grid(row=2, column=1, sticky="w")
        self.length_var = tk.StringVar(value="0")
        ttk.Entry(self, textvariable=self.length_var, width=8).grid(
            row=2, column=2, sticky="w"
        )

        ttk.Label(self, text="T omgivelse [°C]:").grid(row=2, column=3, sticky="w")
        self.temp_var = tk.StringVar(value="30")
        ttk.Entry(self, textvariable=self.temp_var, width=5).grid(
            row=2, column=4, sticky="w"
        )

        ttk.Label(self, text="Belastede ledere:").grid(row=3, column=1, sticky="w")
        self.cores_var = tk.StringVar(value="3")
        self.cores_combo = ttk.Combobox(
            self,
            textvariable=self.cores_var,
            values=["1", "2", "3", "4"],
            state="readonly",
            width=3,
        )
        self.cores_combo.grid(row=3, column=2, sticky="w")
        self.cores_combo.bind("<<ComboboxSelected>>", self.on_cores_change)

        ttk.Label(self, text="Tværsnit [mm²]:").grid(row=3, column=3, sticky="w")
        self.area_var = tk.StringVar(value="1.5")

        # Liste over tværsnit, formatteret uden .0 når tallet er helt
        area_values = []
        for s in STANDARD_SIZES:
            if float(s).is_integer():
                area_values.append(str(int(s)))
            else:
                area_values.append(str(s))

        ttk.Combobox(
            self,
            textvariable=self.area_var,
            values=area_values,
            state="readonly",
            width=8,
        ).grid(row=3, column=4, sticky="w")

        # ------------------------------------------------------------
        # Antal kabler samlet (ks) → kgrp – liste som i tabel B.52.17
        # ------------------------------------------------------------
        ttk.Label(self, text="Antal kabler samlet (ks):").grid(
            row=4, column=1, sticky="w"
        )

        # brug samme n-værdier som i KGRP_ROW: 1,2,3,4,5,6,7,8,9,12,16,20
        ks_values = sorted(KGRP_ROW.keys())
        ks_texts = [str(n) for n in ks_values]

        self.n_samlet_var = tk.StringVar(value="1")
        self.n_samlet_combo = ttk.Combobox(
            self,
            textvariable=self.n_samlet_var,
            values=ks_texts,
            state="readonly",
            width=5,
        )
        self.n_samlet_combo.grid(row=4, column=2, sticky="w")
        self.n_samlet_combo.current(0)
        self.n_samlet_combo.bind("<<ComboboxSelected>>", lambda e: self.update_Kt())

        # Kt og kgrp vises som labels (auto)
        self.lbl_Kt = ttk.Label(self, text="Kt (auto): 1.00")
        self.lbl_Kt.grid(row=4, column=3, sticky="w")

        self.lbl_kgrp = ttk.Label(self, text="kgrp (auto): 1.00 (ingen samlet)")
        self.lbl_kgrp.grid(row=4, column=4, sticky="w")

        # Start med første installationsmetode
        self.on_install_change(None)

    # ------------------------------------------------------------------
    # Håndtering af installationsmetode
    # ------------------------------------------------------------------
    def on_install_change(self, event=None) -> None:
        """
        Når brugeren vælger en installationsmetode i comboboxen.
        INSTALL_METHODS indeholder (nr, ref, tekst).
        """
        index = self.install_combo.current()
        if index < 0 or index >= len(INSTALL_METHODS):
            return

        nr, ref, _text = INSTALL_METHODS[index]
        self.install_nr = nr
        self.ref_method = ref

        # Find billednavn i INSTALLATIONSMETODER (fra Tabel.py), hvis det findes
        img_path = None
        inst_data = INSTALLATIONSMETODER.get(nr, {})
        if isinstance(inst_data, dict):
            img_path = inst_data.get("filnavn")  # kan være None, hvis ikke brugt

        # Indlæs og vis billedet, hvis der er angivet et filnavn
        if img_path:
            full_path = os.path.join(os.path.dirname(__file__), "billeder", img_path)
            if full_path in self.image_cache:
                img = self.image_cache[full_path]
            else:
                if os.path.exists(full_path):
                    img = tk.PhotoImage(file=full_path)
                    self.image_cache[full_path] = img
                else:
                    img = None
            self.image_label.configure(image=img)
            self.image_label.image = img
        else:
            # Ingen billede til denne metode
            self.image_label.configure(image="")
            self.image_label.image = None

        # Opdater Kt ud fra installationsmetode + temperatur
        self.update_Kt()

    # ------------------------------------------------------------------
    # Håndtering af belastede ledere (cores)
    # ------------------------------------------------------------------
    def on_cores_change(self, event=None) -> None:
        self.update_Kt()

    # Ekstra helper brugt fra GroupFrameBase, så fasevalg kan styre "belastede ledere"
    def set_cores_for_phase(self, phase: str) -> None:
        """
        Sætter 'Belastede ledere' ud fra fasesystem:
          - 1-faset -> 2 belastede
          - 3-faset -> 3 belastede
        """
        if phase == "1-faset":
            value = "2"
        else:
            value = "3"
        self.cores_var.set(value)
        self.update_Kt()

    # ------------------------------------------------------------------
    # Beregning af Kt og kgrp
    # ------------------------------------------------------------------
    def update_Kt(self) -> None:
        """
        Opdaterer Kt (temperaturfaktor) og kgrp (samlefaktor) ud fra
        den valgte installationsmetode, temperatur og antal kabler samlet (ks).
        """
        # Temperatur
        try:
            temp = float(self.temp_var.get().replace(",", "."))
        except ValueError:
            temp = 30.0

        # Miljø (luft / jord) slåes op i INSTALLATIONSMETODER via installationsnummer
        env = "luft"
        if self.install_nr is not None:
            inst_data = INSTALLATIONSMETODER.get(self.install_nr, {})
            if isinstance(inst_data, dict):
                env = inst_data.get("miljo", "luft")

        # Kt fra tabel – afhænger af miljø + temperatur
        try:
            self.Kt_value = lookup_Kt(env, temp)
        except Exception:
            # fallback hvis der skulle ske noget uventet
            self.Kt_value = 1.0
        self.lbl_Kt.config(text=f"Kt (auto): {self.Kt_value:.2f}")

        # kgrp fra KGRP-tabellen. Vi bruger reference-metoden (A1, B1, D2, ...)
        try:
            n_samlet = int(self.n_samlet_var.get())
        except ValueError:
            n_samlet = 1

        ref = self.ref_method or "C"
        kgrp_table = KGRP.get(ref, {})
        faktor = 1.0
        if isinstance(kgrp_table, dict) and n_samlet >= 1:
            # brug nærmeste lavere n i tabellen
            ns = sorted(kgrp_table.keys())
            candidates = [n for n in ns if n <= n_samlet]
            if candidates:
                faktor = kgrp_table[max(candidates)]
        self.kgrp_value = faktor

        if n_samlet <= 1:
            txt = "1.00 (ingen samlet)"
        else:
            txt = f"{self.kgrp_value:.2f} (n={n_samlet})"

        self.lbl_kgrp.config(text=f"kgrp (auto): {txt}")

    # ------------------------------------------------------------------
    # Data til beregning (udlæses af Main / group_calc)
    # ------------------------------------------------------------------
    def get_data(self) -> dict:
        """
        Returnerer en dict med alle nødvendige data til beregninger.

        {
            "nr": segmentnummer (1,2,...),
            "ref_method": installationsreference (fx "C", "D1", ...),
            "length": længde i meter (float),
            "temp": temp. i °C (float),
            "cores": belastede ledere (int),
            "area": valgt tværsnit (mm², float),
            "Kt": Kt-faktor (float),
            "kgrp": samlefaktor (float),
        }
        """
        try:
            length = float(self.length_var.get().replace(",", "."))
        except ValueError:
            raise ValueError(f"Segment {self.number}: Ugyldig længde.")

        try:
            temp = float(self.temp_var.get().replace(",", "."))
        except ValueError:
            raise ValueError(f"Segment {self.number}: Ugyldig temperatur.")

        try:
            cores = int(self.cores_var.get())
        except ValueError:
            raise ValueError(
                f"Segment {self.number}: Ugyldigt antal belastede ledere."
            )

        try:
            area = float(self.area_var.get().replace(",", "."))
        except ValueError:
            raise ValueError(f"Segment {self.number}: Ugyldigt tværsnit.")

        return {
            "nr": self.number,
            "ref_method": self.ref_method,
            "length": length,
            "temp": temp,
            "cores": cores,
            "area": area,
            "Kt": self.Kt_value,
            "kgrp": self.kgrp_value,
        }
