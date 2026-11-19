/**
 * KartuSaldo.jsx — Kartu saldo utama di halaman Beranda
 */

import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatRupiah } from '../lib/format.js';
import { useSaldo } from '../hooks/useSaldo.js';

export default function KartuSaldo() {
  const { saldo, totalMasukBulanIni, totalKeluarBulanIni, selisihBulanIni } = useSaldo();

  return (
    <div className="bg-gradient-to-br from-teal-800 to-teal-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-teal-600/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase tracking-wider">
          <Wallet className="w-4 h-4 text-teal-300" />
          <span>Total Saldo Aktif</span>
        </div>

        <Link
          to="/catat"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/60 hover:bg-teal-600 active:bg-teal-700 text-xs font-semibold text-white transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Catat</span>
        </Link>
      </div>

      {/* Saldo Besar */}
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {formatRupiah(saldo)}
        </h2>
      </div>

      {/* Ringkasan Bulan Ini */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-teal-700/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-teal-300">Pemasukan Bulan Ini</p>
            <p className="text-sm font-bold text-white truncate">
              {formatRupiah(totalMasukBulanIni)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-teal-300">Pengeluaran Bulan Ini</p>
            <p className="text-sm font-bold text-white truncate">
              {formatRupiah(totalKeluarBulanIni)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
