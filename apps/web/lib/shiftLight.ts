// ─── Shift-light helpers (v0.14.0 PR 5d) ─────────────────────────────────────
//
// Extracted from `components/layout/PerformanceBar.tsx` so the shift-rail
// math survives the PerformanceBar deletion. ShiftLightRail consumes
// `shiftLedColor` directly; the RMS smoothing helpers (`meanLuminance`,
// `smoothRms`) are re-exported from `hooks/useRmsLevel` for the
// shift-light test suite that pinned the contract on PerformanceBar.

export { meanLuminance, smoothRms } from '@/hooks/useRmsLevel';

/**
 * Map a shift-rail LED index ∈ [0, LED_COUNT) to its color bucket given a
 * current RMS ∈ [0, 1].
 *
 *   pos < 0.5  → green  (nominal headroom)
 *   pos < 0.75 → amber  (approaching peak)
 *   pos ≥ 0.75 → red    (peaking / clipping)
 */
export function shiftLedColor(
  index: number,
  ledCount: number,
  rms: number,
): 'off' | 'ok' | 'warn' | 'error' {
  const pos = ledCount <= 1 ? 0 : index / (ledCount - 1);
  const lit = pos < rms;
  if (!lit) return 'off';
  if (pos < 0.5) return 'ok';
  if (pos < 0.75) return 'warn';
  return 'error';
}
