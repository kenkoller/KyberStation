import { create } from 'zustand';

/** Lightweight UUID helper — uses the browser / Node built-in. */
function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments where crypto.randomUUID is unavailable
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type TabId = 'design' | 'dynamics' | 'audio' | 'gallery' | 'output';

export type PanelId =
  // Design tab
  | 'style-select'
  | 'color-picker'
  | 'parameters'
  | 'randomizer'
  | 'layer-stack'
  | 'oled-preview'
  // Dynamics tab
  | 'effect-triggers'
  | 'effect-config'
  | 'motion-simulation'
  | 'ignition-retraction'
  // Audio tab
  | 'font-library'
  | 'font-preview'
  | 'mixer-eq'
  | 'smoothswing-config'
  // Gallery tab
  | 'builtin-presets'
  | 'my-presets'
  | 'community-gallery'
  | 'preset-detail'
  // Output tab
  | 'code-output'
  | 'power-draw'
  | 'storage-budget'
  | 'saber-profiles'
  | 'card-writer';

export interface PanelDef {
  id: PanelId;
  label: string;
  tab: TabId;
  defaultColumn: number; // 0-based, 0–3
  defaultOrder: number;  // sort order within column
  minWidth?: number;     // minimum column width in px, if any
  collapsible: boolean;
}

/**
 * Per-tab column layout.
 * Outer array index = tab, inner array index = column (0–3),
 * innermost array = ordered panel IDs in that column.
 */
export type ColumnAssignment = Record<TabId, PanelId[][]>;

export interface LayoutPreset {
  id: string;
  name: string;
  createdAt: number;
  columns: ColumnAssignment;
}

// ─── Panel Definitions ───────────────────────────────────────────────────────

export const PANEL_DEFINITIONS: PanelDef[] = [
  // ── Design ──
  { id: 'style-select',        label: 'Style Select',       tab: 'design',   defaultColumn: 0, defaultOrder: 0, collapsible: false },
  { id: 'color-picker',        label: 'Color Picker',       tab: 'design',   defaultColumn: 0, defaultOrder: 1, collapsible: true  },
  { id: 'parameters',          label: 'Parameters',         tab: 'design',   defaultColumn: 1, defaultOrder: 0, collapsible: true  },
  { id: 'randomizer',          label: 'Randomizer',         tab: 'design',   defaultColumn: 1, defaultOrder: 1, collapsible: true  },
  { id: 'layer-stack',         label: 'Layer Stack',        tab: 'design',   defaultColumn: 2, defaultOrder: 0, collapsible: true  },
  { id: 'oled-preview',        label: 'OLED Preview',       tab: 'design',   defaultColumn: 3, defaultOrder: 0, collapsible: true  },

  // ── Dynamics ──
  { id: 'effect-triggers',     label: 'Effect Triggers',    tab: 'dynamics', defaultColumn: 0, defaultOrder: 0, collapsible: false },
  { id: 'effect-config',       label: 'Effect Config',      tab: 'dynamics', defaultColumn: 1, defaultOrder: 0, collapsible: true  },
  { id: 'motion-simulation',   label: 'Motion Simulation',  tab: 'dynamics', defaultColumn: 2, defaultOrder: 0, collapsible: true  },
  { id: 'ignition-retraction', label: 'Ignition/Retraction',tab: 'dynamics', defaultColumn: 3, defaultOrder: 0, collapsible: true  },

  // ── Audio ──
  { id: 'font-library',        label: 'Font Library',       tab: 'audio',    defaultColumn: 0, defaultOrder: 0, collapsible: false },
  { id: 'font-preview',        label: 'Font Preview',       tab: 'audio',    defaultColumn: 1, defaultOrder: 0, collapsible: true  },
  { id: 'mixer-eq',            label: 'Mixer / EQ',         tab: 'audio',    defaultColumn: 2, defaultOrder: 0, collapsible: true  },
  { id: 'smoothswing-config',  label: 'SmoothSwing Config', tab: 'audio',    defaultColumn: 3, defaultOrder: 0, collapsible: true  },

  // ── Gallery ──
  { id: 'builtin-presets',     label: 'Built-in Presets',   tab: 'gallery',  defaultColumn: 0, defaultOrder: 0, collapsible: false },
  { id: 'my-presets',          label: 'My Presets',         tab: 'gallery',  defaultColumn: 1, defaultOrder: 0, collapsible: true  },
  { id: 'community-gallery',   label: 'Community Gallery',  tab: 'gallery',  defaultColumn: 2, defaultOrder: 0, collapsible: true  },
  { id: 'preset-detail',       label: 'Preset Detail',      tab: 'gallery',  defaultColumn: 3, defaultOrder: 0, collapsible: true  },

  // ── Output ──
  { id: 'code-output',         label: 'Code Output',        tab: 'output',   defaultColumn: 0, defaultOrder: 0, collapsible: false },
  { id: 'power-draw',          label: 'Power Draw',         tab: 'output',   defaultColumn: 1, defaultOrder: 0, collapsible: true  },
  { id: 'storage-budget',      label: 'Storage Budget',     tab: 'output',   defaultColumn: 1, defaultOrder: 1, collapsible: true  },
  { id: 'saber-profiles',      label: 'Saber Profiles',     tab: 'output',   defaultColumn: 2, defaultOrder: 0, collapsible: true  },
  { id: 'card-writer',         label: 'Card Writer',        tab: 'output',   defaultColumn: 3, defaultOrder: 0, collapsible: true  },
];

// ─── Default Column Assignment ───────────────────────────────────────────────

function buildDefaultAssignment(): ColumnAssignment {
  const tabs: TabId[] = ['design', 'dynamics', 'audio', 'gallery', 'output'];

  // Initialise 4 empty columns per tab
  const assignment = Object.fromEntries(
    tabs.map((tab) => [tab, [[], [], [], []] as PanelId[][]]),
  ) as ColumnAssignment;

  // Sort definitions so defaultOrder is respected when inserting
  const sorted = [...PANEL_DEFINITIONS].sort((a, b) => a.defaultOrder - b.defaultOrder);

  for (const def of sorted) {
    assignment[def.tab][def.defaultColumn].push(def.id);
  }

  return assignment;
}

export const DEFAULT_COLUMN_ASSIGNMENT: ColumnAssignment = buildDefaultAssignment();

// ─── Persistence helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = 'bladeforge-layout';

interface PersistedState {
  columns: Record<string, PanelId[][]>;
  columnCount: number;
  collapsedPanels: PanelId[];
  savedPresets: LayoutPreset[];
}

function loadFromStorage(): Partial<PersistedState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Partial<PersistedState>;
  } catch { /* ignore parse / SSR errors */ }
  return {};
}

function saveToStorage(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore quota / SSR errors */ }
}

/** Deep-clone a ColumnAssignment so mutations don't affect the source. */
function cloneColumns(src: ColumnAssignment): ColumnAssignment {
  return Object.fromEntries(
    Object.entries(src).map(([tab, cols]) => [tab, cols.map((col) => [...col])]),
  ) as ColumnAssignment;
}

/** Validate that a persisted column assignment has every expected tab. */
function isValidPersistedColumns(
  value: Record<string, PanelId[][]> | undefined,
): value is Record<TabId, PanelId[][]> {
  if (!value) return false;
  const requiredTabs: TabId[] = ['design', 'dynamics', 'audio', 'gallery', 'output'];
  return requiredTabs.every(
    (tab) => Array.isArray(value[tab]) && value[tab].length >= 1,
  );
}

// ─── Hydrate initial state from storage ──────────────────────────────────────

const stored = loadFromStorage();

const initialColumns: ColumnAssignment = isValidPersistedColumns(stored.columns)
  ? (stored.columns as ColumnAssignment)
  : cloneColumns(DEFAULT_COLUMN_ASSIGNMENT);

const initialColumnCount: number =
  typeof stored.columnCount === 'number' && stored.columnCount >= 1 && stored.columnCount <= 4
    ? stored.columnCount
    : 4;

const initialCollapsedPanels: Set<PanelId> = stored.collapsedPanels
  ? new Set<PanelId>(stored.collapsedPanels)
  : new Set<PanelId>();

const initialSavedPresets: LayoutPreset[] = stored.savedPresets ?? [];

// ─── Store interface ──────────────────────────────────────────────────────────

export interface LayoutStore {
  /** Current column assignment across all tabs */
  columns: ColumnAssignment;
  /** Active column count (1–4); driven by breakpoint but user-overrideable */
  columnCount: number;
  /** Panels the user has collapsed */
  collapsedPanels: Set<PanelId>;
  /** Named layout presets saved by the user */
  savedPresets: LayoutPreset[];

  /**
   * Move a panel to a specific column and position within that column.
   * Removes the panel from wherever it currently lives first.
   */
  movePanelToColumn: (
    tab: TabId,
    panelId: PanelId,
    targetColumn: number,
    targetIndex: number,
  ) => void;

  /**
   * Reorder a panel within its current column by dragging from one index to
   * another.
   */
  reorderPanelInColumn: (
    tab: TabId,
    column: number,
    fromIndex: number,
    toIndex: number,
  ) => void;

  /** Expand a collapsed panel or collapse an expanded one. */
  togglePanelCollapsed: (panelId: PanelId) => void;

  /** Set the number of visible columns (1–4). */
  setColumnCount: (count: number) => void;

  /** Restore the default column assignment and clear collapsed state. */
  resetToDefaults: () => void;

  /** Persist the current layout under a user-supplied name. */
  savePreset: (name: string) => void;

  /** Apply a previously saved preset by its ID. */
  loadPreset: (id: string) => void;

  /** Delete a saved preset by its ID. */
  deletePreset: (id: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  columns: initialColumns,
  columnCount: initialColumnCount,
  collapsedPanels: initialCollapsedPanels,
  savedPresets: initialSavedPresets,

  // ── Panel movement ────────────────────────────────────────────────────────

  movePanelToColumn: (tab, panelId, targetColumn, targetIndex) => {
    set((state) => {
      const next = cloneColumns(state.columns);
      const tabCols = next[tab];

      // Remove the panel from whatever column it currently occupies
      for (let c = 0; c < tabCols.length; c++) {
        tabCols[c] = tabCols[c].filter((id) => id !== panelId);
      }

      // Ensure the target column array exists
      while (tabCols.length <= targetColumn) {
        tabCols.push([]);
      }

      // Insert at the requested position (clamped to valid range)
      const col = tabCols[targetColumn];
      const insertAt = Math.max(0, Math.min(targetIndex, col.length));
      col.splice(insertAt, 0, panelId);

      const nextState = { columns: next };
      saveToStorage({
        columns: next,
        columnCount: state.columnCount,
        collapsedPanels: Array.from(state.collapsedPanels),
        savedPresets: state.savedPresets,
      });
      return nextState;
    });
  },

  reorderPanelInColumn: (tab, column, fromIndex, toIndex) => {
    set((state) => {
      const next = cloneColumns(state.columns);
      const col = next[tab][column];

      if (
        fromIndex < 0 ||
        fromIndex >= col.length ||
        toIndex < 0 ||
        toIndex >= col.length ||
        fromIndex === toIndex
      ) {
        return state; // no-op — nothing to reorder
      }

      const [moved] = col.splice(fromIndex, 1);
      col.splice(toIndex, 0, moved);

      saveToStorage({
        columns: next,
        columnCount: state.columnCount,
        collapsedPanels: Array.from(state.collapsedPanels),
        savedPresets: state.savedPresets,
      });
      return { columns: next };
    });
  },

  // ── Collapsed state ───────────────────────────────────────────────────────

  togglePanelCollapsed: (panelId) => {
    set((state) => {
      const next = new Set(state.collapsedPanels);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      saveToStorage({
        columns: state.columns,
        columnCount: state.columnCount,
        collapsedPanels: Array.from(next),
        savedPresets: state.savedPresets,
      });
      return { collapsedPanels: next };
    });
  },

  // ── Column count ─────────────────────────────────────────────────────────

  setColumnCount: (count) => {
    const clamped = Math.max(1, Math.min(4, count));
    set((state) => {
      saveToStorage({
        columns: state.columns,
        columnCount: clamped,
        collapsedPanels: Array.from(state.collapsedPanels),
        savedPresets: state.savedPresets,
      });
      return { columnCount: clamped };
    });
  },

  // ── Reset ─────────────────────────────────────────────────────────────────

  resetToDefaults: () => {
    const defaultColumns = cloneColumns(DEFAULT_COLUMN_ASSIGNMENT);
    const emptyCollapsed = new Set<PanelId>();
    set((state) => {
      saveToStorage({
        columns: defaultColumns,
        columnCount: 4,
        collapsedPanels: [],
        savedPresets: state.savedPresets,
      });
      return {
        columns: defaultColumns,
        columnCount: 4,
        collapsedPanels: emptyCollapsed,
      };
    });
  },

  // ── Presets ───────────────────────────────────────────────────────────────

  savePreset: (name) => {
    set((state) => {
      const preset: LayoutPreset = {
        id: uid(),
        name: name.trim() || 'My Layout',
        createdAt: Date.now(),
        columns: cloneColumns(state.columns),
      };
      const nextPresets = [...state.savedPresets, preset];
      saveToStorage({
        columns: state.columns,
        columnCount: state.columnCount,
        collapsedPanels: Array.from(state.collapsedPanels),
        savedPresets: nextPresets,
      });
      return { savedPresets: nextPresets };
    });
  },

  loadPreset: (id) => {
    const preset = get().savedPresets.find((p) => p.id === id);
    if (!preset) return;
    const nextColumns = cloneColumns(preset.columns);
    set((state) => {
      saveToStorage({
        columns: nextColumns,
        columnCount: state.columnCount,
        collapsedPanels: Array.from(state.collapsedPanels),
        savedPresets: state.savedPresets,
      });
      return { columns: nextColumns };
    });
  },

  deletePreset: (id) => {
    set((state) => {
      const nextPresets = state.savedPresets.filter((p) => p.id !== id);
      saveToStorage({
        columns: state.columns,
        columnCount: state.columnCount,
        collapsedPanels: Array.from(state.collapsedPanels),
        savedPresets: nextPresets,
      });
      return { savedPresets: nextPresets };
    });
  },
}));
