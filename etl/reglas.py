"""Reglas de negocio del SIAC, en un solo lugar.

Todo lo que el panel muestra como «dentro de plazo», «próxima a vencer» o
«vencida» sale de `clasificar()`. El navegador no vuelve a decidir nada: solo
cuenta las clases que escribe `datos.js` (ver `CLASES`).
"""

# Plazo institucional: 10 días hábiles. Verificado con los datos reales: en las
# 126.556 consultas finalizadas, `dias_de_respuesta` es exactamente el conteo
# de días hábiles chilenos (lun-vie sin feriados) entre ingreso y término.
PLAZO_HABILES = 10
PROXIMA_DESDE = 8          # «próxima a vencer»: de 8 a 10 días hábiles, ambos incluidos

ESTADO_FINALIZADO = 'FINALIZADO'
ESTADO_EN_PROCESO = 'EN PROCESO'

# Clase de cada consulta. El orden es el del payload: no reordenar sin cambiar
# agregar.js. `grupo`: fin = finalizada, proc = en proceso.
#   venc = vencida (superó el plazo)   prox = próxima a vencer
CLASES = [
    {'id': 0, 'grupo': 'fin',  'nombre': 'Finalizada dentro de plazo', 'desde': 0,   'hasta': PLAZO_HABILES},
    {'id': 1, 'grupo': 'fin',  'nombre': 'Finalizada fuera de plazo',  'desde': PLAZO_HABILES + 1, 'hasta': None},
    {'id': 2, 'grupo': 'proc', 'nombre': 'En proceso, 0 a 7 días hábiles',    'desde': 0,   'hasta': PROXIMA_DESDE - 1},
    {'id': 3, 'grupo': 'proc', 'nombre': 'En proceso, 8 a 10 días hábiles',   'desde': PROXIMA_DESDE, 'hasta': PLAZO_HABILES, 'prox': True},
    {'id': 4, 'grupo': 'proc', 'nombre': 'En proceso, 11 a 20 días hábiles',  'desde': 11,  'hasta': 20,  'venc': True},
    {'id': 5, 'grupo': 'proc', 'nombre': 'En proceso, 21 a 60 días hábiles',  'desde': 21,  'hasta': 60,  'venc': True},
    {'id': 6, 'grupo': 'proc', 'nombre': 'En proceso, 61 a 100 días hábiles', 'desde': 61,  'hasta': 100, 'venc': True},
    {'id': 7, 'grupo': 'proc', 'nombre': 'En proceso, más de 100 días hábiles', 'desde': 101, 'hasta': None, 'venc': True},
]
CLASE_FIN_DENTRO, CLASE_FIN_FUERA = 0, 1
CLASES_PROC = [c['id'] for c in CLASES if c['grupo'] == 'proc']


def clasificar(estado, dias):
    """Clase (0-7) de una consulta, o None si el estado no es reconocido.

    `dias` son días hábiles enteros >= 0. Una consulta con exactamente 10 días
    está dentro de plazo; con 11, vencida / fuera de plazo.
    """
    if estado == ESTADO_FINALIZADO:
        return CLASE_FIN_DENTRO if dias <= PLAZO_HABILES else CLASE_FIN_FUERA
    if estado == ESTADO_EN_PROCESO:
        for c in CLASES:
            if c['grupo'] == 'proc' and dias >= c['desde'] and (c['hasta'] is None or dias <= c['hasta']):
                return c['id']
    return None


# ---------------------------------------------------------------- columnas ---
# Campos de la fuente que el panel usa (README §4). No se leen los demás: así
# RUT, teléfono, correo y fecha de nacimiento no entran nunca al proceso.
CAMPOS_USADOS = [
    'sistema', 'numero_expediente', 'process_name', 'estado', 'region', 'fecha_inicio', 'fecha_fin',
    'ano', 'actividad', 'usuario_actividad', 'fecha_inicio_act', 'fecha_termino_act', 'tipo_solte',
    'sexo', 'fecha_a_finalizar', 'tipo_consulta_inicial', 'cumplimiento', 'consulta',
    'espacio_atencion', 'dias_de_respuesta', 'mes', 'motivo_consulta', 'tipo_reclamo',
    'nivel_educacional', 'origen_etnico',
]
# Sin estas, el panel no puede calcular nada: la ausencia detiene la carga.
CAMPOS_OBLIGATORIOS = [
    'numero_expediente', 'estado', 'region', 'fecha_inicio', 'fecha_fin', 'actividad',
    'usuario_actividad', 'fecha_inicio_act', 'fecha_a_finalizar', 'cumplimiento', 'consulta',
    'espacio_atencion', 'dias_de_respuesta',
]

# ------------------------------------------------------------ nombres ---------
# Región/oficina como viene en la fuente -> nombre para mostrar. El orden de la
# lista es el del panel (norte a sur, luego oficinas). Una región nueva no se
# inventa: pasa con su nombre original, al final, y la carga lo avisa.
REGIONES = [
    ('Arica y Parinacota', 'Arica y Parinacota'),
    ('Tarapaca', 'Tarapacá'),
    ('Antofagasta', 'Antofagasta'),
    ('Atacama', 'Atacama'),
    ('Coquimbo', 'Coquimbo'),
    ('Valparaiso', 'Valparaíso'),
    ('Metropolitana De Santiago', 'Metropolitana de Santiago'),
    ("Del Libertador Gral. Bernardo O'Higgins", "O'Higgins"),
    ('Del Maule', 'Maule'),
    ('De Ñuble', 'Ñuble'),
    ('Del Biobio', 'Biobío'),
    ('De La Araucania', 'La Araucanía'),
    ('De Los Rios', 'Los Ríos'),
    ('Los Lagos', 'Los Lagos'),
    ('Aysen Del Gral. Carlos Ibanez Del Campo', 'Aysén'),
    ('Magallanes Y De La Antartica Chilena', 'Magallanes y de la Antártica Chilena'),
    ('Oficina Central', 'Oficina Central'),
    ('Oficina Provincial de Calama', 'Oficina Provincial de Calama'),
    ('Oficina Provincial de Chiloe', 'Oficina Provincial de Chiloé'),
    ('Oficina Provincial de Osorno', 'Oficina Provincial de Osorno'),
    ('Oficina Provincial de Ovalle', 'Oficina Provincial de Ovalle'),
    ('Oficina Provincial de Palena', 'Oficina Provincial de Palena'),
    ('Oficina Provincial de La Unión', 'Oficina Provincial de La Unión'),
]

CONSULTAS = {
    'CONSULTA': 'Consulta', 'FUTURO_TRAMITE': 'Futuro trámite', 'RECLAMO': 'Reclamo',
    'FELICITACION': 'Felicitación', 'SUGERENCIA': 'Sugerencia', '-': 'Sin clasificar',
}
ESPACIOS = {
    'PRESENCIAL': 'Presencial', 'WEB': 'Web', 'CORREO': 'Correo', 'LINEA_800': 'Línea 800', 'BUZON': 'Buzón',
}
SIN_DATO = 'Sin dato'

# Materia: agrupa los ~39 valores de `motivo_consulta` en 5 (tabla de homologación
# entregada por el usuario el 19-10-2026). La llave es el motivo tal como viene
# en la fuente, comparado sin distinguir mayúsculas. Un motivo que no esté aquí
# se muestra como «Sin clasificar» y la carga lo avisa: no se adivina.
MATERIAS = ['Estado de avance trámite', 'Otros temas ministeriales', 'Trámites DBN', 'Trámites DCPR', 'Trámites DICAT']
SIN_CLASIFICAR = 'Sin clasificar'
MOTIVO_MATERIA = {
    'Estado De Avance De Tramite': 'Estado de avance trámite',
    '-': 'Otros temas ministeriales',
    'Consulta Secretaría Ejecutiva Snit': 'Otros temas ministeriales',
    'Consulta Sobre Cómo Operan Los Sistemas': 'Otros temas ministeriales',
    'Datos De Oficinas Ministeriales': 'Otros temas ministeriales',
    'Denuncia De Hechos Ilícitos': 'Otros temas ministeriales',
    'Derechos Humanos': 'Otros temas ministeriales',
    'Otros Temas': 'Otros temas ministeriales',
    'Otros Temas Ministeriales': 'Otros temas ministeriales',
    'Temas De Otras Instituciones': 'Otros temas ministeriales',
    'Acceso A Playas': 'Trámites DBN',
    'Arriendo De Inmuebles Fiscales': 'Trámites DBN',
    'Concesion De Uso Gratuito': 'Trámites DBN',
    'Concesion De Uso Oneroso': 'Trámites DBN',
    'Derechos De Agua': 'Trámites DBN',
    'Desafectacion': 'Trámites DBN',
    'Destinacion': 'Trámites DBN',
    'Donacion Al Fisco': 'Trámites DBN',
    'Fijacion De Acceso': 'Trámites DBN',
    'Herencias Vacantes': 'Trámites DBN',
    'Rutas Patrimoniales': 'Trámites DBN',
    'Servidumbre': 'Trámites DBN',
    'Transferencia Gratuita': 'Trámites DBN',
    'Venta De Inmuebles': 'Trámites DBN',
    'Alzamiento De Hipoteca Ex Anap': 'Trámites DCPR',
    'Cesión De Derechos (Ley 19.253)': 'Trámites DCPR',
    'Comunidades Agricolas': 'Trámites DCPR',
    'Saneamiento Convenio Ind': 'Trámites DCPR',
    'Saneamiento Express': 'Trámites DCPR',
    'Saneamiento Ley 2695': 'Trámites DCPR',
    'Subdivisión Predial (Art. 16 D.L 2.885)': 'Trámites DCPR',
    'Titulo Gratuito Ley 1939': 'Trámites DCPR',
    'Títulos Gratuitos (Art.1 D.L 2885)': 'Trámites DCPR',
    'Catastro': 'Trámites DICAT',
    'Catastro (Estaciones Gnss)': 'Trámites DICAT',
    'Solicitud Copia De Plano': 'Trámites DICAT',
    # Aparecen en la fuente pero NO en la tabla entregada; asignados por afinidad, por confirmar.
    'Denuncia Por Vulneración De Derechos': 'Otros temas ministeriales',
    'Reconocimiento Poseedor Regular (Art. 07 D.L 2885)': 'Trámites DCPR',
    'Afectaciones': 'Trámites DBN',
}
