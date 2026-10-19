"""Publicación: comprobación cruzada, escritura segura de datos.js / estado.js y
registro de cada actualización.

Una actualización fallida nunca reemplaza un datos.js válido: el payload se
escribe en un archivo temporal, se relee, y solo entonces `os.replace` lo deja
en su lugar (la operación es atómica en el mismo volumen).
"""
import csv
import json
import os
import traceback
from datetime import datetime
from pathlib import Path

from .validacion import ErrorDeDatos

ENCABEZADO = '// Generado por extraer.py — no editar a mano.\n'


def comprobar(payload, filas_validas):
    """Cuadra los totales entre los distintos cubos antes de publicar."""
    cubo = payload['cubo']      # [ingreso, consulta, espacio, región, clase, n, materia]
    total = sum(cubo[i + 5] for i in range(0, len(cubo), 7))
    if total != filas_validas:
        raise ErrorDeDatos(f'El cubo suma {total} consultas y el archivo trae {filas_validas} válidas.')
    proc = sum(cubo[i + 5] for i in range(0, len(cubo), 7) if cubo[i + 4] >= 2)
    if proc != len(payload['pendientes']):
        raise ErrorDeDatos(f'El cubo trae {proc} consultas en proceso y la tabla de pendientes {len(payload["pendientes"])}.')
    ev = payload['evolucion']['filas']      # [mes, consulta, espacio, clase, n, materia]
    fin = sum(cubo[i + 5] for i in range(0, len(cubo), 7) if cubo[i + 4] < 2)
    if sum(ev[i + 4] for i in range(0, len(ev), 6)) != fin:
        raise ErrorDeDatos('La evolución mensual no suma las consultas finalizadas del cubo.')
    for lista, clave in (('regiones', 3), ('consultas', 1), ('espacios', 2), ('materias', 6)):
        n = len(payload[lista])
        if any(cubo[i + clave] >= n for i in range(0, len(cubo), 7)):
            raise ErrorDeDatos(f'El cubo apunta a un índice fuera de «{lista}».')
    if any(ev[i + 5] >= len(payload['materias']) for i in range(0, len(ev), 6)):
        raise ErrorDeDatos('La evolución mensual apunta a una materia fuera de «materias».')


def _escribir_atomico(ruta, texto):
    ruta = Path(ruta)
    tmp = ruta.with_suffix(ruta.suffix + '.tmp')
    tmp.write_text(texto, encoding='utf-8')
    os.replace(tmp, ruta)


def publicar_datos(payload, carpeta):
    texto = ENCABEZADO + 'window.DATOS = ' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n'
    carpeta = Path(carpeta)
    tmp = carpeta / 'datos.js.tmp'
    tmp.write_text(texto, encoding='utf-8')
    # Relee lo escrito: si no vuelve a ser el mismo JSON, no se publica.
    leido = tmp.read_text(encoding='utf-8')
    if json.loads(leido[len(ENCABEZADO) + len('window.DATOS = '):].rstrip().rstrip(';')) != payload:
        tmp.unlink(missing_ok=True)
        raise ErrorDeDatos('datos.js no se escribió completo; se conserva la versión anterior.')
    os.replace(tmp, carpeta / 'datos.js')
    return carpeta / 'datos.js'


def publicar_estado(carpeta, resultado, mensaje, archivo=None):
    """estado.js: resultado del ÚLTIMO intento, sea bueno o malo. El panel lo
    muestra si el último intento falló (los datos son los del último éxito)."""
    estado = {'intento': datetime.now().replace(microsecond=0).isoformat(), 'resultado': resultado,
              'mensaje': mensaje, 'archivo': archivo}
    _escribir_atomico(Path(carpeta) / 'estado.js',
                      ENCABEZADO + 'window.ESTADO_ACT = ' + json.dumps(estado, ensure_ascii=False) + ';\n')


def registrar(carpeta_logs, inicio, resultado, archivo, filas_leidas, filas_validas, corte, mensaje, detalle=None):
    """Una línea por actualización en logs/actualizaciones.csv; el detalle de
    un error (traceback) va aparte en logs/errores.log."""
    carpeta = Path(carpeta_logs)
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta = carpeta / 'actualizaciones.csv'
    nuevo = not ruta.exists()
    with ruta.open('a', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        if nuevo:
            w.writerow(['inicio', 'fin', 'resultado', 'archivo', 'filas_leidas', 'filas_validas', 'corte', 'mensaje'])
        w.writerow([inicio.isoformat(timespec='seconds'), datetime.now().isoformat(timespec='seconds'), resultado,
                    archivo or '', filas_leidas if filas_leidas is not None else '',
                    filas_validas if filas_validas is not None else '', corte or '', mensaje])
    if detalle:
        with (carpeta / 'errores.log').open('a', encoding='utf-8') as f:
            f.write(f'--- {inicio.isoformat(timespec="seconds")} {archivo or ""}\n{detalle}\n')


def traza():
    return traceback.format_exc()
