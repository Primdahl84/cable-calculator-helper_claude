import math
import cmath

from calculations import (
    STANDARD_SIZES,
    lookup_iz_xlpe,
    cable_impedance_NKT,
    ik_min_stik,
    ik_max_stik,
    thermal_ok,
    voltage_drop_ds,
    fuse_trip_time_explain,
)
from fuse_curves import get_fuse_data

# =========================================================
# Hjælper til at vise Ik som beløb + vinkel
# =========================================================


def format_current_with_angle(I) -> str:
    """
    Formaterer en (evt. kompleks) strøm som:
        |I| A / vinkel°
    fx: 160.9 A / -14.0°
    """
    try:
        c = complex(I)
    except Exception:
        try:
            c = complex(float(I), 0.0)
        except Exception:
            return f"{I} A"

    mag = abs(c)
    if mag == 0:
        angle_deg = 0.0
    else:
        angle_deg = math.degrees(cmath.phase(c))
    return f"{mag:.1f} A / {angle_deg:.1f}°"


# =========================================================
# Forsøg at importere tkinter (GUI)
# =========================================================

try:
    import tkinter as tk
    from tkinter import ttk, messagebox

    TK_AVAILABLE = True
except ModuleNotFoundError:
    TK_AVAILABLE = False
    tk = None
    ttk = None
    messagebox = None


if TK_AVAILABLE:
    from segment_frame import SegmentFrame
    from group_frame import GroupFrame

    def main():
        # ------------------------------------------------------------
        # HOVEDVINDUE
        # ------------------------------------------------------------
        root = tk.Tk()
        root.title("Stikledning- og gruppeberegner – XLPE")
        root.geometry("1200x800")

        # ------------------------------------------------------------
        # Notebook med faner
        # ------------------------------------------------------------
        notebook = ttk.Notebook(root)
        notebook.pack(fill="both", expand=True)

        tab_stik = ttk.Frame(notebook)
        tab_groups = ttk.Frame(notebook)
        tab_mellem = ttk.Frame(notebook)

        notebook.add(tab_stik, text="Stikledning")
        notebook.add(tab_groups, text="Grupper")
        notebook.add(tab_mellem, text="Mellemregninger")

        # ------------------------------------------------------------
        # Fanen "Mellemregninger" – fælles log for ALT
        # ------------------------------------------------------------
        lbl_mellem = ttk.Label(
            tab_mellem,
            text=(
                "Her vises alle mellemregninger for stikledning og grupper.\n"
                "Når du trykker 'Beregn stikledning' eller 'Beregn gruppe', "
                "skrives detaljerede trin her."
            ),
        )
        lbl_mellem.pack(side="top", anchor="w", padx=5, pady=5)

        text_mellem = tk.Text(tab_mellem, height=30)
        text_mellem.pack(side="top", fill="both", expand=True, padx=5, pady=5)

        scrollbar_mellem = ttk.Scrollbar(
            tab_mellem, orient="vertical", command=text_mellem.yview
        )
        scrollbar_mellem.pack(side="right", fill="y")
        text_mellem.configure(yscrollcommand=scrollbar_mellem.set)

        def log_mellem(line: str = ""):
            """Skriv én linje i fanen 'Mellemregninger'."""
            text_mellem.insert("end", line + "\n")
            text_mellem.see("end")

        # ------------------------------------------------------------
        # Fanen "Stikledning"
        # ------------------------------------------------------------
        frame_stik_top = ttk.Frame(tab_stik)
        frame_stik_top.pack(side="top", fill="x", padx=5, pady=5)

        frame_segments = ttk.Frame(tab_stik)
        frame_segments.pack(side="top", fill="both", expand=True, padx=5, pady=5)

        frame_stik_bottom = ttk.Frame(tab_stik)
        frame_stik_bottom.pack(side="bottom", fill="x", padx=5, pady=5)

        # --------------------------------------------------------
        # Venstre del – input felter
        # --------------------------------------------------------
        frame_input = ttk.LabelFrame(frame_stik_top, text="Input – stikledning")
        frame_input.pack(side="left", fill="y", padx=5, pady=5)

        row = 0

        ttk.Label(frame_input, text="Netspænding [V]:").grid(
            row=row, column=0, sticky="w"
        )
        c_U = ttk.Combobox(frame_input, values=["230", "400"], state="readonly", width=8)
        c_U.grid(row=row, column=1, sticky="w")
        c_U.current(0)
        row += 1

        ttk.Label(frame_input, text="In stikledning [A]:").grid(
            row=row, column=0, sticky="w"
        )
        e_In = ttk.Entry(frame_input, width=10)
        e_In.grid(row=row, column=1, sticky="w")
        e_In.insert(0, "35")
        row += 1

        ttk.Label(frame_input, text="Fasesystem:").grid(row=row, column=0, sticky="w")
        c_phase = ttk.Combobox(
            frame_input, values=["1-faset", "3-faset"], state="readonly", width=8
        )
        c_phase.grid(row=row, column=1, sticky="w")
        c_phase.current(1)  # 3-faset
        row += 1

        ttk.Label(frame_input, text="Materiale:").grid(row=row, column=0, sticky="w")
        c_mat = ttk.Combobox(
            frame_input, values=["Cu", "Al"], state="readonly", width=8
        )
        c_mat.grid(row=row, column=1, sticky="w")
        c_mat.current(0)
        row += 1

        ttk.Label(frame_input, text="cos φ (last):").grid(row=row, column=0, sticky="w")
        e_cos_load = ttk.Entry(frame_input, width=10)
        e_cos_load.grid(row=row, column=1, sticky="w")
        e_cos_load.insert(0, "1.0")
        row += 1

        ttk.Label(frame_input, text="Kj (jordtemp.-faktor):").grid(
            row=row, column=0, sticky="w"
        )
        e_Kj = ttk.Entry(frame_input, width=10)
        e_Kj.grid(row=row, column=1, sticky="w")
        e_Kj.insert(0, "1.0")
        row += 1

        ttk.Label(frame_input, text="Maks. ΔU_stikledning [%]:").grid(
            row=row, column=0, sticky="w"
        )
        e_dU_max = ttk.Entry(frame_input, width=10)
        e_dU_max.grid(row=row, column=1, sticky="w")
        e_dU_max.insert(0, "1.0")
        row += 1

        auto_size_var = tk.BooleanVar(value=True)
        chk_auto_size = ttk.Checkbutton(
            frame_input,
            text="Vælg tværsnit automatisk (Iz + spændingsfald)",
            variable=auto_size_var,
        )
        chk_auto_size.grid(row=row, column=0, columnspan=2, sticky="w")
        row += 1

        # --------------------------------------------------------
        # Sikringsvalg – stikledning
        # --------------------------------------------------------
        manufacturers = ["Standard"]
        types = ["Diazed gG", "Neozed gG", "Knivsikring gG"]

        ttk.Label(frame_input, text="Sikrings-producent:").grid(
            row=row, column=0, sticky="w"
        )
        c_fuse_manu = ttk.Combobox(frame_input, values=manufacturers, state="readonly")
        c_fuse_manu.grid(row=row, column=1, sticky="ew")
        c_fuse_manu.current(0)
        row += 1

        ttk.Label(frame_input, text="Sikringstype:").grid(row=row, column=0, sticky="w")
        c_fuse_type = ttk.Combobox(frame_input, values=types, state="readonly")
        c_fuse_type.grid(row=row, column=1, sticky="ew")
        c_fuse_type.current(0)
        row += 1

        # --------------------------------------------------------
        # Kortslutning (trafo) & k²S²
        # --------------------------------------------------------
        frame_short = ttk.LabelFrame(frame_stik_top, text="Kortslutning (trafo) & k²S²")
        frame_short.pack(side="left", fill="y", padx=5, pady=5)

        row = 0
        ttk.Label(frame_short, text="Ik_trafo [A] (fx 16000):").grid(
            row=row, column=0, sticky="w"
        )
        e_Ik_trafo = ttk.Entry(frame_short, width=10)
        e_Ik_trafo.grid(row=row, column=1, sticky="w")
        e_Ik_trafo.insert(0, "16000")
        row += 1

        ttk.Label(frame_short, text="Ik_min, forsyning [A] (fx 175):").grid(
            row=row, column=0, sticky="w"
        )
        e_Ik_min = ttk.Entry(frame_short, width=10)
        e_Ik_min.grid(row=row, column=1, sticky="w")
        e_Ik_min.insert(0, "175")
        row += 1

        def update_Ik_min_from_In(event=None):
            try:
                In_val = float(e_In.get().replace(",", "."))
            except ValueError:
                return
            Ik_min_val = 5.0 * In_val
            e_Ik_min.delete(0, "end")
            e_Ik_min.insert(0, f"{Ik_min_val:.0f}")

        e_In.bind("<FocusOut>", update_Ik_min_from_In)
        e_In.bind("<Return>", update_Ik_min_from_In)
        update_Ik_min_from_In()

        ttk.Label(frame_short, text="cos φ trafo (fx 0,3):").grid(
            row=row, column=0, sticky="w"
        )
        e_cos_trafo = ttk.Entry(frame_short, width=10)
        e_cos_trafo.grid(row=row, column=1, sticky="w")
        e_cos_trafo.insert(0, "0.3")
        row += 1

        ttk.Label(frame_short, text="k-værdi (tabel 2, k²S² – XLPE, auto):").grid(
            row=row, column=0, sticky="w"
        )
        e_k = ttk.Entry(frame_short, width=10)
        e_k.grid(row=row, column=1, sticky="w")
        e_k.insert(0, "143")

        def update_k_entry(event=None):
            mat = c_mat.get()
            k_val = 143.0 if mat == "Cu" else 94.0
            e_k.delete(0, "end")
            e_k.insert(0, f"{k_val:g}")

        c_mat.bind("<<ComboboxSelected>>", update_k_entry)

        # --------------------------------------------------------
        # Segmenter – stikledning
        # --------------------------------------------------------
        seg_controls = ttk.Frame(frame_segments)
        seg_controls.pack(side="top", fill="x")

        canvas_segments = tk.Canvas(frame_segments, height=200)
        canvas_segments.pack(side="left", fill="both", expand=True)

        scrollbar_segments = ttk.Scrollbar(
            frame_segments, orient="vertical", command=canvas_segments.yview
        )
        scrollbar_segments.pack(side="right", fill="y")

        canvas_segments.configure(yscrollcommand=scrollbar_segments.set)

        frame_segments_inner = ttk.Frame(canvas_segments)
        canvas_segments.create_window((0, 0), window=frame_segments_inner, anchor="nw")

        def _on_mousewheel_segments(event):
            if event.num == 4:
                canvas_segments.yview_scroll(-1, "units")
            elif event.num == 5:
                canvas_segments.yview_scroll(1, "units")
            else:
                canvas_segments.yview_scroll(int(-1 * (event.delta / 120)), "units")
            return "break"

        canvas_segments.bind("<MouseWheel>", _on_mousewheel_segments)
        canvas_segments.bind("<Button-4>", _on_mousewheel_segments)
        canvas_segments.bind("<Button-5>", _on_mousewheel_segments)

        image_cache = {}
        segment_frames = []

        def add_segment():
            idx = len(segment_frames) + 1
            frame = SegmentFrame(
                master=frame_segments_inner,
                number=idx,
                image_cache=image_cache,
                is_stikledning=True,
            )
            frame.pack(side="top", fill="x", pady=2)
            segment_frames.append(frame)
            frame_segments_inner.update_idletasks()
            canvas_segments.configure(scrollregion=canvas_segments.bbox("all"))

        def remove_segment():
            if segment_frames:
                frame = segment_frames.pop()
                frame.destroy()
                frame_segments_inner.update_idletasks()
                canvas_segments.configure(scrollregion=canvas_segments.bbox("all"))

        ttk.Button(seg_controls, text="+ Segment", command=add_segment).pack(
            side="left", padx=5
        )
        ttk.Button(seg_controls, text="- Segment", command=remove_segment).pack(
            side="left", padx=5
        )

        add_segment()  # start med ét segment

        # --------------------------------------------------------
        # Resultat-felt for stikledning (som i "gamle" layout)
        # --------------------------------------------------------
        frame_stik_result = ttk.LabelFrame(
            frame_stik_bottom, text="Resultater – stikledning"
        )
        frame_stik_result.pack(side="top", fill="x", padx=5, pady=5)

        lbl_Iz_nod = ttk.Label(frame_stik_result, text="Værste Iz,nød (segment): – A")
        lbl_Iz_nod.grid(row=0, column=0, sticky="w")

        lbl_sq_valgt = ttk.Label(frame_stik_result, text="Valgt kabeltværsnit: – mm²")
        lbl_sq_valgt.grid(row=1, column=0, sticky="w")

        lbl_len_total = ttk.Label(
            frame_stik_result, text="Samlet længde stikledning: – m"
        )
        lbl_len_total.grid(row=2, column=0, sticky="w")

        lbl_du = ttk.Label(
            frame_stik_result, text="Spændingsfald (DS-formel): – V (– %)"
        )
        lbl_du.grid(row=3, column=0, sticky="w")

        lbl_Ikmin = ttk.Label(
            frame_stik_result, text="Ik_min (ved tavle/måler): – A"
        )
        lbl_Ikmin.grid(row=4, column=0, sticky="w")

        lbl_Ikmax = ttk.Label(frame_stik_result, text="Ik_max (tavle): – A")
        lbl_Ikmax.grid(row=5, column=0, sticky="w")

        lbl_E_kabel = ttk.Label(
            frame_stik_result, text="KB-termisk (k²S² vs. I²·t): – (E_k²S² > I²·t?)"
        )
        lbl_E_kabel.grid(row=6, column=0, sticky="w")

        lbl_sikring_tid = ttk.Label(
            frame_stik_result, text="Sikring tidsforløb: – (tekst fra sikringskurve)"
        )
        lbl_sikring_tid.grid(row=7, column=0, sticky="w")

        # logfunktion til stikledningen -> skriver i Mellemregninger
        def log(line: str = ""):
            log_mellem(line)

        # --------------------------------------------------------
        # Data deles med grupperne
        # --------------------------------------------------------
        stik_data = {
            "U_v": None,
            "sq": None,
            "material": None,
            "total_len": None,
            "Ik_min_val": None,
            "Ik_max_val": None,
            "Z_w1_min": None,
            "Z_w1_max": None,
            "cos_load": None,
            "phase": None,
            "In": None,
            "Kj_jord": None,
            "du_stik": None,
            "I_min_supply": None,
            "In_source": None,
            "src_txt": None,
        }

        # --------------------------------------------------------
        # Beregn stikledning
        # --------------------------------------------------------
        def beregn_stik():
            log("")
            log("===== STIKLEDNING =====")
            log("")

            try:
                In = float(e_In.get().replace(",", "."))
                U_v = int(c_U.get())
                phase = c_phase.get()
                material = c_mat.get()
                cos_load = float(e_cos_load.get().replace(",", "."))
                Kj_jord = float(e_Kj.get().replace(",", "."))
                du_max_pct = float(e_dU_max.get().replace(",", "."))
                fuse_manu = c_fuse_manu.get()
                fuse_type = c_fuse_type.get()
                Ik_trafo = float(e_Ik_trafo.get().replace(",", "."))
                I_min_supply = float(e_Ik_min.get().replace(",", "."))
            except ValueError:
                messagebox.showerror("Fejl", "Tjek at alle tal er indtastet rigtigt.")
                return

            try:
                cos_trafo = float(e_cos_trafo.get().replace(",", "."))
            except ValueError:
                messagebox.showerror(
                    "Fejl", "cos φ trafo skal være et gyldigt decimaltal."
                )
                return

            try:
                k_val = float(e_k.get().replace(",", "."))
            except ValueError:
                mat = c_mat.get()
                k_val = 143.0 if mat == "Cu" else 94.0
                e_k.delete(0, "end")
                e_k.insert(0, f"{k_val:g}")

            auto_size = auto_size_var.get()

            log("=== Overordnede input – stikledning ===")
            log(f"In = {In:.2f} A")
            log(f"U_n = {U_v} V, fasesystem = {phase}")
            log(f"Materiale = {material} (XLPE)")
            log(f"cos φ (last) = {cos_load:.3f}")
            log(f"Kj jord (felt) = {Kj_jord:.3f}")
            log(f"Maks. spændingsfald (stik) = {du_max_pct:.2f} %")
            log(f"Automatisk tværsnit = {'JA' if auto_size else 'NEJ'}")
            log(
                f"Ik_min,forsyning = {I_min_supply:.1f} A; Ik_trafo = {Ik_trafo:.1f} A, cos φ trafo = {cos_trafo:.3f}"
            )
            log(f"k (k²S², XLPE auto) = {k_val:.1f}")
            log("")

            # Segment-data
            segments = []
            total_len = 0.0
            for frame in segment_frames:
                try:
                    data = frame.get_data()
                except ValueError as exc:
                    messagebox.showerror("Fejl i segmentdata", str(exc))
                    return
                segments.append(data)
                total_len += data["length"]

            if not segments:
                messagebox.showerror(
                    "Fejl", "Der skal være mindst ét segment i stikledningen."
                )
                return

            log("=== Segmentdata (stikledning) ===")
            for idx, seg in enumerate(segments, start=1):
                log(
                    f"Segment {idx}: L = {seg['length']:.1f} m, "
                    f"Ref-metode = {seg['ref_method']}, "
                    f"Belastede ledere = {seg['cores']}, "
                    f"T_omg = {seg['temp']} °C, "
                    f"s = {seg['area']} mm²"
                )
            log(f"Samlet længde stikledning = {total_len:.1f} m")
            log("")

            # Overbelastning / Iz
            best_Iz_nod = 0.0
            if phase == "1-faset" and material == "Cu":
                candidate_sizes = [2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0]
            else:
                candidate_sizes = STANDARD_SIZES

            sq = None
            if auto_size:
                log("=== Auto tværsnit (Iz + ΔU_total) – stikledning ===")
                for S in candidate_sizes:
                    ok_all = True
                    worst_Iz_nod_S = 0.0
                    log(f"Afprøver tværsnit S = {S:.1f} mm²:")

                    for idx, seg in enumerate(segments, start=1):
                        ref = seg["ref_method"]
                        n_belastede = seg["cores"]
                        Kt_seg = seg["Kt"]
                        kgrp_seg = seg["kgrp"]

                        Iz_tab = lookup_iz_xlpe(material, ref, n_belastede, S)
                        if Iz_tab is None:
                            log(
                                f"  [ADVARSEL] Mangler Iz-data for {material}, "
                                f"ref {ref}, {n_belastede} belastede, S={S:.1f} mm²."
                            )
                            ok_all = False
                            break

                        env_seg = "jord" if ref in ("D1", "D2") else "luft"
                        if ref == "D2":
                            Kj_seg = 1.5
                        else:
                            Kj_seg = Kj_jord if env_seg == "jord" else 1.0

                        Iz_korr = Iz_tab * Kt_seg * Kj_seg * kgrp_seg
                        Iz_nod = In / (Kt_seg * Kj_seg * kgrp_seg)

                        log(
                            f"  Segment {idx}: Iz,tabel={Iz_tab:.1f} A, "
                            f"Kt={Kt_seg:.3f}, Kj={Kj_seg:.3f}, kgrp={kgrp_seg:.3f} "
                            f"⇒ Iz,korr={Iz_korr:.1f} A, Iz,nød={Iz_nod:.1f} A"
                        )

                        if Iz_korr < Iz_nod:
                            log(
                                "    ⇒ Overbelastningsbeskyttelse IKKE OK i dette segment!"
                            )
                            ok_all = False
                            break

                        if Iz_nod > worst_Iz_nod_S:
                            worst_Iz_nod_S = Iz_nod

                    if ok_all:
                        du_S, du_pct_S = voltage_drop_ds(
                            U_v, In, material, S, total_len, phase, cos_load
                        )
                        log(
                            f"  ΔU_stik for S = {S:.1f} mm²: "
                            f"{du_S:.2f} V ({du_pct_S:.2f} %)"
                        )
                        if du_pct_S > du_max_pct:
                            log(
                                f"    ⇒ Spændingsfaldet ({du_pct_S:.2f} %) "
                                f"overskrider grænsen på {du_max_pct:.2f} %."
                            )
                            ok_all = False
                        else:
                            log(
                                f"    ⇒ Spændingsfaldet er OK ift. grænsen "
                                f"på {du_max_pct:.2f} %."
                            )

                    if ok_all:
                        log(f"⇒ Tværsnit S = {S:.1f} mm² er OK for alle segmenter.")
                        sq = S
                        best_Iz_nod = worst_Iz_nod_S
                        break
                    else:
                        log(f"⇒ Tværsnit S = {S:.1f} mm² er IKKE OK – prøver større.")
                        log("")

                if sq is None:
                    messagebox.showerror(
                        "Overbelastning",
                        "Kunne ikke finde et tværsnit, der opfylder Iz- og ΔU-betingelserne.",
                    )
                    return

                log(f"Valgt tværsnit for stikledning: {sq:.1f} mm²")
                log("")
            else:
                sq = segments[0]["area"]
                log("Auto tværsnit er slået FRA.")
                log(f"Bruger tværsnit fra første segment: S = {sq:.1f} mm²")
                log("")

            # Spændingsfald – DS-formel
            log("=== Spændingsfald – stikledning ===")
            try:
                du, du_pct = voltage_drop_ds(
                    U_v, In, material, sq, total_len, phase, cos_load
                )
            except KeyError:
                messagebox.showerror(
                    "Kabeldata",
                    "Der mangler kabeldata (R/X) for det valgte tværsnit/materiale.",
                )
                return

            log(
                f"ΔU_stik = {du:.2f} V ({du_pct:.2f} %) for S = {sq:.1f} mm², L = {total_len:.1f} m"
            )
            if du_pct <= du_max_pct:
                log(
                    f"⇒ Spændingsfaldet er inden for grænsen på {du_max_pct:.2f} %."
                )
            else:
                log(
                    f"⇒ Spændingsfaldet overskrider grænsen på {du_max_pct:.2f} %!"
                )
            log("")

            # Kortslutningsstrømme
            log("=== Kortslutningsstrømme – Ik,min og Ik,max ===")
            try:
                Z_w1_min = cable_impedance_NKT(
                    L_m=total_len,
                    material=material,
                    sq=sq,
                    phase=phase,
                    R_factor=1.5,
                )
                Z_w1_max = cable_impedance_NKT(
                    L_m=total_len,
                    material=material,
                    sq=sq,
                    phase=phase,
                    R_factor=1.0,
                )
            except KeyError:
                messagebox.showerror(
                    "Kabeldata",
                    "Der mangler kabeldata (R/X) for det valgte tværsnit/materiale.",
                )
                return

            Ik_min_val = ik_min_stik(U_v, I_min_supply, Z_w1_min)
            Ik_max_val, Z_total_max = ik_max_stik(
                U_v=U_v,
                Ik_trafo=Ik_trafo,
                cos_trafo=cos_trafo,
                Z_kabel_max=Z_w1_max,
            )

            log(
                "  Z_w1,min = {:.5f} + j{:.5f} Ω (R_faktor=1,5)".format(
                    Z_w1_min.real, Z_w1_min.imag
                )
            )
            log(
                "  Z_w1,max = {:.5f} + j{:.5f} Ω (R_faktor=1,0)".format(
                    Z_w1_max.real, Z_w1_max.imag
                )
            )
            log(f"  Ik,min = {abs(Ik_min_val):.1f} A (vinkel {math.degrees(cmath.phase(complex(Ik_min_val))):.1f}°)")
            log(f"  Ik,max = {abs(Ik_max_val):.1f} A (vinkel {math.degrees(cmath.phase(complex(Ik_max_val))):.1f}°)")
            log("")

            # Termisk kontrol
            log("=== Termisk – k²·S² vs I²·t (stikledning) ===")
            Ik_for_fuse = abs(Ik_min_val)

            try:
                curve_points, In_curve, Imin_factor = get_fuse_data(
                    fuse_manu, fuse_type, In
                )
            except KeyError:
                messagebox.showerror(
                    "Sikring",
                    "Kunne ikke finde sikringsdata for den valgte type.",
                )
                return

            t_trip, fuse_text = fuse_trip_time_explain(
                In_curve, Ik_for_fuse, curve_points
            )

            termisk_ok, E_kabel, E_bryde = thermal_ok(
                k_val, sq, Ik_for_fuse, t_trip
            )

            log(f"  Ik,min for termisk check = {Ik_for_fuse:.1f} A")
            log(f"  t (fra sikringskurve) ≈ {t_trip:.4f} s")
            log(f"  E_kabel = k²·S² = {E_kabel:.1f} A²·s")
            log(f"  E_bryde = I²·t = {E_bryde:.1f} A²·s")
            log(f"  Termisk OK? {'JA' if termisk_ok else 'NEJ'}")
            log("  Detaljer fra sikringskurve:")
            log(fuse_text)
            log("")

            # Opdater resultater i stik-fanen
            lbl_Iz_nod.config(text=f"Værste Iz,nød (segment): {best_Iz_nod:.1f} A")
            lbl_sq_valgt.config(text=f"Valgt kabeltværsnit: {sq:.1f} mm²")
            lbl_len_total.config(
                text=f"Samlet længde stikledning: {total_len:.1f} m"
            )
            lbl_du.config(
                text=f"Spændingsfald (DS-formel): {du:.2f} V ({du_pct:.2f} %)"
            )

            # >>> Her bruger vi nu beløb + vinkel for strømmen <<<
            lbl_Ikmin.config(
                text=(
                    "Ik_min (ved tavle/måler): "
                    f"{format_current_with_angle(Ik_min_val)}"
                )
            )
            lbl_Ikmax.config(
                text=f"Ik_max (tavle): {format_current_with_angle(Ik_max_val)}"
            )

            lbl_E_kabel.config(
                text=(
                    f"KB-termisk (k²S² vs. I²·t): "
                    f"{'OK (k²S² > I²·t)' if termisk_ok else 'IKKE OK (k²S² ≤ I²·t)'}"
                )
            )
            lbl_sikring_tid.config(
                text=f"Sikring tidsforløb: Sikring {In:.0f} A, m = Ik/In = "
                f"{Ik_for_fuse / In:.1f}, t ≈ {t_trip:.4f} s"
            )

            # Gem stikdata til grupperne
            stik_data["U_v"] = U_v
            stik_data["sq"] = sq
            stik_data["material"] = material
            stik_data["total_len"] = total_len
            stik_data["Ik_min_val"] = Ik_min_val
            stik_data["Ik_max_val"] = Ik_max_val
            stik_data["Z_w1_min"] = Z_w1_min
            stik_data["Z_w1_max"] = Z_w1_max
            stik_data["cos_load"] = cos_load
            stik_data["phase"] = phase
            stik_data["In"] = In
            stik_data["Kj_jord"] = Kj_jord
            stik_data["du_stik"] = du
            stik_data["I_min_supply"] = I_min_supply
            stik_data["In_source"] = I_min_supply / 5.0 if I_min_supply > 0 else In
            stik_data["src_txt"] = "I_min,forsyning/5"

        btn_beregn_stik = ttk.Button(
            frame_stik_bottom, text="Beregn stikledning", command=beregn_stik
        )
        btn_beregn_stik.pack(side="bottom", anchor="e", padx=5, pady=5)

        # ------------------------------------------------------------
        # Fanen "Grupper"
        # ------------------------------------------------------------
        frame_groups_main = ttk.Frame(tab_groups)
        frame_groups_main.pack(fill="both", expand=True, padx=5, pady=5)

        group_container = ttk.Frame(frame_groups_main)
        group_container.pack(side="left", fill="both", expand=True)

        canvas = tk.Canvas(group_container)
        canvas.pack(side="left", fill="both", expand=True)

        scrollbar = ttk.Scrollbar(
            group_container, orient="vertical", command=canvas.yview
        )
        scrollbar.pack(side="right", fill="y")

        canvas.configure(yscrollcommand=scrollbar.set)

        inner_frame = ttk.Frame(canvas)
        canvas.create_window((0, 0), window=inner_frame, anchor="nw")

        def _on_mousewheel(event):
            if event.num == 4:
                canvas.yview_scroll(-1, "units")
            elif event.num == 5:
                canvas.yview_scroll(1, "units")
            else:
                canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            return "break"

        canvas.bind("<MouseWheel>", _on_mousewheel)
        canvas.bind("<Button-4>", _on_mousewheel)
        canvas.bind("<Button-5>", _on_mousewheel)

        group_frames = []

        def add_group():
            idx = len(group_frames) + 1
            gf = GroupFrame(
                master=inner_frame,
                number=idx,
                stik_data_ref=stik_data,
                e_Kj=e_Kj,
                e_Ik_trafo=e_Ik_trafo,
                e_cos_trafo=e_cos_trafo,
                image_cache=image_cache,
                e_In_main=e_In,
                c_phase_main=c_phase,
                e_cos_load_main=e_cos_load,
                text_mellem=text_mellem,  # grupper skriver direkte i Mellemregninger
            )
            gf.pack(side="top", fill="x", pady=5)
            group_frames.append(gf)
            inner_frame.update_idletasks()
            canvas.configure(scrollregion=canvas.bbox("all"))

        def remove_group():
            if group_frames:
                gf = group_frames.pop()
                gf.destroy()
                inner_frame.update_idletasks()
                canvas.configure(scrollregion=canvas.bbox("all"))

        btn_frame = ttk.Frame(frame_groups_main)
        btn_frame.pack(side="top", fill="x", pady=5)

        ttk.Button(btn_frame, text="+ Gruppe", command=add_group).pack(
            side="left", padx=5
        )
        ttk.Button(btn_frame, text="- Gruppe", command=remove_group).pack(
            side="left", padx=5
        )

        add_group()  # første gruppe

        root.mainloop()


if __name__ == "__main__":
    if TK_AVAILABLE:
        main()
    else:
        print("tkinter er ikke tilgængelig – GUI kan ikke startes.")
