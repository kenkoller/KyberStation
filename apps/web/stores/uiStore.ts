import { create } from 'zustand';

export type ViewMode = 'blade' | 'angle' | 'strip' | 'cross' | 'uv-unwrap';
export type RenderMode = 'photorealistic' | 'pixel';
export type CanvasMode = '2d' | '3d';
// OV6 (2026-04-21): 5 → 4 tabs. Dynamics was absorbed into Design per
// UI_OVERHAUL_v2_PROPOSAL §1. Persisted state referencing 'dynamics' is
// remapped to 'design' at load time by the layoutStore migration.
export type ActiveTab = 'gallery' | 'design' | 'audio' | 'output';
export type LayoutMode = 'sidebar' | 'horizontal';
export type FullscreenOrientation = 'horizontal' | 'vertical';

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
  /** Individual panel visibility toggles */
  showBladePanel: boolean;
  showPixelPanel: boolean;
  showGraphPanel: boolean;
  /** Global animation pause — freezes engine updates while keeping the last frame visible */
  animationPaused: boolean;
  /** Global CSS pause — freezes ALL CSS animations and transitions app-wide */
  isPaused: boolean;
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
   * OV8 — STATE-mode takeover. When true AND activeTab === 'design',
   * the center blade preview is replaced by a full-width 9-state
   * vertical stack of captureStateFrame snapshots. Desktop only.
   * Toggled via `[ SINGLE BLADE ] · [ ALL STATES ]` chip + ⌘5.
   */
  showStateGrid: boolean;

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
  toggleBladePanel: () => void;
  togglePixelPanel: () => void;
  toggleGraphPanel: () => void;
  toggleAnimationPaused: () => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
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
  toggleStateGrid: () => void;
  setShowStateGrid: (on: boolean) => void;

  // ── OV11 setters ──
  setAnalysisRailWidth: (w: number) => void;
  setInspectorWidth: (w: number) => void;
  setSection2Height: (h: number) => void;
  setPerformanceBarHeight: (h: number) => void;
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
  performanceBarHeight: { min: 60, max: 240, default: 158 },
} as const;

const OV11_STORAGE_KEY = 'kyberstation-ui-layout';

interface PersistedLayout {
  analysisRailWidth: number;
  inspectorWidth: number;
  section2Height: number;
  performanceBarHeight: number;
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
  showBladePanel: true,
  showPixelPanel: true,
  showGraphPanel: true,
  animationPaused: false,
  isPaused: false,
  batteryPresetIdx: 0,
  sectionOrder: {},
  layoutMode: 'sidebar',
  tabOrder: [],
  isFullscreen: false,
  fullscreenOrientation: 'horizontal',
  editMode: false,
  editTarget: 'lockup',
  hoveredModulatorId: null,
  showStateGrid: false,
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
  toggleBladePanel: () => set((state) => ({ showBladePanel: !state.showBladePanel })),
  togglePixelPanel: () => set((state) => ({ showPixelPanel: !state.showPixelPanel })),
  toggleGraphPanel: () => set((state) => ({ showGraphPanel: !state.showGraphPanel })),
  toggleAnimationPaused: () => set((state) => ({ animationPaused: !state.animationPaused })),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  setPaused: (isPaused) => set({ isPaused }),
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
  toggleStateGrid: () => set((state) => ({ showStateGrid: !state.showStateGrid })),
  setShowStateGrid: (showStateGrid) => set({ showStateGrid }),

  setAnalysisRailWidth: (w) =>
    set((s) => {
      const analysisRailWidth = clampRegion('analysisRailWidth', w);
      savePersistedLayout({
        analysisRailWidth,
        inspectorWidth: s.inspectorWidth,
        section2Height: s.section2Height,
        performanceBarHeight: s.performanceBarHeight,
      });
      return { analysisRailWidth };
    }),
  setInspectorWidth: (w) =>
    set((s) => {
      const inspectorWidth = clampRegion('inspectorWidth', w);
      savePersistedLayout({
        analysisRailWidth: s.analysisRailWidth,
        inspectorWidth,
        section2Height: s.section2Height,
        performanceBarHeight: s.performanceBarHeight,
      });
      return { inspectorWidth };
    }),
  setSection2Height: (h) =>
    set((s) => {
      const section2Height = clampRegion('section2Height', h);
      savePersistedLayout({
        analysisRailWidth: s.analysisRailWidth,
        inspectorWidth: s.inspectorWidth,
        section2Height,
        performanceBarHeight: s.performanceBarHeight,
      });
      return { section2Height };
    }),
  setPerformanceBarHeight: (h) =>
    set((s) => {
      const performanceBarHeight = clampRegion('performanceBarHeight', h);
      savePersistedLayout({
        analysisRailWidth: s.analysisRailWidth,
        inspectorWidth: s.inspectorWidth,
        section2Height: s.section2Height,
        performanceBarHeight,
      });
      return { performanceBarHeight };
    }),
}));
