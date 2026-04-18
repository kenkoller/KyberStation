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
  | 'theme-picker'
  | 'gradient-builder'
  | 'my-crystal'
  // Dynamics tab
  | 'effect-triggers'
  | 'effect-config'
  | 'motion-simulation'
  | 'ignition-retraction'
  | 'gesture-config'
  | 'comparison-view'
  // Audio tab
  | 'font-library'
  | 'font-preview'
  | 'mixer-eq'
  | 'effect-presets'
  // NOTE: 'smoothswing-config' used to live here as a sibling panel. As of
  // the 2026-04-18 UX overhaul (item #15), SmoothSwing is a modulator
  // plate inside LayerStack instead. The legacy string is preserved in
  // renderPanel() so persisted layouts still find a friendly landing.
  // Gallery tab
  | 'gallery-browser'
  | 'builtin-presets'
  | 'my-presets'
  | 'community-gallery'
  | 'preset-detail'
  // Output tab
  | 'output-workflow'
  | 'code-output'
  | 'power-draw'
  | 'storage-budget'
  | 'saber-profiles'
  | 'card-writer'
  | 'flash-to-saber'
  | 'compatibility'
  | 'oled-editor';

export interface PanelDef {
  id: PanelId;
  label: string;
  description?: string;  // short subtitle explaining what the panel does
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
  // Primary — expanded by default
  { id: 'style-select',        label: 'Style Select',       description: 'Choose and customize your blade\'s visual style',         tab: 'design',   defaultColumn: 0, defaultOrder: 0, collapsible: false },
  { id: 'color-picker',        label: 'Color Picker',       description: 'Set colors for your blade, effects, and accents',         tab: 'design',   defaultColumn: 0, defaultOrder: 1, collapsible: true  },
  { id: 'ignition-retraction', label: 'Ignition/Retraction',description: 'How your blade powers on and off',                        tab: 'design',   defaultColumn: 1, defaultOrder: 0, collapsible: true  },
  // Secondary — collapsed by default (see DEFAULT_COLLAPSED_PANELS)
  { id: 'parameters',          label: 'Parameters',         description: 'Fine-tune shimmer, noise, motion response, and patterns', tab: 'design',   defaultColumn: 1, defaultOrder: 1, collapsible: true  },
  { id: 'layer-stack',         label: 'Layer Stack',        description: 'Composite multiple styles with blend modes',               tab: 'design',   defaultColumn: 2, defaultOrder: 0, collapsible: true  },
  { id: 'gradient-builder',    label: 'Gradient Builder',   description: 'Design multi-stop color gradients for your blade',         tab: 'design',   defaultColumn: 2, defaultOrder: 1, collapsible: true  },
  { id: 'randomizer',          label: 'Randomizer',         description: 'Generate random style combinations for inspiration',       tab: 'design',   defaultColumn: 3, defaultOrder: 0, collapsible: true  },
  { id: 'my-crystal',          label: 'My Crystal',         description: 'Live 3D kyber crystal reflecting this saber\'s config',    tab: 'design',   defaultColumn: 3, defaultOrder: 1, collapsible: true  },
  { id: 'oled-preview',        label: 'OLED Preview',       description: 'Preview the hilt OLED display for this style',             tab: 'design',   defaultColumn: 3, defaultOrder: 2, collapsible: true  },
  { id: 'theme-picker',        label: 'Theme Picker',       description: 'Change the canvas background and UI theme',                tab: 'design',   defaultColumn: 3, defaultOrder: 3, collapsible: true  },

  // ── Dynamics ──
  // Primary — expanded by default
  { id: 'effect-triggers',     label: 'Effect Triggers',    description: 'Trigger clash, blast, lockup, and other blade effects',    tab: 'dynamics', defaultColumn: 0, defaultOrder: 0, collapsible: false },
  { id: 'motion-simulation',   label: 'Motion Simulation',  description: 'Control swing, angle, and twist sensitivity',              tab: 'dynamics', defaultColumn: 1, defaultOrder: 0, collapsible: true  },
  { id: 'gesture-config',      label: 'Gesture Config',     description: 'Map physical gestures to blade actions',                   tab: 'dynamics', defaultColumn: 2, defaultOrder: 0, collapsible: true  },
  // Secondary — collapsed by default
  { id: 'effect-config',       label: 'Effect Config',      description: 'Adjust per-effect colors, durations, and behavior',        tab: 'dynamics', defaultColumn: 1, defaultOrder: 1, collapsible: true  },
  { id: 'comparison-view',     label: 'Comparison View',    description: 'Compare two styles or effects side by side',               tab: 'dynamics', defaultColumn: 3, defaultOrder: 0, collapsible: true  },

  // ── Audio ──
  // Primary — expanded by default
  { id: 'font-library',        label: 'Font Library',       description: 'Browse and load your sound font collection',               tab: 'audio',    defaultColumn: 0, defaultOrder: 0, collapsible: false },
  { id: 'font-preview',        label: 'Font Preview',       description: 'Preview and audition sound font effects',                  tab: 'audio',    defaultColumn: 1, defaultOrder: 0, collapsible: true  },
  // Secondary — collapsed by default
  { id: 'mixer-eq',            label: 'Mixer / EQ',         description: 'Shape your saber\'s audio with EQ and effects',            tab: 'audio',    defaultColumn: 2, defaultOrder: 0, collapsible: true  },
  { id: 'effect-presets',      label: 'Effect Presets',     description: 'One-click audio effect chains for common sounds',          tab: 'audio',    defaultColumn: 2, defaultOrder: 1, collapsible: true  },
  // SmoothSwing lives inside LayerStack as a modulator plate now \u2014
  // see the 'smoothswing' layer type in layerStore.ts and SmoothSwingPlate
  // in SmoothSwingPanel.tsx.

  // ── Gallery ──
  // Primary — single expanded gallery browser
  { id: 'gallery-browser',     label: 'Gallery Browser',    description: 'Browse built-in, custom, and community presets',           tab: 'gallery',  defaultColumn: 0, defaultOrder: 0, collapsible: false },
  // Secondary — collapsed by default
  { id: 'preset-detail',       label: 'Preset Detail',      description: 'View full metadata and variations for a preset',           tab: 'gallery',  defaultColumn: 2, defaultOrder: 0, collapsible: true  },

  // ── Output ──
  // Column 0: Workflow guide + Saber Profiles (workflow-first layout)
  { id: 'output-workflow',     label: 'Output Workflow',    description: 'Step-by-step guide to export your config',                 tab: 'output',   defaultColumn: 0, defaultOrder: 0, collapsible: true  },
  { id: 'saber-profiles',      label: 'Saber Profiles',     description: 'Manage saber identities and preset cards',                 tab: 'output',   defaultColumn: 0, defaultOrder: 1, collapsible: false },
  // Column 1: Code Output (expanded, primary)
  { id: 'code-output',         label: 'Code Output',        description: 'Generated ProffieOS C++ config code',                      tab: 'output',   defaultColumn: 1, defaultOrder: 0, collapsible: false },
  // Column 2: Storage Budget + Card Writer + Flash to Saber (the export + flash flow)
  { id: 'storage-budget',      label: 'Storage Budget',     description: 'Flash memory usage estimation',                            tab: 'output',   defaultColumn: 2, defaultOrder: 0, collapsible: true  },
  { id: 'card-writer',         label: 'Card Writer',        description: 'Export config and fonts to SD card',                       tab: 'output',   defaultColumn: 2, defaultOrder: 1, collapsible: true  },
  { id: 'flash-to-saber',      label: 'Flash to Saber',     description: 'Flash firmware over WebUSB (STM32 DFU)',                   tab: 'output',   defaultColumn: 2, defaultOrder: 2, collapsible: true  },
  // Column 3: Secondary / advanced panels (collapsed by default)
  { id: 'power-draw',          label: 'Power Draw',         description: 'Estimate battery consumption and LED power draw',          tab: 'output',   defaultColumn: 3, defaultOrder: 0, collapsible: true  },
  { id: 'compatibility',       label: 'Compatibility',      description: 'Board compatibility matrix for your config',               tab: 'output',   defaultColumn: 3, defaultOrder: 1, collapsible: true  },
  { id: 'oled-editor',         label: 'OLED Editor',        description: 'Design custom OLED display graphics',                      tab: 'output',   defaultColumn: 3, defaultOrder: 2, collapsible: true  },
];

// ─── Default Collapsed Panels ───────────────────────────────────────────────
//
// Panels that should start collapsed for first-time users to reduce
// information overload.  Users can expand any panel with a single click,
// and their preference is persisted to localStorage.

export const DEFAULT_COLLAPSED_PANELS: ReadonlySet<PanelId> = new Set<PanelId>([
  // Design — advanced / secondary
  'parameters',
  'layer-stack',
  'gradient-builder',
  'randomizer',
  'oled-preview',
  'theme-picker',
  // Dynamics — secondary
  'effect-config',
  'comparison-view',
  // Audio — secondary
  'mixer-eq',
  'effect-presets',
  // Gallery — secondary
  'preset-detail',
  // Output — secondary (power-draw, compatibility, oled-editor are advanced)
  'power-draw',
  'compatibility',
  'oled-editor',
]);

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

const STORAGE_KEY = 'kyberstation-layout';

interface PersistedState {
  columns: Record<string, PanelId[][]>;
  columnCount: number;
  collapsedPanels: PanelId[];
  savedPresets: LayoutPreset[];
  /** Per-tab column width ratios, e.g. { design: [1, 1.5, 0.8, 1] } */
  columnWidths: Record<string, number[]>;
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

/** Build the PersistedState snapshot from a LayoutStore state, with optional overrides. */
function buildPersisted(
  state: Pick<LayoutStore, 'columns' | 'columnCount' | 'collapsedPanels' | 'savedPresets' | 'columnWidths'>,
  overrides?: Partial<PersistedState>,
): PersistedState {
  return {
    columns: state.columns,
    columnCount: state.columnCount,
    collapsedPanels: Array.from(state.collapsedPanels),
    savedPresets: state.savedPresets,
    columnWidths: state.columnWidths,
    ...overrides,
  };
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

// When no persisted collapsed state exists, use the curated defaults so
// first-time users see a streamlined layout instead of every panel expanded.
const initialCollapsedPanels: Set<PanelId> = stored.collapsedPanels
  ? new Set<PanelId>(stored.collapsedPanels)
  : new Set<PanelId>(DEFAULT_COLLAPSED_PANELS);

const initialSavedPresets: LayoutPreset[] = stored.savedPresets ?? [];

const initialColumnWidths: Record<string, number[]> =
  stored.columnWidths && typeof stored.columnWidths === 'object'
    ? stored.columnWidths
    : {};

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
  /** Per-tab column width ratios (e.g. { design: [1, 1.5, 0.8, 1] }) */
  columnWidths: Record<string, number[]>;

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

  /** Restore the default column assignment and default collapsed state. */
  resetToDefaults: () => void;

  /** Persist the current layout under a user-supplied name. */
  savePreset: (name: string) => void;

  /** Apply a previously saved preset by its ID. */
  loadPreset: (id: string) => void;

  /** Delete a saved preset by its ID. */
  deletePreset: (id: string) => void;

  /** Set column width ratios for a tab (persisted to localStorage). */
  setColumnWidths: (tab: string, widths: number[]) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  columns: initialColumns,
  columnCount: initialColumnCount,
  collapsedPanels: initialCollapsedPanels,
  savedPresets: initialSavedPresets,
  columnWidths: initialColumnWidths,

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
      saveToStorage(buildPersisted(state, { columns: next }));
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

      saveToStorage(buildPersisted(state, { columns: next }));
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
      saveToStorage(buildPersisted(state, { collapsedPanels: Array.from(next) }));
      return { collapsedPanels: next };
    });
  },

  // ── Column count ─────────────────────────────────────────────────────────

  setColumnCount: (count) => {
    const clamped = Math.max(1, Math.min(4, count));
    set((state) => {
      saveToStorage(buildPersisted(state, { columnCount: clamped }));
      return { columnCount: clamped };
    });
  },

  // ── Reset ─────────────────────────────────────────────────────────────────

  resetToDefaults: () => {
    const defaultColumns = cloneColumns(DEFAULT_COLUMN_ASSIGNMENT);
    const defaultCollapsed = new Set<PanelId>(DEFAULT_COLLAPSED_PANELS);
    set((state) => {
      saveToStorage(buildPersisted(state, {
        columns: defaultColumns,
        columnCount: 4,
        collapsedPanels: Array.from(defaultCollapsed),
        columnWidths: {},
      }));
      return {
        columns: defaultColumns,
        columnCount: 4,
        collapsedPanels: defaultCollapsed,
        columnWidths: {},
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
      saveToStorage(buildPersisted(state, { savedPresets: nextPresets }));
      return { savedPresets: nextPresets };
    });
  },

  loadPreset: (id) => {
    const preset = get().savedPresets.find((p) => p.id === id);
    if (!preset) return;
    const nextColumns = cloneColumns(preset.columns);
    set((state) => {
      saveToStorage(buildPersisted(state, { columns: nextColumns }));
      return { columns: nextColumns };
    });
  },

  deletePreset: (id) => {
    set((state) => {
      const nextPresets = state.savedPresets.filter((p) => p.id !== id);
      saveToStorage(buildPersisted(state, { savedPresets: nextPresets }));
      return { savedPresets: nextPresets };
    });
  },

  // ── Column widths ───────────────────────────────────────────────────────

  setColumnWidths: (tab, widths) => {
    set((state) => {
      const nextWidths = { ...state.columnWidths, [tab]: widths };
      saveToStorage(buildPersisted(state, { columnWidths: nextWidths }));
      return { columnWidths: nextWidths };
    });
  },
}));
