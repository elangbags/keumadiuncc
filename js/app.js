/* ============================================================
   app.js — inti aplikasi: helper, navigasi, dashboard
   ============================================================ */
(function () {
  "use strict";

  var S = window.CCStore, C = window.CCCharts, D = window.CCData;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  var ui = {
    view: "dashboard",
    periodId: "",
    unit: "ALL",
    dashBagian: "ALL",
    dashKategori: "ALL",
    entryPage: 1,
    entrySearch: "",
    editingId: null,
    preview: null,
    settingsTab: "budget",
    rekapMode: "actual",
    rekapBagian: "ALL",
    rekapSearch: ""
  };

  var TITLES = {
    dashboard: ["Dashboard", "Ringkasan realisasi biaya vs budget per bagian & kategori"],
    input: ["Input Biaya", "Catat realisasi biaya per bagian dan kategori"],
    upload: ["Upload Data", "Impor data dari template standar atau workbook Cost Containment"],
    rekap: ["Rekap & Ekspor", "Matriks realisasi biaya per bagian dan kategori"],
    settings: ["Pengaturan", "Budget, periode, master data, dan backup"]
  };

  var A = window.CCA = {
    ui: ui,
    S: S,
    C: C,
    $: $,
    $$: $$,
    esc: esc,
    views: {},
    register: function (name, def) { A.views[name] = def; }
  };

  /* ------------------------------ helpers ------------------------------ */
  A.icon = function (name) { return '<svg><use href="#i-' + name + '"/></svg>'; };
  A.money = S.money;
  A.moneyPlain = S.moneyPlain;
  A.shortMoney = S.shortMoney;
  A.pct = S.pct;
  A.dateLong = S.dateLong;
  A.dateShort = S.dateShort;

  A.period = function () {
    return S.period(ui.periodId) || S.periods()[0] || { id: ui.periodId, label: S.monthLabel(ui.periodId), revenue: 0, target: 0, days: 30 };
  };

  A.unitLabel = function (u) {
    u = u || ui.unit;
    if (u === "ALL") return "Semua unit";
    if (u === "RS") return "RS (gabungan)";
    return u;
  };

  A.revenueFor = function (p, unit) {
    p = p || A.period();
    unit = unit || ui.unit;
    if (unit === "PADMA") return p.revenuePadma || 0;
    if (unit === "KAMALA") return p.revenueKamala || 0;
    return p.revenue || 0;
  };

  A.scaleForUnit = function (p) {
    p = p || A.period();
    if (ui.unit === "ALL" || ui.unit === "RS") return 1;
    var rev = p.revenue || 0;
    var part = ui.unit === "PADMA" ? (p.revenuePadma || 0) : (p.revenueKamala || 0);
    return rev > 0 && part > 0 ? part / rev : 1;
  };

  A.statusBadge = function (r) {
    var st = r.status;
    if (st === "over") return '<span class="badge bad">Over budget</span>';
    if (st === "warn") return '<span class="badge warn">Mendekati</span>';
    if (st === "ok") return '<span class="badge ok">Terkendali</span>';
    if (st === "none") return '<span class="badge muted">Tanpa budget</span>';
    return '<span class="badge info">Di bawah</span>';
  };

  A.pctCell = function (r) {
    if (r.pct == null || !isFinite(r.pct)) return '<span class="muted">—</span>';
    var p = r.pct * 100;
    var cls = p > 100 ? "bad" : p >= 90 ? "warn" : "";
    return '<div class="num" style="font-weight:600">' + p.toFixed(1).replace(".", ",") + '%</div>' +
      '<div class="cell-bar"><i class="' + cls + '" style="width:' + Math.min(100, p) + '%"></i></div>';
  };

  A.emptyRow = function (msg, cols) {
    return '<tr><td colspan="' + (cols || 8) + '"><div class="empty">' + esc(msg || "Belum ada data.") + "</div></td></tr>";
  };

  A.toast = function (msg, type) {
    var host = $("#toasts");
    if (!host) return;
    var t = document.createElement("div");
    t.className = "toast " + (type || "ok");
    t.innerHTML = '<span>' + esc(msg) + "</span>";
    host.appendChild(t);
    setTimeout(function () {
      t.style.opacity = "0";
      t.style.transform = "translateY(6px)";
      t.style.transition = ".2s";
      setTimeout(function () { t.remove(); }, 220);
    }, 3600);
  };

  /* ------------------------------ modal ------------------------------ */
  var modalOpen = false;
  A.openModal = function (title, bodyHtml, buttons, size) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHtml;
    var foot = $("#modalFoot");
    foot.innerHTML = "";
    (buttons || []).forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "btn " + (b.className || "");
      btn.innerHTML = esc(b.label);
      btn.addEventListener("click", function () {
        if (b.onClick) b.onClick();
        if (b.close !== false) A.closeModal();
      });
      foot.appendChild(btn);
    });
    $("#modal").className = "modal" + (size === "lg" ? " lg" : "");
    $("#modalBack").style.display = "grid";
    modalOpen = true;
  };
  A.closeModal = function () {
    $("#modalBack").style.display = "none";
    modalOpen = false;
  };

  A.confirm = function (title, msg, okLabel, onOk, danger) {
    A.openModal(title, '<p style="font-size:13px;color:#334155;line-height:1.6">' + msg + "</p>", [
      { label: "Batal", className: "ghost" },
      {
        label: okLabel || "Lanjutkan", className: danger ? "danger" : "primary", onClick: function () {
          setTimeout(onOk, 50);
        }
      }
    ]);
  };

  /* ------------------------------ file helpers ------------------------------ */
  A.downloadBlob = function (blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 800);
  };

  A.saveXlsx = function (sheets, filename) {
    if (!XlsxOK()) return;
    try {
      A.downloadBlob(window.CCX.writeXlsx(sheets), filename);
      A.toast("File Excel berhasil dibuat.", "ok");
    } catch (e) {
      console.error(e);
      A.toast("Gagal membuat file Excel: " + e.message, "bad");
    }
  };

  function XlsxOK() { return !!(window.CCX && window.CCX.writeXlsx); }

  A.csvText = function (rows) {
    return "\uFEFF" + rows.map(function (r) {
      return r.map(function (c) {
        var s = c == null ? "" : String(c);
        if (/[";\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      }).join(";");
    }).join("\r\n");
  };

  A.saveCsv = function (rows, filename) {
    A.downloadBlob(new Blob([A.csvText(rows)], { type: "text/csv;charset=utf-8" }), filename);
  };

  A.stamp = function () {
    var d = new Date();
    return S.dateShort(d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate()).replace(/\//g, "");
  };

  A.timeShort = function (iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return S.dateShort(d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate()) + " " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };

  A.terbilang = function (n) {
    n = Math.round(Math.abs(S.num(n)));
    var satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    function t(x) {
      if (x < 12) return satuan[x];
      if (x < 20) return t(x - 10) + " belas";
      if (x < 100) return t(Math.floor(x / 10)) + " puluh" + (x % 10 ? " " + t(x % 10) : "");
      if (x < 200) return "seratus" + (x % 100 ? " " + t(x % 100) : "");
      if (x < 1000) return t(Math.floor(x / 100)) + " ratus" + (x % 100 ? " " + t(x % 100) : "");
      if (x < 2000) return "seribu" + (x % 1000 ? " " + t(x % 1000) : "");
      if (x < 1e6) return t(Math.floor(x / 1000)) + " ribu" + (x % 1000 ? " " + t(x % 1000) : "");
      if (x < 1e9) return t(Math.floor(x / 1e6)) + " juta" + (x % 1e6 ? " " + t(x % 1e6) : "");
      if (x < 1e12) return t(Math.floor(x / 1e9)) + " miliar" + (x % 1e9 ? " " + t(x % 1e9) : "");
      return t(Math.floor(x / 1e12)) + " triliun" + (x % 1e12 ? " " + t(x % 1e12) : "");
    }
    if (!n) return "nol rupiah";
    return t(n) + " rupiah";
  };

  A.fillSelect = function (sel, items, allLabel, current) {
    if (!sel) return;
    var val = current != null ? current : sel.value;
    var html = "";
    if (allLabel != null) html += '<option value="ALL">' + esc(allLabel) + "</option>";
    items.forEach(function (it) {
      html += '<option value="' + esc(it.id) + '">' + esc(it.name) + "</option>";
    });
    sel.innerHTML = html;
    var ok = $$("option", sel).some(function (o) { return o.value === val; });
    sel.value = ok ? val : (allLabel != null ? "ALL" : (items[0] ? items[0].id : ""));
  };

  /* ------------------------------ sidebar / nav ------------------------------ */
  function updateChrome() {
    var p = A.period();
    $("#sidePeriod").textContent = p.label || S.monthLabel(ui.periodId);
    var n = S.entries({ periodId: ui.periodId }).length;
    $("#sideCount").textContent = n.toLocaleString("id-ID") + " transaksi";
    var t = TITLES[ui.view] || TITLES.dashboard;
    $("#pageTitle").textContent = t[0];
    $("#pageSub").textContent = t[1];
    $$("#nav button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === ui.view);
    });
  }

  A.switchView = function (view) {
    if (!TITLES[view]) view = "dashboard";
    ui.view = view;
    $$(".view").forEach(function (v) { v.classList.add("view-hidden"); });
    var el = $("#view-" + view);
    if (el) el.classList.remove("view-hidden");
    $("#sidebar").classList.remove("open");
    updateChrome();
    A.renderCurrent();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  A.renderCurrent = function () {
    var def = A.views[ui.view];
    if (def && def.render) {
      try { def.render(); } catch (e) { console.error("Render error:", e); }
    }
    updateChrome();
  };

  A.refreshMasterSelects = function () {
    var bag = S.activeBagian().map(function (b) { return { id: b.id, name: b.name }; });
    var kat = S.activeKategori().map(function (k) { return { id: k.id, name: k.name }; });
    A.fillSelect($("#dashBagian"), bag, "Semua bagian", ui.dashBagian);
    A.fillSelect($("#dashKategori"), kat, "Semua kategori", ui.dashKategori);
    A.fillSelect($("#rekapBagian"), bag, "Semua bagian", ui.rekapBagian);
    if (A.views.input && A.views.input.refreshSelects) A.views.input.refreshSelects();
    if (A.views.settings && A.views.settings.refreshSelects) A.views.settings.refreshSelects();
  };

  A.refreshPeriods = function () {
    var sel = $("#globalPeriod");
    var list = S.periods();
    sel.innerHTML = list.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.label) + "</option>";
    }).join("");
    if (!S.period(ui.periodId)) ui.periodId = list[0] ? list[0].id : "";
    sel.value = ui.periodId;
  };

  A.afterDataChange = function () {
    A.refreshPeriods();
    A.refreshMasterSelects();
    A.renderCurrent();
    updateChrome();
  };

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function kpi(label, value, foot, icon, cls, sub) {
    return '<div class="kpi ' + (cls || "") + '">' +
      (icon ? '<div class="k-icon">' + A.icon(icon) + "</div>" : "") +
      '<div class="k-label">' + esc(label) + "</div>" +
      '<div class="k-value' + (sub ? " sm" : "") + '">' + value + "</div>" +
      '<div class="k-foot">' + (foot || "&nbsp;") + "</div></div>";
  }

  function renderDashboard() {
    var p = A.period();
    var bag = ui.dashBagian, kat = ui.dashKategori, unit = ui.unit;
    var scale = A.scaleForUnit(p);
    var rev = A.revenueFor(p, unit);

    var tot = S.totalFor(ui.periodId, { bagianId: bag, kategoriId: kat, unit: unit });
    var budget = Math.round(tot.budget * scale);
    var actual = tot.actual;
    var left = budget - actual;
    var pctUsed = budget > 0 ? actual / budget : null;
    var nTrx = S.entries({ periodId: ui.periodId, bagianId: bag, kategoriId: kat, unit: unit }).length;

    var totalBudgetPeriod = S.budgetSum(ui.periodId) * scale;
    var stdRatio = rev > 0 ? totalBudgetPeriod / rev : 0;
    var ratio = rev > 0 ? actual / rev : 0;

    var target = p.revenue > 0 ? (p.target || 0) : 0;
    var capaian = p.target > 0 ? (p.revenue || 0) / p.target : null;

    $("#dashKpi").innerHTML = [
      kpi("Pendapatan", A.money(rev), target ? "Target " + A.shortMoney(target) + " · capaian " + A.pct(capaian) : "Pendapatan periode " + esc(p.label), "rev", "k-rev"),
      kpi("Realisasi Biaya", A.money(actual), nTrx.toLocaleString("id-ID") + " transaksi tercatat", "money", "k-act"),
      kpi("Budget Standar", A.money(budget), "Total budget bagian & kategori terpilih", "budget", "k-bud"),
      kpi(left >= 0 ? "Sisa Budget" : "Over Budget", A.money(Math.abs(left)), left >= 0 ? "Masih tersedia dari budget" : "Melebihi budget periode", "chart", left >= 0 ? "k-good" : "k-bad"),
      kpi("% Pemakaian Budget", pctUsed == null ? "—" : A.pct(pctUsed), budget > 0 ? "dari " + A.money(budget) : "Belum ada budget", "budget", pctUsed == null ? "" : pctUsed > 1 ? "k-bad" : pctUsed >= 0.9 ? "k-warn" : "k-good", true),
      kpi("Rasio Biaya / Pendapatan", rev > 0 ? A.pct(ratio) : "—", stdRatio ? "Standar budget ≤ " + A.pct(stdRatio) : "Pendapatan belum diisi", "chart", rev > 0 && stdRatio && ratio > stdRatio ? "k-bad" : "k-good", true)
    ].join("");

    $("#dashMeta").innerHTML = esc(p.label) + " · " + esc(A.unitLabel(unit)) + " · " +
      (bag === "ALL" ? "semua bagian" : esc(S.bagianName(bag))) +
      (kat === "ALL" ? "" : " · " + esc(S.kategoriName(kat)));

    /* ---- chart per bagian (atau kategori bila bagian difilter) ---- */
    var barMode = bag !== "ALL" ? "kategori" : "bagian";
    var barRows = barMode === "kategori"
      ? S.byKategori(ui.periodId, { bagianId: bag, unit: unit })
      : S.byBagian(ui.periodId, { kategoriId: kat, unit: unit });

    barRows = barRows.map(function (r) {
      var b = Math.round(r.budget * scale);
      return {
        id: r.id, name: r.name, budget: b, actual: r.actual,
        variance: r.actual - b, pct: b > 0 ? r.actual / b : null,
        status: S.statusOf(r.actual, b)
      };
    }).filter(function (r) { return r.budget > 0 || r.actual > 0; });

    barRows.sort(function (a, b) { return b.actual - a.actual || b.budget - a.budget; });
    var top = barRows.slice(0, 10);

    var barCard = $("#chartBagian").closest(".card");
    var barTitle = $(".card-h h3", barCard);
    if (barMode === "kategori") {
      barTitle.textContent = "Realisasi per Kategori — " + S.bagianName(bag);
    } else {
      barTitle.textContent = "Budget vs Realisasi per Bagian";
    }

    C.hBars($("#chartBagian"), {
      rows: top,
      series: [
        { name: "Realisasi", key: "actual", color: "#0f8a7c" },
        { name: "Budget", key: "budget", color: "#cbd5df" }
      ],
      format: A.money,
      axisFormat: A.shortMoney,
      legendEl: $("#legendBagian"),
      onClick: function (r) {
        if (barMode === "kategori") { ui.dashKategori = ui.dashKategori === r.id ? "ALL" : r.id; $("#dashKategori").value = ui.dashKategori; }
        else { ui.dashBagian = ui.dashBagian === r.id ? "ALL" : r.id; $("#dashBagian").value = ui.dashBagian; }
        renderDashboard();
      }
    });

    /* ---- donut kategori ---- */
    var donutMode = kat !== "ALL" ? "bagian" : "kategori";
    var donutRows = donutMode === "bagian"
      ? S.byBagian(ui.periodId, { kategoriId: kat, unit: unit })
      : S.byKategori(ui.periodId, { bagianId: bag, unit: unit });
    var items = donutRows.filter(function (r) { return r.actual > 0; })
      .sort(function (a, b) { return b.actual - a.actual; });

    var donutCard = $("#chartKategori").closest(".card");
    $(".card-h h3", donutCard).textContent = donutMode === "bagian"
      ? "Komposisi Bagian — " + S.kategoriName(kat)
      : "Komposisi Kategori";
    $(".card-h .sub", donutCard).textContent = "Realisasi biaya per " + (donutMode === "bagian" ? "bagian" : "kategori");

    var topItems = items.slice(0, 7);
    var rest = items.slice(7);
    if (rest.length) {
      topItems.push({ id: "__other", name: "Lainnya (" + rest.length + ")", actual: rest.reduce(function (a, b) { return a + b.actual; }, 0) });
    }
    C.donut($("#chartKategori"), {
      items: topItems.map(function (r, i) {
        return { id: r.id, name: r.name, value: r.actual, color: C.palette[i % C.palette.length] };
      }),
      centerLabel: "TOTAL",
      centerValue: A.shortMoney(actual),
      format: A.money,
      legendEl: $("#legendKategori"),
      onClick: function (it) {
        if (it.id === "__other") return;
        if (donutMode === "bagian") { ui.dashBagian = ui.dashBagian === it.id ? "ALL" : it.id; $("#dashBagian").value = ui.dashBagian; }
        else { ui.dashKategori = ui.dashKategori === it.id ? "ALL" : it.id; $("#dashKategori").value = ui.dashKategori; }
        renderDashboard();
      }
    });

    /* ---- trend kumulatif ---- */
    var daily = S.daily(ui.periodId, { bagianId: bag, kategoriId: kat, unit: unit });
    var days = daily.length || 1;
    var cumBudget = [];
    daily.forEach(function (d) { cumBudget.push(budget * (d.day / days)); });
    var cumActual = daily.map(function (d) { return d.cumulative; });

    C.line($("#chartTrend"), {
      labels: daily.map(function (d) { return String(d.day); }),
      series: [
        { name: "Realisasi kumulatif", values: cumActual, color: "#0f8a7c", area: true, width: 2.4 },
        { name: "Budget proporsional", values: cumBudget, color: "#94a3b8", dashed: true, width: 1.8 }
      ],
      format: A.money,
      axisFormat: A.shortMoney,
      height: 250,
      legendEl: $("#legendTrend"),
      tipTitle: function (lb) { return lb + " " + (p.label || ""); }
    });

    var lastActual = cumActual.length ? cumActual[cumActual.length - 1] : 0;
    var trendPct = budget > 0 ? lastActual / budget : null;
    var trendEl = $("#trendPill");
    if (trendPct == null) {
      trendEl.textContent = "Budget belum diatur";
      trendEl.style.color = "";
    } else {
      trendEl.textContent = "Realisasi " + A.pct(trendPct) + " dari budget";
      trendEl.style.color = trendPct > 1 ? "#c0392b" : "#0f8a5f";
    }

    /* ---- tabel per bagian ---- */
    var rows = S.byBagian(ui.periodId, { kategoriId: kat, unit: unit }).map(function (r) {
      var b = Math.round(r.budget * scale);
      return {
        id: r.id, name: r.name, group: r.group, budget: b, actual: r.actual,
        variance: r.actual - b, pct: b > 0 ? r.actual / b : null, status: S.statusOf(r.actual, b)
      };
    }).filter(function (r) { return r.budget > 0 || r.actual > 0; })
      .sort(function (a, b) { return b.actual - a.actual; });

    var html = '<table class="table compact"><thead><tr><th>Bagian</th><th class="num">Budget</th><th class="num">Realisasi</th><th class="num">Sisa</th><th class="num">%</th><th>Status</th></tr></thead><tbody>';
    if (!rows.length) html += A.emptyRow("Belum ada data pada periode ini.", 6);
    rows.forEach(function (r) {
      html += "<tr><td class=\"name\">" + esc(r.name) + '<span class="sub">' + esc(r.group || "") + "</span></td>" +
        '<td class="num">' + A.moneyPlain(r.budget) + "</td>" +
        '<td class="num">' + A.moneyPlain(r.actual) + "</td>" +
        '<td class="num" style="color:' + (r.variance > 0 ? "#c0392b" : "#0f8a5f") + '">' + (r.variance > 0 ? "(" + A.moneyPlain(r.variance) + ")" : A.moneyPlain(-r.variance)) + "</td>" +
        '<td class="num">' + A.pctCell(r) + "</td>" +
        "<td>" + A.statusBadge(r) + "</td></tr>";
    });
    html += '</tbody><tfoot><tr><td>Total</td><td class="num">' + A.moneyPlain(budget) + '</td><td class="num">' + A.moneyPlain(actual) + '</td><td class="num">' + A.moneyPlain(Math.abs(budget - actual)) + '</td><td class="num">' + (budget > 0 ? A.pct(actual / budget) : "—") + "</td><td></td></tr></tfoot></table>";
    $("#tableBagian").innerHTML = html;

    /* ---- alert kategori over budget ---- */
    var katRows = S.byKategori(ui.periodId, { bagianId: bag, unit: unit }).map(function (r) {
      var b = Math.round(r.budget * scale);
      return { id: r.id, name: r.name, budget: b, actual: r.actual, variance: r.actual - b, pct: b > 0 ? r.actual / b : null };
    }).filter(function (r) { return r.budget > 0 || r.actual > 0; });

    var overs = katRows.filter(function (r) { return r.budget > 0 && r.actual > r.budget; })
      .sort(function (a, b) { return (b.variance / b.budget) - (a.variance / a.budget); });
    var warns = katRows.filter(function (r) { return r.budget > 0 && r.actual <= r.budget && r.actual / r.budget >= 0.9; })
      .sort(function (a, b) { return b.pct - a.pct; });

    var alertHtml = "";
    if (!overs.length && !warns.length) {
      alertHtml = '<div class="alert-item"><div class="ai-icon ok">' + A.icon("check") + '</div><div class="ai-body"><div class="ai-title">Semua kategori terkendali</div><div class="ai-sub">Tidak ada kategori yang melewati atau mendekati batas budget.</div></div></div>';
    }
    overs.slice(0, 5).forEach(function (r) {
      alertHtml += '<div class="alert-item"><div class="ai-icon">' + A.icon("alert") + '</div><div class="ai-body">' +
        '<div class="ai-title">' + esc(r.name) + '</div><div class="ai-sub">Realisasi ' + A.pct(r.pct) + " dari budget</div></div>" +
        '<div class="ai-right" style="color:#c0392b">+' + A.moneyPlain(r.variance) + "<br /><span class=\"muted\">over</span></div></div>";
    });
    warns.slice(0, 3).forEach(function (r) {
      alertHtml += '<div class="alert-item"><div class="ai-icon warn">' + A.icon("alert") + '</div><div class="ai-body">' +
        '<div class="ai-title">' + esc(r.name) + '</div><div class="ai-sub">Mendekati batas budget (' + A.pct(r.pct) + ")</div></div>" +
        '<div class="ai-right">' + A.moneyPlain(r.budget - r.actual) + "<br /><span class=\"muted\">sisa</span></div></div>";
    });
    $("#alertList").innerHTML = alertHtml;

    /* ---- indikator rasio ---- */
    var groups = {};
    S.activeBagian().forEach(function (b) { groups[b.id] = b.group; });
    var ent = S.entries({ periodId: ui.periodId, unit: unit });
    var direct = 0, indirect = 0, obat = 0;
    var laborIds = { gaji: 1, lembur: 1, gajiDireksi: 1, bonus: 1, pengobatan: 1, perlengkapanKaryawan: 1, diklat: 1, makanKaryawan: 1, makanDokter: 1, lainTK: 1, rapat: 1 };
    var labor = 0;
    ent.forEach(function (e) {
      if (groups[e.bagianId] === "Biaya Langsung") direct += e.amount || 0;
      else indirect += e.amount || 0;
      if (e.kategoriId === "obat") obat += e.amount || 0;
      if (laborIds[e.kategoriId]) labor += e.amount || 0;
    });

    var ind = [
      { name: "Biaya Langsung", val: rev > 0 ? direct / rev : 0, amount: direct, std: 0.27, note: "Standar ≤ 27% pendapatan" },
      { name: "Biaya Obat", val: rev > 0 ? obat / rev : 0, amount: obat, std: 0.20, note: "Standar ≤ 20% pendapatan" },
      { name: "Biaya Tidak Langsung", val: rev > 0 ? indirect / rev : 0, amount: indirect, std: 0.464, note: "Acuan ≤ 46,4% pendapatan" },
      { name: "Tenaga Kerja", val: rev > 0 ? labor / rev : 0, amount: labor, std: 0.30, note: "Acuan ≤ 30% pendapatan" }
    ];
    $("#ratioGrid").innerHTML = ind.map(function (r) {
      var over = r.val > r.std;
      var w = r.std > 0 ? Math.min(100, (r.val / r.std) * 100) : 0;
      return '<div class="ratio"><div class="r-top"><span class="r-name">' + esc(r.name) + '</span>' +
        '<span class="badge ' + (over ? "bad" : "ok") + '">' + (over ? "Over" : "Aman") + "</span></div>" +
        '<div class="r-val">' + (rev > 0 ? A.pct(r.val) : "—") + "</div>" +
        '<div class="r-std">' + esc(r.note) + " · " + A.shortMoney(r.amount) + "</div>" +
        '<div class="r-bar"><i class="' + (over ? "" : "ok") + '" style="width:' + w + '%"></i></div></div>';
    }).join("");
    $("#indicatorRev").textContent = "Pendapatan " + A.shortMoney(rev);
  }

  A.register("dashboard", { render: renderDashboard });

  /* ============================================================
     BIND GLOBAL
     ============================================================ */
  function bindChrome() {
    $$("#nav button").forEach(function (b) {
      b.addEventListener("click", function () { A.switchView(b.getAttribute("data-view")); });
    });
    $("#quickInputBtn").addEventListener("click", function () { A.switchView("input"); });
    $("#printBtn").addEventListener("click", function () { window.print(); });
    $("#dashToRekap").addEventListener("click", function () { A.switchView("rekap"); });
    $("#menuBtn").addEventListener("click", function () { $("#sidebar").classList.toggle("open"); });

    $("#globalPeriod").addEventListener("change", function () {
      ui.periodId = this.value;
      S.state.settings.defaultPeriod = ui.periodId;
      S.save();
      A.renderCurrent();
    });

    $("#globalUnit").addEventListener("change", function () {
      ui.unit = this.value;
      var u = $("#globalUnit");
      if (u) u.value = ui.unit;
      A.renderCurrent();
    });

    $("#dashBagian").addEventListener("change", function () { ui.dashBagian = this.value; renderDashboard(); });
    $("#dashKategori").addEventListener("change", function () { ui.dashKategori = this.value; renderDashboard(); });
    $("#dashReset").addEventListener("click", function () {
      ui.dashBagian = "ALL"; ui.dashKategori = "ALL";
      $("#dashBagian").value = "ALL"; $("#dashKategori").value = "ALL";
      renderDashboard();
    });

    $("#modalClose").addEventListener("click", A.closeModal);
    $("#modalBack").addEventListener("click", function (e) { if (e.target === this) A.closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modalOpen) A.closeModal();
    });
    window.addEventListener("resize", function () {
      clearTimeout(window.__ccResize);
      window.__ccResize = setTimeout(function () { A.renderCurrent(); }, 260);
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    S.load();
    ui.periodId = S.state.settings.defaultPeriod || (S.periods()[0] && S.periods()[0].id) || "";
    $("#globalUnit").value = ui.unit;
    A.refreshPeriods();
    A.refreshMasterSelects();
    bindChrome();

    Object.keys(A.views).forEach(function (k) {
      if (A.views[k].init) {
        try { A.views[k].init(); } catch (e) { console.error("Init view " + k + ":", e); }
      }
    });

    A.switchView("dashboard");
    $("#globalUnit").value = ui.unit;
    if (!S.state.seeded) console.log("Cost Containment siap digunakan.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
