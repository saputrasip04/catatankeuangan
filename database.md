# database.md — Skema Data

Ada tiga tempat penyimpanan data:

1. **Google Sheets** — sumber data utama (server).
2. **IndexedDB** — salinan lokal di perangkat + antrean pengiriman (outbox).
3. **Google Drive** — file foto barang dan nota.

---

## 1. Google Sheets

**Spreadsheet:** dibuat oleh fungsi `setup()` (mis. bernama `Keuangan DB`).
**Sheet:** `Transaksi` — baris 1 adalah header, data mulai baris 2.

### 1.1 Kolom

| # | Kolom | Tipe | Wajib | Keterangan |
|---|-------|------|-------|------------|
| A | `id` | teks | ya | UUID v4 dari client. **Kunci unik.** Format kolom: plain text |
| B | `type` | teks | ya | `masuk` atau `keluar` |
| C | `tanggal` | teks | ya | `YYYY-MM-DD`. Format kolom: plain text (cegah konversi otomatis) |
| D | `nama` | teks | ya | Nama pengeluaran, atau sumber pemasukan |
| E | `qty` | angka | keluar | > 0. Kosong untuk `masuk` |
| F | `satuan` | teks | keluar | `pcs`, `kg`, `liter`, `dus`, `lainnya`. Kosong untuk `masuk` |
| G | `harga` | angka | keluar | Harga satuan (rupiah, bulat) > 0. Kosong untuk `masuk` |
| H | `jumlah` | angka | ya | `keluar`: `qty × harga` (dihitung server). `masuk`: diisi langsung, > 0 |
| I | `fotoBarangUrl` | teks | tidak | URL thumbnail Drive; kosong bila tidak ada |
| J | `fotoNotaUrl` | teks | tidak | URL thumbnail Drive; kosong bila tidak ada |
| K | `catatan` | teks | tidak | Teks bebas |
| L | `createdAt` | angka | ya | Epoch milidetik saat dibuat (dari client) |
| M | `updatedAt` | angka | ya | Epoch milidetik perubahan terakhir. Dipakai untuk sinkronisasi dan LWW |
| N | `deleted` | boolean | ya | `FALSE` default. `TRUE` = terhapus (soft delete) |

Header persis (urutan harus sama dengan kode):

```
id | type | tanggal | nama | qty | satuan | harga | jumlah | fotoBarangUrl | fotoNotaUrl | catatan | createdAt | updatedAt | deleted
```

### 1.2 Aturan Data

- `id` tidak boleh duplikat. Upsert mencari baris berdasarkan `id`: ada → perbarui, tidak ada → tambahkan.
- Baris **tidak pernah dihapus fisik**. Hapus = `deleted = TRUE` dan `updatedAt` diperbarui.
- `jumlah` untuk `keluar` selalu dihitung ulang di server: `qty × harga`.
- Semua nilai uang adalah bilangan bulat rupiah (tanpa desimal).
- Teks yang diawali `=`, `+`, `-`, `@` diawali tanda `'` saat ditulis agar tidak dianggap rumus.
- Saldo **tidak disimpan** di Sheet. Dihitung dari baris dengan `deleted = FALSE`.
- Beberapa transaksi dari satu kali **Simpan semua** adalah baris-baris terpisah dengan `id` masing-masing. Tidak ada kolom `batchId`; urutan input dijaga lewat `createdAt` berurutan (`now + indeks`, dalam ms).

### 1.3 Contoh Baris

**Pengeluaran**

| id | type | tanggal | nama | qty | satuan | harga | jumlah | fotoBarangUrl | fotoNotaUrl | catatan | createdAt | updatedAt | deleted |
|----|------|---------|------|-----|--------|-------|--------|---------------|-------------|---------|-----------|-----------|---------|
| 7c1e…a9 | keluar | 2026-11-19 | Beras | 5 | kg | 14000 | 70000 | https://drive.google.com/thumbnail?id=ABC&sz=w1000 | https://drive.google.com/thumbnail?id=DEF&sz=w1000 | Pasar pagi | 1766000000000 | 1766000000000 | FALSE |

**Pemasukan**

| id | type | tanggal | nama | qty | satuan | harga | jumlah | fotoBarangUrl | fotoNotaUrl | catatan | createdAt | updatedAt | deleted |
|----|------|---------|------|-----|--------|-------|--------|---------------|-------------|---------|-----------|-----------|---------|
| 3b2d…f1 | masuk | 2026-11-19 | Gaji | | | | 5000000 | | | | 1766000100000 | 1766000100000 | FALSE |

## 2. Script Properties (Apps Script)

| Kunci | Diisi oleh | Keterangan |
|-------|------------|------------|
| `SPREADSHEET_ID` | `setup()` otomatis | ID spreadsheet database |
| `FOLDER_ID` | `setup()` otomatis | ID folder Drive untuk foto |
| `SECRET` | **manual** oleh pemilik | Kunci rahasia (≥ 32 karakter acak) |

## 3. Google Drive

- Satu folder (mis. `Keuangan - Foto`) dibuat oleh `setup()`.
- Nama file: `{id-transaksi}_{barang|nota}_{timestamp}.jpg`.
- Akses file: **siapa pun dengan link (viewer)** agar dapat ditampilkan di aplikasi.
- URL yang disimpan di Sheet: `https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000`.
- Mengganti foto: unggah file baru dan perbarui URL. File lama dapat dibiarkan atau dipindahkan ke tempat sampah secara terpisah (opsional).

## 4. IndexedDB (Lokal)

**Nama database:** `keuangan-db`
**Versi awal:** `1` (sudah termasuk store `draft`; naikkan versi + tulis migrasi di `onupgradeneeded` bila skema berubah)

### 4.1 Object store `transaksi`

- `keyPath`: `id`
- Bentuk record sama dengan kolom Sheet, dengan tipe native JS:

```js
{
  id: 'uuid',
  type: 'masuk' | 'keluar',
  tanggal: '2026-11-19',
  nama: 'Beras',
  qty: 5,                // null untuk masuk
  satuan: 'kg',          // null untuk masuk
  harga: 14000,          // null untuk masuk
  jumlah: 70000,
  fotoBarangUrl: '',
  fotoNotaUrl: '',
  catatan: '',
  createdAt: 1766000000000,
  updatedAt: 1766000000000,
  deleted: false,
  // Field khusus lokal (tidak dikirim ke server):
  _pendingFotoBarang: Blob | null,   // pratinjau sebelum terunggah
  _pendingFotoNota: Blob | null
}
```

**Index:**

| Nama index | keyPath | Kegunaan |
|------------|---------|----------|
| `by_tanggal` | `tanggal` | Urut dan filter bulan |
| `by_type` | `type` | Filter masuk/keluar |
| `by_updatedAt` | `updatedAt` | Merge dan sinkronisasi |
| `by_deleted` | `deleted` | Menyaring transaksi aktif |

### 4.2 Object store `outbox`

- `keyPath`: `seq` (`autoIncrement: true`)

```js
{
  seq: 1,
  op: 'upsert' | 'delete',
  itemId: 'uuid',
  payload: { /* item lengkap atau {id, updatedAt} */ },
  photos: { barang: Blob | null, nota: Blob | null },
  attempts: 0,
  nextTryAt: 0,                 // epoch ms
  status: 'pending' | 'failed', // failed = butuh tindakan pengguna
  lastError: null,
  createdAt: 1766000000000
}
```

**Index:** `by_itemId` (`itemId`), `by_nextTryAt` (`nextTryAt`).

### 4.3 Object store `meta`

- `keyPath`: `key`

| key | value | Keterangan |
|-----|-------|------------|
| `lastSyncAt` | number | `serverTime` dari polling terakhir yang sukses |
| `schemaVersion` | number | Versi skema lokal |

### 4.4 Object store `draft`

Menyimpan isian halaman **Pencatatan** yang belum disimpan agar tidak hilang saat refresh, tab ditutup, atau offline.

- `keyPath`: `key` (saat ini hanya satu record: `'pencatatan'`)

```js
{
  key: 'pencatatan',
  updatedAt: 1766000000000,
  rows: [
    {
      rowId: 'uuid-lokal',       // kunci React, bukan id transaksi
      id: 'uuid-transaksi',      // dibuat saat baris ditambahkan; dipakai saat simpan (idempoten)
      type: 'keluar',            // 'masuk' | 'keluar'
      tanggal: '2026-11-19',
      nama: '', qty: '', satuan: 'pcs', harga: '', jumlah: 0,
      catatan: '',
      fotoBarang: Blob | null,
      fotoNota: Blob | null,
      touched: false
    }
  ]
}
```

Aturan:
- Urutan elemen `rows` = urutan tampil (baris baru selalu ditambahkan di akhir/bawah).
- Disimpan otomatis dengan debounce ± 500 ms.
- **Bukan data keuangan:** tidak dihitung ke saldo, tidak masuk Sheet, tidak disinkronkan antar perangkat.
- Dihapus pada transaksi IndexedDB yang sama dengan penyimpanan **Simpan semua**, atau saat pengguna menekan **Kosongkan semua**.
- Fitur **Hapus cache lokal** ikut menghapus draft (beri peringatan bila draft masih terisi).

### 4.5 Pengaturan (bukan di IndexedDB)

Disimpan di `localStorage`: `webAppUrl`, `secret`.

## 5. Aturan Validasi (Client dan Server)

| Field | Aturan |
|-------|--------|
| `type` | harus `masuk` atau `keluar` |
| `nama` | wajib, tidak kosong setelah di-trim, maks. 120 karakter |
| `tanggal` | format `YYYY-MM-DD` valid |
| `qty` (keluar) | angka > 0 |
| `satuan` (keluar) | salah satu dari daftar yang diizinkan |
| `harga` (keluar) | angka > 0 |
| `jumlah` (masuk) | angka > 0 |
| `jumlah` (keluar) | dihitung `qty × harga`; nilai kiriman client diabaikan |
| `catatan` | maks. 500 karakter |
| foto | `image/*`, maks. ± 2 MB setelah kompresi |

## 6. Rumus Turunan (Tidak Disimpan)

```
Saldo         = Σ jumlah (type=masuk, deleted=false) − Σ jumlah (type=keluar, deleted=false)
Masuk bulan   = Σ jumlah (type=masuk,  deleted=false, tanggal LIKE 'YYYY-MM%')
Keluar bulan  = Σ jumlah (type=keluar, deleted=false, tanggal LIKE 'YYYY-MM%')
```

## 7. Siklus Hidup Sebuah Record

```
[Baris draft]  id=UUID dibuat saat baris ditambahkan (store draft, tersimpan otomatis)
        │  "Simpan semua" → satu transaksi IndexedDB (atomik)
        ▼
[Dibuat di client]  createdAt=updatedAt=now+indeks, deleted=false
        │  tersimpan di transaksi + outbox, draft dihapus
        ▼
[Terkirim]  server upsert → baris di Sheet (foto → Drive → URL)
        │
        ├─ Edit   → updatedAt = now → outbox → upsert (timpa baris berdasarkan id)
        └─ Hapus  → deleted = true, updatedAt = now → outbox → delete (soft)
                         │
                         ▼
          Perangkat lain menerima lewat polling dan menyembunyikannya dari UI/saldo
```

## 8. Konflik dan Konsistensi

- **Idempotensi:** kirim ulang `upsert` dengan `id` sama tidak menggandakan baris.
- **LWW:** perubahan dengan `updatedAt` lebih besar menang, baik di server (saat upsert) maupun di client (saat merge).
- **Lock:** penulisan ke Sheet dibungkus `LockService` agar dua request bersamaan tidak saling menimpa.
- **Selisih jam perangkat:** diredam dengan jendela tumpang tindih saat polling (`since − 60 detik`). Hindari penggunaan dua perangkat dengan jam yang sangat melenceng.
- **Perubahan lokal belum terkirim** tidak ditimpa oleh data server sampai entri outbox-nya selesai.

## 9. Ekspor CSV

Kolom ekspor mengikuti urutan header Sheet, hanya baris `deleted = false`, encoding UTF-8 (dengan BOM agar terbaca benar di Excel), pemisah koma, dan nilai teks diberi tanda kutip serta diawali `'` bila berawalan `=`, `+`, `-`, `@`.

## 10. Pencadangan dan Pemulihan

- Sheet adalah sumber kebenaran; gunakan **File → Version history** di Google Sheets untuk memulihkan.
- Buat salinan berkala (File → Make a copy), atau pakai fitur ekspor CSV di aplikasi.
- Bila cache lokal dihapus, data dipulihkan penuh dengan polling `since=0` dari server (peringatkan bila masih ada outbox belum terkirim).
