// ─── Strip Configuration → blade-thickness scale ─────────────────────
//
// Pure helper: given a `BladeConfig.stripType` id, returns a multiplier
// that scales the rendered blade core thickness in `BladeCanvas.tsx`.
//
// Why a separate scale? In real hardware, more LED strips inside the
// same polycarbonate tube don't physically widen the tube — but the
// perceived blade reads thicker because more emitting surface area =
// more light bouncing through the diffuser, saturating the core fully
// edge-to-edge. With one strip you can sometimes see the LED line
// down the centre; with five strips the entire diameter is fully lit
// and the bloom halo is correspondingly larger.
//
// Pre-Item-D, `stripType` only fed power-draw + brightness math
// (`stripBrightness = stripCount * 0.7`). Visual thickness was held
// flat so changing strip count had no visible effect on the rendered
// blade — a quiet WIP-feel that this module closes.
//
// Tuning: modest curve (1.0 → 1.18 across 1–5 neopixel strips) so the
// effect reads as "slightly chunkier" rather than "different blade."
// Combined multiplicatively with the existing `bladeDiameter.coreScale`
// (3/4" = 0.75, 7/8" = 1.0, 1" = 1.15) so users tuning both knobs
// stack effects naturally.
//
// In-hilt cree-style entries (`tri-cree`, `quad-cree`, `penta-cree`)
// get a softer curve since their light is omnidirectional and already
// fills the tube — additional cree LEDs mostly add brightness, not
// effective fill-area. Unknown ids fall back to 1.0 (no scale) so
// older persisted configs round-trip cleanly.

/**
 * Per-stripType multiplier applied to `BLADE_CORE_H * scale * diameter
 * * stripCoreScale`. Treat as a perceptual weight, not a physical width.
 */
export const STRIP_CORE_SCALES: Record<string, number> = {
  // Per-pixel addressable neopixel — each additional strip adds
  // appreciable fill width since strips wrap around the foam core
  // separately and each contributes its own diffuse halo.
  single: 1.0,
  'dual-neo': 1.06,
  'tri-neo': 1.11,
  'quad-neo': 1.15,
  'penta-neo': 1.18,
  // High-power in-hilt LEDs — single light source per LED at the
  // emitter, so adding more LEDs doesn't widen the lit core much, only
  // intensity. Modest curve.
  'tri-cree': 1.04,
  'quad-cree': 1.08,
  'penta-cree': 1.12,
};

/** Default for unknown / undefined strip types. */
export const DEFAULT_STRIP_CORE_SCALE = 1.0;

/**
 * Returns the blade-core-thickness multiplier for a given strip type id.
 * Falls back to 1.0 for unknown ids (older configs / future strip types).
 */
export function getStripCoreScale(stripType: string | undefined): number {
  if (stripType === undefined) return DEFAULT_STRIP_CORE_SCALE;
  return STRIP_CORE_SCALES[stripType] ?? DEFAULT_STRIP_CORE_SCALE;
}
