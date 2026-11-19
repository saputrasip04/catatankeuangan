/**
 * db/draftRepo.js — Repositori draft isian halaman Pencatatan
 * 
 * Menyimpan array baris yang sedang diketik agar tidak hilang saat
 * browser di-refresh, ditutup, atau offline.
 */

import { getDB } from './index.js';

const DRAFT_KEY = 'pencatatan';

export const draftRepo = {
  /**
   * Mengambil draft baris tersimpan
   * @returns {Promise<Array|null>}
   */
  async getDraft() {
    const db = await getDB();
    const record = await db.get('draft', DRAFT_KEY);
    return record && Array.isArray(record.rows) ? record.rows : null;
  },

  /**
   * Menyimpan draft baris
   * @param {Array} rows
   */
  async setDraft(rows = []) {
    const db = await getDB();
    await db.put('draft', {
      key: DRAFT_KEY,
      rows,
      updatedAt: Date.now()
    });
  },

  /**
   * Menghapus draft tersimpan
   */
  async clearDraft() {
    const db = await getDB();
    await db.delete('draft', DRAFT_KEY);
  }
};
