'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  type AurebeshMode,
  getAurebeshMode,
  setAurebeshMode,
  applyAurebeshMode,
} from '../lib/aurebesh';

/**
 * Hook for managing the Aurebesh font toggle.
 *
 * On mount, loads the saved mode and applies the CSS class to <html>.
 * Returns the current mode and a setter.
 *
 * Usage:
 *   const { mode, setMode } = useAurebesh();
 */
export function useAurebesh() {
  const [mode, setModeState] = useState<AurebeshMode>('off');

  useEffect(() => {
    const saved = getAurebeshMode();
    setModeState(saved);
    applyAurebeshMode(saved);
  }, []);

  const setMode = useCallback((newMode: AurebeshMode) => {
    setAurebeshMode(newMode);
    setModeState(newMode);
    applyAurebeshMode(newMode);
  }, []);

  return { mode, setMode };
}
