/**
 * layout/AppLayout.jsx — Kerangka tata letak aplikasi (Tampilan Full Desktop)
 */

import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTransaksi } from '../../hooks/useTransaksi.js';
import { transaksiRepo } from '../../db/transaksiRepo.js';
import { kickSync } from '../../sync/engine.js';
import ExcelSheetView from '../ExcelSheetView.jsx';
import ModalTambahTransaksi from '../ModalTambahTransaksi.jsx';
import StatusSync from '../StatusSync.jsx';

export default function AppLayout() {
  const { items } = useTransaksi();
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    initialType: 'keluar',
    bkuId: null
  });
  const location = useLocation();

  const bkuList = items.filter((i) => !i.deleted && i.type === 'masuk');

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Hapus transaksi "${nama}"?`)) return;
    try {
      await transaksiRepo.softDelete(id);
      kickSync();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleOpenAddModal = (type = 'keluar', bkuId = null) => {
    setModalConfig({
      isOpen: true,
      initialType: type,
      bkuId
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/60 text-gray-900 flex flex-col w-full">
      {/* Bar Status Minimal di Atas */}
      <header className="px-4 lg:px-8 py-2 border-b border-gray-200/80 bg-white flex items-center justify-between w-full">
        <span className="text-xs font-semibold text-gray-500">
          Aplikasi Catatan Keuangan
        </span>
        <div className="flex items-center gap-2">
          <StatusSync />
        </div>
      </header>

      {/* Kontainer Utama Full Width pada Desktop */}
      <div className="p-3 sm:p-4 lg:p-6 w-full space-y-6">
        {/* Lembar Excel Tiga Tabel Berdampingan Full Width */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-300 shadow-sm w-full">
          <ExcelSheetView
            items={items}
            onOpenAddModal={handleOpenAddModal}
            onDelete={handleDelete}
          />
        </div>

        {/* Konten Halaman Aktif di Bawah Lembar Spreadsheet */}
        <main className="w-full">
          <Outlet context={{ openAddModal: handleOpenAddModal }} />
        </main>
      </div>

      {/* Modal Tambah Transaksi */}
      <ModalTambahTransaksi
        isOpen={modalConfig.isOpen}
        initialType={modalConfig.initialType}
        bkuList={bkuList}
        defaultBkuId={modalConfig.bkuId}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
