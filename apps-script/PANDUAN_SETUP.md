# Panduan Menghubungkan ke Google Apps Script & Google Drive

Ikuti langkah-langkah mudah berikut untuk menghubungkan aplikasi Catatan Keuangan PWA dengan Google Sheets dan Google Drive Anda:

---

### Langkah 1: Buat Project Baru di Google Apps Script
1. Buka browser dan kunjungi: **[script.google.com](https://script.google.com/)**
2. Klik tombol **New Project** (+ Proyek Baru) di kiri atas.
3. Beri nama proyek di kiri atas (misalnya: `Catatan Keuangan Backend`).

---

### Langkah 2: Salin Kode Backend
1. Di editor file `Code.gs`, hapus semua kode bawaan yang ada (`function myFunction() { ... }`).
2. Buka file **`apps-script/Code.gs`** dari proyek ini, salin seluruh kodenya, dan tempelkan ke editor Apps Script.
3. Tekan **Ctrl + S** (atau ikon disket 💾) untuk menyimpan.

---

### Langkah 3: Atur Kunci Rahasia (SECRET)
1. Di bilah menu sebelah kiri Google Apps Script, klik ikon roda gigi **Project Settings** (Setelan Proyek ⚙️).
2. Gulir ke bawah sampai menemukan bagian **Script Properties** (Properti Skrip).
3. Klik tombol **Add script property** (Tambah properti skrip):
   - **Property:** `SECRET`
   - **Value:** Buat kata sandi/kunci unik (minimal 32 karakter, contoh: `kunci-rahasia-keuangan-pwa-2026-aman-sekali`)
4. Klik **Save script properties** (Simpan properti skrip).
   > *Catatan: Simpan atau catat kunci SECRET ini karena akan dimasukkan ke halaman Pengaturan aplikasi.*

---

### Langkah 4: Jalankan Fungsi `setup()` Sekali Saja
1. Kembali ke editor kode dengan mengklik ikon kurung siku `<>` (**Editor**) di menu kiri.
2. Di toolbar atas, temukan dropdown fungsi (di sebelah tombol Debug & Run), lalu pilih **`setup`**.
3. Klik tombol **Run** (Jalankan ▶).
4. Google akan menampilkan jendela persetujuan (*Authorization Required*):
   - Klik **Review permissions** (Tinjau izin).
   - Pilih akun Google Anda.
   - Jika muncul peringatan *"Google hasn't verified this app"*, klik tautan kecil **Advanced** (Lanjutan) di bawah, lalu klik **Go to Catatan Keuangan Backend (unsafe)**.
   - Klik tombol biru **Allow** (Izinkan).
5. Tunggu 5-10 detik hingga muncul pesan `Execution completed` di log bawah.
   > **Fungsi ini otomatis:**
   > - Membuat Spreadsheet baru bernama **"Keuangan DB"** di Google Drive Anda (sudah diformat rapi dengan sheet `Transaksi` dan kolom `bkuId`).
   > - Membuat Folder baru bernama **"Keuangan - Foto"** di Google Drive Anda untuk menyimpan foto barang & nota.

---

### Langkah 5: Terapkan (Deploy) Sebagai Web App
1. Di pojok kanan atas, klik tombol biru **Deploy** (Terapkan) -> Pilih **New deployment** (Penerapan baru).
2. Di jendela yang muncul, klik ikon roda gigi ⚙️ di sebelah kiri *Select type* -> Pilih **Web app**.
3. Atur konfigurasi sebagai berikut:
   - **Description:** `v1`
   - **Execute as:** `Me (email Anda)`
   - **Who has access:** `Anyone` (Siapa saja)  
     *(Wajib memilih "Anyone" agar aplikasi PWA di browser dapat mengirim data. Tenang, keamanan tetap 100% terlindungi oleh kunci SECRET yang dibuat tadi).*
4. Klik **Deploy** (Terapkan).
5. Salin tautan pada bagian **Web app URL** (berakhiran `/exec`, contoh: `https://script.google.com/macros/s/AKfycbx.../exec`).

---

### Langkah 6: Masukkan ke Pengaturan Aplikasi PWA
1. Buka aplikasi Catatan Keuangan Anda, lalu klik menu **PENGATURAN** (seperti pada tangkapan layar yang Anda kirim).
2. Pada formulir **Koneksi Backend (Google Apps Script)**:
   - **URL Web App Apps Script:** Tempelkan Web app URL dari Langkah 5.
   - **Kunci Rahasia (SECRET):** Masukkan kata kunci SECRET dari Langkah 3.
3. Klik tombol **Simpan Pengaturan**.
4. Klik tombol **Uji Koneksi**.
   - Jika muncul notifikasi hijau *"Koneksi Berhasil! Terhubung ke Google Apps Script"*, berarti aplikasi sudah terhubung sempurna dengan Google Sheets & Google Drive Anda!
