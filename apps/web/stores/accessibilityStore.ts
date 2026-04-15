import { create } from 'zustand';

export type ColorblindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

interface AccessibilityState {
  highContrast: boolean;
  colorblindMode: ColorblindMode;
  reducedMotion: boolean;
  hasExplicitMotionPref: boolean;
  fontScale: number; // 1.0 = default, range 0.8–1.5

  setHighContrast: (on: boolean) => void;
  setColorblindMode: (mode: ColorblindMode) => void;
  setReducedMotion: (on: boolean) => void;
  setFontScale: (scale: number) => void;
  syncReducedMotionFromOS: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'bladeforge-accessibility';

function loadFromStorage(): Partial<AccessibilityState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

function saveToStorage(state: Pick<AccessibilityState, 'highContrast' | 'colorblindMode' | 'reducedMotion' | 'hasExplicitMotionPref' | 'fontScale'>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

const defaults = {
  highContrast: false,
  colorblindMode: 'none' as ColorblindMode,
  reducedMotion: false,
  hasExplicitMotionPref: false,
  fontScale: 1,
};

const stored = loadFromStorage();

export const useAccessibilityStore = create<AccessibilityState>((set, get) => ({
  highContrast: stored.highContrast ?? defaults.highContrast,
  colorblindMode: stored.colorblindMode ?? defaults.colorblindMode,
  reducedMotion: stored.reducedMotion ?? defaults.reducedMotion,
  hasExplicitMotionPref: stored.hasExplicitMotionPref ?? defaults.hasExplicitMotionPref,
  fontScale: stored.fontScale ?? defaults.fontScale,

  setHighContrast: (highContrast) => {
    set({ highContrast });
    const s = get();
    saveToStorage({ highContrast, colorblindMode: s.colorblindMode, reducedMotion: s.reducedMotion, hasExplicitMotionPref: s.hasExplicitMotionPref, fontScale: s.fontScale });
  },

  setColorblindMode: (colorblindMode) => {
    set({ colorblindMode });
    const s = get();
    saveToStorage({ highContrast: s.highContrast, colorblindMode, reducedMotion: s.reducedMotion, hasExplicitMotionPref: s.hasExplicitMotionPref, fontScale: s.fontScale });
  },

  setReducedMotion: (reducedMotion) => {
    set({ reducedMotion, hasExplicitMotionPref: true });
    const s = get();
    saveToStorage({ highContrast: s.highContrast, colorblindMode: s.colorblindMode, reducedMotion, hasExplicitMotionPref: true, fontScale: s.fontScale });
  },

  setFontScale: (fontScale) => {
    const clamped = Math.max(0.8, Math.min(1.5, fontScale));
    set({ fontScale: clamped });
    const s = get();
    saveToStorage({ highContrast: s.highContrast, colorblindMode: s.colorblindMode, reducedMotion: s.reducedMotion, hasExplicitMotionPref: s.hasExplicitMotionPref, fontScale: clamped });
  },

  syncReducedMotionFromOS: () => {
    if (get().hasExplicitMotionPref) return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    set({ reducedMotion: mq.matches });
  },

  reset: () => {
    set(defaults);
    saveToStorage(defaults);
  },
}));
