// BladeConfig is imported at runtime from @bladeforge/engine.
// For type-only usage, we re-declare the shape we need to avoid cross-rootDir issues.
// The actual BladeConfig interface is the source of truth in packages/engine/src/types.ts.

export type Era = 'prequel' | 'original-trilogy' | 'sequel' | 'animated' | 'expanded-universe';
export type Affiliation = 'jedi' | 'sith' | 'neutral' | 'other';

export interface PresetMetadata {
  id: string;
  name: string;
  character: string;
  era: Era;
  affiliation: Affiliation;
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
