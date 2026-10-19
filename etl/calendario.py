"""Calendario de días hábiles de Chile (lunes a viernes, sin feriados)."""
import json
from pathlib import Path

import numpy as np

RUTA_FERIADOS = Path(__file__).with_name('feriados.json')


class Calendario:
    def __init__(self, ruta=RUTA_FERIADOS):
        datos = json.loads(Path(ruta).read_text(encoding='utf-8'))
        self.anios = sorted(int(k) for k in datos if k.isdigit())
        self.feriados = np.array(sorted(f for k, v in datos.items() if k.isdigit() for f in v),
                                 dtype='datetime64[D]')

    def cubre(self, fecha):
        """¿El calendario trae los feriados del año de `fecha`?"""
        return fecha.year in self.anios

    def entre(self, inicio, fin):
        """Días hábiles entre dos fechas (arreglos datetime64[D]). El día de
        ingreso no cuenta; el de término sí: igual que `dias_de_respuesta`."""
        return np.busday_count(inicio, fin, holidays=self.feriados)

    def sumar(self, inicio, n):
        """Fecha que queda `n` días hábiles después de `inicio` (vencimiento)."""
        return np.busday_offset(inicio, n, roll='forward', holidays=self.feriados)
