"""Descarga del Excel diario desde la intranet.

La dirección `detalle_consulta_siac.php` no entrega el archivo: es una página
HTML (sin autenticación, solo accesible desde la red del Ministerio) con un
enlace por cada Excel generado, del más nuevo al más antiguo. Hay que leer ese
índice, elegir el más reciente y bajarlo.

El archivo se baja a un nombre temporal y solo se renombra si parece un .xlsx
completo, para que una descarga cortada nunca quede como archivo válido.
"""
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

URL_INDICE = 'http://reportes.mbienes.cl/etl-output/siac/detalle_consulta/detalle_consulta_siac.php'
PATRON = re.compile(r"href=['\"]([^'\"]*?(Detalle_Consulta_SIAC_(\d{8})_(\d{6})\.xlsx))[^'\"]*['\"]", re.I)
MIN_BYTES = 10_000      # un Excel real pesa decenas de MB; esto descarta páginas de error
INTENTOS = 3
CONSERVAR = 7           # cuántos archivos diarios quedan en origen/


class ErrorDescarga(Exception):
    pass


def _get(url, timeout=60):
    ultimo = None
    for intento in range(1, INTENTOS + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'siac-dashboard/1.0'})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            ultimo = e
            if intento < INTENTOS:
                time.sleep(2 * intento)
    raise ErrorDescarga(f'No se pudo acceder a {url} tras {INTENTOS} intentos: {ultimo}. '
                        'Este enlace solo responde dentro de la red del Ministerio.')


def listar(html, base):
    """[(fecha_hora, url, nombre)] de más nuevo a más antiguo."""
    out = {}
    for href, nombre, f, h in PATRON.findall(html):
        out[nombre] = (datetime.strptime(f + h, '%Y%m%d%H%M%S'), urllib.parse.urljoin(base, href.split('?')[0]), nombre)
    return sorted(out.values(), reverse=True)


def fecha_de_nombre(ruta):
    """Fecha y hora de generación que lleva el nombre del archivo, o None."""
    m = re.search(r'(\d{8})_(\d{6})', Path(ruta).name)
    return datetime.strptime(m.group(1) + m.group(2), '%Y%m%d%H%M%S') if m else None


def descargar_ultimo(carpeta, url_indice=URL_INDICE):
    """Baja el Excel más reciente a `carpeta` y devuelve su ruta."""
    carpeta = Path(carpeta)
    carpeta.mkdir(parents=True, exist_ok=True)
    html = _get(url_indice, 30).decode('utf-8', 'replace')
    archivos = listar(html, url_indice)
    if not archivos:
        raise ErrorDescarga('El índice de la intranet no trae ningún enlace a un Excel '
                            '(¿cambió el formato de la página?).')
    _, url, nombre = archivos[0]
    destino = carpeta / nombre
    if destino.exists() and destino.stat().st_size >= MIN_BYTES:
        return destino      # ya está: reprocesar no vuelve a bajar 35 MB
    datos = _get(url, 300)
    if len(datos) < MIN_BYTES or datos[:2] != b'PK':
        raise ErrorDescarga(f'{nombre}: la descarga no es un .xlsx válido ({len(datos)} bytes).')
    parcial = destino.with_suffix('.part')
    parcial.write_bytes(datos)
    parcial.replace(destino)
    _limpiar(carpeta)
    return destino


def _limpiar(carpeta):
    viejos = sorted(carpeta.glob('Detalle_Consulta_SIAC_*.xlsx'), key=lambda p: p.name, reverse=True)[CONSERVAR:]
    for p in viejos:
        p.unlink(missing_ok=True)


def ultimo_local(carpeta):
    """Excel más reciente ya descargado, para reprocesar sin red."""
    archivos = sorted(Path(carpeta).glob('Detalle_Consulta_SIAC_*.xlsx'), key=lambda p: p.name, reverse=True)
    if not archivos:
        raise ErrorDescarga(f'No hay Excel descargados en {carpeta}.')
    return archivos[0]
