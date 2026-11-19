/**
 * App.jsx — Konfigurasi Routing Aplikasi
 * 
 * Menggunakan HashRouter agar routing berjalan mulus di GitHub Pages
 * maupun hosting statis lainnya tanpa memerlukan konfigurasi rewrite server.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import Beranda from './pages/Beranda.jsx';
import Pencatatan from './pages/Pencatatan.jsx';
import Riwayat from './pages/Riwayat.jsx';
import DetailTransaksi from './pages/DetailTransaksi.jsx';
import EditTransaksi from './pages/EditTransaksi.jsx';
import Pengaturan from './pages/Pengaturan.jsx';

export default function App() {
  // Mendukung localhost/catatankeuangan maupun root domain seperti Netlify/Vercel
  const basename = typeof window !== 'undefined' && window.location.pathname.startsWith('/catatankeuangan')
    ? '/catatankeuangan'
    : '';

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Beranda />} />
          <Route path="catat" element={<Pencatatan />} />
          <Route path="riwayat" element={<Riwayat />} />
          <Route path="riwayat/:id" element={<DetailTransaksi />} />
          <Route path="riwayat/:id/edit" element={<EditTransaksi />} />
          <Route path="pengaturan" element={<Pengaturan />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
