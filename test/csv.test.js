import { describe, it, expect } from 'vitest';
import { generateCsv } from '../src/lib/csv.js';

describe('Ekspor CSV (csv.js)', () => {
  it('menghasilkan CSV dengan BOM UTF-8 dan format yang benar', () => {
    const items = [
      {
        id: 'uuid-1',
        type: 'keluar',
        tanggal: '2026-11-19',
        nama: 'Beras',
        qty: 5,
        satuan: 'kg',
        harga: 14000,
        jumlah: 70000,
        fotoBarangUrl: '',
        fotoNotaUrl: '',
        catatan: 'Pasar',
        createdAt: 1766000000000,
        updatedAt: 1766000000000,
        deleted: false
      },
      {
        id: 'uuid-2',
        type: 'masuk',
        tanggal: '2026-11-19',
        nama: 'Gaji',
        jumlah: 5000000,
        deleted: true // harus diabaikan
      }
    ];

    const csv = generateCsv(items);
    expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
    expect(csv).toContain('id,type,tanggal,nama,qty,satuan,harga,jumlah');
    expect(csv).toContain('Beras');
    expect(csv).not.toContain('Gaji'); // soft deleted diabaikan
  });

  it('mencegah formula injection dengan memberi prefix petik tunggal', () => {
    const items = [
      {
        id: 'uuid-hack',
        type: 'keluar',
        tanggal: '2026-11-19',
        nama: '=cmd|/C calc!A0',
        qty: 1,
        harga: 1000,
        jumlah: 1000,
        deleted: false
      }
    ];

    const csv = generateCsv(items);
    expect(csv).toContain("'=cmd|/C calc!A0");
  });
});
