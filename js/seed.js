/* ============================================================
   seed.js — master data, budget standar, dan data contoh
   Sumber angka: workbook "COST CONTAINTMENT OKTOBER 2026"
   (RS Hermina Madiun)
   ============================================================ */
(function () {
  "use strict";

  var BAGIAN = [
    { id: "poli", name: "Poliklinik", group: "Biaya Langsung" },
    { id: "ranap", name: "Rawat Inap", group: "Biaya Langsung" },
    { id: "bersalin", name: "Kamar Bersalin", group: "Biaya Langsung" },
    { id: "operasi", name: "Kamar Operasi", group: "Biaya Langsung" },
    { id: "fisio", name: "Fisioterapi", group: "Biaya Langsung" },
    { id: "igd", name: "IGD", group: "Biaya Langsung" },
    { id: "farmasi", name: "Farmasi", group: "Biaya Langsung" },
    { id: "lab", name: "Laboratorium", group: "Biaya Langsung" },
    { id: "radiologi", name: "Radiologi", group: "Biaya Langsung" },
    { id: "gizi", name: "Gizi & Dapur", group: "Biaya Langsung" },
    { id: "sdm", name: "SDM & Kepegawaian", group: "Biaya Tidak Langsung" },
    { id: "umum", name: "Umum & RT", group: "Biaya Tidak Langsung" },
    { id: "adm", name: "Administrasi & Keuangan", group: "Biaya Tidak Langsung" },
    { id: "marketing", name: "Marketing", group: "Biaya Tidak Langsung" },
    { id: "ops", name: "Operasional Lain", group: "Biaya Tidak Langsung" }
  ];

  var KATEGORI = [
    { id: "bhp", name: "BHP" },
    { id: "atk", name: "ATK" },
    { id: "oksigen", name: "Oksigen" },
    { id: "sewa", name: "Sewa Alat" },
    { id: "honor", name: "Honor Dokter" },
    { id: "obat", name: "Obat-obatan" },
    { id: "rujukLab", name: "Rujukan Laboratorium" },
    { id: "rujukRad", name: "Rujukan Radiologi" },
    { id: "makanPasien", name: "Makanan Pasien" },
    { id: "makanKaryawan", name: "Makan Karyawan" },
    { id: "makanDokter", name: "Makan Dokter" },
    { id: "makanMarketing", name: "Makan Marketing" },
    { id: "gaji", name: "Gaji Karyawan" },
    { id: "lembur", name: "Lembur" },
    { id: "diklat", name: "Diklat & Pendidikan" },
    { id: "gajiDireksi", name: "Gaji Direksi" },
    { id: "pengobatan", name: "Pengobatan Karyawan" },
    { id: "perlengkapanKaryawan", name: "Perlengkapan Karyawan" },
    { id: "rapat", name: "Biaya Rapat" },
    { id: "bonus", name: "Bonus & THR" },
    { id: "lainTK", name: "Lain-lain Tenaga Kerja" },
    { id: "listrik", name: "Listrik" },
    { id: "telepon", name: "Telepon" },
    { id: "internet", name: "Internet" },
    { id: "gas", name: "Gas" },
    { id: "air", name: "Air" },
    { id: "subscription", name: "Subscription / Aplikasi" },
    { id: "pemeliharaanAlat", name: "Pemeliharaan Alat" },
    { id: "outsourcing", name: "Jasa Outsourcing" },
    { id: "pemeliharaanGedung", name: "Pemeliharaan Gedung" },
    { id: "perlengkapan", name: "Perlengkapan" },
    { id: "kesling", name: "Kebersihan & Kesling" },
    { id: "asuransi", name: "Asuransi Gedung" },
    { id: "harAlkes", name: "Pemeliharaan Alat Kesehatan" },
    { id: "rt", name: "RT (Linen & Cucian)" },
    { id: "bacy", name: "BACY" },
    { id: "material", name: "Material" },
    { id: "upah", name: "Upah Harian" },
    { id: "admUmum", name: "Administrasi Umum & Medik" },
    { id: "perijinan", name: "Perijinan & Perpajakan" },
    { id: "adm", name: "Biaya Administrasi" },
    { id: "mgmtFee", name: "Management Fee" },
    { id: "akreditasi", name: "Akreditasi" },
    { id: "transport", name: "Transport" },
    { id: "ekspedisi", name: "Ekspedisi" },
    { id: "akomodasi", name: "Akomodasi & TPD" },
    { id: "parkir", name: "Reimburse Parkir" },
    { id: "brosur", name: "Brosur & Leaflet" },
    { id: "lain", name: "Lain-lain" },
    { id: "seminar", name: "Seminar & Entertain" },
    { id: "rujukan", name: "Biaya Rujukan" },
    { id: "sumbangan", name: "Sumbangan" },
    { id: "piutang", name: "Cadangan Kerugian Piutang" },
    { id: "csr", name: "CSR" },
    { id: "pemasaran", name: "Pemasaran" },
    { id: "opsLain", name: "Operasional Lain" }
  ];

  /* Budget standar per bagian & kategori (LEMBAR ANALISA, Okt 2026) */
  var BUDGET = [
    ["poli", "bhp", 5494381], ["poli", "atk", 801737],
    ["ranap", "bhp", 8483345], ["ranap", "atk", 1776042], ["ranap", "oksigen", 19777872], ["ranap", "sewa", 1864800],
    ["bersalin", "bhp", 235], ["bersalin", "atk", 80425],
    ["operasi", "bhp", 12929616], ["operasi", "atk", 218090], ["operasi", "sewa", 4927782],
    ["fisio", "bhp", 81359], ["fisio", "atk", 101269],
    ["igd", "honor", 9346262], ["igd", "bhp", 1738344], ["igd", "atk", 394146],
    ["farmasi", "obat", 636090360], ["farmasi", "atk", 1977823], ["farmasi", "bhp", 3196385],
    ["lab", "bhp", 11801214], ["lab", "atk", 398140], ["lab", "honor", 4747098], ["lab", "sewa", 2807190], ["lab", "rujukLab", 44308483],
    ["radiologi", "rujukRad", 29044417], ["radiologi", "bhp", 2328227], ["radiologi", "atk", 78193], ["radiologi", "sewa", 2716032],
    ["gizi", "makanPasien", 27467538],
    ["sdm", "gaji", 657308236], ["sdm", "lembur", 25733992], ["sdm", "gajiDireksi", 41807835], ["sdm", "pengobatan", 18634935],
    ["sdm", "perlengkapanKaryawan", 19416647], ["sdm", "rapat", 420250], ["sdm", "bonus", 110472171], ["sdm", "lainTK", 13402409],
    ["sdm", "makanKaryawan", 20472130], ["sdm", "makanDokter", 5869500], ["sdm", "diklat", 35126885],
    ["umum", "listrik", 84146013], ["umum", "telepon", 5439020], ["umum", "internet", 23523987], ["umum", "gas", 1556000],
    ["umum", "air", 3315000], ["umum", "subscription", 59560275], ["umum", "pemeliharaanAlat", 6794212], ["umum", "outsourcing", 95840469],
    ["umum", "pemeliharaanGedung", 9706955], ["umum", "perlengkapan", 0], ["umum", "kesling", 13281300], ["umum", "asuransi", 8014542],
    ["umum", "harAlkes", 28593867], ["umum", "rt", 38555850], ["umum", "bacy", 38000000], ["umum", "material", 2000000], ["umum", "upah", 149850],
    ["adm", "atk", 5094523], ["adm", "perijinan", 6267333], ["adm", "adm", 1016667], ["adm", "mgmtFee", 71988980],
    ["adm", "akreditasi", 0], ["adm", "transport", 4320000], ["adm", "ekspedisi", 753397], ["adm", "akomodasi", 6297972], ["adm", "parkir", 953],
    ["adm", "brosur", 1478250], ["adm", "lain", 19878832], ["adm", "seminar", 16713650], ["adm", "rujukan", 0], ["adm", "sumbangan", 500],
    ["adm", "piutang", 2162365], ["adm", "csr", 4632496],
    ["marketing", "makanMarketing", 2638250],
    ["ops", "opsLain", 8952995]
  ];

  var PERIODE = [
    { id: "2026-10", label: "Oktober 2026", revenue: 3184112996, revenuePadma: 1986922407, revenueKamala: 1197190589, target: 2891319817, days: 31 },
    { id: "2026-11", label: "November 2026", revenue: 0, revenuePadma: 0, revenueKamala: 0, target: 2891319817, days: 30 }
  ];

  var MANAGEMENT_SRC = "Data contoh (LEMBAR ANALISA / workbook Okt 2026)";

  var BULAN_TXT = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  function periodLabel(id) {
    if (!id) return "-";
    var p = String(id).split("-");
    var m = parseInt(p[1], 10);
    return (BULAN_TXT[m - 1] || p[1]) + " " + p[0];
  }

  function buildEntries() {
    var out = [];
    var n = 0;
    function add(date, bag, kat, amount, note, source, unit) {
      amount = Math.round(amount || 0);
      if (!amount) return;
      out.push({
        id: "seed-" + (++n),
        date: date,
        periodId: "2026-10",
        unit: unit || "RS",
        bagianId: bag,
        kategoriId: kat,
        amount: amount,
        note: note || "",
        ref: "",
        source: source || "Data contoh",
        createdAt: "2026-10-31T09:00:00"
      });
    }

    var daily = window.CC_DAILY || {};
    function series(name, mapFn) {
      var arr = daily[name] || [];
      arr.forEach(function (r) {
        if (r.date && r.amount != null) mapFn(r.date, Math.round(r.amount), r);
      });
    }

    /* ---- 1. Data harian dari worksheet ---- */
    (daily.dapur || []).forEach(function (r) {
      add(r.date, "gizi", "makanPasien", r.pasien, "Makan pasien harian", "BIAYA DAPUR");
      add(r.date, "sdm", "makanKaryawan", r.karyawan, "Makan karyawan harian", "BIAYA DAPUR");
      add(r.date, "sdm", "makanDokter", r.dokter, "Makan dokter harian", "BIAYA DAPUR");
    });
    series("oksigen", function (d, a) { add(d, "ranap", "oksigen", a, "Pemakaian oksigen harian", "ATK DAN BMHP"); });
    series("diklat", function (d, a) { add(d, "sdm", "diklat", a, "Realisasi diklat", "DIKLAT & LEMBUR"); });
    series("lembur", function (d, a) { add(d, "sdm", "lembur", a, "Realisasi lembur harian", "DIKLAT & LEMBUR"); });
    series("lab", function (d, a) { add(d, "lab", "rujukLab", a, "Rujukan laboratorium harian", "LABORATORIUM"); });
    series("radiologi", function (d, a) { add(d, "radiologi", "rujukRad", a, "Rujukan radiologi harian", "RADIOLOGI"); });
    series("bacy", function (d, a) { add(d, "umum", "bacy", a, "BACY harian (berat kg)", "BACY LISTRIK ABRT"); });
    series("listrik", function (d, a) { add(d, "umum", "listrik", a, "Pemakaian listrik harian", "BACY LISTRIK ABRT"); });
    series("material", function (d, a) { add(d, "umum", "material", a, "Material ABRT harian", "BACY LISTRIK ABRT"); });
    series("upah", function (d, a) { add(d, "umum", "upah", a, "Upah harian ABRT", "BACY LISTRIK ABRT"); });
    series("marketing", function (d, a) { add(d, "marketing", "makanMarketing", a, "Makan marketing harian", "MARKETING"); });

    /* ---- 2. ATK per bagian (ATK BIDANG, 4 minggu) ---- */
    var atkMap = {
      "BAHAN POLIKLINIK": "poli", "BAHAN PERAWATAN": "ranap", "BAHAN KAMAR BERSALIN": "bersalin",
      "BAHAN KAMAR OPERASI": "operasi", "BAHAN FISIOTERAPI": "fisio", "IGD": "igd", "OBAT-OBATAN": "farmasi",
      "BAHAN LABORATORIUM": "lab", "RUJUKAN LABORATORIUM": "lab", "BAHAN RONTGEN": "radiologi",
      "MAKANAN PASIEN": "gizi", "ADMINISTRASI": "adm"
    };
    var weekDates = ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"];
    (daily.atkBagian || []).forEach(function (r) {
      var bag = atkMap[String(r.nama || "").toUpperCase()];
      if (!bag) return;
      [r.w1, r.w2, r.w3, r.w4].forEach(function (v, i) {
        if (v) add(weekDates[i], bag, "atk", v, "ATK minggu " + (i + 1) + " (" + r.nama + ")", "ATK BIDANG");
      });
    });

    /* ---- 3. Alokasi BMHP ke bagian langsung sesuai porsi budget BHP ---- */
    var bmhpTotal = (daily.bmhp || []).reduce(function (a, r) { return a + (r.amount || 0); }, 0);
    var bhpLines = BUDGET.filter(function (b) { return b[1] === "bhp"; });
    var bhpSum = bhpLines.reduce(function (a, b) { return a + b[2]; }, 0);
    if (bmhpTotal > 0 && bhpSum > 0) {
      var alok = 0;
      bhpLines.forEach(function (line, i) {
        var amt = i === bhpLines.length - 1 ? bmhpTotal - alok : Math.round(bmhpTotal * line[2] / bhpSum);
        alok += amt;
        add("2026-10-31", line[0], "bhp", amt, "Alokasi BMHP proporsional porsi budget BHP", "ATK DAN BMHP (alokasi)", "RS");
      });
    }

    /* ---- 4. Realisasi bulanan lainnya ---- */
    var monthly = [
      ["2026-10-31", "ranap", "sewa", 1864800, "Sewa alat rawat inap", "Data contoh"],
      ["2026-10-31", "bersalin", "bhp", 235, "BHP kamar bersalin", "Data contoh"],
      ["2026-10-31", "operasi", "sewa", 4927782, "Sewa alat kamar operasi", "Data contoh"],
      ["2026-10-31", "igd", "honor", 9346262, "Honor dokter IGD", "Data contoh"],
      ["2026-10-31", "farmasi", "obat", 641000000, "Pembelian obat-obatan periode Oktober", "Data contoh (estimasi)"],
      ["2026-10-31", "lab", "honor", 4747098, "Honor dokter laboratorium", "Data contoh"],
      ["2026-10-31", "lab", "sewa", 2807190, "Sewa alat laboratorium", "Data contoh"],
      ["2026-10-31", "radiologi", "sewa", 2716032, "Sewa alat radiologi", "Data contoh"],

      ["2026-10-25", "sdm", "gaji", 657308236, "Gaji karyawan bulan Oktober", "Data contoh"],
      ["2026-10-25", "sdm", "gajiDireksi", 41807835, "Gaji direksi bulan Oktober", "Data contoh"],
      ["2026-10-31", "sdm", "pengobatan", 18634935, "Pengobatan karyawan", "Data contoh"],
      ["2026-10-31", "sdm", "perlengkapanKaryawan", 19416647, "Perlengkapan karyawan", "Data contoh"],
      ["2026-10-31", "sdm", "rapat", 420250, "Biaya rapat", "Data contoh"],
      ["2026-10-31", "sdm", "bonus", 110472171, "Bonus & THR karyawan", "Data contoh"],
      ["2026-10-31", "sdm", "lainTK", 13402409, "Lain-lain tenaga kerja", "Data contoh"],

      ["2026-10-31", "umum", "telepon", 5439020, "Telepon", "Data contoh"],
      ["2026-10-31", "umum", "internet", 23523987, "Internet", "Data contoh"],
      ["2026-10-31", "umum", "gas", 1556000, "Gas", "Data contoh"],
      ["2026-10-31", "umum", "air", 3315000, "Air", "Data contoh"],
      ["2026-10-31", "umum", "subscription", 59560275, "Subscription / aplikasi", "Data contoh"],
      ["2026-10-31", "umum", "pemeliharaanAlat", 6794212, "Pemeliharaan alat umum", "Data contoh"],
      ["2026-10-31", "umum", "outsourcing", 95840469, "Jasa outsourcing", "Data contoh"],
      ["2026-10-31", "umum", "pemeliharaanGedung", 9706955, "Pemeliharaan gedung", "Data contoh"],
      ["2026-10-31", "umum", "kesling", 13281300, "Kebersihan & kesling", "Data contoh"],
      ["2026-10-31", "umum", "asuransi", 8014542, "Asuransi gedung", "Data contoh"],
      ["2026-10-31", "umum", "harAlkes", 28593867, "Pemeliharaan alat kesehatan", "Data contoh"],
      ["2026-10-31", "umum", "rt", 38555850, "RT (linen + cucian)", "Data contoh"],

      ["2026-10-31", "adm", "perijinan", 6267333, "Perijinan / perpajakan", "Data contoh"],
      ["2026-10-31", "adm", "adm", 1016667, "Biaya administrasi", "Data contoh"],
      ["2026-10-31", "adm", "mgmtFee", 71988980, "Management fee", "Data contoh"],
      ["2026-10-31", "adm", "transport", 4320000, "Transport", "Data contoh"],
      ["2026-10-31", "adm", "ekspedisi", 753397, "Ekspedisi", "Data contoh"],
      ["2026-10-31", "adm", "akomodasi", 6297972, "Akomodasi & TPD", "Data contoh"],
      ["2026-10-31", "adm", "parkir", 953, "Reimburse parkir", "Data contoh"],
      ["2026-10-31", "adm", "brosur", 1478250, "Brosur & leaflet", "Data contoh"],
      ["2026-10-31", "adm", "lain", 19878832, "Biaya lain-lain", "Data contoh"],
      ["2026-10-31", "adm", "seminar", 16713650, "Seminar / acara & entertain", "Data contoh"],
      ["2026-10-31", "adm", "sumbangan", 500, "Sumbangan", "Data contoh"],
      ["2026-10-31", "adm", "piutang", 2162365, "Cadangan kerugian piutang", "Data contoh"],
      ["2026-10-31", "adm", "csr", 4632496, "CSR", "Data contoh"],
      ["2026-10-31", "ops", "opsLain", 8952995, "Biaya operasional lain", "Data contoh"]
    ];
    monthly.forEach(function (m) { add(m[0], m[1], m[2], m[3], m[4], m[5]); });

    return out;
  }

  function budgetId(periodId, bag, kat) { return "b-" + periodId + "-" + bag + "-" + kat; }

  function buildState() {
    var periods = PERIODE.map(function (p) {
      return { id: p.id, label: p.label, revenue: p.revenue, revenuePadma: p.revenuePadma, revenueKamala: p.revenueKamala, target: p.target, days: p.days };
    });
    var budget = [];
    periods.forEach(function (p) {
      BUDGET.forEach(function (b) {
        budget.push({ id: budgetId(p.id, b[0], b[1]), periodId: p.id, bagianId: b[0], kategoriId: b[1], amount: b[2] });
      });
    });
    return {
      version: 1,
      seeded: true,
      bagian: BAGIAN.map(function (b) { return { id: b.id, name: b.name, group: b.group, active: true }; }),
      kategori: KATEGORI.map(function (k) { return { id: k.id, name: k.name, active: true }; }),
      periods: periods,
      budget: budget,
      entries: buildEntries(),
      imports: [],
      settings: { defaultPeriod: "2026-10" }
    };
  }

  window.CCData = {
    bagian: BAGIAN,
    kategori: KATEGORI,
    budget: BUDGET,
    periods: PERIODE,
    periodLabel: periodLabel,
    monthlySource: MANAGEMENT_SRC,
    buildState: buildState
  };
})();
