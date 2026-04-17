// ─── Canonical Ignition / Retraction ↔ Tr* Transition Map ───
//
// Single source of truth for mapping KyberStation ignition/retraction IDs
// onto ProffieOS `Tr*<>` transition templates, both forward (Config → AST)
// and inverse (AST → Config). Replaces the previously-duplicated switch
// statements in ASTBuilder.ts (lines 399-459) and the inverted inverse in
// ConfigReconstructor.ts:141-148.
//
// Coverage note: this sprint wires the 7 ID pairs ASTBuilder currently
// emits. The 11 other ignition IDs listed in UI dropdowns (twist, swing,
// stab, crackle, fracture, flash-fill, pulse-wave, drip-up, hyperspace,
// summon, seismic) currently fall through to a `TrWipeIn` default in
// ASTBuilder; extending codegen coverage is tracked for a follow-up sprint.

import type { StyleNode } from './types.js';

// ─── Local AST node helpers (mirror of those in ASTBuilder.ts) ───
// Duplicated rather than imported to keep this module self-contained and
// cheap to import from parser/ConfigReconstructor.ts.

function intNode(value: number): StyleNode {
  return { type: 'integer', name: String(value), args: [] };
}

function tr(name: string, ...args: StyleNode[]): StyleNode {
  return { type: 'transition', name, args };
}

function raw(name: string): StyleNode {
  return { type: 'raw', name, args: [] };
}

// ─── Helpers for the inverse direction ───

function extractInt(node: StyleNode | undefined): number | null {
  if (!node) return null;
  // Emitter-produced bare integer: { type: 'integer', name: '<number>', args: [] }
  // Parser-produced integer literal: { type: 'integer', name: 'Int', args: [raw('<number>')] }
  // Parser-produced Int<123> wrapper: { type: 'function', name: 'Int', args: [...] }
  // Raw literal (from parser recursion): { type: 'raw', name: '<number>', args: [] }
  if (node.args.length > 0 && (node.name === 'Int' || node.name === 'IntArg')) {
    return extractInt(node.args[0]);
  }
  if (node.type === 'integer' || node.type === 'raw') {
    const n = Number(node.name);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ─── Map Entry Shape ───

export type TransitionKind = 'ignition' | 'retraction' | 'both';

export interface TransitionMapping {
  /** KyberStation ID (matches BladeConfig.ignition / BladeConfig.retraction). */
  id: string;
  kind: TransitionKind;
  /** Forward: ms → AST node for this transition. */
  buildAST: (ms: number) => StyleNode;
  /** Inverse: does this AST node match the forward emission of this ID? */
  matches: (node: StyleNode) => boolean;
  /** Inverse: recover the ms value from an emitted node. */
  extractMs: (node: StyleNode) => number | null;
  /**
   * When multiple IDs emit the same shape (e.g. 'wipe' is a UI alias for
   * 'scroll' in ignition; 'shatter' is a visual alias for 'fadeout' in
   * retraction), the non-canonical aliases set `preferForInverse: false` so
   * the inverse lookup skips them and the canonical ID is recovered.
   */
  preferForInverse?: boolean;
}

// ─── Canonical Mappings ───
//
// Forward behaviour documented from ASTBuilder.ts as of Phase 0:
//   standard (both)   → TrWipeIn<ms>
//   scroll   (both)   → TrWipe<ms>
//   wipe     (ign)    → TrWipe<ms>            -- alias of scroll
//   spark    (ign)    → TrWipeSparkTip<White, ms>
//   center   (both)   → TrCenterWipeIn<ms>
//   fadeout  (ret)    → TrFade<ms>
//   shatter  (ret)    → TrFade<ms>            -- alias of fadeout
//   stutter  (ign)    → TrConcat<TrWipe<ms/3>, TrDelay<ms/6>, TrWipe<ms/2>>
//   glitch   (ign)    → TrConcat<TrFade<ms/4>, TrDelay<ms/8>, TrWipeIn<ms/2>>

export const TRANSITION_MAPPINGS: TransitionMapping[] = [
  {
    id: 'standard',
    kind: 'both',
    buildAST: (ms) => tr('TrWipeIn', intNode(ms)),
    matches: (n) => n.name === 'TrWipeIn' || n.name === 'TrWipeInX',
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: true,
  },
  {
    id: 'scroll',
    kind: 'both',
    buildAST: (ms) => tr('TrWipe', intNode(ms)),
    matches: (n) => n.name === 'TrWipe' || n.name === 'TrWipeX',
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: true,
  },
  {
    id: 'wipe',
    kind: 'ignition',
    buildAST: (ms) => tr('TrWipe', intNode(ms)),
    matches: (n) => n.name === 'TrWipe' || n.name === 'TrWipeX',
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: false, // alias — inverse lookup should pick 'scroll'
  },
  {
    id: 'spark',
    kind: 'ignition',
    buildAST: (ms) => tr('TrWipeSparkTip', raw('White'), intNode(ms)),
    matches: (n) =>
      n.name === 'TrWipeSparkTip' || n.name === 'TrWipeSparkTipX',
    extractMs: (n) => extractInt(n.args[n.args.length - 1]),
    preferForInverse: true,
  },
  {
    id: 'center',
    kind: 'both',
    buildAST: (ms) => tr('TrCenterWipeIn', intNode(ms)),
    matches: (n) =>
      n.name === 'TrCenterWipeIn' || n.name === 'TrCenterWipeInX',
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: true,
  },
  {
    id: 'fadeout',
    kind: 'retraction',
    buildAST: (ms) => tr('TrFade', intNode(ms)),
    matches: (n) => n.name === 'TrFade' || n.name === 'TrFadeX',
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: true,
  },
  {
    id: 'shatter',
    kind: 'retraction',
    buildAST: (ms) => tr('TrFade', intNode(ms)),
    matches: (n) => n.name === 'TrFade' || n.name === 'TrFadeX',
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: false, // alias — inverse lookup should pick 'fadeout'
  },
  {
    id: 'stutter',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrWipe', intNode(Math.round(ms / 3))),
        tr('TrDelay', intNode(Math.round(ms / 6))),
        tr('TrWipe', intNode(Math.round(ms / 2))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 3 &&
      n.args[0]?.name === 'TrWipe' &&
      n.args[1]?.name === 'TrDelay' &&
      n.args[2]?.name === 'TrWipe',
    extractMs: (n) => {
      // Recover ms by inverting the forward split: first TrWipe carried ms/3.
      const first = extractInt(n.args[0]?.args[0]);
      return first === null ? null : first * 3;
    },
    preferForInverse: true,
  },
  {
    id: 'glitch',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrFade', intNode(Math.round(ms / 4))),
        tr('TrDelay', intNode(Math.round(ms / 8))),
        tr('TrWipeIn', intNode(Math.round(ms / 2))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 3 &&
      n.args[0]?.name === 'TrFade' &&
      n.args[1]?.name === 'TrDelay' &&
      n.args[2]?.name === 'TrWipeIn',
    extractMs: (n) => {
      const first = extractInt(n.args[0]?.args[0]);
      return first === null ? null : first * 4;
    },
    preferForInverse: true,
  },

  // ─── High-confidence additions (v0.2.1) ───
  //
  // stab: center-out burst → direct TrCenterWipeIn.
  {
    id: 'stab',
    kind: 'ignition',
    buildAST: (ms) => tr('TrCenterWipeIn', intNode(ms)),
    // `center` also emits TrCenterWipeIn<ms>, so this entry has
    // preferForInverse: false — the inverse picks 'center' as canonical.
    // To round-trip 'stab' cleanly we'd need a distinct AST shape; for now
    // stab→center on import is accepted lossy behaviour (documented).
    matches: (n) =>
      n.name === 'TrCenterWipeIn' || n.name === 'TrCenterWipeInX',
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: false,
  },

  // flash-fill: instant white flash, then color wipe.
  //  → TrConcat<TrInstant, TrWipeIn<ms>>
  {
    id: 'flash-fill',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        raw('TrInstant'),
        tr('TrWipeIn', intNode(ms)),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 2 &&
      n.args[0]?.name === 'TrInstant' &&
      n.args[1]?.name === 'TrWipeIn',
    extractMs: (n) => extractInt(n.args[1]?.args[0]),
    preferForInverse: true,
  },

  // implode: retraction inward → TrCenterWipeIn used in retraction context.
  {
    id: 'implode',
    kind: 'retraction',
    buildAST: (ms) => tr('TrCenterWipeIn', intNode(ms)),
    matches: (n) =>
      n.name === 'TrCenterWipeIn' || n.name === 'TrCenterWipeInX',
    extractMs: (n) => extractInt(n.args[0]),
    // Like stab vs center, implode collides with 'center' retraction.
    // Keep 'center' as the canonical inverse.
    preferForInverse: false,
  },

  // ─── Medium-confidence additions (v0.2.1) ───
  //
  // swing: speed-reactive acceleration fill.
  //  → TrConcat<TrFade<ms/5>, TrWipeIn<ms*4/5>>
  {
    id: 'swing',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrFade', intNode(Math.round(ms / 5))),
        tr('TrWipeIn', intNode(Math.round((ms * 4) / 5))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 2 &&
      n.args[0]?.name === 'TrFade' &&
      n.args[1]?.name === 'TrWipeIn',
    extractMs: (n) => {
      const first = extractInt(n.args[0]?.args[0]);
      return first === null ? null : first * 5;
    },
    preferForInverse: true,
  },

  // crackle: random-flicker fill. Same approximation as swing but with a
  // smaller initial fade-in proportion (hence swing vs crackle share shape).
  // Collides with swing; swing is preferred canonical.
  {
    id: 'crackle',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrFade', intNode(Math.round(ms / 5))),
        tr('TrWipeIn', intNode(Math.round((ms * 4) / 5))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 2 &&
      n.args[0]?.name === 'TrFade' &&
      n.args[1]?.name === 'TrWipeIn',
    extractMs: (n) => {
      const first = extractInt(n.args[0]?.args[0]);
      return first === null ? null : first * 5;
    },
    preferForInverse: false,
  },

  // pulse-wave: multi-wave chained ignition.
  //  → TrConcat<TrWipeIn<ms/4>, TrDelay<ms/8>, TrWipeIn<ms/4>,
  //             TrDelay<ms/8>, TrWipeIn<ms/2>>
  {
    id: 'pulse-wave',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrWipeIn', intNode(Math.round(ms / 4))),
        tr('TrDelay', intNode(Math.round(ms / 8))),
        tr('TrWipeIn', intNode(Math.round(ms / 4))),
        tr('TrDelay', intNode(Math.round(ms / 8))),
        tr('TrWipeIn', intNode(Math.round(ms / 2))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 5 &&
      n.args[0]?.name === 'TrWipeIn' &&
      n.args[1]?.name === 'TrDelay' &&
      n.args[2]?.name === 'TrWipeIn' &&
      n.args[3]?.name === 'TrDelay' &&
      n.args[4]?.name === 'TrWipeIn',
    extractMs: (n) => {
      const first = extractInt(n.args[0]?.args[0]);
      return first === null ? null : first * 4;
    },
    preferForInverse: true,
  },

  // hyperspace: streak acceleration, approximated same as swing.
  {
    id: 'hyperspace',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrFade', intNode(Math.round(ms / 5))),
        tr('TrWipeIn', intNode(Math.round((ms * 4) / 5))),
      ),
    matches: () => false, // handled by the swing pattern
    extractMs: () => null,
    preferForInverse: false,
  },

  // ─── Low-confidence fallbacks (v0.2.1) ───
  //
  // These ignition/retraction IDs animate in-engine but don't have a clean
  // OS7 `Tr*` equivalent. They emit a sensible neutral transition so
  // exported code compiles and animates; round-trip is lossy for these.
  // Tracked for a follow-up sprint that adds new Tr* templates (TrSpiral,
  // TrRadialExpand, TrDissolveRandom, etc.).

  { id: 'twist',      kind: 'ignition',
    buildAST: (ms) => tr('TrWipe', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
  { id: 'fracture',   kind: 'ignition',
    buildAST: (ms) => tr('TrWipeIn', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
  { id: 'drip-up',    kind: 'ignition',
    buildAST: (ms) => tr('TrFade', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
  { id: 'summon',     kind: 'ignition',
    buildAST: (ms) => tr('TrWipeIn', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
  { id: 'seismic',    kind: 'ignition',
    buildAST: (ms) => tr('TrWipeIn', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },

  // Retractions: flickerOut / drain / spaghettify get medium-confidence
  // shapes; dissolve / unravel / evaporate get neutral fades.
  { id: 'flickerOut', kind: 'retraction',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrFade', intNode(Math.round((ms * 15) / 100))),
        tr('TrFade', intNode(Math.round((ms * 85) / 100))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' && n.args.length === 2 &&
      n.args[0]?.name === 'TrFade' && n.args[1]?.name === 'TrFade',
    extractMs: (n) => {
      const a = extractInt(n.args[0]?.args[0]);
      const b = extractInt(n.args[1]?.args[0]);
      return a !== null && b !== null ? a + b : null;
    },
    preferForInverse: true },

  { id: 'drain',      kind: 'retraction',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrFade', intNode(Math.round((ms * 70) / 100))),
        tr('TrFade', intNode(Math.round((ms * 30) / 100))),
      ),
    matches: () => false, // shape shared with flickerOut; flickerOut wins
    extractMs: () => null,
    preferForInverse: false },

  { id: 'spaghettify', kind: 'retraction',
    buildAST: (ms) =>
      tr('TrConcat', tr('TrFade', intNode(Math.round((ms * 90) / 100))), raw('TrInstant')),
    matches: (n) =>
      n.name === 'TrConcat' && n.args.length === 2 &&
      n.args[0]?.name === 'TrFade' && n.args[1]?.name === 'TrInstant',
    extractMs: (n) => {
      const a = extractInt(n.args[0]?.args[0]);
      return a === null ? null : Math.round((a * 100) / 90);
    },
    preferForInverse: true },

  { id: 'dissolve',   kind: 'retraction',
    buildAST: (ms) => tr('TrFade', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
  { id: 'unravel',    kind: 'retraction',
    buildAST: (ms) => tr('TrFade', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
  { id: 'evaporate',  kind: 'retraction',
    buildAST: (ms) => tr('TrFade', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
];

// ─── Public API ───

/** Forward: Config.ignition string → AST transition node. */
export function ignitionFromID(id: string, ms: number): StyleNode {
  const entry = TRANSITION_MAPPINGS.find(
    (m) => m.id === id && (m.kind === 'ignition' || m.kind === 'both'),
  );
  // Fallback: unknown ID falls through to `standard` (TrWipeIn<ms>) — same
  // behaviour as the old `default:` branch in ASTBuilder.buildIgnitionTransition.
  return entry ? entry.buildAST(ms) : tr('TrWipeIn', intNode(ms));
}

/** Forward: Config.retraction string → AST transition node. */
export function retractionFromID(id: string, ms: number): StyleNode {
  const entry = TRANSITION_MAPPINGS.find(
    (m) => m.id === id && (m.kind === 'retraction' || m.kind === 'both'),
  );
  return entry ? entry.buildAST(ms) : tr('TrWipeIn', intNode(ms));
}

/**
 * Inverse: AST transition node → { id, ms } for ignition.
 * Returns null if no mapping matches.
 */
export function ignitionFromAST(
  node: StyleNode,
): { id: string; ms: number | null } | null {
  const entry = TRANSITION_MAPPINGS.filter(
    (m) =>
      (m.kind === 'ignition' || m.kind === 'both') &&
      m.preferForInverse !== false,
  ).find((m) => m.matches(node));
  if (!entry) return null;
  return { id: entry.id, ms: entry.extractMs(node) };
}

/**
 * Inverse: AST transition node → { id, ms } for retraction.
 * Returns null if no mapping matches.
 */
export function retractionFromAST(
  node: StyleNode,
): { id: string; ms: number | null } | null {
  const entry = TRANSITION_MAPPINGS.filter(
    (m) =>
      (m.kind === 'retraction' || m.kind === 'both') &&
      m.preferForInverse !== false,
  ).find((m) => m.matches(node));
  if (!entry) return null;
  return { id: entry.id, ms: entry.extractMs(node) };
}
