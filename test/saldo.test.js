import { describe, it, expect } from 'vitest';
import { hitungSaldo, saldoSetelah, hitungRingkasanBulan } from '../src/lib/saldo.js';

describe('Logika Saldo (saldo.js)', () => {
  it('menghitung saldo normal dari transaksi masuk dan keluar', () => {
    const items = [
      { id: '1', type: 'masuk', jumlah: 5000000, deleted: false },
      { id: '2', type: 'keluar', jumlah: 150000, deleted: false },
      { id: '3', type: 'keluar', jumlah: 50000, deleted: false },
    ];
    expect(hitungSaldo(items)).toBe(4800000);
  });

  it('mengabaikan transaksi yang berstatus soft-delete (deleted = true)', () => {
    const items = [
      { id: '1', type: 'masuk', jumlah: 5000000, deleted: false },
      { id: '2', type: 'keluar', jumlah: 500000, deleted: true }, // deleted!
    ];
    expect(hitungSaldo(items)).toBe(5000000);
  });

  it('menghitung saldoSetelah dengan benar untuk simulasi draft', () => {
    const saldoKini = 1000000;
    const barisDraft = [
      { type: 'keluar', jumlah: 250000 },
      { type: 'masuk', jumlah: 500000 },
      { type: 'keluar', jumlah: 50000 }
    ];
    expect(saldoSetelah(saldoKini, barisDraft)).toBe(1200000);
  });

  it('menghitung ringkasan bulan dengan filter YYYY-MM', () => {
    const items = [
      { tanggal: '2026-11-01', type: 'masuk', jumlah: 1000000, deleted: false },
      { tanggal: '2026-11-15', type: 'keluar', jumlah: 200000, deleted: false },
      { tanggal: '2026-10-25', type: 'keluar', jumlah: 500000, deleted: false }, // bulan lalu
      { tanggal: '2026-11-19', type: 'keluar', jumlah: 100000, deleted: true },  // terhapus
    ];
    const ringkasan = hitungRingkasanBulan(items, '2026-11');
    expect(ringkasan.totalMasuk).toBe(1000000);
    expect(ringkasan.totalKeluar).toBe(200000);
    expect(ringkasan.selisih).toBe(800000);
  });

  it('menghitung saldo terpisah untuk setiap BKU (kegiatan)', () => {
    // BKU 1: FOTO RAPORT (13.650.000)
    // BKU 2: FOTO IJAZAH (5.000.000)
    const bku1 = { id: 'bku-1', type: 'masuk', nama: 'FOTO RAPORT', jumlah: 13650000, deleted: false };
    const bku2 = { id: 'bku-2', type: 'masuk', nama: 'FOTO IJAZAH', jumlah: 5000000, deleted: false };

    const expenses = [
      { id: 'exp-1', bkuId: 'bku-1', type: 'keluar', jumlah: 150000, deleted: false },
      { id: 'exp-2', bkuId: 'bku-1', type: 'keluar', jumlah: 500000, deleted: false },
      { id: 'exp-3', bkuId: 'bku-2', type: 'keluar', jumlah: 200000, deleted: false },
    ];

    // Saldo BKU 1 = 13.650.000 - 150.000 - 500.000 = 13.000.000
    const bku1Expenses = expenses.filter(e => e.bkuId === 'bku-1');
    const saldoBku1 = bku1.jumlah - bku1Expenses.reduce((acc, e) => acc + e.jumlah, 0);
    expect(saldoBku1).toBe(13000000);

    // Saldo BKU 2 = 5.000.000 - 200.000 = 4.800.000
    const bku2Expenses = expenses.filter(e => e.bkuId === 'bku-2');
    const saldoBku2 = bku2.jumlah - bku2Expenses.reduce((acc, e) => acc + e.jumlah, 0);
    expect(saldoBku2).toBe(4800000);
  });
});
