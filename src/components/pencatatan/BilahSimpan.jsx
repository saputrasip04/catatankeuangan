/**
 * pencatatan/BilahSimpan.jsx — Bilah aksi menempel di bawah layar (Sticky Bottom)
 */

import React from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { formatRupiah } from '../../lib/format.js';

export default function BilahSimpan({
  rowCount = 1,
  totalMasuk = 0,
  totalKeluar = 0,
  isSaving = false,
  onSave
}) {
  const hasExceededSoftLimit = rowCount > 50;

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:right-64 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 z-20 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Ringkasan Cepat */}
        <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-700 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
              {rowCount}
            </span>
            <span>baris</span>
          </div>

          <div className="flex items-center gap-3">
            {totalMasuk > 0 && (
              <span className="text-emerald-700 font-semibold truncate">
                Masuk: {formatRupiah(totalMasuk)}
              </span>
            )}
            {totalKeluar > 0 && (
              <span className="text-rose-700 font-semibold truncate">
                Keluar: {formatRupiah(totalKeluar)}
              </span>
            )}
          </div>
        </div>

        {/* Tombol Simpan Semua */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {hasExceededSoftLimit && (
            <span title="Dianjurkan menyimpan berkala di bawah 50 baris" className="text-amber-600 hidden md:flex items-center gap-1 text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>Batas lunak &gt;50</span>
            </span>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="flex-1 sm:flex-none py-2.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan semua ({rowCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
