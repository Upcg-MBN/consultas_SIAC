"""Actualiza el dashboard SIAC: descarga el Excel, lo valida, calcula y escribe datos.js.

    python extraer.py                    descarga el Excel más reciente de la intranet
    python extraer.py --reprocesar       vuelve a procesar el último Excel ya descargado (sin red)
    python extraer.py --archivo RUTA     carga manual de un Excel (p. ej. bajado a mano)

Si algo falla, datos.js queda como estaba: el panel sigue mostrando la última
actualización exitosa y estado.js avisa que el último intento falló. Cada
intento queda en logs/actualizaciones.csv; los errores, con su detalle, en
logs/errores.log. Código de salida: 0 = éxito, 1 = falló.
"""
import argparse
import sys
from datetime import datetime
from pathlib import Path

from etl import descarga, publicacion, transformacion
from etl.validacion import ErrorDeDatos

RAIZ = Path(__file__).resolve().parent
ORIGEN = RAIZ / 'origen'
LOGS = RAIZ / 'logs'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--archivo', type=Path, help='procesa este Excel en vez de descargar')
    g.add_argument('--reprocesar', action='store_true', help='usa el último Excel descargado, sin ir a la red')
    ap.add_argument('--salida', type=Path, default=RAIZ, help='carpeta donde se escribe datos.js (por defecto, la del proyecto)')
    a = ap.parse_args(argv)

    inicio = datetime.now()
    archivo = None
    info = {}
    try:
        if a.archivo:
            ruta = a.archivo
        elif a.reprocesar:
            ruta = descarga.ultimo_local(ORIGEN)
        else:
            print('Descargando el Excel más reciente de la intranet…')
            ruta = descarga.descargar_ultimo(ORIGEN)
        archivo = ruta.name
        print(f'Procesando {archivo} (puede tardar un minuto)…')
        payload, info = transformacion.procesar(
            ruta, fecha_archivo=descarga.fecha_de_nombre(ruta),
            url=descarga.URL_INDICE if not a.archivo else None,
            duplicados_a=LOGS / f'duplicados_{inicio:%Y%m%d_%H%M%S}.csv')
        publicacion.comprobar(payload, info['filas_validas'])
        publicacion.publicar_datos(payload, a.salida)
        resumen = (f'{info["filas_validas"]:,} consultas válidas de {info["filas_leidas"]:,} leídas; '
                   f'corte {info["corte"]}; {len(payload["pendientes"])} en proceso').replace(',', '.')
        publicacion.publicar_estado(a.salida, 'ok', resumen, archivo)
        publicacion.registrar(LOGS, inicio, 'OK', archivo, info['filas_leidas'], info['filas_validas'], info['corte'],
                              resumen + (' | AVISOS: ' + ' / '.join(info['avisos']) if info['avisos'] else ''))
        print('OK —', resumen)
        for av in info['avisos']:
            print('  aviso:', av)
        return 0
    except Exception as e:                           # cualquier fallo: conservar datos.js y dejar rastro
        es_esperado = isinstance(e, (ErrorDeDatos, descarga.ErrorDescarga))
        mensaje = str(e) if es_esperado else f'Error inesperado: {type(e).__name__}: {e}'
        try:
            publicacion.publicar_estado(a.salida, 'error', mensaje, archivo)
        except OSError:
            pass
        publicacion.registrar(LOGS, inicio, 'ERROR', archivo, info.get('filas_leidas'), None, None, mensaje,
                              detalle=publicacion.traza())
        print('ERROR —', mensaje, '\nSe conserva el datos.js anterior.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
