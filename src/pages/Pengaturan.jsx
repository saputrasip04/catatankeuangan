/**
 * pages/Pengaturan.jsx — Halaman Pengaturan Koneksi, Sinkronisasi, Ekspor CSV, dan Cache
 */

import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, generateSetupLink } from '../lib/settings.js';
import { apiTestConnection, apiUpsert } from '../sync/api.js';
import { kickSync } from '../sync/engine.js';
import { downloadCsv } from '../lib/csv.js';
import { clearAllLocalData } from '../db/index.js';
import { outboxRepo } from '../db/outboxRepo.js';
import { draftRepo } from '../db/draftRepo.js';
import { useTransaksi } from '../hooks/useTransaksi.js';
import {
  Settings,
  Link as LinkIcon,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  Share2,
  Database,
  UploadCloud
} from 'lucide-react';

export default function Pengaturan() {
  const { items } = useTransaksi();

  const [webAppUrl, setWebAppUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok: boolean, message: string }
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setWebAppUrl(s.webAppUrl || '');
    setSecret(s.secret || '');
  }, []);

  const handleGenerateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    let randomStr = '';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    for (let i = 0; i < 32; i++) {
      randomStr += chars[array[i] % chars.length];
    }
    setSecret(randomStr);
  };

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (_) {}
  };

  const handleCopyShareLink = async () => {
    const link = generateSetupLink();
    if (!link) {
      alert('Simpan URL dan Kunci Secret terlebih dahulu.');
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch (_) {
      prompt('Salin tautan ini untuk dibuka di HP / browser lain:', link);
    }
  };

  const handleSetXamppLocal = () => {
    const url = 'http://localhost/catatankeuangan/api/';
    const sec = secret || 'xampp_mysql_local';
    setWebAppUrl(url);
    setSecret(sec);
    saveSettings({ webAppUrl: url, secret: sec });
    setIsSaved(true);
    setTestResult(null);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleSetXamppLan = () => {
    const url = 'http://192.168.18.9/catatankeuangan/api/';
    const sec = secret || 'xampp_mysql_local';
    setWebAppUrl(url);
    setSecret(sec);
    saveSettings({ webAppUrl: url, secret: sec });
    setIsSaved(true);
    setTestResult(null);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePushAllToDatabase = async () => {
    if (!items || items.length === 0) {
      alert('Tidak ada data transaksi lokal di browser ini.');
      return;
    }
    if (!webAppUrl || !secret) {
      alert('Simpan pengaturan koneksi database terlebih dahulu.');
      return;
    }
    if (!window.confirm(`Kirim seluruh ${items.length} transaksi lokal ke database MySQL sekarang?`)) return;

    setIsSyncingAll(true);
    let successCount = 0;
    try {
      for (const it of items) {
        const res = await apiUpsert(it);
        if (res.ok) successCount++;
      }
      alert(`Berhasil mengirim ${successCount} dari ${items.length} transaksi ke database MySQL!`);
      kickSync();
    } catch (err) {
      alert('Terjadi kesalahan saat sinkronisasi: ' + err.message);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveSettings({ webAppUrl, secret });
    setIsSaved(true);
    setTestResult(null);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    if (!webAppUrl.trim() || !secret.trim()) {
      setTestResult({ ok: false, message: 'URL Backend dan Secret harus diisi terlebih dahulu.' });
      return;
    }

    // Simpan dulu setting sebelum tes
    saveSettings({ webAppUrl, secret });

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiTestConnection();
      if (res.ok) {
        const backendName = webAppUrl.includes('catatankeuangan/api') ? 'Database XAMPP MySQL' : 'Google Apps Script';
        setTestResult({ ok: true, message: `Koneksi Berhasil! Terhubung ke ${backendName}.` });
      } else {
        setTestResult({ ok: false, message: 'Gagal: ' + (res.error || 'Respon tidak valid') });
      }
    } catch (err) {
      setTestResult({ ok: false, message: 'Kesalahan jaringan: ' + err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleExportCsv = () => {
    downloadCsv(items);
  };

  const handleClearCache = async () => {
    const pendingCount = await outboxRepo.countPending();
    const draft = await draftRepo.getDraft();

    let warningMsg = 'Apakah Anda yakin ingin menghapus seluruh cache data lokal di perangkat ini?';
    if (pendingCount > 0) {
      warningMsg += `\n\nPERINGATAN: Ada ${pendingCount} transaksi dalam antrean yang BELUM tersinkron ke server! Data tersebut akan hilang permanen.`;
    }
    if (draft && draft.length > 0) {
      warningMsg += '\n\nDraft pencatatan yang belum disimpan juga akan terhapus.';
    }

    if (!window.confirm(warningMsg)) return;

    setIsClearing(true);
    try {
      await clearAllLocalData();
      alert('Cache data lokal berhasil dibersihkan.');
      kickSync(); // Tarik data baru dari server jika setting valid
    } catch (err) {
      alert('Gagal membersihkan cache: ' + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-600" />
          <span>Pengaturan Aplikasi</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kelola koneksi Google Sheets, sinkronisasi, cadangan data, dan cache lokal.
        </p>
      </div>

      {/* 1. Form Koneksi Database (XAMPP MySQL / Apps Script) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-gray-100 pb-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-600" />
              <span>Koneksi Database & Backend</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSetXamppLocal}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                title="Gunakan database XAMPP MySQL lokal di laptop ini"
              >
                <span>🐬 XAMPP MySQL (Lokal)</span>
              </button>
              <button
                type="button"
                onClick={handleSetXamppLan}
                className="px-2.5 py-1 text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                title="Gunakan database XAMPP MySQL untuk HP via WiFi (192.168.18.9)"
              >
                <span>📱 XAMPP MySQL (HP/WiFi)</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Dikelola dengan <b>XAMPP MySQL lokal</b> (tabel <code>transaksi</code> di database <code>catatan_keuangan</code>) atau <b>Google Apps Script (Cloud)</b>.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              URL Endpoint Backend (XAMPP API / Apps Script) *
            </label>
            <input
              type="url"
              placeholder="http://localhost/catatankeuangan/api/ atau URL Apps Script"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              required
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                Kunci Rahasia (SECRET) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateSecret}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900"
                  title="Buat kunci acak 32 karakter"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Buat Kunci Acak</span>
                </button>
                {secret && (
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900"
                    title="Salin kunci untuk dimasukkan ke Apps Script"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedSecret ? 'Tersalin!' : 'Salin Kunci'}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="Masukkan secret minimal 32 karakter"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-gray-300 pr-10 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowSecret((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title={showSecret ? 'Sembunyikan secret' : 'Tampilkan secret'}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Kunci ini harus persis sama dengan yang dimasukkan di Script Properties Apps Script (minimal 32 karakter).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs transition-colors shadow-xs"
            >
              Simpan Pengaturan
            </button>

            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span>Menguji...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Uji Koneksi</span>
                </>
              )}
            </button>

            {isSaved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pengaturan tersimpan</span>
              </span>
            )}
          </div>

          {/* Alert Hasil Uji Koneksi */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 animate-in fade-in ${
                testResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Tautan Akses Cepat untuk HP & Browser Lain */}
          <div className="pt-3 border-t border-gray-100">
            <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200/90 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-teal-700 flex-shrink-0" />
                  <span className="text-xs font-bold text-teal-900">
                    Tautan Cepat HP & Browser Lain
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!webAppUrl || !secret}
                  onClick={handleCopyShareLink}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedShareLink ? 'Tautan Berhasil Disalin!' : 'Salin Tautan Akses'}</span>
                </button>
              </div>
              <p className="text-[11px] text-teal-800/90 leading-relaxed">
                {!webAppUrl || !secret
                  ? 'Isi dan simpan URL Web App serta Kunci Secret di atas terlebih dahulu untuk membuat tautan cepat.'
                  : 'Buka tautan ini di browser HP atau browser lain (seperti Edge / Safari). URL Web App dan Kunci Secret akan otomatis terpasang dan langsung mengunduh seluruh data Anda dari Google Sheets.'}
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Sinkronisasi Manual & Ekspor Data */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          Tindakan & Cadangan Data
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col justify-between space-y-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Sinkronisasi Otomatis</p>
              <p className="text-xs text-gray-500 mt-1">
                Kirim transaksi yang belum terkirim dan ambil pembaruan terbaru dari database segera.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                kickSync();
                alert('Sinkronisasi dipicu.');
              }}
              className="w-full py-2 px-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 font-semibold text-xs text-gray-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan Sekarang</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-teal-100 bg-teal-50/50 flex flex-col justify-between space-y-3">
            <div>
              <p className="text-sm font-bold text-teal-900">Kirim Semua ke Database</p>
              <p className="text-xs text-gray-500 mt-1">
                Kirim seluruh {items.length} transaksi lokal ke database MySQL XAMPP saat ini.
              </p>
            </div>
            <button
              type="button"
              disabled={isSyncingAll}
              onClick={handlePushAllToDatabase}
              className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {isSyncingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Kirim Semua ({items.length})</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col justify-between space-y-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Ekspor ke CSV</p>
              <p className="text-xs text-gray-500 mt-1">
                Unduh seluruh data transaksi aktif sebagai file CSV yang dapat dibuka di Excel.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="w-full py-2 px-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 font-semibold text-xs text-gray-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Manajemen Cache Lokal */}
      <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-rose-800 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Bersihkan Cache Lokal</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Menghapus database lokal IndexedDB di browser ini. Data di Google Sheets Anda tidak akan terhapus.
          </p>
        </div>

        <button
          type="button"
          disabled={isClearing}
          onClick={handleClearCache}
          className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-60"
        >
          {isClearing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          <span>Hapus Seluruh Data Cache Lokal</span>
        </button>
      </div>
    </div>
  );
}
