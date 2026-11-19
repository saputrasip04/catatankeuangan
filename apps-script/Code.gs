/**
 * Code.gs — Google Apps Script Backend untuk Catatan Keuangan PWA
 * 
 * Menangani persistensi ke Google Sheets dan penyimpanan foto ke Google Drive.
 * Dilengkapi LockService untuk konkurensi, proteksi secret, dan pencegahan formula injection.
 */

const HEADERS = [
  'id', 'type', 'tanggal', 'nama', 'qty', 'satuan', 'harga',
  'jumlah', 'fotoBarangUrl', 'fotoNotaUrl', 'catatan',
  'createdAt', 'updatedAt', 'deleted', 'bkuId'
];

/**
 * Inisialisasi awal. Jalankan fungsi ini sekali dari editor Apps Script.
 */
function setup() {
  const props = PropertiesService.getScriptProperties();
  
  // 1. Buat Spreadsheet jika belum ada
  let ssId = props.getProperty('SPREADSHEET_ID');
  let ss;
  if (!ssId) {
    ss = SpreadsheetApp.create('Keuangan DB');
    ssId = ss.getId();
    props.setProperty('SPREADSHEET_ID', ssId);
    
    let sheet = ss.getSheetByName('Transaksi');
    if (!sheet) {
      sheet = ss.getSheets()[0];
      sheet.setName('Transaksi');
    }
    
    // Set Header
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Set format kolom id (A) dan tanggal (C) sebagai plain text
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.getRange('C:C').setNumberFormat('@');
  } else {
    ss = SpreadsheetApp.openById(ssId);
  }
  
  // 2. Buat Folder Drive jika belum ada
  let folderId = props.getProperty('FOLDER_ID');
  if (!folderId) {
    const folder = DriveApp.createFolder('Keuangan - Foto');
    folderId = folder.getId();
    props.setProperty('FOLDER_ID', folderId);
  }
  
  Logger.log('Setup selesai!');
  Logger.log('Spreadsheet ID: ' + ssId);
  Logger.log('Folder ID: ' + folderId);
  Logger.log('PENTING: Masukkan kunci SECRET di Project Settings -> Script Properties');
}

/**
 * Mengambil properti script.
 * Jika Spreadsheet atau Folder belum ada, jalankan inisialisasi otomatis.
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SPREADSHEET_ID');
  let folderId = props.getProperty('FOLDER_ID');
  let secret = props.getProperty('SECRET');

  // Inisialisasi otomatis jika belum ada Spreadsheet ID atau Folder ID
  if (!ssId || !folderId) {
    try {
      setup();
      ssId = props.getProperty('SPREADSHEET_ID');
      folderId = props.getProperty('FOLDER_ID');
      secret = props.getProperty('SECRET');
    } catch (err) {
      Logger.log('Auto setup error: ' + err);
    }
  }

  return {
    spreadsheetId: ssId,
    folderId: folderId,
    secret: secret
  };
}

/**
 * Response helper
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sanitasi string untuk mencegah CSV/Sheets Formula Injection
 */
function sanitizeText(val) {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed.length > 0 && ['=', '+', '-', '@'].includes(trimmed.charAt(0))) {
    return "'" + trimmed;
  }
  return trimmed;
}

/**
 * GET Handler — list transaksi atau halaman status ramah pengguna
 */
function doGet(e) {
  try {
    const config = getConfig();
    const secret = e && e.parameter ? e.parameter.secret : null;
    
    // Jika dibuka langsung melalui browser tanpa parameter secret:
    if (!secret) {
      const html = '<!DOCTYPE html>' +
        '<html><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>Status Backend Catatan Keuangan</title>' +
        '<style>' +
        'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F8FAFC; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; box-sizing: border-box; }' +
        '.card { background: #FFFFFF; border-radius: 1rem; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07); max-width: 500px; width: 100%; padding: 2rem; }' +
        '.badge { display: inline-flex; align-items: center; gap: 0.35rem; background: #ECFDF5; color: #065F46; font-size: 0.75rem; font-weight: 700; padding: 0.3rem 0.75rem; border-radius: 9999px; margin-bottom: 1rem; }' +
        '.badge-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; display: inline-block; }' +
        'h1 { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.5rem 0; color: #0F172A; }' +
        'p { font-size: 0.85rem; color: #64748B; margin: 0 0 1.25rem 0; line-height: 1.5; }' +
        '.list { background: #F1F5F9; border-radius: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 1.25rem; }' +
        '.row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; font-size: 0.8rem; border-bottom: 1px solid #E2E8F0; }' +
        '.row:last-child { border-bottom: none; }' +
        '.ok { color: #059669; font-weight: 700; }' +
        '.warn { color: #D97706; font-weight: 700; }' +
        '.tip { font-size: 0.75rem; line-height: 1.4; background: #FEF3C7; color: #92400E; padding: 0.75rem; border-radius: 0.5rem; }' +
        '</style></head><body>' +
        '<div class="card">' +
        '<div class="badge"><span class="badge-dot"></span> Backend Online</div>' +
        '<h1>Google Apps Script Siap Digunakan!</h1>' +
        '<p>Layanan Web App Catatan Keuangan Anda sudah aktif dan berhasil terhubung ke server Google.</p>' +
        '<div class="list">' +
        '<div class="row"><span>Spreadsheet:</span><span class="' + (config.spreadsheetId ? 'ok' : 'warn') + '">' + (config.spreadsheetId ? '✓ Terhubung' : '⚠️ Belum dibuat') + '</span></div>' +
        '<div class="row"><span>Folder Google Drive:</span><span class="' + (config.folderId ? 'ok' : 'warn') + '">' + (config.folderId ? '✓ Terhubung' : '⚠️ Belum dibuat') + '</span></div>' +
        '<div class="row"><span>Kunci SECRET:</span><span class="' + (config.secret ? 'ok' : 'warn') + '">' + (config.secret ? '✓ Terpasang' : '⚠️ Belum diatur di Script Properties') + '</span></div>' +
        '</div>' +
        '<div class="tip">' +
        '💡 <b>Petunjuk:</b> Jangan gunakan URL <i>googleusercontent/echo</i> ini di aplikasi. Salin URL resmi dari menu <b>Deploy &gt; Web app URL</b> (yang berakhiran <code>/exec</code>) dan masukkan ke menu <b>PENGATURAN</b> di aplikasi Anda.' +
        '</div>' +
        '</div></body></html>';
      return HtmlService.createHtmlOutput(html)
        .setTitle('Status Backend Catatan Keuangan')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
    
    // Jika ada parameter secret tapi tidak cocok:
    if (!config.secret || secret !== config.secret) {
      return jsonResponse({ ok: false, data: null, error: 'unauthorized: secret tidak cocok' });
    }
    
    const action = e.parameter ? e.parameter.action : '';
    if (action === 'list') {
      const since = Number(e.parameter.since) || 0;
      return handleList(config, since);
    }
    
    return jsonResponse({ ok: true, data: { status: 'ready', serverTime: Date.now() }, error: null });
  } catch (err) {
    return jsonResponse({ ok: false, data: null, error: 'server_error: ' + err.toString() });
  }
}

/**
 * POST Handler — upsert, delete, upload, atau list
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Tunggu lock hingga 20 detik
    const hasLock = lock.tryLock(20000);
    if (!hasLock) {
      return jsonResponse({ ok: false, data: null, error: 'busy' });
    }
    
    const config = getConfig();
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, data: null, error: 'invalid_input' });
    }
    
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ ok: false, data: null, error: 'invalid_json' });
    }
    
    if (!config.secret || body.secret !== config.secret) {
      return jsonResponse({ ok: false, data: null, error: 'unauthorized' });
    }
    
    const action = body.action;
    
    if (action === 'list') {
      const since = Number(body.since) || 0;
      return handleList(config, since);
    }
    
    if (action === 'upsert') {
      return handleUpsert(config, body.item);
    }
    
    if (action === 'delete') {
      return handleDelete(config, body.id, body.updatedAt);
    }
    
    if (action === 'upload') {
      return handleUpload(config, body);
    }
    
    return jsonResponse({ ok: false, data: null, error: 'invalid_action' });
  } catch (err) {
    return jsonResponse({ ok: false, data: null, error: 'server_error: ' + err.toString() });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

/**
 * Ambil daftar transaksi dengan filter updatedAt > since
 */
function handleList(config, since) {
  const ss = SpreadsheetApp.openById(config.spreadsheetId);
  const sheet = ss.getSheetByName('Transaksi');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return jsonResponse({
      ok: true,
      data: { items: [], serverTime: Date.now() },
      error: null
    });
  }
  
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const items = [];
  
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const updatedAt = Number(row[12]) || 0;
    
    if (updatedAt > since) {
      items.push({
        id: String(row[0]),
        type: String(row[1]),
        tanggal: String(row[2]),
        nama: String(row[3]).replace(/^'/, ''),
        qty: row[4] !== '' && row[4] !== null ? Number(row[4]) : null,
        satuan: row[5] !== '' && row[5] !== null ? String(row[5]) : null,
        harga: row[6] !== '' && row[6] !== null ? Number(row[6]) : null,
        jumlah: Number(row[7]) || 0,
        fotoBarangUrl: String(row[8] || ''),
        fotoNotaUrl: String(row[9] || ''),
        catatan: String(row[10] || '').replace(/^'/, ''),
        createdAt: Number(row[11]) || 0,
        updatedAt: updatedAt,
        deleted: Boolean(row[13]),
        bkuId: row[14] ? String(row[14]) : null
      });
    }
  }
  
  return jsonResponse({
    ok: true,
    data: { items: items, serverTime: Date.now() },
    error: null
  });
}

/**
 * Menyimpan / memperbarui satu transaksi (LWW & Idempoten)
 */
function handleUpsert(config, item) {
  if (!item || !item.id || !item.type || !item.nama || !item.tanggal) {
    return jsonResponse({ ok: false, data: null, error: 'invalid_input' });
  }
  
  // Validasi tipe
  if (!['masuk', 'keluar'].includes(item.type)) {
    return jsonResponse({ ok: false, data: null, error: 'invalid_input: type must be masuk or keluar' });
  }
  
  // Hitung ulang jumlah di server
  let finalJumlah = 0;
  let finalQty = null;
  let finalSatuan = null;
  let finalHarga = null;
  
  if (item.type === 'keluar') {
    finalQty = Number(item.qty);
    finalHarga = Number(item.harga);
    if (!finalQty || finalQty <= 0 || !finalHarga || finalHarga <= 0) {
      return jsonResponse({ ok: false, data: null, error: 'invalid_input: qty & harga must be > 0' });
    }
    finalJumlah = Math.round(finalQty * finalHarga);
    finalSatuan = item.satuan || 'pcs';
  } else {
    finalJumlah = Number(item.jumlah);
    if (!finalJumlah || finalJumlah <= 0) {
      return jsonResponse({ ok: false, data: null, error: 'invalid_input: jumlah must be > 0' });
    }
  }
  
  const ss = SpreadsheetApp.openById(config.spreadsheetId);
  const sheet = ss.getSheetByName('Transaksi');
  const lastRow = sheet.getLastRow();
  
  let targetRowIndex = -1;
  let existingUpdatedAt = 0;
  
  if (lastRow > 1) {
    const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < idColumnValues.length; i++) {
      if (String(idColumnValues[i][0]) === String(item.id)) {
        targetRowIndex = i + 2; // offset header
        existingUpdatedAt = Number(sheet.getRange(targetRowIndex, 13).getValue()) || 0;
        break;
      }
    }
  }
  
  // Aturan LWW di server: jika item.updatedAt < existingUpdatedAt, abaikan
  const incomingUpdatedAt = Number(item.updatedAt) || Date.now();
  if (targetRowIndex > -1 && incomingUpdatedAt < existingUpdatedAt) {
    return jsonResponse({
      ok: true,
      data: { ignored: true, message: 'Server has newer version' },
      error: null
    });
  }
  
  const rowData = [
    String(item.id),
    String(item.type),
    String(item.tanggal),
    sanitizeText(item.nama),
    finalQty !== null ? finalQty : '',
    finalSatuan !== null ? sanitizeText(finalSatuan) : '',
    finalHarga !== null ? finalHarga : '',
    finalJumlah,
    String(item.fotoBarangUrl || ''),
    String(item.fotoNotaUrl || ''),
    sanitizeText(item.catatan || ''),
    Number(item.createdAt) || Date.now(),
    incomingUpdatedAt,
    Boolean(item.deleted),
    item.bkuId ? String(item.bkuId) : ''
  ];
  
  if (targetRowIndex > -1) {
    // Update baris yang sudah ada
    sheet.getRange(targetRowIndex, 1, 1, HEADERS.length).setValues([rowData]);
  } else {
    // Tambah baris baru
    sheet.appendRow(rowData);
    // Pastikan format id dan tanggal tetap plain text
    const newRow = sheet.getLastRow();
    sheet.getRange(newRow, 1).setNumberFormat('@');
    sheet.getRange(newRow, 3).setNumberFormat('@');
  }
  
  return jsonResponse({
    ok: true,
    data: { id: item.id, updatedAt: incomingUpdatedAt },
    error: null
  });
}

/**
 * Soft delete transaksi
 */
function handleDelete(config, id, updatedAt) {
  if (!id) {
    return jsonResponse({ ok: false, data: null, error: 'invalid_input: missing id' });
  }
  
  const ss = SpreadsheetApp.openById(config.spreadsheetId);
  const sheet = ss.getSheetByName('Transaksi');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return jsonResponse({ ok: true, data: { id: id, deleted: false }, error: null });
  }
  
  const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idColumnValues.length; i++) {
    if (String(idColumnValues[i][0]) === String(id)) {
      const targetRow = i + 2;
      const deleteUpdatedAt = Number(updatedAt) || Date.now();
      sheet.getRange(targetRow, 13).setValue(deleteUpdatedAt); // updatedAt
      sheet.getRange(targetRow, 14).setValue(true);            // deleted
      return jsonResponse({
        ok: true,
        data: { id: id, deleted: true, updatedAt: deleteUpdatedAt },
        error: null
      });
    }
  }
  
  return jsonResponse({ ok: true, data: { id: id, notFound: true }, error: null });
}

/**
 * Upload foto base64 ke Google Drive
 */
function handleUpload(config, body) {
  const { id, kind, mimeType, base64 } = body;
  if (!id || !kind || !base64) {
    return jsonResponse({ ok: false, data: null, error: 'invalid_input: missing fields' });
  }
  
  if (mimeType && !mimeType.startsWith('image/')) {
    return jsonResponse({ ok: false, data: null, error: 'invalid_input: mimeType must be image/*' });
  }
  
  // Batas ukuran base64: sekitar 3MB (base64 string length ~4.2M)
  if (base64.length > 4500000) {
    return jsonResponse({ ok: false, data: null, error: 'too_large' });
  }
  
  const folder = DriveApp.getFolderById(config.folderId);
  const decodedBytes = Utilities.base64Decode(base64);
  const ext = (mimeType && mimeType.includes('png')) ? 'png' : 'jpg';
  const fileName = id + '_' + kind + '_' + Date.now() + '.' + ext;
  
  const blob = Utilities.newBlob(decodedBytes, mimeType || 'image/jpeg', fileName);
  const file = folder.createFile(blob);
  
  // Set sharing viewer agar bisa diakses lewat thumbnail
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const fileId = file.getId();
  const thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';
  
  return jsonResponse({
    ok: true,
    data: {
      url: thumbnailUrl,
      fileId: fileId
    },
    error: null
  });
}
