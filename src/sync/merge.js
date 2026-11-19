/**
 * sync/merge.js — Logika merge Last-Write-Wins (LWW) antara data lokal dan server
 * 
 * Aturan sesuai tech.md 7.3:
 * 1. Tidak ada di lokal -> simpan ke lokal.
 * 2. Ada di lokal dan ADA entri outbox pending untuk ID itu -> JANGAN timpa (lokal menang sementara).
 * 3. Selain itu -> bandingkan updatedAt, yang lebih besar menang.
 */

import { getDB, notifySubscribers } from '../db/index.js';
import { outboxRepo } from '../db/outboxRepo.js';

export async function mergeServerItems(serverItems = []) {
  if (!Array.isArray(serverItems) || serverItems.length === 0) return 0;

  const db = await getDB();
  const tx = db.transaction('transaksi', 'readwrite');
  const store = tx.objectStore('transaksi');

  let mergedCount = 0;

  for (const sItem of serverItems) {
    if (!sItem || !sItem.id) continue;

    // 1. Cek apakah ada di outbox lokal
    const hasOutbox = await outboxRepo.hasPendingForItem(sItem.id);
    if (hasOutbox) {
      // Perubahan lokal belum terkirim menang sementara
      continue;
    }

    // 2. Ambil data lokal saat ini
    const localItem = await store.get(sItem.id);

    if (!localItem) {
      // Belum ada di lokal -> simpan
      await store.put(sItem);
      mergedCount++;
    } else {
      // Sudah ada di lokal -> bandingkan updatedAt
      const localUpdated = Number(localItem.updatedAt) || 0;
      const serverUpdated = Number(sItem.updatedAt) || 0;

      if (serverUpdated > localUpdated) {
        // Data server lebih baru -> timpa
        await store.put({
          ...localItem,
          ...sItem,
          // Bersihkan pending blob jika server sudah memiliki URL
          _pendingFotoBarang: sItem.fotoBarangUrl ? null : localItem._pendingFotoBarang,
          _pendingFotoNota: sItem.fotoNotaUrl ? null : localItem._pendingFotoNota
        });
        mergedCount++;
      }
    }
  }

  await tx.done;

  if (mergedCount > 0) {
    notifySubscribers();
  }

  return mergedCount;
}
