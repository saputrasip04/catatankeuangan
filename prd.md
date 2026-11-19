# prd.md — Product Requirements Document

**Produk:** Aplikasi Pencatatan Keuangan (PWA)
**Versi dokumen:** 1.1
**Bahasa antarmuka:** Indonesia
**Platform:** Web (PWA, mobile-first, installable)

---

## 1. Latar Belakang

Pengguna ingin mencatat pemasukan dan pengeluaran dengan cepat dari ponsel, termasuk saat tidak ada internet, dengan data tersimpan di Google Sheets dan Google Drive milik sendiri. Untuk pengeluaran, pengguna ingin mencatat detail barang (nama, qty, satuan, harga) serta melampirkan foto barang dan foto nota sebagai bukti.

## 2. Tujuan

1. Mencatat pemasukan dan pengeluaran dalam hitungan detik.
2. Saldo selalu akurat dan otomatis berkurang/bertambah mengikuti transaksi.
3. Tetap bisa dipakai penuh tanpa internet, lalu tersinkron otomatis saat online.
4. Data dimiliki pengguna sepenuhnya (Google Sheets + Drive pribadi), tanpa biaya server.
5. Data dari beberapa perangkat tersinkron (hampir realtime, ≤ 30 detik).
6. Mencatat banyak transaksi sekaligus: setiap pencatatan baru ditambahkan sebagai baris di bawah baris sebelumnya, lalu disimpan bersamaan.
7. Menu navigasi berada di sebelah kiri layar agar mudah dijangkau dan konsisten di semua halaman.

## 3. Bukan Tujuan (Di Luar Lingkup v1)

- Multi-dompet / multi-akun keuangan
- Kategori pengeluaran dan grafik (kandidat v2)
- Multi-pengguna dengan hak akses berbeda
- Anggaran (budget) dan pengingat tagihan
- Konversi mata uang
- Sinkronisasi push sungguhan (Google Sheets tidak mendukungnya; dipakai polling)

## 4. Pengguna Sasaran

Individu atau keluarga kecil yang mencatat keuangan harian, memakai ponsel Android/iOS, dan nyaman dengan ekosistem Google. Pemakaian bersama (misal pasangan) dimungkinkan dengan berbagi URL Web App dan secret yang sama.

## 5. User Stories

| ID | Sebagai pengguna, saya ingin... | Agar... |
|----|---------------------------------|---------|
| US-01 | mencatat pengeluaran dengan nama, qty, satuan, harga | saya tahu persis apa yang dibeli |
| US-02 | jumlah pengeluaran terhitung otomatis dari qty × harga | tidak perlu menghitung manual |
| US-03 | melampirkan foto barang dan foto nota | ada bukti pembelian |
| US-04 | mencatat pemasukan dengan sumber dan jumlah | saldo saya bertambah |
| US-05 | saldo otomatis berkurang saat ada pengeluaran | saya selalu tahu sisa uang |
| US-06 | mengedit atau menghapus transaksi dan saldo ikut menyesuaikan | kesalahan input bisa diperbaiki |
| US-07 | diberi peringatan jika pengeluaran membuat saldo minus | saya sadar sebelum menyimpan |
| US-08 | melihat riwayat dengan filter bulan, jenis, dan pencarian | mudah menemukan transaksi lama |
| US-09 | membuka detail dan melihat foto ukuran penuh | memeriksa nota dengan jelas |
| US-10 | mencatat saat offline dan tersinkron otomatis saat online | tidak terhambat sinyal |
| US-11 | data dari perangkat lain muncul otomatis | memakai beberapa perangkat |
| US-12 | mengekspor data ke CSV | punya salinan cadangan |
| US-13 | memasang aplikasi ke layar utama | terasa seperti aplikasi asli |
| US-14 | menu aplikasi berada di sebelah kiri | navigasi cepat dan konsisten |
| US-15 | menambah pencatatan baru di bawah pencatatan sebelumnya pada satu halaman | bisa input banyak transaksi sekaligus tanpa bolak-balik |
| US-16 | melihat saldo setelah simpan sebelum menyimpan | tahu dampak seluruh baris ke saldo |
| US-17 | isian yang belum disimpan tidak hilang saat halaman tertutup | tidak perlu mengulang input |
| US-18 | menggandakan atau menghapus satu baris | mempercepat input barang serupa dan memperbaiki salah ketik |

## 6. Kebutuhan Fungsional

### 6.1 Tata Letak dan Navigasi
- **Menu berada di sebelah kiri.** Navigasi utama berupa sidebar kiri dengan item: **Beranda**, **Pencatatan**, **Riwayat**, **Pengaturan**.
- **Desktop/tablet (≥ 1024 px):** sidebar kiri selalu terlihat. Bagian bawah sidebar menampilkan saldo ringkas dan indikator status sinkronisasi. Halaman Pencatatan memakai dua kolom: daftar baris di kiri (utama) dan panel **Ringkasan** di kanan.
- **Ponsel (< 1024 px):** sidebar menjadi *drawer* dari kiri, dibuka lewat tombol menu (☰) di pojok kiri atas; menutup otomatis setelah memilih menu atau menekan area gelap di luar drawer. Panel Ringkasan menjadi kartu ringkas di atas daftar baris.
- Bottom navigation **tidak dipakai**.

```
┌─────────────┬─────────────────────────────────────────────┬──────────────┐
│ Keuangan    │ Pencatatan                                  │ Ringkasan    │
│             │ ┌ Baris 1 ─────── [Masuk|Keluar] [⧉] [×] ──┐ │              │
│ Beranda     │ │ Nama · Qty · Satuan · Harga · Jumlah    │ │ Saldo kini   │
│ ▶ Pencatatan│ │ Foto barang · Foto nota · Catatan       │ │ Rp 2.500.000 │
│ Riwayat     │ └─────────────────────────────────────────┘ │              │
│ Pengaturan  │ ┌ Baris 2 ────────────────────────────────┐ │ Perubahan    │
│             │ │ ...                                     │ │ − Rp 70.000  │
│ Saldo       │ └─────────────────────────────────────────┘ │              │
│ Rp 2.500.000│          [ + Tambah baris ]                 │ Saldo akhir  │
│ ● Online    │ ─────────────────────────────────────────── │ Rp 2.430.000 │
│             │ 2 baris · Keluar Rp 70.000  [Simpan semua]  │              │
└─────────────┴─────────────────────────────────────────────┴──────────────┘
```

### 6.2 Pencatatan Banyak Baris
- Halaman **Pencatatan** berisi daftar baris yang **bertumpuk dari atas ke bawah**. Satu baris = satu transaksi.
- Saat dibuka tersedia 1 baris kosong. Tombol **+ Tambah baris** tepat di bawah baris terakhir menambahkan baris baru **di bawahnya**, lalu kursor langsung berada di field pertama baris baru. Baris baru mewarisi jenis dan tanggal dari baris sebelumnya.
- Pintasan keyboard (desktop): `Ctrl/Cmd + Enter` atau `Enter` pada field terakhir baris terakhir menambah baris baru.
- Setiap baris memiliki: nomor baris, pilihan jenis **Masuk / Keluar**, tombol **Gandakan**, dan tombol **Hapus baris** (minimal 1 baris tersisa; ada konfirmasi bila baris sudah terisi).
- Field setiap baris menyesuaikan jenisnya (lihat 6.3 dan 6.4). Foto barang dan foto nota dilampirkan per baris.
- Baris yang belum disentuh/kosong diabaikan saat menyimpan.
- **Validasi per baris.** Baris bermasalah ditandai, layar menggulir ke baris pertama yang salah, dan penyimpanan tidak berjalan sampai semua baris terisi valid.
- **Bilah simpan (menempel di bawah layar):** jumlah baris, total masuk, total keluar, dan tombol **Simpan semua (N)**.
- **Ringkasan:** saldo saat ini, perubahan dari baris-baris yang sedang diisi, dan **saldo setelah disimpan** (diperbarui langsung saat mengetik). Jika saldo setelah disimpan minus, tampil peringatan dan konfirmasi saat menyimpan (tidak memblokir).
- **Simpan semua:** seluruh baris tersimpan lokal sekaligus (semua-atau-tidak-sama-sekali). Tiap baris menjadi transaksi tersendiri dengan `id` sendiri, urutan input dipertahankan, lalu masuk antrean sinkronisasi.
- **Draft otomatis:** isian yang belum disimpan (termasuk foto) tersimpan di perangkat dan tidak hilang saat halaman di-refresh, ditutup, atau offline. Tersedia tombol **Kosongkan semua**.
- Setelah berhasil: daftar kembali ke 1 baris kosong dan muncul pesan "N transaksi tersimpan".
- Mengedit transaksi yang sudah ada memakai tampilan satu baris yang sama.

### 6.3 Field Baris Keluar
Berlaku untuk setiap baris berjenis **Keluar** (juga pada edit).
- Field: **nama pengeluaran**, **qty**, **satuan** (dropdown: pcs, kg, liter, dus, lainnya), **harga satuan**, **jumlah** (read-only, otomatis = qty × harga), **tanggal** (default hari ini), **foto barang**, **foto nota**, **catatan**.
- Foto dapat diambil dari kamera atau galeri; tersedia preview, ganti, dan hapus.
- Foto dikompres di browser sebelum dikirim (sisi terpanjang maks. 1280 px, JPEG kualitas ≈ 0,7).
- Validasi: nama wajib; qty > 0; harga > 0. Foto bersifat opsional.
- Input dan tampilan uang berformat Rupiah (`Rp 1.250.000`).

### 6.4 Field Baris Masuk
- Field: **sumber/nama**, **jumlah**, **tanggal** (default hari ini), **catatan**.
- Validasi: nama wajib; jumlah > 0.

### 6.5 Saldo
- Saldo = total pemasukan − total pengeluaran (hanya transaksi yang tidak dihapus).
- Dihitung dari data lokal; bukan nilai tersimpan terpisah.
- Berubah otomatis saat transaksi ditambah, diedit, dihapus, atau masuk dari sinkronisasi.
- Jika pengeluaran baru/hasil edit, atau total beberapa baris yang disimpan sekaligus, membuat saldo minus, tampilkan **peringatan konfirmasi** (tidak memblokir).

### 6.6 Riwayat
- Daftar transaksi terurut dari terbaru.
- Filter: bulan, jenis (semua/masuk/keluar), pencarian nama.
- Tap item → halaman detail: semua field, foto barang dan nota (tap untuk ukuran penuh), tombol Edit dan Hapus.
- Hapus meminta konfirmasi.

### 6.7 Edit dan Hapus
- Edit memuat ulang form dengan nilai lama; foto lama dapat dipertahankan atau diganti.
- Hapus bersifat soft delete (data tidak hilang dari Sheet, hanya ditandai).

### 6.8 Sinkronisasi
- Semua perubahan tersimpan lokal terlebih dahulu dan masuk antrean.
- Antrean dikirim berurutan; gagal → coba ulang dengan exponential backoff; otomatis jalan saat kembali online.
- Polling data baru tiap 20 detik saat tab aktif dan segera saat tab kembali terlihat.
- Konflik diselesaikan dengan *last-write-wins* berdasarkan `updatedAt`.
- Indikator status selalu tampil: Online / Offline / Menyinkronkan... / N menunggu terkirim.

### 6.9 Pengaturan
- Input **URL Web App** dan **kunci rahasia (secret)**, dengan tombol uji koneksi.
- Tombol **sinkron manual**.
- **Ekspor CSV** (semua transaksi aktif).
- **Hapus cache lokal** (dengan peringatan bila masih ada antrean belum terkirim atau draft pencatatan yang belum disimpan).

### 6.10 PWA
- Dapat dipasang (installable): manifest, ikon 192/512 dan maskable, theme color, `display: standalone`.
- Aplikasi terbuka tanpa internet (app shell di-cache oleh service worker).

## 7. Halaman dan Alur

1. **Beranda** — kartu saldo, total masuk dan keluar bulan ini, 10 transaksi terbaru, indikator sinkronisasi.
2. **Pencatatan** — daftar baris bertumpuk (Masuk/Keluar per baris), tombol *+ Tambah baris*, ringkasan saldo, *Simpan semua*.
3. **Riwayat** — filter + daftar → **Detail** (lihat, edit, hapus).
4. **Pengaturan** — koneksi, sinkron, ekspor, cache.

Navigasi: menu kiri (sidebar di desktop, drawer di ponsel) dengan 4 item: Beranda, Pencatatan, Riwayat, Pengaturan.

**Alur utama (catat beberapa transaksi):**
Buka Pencatatan → isi baris 1 (Keluar: nama, qty, satuan, harga → jumlah otomatis → foto barang/nota) → tekan **+ Tambah baris** → isi baris 2 di bawahnya (mis. Masuk: sumber, jumlah) → lanjut menambah baris bila perlu → periksa *saldo setelah disimpan* → **Simpan semua** → semua transaksi langsung tampil di Beranda/Riwayat dan saldo berubah → disinkronkan di latar belakang.

## 8. Kebutuhan Non-Fungsional

| Aspek | Target |
|-------|--------|
| Performa | Buka aplikasi < 2 detik (cache hangat); aksi simpan terasa instan (< 100 ms ke UI) |
| Offline | Seluruh fitur baca/tulis berfungsi tanpa internet |
| Sinkronisasi | Perangkat lain menerima perubahan ≤ 30 detik saat online |
| Keandalan | Tidak ada data hilang meski aplikasi ditutup saat antrean belum terkirim |
| Keamanan | Semua request butuh secret; secret tidak ada di kode/repo |
| Kompatibilitas | Chrome/Edge/Safari versi terbaru (Android & iOS) |
| Ukuran foto | Terkompresi; rata-rata < 300 KB per foto |
| Aksesibilitas | Kontras cukup, target sentuh ≥ 44 px, label form jelas, drawer dapat dioperasikan dengan keyboard |
| Responsif | Sidebar tetap pada ≥ 1024 px; drawer pada < 1024 px; tidak ada scroll horizontal |
| Ketahanan input | Draft pencatatan tersimpan otomatis; tidak hilang saat refresh/offline |
| Biaya | Gratis (dalam kuota Google Apps Script dan hosting statis) |

## 9. Batasan dan Asumsi

- Kuota harian Apps Script berlaku; cocok untuk pemakaian pribadi/keluarga.
- Cold start Apps Script 1–3 detik; UI tidak boleh menunggunya.
- Foto di Drive diatur "siapa pun dengan link" agar dapat ditampilkan; tidak privat penuh.
- Web App berakses "Anyone" bersifat publik; perlindungan hanya dari secret.
- Satu spreadsheet = satu set data keuangan.

## 10. Kriteria Penerimaan

- [ ] **AC-01** Saat menambah pengeluaran qty 3 × harga Rp 15.000, jumlah tampil `Rp 45.000` dan saldo berkurang Rp 45.000.
- [ ] **AC-02** Mengubah qty/harga pada transaksi yang ada memperbarui jumlah dan saldo.
- [ ] **AC-03** Menghapus transaksi mengembalikan saldo; baris di Sheet bertanda `deleted = TRUE`.
- [ ] **AC-04** Pengeluaran yang membuat saldo minus menampilkan peringatan dan tetap bisa disimpan jika dikonfirmasi.
- [ ] **AC-05** Mode pesawat: tambah 3 transaksi → tampil langsung → nyalakan internet → ketiganya muncul di Sheet tanpa duplikat.
- [ ] **AC-06** Kirim ulang transaksi dengan `id` sama tidak membuat baris baru.
- [ ] **AC-07** Perangkat B menampilkan transaksi dari perangkat A ≤ 30 detik.
- [ ] **AC-08** Foto barang dan nota terunggah ke Drive, URL-nya tersimpan di Sheet, dan tampil di detail.
- [ ] **AC-09** Request tanpa/ salah secret ditolak server.
- [ ] **AC-10** Aplikasi dapat dipasang ke layar utama dan terbuka saat offline.
- [ ] **AC-11** Ekspor CSV berisi seluruh transaksi aktif dengan kolom lengkap.
- [ ] **AC-12** Menu navigasi berada di kiri: sidebar tetap pada layar ≥ 1024 px, drawer dari kiri pada layar lebih kecil; tidak ada bottom navigation.
- [ ] **AC-13** Menekan **+ Tambah baris** selalu menambah baris **di bawah** baris terakhir, dan kursor pindah ke field pertama baris baru.
- [ ] **AC-14** Mengisi 3 baris (2 Keluar, 1 Masuk) lalu **Simpan semua** menghasilkan 3 transaksi terpisah dengan urutan sesuai input, dan saldo sama dengan saldo awal + masuk − keluar semua baris.
- [ ] **AC-15** Jika ada satu baris tidak valid, tidak ada yang tersimpan; baris bermasalah ditandai dan layar menggulir ke baris tersebut.
- [ ] **AC-16** Ringkasan menampilkan *saldo setelah disimpan* yang berubah langsung saat mengetik; bila minus muncul peringatan dan tetap bisa disimpan setelah konfirmasi.
- [ ] **AC-17** Refresh atau menutup tab saat ada baris terisi lalu membukanya kembali memulihkan seluruh baris (termasuk foto).
- [ ] **AC-18** Menghapus atau menggandakan baris hanya memengaruhi baris itu; baris terakhir yang tersisa tidak dapat dihapus.
- [ ] **AC-19** Simpan semua saat offline berhasil dan seluruh baris tersinkron tanpa duplikat saat online.

## 11. Rencana Pengembangan Lanjutan (Backlog)

- Kategori pengeluaran + filter kategori
- Grafik bulanan (pemasukan vs pengeluaran, per kategori)
- Multi-dompet dan transfer antar dompet
- Anggaran bulanan dan notifikasi
- Impor dari CSV
- Penguncian aplikasi (PIN/biometrik)
