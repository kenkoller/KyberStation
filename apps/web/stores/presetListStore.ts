import { create } from 'zustand';
import type { BladeConfig } from '@bladeforge/engine';

export interface PresetListEntry {
  id: string;
  presetName: string;
  fontName: string;
  config: BladeConfig;
  sourcePresetId?: string;
}

interface PresetListStore {
  entries: PresetListEntry[];
  activeEntryId: string | null;

  addEntry: (entry: Omit<PresetListEntry, 'id'>) => string;
  removeEntry: (id: string) => void;
  reorderEntries: (fromIndex: number, toIndex: number) => void;
  updateEntryName: (id: string, presetName: string) => void;
  updateEntryFont: (id: string, fontName: string) => void;
  updateEntryConfig: (id: string, config: BladeConfig) => void;
  setActiveEntry: (id: string | null) => void;
  clearList: () => void;
}

function sanitizeFontName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 32) || 'font';
}

function deduplicateFontName(name: string, existing: string[]): string {
  if (!existing.includes(name)) return name;
  let i = 2;
  while (existing.includes(`${name}_${i}`)) i++;
  return `${name}_${i}`;
}

const STORAGE_KEY = 'bladeforge-preset-list';

function loadFromStorage(): { entries: PresetListEntry[]; activeEntryId: string | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data.entries)) {
        return { entries: data.entries, activeEntryId: data.activeEntryId ?? null };
      }
    }
  } catch { /* ignore */ }
  return { entries: [], activeEntryId: null };
}

function saveToStorage(entries: PresetListEntry[], activeEntryId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, activeEntryId }));
  } catch { /* ignore */ }
}

const initial = loadFromStorage();

export const usePresetListStore = create<PresetListStore>((set, get) => ({
  entries: initial.entries,
  activeEntryId: initial.activeEntryId,

  addEntry: (entry) => {
    const id = crypto.randomUUID();
    const existingFonts = get().entries.map((e) => e.fontName);
    const fontName = deduplicateFontName(
      entry.fontName || sanitizeFontName(entry.presetName),
      existingFonts,
    );
    const newEntry: PresetListEntry = { ...entry, id, fontName };
    set((state) => {
      const entries = [...state.entries, newEntry];
      saveToStorage(entries, state.activeEntryId);
      return { entries };
    });
    return id;
  },

  removeEntry: (id) =>
    set((state) => {
      const entries = state.entries.filter((e) => e.id !== id);
      const activeEntryId = state.activeEntryId === id ? null : state.activeEntryId;
      saveToStorage(entries, activeEntryId);
      return { entries, activeEntryId };
    }),

  reorderEntries: (fromIndex, toIndex) =>
    set((state) => {
      const entries = [...state.entries];
      const [moved] = entries.splice(fromIndex, 1);
      entries.splice(toIndex, 0, moved);
      saveToStorage(entries, state.activeEntryId);
      return { entries };
    }),

  updateEntryName: (id, presetName) =>
    set((state) => {
      const entries = state.entries.map((e) =>
        e.id === id ? { ...e, presetName } : e,
      );
      saveToStorage(entries, state.activeEntryId);
      return { entries };
    }),

  updateEntryFont: (id, fontName) =>
    set((state) => {
      const entries = state.entries.map((e) =>
        e.id === id ? { ...e, fontName } : e,
      );
      saveToStorage(entries, state.activeEntryId);
      return { entries };
    }),

  updateEntryConfig: (id, config) =>
    set((state) => {
      const entries = state.entries.map((e) =>
        e.id === id ? { ...e, config } : e,
      );
      saveToStorage(entries, state.activeEntryId);
      return { entries };
    }),

  setActiveEntry: (activeEntryId) =>
    set((state) => {
      saveToStorage(state.entries, activeEntryId);
      return { activeEntryId };
    }),

  clearList: () => {
    saveToStorage([], null);
    set({ entries: [], activeEntryId: null });
  },
}));
