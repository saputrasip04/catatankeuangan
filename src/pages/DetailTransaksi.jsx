/**
 * pages/DetailTransaksi.jsx — Halaman detail transaksi, tampilan foto penuh, edit, dan soft-delete
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { transaksiRepo } from '../db/transaksiRepo.js';
import { kickSync } from '../sync/engine.js';
import { formatRupiah, formatTanggal } from '../lib/format.js';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  Image as ImageIcon,
  ArrowDownLeft,
  ArrowUpRight,
  X
} from 'lucide-react';

export default function DetailTransaksi() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalPhotoUrl, setModalPhotoUrl] = useState('');
  const [localFotoBarangUrl, setLocalFotoBarangUrl] = useState('');
  const [localFotoNotaUrl, setLocalFotoNotaUrl] = useState('');

  useEffect(() => {
    async function loadItem() {
      try {
        const data = await transaksiRepo.getById(id);
        if (data && !data.deleted) {
          setItem(data);
          // Tangani URL blob pratinjau lokal jika ada
          if (data._pendingFotoBarang instanceof Blob) {
            setLocalFotoBarangUrl(URL.createObjectURL(data._pendingFotoBarang));
          }
          if (data._pendingFotoNota instanceof Blob) {
            setLocalFotoNotaUrl(URL.createObjectURL(data._pendingFotoNota));
          }
        } else {
          setItem(null);
        }
      } catch (err) {
        console.error('Gagal memuat detail transaksi:', err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();

    return () => {
      if (localFotoBarangUrl) URL.revokeObjectURL(localFotoBarangUrl);
      if (localFotoNotaUrl) URL.revokeObjectURL(localFotoNotaUrl);
    };
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus transaksi "${item?.nama}"?`)) {
      return;
    }

    try {
      await transaksiRepo.softDelete(id);
      kickSync();
      navigate('/riwayat', { replace: true });
    } catch (err) {
      alert('Gagal menghapus transaksi: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-sm text-gray-400">
        Memuat detail transaksi...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-gray-600 font-medium">Transaksi tidak ditemukan atau telah dihapus.</p>
        <Link
          to="/riwayat"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat</span>
        </Link>
      </div>
    );
  }

  const isMasuk = item.type === 'masuk';
  const displayFotoBarang = localFotoBarangUrl || item.fotoBarangUrl;
  const displayFotoNota = localFotoNotaUrl || item.fotoNotaUrl;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Tombol Kembali & Aksi Edit/Hapus */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            to={`/riwayat/${item.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Kartu Utama Transaksi */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
        {/* Header Transaksi */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                isMasuk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isMasuk ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
              {isMasuk ? 'Pemasukan' : 'Pengeluaran'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              {item.nama}
            </h1>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">Total Jumlah</p>
            <p
              className={`text-2xl font-extrabold ${
                isMasuk ? 'text-emerald-600' : 'text-gray-900'
              }`}
            >
              {formatRupiah(item.jumlah)}
            </p>
          </div>
        </div>

        {/* Informasi Rinci */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-gray-500 font-medium">Tanggal</p>
            <p className="text-gray-900 font-semibold mt-0.5">{formatTanggal(item.tanggal)}</p>
          </div>

          {!isMasuk && (
            <>
              <div>
                <p className="text-gray-500 font-medium">Qty / Kuantitas</p>
                <p className="text-gray-900 font-semibold mt-0.5">
                  {item.qty} {item.satuan || 'pcs'}
                </p>
              </div>

              <div>
                <p className="text-gray-500 font-medium">Harga Satuan</p>
                <p className="text-gray-900 font-semibold mt-0.5">{formatRupiah(item.harga)}</p>
              </div>
            </>
          )}

          {item.catatan && (
            <div className="col-span-2 pt-2 border-t border-gray-100">
              <p className="text-gray-500 font-medium">Catatan</p>
              <p className="text-gray-900 mt-1 whitespace-pre-wrap">{item.catatan}</p>
            </div>
          )}
        </div>

        {/* Lampiran Foto */}
        {(displayFotoBarang || displayFotoNota) && (
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-teal-600" />
              <span>Foto Bukti (Tekan untuk memperbesar)</span>
            </p>

            <div className="flex flex-wrap gap-4">
              {displayFotoBarang && (
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-500">Foto Barang</p>
                  <button
                    type="button"
                    onClick={() => setModalPhotoUrl(displayFotoBarang)}
                    className="w-32 h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={displayFotoBarang}
                      alt="Foto Barang"
                      className="w-full h-full object-cover"
                    />
                  </button>
                </div>
              )}

              {displayFotoNota && (
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-500">Foto Nota</p>
                  <button
                    type="button"
                    onClick={() => setModalPhotoUrl(displayFotoNota)}
                    className="w-32 h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={displayFotoNota}
                      alt="Foto Nota"
                      className="w-full h-full object-cover"
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Foto Ukuran Penuh */}
      {modalPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalPhotoUrl('')}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-black rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setModalPhotoUrl('')}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={modalPhotoUrl}
              alt="Foto Penuh"
              className="max-h-[85vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
