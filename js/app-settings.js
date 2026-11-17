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
    $("#settingsTabs").innerHTML = TABS.map(function (t) {
      return '<button data-tab="' + t.id + '" class="' + (ui.settingsTab === t.id ? "active" : "") + '">' + A.esc(t.label) + "</button>";
    }).join("");
  }

  function render() {
    renderTabs();
    var host = $("#settingsPanel");
    if (ui.settingsTab === "budget") host.innerHTML = budgetHtml();
    else if (ui.settingsTab === "periode") host.innerHTML = periodeHtml();
    else if (ui.settingsTab === "bagian") host.innerHTML = bagianHtml();
    else if (ui.settingsTab === "kategori") host.innerHTML = kategoriHtml();
    else host.innerHTML = dataHtml();
  }

  /* ============================================================
     BUDGET
     ============================================================ */
  function budgetLines() {
    var budget = {}, best = {};
    S.state.budget.forEach(function (b) {
      if (b.periodId !== ui.periodId) return;
      budget[b.bagianId + "|" + b.kategoriId] = b.amount || 0;
      best[b.bagianId + "|" + b.kategoriId] = true;
    });
    S.entries({ periodId: ui.periodId }).forEach(function (e) {
      best[e.bagianId + "|" + e.kategoriId] = true;
      if (!(e.bagianId + "|" + e.kategoriId in budget)) budget[e.bagianId + "|" + e.kategoriId] = 0;
    });
    var bagOrder = {}, katOrder = {};
    S.state.bagian.forEach(function (b, i) { bagOrder[b.id] = i; });
    S.state.kategori.forEach(function (k, i) { katOrder[k.id] = i; });
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
    var periods = S.periods();
    var idx = periods.map(function (p) { return p.id; }).indexOf(ui.periodId);
    var prev = idx >= 0 && idx + 1 < periods.length ? periods[idx + 1] : null;

    var actMap = {};
    S.entries({ periodId: ui.periodId }).forEach(function (e) {
      actMap[e.bagianId + "|" + e.kategoriId] = (actMap[e.bagianId + "|" + e.kategoriId] || 0) + (e.amount || 0);
    });

    var html = '<div class="card"><div class="card-h"><div><h3>Budget per Bagian & Kategori</h3>' +
      '<div class="sub">Periode ' + A.esc(A.period().label) + " · perubahan langsung tersimpan</div></div>" +
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
      var st = S.statusOf(act, l.amount);
      html += "<tr><td class=\"name\">" + A.esc(S.bagianName(l.bagianId)) + "</td>" +
        "<td>" + A.esc(S.kategoriName(l.kategoriId)) + "</td>" +
        '<td class="num"><input type="text" class="budget-input num" data-bag="' + A.esc(l.bagianId) + '" data-kat="' + A.esc(l.kategoriId) + '" value="' + l.amount + '" style="min-height:30px;padding:4px 8px;width:130px;margin-left:auto;display:block" /></td>' +
        '<td class="num">' + A.moneyPlain(act) + "</td>" +
        '<td class="num">' + (pct == null ? "—" : A.pct(pct)) + "</td>" +
        "<td>" + A.statusBadge({ status: st }) + "</td></tr>";
    });
    html += '</tbody><tfoot><tr><td colspan="2">TOTAL (' + shown.length + " baris)</td>" +
      '<td class="num">' + A.moneyPlain(total) + '</td><td class="num">' + A.moneyPlain(shown.reduce(function (a, l) { return a + (actMap[l.bagianId + "|" + l.kategoriId] || 0); }, 0)) + "</td><td></td><td></td></tr></tfoot></table></div>";
    html += '<div class="hint-box" style="margin-top:12px">Angka budget awal berasal dari <b>LEMBAR ANALISA</b> workbook Cost Containment. ' +
      "Ubah nilai di kolom Budget lalu tekan Tab / klik di luar kolom untuk menyimpan otomatis.</div>";
    html += "</div></div>";
    return html;
  }

  /* ============================================================
     PERIODE
     ============================================================ */
  function periodeHtml() {
    var list = S.periods().slice().sort(function (a, b) { return a.id < b.id ? 1 : -1; });
    var html = '<div class="card"><div class="card-h"><div><h3>Periode & Pendapatan</h3>' +
      '<div class="sub">Pendapatan dipakai untuk menghitung rasio biaya</div></div></div><div class="card-b">';
    html += '<div class="table-wrap"><table class="table compact"><thead><tr>' +
      "<th>Periode</th><th class=\"num\">Pendapatan</th><th class=\"num\">PADMA</th><th class=\"num\">KAMALA</th><th class=\"num\">Target</th><th class=\"num\">Hari</th><th></th>" +
      "</tr></thead><tbody>";
    list.forEach(function (p) {
      html += "<tr><td class=\"name\">" + A.esc(p.label) + '<span class="sub">' + A.esc(p.id) + "</span></td>" +
        '<td class="num"><input type="text" class="num" data-pid="' + esc(p.id) + '" data-field="revenue" value="' + (p.revenue || 0) + '" /></td>' +
        '<td class="num"><input type="text" class="num" data-pid="' + esc(p.id) + '" data-field="revenuePadma" value="' + (p.revenuePadma || 0) + '" /></td>' +
        '<td class="num"><input type="text" class="num" data-pid="' + esc(p.id) + '" data-field="revenueKamala" value="' + (p.revenueKamala || 0) + '" /></td>' +
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
      '<button class="btn primary" type="submit">' + A.icon("plus") + " Tambah</button></form>" +
      '<div class="small muted" style="margin-top:8px">Budget periode baru otomatis disalin dari periode sebelumnya.</div>';
    html += "</div></div>";
    return html;
  }

  function esc(s) { return A.esc(s); }

  /* ============================================================
     BAGIAN
     ============================================================ */
  function bagianHtml() {
    var counts = {}, budgets = {};
    S.state.entries.forEach(function (e) { counts[e.bagianId] = (counts[e.bagianId] || 0) + 1; });
    S.state.budget.forEach(function (b) {
      if (b.periodId === ui.periodId) budgets[b.bagianId] = (budgets[b.bagianId] || 0) + b.amount;
    });
    var html = '<div class="card"><div class="card-h"><div><h3>Master Bagian / Cost Center</h3>' +
      '<div class="sub">Nonaktifkan bagian agar tidak muncul pada pilihan input</div></div></div><div class="card-b">';
    html += '<div class="table-wrap"><table class="table compact"><thead><tr><th>Nama bagian</th><th>Grup</th><th class="t-center">Aktif</th><th class="num">Transaksi</th><th class="num">Budget</th><th></th></tr></thead><tbody>';
    S.state.bagian.forEach(function (b) {
      html += "<tr><td><input type=\"text\" data-bid=\"" + esc(b.id) + "\" data-field=\"name\" value=\"" + esc(b.name) + '" /></td>' +
        '<td><select data-bid="' + esc(b.id) + '" data-field="group">' +
        ["Biaya Langsung", "Biaya Tidak Langsung"].map(function (g) { return '<option value="' + g + '"' + (b.group === g ? " selected" : "") + ">" + g + "</option>"; }).join("") +
        "</select></td>" +
        '<td class="t-center"><input type="checkbox" data-bid="' + esc(b.id) + '" data-field="active"' + (b.active !== false ? " checked" : "") + " /></td>" +
        '<td class="num">' + (counts[b.id] || 0).toLocaleString("id-ID") + "</td>" +
        '<td class="num">' + A.moneyPlain(budgets[b.id] || 0) + "</td>" +
        '<td><button class="btn sm icon danger" data-act="del-bagian" data-bid="' + esc(b.id) + '" title="Hapus">' + A.icon("trash") + "</button></td></tr>";
    });
    html += "</tbody></table></div>";
    html += '<div class="section-title"><h2>Tambah bagian</h2><div class="line"></div></div>' +
      '<form id="addBagianForm" class="row-actions" style="align-items:flex-end">' +
      '<div class="field" style="max-width:280px"><label>Nama bagian</label><input type="text" id="newBagianName" placeholder="Contoh: Hemodialisa" required /></div>' +
      '<div class="field" style="max-width:230px"><label>Grup</label><select id="newBagianGroup"><option>Biaya Langsung</option><option>Biaya Tidak Langsung</option></select></div>' +
      '<button class="btn primary" type="submit">' + A.icon("plus") + " Tambah</button></form>";
    html += "</div></div>";
    return html;
  }

  /* ============================================================
     KATEGORI
     ============================================================ */
  function kategoriHtml() {
    var counts = {}, budgets = {};
    S.state.entries.forEach(function (e) { counts[e.kategoriId] = (counts[e.kategoriId] || 0) + 1; });
    S.state.budget.forEach(function (b) {
      if (b.periodId === ui.periodId) budgets[b.kategoriId] = (budgets[b.kategoriId] || 0) + b.amount;
    });
    var html = '<div class="card"><div class="card-h"><div><h3>Master Kategori Biaya</h3>' +
      '<div class="sub">Kategori dipakai untuk memisahkan pos biaya pada input dan rekap</div></div></div><div class="card-b">';
    html += '<div class="table-wrap" style="max-height:520px"><table class="table compact"><thead><tr><th>Nama kategori</th><th class="t-center">Aktif</th><th class="num">Transaksi</th><th class="num">Budget</th><th></th></tr></thead><tbody>';
    S.state.kategori.forEach(function (k) {
      html += "<tr><td><input type=\"text\" data-kid=\"" + esc(k.id) + "\" data-field=\"name\" value=\"" + esc(k.name) + '" /></td>' +
        '<td class="t-center"><input type="checkbox" data-kid="' + esc(k.id) + '" data-field="active"' + (k.active !== false ? " checked" : "") + " /></td>" +
        '<td class="num">' + (counts[k.id] || 0).toLocaleString("id-ID") + "</td>" +
        '<td class="num">' + A.moneyPlain(budgets[k.id] || 0) + "</td>" +
        '<td><button class="btn sm icon danger" data-act="del-kategori" data-kid="' + esc(k.id) + '" title="Hapus">' + A.icon("trash") + "</button></td></tr>";
    });
    html += "</tbody></table></div>";
    html += '<div class="section-title"><h2>Tambah kategori</h2><div class="line"></div></div>' +
      '<form id="addKategoriForm" class="row-actions" style="align-items:flex-end">' +
      '<div class="field" style="max-width:320px"><label>Nama kategori</label><input type="text" id="newKategoriName" placeholder="Contoh: Pemeliharaan AC" required /></div>' +
      '<button class="btn primary" type="submit">' + A.icon("plus") + " Tambah</button></form>";
    html += "</div></div>";
    return html;
  }

  /* ============================================================
     DATA & BACKUP
     ============================================================ */
  function dataHtml() {
    var size = 0;
    try { size = JSON.stringify(S.state).length; } catch (e) { size = 0; }
    var nEntries = S.state.entries.length;
    var nBudget = S.state.budget.length;
    var nImports = (S.state.imports || []).length;

    var html = '<div class="grid grid-12">';
    html += '<div class="card col-7"><div class="card-h"><div><h3>Backup & Restore</h3>' +
      '<div class="sub">Simpan seluruh data ke file JSON atau pulihkan kembali</div></div></div><div class="card-b">' +
      '<div class="row-actions">' +
      '<button class="btn primary" data-act="export-json">' + A.icon("download") + " Unduh Backup JSON</button>" +
      '<button class="btn" data-act="import-json">' + A.icon("upload") + " Pulihkan dari JSON</button>" +
      '<button class="btn" data-act="export-xlsx">' + A.icon("download") + " Semua Transaksi (Excel)</button>" +
      '<button class="btn" data-act="export-csv">' + A.icon("download") + " Semua Transaksi (CSV)</button>" +
      "</div>" +
      '<input type="file" id="jsonFileInput" accept=".json,application/json" hidden />' +
      '<div class="hint-box" style="margin-top:12px">Backup JSON berisi seluruh transaksi, budget, periode, dan master data. ' +
      "Simpan file ini secara berkala. Restore akan <b>mengganti seluruh data</b> yang ada saat ini.</div>" +
      "</div></div>";

    html += '<div class="card col-5"><div class="card-h"><div><h3>Informasi Data</h3>' +
      '<div class="sub">Ringkasan isi penyimpanan browser</div></div></div><div class="card-b">' +
      '<div class="stat-row"><span class="lbl">Jumlah transaksi</span><span class="val">' + nEntries.toLocaleString("id-ID") + "</span></div>" +
      '<div class="stat-row"><span class="lbl">Baris budget</span><span class="val">' + nBudget.toLocaleString("id-ID") + "</span></div>" +
      '<div class="stat-row"><span class="lbl">Periode</span><span class="val">' + S.state.periods.length + "</span></div>" +
      '<div class="stat-row"><span class="lbl">Riwayat upload</span><span class="val">' + nImports + "</span></div>" +
      '<div class="stat-row"><span class="lbl">Ukuran data</span><span class="val">' + (size / 1024).toFixed(1) + " KB</span></div>" +
      '<div class="stat-row"><span class="lbl">Penyimpanan</span><span class="val">localStorage</span></div>' +
      "</div></div>";

    html += '<div class="card col-7"><div class="card-h"><div><h3>Zona Hati-hati</h3>' +
      '<div class="sub">Tindakan berikut tidak dapat dibatalkan</div></div></div><div class="card-b">' +
      '<div class="row-actions">' +
      '<button class="btn danger" data-act="clear-entries">Kosongkan semua transaksi</button>' +
      '<button class="btn danger" data-act="reset-demo">Reset ke data contoh Oktober 2026</button>' +
      '<button class="btn danger" data-act="reset-empty">Mulai dari nol (kosong)</button>' +
      "</div>" +
      '<div class="small muted" style="margin-top:10px">Disarankan mengunduh backup JSON terlebih dahulu sebelum melakukan reset.</div>' +
      "</div></div>";

    html += '<div class="card col-5"><div class="card-h"><div><h3>Riwayat Upload</h3>' +
      '<div class="sub">30 unggahan terakhir</div></div></div><div class="card-b">';
    var list = (S.state.imports || []).slice(0, 8);
    if (!list.length) html += '<div class="empty" style="padding:16px">Belum ada riwayat upload.</div>';
    else {
      html += list.map(function (im) {
        return '<div class="stat-row"><span class="lbl">' + A.esc(im.fileName) + '<br /><span class="small">' + A.timeShort(im.at) + "</span></span>" +
          '<span class="val">' + (im.rows || 0).toLocaleString("id-ID") + " baris</span></div>";
      }).join("");
    }
    html += "</div></div>";

    html += "</div>";
    return html;
  }

  /* ============================================================
     EVENTS
     ============================================================ */
  function bindPanel() {
    var panel = $("#settingsPanel");

    panel.addEventListener("click", function (e) {
      var tab = e.target.closest("[data-tab]");
      if (tab) { ui.settingsTab = tab.getAttribute("data-tab"); render(); return; }
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var act = btn.getAttribute("data-act");

      if (act === "dl-budget") { $("#dlTemplateBudget").click(); }
      if (act === "copy-budget") copyBudgetFromPrev();
      if (act === "add-budget") openAddBudget();
      if (act === "del-period") delPeriod(btn.getAttribute("data-pid"));
      if (act === "del-bagian") delBagian(btn.getAttribute("data-bid"));
      if (act === "del-kategori") delKategori(btn.getAttribute("data-kid"));
      if (act === "export-json") exportJson();
      if (act === "import-json") $("#jsonFileInput").click();
      if (act === "export-xlsx") exportAllXlsx();
      if (act === "export-csv") exportAllCsv();
      if (act === "clear-entries") clearEntries();
      if (act === "reset-demo") resetDemo();
      if (act === "reset-empty") resetEmpty();
    });

    panel.addEventListener("change", function (e) {
      var el = e.target;
      if (el.id === "jsonFileInput") { importJsonFile(el.files && el.files[0]); return; }

      if (el.classList.contains("budget-input")) {
        var bag = el.getAttribute("data-bag"), kat = el.getAttribute("data-kat");
        S.setBudget(ui.periodId, bag, kat, S.parseAmount(el.value));
        A.toast("Budget diperbarui.", "ok");
        render();
        return;
      }
      if (el.id === "budgetSearch") return;

      var pid = el.getAttribute("data-pid");
      if (pid) {
        var field = el.getAttribute("data-field");
        var patch = {};
        if (field === "days") patch[field] = S.num(el.value);
        else if (field === "label") patch[field] = el.value;
        else patch[field] = S.parseAmount(el.value);
        S.updatePeriod(pid, patch);
        A.refreshPeriods();
        A.toast("Data periode diperbarui.", "ok");
        render();
        return;
      }
      var bid = el.getAttribute("data-bid");
      if (bid) {
        var b = S.bagian(bid);
        if (!b) return;
        var f = el.getAttribute("data-field");
        if (f === "name") {
          var v = String(el.value || "").trim();
          if (!v) { A.toast("Nama bagian tidak boleh kosong.", "bad"); render(); return; }
          b.name = v;
        } else if (f === "group") b.group = el.value;
        else if (f === "active") b.active = el.checked;
        S.save();
        A.refreshMasterSelects();
        A.toast("Master bagian diperbarui.", "ok");
        render();
        return;
      }
      var kid = el.getAttribute("data-kid");
      if (kid) {
        var k = S.kategori(kid);
        if (!k) return;
        var kf = el.getAttribute("data-field");
        if (kf === "name") {
          var kv = String(el.value || "").trim();
          if (!kv) { A.toast("Nama kategori tidak boleh kosong.", "bad"); render(); return; }
          k.name = kv;
        } else if (kf === "active") k.active = el.checked;
        S.save();
        A.refreshMasterSelects();
        A.toast("Master kategori diperbarui.", "ok");
        render();
        return;
      }
    });

    panel.addEventListener("submit", function (e) {
      e.preventDefault();
      if (e.target.id === "addPeriodForm") {
        var month = $("#newPeriodMonth").value;
        if (!/^\d{4}-\d{2}$/.test(month)) { A.toast("Pilih bulan terlebih dahulu.", "bad"); return; }
        if (S.period(month)) { A.toast("Periode tersebut sudah ada.", "bad"); return; }
        S.addPeriod(month, S.monthLabel(month), S.parseAmount($("#newPeriodRevenue").value), S.parseAmount($("#newPeriodTarget").value));
        A.refreshPeriods();
        A.toast("Periode " + S.monthLabel(month) + " ditambahkan.", "ok");
        render();
        return;
      }
      if (e.target.id === "addBagianForm") {
        var name = $("#newBagianName").value.trim();
        if (!name) return;
        var nb = S.addBagian(name, $("#newBagianGroup").value);
        if (nb) {
          A.refreshMasterSelects();
          A.toast("Bagian " + nb.name + " ditambahkan.", "ok");
          render();
        }
        return;
      }
      if (e.target.id === "addKategoriForm") {
        var kn = $("#newKategoriName").value.trim();
        if (!kn) return;
        var nk = S.addKategori(kn);
        if (nk) {
          A.refreshMasterSelects();
          A.toast("Kategori " + nk.name + " ditambahkan.", "ok");
          render();
        }
        return;
      }
    });

    var search = $("#budgetSearch");
    if (search) {
      search.addEventListener("input", function () {
        var v = this.value;
        clearTimeout(search._t);
        search._t = setTimeout(function () {
          var pos = search.selectionStart;
          render();
          var ns = $("#budgetSearch");
          if (ns) { ns.value = v; ns.focus(); ns.setSelectionRange(pos, pos); }
        }, 240);
      });
    }
  }

  /* ------------------------------ actions ------------------------------ */
  function copyBudgetFromPrev() {
    var list = S.periods().map(function (p) { return p.id; }).sort();
    var i = list.indexOf(ui.periodId);
    if (i <= 0) { A.toast("Tidak ada periode sebelumnya.", "bad"); return; }
    var prev = list[i - 1];
    A.confirm("Salin budget", "Salin seluruh budget dari periode <b>" + A.esc(S.monthLabel(prev)) + "</b> ke <b>" + A.esc(A.period().label) + "</b>? Nilai budget periode ini akan ditimpa.", "Salin", function () {
      var n = S.copyBudget(prev, ui.periodId);
      A.toast(n + " baris budget disalin.", "ok");
      render();
    });
  }

  function openAddBudget() {
    var bagOpts = S.activeBagian().map(function (b) { return '<option value="' + A.esc(b.id) + '">' + A.esc(b.name) + "</option>"; }).join("");
    var katOpts = S.activeKategori().map(function (k) { return '<option value="' + A.esc(k.id) + '">' + A.esc(k.name) + "</option>"; }).join("");
    A.openModal("Tambah baris budget",
      '<div class="form-grid">' +
      '<div class="field"><label>Bagian</label><select id="mbBagian">' + bagOpts + "</select></div>" +
      '<div class="field"><label>Kategori</label><select id="mbKategori">' + katOpts + "</select></div>" +
      '<div class="field span-2"><label>Budget (Rp)</label><input type="text" id="mbAmount" placeholder="0" /></div>' +
      "</div>",
      [
        { label: "Batal", className: "ghost" },
        {
          label: "Simpan", className: "primary", onClick: function () {
            var bag = $("#mbBagian").value, kat = $("#mbKategori").value;
            var amt = S.parseAmount($("#mbAmount").value);
            S.setBudget(ui.periodId, bag, kat, amt);
            A.toast("Budget " + S.bagianName(bag) + " · " + S.kategoriName(kat) + " disimpan.", "ok");
            setTimeout(render, 60);
          }
        }
      ]);
  }

  function delPeriod(id) {
    A.confirm("Hapus periode", "Hapus periode <b>" + A.esc(S.monthLabel(id)) + "</b> beserta seluruh transaksi dan budget di dalamnya?", "Hapus", function () {
      if (S.removePeriod(id)) {
        if (ui.periodId === id) ui.periodId = S.periods()[0].id;
        A.refreshPeriods();
        A.toast("Periode dihapus.", "ok");
        render();
      } else A.toast("Minimal harus ada satu periode.", "bad");
    }, true);
  }

  function delBagian(id) {
    var nE = S.state.entries.filter(function (e) { return e.bagianId === id; }).length;
    if (nE) { A.toast("Bagian tidak bisa dihapus karena masih memiliki " + nE + " transaksi. Nonaktifkan saja.", "bad"); return; }
    A.confirm("Hapus bagian", "Hapus bagian <b>" + A.esc(S.bagianName(id)) + "</b> dan seluruh baris budget-nya?", "Hapus", function () {
      S.state.bagian = S.state.bagian.filter(function (b) { return b.id !== id; });
      S.state.budget = S.state.budget.filter(function (b) { return b.bagianId !== id; });
      S.save();
      A.refreshMasterSelects();
      A.toast("Bagian dihapus.", "ok");
      render();
    }, true);
  }

  function delKategori(id) {
    var nE = S.state.entries.filter(function (e) { return e.kategoriId === id; }).length;
    if (nE) { A.toast("Kategori tidak bisa dihapus karena masih memiliki " + nE + " transaksi. Nonaktifkan saja.", "bad"); return; }
    A.confirm("Hapus kategori", "Hapus kategori <b>" + A.esc(S.kategoriName(id)) + "</b> dan seluruh baris budget-nya?", "Hapus", function () {
      S.state.kategori = S.state.kategori.filter(function (k) { return k.id !== id; });
      S.state.budget = S.state.budget.filter(function (b) { return b.kategoriId !== id; });
      S.save();
      A.refreshMasterSelects();
      A.toast("Kategori dihapus.", "ok");
      render();
    }, true);
  }

  function exportJson() {
    A.downloadBlob(new Blob([S.exportJson()], { type: "application/json" }), "backup-cost-containment-" + S.todayISO() + ".json");
    A.toast("Backup JSON diunduh.", "ok");
  }

  function importJsonFile(file) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        S.importJson(String(fr.result || ""));
        ui.periodId = S.state.settings.defaultPeriod || S.periods()[0].id;
        A.refreshPeriods();
        A.refreshMasterSelects();
        A.toast("Data berhasil dipulihkan dari backup.", "ok");
        A.afterDataChange();
        render();
      } catch (e) {
        console.error(e);
        A.toast("Gagal memulihkan backup: " + e.message, "bad");
      }
    };
    fr.onerror = function () { A.toast("Gagal membaca file backup.", "bad"); };
    fr.readAsText(file);
  }

  function allEntryRows() {
    var rows = [["Tanggal", "Unit", "Bagian", "Kategori", "Nominal", "Keterangan", "No. Bukti", "Sumber"]];
    S.allEntries().slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).forEach(function (e) {
      rows.push([e.date, e.unit || "RS", S.bagianName(e.bagianId), S.kategoriName(e.kategoriId), e.amount, e.note || "", e.ref || "", e.source || ""]);
    });
    return rows;
  }

  function exportAllXlsx() {
    var rows = allEntryRows();
    A.saveXlsx([
      { name: "TRANSAKSI", rows: rows, widths: [12, 9, 26, 28, 15, 40, 16, 30], moneyCols: [4], autoFilter: true }
    ], "semua-transaksi-cost-containment.xlsx");
  }

  function exportAllCsv() {
    A.saveCsv(allEntryRows(), "semua-transaksi-cost-containment.csv");
    A.toast("CSV semua transaksi diunduh.", "ok");
  }

  function clearEntries() {
    A.confirm("Kosongkan transaksi", "Semua <b>" + S.state.entries.length.toLocaleString("id-ID") + "</b> transaksi akan dihapus. Budget, periode, dan master data tetap dipertahankan.", "Kosongkan", function () {
      S.state.entries = [];
      S.save();
      A.afterDataChange();
      render();
      A.toast("Semua transaksi dihapus.", "ok");
    }, true);
  }

  function resetDemo() {
    A.confirm("Reset ke data contoh", "Seluruh data saat ini akan diganti dengan <b>data contoh Oktober 2026</b> (sesuai workbook Cost Containment). Lanjutkan?", "Reset", function () {
      S.reset(true);
      ui.periodId = S.state.settings.defaultPeriod || S.periods()[0].id;
      A.refreshPeriods();
      A.refreshMasterSelects();
      A.afterDataChange();
      render();
      A.toast("Data contoh berhasil dimuat kembali.", "ok");
    }, true);
  }

  function resetEmpty() {
    A.confirm("Mulai dari nol", "Seluruh transaksi akan dihapus dan budget dikosongkan. Master bagian, kategori, dan periode tetap tersedia. Lanjutkan?", "Mulai dari nol", function () {
      S.reset(false);
      ui.periodId = S.state.settings.defaultPeriod || S.periods()[0].id;
      A.refreshPeriods();
      A.refreshMasterSelects();
      A.afterDataChange();
      render();
      A.toast("Data dikosongkan. Sistem siap menerima input baru.", "ok");
    }, true);
  }

  function init() {
    bindPanel();
  }

  function refreshSelects() {
    // tab aktif dipertahankan; tidak perlu tindakan khusus
  }

  A.register("settings", { init: init, render: render, refreshSelects: refreshSelects });
})();
