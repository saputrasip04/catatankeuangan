# Catatan Keuangan PWA — Aplikasi Pencatatan Keuangan Pribadi (Offline-First)

Aplikasi Progressive Web App (PWA) modern untuk mencatat pemasukan dan pengeluaran secara cepat, mendukung operasi penuh tanpa koneksi internet (offline-first), serta tersinkronisasi otomatis dengan Google Sheets dan Google Drive pribadi pengguna.

---

## 🌟 Fitur Utama

1. **Offline-First Mutlak:**
   - Seluruh pembacaan dan penulisan transaksi langsung ke IndexedDB lokal perangkat (`keuangan-db`).
   - Saldo dan daftar transaksi tampil seketika (< 100 ms) tanpa menunggu jaringan.
2. **Pencatatan Banyak Baris Bertumpuk (Multi-Row Entry):**
   - Catat banyak transaksi sekaligus dalam satu alur kerja yang cepat.
   - Tombol **+ Tambah baris** selalu menyisipkan baris di bawah baris terakhir dengan fokus otomatis.
   - Pintasan keyboard desktop: `Ctrl/Cmd + Enter` untuk menambah baris baru dengan cepat.
   - Perhitungan otomatis pengeluaran: $\text{Jumlah} = \text{Qty} \times \text{Harga}$.
   - Format mata uang Rupiah otomatis (`Rp 1.250.000`).
3. **Simpan Semua Atomik (*All-or-Nothing*):**
   - Disimpan menggunakan transaksi tunggal IndexedDB (`transaksiRepo.addMany`).
   - Jika terdapat 1 baris tidak valid, tidak ada data yang tersimpan; aplikasi menandai error dan menggulir layar otomatis ke baris yang salah.
4. **Draft Otomatis Tahan Refresh:**
   - Seluruh baris yang sedang diketik (termasuk foto bukti) tersimpan otomatis ke IndexedDB store `draft` (debounce 500 ms).
   - Isian tidak akan hilang jika tab browser tertutup, di-refresh, atau saat perangkat offline.
5. **Kalkulasi Saldo Dinamis:**
   - Saldo = $\sum \text{Masuk} - \sum \text{Keluar}$ (hanya transaksi aktif `deleted = false`).
   - Saldo tidak pernah disimpan statis, mencegah inkonsistensi data.
   - Estimasi *saldo setelah disimpan* diperbarui seketika saat mengetik. Muncul peringatan konfirmasi jika total pengeluaran membuat saldo minus (tidak memblokir).
6. **Lampiran Foto Bukti (Google Drive):**
   - Lampirkan foto barang dan foto nota langsung dari kamera atau galeri per baris pengeluaran.
   - Kompresi gambar otomatis di sisi browser (maksimal 1280 px, JPEG kualitas 0.7, rata-rata < 300 KB).
7. **Navigasi Konsisten di Kiri:**
   - Desktop ($\ge$ 1024 px): Sidebar permanen di sisi kiri layar.
   - Ponsel (< 1024 px): Menu drawer slide-in dari sisi kiri layar dengan tombol burger menu (☰), overlay gelap, dan dukungan tombol `Esc`.
8. **Sinkronisasi Otomatis & Multi-Perangkat:**
   - Polling latar belakang berkala tiap 20 detik saat aplikasi aktif dan instan saat kembali online atau tab dibuka.
   - Jeda tumpang tindih 60 detik (*overlapping window*) untuk meredam perbedaan jam perangkat.
   - Resolusi konflik *Last-Write-Wins (LWW)* berbasis `updatedAt`.
   - Idempoten: ID transaksi menggunakan UUID v4 (`crypto.randomUUID()`), kirim ulang tidak menduplikasi baris di Google Sheets.
9. **Ekspor CSV & Cadangan Data:**
   - Ekspor seluruh transaksi aktif ke file CSV dengan format UTF-8 BOM (kompatibel Excel) dan sanitasi pencegahan formula injection.

---

## 🛠️ Tech Stack

- **Frontend:** React 18 (JavaScript ES Modules), Tailwind CSS, Lucide Icons.
- **Routing:** React Router v6 (`HashRouter` untuk kompatibilitas penuh GitHub Pages).
- **Penyimpanan Lokal:** IndexedDB via library `idb` (Object stores: `transaksi`, `outbox`, `meta`, `draft`).
- **PWA & Caching:** `vite-plugin-pwa` (Workbox) dengan auto-update.
- **Backend Serverless:** Google Apps Script (Runtime V8, single endpoint `/exec`).
- **Database & Penyimpanan Berkas:** Google Sheets (Sheet `Transaksi`) & Google Drive (Folder foto).
- **Pengujian:** Vitest (Unit test fungsi murni & repositori).

---

## 📁 Struktur Direktori

```
keuangan-pwa/
├─ public/
│  └─ icons/                 # icon-192.png, icon-512.png, maskable-512.png
├─ src/
│  ├─ main.jsx               # Entrypoint & inisialisasi Sync Engine
│  ├─ App.jsx                # Routing HashRouter
│  ├─ index.css              # Tailwind base, components, utilities
│  ├─ pages/
│  │  ├─ Beranda.jsx         # Kartu Saldo, ringkasan bulan, 10 transaksi terbaru
│  │  ├─ Pencatatan.jsx      # Baris bertumpuk, ringkasan saldo, simpan semua atomik
│  │  ├─ Riwayat.jsx         # Filter bulan, tipe masuk/keluar, pencarian nama
│  │  ├─ DetailTransaksi.jsx # Info lengkap, pratinjau foto penuh, soft delete
│  │  ├─ EditTransaksi.jsx   # Form edit 1 baris
│  │  └─ Pengaturan.jsx      # URL Apps Script, secret, uji koneksi, ekspor CSV, cache
│  ├─ components/
│  │  ├─ KartuSaldo.jsx
│  │  ├─ ItemTransaksi.jsx
│  │  ├─ FotoInput.jsx
│  │  ├─ StatusSync.jsx
│  │  ├─ layout/
│  │  │  ├─ AppLayout.jsx    # Layout sidebar (desktop) & drawer (mobile)
│  │  │  └─ Sidebar.jsx      # Menu navigasi kiri, saldo mini, status sinkronisasi
│  │  └─ pencatatan/
│  │     ├─ DaftarBaris.jsx
│  │     ├─ BarisPencatatan.jsx
│  │     ├─ RingkasanPencatatan.jsx
│  │     └─ BilahSimpan.jsx
│  ├─ db/
│  │  ├─ index.js            # Inisialisasi IndexedDB (keuangan-db)
│  │  ├─ transaksiRepo.js    # CRUD + addMany atomik
│  │  ├─ outboxRepo.js       # Manajemen antrean kirim & backoff
│  │  └─ draftRepo.js        # Simpan & pulihkan draft baris
│  ├─ sync/
│  │  ├─ api.js              # Klien HTTP (Content-Type: text/plain, follow redirect)
│  │  ├─ engine.js           # Outbox runner FIFO, polling 20s, retry exponential backoff
│  │  └─ merge.js            # Aturan LWW & proteksi pending outbox lokal
│  ├─ lib/
│  │  ├─ saldo.js            # Fungsi murni kalkulasi saldo & ringkasan
│  │  ├─ format.js           # Format Rupiah & tanggal Indonesia
│  │  ├─ validasiBaris.js    # Validasi baris masuk/keluar & deteksi baris kosong
│  │  ├─ compressImage.js    # Kompresi gambar Canvas (max 1280px, jpeg 0.7)
│  │  ├─ csv.js              # Generator CSV (BOM UTF-8, anti formula injection)
│  │  └─ settings.js         # Baca/tulis URL & Secret di localStorage
│  └─ hooks/
│     ├─ useTransaksi.js     # Hook reaktif daftar transaksi
│     ├─ useSaldo.js         # Hook reaktif kalkulasi saldo
│     ├─ useOnlineStatus.js  # Hook reaktif status sinkronisasi
│     └─ usePencatatanDraft.js # Reducer draft baris pencatatan
├─ apps-script/
│  ├─ Code.gs                # Backend Google Apps Script
│  └─ appsscript.json        # Manifest Apps Script (V8 runtime & scopes)
├─ test/                     # Unit test Vitest
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ package.json
└─ README.md
```

---

## 🚀 Panduan Setup & Menjalankan Lokal

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Dev Server
```bash
npm run dev
```
Buka browser pada alamat yang ditampilkan (biasanya `http://localhost:5173`).

### 3. Menjalankan Unit Test
```bash
npm run test
```

### 4. Build Produksi & Preview PWA
```bash
npm run build
npm run preview
```
> **Catatan Pengujian PWA:** Fitur Service Worker dan instalasi aplikasi hanya aktif penuh pada build produksi (`npm run preview`), bukan pada dev server.

---

## ☁️ Panduan Setup Backend Google Apps Script

Ikuti langkah-langkah berikut untuk menghubungkan aplikasi ke Google Sheets & Google Drive pribadi:

1. Buka [Google Apps Script](https://script.google.com/) dan klik **New project**.
2. Beri nama proyek, misalnya: `Keuangan PWA Backend`.
3. Buka file `Code.gs` di editor Apps Script, lalu salin seluruh isi dari berkas lokal [`apps-script/Code.gs`](file:///f:/APPPSPT/pencatatan/apps-script/Code.gs).
4. Klik **Project Settings** (ikon roda gigi di menu kiri) $\rightarrow$ centang opsi **Show "appsscript.json" manifest file in editor**.
5. Kembali ke editor, buka file `appsscript.json`, lalu timpa isinya dengan [`apps-script/appsscript.json`](file:///f:/APPPSPT/pencatatan/apps-script/appsscript.json).
6. **Inisialisasi Spreadsheet & Drive:**
   - Pada dropdown fungsi di toolbar atas editor, pilih fungsi `setup`.
   - Klik **Run** (Jalankan).
   - Berikan izin otorisasi Google Account saat diminta (*Review Permissions* $\rightarrow$ *Advanced* $\rightarrow$ *Go to Keuangan PWA (unsafe)* $\rightarrow$ *Allow*).
   - Skrip akan otomatis membuat Spreadsheet `Keuangan DB` (dengan sheet `Transaksi` dan 14 header kolom yang diformat plain text) serta folder Google Drive `Keuangan - Foto`.
7. **Atur Kunci Rahasia (SECRET):**
   - Buka **Project Settings** $\rightarrow$ scroll ke bagian **Script Properties**.
   - Klik **Add script property**.
   - Masukkan Property: `SECRET`, dan Value: string acak minimal 32 karakter (misal dibuat dari generator password).
   - Klik **Save script properties**.
8. **Deploy sebagai Web App:**
   - Klik tombol **Deploy** di kanan atas $\rightarrow$ **New deployment**.
   - Klik ikon roda gigi (*Select type*) $\rightarrow$ pilih **Web app**.
   - Masukkan konfigurasi berikut:
     - **Execute as:** `Me (akun-anda@gmail.com)`
     - **Who has access:** `Anyone` (Siapa saja)
   - Klik **Deploy**.
   - Salin **Web app URL** yang berakhiran `/exec`.
9. **Hubungkan di Aplikasi:**
   - Buka aplikasi Catatan Keuangan di browser $\rightarrow$ menu **Pengaturan**.
   - Tempel **Web app URL** dan **Kunci Rahasia (SECRET)** yang telah Anda buat.
   - Klik **Simpan Pengaturan**, lalu klik **Uji Koneksi** untuk memverifikasi.

---

## 🌐 Panduan Deployment Frontend

### GitHub Pages
1. File `vite.config.js` sudah diatur dengan `base: './'` dan aplikasi menggunakan `HashRouter`, sehingga dapat berjalan di direktori path mana pun tanpa risiko error 404 saat refresh.
2. Jalankan perintah build:
   ```bash
   npm run build
   ```
3. Publikasikan folder `dist` ke branch `gh-pages` (dapat menggunakan GitHub Actions atau package `gh-pages`).

### Netlify / Vercel
1. Hubungkan repositori Git ke Netlify / Vercel.
2. Build command: `npm run build`.
3. Publish directory: `dist`.

---

## ✅ Verifikasi Kriteria Penerimaan (Acceptance Criteria)

- [x] **AC-01:** Qty 3 × Rp 15.000 menghasilkan jumlah otomatis Rp 45.000 dan saldo berkurang Rp 45.000.
- [x] **AC-02:** Mengedit qty/harga transaksi yang ada memperbarui jumlah dan saldo dinamis.
- [x] **AC-03:** Menghapus transaksi mengembalikan saldo; data ditandai soft delete (`deleted = TRUE`).
- [x] **AC-04:** Pengeluaran yang membuat saldo minus memunculkan peringatan visual dan dialog konfirmasi (tidak memblokir).
- [x] **AC-05:** Operasi saat mode offline tersimpan di IndexedDB dan tersinkronisasi otomatis saat online kembali tanpa duplikat.
- [x] **AC-06:** Kirim ulang transaksi dengan `id` sama bersifat idempoten dan tidak menggandakan baris di Google Sheets.
- [x] **AC-07:** Sinkronisasi multi-perangkat menerima data baru $\le$ 30 detik melalui polling interval berkala.
- [x] **AC-08:** Foto barang dan nota terunggah ke Google Drive dan URL thumbnail tersimpan di Sheet.
- [x] **AC-09:** Request tanpa atau salah secret ditolak server dengan `{ ok: false, error: 'unauthorized' }`.
- [x] **AC-10:** Aplikasi memenuhi standar PWA, dapat dipasang ke layar utama, dan terbuka saat offline.
- [x] **AC-11:** Ekspor CSV memuat seluruh transaksi aktif dengan UTF-8 BOM dan proteksi formula injection.
- [x] **AC-12:** Menu navigasi berada di sebelah kiri (sidebar pada $\ge$ 1024px, drawer pada ponsel); tanpa bottom navigation.
- [x] **AC-13:** Tombol **+ Tambah baris** selalu menambah baris baru di bawah baris terakhir dengan kursor fokus di field pertama.
- [x] **AC-14:** Simpan semua multi-baris menghasilkan transaksi terpisah berurutan sesuai input.
- [x] **AC-15:** Validasi per baris kolektif: jika ada 1 baris salah, penyimpanan dibatalkan dan layar menggulir ke baris pertama yang salah.
- [x] **AC-16:** Ringkasan menampilkan estimasi saldo setelah disimpan yang reaktif saat mengetik.
- [x] **AC-17:** Isian draft tersimpan otomatis ke IndexedDB dan pulih setelah halaman ditutup atau di-refresh.
- [x] **AC-18:** Menggandakan atau menghapus baris hanya memengaruhi baris tersebut; minimal 1 baris selalu tersisa.
- [x] **AC-19:** Simpan semua saat offline berhasil penuh dan tersinkron saat kembali online.
