import { create } from 'zustand';
import type { Preset } from '@kyberstation/presets';

/**
 * Shared selection state for the Preset Detail view.
 *
 * The PresetGallery component writes to this store when a user clicks a
 * preset tile; both the gallery's inline detail view and the standalone
 * `preset-detail` workbench panel subscribe to it so that they always show
 * the same selected preset.
 *
 * Kept session-only (no persistence) — selection is ephemeral UI state, not
 * a saved artifact.
 */
interface PresetDetailStore {
  detailPreset: Preset | null;
  setDetailPreset: (preset: Preset | null) => void;
  clearDetailPreset: () => void;
}

export const usePresetDetailStore = create<PresetDetailStore>((set) => ({
  detailPreset: null,
  setDetailPreset: (detailPreset) => set({ detailPreset }),
  clearDetailPreset: () => set({ detailPreset: null }),
}));
