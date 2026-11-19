/**
 * ModalTambahTransaksi.jsx — Modal / Form untuk menambah transaksi baru
 * 
 * Dipanggil saat menekan tombol '+' pada tabel Catatan Transaksi
 */

import React, { useState, useEffect } from 'react';
import { transaksiRepo } from '../db/transaksiRepo.js';
import { kickSync } from '../sync/engine.js';
import { validasiBaris } from '../lib/validasiBaris.js';
import { getTodayDateString, parseRupiah } from '../lib/format.js';
import { SATUAN_OPTIONS } from '../lib/validasiBaris.js';
import FotoInput from './FotoInput.jsx';
import { X, Save, ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';

export default function ModalTambahTransaksi({
  isOpen,
  onClose,
  initialType = 'keluar',
  bkuList = [],
  defaultBkuId = null
}) {
  const [type, setType] = useState(initialType || 'keluar');
  const [bkuId, setBkuId] = useState(defaultBkuId || '');
  const [tanggal, setTanggal] = useState(getTodayDateString());
  const [nama, setNama] = useState('');
  const [qty, setQty] = useState('');
  const [satuan, setSatuan] = useState('pcs');
  const [harga, setHarga] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [catatan, setCatatan] = useState('');
  const [fotoBarang, setFotoBarang] = useState(null);
  const [fotoNota, setFotoNota] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType(initialType || 'keluar');
      setBkuId(defaultBkuId || (bkuList[0]?.id || ''));
    }
  }, [isOpen, initialType, defaultBkuId, bkuList]);

  if (!isOpen) return null;

  const hitungJumlahKeluar = () => {
    const q = Number(qty) || 0;
    const h = Number(harga) || 0;
    return Math.round(q * h);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const rowData = {
      type,
      bkuId: type === 'keluar' ? (bkuId || (bkuList[0]?.id || null)) : null,
      tanggal,
      nama,
      qty: type === 'keluar' ? qty : null,
      satuan: type === 'keluar' ? satuan : null,
      harga: type === 'keluar' ? harga : null,
      jumlah: type === 'keluar' ? hitungJumlahKeluar() : jumlah,
      catatan,
      fotoBarang,
      fotoNota
    };

    const val = validasiBaris(rowData);
    if (!val.ok) {
      setErrors(val.errors);
      return;
    }

    setIsSaving(true);
    try {
      await transaksiRepo.addMany([rowData]);
      kickSync();
      // Reset form
      setNama('');
      setQty('');
      setHarga('');
      setJumlah('');
      setCatatan('');
      setFotoBarang(null);
      setFotoNota(null);
      setErrors({});
      onClose();
    } catch (err) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-gray-200 my-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            Tambah Transaksi Baru
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-3 text-xs sm:text-sm">
          {/* Toggle Jenis: Pemasukan / Pengeluaran */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('keluar')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  type === 'keluar'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Pengeluaran</span>
              </button>
              <button
                type="button"
                onClick={() => setType('masuk')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  type === 'masuk'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Pemasukan</span>
              </button>
            </div>
          </div>

          {/* Pemilihan BKU untuk Pengeluaran */}
          {type === 'keluar' && bkuList.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Buku Kas (BKU) / Kegiatan Terkait *
              </label>
              <select
                value={bkuId}
                onChange={(e) => setBkuId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs font-semibold"
              >
                {bkuList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tanggal & Nama */}
          <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tanggal *
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs"
              />
              {errors.tanggal && (
                <p className="text-[11px] text-rose-600 mt-0.5">{errors.tanggal}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {type === 'masuk' ? 'Sumber Pemasukan (Pencatatan) *' : 'Uraian Pengeluaran *'}
              </label>
              <input
                type="text"
                placeholder={type === 'masuk' ? 'Contoh: Foto Raport, Foto Ijazah...' : 'Contoh: Kertas Foto, Bensin...'}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs"
              />
              {errors.nama && (
                <p className="text-[11px] text-rose-600 mt-0.5">{errors.nama}</p>
              )}
            </div>
          </div>

          {/* Detail Khusus Pengeluaran */}
          {type === 'keluar' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-[5rem_6.5rem_1fr] gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Qty *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs"
                  />
                  {errors.qty && (
                    <p className="text-[11px] text-rose-600 mt-0.5">{errors.qty}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Satuan
                  </label>
                  <select
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs"
                  >
                    {SATUAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Harga Satuan *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-gray-400">Rp</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={harga ? new Intl.NumberFormat('id-ID').format(harga) : ''}
                      onChange={(e) => setHarga(parseRupiah(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs"
                    />
                  </div>
                  {errors.harga && (
                    <p className="text-[11px] text-rose-600 mt-0.5">{errors.harga}</p>
                  )}
                </div>
              </div>

              {/* Total Otomatis */}
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center text-xs">
                <span className="text-gray-600">Total Pengeluaran (Qty × Harga):</span>
                <span className="text-sm font-bold text-rose-600">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(hitungJumlahKeluar())}
                </span>
              </div>

              {/* Upload Foto Barang & Foto Nota */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <FotoInput
                  label="Foto Barang"
                  value={fotoBarang}
                  onChange={setFotoBarang}
                  onRemove={() => setFotoBarang(null)}
                />
                <FotoInput
                  label="Foto Nota / Invoice"
                  value={fotoNota}
                  onChange={setFotoNota}
                  onRemove={() => setFotoNota(null)}
                />
              </div>
            </div>
          ) : (
            /* Input Khusus Pemasukan */
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Jumlah Pemasukan *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-gray-400">Rp</span>
                <input
                  type="text"
                  placeholder="0"
                  value={jumlah ? new Intl.NumberFormat('id-ID').format(jumlah) : ''}
                  onChange={(e) => setJumlah(parseRupiah(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs font-bold text-emerald-700"
                />
              </div>
              {errors.jumlah && (
                <p className="text-[11px] text-rose-600 mt-0.5">{errors.jumlah}</p>
              )}
            </div>
          )}

          {/* Catatan Tambahan */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Catatan (Opsional)
            </label>
            <textarea
              rows="2"
              placeholder="Catatan tambahan..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs resize-none"
            />
          </div>

          {/* Tombol Simpan */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Transaksi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
