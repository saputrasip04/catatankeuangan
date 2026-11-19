/**
 * StatusSync.jsx — Indikator visual status koneksi dan sinkronisasi
 */

import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

export default function StatusSync() {
  const { isOnline, isSyncing, pendingCount, lastError } = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200">
        <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Offline {pendingCount > 0 && `(${pendingCount} tersimpan lokal)`}</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-md border border-teal-200">
        <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        <span>Menyinkronkan...</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-md border border-blue-200">
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{pendingCount} menunggu terkirim</span>
      </div>
    );
  }

  if (lastError) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-md border border-rose-200" title={lastError}>
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">Perlu perhatian</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>Tersinkronisasi</span>
    </div>
  );
}
