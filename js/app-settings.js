// Di file utama/store aplikasi (misal: app-store.js), pastikan S memiliki method berikut:
S.parseDailyRevenue = function(rows) {
  // Membaca baris harian dari sheet 'DAILY REVENUE'
  // Kolom umumnya: [Tanggal, Padma, Kamala, Total]
  var dailyList = [];
  rows.forEach(function(r) {
    if (r.date && !isNaN(Date.parse(r.date))) {
      dailyList.push({
        date: r.date,
        padma: Number(r.padma) || 0,
        kamala: Number(r.kamala) || 0,
        total: Number(r.total) || (Number(r.padma) + Number(r.kamala)) || 0
      });
    }
  });
  S.state.dailyRevenue = dailyList;
  S.save();
};

S.parseImportedBudget = function(periodId, budgetMap) {
  // budgetMap format: { "bagianId|kategoriId": amount }
  if (!S.state.importedBudgets) S.state.importedBudgets = {};
  S.state.importedBudgets[periodId] = [];
  for (var key in budgetMap) {
    var parts = key.split("|");
    S.state.importedBudgets[periodId].push({
      bagianId: parts[0],
      kategoriId: parts[1],
      amount: budgetMap[key]
    });
  }
  S.save();
};
/* ============================================================
   app-settings.js — budget, periode, master data, backup
   ============================================================ */
(function () {
  "use strict";
  var A = window.CCA;
  var S = A.S;
  var $ = A.$;
  var ui = A.ui;

  var TABS = [
    { id: "budget", label: "Budget" },
    { id: "periode", label: "Periode & Pendapatan" },
    { id: "bagian", label: "Master Bagian" },
    { id: "kategori", label: "Master Kategori" },
    { id: "data", label: "Data & Backup" }
  ];

  function renderTabs() {
    var el = $("#settingsTabs");
    if (!el) return;
    el.innerHTML = TABS.map(function (t) {
      return '<button data-tab="' + t.id + '" class="' + (ui.settingsTab === t.id ? "active" : "") + '">' + A.esc(t.label) + "</button>";
    }).join("");
  }

  function render() {
    renderTabs();
    var host = $("#settingsPanel");
    if (!host) return;
    if (ui.settingsTab === "budget") host.innerHTML = budgetHtml();
    else if (ui.settingsTab === "periode") host.innerHTML = periodeHtml();
    else if (ui.settingsTab === "bagian") host.innerHTML = bagianHtml();
    else if (ui.settingsTab === "kategori") host.innerHTML = kategoriHtml();
    else host.innerHTML = dataHtml();
  }

  /* ============================================================
     HELPER: PENDAPATAN HARIAN OTOMATIS
     ============================================================ */
  function getCalculatedRevenue(periodId) {
    var total = 0, padma = 0, kamala = 0;
    
    // 1. Baca dari S.state.dailyRevenue jika tersedia
    if (S.state && S.state.dailyRevenue && Array.isArray(S.state.dailyRevenue)) {
      S.state.dailyRevenue.forEach(function (d) {
        if (d.date && String(d.date).indexOf(periodId) === 0) {
          total += Number(d.total || d.revenue || 0);
          padma += Number(d.padma || 0);
          kamala += Number(d.kamala || 0);
        }
      });
    }
    
    // 2. Fallback ke S.entries jika ada data harian tersimpan di entries
    if (total === 0 && S.state && S.state.entries) {
      S.state.entries.forEach(function (e) {
        if (e && (e.periodId === periodId || (e.date && String(e.date).indexOf(periodId) === 0))) {
          if (e.revenue || e.totalRevenue || e.source === "DAILY REVENUE") {
            total += Number(e.revenue || e.totalRevenue || e.amount || 0);
            padma += Number(e.revenuePadma || e.padma || 0);
            kamala += Number(e.revenueKamala || e.kamala || 0);
          }
        }
      });
    }

    return { total: total, padma: padma, kamala: kamala };
  }

  /* ============================================================
     BUDGET OTOMATIS
     ============================================================ */
  function budgetLines() {
    var budget = {}, best = {};
    
    if (S.state && S.state.budget) {
      S.state.budget.forEach(function (b) {
        if (!b || b.periodId !== ui.periodId) return;
        budget[b.bagianId + "|" + b.kategoriId] = Number(b.amount) || 0;
        best[b.bagianId + "|" + b.kategoriId] = true;
      });
    }

    // Membaca budget otomatis dari hasil import file Excel (importedBudgets)
    if (S.state && S.state.importedBudgets && S.state.importedBudgets[ui.periodId]) {
      var imp = S.state.importedBudgets[ui.periodId];
      if (Array.isArray(imp)) {
        imp.forEach(function (ib) {
          if (!ib) return;
          var k = ib.bagianId + "|" + ib.kategoriId;
          best[k] = true;
          if (!(k in budget) || budget[k] === 0) {
            budget[k] = Number(ib.amount) || 0;
          }
        });
      }
    }

    if (typeof S.entries === "function") {
      S.entries({ periodId: ui.periodId }).forEach(function (e) {
        if (!e) return;
        best[e.bagianId + "|" + e.kategoriId] = true;
        if (!(e.bagianId + "|" + e.kategoriId in budget)) budget[e.bagianId + "|" + e.kategoriId] = 0;
      });
    }

    var bagOrder = {}, katOrder = {};
    if (S.state && S.state.bagian) S.state.bagian.forEach(function (b, i) { if(b) bagOrder[b.id] = i; });
    if (S.state && S.state.kategori) S.state.kategori.forEach(function (k, i) { if(k) katOrder[k.id] = i; });
    
    return Object.keys(best).map(function (k) {
      var p = k.split("|");
      return { bagianId: p[0], kategoriId: p[1], amount: budget[k] || 0 };
    }).sort(function (a, b) {
      return (bagOrder[a.bagianId] || 0) - (bagOrder[b.bagianId] || 0) ||
        (katOrder[a.kategoriId] || 0) - (katOrder[b.kategoriId] || 0);
    });
  }

  function budgetHtml() {
    var lines = budgetLines();
    var q = ($("#budgetSearch") && $("#budgetSearch").value || "").toLowerCase();
    var shown = lines.filter(function (l) {
      if (!q) return true;
      return (S.bagianName(l.bagianId) + " " + S.kategoriName(l.kategoriId)).toLowerCase().indexOf(q) >= 0;
    });
    var total = shown.reduce(function (a, l) { return a + l.amount; }, 0);
    var periods = typeof S.periods === "function" ? S.periods() : [];
    var idx = periods.map(function (p) { return p.id; }).indexOf(ui.periodId);
    var prev = idx >= 0 && idx + 1 < periods.length ? periods[idx + 1] : null;

    var actMap = {};
    if (typeof S.entries === "function") {
      S.entries({ periodId: ui.periodId }).forEach(function (e) {
        if(!e) return;
        actMap[e.bagianId + "|" + e.kategoriId] = (actMap[e.bagianId + "|" + e.kategoriId] || 0) + (Number(e.amount) || 0);
      });
    }

    var html = '<div class="card"><div class="card-h"><div><h3>Budget per Bagian & Kategori</h3>' +
      '<div class="sub">Periode ' + A.esc(A.period ? A.period().label : ui.periodId) + " · Membaca budget otomatis dari sistem</div></div>" +
      '<div class="spacer"></div><div class="card-tools">' +
      '<input type="search" id="budgetSearch" placeholder="Cari bagian / kategori..." value="' + A.esc(q) + '" style="width:200px" />' +
      '<button class="btn sm" data-act="dl-budget">' + A.icon("download") + " Template</button>" +
      (prev ? '<button class="btn sm" data-act="copy-budget">Salin dari ' + A.esc(prev.label) + "</button>" : "") +
      '<button class="btn sm primary" data-act="add-budget">' + A.icon("plus") + " Tambah baris</button>" +
      "</div></div><div class=\"card-b\" style=\"padding-top:10px\">";

    html += '<div class="table-wrap" style="max-height:560px"><table class="table compact"><thead><tr>' +
      "<th>Bagian</th><th>Kategori</th><th class=\"num\">Budget (Rp)</th><th class=\"num\">Realisasi</th><th class=\"num\">%</th><th>Status</th>" +
      "</tr></thead><tbody>";
    if (!shown.length) html += A.emptyRow("Belum ada baris budget.", 6);
    shown.forEach(function (l) {
      var act = actMap[l.bagianId + "|" + l.kategoriId] || 0;
      var pct = l.amount > 0 ? act / l.amount : null;
      var st = typeof S.statusOf === "function" ? S.statusOf(act, l.amount) : "";
      html += "<tr><td class=\"name\">" + A.esc(S.bagianName(l.bagianId)) + "</td>" +
        "<td>" + A.esc(S.kategoriName(l.kategoriId)) + "</td>" +
        '<td class="num"><input type="text" class="budget-input num" data-bag="' + A.esc(l.bagianId) + '" data-kat="' + A.esc(l.kategoriId) + '" value="' + l.amount + '" style="min-height:30px;padding:4px 8px;width:130px;margin-left:auto;display:block" /></td>' +
        '<td class="num">' + A.moneyPlain(act) + "</td>" +
        '<td class="num">' + (pct == null ? "—" : A.pct(pct)) + "</td>" +
        "<td>" + A.statusBadge({ status: st }) + "</td></tr>";
    });
    html += '</tbody><tfoot><tr><td colspan="2">TOTAL (' + shown.length + " baris)</td>" +
      '<td class="num">' + A.moneyPlain(total) + '</td><td class="num">' + A.moneyPlain(shown.reduce(function (a, l) { return a + (actMap[l.bagianId + "|" + l.kategoriId] || 0); }, 0)) + "</td><td></td><td></td></tr></tfoot></table></div>";
    html += '<div class="hint-box" style="margin-top:12px">Budget dibaca otomatis dari data unggahan workbook Cost Containment.</div>';
    html += "</div></div>";
    return html;
  }

  /* ============================================================
     PERIODE & PENDAPATAN HARIAN
     ============================================================ */
  function periodeHtml() {
    var list = typeof S.periods === "function" ? S.periods().slice().sort(function (a, b) { return a.id < b.id ? 1 : -1; }) : [];
    var html = '<div class="card"><div class="card-h"><div><h3>Periode & Pendapatan</h3>' +
      '<div class="sub">Pendapatan dibaca otomatis secara harian dari data yang diupload</div></div></div><div class="card-b">';
    html += '<div class="table-wrap"><table class="table compact"><thead><tr>' +
      "<th>Periode</th><th class=\"num\">Pendapatan (Total)</th><th class=\"num\">PADMA</th><th class=\"num\">KAMALA</th><th class=\"num\">Target</th><th class=\"num\">Hari</th><th></th>" +
      "</tr></thead><tbody>";
    
    list.forEach(function (p) {
      var calcRev = getCalculatedRevenue(p.id);
      var displayRev = calcRev.total > 0 ? calcRev.total : (p.revenue || 0);
      var displayPadma = calcRev.padma > 0 ? calcRev.padma : (p.revenuePadma || 0);
      var displayKamala = calcRev.kamala > 0 ? calcRev.kamala : (p.revenueKamala || 0);

      html += "<tr><td class=\"name\">" + A.esc(p.label) + '<span class="sub">' + A.esc(p.id) + " (Otomatis Harian)</span></td>" +
        '<td class="num"><input type="text" class="num" data-pid="' + esc(p.id) + '" data-field="revenue" value="' + displayRev + '" /></td>' +
        '<td class="num"><input type="text" class="num" data-pid="' + esc(p.id) + '" data-field="revenuePadma" value="' + displayPadma + '" /></td>' +
        '<td class="num"><input type="text" class="num" data-pid="' + esc(p.id) + '" data-field="revenueKamala" value="' + displayKamala + '" /></td>' +
        '<td class="num"><input type="text" class="num" data-pid="' + esc(p.id) + '" data-field="target" value="' + (p.target || 0) + '" /></td>' +
        '<td class="num"><input type="number" class="num" data-pid="' + esc(p.id) + '" data-field="days" value="' + (p.days || 30) + '" min="28" max="31" /></td>' +
        '<td>' + (list.length > 1 ? '<button class="btn sm icon danger" data-act="del-period" data-pid="' + esc(p.id) + '" title="Hapus periode">' + A.icon("trash") + "</button>" : "") + "</td></tr>";
    });
    html += "</tbody></table></div>";

    html += '<div class="section-title"><h2>Tambah periode</h2><div class="line"></div></div>' +
      '<form id="addPeriodForm" class="row-actions" style="align-items:flex-end">' +
      '<div class="field" style="max-width:190px"><label>Bulan</label><input type="month" id="newPeriodMonth" required /></div>' +
      '<div class="field" style="max-width:210px"><label>Pendapatan (Rp)</label><input type="text" id="newPeriodRevenue" placeholder="0" /></div>' +
      '<div class="field" style="max-width:210px"><label>Target (Rp)</label><input type="text" id="newPeriodTarget" placeholder="0" /></div>' +
      '<button class="btn primary" type="submit">' + A.icon("plus") + " Tambah</button></form>";
    html += "</div></div>";
    return html;
  }

  function esc(s) { return A.esc(s); }

  function bagianHtml() {
    var counts = {}, budgets = {};
    if (S.state && S.state.entries) S.state.entries.forEach(function (e) { if(e) counts[e.bagianId] = (counts[e.bagianId] || 0) + 1; });
    if (S.state && S.state.budget) S.state.budget.forEach(function (b) {
      if (b && b.periodId === ui.periodId) budgets[b.bagianId] = (budgets[b.bagianId] || 0) + Number(b.amount || 0);
    });
    var html = '<div class="card"><div class="card-h"><div><h3>Master Bagian / Cost Center</h3>' +
      '<div class="sub">Nonaktifkan bagian agar tidak muncul pada pilihan input</div></div></div><div class="card-b">';
    html += '<div class="table-wrap"><table class="table compact"><thead><tr><th>Nama bagian</th><th>Grup</th><th class="t-center">Aktif</th><th class="num">Transaksi</th><th class="num">Budget</th><th></th></tr></thead><tbody>';
    if (S.state && S.state.bagian) {
      S.state.bagian.forEach(function (b) {
        if(!b) return;
        html += "<tr><td><input type=\"text\" data-bid=\"" + esc(b.id) + "\" data-field=\"name\" value=\"" + esc(b.name) + '" /></td>' +
          '<td><select data-bid="' + esc(b.id) + '" data-field="group">' +
          ["Biaya Langsung", "Biaya Tidak Langsung"].map(function (g) { return '<option value="' + g + '"' + (b.group === g ? " selected" : "") + ">" + g + "</option>"; }).join("") +
          "</select></td>" +
          '<td class="t-center"><input type="checkbox" data-bid="' + esc(b.id) + '" data-field="active"' + (b.active !== false ? " checked" : "") + " /></td>" +
          '<td class="num">' + (counts[b.id] || 0).toLocaleString("id-ID") + "</td>" +
          '<td class="num">' + A.moneyPlain(budgets[b.id] || 0) + "</td>" +
          '<td><button class="btn sm icon danger" data-act="del-bagian" data-bid="' + esc(b.id) + '" title="Hapus">' + A.icon("trash") + "</button></td></tr>";
      });
    }
    html += "</tbody></table></div></div></div>";
    return html;
  }

  function kategoriHtml() {
    var counts = {}, budgets = {};
    if (S.state && S.state.entries) S.state.entries.forEach(function (e) { if(e) counts[e.kategoriId] = (counts[e.kategoriId] || 0) + 1; });
    if (S.state && S.state.budget) S.state.budget.forEach(function (b) {
      if (b && b.periodId === ui.periodId) budgets[b.kategoriId] = (budgets[b.kategoriId] || 0) + Number(b.amount || 0);
    });
    var html = '<div class="card"><div class="card-h"><div><h3>Master Kategori Biaya</h3>' +
      '<div class="sub">Kategori dipakai untuk memisahkan pos biaya</div></div></div><div class="card-b">';
    html += '<div class="table-wrap" style="max-height:520px"><table class="table compact"><thead><tr><th>Nama kategori</th><th class="t-center">Aktif</th><th class="num">Transaksi</th><th class="num">Budget</th><th></th></tr></thead><tbody>';
    if (S.state && S.state.kategori) {
      S.state.kategori.forEach(function (k) {
        if(!k) return;
        html += "<tr><td><input type=\"text\" data-kid=\"" + esc(k.id) + "\" data-field=\"name\" value=\"" + esc(k.name) + '" /></td>' +
          '<td class="t-center"><input type="checkbox" data-kid="' + esc(k.id) + '" data-field="active"' + (k.active !== false ? " checked" : "") + " /></td>" +
          '<td class="num">' + (counts[k.id] || 0).toLocaleString("id-ID") + "</td>" +
          '<td class="num">' + A.moneyPlain(budgets[k.id] || 0) + "</td>" +
          '<td><button class="btn sm icon danger" data-act="del-kategori" data-kid="' + esc(k.id) + '" title="Hapus">' + A.icon("trash") + "</button></td></tr>";
      });
    }
    html += "</tbody></table></div></div></div>";
    return html;
  }

  function dataHtml() {
    var size = 0;
    try { size = JSON.stringify(S.state).length; } catch (e) { size = 0; }
    var nEntries = S.state && S.state.entries ? S.state.entries.length : 0;
    var nBudget = S.state && S.state.budget ? S.state.budget.length : 0;
    var nImports = S.state && S.state.imports ? S.state.imports.length : 0;

    var html = '<div class="grid grid-12">';
    html += '<div class="card col-7"><div class="card-h"><div><h3>Backup & Restore</h3></div></div><div class="card-b">' +
      '<div class="row-actions">' +
      '<button class="btn primary" data-act="export-json">' + A.icon("download") + " Unduh Backup JSON</button>" +
      '<button class="btn" data-act="import-json">' + A.icon("upload") + " Pulihkan dari JSON</button>" +
      "</div><input type=\"file\" id=\"jsonFileInput\" accept=\".json,application/json\" hidden /></div></div>";

    html += '<div class="card col-5"><div class="card-h"><div><h3>Informasi Data</h3></div></div><div class="card-b">' +
      '<div class="stat-row"><span class="lbl">Jumlah transaksi</span><span class="val">' + nEntries.toLocaleString("id-ID") + "</span></div>" +
      '<div class="stat-row"><span class="lbl">Baris budget</span><span class="val">' + nBudget.toLocaleString("id-ID") + "</span></div>" +
      "</div></div></div>";
    return html;
  }

  function bindPanel() {
    var panel = $("#settingsPanel");
    if (!panel) return;

    panel.addEventListener("click", function (e) {
      var tab = e.target.closest("[data-tab]");
      if (tab) { ui.settingsTab = tab.getAttribute("data-tab"); render(); return; }
    });

    panel.addEventListener("change", function (e) {
      var el = e.target;
      if (el.classList.contains("budget-input")) {
        var bag = el.getAttribute("data-bag"), kat = el.getAttribute("data-kat");
        if (typeof S.setBudget === "function") {
          S.setBudget(ui.periodId, bag, kat, S.parseAmount(el.value));
          A.toast("Budget diperbarui.", "ok");
          render();
        }
      }
    });
  }

  function init() { bindPanel(); }
  function refreshSelects() {}

  A.register("settings", { init: init, render: render, refreshSelects: refreshSelects });
})();
