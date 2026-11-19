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

/**
 * Membuat tautan akses cepat (berisi URL & Secret terenkripsi base64)
 * untuk mempermudah setup di HP atau browser lain tanpa ketik manual.
 */
export function generateSetupLink() {
  const { webAppUrl, secret } = getSettings();
  if (!webAppUrl || !secret) return '';
  try {
    const jsonStr = JSON.stringify({ webAppUrl, secret });
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    return `${origin}${pathname}?setup=${encoded}`;
  } catch (err) {
    console.error('Gagal membuat link setup:', err);
    return '';
  }
}

/**
 * Memeriksa parameter URL (?setup=...) saat aplikasi pertama dibuka.
 * Jika ditemukan, pengaturan langsung disimpan otomatis ke localStorage,
 * URL dibersihkan, dan mengembalikan true.
 */
export function checkAutoSetupFromUrl() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    let rawConfig = params.get('setup');

    if (!rawConfig && window.location.hash.includes('setup=')) {
      const match = window.location.hash.match(/setup=([^&]+)/);
      if (match) rawConfig = match[1];
    }

    if (rawConfig) {
      const decodedStr = decodeURIComponent(escape(atob(rawConfig)));
      const parsed = JSON.parse(decodedStr);
      if (parsed.webAppUrl && parsed.secret) {
        saveSettings(parsed);
        // Bersihkan parameter query dari address bar tanpa refresh
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return true;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca konfigurasi auto-setup dari URL:', err);
  }
  return false;
}
