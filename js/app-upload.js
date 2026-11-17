/* ============================================================
   app-upload.js — menu upload, pratinjau, templat & impor
   ============================================================ */
(function () {
  "use strict";
  var A = window.CCA;
  var S = A.S;
  var X = null;
  var $ = A.$;
  var ui = A.ui;
  var LIMIT = 200;

  function init() {
    X = window.CCX;
    var dz = $("#dropzone");
    var fi = $("#fileInput");
    dz.addEventListener("click", function () { fi.click(); });
    fi.addEventListener("change", function () {
      if (fi.files && fi.files[0]) handleFile(fi.files[0]);
      fi.value = "";
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("drag"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("drag"); });
    });
    dz.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    $("#dlTemplate").addEventListener("click", function () { downloadInputTemplate(false); });
    $("#dlTemplateDemo").addEventListener("click", function () { downloadInputTemplate(true); });
    $("#dlTemplateBudget").addEventListener("click", downloadBudgetTemplate);

    $("#previewArea").addEventListener("change", onPreviewChange);
    $("#previewArea").addEventListener("click", onPreviewClick);
  }

  /* ------------------------------ read file ------------------------------ */
  function readAsText(file) {
    return new Promise(function (resolve, reject) {
      if (file.text) { file.text().then(resolve, reject); return; }
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result || "")); };
      fr.onerror = function () { reject(fr.error || new Error("Gagal membaca file.")); };
      fr.readAsText(file);
    });
  }

  function readAsBuffer(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error("Gagal membaca file.")); };
      fr.readAsArrayBuffer(file);
    });
  }

  async function handleFile(file) {
    var name = file.name || "file";
    var ext = (name.split(".").pop() || "").toLowerCase();
    $("#previewArea").innerHTML = '<div class="empty">Memproses <b>' + A.esc(name) + "</b>…</div>";
    $("#uploadType").textContent = "Membaca…";
    $("#uploadType").className = "badge info";

    try {
      var sheets;
      if (ext === "csv" || ext === "txt") {
        var text = await readAsText(file);
        sheets = [{ name: "CSV", rows: X.parseCsv(text) }];
      } else if (ext === "xlsx" || ext === "xlsm") {
        if (!X || !X.readWorkbook) throw new Error("Pembaca Excel tidak tersedia.");
        var buf = await readAsBuffer(file);
        var wb = await X.readWorkbook(buf);
        sheets = wb.sheets;
        if (!sheets.length) throw new Error("Tidak ada worksheet yang bisa dibaca.");
      } else {
        throw new Error("Format file tidak didukung. Gunakan .xlsx, .xlsm, atau .csv.");
      }

      var parsed = A.parser.parseAll(sheets);
      if (!parsed || !parsed.rows.length) {
        throw new Error("Tidak ada baris biaya yang terbaca. Pastikan file memakai template standar atau workbook Cost Containment.");
      }

      var rows = parsed.rows.map(function (r) {
        return {
          date: r.date,
          unit: (r.unit || "RS").toUpperCase(),
          bagianId: r.bagianId || "",
          kategoriId: r.kategoriId || "",
          bagianRaw: r.bagianRaw || "",
          kategoriRaw: r.kategoriRaw || "",
          amount: Math.round(r.amount || 0),
          note: r.note || "",
          ref: r.ref || "",
          source: r.source || "Upload",
          include: true,
          errors: [],
          dup: false
        };
      });

      var existing = {};
      S.allEntries().forEach(function (e) { existing[keyOf(e)] = true; });
      var seen = {};
      rows.forEach(function (r) {
        validate(r);
        var k = keyOf(r);
        if (existing[k]) r.dup = true;
        if (seen[k]) r.dup = true;
        seen[k] = true;
      });

      ui.preview = {
        fileName: name,
        size: file.size || 0,
        type: parsed.type,
        sheets: parsed.sheets || [],
        periodId: parsed.periodId || "",
        rows: rows,
        editMode: false,
        skipDup: false,
        mode: "append"
      };
      $("#uploadType").textContent = parsed.type === "template" ? "Template standar" : "Workbook Cost Containment";
      $("#uploadType").className = "badge " + (parsed.type === "template" ? "info" : "brand");
      renderFileList();
      renderPreview();
    } catch (e) {
      console.error(e);
      ui.preview = null;
      renderFileList();
      $("#uploadType").textContent = "Gagal membaca";
      $("#uploadType").className = "badge bad";
      $("#previewArea").innerHTML = '<div class="hint-box" style="background:#fdecea;border-color:#f3c9c4;color:#8e2a1f">' +
        "<b>File tidak dapat dibaca.</b><br />" + A.esc(e.message || e) + "</div>";
      A.toast("Gagal membaca file: " + (e.message || e), "bad");
    }
  }

  function keyOf(r) {
    return r.date + "|" + r.bagianId + "|" + r.kategoriId + "|" + Math.round(r.amount || 0);
  }

  function validate(r) {
    r.errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || "")) r.errors.push("Tanggal tidak valid");
    if (!r.bagianId) r.errors.push("Bagian tidak dikenali" + (r.bagianRaw ? ": " + r.bagianRaw : ""));
    if (!r.kategoriId) r.errors.push("Kategori tidak dikenali" + (r.kategoriRaw ? ": " + r.kategoriRaw : ""));
    if (!r.amount || r.amount <= 0) r.errors.push("Nominal tidak valid");
  }

  /* ------------------------------ file list & history ------------------------------ */
  function renderFileList() {
    var host = $("#fileList");
    if (!ui.preview) { host.innerHTML = ""; return; }
    var size = ui.preview.size > 1024 * 1024
      ? (ui.preview.size / 1024 / 1024).toFixed(1) + " MB"
      : Math.max(1, Math.round(ui.preview.size / 1024)) + " KB";
    host.innerHTML = '<div class="file-pill">' + A.icon("file") + "<b>" + A.esc(ui.preview.fileName) + "</b>" +
      '<span class="muted">' + size + " · " + ui.preview.rows.length + " baris</span>" +
      '<span class="x" data-clear="1" title="Hapus">' + A.icon("close") + "</span></div>";
    var x = $("[data-clear]", host);
    if (x) x.addEventListener("click", function () { clearPreview(); });
  }

  function clearPreview() {
    ui.preview = null;
    $("#previewArea").innerHTML = "";
    $("#uploadType").textContent = "Belum ada file";
    $("#uploadType").className = "badge info";
    renderFileList();
  }

  function renderHistory() {
    var host = $("#importHistory");
    var list = S.state.imports || [];
    if (!list.length) {
      host.innerHTML = '<div class="empty" style="padding:16px">Belum ada riwayat upload.</div>';
      return;
    }
    host.innerHTML = list.slice(0, 5).map(function (im) {
      return '<div class="stat-row"><span class="lbl">' + A.esc(im.fileName) + '<br /><span class="small">' + A.timeShort(im.at) + "</span></span>" +
        '<span class="val">' + (im.rows || 0).toLocaleString("id-ID") + " baris</span></div>";
    }).join("");
  }

  /* ------------------------------ preview ------------------------------ */
  function activeBagianOptions(current, placeholder) {
    var html = placeholder ? '<option value="">' + A.esc(placeholder) + "</option>" : "";
    S.activeBagian().forEach(function (b) {
      html += '<option value="' + A.esc(b.id) + '"' + (b.id === current ? " selected" : "") + ">" + A.esc(b.name) + "</option>";
    });
    if (current && !S.bagian(current)) html += '<option value="' + A.esc(current) + '" selected>' + A.esc(current) + "</option>";
    return html;
  }

  function activeKategoriOptions(current, placeholder) {
    var html = placeholder ? '<option value="">' + A.esc(placeholder) + "</option>" : "";
    S.activeKategori().forEach(function (k) {
      html += '<option value="' + A.esc(k.id) + '"' + (k.id === current ? " selected" : "") + ">" + A.esc(k.name) + "</option>";
    });
    if (current && !S.kategori(current)) html += '<option value="' + A.esc(current) + '" selected>' + A.esc(current) + "</option>";
    return html;
  }

  function previewStats() {
    var p = ui.preview;
    var valid = 0, invalid = 0, dups = 0, selected = 0, sum = 0;
    p.rows.forEach(function (r) {
      if (r.errors.length) invalid++; else valid++;
      if (r.dup) dups++;
      if (r.include && !r.errors.length) { selected++; sum += r.amount; }
    });
    return { valid: valid, invalid: invalid, dups: dups, selected: selected, sum: sum, total: p.rows.length };
  }

  function renderPreview() {
    var p = ui.preview;
    if (!p) return;
    var st = previewStats();
    var periods = {};
    p.rows.forEach(function (r) { periods[r.date.slice(0, 7)] = 1; });
    var periodTxt = Object.keys(periods).sort().map(function (id) { return S.monthLabel(id); }).join(", ");

    var html = '<div class="preview-summary">' +
      '<div class="ps"><span class="muted">Baris</span><b>' + st.total.toLocaleString("id-ID") + "</b></div>" +
      '<div class="ps"><span class="muted">Valid</span><b style="color:#0f8a5f">' + st.valid + "</b></div>" +
      '<div class="ps"><span class="muted">Bermasalah</span><b style="color:' + (st.invalid ? "#c0392b" : "#64748b") + '">' + st.invalid + "</b></div>" +
      '<div class="ps"><span class="muted">Duplikat</span><b style="color:' + (st.dups ? "#b4690e" : "#64748b") + '">' + st.dups + "</b></div>" +
      '<div class="ps"><span class="muted">Dipilih</span><b>' + st.selected + "</b></div>" +
      '<div class="ps"><span class="muted">Total</span><b>' + A.money(st.sum) + "</b></div>" +
      "</div>";

    html += '<div class="row-actions" style="align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
      '<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pvEdit"' + (p.editMode ? " checked" : "") + " /> Ubah pemetaan</label>" +
      '<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pvSkipDup"' + (p.skipDup ? " checked" : "") + " /> Lewati duplikat</label>" +
      '<div class="spacer" style="flex:1"></div>' +
      '<select id="pvMode" style="width:auto;min-width:190px"><option value="append"' + (p.mode === "append" ? " selected" : "") + ">Tambahkan ke data</option>" +
      '<option value="replace"' + (p.mode === "replace" ? " selected" : "") + ">Ganti data periode</option></select>" +
      '<button class="btn sm" data-pv="all">Pilih semua</button>' +
      '<button class="btn sm" data-pv="none">Kosongkan</button>' +
      "</div>";

    if (st.invalid) {
      html += '<div class="hint-box" style="background:#fff7ed;border-color:#f3d9b5;color:#8a5a12;margin-bottom:10px">' +
        "<b>" + st.invalid + " baris perlu diperbaiki.</b> Aktifkan <i>Ubah pemetaan</i> lalu pilih bagian/kategori yang benar, atau baris tersebut akan dilewati.</div>";
    }
    if (st.dups && p.mode === "append") {
      html += '<div class="hint-box" style="background:#fffaf0;border-color:#f3e2c4;color:#8a5a12;margin-bottom:10px">' +
        "<b>" + st.dups + " baris mirip dengan data yang sudah tersimpan.</b> Gunakan <i>Lewati duplikat</i> atau mode <i>Ganti data periode</i> bila ini file yang sama.</div>";
    }

    var label = p.type === "template" ? "Template" : "Workbook";
    html += '<div class="small muted" style="margin-bottom:8px">Sumber: <b>' + A.esc(label) + "</b> · " +
      A.esc(periodTxt || "—") + (p.sheets.length ? " · " + p.sheets.length + " sumber: " + A.esc(p.sheets.slice(0, 6).join(", ")) : "") + "</div>";

    html += '<div class="table-wrap" style="max-height:430px"><table class="table compact"><thead><tr>' +
      "<th></th><th>Tanggal</th><th>Unit</th><th>Bagian</th><th>Kategori</th><th class=\"num\">Nominal</th><th>Keterangan</th><th>Status</th>" +
      "</tr></thead><tbody>";

    var shown = Math.min(LIMIT, p.rows.length);
    for (var i = 0; i < shown; i++) {
      var r = p.rows[i];
      var rowCls = r.errors.length ? "row-error" : r.dup && !p.skipDup ? "row-warn" : "";
      var checked = r.include && !r.errors.length;
      var bagCell, katCell, amtCell;
      if (p.editMode || !r.bagianId) {
        bagCell = '<select class="preview-edit" data-i="' + i + '" data-field="bagianId">' + activeBagianOptions(r.bagianId, "— pilih —") + "</select>";
      } else {
        bagCell = A.esc(S.bagianName(r.bagianId));
      }
      if (p.editMode || !r.kategoriId) {
        katCell = '<select class="preview-edit" data-i="' + i + '" data-field="kategoriId">' + activeKategoriOptions(r.kategoriId, "— pilih —") + "</select>";
      } else {
        katCell = A.esc(S.kategoriName(r.kategoriId));
      }
      if (p.editMode) {
        amtCell = '<input class="preview-edit num" data-i="' + i + '" data-field="amount" value="' + (r.amount || 0).toLocaleString("id-ID") + '" />';
      } else {
        amtCell = A.moneyPlain(r.amount);
      }
      var status = r.errors.length
        ? '<span class="badge bad" title="' + A.esc(r.errors.join("; ")) + '">Perlu perbaikan</span>'
        : r.dup ? '<span class="badge warn" title="Kemungkinan duplikat">Duplikat?</span>'
          : '<span class="badge ok">Siap</span>';

      html += '<tr class="' + rowCls + '">' +
        '<td><input type="checkbox" data-i="' + i + '" data-field="include"' + (checked ? " checked" : "") + (r.errors.length ? " disabled" : "") + " /></td>" +
        '<td class="nowrap">' + A.dateShort(r.date) + "</td>" +
        '<td><span class="chip">' + A.esc(r.unit) + "</span></td>" +
        "<td>" + bagCell + "</td>" +
        "<td>" + katCell + "</td>" +
        '<td class="num">' + amtCell + "</td>" +
        '<td class="small">' + A.esc(String(r.note || "").slice(0, 60)) + "</td>" +
        "<td>" + status + "</td></tr>";
    }
    html += "</tbody></table></div>";
    if (p.rows.length > shown) {
      html += '<div class="small muted" style="margin-top:6px">Menampilkan ' + shown + " dari " + p.rows.length + " baris pertama. Semua baris tetap akan diproses.</div>";
    }

    html += '<div class="form-actions"><button class="btn primary" data-pv="save">' + A.icon("check") +
      " Simpan " + st.selected + " baris ke sistem</button>" +
      '<button class="btn ghost" data-pv="cancel">Batalkan</button></div>';

    $("#previewArea").innerHTML = html;
  }

  function onPreviewClick(e) {
    var el = e.target.closest("[data-pv]");
    if (!el || !ui.preview) return;
    var act = el.getAttribute("data-pv");
    var p = ui.preview;
    if (act === "all") {
      p.rows.forEach(function (r) { if (!r.errors.length) r.include = true; });
      renderPreview();
    } else if (act === "none") {
      p.rows.forEach(function (r) { r.include = false; });
      renderPreview();
    } else if (act === "cancel") {
      clearPreview();
    } else if (act === "save") {
      saveImport();
    }
  }

  function onPreviewChange(e) {
    var p = ui.preview;
    if (!p) return;
    var el = e.target;
    if (el.id === "pvEdit") { p.editMode = el.checked; renderPreview(); return; }
    if (el.id === "pvSkipDup") {
      p.skipDup = el.checked;
      p.rows.forEach(function (r) { if (p.skipDup && r.dup) r.include = false; });
      renderPreview();
      return;
    }
    if (el.id === "pvMode") { p.mode = el.value; renderPreview(); return; }

    var field = el.getAttribute("data-field");
    if (!field) return;
    var i = parseInt(el.getAttribute("data-i"), 10);
    var r = p.rows[i];
    if (!r) return;
    if (field === "include") { r.include = el.checked; updateSummaryOnly(); return; }
    if (field === "bagianId") r.bagianId = el.value;
    if (field === "kategoriId") r.kategoriId = el.value;
    if (field === "amount") r.amount = S.parseAmount(el.value);
    if (field === "unit") r.unit = el.value;
    validate(r);
    if (!r.errors.length) r.include = true;
    renderPreview();
  }

  function updateSummaryOnly() {
    var p = ui.preview;
    if (!p) return;
    var st = previewStats();
    var host = $("#previewArea .preview-summary");
    if (host) {
      host.innerHTML = '<div class="ps"><span class="muted">Baris</span><b>' + st.total.toLocaleString("id-ID") + "</b></div>" +
        '<div class="ps"><span class="muted">Valid</span><b style="color:#0f8a5f">' + st.valid + "</b></div>" +
        '<div class="ps"><span class="muted">Bermasalah</span><b style="color:' + (st.invalid ? "#c0392b" : "#64748b") + '">' + st.invalid + "</b></div>" +
        '<div class="ps"><span class="muted">Duplikat</span><b style="color:' + (st.dups ? "#b4690e" : "#64748b") + '">' + st.dups + "</b></div>" +
        '<div class="ps"><span class="muted">Dipilih</span><b>' + st.selected + "</b></div>" +
        '<div class="ps"><span class="muted">Total</span><b>' + A.money(st.sum) + "</b></div>";
    }
    var saveBtn = $("#previewArea [data-pv='save']");
    if (saveBtn) saveBtn.innerHTML = A.icon("check") + " Simpan " + st.selected + " baris ke sistem";
  }

  function saveImport() {
    var p = ui.preview;
    if (!p) return;
    var selected = p.rows.filter(function (r) { return r.include && !r.errors.length && !(p.skipDup && r.dup); });
    if (!selected.length) {
      A.toast("Tidak ada baris yang dipilih untuk disimpan.", "bad");
      return;
    }
    var periods = {};
    selected.forEach(function (r) { periods[r.date.slice(0, 7)] = 1; });
    var periodIds = Object.keys(periods);

    var doSave = function () {
      if (p.mode === "replace") {
        S.state.entries = S.state.entries.filter(function (e) { return periodIds.indexOf(e.periodId) < 0; });
        S.save();
      }
      var list = selected.map(function (r) {
        return {
          date: r.date, unit: r.unit, bagianId: r.bagianId, kategoriId: r.kategoriId,
          amount: r.amount, note: r.note, ref: r.ref,
          source: "Upload – " + p.fileName + (r.source ? " (" + r.source + ")" : "")
        };
      });
      var n = S.addMany(list);
      S.logImport({ fileName: p.fileName, rows: n, periodId: periodIds.join(", "), source: p.type === "template" ? "Template" : "Workbook" });
      A.toast(n.toLocaleString("id-ID") + " baris berhasil diimpor ke sistem.", "ok");
      if (periodIds.length) {
        ui.periodId = periodIds.sort()[periodIds.length - 1];
        S.state.settings.defaultPeriod = ui.periodId;
      }
      clearPreview();
      A.afterDataChange();
      renderHistory();
    };

    if (p.mode === "replace") {
      A.confirm("Ganti data periode",
        "Semua transaksi pada periode <b>" + A.esc(periodIds.map(function (id) { return S.monthLabel(id); }).join(", ")) + "</b> akan <b>dihapus</b> lalu diganti dengan " + selected.length + " baris hasil upload.<br /><br />Tindakan ini tidak bisa dibatalkan. Lanjutkan?",
        "Hapus & impor", doSave, true);
    } else {
      doSave();
    }
  }

  /* ------------------------------ templates ------------------------------ */
  function downloadInputTemplate(withExample) {
    if (!X) { A.toast("Pembuat Excel tidak tersedia di browser ini.", "bad"); return; }
    var head = ["Tanggal", "Unit", "Bagian", "Kategori", "Keterangan", "Nominal", "No. Bukti"];
    var rows = [head];
    if (withExample) {
      var p = ui.periodId;
      var samples = S.entries({ periodId: p }).slice(0, 12);
      if (!samples.length) samples = [];
      samples.forEach(function (e) {
        rows.push([e.date, e.unit || "RS", S.bagianName(e.bagianId), S.kategoriName(e.kategoriId), e.note || "", e.amount, e.ref || ""]);
      });
      if (rows.length === 1) {
        rows.push([p + "-05", "RS", "Poliklinik", "ATK", "Contoh: pembelian ATK poliklinik", 350000, "KV-001"]);
        rows.push([p + "-10", "RS", "Rawat Inap", "BHP", "Contoh: BHP rawat inap", 1250000, "KV-002"]);
        rows.push([p + "-20", "RS", "Gizi & Dapur", "Makanan Pasien", "Contoh: makan pasien harian", 950000, ""]);
      }
    } else {
      rows.push([ui.periodId + "-01", "RS", "", "", "", "", ""]);
    }
    var bagianRows = [["Bagian", "Grup"]].concat(S.activeBagian().map(function (b) { return [b.name, b.group]; }));
    var katRows = [["Kategori"]].concat(S.activeKategori().map(function (k) { return [k.name]; }));
    var guide = [
      ["PETUNJUK PENGISIAN TEMPLATE COST CONTAINMENT"],
      [""],
      ["1. Isi sheet INPUT BIAYA, satu baris untuk satu transaksi biaya."],
      ["2. Tanggal boleh ditulis 2026-10-31 atau 31/10/2026."],
      ["3. Unit diisi RS, PADMA, atau KAMALA."],
      ["4. Bagian dan Kategori harus sama dengan daftar pada sheet MASTER."],
      ["5. Nominal boleh ditulis 1250000 atau 1.250.000."],
      ["6. Baris dengan nominal kosong / 0 akan dilewati."],
      ["7. Simpan file sebagai .xlsx lalu unggah melalui menu Upload Data."],
      [""],
      ["Kolom: Tanggal | Unit | Bagian | Kategori | Keterangan | Nominal | No. Bukti"]
    ];
    var sheets = [
      { name: "INPUT BIAYA", rows: rows, widths: [12, 9, 26, 28, 44, 15, 16], moneyCols: [5], autoFilter: true },
      { name: "MASTER BAGIAN", rows: bagianRows, widths: [30, 26] },
      { name: "MASTER KATEGORI", rows: katRows, widths: [32] },
      { name: "PETUNJUK", rows: guide, widths: [100], freeze: false, headerStyle: false }
    ];
    A.saveXlsx(sheets, (withExample ? "Contoh_Input_Cost_Containment" : "Template_Input_Cost_Containment") + "_" + ui.periodId + ".xlsx");
  }

  function downloadBudgetTemplate() {
    if (!X) { A.toast("Pembuat Excel tidak tersedia di browser ini.", "bad"); return; }
    var rows = [["Bagian", "Kategori", "Budget (Rp)"]];
    var total = 0;
    S.activeBagian().forEach(function (b) {
      S.activeKategori().forEach(function (k) {
        var v = S.budgetFor(ui.periodId, b.id, k.id);
        if (!v) return;
        rows.push([b.name, k.name, v]);
        total += v;
      });
    });
    rows.push(["", "TOTAL", total]);
    var guide = [
      ["TEMPLATE BUDGET COST CONTAINMENT"],
      [""],
      ["Periode: " + A.period().label],
      [""],
      ["Isi budget per bagian dan kategori pada sheet BUDGET."],
      ["Budget digunakan sebagai pembanding realisasi pada dashboard dan rekap."],
      ["Budget juga dapat diubah langsung melalui menu Pengaturan → Budget."],
      [""],
      ["Saat ini sistem memakai angka standar dari LEMBAR ANALISA workbook Cost Containment."]
    ];
    A.saveXlsx([
      { name: "BUDGET", rows: rows, widths: [30, 32, 18], moneyCols: [2] },
      { name: "PETUNJUK", rows: guide, widths: [90], freeze: false, headerStyle: false }
    ], "Template_Budget_Cost_Containment_" + ui.periodId + ".xlsx");
  }

  function render() {
    renderFileList();
    if (ui.preview) renderPreview();
    renderHistory();
    A.$("#globalUnit");
    $("#uploadType").textContent = ui.preview
      ? (ui.preview.type === "template" ? "Template standar" : "Workbook Cost Containment")
      : "Belum ada file";
    $("#uploadType").className = "badge " + (ui.preview ? (ui.preview.type === "template" ? "info" : "brand") : "info");
  }

  A.register("upload", { init: init, render: render });
})();
