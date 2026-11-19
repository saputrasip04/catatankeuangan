/**
 * db/outboxRepo.js — Repositori antrean pengiriman offline (Outbox)
 */

import { getDB } from './index.js';

export const outboxRepo = {
  /**
   * Mengambil entri outbox yang siap dikirim (status = 'pending' dan nextTryAt <= now)
   */
  async getNextPending(limit = 10) {
    const db = await getDB();
    const now = Date.now();
    const all = await db.getAll('outbox');
    return all
      .filter(entry => entry.status === 'pending' && (!entry.nextTryAt || entry.nextTryAt <= now))
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit);
  },

  /**
   * Menghitung jumlah antrean outbox yang belum selesai
   */
  async countPending() {
    const db = await getDB();
    const all = await db.getAll('outbox');
    return all.filter(e => e.status === 'pending').length;
  },

  /**
   * Mengecek apakah item tertentu memiliki antrean tertunda di outbox
   * (Penting untuk aturan merge LWW agar data server tidak menimpa editan lokal)
   */
  async hasPendingForItem(itemId) {
    if (!itemId) return false;
    const db = await getDB();
    const index = db.transaction('outbox').store.index('by_itemId');
    const matches = await index.getAll(itemId);
    return matches.some(e => e.status === 'pending');
  },

  /**
   * Menghapus entri outbox setelah berhasil dikirim
   */
  async remove(seq) {
    const db = await getDB();
    return db.delete('outbox', seq);
  },

  /**
   * Mencatat kegagalan kirim dan menjadwalkan percobaan ulang (Exponential Backoff)
   */
  async recordAttempt(seq, nextTryAt, errorMsg) {
    const db = await getDB();
    const entry = await db.get('outbox', seq);
    if (!entry) return;

    entry.attempts = (entry.attempts || 0) + 1;
    entry.nextTryAt = nextTryAt;
    entry.lastError = errorMsg;
    await db.put('outbox', entry);
  },

  /**
   * Menandai entri outbox gagal permanen (misal secret salah atau format ditolak)
   */
  async markFailed(seq, errorMsg) {
    const db = await getDB();
    const entry = await db.get('outbox', seq);
    if (!entry) return;

    entry.status = 'failed';
    entry.lastError = errorMsg;
    await db.put('outbox', entry);
  }
};
