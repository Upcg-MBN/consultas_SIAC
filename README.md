# Desarrollo de Dashboard de Consultas SIAC – Ministerio de Bienes Nacionales

## 1. Objetivo general

Necesito desarrollar un dashboard interactivo de gestión y seguimiento de las Consultas SIAC del Ministerio de Bienes Nacionales de Chile.

El dashboard debe replicar, en la medida de lo posible, el diseño visual, la distribución de los componentes, la jerarquía de la información, la paleta de colores, las tarjetas KPI, los gráficos, las tablas y la experiencia de navegación del siguiente panel de referencia:

- **Panel de referencia de autoridades:** [https://github.com/Upcg-MBN/Panel-Autoridades]
- **Origen de los datos:** (http://reportes.mbienes.cl/etl-output/siac/detalle_consulta/detalle_consulta_siac.php) el Excel que se descarga lo dejé en la carpeta de este proyecto.

El panel de referencia debe utilizarse como guía visual y de experiencia de usuario, adaptando sus componentes a las necesidades de seguimiento de las consultas ciudadanas del SIAC.

El resultado debe ser un dashboard funcional, interactivo, claro y profesional, adecuado para la gestión ejecutiva y operativa de las autoridades y los equipos regionales del Ministerio.

No busco únicamente una maqueta o una propuesta gráfica: necesito implementar una solución que procese los datos reales, calcule los indicadores, permita explorar la información y se pueda actualizar diariamente.

## 2. Instrucciones iniciales

Antes de comenzar a programar:

1. Revisa la estructura del proyecto, los archivos existentes, las tecnologías utilizadas y las dependencias instaladas.
2. Examina el panel de GitHub de referencia para identificar los componentes visuales, la estructura y los patrones de interacción que puedan reutilizarse.
3. Revisa el mecanismo de acceso a la intranet y determina cómo se puede descargar el Excel diariamente.
4. Examina la estructura real del archivo Excel y valida los nombres de las columnas, sus tipos de datos, los valores de las categorías y los posibles registros duplicados o incompletos.
5. Define una propuesta de arquitectura que permita separar la carga y transformación de datos, las reglas de negocio, los indicadores y la interfaz gráfica.
6. Identifica cualquier restricción técnica o antecedente que necesites confirmar antes de implementar una funcionalidad.

Una vez realizada esta revisión, implementa la solución utilizando preferentemente la tecnología y la estructura existentes en el proyecto. Si es necesario incorporar dependencias, justifica su utilidad y evita agregar herramientas innecesarias.

No te limites a entregar recomendaciones: desarrolla la solución en el proyecto y verifica su funcionamiento.

## 3. Fuente de datos y actualización diaria

La fuente de información será un archivo Excel que se genera diariamente y se descarga desde la siguiente dirección de la intranet:

[(http://reportes.mbienes.cl/etl-output/siac/detalle_consulta/detalle_consulta_siac.php)]

El dashboard debe utilizar la versión más reciente disponible de este archivo.

### Requerimientos de actualización

- Implementar un proceso de descarga o actualización diaria del Excel.
- Procesar automáticamente el archivo recibido y actualizar los indicadores, gráficos y tablas.
- Mostrar la fecha y hora de la última actualización exitosa.
- Validar que el archivo contenga las columnas necesarias antes de procesarlo.
- Controlar errores de descarga, archivos vacíos, cambios en la estructura y problemas de lectura.
- Evitar que una actualización fallida deje el dashboard sin datos o reemplace una versión válida por un archivo defectuoso.
- Mantener un registro de errores y del resultado de cada actualización.
- Permitir volver a procesar el archivo cuando sea necesario.

Primero verifica si el enlace de la intranet permite descargar directamente el Excel o si requiere autenticación, cookies, sesión institucional o interacción con un navegador.

Si requiere autenticación, implementa una solución compatible con las restricciones reales de acceso. No intentes eludir los mecanismos de seguridad institucionales ni almacenes credenciales directamente en el código.

Si no es posible automatizar la descarga desde el entorno disponible, implementa una alternativa de carga manual del Excel y deja preparada la arquitectura para habilitar posteriormente la actualización automática.

**Importante:** distingue entre desarrollar una actualización automática y ejecutarla efectivamente en producción. Documenta los requisitos de ejecución programada, permisos y conectividad que sean necesarios para que el proceso opere diariamente.

## 4. Estructura del archivo Excel

El archivo original contiene, entre otros, los siguientes campos:

- sistema
- numero_expediente
- process_name
- estado
- region
- fecha_inicio
- fecha_fin
- ano
- actividad
- usuario_actividad
- fecha_inicio_act
- fecha_termino_act
- nombre_solte
- tipo_solte
- rut_solte
- sexo
- estado_civil
- fecha_a_finalizar
- tipo_consulta_inicial
- cumplimiento
- consulta
- espacio_atencion
- prorroga
- trimestre
- dias_de_respuesta
- mes
- motivo_consulta
- tipo_reclamo
- telefono
- email
- jefa_de_hogar
- es_transparencia
- id
- timestamp
- fecha_a_finalizar20
- cumplimiento20
- plazo_pmg
- plazo20
- nro_solic_cplt
- interopera_cplt
- pregunta
- identidad_genero
- fecha_nacimiento
- nivel_educacional
- origen_etnico

### Campos que se deben utilizar en el dashboard

Para el desarrollo del panel, utiliza exclusivamente los siguientes campos del archivo fuente:

| Campo | Uso principal |
|---|---|
| `sistema` | Identificación del sistema de origen, cuando corresponda. |
| `numero_expediente` | Identificador del expediente o folio. |
| `process_name` | Identificación del proceso, si resulta necesaria. |
| `estado` | Determinación de consultas finalizadas y en proceso. |
| `region` | Análisis y segmentación territorial. |
| `fecha_inicio` | Fecha de ingreso de la consulta. |
| `fecha_fin` | Fecha de finalización de la consulta. |
| `ano` | Año registrado en la fuente. |
| `actividad` | Actividad actual de la consulta. |
| `usuario_actividad` | Responsable asociado a la actividad actual; incluirlo en la exportación de consultas pendientes. |
| `fecha_inicio_act` | Fecha de inicio de la actividad actual. |
| `fecha_termino_act` | Fecha de término de la actividad, si corresponde. |
| `tipo_solte` | Tipo de solicitante, si se requiere en el procesamiento. |
| `sexo` | Campo disponible para análisis posteriores, no obligatorio en la vista inicial. |
| `fecha_a_finalizar` | Fecha de vencimiento registrada en la fuente, sujeta a validación. |
| `tipo_consulta_inicial` | Campo de clasificación inicial de la consulta, si se requiere. |
| `cumplimiento` | Campo de cumplimiento existente en la fuente; validar su definición antes de utilizarlo. |
| `consulta` | Categoría de consulta y filtro principal. |
| `espacio_atencion` | Espacio de atención y filtro principal. |
| `dias_de_respuesta` | Duración registrada en la fuente; validar su significado y utilizarla conforme a las reglas indicadas en este prompt. |
| `mes` | Campo temporal auxiliar, previa validación. |
| `motivo_consulta` | Motivo de la consulta. |
| `tipo_reclamo` | Clasificación del reclamo, si corresponde. |
| `nivel_educacional` | Campo disponible para análisis posteriores. |
| `origen_etnico` | Campo disponible para análisis posteriores. |

No incorpores al dashboard campos personales que no estén incluidos en esta lista, tales como RUT, teléfono, correo electrónico o fecha de nacimiento.

Los campos que no sean necesarios para las visualizaciones iniciales pueden conservarse en la capa de origen, pero no deben mostrarse ni utilizarse innecesariamente en el procesamiento.

## 5. Reglas de negocio para el cálculo de plazos

El plazo institucional de respuesta es de **10 días hábiles**.

El archivo contiene el campo `dias_de_respuesta`, que representa los días transcurridos desde `fecha_inicio` hasta `fecha_fin` para las consultas finalizadas. En el caso de las consultas que continúan en proceso, representa los días transcurridos desde `fecha_inicio` hasta la fecha de corte de los datos.

Antes de calcular los indicadores, verifica esta interpretación con los datos reales y documenta cualquier discrepancia encontrada.

### Clasificación de las consultas

Distingue las siguientes situaciones:

**Consultas finalizadas dentro de plazo**
- Consulta finalizada.
- `dias_de_respuesta` menor o igual a 10 días hábiles.

**Consultas finalizadas fuera de plazo**
- Consulta finalizada.
- `dias_de_respuesta` mayor a 10 días hábiles.

**Consultas en proceso dentro de plazo**
- Consulta que continúa en proceso.
- Han transcurrido hasta 10 días hábiles desde el ingreso.

**Consultas en proceso próximas a vencer**
- Consulta que continúa en proceso.
- Han transcurrido entre 8 y 10 días hábiles, ambos inclusive.

**Consultas en proceso vencidas**
- Consulta que continúa en proceso.
- Han transcurrido más de 10 días hábiles.

Las consultas en proceso deben calcularse con la fecha de corte del archivo procesado, no con la fecha actual del computador, salvo que la fecha de corte y la fecha actual coincidan.

Para evitar clasificaciones incorrectas, valida los valores reales de `estado` y establece explícitamente qué valores corresponden a consultas finalizadas y cuáles a consultas en proceso.

Si existen estados ambiguos, anulados, derivados o sin clasificación, no los asignes arbitrariamente: identifica y documenta su tratamiento.

### Consideraciones importantes

- No confundas el plazo de 10 días hábiles con 10 días corridos.
- Si `dias_de_respuesta` ya contiene días hábiles calculados correctamente, utiliza ese campo en lugar de recalcularlo.
- Comprueba cómo se representan los días hábiles, especialmente si los valores contienen decimales, están vacíos o presentan inconsistencias.
- No utilices el campo `cumplimiento` como fuente definitiva sin verificar cómo se genera y si coincide con las reglas anteriores.
- Si se requiere recalcular los plazos, identifica el calendario de días hábiles y festivos aplicable en Chile antes de implementar el cálculo.
- Documenta el tratamiento de los registros sin fechas, con fechas inconsistentes o con días de respuesta no disponibles.
- La fecha de vencimiento de la tabla operativa debe corresponder al plazo de 10 días hábiles. Valida si `fecha_a_finalizar` representa efectivamente ese vencimiento antes de utilizarla. Si no coincide, calcula o determina la fecha conforme a la regla institucional validada.

## 6. Estructura general del dashboard

El dashboard tendrá dos secciones principales:

1. Resumen Ejecutivo.
2. Gestión Regional.

Ambas deben mantener una línea visual coherente con el panel de referencia y permitir una navegación sencilla.

Los gráficos y las tablas deben ser interactivos. Cuando se seleccione una categoría, región u otro elemento, los componentes relacionados deben actualizarse de manera consistente, salvo en los casos en que se indique expresamente que una visualización no debe responder a determinado filtro.

# SECCIÓN 1. RESUMEN EJECUTIVO

## 7. Filtros generales

Incorporar los siguientes filtros:

### Fecha de inicio de la consulta
- Selector de fecha desde y hasta.
- Aplicado sobre `fecha_inicio`.
- Debe permitir seleccionar un período específico.

### Consulta
- Selector multiselección con casillas de verificación.
- Debe mostrar todas las categorías disponibles en el campo `consulta`.
- Debe incluir la opción «Todos».
- La selección de «Todos» debe equivaler a no aplicar restricciones por categoría.

### Espacio de atención
- Selector multiselección con casillas de verificación.
- Debe mostrar las categorías disponibles en `espacio_atencion`.
- Debe incluir la opción «Todos».

### Región/oficina
- Selector multiselección con casillas de verificación.
- Debe permitir seleccionar todas las regiones o una o varias regiones específicas.
- Debe incluir la opción «Todas».

Los filtros deben funcionar conjuntamente y actualizar los indicadores, gráficos y tablas que correspondan.

Evita que las opciones seleccionadas se contradigan entre sí. Si una selección deja sin resultados la información, muestra un mensaje claro en lugar de gráficos vacíos sin explicación.

## 8. Tarjetas de indicadores principales

Incorporar seis tarjetas KPI:

1. **Consultas totales registradas**
   - Cantidad de consultas que cumplen los filtros seleccionados.

2. **Consultas finalizadas**
   - Cantidad de consultas clasificadas como finalizadas.

3. **Consultas en proceso**
   - Cantidad de consultas que continúan abiertas.

4. **Cumplimiento en plazo de las finalizadas**
   - Porcentaje de consultas finalizadas que fueron respondidas en 10 días hábiles o menos.
   - Mostrar también la cantidad de consultas finalizadas dentro de plazo y el universo de consultas finalizadas utilizado como denominador.

5. **Consultas en proceso vencidas**
   - Cantidad de consultas abiertas que han superado los 10 días hábiles.

6. **Consultas próximas a vencer**
   - Cantidad de consultas abiertas que registran entre 8 y 10 días hábiles transcurridos.

Cada tarjeta debe presentar el valor principal, una etiqueta descriptiva y, cuando sea útil, una explicación breve del cálculo.

No mezcles porcentajes con cantidades absolutas ni utilices denominadores ambiguos.

## 9. Gráfico de cumplimiento según plazo

Construir una visualización que permita identificar el estado de las consultas respecto de los plazos.

Separar las consultas finalizadas de las que continúan en proceso.

**Consultas finalizadas:**
- Dentro de plazo: 10 días hábiles o menos.
- Fuera de plazo: más de 10 días hábiles.

**Consultas en proceso:**
- Dentro de plazo.
- Vencidas.

Las consultas próximas a vencer deben poder identificarse claramente dentro de las consultas que aún están en plazo, sin contabilizarlas como una categoría adicional cuando se muestren totales generales.

Mostrar cantidades y, si el diseño lo permite, porcentajes.

## 10. Cumplimiento por tipo de consulta y análisis regional

Desarrollar visualizaciones que permitan comparar el cumplimiento entre categorías de consulta y regiones.

Incluir dos análisis regionales separados:

**A. Ranking regional por cantidad**
- Cantidad de consultas por región.
- Cantidad de consultas finalizadas dentro y fuera de plazo.
- Permitir identificar las regiones con mayor volumen de consultas.

**B. Ranking regional por proporción de cumplimiento**
- Porcentaje de consultas finalizadas dentro de plazo en cada región.
- Denominador: total de consultas finalizadas de la región que cumplen los filtros aplicables.
- Mostrar también el número de consultas finalizadas para contextualizar los porcentajes.

Ordenar el ranking por el indicador correspondiente y diferenciar visualmente ambos análisis.

No comparar únicamente porcentajes sin mostrar el volumen de casos, porque las regiones pueden tener cargas de trabajo muy distintas.

## 11. Cumplimiento por espacio de atención

Construir una visualización que compare los distintos espacios de atención.

Para cada espacio de atención, mostrar:

- Cantidad de consultas finalizadas.
- Cantidad de consultas finalizadas dentro de plazo.
- Porcentaje de consultas finalizadas dentro de plazo.

El porcentaje se calculará sobre las consultas finalizadas del espacio correspondiente.

La visualización debe ser interactiva: al seleccionar un espacio de atención, los componentes compatibles deben filtrar la información para mostrar los resultados de ese espacio.

## 12. Evolución mensual del cumplimiento

Incorporar un gráfico de evolución mensual del cumplimiento del plazo institucional.

**Indicador:**

Porcentaje de consultas finalizadas durante cada mes que fueron respondidas en 10 días hábiles o menos.

El cálculo mensual será:

Consultas finalizadas dentro de plazo en el mes / Total de consultas finalizadas en el mes × 100.

Consideraciones:

- Agrupar por mes de finalización, utilizando `fecha_fin`, y no por mes de ingreso.
- Mostrar la evolución mensual disponible.
- Permitir que los filtros de consulta y espacio de atención afecten el gráfico.
- Este gráfico debe ser institucional: no debe cambiar al seleccionar un año o una región.
- El filtro de fecha de inicio de la consulta tampoco debe alterar esta visualización, dado que el indicador debe representar la evolución institucional de las consultas finalizadas en cada mes.
- Si el resto de la interfaz tiene filtros de año o región, estos deben quedar explícitamente excluidos del cálculo de esta visualización.
- Identificar los meses incompletos y evitar interpretarlos como períodos cerrados.

Para octubre de 2026, los datos están disponibles únicamente hasta el 15 de octubre. Mostrar una advertencia visible, por ejemplo: «Octubre de 2026: datos parciales al 15 de octubre».

La fecha de corte debe obtenerse de los datos procesados y no quedar escrita permanentemente en el código.

## 13. Tabla de indicadores por región

Incorporar una tabla comparativa con una fila por región y las siguientes columnas:

1. Región/oficina.
2. Total de consultas.
3. Consultas finalizadas.
4. Porcentaje de consultas finalizadas.
5. Consultas en proceso.
6. Porcentaje de consultas en proceso.
7. Finalizadas dentro de plazo.
8. Finalizadas fuera de plazo.
9. Cumplimiento de las consultas finalizadas.
10. Consultas en proceso dentro de plazo.
11. Consultas próximas a vencer.
12. Consultas en proceso vencidas.
13. Porcentaje de consultas en proceso vencidas.

Definir expresamente los denominadores:

- Porcentaje de finalizadas = consultas finalizadas / total de consultas.
- Porcentaje en proceso = consultas en proceso / total de consultas.
- Cumplimiento de finalizadas = finalizadas dentro de plazo / total de finalizadas.
- Porcentaje en proceso vencidas = consultas en proceso vencidas / total de consultas en proceso.

Si el denominador es cero, mostrar «—» y no un porcentaje de 0 %.

Permitir ordenar la tabla por cualquier indicador, identificar rápidamente los mejores y peores resultados y mantener la coherencia con los filtros seleccionados.

# SECCIÓN 2. GESTIÓN REGIONAL

## 14. Filtros

Utilizar los mismos filtros del Resumen Ejecutivo:

- Fecha de inicio de la consulta: desde y hasta.
- Consulta: multiselección.
- Espacio de atención: multiselección.
- Región/oficina: multiselección.

Los filtros deben mantenerse sincronizados entre las secciones cuando sea compatible con la arquitectura del dashboard.

## 15. Gráfico de antigüedad de las consultas pendientes

Crear un gráfico que muestre la distribución de las consultas en proceso según los días hábiles transcurridos a la fecha de corte.

Utilizar los siguientes rangos:

- 0 a 7 días hábiles.
- 8 a 10 días hábiles.
- 11 a 20 días hábiles.
- 21 a 60 días hábiles.
- 61 a 100 días hábiles.
- Más de 100 días hábiles.

Importante: el rango «61 a 20» indicado en el levantamiento original debe interpretarse como «61 a 100», sujeto a confirmación.

Mostrar la cantidad de consultas en cada rango y, cuando sea posible, su proporción respecto del total en proceso.

Diferenciar visualmente las consultas dentro de plazo de aquellas que ya superaron los 10 días hábiles. Destacar el límite de 10 días mediante una referencia visual clara.

El objetivo es identificar rápidamente la antigüedad de la cartera pendiente y los posibles riesgos de incumplimiento.

## 16. Gráfico de consultas en proceso por región

Construir un gráfico de barras horizontales por región.

El largo total de cada barra debe representar la cantidad total de consultas en proceso de esa región.

Dentro de cada barra, diferenciar tres grupos:

1. Consultas vencidas: más de 10 días hábiles.
2. Consultas próximas a vencer: entre 8 y 10 días hábiles.
3. Resto de consultas dentro de plazo: hasta 7 días hábiles.

Mostrar, adicionalmente, el porcentaje de consultas vencidas respecto del total de consultas en proceso de la región.

El gráfico debe permitir:

- Comparar la carga pendiente entre regiones.
- Identificar regiones con mayor número de consultas vencidas.
- Diferenciar carga de trabajo y nivel de riesgo.
- Seleccionar una región para filtrar la tabla de consultas en proceso.

El porcentaje de vencidas debe calcularse sobre el total de consultas en proceso de la región, y no sobre el total institucional.

## 17. Tabla de consultas en proceso

Construir una tabla operativa con el detalle de las consultas que continúan en proceso.

Incluir las siguientes columnas visibles:

1. Folio.
2. Región/oficina.
3. Fecha de ingreso.
4. Fecha de vencimiento.
5. Días hábiles transcurridos.
6. Días de atraso.
7. Actividad actual.
8. Fecha de inicio de la actividad actual.

La tabla debe:

- Responder a los filtros generales.
- Permitir filtrar por región, estado de plazo y otros criterios pertinentes.
- Permitir ordenar por días de atraso, días transcurridos, fecha de ingreso y fecha de vencimiento.
- Destacar visualmente las consultas vencidas y próximas a vencer.
- Permitir buscar por folio.
- Mostrar las fechas en un formato legible.
- Mostrar 0 días de atraso para las consultas que aún están dentro de plazo.
- Calcular los días de atraso como `dias_de_respuesta - 10` para las consultas vencidas, si el campo contiene días hábiles enteros correctamente calculados. En caso contrario, ajustar el cálculo a la definición validada.
- Permitir exportar a Excel el conjunto de registros correspondiente a los filtros aplicados.

### Requisitos de la exportación a Excel

El archivo Excel exportado debe incluir, además de las columnas visibles de la tabla, el campo `usuario_actividad`.

Por lo tanto, la exportación debe incluir como mínimo:

- Folio (`numero_expediente`).
- Región/oficina (`region`).
- Fecha de ingreso (`fecha_inicio`).
- Fecha de vencimiento.
- Días hábiles transcurridos (`dias_de_respuesta`).
- Días de atraso.
- Actividad actual (`actividad`).
- Fecha de inicio de la actividad actual (`fecha_inicio_act`).
- Usuario asociado a la actividad actual (`usuario_actividad`).

Los nombres de las columnas exportadas deben ser comprensibles para los usuarios institucionales, aunque se pueden mantener los nombres originales en la capa de procesamiento.

La exportación debe incluir todos los registros que cumplan los filtros aplicados, no solamente los que se encuentren visibles en la página actual de la tabla.

No incluir datos personales que no sean necesarios para la gestión de las consultas pendientes.

## 18. Diseño y experiencia de usuario

Tomar como referencia el panel de GitHub indicado al inicio.

Priorizar:

- Diseño institucional, limpio y profesional.
- Jerarquía visual clara entre indicadores ejecutivos y análisis operativos.
- Tarjetas KPI de lectura rápida.
- Gráficos con etiquetas comprensibles, leyendas claras y valores accesibles mediante interacción.
- Colores consistentes para diferenciar consultas dentro de plazo, próximas a vencer y vencidas.
- Tablas legibles, con encabezados claros y controles de ordenamiento.
- Diseño adaptable a diferentes resoluciones de pantalla.
- Navegación sencilla entre Resumen Ejecutivo y Gestión Regional.
- Indicadores de carga, ausencia de datos y errores.
- Fecha de corte y fecha de última actualización visibles.

Evitar la saturación de gráficos y elementos decorativos. La prioridad es que las autoridades puedan interpretar rápidamente el desempeño institucional y que los equipos regionales puedan identificar y gestionar sus consultas pendientes.

## 19. Requisitos técnicos y de calidad

Implementar la solución con una arquitectura mantenible.

Separar, en la medida que lo permita la tecnología utilizada:

1. Descarga o carga del Excel.
2. Validación de estructura y calidad de datos.
3. Limpieza y normalización.
4. Clasificación de estados y plazos.
5. Cálculo de indicadores.
6. Componentes visuales.
7. Exportación a Excel.
8. Registro de actualizaciones y errores.

Evitar duplicar las reglas de negocio en distintos gráficos o componentes. Los indicadores deben utilizar una única lógica de cálculo compartida.

Verificar especialmente:

- Consistencia de los estados.
- Fechas inválidas y valores faltantes.
- Diferencias entre la fecha de corte y la fecha actual.
- Posibles expedientes duplicados.
- Registros que no tienen fecha de finalización.
- Consultas con valores negativos o no numéricos en `dias_de_respuesta`.
- Categorías vacías o nulas.
- Porcentajes con denominadores iguales a cero.
- Consistencia entre los totales de las tarjetas, gráficos y tablas.

No elimines registros duplicados automáticamente sin identificar primero la clave correcta y la regla de deduplicación. Si existen múltiples filas por expediente debido a las actividades del proceso, determina cuál representa el estado actual y conserva la trazabilidad necesaria.

## 20. Validaciones funcionales

Antes de dar por finalizado el desarrollo, prueba al menos los siguientes escenarios:

1. Una consulta finalizada en 10 días hábiles.
2. Una consulta finalizada en más de 10 días hábiles.
3. Una consulta en proceso con 7 días hábiles.
4. Una consulta en proceso con 8 días hábiles.
5. Una consulta en proceso con 10 días hábiles.
6. Una consulta en proceso con 11 días hábiles.
7. Una región sin consultas.
8. Una categoría de consulta sin registros para el período seleccionado.
9. Un archivo con una columna requerida ausente.
10. Un archivo con fechas inválidas.
11. Una actualización fallida.
12. Una exportación con filtros aplicados y múltiples páginas de resultados.

Comprueba que los totales coincidan entre las tarjetas, los gráficos y la tabla regional.

Verifica también que el gráfico de evolución mensual no cambie al modificar el filtro de año, región o fecha de inicio, pero sí responda a los filtros de consulta y espacio de atención.

## 21. Entregables esperados

Al finalizar, entrega:

1. Dashboard funcional implementado en el proyecto.
2. Proceso de carga y actualización del Excel.
3. Cálculos centralizados de los indicadores.
4. Exportación de las consultas en proceso a Excel, incluyendo `usuario_actividad`.
5. Validaciones y manejo de errores.
6. Instrucciones para instalar dependencias y ejecutar el proyecto.
7. Instrucciones para configurar la actualización diaria.
8. Documentación breve de las reglas de negocio y de las fórmulas utilizadas.
9. Resultado de las pruebas realizadas y limitaciones detectadas.

## 22. Instrucción final

Trabaja directamente sobre el proyecto existente, priorizando una solución funcional, mantenible y visualmente coherente con el panel de referencia.

No inventes información ni supongas que las columnas del Excel tienen significados distintos de los definidos o validados.

Si detectas inconsistencias en los datos o ambigüedades en las reglas de negocio, identifícalas y propón una solución explícita antes de consolidar los cálculos.

Si alguna funcionalidad no puede implementarse por restricciones de acceso, autenticación, infraestructura o dependencias, explica la limitación y desarrolla la mejor alternativa viable.

Al finalizar, resume qué implementaste, qué archivos modificaste, cómo ejecutar el dashboard y qué pasos quedan pendientes para habilitar la actualización diaria en el entorno institucional.