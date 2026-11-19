/**
 * ItemTransaksi.jsx — Item tampilan transaksi di Beranda dan Riwayat
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Camera, ChevronRight } from 'lucide-react';
import { formatRupiah, formatTanggal } from '../lib/format.js';

export default function ItemTransaksi({ item }) {
  const isMasuk = item.type === 'masuk';
  const hasPhotos = Boolean(item.fotoBarangUrl || item.fotoNotaUrl || item._pendingFotoBarang || item._pendingFotoNota);

  return (
    <Link
      to={`/riwayat/${item.id}`}
      className="flex items-center justify-between p-3.5 bg-white hover:bg-gray-50/80 active:bg-gray-100/80 border border-gray-200/80 rounded-xl transition-colors group shadow-2xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Ikon Masuk / Keluar */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isMasuk
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-rose-50 text-rose-600'
          }`}
        >
          {isMasuk ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
        </div>

        {/* Info Nama, Tanggal & Qty */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {item.nama || '(Tanpa Nama)'}
            </p>
            {hasPhotos && (
              <Camera className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" title="Memiliki foto bukti" />
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span>{formatTanggal(item.tanggal)}</span>
            {!isMasuk && item.qty && (
              <span>• {item.qty} {item.satuan || 'pcs'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Jumlah Uang & Panah */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <p
          className={`text-sm font-bold truncate ${
            isMasuk ? 'text-emerald-600' : 'text-gray-900'
          }`}
        >
          {isMasuk ? `+${formatRupiah(item.jumlah)}` : `-${formatRupiah(item.jumlah)}`}
        </p>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </Link>
  );
}
