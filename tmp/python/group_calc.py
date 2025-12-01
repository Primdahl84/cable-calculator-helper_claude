import math
import cmath
from tkinter import messagebox

from calculations import (
    STANDARD_SIZES,
    lookup_iz_xlpe,
    cable_impedance_NKT,
    ik_max_stik,
    voltage_drop_ds,
    fuse_trip_time_explain,
)


def format_current_with_angle(I) -> str:
    """Formaterer (evt. kompleks) strøm som "|I| A / vinkel°"."""
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


from fuse_curves import get_fuse_data


class GroupCalcMixin:
    """
    Indeholder HELE beregningsfunktionen til grupper.
    Bruges sammen med GroupFrameBase.
    """

    def beregn(self):
        # --------------------------------------------------------
        # INPUT FRA GRUPPE-FANEN
        # --------------------------------------------------------
        name = self.entry_name.get().strip() or f"W{self.number+1}"
        try:
            In_g = float(self.entry_In.get().replace(",", "."))
            phase_g = self.c_phase.get()
            mat_g = self.c_mat.get()
            cos_load_g = float(self.entry_cos.get().replace(",", "."))
            du_max_pct = float(self.entry_du_max.get().replace(",", "."))
        except ValueError:
            messagebox.showerror(
                "Gruppe – input",
                "Tjek at In, cosφ og maks ΔU_total er gyldige tal.",
            )
            return

        auto_size = self.auto_size_var.get()

        # Ryd mellemregninger for denne gruppe
        self.log_mellem("")
        self.log_mellem(f"===== GRUPPE {name} =====")
        self.log_mellem("")
        self.log_mellem("[OVERORDNEDE DATA – GRUPPE]")
        self.log_mellem(f"  In,gruppe = {In_g:.1f} A")
        self.log_mellem(f"  Fasesystem = {phase_g}")
        self.log_mellem(f"  Materiale = {mat_g}")
        self.log_mellem(f"  cos φ (gruppe) = {cos_load_g:.3f}")
        self.log_mellem(f"  Maks ΔU_total (gruppe) = {du_max_pct:.2f} %")
        self.log_mellem(
            f"  Auto tværsnit (Iz + ΔU_total) = {'JA' if auto_size else 'NEJ'}"
        )
        self.log_mellem("")

        # --------------------------------------------------------
        # DATA FRA STIKLEDNING
        # --------------------------------------------------------
        if (
            self.stik_data_ref.get("sq") is None
            or self.stik_data_ref.get("Ik_min_val") is None
        ):
            messagebox.showerror(
                "Gruppe – stikledning",
                "Beregn først stikledningen i hovedfanen, så gruppen kan bruge data.",
            )
            return

        U_v = self.stik_data_ref["U_v"]
        S_stik = self.stik_data_ref["sq"]
        mat_stik = self.stik_data_ref["material"]
        L_stik = self.stik_data_ref["total_len"]
        Z_stik_min = self.stik_data_ref["Z_w1_min"]
        Z_stik_max = self.stik_data_ref["Z_w1_max"]
        Ik_min_stik = self.stik_data_ref["Ik_min_val"]

        # disse bruges til Ik,max
        try:
            Ik_trafo = float(self.e_Ik_trafo.get().replace(",", "."))
            cos_trafo = float(self.e_cos_trafo.get().replace(",", "."))
        except ValueError:
            messagebox.showerror(
                "Gruppe – trafo-data",
                "Ik_trafo og cos φ_trafo i hovedfanen skal være gyldige tal.",
            )
            return

        self.log_mellem("[DATA FRA STIKLEDNING]")
        self.log_mellem(f"  U_n = {U_v} V")
        self.log_mellem(f"  Materiale stikledning = {mat_stik}")
        self.log_mellem(f"  Tværsnit stikledning = {S_stik:.1f} mm²")
        self.log_mellem(f"  Samlet længde stikledning = {L_stik:.1f} m")
        self.log_mellem(
            f"  Z_stik_min = {Z_stik_min.real:.5f} + j{Z_stik_min.imag:.5f} Ω"
        )
        self.log_mellem(
            f"  Z_stik_max = {Z_stik_max.real:.5f} + j{Z_stik_max.imag:.5f} Ω"
        )
        self.log_mellem(f"  Ik,min,stik = {Ik_min_stik:.1f} A")
        self.log_mellem(f"  Ik_trafo = {Ik_trafo:.1f} A")
        self.log_mellem(f"  cos φ_trafo = {cos_trafo:.3f}")
        self.log_mellem("")

        # --------------------------------------------------------
        # LÆS SEGMENTER
        # --------------------------------------------------------
        try:
            segments = [
                s.get_data()
                for s in self.segment_frames
                if float(s.length_var.get().replace(",", ".")) > 0
            ]
            if not segments:
                raise ValueError("Angiv mindst ét segment med længde > 0 i gruppen.")
        except ValueError as e:
            messagebox.showerror("Gruppe – segment-fejl", str(e))
            return

        total_len_group = sum(s["length"] for s in segments)

        # --------------------------------------------------------
        # KORR.FAKTORER Kt og Kj
        # --------------------------------------------------------
        try:
            Kj_jord = float(self.e_Kj.get().replace(",", "."))
        except ValueError:
            messagebox.showerror(
                "Gruppe – K_j",
                "K_j (jordtemp.-faktor) i hovedfanen skal være et gyldigt tal.",
            )
            return

        # --------------------------------------------------------
        # AUTO TVÆRSNIT ELLER MANUELT?
        # --------------------------------------------------------
        self.log_mellem("=== Tværsnit – valg for gruppen ===")

        if auto_size:
            # Kandidattværsnit afhænger af materiale og fase
            if mat_g == "Al":
                candidate_sizes = [s for s in STANDARD_SIZES if s >= 16.0]
            elif mat_g == "Cu" and phase_g == "1-faset":
                # som stikledningen – kun 3-leder Cu gyldige
                allowed_1phase_cu = [
                    1.5,
                    2.5,
                    4.0,
                    6.0,
                    10.0,
                    16.0,
                    25.0,
                    35.0,
                ]
                candidate_sizes = [
                    s for s in allowed_1phase_cu if s in STANDARD_SIZES
                ]
            else:
                candidate_sizes = STANDARD_SIZES

            self.log_mellem(
                "Auto tværsnit aktiveret – tester standardstørrelser i rækkefølge."
            )
            self.log_mellem(
                f"  Kandidattværsnit = {', '.join(str(s) for s in candidate_sizes)}"
            )
            self.log_mellem("")

            chosen_sq = None

            for S_test in candidate_sizes:
                self.log_mellem(f"Afprøver tværsnit S = {S_test:.1f} mm²:")

                ok_all_segments = True
                worst_Iznod = 0.0

                for s in segments:
                    ref = s["ref_method"]
                    cores = s["cores"]
                    length = s["length"]
                    Kt_seg = s["Kt"]
                    kgrp_seg = s["kgrp"]

                    iz_tab = lookup_iz_xlpe(mat_g, ref, cores, S_test)
                    if iz_tab is None:
                        self.log_mellem(
                            f"  [ADVARSEL] Mangler Iz-data for {mat_g}, ref {ref}, "
                            f"{cores} ledere, {S_test} mm² – springer tværsnit over."
                        )
                        ok_all = False
                        break

                    env = "jord" if ref in ("D1", "D2") else "luft"
                    if ref == "D2":
                        Kj_seg = 1.5
                    else:
                        Kj_seg = Kj_jord if env == "jord" else 1.0

                    Iz_corr_seg = iz_tab * Kt_seg * Kj_seg * kgrp_seg
                    Iz_nod_seg = In_g / (Kt_seg * Kj_seg * kgrp_seg)
                    worst_Iznod = max(worst_Iznod, Iz_nod_seg)

                    self.log_mellem(f"  Segment {s['nr']}:")
                    self.log_mellem(
                        f"    Ref-metode = {ref}, længde = {length:.1f} m, "
                        f"belastede ledere = {cores}"
                    )
                    self.log_mellem("    Korrektionsfaktorer:")
                    self.log_mellem(
                        f"      Kt = {Kt_seg:.3f}, Kj = {Kj_seg:.3f}, "
                        f"kgrp = {kgrp_seg:.3f}"
                    )
                    self.log_mellem("    Iz,nød = In / (Kt·Kj·kgrp)")
                    self.log_mellem(
                        f"      = {In_g:.1f} / ({Kt_seg:.3f}·{Kj_seg:.3f}·"
                        f"{kgrp_seg:.3f}) = {Iz_nod_seg:.2f} A"
                    )
                    self.log_mellem("    Iz,korr = Iz,tabel · Kt · Kj · kgrp")
                    self.log_mellem(
                        f"      = {iz_tab:.1f} · {Kt_seg:.3f} · {Kj_seg:.3f} · "
                        f"{kgrp_seg:.3f} = {Iz_corr_seg:.2f} A"
                    )

                    if In_g > Iz_corr_seg:
                        self.log_mellem(
                            "    ⇒ Overbelastningsbeskyttelse IKKE OK i dette segment!"
                        )
                        ok_all_segments = False
                        break
                    else:
                        self.log_mellem(
                            "    ⇒ Overbelastningsbeskyttelse OK i dette segment."
                        )

                if not ok_all_segments:
                    self.log_mellem(
                        "  ⇒ Tværsnit opfylder ikke overbelastningskravet – prøver "
                        "næste."
                    )
                    self.log_mellem("")
                    continue

                self.log_mellem("  ⇒ Overbelastning OK for alle segmenter.")
                self.log_mellem("")

                try:
                    du_grp_test, _ = voltage_drop_ds(
                        U_v, In_g, mat_g, S_test, total_len_group, phase_g, cos_load_g
                    )
                    du_stik_grp_test, _ = voltage_drop_ds(
                        U_v, In_g, mat_stik, S_stik, L_stik, phase_g, cos_load_g
                    )
                except KeyError:
                    messagebox.showerror(
                        "Gruppe – spændingsfald",
                        "Mangler R/X-data for dette tværsnit – kan ikke beregne ΔU.",
                    )
                    return

                du_tot_test = du_grp_test + du_stik_grp_test
                du_tot_pct_test = du_tot_test / U_v * 100.0

                self.log_mellem(
                    f"  ΔU_gruppe,test ≈ {du_grp_test:.2f} V, "
                    f"ΔU_stik,gruppe,test ≈ {du_stik_grp_test:.2f} V"
                )
                self.log_mellem(
                    f"  ΔU_total,test ≈ {du_tot_test:.2f} V "
                    f"({du_tot_pct_test:.2f} % af U_n)"
                )

                if du_tot_pct_test > du_max_pct:
                    self.log_mellem(
                        f"  ⇒ ΔU_total,test overskrider grænsen på {du_max_pct:.2f} %."
                    )
                    self.log_mellem("")
                    continue
                else:
                    self.log_mellem(
                        f"  ⇒ ΔU_total,test overholder grænsen på {du_max_pct:.2f} %."
                    )
                    self.log_mellem("")
                    chosen_sq = S_test
                    break

            if chosen_sq is None:
                messagebox.showerror(
                    "Gruppe – tværsnit",
                    "Ingen standardtværsnit opfylder både Iz og ΔU_total-kravet.",
                )
                return

            if mat_g == "Al":
                sq_corr = max(chosen_sq, 16.0)
            else:
                sq_corr = chosen_sq

            # Sæt tværsnit på alle segmenter med længde > 0
            for frame in self.segment_frames:
                try:
                    length_val = float(frame.length_var.get().replace(",", "."))
                except ValueError:
                    length_val = 0.0
                if length_val > 0:
                    if float(sq_corr).is_integer():
                        frame.area_var.set(str(int(sq_corr)))
                    else:
                        frame.area_var.set(str(sq_corr))

            self.log_mellem(
                f"Valgt tværsnit for alle segments i {name}: {sq_corr:.1f} mm²"
            )
            self.log_mellem("")
        else:
            areas = {s["area"] for s in segments}
            if len(areas) != 1:
                messagebox.showerror(
                    "Gruppe – tværsnit",
                    "Når automatisk tværsnit er slået FRA, skal alle segmenter "
                    "have samme tværsnit i gruppen.",
                )
                return
            sq_corr = list(areas)[0]
            if mat_g == "Al":
                sq_corr = max(sq_corr, 16.0)
            self.log_mellem("Auto tværsnit er slået FRA.")
            self.log_mellem(f"  Fælles tværsnit i gruppen: {sq_corr:.1f} mm²")
            self.log_mellem("")

        # Opdatér area-vars i segmenterne til sq_corr
        for frame in self.segment_frames:
            try:
                length_val = float(frame.length_var.get().replace(",", "."))
            except ValueError:
                length_val = 0.0
            if length_val > 0:
                if float(sq_corr).is_integer():
                    frame.area_var.set(str(int(sq_corr)))
                else:
                    frame.area_var.set(str(sq_corr))

        # --------------------------------------------------------
        # OVERBELASTNING – ENDGILTIGT MED VALGT TVÆRSNIT
        # --------------------------------------------------------
        self.log_mellem("=== Overbelastning – endelig kontrol ===")

        worst_Iznod = 0.0
        for s in segments:
            ref = s["ref_method"]
            cores = s["cores"]
            length = s["length"]
            Kt_seg = s["Kt"]
            kgrp_seg = s["kgrp"]
            area = sq_corr

            iz_tab = lookup_iz_xlpe(mat_g, ref, cores, area)
            if iz_tab is None:
                messagebox.showerror(
                    "Gruppe – overbelastning",
                    (
                        "Mangler Iz-data for "
                        f"{mat_g}, ref {ref}, {cores} ledere, {area} mm²."
                    ),
                )
                return

            env = "jord" if ref in ("D1", "D2") else "luft"
            if ref == "D2":
                Kj_seg = 1.5
            else:
                Kj_seg = Kj_jord if env == "jord" else 1.0

            Iz_corr = iz_tab * Kt_seg * Kj_seg * kgrp_seg
            Iz_nod_seg = In_g / (Kt_seg * Kj_seg * kgrp_seg)
            worst_Iznod = max(worst_Iznod, Iz_nod_seg)

            self.log_mellem(f"Segment {s['nr']}:")
            self.log_mellem(
                f"  Ref-metode = {ref}, længde = {length:.1f} m, "
                f"belastede ledere = {cores}"
            )
            self.log_mellem("  Korrektionsfaktorer:")
            self.log_mellem(
                f"    Kt = {Kt_seg:.3f}, Kj = {Kj_seg:.3f}, kgrp = {kgrp_seg:.3f}"
            )
            self.log_mellem("  Iz,nød = In / (Kt·Kj·kgrp)")
            self.log_mellem(
                f"    = {In_g:.1f} / ({Kt_seg:.3f}·{Kj_seg:.3f}·{kgrp_seg:.3f}) "
                f"= {Iz_nod_seg:.2f} A"
            )
            self.log_mellem("  Iz,korr = Iz,tabel · Kt · Kj · kgrp")
            self.log_mellem(
                f"    = {iz_tab:.1f} · {Kt_seg:.3f} · {Kj_seg:.3f} · "
                f"{kgrp_seg:.3f} = {Iz_corr:.2f} A"
            )

            if In_g > Iz_corr:
                self.log_mellem(
                    "  ⇒ Overbelastningsbeskyttelse IKKE OK i dette segment!"
                )
                messagebox.showerror(
                    "Gruppe – overbelastning",
                    f"Overbelastningsbeskyttelse IKKE OK i segment {s['nr']} "
                    f"for gruppen {name}.\nIn = {In_g:.1f} A > Iz,korr = {Iz_corr:.1f} A.",
                )
                return
            else:
                self.log_mellem(
                    "  ⇒ Overbelastningsbeskyttelse OK i dette segment."
                )
            self.log_mellem("")

        # --------------------------------------------------------
        # SAMLET IMPEDANS FOR GRUPPEN
        # --------------------------------------------------------
        self.log_mellem("=== Impedans for gruppen (kabel W2-Wn) ===")
        Z_group_min = 0 + 0j
        Z_group_max = 0 + 0j

        for s in segments:
            length = s["length"]
            area = s["area"]

            Z_min_seg = cable_impedance_NKT(length, mat_g, area, phase_g, R_factor=1.5)
            Z_max_seg = cable_impedance_NKT(length, mat_g, area, phase_g, R_factor=1.0)

            self.log_mellem(
                f"Segment {s['nr']}: L = {length:.1f} m, S = {area:.1f} mm², "
                f"Z_min = {Z_min_seg.real:.5f} + j{Z_min_seg.imag:.5f} Ω, "
                f"Z_max = {Z_max_seg.real:.5f} + j{Z_max_seg.imag:.5f} Ω"
            )

            Z_group_min += Z_min_seg
            Z_group_max += Z_max_seg

        self.log_mellem("")
        self.log_mellem(
            "Samlet gruppe-impedans: "
            f"Z_gruppe_min = {Z_group_min.real:.5f} + j{Z_group_min.imag:.5f} Ω"
        )
        self.log_mellem(
            "                      "
            f"Z_gruppe_max = {Z_group_max.real:.5f} + j{Z_group_max.imag:.5f} Ω"
        )
        self.log_mellem("")

        # --------------------------------------------------------
        # IK,MIN FOR GRUPPEN
        # --------------------------------------------------------
        self.log_mellem("=== Ik,min (gruppe) ===")

        In_source = self.stik_data_ref.get("In_source")
        src_txt = self.stik_data_ref.get("src_txt", "In,stik")
        I_min_supply = self.stik_data_ref.get("I_min_supply")

        if I_min_supply is None or In_source is None:
            # fallback – brug gruppens egen In
            I_min_supply = 5.0 * In_g
            In_source = In_g
            src_txt = "In,gruppe"

        Z_sup_min = U_v / I_min_supply
        Z_kabel_min = Z_stik_min + Z_group_min
        Z_total_min = Z_sup_min + 2 * Z_kabel_min

        Ik_min_g = U_v / Z_total_min

        self.log_mellem("[FORMEL]")
        self.log_mellem("  Z_sup_min = U / (5·In_kilde)")
        self.log_mellem("  Z_kabel_min = Z_stik_min + Z_gruppe_min")
        self.log_mellem("  Z_total_min = Z_sup_min + 2·Z_kabel_min")
        self.log_mellem("  Ik,min = U / Z_total_min")
        self.log_mellem("")
        self.log_mellem("[MELLEMREGNINGER]")
        self.log_mellem(f"  In_kilde ({src_txt}) = {In_source:.1f} A")
        self.log_mellem(
            f"  I_min,supply = 5·In_kilde = 5·{In_source:.1f} = {I_min_supply:.1f} A"
        )
        self.log_mellem(f"  Z_sup_min = U / I_min,supply = {U_v} / {I_min_supply:.1f}")
        self.log_mellem(
            f"  Z_kabel_min = Z_stik_min + Z_gruppe_min = "
            f"({Z_stik_min.real:.6f} + j{Z_stik_min.imag:.6f}) + "
            f"({Z_group_min.real:.6f} + j{Z_group_min.imag:.6f})"
        )
        self.log_mellem(
            "  Z_total_min = Z_sup_min + 2·Z_kabel_min = "
            f"{Z_sup_min:.6f} + 2·("
            f"{Z_kabel_min.real:.6f} + j{Z_kabel_min.imag:.6f})"
        )
        self.log_mellem(
            f"  Ik,min = {U_v} / Z_total_min ≈ {format_current_with_angle(Ik_min_g)}"
        )
        self.log_mellem("")

        # --------------------------------------------------------
        # IK,MAX FOR GRUPPEN
        # --------------------------------------------------------
        self.log_mellem("=== Ik,max (gruppe) ===")

        Z_for_max = Z_stik_max + Z_group_max
        Ik_max_g, Z_total_max = ik_max_stik(U_v, Ik_trafo, cos_trafo, Z_for_max)

        self.log_mellem("[FORMEL]")
        self.log_mellem("  Ik,max,gruppe = U / (Z_trafo + Z_stik_max + Z_gruppe_max)")
        self.log_mellem("")
        self.log_mellem("[RESULTAT]")
        self.log_mellem(
            f"  Ik,max,gruppe ≈ {format_current_with_angle(Ik_max_g)}, "
            f"Z_total_max ≈ {Z_total_max.real:.5f} + j{Z_total_max.imag:.5f} Ω"
        )
        self.log_mellem("")

        # --------------------------------------------------------
        # SPÆNDINGSFALD – GRUPPE + STIK
        # --------------------------------------------------------
        self.log_mellem("=== Spændingsfald – gruppe og total ===")
        try:
            du_grp, _ = voltage_drop_ds(
                U_v, In_g, mat_g, sq_corr, total_len_group, phase_g, cos_load_g
            )
        except KeyError:
            messagebox.showerror(
                "Gruppe – spændingsfald",
                "Mangler R/X-data for dette tværsnit – kan ikke beregne ΔU.",
            )
            return

        du_grp_pct = du_grp / U_v * 100.0

        du_stik_grp, _ = voltage_drop_ds(
            U_v, In_g, mat_stik, S_stik, L_stik, phase_g, cos_load_g
        )
        du_tot = du_grp + du_stik_grp
        du_tot_pct = du_tot / U_v * 100.0

        self.log_mellem("[FORMEL]")
        self.log_mellem("  ΔU_gruppe = b · (q·l/S · cosφ + λ·l·sinφ) · I")
        self.log_mellem("  ΔU_total = ΔU_stikledning + ΔU_gruppe")
        self.log_mellem("")
        self.log_mellem("[RESULTATER]")
        self.log_mellem(
            f"  ΔU_gruppe ≈ {du_grp:.2f} V ({du_grp_pct:.2f} % af U_n)"
        )
        self.log_mellem(
            f"  ΔU_stik,gruppe ≈ {du_stik_grp:.2f} V → ΔU_total ≈ {du_tot:.2f} V "
            f"({du_tot_pct:.2f} %)"
        )
        if du_tot_pct > du_max_pct:
            self.log_mellem(
                f"  ⇒ ΔU_total overskrider grænsen på {du_max_pct:.2f} %!"
            )
        else:
            self.log_mellem(
                f"  ⇒ ΔU_total er indenfor grænsen på {du_max_pct:.2f} %."
            )
        self.log_mellem("")

        # --------------------------------------------------------
        # TERMISK (k²S² vs I²t)
        # --------------------------------------------------------
        self.log_mellem("=== Termisk (k²S² vs I²t) – gruppe ===")

        Ik_for_fuse_g = abs(Ik_min_g)

        fuse_manu = self.c_fuse_manu.get()
        fuse_ui_type = self.c_fuse_type.get()

        if hasattr(self, "lbl_mcb_curve"):
            self.lbl_mcb_curve.config(text="MCB-kurve: -")

        # Automatisk valg mellem MCB B og C ud fra Ik,min
        if fuse_ui_type == "MCB (auto B/C)":
            I5_B = 5.0 * In_g
            I5_C = 10.0 * In_g

            self.log_mellem("[OB – MCB automatisk B/C]")
            self.log_mellem(f"  In,MCB = {In_g:.1f} A")
            self.log_mellem(f"  Ik,min,gruppe = {Ik_for_fuse_g:.1f} A")
            self.log_mellem(f"  B-kurve kræver Ik,min > 5·In = {I5_B:.1f} A")
            self.log_mellem(f"  C-kurve kræver Ik,min > 10·In = {I5_C:.1f} A")

            if Ik_for_fuse_g > I5_C:
                fuse_type = "MCB C"
                if hasattr(self, "lbl_mcb_curve"):
                    self.lbl_mcb_curve.config(text="MCB-kurve: C")
                self.log_mellem("  ⇒ Ik,min er høj nok til C-kurve – C vælges.")
            elif Ik_for_fuse_g > I5_B:
                fuse_type = "MCB B"
                if hasattr(self, "lbl_mcb_curve"):
                    self.lbl_mcb_curve.config(text="MCB-kurve: B")
                self.log_mellem("  ⇒ Ik,min er kun nok til B-kurve – B vælges.")
            else:
                self.log_mellem(
                    "  ⇒ Ik,min er for lav til både B- og C-kurve – MCB kan ikke "
                    "bruges som OB-sikring i denne gruppe."
                )
                messagebox.showerror(
                    "Gruppe – MCB",
                    "Ik,min er for lav til både B- og C-kurve.\n"
                    "Vælg en anden gruppesikring (fx Diazed) eller ændr installationen.",
                )
                return
        else:
            fuse_type = fuse_ui_type

        try:
            curve_points_g, In_curve_g, Imin_factor_g = get_fuse_data(
                fuse_manu, fuse_type, In_g
            )
        except KeyError:
            messagebox.showerror(
                "Gruppe – sikring",
                "Kunne ikke finde sikringsdata for den valgte type.",
            )
            return

        Ik_for_fuse_g = Ik_min_g.real if isinstance(Ik_min_g, complex) else Ik_min_g
        if Ik_for_fuse_g < Imin_factor_g * In_g:
            self.log_mellem(
                "  [ADVARSEL] Ik,min for gruppen er under "
                f"{Imin_factor_g}·In for sikringstypen."
            )

        t_trip_g, fuse_text_g = fuse_trip_time_explain(
            In_curve_g, Ik_for_fuse_g, curve_points_g
        )

        k_val = 143.0 if mat_g == "Cu" else 94.0
        E_kabel_sum = 0.0
        for s in segments:
            S_i = s["area"]
            E_kabel_sum += k_val**2 * S_i**2

        E_bryde_g = Ik_for_fuse_g**2 * t_trip_g
        termisk_ok = E_kabel_sum > E_bryde_g

        self.log_mellem("[RESULTAT – termisk]")
        self.log_mellem(
            f"  t_trip (fra sikringskurve) ≈ {t_trip_g:.3f} s for In = {In_curve_g} A "
            f"({fuse_type})"
        )
        self.log_mellem(fuse_text_g)
        self.log_mellem("")
        self.log_mellem("[FORMEL – termisk energi]")
        self.log_mellem("  E_kabel_sum = Σ(k² · S_i²)")
        self.log_mellem("  E_bryde = Ik² · t")
        self.log_mellem("")

        areas_list = [s["area"] for s in segments]
        areas_str = " + ".join(f"{a}^2" for a in areas_list)

        self.log_mellem("[MELLEMREGNINGER – termisk]")
        self.log_mellem(f"  k = {k_val:.1f}")
        self.log_mellem(
            f"  S_i (segmenter) = {', '.join(f'{a:.1f}' for a in areas_list)} mm²"
        )
        self.log_mellem(
            f"  E_kabel_sum = {k_val}^2*({areas_str}) ≈ {E_kabel_sum:.1f}"
        )
        self.log_mellem(
            f"  E_bryde = Ik^2 · t = {Ik_for_fuse_g:.1f}^2 · {t_trip_g:.3f} "
            f"≈ {E_bryde_g:.1f}"
        )
        if termisk_ok:
            self.log_mellem(
                "  ⇒ k²S²-betingelse er OPFYLDT (E_kabel_sum > E_bryde)."
            )
        else:
            self.log_mellem(
                "  ⇒ k²S²-betingelse er IKKE opfyldt (E_kabel_sum ≤ E_bryde)!"
            )
        self.log_mellem("")

        # --------------------------------------------------------
        # OPDATER LABELS I GUI
        # --------------------------------------------------------
        self.lbl_Ikmin.config(text=format_current_with_angle(Ik_min_g))
        self.lbl_Ikmax.config(text=format_current_with_angle(Ik_max_g))
        self.lbl_du_grp.config(text=f"{du_grp:.2f} V ({du_grp_pct:.2f} %)")
        self.lbl_du_tot.config(text=f"{du_tot:.2f} V ({du_tot_pct:.2f} %)")
        self.lbl_termisk.config(text="OK" if termisk_ok else "IKKE OK")
