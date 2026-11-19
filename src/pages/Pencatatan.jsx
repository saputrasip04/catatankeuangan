/**
 * pages/Pencatatan.jsx — Halaman Isian Pengeluaran & Pemasukan Lengkap
 */

import React, { useState, useEffect } from 'react';
import { transaksiRepo } from '../db/transaksiRepo.js';
import { useTransaksi } from '../hooks/useTransaksi.js';
import { kickSync } from '../sync/engine.js';
import { validasiBaris, SATUAN_OPTIONS } from '../lib/validasiBaris.js';
import { getTodayDateString, parseRupiah } from '../lib/format.js';
import FotoInput from '../components/FotoInput.jsx';
import { ArrowDownLeft, ArrowUpRight, Save, CheckCircle2, Loader2 } from 'lucide-react';

export default function Pencatatan() {
  const { items } = useTransaksi();
  const bkuList = items.filter((i) => !i.deleted && i.type === 'masuk');

  const [type, setType] = useState('keluar');
  const [bkuId, setBkuId] = useState('');
  const [tanggal, setTanggal] = useState(getTodayDateString());
  const [nama, setNama] = useState('');
  const [qty, setQty] = useState('1');
  const [satuan, setSatuan] = useState('pcs');
  const [harga, setHarga] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [catatan, setCatatan] = useState('');
  const [fotoBarang, setFotoBarang] = useState(null);
  const [fotoNota, setFotoNota] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (!bkuId && bkuList.length > 0) {
      setBkuId(bkuList[0].id);
    }
  }, [bkuList, bkuId]);

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

      // Reset
      setNama('');
      setHarga('');
      setJumlah('');
      setCatatan('');
      setFotoBarang(null);
      setFotoNota(null);
      setErrors({});
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3500);
    } catch (err) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Notifikasi Berhasil */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Transaksi berhasil disimpan dan otomatis masuk ke tabel di atas!</span>
        </div>
      )}

      {/* Header Form */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Form Isian Transaksi ({type === 'keluar' ? 'Pengeluaran' : 'Pemasukan'})
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Isi detail pengeluaran mulai dari tanggal, uraian, nominal, hingga foto nota.
          </p>
        </div>

        {/* Toggle Pemasukan / Pengeluaran */}
        <div className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setType('keluar')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all ${
              type === 'keluar'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Pengeluaran</span>
          </button>
          <button
            type="button"
            onClick={() => setType('masuk')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all ${
              type === 'masuk'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Pemasukan</span>
          </button>
        </div>
      </div>

      {/* Form Input Isian */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Pilihan BKU jika Pengeluaran */}
        {type === 'keluar' && bkuList.length > 0 && (
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Buku Kas (BKU) / Kegiatan Terkait *
            </label>
            <select
              value={bkuId}
              onChange={(e) => setBkuId(e.target.value)}
              className="w-full text-xs font-semibold rounded-lg border border-amber-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {bkuList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Pengeluaran ini akan langsung dikurangkan dari saldo buku kas kegiatan yang dipilih.
            </p>
          </div>
        )}

        {/* Baris 1: Tanggal & Uraian */}
        <div className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Tanggal Transaksi *
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
            />
            {errors.tanggal && (
              <p className="text-[11px] text-rose-600 mt-0.5">{errors.tanggal}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {type === 'keluar' ? 'Uraian Pengeluaran *' : 'Sumber Pemasukan (Pencatatan) *'}
            </label>
            <input
              type="text"
              placeholder={type === 'keluar' ? 'Contoh: Kertas Foto, Bensin, Tinta Printer...' : 'Contoh: Foto Raport, Foto Ijazah...'}
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
            />
            {errors.nama && (
              <p className="text-[11px] text-rose-600 mt-0.5">{errors.nama}</p>
            )}
          </div>
        </div>

        {/* Baris 2: Khusus Pengeluaran (Qty, Satuan, Harga, Total) */}
        {type === 'keluar' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-[6rem_7.5rem_1fr_1fr] gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Qty *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
                {errors.qty && (
                  <p className="text-[11px] text-rose-600 mt-0.5">{errors.qty}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Satuan</label>
                <select
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-300 px-2.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                >
                  {SATUAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Harga Satuan *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={harga ? new Intl.NumberFormat('id-ID').format(harga) : ''}
                    onChange={(e) => setHarga(parseRupiah(e.target.value))}
                    className="w-full text-xs rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium text-right"
                  />
                </div>
                {errors.harga && (
                  <p className="text-[11px] text-rose-600 mt-0.5">{errors.harga}</p>
                )}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Total Pengeluaran (Qty × Harga)
                </label>
                <div className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-rose-600 text-right">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(hitungJumlahKeluar())}
                </div>
              </div>
            </div>

            {/* Lampiran Foto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
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
          /* Khusus Pemasukan */
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Jumlah Pemasukan *
            </label>
            <div className="relative max-w-sm">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400">Rp</span>
              <input
                type="text"
                placeholder="0"
                value={jumlah ? new Intl.NumberFormat('id-ID').format(jumlah) : ''}
                onChange={(e) => setJumlah(parseRupiah(e.target.value))}
                className="w-full text-xs rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-bold text-emerald-700 text-right"
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
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            placeholder="Catatan tambahan bila ada..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className="w-full text-xs rounded-xl border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        {/* Tombol Simpan */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan {type === 'keluar' ? 'Pengeluaran' : 'Pemasukan'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
