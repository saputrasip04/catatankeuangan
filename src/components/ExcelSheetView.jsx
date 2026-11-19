/**
 * ExcelSheetView.jsx — Tampilan Catatan Transaksi ala Spreadsheet Excel Sesuai Gambar
 * 
 * Dilengkapi baris isian langsung (inline input) untuk Pengeluaran:
 * - Dimulai dari Tanggal, Uraian, Pengeluaran, Saldo (auto), Foto Barang, Nota/Invoice.
 */

import React, { useState, useMemo, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { formatTanggalSlash, formatRupiah, getTodayDateString, parseRupiah } from '../lib/format.js';
import { transaksiRepo } from '../db/transaksiRepo.js';
import { kickSync } from '../sync/engine.js';
import { compressImage } from '../lib/compressImage.js';
import { Camera, FileText, X, Plus, Edit2, Trash2, Check, Upload, Image as ImageIcon } from 'lucide-react';

export default function ExcelSheetView({
  items = [],
  onOpenAddModal,
  onDelete
}) {
  const [modalPhoto, setModalPhoto] = useState(null); // { url, title }

  // State BKU yang sedang dipilih
  const [selectedBkuId, setSelectedBkuId] = useState(null);

  // Modal cepat tambah BKU (Pemasukan) langsung dari tombol '+' di tabel PEMASUKAN
  const [isAddingBku, setIsAddingBku] = useState(false);
  const [bkuInput, setBkuInput] = useState({
    tanggal: getTodayDateString(),
    nama: '',
    jumlah: ''
  });
  const [isSubmittingBku, setIsSubmittingBku] = useState(false);

  // State untuk baris isian langsung Pengeluaran
  const [pengeluaranInput, setPengeluaranInput] = useState({
    tanggal: getTodayDateString(),
    nama: '',
    harga: '',
    fotoBarang: null,
    fotoNota: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref untuk input file
  const fotoBarangInputRef = useRef(null);
  const fotoNotaInputRef = useRef(null);

  // 1. Saring transaksi aktif (deleted = false)
  const activeItems = useMemo(() => {
    return items.filter((i) => !i.deleted);
  }, [items]);

  // 2. Daftar transaksi pemasukan untuk tabel kiri (diurutkan kronologis)
  const pemasukanList = useMemo(() => {
    return activeItems
      .filter((i) => i.type === 'masuk')
      .sort((a, b) => {
        if (a.tanggal !== b.tanggal) {
          return a.tanggal.localeCompare(b.tanggal);
        }
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
  }, [activeItems]);

  // 3. Tentukan BKU aktif
  const activeBku = useMemo(() => {
    if (pemasukanList.length === 0) return null;
    const found = pemasukanList.find((b) => b.id === selectedBkuId);
    return found || pemasukanList[0];
  }, [pemasukanList, selectedBkuId]);

  // 4. Baris ledger khusus untuk BKU yang aktif:
  // Baris 1: Pemasukan BKU itu sendiri (saldo awal)
  // Baris 2..N: Pengeluaran yang terkait dengan BKU ini
  const bkuLedgerItems = useMemo(() => {
    if (!activeBku) return [];

    // Ambil pengeluaran yang terhubung ke activeBku
    const matchingExpenses = activeItems
      .filter((item) => {
        if (item.type !== 'keluar') return false;
        if (item.bkuId) {
          return item.bkuId === activeBku.id;
        }
        // Fallback untuk pengeluaran sebelum fitur BKU: tampilkan di BKU pertama
        return activeBku.id === pemasukanList[0]?.id;
      })
      .sort((a, b) => {
        if (a.tanggal !== b.tanggal) {
          return a.tanggal.localeCompare(b.tanggal);
        }
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

    // Baris awal: Pemasukan dari BKU
    const initialRow = {
      ...activeBku,
      isBkuHeader: true,
      pemasukanAmount: activeBku.jumlah,
      pengeluaranAmount: null,
      runningBalance: Number(activeBku.jumlah) || 0
    };

    let currentBalance = Number(activeBku.jumlah) || 0;
    const expenseRows = matchingExpenses.map((exp) => {
      const jml = Number(exp.jumlah) || 0;
      currentBalance -= jml;
      return {
        ...exp,
        isBkuHeader: false,
        pemasukanAmount: null,
        pengeluaranAmount: jml,
        runningBalance: currentBalance
      };
    });

    return [initialRow, ...expenseRows];
  }, [activeBku, activeItems, pemasukanList]);

  // Saldo terkini BKU yang aktif
  const currentBkuBalance = useMemo(() => {
    if (!activeBku) return 0;
    if (bkuLedgerItems.length > 0) {
      return bkuLedgerItems[bkuLedgerItems.length - 1].runningBalance;
    }
    return Number(activeBku.jumlah) || 0;
  }, [activeBku, bkuLedgerItems]);

  // Estimasi saldo untuk baris isian baru di bawah BKU ini
  const previewNominalKeluar = Number(pengeluaranInput.harga) || 0;
  const estimatedSaldoAfterInput = currentBkuBalance - previewNominalKeluar;

  // Minimum baris agar tabel selalu tampak seperti spreadsheet penuh di gambar (minimal 8 baris)
  const minRows = Math.max(8, bkuLedgerItems.length + 1, pemasukanList.length + 1);
  const emptyRowsPemasukanCount = Math.max(0, minRows - pemasukanList.length - 1);
  const emptyRowsLedgerCount = Math.max(0, minRows - (bkuLedgerItems.length + 1));

  // Handler file foto barang
  const handleFotoBarangChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1280, 0.7);
      setPengeluaranInput((prev) => ({ ...prev, fotoBarang: compressed }));
    } catch (_) {
      setPengeluaranInput((prev) => ({ ...prev, fotoBarang: file }));
    }
  };

  // Handler file foto nota
  const handleFotoNotaChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1280, 0.7);
      setPengeluaranInput((prev) => ({ ...prev, fotoNota: compressed }));
    } catch (_) {
      setPengeluaranInput((prev) => ({ ...prev, fotoNota: file }));
    }
  };

  // Simpan BKU baru langsung
  const handleSaveNewBku = async (e) => {
    if (e) e.preventDefault();
    if (!bkuInput.nama.trim()) {
      alert('Harap masukkan nama pencatatan / judul kegiatan BKU.');
      return;
    }
    const jml = Number(bkuInput.jumlah) || 0;
    if (jml <= 0) {
      alert('Harap masukkan nominal pemasukan yang valid.');
      return;
    }

    setIsSubmittingBku(true);
    try {
      const newItems = await transaksiRepo.addMany([
        {
          type: 'masuk',
          tanggal: bkuInput.tanggal,
          nama: bkuInput.nama.trim(),
          jumlah: jml,
          catatan: ''
        }
      ]);
      kickSync();

      if (newItems && newItems[0]) {
        setSelectedBkuId(newItems[0].id);
      }
      setBkuInput({
        tanggal: getTodayDateString(),
        nama: '',
        jumlah: ''
      });
      setIsAddingBku(false);
    } catch (err) {
      alert('Gagal menambah BKU: ' + err.message);
    } finally {
      setIsSubmittingBku(false);
    }
  };

  // Simpan isian pengeluaran langsung dari tabel (terikat dengan BKU aktif)
  const handleSaveInlinePengeluaran = async () => {
    if (!activeBku) {
      alert('Belum ada Buku Kas (BKU) Pemasukan. Silakan buat BKU terlebih dahulu dengan mengklik tanda "+" pada tabel PEMASUKAN.');
      return;
    }
    if (!pengeluaranInput.nama.trim()) {
      alert('Harap masukkan Uraian pengeluaran.');
      return;
    }
    const nominal = Number(pengeluaranInput.harga) || 0;
    if (nominal <= 0) {
      alert('Harap masukkan jumlah nominal Pengeluaran.');
      return;
    }

    setIsSubmitting(true);
    try {
      const item = {
        type: 'keluar',
        bkuId: activeBku.id, // Terikat dengan BKU yang dipilih
        tanggal: pengeluaranInput.tanggal,
        nama: pengeluaranInput.nama.trim(),
        qty: 1,
        satuan: 'pcs',
        harga: nominal,
        jumlah: nominal,
        catatan: '',
        fotoBarang: pengeluaranInput.fotoBarang,
        fotoNota: pengeluaranInput.fotoNota
      };

      await transaksiRepo.addMany([item]);
      kickSync();

      // Reset isian pengeluaran
      setPengeluaranInput({
        tanggal: getTodayDateString(),
        nama: '',
        harga: '',
        fotoBarang: null,
        fotoNota: null
      });
      if (fotoBarangInputRef.current) fotoBarangInputRef.current.value = '';
      if (fotoNotaInputRef.current) fotoNotaInputRef.current.value = '';
    } catch (err) {
      alert('Gagal menyimpan pengeluaran: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveInlinePengeluaran();
    }
  };

  return (
    <div className="w-full select-none space-y-4">
      {/* 1. JUDUL TENGAH UTAMA */}
      <div className="text-center py-2">
        <h1 className="text-xl sm:text-2xl font-black text-black tracking-wider uppercase font-sans">
          CATATAN TRANSAKSI
        </h1>
      </div>

      {/* 2. AREA TIGA TABEL BERDAMPINGAN FULL WIDTH */}
      <div className="overflow-x-auto pb-4 w-full">
        <div className="flex items-start gap-3 sm:gap-4 min-w-[1080px] w-full px-1">
          {/* ========================================================
              TABEL 1 (KIRI): PEMASUKAN
             ======================================================== */}
          <div className="w-[260px] lg:w-[280px] xl:w-[320px] flex-shrink-0">
            <table className="w-full border-collapse border border-black text-xs text-black">
              <thead>
                {/* Header Utama: PEMASUKAN */}
                <tr>
                  <th
                    colSpan="2"
                    className="bg-[#BDD7EE] border border-black py-1.5 px-2 text-center font-bold text-black text-xs uppercase"
                  >
                    PEMASUKAN
                  </th>
                </tr>
                {/* Sub-header: TANGGAL | PENCATATAN */}
                <tr className="bg-[#BDD7EE] border border-black font-bold">
                  <th className="border border-black py-1.5 px-2 text-center w-24 uppercase">
                    TANGGAL
                  </th>
                  <th className="border border-black py-1.5 px-2 text-left uppercase">
                    PENCATATAN
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Baris Data Pemasukan */}
                {pemasukanList.map((item, idx) => {
                  const isSelected = activeBku?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedBkuId(item.id)}
                      className={`border border-black cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-[#FCE4D6] font-bold text-black ring-1 ring-black/40'
                          : 'bg-white hover:bg-amber-50/70 text-black font-medium'
                      }`}
                      title={`Klik untuk membuka BKU: ${item.nama}`}
                    >
                      <td className="border border-black py-2 px-2 text-center font-medium">
                        {formatTanggalSlash(item.tanggal)}
                      </td>
                      <td
                        className="border border-black py-2 px-2 uppercase truncate max-w-[180px]"
                        title={item.nama}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">
                            {idx + 1}. {item.nama}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <Link
                              to={`/riwayat/${item.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-0.5 hover:text-teal-800"
                              title="Edit Pemasukan"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </Link>
                            {onDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(item.id, item.nama);
                                }}
                                className="p-0.5 hover:text-rose-800"
                                title="Hapus BKU"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Tombol '+' di bawah baris data pemasukan sesuai gambar */}
                <tr className="border border-black bg-white">
                  <td
                    colSpan="2"
                    onClick={() => setIsAddingBku(true)}
                    title="Tambah BKU / Pemasukan baru"
                    className="border border-black py-1.5 px-2 text-center font-bold text-base text-gray-700 hover:bg-[#BDD7EE]/40 cursor-pointer transition-colors"
                  >
                    +
                  </td>
                </tr>

                {/* Baris Kosong Pelengkap Grid */}
                {Array.from({ length: emptyRowsPemasukanCount }).map((_, idx) => (
                  <tr key={`empty-pem-${idx}`} className="border border-black bg-white">
                    <td className="border border-black py-2 px-2 text-center text-transparent">
                      -
                    </td>
                    <td className="border border-black py-2 px-2 text-transparent">
                      -
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ========================================================
              TABEL 2 (TENGAH / UTAMA): PENGELUARAN / BUKU KAS TRANSAKSI
             ======================================================== */}
          <div className="flex-1 min-w-[660px]">
            <table className="w-full border-collapse border border-black text-xs text-black">
              <thead>
                {/* Header Utama: PENGELUARAN */}
                <tr>
                  <th
                    colSpan="7"
                    className="bg-[#BDD7EE] border border-black py-1.5 px-2 text-center font-bold text-black text-xs uppercase"
                  >
                    PENGELUARAN {activeBku ? `— ${activeBku.nama}` : ''}
                  </th>
                </tr>
                {/* Sub-header 7 Kolom */}
                <tr className="bg-[#BDD7EE] border border-black font-bold text-center">
                  <th className="border border-black py-1.5 px-2 w-28 uppercase">
                    TANGGAL
                  </th>
                  <th className="border border-black py-1.5 px-2 text-left uppercase">
                    URAIAN
                  </th>
                  <th className="border border-black py-1.5 px-2 text-right w-24 sm:w-28 uppercase">
                    PEMASUKAN
                  </th>
                  <th className="border border-black py-1.5 px-2 text-right w-24 sm:w-28 uppercase">
                    PENGELUARAN
                  </th>
                  <th className="border border-black py-1.5 px-2 text-right w-28 sm:w-32 uppercase">
                    SALDO
                  </th>
                  <th className="border border-black py-1.5 px-2 text-center w-28 uppercase">
                    FOTO BARANG
                  </th>
                  <th className="border border-black py-1.5 px-2 text-center w-36 uppercase">
                    NOTA / INVOICE
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Baris Transaksi BKU yang Sedang Aktif */}
                {bkuLedgerItems.length === 0 ? (
                  <tr className="bg-[#FCE4D6] border border-black">
                    <td colSpan="7" className="border border-black py-4 px-2 text-center font-bold text-gray-500">
                      Belum ada Buku Kas (BKU). Silakan klik tanda &apos;+&apos; pada tabel PEMASUKAN di sebelah kiri.
                    </td>
                  </tr>
                ) : (
                  bkuLedgerItems.map((item) => {
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
                        className={`bg-[#FCE4D6] hover:bg-[#F8CBAD] transition-colors border border-black group ${
                          item.isBkuHeader ? 'font-semibold' : ''
                        }`}
                      >
                        {/* Tanggal */}
                        <td className="border border-black py-2 px-2 text-center font-medium">
                          {formatTanggalSlash(item.tanggal)}
                        </td>

                        {/* Uraian */}
                        <td className="border border-black py-2 px-2 font-semibold uppercase">
                          <div className="flex items-center justify-between gap-1">
                            <Link
                              to={`/riwayat/${item.id}`}
                              className="hover:underline truncate"
                              title={item.nama}
                            >
                              {item.nama}
                              {!isMasuk && item.qty && (
                                <span className="text-[10px] text-gray-700 font-normal ml-1 lowercase">
                                  ({item.qty} {item.satuan || 'pcs'})
                                </span>
                              )}
                            </Link>

                            {/* Aksi cepat */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              <Link
                                to={`/riwayat/${item.id}/edit`}
                                className="p-0.5 hover:text-teal-800"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Link>
                              {onDelete && !item.isBkuHeader && (
                                <button
                                  type="button"
                                  onClick={() => onDelete(item.id, item.nama)}
                                  className="p-0.5 hover:text-rose-800"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Pemasukan */}
                        <td className="border border-black py-2 px-2 text-right font-medium">
                          {isMasuk ? formatRupiah(item.jumlah, false) : ''}
                        </td>

                        {/* Pengeluaran */}
                        <td className="border border-black py-2 px-2 text-right font-medium">
                          {!isMasuk ? formatRupiah(item.jumlah, false) : ''}
                        </td>

                        {/* Saldo Kumulatif BKU */}
                        <td className="border border-black py-2 px-2 text-right font-bold">
                          {formatRupiah(item.runningBalance, false)}
                        </td>

                        {/* Foto Barang */}
                        <td className="border border-black py-1.5 px-2 text-center">
                          {fotoBarangUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setModalPhoto({
                                  url: fotoBarangUrl,
                                  title: `Foto Barang: ${item.nama}`
                                })
                              }
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white hover:bg-gray-100 rounded border border-gray-400 text-[10px] font-semibold text-gray-800 shadow-2xs"
                            >
                              <Camera className="w-3 h-3 text-teal-700" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Nota / Invoice */}
                        <td className="border border-black py-1.5 px-2 text-center">
                          {fotoNotaUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setModalPhoto({
                                  url: fotoNotaUrl,
                                  title: `Nota: ${item.nama}`
                                })
                              }
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white hover:bg-gray-100 rounded border border-gray-400 text-[10px] font-semibold text-gray-800 shadow-2xs"
                            >
                              <FileText className="w-3 h-3 text-teal-700" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* ========================================================
                    2. BARIS ISIAN PENGELUARAN (DIMULAI DARI TANGGAL DST)
                   ======================================================== */}
                <tr className="bg-amber-50/70 border-2 border-teal-600 shadow-inner">
                  {/* Kolom 1: Tanggal */}
                  <td className="border border-black p-1">
                    <input
                      type="date"
                      value={pengeluaranInput.tanggal}
                      onChange={(e) =>
                        setPengeluaranInput((prev) => ({ ...prev, tanggal: e.target.value }))
                      }
                      className="w-full text-xs font-semibold p-1 border border-gray-300 rounded bg-white text-center focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </td>

                  {/* Kolom 2: Uraian */}
                  <td className="border border-black p-1">
                    <input
                      type="text"
                      placeholder="Ketik uraian pengeluaran..."
                      value={pengeluaranInput.nama}
                      onKeyDown={handleKeyDown}
                      onChange={(e) =>
                        setPengeluaranInput((prev) => ({ ...prev, nama: e.target.value }))
                      }
                      className="w-full text-xs p-1 px-2 border border-gray-300 rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </td>

                  {/* Kolom 3: Pemasukan (Kosong untuk Pengeluaran) */}
                  <td className="border border-black p-1 text-center text-gray-400 bg-gray-50/50">
                    -
                  </td>

                  {/* Kolom 4: Pengeluaran (Nominal) */}
                  <td className="border border-black p-1">
                    <input
                      type="text"
                      placeholder="0"
                      value={pengeluaranInput.harga ? new Intl.NumberFormat('id-ID').format(pengeluaranInput.harga) : ''}
                      onKeyDown={handleKeyDown}
                      onChange={(e) =>
                        setPengeluaranInput((prev) => ({ ...prev, harga: parseRupiah(e.target.value) }))
                      }
                      className="w-full text-xs p-1 text-right font-bold text-rose-700 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </td>

                  {/* Kolom 5: Saldo (Auto Preview) */}
                  <td className="border border-black p-1 text-right font-bold text-gray-900 pr-2">
                    {formatRupiah(estimatedSaldoAfterInput, false)}
                  </td>

                  {/* Kolom 6: Foto Barang */}
                  <td className="border border-black p-1 text-center">
                    <input
                      ref={fotoBarangInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFotoBarangChange}
                      className="hidden"
                    />
                    {pengeluaranInput.fotoBarang ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        <Check className="w-3 h-3" />
                        <span>Foto Ada</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fotoBarangInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-gray-100 rounded border border-gray-300 text-[10px] font-semibold text-gray-700 transition-colors"
                      >
                        <Camera className="w-3 h-3 text-teal-600" />
                        <span>+ Foto</span>
                      </button>
                    )}
                  </td>

                  {/* Kolom 7: Nota / Invoice + Tombol Simpan */}
                  <td className="border border-black p-1 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        ref={fotoNotaInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFotoNotaChange}
                        className="hidden"
                      />
                      {pengeluaranInput.fotoNota ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          <Check className="w-3 h-3" />
                          <span>Nota Ada</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fotoNotaInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-gray-100 rounded border border-gray-300 text-[10px] font-semibold text-gray-700 transition-colors"
                        >
                          <FileText className="w-3 h-3 text-teal-600" />
                          <span>+ Nota</span>
                        </button>
                      )}

                      {/* Tombol Simpan Baris Isian */}
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSaveInlinePengeluaran}
                        title="Simpan pengeluaran ini"
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-[11px] rounded shadow-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Simpan</span>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* 3. Baris Kosong Pelengkap Berwarna Peach */}
                {Array.from({ length: emptyRowsLedgerCount }).map((_, idx) => (
                  <tr key={`empty-led-${idx}`} className="bg-[#FCE4D6] border border-black">
                    <td className="border border-black py-2 px-2 text-center text-transparent">-</td>
                    <td className="border border-black py-2 px-2 text-transparent">-</td>
                    <td className="border border-black py-2 px-2 text-transparent">-</td>
                    <td className="border border-black py-2 px-2 text-transparent">-</td>
                    <td className="border border-black py-2 px-2 text-transparent">-</td>
                    <td className="border border-black py-2 px-2 text-center text-transparent">-</td>
                    <td className="border border-black py-2 px-2 text-center text-transparent">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ========================================================
              TABEL 3 (KANAN): MENU (Sesuai Gambar 3)
             ======================================================== */}
          <div className="w-[140px] lg:w-[160px] flex-shrink-0">
            <table className="w-full border-collapse border border-black text-xs text-black">
              <thead>
                <tr>
                  <th className="border border-black py-1.5 px-2 text-center font-bold text-black text-xs uppercase bg-white">
                    MENU
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 1. BERANDA */}
                <tr className="border border-black">
                  <td className="p-0 border border-black">
                    <NavLink
                      to="/"
                      className={({ isActive }) =>
                        `block py-2 px-2 text-center uppercase font-bold transition-colors ${
                          isActive
                            ? 'bg-[#FCE4D6] text-black font-extrabold'
                            : 'bg-white hover:bg-gray-100 text-black'
                        }`
                      }
                    >
                      BERANDA
                    </NavLink>
                  </td>
                </tr>

                {/* 2. PENCATATAN */}
                <tr className="border border-black">
                  <td className="p-0 border border-black">
                    <NavLink
                      to="/catat"
                      className={({ isActive }) =>
                        `block py-2 px-2 text-center uppercase font-bold transition-colors ${
                          isActive
                            ? 'bg-[#FCE4D6] text-black font-extrabold'
                            : 'bg-white hover:bg-gray-100 text-black'
                        }`
                      }
                    >
                      PENCATATAN
                    </NavLink>
                  </td>
                </tr>

                {/* 3. RIWAYAT */}
                <tr className="border border-black">
                  <td className="p-0 border border-black">
                    <NavLink
                      to="/riwayat"
                      className={({ isActive }) =>
                        `block py-2 px-2 text-center uppercase font-bold transition-colors ${
                          isActive
                            ? 'bg-[#FCE4D6] text-black font-extrabold'
                            : 'bg-white hover:bg-gray-100 text-black'
                        }`
                      }
                    >
                      RIWAYAT
                    </NavLink>
                  </td>
                </tr>

                {/* 4. PENGATURAN */}
                <tr className="border border-black">
                  <td className="p-0 border border-black">
                    <NavLink
                      to="/pengaturan"
                      className={({ isActive }) =>
                        `block py-2 px-2 text-center uppercase font-bold transition-colors ${
                          isActive
                            ? 'bg-[#FCE4D6] text-black font-extrabold'
                            : 'bg-white hover:bg-gray-100 text-black'
                        }`
                      }
                    >
                      PENGATURAN
                    </NavLink>
                  </td>
                </tr>
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

      {/* MODAL TAMBAH BKU PEMASUKAN BARU */}
      {isAddingBku && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
          onClick={() => setIsAddingBku(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Tambah BKU Pemasukan Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingBku(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveNewBku} className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Tanggal Pemasukan *
                </label>
                <input
                  type="date"
                  required
                  value={bkuInput.tanggal}
                  onChange={(e) => setBkuInput((p) => ({ ...p, tanggal: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Nama Pencatatan / Judul BKU *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: FOTO IJAZAH, FOTO BOOTH..."
                  value={bkuInput.nama}
                  onChange={(e) => setBkuInput((p) => ({ ...p, nama: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Nominal Pemasukan (Rp) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 5.000.000"
                  value={bkuInput.jumlah ? new Intl.NumberFormat('id-ID').format(bkuInput.jumlah) : ''}
                  onChange={(e) => setBkuInput((p) => ({ ...p, jumlah: parseRupiah(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddingBku(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBku}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold disabled:opacity-50"
                >
                  {isSubmittingBku ? 'Menyimpan...' : 'Simpan BKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
