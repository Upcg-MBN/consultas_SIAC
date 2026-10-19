"""ETL del dashboard de Consultas SIAC.

Etapas (un módulo por etapa, en el orden en que corren):

    descarga        baja el Excel más reciente de la intranet (o usa uno local)
    validacion      estructura del archivo y calidad de los datos
    transformacion  limpieza, normalización y clasificación de plazos
    publicacion     escribe datos.js / estado.js y el registro de actualizaciones

Las reglas de negocio (plazo de 10 días hábiles, tramos, nombres) viven solo en
`reglas.py` y `feriados.json`.
"""
