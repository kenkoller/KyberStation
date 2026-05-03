// ─── Board Profiles — Board Capability System ──────────────────────────
//
// The Board Capability System (BCS) gates every KyberStation feature on
// the user's chosen board — not just modulation. This file is the root
// of that registry: 6 board profiles (2 Proffie, 1 Golden Harvest, 3
// non-Proffie "preview only" stubs) that describe hardware, supported
// style/effect/ignition IDs, modulation capability, and conservative
// template-emission ceilings.
//
// Status: v1.0 launch registry. Author: Agent C (modulation routing
// sprint, 2026-04-22). Per `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md`
// decisions 11-14, this registry drives:
//
//   • Blade creation wizard (required board picker)
//   • StatusBar quick-switcher
//   • FlashPanel "compatible with your board" filter
//   • Inspector ROUTING tab visibility (`canBoardModulate`)
//   • Every click-to-route drop target (`isParameterModulatableOnBoard`)
//
// ── Policy ─────────────────────────────────────────────────────────────
//
// We are INTENTIONALLY CONSERVATIVE. Friday v1.0 ships with:
//   • Proffieboard V3.9 as the only HARDWARE-VALIDATED modulation target
//     (commit c70b4e5 + phases A/B/C verified 2026-04-20).
//   • Proffieboard V2.2 with modulation FALSE for v1.0 (decision #14;
//     v1.1 revisits once V2 hardware validation lands).
//   • Golden Harvest V3 mirrors V3.9 — same firmware image.
//   • CFX / Xenopixel / Verso are PREVIEW-ONLY. They appear in the
//     picker so users can see their blade on those boards, but
//     modulation / export / flash are hidden.
//
// Over-declaring a capability breaks users; under-declaring only hides
// features that can be loosened post-feedback. Prefer under-declaring.

import { isParameterModulatable } from './parameterGroups';
// Canonical modulator / function ID unions: `packages/engine/src/modulation/types.ts`.
import type { BuiltInModulatorId, BuiltInFnId } from '@kyberstation/engine';

export type BoardStatus = 'full-support' | 'partial-support' | 'preview-only';

export type BoardFirmware = 'proffieos-7' | 'cfx' | 'xenopixel' | 'verso';

export interface BoardProfile {
  id: string;
  displayName: string;
  manufacturer: string;
  firmware: BoardFirmware;
  status: BoardStatus;

  // ── Hardware ───────────────────────────────────────────────────────
  /** Total flash in bytes. Used by StorageBudgetPanel budget calcs. */
  flashSize: number;
  /** Total RAM in bytes. */
  ramSize: number;
  /** Max addressable LED count (includes accent LEDs). */
  maxLedCount: number;
  /** Max simultaneous blade segments (staff / crossguard etc.). */
  maxBladeCount: number;
  hasAccentLed: boolean;
  hasCrystalChamberLed: boolean;
  hasOledDisplay: boolean;
  /** OLED resolution in [w, h] px when `hasOledDisplay`, else undefined. */
  oledResolution?: readonly [number, number];
  buttonCount: 1 | 2 | 3;
  hasKillSwitch: boolean;

  // ── Feature support (engine-side IDs) ──────────────────────────────
  supportedStyles: readonly string[];
  supportedEffects: readonly string[];
  supportedIgnitions: readonly string[];
  supportedRetractions: readonly string[];
  supportedSmoothSwing: readonly ('V1' | 'V2')[];
  supportedPropFiles: readonly string[];

  // ── Modulation (v1.0 scope) ────────────────────────────────────────
  supportsModulation: boolean;
  /** Soft limit — UI warns above, doesn't block. */
  maxBindings?: number;
  /** Binding count that triggers a gentle warning. */
  softBindingWarningAt?: number;
  /** Binding count that triggers a hard warning. */
  hardBindingWarningAt?: number;
  supportedModulators: readonly BuiltInModulatorId[];
  supportedFunctions: readonly BuiltInFnId[];
  supportsModulatorChains: boolean;
  supportsStepSequencer: boolean;
  supportsEnvelopeFollower: boolean;

  // ── Template emission ceilings (ProffieOS-side guardrails) ─────────
  maxLayerStackDepth: number;
  maxGradientStops: number;
  maxTemplateNesting: number;
}

// ── Reusable lists ────────────────────────────────────────────────────
//
// Proffieboard V3.9 is our "full capability" baseline — it's what we
// hardware-validated and what the engine emitter targets. The CFX /
// Xenopixel / Verso profiles intentionally ship minimal lists to make
// the preview-only gate impossible to forget.

/**
 * Style IDs we emit successfully against ProffieOS 7.x. Mirrors
 * `packages/engine/src/styles/index.ts::STYLE_REGISTRY`, minus styles
 * whose ProffieOS template equivalent isn't in `packages/codegen` yet.
 * Conservative: adding an engine-only visualisation without emitter
 * support would ship a broken "Flash" path.
 */
const PROFFIE_STYLES: readonly string[] = [
  'stable',
  'unstable',
  'fire',
  'pulse',
  'rotoscope',
  'gradient',
  'photon',
  'plasma',
  'crystalShatter',
  'aurora',
  'cinder',
  'prism',
  // Extended engine-only styles left out for v1.0:
  //   painted, imageScroll, dataStream, gravity, ember, automata,
  //   helix, candle, shatter, neutron, torrent, moire, cascade,
  //   vortex, nebula, tidal, mirage
  // These render in the web preview but have no stable ProffieOS
  // emitter path yet. Users CAN pick them; the codegen falls back
  // to a nearest-template approximation with a warning. Friday v1.0
  // keeps the flash-compatible list short.
];

/**
 * Effect IDs with a verified ProffieOS emitter path. Mirrors the
 * engine's EffectType union, with v1.0-unverified effects held back.
 */
const PROFFIE_EFFECTS: readonly string[] = [
  'clash',
  'lockup',
  'blast',
  'drag',
  'melt',
  'lightning',
  'stab',
  'force',
  // Excluded for v1.0 (engine-only visualisation, no emitter mapping):
  //   shockwave, scatter, fragment, ripple, freeze, overcharge,
  //   bifurcate, invert, ghostEcho, splinter, coronary, glitchMatrix,
  //   siphon
];

/** Ignition IDs with ProffieOS TrWipe / TrFade / TrConcat mappings. */
const PROFFIE_IGNITIONS: readonly string[] = [
  'standard',
  'scroll',
  'center',
  'spark',
  'wipe',
  'stutter',
  'glitch',
  'twist',
  'swing',
  'stab',
  'custom-curve',
  // Extended ignitions left out of the conservative v1.0 list:
  //   crackle, fracture, flash-fill, pulse-wave, drip-up, hyperspace,
  //   summon, seismic
];

/** Retraction IDs with ProffieOS TrWipeIn / TrFade / TrConcat mappings. */
const PROFFIE_RETRACTIONS: readonly string[] = [
  'standard',
  'scroll',
  'center',
  'fadeout',
  'shatter',
  'custom-curve',
  // Extended retractions left out:
  //   dissolve, flickerOut, unravel, drain, implode, evaporate,
  //   spaghettify
];

/** All ProffieOS built-in modulators the sampler exposes. */
const PROFFIE_MODULATORS: readonly BuiltInModulatorId[] = [
  'swing',
  'angle',
  'twist',
  'sound',
  'battery',
  'time',
  'clash',
  'lockup',
  'preon',
  'ignition',
  'retraction',
];

/** All built-in functions for expression routing. */
const PROFFIE_FUNCTIONS: readonly BuiltInFnId[] = [
  'min',
  'max',
  'clamp',
  'lerp',
  'sin',
  'cos',
  'abs',
  'floor',
  'ceil',
  'round',
];

/** Prop file IDs compatible with the Proffie firmware family. */
const PROFFIE_PROP_FILES: readonly string[] = [
  'fett263',
  'sa22c',
  'bc-button-controls',
  'default-fett',
];

// ── Board profiles ────────────────────────────────────────────────────

const PROFFIE_V3_9: BoardProfile = {
  id: 'proffie-v3.9',
  displayName: 'Proffieboard V3.9',
  manufacturer: 'Fredrik Hubinette',
  firmware: 'proffieos-7',
  status: 'full-support',

  flashSize: 512 * 1024,        // 512 KiB, STM32L433CC
  ramSize: 64 * 1024,
  maxLedCount: 264,
  maxBladeCount: 4,
  hasAccentLed: true,
  hasCrystalChamberLed: true,
  hasOledDisplay: true,
  oledResolution: [128, 32],
  buttonCount: 3,
  hasKillSwitch: true,

  supportedStyles: PROFFIE_STYLES,
  supportedEffects: PROFFIE_EFFECTS,
  supportedIgnitions: PROFFIE_IGNITIONS,
  supportedRetractions: PROFFIE_RETRACTIONS,
  supportedSmoothSwing: ['V1', 'V2'],
  supportedPropFiles: PROFFIE_PROP_FILES,

  supportsModulation: true,
  maxBindings: 128,
  softBindingWarningAt: 50,
  hardBindingWarningAt: 100,
  supportedModulators: PROFFIE_MODULATORS,
  supportedFunctions: PROFFIE_FUNCTIONS,
  // v1.0 excludes these — they're v1.2/v1.3 per roadmap.
  supportsModulatorChains: false,
  supportsStepSequencer: false,
  supportsEnvelopeFollower: false,

  maxLayerStackDepth: 8,
  maxGradientStops: 16,
  maxTemplateNesting: 12,
};

const PROFFIE_V2_2: BoardProfile = {
  id: 'proffie-v2.2',
  displayName: 'Proffieboard V2.2',
  manufacturer: 'Fredrik Hubinette',
  firmware: 'proffieos-7',
  status: 'partial-support',

  flashSize: 512 * 1024,        // STM32L431KB flash; conservative 512 KiB.
  ramSize: 64 * 1024,
  // V2.2 maxLEDs practically lower than V3 due to DMA / voltage; ship
  // a conservative ceiling.
  maxLedCount: 200,
  maxBladeCount: 4,
  hasAccentLed: true,
  hasCrystalChamberLed: true,
  hasOledDisplay: true,
  oledResolution: [128, 32],
  buttonCount: 3,
  hasKillSwitch: true,

  // Mirror V3 style / effect / ignition / retraction support — same
  // ProffieOS firmware. But SEE the modulation block below.
  supportedStyles: PROFFIE_STYLES,
  supportedEffects: PROFFIE_EFFECTS,
  supportedIgnitions: PROFFIE_IGNITIONS,
  supportedRetractions: PROFFIE_RETRACTIONS,
  supportedSmoothSwing: ['V1', 'V2'],
  supportedPropFiles: PROFFIE_PROP_FILES,

  // ── V2.2 modulation: DISABLED for Friday v1.0 ──────────────────────
  // Per sprint plan §3.2 and decision #14: "V2.2 modulation flash →
  // v1.1". We have no V2 hardware to validate against in-sprint, and
  // V2's lower pin/DMA budget may need stricter template ceilings.
  // Revisit after v1.0 launches.
  supportsModulation: false,
  supportedModulators: [],
  supportedFunctions: [],
  supportsModulatorChains: false,
  supportsStepSequencer: false,
  supportsEnvelopeFollower: false,

  // Conservative — half of V3.9's reserve.
  maxLayerStackDepth: 6,
  maxGradientStops: 12,
  maxTemplateNesting: 10,
};

const GOLDEN_HARVEST_V3: BoardProfile = {
  // Golden Harvest V3 runs the same ProffieOS firmware as V3.9 with the
  // same STM32L4 silicon — effectively a pin-compatible clone. We
  // treat it as a "mirror" profile so users who own a GHv3 see the
  // full feature set without us having to maintain a parallel emitter.
  id: 'golden-harvest-v3',
  displayName: 'Golden Harvest V3',
  manufacturer: 'Golden Harvest',
  firmware: 'proffieos-7',
  status: 'full-support',

  flashSize: 512 * 1024,
  ramSize: 64 * 1024,
  maxLedCount: 264,
  maxBladeCount: 4,
  hasAccentLed: true,
  hasCrystalChamberLed: true,
  hasOledDisplay: true,
  oledResolution: [128, 32],
  buttonCount: 3,
  hasKillSwitch: true,

  supportedStyles: PROFFIE_STYLES,
  supportedEffects: PROFFIE_EFFECTS,
  supportedIgnitions: PROFFIE_IGNITIONS,
  supportedRetractions: PROFFIE_RETRACTIONS,
  supportedSmoothSwing: ['V1', 'V2'],
  supportedPropFiles: PROFFIE_PROP_FILES,

  supportsModulation: true,
  maxBindings: 128,
  softBindingWarningAt: 50,
  hardBindingWarningAt: 100,
  supportedModulators: PROFFIE_MODULATORS,
  supportedFunctions: PROFFIE_FUNCTIONS,
  supportsModulatorChains: false,
  supportsStepSequencer: false,
  supportsEnvelopeFollower: false,

  maxLayerStackDepth: 8,
  maxGradientStops: 16,
  maxTemplateNesting: 12,
};

// ── Preview-only profiles (CFX / Xenopixel / Verso) ───────────────────
//
// These boards use entirely different firmware ecosystems (CFX = Plecter
// script, Xenopixel = preloaded effect files baked into firmware, Verso
// = JSON). KyberStation does NOT generate flashable firmware for them.
// The profile exists so:
//   1. The Gallery + preview canvas can show users what their blade
//      design would look like on that board.
//   2. The Output → ZIP export path can produce a "design reference"
//      bundle (config file documenting the user's intended colors +
//      timings + a `KYBERSTATION_README.txt` explaining the contract)
//      that helps users replicate the design via their board's actual
//      configuration workflow (button menu, vendor app, SD card edits).
//
// "Preview-only" therefore means: editor + visualizer + design-reference
// export work; modulation + native code generation + flash paths stay
// hidden. Real flash always requires Proffieboard.
//
// All four share the same shape: empty feature arrays where we don't
// support them, minimal hardware declaration, modulation hard-FALSE.

const CFX: BoardProfile = {
  id: 'cfx',
  displayName: 'CFX (Crystal Focus X)',
  manufacturer: 'The Custom Saber Shop',
  firmware: 'cfx',
  status: 'preview-only',

  flashSize: 128 * 1024,
  ramSize: 32 * 1024,
  // CFX typically tops out at 132 LEDs per blade.
  maxLedCount: 132,
  maxBladeCount: 1,
  hasAccentLed: false,
  hasCrystalChamberLed: false,
  hasOledDisplay: false,
  buttonCount: 2,
  hasKillSwitch: false,

  supportedStyles: [],
  supportedEffects: [],
  supportedIgnitions: [],
  supportedRetractions: [],
  supportedSmoothSwing: [],
  supportedPropFiles: [],

  supportsModulation: false,
  supportedModulators: [],
  supportedFunctions: [],
  supportsModulatorChains: false,
  supportsStepSequencer: false,
  supportsEnvelopeFollower: false,

  maxLayerStackDepth: 0,
  maxGradientStops: 0,
  maxTemplateNesting: 0,
};

const XENOPIXEL: BoardProfile = {
  id: 'xenopixel',
  displayName: 'Xenopixel',
  manufacturer: 'Xenopixel / CNC saber community',
  firmware: 'xenopixel',
  status: 'preview-only',

  flashSize: 64 * 1024,
  ramSize: 16 * 1024,
  maxLedCount: 144,
  maxBladeCount: 1,
  hasAccentLed: false,
  hasCrystalChamberLed: false,
  hasOledDisplay: false,
  buttonCount: 2,
  hasKillSwitch: false,

  supportedStyles: [],
  supportedEffects: [],
  supportedIgnitions: [],
  supportedRetractions: [],
  supportedSmoothSwing: [],
  supportedPropFiles: [],

  supportsModulation: false,
  supportedModulators: [],
  supportedFunctions: [],
  supportsModulatorChains: false,
  supportsStepSequencer: false,
  supportsEnvelopeFollower: false,

  maxLayerStackDepth: 0,
  maxGradientStops: 0,
  maxTemplateNesting: 0,
};

const VERSO: BoardProfile = {
  id: 'verso',
  displayName: 'Verso',
  manufacturer: 'Verso Labs',
  firmware: 'verso',
  status: 'preview-only',

  flashSize: 256 * 1024,
  ramSize: 32 * 1024,
  maxLedCount: 144,
  maxBladeCount: 1,
  hasAccentLed: false,
  hasCrystalChamberLed: false,
  hasOledDisplay: false,
  buttonCount: 2,
  hasKillSwitch: false,

  supportedStyles: [],
  supportedEffects: [],
  supportedIgnitions: [],
  supportedRetractions: [],
  supportedSmoothSwing: [],
  supportedPropFiles: [],

  supportsModulation: false,
  supportedModulators: [],
  supportedFunctions: [],
  supportsModulatorChains: false,
  supportsStepSequencer: false,
  supportsEnvelopeFollower: false,

  maxLayerStackDepth: 0,
  maxGradientStops: 0,
  maxTemplateNesting: 0,
};

// ── Registry ──────────────────────────────────────────────────────────

export const BOARD_PROFILES: readonly BoardProfile[] = Object.freeze([
  PROFFIE_V3_9,
  PROFFIE_V2_2,
  GOLDEN_HARVEST_V3,
  CFX,
  XENOPIXEL,
  VERSO,
]);

const BOARD_INDEX: ReadonlyMap<string, BoardProfile> = new Map(
  BOARD_PROFILES.map((b) => [b.id, b]),
);

/** Default board for new blades — the hardware-validated Proffieboard V3.9. */
export const DEFAULT_BOARD_ID: BoardProfile['id'] = PROFFIE_V3_9.id;

export function getBoardProfile(id: string): BoardProfile | undefined {
  return BOARD_INDEX.get(id);
}

export function canBoardModulate(id: string): boolean {
  const profile = BOARD_INDEX.get(id);
  return profile !== undefined && profile.supportsModulation;
}

/**
 * Combined gate for "can this parameter be a drop-target on this board?"
 * Returns `true` only when:
 *   (a) the board supports modulation at all, and
 *   (b) the parameter path exists in `parameterGroups` AND is flagged
 *       `isModulatable`.
 */
export function isParameterModulatableOnBoard(
  boardId: string,
  paramPath: string,
): boolean {
  if (!canBoardModulate(boardId)) return false;
  return isParameterModulatable(paramPath);
}
