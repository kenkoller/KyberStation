import { create } from 'zustand';
import type { BladeConfig } from '@bladeforge/engine';
import type { UserPreset } from '@/lib/fontDB';
import {
  getAllUserPresets,
  saveUserPresetToDB,
  deleteUserPresetFromDB,
  bulkPutUserPresets,
} from '@/lib/fontDB';

export type { UserPreset } from '@/lib/fontDB';

interface UserPresetStore {
  presets: UserPreset[];
  isLoading: boolean;

  /** Load all presets from IndexedDB — call once on mount. */
  hydrate: () => Promise<void>;

  /** Save a new preset. Returns the new id. */
  savePreset: (
    name: string,
    config: BladeConfig,
    options?: {
      description?: string;
      tags?: string[];
      fontAssociation?: string;
      sourcePresetId?: string;
      thumbnail?: string;
    },
  ) => string;

  /** Update an existing preset's metadata or config. */
  updatePreset: (id: string, updates: Partial<Omit<UserPreset, 'id' | 'createdAt'>>) => void;

  /** Delete a preset by id. */
  deletePreset: (id: string) => void;

  /** Duplicate a preset with a new name. Returns the new id. */
  duplicatePreset: (id: string, newName: string) => string;

  /** Import presets, appending "(imported)" on name conflicts. */
  importPresets: (incoming: UserPreset[]) => void;

  /** Export presets (all if no ids specified). */
  exportPresets: (ids?: string[]) => UserPreset[];

  /** Reorder presets in the list. */
  reorderPresets: (fromIndex: number, toIndex: number) => void;
}

export const useUserPresetStore = create<UserPresetStore>((set, get) => ({
  presets: [],
  isLoading: true,

  hydrate: async () => {
    set({ isLoading: true });
    const presets = await getAllUserPresets();
    // Sort by creation time (newest first)
    presets.sort((a, b) => b.createdAt - a.createdAt);
    set({ presets, isLoading: false });
  },

  savePreset: (name, config, options) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const preset: UserPreset = {
      id,
      name,
      description: options?.description,
      tags: options?.tags ?? [],
      config: { ...config },
      fontAssociation: options?.fontAssociation,
      sourcePresetId: options?.sourcePresetId,
      createdAt: now,
      updatedAt: now,
      thumbnail: options?.thumbnail,
    };
    set((state) => ({ presets: [preset, ...state.presets] }));
    saveUserPresetToDB(preset);
    return id;
  },

  updatePreset: (id, updates) => {
    const now = Date.now();
    set((state) => ({
      presets: state.presets.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: now } : p,
      ),
    }));
    const updated = get().presets.find((p) => p.id === id);
    if (updated) saveUserPresetToDB(updated);
  },

  deletePreset: (id) => {
    set((state) => ({ presets: state.presets.filter((p) => p.id !== id) }));
    deleteUserPresetFromDB(id);
  },

  duplicatePreset: (id, newName) => {
    const source = get().presets.find((p) => p.id === id);
    if (!source) return '';
    const newId = crypto.randomUUID();
    const now = Date.now();
    const dup: UserPreset = {
      ...source,
      id: newId,
      name: newName,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ presets: [dup, ...state.presets] }));
    saveUserPresetToDB(dup);
    return newId;
  },

  importPresets: (incoming) => {
    const existing = get().presets;
    const existingNames = new Set(existing.map((p) => p.name));
    const toImport = incoming.map((p) => {
      const name = existingNames.has(p.name) ? `${p.name} (imported)` : p.name;
      existingNames.add(name);
      return { ...p, id: crypto.randomUUID(), name };
    });
    set((state) => ({ presets: [...toImport, ...state.presets] }));
    bulkPutUserPresets(toImport);
  },

  exportPresets: (ids) => {
    const presets = get().presets;
    if (!ids) return presets;
    return presets.filter((p) => ids.includes(p.id));
  },

  reorderPresets: (fromIndex, toIndex) => {
    set((state) => {
      const presets = [...state.presets];
      const [moved] = presets.splice(fromIndex, 1);
      presets.splice(toIndex, 0, moved);
      return { presets };
    });
  },
}));
