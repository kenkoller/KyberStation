'use client';

import { useEffect, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUserPresetStore } from '@/stores/userPresetStore';
import { useUIStore } from '@/stores/uiStore';

/**
 * Sprint 5E persistence follow-up — restore the import banner state
 * after a page reload.
 *
 * The localStorage `recentImportBatch` survives reload (~200 bytes),
 * but the bladeStore.config (which carries `importedRawCode` — the
 * gating signal for the banner) does NOT. Without this hook, after a
 * reload: storage has the batch, sidebar has the saved presets, but
 * the banner is hidden and the switcher dropdown is gone.
 *
 * This hook waits for `userPresetStore.hydrate` to populate
 * `presets` from IndexedDB, then — if `recentImportBatch` is non-null
 * AND its first entry's preset ID is found — calls
 * `bladeStore.loadPreset` on that preset's full config. The preset's
 * config carries `importedRawCode` (set at original import time) so
 * the banner re-renders with the switcher intact.
 *
 * Runs at most once per mount via a ref guard. Does NOT clear the
 * batch on failure (preset deleted, etc.) — the user can clear it
 * via Convert to Native.
 *
 * Mount this once at the editor page level (before WorkbenchLayout's
 * heavy rendering tree).
 */
export function useImportBatchHydration(): void {
  const ranRef = useRef(false);
  const presets = useUserPresetStore((s) => s.presets);
  const isLoading = useUserPresetStore((s) => s.isLoading);

  useEffect(() => {
    if (ranRef.current) return;
    if (isLoading) return; // wait for IndexedDB hydration
    ranRef.current = true;

    const batch = useUIStore.getState().recentImportBatch;
    if (!batch || batch.length === 0) return;

    // Find the first batch entry that still has a saved preset (the
    // user could have deleted it from My Presets between sessions).
    const firstMatching = batch.find((entry) =>
      presets.some((p) => p.id === entry.id),
    );
    if (!firstMatching) return;

    const preset = presets.find((p) => p.id === firstMatching.id);
    if (!preset) return;

    useBladeStore.getState().loadPreset(preset.config);
  }, [presets, isLoading]);
}
