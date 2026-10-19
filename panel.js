// Interfaz del dashboard SIAC. Solo dibuja y maneja eventos: todo número sale
// de AGG (agregar.js) y toda regla de plazos, del ETL (viaja en datos.js).
(function () {
  'use strict';

  var DIAS_FRESCO = 2;        // la carga es diaria: pasado esto, el panel avisa que no corrió
  var N_MIN_FIN = 30;         // bajo este n, el % de cumplimiento de una región es poco estable
  var N_MIN_PROC = 10;        // idem para el % de vencidas sobre consultas en proceso
  var POR_PAGINA = 25;
  var D = window.DATOS;
  var $ = function (id) { return document.getElementById(id); };

  if (!D) {
    $('contenido').innerHTML = '<div class="aviso aviso--error"><span>No se encontró <b>datos.js</b>. Ejecute <b>python extraer.py</b> para generarlo.</span></div>';
    return;
  }

  // ---- íconos (trazos del UI Kit gob.cl / Material, los mismos del panel de referencia) ----
  var ICONOS = {
    update: '<path transform="translate(3 3)" d="M8 5v5l4.25 2.52.77-1.28-3.52-2.09V5H8zm10 2V0l-2.64 2.64A8.96 8.96 0 0 0 9 0a9 9 0 1 0 9 9h-2a7 7 0 1 1-2.05-4.95L11 7h7z"/>',
    descarga: '<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>',
    enlace: '<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>',
    imprimir: '<path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>',
    menu_open: '<path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z"/>',
    menu: '<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>',
    dashboard: '<path transform="translate(3 3)" d="M16 2v2h-4V2h4zM6 2v6H2V2h4zm10 8v6h-4v-6h4zM6 14v2H2v-2h4zM18 0h-8v6h8V0zM8 0H0v10h8V0zm10 8h-8v10h8V8zM8 12H0v6h8v-6z"/>',
    mapa: '<path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z"/>',
    ayuda: '<path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>',
    globo: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',
    calendario: '<path transform="translate(3 2)" d="M16 2h-1V0h-2v2H5V0H3v2H2C.89 2 .01 2.9.01 4L0 18c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 16H2V8h14v10zm0-12H2V4h14v2zM9 11h5v5H9v-5z"/>',
    categoria: '<path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"/>',
    documento: '<path transform="translate(4 2)" d="M4 14h8v2H4v-2zm0-4h8v2H4v-2zm6-10H2C.9 0 0 .9 0 2v16c0 1.1.89 2 1.99 2H14c1.1 0 2-.9 2-2V6l-6-6zm4 18H2V2h7v5h5v11z"/>',
    entrada: '<path d="M19 3H4.99C3.88 3 3 3.9 3 5l.01 14c0 1.1.88 2 1.99 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10zm-3-5h-2V7h-4v3H8l4 4 4-4z"/>',
    flecha: '<path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"/>',
    reiniciar: '<path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 2.97-2.17 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93 0-4.42-3.58-8-8-8zm-6 8c0-1.65.67-3.15 1.76-4.24L6.34 7.34A7.95 7.95 0 0 0 4 13c0 4.08 3.05 7.44 7 7.93v-2.02c-2.83-.48-5-2.94-5-5.91z"/>',
    info: '<path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>',
    alerta: '<path transform="translate(1 2.5)" d="M11 3.99 18.53 17H3.47L11 3.99zM11 0 0 19h22L11 0zm1 14h-2v2h2v-2zm0-6h-2v4h2V8z"/>',
    listo: '<path transform="translate(2 2)" d="M20 3.18 8.59 14.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L20 3.18zm-2.21 5.04c.13.57.21 1.17.21 1.78 0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8c1.58 0 3.04.46 4.28 1.25l1.44-1.44A9.9 9.9 0 0 0 10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10c0-1.19-.22-2.33-.6-3.39l-1.61 1.61z"/>',
    reloj: '<path transform="translate(2 2)" d="M9.99 0C4.47 0 0 4.48 0 10s4.47 10 9.99 10C15.52 20 20 15.52 20 10S15.52 0 9.99 0zM10 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H9v6l5.25 3.15.75-1.23-4.5-2.67V5z"/>',
    cerrar: '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>'
  };
  function ico(n, extra) { return '<svg class="ico ' + (extra || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[n] + '</svg>'; }
  Array.prototype.forEach.call(document.querySelectorAll('svg[data-i]'), function (s) { s.innerHTML = ICONOS[s.getAttribute('data-i')]; });

  // ---- formato chileno ----
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function num(n) { return Math.round(n || 0).toLocaleString('es-CL'); }
  function dec1(n) { return n == null ? '—' : n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function pc(n) { return n == null ? '—' : n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'; }
  function fecha(iso) { return iso ? iso.slice(8, 10) + '-' + iso.slice(5, 7) + '-' + iso.slice(0, 4) : '—'; }
  function diaMes(iso) { return +iso.slice(8, 10) + ' de ' + MESES[+iso.slice(5, 7) - 1]; }
  function mesLargo(m) { var s = MESES[+m.slice(5, 7) - 1]; return s.charAt(0).toUpperCase() + s.slice(1) + ' de ' + m.slice(0, 4); }
  function mesCorto(m) { return MESES[+m.slice(5, 7) - 1].slice(0, 3) + ' ' + m.slice(2, 4); }
  function fechaHora(iso) { var d = new Date(iso), p = function (v) { return String(v).padStart(2, '0'); };
    return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  // Los nombres vienen de la base: nunca se meten crudos en innerHTML.
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---- estado de la vista ----
  var est = {
    pag: 'resumen',
    f: { desde: null, hasta: null, consultas: null, espacios: null, regiones: null, materias: null },
    ninguno: { consultas: false, espacios: false, regiones: false, materias: false },   // «Todos» desmarcado: casillas vacías, se siguen viendo todos
    ordenReg: { k: 'total', dir: 'desc' },
    ordenProc: 'proc',
    tabla: { regiones: null, estado: '', folio: '', k: 'atraso', dir: 'desc', pag: 1 },
    cmp: 'anterior'      // contra qué periodo se comparan las variaciones: anterior | anio | ninguno
  };
  var r = null, ev = null;
  var rBase = null, baseInfo = null;   // resultado del periodo de comparación y su rango

  // ---- comparación contra otro periodo ----
  // Solo se comparan magnitudes que tienen sentido entre cohortes de ingreso: el volumen de
  // consultas y el % de cumplimiento de las finalizadas. «En proceso», vencidas y próximas
  // son el estado de HOY de cada cohorte: el periodo anterior casi no tiene pendientes, así
  // que compararlos sería engañoso.
  function calcularBase(f) {
    baseInfo = AGG.periodoBase(D, f, est.cmp);
    rBase = baseInfo && baseInfo.completo ? AGG.calcular(D, Object.assign({}, f, { desde: baseInfo.desde, hasta: baseInfo.hasta })) : null;
  }
  function etiquetaBase() {
    if (!baseInfo) return '';
    var rango = baseInfo.completo ? fecha(AGG.fechaIso(D, baseInfo.desde)) + ' al ' + fecha(AGG.fechaIso(D, baseInfo.hasta)) : '';
    return (est.cmp === 'anio' ? 'año anterior' : 'periodo anterior') + (rango ? ' (' + rango + ')' : '');
  }
  function varHtml(d, unidad, dec) {   // d = diferencia ya calculada; neutra: flecha + cifra
    if (!baseInfo) return '';
    if (d == null || !isFinite(d)) return '<span class="var var--sin" title="Sin datos suficientes en el periodo de comparación">—</span>';
    var a = Math.abs(d);
    var txt = (a < 0.05 ? '= ' : (d > 0 ? '▲ ' : '▼ ')) + a.toLocaleString('es-CL', { minimumFractionDigits: dec == null ? 1 : dec, maximumFractionDigits: dec == null ? 1 : dec }) + (unidad ? '<span class="u">' + unidad + '</span>' : '');
    return '<span class="var" title="Contra el ' + esc(etiquetaBase()) + '">' + txt + '</span>';
  }
  function difPP(a, b) { return rBase && a != null && b != null ? a - b : null; }
  function difRel(a, b) { return rBase && b > 0 ? (a - b) / b * 100 : null; }

  function filtros() {
    return {
      desde: est.f.desde ? AGG.diaDe(D, est.f.desde) : null,
      hasta: est.f.hasta ? AGG.diaDe(D, est.f.hasta) : null,
      consultas: est.f.consultas, espacios: est.f.espacios, regiones: est.f.regiones, materias: est.f.materias
    };
  }

  // ---- cabecera ----
  $('sello-act').textContent = 'Actualizado ' + fechaHora(D.generado);
  $('sello-corte').textContent = 'Datos al ' + fecha(D.corte);
  $('sello-corte').title = 'Fecha de corte: último día con consultas finalizadas en el archivo (' + fecha(D.corte) +
    '). Los días de las consultas en proceso están contados hasta el ' + fecha(D.refEnProceso) + ', día de generación del archivo.';

  // ---- filtros de fecha ----
  var fMin = AGG.fechaIso(D, 0), fMax = AGG.fechaIso(D, D.cubo.reduce(function (m, v, i) { return i % 7 === 0 && v > m ? v : m; }, 0));
  ['f-desde', 'f-hasta'].forEach(function (id) { $(id).min = fMin; $(id).max = fMax; });
  // Rango por defecto: desde el 01-01-2026 hasta la fecha de corte de los datos (último día
  // con consultas finalizadas), no hasta el día en que se corrió la actualización.
  var DEF_DESDE = '2026-01-01' < fMin ? fMin : '2026-01-01';
  var DEF_HASTA = D.corte > fMax ? fMax : D.corte;
  est.f.desde = DEF_DESDE; est.f.hasta = DEF_HASTA;
  $('f-desde').value = DEF_DESDE; $('f-hasta').value = DEF_HASTA; $('f-hasta').min = DEF_DESDE;
  $('f-desde').addEventListener('change', function () {
    est.f.desde = this.value || null;
    if (est.f.desde && est.f.hasta && est.f.hasta < est.f.desde) { est.f.hasta = est.f.desde; $('f-hasta').value = est.f.hasta; }   // sin rangos contradictorios
    $('f-hasta').min = est.f.desde || fMin;
    cambioFiltros();
  });
  $('f-hasta').addEventListener('change', function () {
    est.f.hasta = this.value || null;
    if (est.f.desde && est.f.hasta && est.f.hasta < est.f.desde) { est.f.desde = est.f.hasta; $('f-desde').value = est.f.desde; }
    $('f-hasta').min = est.f.desde || fMin;
    cambioFiltros();
  });

  // ---- filtros multiselección con casillas ----
  var MULTI = {
    consultas: { id: 'm-consultas', lista: D.consultas, todos: 'Todos' },
    espacios: { id: 'm-espacios', lista: D.espacios, todos: 'Todos' },
    materias: { id: 'm-materias', lista: D.materias, todos: 'Todas' },
    regiones: { id: 'm-regiones', lista: D.regiones, todos: 'Todas' }
  };
  Object.keys(MULTI).forEach(function (clave) {
    var m = MULTI[clave], el = $(m.id);
    el.innerHTML = ico(el.getAttribute('data-ico')) + '<span class="chip-rot">' + el.getAttribute('data-rot') + '</span>' +
      '<button type="button" class="multi-btn" aria-haspopup="true" aria-expanded="false"></button>' + ico('flecha', 'chip-flecha') +
      '<div class="multi-panel" role="group" hidden>' +
      '<label class="multi-op multi-todos"><input type="checkbox" data-todos> ' + m.todos + '</label>' +
      m.lista.map(function (n, i) { return '<label class="multi-op"><input type="checkbox" data-i="' + i + '"> ' + esc(n) + '</label>'; }).join('') + '</div>';
    var btn = el.querySelector('.multi-btn'), panel = el.querySelector('.multi-panel');
    btn.setAttribute('aria-label', el.getAttribute('data-rot').replace(':', ''));
    btn.addEventListener('click', function () {
      var abrir = panel.hidden;
      cerrarMultis();
      panel.hidden = !abrir; btn.setAttribute('aria-expanded', String(abrir));
    });
    panel.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-todos')) {
        est.f[clave] = null; est.ninguno[clave] = !t.checked;
      } else {
        var marcadas = [];
        Array.prototype.forEach.call(panel.querySelectorAll('input[data-i]'), function (c) { if (c.checked) marcadas.push(+c.getAttribute('data-i')); });
        est.ninguno[clave] = marcadas.length === 0;
        est.f[clave] = marcadas.length === 0 || marcadas.length === m.lista.length ? null : marcadas;
      }
      pintarMulti(clave); cambioFiltros();
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { cerrarMultis(); btn.focus(); } });
  });
  function cerrarMultis() {
    Object.keys(MULTI).forEach(function (c) {
      var el = $(MULTI[c].id); el.querySelector('.multi-panel').hidden = true; el.querySelector('.multi-btn').setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', function (e) { if (!e.target.closest('.multi')) cerrarMultis(); });
  function pintarMulti(clave) {
    var m = MULTI[clave], el = $(m.id), sel = est.f[clave], btn = el.querySelector('.multi-btn');
    btn.textContent = sel ? (sel.length === 1 ? m.lista[sel[0]] : sel.length + ' seleccionadas') : est.ninguno[clave] ? 'Elegir…' : m.todos;
    Array.prototype.forEach.call(el.querySelectorAll('input[data-i]'), function (c) {
      c.checked = sel ? sel.indexOf(+c.getAttribute('data-i')) >= 0 : !est.ninguno[clave];
    });
    var t = el.querySelector('input[data-todos]');
    t.checked = !sel && !est.ninguno[clave]; t.indeterminate = !!sel;
  }
  // Clic en una barra o fila: queda esa sola (segundo clic, todas); con Ctrl/Mayús se suma o quita.
  function alternar(clave, i, multiple) {
    var sel = est.f[clave];
    est.ninguno[clave] = false;
    if (multiple) {
      sel = sel ? sel.slice() : [];
      var p = sel.indexOf(i);
      if (p >= 0) sel.splice(p, 1); else sel.push(i);
      est.f[clave] = sel.length && sel.length < MULTI[clave].lista.length ? sel : null;
    } else {
      est.f[clave] = sel && sel.length === 1 && sel[0] === i ? null : [i];
    }
    pintarMulti(clave); cambioFiltros();
  }
  $('f-reset').addEventListener('click', function () {
    est.f = { desde: DEF_DESDE, hasta: DEF_HASTA, consultas: null, espacios: null, regiones: null, materias: null };
    est.ninguno = { consultas: false, espacios: false, regiones: false, materias: false };
    $('f-desde').value = DEF_DESDE; $('f-hasta').value = DEF_HASTA; $('f-hasta').min = DEF_DESDE;
    est.cmp = 'anterior'; $('f-cmp').value = est.cmp;
    Object.keys(MULTI).forEach(pintarMulti);
    cambioFiltros();
  });
  function cambioFiltros() { est.tabla.pag = 1; render(); }

  // ---- tooltip ----
  var tip = $('tip');
  function mostrarTip(el, x, y) {
    tip.innerHTML = el.getAttribute('data-tip'); tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(x + 14, window.innerWidth - w - 8)) + 'px';
    tip.style.top = Math.max(8, y + 14 + h > window.innerHeight ? y - h - 10 : y + 14) + 'px';
  }
  document.addEventListener('mousemove', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) mostrarTip(el, e.clientX, e.clientY); else tip.hidden = true;
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) { var b = el.getBoundingClientRect(); mostrarTip(el, b.left + b.width / 2, b.top); }
  });
  document.addEventListener('focusout', function () { tip.hidden = true; });
  // data-tip lleva HTML ya armado; se escapa una vez para el atributo.
  function tipAttr(titulo, filas) { return ' data-tip="' + esc(tipHtmlPlano(titulo, filas)) + '"'; }
  function tipHtmlPlano(titulo, filas) {
    return '<div class="tip-tit">' + esc(titulo) + '</div>' + filas.map(function (f) {
      return '<div class="tip-fila"><i class="tip-k ' + (f[2] || '') + '"></i><b>' + f[0] + '</b><span>' + esc(f[1]) + '</span></div>';
    }).join('');
  }

  // ---- avisos y estado ----
  function pintarAvisos(total) {
    var h = [], E = window.ESTADO_ACT;
    var dias = (Date.now() - new Date(D.generado).getTime()) / 86400000;
    if (E && E.resultado === 'error') {
      h.push('<div class="aviso aviso--error">' + ico('alerta') + '<span><b>La última actualización falló</b> (' + fechaHora(E.intento) + '): ' + esc(E.mensaje) +
        ' Se muestran los datos de la última actualización exitosa (' + fechaHora(D.generado) + ').</span></div>');
    }
    if (dias > DIAS_FRESCO) {
      h.push('<div class="aviso aviso--alerta">' + ico('alerta') + '<span>Los datos tienen ' + Math.floor(dias) + ' días de antigüedad (' + fechaHora(D.generado) +
        '). La actualización diaria no se ha ejecutado.</span></div>');
    }
    if (!total) {
      h.push('<div class="aviso aviso--info">' + ico('info') + '<span><b>Ninguna consulta cumple los filtros seleccionados.</b> Amplíe el rango de fechas o use «Restablecer filtros».</span></div>');
    }
    $('avisos').innerHTML = h.join('');
  }
  function pintarEstado(total) {
    var n = (est.f.desde !== DEF_DESDE || est.f.hasta !== DEF_HASTA ? 1 : 0) + (est.f.consultas ? 1 : 0) + (est.f.espacios ? 1 : 0) + (est.f.regiones ? 1 : 0) + (est.f.materias ? 1 : 0);
    $('estado').textContent = num(total) + ' consultas · ' + (n ? n + (n === 1 ? ' filtro aplicado' : ' filtros aplicados') : 'sin filtros');
  }

  // ======================= RESUMEN =======================
  function pintarKpis(K) {
    $('kpis').innerHTML = kpiTarjetas(K).map(function (t) {
      return '<div class="tarjeta kpi"><div class="kpi-rot' + (t.c ? ' kpi-rot--' + t.c : '') + '">' + ico(t.i) + '<span>' + t.rot + '</span></div>' +
        '<div class="kpi-num' + (t.c ? ' kpi-num--' + t.c : '') + '">' + t.v + '</div>' +
        '<div class="kpi-var">' + (t.vr ? t.vr + ' <span class="var var--sin">vs ' + (est.cmp === 'anio' ? 'año anterior' : 'periodo anterior') + '</span>' : '') + '</div>' +
        '<div class="kpi-pie">' + t.pie + '</div></div>';
    }).join('');
  }
  function kpiTarjetas(K) {
    return [
      { rot: 'Consultas totales registradas', i: 'documento', v: num(K.total), pie: 'Las que cumplen los filtros seleccionados',
        vr: varHtml(difRel(K.total, rBase && rBase.kpi.total), ' %') },
      { rot: 'Consultas finalizadas', i: 'listo', v: num(K.fin), pie: pc(K.pctFin) + ' del total de consultas' },
      { rot: 'Consultas en proceso', i: 'reloj', v: num(K.proc), pie: pc(K.pctProc) + ' del total de consultas' },
      { rot: 'Cumplimiento en plazo de las finalizadas', i: 'listo', c: 'verde', v: pc(K.cumplimiento),
        vr: varHtml(difPP(K.cumplimiento, rBase && rBase.kpi.cumplimiento), ' pp'),
        pie: num(K.finDentro) + ' de ' + num(K.fin) + ' finalizadas, respondidas en ' + D.plazo + ' días hábiles o menos' },
      { rot: 'Consultas en proceso vencidas', i: 'alerta', c: 'rojo', v: num(K.vencidas),
        pie: pc(K.pctVencidas) + ' de las ' + num(K.proc) + ' en proceso · más de ' + D.plazo + ' días hábiles' },
      { rot: 'Consultas próximas a vencer', i: 'reloj', c: 'ambar', v: num(K.proxima),
        pie: 'En proceso con ' + D.proximaDesde + ' a ' + D.plazo + ' días hábiles · siguen dentro de plazo' }
    ];
  }

  function grupoPlazo(titulo, total, segs, detalle) {
    if (!total) return '<div class="plazo"><div class="plazo-tit">' + titulo + ' <b>0</b></div><div class="plazo-nota">Sin consultas con estos filtros.</div></div>';
    return '<div class="plazo"><div class="plazo-tit">' + titulo + ' <b>' + num(total) + '</b></div>' +
      '<div class="apilada" role="img" aria-label="' + esc(segs.map(function (s) { return s.l + ': ' + num(s.n); }).join(', ')) + '">' +
      segs.filter(function (s) { return s.n > 0; }).map(function (s) {
        return '<span class="' + s.c + '" style="flex:' + s.n + ' 1 0"' + tipAttr(s.l, [[num(s.n), pc(s.n / total * 100) + ' de ' + titulo.toLowerCase(), s.c]]) + '></span>';
      }).join('') + '</div><div class="plazo-det">' + detalle + '</div></div>';
  }
  function detalle(c, label, n, total, extra) {
    return '<span><i class="k-caja ' + c + '"></i>' + label + ': <b>' + num(n) + '</b> (' + pc(total ? n / total * 100 : null) + ')' + (extra || '') + '</span>';
  }
  function pintarPlazo(K) {
    $('plazo').innerHTML =
      grupoPlazo('Consultas finalizadas', K.fin, [
        { n: K.finDentro, c: 'c-ok', l: 'Dentro de plazo' }, { n: K.finFuera, c: 'c-venc', l: 'Fuera de plazo' }],
        detalle('c-ok', 'Dentro de plazo', K.finDentro, K.fin) + detalle('c-venc', 'Fuera de plazo', K.finFuera, K.fin)) +
      grupoPlazo('Consultas en proceso', K.proc, [
        { n: K.resto, c: 'c-ok', l: 'Dentro de plazo (0 a ' + (D.proximaDesde - 1) + ' días)' },
        { n: K.proxima, c: 'c-prox', l: 'Próximas a vencer (' + D.proximaDesde + ' a ' + D.plazo + ' días)' },
        { n: K.vencidas, c: 'c-venc', l: 'Vencidas' }],
        detalle('c-ok', 'Dentro de plazo', K.procDentro, K.proc, ' — <i class="k-caja c-prox" style="display:inline-block"></i> de ellas ' + num(K.proxima) + ' próximas a vencer') +
        detalle('c-venc', 'Vencidas', K.vencidas, K.proc));
  }

  // ---- evolución mensual (SVG a mano) ----
  var EVO_DESDE = '2026-01';
  function pintarEvolucion() {
    var parcial = ev.filter(function (e) { return e.parcial; })[0];
    $('evo-sub').textContent = 'Por mes de término de la consulta. Responde a los filtros de consulta, materia y espacio de atención; ' +
      'no a la fecha de ingreso ni a la región.';
    var av = $('evo-parcial');
    if (parcial) {
      av.hidden = false;
      av.innerHTML = ico('alerta') + '<span><b>' + mesLargo(parcial.mes) + ': datos parciales al ' + diaMes(D.corte) + '.</b> El último punto no es un mes cerrado: no se compara con los anteriores.</span>';
    } else av.hidden = true;
    dibujarEvolucion();
    var filas = ev.slice().reverse();
    $('evo-tabla-caja').innerHTML = '<table class="datos"><thead><tr><th class="izq">Mes de término</th><th>Finalizadas</th><th>Dentro de plazo</th><th>Fuera de plazo</th><th>% dentro de plazo</th></tr></thead><tbody>' +
      filas.map(function (e) {
        return '<tr><th scope="row">' + mesLargo(e.mes) + (e.parcial ? ' (parcial)' : '') + '</th><td>' + num(e.fin) + '</td><td>' + num(e.dentro) + '</td><td>' + num(e.fuera) + '</td><td>' + pc(e.cumplimiento) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  // Sin argumentos dibuja en la tarjeta; con (contenedor, ancho, alto), en otro lugar (la hoja de una página).
  function dibujarEvolucion(contX, Wx, Hx) {
    var cont = contX || $('evo'), W = Wx || cont.clientWidth, H = Hx || cont.clientHeight;
    var con = ev.filter(function (e) { return e.cumplimiento != null; });
    if (!con.length) { cont.innerHTML = '<div class="vacio">Sin consultas finalizadas con estos filtros.</div>'; return; }
    if (W < 50) return;
    var m = { l: 46, r: 14, t: 14, b: 34 }, w = W - m.l - m.r, h = H - m.t - m.b;
    var min = Math.min.apply(null, con.map(function (e) { return e.cumplimiento; }));
    var lo = Math.max(0, Math.floor((min - 3) / 5) * 5), hi = 100, paso = hi - lo <= 20 ? 5 : hi - lo <= 50 ? 10 : 20;
    var n = ev.length, x = function (i) { return m.l + (n === 1 ? w / 2 : i * w / (n - 1)); };
    var y = function (v) { return m.t + h - (v - lo) / (hi - lo) * h; };
    var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" style="font-size:12px">';
    for (var t = lo; t <= hi; t += paso) {
      s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="var(--chart-grilla)"/>' +
        '<text x="' + (m.l - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end" fill="var(--chart-eje-texto)">' + t + ' %</text>';
    }
    var cada = Math.ceil(n / Math.max(1, Math.floor(w / 46)));
    ev.forEach(function (e, i) {
      if (i % cada === 0 || (i === n - 1 && (n - 1) % cada >= cada * 0.6)) s += '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" fill="var(--chart-eje-texto)">' + mesCorto(e.mes) + '</text>';
    });
    // línea: tramos continuos de meses cerrados; el parcial se une con trazo punteado
    var d = '', previo = null;
    ev.forEach(function (e, i) {
      if (e.cumplimiento == null || e.parcial) { previo = null; return; }
      d += (previo === null ? 'M' : 'L') + x(i) + ' ' + y(e.cumplimiento); previo = i;
    });
    s += '<path d="' + d + '" fill="none" stroke="var(--primario-darken-1)" stroke-width="2.5" stroke-linejoin="round"/>';
    ev.forEach(function (e, i) {
      if (e.cumplimiento == null) return;
      var tp = tipAttr(mesLargo(e.mes) + (e.parcial ? ' (parcial)' : ''), [[pc(e.cumplimiento), '% dentro de plazo'], [num(e.dentro), 'dentro de plazo'], [num(e.fuera), 'fuera de plazo'], [num(e.fin), 'finalizadas']]);
      if (e.parcial) {
        var ant = i - 1; while (ant >= 0 && ev[ant].cumplimiento == null) ant--;
        if (ant >= 0) s += '<line x1="' + x(ant) + '" y1="' + y(ev[ant].cumplimiento) + '" x2="' + x(i) + '" y2="' + y(e.cumplimiento) + '" stroke="var(--primario-darken-1)" stroke-width="2" stroke-dasharray="4 4"/>';
        s += '<circle cx="' + x(i) + '" cy="' + y(e.cumplimiento) + '" r="5" fill="var(--blanco-base)" stroke="var(--primario-darken-1)" stroke-width="2"/>';
      } else s += '<circle cx="' + x(i) + '" cy="' + y(e.cumplimiento) + '" r="3" fill="var(--primario-darken-1)"/>';
      s += '<circle cx="' + x(i) + '" cy="' + y(e.cumplimiento) + '" r="11" fill="transparent"' + tp + '/>';
    });
    if (lo > 0) s += '<text x="' + m.l + '" y="' + (m.t - 2) + '" fill="var(--chart-eje-texto)" font-size="11">El eje vertical no parte en 0 %</text>';
    cont.innerHTML = s + '</svg>';
  }

  // ---- listas de barras ----
  function seleccion(clave) { return est.f[clave]; }
  function filaBarra(clave, i, nombre, pista, val, tp, extra) {
    var sel = seleccion(clave), marcada = sel && sel.indexOf(i) >= 0;
    return '<button type="button" class="barra-fila ' + (extra || '') + '" data-dim="' + clave + '" data-i="' + i + '" aria-pressed="' + (marcada ? 'true' : 'false') + '"' + tp + '>' +
      '<span class="barra-nom" title="' + esc(nombre) + '">' + esc(nombre) + '</span><span class="pista">' + pista + '</span><span class="barra-val">' + val + '</span></button>';
  }
  function apilado(parts, max) {
    return '<span class="apilada">' + parts.filter(function (p) { return p.n > 0; }).map(function (p) {
      return '<span class="' + p.c + '" style="width:' + (p.n / max * 100) + '%"></span>'; }).join('') + '</span>';
  }
  function poner(id, clave, html, vacio) {
    var el = $(id);
    el.className = 'barras' + (est.f[clave] ? ' con-sel' : '');
    el.innerHTML = html || '<div class="vacio">' + (vacio || 'Sin consultas con estos filtros.') + '</div>';
  }

  function pintarRankings() {
    var filas = D.regiones.map(function (n, i) { return { i: i, n: n, m: AGG.medidas(r.porRegion[i]) }; });
    var con = filas.filter(function (x) { return x.m.total > 0; });
    var max = 0; con.forEach(function (x) { if (x.m.total > max) max = x.m.total; });
    poner('rank-cant', 'regiones', con.sort(function (a, b) { return b.m.total - a.m.total || a.i - b.i; }).map(function (x) {
      var m = x.m;
      return filaBarra('regiones', x.i, x.n, apilado([{ n: m.finDentro, c: 'c-ok' }, { n: m.finFuera, c: 'c-venc' }, { n: m.proc, c: 'c-proc' }], max),
        '<b>' + num(m.total) + '</b>', tipAttr(x.n, [[num(m.finDentro), 'finalizadas dentro de plazo', 'c-ok'], [num(m.finFuera), 'finalizadas fuera de plazo', 'c-venc'],
          [num(m.proc), 'en proceso (' + num(m.vencidas) + ' vencidas)', 'c-proc'], [num(m.total), 'total']]));
    }).join(''));

    $('rank-pct-sub').textContent = 'Finalizadas dentro de plazo ÷ finalizadas de la región. Junto al % va el n de finalizadas; ' +
      'en gris, las regiones con menos de ' + N_MIN_FIN + ' finalizadas (el % es poco estable).';
    var conFin = filas.filter(function (x) { return x.m.fin > 0; }).sort(function (a, b) { return b.m.cumplimiento - a.m.cumplimiento || b.m.fin - a.m.fin || a.i - b.i; });
    var sinFin = filas.filter(function (x) { return x.m.fin === 0 && x.m.total > 0; });
    poner('rank-pct', 'regiones', conFin.concat(sinFin).map(function (x) {
      var m = x.m, bajo = m.fin < N_MIN_FIN;
      return filaBarra('regiones', x.i, x.n, m.fin ? '<span class="relleno' + (bajo ? ' relleno--bajo' : '') + '" style="width:' + m.cumplimiento + '%"></span>' : '',
        '<b>' + pc(m.cumplimiento) + '</b> ' + (baseInfo ? varHtml(difPP(m.cumplimiento, rBase && AGG.medidas(rBase.porRegion[x.i]).cumplimiento), ' pp') + ' ' : '') + '<small>n = ' + num(m.fin) + '</small>',
        tipAttr(x.n, [[pc(m.cumplimiento), 'de las finalizadas, dentro de plazo'], [num(m.finDentro), 'dentro de plazo'], [num(m.fin), 'finalizadas']]), baseInfo ? 'barra-fila--cmp-rank' : '');
    }).join(''));
  }

  function pintarCumplimientoPor(id, clave, lista, porDim, porDimBase, nomLargo) {
    var filas = lista.map(function (n, i) { return { i: i, n: n, m: AGG.medidas(porDim[i]) }; }).filter(function (x) { return x.m.total > 0; });
    filas.sort(function (a, b) { return b.m.fin - a.m.fin; });
    poner(id, clave, filas.map(function (x) {
      var m = x.m;
      return filaBarra(clave, x.i, x.n, m.fin ? '<span class="relleno' + (m.fin < N_MIN_FIN ? ' relleno--bajo' : '') + '" style="width:' + m.cumplimiento + '%"></span>' : '',
        '<b>' + pc(m.cumplimiento) + '</b> ' + (baseInfo ? varHtml(difPP(m.cumplimiento, porDimBase && AGG.medidas(porDimBase[x.i]).cumplimiento), ' pp') + ' ' : '') +
          '<small>' + (baseInfo ? 'n = ' + num(m.fin) : num(m.finDentro) + ' de ' + num(m.fin)) + '</small>', tipAttr(x.n, [[pc(m.cumplimiento), 'dentro de plazo'],
          [num(m.finDentro), 'finalizadas dentro de plazo'], [num(m.fin), 'finalizadas'], [num(m.proc), 'en proceso']]),
        (baseInfo ? 'barra-fila--cmp' : 'barra-fila--v2') + (nomLargo ? ' barra-fila--nom-largo' : ''));
    }).join(''));
  }

  // ---- tabla de indicadores por región ----
  var COLS = [
    { k: 'region', t: 'Región/oficina', txt: true },
    { k: 'total', t: 'Total de consultas' },
    { k: 'fin', t: 'Consultas finalizadas' },
    { k: 'pctFin', t: '% finalizadas', p: true },
    { k: 'proc', t: 'Consultas en proceso' },
    { k: 'pctProc', t: '% en proceso', p: true },
    { k: 'finDentro', t: 'Finalizadas dentro de plazo' },
    { k: 'finFuera', t: 'Finalizadas fuera de plazo' },
    { k: 'cumplimiento', t: 'Cumplimiento de las finalizadas', p: true, marca: 'alto' },
    { k: 'procDentro', t: 'En proceso dentro de plazo' },
    { k: 'proxima', t: 'Próximas a vencer' },
    { k: 'vencidas', t: 'En proceso vencidas' },
    { k: 'pctVencidas', t: '% de en proceso vencidas', p: true, marca: 'bajo' }
  ];
  function celda(c, m) { return c.p ? pc(m[c.k]) : num(m[c.k]); }

  function pintarTablaRegional() {
    var filas = AGG.tablaRegional(D, r, filtros());
    var k = est.ordenReg.k, mult = est.ordenReg.dir === 'asc' ? 1 : -1;
    filas.sort(function (a, b) {
      var x = a[k], y = b[k];
      if (k === 'region') return x.localeCompare(y, 'es') * mult;
      if (x == null && y == null) return a.idx - b.idx;
      if (x == null) return 1;           // «—» siempre al final
      if (y == null) return -1;
      return (x - y) * mult || a.idx - b.idx;
    });
    // mejor y peor, solo entre regiones con volumen suficiente
    var marcas = {};
    COLS.forEach(function (c) {
      if (!c.marca) return;
      var ok = filas.filter(function (f) { return f[c.k] != null && (c.marca === 'alto' ? f.fin >= N_MIN_FIN : f.proc >= N_MIN_PROC); });
      if (ok.length < 2) return;
      var vals = ok.map(function (f) { return f[c.k]; }), mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
      if (mx === mn) return;
      var buenoAlto = c.marca === 'alto';
      ok.forEach(function (f) {
        if (f[c.k] === (buenoAlto ? mx : mn)) marcas[c.k + f.idx] = 'ok';
        else if (f[c.k] === (buenoAlto ? mn : mx)) marcas[c.k + f.idx] = 'mal';
      });
    });
    var sel = est.f.regiones;
    var cab = COLS.map(function (c) {
      var activo = est.ordenReg.k === c.k;
      return '<th scope="col"' + (c.txt ? ' class="izq"' : '') + (activo ? ' aria-sort="' + (est.ordenReg.dir === 'asc' ? 'ascending' : 'descending') + '"' : '') +
        '><button type="button" data-ord="' + c.k + '">' + c.t + '<span class="flecha" aria-hidden="true">' + (activo ? (est.ordenReg.dir === 'asc' ? '▲' : '▼') : '↕') + '</span></button></th>';
    }).join('');
    var cuerpo = filas.map(function (f) {
      return '<tr' + (sel && sel.indexOf(f.idx) >= 0 ? ' class="reg-sel"' : '') + '>' + COLS.map(function (c) {
        if (c.txt) return '<th scope="row"><button type="button" class="btn-fila" data-reg="' + f.idx + '" title="Filtrar por esta región/oficina">' + esc(f.region) + '</button></th>';
        var mk = marcas[c.k + f.idx];
        return '<td' + (c.k === 'cumplimiento' && f.fin < N_MIN_FIN || c.k === 'pctVencidas' && f.proc < N_MIN_PROC ? ' class="t-bajo"' : '') + '>' + celda(c, f) +
          (mk ? '<span class="marca marca--' + mk + '" title="' + (mk === 'ok' ? 'Mejor resultado' : 'Peor resultado') + ' entre las regiones con volumen suficiente">' + ico(mk === 'ok' ? 'listo' : 'alerta') +
            '<span class="oculto-vis">' + (mk === 'ok' ? 'mejor resultado' : 'peor resultado') + '</span></span>' : '') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var K = r.kpi;
    $('tabla-reg').innerHTML = '<thead><tr>' + cab + '</tr></thead><tbody>' + cuerpo + '</tbody><tfoot><tr><th scope="row">Total</th>' +
      COLS.slice(1).map(function (c) { return '<td>' + celda(c, K) + '</td>'; }).join('') + '</tr></tfoot>';
    $('reg-sub').textContent = filas.length + ' región(es) u oficina(s). Clic en el nombre para filtrar; clic en un encabezado para ordenar.';
    $('reg-nota').textContent = '% finalizadas y % en proceso: sobre el total de la región. Cumplimiento: dentro de plazo ÷ finalizadas. % vencidas: vencidas ÷ en proceso. ' +
      '«Próximas a vencer» está incluida en «En proceso dentro de plazo». «—»: el denominador es cero. ' +
      'Marcas de mejor/peor: solo con al menos ' + N_MIN_FIN + ' finalizadas (cumplimiento) o ' + N_MIN_PROC + ' en proceso (vencidas); en gris, bajo ese volumen.';
  }

  function pintarResumen() {
    var K = r.kpi;
    pintarKpis(K);
    pintarPlazo(K);
    pintarEvolucion();
    pintarRankings();
    pintarCumplimientoPor('esp', 'espacios', D.espacios, r.porEspacio, rBase && rBase.porEspacio);
    pintarCumplimientoPor('con', 'consultas', D.consultas, r.porConsulta, rBase && rBase.porConsulta);
    pintarCumplimientoPor('mat', 'materias', D.materias, r.porMateria, rBase && rBase.porMateria, true);
    pintarCalor();
    pintarTablaRegional();
  }

  // ---- mapa de calor consulta × región ----
  function pintarCalor() {
    var f = filtros(), X = AGG.cruceConsultaRegion(D, f), nM = D.consultas.length;
    var selR = est.f.regiones, selM = est.f.consultas, hay = !!(selR || selM);
    var filas = [], gap = 0;
    D.regiones.forEach(function (nom, i) {
      var tot = new Float64Array(AGG.NCLASES), celdas = X[i].map(function (v) { for (var k = 0; k < AGG.NCLASES; k++) tot[k] += v[k]; return AGG.medidas(v); });
      var mt = AGG.medidas(tot);
      if (!mt.total) return;
      celdas.forEach(function (c) { if (c.fin >= N_MIN_FIN && c.cumplimiento != null) gap = Math.max(gap, 100 - c.cumplimiento); });
      filas.push({ i: i, nom: nom, celdas: celdas, tot: mt });
    });
    var totM = [];
    for (var j = 0; j < nM; j++) { var v = new Float64Array(AGG.NCLASES); X.forEach(function (fila) { for (var k = 0; k < AGG.NCLASES; k++) v[k] += fila[j][k]; }); totM.push(AGG.medidas(v)); }
    var granTotal = new Float64Array(AGG.NCLASES); X.forEach(function (fila) { fila.forEach(function (v) { for (var k = 0; k < AGG.NCLASES; k++) granTotal[k] += v[k]; }); });
    function celda(c, i, j) {
      var sel = hay && (!selR || selR.indexOf(i) >= 0) && (!selM || selM.indexOf(j) >= 0);
      if (!c.fin) return '<td class="cal' + (sel ? ' cal--sel' : '') + '"><button type="button" data-cal="' + i + ',' + j + '" disabled aria-label="Sin finalizadas">—</button></td>';
      var bajo = c.fin < N_MIN_FIN, p = bajo || !gap ? 0 : 75 * (100 - c.cumplimiento) / gap;
      return '<td class="cal' + (bajo ? ' cal--bajo' : p > 45 ? ' cal--oscura' : '') + (sel ? ' cal--sel' : '') + '"><button type="button" data-cal="' + i + ',' + j + '"' +
        (bajo ? '' : ' style="background:color-mix(in srgb, var(--primario-darken-1) ' + p.toFixed(1) + '%, var(--blanco-base))"') +
        tipAttr(D.regiones[i] + ' · ' + D.consultas[j], [[pc(c.cumplimiento), 'dentro de plazo'], [num(c.finDentro), 'finalizadas dentro de plazo'], [num(c.fin), 'finalizadas'], [num(c.proc), 'en proceso (' + num(c.vencidas) + ' vencidas)']]) + '>' +
        pc(c.cumplimiento) + '<small>n = ' + num(c.fin) + '</small></button></td>';
    }
    $('tabla-calor').innerHTML = '<thead><tr><th scope="col" class="izq">Región/oficina</th>' + D.consultas.map(function (n, j) {
        return '<th scope="col"><button type="button" data-dim="consultas" data-i="' + j + '" title="Filtrar por este tipo de consulta">' + esc(n) + '</button></th>';
      }).join('') + '<th scope="col">Todas las consultas</th></tr></thead><tbody>' +
      filas.map(function (fl) {
        return '<tr' + (selR && selR.indexOf(fl.i) >= 0 ? ' class="reg-sel"' : '') + '><th scope="row"><button type="button" class="btn-fila" data-reg="' + fl.i + '" title="Filtrar por esta región/oficina">' + esc(fl.nom) + '</button></th>' +
          fl.celdas.map(function (c, j) { return celda(c, fl.i, j); }).join('') +
          '<td>' + pc(fl.tot.cumplimiento) + ' <small class="t-bajo">n = ' + num(fl.tot.fin) + '</small></td></tr>';
      }).join('') + '</tbody><tfoot><tr><th scope="row">Todas las regiones</th>' +
      totM.map(function (c) { return '<td>' + pc(c.cumplimiento) + ' <small class="t-bajo">n = ' + num(c.fin) + '</small></td>'; }).join('') +
      '<td>' + pc(AGG.medidas(granTotal).cumplimiento) + ' <small class="t-bajo">n = ' + num(AGG.medidas(granTotal).fin) + '</small></td></tr></tfoot>';
    $('cal-sub').textContent = 'Dónde está el problema: % de finalizadas dentro de plazo en cada cruce. Responde a fecha de ingreso, materia y espacio; los filtros de región y consulta resaltan, no ocultan.';
    $('cal-nota').textContent = 'Más oscuro = menor cumplimiento, relativo a esta misma tabla. Sin color y en gris: menos de ' + N_MIN_FIN + ' finalizadas (el % es poco estable). «—»: sin finalizadas. Clic en una celda para filtrar el panel por esa región y ese tipo de consulta.';
  }

  // ======================= GESTIÓN REGIONAL =======================
  function pintarAntiguedad() {
    var tr = AGG.antiguedad(D, r), tot = r.kpi.proc, cont = $('ant');
    $('ant-sub').textContent = num(tot) + ' consultas en proceso, por días hábiles transcurridos desde el ingreso hasta el ' + fecha(D.refEnProceso) +
      '. Verde y ámbar: dentro de plazo; rojo: vencidas.';
    var rot = function (t) { return t.hasta == null ? 'Más de ' + (t.desde - 1) : t.desde + ' a ' + t.hasta; };
    $('ant-tabla-caja').innerHTML = '<table class="datos"><thead><tr><th class="izq">Días hábiles</th><th>Consultas</th><th>% del total en proceso</th><th class="izq">Situación</th></tr></thead><tbody>' +
      tr.map(function (t) { return '<tr><th scope="row">' + rot(t) + '</th><td>' + num(t.n) + '</td><td>' + pc(t.pct) + '</td><td class="izq">' + (t.vencido ? 'Vencida' : t.proxima ? 'Próxima a vencer' : 'Dentro de plazo') + '</td></tr>'; }).join('') + '</tbody></table>';
    if (!tot) { cont.innerHTML = '<div class="vacio">Sin consultas en proceso con estos filtros.</div>'; return; }
    var W = cont.clientWidth, H = cont.clientHeight; if (W < 50) return;
    var m = { l: 46, r: 14, t: 34, b: 52 }, w = W - m.l - m.r, h = H - m.t - m.b;
    var max = Math.max.apply(null, tr.map(function (t) { return t.n; }));
    var paso = Math.pow(10, Math.floor(Math.log10(max))), tope = Math.ceil(max / paso) * paso;
    if (tope / paso < 3) { paso /= 2; tope = Math.ceil(max / paso) * paso; }
    var bw = w / tr.length, y = function (v) { return m.t + h - v / tope * h; };
    var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" style="font-size:12px">';
    for (var v = 0; v <= tope; v += paso) s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--chart-grilla)"/><text x="' + (m.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" fill="var(--chart-eje-texto)">' + num(v) + '</text>';
    tr.forEach(function (t, i) {
      var cx = m.l + i * bw, bh = t.n / tope * h, col = t.vencido ? 'c-venc' : t.proxima ? 'c-prox' : 'c-ok';
      var cv = { 'c-venc': 'var(--chart-estado-critico)', 'c-prox': 'var(--chart-estado-alerta)', 'c-ok': 'var(--chart-estado-bueno)' }[col];
      s += '<rect x="' + (cx + bw * 0.14) + '" y="' + y(t.n) + '" width="' + (bw * 0.72) + '" height="' + Math.max(bh, t.n ? 1 : 0) + '" fill="' + cv + '" rx="2"' +
        tipAttr(rot(t) + ' días hábiles', [[num(t.n), 'consultas', col], [pc(t.pct), 'del total en proceso'], [t.vencido ? 'Vencidas' : t.proxima ? 'Próximas a vencer' : 'Dentro de plazo', '']]) + '/>' +
        '<text x="' + (cx + bw / 2) + '" y="' + (y(t.n) - 6) + '" text-anchor="middle" font-weight="500" fill="var(--negro-text)">' + num(t.n) + '</text>' +
        '<text x="' + (cx + bw / 2) + '" y="' + (H - m.b + 18) + '" text-anchor="middle" fill="var(--chart-eje-texto)">' + rot(t) + '</text>' +
        '<text x="' + (cx + bw / 2) + '" y="' + (H - m.b + 34) + '" text-anchor="middle" fill="var(--chart-eje-texto)" font-size="11">' + pc(t.pct) + '</text>';
    });
    var lim = tr.filter(function (t) { return !t.vencido; }).length;   // tramos dentro de plazo: el límite de 10 días queda tras ellos
    var xl = m.l + lim * bw;
    s += '<line x1="' + xl + '" x2="' + xl + '" y1="' + (m.t - 8) + '" y2="' + (H - m.b) + '" stroke="var(--negro-text)" stroke-width="1.5" stroke-dasharray="5 4"/>' +
      '<text x="' + (xl + 6) + '" y="' + (m.t - 14) + '" fill="var(--negro-text)" font-weight="500">Límite: ' + D.plazo + ' días hábiles</text>' +
      '<text x="' + (m.l + w / 2) + '" y="' + (H - 2) + '" text-anchor="middle" fill="var(--chart-eje-texto)" font-size="11">Días hábiles transcurridos</text>';
    cont.innerHTML = s + '</svg>';
  }

  function pintarProcPorRegion() {
    var selG = est.f.regiones, selT = est.tabla.regiones;
    var filas = D.regiones.map(function (n, i) { return { i: i, n: n, m: AGG.medidas(r.porRegion[i]) }; })
      .filter(function (x) { return x.m.proc > 0 && (!selG || selG.indexOf(x.i) >= 0); });
    var o = est.ordenProc;
    filas.sort(function (a, b) {
      var x = o === 'proc' ? a.m.proc : o === 'venc' ? a.m.vencidas : (a.m.pctVencidas || 0);
      var y = o === 'proc' ? b.m.proc : o === 'venc' ? b.m.vencidas : (b.m.pctVencidas || 0);
      return y - x || b.m.proc - a.m.proc || a.i - b.i;
    });
    var max = filas.reduce(function (s, x) { return Math.max(s, x.m.proc); }, 0);
    $('pr-sub').textContent = 'Largo = consultas en proceso de la región; % = vencidas ÷ en proceso de esa región. Clic en una barra para filtrar la tabla de abajo.';
    var el = $('proc-reg');
    el.className = 'barras' + (selT ? ' con-sel' : '');
    el.innerHTML = filas.length ? filas.map(function (x) {
      var m = x.m, marcada = selT && selT.indexOf(x.i) >= 0;
      return '<button type="button" class="barra-fila" data-tabla-reg="' + x.i + '" aria-pressed="' + (marcada ? 'true' : 'false') + '"' +
        tipAttr(x.n, [[num(m.vencidas), 'vencidas', 'c-venc'], [num(m.proxima), 'próximas a vencer', 'c-prox'], [num(m.resto), 'dentro de plazo (0 a 7 días)', 'c-ok'], [num(m.proc), 'en proceso'], [pc(m.pctVencidas), 'vencidas sobre el total en proceso']]) + '>' +
        '<span class="barra-nom" title="' + esc(x.n) + '">' + esc(x.n) + '</span><span class="pista">' +
        apilado([{ n: m.vencidas, c: 'c-venc' }, { n: m.proxima, c: 'c-prox' }, { n: m.resto, c: 'c-ok' }], max) + '</span>' +
        '<span class="barra-val"><b>' + num(m.proc) + '</b> <small>' + pc(m.pctVencidas) + ' venc.</small></span></button>';
    }).join('') : '<div class="vacio">Sin consultas en proceso con estos filtros.</div>';
  }

  function filasPendientes() {
    var x = est.tabla;
    return AGG.ordenar(D, AGG.pendientes(D, filtros(), { regiones: x.regiones, estado: x.estado, folio: x.folio }), x.k, x.dir);
  }
  var COLS_P = [
    { k: 'plazo', t: 'Plazo' }, { k: 'folio', t: 'Folio', izq: true }, { k: 'region', t: 'Región/oficina', izq: true },
    { k: 'consulta', t: 'Consulta', izq: true },
    { k: 'ingreso', t: 'Fecha de ingreso' }, { k: 'venc', t: 'Fecha de vencimiento' }, { k: 'dias', t: 'Días hábiles transcurridos' },
    { k: 'atraso', t: 'Días de atraso' }, { k: 'actividad', t: 'Actividad actual', izq: true }, { k: 'inicioAct', t: 'Inicio de la actividad actual' }
  ];
  var ORDENABLES = { folio: 1, region: 1, consulta: 1, ingreso: 1, venc: 1, dias: 1, atraso: 1, actividad: 1 };
  var ROT_PLAZO = { vencida: ['venc', 'alerta', 'Vencida'], proxima: ['prox', 'reloj', 'Próxima a vencer'], enPlazo: ['ok', 'listo', 'Dentro de plazo'] };

  function pintarPendientes() {
    var x = est.tabla, P = AGG.P, todas = filasPendientes(), n = todas.length;
    var paginas = Math.max(1, Math.ceil(n / POR_PAGINA));
    if (x.pag > paginas) x.pag = paginas;
    var desde = (x.pag - 1) * POR_PAGINA, vista = todas.slice(desde, desde + POR_PAGINA);
    $('pend-sub').textContent = 'Responde a los filtros generales. Días hábiles contados hasta el ' + fecha(D.refEnProceso) + '. Vencimiento = ingreso + ' + D.plazo + ' días hábiles.';
    $('tabla-pend').innerHTML = '<thead><tr>' + COLS_P.map(function (c) {
      var activo = x.k === c.k;
      return '<th scope="col"' + (c.izq ? ' class="izq"' : '') + (activo ? ' aria-sort="' + (x.dir === 'asc' ? 'ascending' : 'descending') + '"' : '') + '>' +
        (ORDENABLES[c.k] ? '<button type="button" data-ordp="' + c.k + '">' + c.t + '<span class="flecha" aria-hidden="true">' + (activo ? (x.dir === 'asc' ? '▲' : '▼') : '↕') + '</span></button>' : c.t) + '</th>';
    }).join('') + '</tr></thead><tbody>' + (vista.length ? vista.map(function (p) {
      var e = AGG.estadoPlazo(p[P.clase]), rp = ROT_PLAZO[e], quedan = D.plazo + 1 - p[P.dias];
      return '<tr class="' + (e === 'vencida' ? 'f-venc' : e === 'proxima' ? 'f-prox' : '') + '"><td class="izq"><span class="plazo-ico plazo-ico--' + rp[0] + '">' + ico(rp[1]) + rp[2] +
        (e === 'proxima' ? ' · ' + (quedan === 1 ? 'queda 1 día' : 'quedan ' + quedan + ' días') : '') + '</span></td>' +
        '<td class="izq">' + esc(p[P.folio]) + '</td><td class="izq">' + esc(D.regiones[p[P.region]]) + '</td><td class="izq">' + esc(D.consultas[p[P.consulta]]) + '</td><td>' + fecha(AGG.fechaIso(D, p[P.ingreso])) + '</td>' +
        '<td>' + fecha(AGG.fechaIso(D, p[P.venc])) + '</td><td>' + p[P.dias] + '</td><td>' + p[P.atraso] + '</td>' +
        '<td class="izq">' + (p[P.act] < 0 ? '—' : esc(D.actividades[p[P.act]])) + '</td><td>' + (p[P.inicioAct] < 0 ? '—' : fecha(AGG.fechaIso(D, p[P.inicioAct]))) + '</td></tr>';
    }).join('') : '<tr><td colspan="' + COLS_P.length + '" class="izq"><div class="vacio">Ninguna consulta en proceso cumple los filtros.</div></td></tr>') + '</tbody>';
    $('p-rango').textContent = n ? 'Mostrando ' + (desde + 1) + '–' + (desde + vista.length) + ' de ' + num(n) + ' consultas en proceso' : '0 consultas en proceso';
    $('p-pag').textContent = 'Página ' + x.pag + ' de ' + paginas;
    $('p-ant').disabled = x.pag <= 1; $('p-sig').disabled = x.pag >= paginas;
    $('p-excel').disabled = !n;
    $('p-reset').hidden = !(x.regiones || x.estado || x.folio);
    // selector de región de la tabla
    var s = $('p-region'), vals = x.regiones && x.regiones.length === 1 ? String(x.regiones[0]) : x.regiones ? 'varias' : '';
    s.innerHTML = '<option value="">Todas</option>' + (x.regiones && x.regiones.length > 1 ? '<option value="varias">Varias (' + x.regiones.length + ')</option>' : '') +
      D.regiones.map(function (nm, i) { return '<option value="' + i + '">' + esc(nm) + '</option>'; }).join('');
    s.value = vals;
    $('p-estado').value = x.estado;
    sincronizarUrl();
  }

  // ---- por vencer en los próximos 3 días hábiles ----
  var OPAC = [1, 0.68, 0.42];   // «le queda 1 día» es lo más urgente: ámbar pleno; 2 y 3 días, más suave
  function pintarPorVencer() {
    var xv = AGG.porVencer(D, filtros()), nb = xv.dias;
    $('xv-sub').textContent = 'Consultas en proceso que siguen dentro de plazo pero lo cumplen en 1 a ' + nb + ' días hábiles, contando hoy (' + fecha(D.refEnProceso) +
      '): a los ' + D.proximaDesde + ' días hábiles les quedan ' + nb + ' y a los ' + D.plazo + ', uno (es el último día para responder). Responde a los filtros generales. Clic en una región para ver sus consultas abajo.';
    $('xv-tot').innerHTML = xv.total.map(function (n, q) {
      return '<div class="xv"><b>' + num(n) + '</b><span>' + (q === 0 ? 'les queda 1 día (último día de plazo)' : 'les quedan ' + (q + 1) + ' días') + '</span></div>';
    }).join('');
    var filas = D.regiones.map(function (nom, i) { var a = xv.porRegion[i]; return { i: i, nom: nom, a: a, t: a.reduce(function (s, x) { return s + x; }, 0) }; })
      .filter(function (x) { return x.t > 0; }).sort(function (a, b) { return b.a[0] - a.a[0] || b.t - a.t || a.i - b.i; });
    var max = filas.reduce(function (s, x) { return Math.max(s, x.t); }, 0), selT = est.tabla.regiones;
    var el = $('xv-reg'); el.className = 'barras' + (selT ? ' con-sel' : '');
    el.innerHTML = filas.length ? '<div class="nota" style="padding:0 0.25rem">Cada barra: 1 día (ámbar pleno), 2 y 3 días (más suave). Entre paréntesis, la cantidad de cada uno. Orden: primero las que tienen más consultas a 1 día.</div>' +
      filas.map(function (x) {
        var marcada = selT && selT.indexOf(x.i) >= 0;
        return '<button type="button" class="barra-fila" data-xv-reg="' + x.i + '" aria-pressed="' + (marcada ? 'true' : 'false') + '"' +
          tipAttr(x.nom, x.a.map(function (n, q) { return [num(n), q === 0 ? 'les queda 1 día' : 'les quedan ' + (q + 1) + ' días', 'c-prox']; })) + '>' +
          '<span class="barra-nom" title="' + esc(x.nom) + '">' + esc(x.nom) + '</span><span class="pista"><span class="apilada">' +
          x.a.map(function (n, q) { return n ? '<span class="c-prox" style="width:' + (n / max * 100) + '%; opacity:' + OPAC[q] + '"></span>' : ''; }).join('') + '</span></span>' +
          '<span class="barra-val"><b>' + num(x.t) + '</b> <small>(' + x.a.map(num).join(' / ') + ')</small></span></button>';
      }).join('') : '<div class="vacio">Ninguna consulta vence en los próximos ' + nb + ' días hábiles con estos filtros.</div>';
  }

  function pintarRegional() {
    pintarAntiguedad();
    pintarProcPorRegion();
    pintarPorVencer();
    pintarPendientes();
  }

  // ---- eventos de la tabla de pendientes ----
  $('p-folio').addEventListener('input', function () { est.tabla.folio = this.value; est.tabla.pag = 1; pintarPendientes(); });
  $('p-estado').addEventListener('change', function () { est.tabla.estado = this.value; est.tabla.pag = 1; pintarPendientes(); });
  $('p-region').addEventListener('change', function () {
    est.tabla.regiones = this.value === '' ? null : this.value === 'varias' ? est.tabla.regiones : [+this.value];
    est.tabla.pag = 1; pintarRegional();
  });
  $('p-reset').addEventListener('click', function () {
    est.tabla.regiones = null; est.tabla.estado = ''; est.tabla.folio = ''; $('p-folio').value = ''; est.tabla.pag = 1; pintarRegional();
  });
  $('p-ant').addEventListener('click', function () { est.tabla.pag--; pintarPendientes(); });
  $('p-sig').addEventListener('click', function () { est.tabla.pag++; pintarPendientes(); });
  $('tabla-pend').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ordp]'); if (!b) return;
    var k = b.getAttribute('data-ordp'), x = est.tabla;
    x.dir = x.k === k ? (x.dir === 'asc' ? 'desc' : 'asc') : (k === 'folio' || k === 'region' || k === 'consulta' || k === 'actividad' || k === 'ingreso' || k === 'venc' ? 'asc' : 'desc');
    x.k = k; x.pag = 1; pintarPendientes();
  });
  $('proc-reg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tabla-reg]'); if (!b) return;
    var i = +b.getAttribute('data-tabla-reg'), sel = est.tabla.regiones;
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      sel = sel ? sel.slice() : []; var p = sel.indexOf(i);
      if (p >= 0) sel.splice(p, 1); else sel.push(i);
      est.tabla.regiones = sel.length ? sel : null;
    } else est.tabla.regiones = sel && sel.length === 1 && sel[0] === i ? null : [i];
    est.tabla.pag = 1; pintarRegional();
  });
  // Clic en una región de «Por vencer»: deja solo esa región y solo las próximas a vencer en la tabla de abajo.
  $('xv-reg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-xv-reg]'); if (!b) return;
    var i = +b.getAttribute('data-xv-reg'), sel = est.tabla.regiones;
    if (sel && sel.length === 1 && sel[0] === i && est.tabla.estado === 'proxima') { est.tabla.regiones = null; est.tabla.estado = ''; }
    else { est.tabla.regiones = [i]; est.tabla.estado = 'proxima'; }
    est.tabla.pag = 1; pintarRegional(); sincronizarUrl();
    if (est.tabla.regiones) $('tabla-pend').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('reg-orden').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-o]'); if (!b) return;
    est.ordenProc = b.getAttribute('data-o');
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    pintarProcPorRegion();
  });

  // ---- exportación a Excel: TODAS las filas que cumplen los filtros, no solo la página visible ----
  function columnasExcel() {
    return [
      { titulo: 'Folio', ancho: 22 }, { titulo: 'Región/oficina', ancho: 34 }, { titulo: 'Consulta', ancho: 18 }, { titulo: 'Fecha de ingreso', tipo: 'fecha', ancho: 16 },
      { titulo: 'Fecha de vencimiento', tipo: 'fecha', ancho: 20 }, { titulo: 'Días hábiles transcurridos', tipo: 'numero', ancho: 16 },
      { titulo: 'Días de atraso', tipo: 'numero', ancho: 12 }, { titulo: 'Estado del plazo', ancho: 18 }, { titulo: 'Actividad actual', ancho: 44 },
      { titulo: 'Fecha de inicio de la actividad actual', tipo: 'fecha', ancho: 20 }, { titulo: 'Usuario de la actividad actual', ancho: 34 }
    ];
  }
  function filasExcel(lista) {
    var P = AGG.P;
    return lista.map(function (p) {
      return [p[P.folio], D.regiones[p[P.region]], D.consultas[p[P.consulta]], AGG.fechaIso(D, p[P.ingreso]), AGG.fechaIso(D, p[P.venc]), p[P.dias], p[P.atraso],
        ROT_PLAZO[AGG.estadoPlazo(p[P.clase])][2], p[P.act] < 0 ? null : D.actividades[p[P.act]],
        p[P.inicioAct] < 0 ? null : AGG.fechaIso(D, p[P.inicioAct]), p[P.usuario] < 0 ? null : D.usuarios[p[P.usuario]]];
    });
  }
  $('p-excel').addEventListener('click', function () {
    var lista = filasPendientes();
    var bytes = XLSX_MIN.crear({ nombre: 'En proceso', columnas: columnasExcel(), filas: filasExcel(lista) });
    XLSX_MIN.descargar(bytes, 'consultas_en_proceso_' + D.corte.replace(/-/g, '') + '.xlsx');
  });

  // ---- clic en barras / filas / encabezados del Resumen ----
  $('p-resumen').addEventListener('click', function (e) {
    var b = e.target.closest('[data-dim]');
    if (b) { alternar(b.getAttribute('data-dim'), +b.getAttribute('data-i'), e.ctrlKey || e.metaKey || e.shiftKey); return; }
    var reg = e.target.closest('[data-reg]');
    if (reg) { alternar('regiones', +reg.getAttribute('data-reg'), e.ctrlKey || e.metaKey || e.shiftKey); return; }
    // Celda del mapa de calor: filtra por esa región y ese tipo de consulta (segundo clic en la misma, las quita).
    var cal = e.target.closest('[data-cal]');
    if (cal) {
      var ij = cal.getAttribute('data-cal').split(',').map(Number), fr = est.f.regiones, fc = est.f.consultas;
      var igual = fr && fr.length === 1 && fr[0] === ij[0] && fc && fc.length === 1 && fc[0] === ij[1];
      est.f.regiones = igual ? null : [ij[0]]; est.f.consultas = igual ? null : [ij[1]];
      est.ninguno.regiones = est.ninguno.consultas = false;
      pintarMulti('regiones'); pintarMulti('consultas'); cambioFiltros(); return;
    }
    var o = e.target.closest('[data-ord]');
    if (o) {
      var k = o.getAttribute('data-ord');
      est.ordenReg.dir = est.ordenReg.k === k ? (est.ordenReg.dir === 'asc' ? 'desc' : 'asc') : (k === 'region' ? 'asc' : 'desc');
      est.ordenReg.k = k; pintarTablaRegional();
    }
  });

  // ---- navegación ----
  function irA(pag) {
    est.pag = pag;
    ['resumen', 'regional'].forEach(function (p) { $('p-' + p).hidden = p !== pag; });
    Array.prototype.forEach.call(document.querySelectorAll('.pag'), function (b) {
      if (b.getAttribute('data-pag') === pag) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    render();
  }
  Array.prototype.forEach.call(document.querySelectorAll('.pag'), function (b) { b.addEventListener('click', function () { irA(b.getAttribute('data-pag')); }); });

  // ---- enlace compartible: página, filtros y comparación viajan en el hash ----
  // #resumen?region=Biob%C3%ADo&materia=Tr%C3%A1mites%20DCPR&desde=2026-03-01&comparar=anio
  // Lo que está en su valor por defecto no se escribe. Los nombres (no los índices) van en la URL,
  // para que el enlace siga valiendo cuando cambie el orden de las listas.
  var CLAVES_URL = [['consultas', 'consulta'], ['espacios', 'espacio'], ['regiones', 'region'], ['materias', 'materia']];
  var ultimoHash = null;
  function estadoAHash() {
    var p = [];
    if (est.f.desde && est.f.desde !== DEF_DESDE) p.push('desde=' + est.f.desde);
    if (est.f.hasta && est.f.hasta !== DEF_HASTA) p.push('hasta=' + est.f.hasta);
    CLAVES_URL.forEach(function (c) {
      var sel = est.f[c[0]];
      if (sel) p.push(c[1] + '=' + encodeURIComponent(sel.map(function (i) { return MULTI[c[0]].lista[i]; }).join('|')));
    });
    if (est.cmp !== 'anterior') p.push('comparar=' + est.cmp);
    if (est.pag === 'regional') {
      if (est.tabla.estado) p.push('plazo=' + est.tabla.estado);
      if (est.tabla.regiones) p.push('tabla_region=' + encodeURIComponent(est.tabla.regiones.map(function (i) { return D.regiones[i]; }).join('|')));
    }
    return '#' + est.pag + (p.length ? '?' + p.join('&') : '');
  }
  function sincronizarUrl() {
    var h = estadoAHash(); ultimoHash = h;
    if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { /* algunos contextos (file://) no lo permiten */ } }
  }
  // Lee el hash y deja `est` como lo describe; devuelve la página. Todo lo desconocido se ignora.
  function hashAEstado(hash) {
    var h = (hash || '').replace(/^#/, ''), q = h.indexOf('?'), pag = q < 0 ? h : h.slice(0, q), par = {};
    if (q >= 0) h.slice(q + 1).split('&').forEach(function (kv) {
      var i = kv.indexOf('='); if (i < 1) return;
      try { par[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } catch (e) { /* valor mal codificado: se ignora */ }
    });
    var fecha_ok = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') && v >= fMin && v <= fMax; };
    est.f.desde = fecha_ok(par.desde) ? par.desde : DEF_DESDE;
    est.f.hasta = fecha_ok(par.hasta) ? par.hasta : DEF_HASTA;
    if (est.f.hasta < est.f.desde) est.f.hasta = est.f.desde;
    CLAVES_URL.forEach(function (c) {
      var lista = MULTI[c[0]].lista;
      var idx = (par[c[1]] || '').split('|').map(function (n) { return lista.indexOf(n); }).filter(function (i) { return i >= 0; });
      est.f[c[0]] = idx.length && idx.length < lista.length ? idx : null; est.ninguno[c[0]] = false;
    });
    est.cmp = par.comparar === 'anio' || par.comparar === 'ninguno' ? par.comparar : 'anterior';
    est.tabla.estado = ['vencida', 'proxima', 'enPlazo'].indexOf(par.plazo) >= 0 ? par.plazo : '';
    var tr = (par.tabla_region || '').split('|').map(function (n) { return D.regiones.indexOf(n); }).filter(function (i) { return i >= 0; });
    est.tabla.regiones = tr.length ? tr : null;
    est.tabla.pag = 1;
    return { pag: pag === 'regional' ? 'regional' : 'resumen', hoja: par.imprimir === 'hoja' };
  }
  function sincronizarControles() {
    $('f-desde').value = est.f.desde; $('f-hasta').value = est.f.hasta; $('f-hasta').min = est.f.desde || fMin;
    $('f-cmp').value = est.cmp;
    Object.keys(MULTI).forEach(pintarMulti);
  }
  window.addEventListener('hashchange', function () {
    if (location.hash === ultimoHash) return;       // lo escribió el propio panel
    var v = hashAEstado(location.hash); sincronizarControles(); irA(v.pag);
  });
  function copiarTexto(texto, fin) {
    function respaldo() {
      var t = document.createElement('textarea'); t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(t); fin(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function () { fin(true); }, respaldo); else respaldo();
  }
  $('copiar-enlace').addEventListener('click', function () {
    sincronizarUrl();
    var url = location.href, txt = $('copiar-txt'), btn = this;
    copiarTexto(url, function (ok) {
      txt.textContent = ok ? 'Enlace copiado' : 'Copie el enlace'; btn.title = ok ? 'Enlace copiado' : url;
      if (!ok) window.prompt('Copie este enlace:', url);
      setTimeout(function () { txt.textContent = 'Copiar enlace'; btn.title = 'Copiar un enlace a esta vista, con sus filtros'; }, 2200);
    });
  });
  $('f-cmp').addEventListener('change', function () { est.cmp = this.value; cambioFiltros(); });
  $('menu-alt').addEventListener('click', function () {
    var c = $('app').classList.toggle('cerrado'); this.setAttribute('aria-expanded', String(!c));
    setTimeout(function () { render(); }, 260);
  });
  $('pdf').addEventListener('click', function () { document.body.classList.remove('imp-resumen'); window.print(); });

  // ---- resumen de una página (para reuniones) ----
  // Se arma con el estado actual (filtros y comparación incluidos) y se imprime/guarda como PDF.
  function textoFiltros() {
    var p = [], rot = { regiones: 'Región/oficina', materias: 'Materia', consultas: 'Consulta', espacios: 'Espacio' };
    ['regiones', 'materias', 'consultas', 'espacios'].forEach(function (c) {
      var sel = est.f[c]; if (sel) p.push(rot[c] + ': ' + sel.map(function (i) { return MULTI[c].lista[i]; }).join(', '));
    });
    return p.length ? p.join(' · ') : 'Sin otros filtros';
  }
  function filaHoja(nombre, pista, valor) {
    return '<div class="hj-fila"><span>' + esc(nombre) + '</span><span class="p">' + pista + '</span><span class="v">' + valor + '</span></div>';
  }
  function barraCumpl(lista, porDim, porDimBase) {
    return lista.map(function (n, i) { return { n: n, m: AGG.medidas(porDim[i]), b: porDimBase && AGG.medidas(porDimBase[i]) }; })
      .filter(function (x) { return x.m.total > 0; }).sort(function (a, b) { return b.m.fin - a.m.fin; }).map(function (x) {
        var v = '<b>' + pc(x.m.cumplimiento) + '</b>' + (baseInfo ? ' ' + varHtml(difPP(x.m.cumplimiento, x.b && x.b.cumplimiento), ' pp', 1) : '') + ' <span class="t-bajo">n = ' + num(x.m.fin) + '</span>';
        return filaHoja(x.n, x.m.fin ? '<i style="width:' + x.m.cumplimiento + '%"></i>' : '', v);
      }).join('');
  }
  function construirHoja() {
    var K = r.kpi, selR = est.f.regiones, f = filtros();
    var filas = D.regiones.map(function (n, i) { return { i: i, n: n, m: AGG.medidas(r.porRegion[i]) }; }).filter(function (x) { return x.m.total > 0 && (!selR || selR.indexOf(x.i) >= 0); });
    var peor = filas.filter(function (x) { return x.m.fin >= N_MIN_FIN; }).sort(function (a, b) { return a.m.cumplimiento - b.m.cumplimiento || a.i - b.i; }).slice(0, 5);
    var venc = filas.filter(function (x) { return x.m.vencidas > 0; }).sort(function (a, b) { return b.m.vencidas - a.m.vencidas || a.i - b.i; }).slice(0, 5);
    var xv = AGG.porVencer(D, f);
    var xvReg = D.regiones.map(function (n, i) { return { n: n, t: xv.porRegion[i].reduce(function (s, x) { return s + x; }, 0), a: xv.porRegion[i] }; })
      .filter(function (x) { return x.t > 0; }).sort(function (a, b) { return b.a[0] - a.a[0] || b.t - a.t; }).slice(0, 5);
    var lista = function (arr, fn) { return arr.length ? '<ol>' + arr.map(fn).join('') + '</ol>' : '<p>Sin casos.</p>'; };
    var kp = kpiTarjetas(K).map(function (t) {
      return '<div class="hj-k"><small>' + t.rot + '</small><b>' + t.v + '</b>' + (t.vr ? '<span>' + t.vr + ' <span class="var var--sin">vs ' + (est.cmp === 'anio' ? 'año ant.' : 'periodo ant.') + '</span></span>' : '') + '</div>';
    }).join('');
    $('hoja-resumen').innerHTML =
      '<div class="hj-cab"><div><h1>Consultas ciudadanas SIAC · Resumen</h1><p>Ministerio de Bienes Nacionales · ingresos del ' + fecha(est.f.desde) + ' al ' + fecha(est.f.hasta) + '</p>' +
        '<p>' + esc(textoFiltros()) + (baseInfo ? ' · Variaciones contra el ' + esc(etiquetaBase()) : '') + '</p></div>' +
        '<div class="der"><p>Datos al ' + fecha(D.corte) + '</p><p>Actualizado ' + fechaHora(D.generado) + '</p></div></div>' +
      '<div class="hj-kpis">' + kp + '</div>' +
      '<div class="hj-cols"><div class="hj-sec"><h2>Evolución mensual del cumplimiento (por mes de término)</h2><p>% de consultas finalizadas dentro de ' + D.plazo + ' días hábiles. Serie institucional: responde a consulta, materia y espacio; no a la región ni a la fecha de ingreso.</p><div class="hj-evo" id="hj-evo"></div></div>' +
        '<div class="hj-sec"><h2>Cumplimiento por materia</h2>' + barraCumpl(D.materias, r.porMateria, rBase && rBase.porMateria) +
        '<h2 style="margin-top:2.5mm">Cumplimiento por espacio de atención</h2>' + barraCumpl(D.espacios, r.porEspacio, rBase && rBase.porEspacio) + '</div></div>' +
      '<div class="hj-listas">' +
        '<div class="hj-sec"><h2>Menor cumplimiento</h2><p>Con al menos ' + N_MIN_FIN + ' finalizadas.</p>' + lista(peor, function (x) { return '<li>' + esc(x.n) + ' <span>' + pc(x.m.cumplimiento) + ' · n = ' + num(x.m.fin) + '</span></li>'; }) + '</div>' +
        '<div class="hj-sec"><h2>Más consultas vencidas</h2><p>En proceso con más de ' + D.plazo + ' días hábiles.</p>' + lista(venc, function (x) { return '<li>' + esc(x.n) + ' <span>' + num(x.m.vencidas) + ' de ' + num(x.m.proc) + ' en proceso</span></li>'; }) + '</div>' +
        '<div class="hj-sec"><h2>Por vencer (1 a ' + xv.dias + ' días)</h2><p>' + num(xv.suma) + ' consultas: ' + xv.total.map(function (n, q) { return num(n) + ' a ' + (q + 1) + ' d'; }).join(' · ') + '.</p>' +
          lista(xvReg, function (x) { return '<li>' + esc(x.n) + ' <span>' + num(x.t) + ' (' + x.a.map(num).join(' / ') + ')</span></li>'; }) + '</div>' +
      '</div>' +
      '<div class="hj-pie">Cumplimiento = finalizadas dentro de ' + D.plazo + ' días hábiles ÷ finalizadas (no incluye las en proceso). Las variaciones comparan cohortes por fecha de ingreso; solo se comparan volumen y cumplimiento, porque el estado «en proceso» de periodos antiguos no es comparable. ' +
        'Fuente: detalle de consultas SIAC, archivo ' + esc(D.fuente.archivo) + '.</div>';
    dibujarEvolucion($('hj-evo'), 575, 190);
  }
  function imprimirHoja(sinImprimir) {
    construirHoja(); document.body.classList.add('imp-resumen');
    if (sinImprimir) return;
    var limpiar = function () { document.body.classList.remove('imp-resumen'); window.removeEventListener('afterprint', limpiar); };
    window.addEventListener('afterprint', limpiar);
    window.print();
  }
  $('hoja').addEventListener('click', function () { imprimirHoja(false); });

  // ---- diálogos ----
  function dialogo(id, abrir) {
    var d = $(id);
    $(abrir).addEventListener('click', function () { if (d.showModal) d.showModal(); });
    d.querySelector('[data-cerrar]').addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
  }
  dialogo('dlg-glosario', 'abrir-glosario'); dialogo('dlg-calidad', 'abrir-calidad');

  $('glosario').innerHTML = [
    ['Plazo institucional', 'La respuesta debe darse en ' + D.plazo + ' días hábiles (lunes a viernes, sin feriados) contados desde el día siguiente al ingreso. No son ' + D.plazo + ' días corridos.'],
    ['Días hábiles transcurridos', 'Es el campo «dias_de_respuesta» de la fuente, verificado contra el calendario chileno. En consultas finalizadas, del ingreso al término; en las que siguen en proceso, del ingreso al ' + fecha(D.refEnProceso) + ' (día en que se generó el archivo).'],
    ['Finalizada dentro / fuera de plazo', 'Consulta con estado FINALIZADO y ' + D.plazo + ' días hábiles o menos / más de ' + D.plazo + '.'],
    ['En proceso: dentro de plazo', 'Consulta con estado EN PROCESO y hasta ' + D.plazo + ' días hábiles transcurridos.'],
    ['Próxima a vencer', 'En proceso con ' + D.proximaDesde + ' a ' + D.plazo + ' días hábiles. Es un subconjunto de «dentro de plazo»: nunca se suma aparte en los totales.'],
    ['Vencida', 'En proceso con más de ' + D.plazo + ' días hábiles. Días de atraso = días hábiles transcurridos − ' + D.plazo + '; 0 si está dentro de plazo.'],
    ['Fecha de vencimiento', 'Fecha de ingreso + ' + D.plazo + ' días hábiles, calculada con el calendario de feriados de Chile. Coincide con «fecha_a_finalizar» de la fuente salvo en casos con plazo especial.'],
    ['Cumplimiento de las finalizadas', 'Finalizadas dentro de plazo ÷ finalizadas. No incluye las que siguen en proceso: su plazo todavía puede cumplirse o vencer.'],
    ['Porcentajes', '% finalizadas y % en proceso = sobre el total de consultas. % en proceso vencidas = sobre las consultas en proceso. Si el denominador es cero se muestra «—», no 0 %.'],
    ['Evolución mensual', 'Agrupa por mes de término (fecha_fin), no de ingreso. Solo responde a los filtros de consulta, materia y espacio de atención; ignora fecha de ingreso y región. El mes en curso se marca como parcial.'],
    ['Materia', 'Agrupa los motivos de consulta (campo «motivo_consulta», unos 39 valores) en cinco materias: Estado de avance trámite, Otros temas ministeriales, Trámites DBN, Trámites DCPR y Trámites DICAT. La homologación está en etl/reglas.py; un motivo que no esté allí queda como «Sin clasificar» y la carga lo avisa. Un motivo vacío o «-» cuenta como «Otros temas ministeriales».'],    ['Cómo actúan los filtros', 'Los filtros se combinan (Y). Los gráficos por región, espacio y tipo de consulta muestran todas las opciones y destacan las elegidas; la tabla regional, las tarjetas y los demás gráficos muestran solo lo elegido.'],
    ['Variación contra otro periodo (▲▼)', 'El selector «Comparar con» define la base: el periodo anterior (mismo número de días, justo antes del rango de ingreso elegido) o el mismo rango un año antes. Se compara el volumen de consultas (variación en %) y el cumplimiento de las finalizadas (diferencia en puntos porcentuales, «pp»). No se comparan las consultas en proceso, vencidas ni próximas a vencer: son el estado de hoy de cada cohorte y un periodo antiguo casi no tiene pendientes. Las flechas son neutras: indican dirección, no si es bueno o malo. Ejemplo: con ingreso del 01-09-2026 al 30-09-2026 (30 días), «periodo anterior» es del 02-08-2026 al 31-08-2026 (también 30 días) y «año anterior» es del 01-09-2025 al 30-09-2025. Si el periodo base empieza antes del primer día del archivo, se muestra «—». En rangos muy cortos el cumplimiento del periodo reciente puede verse algo más alto, porque las consultas más lentas aún no se finalizan.'],
    ['Por vencer', 'A una consulta en proceso con N días hábiles transcurridos le quedan ' + D.plazo + ' + 1 − N días para responder, contando hoy (' + fecha(D.refEnProceso) + '): con ' + D.proximaDesde + ' le quedan 3, con 9 le quedan 2 y con ' + D.plazo + ' le queda 1 (es el último día; al siguiente pasa a vencida). Son exactamente las «próximas a vencer».'],
    ['Mapa de calor consulta × región', 'Cada celda es el cumplimiento de las finalizadas de esa región en ese tipo de consulta. El color es relativo a la propia tabla (más oscuro = menor cumplimiento) y no se pinta cuando hay menos de ' + N_MIN_FIN + ' finalizadas. Responde a fecha de ingreso, materia y espacio; los filtros de región y consulta resaltan pero no ocultan.'],
    ['Enlace compartible', 'El botón «Copiar enlace» guarda en la dirección la página, el rango de fechas, los filtros, la comparación y, en Gestión regional, los filtros de la tabla. Quien abra el enlace ve la misma vista (con los datos que tenga el panel en ese momento).'],
    ['Alcance de la fuente', 'El archivo trae las consultas con ingreso desde el ' + fecha(AGG.fechaIso(D, 0)) + '. Región/oficina incluye la Oficina Central y las oficinas provinciales, que no se suman a ninguna región.'],
    ['Fuente', 'Detalle de consultas SIAC (intranet, reportes.mbienes.cl). Archivo: ' + esc(D.fuente.archivo) + '. Solo se leen los campos necesarios; no se usan RUT, teléfono, correo ni fecha de nacimiento.']
  ].map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('');

  var Q = D.calidad;
  $('calidad').innerHTML =
    '<p>Archivo <b>' + esc(D.fuente.archivo) + '</b>' + (D.fuente.archivoGenerado ? ', generado el ' + fechaHora(D.fuente.archivoGenerado) : '') + '. Procesado el ' + fechaHora(D.generado) + '.</p>' +
    '<ul><li>Filas leídas: <b>' + num(Q.filas_leidas) + '</b> · válidas: <b>' + num(Q.filas_validas) + '</b></li>' +
    '<li>Fecha de corte (último término registrado): <b>' + fecha(D.corte) + '</b></li>' +
    '<li>Filas descartadas: <b>' + num(Object.keys(Q.descartes).reduce(function (s, k) { return s + Q.descartes[k]; }, 0)) + '</b>' +
    (Object.keys(Q.descartes).length ? ' (' + Object.keys(Q.descartes).map(function (k) { return esc(k) + ': ' + Q.descartes[k]; }).join('; ') + ')' : '') + '</li>' +
    '<li>«dias_de_respuesta» recalculados: <b>' + num(Q.dias_recalculados) + '</b> · distintos del calendario: <b>' + num(Q.descalce_dias.finalizadas + Q.descalce_dias.en_proceso) + '</b></li>' +
    '<li>Vencimiento distinto de ingreso + ' + D.plazo + ' días hábiles en la fuente: <b>' + num(Q.vencimiento_distinto) + '</b></li>' +
    '<li>«cumplimiento» de la fuente distinto de la regla de ' + D.plazo + ' días: <b>' + num(Q.cumplimiento_discrepa) + '</b></li></ul>' +
    (Q.avisos.length ? '<p><b>Avisos del proceso de carga</b></p><ul>' + Q.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '<p>Sin avisos.</p>');

  // ---- render general ----
  function render() {
    var f = filtros();
    r = AGG.calcular(D, f);
    // Por defecto, de enero de 2026 al mes de la fecha de corte de los datos.
    ev = AGG.evolucion(D, f).filter(function (e) { return e.mes >= EVO_DESDE && e.mes <= D.corte.slice(0, 7); });
    calcularBase(f);
    pintarAvisos(r.kpi.total);
    pintarEstado(r.kpi.total);
    if (est.pag === 'resumen') pintarResumen(); else pintarRegional();
    sincronizarUrl();
  }
  // Los gráficos SVG se miden al dibujarse: se redibujan cuando su caja cambia de tamaño.
  var temporizador;
  function redibujar() { clearTimeout(temporizador); temporizador = setTimeout(function () { if (r) { if (est.pag === 'resumen') dibujarEvolucion(); else pintarAntiguedad(); } }, 120); }
  window.addEventListener('resize', redibujar);
  if (window.ResizeObserver) { var ro = new ResizeObserver(redibujar); ro.observe($('evo')); ro.observe($('ant')); }

  var arranque = hashAEstado(location.hash);
  sincronizarControles();
  irA(arranque.pag);
  if (arranque.hoja) imprimirHoja(true);      // #…&imprimir=hoja: deja la hoja lista para «Guardar como PDF» / pruebas

  // Ganchos para prueba.js / depuración: no los usa la interfaz.
  window.__panel = { est: est, render: render, filas: filasPendientes, columnasExcel: columnasExcel, filasExcel: filasExcel, estadoAHash: estadoAHash, hashAEstado: hashAEstado };
})();
