/**
 * pages/EditTransaksi.jsx — Halaman Edit Transaksi Menggunakan Komponen BarisPencatatan
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transaksiRepo } from '../db/transaksiRepo.js';
import { validasiBaris } from '../lib/validasiBaris.js';
import { kickSync } from '../sync/engine.js';
import BarisPencatatan from '../components/pencatatan/BarisPencatatan.jsx';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function EditTransaksi() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newPhotos, setNewPhotos] = useState({ barang: null, nota: null });

  useEffect(() => {
    async function loadItem() {
      try {
        const item = await transaksiRepo.getById(id);
        if (item && !item.deleted) {
          setRow({
            rowId: 'edit-' + item.id,
            id: item.id,
            type: item.type,
            bkuId: item.bkuId || null,
            tanggal: item.tanggal,
            nama: item.nama,
            qty: item.qty !== null ? item.qty : '',
            satuan: item.satuan || 'pcs',
            harga: item.harga !== null ? item.harga : '',
            jumlah: item.jumlah,
            catatan: item.catatan || '',
            fotoBarang: item._pendingFotoBarang || item.fotoBarangUrl || null,
            fotoNota: item._pendingFotoNota || item.fotoNotaUrl || null,
            touched: true,
            errors: {}
          });
        }
      } catch (err) {
        console.error('Gagal memuat item edit:', err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  const handleUpdateField = (_, field, value) => {
    setRow((prev) => {
      const updated = { ...prev, [field]: value };
      if (updated.type === 'keluar') {
        const qty = Number(field === 'qty' ? value : updated.qty) || 0;
        const harga = Number(field === 'harga' ? value : updated.harga) || 0;
        updated.jumlah = Math.round(qty * harga);
      } else if (field === 'jumlah') {
        updated.jumlah = Number(value) || 0;
      }
      if (field === 'fotoBarang' && value instanceof Blob) {
        setNewPhotos((p) => ({ ...p, barang: value }));
      }
      if (field === 'fotoNota' && value instanceof Blob) {
        setNewPhotos((p) => ({ ...p, nota: value }));
      }
      return updated;
    });
  };

  const handleSetType = (_, type) => {
    setRow((prev) => ({ ...prev, type }));
  };

  const handleSave = async () => {
    if (!row || isSaving) return;

    const val = validasiBaris(row);
    if (!val.ok) {
      setRow((prev) => ({ ...prev, errors: val.errors }));
      alert('Periksa input yang bertanda merah.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        type: row.type,
        bkuId: row.bkuId || null,
        tanggal: row.tanggal,
        nama: (row.nama || '').trim(),
        qty: row.type === 'keluar' ? Number(row.qty) : null,
        satuan: row.type === 'keluar' ? row.satuan : null,
        harga: row.type === 'keluar' ? Number(row.harga) : null,
        jumlah: row.jumlah,
        catatan: (row.catatan || '').trim(),
        fotoBarangUrl: typeof row.fotoBarang === 'string' ? row.fotoBarang : (row.fotoBarang ? '' : ''),
        fotoNotaUrl: typeof row.fotoNota === 'string' ? row.fotoNota : (row.fotoNota ? '' : '')
      };

      await transaksiRepo.update(id, updates, newPhotos);
      kickSync();
      navigate(`/riwayat/${id}`, { replace: true });
    } catch (err) {
      alert('Gagal memperbarui transaksi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-sm text-gray-400">
        Memuat form edit...
      </div>
    );
  }

  if (!row) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-600">
        Transaksi tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Batal</span>
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Edit Transaksi</h1>
        <BarisPencatatan
          index={0}
          row={row}
          canDelete={false}
          onUpdateField={handleUpdateField}
          onSetType={handleSetType}
          onDuplicate={() => {}}
          onRemove={() => {}}
          isLastRow={true}
        />
      </div>
    </div>
  );
}
