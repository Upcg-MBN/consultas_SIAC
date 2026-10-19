"""Validación del archivo: estructura (columnas) y calidad (filas).

Dos niveles:
  * error  -> `ErrorDeDatos`: la carga se detiene y datos.js no se toca.
  * aviso  -> se anota en el informe y en el registro; la carga sigue.
"""
import zipfile
from pathlib import Path

from .reglas import CAMPOS_OBLIGATORIOS

# Porcentaje de filas que se pueden descartar o recalcular antes de considerar
# que el archivo está defectuoso y no vale la pena publicarlo.
MAX_DESCARTE = 0.02
MAX_DUPLICADOS = 0.01
MAX_DESCALCE_DIAS = 0.05


class ErrorDeDatos(Exception):
    """El archivo no sirve para actualizar el panel."""


def encabezado(ruta):
    """Nombres de columna del Excel, leyendo solo la primera fila."""
    import openpyxl
    ruta = Path(ruta)
    if not ruta.exists():
        raise ErrorDeDatos(f'No existe el archivo {ruta}.')
    if ruta.stat().st_size == 0:
        raise ErrorDeDatos(f'El archivo {ruta.name} está vacío (0 bytes).')
    if not zipfile.is_zipfile(ruta):
        raise ErrorDeDatos(f'{ruta.name} no es un libro de Excel (.xlsx) válido; puede estar corrupto o cortado.')
    try:
        wb = openpyxl.load_workbook(ruta, read_only=True)
        try:
            hoja = wb.worksheets[0]
            # El archivo del 19-10-2026 declara <dimension ref="A1"/>: sin esto,
            # openpyxl en modo lectura devuelve solo la columna A.
            hoja.reset_dimensions()
            fila = next(hoja.iter_rows(max_row=1, values_only=True), None)
        finally:
            wb.close()
    except Exception as e:                           # openpyxl lanza tipos muy variados
        raise ErrorDeDatos(f'No se pudo leer {ruta.name}: {e}') from e
    if not fila or not any(fila):
        raise ErrorDeDatos(f'La primera hoja de {ruta.name} no tiene encabezados.')
    return [str(c).strip() for c in fila if c is not None]


def validar_columnas(columnas):
    faltan = [c for c in CAMPOS_OBLIGATORIOS if c not in columnas]
    if faltan:
        raise ErrorDeDatos('El archivo cambió de estructura: faltan las columnas ' + ', '.join(faltan) + '.')


def validar_no_vacio(n_filas):
    if n_filas == 0:
        raise ErrorDeDatos('El archivo no trae ninguna fila de datos.')


def exigir_proporcion(cantidad, total, maximo, mensaje):
    """Detiene la carga si `cantidad` supera `maximo` (proporción) de `total`."""
    if total and cantidad / total > maximo:
        raise ErrorDeDatos(f'{mensaje}: {cantidad:,} de {total:,} filas ({cantidad / total:.1%}), '
                           f'más del {maximo:.0%} tolerado.'.replace(',', '.'))
