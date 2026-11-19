/**
 * validasiBaris.js — Fungsi murni untuk memvalidasi baris pencatatan / transaksi
 */

export const SATUAN_OPTIONS = ['pcs', 'kg', 'liter', 'dus', 'lainnya'];

/**
 * Validasi satu baris pencatatan
 * @param {object} row
 * @returns {{ ok: boolean, errors: Record<string, string> }}
 */
export const validasiBaris = (row = {}) => {
  const errors = {};

  // 1. Tipe
  if (!['masuk', 'keluar'].includes(row.type)) {
    errors.type = 'Jenis transaksi harus "masuk" atau "keluar".';
  }

  // 2. Tanggal
  if (!row.tanggal || typeof row.tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.tanggal)) {
    errors.tanggal = 'Tanggal harus berformat YYYY-MM-DD.';
  }

  // 3. Nama / Sumber
  const namaTrimmed = typeof row.nama === 'string' ? row.nama.trim() : '';
  if (!namaTrimmed) {
    errors.nama = row.type === 'masuk' ? 'Sumber pemasukan wajib diisi.' : 'Nama pengeluaran wajib diisi.';
  } else if (namaTrimmed.length > 120) {
    errors.nama = 'Maksimal 120 karakter.';
  }

  // 4. Spesifik Keluar vs Masuk
  if (row.type === 'keluar') {
    const qty = Number(row.qty);
    if (isNaN(qty) || qty <= 0) {
      errors.qty = 'Qty harus lebih dari 0.';
    }

    if (row.satuan && !SATUAN_OPTIONS.includes(row.satuan)) {
      errors.satuan = 'Satuan tidak valid.';
    }

    const harga = Number(row.harga);
    if (isNaN(harga) || harga <= 0) {
      errors.harga = 'Harga satuan harus lebih dari 0.';
    }
  } else if (row.type === 'masuk') {
    const jumlah = Number(row.jumlah);
    if (isNaN(jumlah) || jumlah <= 0) {
      errors.jumlah = 'Jumlah pemasukan harus lebih dari 0.';
    }
  }

  // 5. Catatan
  if (row.catatan && typeof row.catatan === 'string' && row.catatan.length > 500) {
    errors.catatan = 'Catatan maksimal 500 karakter.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Mengecek apakah baris masih kosong/belum disentuh (untuk dilewati saat simpan)
 * @param {object} row
 * @returns {boolean}
 */
export const isBarisKosong = (row = {}) => {
  const nama = (row.nama || '').trim();
  const qty = row.qty !== '' && row.qty !== null && row.qty !== undefined;
  const harga = row.harga !== '' && row.harga !== null && row.harga !== undefined;
  const jumlah = row.jumlah !== '' && row.jumlah !== null && row.jumlah !== 0 && row.jumlah !== undefined;
  const catatan = (row.catatan || '').trim();
  const hasFoto = Boolean(row.fotoBarang || row.fotoNota);

  if (row.type === 'keluar') {
    return !nama && !qty && !harga && !catatan && !hasFoto;
  } else {
    return !nama && !jumlah && !catatan;
  }
};
