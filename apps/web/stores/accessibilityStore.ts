import { create } from 'zustand';

export type ColorblindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

/**
 * Row-density preset.
 *
 *   ssl      — 22px, SSL-console-dense. Best for 27"+ displays + power users.
 *   ableton  — 26px, default. Matches the current shipped row rhythm exactly,
 *              so flipping between presets produces no layout shift at rest.
 *   mutable  — 32px, Mutable Instruments / Eurorack-airy. Easier to hit on
 *              touch or for longer editing sessions.
 *
 * Applied to document.documentElement.dataset.density by
 * useAccessibilityApplier → globals.css `[data-density="…"]` selectors
 * flip `--row-h`. Components opt in by reading `var(--row-h)` on row
 * wrappers; migration of existing rows is deliberately deferred to a
 * downstream wave so this change is net-additive (no layout shift).
 */
export type DensityMode = 'ssl' | 'ableton' | 'mutable';

interface AccessibilityState {
  highContrast: boolean;
  colorblindMode: ColorblindMode;
  reducedMotion: boolean;
  hasExplicitMotionPref: boolean;
  fontScale: number; // 1.0 = default, range 0.8–1.5
  density: DensityMode;

  setHighContrast: (on: boolean) => void;
  setColorblindMode: (mode: ColorblindMode) => void;
  setReducedMotion: (on: boolean) => void;
  setFontScale: (scale: number) => void;
  setDensity: (density: DensityMode) => void;
  syncReducedMotionFromOS: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'kyberstation-accessibility';

function loadFromStorage(): Partial<AccessibilityState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

function saveToStorage(state: Pick<AccessibilityState, 'highContrast' | 'colorblindMode' | 'reducedMotion' | 'hasExplicitMotionPref' | 'fontScale' | 'density'>) {
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
  density: 'ableton' as DensityMode,
};

const stored = loadFromStorage();

export const useAccessibilityStore = create<AccessibilityState>((set, get) => ({
  highContrast: stored.highContrast ?? defaults.highContrast,
  colorblindMode: stored.colorblindMode ?? defaults.colorblindMode,
  reducedMotion: stored.reducedMotion ?? defaults.reducedMotion,
  hasExplicitMotionPref: stored.hasExplicitMotionPref ?? defaults.hasExplicitMotionPref,
  fontScale: stored.fontScale ?? defaults.fontScale,
  density: stored.density ?? defaults.density,

  setHighContrast: (highContrast) => {
    set({ highContrast });
    const s = get();
    saveToStorage({ highContrast, colorblindMode: s.colorblindMode, reducedMotion: s.reducedMotion, hasExplicitMotionPref: s.hasExplicitMotionPref, fontScale: s.fontScale, density: s.density });
  },

  setColorblindMode: (colorblindMode) => {
    set({ colorblindMode });
    const s = get();
    saveToStorage({ highContrast: s.highContrast, colorblindMode, reducedMotion: s.reducedMotion, hasExplicitMotionPref: s.hasExplicitMotionPref, fontScale: s.fontScale, density: s.density });
  },

  setReducedMotion: (reducedMotion) => {
    set({ reducedMotion, hasExplicitMotionPref: true });
    const s = get();
    saveToStorage({ highContrast: s.highContrast, colorblindMode: s.colorblindMode, reducedMotion, hasExplicitMotionPref: true, fontScale: s.fontScale, density: s.density });
  },

  setFontScale: (fontScale) => {
    const clamped = Math.max(0.8, Math.min(1.5, fontScale));
    set({ fontScale: clamped });
    const s = get();
    saveToStorage({ highContrast: s.highContrast, colorblindMode: s.colorblindMode, reducedMotion: s.reducedMotion, hasExplicitMotionPref: s.hasExplicitMotionPref, fontScale: clamped, density: s.density });
  },

  setDensity: (density) => {
    set({ density });
    const s = get();
    saveToStorage({ highContrast: s.highContrast, colorblindMode: s.colorblindMode, reducedMotion: s.reducedMotion, hasExplicitMotionPref: s.hasExplicitMotionPref, fontScale: s.fontScale, density });
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
