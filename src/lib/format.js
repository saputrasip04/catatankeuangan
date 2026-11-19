/**
 * format.js — Utilitas formatting mata uang Rupiah dan tanggal
 */

/**
 * Format angka ke format mata uang Rupiah
 * Contoh: 1250000 -> "Rp 1.250.000"
 * @param {number|string} amount
 * @param {boolean} withPrefix - Tampilkan "Rp " di depan
 * @returns {string}
 */
export const formatRupiah = (amount, withPrefix = true) => {
  const num = Math.round(Number(amount) || 0);
  const formatted = new Intl.NumberFormat('id-ID').format(Math.abs(num));
  const sign = num < 0 ? '-' : '';
  const prefix = withPrefix ? (sign ? '-Rp ' : 'Rp ') : sign;
  return `${prefix}${formatted}`;
};

/**
 * Mengubah string format Rupiah atau angka bebas menjadi integer murni
 * @param {string|number} str
 * @returns {number}
 */
export const parseRupiah = (str) => {
  if (typeof str === 'number') return Math.round(str);
  if (!str) return 0;
  // Hapus semua karakter kecuali digit dan minus
  const cleaned = String(str).replace(/[^\d-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format tanggal YYYY-MM-DD ke format lokal Indonesia
 * Contoh: "2026-11-19" -> "19 Nov 2026"
 * @param {string} yyyyMmDd
 * @param {object} options
 * @returns {string}
 */
export const formatTanggal = (yyyyMmDd, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return '-';
  try {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    if (!y || !m || !d) return yyyyMmDd;
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('id-ID', options).format(date);
  } catch (_) {
    return yyyyMmDd;
  }
};

/**
 * Format tanggal YYYY-MM-DD ke format DD/MM/YYYY (sesuai contoh gambar)
 * Contoh: "2026-11-19" -> "19/11/2026"
 * @param {string} yyyyMmDd
 * @returns {string}
 */
export const formatTanggalSlash = (yyyyMmDd) => {
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return '-';
  const parts = yyyyMmDd.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return yyyyMmDd;
};

/**
 * Mendapatkan string tanggal hari ini dalam format YYYY-MM-DD (waktu lokal)
 * @returns {string}
 */
export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Mendapatkan string bulan ini dalam format YYYY-MM
 * @returns {string}
 */
export const getCurrentMonthString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};
