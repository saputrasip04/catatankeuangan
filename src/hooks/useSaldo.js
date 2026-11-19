/**
 * hooks/useSaldo.js — Hook reaktif untuk menghitung saldo dinamis
 * 
 * Saldo dihitung murni dari transaksi aktif (deleted = false)
 */

import { useMemo } from 'react';
import { useTransaksi } from './useTransaksi.js';
import { hitungSaldo, hitungRingkasanBulan } from '../lib/saldo.js';

export function useSaldo(targetYyyyMm) {
  const { items, loading } = useTransaksi();

  const { saldo, ringkasanBulan } = useMemo(() => {
    const s = hitungSaldo(items);
    const r = hitungRingkasanBulan(items, targetYyyyMm);
    return { saldo: s, ringkasanBulan: r };
  }, [items, targetYyyyMm]);

  return {
    saldo,
    totalMasukBulanIni: ringkasanBulan.totalMasuk,
    totalKeluarBulanIni: ringkasanBulan.totalKeluar,
    selisihBulanIni: ringkasanBulan.selisih,
    loading
  };
}
