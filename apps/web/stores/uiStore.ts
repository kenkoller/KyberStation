import { create } from 'zustand';

export type ViewMode = 'blade' | 'angle' | 'strip' | 'cross' | 'uv-unwrap';
export type RenderMode = 'photorealistic' | 'pixel';
export type CanvasMode = '2d' | '3d';
export type ActiveTab = 'design' | 'dynamics' | 'audio' | 'gallery' | 'output';

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
}));
