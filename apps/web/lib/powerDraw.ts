// ─── Power Draw — pure math + thresholds ───
//
// Extracted from PowerDrawPanel so the cause/effect math (LEDs ×
// brightness × color → mA) can be unit-tested without React + the UI
// store. The component now imports these helpers; the test file
// exercises them directly against fixture configs.
//
// All numbers below are conservative WS2812B + Proffieboard reference
// values. They're intentionally re-stated as exported constants so a
// future hardware-validation pass can pin them in tests.

import type { RGB } from '@kyberstation/engine';

// ─── Constants ───────────────────────────────────────────────────────

/** mA per WS2812B LED channel at full brightness (one color channel). */
export const MA_PER_CHANNEL = 20;
/** Number of color channels per LED (R, G, B). */
export const CHANNELS_PER_LED = 3;
/** Max mA per LED at full white (60mA typical). */
export const MAX_MA_PER_LED = MA_PER_CHANNEL * CHANNELS_PER_LED;
/** Proffieboard quiescent current draw (CPU, amplifier idle, etc.). */
export const BOARD_IDLE_MA = 50;
/** Proffieboard max recommended continuous draw (mA). */
export const BOARD_MAX_MA = 5000;
/** Battery safety margin — real capacity is ~80% of rated. */
export const BATTERY_DERATING = 0.80;
/** Average duty cycle assumption — most styles average ~60% over time. */
export const AVG_DUTY_CYCLE = 0.60;

/** Common battery capacities (mAh). */
export const BATTERY_PRESETS = [
  { label: '18650 (3500 mAh)', capacity: 3500 },
  { label: '18650 (3000 mAh)', capacity: 3000 },
  { label: '18650 (2600 mAh)', capacity: 2600 },
  { label: '21700 (5000 mAh)', capacity: 5000 },
  { label: '14500 (800 mAh)', capacity: 800 },
] as const;

/**
 * Headroom thresholds vs. BOARD_MAX_MA. Below `warn` is OK, ≥ `warn`
 * (50%) is amber caution, ≥ `critical` (80%) is red. Same boundaries
 * the RadialGauge has been wired to all along — surfaced here so the
 * StatusSignal pairing can derive its variant from the same source.
 */
export const HEADROOM_THRESHOLDS = {
  warn: 0.50,
  critical: 0.80,
} as const;

// ─── Strip-type helpers ──────────────────────────────────────────────

const STRIP_COUNT_MAP: Record<string, number> = {
  'single': 1,
  'dual-neo': 2,
  'tri-neo': 3,
  'quad-neo': 4,
  'penta-neo': 5,
  'tri-cree': 3,
  'quad-cree': 4,
  'penta-cree': 5,
};

/** Strip type to physical strip count. Defaults to 1 for unknown ids. */
export function getStripCount(stripType: string | undefined): number {
  if (!stripType) return 1;
  return STRIP_COUNT_MAP[stripType] ?? 1;
}

/** True for in-hilt LED strip variants (Cree etc.) where total LED count is the strip count, not ledCount × strips. */
export function isInHilt(stripType: string | undefined): boolean {
  return stripType?.includes('cree') ?? false;
}

// ─── Stat shape ──────────────────────────────────────────────────────

export interface PowerDrawStats {
  /** Total LEDs being driven (ledCount × strips, or just stripCount for in-hilt). */
  totalLEDs: number;
  /** Peak mA — every LED at full white at current brightness. */
  peakMA: number;
  /** Steady-state mA at the current color + brightness. */
  colorMA: number;
  /** Average mA assuming ~60% duty cycle over typical animation. */
  avgMA: number;
  /** Estimated runtime in minutes against the selected battery. */
  runtimeMinutes: number;
  /** Per-channel breakdowns (mA contribution from each color channel). */
  rMA: number;
  gMA: number;
  bMA: number;
  /** True when peak draw exceeds the Proffieboard 5A limit. */
  overLimit: boolean;
  /** Battery preset label. */
  batteryLabel: string;
  /** Headroom as a fraction of BOARD_MAX_MA, clamped 0..∞. */
  headroomFrac: number;
}

export interface PowerDrawInput {
  ledCount: number;
  stripType: string | undefined;
  /** Active blade base color. */
  baseColor: RGB;
  /** UI brightness, 0..100. */
  brightnessPct: number;
  /** Index into BATTERY_PRESETS. */
  batteryIdx: number;
}

/**
 * Compute the full power draw report for a blade configuration. Pure
 * function — no DOM, no store, no side effects. The shape mirrors the
 * memoized `stats` object the panel previously assembled inline.
 */
export function computePowerDraw(input: PowerDrawInput): PowerDrawStats {
  const { ledCount, stripType, baseColor, brightnessPct, batteryIdx } = input;

  const stripCount = getStripCount(stripType);
  const briScale = Math.max(0, Math.min(brightnessPct, 100)) / 100;
  const totalLEDs = isInHilt(stripType) ? stripCount : ledCount * stripCount;

  // Per-LED current at the active color and brightness.
  const rFrac = (baseColor.r / 255) * briScale;
  const gFrac = (baseColor.g / 255) * briScale;
  const bFrac = (baseColor.b / 255) * briScale;
  const maPerLed = (rFrac + gFrac + bFrac) * MA_PER_CHANNEL;

  // Peak: all LEDs at full white, at current brightness.
  const peakMA = totalLEDs * MAX_MA_PER_LED * briScale + BOARD_IDLE_MA;
  // Current color, steady-state.
  const colorMA = totalLEDs * maPerLed + BOARD_IDLE_MA;
  // Time-averaged.
  const avgMA = totalLEDs * maPerLed * AVG_DUTY_CYCLE + BOARD_IDLE_MA;

  // Battery runtime against the selected pack.
  const battery = BATTERY_PRESETS[batteryIdx] ?? BATTERY_PRESETS[0];
  const usableCapacity = battery.capacity * BATTERY_DERATING;
  const runtimeMinutes = avgMA > 0 ? (usableCapacity / avgMA) * 60 : 0;

  // Per-channel breakdowns.
  const rMA = totalLEDs * rFrac * MA_PER_CHANNEL;
  const gMA = totalLEDs * gFrac * MA_PER_CHANNEL;
  const bMA = totalLEDs * bFrac * MA_PER_CHANNEL;

  return {
    totalLEDs,
    peakMA: Math.round(peakMA),
    colorMA: Math.round(colorMA),
    avgMA: Math.round(avgMA),
    runtimeMinutes: Math.round(runtimeMinutes),
    rMA: Math.round(rMA),
    gMA: Math.round(gMA),
    bMA: Math.round(bMA),
    overLimit: peakMA > BOARD_MAX_MA,
    batteryLabel: battery.label,
    headroomFrac: peakMA / BOARD_MAX_MA,
  };
}

// ─── Headroom → StatusSignal variant ─────────────────────────────────

/**
 * Three-tier headroom classification.
 *
 *   < 50%  →  ok       — green   ✓  (plenty of headroom)
 *   50-80% →  warning  — amber   ▲  (running warm)
 *   > 80%  →  error    — red     ✕  (over the safe-ops band — risk of brownout)
 *
 * Boundaries match HEADROOM_THRESHOLDS so this is the single source of
 * truth for the StatusSignal pairing on the readout.
 */
export type HeadroomVariant = 'success' | 'warning' | 'error';

export function classifyHeadroom(stats: PowerDrawStats): HeadroomVariant {
  if (stats.headroomFrac >= HEADROOM_THRESHOLDS.critical) return 'error';
  if (stats.headroomFrac >= HEADROOM_THRESHOLDS.warn) return 'warning';
  return 'success';
}

/**
 * Human-readable headroom label paired with the variant. Used as the
 * StatusSignal text next to the glyph.
 */
export function headroomLabel(stats: PowerDrawStats): string {
  // Headroom-remaining is the user-friendly framing — "78% headroom"
  // reads better than "22% over budget" at a glance.
  const remaining = Math.max(0, 1 - stats.headroomFrac);
  return `${Math.round(remaining * 100)}% headroom`;
}
