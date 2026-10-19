"""Limpieza, normalización, clasificación de plazos y armado del payload.

`procesar()` recibe la ruta del Excel y devuelve el diccionario que se escribe
como `datos.js`. No toca el disco: si algo falla, lanza `ErrorDeDatos` y quien
llama decide qué hacer (extraer.py deja intacto el datos.js anterior).

Decisiones sobre los datos (verificadas con el archivo del 16-10-2026):
  * Clave del expediente: `numero_expediente`; una fila por expediente (la
    fuente ya trae el estado actual, no una fila por actividad).
  * `dias_de_respuesta`: días hábiles enteros. En finalizadas, ingreso->término;
    en consultas en proceso, ingreso->fecha de generación del archivo. Se usa
    tal cual; solo se recalcula con el calendario si viene vacío, negativo o
    con decimales.
  * Vencimiento: ingreso + 10 días hábiles calculado aquí. `fecha_a_finalizar`
    coincide en el 99,99 %; las excepciones (plazo de 15 días por transparencia)
    se cuentan y se informan, pero el panel usa la regla institucional.
  * `cumplimiento` no se usa para clasificar; solo se contrasta.
"""
from datetime import datetime

import numpy as np
import pandas as pd

from . import reglas, validacion
from .calendario import Calendario
from .validacion import ErrorDeDatos

TEXTOS = ['numero_expediente', 'estado', 'region', 'consulta', 'espacio_atencion', 'actividad',
          'usuario_actividad', 'cumplimiento']
FECHAS = ['fecha_inicio', 'fecha_fin', 'fecha_inicio_act', 'fecha_a_finalizar']


def leer(ruta):
    columnas = validacion.encabezado(ruta)
    validacion.validar_columnas(columnas)
    usar = [c for c in reglas.CAMPOS_USADOS if c in columnas]
    df = pd.read_excel(ruta, usecols=usar, dtype=object)
    validacion.validar_no_vacio(len(df))
    return df


def _dia(serie):
    return serie.values.astype('datetime64[D]')


def limpiar(df, cal, fecha_ref=None, duplicados_a=None):
    """Devuelve (df limpio con columnas calculadas, informe)."""
    info = {'filas_leidas': int(len(df)), 'descartes': {}, 'avisos': []}
    n0 = len(df)
    df = df.copy()

    def descartar(mascara, motivo):
        nonlocal df
        n = int(mascara.sum())
        if n:
            info['descartes'][motivo] = info['descartes'].get(motivo, 0) + n
            df = df[~mascara].copy()

    for c in TEXTOS:
        if c in df:
            s = df[c].astype('string').str.strip()
            df[c] = s.where(s != '', pd.NA)
    df['estado'] = df['estado'].str.upper()

    # --- fechas: lo que no se puede leer queda NaT y se cuenta ---
    for c in FECHAS:
        crudo = df[c]
        df[c] = pd.to_datetime(crudo, errors='coerce')
        malas = int((df[c].isna() & crudo.notna()).sum())
        if malas:
            info['avisos'].append(f'{malas} fecha(s) ilegibles en «{c}» (se tratan como vacías).')

    # --- clave y duplicados ---
    descartar(df['numero_expediente'].isna(), 'sin folio')
    dup = df['numero_expediente'].duplicated(keep='last')
    if dup.any():
        validacion.exigir_proporcion(int(dup.sum()), n0, validacion.MAX_DUPLICADOS, 'Expedientes duplicados')
        if duplicados_a is not None:
            df.loc[dup, ['numero_expediente', 'estado', 'fecha_inicio']].to_csv(duplicados_a, index=False)
        info['avisos'].append(f'{int(dup.sum())} fila(s) repetidas por folio: se conservó la última de cada folio '
                              '(las descartadas quedan en logs/).')
    descartar(dup, 'folio duplicado')

    # --- estado y fechas esenciales ---
    conocido = df['estado'].isin([reglas.ESTADO_FINALIZADO, reglas.ESTADO_EN_PROCESO])
    if (~conocido).any():
        valores = ', '.join(sorted(map(str, df.loc[~conocido, 'estado'].fillna('(vacío)').unique())))
        info['avisos'].append(f'Estados no reconocidos (excluidos, no se asignan a ninguna clase): {valores}.')
    descartar(~conocido, 'estado no reconocido')
    descartar(df['fecha_inicio'].isna(), 'sin fecha de ingreso')
    fin = df['estado'] == reglas.ESTADO_FINALIZADO
    descartar(fin & df['fecha_fin'].isna(), 'finalizada sin fecha de término')
    descartar(df['fecha_fin'].notna() & (df['fecha_fin'] < df['fecha_inicio']), 'término anterior al ingreso')
    validacion.exigir_proporcion(sum(info['descartes'].values()), n0, validacion.MAX_DESCARTE,
                                 'Demasiadas filas inutilizables')
    if df.empty:
        raise ErrorDeDatos('Después de la limpieza no quedó ninguna fila válida.')

    fin = df['estado'] == reglas.ESTADO_FINALIZADO
    corte = df.loc[fin, 'fecha_fin'].max()
    if pd.isna(corte):
        raise ErrorDeDatos('No hay consultas finalizadas: no se puede determinar la fecha de corte.')
    # Fecha hasta la que el sistema contó los días de las consultas en proceso:
    # la de generación del archivo; sin ella, el corte.
    ref = pd.Timestamp(fecha_ref).normalize() if fecha_ref is not None else corte
    info['corte'] = corte.date().isoformat()
    info['ref_en_proceso'] = ref.date().isoformat()

    for f in (df['fecha_inicio'].max(), ref):
        if not cal.cubre(f):
            info['avisos'].append(f'feriados.json no incluye {f.year}: los vencimientos pueden quedar desfasados.')
    futuras = int((df['fecha_inicio'] > ref).sum())
    if futuras:
        info['avisos'].append(f'{futuras} consulta(s) con ingreso posterior a la fecha de referencia {ref.date()}.')

    # --- días hábiles: los del sistema, o recalculados si no sirven ---
    d = pd.to_numeric(df['dias_de_respuesta'], errors='coerce')
    mala = d.isna() | (d < 0) | (d != d.round())
    hasta = df['fecha_fin'].where(fin, ref)
    calc = pd.Series(cal.entre(_dia(df['fecha_inicio']), _dia(hasta)), index=df.index)
    if mala.any():
        info['avisos'].append(f'{int(mala.sum())} fila(s) con «dias_de_respuesta» vacío, negativo o con decimales: '
                              'se recalculó con el calendario de días hábiles.')
    info['dias_recalculados'] = int(mala.sum())
    df['dias'] = d.where(~mala, calc).astype(int)

    # Contraste con el calendario: informativo (si la fuente cambia de criterio, aparece aquí).
    desc_fin = int((df.loc[fin & ~mala, 'dias'] != calc[fin & ~mala]).sum())
    desc_proc = int((df.loc[~fin & ~mala, 'dias'] != calc[~fin & ~mala]).sum())
    info['descalce_dias'] = {'finalizadas': desc_fin, 'en_proceso': desc_proc}
    if desc_fin or desc_proc:
        info['avisos'].append(f'«dias_de_respuesta» difiere del calendario de días hábiles en {desc_fin} finalizada(s) '
                              f'y {desc_proc} en proceso; se usa el valor de la fuente.')

    # --- vencimiento: ingreso + 10 días hábiles ---
    venc = pd.to_datetime(cal.sumar(_dia(df['fecha_inicio']), reglas.PLAZO_HABILES))
    df['vencimiento'] = venc
    distinto = df['fecha_a_finalizar'].notna() & (df['fecha_a_finalizar'] != df['vencimiento'])
    info['vencimiento_distinto'] = int(distinto.sum())
    if distinto.any():
        info['avisos'].append(f'{int(distinto.sum())} consulta(s) con «fecha_a_finalizar» distinta de ingreso + 10 días '
                              'hábiles (plazo especial en la fuente): el panel usa el plazo institucional de 10 días.')

    # --- clase ---
    df['clase'] = [reglas.clasificar(e, x) for e, x in zip(df['estado'], df['dias'])]

    # Contraste con `cumplimiento` de la fuente (no se usa para clasificar).
    fuera = df['clase'].isin([1, 4, 5, 6, 7])
    discrepa = int(((df['cumplimiento'] == 'VENCIDO') != fuera).sum())
    info['cumplimiento_discrepa'] = discrepa
    if discrepa:
        info['avisos'].append(f'«cumplimiento» de la fuente no coincide con la regla de 10 días hábiles en {discrepa} '
                              'consulta(s); el panel usa la regla institucional.')

    # --- nombres para mostrar ---
    df['region_n'] = _normalizar(df['region'], dict(reglas.REGIONES), 'región', info)
    df['consulta_n'] = _normalizar(df['consulta'], reglas.CONSULTAS, 'consulta', info, titulo=True)
    df['espacio_n'] = _normalizar(df['espacio_atencion'], reglas.ESPACIOS, 'espacio de atención', info, titulo=True)

    df['materia_n'] = _materia(df, info)

    info['filas_validas'] = int(len(df))
    return df, info


def _materia(df, info):
    """Materia de cada consulta, a partir de `motivo_consulta` (reglas.MOTIVO_MATERIA)."""
    if 'motivo_consulta' not in df:
        info['avisos'].append('El archivo no trae «motivo_consulta»: toda consulta queda como «' + reglas.SIN_CLASIFICAR + '».')
        return pd.Series(reglas.SIN_CLASIFICAR, index=df.index)
    llaves = {k.casefold(): v for k, v in reglas.MOTIVO_MATERIA.items()}
    motivo = df['motivo_consulta'].astype('string').str.strip()
    # Un motivo vacío se trata como «-», que la tabla de homologación manda a «Otros temas ministeriales».
    materia = motivo.fillna('-').str.casefold().map(llaves).fillna(reglas.SIN_CLASIFICAR)
    nuevos = sorted(motivo[materia == reglas.SIN_CLASIFICAR].dropna().unique())
    if nuevos:
        info['avisos'].append('Motivos de consulta sin materia asignada en reglas.py (quedan como «' + reglas.SIN_CLASIFICAR + '»): '
                              + ', '.join(nuevos) + '.')
    return materia


def _normalizar(serie, mapa, que, info, titulo=False):
    llaves = {k.casefold(): v for k, v in mapa.items()}
    nuevos = []

    def f(v):
        if pd.isna(v):
            return reglas.SIN_DATO
        k = str(v).casefold()
        if k in llaves:
            return llaves[k]
        nuevo = str(v).replace('_', ' ').capitalize() if titulo else str(v)
        if nuevo not in nuevos:
            nuevos.append(nuevo)
        return nuevo

    out = serie.map(f)
    if nuevos:
        info['avisos'].append(f'Valores nuevos en «{que}» que no estaban en reglas.py (se muestran con su nombre original): '
                              + ', '.join(nuevos) + '.')
    if (out == reglas.SIN_DATO).any():
        info['avisos'].append(f'{int((out == reglas.SIN_DATO).sum())} fila(s) sin {que}: se agrupan como «{reglas.SIN_DATO}».')
    return out


def _lista(serie, orden):
    """Categorías en el orden de `orden` y luego las nuevas por aparición."""
    presentes = list(dict.fromkeys(serie))
    primero = [x for x in orden if x in presentes]
    return primero + [x for x in presentes if x not in primero]


def armar(df, info, nombre_archivo, generado_archivo, url):
    """Payload de datos.js a partir del DataFrame limpio."""
    regiones = _lista(df['region_n'], [n for _, n in reglas.REGIONES])
    consultas = _lista(df['consulta_n'], list(reglas.CONSULTAS.values()))
    espacios = _lista(df['espacio_n'], list(reglas.ESPACIOS.values()))
    materias = _lista(df['materia_n'], reglas.MATERIAS)
    ir = {n: i for i, n in enumerate(regiones)}
    ic = {n: i for i, n in enumerate(consultas)}
    ie = {n: i for i, n in enumerate(espacios)}
    imt = {n: i for i, n in enumerate(materias)}

    dia0 = df['fecha_inicio'].min().normalize()
    off = lambda s: ((s.dt.normalize() - dia0).dt.days)

    t = pd.DataFrame({
        'fi': off(df['fecha_inicio']),
        'c': df['consulta_n'].map(ic), 'e': df['espacio_n'].map(ie), 'r': df['region_n'].map(ir),
        'k': df['clase'], 'mt': df['materia_n'].map(imt),
    })
    cubo = t.groupby(['fi', 'c', 'e', 'r', 'k', 'mt'], sort=True).size().reset_index(name='n')

    # Evolución mensual: por mes de TÉRMINO, solo finalizadas. Cubo aparte, sin
    # fecha de ingreso ni región: así esos filtros no pueden alterarla.
    f = df[df['clase'].isin([reglas.CLASE_FIN_DENTRO, reglas.CLASE_FIN_FUERA])]
    meses = pd.period_range(f['fecha_fin'].min(), f['fecha_fin'].max(), freq='M')
    im = {str(m): i for i, m in enumerate(meses)}
    ev = pd.DataFrame({
        'm': f['fecha_fin'].dt.to_period('M').astype(str).map(im),
        'c': f['consulta_n'].map(ic), 'e': f['espacio_n'].map(ie), 'k': f['clase'], 'mt': f['materia_n'].map(imt),
    }).groupby(['m', 'c', 'e', 'k', 'mt']).size().reset_index(name='n')

    # Cartera pendiente: una fila por consulta en proceso.
    p = df[df['estado'] == reglas.ESTADO_EN_PROCESO].copy()
    actividades = sorted(p['actividad'].dropna().unique())
    usuarios = sorted(p['usuario_actividad'].dropna().unique())
    iact = {a: i for i, a in enumerate(actividades)}
    iusu = {u: i for i, u in enumerate(usuarios)}
    pend = [
        [folio, ir[r], ic[c], ie[e], int(fi), int(ve), int(di), max(0, int(di) - reglas.PLAZO_HABILES),
         iact.get(a, -1), int(fa) if pd.notna(fa) else -1, iusu.get(u, -1), int(k), imt[mt]]
        for folio, r, c, e, fi, ve, di, a, fa, u, k, mt in zip(
            p['numero_expediente'], p['region_n'], p['consulta_n'], p['espacio_n'], off(p['fecha_inicio']),
            off(p['vencimiento']), p['dias'], p['actividad'],
            off(p['fecha_inicio_act']).where(p['fecha_inicio_act'].notna()), p['usuario_actividad'], p['clase'], p['materia_n'])
    ]
    pend.sort(key=lambda x: (-x[7], x[4]))

    ahora = datetime.now().replace(microsecond=0)
    return {
        'generado': ahora.isoformat(),
        'fuente': {'archivo': nombre_archivo, 'archivoGenerado': generado_archivo.isoformat() if generado_archivo else None,
                   'url': url},
        'corte': info['corte'],
        'refEnProceso': info['ref_en_proceso'],
        'plazo': reglas.PLAZO_HABILES,
        'proximaDesde': reglas.PROXIMA_DESDE,
        'clases': reglas.CLASES,
        'dia0': dia0.date().isoformat(),
        'regiones': regiones, 'consultas': consultas, 'espacios': espacios, 'materias': materias,
        'actividades': actividades, 'usuarios': usuarios,
        'cubo': cubo[['fi', 'c', 'e', 'r', 'k', 'n', 'mt']].to_numpy().ravel().tolist(),
        'evolucion': {'meses': [str(m) for m in meses],
                      'filas': ev[['m', 'c', 'e', 'k', 'n', 'mt']].to_numpy().ravel().tolist()},
        'pendientes': pend,
        'calidad': {k: info[k] for k in ('filas_leidas', 'filas_validas', 'descartes', 'avisos', 'descalce_dias',
                                         'vencimiento_distinto', 'cumplimiento_discrepa', 'dias_recalculados')},
    }


def procesar(ruta, cal=None, fecha_archivo=None, url=None, duplicados_a=None):
    cal = cal or Calendario()
    df = leer(ruta)
    df, info = limpiar(df, cal, fecha_archivo, duplicados_a)
    return armar(df, info, getattr(ruta, 'name', str(ruta)), fecha_archivo, url), info
