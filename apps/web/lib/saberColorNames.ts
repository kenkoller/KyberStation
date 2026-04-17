// ─── Saber Color Names — Thin Shim ───
//
// The 121-entry hand-curated HSL range table that used to live here has been
// replaced by the tiered naming system in `./namingMath.ts`, which provides:
//
//   • ~147 exact-point landmarks (the curated names, ported)
//   • 10 modifiers for near-landmark colors ("Pale", "Deep", "Ember-", ...)
//   • A coordinate-mood fallback so every RGB returns a distinctive name
//
// This file preserves the public export signature (`getSaberColorName`) so
// existing call sites (`ColorPanel.tsx`, `PixelDebugOverlay.tsx`) don't need
// to change.

export { getSaberColorName } from './namingMath';
