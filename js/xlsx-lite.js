/* ============================================================
   xlsx-lite.js — pembaca & penulis XLSX tanpa library eksternal
   - Membaca .xlsx (ZIP + inflate via DecompressionStream)
   - Menulis .xlsx (ZIP stored / tanpa kompresi)
   - Membaca .csv
   ============================================================ */
(function () {
  "use strict";
  var CCX = {};

  /* ----------------------------- CRC32 ----------------------------- */
  var crcTable = (function () {
    var t = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  /* ----------------------------- Text ----------------------------- */
  var enc = new TextEncoder();
  var dec = new TextDecoder("utf-8");

  function xmlEscape(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  }

  function colName(n) {
    var s = "";
    n = n + 1;
    while (n > 0) {
      var m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  /* ----------------------------- ZIP write ----------------------------- */
  function zipWrite(files) {
    var chunks = [];
    var central = [];
    var offset = 0;
    var now = new Date();
    var dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xffff;
    var dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

    files.forEach(function (f) {
      var nameBytes = enc.encode(f.name);
      var data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
      var crc = crc32(data);

      var lh = new Uint8Array(30 + nameBytes.length);
      var dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0800, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, dosTime, true);
      dv.setUint16(12, dosDate, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true);
      dv.setUint32(22, data.length, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      chunks.push(lh);
      if (data.length) chunks.push(data);

      var cd = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      central.push(cd);

      offset += lh.length + data.length;
    });

    var cdBytes = new Uint8Array(central.reduce(function (a, c) { return a + c.length; }, 0));
    var p = 0;
    central.forEach(function (c) { cdBytes.set(c, p); p += c.length; });

    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, central.length, true);
    ev.setUint16(10, central.length, true);
    ev.setUint32(12, cdBytes.length, true);
    ev.setUint32(16, offset, true);

    return new Blob(chunks.concat([cdBytes, eocd]), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  /* ----------------------------- ZIP read ----------------------------- */
  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "undefined") throw new Error("Browser tidak mendukung pembacaan file terkompresi (DecompressionStream).");
    var ds = new DecompressionStream("deflate-raw");
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function u16(dv, p) { return dv.getUint16(p, true); }
  function u32(dv, p) { return dv.getUint32(p, true); }

  async function unzip(buffer) {
    var bytes = new Uint8Array(buffer);
    var dv = new DataView(buffer);
    var eocd = -1;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
      if (u32(dv, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("File bukan .xlsx yang valid (ZIP tidak ditemukan).");
    var count = u16(dv, eocd + 10);
    var cdOffset = u32(dv, eocd + 16);
    var files = {};
    var p = cdOffset;
    for (var n = 0; n < count; n++) {
      if (u32(dv, p) !== 0x02014b50) break;
      var method = u16(dv, p + 10);
      var csize = u32(dv, p + 20);
      var nameLen = u16(dv, p + 28);
      var extraLen = u16(dv, p + 30);
      var commentLen = u16(dv, p + 32);
      var localOffset = u32(dv, p + 42);
      var name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
      var lhNameLen = u16(dv, localOffset + 26);
      var lhExtraLen = u16(dv, localOffset + 28);
      var dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
      var raw = bytes.subarray(dataStart, dataStart + csize);
      files[name] = { method: method, data: raw, size: csize };
      p += 46 + nameLen + extraLen + commentLen;
    }

    var out = {};
    var names = Object.keys(files);
    for (var k = 0; k < names.length; k++) {
      var f = files[names[k]];
      if (f.method === 0) out[names[k]] = f.data;
      else if (f.method === 8) out[names[k]] = await inflateRaw(f.data);
      // metode lain tidak didukung
    }
    return out;
  }

  /* ----------------------------- XML parse ----------------------------- */
  function parseXml(text) {
    var doc = new DOMParser().parseFromString(text, "application/xml");
    var err = doc.querySelector("parsererror");
    if (err) throw new Error("XML tidak valid di dalam file Excel.");
    return doc;
  }

  function tag(doc, name) {
    return Array.prototype.slice.call(doc.getElementsByTagNameNS("*", name));
  }

  function textOf(el) {
    return el ? (el.textContent || "") : "";
  }

  /* ----------------------------- XLSX read ----------------------------- */
  async function readWorkbook(buffer) {
    var zip = await unzip(buffer);
    var wbXml = zip["xl/workbook.xml"];
    if (!wbXml) throw new Error("Struktur workbook tidak dikenali.");
    var wbDoc = parseXml(dec.decode(wbXml));

    var relXml = zip["xl/_rels/workbook.xml.rels"];
    var rels = {};
    if (relXml) {
      var relDoc = parseXml(dec.decode(relXml));
      tag(relDoc, "Relationship").forEach(function (r) {
        rels[r.getAttribute("Id")] = r.getAttribute("Target");
      });
    }

    var shared = [];
    if (zip["xl/sharedStrings.xml"]) {
      var ssDoc = parseXml(dec.decode(zip["xl/sharedStrings.xml"]));
      tag(ssDoc, "si").forEach(function (si) {
        var txt = "";
        tag(si, "t").forEach(function (t) { txt += t.textContent || ""; });
        shared.push(txt);
      });
    }

    var sheets = [];
    tag(wbDoc, "sheet").forEach(function (s) {
      var name = s.getAttribute("name");
      var rid = s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      var target = rels[rid] || "";
      target = target.replace(/^\/?xl\//, "").replace(/^\/?/, "");
      var path = "xl/" + target;
      if (!zip[path]) {
        // fallback: cari nama file yang mirip
        var alt = Object.keys(zip).filter(function (k) { return k.indexOf("worksheets/") >= 0 && k.indexOf(target.replace(/^.*\//, "")) >= 0; })[0];
        if (alt) path = alt;
      }
      if (!zip[path]) return;
      sheets.push(parseSheet(name, dec.decode(zip[path]), shared));
    });

    return { sheets: sheets };
  }

  function parseSheet(name, xml, shared) {
    var doc = parseXml(xml);
    var rows = [];
    var rowEls = tag(doc, "row");
    rowEls.forEach(function (r) {
      var rowIndex = parseInt(r.getAttribute("r"), 10) - 1;
      if (isNaN(rowIndex) || rowIndex < 0) return;
      var arr = rows[rowIndex] || [];
      var cells = Array.prototype.slice.call(r.getElementsByTagNameNS("*", "c"));
      cells.forEach(function (c) {
        var ref = c.getAttribute("r") || "";
        var m = ref.match(/^([A-Z]+)(\d+)$/);
        if (!m) return;
        var col = 0;
        for (var i = 0; i < m[1].length; i++) col = col * 26 + (m[1].charCodeAt(i) - 64);
        col -= 1;
        var t = c.getAttribute("t");
        var vEl = c.getElementsByTagNameNS("*", "v")[0];
        var value = vEl ? vEl.textContent : "";
        if (t === "s") {
          value = shared[parseInt(value, 10)] || "";
        } else if (t === "inlineStr") {
          value = "";
          Array.prototype.slice.call(c.getElementsByTagNameNS("*", "t")).forEach(function (tt) { value += tt.textContent || ""; });
        } else if (t === "str" || t === "b" || t === "e") {
          value = value;
        } else if (value !== "") {
          var num = Number(value);
          value = isNaN(num) ? value : num;
        }
        arr[col] = value;
      });
      rows[rowIndex] = arr;
    });
    // rapikan array berlubang
    for (var i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    return { name: name, rows: rows };
  }

  /* ----------------------------- XLSX write ----------------------------- */
  var STYLE_DEFAULT = 0, STYLE_HEADER = 1, STYLE_TITLE = 2, STYLE_MONEY = 3, STYLE_PCT = 4, STYLE_INT = 5;

  function cellXml(value, rowIdx, colIdx, style) {
    var ref = colName(colIdx) + (rowIdx + 1);
    if (value == null || value === "") {
      return style ? '<c r="' + ref + '" s="' + style + '"/>' : "";
    }
    if (typeof value === "number" && isFinite(value)) {
      return '<c r="' + ref + '"' + (style ? ' s="' + style + '"' : "") + '><v>' + value + "</v></c>";
    }
    return '<c r="' + ref + '"' + (style ? ' s="' + style + '"' : "") + ' t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(value) + "</t></is></c>";
  }

  function sheetXml(spec) {
    var rows = spec.rows || [];
    var widths = spec.widths || [];
    var freeze = spec.freeze !== false;
    var autoFilter = spec.autoFilter;
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0">' +
      (freeze ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : "") +
      '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>';
    if (widths.length) {
      xml += "<cols>";
      widths.forEach(function (w, i) {
        xml += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
      });
      xml += "</cols>";
    }
    xml += "<sheetData>";
    rows.forEach(function (row, r) {
      xml += '<row r="' + (r + 1) + '"' + (r === 0 ? ' ht="22" customHeight="1"' : "") + ">";
      (row || []).forEach(function (val, c) {
        var style = 0;
        if (r === 0) style = STYLE_HEADER;
        else if (typeof val === "number") style = spec.moneyCols && spec.moneyCols.indexOf(c) >= 0 ? STYLE_MONEY : STYLE_INT;
        if (spec.pctCols && spec.pctCols.indexOf(c) >= 0) style = STYLE_PCT;
        if (r === 0 && spec.headerStyle === false) style = STYLE_DEFAULT;
        xml += cellXml(val, r, c, style);
      });
      xml += "</row>";
    });
    xml += "</sheetData>";
    if (autoFilter && rows.length) {
      var lastCol = colName(Math.max(0, (rows[0] || []).length - 1));
      xml += '<autoFilter ref="A1:' + lastCol + rows.length + '"/>';
    }
    xml += "</worksheet>";
    return xml;
  }

  function stylesXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="0"/>' +
      '<fonts count="3">' +
      '<font><sz val="11"/><name val="Calibri"/><color theme="1"/></font>' +
      '<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>' +
      '<font><b/><sz val="14"/><name val="Calibri"/><color rgb="FF0E6F64"/></font>' +
      '</fonts>' +
      '<fills count="3">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF0E6F64"/><bgColor indexed="64"/></patternFill></fill>' +
      '</fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="6">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '<dxfs count="0"/>' +
      '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>' +
      '</styleSheet>';
  }

  function writeXlsx(sheets) {
    var files = [];
    var sheetNames = sheets.map(function (s, i) {
      var n = String(s.name || "Sheet" + (i + 1)).replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31) || ("Sheet" + (i + 1));
      return n;
    });
    // pastikan unik
    var seen = {};
    sheetNames = sheetNames.map(function (n) {
      var base = n, i = 2;
      while (seen[n]) { n = base.slice(0, 27) + " " + i; i++; }
      seen[n] = true;
      return n;
    });

    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    sheets.forEach(function (s, i) {
      ct += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    });
    ct += "</Types>";

    var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    sheets.forEach(function (s, i) {
      workbook += '<sheet name="' + xmlEscape(sheetNames[i]) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
    });
    workbook += "</sheets></workbook>";

    var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    sheets.forEach(function (s, i) {
      wbRels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    });
    wbRels += '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    wbRels += "</Relationships>";

    var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      "</Relationships>";

    files.push({ name: "[Content_Types].xml", data: ct });
    files.push({ name: "_rels/.rels", data: rootRels });
    files.push({ name: "xl/workbook.xml", data: workbook });
    files.push({ name: "xl/_rels/workbook.xml.rels", data: wbRels });
    files.push({ name: "xl/styles.xml", data: stylesXml() });
    sheets.forEach(function (s, i) {
      files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: sheetXml(s) });
    });
    return zipWrite(files);
  }

  /* ----------------------------- CSV ----------------------------- */
  function parseCsv(text) {
    text = String(text || "").replace(/^\uFEFF/, "");
    var firstLine = text.split(/\r?\n/)[0] || "";
    var delim = ",";
    var sc = (firstLine.match(/;/g) || []).length;
    var cc = (firstLine.match(/,/g) || []).length;
    var tc = (firstLine.match(/\t/g) || []).length;
    if (sc > cc && sc >= tc) delim = ";";
    else if (tc > cc) delim = "\t";

    var rows = [];
    var row = [];
    var cur = "";
    var quoted = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else quoted = false;
        } else cur += ch;
      } else {
        if (ch === '"') quoted = true;
        else if (ch === delim) { row.push(cur); cur = ""; }
        else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
        else if (ch === "\r") { /* skip */ }
        else cur += ch;
      }
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  CCX.writeXlsx = writeXlsx;
  CCX.readWorkbook = readWorkbook;
  CCX.parseCsv = parseCsv;
  CCX.colName = colName;
  CCX.xmlEscape = xmlEscape;
  window.CCX = CCX;
})();
