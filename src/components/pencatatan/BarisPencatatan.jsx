/**
 * pencatatan/BarisPencatatan.jsx — Komponen representasi satu baris transaksi
 * 
 * Dibungkus React.memo agar performa pengetikan lancar pada banyak baris.
 */

import React, { memo, useRef, useEffect } from 'react';
import { Copy, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { SATUAN_OPTIONS } from '../../lib/validasiBaris.js';
import { formatRupiah, parseRupiah } from '../../lib/format.js';
import FotoInput from '../FotoInput.jsx';

const BarisPencatatan = memo(function BarisPencatatan({
  index,
  row,
  canDelete,
  onUpdateField,
  onSetType,
  onDuplicate,
  onRemove,
  isLastRow,
  onEnterOnLastField
}) {
  const firstInputRef = useRef(null);

  // Fokuskan kursor ke field pertama jika ini baris baru yang belum disentuh
  useEffect(() => {
    if (!row.touched && !row.nama && index > 0) {
      firstInputRef.current?.focus();
    }
  }, [index, row.touched, row.nama]);

  const errors = row.errors || {};

  const handleRemove = () => {
    // Beri konfirmasi jika baris sudah terisi data
    const isFilled = Boolean(row.nama || row.qty || row.harga || row.jumlah || row.fotoBarang || row.fotoNota);
    if (isFilled) {
      if (!window.confirm(`Hapus baris ke-${index + 1} (${row.nama || 'Transaksi'})?`)) {
        return;
      }
    }
    onRemove(index);
  };

  const handleLastFieldKeyDown = (e) => {
    if (e.key === 'Enter' && isLastRow && onEnterOnLastField) {
      e.preventDefault();
      onEnterOnLastField();
    }
  };

  return (
    <div
      role="group"
      aria-label={`Baris ${index + 1}`}
      className={`p-4 rounded-xl border bg-white shadow-xs transition-all ${
        Object.keys(errors).length > 0 ? 'border-rose-400 bg-rose-50/10' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Baris Header: Nomor baris, Toggle Jenis, Tombol Gandakan & Hapus */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>

          {/* Toggle Jenis: Masuk / Keluar */}
          <div className="inline-flex rounded-lg p-0.5 bg-gray-100 border border-gray-200">
            <button
              type="button"
              onClick={() => onSetType(index, 'keluar')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                row.type === 'keluar'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
            <button
              type="button"
              onClick={() => onSetType(index, 'masuk')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                row.type === 'masuk'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </button>
          </div>
        </div>

        {/* Tombol Gandakan & Hapus */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicate(index)}
            title="Gandakan baris ini"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={handleRemove}
              title="Hapus baris ini"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Form Fields: Tipe KELUAR */}
      {row.type === 'keluar' ? (
        <div className="space-y-3">
          {/* Baris 1: Tanggal & Nama */}
          <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={row.tanggal}
                onChange={(e) => onUpdateField(index, 'tanggal', e.target.value)}
                className={`w-full text-sm rounded-lg border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                  errors.tanggal ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                }`}
              />
              {errors.tanggal && <p className="text-[11px] text-rose-600 mt-0.5">{errors.tanggal}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nama Pengeluaran *</label>
              <input
                ref={firstInputRef}
                type="text"
                placeholder="Contoh: Beras, Kopi, Bensin..."
                value={row.nama}
                onChange={(e) => onUpdateField(index, 'nama', e.target.value)}
                className={`w-full text-sm rounded-lg border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                  errors.nama ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                }`}
              />
              {errors.nama && <p className="text-[11px] text-rose-600 mt-0.5">{errors.nama}</p>}
            </div>
          </div>

          {/* Baris 2: Qty, Satuan, Harga Satuan, Jumlah (Auto) */}
          <div className="grid grid-cols-2 sm:grid-cols-[5rem_6.5rem_1fr_1fr] gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Qty *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="1"
                value={row.qty}
                onChange={(e) => onUpdateField(index, 'qty', e.target.value)}
                className={`w-full text-sm rounded-lg border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                  errors.qty ? 'border-rose-500' : 'border-gray-300'
                }`}
              />
              {errors.qty && <p className="text-[11px] text-rose-600 mt-0.5">{errors.qty}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Satuan</label>
              <select
                value={row.satuan || 'pcs'}
                onChange={(e) => onUpdateField(index, 'satuan', e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-300 px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {SATUAN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Harga Satuan *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-gray-400">Rp</span>
                <input
                  type="text"
                  placeholder="0"
                  value={row.harga ? new Intl.NumberFormat('id-ID').format(row.harga) : ''}
                  onChange={(e) => onUpdateField(index, 'harga', parseRupiah(e.target.value))}
                  className={`w-full text-sm rounded-lg border pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                    errors.harga ? 'border-rose-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.harga && <p className="text-[11px] text-rose-600 mt-0.5">{errors.harga}</p>}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Total Jumlah (Otomatis)</label>
              <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-bold text-rose-700 truncate">
                {formatRupiah(row.jumlah || 0)}
              </div>
            </div>
          </div>

          {/* Baris 3: Foto Barang, Foto Nota, & Catatan */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-4 pt-2">
            <FotoInput
              label="Foto Barang"
              value={row.fotoBarang}
              onChange={(blob) => onUpdateField(index, 'fotoBarang', blob)}
              onRemove={() => onUpdateField(index, 'fotoBarang', null)}
            />

            <FotoInput
              label="Foto Nota"
              value={row.fotoNota}
              onChange={(blob) => onUpdateField(index, 'fotoNota', blob)}
              onRemove={() => onUpdateField(index, 'fotoNota', null)}
            />

            <div className="flex-1 flex flex-col justify-end">
              <label className="block text-xs font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
              <textarea
                rows="2"
                placeholder="Catatan tambahan..."
                value={row.catatan}
                onKeyDown={handleLastFieldKeyDown}
                onChange={(e) => onUpdateField(index, 'catatan', e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-300 px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Form Fields: Tipe MASUK */
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr_1fr] gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={row.tanggal}
                onChange={(e) => onUpdateField(index, 'tanggal', e.target.value)}
                className={`w-full text-sm rounded-lg border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                  errors.tanggal ? 'border-rose-500' : 'border-gray-300'
                }`}
              />
              {errors.tanggal && <p className="text-[11px] text-rose-600 mt-0.5">{errors.tanggal}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sumber Pemasukan *</label>
              <input
                ref={firstInputRef}
                type="text"
                placeholder="Contoh: Gaji, Bonus, Penjualan..."
                value={row.nama}
                onChange={(e) => onUpdateField(index, 'nama', e.target.value)}
                className={`w-full text-sm rounded-lg border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                  errors.nama ? 'border-rose-500' : 'border-gray-300'
                }`}
              />
              {errors.nama && <p className="text-[11px] text-rose-600 mt-0.5">{errors.nama}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah Pemasukan *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-gray-400">Rp</span>
                <input
                  type="text"
                  placeholder="0"
                  value={row.jumlah ? new Intl.NumberFormat('id-ID').format(row.jumlah) : ''}
                  onChange={(e) => onUpdateField(index, 'jumlah', parseRupiah(e.target.value))}
                  className={`w-full text-sm rounded-lg border pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-semibold text-emerald-700 ${
                    errors.jumlah ? 'border-rose-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.jumlah && <p className="text-[11px] text-rose-600 mt-0.5">{errors.jumlah}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
            <input
              type="text"
              placeholder="Catatan tambahan..."
              value={row.catatan}
              onKeyDown={handleLastFieldKeyDown}
              onChange={(e) => onUpdateField(index, 'catatan', e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default BarisPencatatan;
