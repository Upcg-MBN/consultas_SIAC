// Agregaciones del dashboard SIAC. Sin DOM: prueba.js las corre con node.
//
// Aquí NO se decide qué es «dentro de plazo» o «vencida»: eso lo fija el ETL
// (etl/reglas.py) y viaja en cada fila como `clase` (D.clases). Este archivo
// solo cuenta clases. Así hay una única regla de negocio para tarjetas,
// gráficos, tabla regional y tabla de pendientes.
//
//   clase 0  finalizada dentro de plazo (<= 10 días hábiles)
//   clase 1  finalizada fuera de plazo
//   clase 2  en proceso, 0 a 7 días hábiles       }
//   clase 3  en proceso, 8 a 10 (próxima a vencer) } dentro de plazo
//   clase 4  en proceso, 11 a 20 }
//   clase 5  en proceso, 21 a 60 }  vencidas
//   clase 6  en proceso, 61 a 100 }
//   clase 7  en proceso, más de 100 }
//
// Una consulta «próxima a vencer» es un SUBCONJUNTO de las que están en
// plazo: los totales nunca la cuentan dos veces.

(function (global) {
  'use strict';

  var NCLASES = 8;
  var PASO_CUBO = 7;   // [fechaIngreso, consulta, espacio, región, clase, n, materia]
  var PASO_EVO = 6;    // [mes, consulta, espacio, clase, n, materia]

  function nuevoVector() { return new Float64Array(NCLASES); }

  // Resumen de un vector de clases -> las cifras que usan tarjetas y tablas.
  function medidas(v) {
    var finDentro = v[0], finFuera = v[1];
    var fin = finDentro + finFuera;
    var proxima = v[3];
    var enPlazoProc = v[2] + v[3];
    var vencidas = v[4] + v[5] + v[6] + v[7];
    var proc = enPlazoProc + vencidas;
    return {
      total: fin + proc,
      fin: fin, finDentro: finDentro, finFuera: finFuera,
      proc: proc, procDentro: enPlazoProc, proxima: proxima, vencidas: vencidas,
      resto: v[2],   // en proceso con 0 a 7 días: dentro de plazo y no próximas
      pctFin: pct(fin, fin + proc),
      pctProc: pct(proc, fin + proc),
      cumplimiento: pct(finDentro, fin),
      pctVencidas: pct(vencidas, proc)
    };
  }

  // Denominador cero -> null (la interfaz escribe «—», nunca 0 %).
  function pct(n, d) { return d > 0 ? n / d * 100 : null; }

  function pasa(sel, i) { return sel == null || sel[i] === 1; }

  // sel: null (sin restricción) o arreglo 0/1 por índice de categoría.
  function mascara(n, indices) {
    if (!indices) return null;
    var m = new Uint8Array(n);
    for (var i = 0; i < indices.length; i++) if (indices[i] >= 0 && indices[i] < n) m[indices[i]] = 1;
    return m;
  }

  // f = { desde, hasta  (índice de día o null), consultas, espacios, regiones, materias (arreglos de índices o null) }
  function normalizar(D, f) {
    f = f || {};
    return {
      desde: f.desde == null ? -Infinity : f.desde,
      hasta: f.hasta == null ? Infinity : f.hasta,
      c: mascara(D.consultas.length, f.consultas),
      e: mascara(D.espacios.length, f.espacios),
      r: mascara(D.regiones.length, f.regiones),
      m: mascara(D.materias.length, f.materias)
    };
  }

  // Un recorrido del cubo. Cada visualización «selectora» se calcula SIN el
  // filtro de su propia dimensión (para mostrar todas las opciones y resaltar
  // las elegidas), pero con todos los demás:
  //   tot          todos los filtros                (tarjetas, gráficos de totales)
  //   porRegion    todos menos región               (rankings, tabla, pendientes)
  //   porEspacio   todos menos espacio de atención
  //   porConsulta  todos menos consulta
  //   porMateria   todos menos materia
  function calcular(D, f) {
    var n = normalizar(D, f);
    var tot = nuevoVector();
    var nR = D.regiones.length, nE = D.espacios.length, nC = D.consultas.length, nM = D.materias.length;
    var porRegion = [], porEspacio = [], porConsulta = [], porMateria = [], i;
    for (i = 0; i < nR; i++) porRegion.push(nuevoVector());
    for (i = 0; i < nE; i++) porEspacio.push(nuevoVector());
    for (i = 0; i < nC; i++) porConsulta.push(nuevoVector());
    for (i = 0; i < nM; i++) porMateria.push(nuevoVector());

    var c = D.cubo;
    for (i = 0; i < c.length; i += PASO_CUBO) {
      var fi = c[i];
      if (fi < n.desde || fi > n.hasta) continue;
      var ic = c[i + 1], ie = c[i + 2], ir = c[i + 3], k = c[i + 4], cant = c[i + 5], im = c[i + 6];
      var pc = pasa(n.c, ic), pe = pasa(n.e, ie), pr = pasa(n.r, ir), pm = pasa(n.m, im);
      if (pc && pe && pm) porRegion[ir][k] += cant;
      if (pc && pr && pm) porEspacio[ie][k] += cant;
      if (pe && pr && pm) porConsulta[ic][k] += cant;
      if (pc && pe && pr) porMateria[im][k] += cant;
      if (pc && pe && pr && pm) tot[k] += cant;
    }
    return { tot: tot, kpi: medidas(tot), porRegion: porRegion, porEspacio: porEspacio, porConsulta: porConsulta, porMateria: porMateria };
  }

  // Evolución mensual INSTITUCIONAL: usa solo los filtros de consulta, espacio y materia.
  // Ignora a propósito fecha de ingreso y región (README §12); ni siquiera
  // recibe esos campos del cubo, que no los trae.
  function evolucion(D, f) {
    var meses = D.evolucion.meses, filas = D.evolucion.filas;
    var mc = mascara(D.consultas.length, f && f.consultas), me = mascara(D.espacios.length, f && f.espacios);
    var mm = mascara(D.materias.length, f && f.materias);
    var dentro = new Float64Array(meses.length), fuera = new Float64Array(meses.length), i;
    for (i = 0; i < filas.length; i += PASO_EVO) {
      if (!pasa(mc, filas[i + 1]) || !pasa(me, filas[i + 2]) || !pasa(mm, filas[i + 5])) continue;
      if (filas[i + 3] === 0) dentro[filas[i]] += filas[i + 4]; else fuera[filas[i]] += filas[i + 4];
    }
    var corte = D.corte, ultimo = meses.length - 1;
    return meses.map(function (m, j) {
      var fin = dentro[j] + fuera[j];
      return { mes: m, dentro: dentro[j], fuera: fuera[j], fin: fin, cumplimiento: pct(dentro[j], fin),
               parcial: j === ultimo && !finDeMes(corte) };
    });
  }

  function finDeMes(iso) {
    var p = iso.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1], 0)).getUTCDate() === p[2];
  }

  // Tabla comparativa: una fila por región dentro del filtro de región.
  function tablaRegional(D, r, f) {
    var sel = mascara(D.regiones.length, f && f.regiones);
    var filas = [];
    for (var i = 0; i < D.regiones.length; i++) {
      if (!pasa(sel, i)) continue;
      var m = medidas(r.porRegion[i]);
      m.region = D.regiones[i]; m.idx = i;
      filas.push(m);
    }
    return filas;
  }

  // ---- cartera pendiente -------------------------------------------------
  // Fila de D.pendientes: [folio, región, consulta, espacio, ingreso, vencimiento,
  //                        días hábiles, atraso, actividad, inicio actividad, usuario, clase, materia]
  var P = { folio: 0, region: 1, consulta: 2, espacio: 3, ingreso: 4, venc: 5, dias: 6, atraso: 7, act: 8, inicioAct: 9, usuario: 10, clase: 11, materia: 12 };

  // Estado de plazo de una consulta en proceso, a partir de su clase.
  function estadoPlazo(clase) { return clase >= 4 ? 'vencida' : clase === 3 ? 'proxima' : 'enPlazo'; }

  // f: filtros generales. x = { regiones: [..]|null (selección propia de la
  // tabla), estado: 'vencida'|'proxima'|'enPlazo'|null, folio: texto }.
  function pendientes(D, f, x) {
    var n = normalizar(D, f);
    var xr = mascara(D.regiones.length, x && x.regiones);
    var estado = x && x.estado, buscar = x && x.folio ? String(x.folio).trim().toUpperCase() : '';
    return D.pendientes.filter(function (p) {
      if (p[P.ingreso] < n.desde || p[P.ingreso] > n.hasta) return false;
      if (!pasa(n.c, p[P.consulta]) || !pasa(n.e, p[P.espacio]) || !pasa(n.r, p[P.region]) || !pasa(xr, p[P.region]) || !pasa(n.m, p[P.materia])) return false;
      if (estado && estadoPlazo(p[P.clase]) !== estado) return false;
      if (buscar && p[P.folio].toUpperCase().indexOf(buscar) < 0) return false;
      return true;
    });
  }

  var CLAVES_ORDEN = { atraso: P.atraso, dias: P.dias, ingreso: P.ingreso, venc: P.venc, folio: P.folio, region: P.region, consulta: P.consulta, actividad: P.act };

  // Orden estable; el desempate es siempre el folio, para que no baile.
  function ordenar(D, filas, clave, dir) {
    var col = CLAVES_ORDEN[clave], mult = dir === 'asc' ? 1 : -1;
    return filas.slice().sort(function (a, b) {
      var x = a[col], y = b[col];
      if (clave === 'region') { x = D.regiones[x]; y = D.regiones[y]; }
      if (clave === 'actividad') { x = x < 0 ? '' : D.actividades[x]; y = y < 0 ? '' : D.actividades[y]; }
      var c = typeof x === 'string' ? x.localeCompare(y, 'es') : x - y;
      return c * mult || (a[P.folio] < b[P.folio] ? -1 : 1);
    });
  }

  // Antigüedad de la cartera: las clases 2 a 7 son exactamente los seis tramos.
  function antiguedad(D, r) {
    var tramos = D.clases.filter(function (c) { return c.grupo === 'proc'; });
    var tot = 0;
    tramos.forEach(function (c) { tot += r.tot[c.id]; });
    return tramos.map(function (c) {
      return { id: c.id, desde: c.desde, hasta: c.hasta, n: r.tot[c.id], pct: pct(r.tot[c.id], tot), vencido: !!c.venc, proxima: !!c.prox };
    });
  }

  // ---- comparación contra otro periodo ----------------------------------
  // Periodo contra el que se compara el filtro de fecha de ingreso. modo:
  //   'anterior'  el mismo número de días, justo antes del rango elegido
  //   'anio'      las mismas fechas, un año antes
  //   'ninguno'   sin comparación
  // `completo` es false si el periodo base empieza antes del primer día del archivo
  // (no hay datos para toda la base y la comparación sería engañosa).
  function periodoBase(D, f, modo) {
    if (!f || !modo || modo === 'ninguno' || f.desde == null || f.hasta == null) return null;
    var d, h;
    if (modo === 'anio') { d = moverAnio(D, f.desde); h = moverAnio(D, f.hasta); }
    else { h = f.desde - 1; d = h - (f.hasta - f.desde); }
    return { desde: d, hasta: h, completo: d >= 0 };
  }
  function moverAnio(D, dia) {
    var p = fechaIso(D, dia).split('-').map(Number);
    return diaDe(D, new Date(Date.UTC(p[0] - 1, p[1] - 1, p[2])).toISOString().slice(0, 10));
  }

  // ---- cruce consulta × región ---------------------------------------------
  // Vectores de clases por [región][consulta]. Respeta fecha de ingreso, materia y
  // espacio; NO los filtros de región ni consulta (son las dos dimensiones del cruce).
  function cruceConsultaRegion(D, f) {
    var n = normalizar(D, f), nR = D.regiones.length, nC = D.consultas.length, out = [], i, j;
    for (i = 0; i < nR; i++) { out.push([]); for (j = 0; j < nC; j++) out[i].push(nuevoVector()); }
    var c = D.cubo;
    for (i = 0; i < c.length; i += PASO_CUBO) {
      if (c[i] < n.desde || c[i] > n.hasta || !pasa(n.e, c[i + 2]) || !pasa(n.m, c[i + 6])) continue;
      out[c[i + 3]][c[i + 1]][c[i + 4]] += c[i + 5];
    }
    return out;
  }

  // ---- por vencer: cuántos días hábiles le quedan a cada consulta -----------
  // Una consulta con `dias` hábiles transcurridos puede responderse hasta el día
  // `plazo` (incluido): le quedan plazo + 1 − dias días, contando hoy. Son
  // exactamente las «próximas a vencer» (clase 3): 8, 9 y 10 días -> 3, 2 y 1.
  function porVencer(D, f) {
    var nb = D.plazo - D.proximaDesde + 1, total = [], porRegion = [], i;
    for (i = 0; i < nb; i++) total.push(0);
    for (i = 0; i < D.regiones.length; i++) { porRegion.push([]); for (var k = 0; k < nb; k++) porRegion[i].push(0); }
    pendientes(D, f, {}).forEach(function (p) {
      if (p[P.clase] !== 3) return;
      var q = D.plazo + 1 - p[P.dias] - 1;          // posición 0 = «le queda 1 día»
      if (q < 0 || q >= nb) return;
      total[q]++; porRegion[p[P.region]][q]++;
    });
    return { dias: nb, total: total, suma: total.reduce(function (s, x) { return s + x; }, 0), porRegion: porRegion };
  }

  // Día (índice desde D.dia0) -> 'AAAA-MM-DD'.
  function fechaIso(D, dia) {
    var p = D.dia0.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + dia)).toISOString().slice(0, 10);
  }
  // 'AAAA-MM-DD' -> índice de día desde D.dia0.
  function diaDe(D, iso) {
    var p = D.dia0.split('-').map(Number), q = iso.split('-').map(Number);
    return Math.round((Date.UTC(q[0], q[1] - 1, q[2]) - Date.UTC(p[0], p[1] - 1, p[2])) / 86400000);
  }

  global.AGG = {
    NCLASES: NCLASES, P: P, medidas: medidas, pct: pct, calcular: calcular, evolucion: evolucion, tablaRegional: tablaRegional,
    pendientes: pendientes, ordenar: ordenar, antiguedad: antiguedad, estadoPlazo: estadoPlazo, fechaIso: fechaIso, diaDe: diaDe,
    finDeMes: finDeMes, periodoBase: periodoBase, cruceConsultaRegion: cruceConsultaRegion, porVencer: porVencer
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.AGG;
})(typeof window !== 'undefined' ? window : globalThis);
