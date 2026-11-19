/**
 * compressImage.js — Kompresi foto sisi client menggunakan Canvas API
 * 
 * Target: Sisi terpanjang <= 1280px, format JPEG kualitas 0.7
 * Rata-rata ukuran < 300 KB.
 */

/**
 * Kompres file gambar atau blob menjadi JPEG terkompresi
 * @param {File|Blob} fileOrBlob
 * @param {number} maxDimension - Default 1280
 * @param {number} quality - Default 0.7
 * @returns {Promise<Blob>}
 */
export async function compressImage(fileOrBlob, maxDimension = 1280, quality = 0.7) {
  if (!fileOrBlob) return null;

  // Cek apakah lingkungan mendukung createImageBitmap
  if (typeof window === 'undefined' || !window.createImageBitmap) {
    return fileOrBlob;
  }

  try {
    const bitmap = await createImageBitmap(fileOrBlob);
    let { width, height } = bitmap;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob || fileOrBlob);
        },
        'image/jpeg',
        quality
      );
    });
  } catch (err) {
    console.error('Gagal kompresi gambar, menggunakan file asli:', err);
    return fileOrBlob;
  }
}

/**
 * Mengubah Blob ke string base64 murni (tanpa prefix "data:image/...;base64,")
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') {
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      } else {
        resolve('');
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
