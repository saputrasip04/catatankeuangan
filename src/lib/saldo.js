/**
 * saldo.js — Fungsi murni untuk kalkulasi saldo keuangan
 * 
 * Saldo tidak pernah disimpan terpisah, melainkan selalu dihitung
 * dari seluruh transaksi aktif (deleted === false).
 */

/**
 * Menghitung saldo total dari kumpulan transaksi
 * @param {Array} items - Daftar item transaksi
 * @returns {number} Saldo total
 */
export const hitungSaldo = (items = []) => {
  if (!Array.isArray(items)) return 0;
  return items
    .filter(i => !i.deleted)
    .reduce((saldo, i) => {
      const jml = Number(i.jumlah) || 0;
      return saldo + (i.type === 'masuk' ? jml : -jml);
    }, 0);
};

/**
 * Menghitung estimasi saldo setelah baris-baris draft disimpan
 * @param {number} saldoKini - Saldo saat ini
 * @param {Array} barisDraft - Baris-baris yang akan disimpan
 * @returns {number} Saldo akhir
 */
export const saldoSetelah = (saldoKini = 0, barisDraft = []) => {
  if (!Array.isArray(barisDraft)) return saldoKini;
  return barisDraft.reduce((saldo, b) => {
    // Pastikan hanya baris valid atau yang memiliki nilai jumlah
    const jml = Number(b.jumlah) || 0;
    return saldo + (b.type === 'masuk' ? jml : -jml);
  }, saldoKini);
};

/**
 * Menghitung ringkasan pemasukan dan pengeluaran untuk bulan tertentu (YYYY-MM)
 * @param {Array} items - Daftar transaksi
 * @param {string} yyyyMm - Format YYYY-MM (misal "2026-11")
 * @returns {{ totalMasuk: number, totalKeluar: number, selisih: number }}
 */
export const hitungRingkasanBulan = (items = [], yyyyMm) => {
  if (!Array.isArray(items)) {
    return { totalMasuk: 0, totalKeluar: 0, selisih: 0 };
  }
  
  const targetPrefix = yyyyMm || new Date().toISOString().slice(0, 7);
  
  let totalMasuk = 0;
  let totalKeluar = 0;
  
  items
    .filter(i => !i.deleted && typeof i.tanggal === 'string' && i.tanggal.startsWith(targetPrefix))
    .forEach(i => {
      const jml = Number(i.jumlah) || 0;
      if (i.type === 'masuk') {
        totalMasuk += jml;
      } else if (i.type === 'keluar') {
        totalKeluar += jml;
      }
    });
    
  return {
    totalMasuk,
    totalKeluar,
    selisih: totalMasuk - totalKeluar
  };
};
