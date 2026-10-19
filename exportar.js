// Escritor mínimo de .xlsx, sin librerías: un libro de una hoja, con encabezado,
// fechas reales, filtro automático y primera fila fija.
//
// Un .xlsx es un zip de XML. Aquí el zip va sin comprimir (método «stored»):
// para unos cientos de filas pesa lo mismo que da igual, y evita traer una
// librería de compresión a un panel que funciona con doble clic y sin internet.
// prueba.js genera un archivo con esto y Python (openpyxl) lo vuelve a leer.

(function (global) {
  'use strict';

  var enc = new TextEncoder();

  var TABLA_CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(b) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < b.length; i++) c = TABLA_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function zip(archivos) {   // [{ nombre, datos: Uint8Array }]
    var partes = [], central = [], desplazamiento = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; }
    function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    archivos.forEach(function (a) {
      var nombre = enc.encode(a.nombre), crc = crc32(a.datos), n = a.datos.length;
      // 0x0800: nombres en UTF-8. Fecha DOS fija (1980-01-01): el contenido no depende de la hora.
      var local = [].concat(u32(0x04034B50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(n), u32(n),
                            u16(nombre.length), u16(0));
      partes.push(new Uint8Array(local), nombre, a.datos);
      central.push(new Uint8Array([].concat(u32(0x02014B50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
                                            u32(crc), u32(n), u32(n), u16(nombre.length), u16(0), u16(0), u16(0), u16(0),
                                            u32(0), u32(desplazamiento))), nombre);
      desplazamiento += local.length + nombre.length + n;
    });
    var tamCentral = central.reduce(function (s, p) { return s + p.length; }, 0);
    var fin = new Uint8Array([].concat(u32(0x06054B50), u16(0), u16(0), u16(archivos.length), u16(archivos.length),
                                       u32(tamCentral), u32(desplazamiento), u16(0)));
    var todo = partes.concat(central, [fin]);
    var total = todo.reduce(function (s, p) { return s + p.length; }, 0);
    var salida = new Uint8Array(total), pos = 0;
    todo.forEach(function (p) { salida.set(p, pos); pos += p.length; });
    return salida;
  }

  function esc(s) {
    return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function letra(i) {   // 0 -> A, 26 -> AA
    var s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
    return s;
  }

  // 'AAAA-MM-DD' -> número de serie de Excel.
  function serie(iso) {
    var p = iso.split('-').map(Number);
    return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(1899, 11, 30)) / 86400000);
  }

  var XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  // hoja = { nombre, columnas: [{ titulo, ancho, tipo: 'texto'|'numero'|'fecha' }], filas: [[valor|null, …]] }
  // Las fechas entran como 'AAAA-MM-DD'.
  function crear(hoja) {
    var cols = hoja.columnas, nF = hoja.filas.length, nC = cols.length;
    var filas = ['<row r="1">' + cols.map(function (c, j) {
      return '<c r="' + letra(j) + '1" s="1" t="inlineStr"><is><t>' + esc(c.titulo) + '</t></is></c>';
    }).join('') + '</row>'];
    hoja.filas.forEach(function (fila, i) {
      var r = i + 2;
      filas.push('<row r="' + r + '">' + cols.map(function (c, j) {
        var v = fila[j], ref = letra(j) + r;
        if (v == null || v === '') return '';
        if (c.tipo === 'fecha') return '<c r="' + ref + '" s="2"><v>' + serie(v) + '</v></c>';
        if (c.tipo === 'numero') return '<c r="' + ref + '"><v>' + Number(v) + '</v></c>';
        return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
      }).join('') + '</row>');
    });
    var ultima = letra(nC - 1) + (nF + 1);
    var sheet = XML + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + ultima + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + cols.map(function (c, j) { return '<col min="' + (j + 1) + '" max="' + (j + 1) + '" width="' + (c.ancho || 14) + '" customWidth="1"/>'; }).join('') + '</cols>' +
      '<sheetData>' + filas.join('') + '</sheetData>' +
      '<autoFilter ref="A1:' + ultima + '"/></worksheet>';
    var styles = XML + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd\\-mm\\-yyyy"/></numFmts>' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF0051A8"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    var nombre = esc((hoja.nombre || 'Hoja1').slice(0, 31));
    return zip([
      { nombre: '[Content_Types].xml', datos: enc.encode(XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>') },
      { nombre: '_rels/.rels', datos: enc.encode(XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { nombre: 'xl/workbook.xml', datos: enc.encode(XML + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + nombre + '" sheetId="1" r:id="rId1"/></sheets></workbook>') },
      { nombre: 'xl/_rels/workbook.xml.rels', datos: enc.encode(XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>') },
      { nombre: 'xl/styles.xml', datos: enc.encode(styles) },
      { nombre: 'xl/worksheets/sheet1.xml', datos: enc.encode(sheet) }
    ]);
  }

  function descargar(bytes, nombre) {
    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  global.XLSX_MIN = { crear: crear, descargar: descargar, crc32: crc32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.XLSX_MIN;
})(typeof window !== 'undefined' ? window : globalThis);
