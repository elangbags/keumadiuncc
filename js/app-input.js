/* ============================================================
   app-input.js — form input biaya & riwayat transaksi
   ============================================================ */
(function () {
  "use strict";
  var A = window.CCA;
  var S = A.S;
  var $ = A.$;
  var ui = A.ui;
  var PAGE_SIZE = 9;

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function defaultDate() {
    var p = A.period();
    var today = S.todayISO();
    if (today.slice(0, 7) === p.id) return today;
    return p.id + "-" + pad(S.daysInMonth(p.id));
  }

  function refreshSelects() {
    var bagVal = $("#fBagian").value;
    var katVal = $("#fKategori").value;
    A.fillSelect($("#fBagian"), S.activeBagian().map(function (b) { return { id: b.id, name: b.name }; }), null, bagVal);
    A.fillSelect($("#fKategori"), S.activeKategori().map(function (k) { return { id: k.id, name: k.name }; }), null, katVal);
  }

  function updateWords() {
    var n = S.parseAmount($("#fAmount").value);
    $("#amountWords").textContent = n > 0 ? A.money(n) + " · " + A.terbilang(n) : "—";
  }

  function formatAmount() {
    var n = S.parseAmount($("#fAmount").value);
    $("#fAmount").value = n ? n.toLocaleString("id-ID") : "";
    updateWords();
  }

  function updateBudgetHint() {
    var host = $("#budgetHint");
    var bag = $("#fBagian").value, kat = $("#fKategori").value;
    if (!bag || !kat) {
      host.textContent = "Pilih bagian dan kategori untuk melihat posisi budget.";
      return;
    }
    var p = A.period();
    var budget = S.budgetFor(ui.periodId, bag, kat);
    var actual = S.sum({ periodId: ui.periodId, bagianId: bag, kategoriId: kat });
    var entered = S.parseAmount($("#fAmount").value);
    var after = actual + (ui.editingId ? 0 : entered);
    var left = budget - actual;

    if (!budget) {
      host.innerHTML = "<b>" + A.esc(S.bagianName(bag)) + " · " + A.esc(S.kategoriName(kat)) + "</b>" +
        '<div class="row"><span>Realisasi periode ini</span><b>' + A.money(actual) + "</b></div>" +
        '<div class="row muted"><span>Belum ada budget untuk kombinasi ini. Atur di menu Pengaturan → Budget.</span></div>';
      return;
    }
    var used = actual / budget;
    var pred = after / budget;
    var cls = used > 1 ? "bad" : used >= 0.9 ? "warn" : "";
    host.innerHTML =
      "<b>" + A.esc(S.bagianName(bag)) + " · " + A.esc(S.kategoriName(kat)) + "</b>" +
      '<div class="row"><span>Budget periode</span><b>' + A.money(budget) + "</b></div>" +
      '<div class="row"><span>Realisasi tercatat</span><b>' + A.money(actual) + "</b></div>" +
      '<div class="row"><span>' + (left >= 0 ? "Sisa budget" : "Over budget") + "</span><b style=\"color:" + (left >= 0 ? "#0f8a5f" : "#c0392b") + "\">" + A.money(Math.abs(left)) + "</b></div>" +
      '<div class="progress" style="margin-top:8px"><i class="' + cls + '" style="width:' + Math.min(100, used * 100) + '%"></i></div>' +
      '<div class="row small muted" style="margin-top:5px"><span>Terpakai ' + A.pct(used) + (entered > 0 ? " · prediksi " + A.pct(pred) : "") + "</span><span>" + (pred > 1 ? "melebihi budget" : "dalam budget") + "</span></div>";
  }

  function resetForm(keepSelection) {
    ui.editingId = null;
    $("#fId").value = "";
    $("#entryForm").reset();
    $("#fDate").value = defaultDate();
    $("#fUnit").value = ui.unit === "PADMA" || ui.unit === "KAMALA" ? ui.unit : "RS";
    if (keepSelection) {
      $("#fBagian").value = keepSelection.bagianId;
      $("#fKategori").value = keepSelection.kategoriId;
    }
    $("#fSource").value = "Input manual";
    $("#formTitle").textContent = "Input Biaya";
    $("#formMode").textContent = "Baru";
    $("#formMode").className = "badge brand";
    $("#cancelEditBtn").style.display = "none";
    $("#amountWords").textContent = "—";
    updateBudgetHint();
  }

  function startEdit(id) {
    var e = S.allEntries().filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    ui.editingId = e.id;
    $("#fId").value = e.id;
    $("#fDate").value = e.date;
    $("#fUnit").value = e.unit || "RS";
    $("#fBagian").value = e.bagianId;
    $("#fKategori").value = e.kategoriId;
    $("#fAmount").value = (e.amount || 0).toLocaleString("id-ID");
    $("#fNote").value = e.note || "";
    $("#fRef").value = e.ref || "";
    $("#fSource").value = e.source || "Input manual";
    $("#formTitle").textContent = "Edit Biaya";
    $("#formMode").textContent = "Edit";
    $("#formMode").className = "badge warn";
    $("#cancelEditBtn").style.display = "inline-flex";
    updateWords();
    updateBudgetHint();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(function () { $("#fAmount").focus(); }, 250);
  }

  function submitForm(again) {
    var bag = $("#fBagian").value, kat = $("#fKategori").value;
    var date = S.normalizeDate($("#fDate").value);
    var amount = S.parseAmount($("#fAmount").value);
    if (!date) { A.toast("Tanggal belum diisi dengan benar.", "bad"); $("#fDate").focus(); return; }
    if (!bag || !kat) { A.toast("Pilih bagian dan kategori terlebih dahulu.", "bad"); return; }
    if (!amount || amount <= 0) { A.toast("Nominal harus lebih besar dari 0.", "bad"); $("#fAmount").focus(); return; }

    var ym = date.slice(0, 7);
    if (!S.period(ym)) {
      S.addPeriod(ym, S.monthLabel(ym), 0, 0);
      A.refreshPeriods();
      A.toast("Periode " + S.monthLabel(ym) + " otomatis ditambahkan.", "warn");
    }

    var payload = {
      date: date,
      unit: $("#fUnit").value,
      bagianId: bag,
      kategoriId: kat,
      amount: amount,
      note: $("#fNote").value.trim(),
      ref: $("#fRef").value.trim(),
      source: ui.editingId ? ($("#fSource").value || "Input manual") : "Input manual"
    };

    if (ui.editingId) {
      var id = ui.editingId;
      S.updateEntry(id, payload);
      A.toast("Transaksi berhasil diperbarui.", "ok");
      resetForm(null);
      renderHistory();
    } else {
      S.addEntry(payload);
      A.toast("Transaksi " + A.money(amount) + " berhasil disimpan.", "ok");
      if (again) {
        var keep = { bagianId: bag, kategoriId: kat };
        resetForm(keep);
        $("#fNote").value = "";
        $("#fRef").value = "";
        setTimeout(function () { $("#fAmount").focus(); }, 50);
      } else {
        resetForm(null);
      }
      renderHistory();
    }
    updateBudgetHint();
    if (ui.periodId !== ym) {
      ui.periodId = ym;
      $("#globalPeriod").value = ym;
      S.state.settings.defaultPeriod = ym;
      S.save();
      A.refreshPeriods();
    }
  }

  /* ------------------------------ history ------------------------------ */
  function historyRows() {
    var opts = { periodId: ui.periodId, unit: ui.unit, search: ui.entrySearch };
    return S.entries(opts).sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt || "") < (a.createdAt || "") ? -1 : 1;
    });
  }

  function renderHistory() {
    var rows = historyRows();
    var total = rows.reduce(function (a, e) { return a + (e.amount || 0); }, 0);
    var pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (ui.entryPage > pages) ui.entryPage = pages;
    var start = (ui.entryPage - 1) * PAGE_SIZE;
    var page = rows.slice(start, start + PAGE_SIZE);

    $("#historySub").textContent = A.period().label + " · " + rows.length.toLocaleString("id-ID") + " transaksi · total " + A.money(total);

    var html = '<table class="table"><thead><tr><th>Tanggal</th><th>Bagian / Kategori</th><th class="num">Nominal</th><th>Keterangan</th><th>Sumber</th><th></th></tr></thead><tbody>';
    if (!page.length) html += A.emptyRow(ui.entrySearch ? "Tidak ada transaksi yang cocok." : "Belum ada transaksi. Tambahkan melalui form di samping.", 6);
    page.forEach(function (e) {
      html += "<tr>" +
        '<td class="nowrap">' + A.dateShort(e.date) + '<span class="sub">' + A.esc(e.unit || "RS") + "</span></td>" +
        '<td class="name">' + A.esc(S.bagianName(e.bagianId)) + '<span class="sub">' + A.esc(S.kategoriName(e.kategoriId)) + "</span></td>" +
        '<td class="num mono">' + A.moneyPlain(e.amount) + "</td>" +
        "<td>" + (e.note ? A.esc(e.note) : '<span class="muted">—</span>') + (e.ref ? '<span class="sub">' + A.esc(e.ref) + "</span>" : "") + "</td>" +
        '<td><span class="chip" title="' + A.esc(e.source || "") + '">' + A.esc(String(e.source || "—").slice(0, 26)) + "</span></td>" +
        '<td><div class="table-actions">' +
        '<button class="btn sm icon" data-act="edit" data-id="' + e.id + '" title="Edit">' + A.icon("edit") + "</button>" +
        '<button class="btn sm icon danger" data-act="del" data-id="' + e.id + '" title="Hapus">' + A.icon("trash") + "</button>" +
        "</div></td></tr>";
    });
    html += "</tbody></table>";
    $("#entryTable").innerHTML = html;

    $("#entryPageInfo").textContent = rows.length
      ? "Menampilkan " + (start + 1) + "–" + Math.min(rows.length, start + PAGE_SIZE) + " dari " + rows.length + " transaksi"
      : "0 transaksi";
    $("#entryPrev").disabled = ui.entryPage <= 1;
    $("#entryNext").disabled = ui.entryPage >= pages;
  }

  function render() {
    refreshSelects();
    if (!ui.editingId) {
      $("#fDate").value = defaultDate();
      $("#fUnit").value = ui.unit === "PADMA" || ui.unit === "KAMALA" ? ui.unit : "RS";
      if (!$("#fSource").value) $("#fSource").value = "Input manual";
    }
    updateBudgetHint();
    renderHistory();
  }

  function exportCsv() {
    var rows = historyRows();
    var head = ["Tanggal", "Unit", "Bagian", "Kategori", "Nominal", "Keterangan", "No. Bukti", "Sumber"];
    var out = [head];
    rows.forEach(function (e) {
      out.push([e.date, e.unit || "RS", S.bagianName(e.bagianId), S.kategoriName(e.kategoriId), e.amount, e.note || "", e.ref || "", e.source || ""]);
    });
    out.push(["", "", "", "TOTAL", rows.reduce(function (a, e) { return a + (e.amount || 0); }, 0), "", "", ""]);
    A.saveCsv(out, "transaksi-" + ui.periodId + ".csv");
    A.toast("CSV transaksi diunduh.", "ok");
  }

  /* ------------------------------ init ------------------------------ */
  function init() {
    refreshSelects();
    $("#fDate").value = defaultDate();
    $("#fAmount").addEventListener("input", updateWords);
    $("#fAmount").addEventListener("blur", formatAmount);
    $("#fDate").addEventListener("change", updateBudgetHint);
    $("#fUnit").addEventListener("change", updateBudgetHint);
    $("#fBagian").addEventListener("change", updateBudgetHint);
    $("#fKategori").addEventListener("change", updateBudgetHint);
    $("#entryForm").addEventListener("submit", function (e) { e.preventDefault(); submitForm(false); });
    $("#saveAgainBtn").addEventListener("click", function () { submitForm(true); });
    $("#cancelEditBtn").addEventListener("click", function () {
      resetForm(null);
      A.toast("Edit dibatalkan.", "ok");
      renderHistory();
    });
    $("#entryPrev").addEventListener("click", function () { if (ui.entryPage > 1) { ui.entryPage--; renderHistory(); } });
    $("#entryNext").addEventListener("click", function () { ui.entryPage++; renderHistory(); });

    var t = null;
    $("#entrySearch").addEventListener("input", function () {
      clearTimeout(t);
      var v = this.value;
      t = setTimeout(function () { ui.entrySearch = v.trim(); ui.entryPage = 1; renderHistory(); }, 220);
    });

    $("#exportEntriesCsv").addEventListener("click", exportCsv);

    $("#entryTable").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var id = btn.getAttribute("data-id");
      if (btn.getAttribute("data-act") === "edit") {
        startEdit(id);
      } else {
        var row = S.allEntries().filter(function (x) { return x.id === id; })[0];
        A.confirm("Hapus transaksi", "Hapus transaksi <b>" + A.esc(S.bagianName(row.bagianId)) + " · " + A.esc(S.kategoriName(row.kategoriId)) + "</b> sebesar <b>" + A.money(row.amount) + "</b> tanggal " + A.dateLong(row.date) + "?", "Hapus", function () {
          S.removeEntry(id);
          A.toast("Transaksi dihapus.", "ok");
          renderHistory();
          updateBudgetHint();
        }, true);
      }
    });
  }

  A.register("input", {
    init: init,
    render: render,
    refreshSelects: refreshSelects
  });
})();
