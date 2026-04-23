import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Wave 5 — PerformanceBar macro store.
 *
 * The PerformanceBar is a persistent chrome strip between the main panel
 * area and the bottom ticker. It exposes four pages (A · IGNITION /
 * B · MOTION / C · COLOR / D · FX), each carrying 8 knob slots. Dragging
 * a knob in v1.0 writes the scaled value directly into bladeStore.config
 * (no through-modulator plumbing — that's v1.1 modulation-routing work).
 *
 * Every macro value is stored as a normalized [0, 1] number. The binding
 * owns the real field range, so translating a knob value to a BladeConfig
 * field is `min + value * (max - min)`. The store stays pure — it does
 * not reach into bladeStore; the PerformanceBar component subscribes and
 * commits changes (keeps the store testable from node-only vitest).
 */

export type PageId = 'A' | 'B' | 'C' | 'D';

export const PAGE_LABELS: Record<PageId, string> = {
  A: 'A · IGNITION',
  B: 'B · MOTION',
  C: 'C · COLOR',
  D: 'D · FX',
};

export const PAGE_IDS: readonly PageId[] = ['A', 'B', 'C', 'D'] as const;
export const MACRO_SLOTS = 8;

/**
 * A single macro slot's binding to a BladeConfig field.
 *
 *   target  — dotted path into BladeConfig. Top-level only in v1.0
 *             (no nested bindings; `baseColor.r` etc. are handled by
 *             direct color pickers in ColorPanel, not macros).
 *   min/max — numeric range of the target field. The knob's 0..1 value
 *             is mapped linearly into this range.
 *   label   — UPPERCASE 4–10 char tag shown above the knob.
 *   integer — round the scaled value before committing. Defaults false
 *             (most BladeConfig fields are numeric floats).
 *   unwired — v1.0 placeholder. When true, dragging the knob still
 *             stores a normalized value but dispatchers must skip it.
 *             Matches the "not yet wired — v1.1 modulation-routing work"
 *             tooltip the PerformanceBar renders.
 */
export interface ParamBinding {
  target: string;
  min: number;
  max: number;
  label: string;
  integer?: boolean;
  unwired?: boolean;
}

export interface PerformanceState {
  currentPage: PageId;
  /** Per-page 8-slot normalized [0, 1] values. */
  macroValues: Record<PageId, number[]>;
  /** Per-page 8-slot bindings. Static in v1.0 — user-configurable later. */
  macroAssignments: Record<PageId, ParamBinding[]>;
  /** Whether the PerformanceBar chrome is mounted. Persists via SettingsModal. */
  visible: boolean;

  setPage: (page: PageId) => void;
  setMacroValue: (page: PageId, slot: number, value: number) => void;
  setVisible: (visible: boolean) => void;
  resetDefaults: () => void;
}

// ─── Default bindings ────────────────────────────────────────────────────────
//
// Only fields that exist on BladeConfig today (see
// packages/engine/src/types.ts) are wired. Slots that reference planned
// fields (fx dry/wet, fx bypass) are flagged `unwired` and their knobs
// render with a "not yet wired — v1.1 modulation-routing work" tooltip.
// Anchor values reflect the DEFAULT_CONFIG in bladeStore so the
// PerformanceBar starts at a reasonable visible position, though the
// store itself just centers everything at 0.5 until the user touches it.

export const DEFAULT_BINDINGS: Record<PageId, ParamBinding[]> = {
  A: [
    { target: 'ignitionMs',       min: 100,  max: 2000, label: 'IGNITE',    integer: true },
    { target: 'retractionMs',     min: 100,  max: 2000, label: 'RETRACT',   integer: true },
    { target: 'shimmer',          min: 0,    max: 1,    label: 'SHIMMER' },
    { target: 'noiseIntensity',   min: 0,    max: 100,  label: 'NOISE' },
    { target: 'emitterFlare',     min: 0,    max: 100,  label: 'EMITTER' },
    { target: 'preonMs',          min: 0,    max: 1000, label: 'PREON',     integer: true },
    { target: 'sparkSize',        min: 1,    max: 15,   label: 'SPARK' },
    { target: 'stutterAmplitude', min: 1,    max: 30,   label: 'STUTTER' },
  ],
  B: [
    { target: 'motionSwingSensitivity', min: 0, max: 100, label: 'SWING' },
    { target: 'motionAngleInfluence',   min: 0, max: 100, label: 'ANGLE' },
    { target: 'motionTwistResponse',    min: 0, max: 100, label: 'TWIST' },
    { target: 'motionSmoothing',        min: 0, max: 100, label: 'SMOOTH' },
    { target: 'motionSwingBrighten',    min: 0, max: 100, label: 'BRIGHTEN' },
    { target: 'colorFlickerRate',       min: 0, max: 100, label: 'FLICKER' },
    { target: 'colorFlickerDepth',      min: 0, max: 100, label: 'DEPTH' },
    { target: 'noiseSpeed',             min: 0, max: 100, label: 'NOISE SPD' },
  ],
  C: [
    { target: 'colorHueShiftSpeed',   min: 0, max: 100, label: 'HUE' },
    { target: 'colorSaturationPulse', min: 0, max: 100, label: 'SAT' },
    { target: 'colorBrightnessWave',  min: 0, max: 100, label: 'BRIGHT' },
    { target: 'tipLength',            min: 0, max: 50,  label: 'TIP LEN' },
    { target: 'tipFade',              min: 0, max: 100, label: 'TIP FADE' },
    { target: 'spatialSpread',        min: 0, max: 100, label: 'SPREAD' },
    { target: 'spatialWaveFrequency', min: 1, max: 20,  label: 'WAVE FREQ' },
    { target: 'spatialWaveSpeed',     min: 0, max: 100, label: 'WAVE SPD' },
  ],
  D: [
    { target: 'clashIntensity', min: 0, max: 100, label: 'CLASH' },
    { target: 'clashLocation',  min: 0, max: 100, label: 'CLASH LOC' },
    { target: 'blastSpread',    min: 0, max: 100, label: 'BLAST' },
    { target: 'blastCount',     min: 1, max: 5,   label: 'BLAST CT', integer: true },
    { target: 'stabDepth',      min: 0, max: 100, label: 'STAB' },
    { target: 'lockupRadius',   min: 0, max: 1,   label: 'LOCKUP R' },
    { target: 'dragRadius',     min: 0, max: 1,   label: 'DRAG R' },
    { target: 'meltRadius',     min: 0, max: 1,   label: 'MELT R' },
  ],
};

function makeDefaultValues(): Record<PageId, number[]> {
  return {
    A: new Array(MACRO_SLOTS).fill(0.5),
    B: new Array(MACRO_SLOTS).fill(0.5),
    C: new Array(MACRO_SLOTS).fill(0.5),
    D: new Array(MACRO_SLOTS).fill(0.5),
  };
}

function cloneBindings(): Record<PageId, ParamBinding[]> {
  return {
    A: DEFAULT_BINDINGS.A.map((b) => ({ ...b })),
    B: DEFAULT_BINDINGS.B.map((b) => ({ ...b })),
    C: DEFAULT_BINDINGS.C.map((b) => ({ ...b })),
    D: DEFAULT_BINDINGS.D.map((b) => ({ ...b })),
  };
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'kyberstation-performance';

interface PersistedState {
  currentPage: PageId;
  macroValues: Record<PageId, number[]>;
  visible: boolean;
}

function loadFromStorage(): Partial<PersistedState> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Partial<PersistedState>;
  } catch { /* ignore parse / SSR errors */ }
  return {};
}

function saveToStorage(state: PersistedState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore quota / SSR errors */ }
}

function isValidPersistedValues(
  v: Record<string, number[]> | undefined,
): v is Record<PageId, number[]> {
  if (!v) return false;
  return PAGE_IDS.every(
    (p) => Array.isArray(v[p]) && v[p].length === MACRO_SLOTS,
  );
}

const stored = loadFromStorage();

// ─── Helpers (pure) ──────────────────────────────────────────────────────────

/** Clamp a number to the inclusive [0, 1] range. Exported for tests. */
export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Scale a normalized [0, 1] macro value into the binding's real range.
 * Rounds when the binding declares `integer: true`. Exported so the
 * PerformanceBar dispatcher and tests share the exact same math.
 */
export function scaleMacroValue(binding: ParamBinding, normalized: number): number {
  const v = clamp01(normalized);
  const scaled = binding.min + v * (binding.max - binding.min);
  return binding.integer ? Math.round(scaled) : scaled;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  currentPage: (stored.currentPage && PAGE_IDS.includes(stored.currentPage))
    ? stored.currentPage
    : 'A',
  macroValues: isValidPersistedValues(stored.macroValues)
    ? stored.macroValues
    : makeDefaultValues(),
  macroAssignments: cloneBindings(),
  visible: stored.visible ?? true,

  setPage: (currentPage) => {
    set({ currentPage });
    const s = get();
    saveToStorage({
      currentPage,
      macroValues: s.macroValues,
      visible: s.visible,
    });
  },

  setMacroValue: (page, slot, value) => {
    if (slot < 0 || slot >= MACRO_SLOTS) return;
    const clamped = clamp01(value);
    set((state) => {
      const nextPage = [...state.macroValues[page]];
      nextPage[slot] = clamped;
      return {
        macroValues: {
          ...state.macroValues,
          [page]: nextPage,
        },
      };
    });
    const s = get();
    saveToStorage({
      currentPage: s.currentPage,
      macroValues: s.macroValues,
      visible: s.visible,
    });
  },

  setVisible: (visible) => {
    set({ visible });
    const s = get();
    saveToStorage({
      currentPage: s.currentPage,
      macroValues: s.macroValues,
      visible,
    });
  },

  resetDefaults: () => {
    const defaults = {
      currentPage: 'A' as PageId,
      macroValues: makeDefaultValues(),
      macroAssignments: cloneBindings(),
      visible: true,
    };
    set(defaults);
    saveToStorage({
      currentPage: defaults.currentPage,
      macroValues: defaults.macroValues,
      visible: defaults.visible,
    });
  },
}));
