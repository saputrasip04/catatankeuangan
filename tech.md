# tech.md — Spesifikasi Teknis

Dokumen ini menjelaskan arsitektur, stack, kontrak API, dan desain sinkronisasi. Skema data lengkap ada di `database.md`.

---

## 1. Arsitektur

```
┌──────────────────────────── Perangkat (PWA) ────────────────────────────┐
│                                                                          │
│   UI React  ──baca/tulis──▶  IndexedDB  ◀──── Sync Engine ───┐           │
│      ▲                       (data + outbox)                 │           │
│      └── selector saldo (dihitung dari data lokal)           │           │
│                                                              │           │
│   Service Worker (cache app shell)                           │           │
└──────────────────────────────────────────────────────────────┼───────────┘
                                                               │ fetch (text/plain, JSON)
                                                               ▼
                                          ┌──────── Google Apps Script (Web App) ────────┐
                                          │ doGet (list)   doPost (upsert/delete/upload) │
                                          │ LockService · validasi · cek SECRET          │
                                          └───────────────┬─────────────────┬────────────┘
                                                          ▼                 ▼
                                                  Google Sheets      Google Drive
                                                  (sheet Transaksi)  (folder foto)
```

**Alur tulis:** UI → simpan ke IndexedDB (tampil seketika) → masuk outbox → Sync Engine kirim ke Apps Script → server menulis ke Sheets (dan Drive untuk foto) → respons memperbarui record lokal (URL foto, status).

**Alur baca/realtime:** Sync Engine polling `list?since=...` → merge ke IndexedDB → UI ter-render ulang (via event/subscribe).

## 2. Tech Stack

| Lapisan | Pilihan |
|---------|---------|
| Build | Vite |
| UI | React (JavaScript), Tailwind CSS |
| Routing | React Router (HashRouter disarankan untuk GitHub Pages) |
| Penyimpanan lokal | IndexedDB lewat `idb` |
| PWA | `vite-plugin-pwa` (Workbox) |
| ID | `crypto.randomUUID()` |
| Backend | Google Apps Script (V8 runtime) |
| Database | Google Sheets |
| File | Google Drive (`DriveApp`) |
| Hosting | GitHub Pages atau Netlify |
| Test | Vitest (unit) |

## 3. Struktur Folder

```
keuangan-pwa/
├─ public/
│  └─ icons/                 # icon-192.png, icon-512.png, maskable-512.png
├─ src/
│  ├─ main.jsx
│  ├─ App.jsx
│  ├─ pages/
│  │  ├─ Beranda.jsx
│  │  ├─ Pencatatan.jsx
│  │  ├─ Riwayat.jsx
│  │  ├─ DetailTransaksi.jsx
│  │  └─ Pengaturan.jsx
│  ├─ components/
│  │  ├─ KartuSaldo.jsx
│  │  ├─ layout/
│  │  │  ├─ AppLayout.jsx          # grid: sidebar kiri + konten
│  │  │  └─ Sidebar.jsx            # menu kiri (desktop) / drawer (ponsel)
│  │  ├─ pencatatan/
│  │  │  ├─ DaftarBaris.jsx        # baris bertumpuk + tombol "Tambah baris"
│  │  │  ├─ BarisPencatatan.jsx    # 1 baris = 1 transaksi (Masuk/Keluar); dipakai juga untuk edit
│  │  │  ├─ RingkasanPencatatan.jsx
│  │  │  └─ BilahSimpan.jsx
│  │  ├─ FotoInput.jsx
│  │  ├─ ItemTransaksi.jsx
│  │  └─ StatusSync.jsx
│  ├─ db/
│  │  ├─ index.js            # buka DB, skema, migrasi
│  │  ├─ transaksiRepo.js    # CRUD + subscribe
│  │  ├─ outboxRepo.js
│  │  └─ draftRepo.js
│  ├─ sync/
│  │  ├─ api.js              # fetch ke Apps Script
│  │  ├─ engine.js           # outbox runner, backoff, polling
│  │  └─ merge.js            # last-write-wins
│  ├─ lib/
│  │  ├─ saldo.js            # hitung saldo (fungsi murni)
│  │  ├─ format.js           # Rupiah, tanggal
│  │  ├─ validasiBaris.js
│  │  ├─ compressImage.js
│  │  ├─ csv.js
│  │  └─ settings.js         # URL + secret (localStorage)
│  └─ hooks/
│     ├─ useTransaksi.js
│     ├─ useSaldo.js
│     ├─ useOnlineStatus.js
│     └─ usePencatatanDraft.js
├─ apps-script/
│  ├─ Code.gs
│  └─ appsscript.json
├─ vite.config.js
├─ tailwind.config.js
├─ package.json
└─ README.md
```

## 4. Tata Letak UI dan Pencatatan Banyak Baris

### 4.1 Layout Aplikasi (`AppLayout.jsx`)
- Dua area: **sidebar di kiri** dan konten di kanan. Tidak ada bottom navigation.
- **Desktop (≥ 1024 px, `lg:`):** `grid grid-cols-[16rem_1fr]`; sidebar `sticky top-0 h-screen`.
- **Ponsel (< 1024 px):** sidebar menjadi *drawer* (`fixed inset-y-0 left-0 w-72 -translate-x-full`, dibuka lewat state `menuOpen`) dengan overlay gelap. Tombol ☰ di pojok kiri atas header. Menutup saat: memilih menu (efek pada perubahan lokasi), menekan overlay, atau tombol `Esc`.
- Aksesibilitas drawer: `aria-expanded` pada tombol, `role="dialog"` + `aria-modal="true"` saat terbuka, focus trap, fokus kembali ke tombol ☰ saat ditutup.
- Hormati *safe area* iOS (`env(safe-area-inset-*)`).
- Item menu (`NavLink`, ada state aktif): Beranda, Pencatatan, Riwayat, Pengaturan. Bagian bawah sidebar: saldo ringkas (`useSaldo`) dan `StatusSync`.

**Rute:**

| Path | Halaman |
|------|---------|
| `/` | Beranda |
| `/catat` | Pencatatan (baris bertumpuk) |
| `/riwayat` | Riwayat |
| `/riwayat/:id` | Detail transaksi |
| `/riwayat/:id/edit` | Edit (satu baris, komponen `BarisPencatatan`) |
| `/pengaturan` | Pengaturan |

### 4.2 Halaman Pencatatan
Komposisi `Pencatatan.jsx`:
- `DaftarBaris` — kolom kiri/utama; berisi daftar `BarisPencatatan` dan tombol **+ Tambah baris** tepat di bawah baris terakhir.
- `RingkasanPencatatan` — panel kanan di desktop (`lg:w-80`), kartu ringkas di atas daftar pada ponsel.
- `BilahSimpan` — `sticky bottom-0`: jumlah baris, total masuk/keluar, tombol **Simpan semua (N)**.

**Bentuk satu baris draft:**

```js
{
  rowId: 'uuid-lokal',     // kunci React saja, BUKAN id transaksi
  id: 'uuid-transaksi',    // dibuat saat baris dibuat; dipakai saat simpan (idempoten)
  type: 'keluar',          // 'masuk' | 'keluar' (toggle per baris)
  tanggal: '2026-11-19',
  nama: '', qty: '', satuan: 'pcs', harga: '',
  jumlah: 0,               // turunan: qty × harga (keluar); input langsung (masuk)
  catatan: '',
  fotoBarang: null,        // Blob | null
  fotoNota: null,          // Blob | null
  touched: false,
  errors: {}
}
```

**State** dikelola `useReducer` (disimpan lewat `usePencatatanDraft`). Aksi: `ADD_ROW`, `DUPLICATE_ROW`, `REMOVE_ROW`, `UPDATE_FIELD`, `SET_TYPE`, `RESET`, `LOAD_DRAFT`.

**Perilaku:**
1. **Tambah baris:** `ADD_ROW` menyisipkan baris di indeks terakhir + 1 (selalu di bawah). Baris baru mewarisi `type` dan `tanggal` dari baris sebelumnya. Setelah render: fokus ke field pertama baris baru dan `scrollIntoView({ block: 'center' })`.
2. **Pintasan:** `Ctrl/Cmd + Enter` → `ADD_ROW`; `Enter` pada field terakhir baris terakhir → `ADD_ROW`.
3. **Hapus baris:** minimal 1 baris tersisa; konfirmasi bila baris sudah terisi. **Gandakan:** salin isi (kecuali foto) dengan `id` baru, disisipkan tepat di bawah baris asal.
4. **Baris kosong** (`touched = false` / semua field kosong) dilewati saat simpan.
5. **Draft otomatis:** debounce 500 ms ke store `draft` di IndexedDB (termasuk Blob foto); dimuat saat halaman dibuka.
6. **Validasi:** `lib/validasiBaris.js` (fungsi murni) → `{ ok, errors }`, dipakai juga pada edit. Saat **Simpan semua**: validasi semua baris tak kosong; bila ada yang salah, tandai, gulir ke baris pertama yang salah, dan **jangan simpan apa pun**.
7. **Pratinjau saldo:** `saldoSetelah = saldoKini + Σmasuk − Σkeluar` (hanya baris valid), diperbarui langsung. Bila < 0 → peringatan di Ringkasan dan dialog konfirmasi saat simpan (tidak memblokir).
8. **Simpan:** `transaksiRepo.addMany(rows)` memakai **satu transaksi IndexedDB** (`readwrite` pada `transaksi`, `outbox`, `draft`) sehingga semua-atau-tidak-sama-sekali:
   - untuk baris ke-`i`: `createdAt = updatedAt = now + i` (ms) agar urutan input terjaga;
   - `jumlah` keluar dihitung ulang `qty × harga`;
   - satu entri outbox per transaksi (foto ikut sebagai Blob di entri itu);
   - hapus draft pada transaksi yang sama.
   Setelah commit: reset ke 1 baris kosong, toast "N transaksi tersimpan", panggil `engine.kick()`.
9. **Idempotensi:** karena `id` dibuat saat baris dibuat, penekanan tombol ganda atau percobaan ulang tidak menggandakan transaksi (tombol dinonaktifkan selama menyimpan).
10. **Performa:** `React.memo` pada `BarisPencatatan`, update field hanya merender baris terkait. Batas lunak 50 baris per sekali simpan (tampilkan imbauan bila lebih).
11. **Aksesibilitas:** tiap baris `role="group"` dengan `aria-label="Baris {n}"`; tombol gandakan/hapus berlabel; urutan Tab mengikuti urutan visual.

**Tata letak satu baris:**
- Ponsel: kartu vertikal (Jenis → Nama → Qty + Satuan → Harga → Jumlah → Foto barang + Foto nota → Catatan).
- Desktop: grid horizontal (Jenis · Tanggal · Nama · Qty · Satuan · Harga · Jumlah) dengan baris kedua untuk foto dan catatan.
- Baris berjenis **Masuk** hanya menampilkan Tanggal, Sumber/Nama, Jumlah, Catatan.

## 5. Kontrak API (Apps Script Web App)

**Endpoint:** satu URL `/exec` hasil deployment.
**Header untuk semua request:** `Content-Type: text/plain;charset=utf-8` (body JSON sebagai string) → menghindari preflight CORS.
**Format respons:** `{ "ok": boolean, "data": any, "error": string|null }`

### 5.1 `GET ?action=list&since=<epoch_ms>&secret=<SECRET>`

Mengembalikan semua transaksi (termasuk `deleted = true`) dengan `updatedAt > since`.

```json
{ "ok": true,
  "data": { "items": [ { "id": "...", "type": "keluar", "...": "..." } ],
            "serverTime": 1766000000000 },
  "error": null }
```

> Catatan: secret pada query string bisa tercatat di log/riwayat. Alternatif: gunakan `POST action=list` dengan secret di body (disarankan bila ingin lebih aman).

### 5.2 `POST` — body JSON

```json
{ "secret": "...", "action": "upsert", "item": { "id": "uuid", "type": "keluar", "tanggal": "2026-11-19",
  "nama": "Beras", "qty": 5, "satuan": "kg", "harga": 14000, "jumlah": 70000,
  "fotoBarangUrl": "", "fotoNotaUrl": "", "catatan": "", "createdAt": 1766000000000, "updatedAt": 1766000000000 } }
```

```json
{ "secret": "...", "action": "delete", "id": "uuid", "updatedAt": 1766000005000 }
```

```json
{ "secret": "...", "action": "upload", "id": "uuid-transaksi", "kind": "barang|nota",
  "mimeType": "image/jpeg", "base64": "..." }
```

Respons `upload`: `{ ok:true, data:{ url:"https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000", fileId:"..." } }`

### 5.3 Kode Error

| error | Arti |
|-------|------|
| `unauthorized` | Secret salah/kosong |
| `invalid_input` | Validasi gagal (type, angka, field wajib) |
| `too_large` | Foto melebihi batas ukuran |
| `busy` | Gagal mendapat lock; client harus retry |
| `server_error` | Kesalahan tak terduga |

## 6. Apps Script (Code.gs)

- **`setup()`** (jalankan sekali manual): membuat Spreadsheet + sheet `Transaksi` + header, membuat folder Drive, menyimpan `SPREADSHEET_ID` dan `FOLDER_ID` ke Script Properties. `SECRET` diisi manual di Project Settings → Script Properties.
- **`doGet(e)`:** validasi secret → `action=list`.
- **`doPost(e)`:** `JSON.parse(e.postData.contents)` → validasi secret → rute berdasarkan `action`.
- **Lock:** semua operasi tulis dibungkus `LockService.getScriptLock()` (`waitLock(20000)`), dilepas di `finally`.
- **Upsert:** cari baris berdasarkan `id` (gunakan `TextFinder` atau baca kolom `id`); ada → perbarui, tidak ada → `appendRow`. Hitung ulang `jumlah = qty × harga` untuk `keluar`.
- **Aturan LWW di server:** bila `item.updatedAt` < `updatedAt` tersimpan, abaikan perubahan dan kembalikan data tersimpan.
- **Upload foto:** `Utilities.base64Decode` → `Utilities.newBlob` → `folder.createFile` → `setSharing(ANYONE_WITH_LINK, VIEW)` → kembalikan URL thumbnail.
- **Validasi:** `type ∈ {masuk, keluar}`, angka finite dan ≥ 0, `qty > 0` & `harga > 0` untuk `keluar`, `jumlah > 0` untuk `masuk`, batas ukuran base64 (≈ 2 MB), `mimeType` hanya `image/*`.
- **Penting:** set format kolom `id` dan `tanggal` sebagai *plain text* agar Sheets tidak mengubahnya menjadi tanggal/angka.

**`appsscript.json` minimal:**

```json
{
  "timeZone": "Asia/Jakarta",
  "runtimeVersion": "V8",
  "exceptionLogging": "STACKDRIVER",
  "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
  ]
}
```

**Deploy:** Deploy → New deployment → Web app → *Execute as: Me*, *Who has access: Anyone* → salin URL `/exec`. Setelah mengubah kode: **Manage deployments → Edit → New version**, kalau tidak perubahan tidak aktif.

## 7. Desain Sinkronisasi

### 7.1 Outbox
Setiap tulis (tambah/edit/hapus) menghasilkan entri outbox:

```js
{ seq, op: 'upsert'|'delete', itemId, payload, photos: { barang?: Blob, nota?: Blob }, attempts, nextTryAt, createdAt }
```

- Dikirim **berurutan** (FIFO per `itemId`).
- Untuk transaksi dengan foto: unggah foto dulu (`upload`), simpan URL ke record, lalu `upsert`.
- Berhasil → entri dihapus dari outbox. Gagal → `attempts++`, `nextTryAt = now + backoff`.
- **Backoff:** 2 dtk, 4, 8, 16, … maks. 5 menit (+ jitter acak).
- Dipicu oleh: simpan baru, event `online`, timer, tombol sinkron manual.
- Error `unauthorized`/`invalid_input` **tidak di-retry otomatis**: tandai entri `failed` dan tampilkan ke pengguna.

### 7.2 Polling
- Tiap **20 detik** saat `document.visibilityState === 'visible'` dan online.
- Segera saat `visibilitychange` → visible dan saat event `online`.
- Simpan `lastSyncAt` (dari `serverTime` respons terakhir).
- Gunakan **jendela tumpang tindih 60 detik** (`since = lastSyncAt − 60000`) untuk mengurangi risiko terlewat akibat selisih jam; merge bersifat idempoten sehingga aman.

### 7.3 Merge (Last-Write-Wins)
Untuk tiap item dari server:
1. Tidak ada di lokal → simpan.
2. Ada di lokal dan **ada entri outbox** untuk `id` itu → jangan timpa (perubahan lokal belum terkirim menang sementara).
3. Selain itu, bandingkan `updatedAt`: yang lebih besar menang.

### 7.4 Penanganan Redirect Apps Script
Web App `/exec` merespons dengan redirect ke `script.googleusercontent.com`. Gunakan `fetch` dengan `redirect: 'follow'` (default) dan pastikan **tidak** menambah header kustom. Untuk POST, respons akhir tetap dibaca sebagai JSON dari body.

### 7.5 Status UI
`online` / `offline` / `syncing` / `pending(N)` / `error`. Diturunkan dari `navigator.onLine`, state engine, dan jumlah entri outbox.

## 8. Kompresi Foto

`lib/compressImage.js`:
1. Baca file → `createImageBitmap` (hormati orientasi EXIF).
2. Skala agar sisi terpanjang ≤ 1280 px.
3. Gambar ke `canvas` → `toBlob('image/jpeg', 0.7)`.
4. Simpan Blob di outbox; saat kirim → ubah ke base64 (tanpa prefix `data:`).

## 9. Perhitungan Saldo

```js
// lib/saldo.js — fungsi murni
export const hitungSaldo = (items) =>
  items.filter(i => !i.deleted).reduce(
    (s, i) => s + (i.type === 'masuk' ? i.jumlah : -i.jumlah), 0);
```

Total bulan ini: filter `tanggal` berawalan `YYYY-MM`, lalu jumlahkan per `type`.

Pratinjau pada halaman Pencatatan (juga fungsi murni):

```js
export const saldoSetelah = (saldoKini, baris) =>
  baris.reduce((s, b) => s + (b.type === 'masuk' ? b.jumlah : -b.jumlah), saldoKini);
```

## 10. Konfigurasi PWA

`vite.config.js` (ringkas):

```js
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Catatan Keuangan', short_name: 'Keuangan',
    lang: 'id', display: 'standalone', start_url: '.', scope: '.',
    theme_color: '#0f766e', background_color: '#ffffff',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  },
  workbox: { navigateFallback: 'index.html' }
})
```

- Atur `base` Vite: `'/nama-repo/'` untuk GitHub Pages, `'/'` untuk Netlify atau domain sendiri.
- **Jangan** cache respons API Apps Script di service worker; data sudah dikelola IndexedDB.

## 11. Keamanan

- **Secret:** string acak panjang (≥ 32 karakter) di Script Properties (`SECRET`); dibandingkan di server pada setiap request. Di client hanya disimpan di `localStorage` perangkat.
- Web App berakses "Anyone" itu publik: secret adalah satu-satunya pengaman. Ganti secret bila diduga bocor (ubah di Script Properties lalu di Pengaturan tiap perangkat).
- Batasi ukuran dan tipe file di server; jangan mengeksekusi apa pun dari input client.
- Gunakan HTTPS (disediakan GitHub Pages/Netlify/Google).
- Sanitasi tampilan teks (React sudah meng-escape; hindari `dangerouslySetInnerHTML`).
- Cegah *formula injection* pada Sheets: awali nilai teks yang diawali `=`, `+`, `-`, `@` dengan tanda petik tunggal `'` saat ditulis ke Sheet, dan lakukan hal sama pada ekspor CSV.

## 12. Pengujian

**Unit (Vitest):** `hitungSaldo`, `saldoSetelah`, `validasiBaris`, reducer baris pencatatan (tambah di bawah, gandakan, hapus, minimal 1 baris), `jumlah = qty × harga`, format Rupiah, `merge` LWW, idempotensi upsert (logika), backoff.

**Manual — offline:**
1. `npm run build && npm run preview`, buka di Chrome, pasang ke layar utama.
2. DevTools → Application → Service Workers → centang *Offline* (atau mode pesawat di ponsel).
3. Tambah 3 transaksi (satu dengan foto) → pastikan tampil dan saldo berubah → indikator "3 menunggu terkirim".
4. Matikan mode offline → pastikan antrean kosong dan baris muncul di Sheet tanpa duplikat; foto ada di Drive.

**Manual — pencatatan banyak baris:**
1. Buka **Pencatatan**, isi baris 1 (Keluar), tekan **+ Tambah baris** → baris 2 muncul **di bawah** baris 1 dengan fokus di field pertama.
2. Ubah baris 2 menjadi Masuk, tambah baris 3 (Keluar). Perhatikan *saldo setelah disimpan* berubah saat mengetik.
3. Kosongkan satu field wajib → **Simpan semua** menolak dan menggulir ke baris yang salah; tidak ada data tersimpan.
4. Refresh halaman → semua baris (termasuk foto) pulih dari draft.
5. Perbaiki lalu **Simpan semua** (juga saat offline) → 3 transaksi muncul di Riwayat sesuai urutan, saldo tepat, dan tersinkron tanpa duplikat saat online.
6. Ubah lebar layar: ≥ 1024 px sidebar tetap di kiri; < 1024 px menu muncul sebagai drawer dari kiri.

**Manual — dua perangkat:**
1. Buka aplikasi di perangkat A dan B dengan URL + secret yang sama.
2. Tambah/edit/hapus di A → B memperbarui ≤ 30 detik (atau segera saat tab dibuka kembali).
3. Edit transaksi yang sama di kedua perangkat → versi dengan `updatedAt` terbaru menang.

**Lighthouse:** audit PWA harus menandai "Installable".

## 13. Deploy

**Apps Script:** lihat bagian 6.
**GitHub Pages:** set `base`, `npm run build`, publikasikan folder `dist` (mis. lewat GitHub Actions atau `gh-pages`). Gunakan `HashRouter` agar refresh tidak 404.
**Netlify:** hubungkan repo → build `npm run build` → publish `dist` → tambahkan `_redirects` (`/* /index.html 200`) bila memakai `BrowserRouter`.
