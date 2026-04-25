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

/**
 * Graphics quality preset (W3 2026-04-22). Drives the global FPS cap
 * threaded through useAnimationFrame and future quality flags
 * (bloom on/off, Crystal renderer on/off, diffusion sample count).
 *
 *   high   — no cap (subject to reducedMotion a11y throttle); all
 *            effects on. Default on desktop.
 *   medium — 45fps cap; effects on. Honors the AppPerfStrip "Drop
 *            to Medium" hover action.
 *   low    — 30fps cap; heavy canvases (Three.js Crystal, bloom
 *            layers) suppressed downstream. Honors "Drop to Low GFX".
 */
export type GraphicsQuality = 'high' | 'medium' | 'low';

/** Per-tier animation-frame cap. `undefined` = uncapped. */
export const GRAPHICS_FPS_CAP: Record<GraphicsQuality, number | undefined> = {
  high: undefined,
  medium: 45,
  low: 30,
};

/**
 * Auto-release config for sustained effects (Lockup, Drag, Melt,
 * Lightning, Force). When `enabled`, triggering a sustained effect
 * schedules a release after `seconds` — useful for demo / showcase
 * mode where the user doesn't want to manually release every hold.
 * Default off so advanced users keep explicit toggle behavior.
 */
export interface EffectAutoRelease {
  enabled: boolean;
  /** Seconds after trigger to auto-release. Clamped to [1, 30]. */
  seconds: number;
}

interface AccessibilityState {
  highContrast: boolean;
  colorblindMode: ColorblindMode;
  reducedMotion: boolean;
  hasExplicitMotionPref: boolean;
  fontScale: number; // 1.0 = default, range 0.8–1.5
  density: DensityMode;
  effectAutoRelease: EffectAutoRelease;
  graphicsQuality: GraphicsQuality;
  /**
   * Phase 3 (v0.14.0): when true, blade bloom alpha is scaled by 0.4 so
   * the halo is visibly dimmer without turning off completely. For users
   * with photosensitive triggers or who just prefer a calmer visual.
   * Defaults to false; persisted alongside other a11y prefs.
   */
  reduceBloom: boolean;

  setHighContrast: (on: boolean) => void;
  setColorblindMode: (mode: ColorblindMode) => void;
  setReducedMotion: (on: boolean) => void;
  setFontScale: (scale: number) => void;
  setDensity: (density: DensityMode) => void;
  setEffectAutoRelease: (config: Partial<EffectAutoRelease>) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  setReduceBloom: (on: boolean) => void;
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

function saveToStorage(state: Pick<AccessibilityState, 'highContrast' | 'colorblindMode' | 'reducedMotion' | 'hasExplicitMotionPref' | 'fontScale' | 'density' | 'effectAutoRelease' | 'graphicsQuality' | 'reduceBloom'>) {
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
  effectAutoRelease: { enabled: false, seconds: 4 } as EffectAutoRelease,
  graphicsQuality: 'high' as GraphicsQuality,
  reduceBloom: false,
};

const stored = loadFromStorage();

function persist(s: AccessibilityState) {
  saveToStorage({
    highContrast: s.highContrast,
    colorblindMode: s.colorblindMode,
    reducedMotion: s.reducedMotion,
    hasExplicitMotionPref: s.hasExplicitMotionPref,
    fontScale: s.fontScale,
    density: s.density,
    effectAutoRelease: s.effectAutoRelease,
    graphicsQuality: s.graphicsQuality,
    reduceBloom: s.reduceBloom,
  });
}

export const useAccessibilityStore = create<AccessibilityState>((set, get) => ({
  highContrast: stored.highContrast ?? defaults.highContrast,
  colorblindMode: stored.colorblindMode ?? defaults.colorblindMode,
  reducedMotion: stored.reducedMotion ?? defaults.reducedMotion,
  hasExplicitMotionPref: stored.hasExplicitMotionPref ?? defaults.hasExplicitMotionPref,
  fontScale: stored.fontScale ?? defaults.fontScale,
  density: stored.density ?? defaults.density,
  effectAutoRelease: stored.effectAutoRelease ?? defaults.effectAutoRelease,
  graphicsQuality: stored.graphicsQuality ?? defaults.graphicsQuality,
  reduceBloom: stored.reduceBloom ?? defaults.reduceBloom,

  setHighContrast: (highContrast) => {
    set({ highContrast });
    persist(get());
  },

  setColorblindMode: (colorblindMode) => {
    set({ colorblindMode });
    persist(get());
  },

  setReducedMotion: (reducedMotion) => {
    set({ reducedMotion, hasExplicitMotionPref: true });
    persist(get());
  },

  setFontScale: (fontScale) => {
    const clamped = Math.max(0.8, Math.min(1.5, fontScale));
    set({ fontScale: clamped });
    persist(get());
  },

  setDensity: (density) => {
    set({ density });
    persist(get());
  },

  setEffectAutoRelease: (config) => {
    const current = get().effectAutoRelease;
    const next: EffectAutoRelease = {
      enabled: config.enabled ?? current.enabled,
      seconds: config.seconds !== undefined
        ? Math.max(1, Math.min(30, config.seconds))
        : current.seconds,
    };
    set({ effectAutoRelease: next });
    persist(get());
  },

  setGraphicsQuality: (graphicsQuality) => {
    set({ graphicsQuality });
    persist(get());
  },

  setReduceBloom: (reduceBloom) => {
    set({ reduceBloom });
    persist(get());
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
