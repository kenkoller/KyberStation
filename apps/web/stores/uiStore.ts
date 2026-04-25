import { create } from 'zustand';
import type { VisualizationLayerId } from '@/lib/visualizationTypes';

export type ViewMode = 'blade' | 'angle' | 'strip' | 'cross' | 'uv-unwrap';
export type RenderMode = 'photorealistic' | 'pixel';
export type CanvasMode = '2d' | '3d';
// OV6 (2026-04-21): 5 → 4 tabs. Dynamics was absorbed into Design per
// UI_OVERHAUL_v2_PROPOSAL §1. Persisted state referencing 'dynamics' is
// remapped to 'design' at load time by the layoutStore migration.
export type ActiveTab = 'gallery' | 'design' | 'audio' | 'output';
export type LayoutMode = 'sidebar' | 'horizontal';
export type FullscreenOrientation = 'horizontal' | 'vertical';

// ─── Left-rail overhaul (v0.14.0) ────────────────────────────────────────────
// New unified section taxonomy for the left sidebar nav. Replaces the
// `activeTab` mode switch when `useNewLayout` is on. Each ID maps to one
// component slot in MainContent. Dual-mounted behind the `useNewLayout`
// flag during PR 1 so the existing tabbed layout keeps working.

export type SectionId =
  // Design — Appearance
  | 'blade-style'
  | 'color'
  // Design — Behavior
  | 'ignition-retraction'
  | 'combat-effects'
  | 'gesture-controls'
  // Design — Advanced
  | 'layer-compositor'
  | 'hardware'
  | 'my-crystal'
  // Design — Routing (BETA, board-gated at the sidebar level)
  | 'routing'
  // Top-level destinations
  | 'audio'
  | 'output';

export type SidebarGroupId =
  | 'appearance'
  | 'behavior'
  | 'advanced'
  | 'routing'
  | 'audio'
  | 'output';

export interface UIStore {
  viewMode: ViewMode;
  renderMode: RenderMode;
  canvasMode: CanvasMode;
  activeTab: ActiveTab;
  brightness: number;
  showHUD: boolean;
  canvasTheme: string;
  showEffectComparison: boolean;
  /** Which color channel is actively being edited in ColorPanel */
  activeColorChannel: string;
  /** Analyze mode shows pixel strip + RGB graph; clean mode hides them for cinematic view */
  analyzeMode: boolean;
  /** Vertical canvas panel width ratios — blade, pixel strip, RGB graph (sum to 1.0) */
  verticalPanelWidths: { blade: number; strip: number; graph: number };

  // ── Layout & Panel Visibility ──
  /** Sidebar width in pixels (resizable via drag handle) */
  sidebarWidth: number;
  /** Show/hide the hilt graphic in the blade panel */
  showHilt: boolean;
  /** Show/hide the measurement-inch ruler + grid behind the blade. Phase 1.5. */
  showGrid: boolean;
  /** Individual panel visibility toggles */
  showBladePanel: boolean;
  showPixelPanel: boolean;
  /** Engine tick pause — freezes blade state simulation. Set together
   *  with `isPaused` by PauseButton; partial-pause mode sets this to
   *  false so the realistic blade keeps rendering. */
  animationPaused: boolean;
  /** Global pause switch — freezes every RAF in the app that honors
   *  `{ enabled: !isPaused }` plus CSS motion (via usePauseSystem). */
  isPaused: boolean;
  /**
   * W5 (2026-04-22): pause scope.
   *   'full'    — everything frozen (analysis + pixel strip + blade
   *               canvas + CSS + engine ticks). Default.
   *   'partial' — everything frozen EXCEPT the realistic blade canvas
   *               and its engine ticks. Pixel strip + LED readouts +
   *               analysis rail + expanded slot all freeze; the blade
   *               preview keeps rendering so the user can stage a
   *               moment and still see the saber alive.
   * The field is only meaningful when `isPaused` is true.
   */
  pauseScope: 'full' | 'partial';
  /** Battery preset index for power draw estimation */
  batteryPresetIdx: number;
  /** Per-tab section ordering — maps tab → ordered array of section IDs */
  sectionOrder: Partial<Record<ActiveTab, string[]>>;
  /** Layout mode — sidebar (vertical blade, side tabs) or horizontal (blade on top, tabs below) */
  layoutMode: LayoutMode;
  /** Custom tab order for desktop tab bar (empty = default order) */
  tabOrder: string[];
  /** Fullscreen preview mode — blade takes over entire viewport */
  isFullscreen: boolean;
  /** Orientation of the blade in fullscreen preview */
  fullscreenOrientation: FullscreenOrientation;
  /**
   * Edit Mode — when true, clicking the blade canvas places an effect's
   * spatial position (see `editTarget`) and the Fett263 Edit Mode define
   * wraps emitted code in RgbArg/IntArg argument templates. Unified flag
   * shared by canvas, output panel, and any future direct-manipulation
   * surfaces.
   */
  editMode: boolean;
  /**
   * Which effect Edit Mode clicks place. When `editMode` is false this is
   * ignored. Added in v0.3.0 for spatial blast alongside lockup.
   */
  editTarget: 'lockup' | 'blast';

  /**
   * Hot-mod hover identity — the id of the modulator row the user is
   * currently hovering or has focused in the LayerStack. Downstream
   * parameter renderers may read this to faintly tint themselves in the
   * modulator's identity color, giving a "show me what this mod drives"
   * affordance (§7 North Star modulatorHoverHighlight).
   *
   * `null` when nothing is hovered. A proper routing lookup (param ↔ mod)
   * lands with the v1.1 modulation-routing scaffold; for W6b the store
   * slice is the seam consumers bind against today.
   */
  hoveredModulatorId: string | null;

  /**
   * Click-to-route "armed" modulator — v1.0 modulation Preview.
   *
   * When a user clicks a modulator plate, it gets "armed": the next
   * click on a numeric parameter scrub field creates a binding from
   * that modulator to that parameter. Only one modulator can be armed
   * at a time. Escape key globally disarms.
   *
   * Separate from `hoveredModulatorId` (transient hover glow) and from
   * `layerStore.selectedLayerId` (the layer-config panel's selection).
   */
  armedModulatorId: string | null;

  /**
   * OV8 — STATE-mode takeover. When true AND activeTab === 'design',
   * the center blade preview is replaced by a full-width 9-state
   * vertical stack of captureStateFrame snapshots. Desktop only.
   * Toggled via `[ SINGLE BLADE ] · [ ALL STATES ]` chip + ⌘5.
   */
  showStateGrid: boolean;

  /**
   * Which AnalysisRail layer is "expanded" below the pixel strip.
   * Defaults to `rgb-luma` on first load so the vertically-stacked
   * blade preview / pixel strip / detail graph reads like the prior
   * layout. `null` collapses the slot entirely, giving that vertical
   * space back to the blade. Post-OV11 (2026-04-21): replaces the
   * former AnalysisExpandOverlay full-screen portal.
   */
  expandedAnalysisLayerId: VisualizationLayerId | null;

  // ── OV11: drag-to-resize seams ──
  // Each is clamped to [min, max] with a default that the handle
  // resets to on double-click. Persist across reloads via
  // localStorage (kyberstation-ui-layout).
  /** AnalysisRail column width in CSS pixels. Default 200. */
  analysisRailWidth: number;
  /** Inspector column width in CSS pixels. Default 400. */
  inspectorWidth: number;
  /** Section 2 (blade + viz row) height in CSS pixels. Default 320. */
  section2Height: number;
  /** PerformanceBar total height in CSS pixels. Default 158. */
  performanceBarHeight: number;
  // ── Left-rail overhaul (v0.14.0) ──
  /**
   * Master flag for the new sidebar layout. When true, WorkbenchLayout
   * renders `[Sidebar | MainContent]` in place of the multi-column tabbed
   * panel area, and the header's page-tabs nav is hidden. When false (the
   * default during PR 1), the existing layout is unchanged.
   *
   * Persisted to localStorage so testing the flag survives reload.
   */
  useNewLayout: boolean;
  /** Which sidebar section is selected. Default 'blade-style'. */
  activeSection: SectionId;
  /** Per-group collapse state for the sidebar. Default: all expanded. */
  sidebarGroupCollapsed: Record<SidebarGroupId, boolean>;

  /** W2: Pixel strip panel height in CSS pixels. Draggable 24-300 (Phase 1.5g bumped from 120). Default 36. */
  pixelStripHeight: number;
  /** W2: ExpandedAnalysisSlot height in CSS pixels. Draggable 40-400 (Phase 1.5i bumped from 240). Default 110. */
  expandedSlotHeight: number;
  /**
   * Phase 1.5f: "Point A" divider as fraction-of-container-width × 1000.
   * 180 → 0.18 → hilt zone is leftmost 18% of the BLADE PREVIEW panel.
   * Shared by BladeCanvas (hilt+blade positioning), PixelStripPanel
   * (LED 0 left edge), and VisualizationStack (waveform start X).
   */
  bladeStartFrac: number;
  /**
   * W4 (2026-04-22): which effects appear as chips in the action bar,
   * in render order. The dropdown next to the chips lets users toggle
   * individual effects in/out + offers a "Show all" that pins every
   * known effect. Empty array = no effects visible (IGNITE alone).
   * Default matches the pre-W4 shipped set: clash, blast, lockup, stab.
   */
  pinnedEffects: string[];

  setViewMode: (mode: ViewMode) => void;
  setRenderMode: (mode: RenderMode) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setBrightness: (brightness: number) => void;
  toggleHUD: () => void;
  setCanvasTheme: (theme: string) => void;
  toggleEffectComparison: () => void;
  setActiveColorChannel: (channel: string) => void;
  toggleAnalyzeMode: () => void;
  setVerticalPanelWidths: (widths: { blade: number; strip: number; graph: number }) => void;
  setSidebarWidth: (width: number) => void;
  toggleShowHilt: () => void;
  toggleShowGrid: () => void;
  toggleBladePanel: () => void;
  togglePixelPanel: () => void;
  toggleAnimationPaused: () => void;
  togglePause: (scope?: 'full' | 'partial') => void;
  setPaused: (paused: boolean, scope?: 'full' | 'partial') => void;
  setBatteryPresetIdx: (idx: number) => void;
  setSectionOrder: (tab: ActiveTab, order: string[]) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setTabOrder: (order: string[]) => void;
  toggleFullscreen: () => void;
  setFullscreenOrientation: (o: FullscreenOrientation) => void;
  setEditMode: (on: boolean) => void;
  toggleEditMode: () => void;
  setEditTarget: (target: 'lockup' | 'blast') => void;
  setHoveredModulator: (id: string | null) => void;
  setArmedModulatorId: (id: string | null) => void;
  toggleStateGrid: () => void;
  setShowStateGrid: (on: boolean) => void;
  setExpandedAnalysisLayerId: (id: VisualizationLayerId | null) => void;

  // ── OV11 setters ──
  setAnalysisRailWidth: (w: number) => void;
  setInspectorWidth: (w: number) => void;
  setSection2Height: (h: number) => void;
  setPerformanceBarHeight: (h: number) => void;
  setPixelStripHeight: (h: number) => void;
  setExpandedSlotHeight: (h: number) => void;
  setBladeStartFrac: (n: number) => void;
  setPinnedEffects: (effects: string[]) => void;
  togglePinnedEffect: (effect: string) => void;

  // ── Left-rail overhaul setters ──
  setUseNewLayout: (on: boolean) => void;
  toggleUseNewLayout: () => void;
  setActiveSection: (section: SectionId) => void;
  toggleSidebarGroup: (group: SidebarGroupId) => void;
}

// ─── OV11: resizable-region persistence ──────────────────────────────────────
//
// Constraints exported so the handles + layout can share one source
// of truth for min/max/default. These are intentionally wide ranges —
// the idea is to let power users tune the cockpit, with sensible
// fallbacks only if someone drags extreme.

export const REGION_LIMITS = {
  analysisRailWidth: { min: 140, max: 320, default: 200 },
  inspectorWidth:    { min: 280, max: 520, default: 400 },
  section2Height:    { min: 220, max: 520, default: 320 },
  performanceBarHeight: { min: 48, max: 200, default: 64 },
  pixelStripHeight:  { min: 24, max: 300, default: 36 },
  expandedSlotHeight:{ min: 40, max: 400, default: 110 },
  /**
   * Phase 1.5f: user-draggable Point A — the vertical divider inside
   * the BLADE PREVIEW panel that defines where the blade, pixel strip
   * and analysis-rail content all start. Expressed as a FRACTION of
   * the panel's container width × 1000 so the ResizeHandle integer
   * API (int min/max/default) can represent it without precision
   * loss. 180 → 0.18 → hilt zone spans the leftmost 18% of the
   * panel, blade + strip + waveform all render to the right of it.
   */
  bladeStartFrac:    { min: 80, max: 350, default: 180 },
} as const;

const OV11_STORAGE_KEY = 'kyberstation-ui-layout';

interface PersistedLayout {
  analysisRailWidth: number;
  inspectorWidth: number;
  section2Height: number;
  performanceBarHeight: number;
  pixelStripHeight: number;
  expandedSlotHeight: number;
  bladeStartFrac: number;
}

function clampRegion(
  key: keyof typeof REGION_LIMITS,
  value: number,
): number {
  const { min, max, default: def } = REGION_LIMITS[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return def;
  return Math.min(max, Math.max(min, value));
}

function loadPersistedLayout(): Partial<PersistedLayout> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(OV11_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedLayout>;
  } catch {
    return {};
  }
}

function savePersistedLayout(snap: PersistedLayout): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(OV11_STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore quota / SSR errors */
  }
}

const storedLayout = loadPersistedLayout();

const PINNED_EFFECTS_STORAGE_KEY = 'kyberstation-pinned-effects';

function loadPinnedEffects(): string[] | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(PINNED_EFFECTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return null;
  }
}

function savePinnedEffects(effects: string[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PINNED_EFFECTS_STORAGE_KEY, JSON.stringify(effects));
  } catch {
    /* ignore */
  }
}

// ─── Left-rail overhaul persistence (v0.14.0) ────────────────────────────────

const NEW_LAYOUT_STORAGE_KEY = 'kyberstation-use-new-layout';
const ACTIVE_SECTION_STORAGE_KEY = 'kyberstation-active-section';
const SIDEBAR_COLLAPSE_STORAGE_KEY = 'kyberstation-sidebar-collapse';

const VALID_SECTION_IDS: ReadonlyArray<SectionId> = [
  'blade-style', 'color',
  'ignition-retraction', 'combat-effects', 'gesture-controls',
  'layer-compositor', 'hardware', 'my-crystal',
  'routing',
  'audio', 'output',
];

const DEFAULT_SIDEBAR_COLLAPSE: Record<SidebarGroupId, boolean> = {
  appearance: false,
  behavior: false,
  advanced: false,
  routing: false,
  audio: true,
  output: true,
};

function loadUseNewLayout(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(NEW_LAYOUT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveUseNewLayout(on: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(NEW_LAYOUT_STORAGE_KEY, on ? 'true' : 'false');
  } catch { /* ignore */ }
}

function loadActiveSection(): SectionId {
  try {
    if (typeof localStorage === 'undefined') return 'blade-style';
    const raw = localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
    if (raw && VALID_SECTION_IDS.includes(raw as SectionId)) return raw as SectionId;
    return 'blade-style';
  } catch {
    return 'blade-style';
  }
}

function saveActiveSection(s: SectionId): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, s);
  } catch { /* ignore */ }
}

function loadSidebarCollapse(): Record<SidebarGroupId, boolean> {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SIDEBAR_COLLAPSE };
    const raw = localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SIDEBAR_COLLAPSE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SIDEBAR_COLLAPSE, ...parsed };
  } catch {
    return { ...DEFAULT_SIDEBAR_COLLAPSE };
  }
}

function saveSidebarCollapse(c: Record<SidebarGroupId, boolean>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, JSON.stringify(c));
  } catch { /* ignore */ }
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'blade',
  renderMode: 'photorealistic',
  canvasMode: '2d',
  activeTab: 'design',
  brightness: 100,
  showHUD: true,
  canvasTheme: 'deep-space',
  showEffectComparison: false,
  activeColorChannel: 'baseColor',
  analyzeMode: true,
  verticalPanelWidths: { blade: 0.50, strip: 0.12, graph: 0.38 },

  // Layout defaults
  sidebarWidth: 380,
  showHilt: true,
  showGrid: true,
  showBladePanel: true,
  showPixelPanel: true,
  animationPaused: false,
  isPaused: false,
  pauseScope: 'full' as const,
  batteryPresetIdx: 0,
  sectionOrder: {},
  layoutMode: 'sidebar',
  tabOrder: [],
  isFullscreen: false,
  fullscreenOrientation: 'horizontal',
  editMode: false,
  editTarget: 'lockup',
  hoveredModulatorId: null,
  armedModulatorId: null,
  showStateGrid: false,
  expandedAnalysisLayerId: 'rgb-luma',
  analysisRailWidth: clampRegion(
    'analysisRailWidth',
    storedLayout.analysisRailWidth ?? REGION_LIMITS.analysisRailWidth.default,
  ),
  inspectorWidth: clampRegion(
    'inspectorWidth',
    storedLayout.inspectorWidth ?? REGION_LIMITS.inspectorWidth.default,
  ),
  section2Height: clampRegion(
    'section2Height',
    storedLayout.section2Height ?? REGION_LIMITS.section2Height.default,
  ),
  performanceBarHeight: clampRegion(
    'performanceBarHeight',
    storedLayout.performanceBarHeight ?? REGION_LIMITS.performanceBarHeight.default,
  ),
  pixelStripHeight: clampRegion(
    'pixelStripHeight',
    storedLayout.pixelStripHeight ?? REGION_LIMITS.pixelStripHeight.default,
  ),
  expandedSlotHeight: clampRegion(
    'expandedSlotHeight',
    storedLayout.expandedSlotHeight ?? REGION_LIMITS.expandedSlotHeight.default,
  ),
  bladeStartFrac: clampRegion(
    'bladeStartFrac',
    storedLayout.bladeStartFrac ?? REGION_LIMITS.bladeStartFrac.default,
  ),
  pinnedEffects: loadPinnedEffects() ?? ['clash', 'blast', 'lockup', 'stab'],

  // ── Left-rail overhaul defaults ──
  useNewLayout: loadUseNewLayout(),
  activeSection: loadActiveSection(),
  sidebarGroupCollapsed: loadSidebarCollapse(),

  setViewMode: (viewMode) => set({ viewMode }),
  setRenderMode: (renderMode) => set({ renderMode }),
  setCanvasMode: (canvasMode) => set({ canvasMode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setBrightness: (brightness) => set({ brightness }),
  toggleHUD: () => set((state) => ({ showHUD: !state.showHUD })),
  setCanvasTheme: (canvasTheme) => set({ canvasTheme }),
  toggleEffectComparison: () => set((state) => ({ showEffectComparison: !state.showEffectComparison })),
  setActiveColorChannel: (activeColorChannel) => set({ activeColorChannel }),
  toggleAnalyzeMode: () => set((state) => ({ analyzeMode: !state.analyzeMode })),
  setVerticalPanelWidths: (verticalPanelWidths) => set({ verticalPanelWidths }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth: Math.max(280, Math.min(600, sidebarWidth)) }),
  toggleShowHilt: () => set((state) => ({ showHilt: !state.showHilt })),
  toggleShowGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleBladePanel: () => set((state) => ({ showBladePanel: !state.showBladePanel })),
  togglePixelPanel: () => set((state) => ({ showPixelPanel: !state.showPixelPanel })),
  toggleAnimationPaused: () => set((state) => ({ animationPaused: !state.animationPaused })),
  togglePause: (scope = 'full') =>
    set((state) => {
      const next = !state.isPaused;
      // When pausing, set the engine flag to match the scope.
      // When un-pausing, always re-enable the engine.
      return {
        isPaused: next,
        pauseScope: scope,
        animationPaused: next ? scope === 'full' : false,
      };
    }),
  setPaused: (isPaused, scope = 'full') =>
    set({
      isPaused,
      pauseScope: scope,
      animationPaused: isPaused ? scope === 'full' : false,
    }),
  setBatteryPresetIdx: (batteryPresetIdx) => set({ batteryPresetIdx }),
  setSectionOrder: (tab, order) => set((state) => ({
    sectionOrder: { ...state.sectionOrder, [tab]: order },
  })),
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setTabOrder: (tabOrder) => set({ tabOrder }),
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
  setFullscreenOrientation: (fullscreenOrientation) => set({ fullscreenOrientation }),
  setEditMode: (editMode) => set({ editMode }),
  toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
  setEditTarget: (editTarget) => set({ editTarget }),
  setHoveredModulator: (hoveredModulatorId) => set({ hoveredModulatorId }),
  setArmedModulatorId: (armedModulatorId) => set({ armedModulatorId }),
  toggleStateGrid: () => set((state) => ({ showStateGrid: !state.showStateGrid })),
  setShowStateGrid: (showStateGrid) => set({ showStateGrid }),
  setExpandedAnalysisLayerId: (expandedAnalysisLayerId) => set({ expandedAnalysisLayerId }),

  setAnalysisRailWidth: (w) =>
    set((s) => {
      const analysisRailWidth = clampRegion('analysisRailWidth', w);
      savePersistedLayout({ ...snapshotLayout(s), analysisRailWidth });
      return { analysisRailWidth };
    }),
  setInspectorWidth: (w) =>
    set((s) => {
      const inspectorWidth = clampRegion('inspectorWidth', w);
      savePersistedLayout({ ...snapshotLayout(s), inspectorWidth });
      return { inspectorWidth };
    }),
  setSection2Height: (h) =>
    set((s) => {
      const section2Height = clampRegion('section2Height', h);
      savePersistedLayout({ ...snapshotLayout(s), section2Height });
      return { section2Height };
    }),
  setPerformanceBarHeight: (h) =>
    set((s) => {
      const performanceBarHeight = clampRegion('performanceBarHeight', h);
      savePersistedLayout({ ...snapshotLayout(s), performanceBarHeight });
      return { performanceBarHeight };
    }),
  setPixelStripHeight: (h) =>
    set((s) => {
      const pixelStripHeight = clampRegion('pixelStripHeight', h);
      savePersistedLayout({ ...snapshotLayout(s), pixelStripHeight });
      return { pixelStripHeight };
    }),
  setExpandedSlotHeight: (h) =>
    set((s) => {
      const expandedSlotHeight = clampRegion('expandedSlotHeight', h);
      savePersistedLayout({ ...snapshotLayout(s), expandedSlotHeight });
      return { expandedSlotHeight };
    }),
  setBladeStartFrac: (n) =>
    set((s) => {
      const bladeStartFrac = clampRegion('bladeStartFrac', n);
      savePersistedLayout({ ...snapshotLayout(s), bladeStartFrac });
      return { bladeStartFrac };
    }),
  setPinnedEffects: (effects) => {
    savePinnedEffects(effects);
    set({ pinnedEffects: effects });
  },
  togglePinnedEffect: (effect) => {
    set((s) => {
      const next = s.pinnedEffects.includes(effect)
        ? s.pinnedEffects.filter((e) => e !== effect)
        : [...s.pinnedEffects, effect];
      savePinnedEffects(next);
      return { pinnedEffects: next };
    });
  },

  // ── Left-rail overhaul setters ──
  setUseNewLayout: (on) => {
    saveUseNewLayout(on);
    set({ useNewLayout: on });
  },
  toggleUseNewLayout: () => {
    set((s) => {
      const next = !s.useNewLayout;
      saveUseNewLayout(next);
      return { useNewLayout: next };
    });
  },
  setActiveSection: (section) => {
    saveActiveSection(section);
    set({ activeSection: section });
  },
  toggleSidebarGroup: (group) => {
    set((s) => {
      const next = { ...s.sidebarGroupCollapsed, [group]: !s.sidebarGroupCollapsed[group] };
      saveSidebarCollapse(next);
      return { sidebarGroupCollapsed: next };
    });
  },
}));

function snapshotLayout(s: UIStore): PersistedLayout {
  return {
    analysisRailWidth: s.analysisRailWidth,
    inspectorWidth: s.inspectorWidth,
    section2Height: s.section2Height,
    performanceBarHeight: s.performanceBarHeight,
    pixelStripHeight: s.pixelStripHeight,
    expandedSlotHeight: s.expandedSlotHeight,
    bladeStartFrac: s.bladeStartFrac,
  };
}
