/* ============================================================
   app-rekap.js — rekap matriks per bagian & kategori + ekspor
   ============================================================ */
(function () {
  "use strict";
  var A = window.CCA;
  var S = A.S;
  var $ = A.$;
  var ui = A.ui;

  function buildData() {
    var p = A.period();
    var scale = A.scaleForUnit(p);
    var bagFilter = ui.rekapBagian;
    var q = (ui.rekapSearch || "").toLowerCase();

    var bags = S.activeBagian().filter(function (b) {
      return bagFilter === "ALL" || b.id === bagFilter;
    });

    var amap = {}, bmap = {};
    S.entries({ periodId: ui.periodId, unit: ui.unit, bagianId: bagFilter }).forEach(function (e) {
      var k = e.bagianId + "|" + e.kategoriId;
      amap[k] = (amap[k] || 0) + (e.amount || 0);
    });
    S.state.budget.forEach(function (b) {
      if (b.periodId !== ui.periodId) return;
      if (bagFilter !== "ALL" && b.bagianId !== bagFilter) return;
      var k = b.bagianId + "|" + b.kategoriId;
      bmap[k] = (bmap[k] || 0) + (b.amount || 0) * scale;
    });

    var katIds = {};
    Object.keys(bmap).forEach(function (k) {
      if (bmap[k]) katIds[k.split("|")[1]] = 1;
    });
    Object.keys(amap).forEach(function (k) {
      if (amap[k]) katIds[k.split("|")[1]] = 1;
    });

    var kats = S.activeKategori().filter(function (k) {
      if (!katIds[k.id]) return false;
      if (q && k.name.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    function katTotal(id, which) {
      var src = which === "budget" ? bmap : amap;
      var t = 0;
      bags.forEach(function (b) { t += src[b.id + "|" + id] || 0; });
      return t;
    }
    kats.sort(function (a, b) {
      return katTotal(b.id, "actual") - katTotal(a.id, "actual") || katTotal(b.id, "budget") - katTotal(a.id, "budget");
    });

    var rows = bags.map(function (b) {
      var budget = 0, actual = 0;
      kats.forEach(function (k) {
        budget += bmap[b.id + "|" + k.id] || 0;
        actual += amap[b.id + "|" + k.id] || 0;
      });
      return { id: b.id, name: b.name, group: b.group, budget: Math.round(budget), actual: actual, variance: actual - Math.round(budget) };
    }).filter(function (r) { return r.budget > 0 || r.actual > 0; });

    return { bags: bags, kats: kats, rows: rows, amap: amap, bmap: bmap };
  }

  function render() {
    var p = A.period();
    var scale = A.scaleForUnit(p);
    var totalBudget = S.budgetSum(ui.periodId, { bagianId: ui.rekapBagian }) * scale;
    var totalActual = S.sum({ periodId: ui.periodId, unit: ui.unit, bagianId: ui.rekapBagian });
    var nTrx = S.entries({ periodId: ui.periodId, unit: ui.unit, bagianId: ui.rekapBagian }).length;
    var byBag = S.byBagian(ui.periodId, { unit: ui.unit }).map(function (r) {
      var b = r.budget * scale;
      return { actual: r.actual, budget: b };
    }).filter(function (r) { return r.budget > 0 || r.actual > 0; });
    var over = byBag.filter(function (r) { return r.budget > 0 && r.actual > r.budget; }).length;

    var left = totalBudget - totalActual;
    var kpis = [
      ["Realisasi", A.money(totalActual), nTrx.toLocaleString("id-ID") + " transaksi", "money", "k-act"],
      ["Budget", A.money(Math.round(totalBudget)), "Budget standar periode", "budget", "k-bud"],
      [left >= 0 ? "Sisa Budget" : "Over Budget", A.money(Math.abs(left)), left >= 0 ? "Dalam batas budget" : "Melewati budget", "chart", left >= 0 ? "k-good" : "k-bad"],
      ["% Budget", totalBudget > 0 ? A.pct(totalActual / totalBudget) : "—", "Pemakaian budget", "budget", totalBudget > 0 && totalActual > totalBudget ? "k-bad" : "k-good"],
      ["Bagian Over", String(over), "dari " + byBag.length + " bagian berdata", "alert", over ? "k-warn" : "k-good"],
      ["Rata-rata / Bagian", A.money(byBag.length ? totalActual / byBag.length : 0), "Realisasi rata-rata", "users", ""]
    ];
    $("#rekapKpi").innerHTML = kpis.map(function (k) {
      return '<div class="kpi ' + k[4] + '"><div class="k-icon">' + A.icon(k[3]) + "</div>" +
        '<div class="k-label">' + A.esc(k[0]) + '</div><div class="k-value sm">' + k[1] + "</div>" +
        '<div class="k-foot">' + k[2] + "</div></div>";
    }).join("");

    $("#rekapUnitBadge").textContent = A.unitLabel(ui.unit);
    $("#rekapSub").textContent = p.label + " · " + (ui.rekapBagian === "ALL" ? "semua bagian" : S.bagianName(ui.rekapBagian)) +
      (ui.rekapSearch ? ' · cari "' + ui.rekapSearch + '"' : "");

    var d = buildData();
    var mode = ui.rekapMode;

    var html = '<table class="table compact sticky-first"><thead><tr><th>Bagian</th>';
    d.kats.forEach(function (k) {
      html += '<th class="num" title="' + A.esc(k.name) + '">' + A.esc(k.name.length > 22 ? k.name.slice(0, 20) + "…" : k.name) + "</th>";
    });
    html += '<th class="num" style="font-weight:700">Total</th></tr></thead><tbody>';

    if (!d.rows.length) {
      html += A.emptyRow("Tidak ada data untuk filter ini.", d.kats.length + 2);
    }

    d.rows.forEach(function (r) {
      html += '<tr><td class="name">' + A.esc(r.name) + '<span class="sub">' + A.esc(r.group || "") + "</span></td>";
      var rowTotal = 0;
      d.kats.forEach(function (k) {
        var key = r.id + "|" + k.id;
        var budget = d.bmap[key] || 0;
        var actual = d.amap[key] || 0;
        var val = mode === "budget" ? budget : mode === "variance" ? actual - budget : mode === "pct" ? (budget > 0 ? actual / budget : null) : actual;
        rowTotal += mode === "variance" ? actual - budget : mode === "budget" ? budget : actual;
        var show = "";
        var style = "";
        if (val == null) show = '<span class="muted">—</span>';
        else if (mode === "pct") {
          show = A.pct(val);
          if (val > 1) style = ' style="color:#c0392b;font-weight:600"';
          else if (val >= 0.9) style = ' style="color:#b4690e;font-weight:600"';
        } else if (mode === "variance") {
          show = (val > 0 ? "+" : val < 0 ? "−" : "") + A.moneyPlain(Math.abs(val));
          if (val > 0) style = ' style="color:#c0392b"';
        } else {
          show = A.moneyPlain(val);
          if (!val) show = '<span class="muted">—</span>';
        }
        html += '<td class="num"' + style + ">" + show + "</td>";
      });
      var totalShow, totalStyle = "";
      if (mode === "pct") {
        totalShow = r.budget > 0 ? A.pct(r.actual / r.budget) : "—";
        if (r.actual > r.budget) totalStyle = ' style="color:#c0392b;font-weight:700"';
      } else if (mode === "variance") {
        totalShow = (rowTotal > 0 ? "+" : rowTotal < 0 ? "−" : "") + A.moneyPlain(Math.abs(rowTotal));
        if (rowTotal > 0) totalStyle = ' style="color:#c0392b;font-weight:700"';
      } else {
        totalShow = A.moneyPlain(rowTotal);
      }
      html += '<td class="num"' + totalStyle + ">" + totalShow + "</td></tr>";
    });

    html += "</tbody><tfoot><tr><td>TOTAL</td>";
    var grand = 0;
    d.kats.forEach(function (k) {
      var b = 0, a = 0;
      d.rows.forEach(function (r) { b += d.bmap[r.id + "|" + k.id] || 0; a += d.amap[r.id + "|" + k.id] || 0; });
      if (mode === "budget") { grand += b; html += '<td class="num">' + (b ? A.moneyPlain(b) : "—") + "</td>"; }
      else if (mode === "variance") { grand += a - b; html += '<td class="num">' + (a - b > 0 ? "+" : a - b < 0 ? "−" : "") + A.moneyPlain(Math.abs(a - b)) + "</td>"; }
      else if (mode === "pct") { html += '<td class="num">' + (b ? A.pct(a / b) : "—") + "</td>"; }
      else { grand += a; html += '<td class="num">' + (a ? A.moneyPlain(a) : "—") + "</td>"; }
    });
    html += '<td class="num">' + (mode === "pct" ? (totalBudget > 0 ? A.pct(totalActual / totalBudget) : "—") : A.moneyPlain(Math.abs(grand))) + "</td></tr></tfoot></table>";
    $("#rekapTable").innerHTML = html;
  }

  /* ------------------------------ ekspor ------------------------------ */
  function longRows() {
    var d = buildData();
    var out = [["Bagian", "Kategori", "Budget", "Realisasi", "Selisih", "% Budget"]];
    d.rows.forEach(function (r) {
      d.kats.forEach(function (k) {
        var b = Math.round(d.bmap[r.id + "|" + k.id] || 0);
        var a = d.amap[r.id + "|" + k.id] || 0;
        if (!b && !a) return;
        out.push([r.name, k.name, b, a, a - b, b > 0 ? Math.round(a / b * 10000) / 100 : ""]);
      });
    });
    out.push(["TOTAL", "", Math.round(S.budgetSum(ui.periodId, { bagianId: ui.rekapBagian }) * A.scaleForUnit(A.period())), S.sum({ periodId: ui.periodId, unit: ui.unit, bagianId: ui.rekapBagian }), "", ""]);
    return out;
  }

  function exportCsv() {
    A.saveCsv(longRows(), "rekap-cost-containment-" + ui.periodId + ".csv");
    A.toast("Rekap CSV berhasil diunduh.", "ok");
  }

  function exportXlsx() {
    if (!window.CCX) return;
    var d = buildData();
    var matrix = [["Bagian"].concat(d.kats.map(function (k) { return k.name; })).concat(["Total"])];
    d.rows.forEach(function (r) {
      var row = [r.name];
      d.kats.forEach(function (k) {
        var b = d.bmap[r.id + "|" + k.id] || 0;
        var a = d.amap[r.id + "|" + k.id] || 0;
        row.push(ui.rekapMode === "budget" ? Math.round(b) : ui.rekapMode === "variance" ? a - Math.round(b) : Math.round(a));
      });
      row.push(r.actual);
      matrix.push(row);
    });
    var budgetRows = [["Bagian", "Kategori", "Budget", "Realisasi", "Selisih"]];
    d.rows.forEach(function (r) {
      d.kats.forEach(function (k) {
        var b = Math.round(d.bmap[r.id + "|" + k.id] || 0);
        var a = d.amap[r.id + "|" + k.id] || 0;
        if (!b && !a) return;
        budgetRows.push([r.name, k.name, b, a, a - b]);
      });
    });
    A.saveXlsx([
      { name: "REKAP " + ui.periodId, rows: matrix, widths: [26].concat(d.kats.map(function () { return 14; })), moneyCols: matrix[0].map(function (_, i) { return i; }).slice(1), autoFilter: true },
      { name: "RINCIAN", rows: longRows(), widths: [26, 28, 16, 16, 16, 12], moneyCols: [2, 3, 4] }
    ], "rekap-cost-containment-" + ui.periodId + ".xlsx");
  }

  function init() {
    $("#rekapBagian").addEventListener("change", function () { ui.rekapBagian = this.value; render(); });
    $("#rekapMode").addEventListener("change", function () { ui.rekapMode = this.value; render(); });
    var t = null;
    $("#rekapSearch").addEventListener("input", function () {
      clearTimeout(t);
      var v = this.value;
      t = setTimeout(function () { ui.rekapSearch = v.trim(); render(); }, 200);
    });
    $("#rekapCsv").addEventListener("click", exportCsv);
    $("#rekapXlsx").addEventListener("click", exportXlsx);
    $("#rekapPrint").addEventListener("click", function () { window.print(); });
  }

  function refresh() {
    A.fillSelect($("#rekapBagian"), S.activeBagian().map(function (b) { return { id: b.id, name: b.name }; }), "Semua bagian", ui.rekapBagian);
    if ($("#rekapMode")) $("#rekapMode").value = ui.rekapMode;
    render();
  }

  A.register("rekap", { init: init, render: refresh });
})();
