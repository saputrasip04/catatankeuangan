/**
 * hooks/useOnlineStatus.js — Hook reaktif untuk memantau status sinkronisasi & jaringan
 */

import { useState, useEffect } from 'react';
import { subscribeSyncStatus, getSyncStatus } from '../sync/engine.js';

export function useOnlineStatus() {
  const [status, setStatus] = useState(getSyncStatus());

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setStatus);
    return () => unsubscribe();
  }, []);

  return status;
}
