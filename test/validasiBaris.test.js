import { describe, it, expect } from 'vitest';
import { validasiBaris, isBarisKosong } from '../src/lib/validasiBaris.js';

describe('Validasi Baris (validasiBaris.js)', () => {
  it('lolos untuk baris keluar yang valid', () => {
    const row = {
      type: 'keluar',
      tanggal: '2026-11-19',
      nama: 'Beras Pandan Wangi',
      qty: 5,
      satuan: 'kg',
      harga: 15000,
      catatan: 'Beli di pasar'
    };
    const res = validasiBaris(row);
    expect(res.ok).toBe(true);
    expect(Object.keys(res.errors).length).toBe(0);
  });

  it('gagal untuk pengeluaran dengan qty <= 0 atau harga <= 0', () => {
    const row = {
      type: 'keluar',
      tanggal: '2026-11-19',
      nama: 'Minyak Goreng',
      qty: 0,
      harga: -5000
    };
    const res = validasiBaris(row);
    expect(res.ok).toBe(false);
    expect(res.errors.qty).toBeDefined();
    expect(res.errors.harga).toBeDefined();
  });

  it('lolos untuk baris pemasukan yang valid', () => {
    const row = {
      type: 'masuk',
      tanggal: '2026-11-19',
      nama: 'Gaji Bulanan',
      jumlah: 7500000
    };
    const res = validasiBaris(row);
    expect(res.ok).toBe(true);
  });

  it('gagal jika nama kosong atau tanggal tidak sesuai format YYYY-MM-DD', () => {
    const row = {
      type: 'masuk',
      tanggal: '19-11-2026', // format salah
      nama: '   ',          // whitespace
      jumlah: 100000
    };
    const res = validasiBaris(row);
    expect(res.ok).toBe(false);
    expect(res.errors.nama).toBeDefined();
    expect(res.errors.tanggal).toBeDefined();
  });

  it('mendeteksi baris kosong dengan tepat', () => {
    expect(isBarisKosong({ type: 'keluar', nama: '', qty: '', harga: '', catatan: '' })).toBe(true);
    expect(isBarisKosong({ type: 'keluar', nama: 'Kopi', qty: '', harga: '' })).toBe(false);
    expect(isBarisKosong({ type: 'masuk', nama: '', jumlah: 0 })).toBe(true);
  });
});
