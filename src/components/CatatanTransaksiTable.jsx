/**
 * CatatanTransaksiTable.jsx — Tampilan Catatan Transaksi ala Spreadsheet Excel
 * 
 * Mereplikasi tampilan dari gambar 1:
 * - Judul tengah: "CATATAN TRANSAKSI"
 * - Tabel Kiri: "PEMASUKAN" (Kolom: TANGGAL, PENCATATAN)
 * - Tabel Kanan: "PENGELUARAN" (Kolom: TANGGAL, URAIAN, PEMASUKAN, PENGELUARAN, SALDO, FOTO BARANG, NOTA / INVOICE)
 * - Warna Header: Biru Pastel (#BDD7EE)
 * - Warna Baris: Peach Pastel (#FCE4D6) dengan garis tabel tegas
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatTanggalSlash, formatRupiah } from '../lib/format.js';
import { Camera, FileText, Eye, X, Edit2, Trash2 } from 'lucide-react';

export default function CatatanTransaksiTable({
  items = [],
  onDelete,
  readOnly = false
}) {
  const [modalPhoto, setModalPhoto] = useState(null); // { url, title }

  // 1. Saring transaksi aktif
  const activeItems = useMemo(() => {
    return items.filter((i) => !i.deleted);
  }, [items]);

  // 2. Transaksi urut kronologis (tanggal terlama ke terbaru) untuk menghitung running balance saldo
  const chronologicalItems = useMemo(() => {
    return [...activeItems].sort((a, b) => {
      if (a.tanggal !== b.tanggal) {
        return a.tanggal.localeCompare(b.tanggal);
      }
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }, [activeItems]);

  // 3. Hitung running balance per baris
  const itemsWithRunningBalance = useMemo(() => {
    let currentBalance = 0;
    return chronologicalItems.map((item) => {
      const jml = Number(item.jumlah) || 0;
      if (item.type === 'masuk') {
        currentBalance += jml;
      } else if (item.type === 'keluar') {
        currentBalance -= jml;
      }
      return {
        ...item,
        runningBalance: currentBalance
      };
    });
  }, [chronologicalItems]);

  // 4. Daftar khusus Pemasukan untuk tabel kiri (PEMASUKAN)
  const pemasukanList = useMemo(() => {
    return chronologicalItems.filter((i) => i.type === 'masuk');
  }, [chronologicalItems]);

  // Minimum baris agar tabel selalu tampak penuh seperti sheet di gambar (minimal 8 baris)
  const minRows = Math.max(8, itemsWithRunningBalance.length, pemasukanList.length);
  const emptyRowsPemasukanCount = Math.max(0, minRows - pemasukanList.length);
  const emptyRowsLedgerCount = Math.max(0, minRows - itemsWithRunningBalance.length);

  return (
    <div className="w-full bg-white p-4 sm:p-6 rounded-2xl border border-gray-300 shadow-xs space-y-4 select-none">
      {/* JUDUL TENGAH UTAMA */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-wider uppercase font-sans">
          CATATAN TRANSAKSI
        </h2>
      </div>

      {/* KONTAINER DUA TABEL BERDAMPINGAN (DENGAN HORIZONTAL SCROLL JIKA LAYAR SEMPIT) */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex items-start gap-4 min-w-[960px] w-full">
          {/* ========================================================
              TABEL KIRI: PEMASUKAN (TANGGAL | PENCATATAN)
             ======================================================== */}
          <div className="w-1/3 min-w-[280px] max-w-[340px]">
            <table className="w-full border-collapse border border-gray-400 text-xs text-gray-900">
              <thead>
                {/* Header Utama: PEMASUKAN */}
                <tr>
                  <th
                    colSpan="2"
                    className="bg-[#BDD7EE] border border-gray-400 py-1.5 px-3 text-center font-bold text-gray-900 tracking-wider text-xs uppercase"
                  >
                    PEMASUKAN
                  </th>
                </tr>
                {/* Sub-header: TANGGAL | PENCATATAN */}
                <tr className="bg-[#BDD7EE] border border-gray-400 font-bold">
                  <th className="border border-gray-400 py-1.5 px-2 text-center w-28 uppercase">
                    TANGGAL
                  </th>
                  <th className="border border-gray-400 py-1.5 px-3 text-left uppercase">
                    PENCATATAN
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Data Pemasukan */}
                {pemasukanList.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="bg-[#FCE4D6] hover:bg-[#F8CBAD] transition-colors border border-gray-400"
                  >
                    <td className="border border-gray-400 py-2 px-2 text-center font-medium">
                      {formatTanggalSlash(item.tanggal)}
                    </td>
                    <td className="border border-gray-400 py-2 px-3 font-semibold uppercase truncate max-w-[200px]" title={item.nama}>
                      {idx + 1}. {item.nama}
                    </td>
                  </tr>
                ))}

                {/* Baris Kosong Pelengkap (agar mirip spreadsheet di gambar) */}
                {Array.from({ length: emptyRowsPemasukanCount }).map((_, idx) => (
                  <tr key={`empty-pem-${idx}`} className="bg-[#FCE4D6] border border-gray-400">
                    <td className="border border-gray-400 py-2 px-2 text-center text-transparent">
                      -
                    </td>
                    <td className="border border-gray-400 py-2 px-3 text-transparent">
                      -
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ========================================================
              TABEL KANAN: PENGELUARAN / BUKU KAS TRANSAKSI
              (TANGGAL | URAIAN | PEMASUKAN | PENGELUARAN | SALDO | FOTO BARANG | NOTA / INVOICE)
             ======================================================== */}
          <div className="flex-1 min-w-[660px]">
            <table className="w-full border-collapse border border-gray-400 text-xs text-gray-900">
              <thead>
                {/* Header Utama: PENGELUARAN */}
                <tr>
                  <th
                    colSpan="7"
                    className="bg-[#BDD7EE] border border-gray-400 py-1.5 px-3 text-center font-bold text-gray-900 tracking-wider text-xs uppercase"
                  >
                    PENGELUARAN
                  </th>
                </tr>
                {/* Sub-header 7 Kolom */}
                <tr className="bg-[#BDD7EE] border border-gray-400 font-bold text-center">
                  <th className="border border-gray-400 py-1.5 px-2 w-28 uppercase">
                    TANGGAL
                  </th>
                  <th className="border border-gray-400 py-1.5 px-3 text-left uppercase">
                    URAIAN
                  </th>
                  <th className="border border-gray-400 py-1.5 px-2 text-right w-24 uppercase">
                    PEMASUKAN
                  </th>
                  <th className="border border-gray-400 py-1.5 px-2 text-right w-24 uppercase">
                    PENGELUARAN
                  </th>
                  <th className="border border-gray-400 py-1.5 px-2 text-right w-28 uppercase">
                    SALDO
                  </th>
                  <th className="border border-gray-400 py-1.5 px-2 text-center w-28 uppercase">
                    FOTO BARANG
                  </th>
                  <th className="border border-gray-400 py-1.5 px-2 text-center w-32 uppercase">
                    NOTA / INVOICE
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Baris Transaksi Kronologis */}
                {itemsWithRunningBalance.map((item) => {
                  const isMasuk = item.type === 'masuk';
                  const fotoBarangUrl =
                    item._pendingFotoBarang instanceof Blob
                      ? URL.createObjectURL(item._pendingFotoBarang)
                      : item.fotoBarangUrl;
                  const fotoNotaUrl =
                    item._pendingFotoNota instanceof Blob
                      ? URL.createObjectURL(item._pendingFotoNota)
                      : item.fotoNotaUrl;

                  return (
                    <tr
                      key={item.id}
                      className="bg-[#FCE4D6] hover:bg-[#F8CBAD] transition-colors border border-gray-400 group"
                    >
                      {/* Tanggal */}
                      <td className="border border-gray-400 py-2 px-2 text-center font-medium">
                        {formatTanggalSlash(item.tanggal)}
                      </td>

                      {/* Uraian */}
                      <td className="border border-gray-400 py-2 px-3 font-semibold uppercase">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to={`/riwayat/${item.id}`}
                            className="hover:underline truncate max-w-[240px]"
                            title={item.nama}
                          >
                            {item.nama}
                            {!isMasuk && item.qty && (
                              <span className="text-[10px] text-gray-600 font-normal ml-1 lowercase">
                                ({item.qty} {item.satuan || 'pcs'})
                              </span>
                            )}
                          </Link>

                          {/* Tombol aksi cepat di hover */}
                          {!readOnly && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              <Link
                                to={`/riwayat/${item.id}/edit`}
                                className="p-1 hover:text-teal-700"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Link>
                              {onDelete && (
                                <button
                                  type="button"
                                  onClick={() => onDelete(item.id, item.nama)}
                                  className="p-1 hover:text-rose-700"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Pemasukan */}
                      <td className="border border-gray-400 py-2 px-2 text-right font-medium text-emerald-800">
                        {isMasuk ? formatRupiah(item.jumlah, false) : ''}
                      </td>

                      {/* Pengeluaran */}
                      <td className="border border-gray-400 py-2 px-2 text-right font-medium text-rose-800">
                        {!isMasuk ? formatRupiah(item.jumlah, false) : ''}
                      </td>

                      {/* Saldo Kumulatif */}
                      <td className="border border-gray-400 py-2 px-2 text-right font-bold text-gray-900">
                        {formatRupiah(item.runningBalance, false)}
                      </td>

                      {/* Foto Barang */}
                      <td className="border border-gray-400 py-1.5 px-2 text-center">
                        {fotoBarangUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setModalPhoto({
                                url: fotoBarangUrl,
                                title: `Foto Barang: ${item.nama}`
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white/80 hover:bg-white rounded border border-gray-300 text-[10px] font-semibold text-gray-700 shadow-2xs"
                          >
                            <Camera className="w-3 h-3 text-teal-600" />
                            <span>Lihat</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Nota / Invoice */}
                      <td className="border border-gray-400 py-1.5 px-2 text-center">
                        {fotoNotaUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setModalPhoto({
                                url: fotoNotaUrl,
                                title: `Nota / Invoice: ${item.nama}`
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white/80 hover:bg-white rounded border border-gray-300 text-[10px] font-semibold text-gray-700 shadow-2xs"
                          >
                            <FileText className="w-3 h-3 text-teal-600" />
                            <span>Lihat</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Baris Kosong Pelengkap */}
                {Array.from({ length: emptyRowsLedgerCount }).map((_, idx) => (
                  <tr key={`empty-led-${idx}`} className="bg-[#FCE4D6] border border-gray-400">
                    <td className="border border-gray-400 py-2 px-2 text-center text-transparent">
                      -
                    </td>
                    <td className="border border-gray-400 py-2 px-3 text-transparent">-</td>
                    <td className="border border-gray-400 py-2 px-2 text-transparent">-</td>
                    <td className="border border-gray-400 py-2 px-2 text-transparent">-</td>
                    <td className="border border-gray-400 py-2 px-2 text-transparent">-</td>
                    <td className="border border-gray-400 py-2 px-2 text-center text-transparent">-</td>
                    <td className="border border-gray-400 py-2 px-2 text-center text-transparent">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL PRATINJAU FOTO UKURAN PENUH */}
      {modalPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setModalPhoto(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <p className="text-xs font-bold text-gray-900 truncate">{modalPhoto.title}</p>
              <button
                type="button"
                onClick={() => setModalPhoto(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-gray-900 rounded-b-xl">
              <img
                src={modalPhoto.url}
                alt={modalPhoto.title}
                className="max-h-[75vh] w-auto object-contain mx-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
