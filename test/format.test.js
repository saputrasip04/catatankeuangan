import { describe, it, expect } from 'vitest';
import { formatRupiah, parseRupiah, formatTanggal } from '../src/lib/format.js';

describe('Format Utility (format.js)', () => {
  it('memformat angka ke Rupiah dengan benar', () => {
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000');
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(-50000)).toBe('-Rp 50.000');
    expect(formatRupiah(75000, false)).toBe('75.000');
  });

  it('memparsing string Rupiah ke integer', () => {
    expect(parseRupiah('Rp 1.250.000')).toBe(1250000);
    expect(parseRupiah('50.000')).toBe(50000);
    expect(parseRupiah('')).toBe(0);
  });

  it('memformat tanggal ke format lokal Indonesia', () => {
    const formatted = formatTanggal('2026-11-19');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('19');
  });
});
