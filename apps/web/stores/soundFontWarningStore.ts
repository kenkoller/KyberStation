import { create } from 'zustand';

import type { MissingFontEntry } from '@/lib/soundFontValidation';

interface SoundFontWarningStore {
  isOpen: boolean;
  /** Presets whose `fontName` doesn't match any folder on the card. */
  missing: MissingFontEntry[];
  /** Folders that ARE on the card (shown alongside missing for context). */
  available: string[];
  /**
   * Internal — resolves the in-flight `request()` Promise when the user
   * picks Continue Anyway (`true`) or Cancel (`false`).
   */
  resolve: ((proceed: boolean) => void) | null;

  /**
   * Open the modal and return a Promise resolving with `true` if the
   * user picks Continue Anyway, `false` if Cancel/close. Callers `await`
   * to gate the write-to-card flow.
   *
   * Concurrent calls overwrite the in-flight request — previous Promise
   * resolves with `false` before the new one opens.
   */
  request: (
    missing: MissingFontEntry[],
    available: string[],
  ) => Promise<boolean>;
  confirm: () => void;
  cancel: () => void;
}

/**
 * Global open/close state + resolver for the sound-font pre-flash
 * warning modal. Mirrors `engineOnlyWarningStore`. Used by
 * `CardWriter.tsx`'s direct-write path to gate writes when the
 * selected preset list references font folders that aren't on the
 * user's SD card.
 *
 * Closes the silent-failure gap surfaced by audit doc section I in
 * `docs/research/EMIT_PARSER_AUDIT.md` — before this, users could
 * design a preset referencing `font=mace_v2`, flash to saber, and on
 * activation get a silent fallback (no error, no warning).
 *
 * Not persisted — ephemeral UI state only.
 */
export const useSoundFontWarningStore = create<SoundFontWarningStore>(
  (set, get) => ({
    isOpen: false,
    missing: [],
    available: [],
    resolve: null,

    request: (missing, available) => {
      const prev = get().resolve;
      if (prev) prev(false);

      return new Promise<boolean>((resolve) => {
        set({ isOpen: true, missing, available, resolve });
      });
    },

    confirm: () => {
      const r = get().resolve;
      if (r) r(true);
      set({ isOpen: false, missing: [], available: [], resolve: null });
    },

    cancel: () => {
      const r = get().resolve;
      if (r) r(false);
      set({ isOpen: false, missing: [], available: [], resolve: null });
    },
  }),
);
