/**
 * db/transaksiRepo.js — Repositori CRUD transaksi lokal IndexedDB
 * 
 * Mengimplementasikan prinsip-prinsip:
 * - Operasi atomik addMany (transaksi IDB tunggal mencakup transaksi, outbox, draft)
 * - Soft delete (deleted = true)
 * - Sistem notifikasi perubahan lokal untuk update UI instan
 */

import { getDB, notifySubscribers } from './index.js';

export const transaksiRepo = {
  /**
   * Mengambil semua transaksi dari IndexedDB
   */
  async getAll() {
    const db = await getDB();
    const items = await db.getAll('transaksi');
    // Urutkan dari tanggal terbaru, lalu createdAt terbaru
    return items.sort((a, b) => {
      if (b.tanggal !== a.tanggal) {
        return b.tanggal.localeCompare(a.tanggal);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  },

  /**
   * Mengambil satu transaksi berdasarkan id
   */
  async getById(id) {
    const db = await getDB();
    return db.get('transaksi', id);
  },

  /**
   * Menyimpan banyak baris transaksi sekaligus secara atomik (all-or-nothing).
   * Menulis ke store 'transaksi', store 'outbox', dan membersihkan store 'draft'
   * dalam satu transaksi IndexedDB yang sama.
   * 
   * @param {Array} rows - Daftar baris valid yang akan disimpan
   * @returns {Promise<Array>} Daftar item transaksi yang berhasil dibuat
   */
  async addMany(rows = []) {
    if (!rows.length) return [];

    const db = await getDB();
    const tx = db.transaction(['transaksi', 'outbox', 'draft'], 'readwrite');
    const transaksiStore = tx.objectStore('transaksi');
    const outboxStore = tx.objectStore('outbox');
    const draftStore = tx.objectStore('draft');

    const now = Date.now();
    const createdItems = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const timestamp = now + i; // Jaga urutan input dengan selisih 1ms

      // Hitung ulang jumlah
      let jumlah = 0;
      let qty = null;
      let satuan = null;
      let harga = null;

      if (row.type === 'keluar') {
        qty = Number(row.qty) || 0;
        harga = Number(row.harga) || 0;
        jumlah = Math.round(qty * harga);
        satuan = row.satuan || 'pcs';
      } else {
        jumlah = Number(row.jumlah) || 0;
      }

      // Pastikan id transaksi sudah ada (UUID v4)
      const id = row.id || crypto.randomUUID();

      const item = {
        id,
        type: row.type,
        bkuId: row.bkuId || null,
        tanggal: row.tanggal,
        nama: (row.nama || '').trim(),
        qty,
        satuan,
        harga,
        jumlah,
        fotoBarangUrl: row.fotoBarangUrl || '',
        fotoNotaUrl: row.fotoNotaUrl || '',
        catatan: (row.catatan || '').trim(),
        createdAt: row.createdAt || timestamp,
        updatedAt: timestamp,
        deleted: false,
        // Blob lokal untuk pratinjau instan sebelum sync
        _pendingFotoBarang: row.fotoBarang || null,
        _pendingFotoNota: row.fotoNota || null
      };

      // 1. Simpan ke store transaksi lokal
      await transaksiStore.put(item);

      // 2. Siapkan entri outbox
      const outboxEntry = {
        op: 'upsert',
        itemId: id,
        payload: {
          id: item.id,
          type: item.type,
          bkuId: item.bkuId,
          tanggal: item.tanggal,
          nama: item.nama,
          qty: item.qty,
          satuan: item.satuan,
          harga: item.harga,
          jumlah: item.jumlah,
          fotoBarangUrl: item.fotoBarangUrl,
          fotoNotaUrl: item.fotoNotaUrl,
          catatan: item.catatan,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          deleted: false
        },
        photos: {
          barang: row.fotoBarang || null,
          nota: row.fotoNota || null
        },
        attempts: 0,
        nextTryAt: 0,
        status: 'pending',
        lastError: null,
        createdAt: timestamp
      };

      await outboxStore.add(outboxEntry);
      createdItems.push(item);
    }

    // 3. Hapus draft pada transaksi yang sama
    await draftStore.delete('pencatatan');

    // Commit transaksi IDB
    await tx.done;

    notifySubscribers();
    return createdItems;
  },

  /**
   * Memperbarui satu transaksi yang sudah ada (Edit)
   */
  async update(id, updates, newPhotos = {}) {
    const db = await getDB();
    const tx = db.transaction(['transaksi', 'outbox'], 'readwrite');
    const transaksiStore = tx.objectStore('transaksi');
    const outboxStore = tx.objectStore('outbox');

    const existing = await transaksiStore.get(id);
    if (!existing) {
      throw new Error(`Transaksi dengan id ${id} tidak ditemukan.`);
    }

    const now = Date.now();
    let jumlah = updates.jumlah !== undefined ? updates.jumlah : existing.jumlah;
    let qty = updates.qty !== undefined ? updates.qty : existing.qty;
    let harga = updates.harga !== undefined ? updates.harga : existing.harga;
    let satuan = updates.satuan !== undefined ? updates.satuan : existing.satuan;

    if (updates.type === 'keluar' || (!updates.type && existing.type === 'keluar')) {
      if (qty !== null && harga !== null) {
        jumlah = Math.round(Number(qty) * Number(harga));
      }
    }

    const updatedItem = {
      ...existing,
      ...updates,
      id,
      bkuId: updates.bkuId !== undefined ? updates.bkuId : (existing.bkuId || null),
      qty,
      harga,
      satuan,
      jumlah,
      updatedAt: now,
      _pendingFotoBarang: newPhotos.barang || existing._pendingFotoBarang,
      _pendingFotoNota: newPhotos.nota || existing._pendingFotoNota
    };

    await transaksiStore.put(updatedItem);

    // Entri outbox upsert
    await outboxStore.add({
      op: 'upsert',
      itemId: id,
      payload: {
        id: updatedItem.id,
        type: updatedItem.type,
        bkuId: updatedItem.bkuId,
        tanggal: updatedItem.tanggal,
        nama: updatedItem.nama,
        qty: updatedItem.qty,
        satuan: updatedItem.satuan,
        harga: updatedItem.harga,
        jumlah: updatedItem.jumlah,
        fotoBarangUrl: updatedItem.fotoBarangUrl,
        fotoNotaUrl: updatedItem.fotoNotaUrl,
        catatan: updatedItem.catatan,
        createdAt: updatedItem.createdAt,
        updatedAt: updatedItem.updatedAt,
        deleted: updatedItem.deleted
      },
      photos: {
        barang: newPhotos.barang || null,
        nota: newPhotos.nota || null
      },
      attempts: 0,
      nextTryAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: now
    });

    await tx.done;
    notifySubscribers();
    return updatedItem;
  },

  /**
   * Soft delete transaksi (deleted = true, updatedAt = now)
   */
  async softDelete(id) {
    const db = await getDB();
    const tx = db.transaction(['transaksi', 'outbox'], 'readwrite');
    const transaksiStore = tx.objectStore('transaksi');
    const outboxStore = tx.objectStore('outbox');

    const existing = await transaksiStore.get(id);
    if (!existing) return false;

    const now = Date.now();
    const deletedItem = {
      ...existing,
      deleted: true,
      updatedAt: now
    };

    await transaksiStore.put(deletedItem);

    // Entri outbox delete
    await outboxStore.add({
      op: 'delete',
      itemId: id,
      payload: {
        id,
        updatedAt: now
      },
      photos: { barang: null, nota: null },
      attempts: 0,
      nextTryAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: now
    });

    await tx.done;
    notifySubscribers();
    return true;
  }
};
