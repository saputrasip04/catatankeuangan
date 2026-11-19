/**
 * FotoInput.jsx — Komponen input foto dari kamera atau galeri dengan kompresi otomatis
 */

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';
import { compressImage } from '../lib/compressImage.js';

export default function FotoInput({
  label = 'Foto',
  value = null, // Blob | string (URL) | null
  onChange,
  onRemove
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);

  // Buat preview URL jika value berupa Blob
  useEffect(() => {
    if (!value) {
      setPreviewUrl('');
      return;
    }

    if (typeof value === 'string') {
      setPreviewUrl(value);
      return;
    }

    if (value instanceof Blob) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [value]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressedBlob = await compressImage(file, 1280, 0.7);
      if (onChange) {
        onChange(compressedBlob);
      }
    } catch (err) {
      console.error('Gagal kompresi foto:', err);
      if (onChange) {
        onChange(file);
      }
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <span className="font-medium text-gray-700">{label}</span>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-300 bg-gray-50 flex items-center justify-center">
          <img
            src={previewUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Ganti foto"
              className="p-1.5 bg-white text-gray-800 rounded-md shadow-sm hover:bg-gray-100 min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Hapus foto"
              className="p-1.5 bg-white text-rose-600 rounded-md shadow-sm hover:bg-gray-100 min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={compressing}
          onClick={() => fileInputRef.current?.click()}
          className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-500 bg-gray-50/70 hover:bg-teal-50/30 transition-colors flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-teal-700 active:scale-95"
        >
          {compressing ? (
            <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-medium">+ Foto</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
