/**
 * csv.js — Generator dan downloader file CSV untuk ekspor transaksi
 * 
 * Sesuai database.md:
 * - Header sama dengan urutan Google Sheets.
 * - Hanya baris dengan deleted = false.
 * - Encoding UTF-8 dengan BOM (\uFEFF) agar kompatibel dengan Excel.
 * - Proteksi CSV injection: prepend "'" jika diawali '=', '+', '-', '@'.
 */

const HEADERS = [
  'id', 'type', 'tanggal', 'nama', 'qty', 'satuan', 'harga',
  'jumlah', 'fotoBarangUrl', 'fotoNotaUrl', 'catatan',
  'createdAt', 'updatedAt', 'deleted'
];

/**
 * Sanitasi nilai string untuk CSV
 */
function sanitizeCsvValue(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);

  // Mencegah formula injection
  const trimmed = str.trim();
  if (['=', '+', '-', '@'].some(char => trimmed.startsWith(char))) {
    str = "'" + str;
  }

  // Bungkus dalam kutip dua jika mengandung koma, newline, atau kutip dua
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Membuat konten CSV dari array transaksi
 * @param {Array} items
 * @returns {string}
 */
export function generateCsv(items = []) {
  const activeItems = items.filter(i => !i.deleted);
  
  const headerRow = HEADERS.join(',');
  const rows = activeItems.map(item => {
    return [
      sanitizeCsvValue(item.id),
      sanitizeCsvValue(item.type),
      sanitizeCsvValue(item.tanggal),
      sanitizeCsvValue(item.nama),
      item.qty !== null && item.qty !== undefined ? item.qty : '',
      sanitizeCsvValue(item.satuan || ''),
      item.harga !== null && item.harga !== undefined ? item.harga : '',
      item.jumlah || 0,
      sanitizeCsvValue(item.fotoBarangUrl || ''),
      sanitizeCsvValue(item.fotoNotaUrl || ''),
      sanitizeCsvValue(item.catatan || ''),
      item.createdAt || '',
      item.updatedAt || '',
      false
    ].join(',');
  });

  // Tambahkan UTF-8 BOM agar rapi di Microsoft Excel
  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
}

/**
 * Mengunduh file CSV langsung di browser
 * @param {Array} items
 * @param {string} filename
 */
export function downloadCsv(items = [], filename = `catatan-keuangan-${new Date().toISOString().slice(0, 10)}.csv`) {
  const csvContent = generateCsv(items);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
