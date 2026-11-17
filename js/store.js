/* ============================================================
   store.js — penyimpanan data, agregasi, dan format angka
   ============================================================ */
(function () {
  "use strict";

  var KEY = "cc_data_v1";
  var BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  var HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  var state = null;

  /* ------------------------------ util ------------------------------ */
  function uid(prefix) {
    return (prefix || "e") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null || v === "") return 0;
    var n = parseFloat(String(v).replace(/[^\d,.\-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    return isFinite(n) ? n : 0;
  }

  function parseAmount(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    var s = String(v).trim();
    if (!s) return 0;
    var neg = /^\(.*\)$/.test(s) || /^-/.test(s);
    s = s.replace(/[^\d,.\-]/g, "");
    if (s === "" || s === "-" || s === "." || s === ",") return 0;
    if (s.indexOf(",") >= 0) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      var parts = s.split(".");
      if (parts.length > 2) s = parts.join("");
      else if (parts.length === 2 && parts[1].length === 3) s = parts.join("");
    }
    var n = parseFloat(s.replace(/-/g, ""));
    if (!isFinite(n)) return 0;
    return Math.round(neg ? -n : n);
  }

  function money(n) {
    n = Math.round(num(n));
    var s = Math.abs(n).toLocaleString("id-ID");
    return (n < 0 ? "-Rp " : "Rp ") + s;
  }

  function moneyPlain(n) {
    return Math.round(num(n)).toLocaleString("id-ID");
  }

  function shortMoney(n) {
    n = num(n);
    var a = Math.abs(n);
    if (a >= 1e12) return "Rp " + (n / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " T";
    if (a >= 1e9) return "Rp " + (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " M";
    if (a >= 1e6) return "Rp " + (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
    if (a >= 1e3) return "Rp " + (n / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " rb";
    return money(n);
  }

  function pct(v, digits) {
    if (!isFinite(v)) return "—";
    digits = digits == null ? 1 : digits;
    return (v * 100).toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + "%";
  }

  function dateObj(iso) {
    if (!iso) return null;
    if (iso instanceof Date) return iso;
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }

  function normalizeDate(v) {
    if (v == null || v === "") return "";
    if (v instanceof Date) return v.getFullYear() + "-" + pad(v.getMonth() + 1) + "-" + pad(v.getDate());
    if (typeof v === "number" || /^\d{5}(\.\d+)?$/.test(String(v).trim())) {
      var serial = parseFloat(v);
      if (serial > 20000 && serial < 80000) {
        var epoch = Date.UTC(1899, 11, 30);
        var d = new Date(epoch + Math.round(serial) * 86400000);
        return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
      }
    }
    var s = String(v).trim();
    var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) return m[1] + "-" + pad(+m[2]) + "-" + pad(+m[3]);
    m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (m) return m[3] + "-" + pad(+m[2]) + "-" + pad(+m[1]);
    m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
    if (m) return "20" + m[3] + "-" + pad(+m[2]) + "-" + pad(+m[1]);
    var d2 = new Date(s);
    if (!isNaN(d2.getTime())) return d2.getFullYear() + "-" + pad(d2.getMonth() + 1) + "-" + pad(d2.getDate());
    return "";
  }

  function dateLong(iso) {
    var d = dateObj(iso);
    if (!d) return "—";
    return d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
  }

  function dateShort(iso) {
    var d = dateObj(iso);
    if (!d) return "—";
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + String(d.getFullYear()).slice(2);
  }

  function monthLabel(id) {
    if (!id) return "—";
    var p = String(id).split("-");
    var m = parseInt(p[1], 10);
    if (!m || m < 1 || m > 12) return id;
    return BULAN[m - 1] + " " + p[0];
  }

  function daysInMonth(periodId) {
    var p = String(periodId || "").split("-");
    var y = +p[0], m = +p[1];
    if (!y || !m) return 30;
    return new Date(y, m, 0).getDate();
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /* ------------------------------ state ------------------------------ */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.bagian && parsed.periods) {
          state = migrate(parsed);
          return state;
        }
      }
    } catch (e) {
      console.warn("Gagal membaca penyimpanan:", e);
    }
    state = window.CCData.buildState();
    save();
    return state;
  }

  function migrate(s) {
    s.version = s.version || 1;
    s.entries = s.entries || [];
    s.budget = s.budget || [];
    s.imports = s.imports || [];
    s.settings = s.settings || {};
    if (!s.settings.defaultPeriod && s.periods.length) s.settings.defaultPeriod = s.periods[0].id;
    s.periods.forEach(function (p) {
      if (p.days == null) p.days = daysInMonth(p.id);
      p.revenue = p.revenue || 0;
      p.target = p.target || 0;
      p.revenuePadma = p.revenuePadma || 0;
      p.revenueKamala = p.revenueKamala || 0;
    });
    s.entries.forEach(function (e) {
      e.amount = Math.round(num(e.amount));
      if (!e.unit) e.unit = "RS";
      if (!e.periodId && e.date) e.periodId = String(e.date).slice(0, 7);
    });
    return s;
  }

  var saveTimer = null;
  function save() {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Gagal menyimpan:", e);
      if (window.CCApp && window.CCApp.toast) window.CCApp.toast("Penyimpanan penuh. Ekspor data lalu reset.", "bad");
    }
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 250);
  }

  function reset(seed) {
    localStorage.removeItem(KEY);
    state = seed ? window.CCData.buildState() : emptyState();
    save();
    return state;
  }

  function emptyState() {
    var s = window.CCData.buildState();
    s.entries = [];
    s.imports = [];
    s.budget = [];
    return s;
  }

  /* ------------------------------ master ------------------------------ */
  function bagian(id) { return state.bagian.filter(function (b) { return b.id === id; })[0]; }
  function bagianName(id) { var b = bagian(id); return b ? b.name : (id || "—"); }
  function kategori(id) { return state.kategori.filter(function (k) { return k.id === id; })[0]; }
  function kategoriName(id) { var k = kategori(id); return k ? k.name : (id || "—"); }
  function period(id) { return state.periods.filter(function (p) { return p.id === id; })[0]; }

  function activeBagian() { return state.bagian.filter(function (b) { return b.active !== false; }); }
  function activeKategori() { return state.kategori.filter(function (k) { return k.active !== false; }); }
  function periods() { return state.periods.slice().sort(function (a, b) { return a.id < b.id ? 1 : -1; }); }

  function addBagian(name, group) {
    name = String(name || "").trim();
    if (!name) return null;
    var id = slug(name);
    if (bagian(id)) id = id + "-" + Math.random().toString(36).slice(2, 5);
    var b = { id: id, name: name, group: group || "Biaya Tidak Langsung", active: true };
    state.bagian.push(b); save();
    return b;
  }

  function addKategori(name) {
    name = String(name || "").trim();
    if (!name) return null;
    var id = slug(name);
    if (kategori(id)) id = id + "-" + Math.random().toString(36).slice(2, 5);
    var k = { id: id, name: name, active: true };
    state.kategori.push(k); save();
    return k;
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/&/g, "dan").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";
  }

  /* ------------------------------ budget ------------------------------ */
  function budgetFor(periodId, bagianId, kategoriId) {
    for (var i = 0; i < state.budget.length; i++) {
      var b = state.budget[i];
      if (b.periodId === periodId && b.bagianId === bagianId && b.kategoriId === kategoriId) return b.amount || 0;
    }
    return 0;
  }

  function budgetEntry(periodId, bagianId, kategoriId) {
    for (var i = 0; i < state.budget.length; i++) {
      var b = state.budget[i];
      if (b.periodId === periodId && b.bagianId === bagianId && b.kategoriId === kategoriId) return b;
    }
    return null;
  }

  function setBudget(periodId, bagianId, kategoriId, amount) {
    var b = budgetEntry(periodId, bagianId, kategoriId);
    amount = Math.max(0, Math.round(num(amount)));
    if (b) b.amount = amount;
    else state.budget.push({ id: "b-" + periodId + "-" + bagianId + "-" + kategoriId, periodId: periodId, bagianId: bagianId, kategoriId: kategoriId, amount: amount });
    saveSoon();
    return amount;
  }

  function copyBudget(fromPeriod, toPeriod) {
    var n = 0;
    state.budget.filter(function (b) { return b.periodId === fromPeriod; }).forEach(function (b) {
      setBudget(toPeriod, b.bagianId, b.kategoriId, b.amount);
      n++;
    });
    save();
    return n;
  }

  /* ------------------------------ entries ------------------------------ */
  function allEntries() { return state.entries; }

  function entries(opts) {
    opts = opts || {};
    return state.entries.filter(function (e) {
      if (opts.periodId && e.periodId !== opts.periodId) return false;
      if (opts.dateFrom && e.date < opts.dateFrom) return false;
      if (opts.dateTo && e.date > opts.dateTo) return false;
      if (opts.bagianId && opts.bagianId !== "ALL" && e.bagianId !== opts.bagianId) return false;
      if (opts.kategoriId && opts.kategoriId !== "ALL" && e.kategoriId !== opts.kategoriId) return false;
      if (opts.unit && opts.unit !== "ALL" && opts.unit !== "RS" && e.unit !== opts.unit) return false;
      if (opts.search) {
        var q = String(opts.search).toLowerCase();
        var hay = (e.note || "") + " " + (e.ref || "") + " " + bagianName(e.bagianId) + " " + kategoriName(e.kategoriId);
        if (hay.toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function addEntry(data) {
    var e = {
      id: uid("e"),
      date: normalizeDate(data.date) || todayISO(),
      periodId: String(normalizeDate(data.date) || todayISO()).slice(0, 7),
      unit: data.unit || "RS",
      bagianId: data.bagianId,
      kategoriId: data.kategoriId,
      amount: Math.round(num(data.amount)),
      note: data.note || "",
      ref: data.ref || "",
      source: data.source || "Input manual",
      createdAt: new Date().toISOString()
    };
    state.entries.push(e);
    save();
    return e;
  }

  function updateEntry(id, data) {
    var e = state.entries.filter(function (x) { return x.id === id; })[0];
    if (!e) return null;
    if (data.date != null) { e.date = normalizeDate(data.date) || e.date; e.periodId = e.date.slice(0, 7); }
    if (data.unit != null) e.unit = data.unit;
    if (data.bagianId != null) e.bagianId = data.bagianId;
    if (data.kategoriId != null) e.kategoriId = data.kategoriId;
    if (data.amount != null) e.amount = Math.round(num(data.amount));
    if (data.note != null) e.note = data.note;
    if (data.ref != null) e.ref = data.ref;
    if (data.source != null) e.source = data.source;
    e.updatedAt = new Date().toISOString();
    save();
    return e;
  }

  function removeEntry(id) {
    var before = state.entries.length;
    state.entries = state.entries.filter(function (x) { return x.id !== id; });
    save();
    return state.entries.length < before;
  }

  function removeEntriesBySource(source, periodId) {
    var before = state.entries.length;
    state.entries = state.entries.filter(function (e) {
      if (e.source !== source) return true;
      if (periodId && e.periodId !== periodId) return true;
      return false;
    });
    save();
    return before - state.entries.length;
  }

  function addMany(list) {
    var added = 0;
    list.forEach(function (d) {
      state.entries.push({
        id: uid("e"),
        date: normalizeDate(d.date) || todayISO(),
        periodId: String(normalizeDate(d.date) || todayISO()).slice(0, 7),
        unit: d.unit || "RS",
        bagianId: d.bagianId,
        kategoriId: d.kategoriId,
        amount: Math.round(num(d.amount)),
        note: d.note || "",
        ref: d.ref || "",
        source: d.source || "Upload",
        createdAt: new Date().toISOString()
      });
      added++;
    });
    save();
    return added;
  }

  /* ------------------------------ aggregation ------------------------------ */
  function sum(opts) {
    return entries(opts).reduce(function (a, e) { return a + (e.amount || 0); }, 0);
  }

  function budgetSum(periodId, opts) {
    opts = opts || {};
    var total = 0;
    state.budget.forEach(function (b) {
      if (b.periodId !== periodId) return;
      if (opts.bagianId && opts.bagianId !== "ALL" && b.bagianId !== opts.bagianId) return;
      if (opts.kategoriId && opts.kategoriId !== "ALL" && b.kategoriId !== opts.kategoriId) return;
      total += b.amount || 0;
    });
    return total;
  }

  function byBagian(periodId, opts) {
    opts = opts || {};
    var bud = {}, act = {};
    activeBagian().forEach(function (b) { bud[b.id] = 0; act[b.id] = 0; });
    state.budget.forEach(function (b) {
      if (b.periodId !== periodId) return;
      if (opts.kategoriId && opts.kategoriId !== "ALL" && b.kategoriId !== opts.kategoriId) return;
      bud[b.bagianId] = (bud[b.bagianId] || 0) + (b.amount || 0);
    });
    entries({ periodId: periodId, unit: opts.unit, kategoriId: opts.kategoriId }).forEach(function (e) {
      act[e.bagianId] = (act[e.bagianId] || 0) + (e.amount || 0);
    });
    return activeBagian().map(function (b) {
      var budget = bud[b.id] || 0;
      var actual = act[b.id] || 0;
      return {
        id: b.id, name: b.name, group: b.group,
        budget: budget, actual: actual,
        variance: actual - budget,
        pct: budget > 0 ? actual / budget : (actual > 0 ? null : 0),
        status: statusOf(actual, budget)
      };
    });
  }

  function byKategori(periodId, opts) {
    opts = opts || {};
    var bud = {}, act = {};
    state.budget.forEach(function (b) {
      if (b.periodId !== periodId) return;
      if (opts.bagianId && opts.bagianId !== "ALL" && b.bagianId !== opts.bagianId) return;
      bud[b.kategoriId] = (bud[b.kategoriId] || 0) + (b.amount || 0);
    });
    entries({ periodId: periodId, unit: opts.unit, bagianId: opts.bagianId }).forEach(function (e) {
      act[e.kategoriId] = (act[e.kategoriId] || 0) + (e.amount || 0);
    });
    var ids = {};
    Object.keys(bud).forEach(function (k) { ids[k] = 1; });
    Object.keys(act).forEach(function (k) { ids[k] = 1; });
    return Object.keys(ids).map(function (id) {
      var budget = bud[id] || 0;
      var actual = act[id] || 0;
      return {
        id: id, name: kategoriName(id),
        budget: budget, actual: actual,
        variance: actual - budget,
        pct: budget > 0 ? actual / budget : (actual > 0 ? null : 0),
        status: statusOf(actual, budget)
      };
    }).sort(function (a, b) { return b.actual - a.actual; });
  }

  function statusOf(actual, budget) {
    if (!budget) return actual > 0 ? "over" : "none";
    var r = actual / budget;
    if (r > 1) return "over";
    if (r >= 0.9) return "warn";
    if (r >= 0.5) return "ok";
    return "low";
  }

  function daily(periodId, opts) {
    opts = opts || {};
    var p = period(periodId) || { days: daysInMonth(periodId) };
    var n = p.days || daysInMonth(periodId);
    var list = [];
    for (var i = 1; i <= n; i++) {
      var iso = periodId + "-" + pad(i);
      list.push({ date: iso, day: i, amount: 0, count: 0 });
    }
    var idx = {};
    list.forEach(function (d) { idx[d.date] = d; });
    entries({ periodId: periodId, unit: opts.unit, bagianId: opts.bagianId, kategoriId: opts.kategoriId }).forEach(function (e) {
      var d = idx[e.date];
      if (d) { d.amount += e.amount || 0; d.count++; }
    });
    var run = 0;
    list.forEach(function (d) { run += d.amount; d.cumulative = run; });
    return list;
  }

  function totalFor(periodId, opts) {
    opts = opts || {};
    var actual = sum({ periodId: periodId, unit: opts.unit, bagianId: opts.bagianId, kategoriId: opts.kategoriId });
    var budget = budgetSum(periodId, opts);
    return { actual: actual, budget: budget, variance: actual - budget, pct: budget > 0 ? actual / budget : null };
  }

  /* ------------------------------ periode ------------------------------ */
  function addPeriod(id, label, revenue, target) {
    if (!/^\d{4}-\d{2}$/.test(id)) return null;
    if (period(id)) return null;
    var p = { id: id, label: label || monthLabel(id), revenue: num(revenue), revenuePadma: 0, revenueKamala: 0, target: num(target), days: daysInMonth(id) };
    state.periods.push(p);
    state.periods.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    var prev = state.periods[state.periods.length - 2];
    if (prev) copyBudget(prev.id, id);
    save();
    return p;
  }

  function updatePeriod(id, patch) {
    var p = period(id);
    if (!p) return null;
    Object.keys(patch).forEach(function (k) {
      if (k === "revenue" || k === "target" || k === "revenuePadma" || k === "revenueKamala") p[k] = num(patch[k]);
      else if (k === "label") p.label = patch[k];
      else if (k === "days") p.days = num(patch[k]) || daysInMonth(id);
    });
    save();
    return p;
  }

  function removePeriod(id) {
    if (state.periods.length <= 1) return false;
    state.periods = state.periods.filter(function (p) { return p.id !== id; });
    state.entries = state.entries.filter(function (e) { return e.periodId !== id; });
    state.budget = state.budget.filter(function (b) { return b.periodId !== id; });
    if (state.settings.defaultPeriod === id) state.settings.defaultPeriod = state.periods[0].id;
    save();
    return true;
  }

  /* ------------------------------ import log ------------------------------ */
  function logImport(info) {
    state.imports.unshift({
      id: uid("imp"),
      at: new Date().toISOString(),
      fileName: info.fileName || "—",
      rows: info.rows || 0,
      periodId: info.periodId || "",
      source: info.source || ""
    });
    state.imports = state.imports.slice(0, 30);
    save();
  }

  /* ------------------------------ backup ------------------------------ */
  function exportJson() {
    return JSON.stringify({ app: "cost-containment-hermina", exportedAt: new Date().toISOString(), data: state }, null, 2);
  }

  function importJson(text) {
    var parsed = JSON.parse(text);
    var s = parsed && parsed.data ? parsed.data : parsed;
    if (!s || !s.bagian || !s.periods) throw new Error("Struktur file backup tidak dikenali.");
    state = migrate(s);
    save();
    return state;
  }

  /* ------------------------------ mapping helper ------------------------------ */
  function findBagianByName(name) {
    if (!name) return null;
    var n = norm(name);
    var hit = null;
    state.bagian.forEach(function (b) {
      if (norm(b.name) === n) hit = b;
    });
    return hit;
  }

  function findKategoriByName(name) {
    if (!name) return null;
    var n = norm(name);
    var hit = null;
    state.kategori.forEach(function (k) {
      if (norm(k.name) === n) hit = k;
    });
    return hit;
  }

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  /* ------------------------------ exports ------------------------------ */
  window.CCStore = {
    KEY: KEY,
    load: load,
    save: save,
    saveSoon: saveSoon,
    reset: reset,
    get state() { return state; },
    set state(s) { state = s; },

    uid: uid,
    num: num,
    parseAmount: parseAmount,
    money: money,
    moneyPlain: moneyPlain,
    shortMoney: shortMoney,
    pct: pct,
    normalizeDate: normalizeDate,
    dateObj: dateObj,
    dateLong: dateLong,
    dateShort: dateShort,
    monthLabel: monthLabel,
    daysInMonth: daysInMonth,
    todayISO: todayISO,

    bagian: bagian,
    bagianName: bagianName,
    kategori: kategori,
    kategoriName: kategoriName,
    period: period,
    periods: periods,
    activeBagian: activeBagian,
    activeKategori: activeKategori,
    addBagian: addBagian,
    addKategori: addKategori,
    findBagianByName: findBagianByName,
    findKategoriByName: findKategoriByName,

    budgetFor: budgetFor,
    budgetEntry: budgetEntry,
    setBudget: setBudget,
    copyBudget: copyBudget,

    allEntries: allEntries,
    entries: entries,
    addEntry: addEntry,
    updateEntry: updateEntry,
    removeEntry: removeEntry,
    removeEntriesBySource: removeEntriesBySource,
    addMany: addMany,
    sum: sum,
    budgetSum: budgetSum,
    byBagian: byBagian,
    byKategori: byKategori,
    daily: daily,
    totalFor: totalFor,
    statusOf: statusOf,

    addPeriod: addPeriod,
    updatePeriod: updatePeriod,
    removePeriod: removePeriod,
    logImport: logImport,
    exportJson: exportJson,
    importJson: importJson
  };
})();
