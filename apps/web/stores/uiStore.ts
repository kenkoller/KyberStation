import { create } from 'zustand';

export type ViewMode = 'blade' | 'angle' | 'strip' | 'cross';
export type RenderMode = 'photorealistic' | 'pixel';
export type ActiveTab = 'style' | 'colors' | 'effects' | 'motion' | 'sound' | 'timeline' | 'presets' | 'code' | 'export';

export interface UIStore {
  viewMode: ViewMode;
  renderMode: RenderMode;
  activeTab: ActiveTab;
  brightness: number;
  showHUD: boolean;

  setViewMode: (mode: ViewMode) => void;
  setRenderMode: (mode: RenderMode) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setBrightness: (brightness: number) => void;
  toggleHUD: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'blade',
  renderMode: 'photorealistic',
  activeTab: 'style',
  brightness: 100,
  showHUD: true,

  setViewMode: (viewMode) => set({ viewMode }),
  setRenderMode: (renderMode) => set({ renderMode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setBrightness: (brightness) => set({ brightness }),
  toggleHUD: () => set((state) => ({ showHUD: !state.showHUD })),
}));
