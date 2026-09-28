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
// summon, seismic) currently fall through to a `TrWipe` default in
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

// ─── Wipe-shape predicates ───
//
// ProffieOS 7.12 `transitions/wipe.h`: TrWipe grows color B from the hilt to
// the tip; TrWipeIn runs tip → hilt. `transitions/center_wipe.h`:
// TrCenterWipe grows from the center out; TrCenterWipeIn from both ends
// toward the center. In `InOutTrL<IGNITION, RETRACTION>` the ignition runs
// off → blade and the retraction blade → off, so a hilt-first ignition is
// TrWipe and a tip-first retraction is TrWipeIn.
//
// Until 2026-09 KyberStation emitted TrWipeIn / TrCenterWipeIn in the
// ignition slot, which ignites from the tip (or from both ends) on real
// hardware. Ignition matchers accept both directions so configs exported
// before the fix still import to the same ids.

function isWipe(n?: StyleNode): boolean {
  return !!n && (n.name === 'TrWipe' || n.name === 'TrWipeX');
}

function isWipeIn(n?: StyleNode): boolean {
  return !!n && (n.name === 'TrWipeIn' || n.name === 'TrWipeInX');
}

function isAnyWipe(n?: StyleNode): boolean {
  return isWipe(n) || isWipeIn(n);
}

function isCenterWipe(n?: StyleNode): boolean {
  return !!n && (n.name === 'TrCenterWipe' || n.name === 'TrCenterWipeX');
}

function isCenterWipeIn(n?: StyleNode): boolean {
  return !!n && (n.name === 'TrCenterWipeIn' || n.name === 'TrCenterWipeInX');
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
// Forward behaviour (directions per the wipe-shape note above; every entry
// matches the direction its engine class draws in the editor):
//   standard (ign)    → TrWipe<ms>              hilt → tip
//   standard (ret)    → TrWipeIn<ms>            tip → hilt
//   scroll   (ign)    → TrWipe<ms>              engine draws it like standard
//   scroll   (ret)    → TrWipeIn<ms>
//   wipe     (ign)    → TrWipe<ms>              -- alias of standard
//   spark    (ign)    → TrWipeSparkTip<White, ms>
//   center   (ign)    → TrCenterWipe<ms>        center → ends
//   center   (ret)    → TrCenterWipeIn<ms>      ends → center
//   fadeout  (ret)    → TrFade<ms>
//   shatter  (ret)    → TrFade<ms>              -- alias of fadeout
//   stutter  (ign)    → TrConcat<TrWipe<ms/3>, TrDelay<ms/6>, TrWipe<ms/2>>
//   glitch   (ign)    → TrConcat<TrFade<ms/4>, TrDelay<ms/8>, TrWipe<ms/2>>

export const TRANSITION_MAPPINGS: TransitionMapping[] = [
  {
    id: 'standard',
    kind: 'ignition',
    buildAST: (ms) => tr('TrWipe', intNode(ms)),
    matches: isAnyWipe,
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: true,
  },
  {
    id: 'standard',
    kind: 'retraction',
    buildAST: (ms) => tr('TrWipeIn', intNode(ms)),
    matches: isWipeIn,
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: true,
  },
  {
    id: 'scroll',
    kind: 'ignition',
    buildAST: (ms) => tr('TrWipe', intNode(ms)),
    matches: isWipe,
    extractMs: (n) => extractInt(n.args[0]),
    // Same ProffieOS output as 'standard' (ScrollIgnition draws exactly
    // like StandardIgnition), so the inverse resolves TrWipe to 'standard'.
    preferForInverse: false,
  },
  {
    id: 'scroll',
    kind: 'retraction',
    buildAST: (ms) => tr('TrWipeIn', intNode(ms)),
    // Exports before 2026-09 emitted TrWipe for scroll retraction; keep
    // importing that shape as 'scroll'. New exports import as 'standard'.
    matches: isWipe,
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: true,
  },
  {
    id: 'wipe',
    kind: 'ignition',
    buildAST: (ms) => tr('TrWipe', intNode(ms)),
    matches: isWipe,
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: false, // alias — inverse lookup picks 'standard'
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
    kind: 'ignition',
    buildAST: (ms) => tr('TrCenterWipe', intNode(ms)),
    matches: (n) => isCenterWipe(n) || isCenterWipeIn(n),
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: true,
  },
  {
    id: 'center',
    kind: 'retraction',
    buildAST: (ms) => tr('TrCenterWipeIn', intNode(ms)),
    matches: isCenterWipeIn,
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
        tr('TrWipe', intNode(Math.round(ms / 2))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 3 &&
      n.args[0]?.name === 'TrFade' &&
      n.args[1]?.name === 'TrDelay' &&
      isAnyWipe(n.args[2]),
    extractMs: (n) => {
      const first = extractInt(n.args[0]?.args[0]);
      return first === null ? null : first * 4;
    },
    preferForInverse: true,
  },

  // ─── High-confidence additions (v0.2.1) ───
  //
  // stab: center-out burst → TrCenterWipe.
  {
    id: 'stab',
    kind: 'ignition',
    buildAST: (ms) => tr('TrCenterWipe', intNode(ms)),
    // `center` also emits TrCenterWipe<ms>, so this entry has
    // preferForInverse: false — the inverse picks 'center' as canonical.
    // To round-trip 'stab' cleanly we'd need a distinct AST shape; for now
    // stab→center on import is accepted lossy behaviour (documented).
    matches: (n) => isCenterWipe(n) || isCenterWipeIn(n),
    extractMs: (n) => extractInt(n.args[0]),
    preferForInverse: false,
  },

  // flash-fill: instant white flash, then color wipe.
  //  → TrConcat<TrInstant, TrWipe<ms>>
  {
    id: 'flash-fill',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        raw('TrInstant'),
        tr('TrWipe', intNode(ms)),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 2 &&
      n.args[0]?.name === 'TrInstant' &&
      isAnyWipe(n.args[1]),
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
  //  → TrConcat<TrFade<ms/5>, TrWipe<ms*4/5>>
  {
    id: 'swing',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrFade', intNode(Math.round(ms / 5))),
        tr('TrWipe', intNode(Math.round((ms * 4) / 5))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 2 &&
      n.args[0]?.name === 'TrFade' &&
      isAnyWipe(n.args[1]),
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
        tr('TrWipe', intNode(Math.round((ms * 4) / 5))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 2 &&
      n.args[0]?.name === 'TrFade' &&
      isAnyWipe(n.args[1]),
    extractMs: (n) => {
      const first = extractInt(n.args[0]?.args[0]);
      return first === null ? null : first * 5;
    },
    preferForInverse: false,
  },

  // pulse-wave: multi-wave chained ignition.
  //  → TrConcat<TrWipe<ms/4>, TrDelay<ms/8>, TrWipe<ms/4>,
  //             TrDelay<ms/8>, TrWipe<ms/2>>
  {
    id: 'pulse-wave',
    kind: 'ignition',
    buildAST: (ms) =>
      tr(
        'TrConcat',
        tr('TrWipe', intNode(Math.round(ms / 4))),
        tr('TrDelay', intNode(Math.round(ms / 8))),
        tr('TrWipe', intNode(Math.round(ms / 4))),
        tr('TrDelay', intNode(Math.round(ms / 8))),
        tr('TrWipe', intNode(Math.round(ms / 2))),
      ),
    matches: (n) =>
      n.name === 'TrConcat' &&
      n.args.length === 5 &&
      isAnyWipe(n.args[0]) &&
      n.args[1]?.name === 'TrDelay' &&
      isAnyWipe(n.args[2]) &&
      n.args[3]?.name === 'TrDelay' &&
      isAnyWipe(n.args[4]),
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
        tr('TrWipe', intNode(Math.round((ms * 4) / 5))),
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
    buildAST: (ms) => tr('TrWipe', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
  { id: 'drip-up',    kind: 'ignition',
    buildAST: (ms) => tr('TrFade', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
  { id: 'summon',     kind: 'ignition',
    buildAST: (ms) => tr('TrWipe', intNode(ms)),
    matches: () => false, extractMs: () => null, preferForInverse: false },
  { id: 'seismic',    kind: 'ignition',
    buildAST: (ms) => tr('TrWipe', intNode(ms)),
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
  // Fallback: unknown ID falls through to `standard` ignition (TrWipe<ms>).
  return entry ? entry.buildAST(ms) : tr('TrWipe', intNode(ms));
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
