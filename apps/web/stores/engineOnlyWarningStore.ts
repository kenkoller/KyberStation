import { create } from 'zustand';

/**
 * Description of one offending preset for display in the modal:
 * its name as it appears in the preset list, and the engine-only
 * style id it uses (rendered to the user so they can decide whether
 * to convert or proceed).
 */
export interface EngineOnlyWarningEntry {
  presetName: string;
  styleId: string;
}

interface EngineOnlyWarningStore {
  isOpen: boolean;
  /** Presets using engine-only styles that will fall back to `stable` on export. */
  entries: EngineOnlyWarningEntry[];
  /**
   * Internal — resolves the in-flight `request()` Promise when the user
   * picks Continue Anyway (`true`) or Cancel (`false`). Set by
   * `request()`, called from `confirm()` / `cancel()`. Null when the
   * modal isn't open.
   */
  resolve: ((proceed: boolean) => void) | null;

  /**
   * Open the modal and return a Promise that resolves with `true` if
   * the user clicks Continue Anyway, `false` if they Cancel or close.
   * Callers `await` the Promise to gate destructive actions
   * (typically an export download).
   *
   * Concurrent calls overwrite the in-flight request — the previous
   * Promise resolves with `false` (treated as cancel) before the new
   * one opens. Avoids leaking unresolved Promises if the user triggers
   * export twice quickly.
   */
  request: (entries: EngineOnlyWarningEntry[]) => Promise<boolean>;
  /** User picked "Continue Anyway." Resolves the Promise with `true`. */
  confirm: () => void;
  /** User picked "Cancel" or closed the modal. Resolves with `false`. */
  cancel: () => void;
}

/**
 * Global open/close state + resolver for the engine-only-style warning
 * modal. Mirrors the `chassisPickerStore` pattern. Used by
 * `CodeOutput.tsx`'s `handleDownload` to gate export when any preset
 * uses one of the 15 engine-only styles that silently fall back to
 * `stable` in ProffieOS codegen.
 *
 * Replaces a `window.confirm()` shipped in Phase 2 with a styled,
 * scrollable, theme-aware modal that lists exact offending presets +
 * their style IDs.
 *
 * Not persisted — ephemeral UI state only.
 */
export const useEngineOnlyWarningStore = create<EngineOnlyWarningStore>(
  (set, get) => ({
    isOpen: false,
    entries: [],
    resolve: null,

    request: (entries) => {
      // Resolve any in-flight request as "cancel" to avoid leaking it.
      const prev = get().resolve;
      if (prev) prev(false);

      return new Promise<boolean>((resolve) => {
        set({ isOpen: true, entries, resolve });
      });
    },

    confirm: () => {
      const r = get().resolve;
      if (r) r(true);
      set({ isOpen: false, entries: [], resolve: null });
    },

    cancel: () => {
      const r = get().resolve;
      if (r) r(false);
      set({ isOpen: false, entries: [], resolve: null });
    },
  }),
);
