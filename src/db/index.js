/**
 * db/index.js — Inisialisasi IndexedDB menggunakan library `idb`
 * 
 * Skema database 'keuangan-db' versi 1:
 * - transaksi: menyimpan data transaksi lokal (keyPath: 'id')
 * - outbox: antrean sinkronisasi perubahan lokal ke server (keyPath: 'seq', autoIncrement)
 * - meta: metadata sinkronisasi seperti lastSyncAt (keyPath: 'key')
 * - draft: draft isian multi-baris yang belum disimpan (keyPath: 'key')
 */

import { openDB } from 'idb';

export const DB_NAME = 'keuangan-db';
export const DB_VERSION = 1;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // 1. Store transaksi
        if (!db.objectStoreNames.contains('transaksi')) {
          const store = db.createObjectStore('transaksi', { keyPath: 'id' });
          store.createIndex('by_tanggal', 'tanggal', { unique: false });
          store.createIndex('by_type', 'type', { unique: false });
          store.createIndex('by_updatedAt', 'updatedAt', { unique: false });
          store.createIndex('by_deleted', 'deleted', { unique: false });
        }

        // 2. Store outbox
        if (!db.objectStoreNames.contains('outbox')) {
          const store = db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
          store.createIndex('by_itemId', 'itemId', { unique: false });
          store.createIndex('by_nextTryAt', 'nextTryAt', { unique: false });
        }

        // 3. Store meta
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }

        // 4. Store draft
        if (!db.objectStoreNames.contains('draft')) {
          db.createObjectStore('draft', { keyPath: 'key' });
        }
      }
    });
  }
  return dbPromise;
}

/**
 * Menghapus seluruh isi database lokal
 */
export async function clearAllLocalData() {
  const db = await getDB();
  const tx = db.transaction(['transaksi', 'outbox', 'meta', 'draft'], 'readwrite');
  await Promise.all([
    tx.objectStore('transaksi').clear(),
    tx.objectStore('outbox').clear(),
    tx.objectStore('meta').clear(),
    tx.objectStore('draft').clear(),
    tx.done
  ]);
  notifySubscribers();
}

// Sistem event sederhana untuk memberi tahu UI saat data transaksi berubah di IndexedDB
const listeners = new Set();

export function subscribeToDBChanges(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function notifySubscribers() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error in DB subscriber:', e);
    }
  });
}
