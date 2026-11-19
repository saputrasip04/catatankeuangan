/**
 * sync/api.js — Klien HTTP untuk komunikasi dengan Google Apps Script Web App
 * 
 * Prinsip teknis penting:
 * - Content-Type selalu 'text/plain;charset=utf-8' untuk menghindari CORS preflight.
 * - Body selalu JSON string yang membawa secret.
 * - redirect: 'follow' untuk menangani auto-redirect dari script.google.com ke script.googleusercontent.com.
 */

import { getSettings } from '../lib/settings.js';

export async function sendRequest(action, payload = {}) {
  const { webAppUrl, secret } = getSettings();
  if (!webAppUrl || !secret) {
    return { ok: false, data: null, error: 'unauthorized: URL atau Secret belum diatur' };
  }

  const bodyData = {
    secret,
    action,
    ...payload
  };

  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(bodyData),
      redirect: 'follow'
    });

    if (!res.ok) {
      return { ok: false, data: null, error: `HTTP Error: ${res.status} ${res.statusText}` };
    }

    const json = await res.json();
    return json;
  } catch (err) {
    return { ok: false, data: null, error: err.message || 'Gagal terhubung ke server' };
  }
}

/**
 * Mengambil daftar transaksi yang diperbarui sejak `since` (epoch ms)
 */
export async function apiList(since = 0) {
  return sendRequest('list', { since });
}

/**
 * Menyimpan / memperbarui satu transaksi ke server
 */
export async function apiUpsert(item) {
  return sendRequest('upsert', { item });
}

/**
 * Menghapus (soft-delete) transaksi di server
 */
export async function apiDelete(id, updatedAt) {
  return sendRequest('delete', { id, updatedAt });
}

/**
 * Mengunggah foto base64 ke Google Drive melalui server
 */
export async function apiUpload(id, kind, mimeType, base64) {
  return sendRequest('upload', { id, kind, mimeType, base64 });
}

/**
 * Menguji koneksi dan validitas secret
 */
export async function apiTestConnection() {
  return sendRequest('list', { since: Date.now() });
}
