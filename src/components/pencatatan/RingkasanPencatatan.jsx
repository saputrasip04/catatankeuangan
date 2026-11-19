/**
 * pencatatan/RingkasanPencatatan.jsx — Panel ringkasan dampak transaksi terhadap saldo
 */

import React, { useMemo } from 'react';
import { AlertTriangle, RotateCcw, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatRupiah } from '../../lib/format.js';
import { saldoSetelah } from '../../lib/saldo.js';

export default function RingkasanPencatatan({
  saldoKini = 0,
  rows = [],
  onResetAll
}) {
  const { totalMasuk, totalKeluar, netPerubahan, estimasiSaldoAkhir, isMinus } = useMemo(() => {
    let masuk = 0;
    let keluar = 0;

    rows.forEach((r) => {
      const jml = Number(r.jumlah) || 0;
      if (r.type === 'masuk') masuk += jml;
      else if (r.type === 'keluar') keluar += jml;
    });

    const net = masuk - keluar;
    const akhir = saldoSetelah(saldoKini, rows);

    return {
      totalMasuk: masuk,
      totalKeluar: keluar,
      netPerubahan: net,
      estimasiSaldoAkhir: akhir,
      isMinus: akhir < 0
    };
  }, [saldoKini, rows]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-teal-600" />
          <span>Ringkasan Saldo</span>
        </h2>

        <button
          type="button"
          onClick={() => {
            if (window.confirm('Kosongkan semua isian dan kembali ke 1 baris kosong?')) {
              onResetAll();
            }
          }}
          title="Kosongkan seluruh baris draft"
          className="text-xs text-gray-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Kosongkan</span>
        </button>
      </div>

      {/* Saldo Kini */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500">Saldo saat ini:</span>
        <span className="font-semibold text-gray-900">{formatRupiah(saldoKini)}</span>
      </div>

      {/* Rincian Baris */}
      <div className="space-y-1.5 pt-1 border-t border-dashed border-gray-100 text-xs">
        {totalMasuk > 0 && (
          <div className="flex justify-between items-center text-emerald-700">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Pemasukan baru:</span>
            </span>
            <span className="font-semibold">+{formatRupiah(totalMasuk)}</span>
          </div>
        )}

        {totalKeluar > 0 && (
          <div className="flex justify-between items-center text-rose-700">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Pengeluaran baru:</span>
            </span>
            <span className="font-semibold">-{formatRupiah(totalKeluar)}</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-1 text-gray-600">
          <span>Perubahan saldo:</span>
          <span className={`font-semibold ${netPerubahan < 0 ? 'text-rose-600' : netPerubahan > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
            {netPerubahan > 0 ? `+${formatRupiah(netPerubahan)}` : formatRupiah(netPerubahan)}
          </span>
        </div>
      </div>

      {/* Estimasi Saldo Akhir */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-medium text-gray-700">Saldo Setelah Disimpan:</span>
        </div>
        <p className={`text-xl font-bold truncate ${isMinus ? 'text-rose-600' : 'text-teal-700'}`}>
          {formatRupiah(estimasiSaldoAkhir)}
        </p>
      </div>

      {/* Peringatan Saldo Minus */}
      {isMinus && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="leading-snug">
            <p className="font-semibold">Peringatan: Saldo Defisit!</p>
            <p className="text-rose-700 mt-0.5">
              Total pengeluaran membuat saldo minus. Anda tetap dapat menyimpan dengan konfirmasi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
