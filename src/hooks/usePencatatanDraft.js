/**
 * hooks/usePencatatanDraft.js — State management baris pencatatan + auto-save draft ke IndexedDB
 */

import { useReducer, useEffect, useRef, useCallback } from 'react';
import { draftRepo } from '../db/draftRepo.js';
import { getTodayDateString } from '../lib/format.js';

export function createEmptyRow(type = 'keluar', tanggal = getTodayDateString()) {
  return {
    rowId: crypto.randomUUID(),     // Kunci unik React
    id: crypto.randomUUID(),        // UUID transaksi permanen untuk idempotensi
    type,                           // 'keluar' | 'masuk'
    tanggal,
    nama: '',
    qty: '',
    satuan: 'pcs',
    harga: '',
    jumlah: 0,
    catatan: '',
    fotoBarang: null,
    fotoNota: null,
    touched: false,
    errors: {}
  };
}

function draftReducer(state, action) {
  switch (action.type) {
    case 'LOAD_DRAFT': {
      if (Array.isArray(action.payload) && action.payload.length > 0) {
        return action.payload;
      }
      return [createEmptyRow()];
    }

    case 'ADD_ROW': {
      const lastRow = state[state.length - 1];
      const inheritedType = lastRow ? lastRow.type : 'keluar';
      const inheritedTanggal = lastRow ? lastRow.tanggal : getTodayDateString();
      const newRow = createEmptyRow(inheritedType, inheritedTanggal);
      return [...state, newRow];
    }

    case 'DUPLICATE_ROW': {
      const index = action.payload;
      if (index < 0 || index >= state.length) return state;
      const source = state[index];
      const duplicated = {
        ...source,
        rowId: crypto.randomUUID(),
        id: crypto.randomUUID(),
        fotoBarang: null, // Foto tidak digandakan otomatis
        fotoNota: null,
        touched: true,
        errors: {}
      };
      const newState = [...state];
      newState.splice(index + 1, 0, duplicated);
      return newState;
    }

    case 'REMOVE_ROW': {
      if (state.length <= 1) return state; // Minimal 1 baris
      const index = action.payload;
      return state.filter((_, i) => i !== index);
    }

    case 'UPDATE_FIELD': {
      const { index, field, value } = action.payload;
      if (index < 0 || index >= state.length) return state;

      const row = { ...state[index], [field]: value, touched: true };

      // Hitung ulang jumlah jika keluar
      if (row.type === 'keluar') {
        const qty = Number(field === 'qty' ? value : row.qty) || 0;
        const harga = Number(field === 'harga' ? value : row.harga) || 0;
        row.jumlah = Math.round(qty * harga);
      } else if (field === 'jumlah') {
        row.jumlah = Number(value) || 0;
      }

      // Hapus pesan error field yang sedang diubah jika ada
      if (row.errors && row.errors[field]) {
        const updatedErrors = { ...row.errors };
        delete updatedErrors[field];
        row.errors = updatedErrors;
      }

      const newState = [...state];
      newState[index] = row;
      return newState;
    }

    case 'SET_TYPE': {
      const { index, type } = action.payload;
      if (index < 0 || index >= state.length) return state;
      const row = {
        ...state[index],
        type,
        touched: true,
        errors: {}
      };
      if (type === 'keluar') {
        const qty = Number(row.qty) || 0;
        const harga = Number(row.harga) || 0;
        row.jumlah = Math.round(qty * harga);
      }
      const newState = [...state];
      newState[index] = row;
      return newState;
    }

    case 'SET_ERRORS': {
      const errorsByIndex = action.payload; // Map index -> errors object
      return state.map((row, idx) => ({
        ...row,
        errors: errorsByIndex[idx] || {}
      }));
    }

    case 'RESET': {
      return [createEmptyRow()];
    }

    default:
      return state;
  }
}

export function usePencatatanDraft() {
  const [rows, dispatch] = useReducer(draftReducer, [createEmptyRow()]);
  const isLoadedRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // 1. Muat draft dari IndexedDB saat pertama kali dibuka
  useEffect(() => {
    async function loadInitialDraft() {
      try {
        const savedRows = await draftRepo.getDraft();
        if (savedRows && savedRows.length > 0) {
          dispatch({ type: 'LOAD_DRAFT', payload: savedRows });
        }
      } catch (err) {
        console.error('Gagal memuat draft dari IDB:', err);
      } finally {
        isLoadedRef.current = true;
      }
    }
    loadInitialDraft();
  }, []);

  // 2. Debounce auto-save ke IndexedDB store 'draft' (500 ms)
  useEffect(() => {
    if (!isLoadedRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Cek apakah hanya 1 baris kosong; jika ya, tidak perlu simpan draft
        const isSingleEmpty = rows.length === 1 && !rows[0].nama && !rows[0].jumlah && !rows[0].fotoBarang;
        if (isSingleEmpty) {
          await draftRepo.clearDraft();
        } else {
          await draftRepo.setDraft(rows);
        }
      } catch (err) {
        console.warn('Gagal menyimpan draft:', err);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [rows]);

  const addRow = useCallback(() => {
    dispatch({ type: 'ADD_ROW' });
  }, []);

  const duplicateRow = useCallback((index) => {
    dispatch({ type: 'DUPLICATE_ROW', payload: index });
  }, []);

  const removeRow = useCallback((index) => {
    dispatch({ type: 'REMOVE_ROW', payload: index });
  }, []);

  const updateField = useCallback((index, field, value) => {
    dispatch({ type: 'UPDATE_FIELD', payload: { index, field, value } });
  }, []);

  const setType = useCallback((index, type) => {
    dispatch({ type: 'SET_TYPE', payload: { index, type } });
  }, []);

  const setRowErrors = useCallback((errorsMap) => {
    dispatch({ type: 'SET_ERRORS', payload: errorsMap });
  }, []);

  const resetAll = useCallback(async () => {
    dispatch({ type: 'RESET' });
    await draftRepo.clearDraft();
  }, []);

  return {
    rows,
    addRow,
    duplicateRow,
    removeRow,
    updateField,
    setType,
    setRowErrors,
    resetAll
  };
}
