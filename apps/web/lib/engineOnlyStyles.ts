/**
 * Centralized lists of engine + codegen style IDs.
 *
 * Two contracts captured here:
 *
 *   1. `ENGINE_ONLY_STYLE_IDS` — styles the engine renders in the
 *      canvas but codegen has no ProffieOS emit handler for.
 *      `CodeOutput.tsx`'s export-time warning lists these to the user
 *      so they know their canvas preview won't match the exported
 *      firmware (the codegen path silently falls back to `stable`).
 *
 *   2. `CODEGEN_SUPPORTED_STYLE_IDS` — styles the codegen
 *      `ASTBuilder.buildBaseStyle()` switch handles natively.
 *
 * The companion test
 * `apps/web/tests/engineStyleParity.test.ts` reads
 * `packages/engine/src/styles/` and
 * `packages/codegen/src/ASTBuilder.ts` from the filesystem at test
 * time and asserts:
 *
 *   - The set of styles in the engine that aren't in the codegen
 *     switch matches `ENGINE_ONLY_STYLE_IDS` here.
 *   - The set of styles in the codegen switch matches
 *     `CODEGEN_SUPPORTED_STYLE_IDS` here.
 *
 * If anyone adds an engine style without an `ASTBuilder` case (or vice
 * versa), the test fails — forcing a deliberate decision: ship the
 * codegen handler, document the new engine-only fallback here, or both.
 *
 * Strategy / audit context: closes the silent-fallback regression
 * vector identified in
 * `docs/research/CODEGEN_CORRECTNESS_AUDIT_2026-05-15.md` Finding 3.
 */

/**
 * Engine styles with no ProffieOS codegen handler. The codegen path
 * (`ASTBuilder.buildBaseStyle`) silently falls through to `stable`
 * for these. Until parity lands, the export-time warning in
 * `CodeOutput.tsx` lists affected presets to the user.
 *
 * Keep alphabetical for diff hygiene.
 */
export const ENGINE_ONLY_STYLE_IDS: readonly string[] = [
  'automata',
] as const;

/**
 * Style IDs that `ASTBuilder.buildBaseStyle()` knows how to emit as a
 * native ProffieOS template. Round-trips cleanly between canvas and
 * exported firmware.
 *
 * Keep in sync with the `case` labels in
 * `packages/codegen/src/ASTBuilder.ts` (`buildBaseStyle` function).
 * The parity test catches drift automatically.
 *
 * Order matches the case order in `ASTBuilder.ts` for review-friendly
 * diffs.
 */
export const CODEGEN_SUPPORTED_STYLE_IDS: readonly string[] = [
  'stable',
  'unstable',
  'fire',
  'pulse',
  'rotoscope',
  'gradient',
  'darksaber',
  'sithFlicker',
  'bladeCharge',
  'tempoLock',
  'photon',
  'plasma',
  'crystalShatter',
  'aurora',
  'cinder',
  'prism',
  'imageScroll',
  'painted',
  'helix',
  'candle',
  'ember',
  'dataStream',
  'shatter',
  'neutron',
  'cascade',
  'gravity',
  'moire',
  'torrent',
  'vortex',
  'tidal',
  'mirage',
  'nebula',
] as const;
