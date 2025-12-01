import tkinter as tk
from tkinter import ttk

from segment_frame import SegmentFrame


class GroupFrameBase(ttk.LabelFrame):
    """Grund-GUI for én gruppe (MODEL A).

    Denne klasse indeholder kun widgets / layout og simple hjælpefunktioner.
    Selve beregningen ligger i GroupCalcMixin (se group_calc.py) og kaldes
    typisk via knappen "Beregn gruppe" i GroupFrame.
    """

    def __init__(
        self,
        master,
        number,
        stik_data_ref,
        e_Kj,
        e_Ik_trafo,
        e_cos_trafo,
        image_cache,
        e_In_main,
        c_phase_main,
        e_cos_load_main,
        text_mellem,
        *args,
        **kwargs,
    ):
        # LabelFrame-tekst bliver fx "Gruppe W2"
        super().__init__(master, text=f"Gruppe W{number+1}", *args, **kwargs)

        # Referencer til hoved-data
        self.number = number
        self.stik_data_ref = stik_data_ref
        self.e_Kj = e_Kj
        self.e_Ik_trafo = e_Ik_trafo
        self.e_cos_trafo = e_cos_trafo
        self.e_In_main = e_In_main
        self.c_phase_main = c_phase_main
        self.e_cos_load_main = e_cos_load_main
        self.text_mellem = text_mellem
        self.image_cache = image_cache

        # Liste over SegmentFrame-objekter
        self.segment_frames = []

        # ------------------------------------------------------------
        # ØVERSTE INPUT-LINJER (navn, In, fasesystem, materiale m.m.)
        # ------------------------------------------------------------
        row = 0

        ttk.Label(self, text="Gruppenavn:").grid(row=row, column=0, sticky="w")
        self.entry_name = ttk.Entry(self, width=10)
        self.entry_name.grid(row=row, column=1, sticky="w")
        self.entry_name.insert(0, f"W{number+1}")

        ttk.Label(self, text="In gruppe [A]:").grid(row=row, column=2, sticky="w")
        self.entry_In = ttk.Entry(self, width=8)
        self.entry_In.grid(row=row, column=3, sticky="w")
        self.entry_In.insert(0, "16")

        ttk.Label(self, text="Fasesystem:").grid(row=row, column=4, sticky="w")
        self.c_phase = ttk.Combobox(
            self, values=["1-faset", "3-faset"], state="readonly", width=8
        )
        self.c_phase.grid(row=row, column=5, sticky="w")
        self.c_phase.current(1)
        self.c_phase.bind("<<ComboboxSelected>>", self.on_phase_change)

        row += 1

        ttk.Label(self, text="Materiale:").grid(row=row, column=0, sticky="w")
        self.c_mat = ttk.Combobox(
            self, values=["Cu", "Al"], state="readonly", width=8
        )
        self.c_mat.grid(row=row, column=1, sticky="w")
        self.c_mat.current(0)

        ttk.Label(self, text="cos φ (gruppe):").grid(row=row, column=2, sticky="w")
        self.entry_cos = ttk.Entry(self, width=8)
        self.entry_cos.grid(row=row, column=3, sticky="w")
        self.entry_cos.insert(0, "1.0")

        row += 1

        # --------------------------------------------------------
        # Gruppesikring – producent (kun visning) + type
        # --------------------------------------------------------
        ttk.Label(self, text="Gruppesikring:").grid(row=row, column=0, sticky="w")

        # Producent – bruges ikke direkte i beregning, kun som tekst
        self.c_fuse_manu = ttk.Combobox(
            self, values=["Standard"], state="readonly", width=10
        )
        self.c_fuse_manu.grid(row=row, column=1, sticky="w")
        self.c_fuse_manu.current(0)

        # Type – alle de sikringstyper, gruppen kan bruge
        self.c_fuse_type = ttk.Combobox(
            self,
            values=[
                "Diazed gG",
                "Neozed gG",
                "Knivsikring gG",
                "MCB (auto B/C)",
                "MCB B",
                "MCB C",
            ],
            state="readonly",
            width=20,
        )
        self.c_fuse_type.grid(row=row, column=2, columnspan=2, sticky="w")
        self.c_fuse_type.current(0)

        # Lille label til at vise valgt MCB-kurve, når relevant
        self.lbl_mcb_curve = ttk.Label(self, text="MCB-kurve: -")
        self.lbl_mcb_curve.grid(row=row, column=4, columnspan=2, sticky="w")

        row += 1

        # --------------------------------------------------------
        # Maks spændingsfald & auto tværsnit
        # --------------------------------------------------------
        ttk.Label(self, text="Maks ΔU_total [%]:").grid(row=row, column=0, sticky="w")
        self.entry_du_max = ttk.Entry(self, width=8)
        self.entry_du_max.grid(row=row, column=1, sticky="w")
        self.entry_du_max.insert(0, "5")

        self.auto_size_var = tk.BooleanVar(value=True)
        self.chk_auto_size = ttk.Checkbutton(
            self,
            text="Auto tværsnit (Iz + ΔU_total)",
            variable=self.auto_size_var,
        )
        self.chk_auto_size.grid(row=row, column=2, columnspan=3, sticky="w")

        row += 1

        # --------------------------------------------------------
        # Segmenter (egen lille ramme nede under input)
        # --------------------------------------------------------
        seg_ctrl = ttk.Frame(self)
        seg_ctrl.grid(row=row, column=0, columnspan=6, sticky="w", pady=(5, 2))

        ttk.Button(seg_ctrl, text="+ segment", command=self.add_segment).pack(
            side="left", padx=(0, 5)
        )
        ttk.Button(seg_ctrl, text="- segment", command=self.remove_segment).pack(
            side="left"
        )

        row += 1

        self.seg_container = ttk.Frame(self)
        self.seg_container.grid(row=row, column=0, columnspan=6, sticky="nsew")

        # LabelFrame skal kunne vokse vertikalt
        self.rowconfigure(row, weight=1)
        for c in range(6):
            self.columnconfigure(c, weight=1)

        # Start med ét segment
        self.add_segment()

        row += 1

        # --------------------------------------------------------
        # Resultat-linje nederst i gruppen
        # --------------------------------------------------------
        res = ttk.Frame(self)
        res.grid(row=row, column=0, columnspan=6, sticky="ew", pady=(5, 0))

        ttk.Label(res, text="Ik,min:").grid(row=0, column=0, sticky="w")
        self.lbl_Ikmin = ttk.Label(res, text="-")
        self.lbl_Ikmin.grid(row=0, column=1, sticky="w")

        ttk.Label(res, text="Ik,max:").grid(row=0, column=2, sticky="w")
        self.lbl_Ikmax = ttk.Label(res, text="-")
        self.lbl_Ikmax.grid(row=0, column=3, sticky="w")

        ttk.Label(res, text="ΔU_gruppe:").grid(row=1, column=0, sticky="w")
        self.lbl_du_grp = ttk.Label(res, text="-")
        self.lbl_du_grp.grid(row=1, column=1, sticky="w")

        ttk.Label(res, text="ΔU_total:").grid(row=1, column=2, sticky="w")
        self.lbl_du_tot = ttk.Label(res, text="-")
        self.lbl_du_tot.grid(row=1, column=3, sticky="w")

        ttk.Label(res, text="Termisk:").grid(row=2, column=0, sticky="w")
        self.lbl_termisk = ttk.Label(res, text="-")
        self.lbl_termisk.grid(row=2, column=1, sticky="w")

        # Gør så resultatsfelt kan fylde ekstra vandret
        for c in range(4):
            res.columnconfigure(c, weight=1)

        # Sørg for at faseskift initialt sætter In + belastede ledere korrekt
        self.on_phase_change()

    # ------------------------------------------------------------------
    # Hjælpefunktioner til segmenter og mellemregninger
    # ------------------------------------------------------------------
    def add_segment(self):
        """Tilføj et nyt segment til gruppen."""
        nr = len(self.segment_frames) + 1
        frame = SegmentFrame(self.seg_container, nr, self.image_cache)
        frame.grid(row=nr - 1, column=0, sticky="nsew", pady=2)

        # Sæt belastede ledere efter gruppens fasesystem
        frame.set_cores_for_phase(self.c_phase.get())

        self.segment_frames.append(frame)

    def remove_segment(self):
        """Fjern sidste segment (men behold mindst ét)."""
        if len(self.segment_frames) <= 1:
            return
        frame = self.segment_frames.pop()
        frame.destroy()

    def log_mellem(self, text_line: str):
        """Skriv én linje i fælles Mellemregninger-tekstfeltet."""
        if self.text_mellem is None:
            return
        self.text_mellem.insert(tk.END, text_line + "\n")
        self.text_mellem.see(tk.END)

    # ------------------------------------------------------------------
    # Reaktion på skift mellem 1-faset / 3-faset
    # ------------------------------------------------------------------
    def on_phase_change(self, event=None):
        phase = self.c_phase.get()

        # Sæt In-standardværdi efter fasesystem
        if phase == "1-faset":
            self.entry_In.delete(0, tk.END)
            self.entry_In.insert(0, "10")
        else:
            self.entry_In.delete(0, tk.END)
            self.entry_In.insert(0, "16")

        # Opdatér alle segments belastede ledere
        for seg in self.segment_frames:
            seg.set_cores_for_phase(phase)
