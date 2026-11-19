/**
 * pencatatan/DaftarBaris.jsx — Kontainer daftar baris pencatatan bertumpuk
 * 
 * Aturan (prd.md 6.2):
 * - Baris bertumpuk dari atas ke bawah.
 * - Tombol '+ Tambah baris' selalu berada tepat di bawah baris terakhir.
 * - Shortcut keyboard: Ctrl/Cmd + Enter untuk menambah baris baru.
 */

import React, { useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import BarisPencatatan from './BarisPencatatan.jsx';

export default function DaftarBaris({
  rows,
  onAddRow,
  onDuplicateRow,
  onRemoveRow,
  onUpdateField,
  onSetType
}) {
  const lastRowRef = useRef(null);
  const prevRowsLengthRef = useRef(rows.length);

  // Jika baris bertambah, scroll baris baru ke tampilan
  useEffect(() => {
    if (rows.length > prevRowsLengthRef.current) {
      lastRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    prevRowsLengthRef.current = rows.length;
  }, [rows.length]);

  // Pintasan global: Ctrl/Cmd + Enter untuk menambah baris baru
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onAddRow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAddRow]);

  return (
    <div className="space-y-4">
      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        return (
          <div key={row.rowId} ref={isLast ? lastRowRef : null}>
            <BarisPencatatan
              index={index}
              row={row}
              canDelete={rows.length > 1}
              onUpdateField={onUpdateField}
              onSetType={onSetType}
              onDuplicate={onDuplicateRow}
              onRemove={onRemoveRow}
              isLastRow={isLast}
              onEnterOnLastField={onAddRow}
            />
          </div>
        );
      })}

      {/* Tombol Tambah Baris — Tepat di Bawah Baris Terakhir */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onAddRow}
          className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80 text-teal-800 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-2xs"
        >
          <Plus className="w-5 h-5" />
          <span>+ Tambah baris</span>
          <span className="text-xs text-teal-600 font-normal hidden sm:inline">(Ctrl + Enter)</span>
        </button>
      </div>
    </div>
  );
}
