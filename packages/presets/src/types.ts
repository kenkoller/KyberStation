// BladeConfig is imported at runtime from @kyberstation/engine.
// For type-only usage, we re-declare the shape we need to avoid cross-rootDir issues.
// The actual BladeConfig interface is the source of truth in packages/engine/src/types.ts.

export type Era = 'prequel' | 'original-trilogy' | 'sequel' | 'animated' | 'expanded-universe';
export type Affiliation = 'jedi' | 'sith' | 'neutral' | 'other';

/**
 * Preset detail tier:
 * - **base**: Simple configuration — base color, clash color, style, default ignition.
 *   Quick to apply, good starting point for customization.
 * - **detailed**: Full configuration — tuned shimmer, noise, swing FX, specific
 *   ignition/retraction types with custom parameters, spatial direction, specific
 *   lockup/blast/drag colors, and style-specific extras.
 */
export type PresetTier = 'base' | 'detailed';

export interface PresetMetadata {
  id: string;
  name: string;
  character: string;
  era: Era;
  affiliation: Affiliation;
  /**
   * Which source universe this preset represents. Drives gallery filtering.
   * - `canon` — current Disney canon (films, Disney+ series, current novels/comics).
   *   Default when undefined.
   * - `legends` — pre-2014 Expanded Universe content (KOTOR, SWTOR, old novels,
   *   Dark Horse comics, Force Unleashed, etc.).
   * - `pop-culture` — fan tribute to non-Star-Wars IP (Marvel, LOTR, DC, etc.).
   * - `mythology` — real-world mythology (Excalibur, Kusanagi, etc. — public
   *   domain).
   * - `showcase` — KyberStation-original tech-demo presets that exercise the
   *   full feature surface (multi-binding modulation, math expressions,
   *   custom gradients, spatial effects). Distinct from pop-culture entries
   *   because they\'re not derived from any media source.
   *
   * Consumers should read as `preset.continuity ?? 'canon'`.
   */
  continuity?: 'canon' | 'legends' | 'pop-culture' | 'mythology' | 'showcase';
  /** 'base' = simple starting point, 'detailed' = fully tuned config */
  tier: PresetTier;
  /**
   * Whether this preset represents a lightsaber as it appeared on screen
   * (film, TV series, or officially produced game cinematics).
   * `false` for creative/community designs, speculative interpretations,
   * and non-canonical "what if" variants.
   */
  screenAccurate?: boolean;
  description?: string;
  hiltNotes?: string;
  topologyNotes?: string;

  // ─── Lineage / authorship (VCV Rack library + Outer Wilds lineage) ───
  //
  // These fields let the gallery surface *who* made a preset and *what it
  // descended from*. They are intentionally gallery-only: the Kyber Glyph
  // encoder (apps/web/lib/sharePack/kyberGlyph.ts) encodes BladeConfig
  // values, not preset metadata, so lineage never travels through shared
  // `?s=<glyph>` URLs.
  //
  // See: UX North Star §4, docs/NEXT_SESSIONS.md §14.

  /**
   * Attribution for who authored / curated this preset.
   *
   * Conventions:
   * - `'on-screen'` — canonical character presets drawn from film/TV
   *   reference (default for the built-in library).
   * - `'KyberStation'` — creative/community presets shipped with the app.
   * - A handle / name string — user-contributed presets (community gallery).
   *
   * `undefined` means "unknown" and the gallery falls back to the tier label
   * in the subtitle line.
   */
  author?: string;

  /**
   * Semver-ish version string for tracking preset evolution over time
   * (e.g. `'1.0'`, `'1.1'`, `'2.0'`). The shape is intentionally loose —
   * this is a human-readable badge, not a parse target.
   */
  version?: string;

  /**
   * `id` of the preset this one was forked / evolved from. Used by the
   * gallery to render a "Variant of {parent.name}" lineage tooltip on
   * hover. Never encoded into shareable glyphs.
   */
  parentId?: string;

  /**
   * Epoch milliseconds when this preset was created. Optional — canonical
   * character presets omit it; user-saved presets populate it for
   * "Newest" sorting. Not to be confused with `UserPreset.createdAt`
   * (IndexedDB-stored user presets), which is always set.
   */
  createdAt?: number;
}

export interface PresetConfig {
  name?: string;
  baseColor: { r: number; g: number; b: number };
  clashColor: { r: number; g: number; b: number };
  lockupColor: { r: number; g: number; b: number };
  blastColor: { r: number; g: number; b: number };
  style: string;
  ignition: string;
  retraction: string;
  ignitionMs: number;
  retractionMs: number;
  shimmer: number;
  ledCount: number;
  [key: string]: unknown;
}

export interface Preset extends PresetMetadata {
  config: PresetConfig;
}
