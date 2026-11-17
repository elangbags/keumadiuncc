# Cost Containment — RS Hermina Madiun

Aplikasi web sederhana untuk mencatat **biaya cost containment per bagian dan per kategori**,
membandingkannya dengan **budget standar**, lalu menampilkan **dashboard rekapan** dan
mengekspor hasilnya ke Excel/CSV.

Aplikasi berjalan **sepenuhnya offline** di komputer ini. Tidak perlu instalasi, tidak perlu
internet, dan tidak memakai Node/Python. Semua file cukup berada dalam satu folder ini.

---

## 1. Cara membuka aplikasi

1. Buka folder `D:\cost-containment`.
2. Klik dua kali **`Buka Cost Containment.cmd`**, atau klik dua kali **`index.html`**.
3. Aplikasi terbuka di browser default. Direkomendasikan **Google Chrome** atau **Microsoft Edge**
   versi terbaru.

> Jika memakai `index.html` langsung, pastikan browser tidak memblokir penyimpanan lokal.
> Chrome/Edge mengizinkan penyimpanan untuk file lokal. Untuk membaca file `.xlsx`,
> browser harus mendukung `DecompressionStream` (Chrome/Edge modern sudah mendukung).

Data tersimpan otomatis di **localStorage browser** pada komputer ini. Karena itu:

- Gunakan **browser yang sama** setiap kali membuka aplikasi.
- Jangan membersihkan data situs / "Clear browsing data" untuk file lokal, karena data bisa hilang.
- Lakukan **backup JSON** secara rutin (lihat bagian 7).

---

## 2. Menu aplikasi

| Menu | Fungsi |
| --- | --- |
| **Dashboard** | Ringkasan pendapatan, realisasi, budget, status over budget, tren harian, komposisi per kategori/bagian, dan tabel status per bagian. |
| **Input Biaya** | Input satu transaksi biaya secara manual: tanggal, unit, bagian, kategori, nominal, keterangan, no. bukti. |
| **Upload Data** | Unggah template input atau workbook Cost Containment asli, pratinjau hasil baca, lalu impor ke sistem. |
| **Rekap & Ekspor** | Matriks budget vs realisasi per bagian × kategori, ekspor Excel/CSV, dan cetak/PDF. |
| **Pengaturan** | Ubah budget, periode & pendapatan, master bagian/kategori, serta backup/restore data. |

Filter **Periode** dan **Unit** di bagian atas berlaku untuk dashboard dan rekap:

- **Semua Unit / RS** = seluruh transaksi.
- **PADMA / KAMALA** = hanya transaksi bertanda unit tersebut. Budget dan pendapatan
  ditampilkan sesuai porsi pendapatan unit itu.

---

## 3. Input biaya manual

1. Buka menu **Input Biaya**.
2. Isi tanggal (default: hari ini), unit, bagian, kategori, nominal, keterangan, dan no. bukti bila ada.
3. Nominal akan tampil juga dalam **terbilang**.
4. Klik **Simpan**. Transaksi langsung masuk ke riwayat dan dashboard.
5. Gunakan kolom pencarian, tombol edit, dan hapus pada tabel riwayat bila perlu.

---

## 4. Upload data dari template

1. Buka menu **Upload Data**.
2. Klik **Unduh Template** untuk mendapatkan file
   `Template_Input_Cost_Containment_<periode>.xlsx`.
3. Isi sheet **INPUT BIAYA** dengan kolom berikut:

   | Kolom | Keterangan | Contoh |
   | --- | --- | --- |
   | `Tanggal` | Format `2026-10-31` atau `31/10/2026` | `2026-10-05` |
   | `Unit` | `RS`, `PADMA`, atau `KAMALA` | `RS` |
   | `Bagian` | Harus sama dengan daftar di sheet **MASTER BAGIAN** | `Poliklinik` |
   | `Kategori` | Harus sama dengan daftar di sheet **MASTER KATEGORI** | `ATK` |
   | `Keterangan` | Uraian singkat (opsional) | `Pembelian ATK` |
   | `Nominal` | Angka rupiah, boleh `1250000` atau `1.250.000` | `350000` |
   | `No. Bukti` | Nomor bukti/kuitansi (opsional) | `KV-001` |

4. Simpan file sebagai `.xlsx`.
5. Di aplikasi, klik area unggah / **Pilih file**, arahkan ke file tersebut.
6. Periksa pratinjau: jumlah baris, total, baris bermasalah, dan duplikat.
7. Pilih mode impor, lalu klik simpan:

   - **Tambahkan ke data** — baris baru ditambahkan tanpa menghapus data lama.
   - **Ganti data periode** — semua transaksi pada periode file dihapus, lalu diganti isi file.
     Tindakan ini meminta konfirmasi.

Baris dengan tanggal/bagian/kategori tidak dikenali ditandai **Bermasalah**. Gunakan
**Ubah pemetaan** untuk memilih bagian/kategori yang benar, atau baris tersebut akan dilewati.

Duplikat (tanggal + bagian + kategori + nominal sama) hanya **diperingatkan**, tidak otomatis
ditolak. Aktifkan opsi **Lewati duplikat** bila ingin melewatinya.

---

## 5. Upload workbook Cost Containment asli

Selain template, aplikasi dapat membaca langsung workbook
`COST CONTAINTMENT OKTOBER 2026.xlsx`. Sheet yang dikenali:

- `BIAYA DAPUR` — makan pasien, makan karyawan, makan dokter
- `ATK BIDANG` — ATK per bagian per minggu
- `ATK DAN BMHP` — ATK dan BMHP/alkes
- `DIKLAT & LEMBUR`
- `LABORATORIUM`
- `RADIOLOGI`
- `BACY LISTRIK ABRT` — BACY, listrik, material, upah
- `MARKETING`

Pembacaan mengikuti struktur tanggal dan kolom pada workbook tersebut. Setelah file dibaca,
selalu **periksa pratinjau** sebelum menyimpan, terutama bagian, kategori, dan total per kategori.

Catatan pemetaan:

- ATK memakai data `ATK BIDANG` bila tersedia.
- BMHP dialokasikan ke bagian sesuai porsi budget BHP masing-masing bagian.
- Nominal kosong / nol dilewati.

---

## 6. Dashboard dan rekap

- **Dashboard** menampilkan KPI: pendapatan, realisasi biaya, budget standar, selisih/over budget,
  persentase pemakaian budget, dan rasio biaya terhadap pendapatan.
- Grafik: tren realisasi harian vs budget harian, komposisi per kategori, dan per bagian.
- **Rekap & Ekspor** menampilkan matriks bagian × kategori dengan nilai budget, realisasi, dan selisih.
- Tombol **Excel** dan **CSV** mengunduh rekap; tombol **Cetak / PDF** membuka dialog cetak browser.

---

## 7. Backup dan restore

Buka **Pengaturan → Data & Backup**.

- **Unduh Backup JSON** — menyimpan seluruh transaksi, budget, periode, dan master data.
- **Pulihkan dari JSON** — memuat kembali file backup.
- **Semua Transaksi (Excel/CSV)** — ekspor seluruh transaksi untuk arsip.

Tersedia juga pilihan reset:

- **Kosongkan semua transaksi** — menghapus transaksi, budget dan master tetap.
- **Reset ke data contoh Oktober 2026** — mengembalikan data demo dari workbook.
- **Mulai dari nol (kosong)** — data contoh dihapus, siap dipakai untuk data nyata.

> Simpan backup JSON sebelum melakukan reset atau mengganti data periode.

---

## 8. Catatan tentang angka budget

Budget standar awal diambil dari **LEMBAR ANALISA** workbook Cost Containment Oktober 2026,
dirinci per bagian dan kategori.

Total budget yang dipakai aplikasi adalah **penjumlahan baris budget detail**, yaitu
**Rp 2.354.316.298** untuk Oktober 2026. Angka ini dapat berbeda sedikit dari ringkasan pada
lembar analisa karena beberapa pos operasional (BACY, material, upah, marketing) tetap dihitung
agar tidak tampil sebagai "tanpa budget".

Bila RS menghendaki angka total tertentu, sesuaikan baris budget melalui
**Pengaturan → Budget** atau unggah **Template Budget** lalu edit nilainya.

---

## 9. Struktur folder

```
cost-containment/
├─ index.html                  Halaman utama aplikasi
├─ Buka Cost Containment.cmd   Peluncur (klik dua kali)
├─ README.md                   Panduan ini
├─ css/
│  └─ app.css                  Tampilan aplikasi
└─ js/
   ├─ seed-daily.js            Data harian contoh dari workbook
   ├─ xlsx-lite.js             Pembaca/penulis XLSX & CSV (tanpa library eksternal)
   ├─ seed.js                  Master bagian/kategori, budget, data contoh
   ├─ store.js                 Penyimpanan & agregasi data
   ├─ charts.js                Grafik SVG
   ├─ app.js                   Inti aplikasi, navigasi, dashboard
   ├─ app-parse.js             Pembaca template & workbook
   ├─ app-input.js             Form input & riwayat
   ├─ app-upload.js            Unggah, pratinjau, impor, unduh template
   ├─ app-rekap.js             Rekap, ekspor, cetak
   └─ app-settings.js          Pengaturan, budget, periode, backup
```

---

## 10. Pemecahan masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| File `.xlsx` gagal dibaca | Gunakan Chrome/Edge terbaru. Browser lama tidak mendukung `DecompressionStream`. |
| Data hilang setelah menutup browser | Data tersimpan per browser. Pastikan membuka dengan browser dan folder yang sama, dan jangan hapus data situs. Pulihkan dari backup JSON. |
| Tombol unduh tidak bereaksi | Izinkan unduhan pada browser, lalu coba lagi. |
| Angka bagian/kategori tidak dikenali saat upload | Nama harus sama dengan master. Gunakan **Ubah pemetaan** pada pratinjau, atau perbaiki nama di file. |
| Tampilan tidak rapi saat dicetak | Gunakan tombol **Cetak / PDF** di menu Rekap, pilih orientasi *landscape*, dan aktifkan *background graphics*. |

---

*Terakhir diperbarui: November 2026.*
