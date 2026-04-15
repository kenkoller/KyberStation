import { useEffect, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { usePresetListStore } from '@/stores/presetListStore';

/**
 * Syncs the blade editor config with the active preset list entry.
 * - When the user clicks a list entry, its config is loaded into the editor.
 * - When the user edits the active config, changes are debounced back to the list entry.
 */
export function usePresetListSync() {
  const config = useBladeStore((s) => s.config);
  const activeEntryId = usePresetListStore((s) => s.activeEntryId);
  const updateEntryConfig = usePresetListStore((s) => s.updateEntryConfig);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced sync: editor config -> active list entry
  useEffect(() => {
    if (!activeEntryId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateEntryConfig(activeEntryId, config);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [config, activeEntryId, updateEntryConfig]);
}

/**
 * Load a preset list entry into the editor and mark it as active.
 */
export function activatePresetEntry(entryId: string) {
  const entry = usePresetListStore.getState().entries.find((e) => e.id === entryId);
  if (!entry) return;

  useBladeStore.getState().loadPreset(entry.config);
  usePresetListStore.getState().setActiveEntry(entryId);
}
