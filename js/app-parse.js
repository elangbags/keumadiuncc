/* ============================================================
   app-parse.js — pembaca template & workbook Cost Containment
   ============================================================ */
(function () {
  "use strict";
  var A = window.CCA;
  var S = A.S;

  function norm(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  function normSheet(s) { return String(s == null ? "" : s).toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function toNum(v) { return S.num(v); }

  function findSheet(sheets, keys) {
    for (var i = 0; i < sheets.length; i++) {
      var n = normSheet(sheets[i].name);
      for (var k = 0; k < keys.length; k++) if (n.indexOf(keys[k]) >= 0) return sheets[i];
    }
    return null;
  }

  function headerMap(row) {
    var map = {};
    (row || []).forEach(function (cell, idx) {
      var k = norm(cell);
      if (!k) return;
      if (!(k in map)) map[k] = idx;
    });
    return map;
  }

  function findHeader(rows) {
    for (var i = 0; i < Math.min(rows.length, 25); i++) {
      var map = headerMap(rows[i]);
      var keys = Object.keys(map);
      var dateKey = keys.filter(function (k) { return k.indexOf("tanggal") >= 0 || k === "tgl" || k === "date"; })[0];
      if (dateKey != null) return { index: i, map: map, dateCol: map[dateKey] };
    }
    // fallback: cari kolom C berisi serial tanggal
    for (var r = 0; r < Math.min(rows.length, 40); r++) {
      var row = rows[r] || [];
      var d = S.normalizeDate(row[2]);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && toNum(row[2]) > 20000) {
        return { index: r - 1, map: { tanggal: 2 }, dateCol: 2 };
      }
    }
    return null;
  }

  function pick(map, names, exact) {
    var keys = Object.keys(map);
    var i, j;
    if (exact !== false) {
      for (i = 0; i < names.length; i++) {
        for (j = 0; j < keys.length; j++) if (keys[j] === names[i]) return map[keys[j]];
      }
    }
    for (i = 0; i < names.length; i++) {
      for (j = 0; j < keys.length; j++) if (keys[j].indexOf(names[i]) >= 0) return map[keys[j]];
    }
    return null;
  }

  function dateRows(sheet) {
    var h = findHeader(sheet.rows);
    if (!h) return { header: null, rows: [] };
    var out = [];
    for (var r = Math.max(0, h.index + 1); r < sheet.rows.length; r++) {
      var row = sheet.rows[r] || [];
      var d = S.normalizeDate(row[h.dateCol]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      out.push({ date: d, row: row });
    }
    return { header: h, rows: out };
  }

  function guessBagian(text) {
    var hit = S.findBagianByName(text);
    if (hit) return hit.id;
    var t = norm(text);
    if (!t) return "";
    var rules = [
      [/poli/, "poli"], [/rawat inap|ranap|perawatan|bangsal/, "ranap"], [/bersalin|vk/, "bersalin"],
      [/operasi|ok\b|bedah/, "operasi"], [/fisio/, "fisio"], [/igd|gawat darurat|emergency/, "igd"],
      [/farmasi|apotek|obat/, "farmasi"], [/laboratorium|\blab\b/, "lab"], [/radiologi|rontgen|x ray/, "radiologi"],
      [/gizi|dapur|makanan/, "gizi"], [/sdm|kepegawaian|hrd|personalia/, "sdm"], [/umum|rt\b|rumah tangga|ipsrs/, "umum"],
      [/administrasi|keuangan|akuntansi|kasir/, "adm"], [/marketing|pemasaran|promosi/, "marketing"],
      [/operasional/, "ops"]
    ];
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(t)) return rules[i][1];
    return "";
  }

  function guessKategori(text) {
    var hit = S.findKategoriByName(text);
    if (hit) return hit.id;
    var t = norm(text);
    if (!t) return "";
    var rules = [
      [/makan.*pasien|pasien.*makan/, "makanPasien"], [/makan.*karyawan|karyawan.*makan/, "makanKaryawan"],
      [/makan.*dokter|dokter.*makan/, "makanDokter"], [/makan.*marketing|marketing.*makan/, "makanMarketing"],
      [/rujukan.*lab|lab.*rujukan/, "rujukLab"], [/rujukan.*radio|radio.*rujukan|rontgen/, "rujukRad"],
      [/atk/, "atk"], [/bmhp|bhp/, "bhp"], [/oksigen/, "oksigen"], [/obat|implant/, "obat"],
      [/sewa/, "sewa"], [/honor/, "honor"], [/gaji direksi|direksi/, "gajiDireksi"], [/gaji/, "gaji"],
      [/lembur/, "lembur"], [/diklat|pelatihan|pendidikan/, "diklat"], [/thr|bonus/, "bonus"],
      [/pengobatan/, "pengobatan"], [/perlengkapan.*karyawan/, "perlengkapanKaryawan"],
      [/rapat/, "rapat"], [/listrik/, "listrik"], [/telepon/, "telepon"], [/internet/, "internet"],
      [/gas/, "gas"], [/air/, "air"], [/subscription|aplikasi|langganan/, "subscription"],
      [/pemeliharaan.*alkes|alkes/, "harAlkes"], [/pemeliharaan.*alat/, "pemeliharaanAlat"],
      [/outsourcing/, "outsourcing"], [/pemeliharaan.*gedung|gedung/, "pemeliharaanGedung"],
      [/kesling|kebersihan|kebersihan/, "kesling"], [/asuransi/, "asuransi"],
      [/\brt\b|linen|cucian|laundry/, "rt"], [/bacy/, "bacy"], [/material/, "material"],
      [/upah/, "upah"], [/management fee|mgmt/, "mgmtFee"], [/perijinan|perizinan|pajak/, "perijinan"],
      [/akreditasi/, "akreditasi"], [/transport/, "transport"], [/ekspedisi|pengiriman/, "ekspedisi"],
      [/akomodasi|perjalanan|tpd/, "akomodasi"], [/parkir/, "parkir"], [/brosur|leaflet/, "brosur"],
      [/seminar|entertain/, "seminar"], [/csr/, "csr"], [/piutang/, "piutang"], [/sumbangan/, "sumbangan"],
      [/administrasi|adm/, "admUmum"], [/pemasaran|marketing/, "pemasaran"], [/operasional/, "opsLain"],
      [/perlengkapan/, "perlengkapan"], [/lain/, "lain"]
    ];
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(t)) return rules[i][1];
    return "";
  }

  /* ------------------------------ template ------------------------------ */
  function templateHeader(rows) {
    for (var i = 0; i < Math.min(rows.length, 30); i++) {
      var map = headerMap(rows[i]);
      var keys = Object.keys(map);
      var hasDate = keys.some(function (k) { return k.indexOf("tanggal") >= 0 || k === "tgl"; });
      var hasBagian = keys.some(function (k) { return k.indexOf("bagian") >= 0 || k.indexOf("cost center") >= 0 || k.indexOf("divisi") >= 0; });
      var hasAmount = keys.some(function (k) { return k.indexOf("nominal") >= 0 || k.indexOf("jumlah") >= 0 || k.indexOf("amount") >= 0 || k.indexOf("realisasi") >= 0; });
      if (hasDate && hasBagian && hasAmount) return { index: i, map: map };
    }
    return null;
  }

  function parseTemplateSheet(sheet) {
    var h = templateHeader(sheet.rows);
    if (!h) return [];
    var map = h.map;
    var cDate = pick(map, ["tanggal", "tgl", "date"]);
    var cUnit = pick(map, ["unit"]);
    var cBag = pick(map, ["bagian", "cost center", "divisi"]);
    var cKat = pick(map, ["kategori"]);
    var cNote = pick(map, ["keterangan", "uraian", "catatan", "note"]);
    var cAmt = pick(map, ["nominal", "jumlah", "amount", "realisasi", "biaya"]);
    var cRef = pick(map, ["bukti", "referensi", "ref", "no dokumen", "dokumen"]);
    var rows = [];

    for (var r = h.index + 1; r < sheet.rows.length; r++) {
      var row = sheet.rows[r] || [];
      var date = S.normalizeDate(row[cDate]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      var amount = S.parseAmount(row[cAmt]);
      if (!amount) continue;
      var rawBag = String(row[cBag] == null ? "" : row[cBag]).trim();
      var rawKat = String(cKat != null && row[cKat] != null ? row[cKat] : "").trim();
      var bagId = rawBag ? (S.bagian(rawBag) ? rawBag : guessBagian(rawBag)) : "";
      var katId = rawKat ? (S.kategori(rawKat) ? rawKat : guessKategori(rawKat)) : "";
      rows.push({
        date: date,
        unit: String(row[cUnit] == null ? "" : row[cUnit]).trim().toUpperCase() || "RS",
        bagianId: bagId,
        kategoriId: katId,
        bagianRaw: rawBag,
        kategoriRaw: rawKat,
        amount: amount,
        note: String(cNote != null && row[cNote] != null ? row[cNote] : "").trim(),
        ref: String(cRef != null && row[cRef] != null ? row[cRef] : "").trim(),
        source: "Template · " + sheet.name
      });
    }
    return rows;
  }

  /* ------------------------------ workbook ------------------------------ */
  var ATK_MAP = {
    "BAHAN POLIKLINIK": "poli",
    "BAHAN PERAWATAN": "ranap",
    "BAHAN KAMAR BERSALIN": "bersalin",
    "BAHAN KAMAR OPERASI": "operasi",
    "BAHAN FISIOTERAPI": "fisio",
    "IGD": "igd",
    "OBAT-OBATAN": "farmasi",
    "BAHAN LABORATORIUM": "lab",
    "RUJUKAN LABORATORIUM": "lab",
    "BAHAN RONTGEN": "radiologi",
    "MAKANAN PASIEN": "gizi",
    "ADMINISTRASI": "adm"
  };

  function weekDates(periodId) {
    return [5, 12, 19, 26].map(function (d) {
      var max = S.daysInMonth(periodId);
      return periodId + "-" + (d < 10 ? "0" : "") + Math.min(d, max);
    });
  }

  function detectPeriod(sheets) {
    var names = ["BIAYADAPUR", "ATKDANBMHP", "DIKLATLEMBUR", "LABORATORIUM", "RADIOLOGI", "BACYLISTRIK", "MARKETING"];
    for (var i = 0; i < names.length; i++) {
      var sh = findSheet(sheets, [names[i]]);
      if (!sh) continue;
      var dr = dateRows(sh);
      if (dr.rows.length) return dr.rows[0].date.slice(0, 7);
    }
    return new Date().toISOString().slice(0, 7);
  }

  function parseWorkbook(sheets) {
    var rows = [];
    var used = [];
    var hasAtkBagian = false;
    var periodId = detectPeriod(sheets);

    function add(date, unit, bag, kat, amount, note, source) {
      amount = Math.round(amount || 0);
      if (!amount) return;
      rows.push({
        date: date, unit: unit || "RS", bagianId: bag, kategoriId: kat,
        amount: amount, note: note || "", ref: "", source: source || ""
      });
      if (!periodId) periodId = date.slice(0, 7);
    }

    /* ---- BIAYA DAPUR ---- */
    var sh = findSheet(sheets, ["BIAYADAPUR", "DAPUR"]);
    if (sh) {
      var dr = dateRows(sh);
      if (dr.rows.length) {
        used.push(sh.name);
        var h = dr.header.map;
        var cPas = pick(h, ["pasien"]);
        var cKar = pick(h, ["karyawan"]);
        var cDok = pick(h, ["dokter"]);
        dr.rows.forEach(function (x) {
          if (cPas != null) add(x.date, "RS", "gizi", "makanPasien", toNum(x.row[cPas]), "Makan pasien harian", "BIAYA DAPUR");
          if (cKar != null) add(x.date, "RS", "sdm", "makanKaryawan", toNum(x.row[cKar]), "Makan karyawan harian", "BIAYA DAPUR");
          if (cDok != null) add(x.date, "RS", "sdm", "makanDokter", toNum(x.row[cDok]), "Makan dokter harian", "BIAYA DAPUR");
        });
      }
    }

    /* ---- ATK BIDANG ---- */
    var shAtk = findSheet(sheets, ["ATKBIDANG"]);
    if (shAtk) {
      var hr = null, weekCols = [], totalCol = null;
      for (var i = 0; i < Math.min(shAtk.rows.length, 15); i++) {
        var m = headerMap(shAtk.rows[i]);
        var keys = Object.keys(m);
        var weeks = keys.filter(function (k) { return k.indexOf("minggu") === 0 || k.indexOf("minggu ") === 0; });
        var tot = keys.filter(function (k) { return k === "total"; })[0];
        if (tot != null && weeks.length >= 2) {
          hr = i;
          totalCol = m[tot];
          weekCols = weeks.map(function (k) { return m[k]; }).sort(function (a, b) { return a - b; }).slice(0, 4);
          break;
        }
      }
      if (hr == null) { hr = 4; totalCol = 36; weekCols = [37, 38, 39, 40]; }
      var wk = weekDates(periodId || new Date().toISOString().slice(0, 7));
      var atkBidangCount = 0;
      for (var r = hr + 1; r < shAtk.rows.length; r++) {
        var row = shAtk.rows[r] || [];
        var name = String(row[1] == null ? "" : row[1]).trim();
        if (!name) continue;
        var total = toNum(row[totalCol]);
        var w1 = toNum(row[weekCols[0]]), w2 = toNum(row[weekCols[1]]), w3 = toNum(row[weekCols[2]]), w4 = toNum(row[weekCols[3]]);
        if (!total && !w1 && !w2 && !w3 && !w4) continue;
        var bag = ATK_MAP[name.toUpperCase()] || guessBagian(name) || "adm";
        var arr = [w1, w2, w3, w4];
        var anyWeek = w1 + w2 + w3 + w4;
        if (anyWeek > 0) {
          arr.forEach(function (v, idx) {
            if (v) add(wk[idx], "RS", bag, "atk", v, "ATK minggu " + (idx + 1) + " (" + name + ")", "ATK BIDANG");
          });
          atkBidangCount++;
        } else if (total > 0) {
          var p = periodId || new Date().toISOString().slice(0, 7);
          add(p + "-" + String(S.daysInMonth(p)).padStart(2, "0"), "RS", bag, "atk", total, "ATK (" + name + ") — total periode", "ATK BIDANG");
          atkBidangCount++;
        }
      }
      if (atkBidangCount) { hasAtkBagian = true; used.push(shAtk.name); }
    }

    /* ---- ATK DAN BMHP ---- */
    var shAb = findSheet(sheets, ["ATKDANBMHP", "ATKBMHP"]);
    var bmhpTotal = 0, bmhpLast = "";
    if (shAb) {
      var ab = dateRows(shAb);
      if (ab.rows.length) {
        used.push(shAb.name);
        var hm = ab.header.map;
        var cAtk = pick(hm, ["atk"]);
        var cBmhp = pick(hm, ["bmhp"]);
        var cOks = pick(hm, ["oksigen"]);
        var cNom = pick(hm, ["nominal"]);
        ab.rows.forEach(function (x) {
          if (cAtk != null && !hasAtkBagian) add(x.date, "RS", "adm", "atk", toNum(x.row[cAtk]), "ATK harian (total RS)", "ATK DAN BMHP");
          if (cBmhp != null) {
            var v = toNum(x.row[cBmhp]);
            bmhpTotal += v;
            if (v) bmhpLast = x.date;
          }
          if (cOks != null) {
            var oc = cNom != null ? cNom : cOks + 1;
            add(x.date, "RS", "ranap", "oksigen", toNum(x.row[oc]), "Pemakaian oksigen harian", "ATK DAN BMHP");
          }
        });
      }
    }

    /* ---- DIKLAT & LEMBUR ---- */
    sh = findSheet(sheets, ["DIKLATLEMBUR", "DIKLAT"]);
    if (sh) {
      var dl = dateRows(sh);
      if (dl.rows.length) {
        used.push(sh.name);
        var hd = dl.header.map;
        var cDik = pick(hd, ["diklat"]);
        var cLem = pick(hd, ["lembur"]);
        dl.rows.forEach(function (x) {
          if (cDik != null) add(x.date, "RS", "sdm", "diklat", toNum(x.row[cDik]), "Realisasi diklat", "DIKLAT & LEMBUR");
          if (cLem != null) add(x.date, "RS", "sdm", "lembur", toNum(x.row[cLem]), "Realisasi lembur harian", "DIKLAT & LEMBUR");
        });
      }
    }

    /* ---- LABORATORIUM & RADIOLOGI (kolom MTD, dihitung delta) ---- */
    [["LABORATORIUM", "lab", "rujukLab", "Rujukan laboratorium harian", "LABORATORIUM"],
    ["RADIOLOGI", "radiologi", "rujukRad", "Rujukan radiologi harian", "RADIOLOGI"]].forEach(function (cfg) {
      var sheet = findSheet(sheets, [cfg[0].replace(/\s/g, "")]);
      if (!sheet) return;
      var res = dateRows(sheet);
      if (!res.rows.length) return;
      var mtdCol = pick(res.header.map, ["mtd"]);
      if (mtdCol == null) return;
      used.push(sheet.name);
      var prev = 0;
      res.rows.forEach(function (x) {
        var mtd = toNum(x.row[mtdCol]);
        var delta = mtd - prev;
        if (delta < 0) delta = mtd;
        prev = mtd;
        if (delta > 0) add(x.date, "RS", cfg[1], cfg[2], delta, cfg[3], cfg[4]);
      });
    });

    /* ---- BACY / LISTRIK / MATERIAL / UPAH ---- */
    sh = findSheet(sheets, ["BACYLISTRIK", "BACY"]);
    if (sh) {
      var bl = dateRows(sh);
      if (bl.rows.length) {
        used.push(sh.name);
        var hb = bl.header.map;
        var cBacy = pick(hb, ["bacy"]);
        var cList = pick(hb, ["listrik"]);
        var cMat = pick(hb, ["material"]);
        var cUpah = pick(hb, ["upah"]);
        bl.rows.forEach(function (x) {
          if (cBacy != null) add(x.date, "RS", "umum", "bacy", toNum(x.row[cBacy]), "BACY harian", "BACY LISTRIK ABRT");
          if (cList != null) add(x.date, "RS", "umum", "listrik", toNum(x.row[cList]), "Pemakaian listrik harian", "BACY LISTRIK ABRT");
          if (cMat != null) add(x.date, "RS", "umum", "material", toNum(x.row[cMat]), "Material / alat dapur harian", "BACY LISTRIK ABRT");
          if (cUpah != null) add(x.date, "RS", "umum", "upah", toNum(x.row[cUpah]), "Upah harian ABRT", "BACY LISTRIK ABRT");
        });
      }
    }

    /* ---- MARKETING ---- */
    sh = findSheet(sheets, ["MARKETING"]);
    if (sh) {
      var mk = dateRows(sh);
      if (mk.rows.length) {
        used.push(sh.name);
        var hmk = mk.header.map;
        var cTot = pick(hmk, ["total"]);
        var cMakan = pick(hmk, ["makan marketing"]);
        mk.rows.forEach(function (x) {
          var v = cTot != null ? toNum(x.row[cTot]) : 0;
          if (!v && cMakan != null) v = toNum(x.row[cMakan]);
          add(x.date, "RS", "marketing", "makanMarketing", v, "Realisasi biaya marketing harian", "MARKETING");
        });
      }
    }

    /* ---- OBAT (opsional) ---- */
    sh = findSheet(sheets, ["OBAT"]);
    if (sh) {
      var ob = dateRows(sh);
      if (ob.rows.length) {
        var ho = ob.header.map;
        var cQ = pick(ho, ["total"], true);
        if (cQ == null) cQ = pick(ho, ["total"]);
        if (cQ != null) {
          var hasObat = ob.rows.some(function (x) { return toNum(x.row[cQ]) > 0; });
          if (hasObat) {
            used.push(sh.name);
            ob.rows.forEach(function (x) {
              add(x.date, "RS", "farmasi", "obat", toNum(x.row[cQ]), "Realisasi obat harian", "OBAT");
            });
          }
        }
      }
    }

    /* ---- alokasi BMHP proporsional ---- */
    if (bmhpTotal > 0) {
      var p = bmhpLast.slice(0, 7);
      var lines = S.state.budget.filter(function (b) {
        return b.periodId === p && b.kategoriId === "bhp" && b.amount > 0;
      });
      var shares = [];
      if (lines.length) {
        shares = lines.map(function (b) { return { id: b.bagianId, w: b.amount }; });
      } else {
        shares = (window.CCData.budget || []).filter(function (b) { return b[1] === "bhp" && b[2] > 0; })
          .map(function (b) { return { id: b[0], w: b[2] }; });
      }
      var wsum = shares.reduce(function (a, s) { return a + s.w; }, 0);
      if (wsum > 0) {
        var alloc = 0;
        shares.forEach(function (s, idx) {
          var amt = idx === shares.length - 1 ? Math.round(bmhpTotal - alloc) : Math.round(bmhpTotal * s.w / wsum);
          alloc += amt;
          add(bmhpLast, "RS", s.id, "bhp", amt, "Alokasi BMHP periode proporsional porsi budget BHP", "ATK DAN BMHP");
        });
      }
    }

    if (!rows.length) return null;
    return {
      type: "workbook",
      rows: rows,
      sheets: used,
      periodId: periodId || (rows[0] && rows[0].date.slice(0, 7)) || ""
    };
  }

  /* ------------------------------ discover ------------------------------ */
  function parseAll(sheets) {
    // 1. coba template lebih dulu
    var tplRows = [], tplSheets = [];
    sheets.forEach(function (sh) {
      var rr = parseTemplateSheet(sh);
      if (rr.length) { tplRows = tplRows.concat(rr); tplSheets.push(sh.name); }
    });
    if (tplRows.length) {
      return { type: "template", rows: tplRows, sheets: tplSheets, periodId: tplRows[0].date.slice(0, 7) };
    }
    // 2. workbook cost containment
    var wb = parseWorkbook(sheets);
    return wb;
  }

  A.parser = {
    parseAll: parseAll,
    parseTemplateSheet: parseTemplateSheet,
    guessBagian: guessBagian,
    guessKategori: guessKategori,
    findHeader: findHeader
  };
})();
