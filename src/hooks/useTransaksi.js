/**
 * hooks/useTransaksi.js — Hook reaktif untuk membaca data transaksi dari IndexedDB
 */

import { useState, useEffect, useCallback } from 'react';
import { transaksiRepo } from '../db/transaksiRepo.js';
import { subscribeToDBChanges } from '../db/index.js';

export function useTransaksi() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await transaksiRepo.getAll();
      setItems(data);
    } catch (err) {
      console.error('Gagal membaca transaksi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToDBChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  return { items, loading, reload: loadData };
}
