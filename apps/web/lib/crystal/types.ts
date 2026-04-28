// ─── Kyber Crystal — Public Types ───
//
// Central type definitions for the crystal renderer. These are the
// interface contract between `geometry.ts`, `materials.ts`,
// `animations.ts`, `renderer.ts`, and the React surface.
//
// Keep this file free of THREE.js imports — types only. Implementation
// modules can reference THREE locally.

import type { BladeConfig, RGB } from '@kyberstation/engine';

// ─── Crystal Forms ───
//
// Each Form corresponds to a silhouette class from
// `docs/KYBER_CRYSTAL_VISUAL.md` §4. Form selection is deterministic,
// derived from BladeConfig via `selectForm(config)`.

export type CrystalFormId =
  | 'natural'            // Form 1 — Jedi / non-red stable
  | 'bled'               // Form 2 — Sith / red attuned
  | 'cracked'            // Form 3 — Unstable / Kylo-style
  | 'obsidian-bipyramid' // Form 4 — Darksaber
  | 'paired';            // Form 5 — dual-blade / saberstaff

export interface CrystalForm {
  id: CrystalFormId;
  name: string;
  description: string;
}

export const CRYSTAL_FORMS: Record<CrystalFormId, CrystalForm> = {
  natural: {
    id: 'natural',
    name: 'Natural',
    description: 'Irregular hexagonal prism, rough-cut. Most Jedi blades.',
  },
  bled: {
    id: 'bled',
    name: 'Bled',
    description: 'Hex prism with red veins and asymmetric twist. Sith.',
  },
  cracked: {
    id: 'cracked',
    name: 'Cracked',
    description: 'Fractured prism with exposed raw energy. Unstable blades.',
  },
  'obsidian-bipyramid': {
    id: 'obsidian-bipyramid',
    name: 'Obsidian Bipyramid',
    description: 'Double-pyramid, black with white modules. Darksaber.',
  },
  paired: {
    id: 'paired',
    name: 'Paired',
    description: 'Two prisms side-by-side. Dual-blade / saberstaff.',
  },
};

// ─── Geometry ───

export interface CrystalGeometryParams {
  form: CrystalFormId;
  /** hash(config) — used to seed deterministic jitter / crack routing. */
  seed: number;
  /** Overall height in scene units. Derived from ledCount. */
  height: number;
  /** Cross-section radius. */
  radius: number;
  /** 0-1 tip taper (1 = no taper, 0 = pinch to point). */
  tipTaper: number;
  /** 0-1 base taper. */
  baseTaper: number;
  /** Per-vertex jitter amount in scene units. */
  facetJitter: number;
  /** Facet count around the prism circumference. */
  segments: number;
  /** Twist angle (degrees) applied top-half for Bled form. */
  twistDeg: number;
  /** Crack / vein count for Bled (veins) and Cracked (seams). */
  crackCount: number;
}

// ─── Animation ───

export type AnimationTrigger =
  | 'idle'            // continuous, background pulse
  | 'hover'           // pointer in CrystalPanel
  | 'clash'           // 200ms flare
  | 'preset-saved'    // 500ms sparkle bloom
  | 'preset-loaded'   // 300ms pearl crossfade
  | 'first-discovery' // 2000ms, once per user
  | 'attune'          // 2000ms (scanned external glyph)
  | 'bleed'           // 1500ms, on any→red
  | 'heal'            // 1500ms, on red→any
  | 'unstable'        // continuous crack breathing
  | 'preon'           // continuous halo
  | 'smoothswing'     // continuous audio-envelope tracking
  | 'lockup';         // duration of lockup (held bright)

export interface AnimationState {
  /** 0-1 multiplier applied to the internal point light intensity. */
  glowIntensity: number;
  /** Colour blended from baseColor toward wound-red (0=baseColor, 1=red). */
  bleedProgress: number;
  /** 0-1 opacity of the vein mesh strips. */
  veinOpacity: number;
  /** 0-1 opacity of the pearlescent fleck layer. */
  fleckOpacity: number;
  /** 0-1 opacity of the preon halo mesh. */
  haloOpacity: number;
  /** Additional tilt in degrees applied to the crystal group. */
  tiltX: number;
  tiltY: number;
  /** Uniform scale multiplier. */
  scale: number;
  /** 0-1 crack-seam opacity for Cracked form. */
  seamOpacity: number;
}

/** Baseline resting state. */
export const IDLE_ANIMATION_STATE: AnimationState = {
  glowIntensity: 1.0,
  bleedProgress: 0,
  veinOpacity: 0,
  fleckOpacity: 0.35,
  haloOpacity: 0,
  tiltX: 0,
  tiltY: 0,
  scale: 1.0,
  seamOpacity: 0.8, // only visible if Form === 'cracked'
};

// ─── Renderer Public API ───

export interface CrystalRenderOptions {
  /** Interactive (hover tilt, clash on click, etc.). Default true. */
  interactive?: boolean;
  /** Include the scannable QR surface. Default true. */
  qr?: {
    enabled: boolean;
    /** The glyph string to encode. If omitted, a placeholder is used
     *  so the surface still renders with a visually plausible pattern
     *  (but it will NOT decode to a real saber). */
    glyph?: string;
  };
  /** Honour prefers-reduced-motion for ambient animations. Default true. */
  respectReducedMotion?: boolean;
}

/** Imperative handle returned by the React wrapper. */
export interface CrystalHandle {
  trigger(kind: AnimationTrigger, params?: Record<string, unknown>): void;
  snapshot(size?: number): Promise<Blob>;
  dispose(): void;
}

// ─── Form Selection ───

/** Red-hue predicate — used by Form selection and bleed detection. */
export function isRedHue(color: RGB): boolean {
  // Loose band around red, accepting true-red + crimson + scarlet
  const { r, g, b } = color;
  if (r < 120) return false;
  if (r < g + 40) return false;
  if (r < b + 40) return false;
  return true;
}

/** Green-hue predicate — symmetric to isRedHue, used by chip faction
 *  classification on Saber Cards. */
export function isGreenHue(color: RGB): boolean {
  const { r, g, b } = color;
  if (g < 120) return false;
  if (g < r + 40) return false;
  if (g < b + 40) return false;
  return true;
}

/** Blue-hue predicate — symmetric to isRedHue, used by chip faction
 *  classification on Saber Cards. Note: amethyst / Mace-purple satisfies
 *  this predicate (blue dominates) — chip-level Jedi detection layers
 *  an additional `r < 80` check to exclude purples / pinks / magentas. */
export function isBlueHue(color: RGB): boolean {
  const { r, g, b } = color;
  if (b < 120) return false;
  if (b < r + 40) return false;
  if (b < g + 40) return false;
  return true;
}

/**
 * Select the Form silhouette for a given config. Decision rules,
 * in priority order:
 *
 * 1. Config declares it explicitly via `crystalForm` (when v1 glyph
 *    round-trip adds this escape hatch; for now, heuristic).
 * 2. `saberType === 'darksaber'` → obsidian-bipyramid
 * 3. `saberType === 'staff' | 'dual'` → paired
 * 4. `style === 'unstable'` → cracked
 * 5. `isRedHue(baseColor)` → bled
 * 6. default → natural
 */
export function selectForm(config: BladeConfig): CrystalFormId {
  const saberType = (config as BladeConfig & { saberType?: string }).saberType;
  if (saberType === 'darksaber') return 'obsidian-bipyramid';
  if (saberType === 'staff' || saberType === 'dual') return 'paired';

  if (config.style === 'unstable') return 'cracked';
  if (isRedHue(config.baseColor)) return 'bled';

  return 'natural';
}

/**
 * Build geometry params from config. Deterministic — same config →
 * identical params.
 */
export function geometryParamsForConfig(
  config: BladeConfig,
  seed: number,
): CrystalGeometryParams {
  const form = selectForm(config);

  // LED count → height scaling: shoto ≈ 0.8, standard ≈ 1.0, greatblade ≈ 1.2
  const ledScale = Math.max(0.7, Math.min(1.3, config.ledCount / 144));

  // Form-specific parameter presets, layered on the LED scale
  const base = {
    form,
    seed,
    height: 1.6 * ledScale,
    radius: 0.4,
    tipTaper: 0.78,
    baseTaper: 1.0,
    facetJitter: 0.02,
    segments: 8,
    twistDeg: 0,
    crackCount: 0,
  };

  switch (form) {
    case 'bled':
      return { ...base, twistDeg: 12, crackCount: 4, facetJitter: 0.03 };
    case 'cracked':
      return { ...base, crackCount: 6, facetJitter: 0.035 };
    case 'obsidian-bipyramid':
      return {
        ...base,
        height: 1.8 * ledScale,
        radius: 0.35,
        tipTaper: 0.0, // actual pyramid apex
        segments: 4,
        facetJitter: 0.0,
      };
    case 'paired':
      return { ...base, radius: 0.28 };
    case 'natural':
    default:
      return base;
  }
}
