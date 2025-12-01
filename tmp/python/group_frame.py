import tkinter as tk
from tkinter import ttk

from group_frame_base import GroupFrameBase
from group_calc import GroupCalcMixin


class GroupFrame(GroupFrameBase, GroupCalcMixin):
    """
    Kombinerer:
      - GroupFrameBase  (GUI / layout for én gruppe)
      - GroupCalcMixin  (alle beregninger for gruppen)

    Main.py opretter GroupFrame, og knappen "Beregn gruppe"
    her kalder GroupCalcMixin.beregn().
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
        # Byg hele grund-GUI'en fra GroupFrameBase
        super().__init__(
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
        )

        # Find næste ledige række i grid (GroupFrameBase har allerede lagt alt andet)
        cols, rows = self.grid_size()  # rows = antal rækker; næste index = rows

        # Knap til at beregne lige netop denne gruppe
        btn_beregn = ttk.Button(self, text="Beregn gruppe", command=self.beregn)
        btn_beregn.grid(
            row=rows,
            column=0,
            columnspan=6,
            sticky="e",
            pady=(5, 0),
        )
