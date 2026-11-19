# agent.md — Panduan untuk AI Coding Agent

Dokumen ini adalah aturan kerja untuk AI agent (Claude Code, dll.) yang membangun dan memelihara proyek **Aplikasi Pencatatan Keuangan PWA**.
Baca juga: `prd.md` (apa yang dibangun), `tech.md` (bagaimana dibangun), `database.md` (struktur data).

---

## 1. Ringkasan Proyek

PWA pencatatan keuangan pribadi, **offline-first**, antarmuka **Bahasa Indonesia**, **mobile-first**.

- Frontend: React + Vite (JavaScript) + Tailwind CSS, dihosting statis (GitHub Pages / Netlify).
- Backend: Google Apps Script (Web App `doGet` / `doPost`) sebagai API.
- Database: Google Sheets. Foto barang dan nota: Google Drive.
- Lokal: IndexedDB (library `idb`). UI **selalu membaca dari IndexedDB**, sinkronisasi berjalan di latar belakang.
- Tata letak: menu navigasi di **sebelah kiri** (sidebar di desktop, drawer di ponsel). Halaman Pencatatan berisi **baris bertumpuk ke bawah**; tiap pencatatan baru ditambahkan di bawah baris sebelumnya.

## 2. Prinsip yang Tidak Boleh Dilanggar

1. **Offline-first.** UI tidak boleh menunggu jaringan. Setiap aksi tulis disimpan ke IndexedDB dulu, tampil seketika, lalu masuk antrean (outbox).
2. **Saldo tidak pernah disimpan.** Saldo = total `masuk` − total `keluar` (hanya `deleted = false`), dihitung dari IndexedDB setiap kali dibutuhkan.
3. **ID dibuat di client (UUID v4).** Server harus idempoten: mengirim ulang transaksi yang sama tidak boleh menggandakan baris.
4. **Soft delete.** Menghapus = `deleted = true` + `updatedAt` diperbarui. Jangan pernah menghapus baris fisik di Sheet.
5. **Semua request ke Apps Script memakai `Content-Type: text/plain;charset=utf-8`** dengan body berupa JSON string, agar tidak memicu CORS preflight.
6. **Setiap request wajib membawa `secret`.** Server menolak dengan `{ok:false, error:"unauthorized"}` bila salah.
7. **Jumlah pengeluaran = `qty × harga`**, dihitung otomatis (read-only di form) dan dihitung ulang di server.
8. **Peringatan, bukan blokir**, bila pengeluaran membuat saldo minus.
9. **Secret dan URL Web App tidak boleh di-hardcode** di kode atau di-commit. Keduanya diisi pengguna di halaman Pengaturan dan disimpan di perangkat.
10. **Menu navigasi selalu di kiri.** Sidebar tetap pada layar ≥ 1024 px, drawer dari kiri pada layar lebih kecil. Jangan memakai bottom navigation.
11. **Pencatatan = baris bertumpuk.** Tombol **+ Tambah baris** selalu menambah baris **di bawah** baris terakhir (bukan di atas), lalu memfokuskan field pertama baris baru. Satu baris = satu transaksi (punya `id` sendiri) dan jenisnya (Masuk/Keluar) dipilih per baris.
12. **Simpan semua bersifat atomik.** Semua baris valid disimpan dalam **satu transaksi IndexedDB** (`addMany`). Jika ada satu baris tidak valid, tidak ada yang tersimpan.
13. **Draft otomatis.** Isian yang belum disimpan (termasuk foto) disimpan ke store `draft` dan dipulihkan saat halaman dibuka kembali. Draft bukan data keuangan: tidak dihitung ke saldo dan tidak disinkronkan.

## 3. Konvensi Kode

**Umum**
- JavaScript modern (ES modules), tanpa TypeScript kecuali diminta.
- Komponen React fungsional + hooks. Tidak ada class component.
- Nama file komponen `PascalCase.jsx`, utilitas/hooks `camelCase.js`.
- Teks antarmuka, pesan error, dan label dalam **Bahasa Indonesia**. Nama variabel dan komentar kode dalam bahasa Inggris atau Indonesia, tapi konsisten.
- Jangan pakai `localStorage` untuk data transaksi. Gunakan IndexedDB. `localStorage` hanya untuk pengaturan kecil (URL, secret).

**Format**
- Mata uang: `Rp 1.250.000` (`Intl.NumberFormat('id-ID')`). Simpan sebagai angka bulat (rupiah), bukan string.
- Tanggal disimpan `YYYY-MM-DD` (string). Tampilkan dengan locale `id-ID`.
- Waktu sistem (`createdAt`, `updatedAt`) disimpan sebagai epoch milidetik (number).

**UI**
- Tailwind CSS, mobile-first, target sentuh minimal 44 px.
- Layout: `AppLayout` (sidebar kiri + konten). Breakpoint utama `lg` (1024 px). Drawer ponsel wajib punya overlay, tombol `Esc`, focus trap, dan `aria-expanded`.
- Pada halaman Pencatatan, gunakan `React.memo` untuk baris agar mengetik di satu baris tidak merender seluruh daftar.
- Setiap aksi tulis memberi umpan balik (toast) dan tidak memblokir layar.
- Status sinkronisasi selalu terlihat: `Online`, `Offline`, `Menyinkronkan...`, `N menunggu terkirim`.

## 4. Struktur Pekerjaan yang Diharapkan

Kerjakan bertahap, dan pastikan tiap tahap bisa dijalankan sebelum lanjut:

1. **Setup proyek:** Vite + React + Tailwind + `vite-plugin-pwa` + `idb`. Atur `base` Vite sesuai tempat hosting.
2. **Backend Apps Script:** `Code.gs`, `appsscript.json`, fungsi `setup()`, `doGet`, `doPost`, `LockService`, validasi, secret.
3. **Layer data lokal:** skema IndexedDB, repository (CRUD), selector saldo.
4. **Layer sinkronisasi:** outbox, pengiriman berurutan + backoff, polling, merge LWW.
5. **Layout dan UI:** `AppLayout` (sidebar kiri/drawer), Beranda, **Pencatatan (baris bertumpuk + ringkasan + draft + Simpan semua)**, Riwayat (+ detail + edit satu baris), Pengaturan.
6. **Foto:** kompresi client, preview, antrean Blob, upload ke Drive.
7. **PWA:** manifest, ikon, service worker, uji install dan offline.
8. **Dokumentasi:** README, langkah setup Apps Script, langkah deploy, cara uji.

## 5. Yang Harus Dilakukan

- Validasi di client **dan** server (jangan percaya client).
- Tangani semua kegagalan jaringan dengan elegan: tidak crash, data tidak hilang, antrean tetap aman.
- Tulis fungsi murni (saldo, format Rupiah, merge LWW) agar mudah diuji.
- Beri komentar pada bagian yang tidak jelas, terutama sinkronisasi dan penanganan redirect Apps Script.
- Tambahkan unit test minimal untuk: kalkulasi saldo, `saldoSetelah`, `validasiBaris`, reducer baris pencatatan (tambah di bawah, gandakan, hapus, minimal 1 baris), `jumlah = qty × harga`, merge LWW, idempotensi upsert.

## 6. Yang Tidak Boleh Dilakukan

- Jangan menyimpan saldo sebagai kolom/nilai tersendiri.
- Jangan menghapus baris fisik di Google Sheets.
- Jangan menambah library besar tanpa alasan kuat (jaga ukuran bundle).
- Jangan memakai header kustom (selain `Content-Type: text/plain`) pada request ke Apps Script.
- Jangan menaruh secret, URL deployment pribadi, atau ID Drive/Spreadsheet di repo.
- Jangan memindahkan menu ke bawah atau atas layar, dan jangan menyisipkan baris baru di atas baris yang sudah ada.
- Jangan menyimpan baris pencatatan satu per satu dengan transaksi terpisah; gunakan `addMany` agar atomik.
- Jangan menggunakan `rowId` (kunci React) sebagai `id` transaksi; `id` transaksi dibuat terpisah dan tetap sama bila simpan diulang.
- Jangan mengubah skema Sheet atau IndexedDB tanpa memperbarui `database.md` dan menambah migrasi.
- Jangan menambah fitur di luar `prd.md` tanpa konfirmasi (lihat bagian "Di Luar Lingkup").

## 7. Perintah Umum

```bash
npm install          # pasang dependensi
npm run dev          # jalankan dev server
npm run build        # build produksi
npm run preview      # uji hasil build (wajib untuk uji PWA/service worker)
npm run test         # unit test
```

> Service worker hanya aktif penuh pada build produksi. Uji fitur PWA dan offline dengan `npm run preview`, bukan `npm run dev`.

## 8. Definition of Done

Sebuah fitur dianggap selesai bila:

- [ ] Berfungsi saat **online** dan **offline**.
- [ ] Data tetap ada setelah refresh dan setelah aplikasi ditutup.
- [ ] Data tersinkron ke Sheet, dan muncul di perangkat kedua dalam ≤ 30 detik.
- [ ] Saldo benar setelah tambah, edit, hapus, dan sinkron dari perangkat lain.
- [ ] Menu ada di kiri (sidebar ≥ 1024 px, drawer di bawahnya) dan tidak ada scroll horizontal.
- [ ] **+ Tambah baris** menambah di bawah, fokus pindah ke baris baru, dan *saldo setelah disimpan* akurat.
- [ ] Draft pulih setelah refresh; **Simpan semua** menolak total jika ada baris tidak valid.
- [ ] Validasi dan pesan error berbahasa Indonesia tampil jelas.
- [ ] Tidak ada error di konsol; Lighthouse PWA lolos "installable".
- [ ] Dokumen terkait (`prd.md`, `tech.md`, `database.md`) diperbarui bila ada perubahan.

## 9. Bila Ragu

Utamakan: **keamanan data > tidak kehilangan input pengguna > kesederhanaan > kecepatan**. Jika sebuah keputusan tidak tercantum di dokumen, pilih opsi paling sederhana yang tidak melanggar prinsip di bagian 2, lalu catat keputusan itu di README.
