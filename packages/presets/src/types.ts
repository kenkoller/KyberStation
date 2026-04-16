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
