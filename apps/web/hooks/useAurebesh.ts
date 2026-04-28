'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  type AurebeshMode,
  type AurebeshVariant,
  getAurebeshMode,
  setAurebeshMode,
  getAurebeshVariant,
  setAurebeshVariant,
  applyAurebeshMode,
  applyAurebeshVariant,
} from '../lib/aurebesh';

/**
 * Hook for managing the Aurebesh font toggle + variant selection.
 *
 * On mount, loads the saved mode + variant and applies the CSS classes
 * to <html>. Returns the current mode/variant + setters.
 *
 * Usage:
 *   const { mode, setMode, variant, setVariant } = useAurebesh();
 */
export function useAurebesh() {
  const [mode, setModeState] = useState<AurebeshMode>('off');
  const [variant, setVariantState] = useState<AurebeshVariant>('canon');

  useEffect(() => {
    const savedMode = getAurebeshMode();
    const savedVariant = getAurebeshVariant();
    setModeState(savedMode);
    setVariantState(savedVariant);
    applyAurebeshMode(savedMode, savedVariant);
  }, []);

  const setMode = useCallback((newMode: AurebeshMode) => {
    setAurebeshMode(newMode);
    setModeState(newMode);
    applyAurebeshMode(newMode);
  }, []);

  const setVariant = useCallback((newVariant: AurebeshVariant) => {
    setAurebeshVariant(newVariant);
    setVariantState(newVariant);
    applyAurebeshVariant(newVariant);
  }, []);

  return { mode, setMode, variant, setVariant };
}
