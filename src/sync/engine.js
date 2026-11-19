/**
 * sync/engine.js — Mesin sinkronisasi background (Outbox runner + Polling)
 */

import { getDB } from '../db/index.js';
import { outboxRepo } from '../db/outboxRepo.js';
import { apiList, apiUpsert, apiDelete, apiUpload } from './api.js';
import { mergeServerItems } from './merge.js';
import { blobToBase64 } from '../lib/compressImage.js';
import { getSettings } from '../lib/settings.js';

let isRunningOutbox = false;
let pollingTimer = null;
const listeners = new Set();

let currentStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastError: null
};

function updateStatus(updates) {
  currentStatus = { ...currentStatus, ...updates };
  listeners.forEach(cb => {
    try {
      cb(currentStatus);
    } catch (_) {}
  });
}

export function subscribeSyncStatus(callback) {
  listeners.add(callback);
  callback(currentStatus);
  return () => listeners.delete(callback);
}

export function getSyncStatus() {
  return currentStatus;
}

/**
 * Menghitung exponential backoff dengan jitter acak
 */
function calculateBackoff(attempts) {
  const base = 2000 * Math.pow(2, Math.min(attempts, 6)); // 2s, 4s, 8s... maks ~128s
  const cap = Math.min(base, 300000); // batas atas 5 menit
  const jitter = Math.random() * 1000;
  return cap + jitter;
}

/**
 * Eksekusi antrean Outbox satu per satu secara berurutan
 */
export async function flushOutbox() {
  if (isRunningOutbox) return;
  if (!navigator.onLine) {
    const pending = await outboxRepo.countPending();
    updateStatus({ isOnline: false, pendingCount: pending });
    return;
  }

  const { webAppUrl, secret } = getSettings();
  if (!webAppUrl || !secret) {
    const pending = await outboxRepo.countPending();
    updateStatus({ pendingCount: pending, lastError: 'URL atau Secret belum disetel' });
    return;
  }

  isRunningOutbox = true;
  updateStatus({ isSyncing: true, lastError: null });

  try {
    let entries = await outboxRepo.getNextPending(1);

    while (entries.length > 0 && navigator.onLine) {
      const entry = entries[0];
      let success = false;
      let errorMsg = null;

      try {
        if (entry.op === 'delete') {
          const res = await apiDelete(entry.itemId, entry.payload.updatedAt);
          if (res.ok) {
            success = true;
          } else {
            errorMsg = res.error || 'Gagal menghapus di server';
          }
        } else if (entry.op === 'upsert') {
          const itemPayload = { ...entry.payload };

          // 1. Unggah foto barang jika ada Blob
          if (entry.photos && entry.photos.barang) {
            const base64 = await blobToBase64(entry.photos.barang);
            const uploadRes = await apiUpload(entry.itemId, 'barang', 'image/jpeg', base64);
            if (uploadRes.ok && uploadRes.data && uploadRes.data.url) {
              itemPayload.fotoBarangUrl = uploadRes.data.url;
            } else {
              throw new Error(uploadRes.error || 'Gagal unggah foto barang');
            }
          }

          // 2. Unggah foto nota jika ada Blob
          if (entry.photos && entry.photos.nota) {
            const base64 = await blobToBase64(entry.photos.nota);
            const uploadRes = await apiUpload(entry.itemId, 'nota', 'image/jpeg', base64);
            if (uploadRes.ok && uploadRes.data && uploadRes.data.url) {
              itemPayload.fotoNotaUrl = uploadRes.data.url;
            } else {
              throw new Error(uploadRes.error || 'Gagal unggah foto nota');
            }
          }

          // 3. Kirim upsert transaksi
          const upsertRes = await apiUpsert(itemPayload);
          if (upsertRes.ok) {
            success = true;
          } else {
            errorMsg = upsertRes.error || 'Gagal menyimpan transaksi ke server';
          }
        }
      } catch (err) {
        errorMsg = err.message || 'Kesalahan jaringan saat mengirim';
      }

      if (success) {
        await outboxRepo.remove(entry.seq);
      } else {
        // Cek apakah error fatal
        if (errorMsg && (errorMsg.includes('unauthorized') || errorMsg.includes('invalid_input'))) {
          await outboxRepo.markFailed(entry.seq, errorMsg);
          updateStatus({ lastError: errorMsg });
          break;
        } else {
          const nextTryAt = Date.now() + calculateBackoff(entry.attempts || 0);
          await outboxRepo.recordAttempt(entry.seq, nextTryAt, errorMsg);
          updateStatus({ lastError: errorMsg });
          break; // Tunggu siklus berikutnya
        }
      }

      entries = await outboxRepo.getNextPending(1);
    }
  } catch (globalErr) {
    console.error('Error in outbox runner:', globalErr);
  } finally {
    isRunningOutbox = false;
    const pending = await outboxRepo.countPending();
    updateStatus({ isSyncing: false, pendingCount: pending });
  }
}

/**
 * Polling transaksi terbaru dari server
 */
export async function pollServer() {
  if (!navigator.onLine) return;
  if (document.visibilityState !== 'visible') return;

  const { webAppUrl, secret } = getSettings();
  if (!webAppUrl || !secret) return;

  try {
    const db = await getDB();
    const metaRecord = await db.get('meta', 'lastSyncAt');
    const lastSyncAt = metaRecord ? Number(metaRecord.value) || 0 : 0;

    // Overlapping window 60 detik
    const since = Math.max(0, lastSyncAt - 60000);
    const res = await apiList(since);

    if (res.ok && res.data) {
      if (Array.isArray(res.data.items) && res.data.items.length > 0) {
        await mergeServerItems(res.data.items);
      }
      if (res.data.serverTime) {
        await db.put('meta', { key: 'lastSyncAt', value: res.data.serverTime });
      }
    }
  } catch (err) {
    console.warn('Polling error:', err);
  }
}

/**
 * Memulai Sync Engine (event listeners & interval polling)
 */
export function startSyncEngine() {
  // 1. Listener status koneksi browser
  window.addEventListener('online', () => {
    updateStatus({ isOnline: true });
    flushOutbox();
    pollServer();
  });

  window.addEventListener('offline', () => {
    updateStatus({ isOnline: false });
  });

  // 2. Listener perubahan tab (tab visibility)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      flushOutbox();
      pollServer();
    }
  });

  // 3. Polling interval setiap 20 detik
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      pollServer();
      flushOutbox();
    }
  }, 20000);

  // Inisialisasi awal
  outboxRepo.countPending().then(count => {
    updateStatus({
      isOnline: navigator.onLine,
      pendingCount: count
    });
    if (navigator.onLine) {
      flushOutbox();
      pollServer();
    }
  });
}

/**
 * Memaksa sinkronisasi sekarang (dipanggil setelah simpan baru atau tombol sinkron manual)
 */
export function kickSync() {
  if (navigator.onLine) {
    flushOutbox();
    pollServer();
  }
}
