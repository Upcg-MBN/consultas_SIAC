# Dashboard de Consultas SIAC

Panel estático (HTML + JS sin dependencias, mismo sistema visual que Panel-Autoridades) con dos secciones:
**Resumen ejecutivo** y **Gestión regional**. Se abre con doble clic en `index.html` (o servido desde cualquier carpeta web).

## Ejecutar

```powershell
pip install pandas openpyxl          # únicas dependencias, solo para el ETL (el navegador no necesita nada)
python extraer.py                    # descarga el Excel más reciente de la intranet y regenera datos.js
python extraer.py --reprocesar       # vuelve a procesar el último Excel ya descargado (origen\), sin red
python extraer.py --archivo RUTA.xlsx  # carga manual de un Excel
```

## Arquitectura

| Etapa | Archivo |
|---|---|
| Descarga / carga manual | `etl/descarga.py` |
| Validación de estructura y calidad | `etl/validacion.py` |
| Limpieza, normalización, clasificación | `etl/transformacion.py`, `etl/calendario.py`, `etl/feriados.json` |
| **Reglas de negocio** (única fuente) | `etl/reglas.py` |
| Publicación segura y registro | `etl/publicacion.py`, `extraer.py` |
| Cálculo de indicadores (único) | `agregar.js` (cuenta clases; no decide reglas) |
| Interfaz | `index.html`, `panel.js` |
| Exportación a Excel | `exportar.js` (escritor .xlsx propio, sin librerías) |

El ETL clasifica cada consulta en una de 8 clases; `datos.js` trae un cubo compacto (≈380 KB para 127 mil consultas) y la tabla de las 840 en proceso. El navegador solo suma clases, así que tarjetas, gráficos, tabla regional y tabla de pendientes comparten la misma cuenta.

## Reglas de negocio (verificadas con el Excel del 16-10-2026)

- **Plazo:** 10 días hábiles (lun–vie sin feriados chilenos). Finalizada dentro: ≤ 10; fuera: > 10. En proceso: dentro ≤ 10, **próxima a vencer** 8–10 (subconjunto de «dentro», nunca se suma aparte), vencida > 10.
- **`dias_de_respuesta`** son días hábiles enteros: coincide con el calendario en 126.556 de 126.556 finalizadas. En las en proceso cuenta hasta el **16-10-2026** (día de generación del archivo), no hasta el 15. Se usa tal cual; solo se recalcula si viene vacío, negativo o con decimales.
- **Fecha de corte** = último `fecha_fin` (15-10-2026), leída de los datos. El mes del corte se marca parcial.
- **Vencimiento** = ingreso + 10 hábiles, calculado aquí. `fecha_a_finalizar` coincide en el 99,99 %; las 18 excepciones tienen plazo de 15 días en la fuente (transparencia) y se informan en «Calidad de los datos».
- **`cumplimiento` de la fuente** no se usa; se contrasta: difiere en 2 consultas finalizadas con 11+ días que la fuente marca «EN PLAZO».
- **Estados:** solo `FINALIZADO` y `EN PROCESO`. Otro valor se excluye y se informa (no se asigna a ninguna clase).
- **Duplicados:** clave `numero_expediente` (hoy 0 repetidos). Si aparecen, se conserva la última fila, las descartadas quedan en `logs/duplicados_*.csv` y más de 1 % detiene la carga.
- **Porcentajes:** denominador cero → «—», nunca 0 %. Cumplimiento = dentro ÷ finalizadas; % vencidas = vencidas ÷ en proceso.
- **Evolución mensual:** por mes de `fecha_fin`; usa un cubo propio sin fecha de ingreso ni región, así que solo responde a los filtros de consulta y espacio.
- Privacidad: solo se leen los 25 campos autorizados; RUT, teléfono, correo y fecha de nacimiento nunca entran. `datos.js` lleva folios y nombres de funcionarios (para la exportación): está en `.gitignore`.

## Actualización diaria

La URL de la intranet no entrega el Excel: es una página HTML **sin autenticación** (solo alcanzable desde la red del Ministerio) con un enlace por archivo; `descarga.py` toma el más reciente, lo baja a un archivo temporal y valida que sea un .xlsx completo.

- Cada intento queda en `logs/actualizaciones.csv`; los errores con detalle, en `logs/errores.log`.
- Una carga fallida **no toca** `datos.js`; `estado.js` hace que el panel muestre «La última actualización falló» y los datos de la última exitosa. La hora de «Actualizado» es la de la última carga exitosa. Más de 2 días sin actualizar muestra otro aviso.
- `actualizar.ps1` ejecuta el proceso. **No está programado.** Para ejecutarlo a diario hace falta: un equipo con acceso a `reportes.mbienes.cl`, Python con pandas/openpyxl, permiso para crear la tarea (comando `schtasks` en la cabecera del script) y que el panel se sirva desde esa misma carpeta o se copie `datos.js`/`estado.js` al hosting. Al llegar enero hay que agregar los feriados del año nuevo en `etl/feriados.json` (el ETL avisa si faltan).

## Pruebas

```powershell
python prueba_siac.py     # 11 pruebas del ETL: límites de plazo, columna ausente, fechas inválidas, archivo vacío/corrupto, fallo sin dañar datos.js, recuento independiente contra el Excel real
node prueba.js            # 24 pruebas: modelo en miniatura + coherencia tarjetas/gráficos/tablas con el datos.js real + exportación
```
`pruebas/ui.html` (abrir con un servidor local) ejercita en el navegador filtros, clics, paginación y búsqueda.

## Limitaciones y pendientes

- El archivo solo trae consultas con ingreso desde el 01-01-2025.
- «Oficina Central» y las oficinas provinciales se muestran como filas propias y no se suman a una región.
- 23 consultas vienen con tipo «-» y se muestran como «Sin clasificar».
- Rango «61 a 20» del levantamiento se implementó como **61 a 100**, sujeto a confirmación.
- Los umbrales de «poco volumen» (30 finalizadas / 10 en proceso) para las marcas mejor/peor son una propuesta, declarada en la interfaz.
- La descarga automática se probó solo en lectura del índice; no se programó ni se ejecutó en producción.
