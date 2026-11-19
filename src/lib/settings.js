/**
 * settings.js — Pengaturan Web App URL dan Kunci Rahasia (Secret)
 * 
 * Sesuai prinsip agent.md & tech.md:
 * - Disimpan hanya di localStorage perangkat.
 * - Tidak boleh di-hardcode di kode.
 */

const STORAGE_KEY = 'keuangan_pwa_settings';

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { webAppUrl: '', secret: '' };
    const parsed = JSON.parse(raw);
    return {
      webAppUrl: (parsed.webAppUrl || '').trim(),
      secret: (parsed.secret || '').trim()
    };
  } catch (_) {
    return { webAppUrl: '', secret: '' };
  }
}

export function saveSettings(settings) {
  try {
    const data = {
      webAppUrl: (settings.webAppUrl || '').trim(),
      secret: (settings.secret || '').trim()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Gagal menyimpan pengaturan:', err);
    return false;
  }
}

export function clearSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (_) {
    return false;
  }
}
