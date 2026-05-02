// ─── AST → BladeConfig Reconstructor ───
// Pattern matching to reverse-engineer BladeConfig from a parsed AST.

import type { StyleNode } from '../types.js';
import { ignitionFromAST, retractionFromAST } from '../transitionMap.js';

// Mirror of the engine's RGB shape. Structural-identity test lives in
// tests/typeIdentity.test.ts and guarantees these stay assignment-compatible.
interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Named color constants in ProffieOS */
const NAMED_COLORS: Record<string, RGB> = {
  Black: { r: 0, g: 0, b: 0 },
  White: { r: 255, g: 255, b: 255 },
  Red: { r: 255, g: 0, b: 0 },
  Green: { r: 0, g: 255, b: 0 },
  Blue: { r: 0, g: 0, b: 255 },
  Yellow: { r: 255, g: 255, b: 0 },
  Orange: { r: 255, g: 165, b: 0 },
  Cyan: { r: 0, g: 255, b: 255 },
  Magenta: { r: 255, g: 0, b: 255 },
  DeepSkyBlue: { r: 0, g: 191, b: 255 },
  DodgerBlue: { r: 30, g: 144, b: 255 },
  // Legacy uppercase forms that appear in pre-OS6 configs and the Fredrik
  // Style Editor exports — same values as the canonical names.
  WHITE: { r: 255, g: 255, b: 255 },
  RED: { r: 255, g: 0, b: 0 },
  GREEN: { r: 0, g: 255, b: 0 },
  BLUE: { r: 0, g: 0, b: 255 },
  YELLOW: { r: 255, g: 255, b: 0 },
  ORANGE: { r: 255, g: 165, b: 0 },
  CYAN: { r: 0, g: 255, b: 255 },
  MAGENTA: { r: 255, g: 0, b: 255 },
  BLACK: { r: 0, g: 0, b: 0 },
  PURPLE: { r: 128, g: 0, b: 128 },
};

/**
 * Named ARG-slot identifiers used by Fett263 OS7 Edit Mode.
 *
 * These appear in the FIRST argument position of `RgbArg<>` / `IntArg<>` as
 * leaf identifier tokens (no angle brackets), e.g.
 * `RgbArg<BASE_COLOR_ARG, Rgb<0,140,255>>`. The reconstructor doesn't need
 * to interpret the slot semantics — the second argument carries the default
 * color which is what we care about — but it should NOT emit warnings when
 * it sees these identifiers as leaf tokens.
 */
const ARG_SLOT_IDS = new Set([
  // Color args
  'BASE_COLOR_ARG',
  'ALT_COLOR_ARG',
  'ALT_COLOR2_ARG',
  'ALT_COLOR3_ARG',
  'STYLE_COLOR_ARG',
  'EMITTER_COLOR_ARG',
  'IGNITION_COLOR_ARG',
  'RETRACTION_COLOR_ARG',
  'PREON_COLOR_ARG',
  'POSTOFF_COLOR_ARG',
  'OFF_COLOR_ARG',
  'LOCKUP_COLOR_ARG',
  'LB_COLOR_ARG',
  'DRAG_COLOR_ARG',
  'CLASH_COLOR_ARG',
  'BLAST_COLOR_ARG',
  'STAB_COLOR_ARG',
  'SWING_COLOR_ARG',
  // Int / size / position args
  'STYLE_OPTION_ARG',
  'IGNITION_OPTION_ARG',
  'IGNITION_OPTION2_ARG',
  'RETRACTION_OPTION_ARG',
  'RETRACTION_OPTION2_ARG',
  'LOCKUP_POSITION_ARG',
  'EMITTER_SIZE_ARG',
  'PREON_SIZE_ARG',
  'DRAG_SIZE_ARG',
  'MELT_SIZE_ARG',
  'SWING_OPTION_ARG',
  'POSTOFF_OPTION_ARG',
]);

export interface ReconstructedConfig {
  style?: string;
  baseColor?: RGB;
  clashColor?: RGB;
  blastColor?: RGB;
  lockupColor?: RGB;
  dragColor?: RGB;
  lightningColor?: RGB;
  meltColor?: RGB;
  ignition?: string;
  retraction?: string;
  ignitionMs?: number;
  retractionMs?: number;
  /** Spatial lockup centre 0..1 recovered from `ResponsiveLockupL<>` TOP/BOTTOM. */
  lockupPosition?: number;
  /** Spatial lockup size (radius) 0..1 recovered from `ResponsiveLockupL<>` SIZE. */
  lockupRadius?: number;
  /** True when a `TransitionEffectL<..., EFFECT_PREON>` layer is present. */
  preonEnabled?: boolean;
  /** Preon colour recovered from the preon layer's Rgb node. */
  preonColor?: RGB;
  /** Preon duration recovered from the preon layer's TrFade arg. */
  preonMs?: number;
  /** Spatial blast centre 0..1 recovered from `AlphaL<BlastL<...>, Bump<...>>` Bump position. */
  blastPosition?: number;
  /** Spatial blast wave-size 0..1 recovered from the Bump second arg. */
  blastRadius?: number;
  /** Spatial drag centre 0..1 recovered from `AlphaL<LockupTrL<..., LOCKUP_DRAG>, Bump<...>>`. */
  dragPosition?: number;
  dragRadius?: number;
  /** Spatial melt centre 0..1 recovered from `AlphaL<LockupTrL<..., LOCKUP_MELT>, Bump<...>>`. */
  meltPosition?: number;
  meltRadius?: number;
  /** Spatial stab centre 0..1 recovered from `TransitionEffectL<..., EFFECT_STAB>`. */
  stabPosition?: number;
  stabRadius?: number;
  /**
   * Multi-phase color cycle recovered from `ColorChange<TR, A, B, C, ...>`,
   * `ColorSelect<F, TR, A, B, C, ...>`, or `ColorChangeL<F, A, B, C, ...>`.
   * The first color goes to `baseColor`; subsequent colors are surfaced
   * here so the visualizer + UI can show "this preset has N alt phases".
   * Empty array when no color-change wrapper is present.
   *
   * Sprint 5C (2026-05-02): previously the OS7 ColorChange family
   * unwrapped to its first color and the rest were silently lost on
   * import. Now they're preserved so each phase can be inspected (and a
   * future UI pass can let users cycle through them in the visualizer).
   */
  altPhaseColors?: RGB[];
  /**
   * Effect events the imported style references (recovered from
   * `TransitionEffectL<EFFECT_TYPE, ...>` and similar). Surfaced so the
   * visualizer can render flash overlays for ignition / preon / boot /
   * force / quote / clash / etc. Empty array when no such layers
   * present.
   *
   * Sprint 5C (2026-05-02): previously only `EFFECT_PREON` and
   * `EFFECT_STAB` were detected; this widens to the full set Fett263's
   * generator emits.
   */
  detectedEffectIds?: string[];
  confidence: number;
  warnings: string[];
  rawAST: StyleNode;
}

/**
 * Extract an RGB value from an Rgb<r,g,b> or RgbArg<index, Rgb<r,g,b>> node.
 */
function extractRGB(node: StyleNode): RGB | null {
  // Named color
  if (NAMED_COLORS[node.name]) {
    return NAMED_COLORS[node.name];
  }

  // Rgb<r, g, b>
  if (node.name === 'Rgb' && node.args.length >= 3) {
    return {
      r: extractInt(node.args[0]) ?? 0,
      g: extractInt(node.args[1]) ?? 0,
      b: extractInt(node.args[2]) ?? 0,
    };
  }

  // Rgb16<r, g, b> — 16-bit per-channel HDR. Reduce by /257 ≈ /256 to map
  // the 0..65535 range back into 0..255 for the visualizer.
  if (node.name === 'Rgb16' && node.args.length >= 3) {
    const r = extractInt(node.args[0]);
    const g = extractInt(node.args[1]);
    const b = extractInt(node.args[2]);
    if (r === null || g === null || b === null) return null;
    return {
      r: Math.min(255, Math.round(r / 257)),
      g: Math.min(255, Math.round(g / 257)),
      b: Math.min(255, Math.round(b / 257)),
    };
  }

  // RgbArg<index, Rgb<r,g,b>> — extract the default color
  if (node.name === 'RgbArg' && node.args.length >= 2) {
    return extractRGB(node.args[1]);
  }

  return null;
}

/**
 * Extract an integer value from any of the integer-literal AST shapes we
 * might encounter:
 *   - Emitter's bare integer:     { type:'integer', name:'<num>', args:[] }
 *   - Parser's integer literal:   { type:'integer', name:'Int', args:[{type:'raw', name:'<num>'}] }
 *   - Parser's Int<> wrapper:     { type:'function', name:'Int', args:[<integer-literal>] }
 *   - Nested Int<Int<...>>:       further levels of the above stacked
 *   - Raw literal:                { type:'raw', name:'<num>', args:[] }
 *   - IntArg<SLOT, default>:      use the second arg (default value)
 */
function extractInt(node: StyleNode): number | null {
  if (!node) return null;
  // IntArg<SLOT_NAME, default> — the second arg is the integer default.
  if (node.name === 'IntArg' && node.args.length >= 2) {
    return extractInt(node.args[1]);
  }
  // Unwrap Int wrappers recursively.
  if (node.name === 'Int' && node.args.length > 0) {
    return extractInt(node.args[0]);
  }
  // Bare integer (emitter shape) or raw numeric string (parser inner).
  if (node.type === 'integer' || node.type === 'raw') {
    const n = parseInt(node.name, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Find all nodes matching a predicate in the AST tree.
 */
function findNodes(node: StyleNode, predicate: (n: StyleNode) => boolean): StyleNode[] {
  const results: StyleNode[] = [];
  if (predicate(node)) results.push(node);
  for (const arg of node.args) {
    results.push(...findNodes(arg, predicate));
  }
  return results;
}

/**
 * Wrappers that historically hide a base style + ignition/retraction timing.
 * Pre-OS7 community configs and the default Proffieboard ROTJ presets emit
 * `StyleNormalPtr<COLOR, CLASH_COLOR, IGN_MS, RET_MS>` and friends; today
 * Fett263's library has moved on but legacy configs still use them.
 */
const LEGACY_STYLE_WRAPPERS = new Set([
  'StyleNormalPtr',
  'StyleStrobePtr',
  'StyleFirePtr',
  'StyleRainbowPtr',
]);

/**
 * Names of "flicker" wrappers whose first inner color is the BASE color of
 * the blade. Common in stable styles authored by Fett263 — the flicker
 * shapes the base body, and `Mix<Int<>, Black, baseColor>` provides the dark
 * companion to drive the flicker depth.
 */
const FLICKER_WRAPPERS = new Set([
  'BrownNoiseFlicker',
  'RandomFlicker',
  'RandomPerLEDFlicker',
  'HumpFlicker',
]);

/**
 * Color-changing wrappers (OS7). When the user enables Color Change in the
 * Fett263 OS7 Library, the BASE color is wrapped in one of these. We extract
 * the inner default color as `baseColor` and emit a warning that menu state
 * isn't editable in the visualizer.
 */
const COLOR_CHANGE_WRAPPERS = new Set([
  'ColorChange',
  'ColorSelect',
  'ColorChangeL',
]);

/**
 * Detect the base style from the AST root pattern.
 *
 * Two-stage detection:
 *   1. **Legacy Style*Ptr wrappers (pre-OS7)** — handled FIRST, before
 *      `unwrapToCore` strips them, so the wrapper's style identity wins
 *      over the inner color:
 *        - `StyleNormalPtr<COLOR, CLASH, IGN, RET>` → stable
 *        - `StyleFirePtr<C1, C2, ...>`              → fire
 *        - `StyleStrobePtr<C1, C2, FREQ, ...>`      → pulse
 *        - `StyleRainbowPtr<...>`                   → aurora
 *
 *   2. **OS7 base styles** — after `unwrapToCore` peels away StylePtr,
 *      Layers, and the OS7 ColorChange/ColorSelect wrappers:
 *        - `AudioFlicker`           → stable
 *        - `BrownNoiseFlicker`      → stable (Fett263 default for "stable" presets)
 *        - `RandomFlicker`          → stable
 *        - `RandomPerLEDFlicker`    → unstable (gritty per-LED flicker)
 *        - `StyleFire`, 2nd = Mix   → unstable (5-arg with FireConfig)
 *        - `StyleFire`, 2nd = Rgb<255,200,50>, FireConfig<2,...> → fire
 *        - `StyleFire`, 2nd = Rgb  (edge), FireConfig<4,2500,8>  → plasma
 *        - `Pulsing`                → pulse
 *        - `Stripes<5000,-1500,...>` → photon
 *        - `Stripes<3000,-2000,...>` → crystalShatter
 *        - `Mix<SwingSpeed<400>,...>` → rotoscope
 *        - `Mix<SwingSpeed<300>, StyleFire<>, ...>` → cinder
 *        - `Gradient<>`             → gradient (2 args) / painted (more args)
 *        - `Rainbow`                → aurora (prism collides; we always return aurora)
 */
function detectStyle(node: StyleNode): { style: string; confidence: number } {
  // Pre-OS7 legacy wrappers describe the WHOLE style — handle them BEFORE
  // unwrapping so the inner color (which `unwrapToCore` would otherwise
  // descend into) doesn't override the wrapper's style identity.
  // Walk past StylePtr/Layers but NOT into LEGACY_STYLE_WRAPPERS.
  let legacyCandidate: StyleNode | null = node;
  while (
    legacyCandidate &&
    (legacyCandidate.name === 'StylePtr' || legacyCandidate.name === 'Layers') &&
    legacyCandidate.args.length > 0
  ) {
    legacyCandidate = legacyCandidate.args[0];
  }
  if (legacyCandidate && LEGACY_STYLE_WRAPPERS.has(legacyCandidate.name)) {
    if (legacyCandidate.name === 'StyleFirePtr')
      return { style: 'fire', confidence: 0.85 };
    if (legacyCandidate.name === 'StyleRainbowPtr')
      return { style: 'aurora', confidence: 0.7 };
    if (legacyCandidate.name === 'StyleStrobePtr')
      return { style: 'pulse', confidence: 0.8 };
    if (legacyCandidate.name === 'StyleNormalPtr') {
      // StyleNormalPtr<COLOR, CLASH, IGN, RET>. If the inner color is itself
      // a flicker (AudioFlicker / BrownNoiseFlicker / etc.), the style is
      // STILL stable — flickers are a subtype of stable in our taxonomy.
      return { style: 'stable', confidence: 0.85 };
    }
  }

  const core = unwrapToCore(node);
  if (!core) return { style: 'custom', confidence: 0.1 };

  const name = core.name;

  if (name === 'AudioFlicker') return { style: 'stable', confidence: 0.9 };
  if (name === 'HumpFlicker') return { style: 'stable', confidence: 0.8 };
  if (name === 'BrownNoiseFlicker') return { style: 'stable', confidence: 0.85 };
  if (name === 'RandomFlicker') return { style: 'stable', confidence: 0.8 };
  if (name === 'RandomPerLEDFlicker') return { style: 'unstable', confidence: 0.75 };

  // StyleFire family: fire / unstable / plasma — disambiguated by arg[1]
  // shape and FireConfig values.
  if (name === 'StyleFire') {
    const secondArg = core.args[1];
    const fireConfig = core.args[4];
    const fireConfigFirstArg =
      fireConfig?.name === 'FireConfig' ? extractInt(fireConfig.args[0]) : null;

    // fire: 2nd arg is a plain Rgb (the hardcoded {255,200,50} default or
    // user-tuned), FireConfig first arg = 2.
    if (secondArg?.name === 'Rgb' && fireConfigFirstArg === 2) {
      return { style: 'fire', confidence: 0.95 };
    }
    // plasma: FireConfig<4,...>
    if (fireConfigFirstArg === 4) {
      return { style: 'plasma', confidence: 0.9 };
    }
    // unstable: 2nd arg is Mix<>, FireConfig<3,...>
    if (secondArg?.name === 'Mix' || fireConfigFirstArg === 3) {
      return { style: 'unstable', confidence: 0.9 };
    }
    // Unknown FireConfig shape — prefer fire as the most common default.
    return { style: 'fire', confidence: 0.5 };
  }

  // (Legacy Style*Ptr wrappers are handled at the top of detectStyle, before
  // unwrapToCore strips them.)

  if (name === 'Pulsing') return { style: 'pulse', confidence: 0.9 };

  // Stripes: photon / crystalShatter disambiguated by timing args.
  if (name === 'Stripes') {
    const t0 = extractInt(core.args[0]);
    const t1 = extractInt(core.args[1]);
    if (t0 === 5000 && t1 === -1500) {
      return { style: 'photon', confidence: 0.9 };
    }
    if (t0 === 3000 && t1 === -2000) {
      return { style: 'crystalShatter', confidence: 0.9 };
    }
    // Unknown Stripes timing — prefer photon (more common community use).
    return { style: 'photon', confidence: 0.5 };
  }

  // Mix<...,...> disambiguates rotoscope variants. Three shapes recognised:
  //   1. Mix<SwingSpeed<400>, base, alt>           → rotoscope
  //   2. Mix<SwingSpeed<300>, StyleFire<>, ...>    → cinder
  //   3. Mix<HoldPeakF<SwingSpeed<...>, ...>, ...> → rotoscope (Fett263
  //      Hyper Responsive Rotoscope, OS7's signature swing-reactive base).
  //      Same downstream style id as the v1 rotoscope; the `HoldPeakF`
  //      wrapper just smooths the swing input. Bumped confidence reflects
  //      that recognising the wrapper shape is high-signal of intent.
  if (name === 'Mix') {
    const first = core.args[0];
    if (first?.name === 'SwingSpeed') {
      const speed = extractInt(first.args[0]);
      if (speed === 400) return { style: 'rotoscope', confidence: 0.9 };
      if (speed === 300) return { style: 'cinder', confidence: 0.9 };
      // Unknown SwingSpeed — prefer rotoscope (more common pattern).
      return { style: 'rotoscope', confidence: 0.5 };
    }
    // Hyper Responsive Rotoscope — Fett263's most common base style. The
    // first Mix arg wraps SwingSpeed in HoldPeakF (a peak-hold smoother).
    // Variants:
    //   Mix<HoldPeakF<SwingSpeed<...>>, ...>
    //   Mix<HoldPeakF<SwingAcceleration<...>>, ...>  (less common)
    if (first?.name === 'HoldPeakF') {
      const inner = first.args[0];
      if (
        inner?.name === 'SwingSpeed' ||
        inner?.name === 'SwingAcceleration'
      ) {
        return { style: 'rotoscope', confidence: 0.85 };
      }
    }
  }

  if (name === 'Gradient') {
    const argCount = core.args.length;
    // imageScroll emits 2-12 colour stops; painted emits N from colorPositions.
    // Both are indistinguishable from each other and — at 2 args — from gradient.
    // Prefer `gradient` at 2 args, `painted` at 3+.
    if (argCount >= 3) return { style: 'painted', confidence: 0.7 };
    return { style: 'gradient', confidence: 0.85 };
  }

  // Rainbow: aurora and prism emit the same node. Pick aurora as canonical.
  if (name === 'Rainbow') return { style: 'aurora', confidence: 0.6 };

  if (name === 'Rgb') return { style: 'stable', confidence: 0.6 };
  if (name === 'RgbArg') return { style: 'stable', confidence: 0.6 };
  if (NAMED_COLORS[name]) return { style: 'stable', confidence: 0.5 };

  return { style: 'custom', confidence: 0.2 };
}

/**
 * Unwrap StylePtr<>, InOutTrL<>, and Layers<> to find the core style node.
 *
 * Also unwraps OS7 color-change wrappers (`ColorChange<>` / `ColorSelect<>` /
 * `ColorChangeL<>`) so the user's underlying base style is detected. The
 * intermediate color-change shape is preserved on round-trip; the
 * reconstructor only needs to surface the editable default color + style.
 */
function unwrapToCore(node: StyleNode): StyleNode | null {
  if (node.name === 'StylePtr' && node.args.length > 0) {
    return unwrapToCore(node.args[0]);
  }
  if (node.name === 'InOutTrL' && node.args.length > 0) {
    return unwrapToCore(node.args[0]);
  }
  if (node.name === 'Layers' && node.args.length > 0) {
    return unwrapToCore(node.args[0]);
  }
  // ColorChange<TRANSITION, COLOR_A, COLOR_B, ...> — color list starts at arg 1.
  if (node.name === 'ColorChange' && node.args.length >= 2) {
    return unwrapToCore(node.args[1]);
  }
  // ColorSelect<FUNCTION, TRANSITION, COLOR_A, COLOR_B, ...> — color list at arg 2.
  if (node.name === 'ColorSelect' && node.args.length >= 3) {
    return unwrapToCore(node.args[2]);
  }
  // ColorChangeL<FUNCTION, COLOR_A, COLOR_B, ...> — color list at arg 1.
  if (node.name === 'ColorChangeL' && node.args.length >= 2) {
    return unwrapToCore(node.args[1]);
  }
  // Pre-OS7 wrappers — StyleNormalPtr<COLOR, CLASH, IGN, RET>, etc. The
  // first arg is the BASE style/color which carries the visual identity.
  if (LEGACY_STYLE_WRAPPERS.has(node.name) && node.args.length > 0) {
    return unwrapToCore(node.args[0]);
  }
  return node;
}

// `detectIgnitionType` used to live here with an inverted map (TrWipe →
// 'standard' but forward emits 'standard' → TrWipeIn). The canonical
// ignition/retraction table now lives in transitionMap.ts; see the
// `ignitionFromAST` / `retractionFromAST` helpers below.

/**
 * Extract transition duration from a transition node.
 * Used as a fallback when the transitionMap entry doesn't cover this node.
 *
 * Handles the X-suffixed transitions (`TrFadeX<Function>`, `TrWipeX<Function>`,
 * etc.) by digging into the function arg looking for an `Int<N>` literal.
 * If the function is something more complex (`Scale<SwingSpeed<400>, Int<200>,
 * Int<800>>`) we can't recover a single ms — return null.
 */
function extractTransitionDuration(node: StyleNode): number | null {
  if (node.args.length === 0) return null;
  const first = node.args[0];
  // Direct Int<N> or bare integer
  const direct = extractInt(first);
  if (direct !== null) return direct;
  // X-suffixed siblings: dive into the function's first arg looking for an Int.
  if (first.args.length > 0) {
    const inner = extractInt(first.args[0]);
    if (inner !== null) return inner;
  }
  return null;
}

/**
 * Walk the AST and collect colors keyed by their containing effect-layer type.
 * This replaces the previous colors-by-position heuristic, which assigned
 * baseColor/blastColor/clashColor/lockupColor in tree-traversal order and
 * was very fragile when a style reused base color in multiple layers.
 *
 * For each layer we find the first RGB/RgbArg inside it. The `LOCKUP_*` enum
 * at the end of LockupTrL disambiguates lockup / drag / lightning-block / melt.
 */
function resolveColorsByContainer(ast: StyleNode): {
  blastColor?: RGB;
  clashColor?: RGB;
  lockupColor?: RGB;
  dragColor?: RGB;
  lightningColor?: RGB;
  meltColor?: RGB;
} {
  const result: ReturnType<typeof resolveColorsByContainer> = {};

  // Structural named colors: rarely the "effect color" — usually a modifier
  // argument to Mix<> / Stripes<> / etc. Prefer any Rgb/RgbArg/non-structural
  // named color over these when both are available inside the same container.
  const STRUCTURAL_NAMED = new Set(['Black', 'White', 'BLACK', 'WHITE']);

  // Find the most specific color inside a node. Prefers Rgb/RgbArg, then
  // non-structural named colors, then structural ones — all via depth-first
  // traversal. Returns the first color in each tier, searching the whole
  // subtree before falling back to a weaker tier.
  const firstColorIn = (node: StyleNode): RGB | undefined => {
    const tiers: Array<(n: StyleNode) => RGB | undefined> = [
      // Tier 1 — explicit Rgb / RgbArg / Rgb16
      (n) => {
        if (n.name === 'Rgb' || n.name === 'RgbArg' || n.name === 'Rgb16') {
          return extractRGB(n) ?? undefined;
        }
        return undefined;
      },
      // Tier 2 — non-structural named color
      (n) => {
        if (NAMED_COLORS[n.name] && !STRUCTURAL_NAMED.has(n.name)) {
          return extractRGB(n) ?? undefined;
        }
        return undefined;
      },
      // Tier 3 — structural named color (Black / White)
      (n) => {
        if (STRUCTURAL_NAMED.has(n.name)) {
          return extractRGB(n) ?? undefined;
        }
        return undefined;
      },
    ];

    for (const match of tiers) {
      const found = (function walk(n: StyleNode): RGB | undefined {
        const direct = match(n);
        if (direct) return direct;
        for (const child of n.args) {
          const deep = walk(child);
          if (deep) return deep;
        }
        return undefined;
      })(node);
      if (found) return found;
    }
    return undefined;
  };

  // Enum suffix for LockupTrL determines which lockup-family color this is.
  const lockupEnumOf = (node: StyleNode): string | undefined => {
    // Walk args from the end looking for a known LOCKUP_* / SaberBase::LOCKUP_*
    // identifier — Fett263 OS7 LockupTrL takes a trailing `Int<1>` priority
    // arg AFTER the lockup-type, so we can't just check args[length-1].
    for (let i = node.args.length - 1; i >= 0; i--) {
      const arg = node.args[i];
      const n = arg.name;
      if (
        n === 'SaberBase::LOCKUP_NORMAL' ||
        n === 'SaberBase::LOCKUP_DRAG' ||
        n === 'SaberBase::LOCKUP_LIGHTNING_BLOCK' ||
        n === 'SaberBase::LOCKUP_MELT' ||
        n === 'LOCKUP_NORMAL' ||
        n === 'LOCKUP_DRAG' ||
        n === 'LOCKUP_LIGHTNING_BLOCK' ||
        n === 'LOCKUP_MELT'
      ) {
        return n.replace('SaberBase::', '');
      }
    }
    return undefined;
  };

  const walk = (node: StyleNode): void => {
    if (
      (node.name === 'BlastL' ||
        node.name === 'ResponsiveBlastL' ||
        node.name === 'ResponsiveBlastFadeL' ||
        node.name === 'ResponsiveBlastWaveL') &&
      !result.blastColor
    ) {
      result.blastColor = firstColorIn(node);
    } else if (
      (node.name === 'SimpleClashL' ||
        node.name === 'ResponsiveClashL' ||
        node.name === 'LocalizedClash') &&
      !result.clashColor
    ) {
      result.clashColor = firstColorIn(node);
    } else if (
      node.name === 'LockupTrL' ||
      node.name === 'ResponsiveLockupL' ||
      node.name === 'Lockup' ||
      node.name === 'LockupTr'
    ) {
      const lockupEnum = lockupEnumOf(node);
      const color = firstColorIn(node);
      if (!color) {
        // fall through — no color to assign
      } else if (lockupEnum === 'LOCKUP_DRAG') {
        if (!result.dragColor) result.dragColor = color;
      } else if (lockupEnum === 'LOCKUP_LIGHTNING_BLOCK') {
        if (!result.lightningColor) result.lightningColor = color;
      } else if (lockupEnum === 'LOCKUP_MELT') {
        if (!result.meltColor) result.meltColor = color;
      } else {
        // Default / LOCKUP_NORMAL → treat as lockup
        if (!result.lockupColor) result.lockupColor = color;
      }
    } else if (
      node.name === 'ResponsiveLightningBlockL' &&
      !result.lightningColor
    ) {
      result.lightningColor = firstColorIn(node);
    } else if (node.name === 'ResponsiveDragL' && !result.dragColor) {
      result.dragColor = firstColorIn(node);
    } else if (node.name === 'ResponsiveMeltL' && !result.meltColor) {
      result.meltColor = firstColorIn(node);
    }
    for (const child of node.args) walk(child);
  };

  walk(ast);
  return result;
}

/**
 * Recover spatial lockup params from the first `ResponsiveLockupL<>` node.
 * Inverse of the emission branch in `buildEffectLayers` (ASTBuilder.ts).
 */
function resolveSpatialLockup(ast: StyleNode): {
  lockupPosition?: number;
  lockupRadius?: number;
} {
  const nodes = findNodes(ast, (n) => n.name === 'ResponsiveLockupL');
  if (nodes.length === 0) return {};
  const n = nodes[0];
  // Expected args: [COLOR, TR1, TR2, TOP, BOTTOM, SIZE]
  if (n.args.length < 6) return {};
  const top = extractInt(n.args[3]);
  const bottom = extractInt(n.args[4]);
  const size = extractInt(n.args[5]);
  if (top === null || bottom === null || size === null) return {};

  const position = (top + bottom) / 2 / 32768;
  const radius = size / 32768;
  return { lockupPosition: position, lockupRadius: radius };
}

/**
 * Find the EFFECT_* / SaberBase::EFFECT_* identifier in a TransitionEffectL's
 * argument list. OS7 emits `TransitionEffectL<TRANSITION, EFFECT>` (effect
 * is arg 1); pre-OS7 / Fredrik Style Editor emits
 * `TransitionEffectL<COLOR, TR_IN, TR_OUT, EFFECT>` (effect is arg 3).
 *
 * Returns both the matched effect token AND the index it was found at, so
 * downstream callers can peel off the right transition / color args.
 */
function findEffectIdInTransitionEffectL(
  node: StyleNode,
): { effect: string; index: number } | null {
  for (let i = 0; i < node.args.length; i++) {
    const n = node.args[i].name;
    if (
      n.startsWith('EFFECT_') ||
      n.startsWith('SaberBase::EFFECT_')
    ) {
      return { effect: n.replace('SaberBase::', ''), index: i };
    }
  }
  return null;
}

/**
 * Recover Preon config from a TransitionEffectL<..., EFFECT_PREON> layer
 * (inverse of the Preon emission branch in buildEffectLayers).
 *
 * Handles BOTH argument forms:
 *   OS7 (current): TransitionEffectL<TRANSITION, EFFECT_PREON>
 *   Pre-OS7:       TransitionEffectL<COLOR, TR_IN, TR_OUT, EFFECT_PREON>
 */
function resolvePreon(ast: StyleNode): {
  preonEnabled?: boolean;
  preonColor?: RGB;
  preonMs?: number;
} {
  const nodes = findNodes(ast, (n) => {
    if (n.name !== 'TransitionEffectL') return false;
    const found = findEffectIdInTransitionEffectL(n);
    return found?.effect === 'EFFECT_PREON';
  });
  if (nodes.length === 0) return {};
  const node = nodes[0];
  const effectInfo = findEffectIdInTransitionEffectL(node);
  if (!effectInfo) return { preonEnabled: true };

  // OS7 form: arg 0 is the transition (often TrConcat<TrInstant, COLOR, TrFade<ms>>)
  if (effectInfo.index === 1) {
    const trConcat = node.args[0];
    if (!trConcat || trConcat.name !== 'TrConcat') {
      return { preonEnabled: true };
    }
    // Expect TrConcat<TrInstant, Rgb<...>, TrFade<ms>> — but Fett263's
    // multi-stage preon shapes the TrConcat with many AlphaL+TrFadeX rungs;
    // recover the first color/fade we find at any depth.
    const colorNode = trConcat.args[1];
    const fadeNode = trConcat.args[2];
    const preonColor = colorNode ? extractRGB(colorNode) ?? undefined : undefined;
    const preonMs =
      fadeNode && (fadeNode.name === 'TrFade' || fadeNode.name === 'TrFadeX')
        ? extractTransitionDuration(fadeNode) ?? undefined
        : undefined;
    return { preonEnabled: true, preonColor, preonMs };
  }

  // Pre-OS7 form: TransitionEffectL<COLOR, TR_IN, TR_OUT, EFFECT_PREON>
  if (effectInfo.index === 3 && node.args.length >= 4) {
    const colorNode = node.args[0];
    const trIn = node.args[1];
    const preonColor = colorNode ? extractRGB(colorNode) ?? undefined : undefined;
    const preonMs = trIn ? extractTransitionDuration(trIn) ?? undefined : undefined;
    return { preonEnabled: true, preonColor, preonMs };
  }

  return { preonEnabled: true };
}

/**
 * Recover spatial-blast position from an AlphaL<BlastL<...>, Bump<...>>
 * wrapper (inverse of the spatial-blast emission branch).
 */
function resolveSpatialBlast(ast: StyleNode): {
  blastPosition?: number;
  blastRadius?: number;
} {
  const nodes = findNodes(
    ast,
    (n) =>
      n.name === 'AlphaL' &&
      n.args.length >= 2 &&
      n.args[0]?.name === 'BlastL' &&
      n.args[1]?.name === 'Bump',
  );
  if (nodes.length === 0) return {};
  const bump = nodes[0].args[1];
  const posRaw = extractInt(bump.args[0]);
  if (posRaw === null) return {};
  const sizeRaw = extractInt(bump.args[1]);
  return {
    blastPosition: posRaw / 32768,
    blastRadius: sizeRaw === null ? undefined : sizeRaw / 32768,
  };
}

/**
 * Recover spatial drag or melt position from
 * `AlphaL<LockupTrL<..., LOCKUP_DRAG|LOCKUP_MELT>, Bump<Int<pos>, Int<size>>>`.
 * Walks every AlphaL whose first arg is a LockupTrL; matches the lockup
 * enum to pick drag vs melt.
 */
function resolveLockupFamilySpatial(ast: StyleNode): {
  dragPosition?: number;
  dragRadius?: number;
  meltPosition?: number;
  meltRadius?: number;
} {
  const out: ReturnType<typeof resolveLockupFamilySpatial> = {};

  const alphaWrappers = findNodes(
    ast,
    (n) =>
      n.name === 'AlphaL' &&
      n.args.length >= 2 &&
      n.args[0]?.name === 'LockupTrL' &&
      n.args[1]?.name === 'Bump',
  );

  for (const wrapper of alphaWrappers) {
    const lockup = wrapper.args[0];
    const bump = wrapper.args[1];
    const enumArg = lockup.args[lockup.args.length - 1];
    if (!enumArg) continue;
    const enumName = enumArg.name.replace('SaberBase::', '');
    const posRaw = extractInt(bump.args[0]);
    const sizeRaw = extractInt(bump.args[1]);
    if (posRaw === null) continue;
    const position = posRaw / 32768;
    const radius = sizeRaw === null ? undefined : sizeRaw / 32768;
    if (enumName === 'LOCKUP_DRAG' && out.dragPosition === undefined) {
      out.dragPosition = position;
      out.dragRadius = radius;
    } else if (enumName === 'LOCKUP_MELT' && out.meltPosition === undefined) {
      out.meltPosition = position;
      out.meltRadius = radius;
    }
  }
  return out;
}

/**
 * Recover spatial stab from
 * `TransitionEffectL<TrConcat<TrInstant, AlphaL<Rgb, Bump<pos, size>>, TrFade>, EFFECT_STAB>`.
 *
 * Handles BOTH OS7 (2-arg) and pre-OS7 (4-arg) TransitionEffectL forms.
 */
function resolveSpatialStab(ast: StyleNode): {
  stabPosition?: number;
  stabRadius?: number;
} {
  const stabNodes = findNodes(ast, (n) => {
    if (n.name !== 'TransitionEffectL') return false;
    const found = findEffectIdInTransitionEffectL(n);
    return found?.effect === 'EFFECT_STAB';
  });
  if (stabNodes.length === 0) return {};
  const node = stabNodes[0];
  const effectInfo = findEffectIdInTransitionEffectL(node);
  if (!effectInfo) return {};

  // Find the TrConcat that wraps the AlphaL<Rgb, Bump> — its position varies
  // by form:
  //   OS7 (2-arg):     TransitionEffectL<TrConcat<...>, EFFECT_STAB>            → trConcat at arg 0
  //   pre-OS7 (4-arg): TransitionEffectL<COLOR, TR_IN, TrConcat<...>, EFFECT>   → trConcat at arg 2
  const trConcat = effectInfo.index === 1 ? node.args[0] : node.args[2];
  if (!trConcat || trConcat.name !== 'TrConcat') return {};

  // Walk TrConcat children looking for an AlphaL<color, Bump<pos, size>>.
  for (const child of trConcat.args) {
    if (child.name !== 'AlphaL') continue;
    const bump = child.args[1];
    if (!bump || bump.name !== 'Bump') continue;
    const posRaw = extractInt(bump.args[0]);
    if (posRaw === null) continue;
    const sizeRaw = extractInt(bump.args[1]);
    return {
      stabPosition: posRaw / 32768,
      stabRadius: sizeRaw === null ? undefined : sizeRaw / 32768,
    };
  }
  return {};
}

/** Find the first color in the tree that isn't inside a known effect layer. */
function findBaseColor(ast: StyleNode): RGB | undefined {
  // Effect-layer names that hide their FIRST color is the EFFECT color, NOT
  // the base. We only skip these — anything else is fair game for base color.
  const effectLayerNames = new Set([
    'BlastL',
    'SimpleClashL',
    'ResponsiveClashL',
    'ResponsiveBlastL',
    'ResponsiveBlastFadeL',
    'ResponsiveBlastWaveL',
    'ResponsiveLightningBlockL',
    'ResponsiveStabL',
    'ResponsiveDragL',
    'ResponsiveMeltL',
    'LockupTrL',
    'ResponsiveLockupL',
    'Lockup',
    'LockupTr',
    'LocalizedClash',
    'AudioFlickerL',
    'OnSpark',
    'TransitionEffectL',
    'TransitionPulseL',
    'TransitionLoop',
    'EffectSequence',
    'InOutTrL',
  ]);

  const walk = (node: StyleNode): RGB | undefined => {
    if (effectLayerNames.has(node.name)) return undefined;
    if (
      node.name === 'Rgb' ||
      node.name === 'RgbArg' ||
      node.name === 'Rgb16' ||
      NAMED_COLORS[node.name]
    ) {
      const rgb = extractRGB(node);
      if (rgb) return rgb;
    }
    for (const child of node.args) {
      const found = walk(child);
      if (found) return found;
    }
    return undefined;
  };

  return walk(ast);
}

/**
 * Detect any of the structural / variation patterns documented in Phase 0A
 * Section 4 and emit a friendly warning so the user knows part of their
 * style WILL round-trip but won't be editable through KyberStation today.
 */
function gatherStructuralWarnings(ast: StyleNode): string[] {
  const warnings: string[] = [];

  // ColorChange / ColorSelect / ColorChangeL — color menu with multiple stops.
  const hasColorChange = findNodes(ast, (n) => COLOR_CHANGE_WRAPPERS.has(n.name)).length > 0;
  if (hasColorChange) {
    warnings.push(
      'Color change menu detected — KyberStation imports preserve the menu structure but only the default color is editable in the visualizer.',
    );
  }

  // EffectSequence — Power Save / multi-state sequencer.
  const hasEffectSequence = findNodes(ast, (n) => n.name === 'EffectSequence').length > 0;
  if (hasEffectSequence) {
    warnings.push(
      'EffectSequence layer detected — preserved on round-trip but not surfaced as separately-editable steps in the visualizer.',
    );
  }

  // X-suffixed transitions inside InOutTrL — these usually carry a function
  // (SwingSpeed, IgnitionTime, etc.) for the duration arg, which the
  // reconstructor approximates with a representative ms value.
  const inOutNodes = findNodes(ast, (n) => n.name === 'InOutTrL');
  let foundXTransition = false;
  for (const inOut of inOutNodes) {
    for (const child of inOut.args) {
      if (
        (child.name.endsWith('X') && child.name.startsWith('Tr')) ||
        child.name === 'TrSparkX' ||
        child.name === 'TrWipeSparkTipX' ||
        child.name === 'TrCenterWipeX'
      ) {
        foundXTransition = true;
        break;
      }
    }
    if (foundXTransition) break;
  }
  if (foundXTransition) {
    warnings.push(
      'Function-driven transitions (Tr*X) detected in ignition/retraction — KyberStation approximates these with a representative duration.',
    );
  }

  return warnings;
}

/**
 * Recover ignition/retraction directly from a legacy `StyleNormalPtr<COLOR,
 * CLASH, IGN_MS, RET_MS>` (or `StyleStrobePtr` / `StyleFirePtr` /
 * `StyleRainbowPtr`) wrapper. Pre-OS6 / pre-OS7 configs commonly emit these
 * instead of `InOutTrL`. Returns null if the AST root isn't a legacy wrapper
 * — falls through to the standard `InOutTrL` extraction path.
 *
 * StyleNormalPtr signature:    <COLOR, CLASH_COLOR, OUT_MS, IN_MS>
 * StyleStrobePtr signature:    <COLOR, COLOR_STROBE, FREQ, OUT_MS, IN_MS>
 * StyleFirePtr signature:      <C1, C2, SIZE_VARIANT?, OUT_MS?, IN_MS?>
 *   — typically only 3 positional args; ms come from defaults
 * StyleRainbowPtr signature:   <OUT_MS?, IN_MS?>
 *
 * NB: `OUT_MS` here is ProffieOS's ignition (extension) duration; `IN_MS` is
 * retraction. The wrapper parameters happen to be named differently in
 * different Proffie versions; we stick to positional extraction.
 */
function resolveLegacyWrapperTransitions(ast: StyleNode): {
  ignition?: string;
  retraction?: string;
  ignitionMs?: number;
  retractionMs?: number;
  baseColor?: RGB;
  clashColor?: RGB;
} {
  // Walk past StylePtr / Layers if present.
  let candidate: StyleNode = ast;
  while (
    candidate &&
    (candidate.name === 'StylePtr' ||
      candidate.name === 'Layers') &&
    candidate.args.length > 0
  ) {
    candidate = candidate.args[0];
  }
  if (!candidate || !LEGACY_STYLE_WRAPPERS.has(candidate.name)) return {};

  const out: ReturnType<typeof resolveLegacyWrapperTransitions> = {};

  if (candidate.name === 'StyleNormalPtr' && candidate.args.length >= 4) {
    out.baseColor = extractRGB(candidate.args[0]) ?? undefined;
    out.clashColor = extractRGB(candidate.args[1]) ?? undefined;
    const ign = extractInt(candidate.args[2]);
    const ret = extractInt(candidate.args[3]);
    out.ignitionMs = ign === null ? undefined : ign;
    out.retractionMs = ret === null ? undefined : ret;
    out.ignition = 'standard';
    out.retraction = 'fadeout';
    return out;
  }

  if (candidate.name === 'StyleStrobePtr' && candidate.args.length >= 5) {
    out.baseColor = extractRGB(candidate.args[0]) ?? undefined;
    // arg 1 is the second strobe color; arg 2 is frequency Hz.
    const ign = extractInt(candidate.args[3]);
    const ret = extractInt(candidate.args[4]);
    out.ignitionMs = ign === null ? undefined : ign;
    out.retractionMs = ret === null ? undefined : ret;
    out.ignition = 'standard';
    out.retraction = 'fadeout';
    return out;
  }

  if (candidate.name === 'StyleFirePtr') {
    // Most StyleFirePtr signatures don't include explicit ms — rely on
    // defaults (300 / 800). If args 3+ are integers, treat them as ms.
    out.baseColor = extractRGB(candidate.args[0]) ?? undefined;
    if (candidate.args.length >= 5) {
      const ign = extractInt(candidate.args[3]);
      const ret = extractInt(candidate.args[4]);
      if (ign !== null) out.ignitionMs = ign;
      if (ret !== null) out.retractionMs = ret;
    }
    out.ignition = 'standard';
    out.retraction = 'fadeout';
    return out;
  }

  if (candidate.name === 'StyleRainbowPtr') {
    if (candidate.args.length >= 2) {
      const ign = extractInt(candidate.args[0]);
      const ret = extractInt(candidate.args[1]);
      if (ign !== null) out.ignitionMs = ign;
      if (ret !== null) out.retractionMs = ret;
    }
    out.ignition = 'standard';
    out.retraction = 'fadeout';
    return out;
  }

  return out;
}

/**
 * Recover BASE color from a flicker wrapper at the AST root (or just inside
 * StylePtr<Layers<>>). When the base is `BrownNoiseFlicker<base, Mix<...>,
 * 300>` or similar, the FIRST argument carries the visual base color.
 *
 * This is a separate codepath from `findBaseColor` because the flicker
 * wrappers themselves are NOT in the effect-layer skip list (they're a
 * legitimate base style). The skip-list version finds the first non-effect
 * color top-down; this one is the "first arg of a flicker" rule for when
 * the user authored a style without a top-level Rgb but with a flicker
 * wrapping pattern.
 */
function resolveFlickerBaseColor(ast: StyleNode): RGB | undefined {
  const core = unwrapToCore(ast);
  if (!core) return undefined;
  if (FLICKER_WRAPPERS.has(core.name) && core.args.length > 0) {
    return extractRGB(core.args[0]) ?? undefined;
  }
  return undefined;
}

/**
 * Walk the AST looking for a `ColorChange<TR, A, B, C, ...>`,
 * `ColorSelect<F, TR, A, B, C, ...>`, or `ColorChangeL<F, A, B, C, ...>`
 * wrapper and pull every color stop AFTER the first into an array of
 * alt-phase colors.
 *
 * Each wrapper has a different leading-arg pattern (number of "control"
 * args before the colour list starts) — see the per-shape offset below.
 *
 * Returns an empty array when no color-change wrapper is present.
 *
 * Sprint 5C (2026-05-02) — previously the whole color list past the
 * first color was silently dropped on import; this surfaces the rest
 * for future per-phase UI affordances.
 */
function resolveAltPhaseColors(ast: StyleNode): RGB[] {
  // Find the first color-change wrapper anywhere in the AST.
  const wrappers = findNodes(ast, (n) => COLOR_CHANGE_WRAPPERS.has(n.name));
  if (wrappers.length === 0) return [];
  const wrapper = wrappers[0];
  // Per-shape offset for "where the color list starts":
  //   ColorChange<TRANSITION, COLOR_A, COLOR_B, ...>     → 1
  //   ColorSelect<FUNCTION, TRANSITION, COLOR_A, ...>    → 2
  //   ColorChangeL<FUNCTION, COLOR_A, COLOR_B, ...>      → 1
  const colorStart =
    wrapper.name === 'ColorSelect' ? 2 : 1;
  const colorArgs = wrapper.args.slice(colorStart);
  if (colorArgs.length <= 1) return []; // single-color list = no alt phases
  const alts: RGB[] = [];
  for (const arg of colorArgs.slice(1)) {
    const rgb = extractRGB(arg);
    if (rgb) alts.push(rgb);
  }
  return alts;
}

/**
 * Effect-id leaf tokens the OS7 generator emits (and pre-OS7 sister
 * forms). When `TransitionEffectL<EFFECT_X, ...>` (OS7) or
 * `TransitionEffectL<style, trIn, trOut, EFFECT_X>` (pre-OS7) appears
 * in the AST, the user's style references that event. Surfacing the
 * set lets future visualizer overlays render flash effects per event
 * without reparsing.
 *
 * Whitelist instead of "any EFFECT_*" so we don't accidentally count
 * unrelated identifier tokens that happen to have the prefix.
 */
const KNOWN_EFFECT_IDS = new Set<string>([
  'EFFECT_NONE',
  'EFFECT_CLASH',
  'EFFECT_BLAST',
  'EFFECT_LOCKUP_BEGIN',
  'EFFECT_LOCKUP_END',
  'EFFECT_DRAG_BEGIN',
  'EFFECT_DRAG_END',
  'EFFECT_LIGHTNING_BLOCK_BEGIN',
  'EFFECT_LIGHTNING_BLOCK_END',
  'EFFECT_STAB',
  'EFFECT_PREON',
  'EFFECT_POSTOFF',
  'EFFECT_BOOT',
  'EFFECT_NEWFONT',
  'EFFECT_FORCE',
  'EFFECT_QUOTE',
  'EFFECT_USER1',
  'EFFECT_USER2',
  'EFFECT_USER3',
  'EFFECT_USER4',
  'EFFECT_USER5',
  'EFFECT_USER6',
  'EFFECT_USER7',
  'EFFECT_USER8',
  'EFFECT_FAST_ON',
  'EFFECT_OFF',
  'EFFECT_ON',
  'EFFECT_IGNITION',
  'EFFECT_RETRACTION',
  'EFFECT_BATTERY_LEVEL',
  'EFFECT_VOLUME_LEVEL',
  'EFFECT_SOUND_LOOP',
  'EFFECT_ALT_SOUND',
  'EFFECT_POWERSAVE',
]);

/**
 * Find every `EFFECT_*` event the AST references. Returns a sorted
 * deduped list — order doesn't carry meaning, just convenience.
 */
function detectEffectIds(ast: StyleNode): string[] {
  const found = new Set<string>();
  const walk = (node: StyleNode): void => {
    if (KNOWN_EFFECT_IDS.has(node.name)) {
      found.add(node.name);
    }
    for (const arg of node.args) walk(arg);
  };
  walk(ast);
  return Array.from(found).sort();
}

/**
 * Reconstruct a BladeConfig from a parsed AST.
 */
export function reconstructConfig(ast: StyleNode): ReconstructedConfig {
  const warnings: string[] = [];
  let confidence = 0;

  // Detect style — this also handles legacy StyleNormalPtr / StyleFirePtr /
  // etc. as well as ColorChange<>/ColorSelect<> wrappers via unwrapToCore.
  const { style, confidence: styleConfidence } = detectStyle(ast);
  confidence = styleConfidence;

  // Legacy wrapper extraction (StyleNormalPtr<C, CL, IGN, RET> etc.) takes
  // priority over InOutTrL extraction since legacy configs don't emit InOutTrL.
  const legacy = resolveLegacyWrapperTransitions(ast);

  // Base color: legacy wrapper > flicker wrapper > first non-effect Rgb.
  // Falls back to the canonical default blue when nothing matches.
  const baseColor =
    legacy.baseColor ??
    resolveFlickerBaseColor(ast) ??
    findBaseColor(ast) ??
    { r: 0, g: 0, b: 255 };

  // Effect colors: resolved by the layer each color lives in.
  const containerColors = resolveColorsByContainer(ast);

  // Spatial lockup params from ResponsiveLockupL<>, if present.
  const spatialLockup = resolveSpatialLockup(ast);

  // Preon config from TransitionEffectL<..., EFFECT_PREON>, if present.
  const preon = resolvePreon(ast);

  // Spatial blast position from AlphaL<BlastL<>, Bump<>>, if present.
  const spatialBlast = resolveSpatialBlast(ast);

  // Spatial drag / melt from AlphaL<LockupTrL<..., LOCKUP_DRAG|MELT>, Bump<>>
  const lockupFamily = resolveLockupFamilySpatial(ast);

  // Spatial stab from TransitionEffectL<..., EFFECT_STAB>
  const spatialStab = resolveSpatialStab(ast);

  // Look for InOutTrL to extract ignition/retraction. Forward emits
  // `InOutTrL<ignitionTr, retractionTr>` — exactly 2 args, NOT 3+; the old
  // `inOut.args.length >= 3` guard silently masked ms extraction.
  let ignition: string | undefined = legacy.ignition;
  let retraction: string | undefined = legacy.retraction;
  let ignitionMs: number | undefined = legacy.ignitionMs;
  let retractionMs: number | undefined = legacy.retractionMs;

  const inOutNodes = findNodes(ast, (n) => n.name === 'InOutTrL');
  if (inOutNodes.length > 0) {
    const inOut = inOutNodes[0];
    if (inOut.args.length >= 2) {
      const ignTr = inOut.args[0];
      const retTr = inOut.args[1];

      const ignLookup = ignitionFromAST(ignTr);
      const retLookup = retractionFromAST(retTr);

      // Prefer InOutTrL-recovered values over legacy wrapper defaults
      // (a config that has both is unusual; the InOutTrL form is more
      // explicit and Fett263-style). Falls back to legacy if InOut doesn't
      // resolve.
      ignition = ignLookup?.id ?? ignition;
      retraction = retLookup?.id ?? retraction;

      const ignMs =
        ignLookup?.ms ?? extractTransitionDuration(ignTr) ?? undefined;
      const retMs =
        retLookup?.ms ?? extractTransitionDuration(retTr) ?? undefined;
      if (ignMs !== undefined) ignitionMs = ignMs;
      if (retMs !== undefined) retractionMs = retMs;

      confidence = Math.min(confidence + 0.1, 1);
    }
  }

  // Detect RgbArg usage (Edit Mode) — confidence-only signal for now.
  const rgbArgNodes = findNodes(ast, (n) => n.name === 'RgbArg');
  if (rgbArgNodes.length > 0) {
    confidence = Math.min(confidence + 0.05 * rgbArgNodes.length, 1);
  }

  const definedColorCount = [
    baseColor,
    containerColors.blastColor,
    containerColors.clashColor,
    containerColors.lockupColor,
  ].filter(Boolean).length;

  if (definedColorCount === 0) {
    warnings.push('No colors found in style — using defaults');
    confidence *= 0.5;
  } else if (definedColorCount < 3) {
    warnings.push(
      `Only ${definedColorCount} color(s) resolved from containers — some effect colors will use defaults`,
    );
  }

  // Merge structural warnings (color-change, EffectSequence, X-suffixed transitions)
  warnings.push(...gatherStructuralWarnings(ast));

  return {
    style,
    baseColor,
    clashColor: containerColors.clashColor ?? legacy.clashColor,
    blastColor: containerColors.blastColor,
    lockupColor: containerColors.lockupColor,
    dragColor: containerColors.dragColor,
    lightningColor: containerColors.lightningColor,
    meltColor: containerColors.meltColor,
    ignition,
    retraction,
    ignitionMs,
    retractionMs,
    lockupPosition: spatialLockup.lockupPosition,
    lockupRadius: spatialLockup.lockupRadius,
    preonEnabled: preon.preonEnabled,
    preonColor: preon.preonColor,
    preonMs: preon.preonMs,
    blastPosition: spatialBlast.blastPosition,
    blastRadius: spatialBlast.blastRadius,
    dragPosition: lockupFamily.dragPosition,
    dragRadius: lockupFamily.dragRadius,
    meltPosition: lockupFamily.meltPosition,
    meltRadius: lockupFamily.meltRadius,
    stabPosition: spatialStab.stabPosition,
    stabRadius: spatialStab.stabRadius,
    altPhaseColors: resolveAltPhaseColors(ast),
    detectedEffectIds: detectEffectIds(ast),
    confidence: Math.round(confidence * 100) / 100,
    warnings,
    rawAST: ast,
  };
}

// ─── Test seam exports (subset) ───
//
// Internal helpers exposed for unit-level testing of the new Fett263 patterns
// without going through the full `reconstructConfig` entry point. Not part of
// the public API; importers outside the test suite should use
// `reconstructConfig` instead.
export const __test = {
  ARG_SLOT_IDS,
  LEGACY_STYLE_WRAPPERS,
  FLICKER_WRAPPERS,
  COLOR_CHANGE_WRAPPERS,
  KNOWN_EFFECT_IDS,
  extractRGB,
  extractInt,
  unwrapToCore,
  detectStyle,
  findEffectIdInTransitionEffectL,
  resolveLegacyWrapperTransitions,
  resolveFlickerBaseColor,
  resolveColorsByContainer,
  resolvePreon,
  resolveSpatialStab,
  resolveAltPhaseColors,
  detectEffectIds,
  gatherStructuralWarnings,
};
