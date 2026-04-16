import { create } from 'zustand';

export type ViewMode = 'blade' | 'angle' | 'strip' | 'cross' | 'uv-unwrap';
export type RenderMode = 'photorealistic' | 'pixel';
export type CanvasMode = '2d' | '3d';
export type ActiveTab = 'design' | 'dynamics' | 'audio' | 'gallery' | 'output';
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
}));
