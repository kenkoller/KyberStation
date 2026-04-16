import { create } from 'zustand';
import type { PresetListEntry } from './presetListStore';
import type { BladeConfig } from '@kyberstation/engine';

// ─── Card Preset types ───

export interface CardPresetEntry {
  id: string;
  order: number;
  presetName: string;
  fontName: string;
  source:
    | { type: 'builtin'; presetId: string }
    | { type: 'custom'; userPresetId: string }
    | { type: 'inline' };
  config: BladeConfig;
  fontAssociation?: string;
  mixerPreset?: string;
}

export interface CardConfig {
  id: string;
  name: string;
  entries: CardPresetEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SaberProfile {
  id: string;
  name: string;
  chassisType: string;
  boardType: string;
  cardSize: string;
  /** @deprecated Use cardConfigs instead. Kept for migration. */
  presetEntries: PresetListEntry[];
  fontAssignments: Record<string, string>;
  cardConfigs: CardConfig[];
  activeCardConfigId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface SaberProfileStore {
  profiles: SaberProfile[];
  activeProfileId: string | null;

  createProfile: (name: string, chassisType?: string, boardType?: string, cardSize?: string) => SaberProfile;
  duplicateProfile: (id: string) => SaberProfile | null;
  deleteProfile: (id: string) => void;
  switchProfile: (id: string) => void;
  updateProfile: (id: string, updates: Partial<Omit<SaberProfile, 'id' | 'createdAt'>>) => void;
  exportProfile: (id: string) => string | null;
  importProfile: (json: string) => SaberProfile | null;
  copyPresetsToProfile: (fromId: string, toId: string, presetIds: string[]) => void;
  getActiveProfile: () => SaberProfile | null;

  // Card config actions
  addCardConfig: (profileId: string, name: string) => string;
  deleteCardConfig: (profileId: string, configId: string) => void;
  renameCardConfig: (profileId: string, configId: string, name: string) => void;
  duplicateCardConfig: (profileId: string, configId: string) => string;
  setActiveCardConfig: (profileId: string, configId: string) => void;
  getActiveCardConfig: (profileId: string) => CardConfig | null;

  // Card preset entry actions
  addCardEntry: (profileId: string, configId: string, entry: Omit<CardPresetEntry, 'id' | 'order'>) => string;
  removeCardEntry: (profileId: string, configId: string, entryId: string) => void;
  updateCardEntry: (profileId: string, configId: string, entryId: string, updates: Partial<Omit<CardPresetEntry, 'id'>>) => void;
  reorderCardEntries: (profileId: string, configId: string, fromIndex: number, toIndex: number) => void;
}

const STORAGE_KEY = 'kyberstation-saber-profiles';

/** Migrate a profile from old format (presetEntries) to new format (cardConfigs). */
function migrateProfile(profile: SaberProfile): SaberProfile {
  if (profile.cardConfigs && profile.cardConfigs.length > 0) return profile;

  // Build card entries from legacy presetEntries
  const entries: CardPresetEntry[] = (profile.presetEntries ?? []).map((e, i) => ({
    id: crypto.randomUUID(),
    order: i,
    presetName: e.presetName,
    fontName: e.fontName || profile.fontAssignments?.[e.id] || '',
    source: e.sourcePresetId
      ? { type: 'builtin' as const, presetId: e.sourcePresetId }
      : { type: 'inline' as const },
    config: e.config,
    fontAssociation: profile.fontAssignments?.[e.id],
  }));

  const configId = crypto.randomUUID();
  const defaultConfig: CardConfig = {
    id: configId,
    name: 'Default',
    entries,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };

  return {
    ...profile,
    cardConfigs: [defaultConfig],
    activeCardConfigId: configId,
  };
}

function loadFromStorage(): { profiles: SaberProfile[]; activeProfileId: string | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data.profiles)) {
        const profiles = data.profiles.map(migrateProfile);
        return { profiles, activeProfileId: data.activeProfileId ?? null };
      }
    }
  } catch { /* ignore */ }
  return { profiles: [], activeProfileId: null };
}

function saveToStorage(profiles: SaberProfile[], activeProfileId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeProfileId }));
  } catch { /* ignore */ }
}

const initial = loadFromStorage();

export const useSaberProfileStore = create<SaberProfileStore>((set, get) => ({
  profiles: initial.profiles,
  activeProfileId: initial.activeProfileId,

  createProfile: (name, chassisType = '', boardType = 'Proffie V3', cardSize = '16GB') => {
    const configId = crypto.randomUUID();
    const profile: SaberProfile = {
      id: crypto.randomUUID(),
      name,
      chassisType: chassisType,
      boardType,
      cardSize,
      presetEntries: [],
      fontAssignments: {},
      cardConfigs: [{
        id: configId,
        name: 'Default',
        entries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      activeCardConfigId: configId,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => {
      const profiles = [...state.profiles, profile];
      const activeProfileId = state.activeProfileId ?? profile.id;
      saveToStorage(profiles, activeProfileId);
      return { profiles, activeProfileId };
    });
    return profile;
  },

  duplicateProfile: (id) => {
    const source = get().profiles.find((p) => p.id === id);
    if (!source) return null;
    const newConfigId = crypto.randomUUID();
    const profile: SaberProfile = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (Copy)`,
      presetEntries: source.presetEntries.map((e) => ({ ...e, id: crypto.randomUUID() })),
      cardConfigs: source.cardConfigs.map((cc, i) => {
        const ccId = i === 0 ? newConfigId : crypto.randomUUID();
        return {
          ...cc,
          id: ccId,
          entries: cc.entries.map((e) => ({ ...e, id: crypto.randomUUID() })),
        };
      }),
      activeCardConfigId: newConfigId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => {
      const profiles = [...state.profiles, profile];
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    });
    return profile;
  },

  deleteProfile: (id) =>
    set((state) => {
      const profiles = state.profiles.filter((p) => p.id !== id);
      const activeProfileId = state.activeProfileId === id
        ? (profiles[0]?.id ?? null)
        : state.activeProfileId;
      saveToStorage(profiles, activeProfileId);
      return { profiles, activeProfileId };
    }),

  switchProfile: (id) =>
    set((state) => {
      saveToStorage(state.profiles, id);
      return { activeProfileId: id };
    }),

  updateProfile: (id, updates) =>
    set((state) => {
      const profiles = state.profiles.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
      );
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    }),

  exportProfile: (id) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return null;
    return JSON.stringify(profile, null, 2);
  },

  importProfile: (json) => {
    try {
      const data = JSON.parse(json);
      if (typeof data.name !== 'string' || !data.name.trim()) return null;
      // Accept profiles with presetEntries (old) or cardConfigs (new)
      if (!Array.isArray(data.presetEntries) && !Array.isArray(data.cardConfigs)) return null;

      const configId = crypto.randomUUID();
      // Build a clean profile from validated fields only (no blind spread)
      const profile: SaberProfile = {
        id: crypto.randomUUID(),
        name: String(data.name).slice(0, 100),
        chassisType: typeof data.chassisType === 'string' ? data.chassisType.slice(0, 100) : '',
        boardType: typeof data.boardType === 'string' ? data.boardType.slice(0, 50) : 'Proffie V3',
        cardSize: typeof data.cardSize === 'string' ? data.cardSize : '16GB',
        presetEntries: Array.isArray(data.presetEntries)
          ? data.presetEntries
              .filter((e: Record<string, unknown>) => typeof e === 'object' && e !== null && 'presetName' in e)
              .slice(0, 200)
          : [],
        fontAssignments: typeof data.fontAssignments === 'object' && data.fontAssignments !== null && !Array.isArray(data.fontAssignments)
          ? data.fontAssignments as Record<string, string>
          : {},
        cardConfigs: Array.isArray(data.cardConfigs) && data.cardConfigs.length > 0
          ? data.cardConfigs
              .filter((c: unknown): c is CardConfig =>
                typeof c === 'object' && c !== null &&
                typeof (c as Record<string, unknown>).id === 'string' &&
                typeof (c as Record<string, unknown>).name === 'string' &&
                Array.isArray((c as Record<string, unknown>).entries),
              )
              .slice(0, 50)
              .map((c: CardConfig) => ({
                ...c,
                name: String(c.name).slice(0, 100),
                entries: Array.isArray(c.entries)
                  ? c.entries
                      .filter((e: unknown): e is CardPresetEntry =>
                        typeof e === 'object' && e !== null &&
                        typeof (e as Record<string, unknown>).id === 'string' &&
                        typeof (e as Record<string, unknown>).presetName === 'string' &&
                        typeof (e as Record<string, unknown>).config === 'object',
                      )
                      .slice(0, 200)
                  : [],
              }))
          : [{
              id: configId,
              name: 'Default',
              entries: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }],
        activeCardConfigId: typeof data.activeCardConfigId === 'string'
          ? data.activeCardConfigId
          : configId,
        notes: typeof data.notes === 'string' ? data.notes.slice(0, 2000) : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Run migration to populate cardConfigs from legacy presetEntries
      const migrated = migrateProfile(profile);
      set((state) => {
        const profiles = [...state.profiles, migrated];
        saveToStorage(profiles, state.activeProfileId);
        return { profiles };
      });
      return migrated;
    } catch {
      return null;
    }
  },

  copyPresetsToProfile: (fromId, toId, presetIds) =>
    set((state) => {
      const source = state.profiles.find((p) => p.id === fromId);
      if (!source) return state;
      const presetsToCopy = source.presetEntries
        .filter((e) => presetIds.includes(e.id))
        .map((e) => ({ ...e, id: crypto.randomUUID() }));
      const profiles = state.profiles.map((p) =>
        p.id === toId
          ? { ...p, presetEntries: [...p.presetEntries, ...presetsToCopy], updatedAt: new Date().toISOString() }
          : p,
      );
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    }),

  getActiveProfile: () => {
    const state = get();
    return state.profiles.find((p) => p.id === state.activeProfileId) ?? null;
  },

  // ─── Card Config actions ───

  addCardConfig: (profileId, name) => {
    const configId = crypto.randomUUID();
    set((state) => {
      const profiles = state.profiles.map((p) =>
        p.id === profileId
          ? {
              ...p,
              cardConfigs: [
                ...p.cardConfigs,
                {
                  id: configId,
                  name,
                  entries: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              updatedAt: new Date().toISOString(),
            }
          : p,
      );
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    });
    return configId;
  },

  deleteCardConfig: (profileId, configId) =>
    set((state) => {
      const profiles = state.profiles.map((p) => {
        if (p.id !== profileId) return p;
        const configs = p.cardConfigs.filter((c) => c.id !== configId);
        if (configs.length === 0) return p; // Don't delete last config
        const activeCardConfigId =
          p.activeCardConfigId === configId
            ? configs[0].id
            : p.activeCardConfigId;
        return { ...p, cardConfigs: configs, activeCardConfigId, updatedAt: new Date().toISOString() };
      });
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    }),

  renameCardConfig: (profileId, configId, name) =>
    set((state) => {
      const profiles = state.profiles.map((p) =>
        p.id === profileId
          ? {
              ...p,
              cardConfigs: p.cardConfigs.map((c) =>
                c.id === configId
                  ? { ...c, name, updatedAt: new Date().toISOString() }
                  : c,
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      );
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    }),

  duplicateCardConfig: (profileId, configId) => {
    const newId = crypto.randomUUID();
    set((state) => {
      const profiles = state.profiles.map((p) => {
        if (p.id !== profileId) return p;
        const source = p.cardConfigs.find((c) => c.id === configId);
        if (!source) return p;
        const dup: CardConfig = {
          ...source,
          id: newId,
          name: `${source.name} (Copy)`,
          entries: source.entries.map((e) => ({ ...e, id: crypto.randomUUID() })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { ...p, cardConfigs: [...p.cardConfigs, dup], updatedAt: new Date().toISOString() };
      });
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    });
    return newId;
  },

  setActiveCardConfig: (profileId, configId) =>
    set((state) => {
      const profiles = state.profiles.map((p) =>
        p.id === profileId
          ? { ...p, activeCardConfigId: configId, updatedAt: new Date().toISOString() }
          : p,
      );
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    }),

  getActiveCardConfig: (profileId) => {
    const profile = get().profiles.find((p) => p.id === profileId);
    if (!profile) return null;
    return profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ?? profile.cardConfigs[0] ?? null;
  },

  // ─── Card Preset Entry actions ───

  addCardEntry: (profileId, configId, entry) => {
    const entryId = crypto.randomUUID();
    set((state) => {
      const profiles = state.profiles.map((p) => {
        if (p.id !== profileId) return p;
        return {
          ...p,
          cardConfigs: p.cardConfigs.map((c) => {
            if (c.id !== configId) return c;
            const order = c.entries.length;
            return {
              ...c,
              entries: [...c.entries, { ...entry, id: entryId, order }],
              updatedAt: new Date().toISOString(),
            };
          }),
          updatedAt: new Date().toISOString(),
        };
      });
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    });
    return entryId;
  },

  removeCardEntry: (profileId, configId, entryId) =>
    set((state) => {
      const profiles = state.profiles.map((p) => {
        if (p.id !== profileId) return p;
        return {
          ...p,
          cardConfigs: p.cardConfigs.map((c) => {
            if (c.id !== configId) return c;
            const entries = c.entries
              .filter((e) => e.id !== entryId)
              .map((e, i) => ({ ...e, order: i }));
            return { ...c, entries, updatedAt: new Date().toISOString() };
          }),
          updatedAt: new Date().toISOString(),
        };
      });
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    }),

  updateCardEntry: (profileId, configId, entryId, updates) =>
    set((state) => {
      const profiles = state.profiles.map((p) => {
        if (p.id !== profileId) return p;
        return {
          ...p,
          cardConfigs: p.cardConfigs.map((c) => {
            if (c.id !== configId) return c;
            return {
              ...c,
              entries: c.entries.map((e) =>
                e.id === entryId ? { ...e, ...updates } : e,
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
          updatedAt: new Date().toISOString(),
        };
      });
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    }),

  reorderCardEntries: (profileId, configId, fromIndex, toIndex) =>
    set((state) => {
      const profiles = state.profiles.map((p) => {
        if (p.id !== profileId) return p;
        return {
          ...p,
          cardConfigs: p.cardConfigs.map((c) => {
            if (c.id !== configId) return c;
            const entries = [...c.entries];
            const [moved] = entries.splice(fromIndex, 1);
            entries.splice(toIndex, 0, moved);
            return {
              ...c,
              entries: entries.map((e, i) => ({ ...e, order: i })),
              updatedAt: new Date().toISOString(),
            };
          }),
          updatedAt: new Date().toISOString(),
        };
      });
      saveToStorage(profiles, state.activeProfileId);
      return { profiles };
    }),
}));
