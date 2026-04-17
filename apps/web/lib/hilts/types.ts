/**
 * Modular hilt system — type definitions.
 *
 * A `HiltPart` is a single discrete SVG fragment (emitter, grip, etc.)
 * with connector specs defining how it mates with adjacent parts.
 * A `HiltAssembly` is an ordered composition of parts that the
 * composer resolves into a full hilt silhouette.
 *
 * See docs/HILT_PART_SPEC.md for authoring conventions.
 */

export type PartType =
  | 'emitter'
  | 'shroud'
  | 'switch'
  | 'grip'
  | 'pommel'
  | 'accent-ring';

/**
 * Interface diameter classes. Hollywood-prop scale.
 * - narrow   = 1.0"  → 24 SVG units
 * - standard = 1.25" → 30 SVG units (default)
 * - wide     = 1.5"  → 36 SVG units
 *
 * See {@link INTERFACE_DIAMETER_UNITS} for the numeric mapping.
 */
export type InterfaceDiameter = 'narrow' | 'standard' | 'wide';

export const INTERFACE_DIAMETER_UNITS: Record<InterfaceDiameter, number> = {
  narrow: 24,
  standard: 30,
  wide: 36,
};

export type Era = 'prequel' | 'original' | 'sequel' | 'legends' | 'universal';
export type Faction = 'jedi' | 'sith' | 'mandalorian' | 'grey' | 'other';

export type HiltArchetype =
  | 'single-classic'
  | 'single-dark'
  | 'single-ornate'
  | 'curved'
  | 'shoto'
  | 'crossguard'
  | 'double'
  | 'dual-shoto';

/**
 * Connector spec — where a part mates with its neighbour.
 * Both the top and bottom of every part have one. The `cx` must
 * be 24 (canvas center) per spec §2.
 */
export interface ConnectorSpec {
  diameter: InterfaceDiameter;
  /** Horizontal centerline in part-local SVG units. Always 24 per spec. */
  cx: number;
  /** Vertical position in part-local SVG units. Top: 0. Bottom: height. */
  cy: number;
}

export interface HiltPartSvg {
  viewBox: string;
  width: number;
  height: number;
  /** Filled silhouette — fill="url(#metal-body)" */
  bodyPath: string;
  /** Optional filled accent (brass band, leather wrap, etc.) */
  accentPath?: string;
  /** Accent fill colour (CSS). Required if accentPath provided. */
  accentFill?: string;
  /** Stroked detail (ridges, buttons, screws, rivets) */
  detailPath: string;
  /** Optional stroke override. Default: #e4e4e8. */
  detailStroke?: string;
}

export interface HiltPart {
  /** Stable machine id. Never changes once shipped. */
  id: string;
  /** User-facing label. Can change without breaking saves. */
  displayName: string;
  type: PartType;
  svg: HiltPartSvg;
  topConnector: ConnectorSpec;
  bottomConnector: ConnectorSpec;
  era?: Era;
  faction?: Faction;
}

export interface AssemblyPart {
  partId: string;
  /** Optional accent tint override */
  accentColor?: string;
  /** Optional Y offset nudge in SVG units (rare — composer handles normal stacking) */
  offsetY?: number;
}

export interface HiltAssembly {
  id: string;
  displayName: string;
  archetype: HiltArchetype;
  parts: AssemblyPart[];
  era?: Era;
  faction?: Faction;
  description?: string;
}

/**
 * Output of the composer. Each placed part includes its absolute
 * y-position within the resolved hilt, plus the part definition
 * itself for the renderer to consume.
 */
export interface PartPlacement {
  part: HiltPart;
  /** Override accent colour if the assembly specified one */
  accentColor?: string;
  /** Y offset in composed-hilt units (top = 0) */
  y: number;
}

export interface ComposedHilt {
  assemblyId: string;
  totalWidth: number;
  totalHeight: number;
  /** Y position of the very top of the emitter's aperture — where the blade starts */
  emitterY: number;
  placements: PartPlacement[];
}

export type CompositionMode = 'strict' | 'permissive';

export interface CompositionError {
  kind: 'missing-part' | 'diameter-mismatch' | 'no-parts';
  message: string;
  partId?: string;
  expectedDiameter?: InterfaceDiameter;
  actualDiameter?: InterfaceDiameter;
}

export interface CompositionResult {
  hilt: ComposedHilt | null;
  errors: CompositionError[];
  warnings: CompositionError[];
}
