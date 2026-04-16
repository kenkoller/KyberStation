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
};

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
 */
function extractInt(node: StyleNode): number | null {
  if (!node) return null;
  // Unwrap Int / IntArg wrappers recursively.
  if (
    (node.name === 'Int' || node.name === 'IntArg') &&
    node.args.length > 0
  ) {
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
 * Detect the base style from the AST root pattern.
 *
 * Disambiguation logic mirrors `buildBaseStyle` in ASTBuilder.ts:
 *   - `AudioFlicker`           → stable
 *   - `StyleFire`, 2nd = Mix   → unstable (5-arg with FireConfig)
 *   - `StyleFire`, 2nd = Rgb<255,200,50>, FireConfig<2,...> → fire
 *   - `StyleFire`, 2nd = Rgb  (edge), FireConfig<4,2500,8>  → plasma
 *   - `Pulsing`                → pulse
 *   - `Stripes<5000,-1500,...>` → photon
 *   - `Stripes<3000,-2000,...>` → crystalShatter
 *   - `Mix<SwingSpeed<400>,...>` → rotoscope
 *   - `Mix<SwingSpeed<300>, StyleFire<>, ...>` → cinder
 *   - `Gradient<>`             → gradient (2 args) / painted (more args)
 *   - `Rainbow`                → aurora (prism collides; we always return aurora)
 */
function detectStyle(node: StyleNode): { style: string; confidence: number } {
  const core = unwrapToCore(node);
  if (!core) return { style: 'custom', confidence: 0.1 };

  const name = core.name;

  if (name === 'AudioFlicker') return { style: 'stable', confidence: 0.9 };
  if (name === 'HumpFlicker') return { style: 'stable', confidence: 0.8 };

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

  // Mix<SwingSpeed<N>, ...> disambiguates rotoscope vs cinder.
  if (name === 'Mix') {
    const first = core.args[0];
    if (first?.name === 'SwingSpeed') {
      const speed = extractInt(first.args[0]);
      if (speed === 400) return { style: 'rotoscope', confidence: 0.9 };
      if (speed === 300) return { style: 'cinder', confidence: 0.9 };
      // Unknown SwingSpeed — prefer rotoscope (more common pattern).
      return { style: 'rotoscope', confidence: 0.5 };
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
  if (NAMED_COLORS[name]) return { style: 'stable', confidence: 0.5 };

  return { style: 'custom', confidence: 0.2 };
}

/**
 * Unwrap StylePtr<>, InOutTrL<>, and Layers<> to find the core style node.
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
  return node;
}

// `detectIgnitionType` used to live here with an inverted map (TrWipe →
// 'standard' but forward emits 'standard' → TrWipeIn). The canonical
// ignition/retraction table now lives in transitionMap.ts; see the
// `ignitionFromAST` / `retractionFromAST` helpers below.

/**
 * Extract transition duration from a transition node.
 * Used as a fallback when the transitionMap entry doesn't cover this node.
 */
function extractTransitionDuration(node: StyleNode): number | null {
  if (node.args.length > 0) {
    return extractInt(node.args[0]);
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
  const STRUCTURAL_NAMED = new Set(['Black', 'White']);

  // Find the most specific color inside a node. Prefers Rgb/RgbArg, then
  // non-structural named colors, then structural ones — all via depth-first
  // traversal. Returns the first color in each tier, searching the whole
  // subtree before falling back to a weaker tier.
  const firstColorIn = (node: StyleNode): RGB | undefined => {
    const tiers: Array<(n: StyleNode) => RGB | undefined> = [
      // Tier 1 — explicit Rgb / RgbArg
      (n) => {
        if (n.name === 'Rgb' || n.name === 'RgbArg') {
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
    const last = node.args[node.args.length - 1];
    if (!last) return undefined;
    const n = last.name;
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
    return undefined;
  };

  const walk = (node: StyleNode): void => {
    if (node.name === 'BlastL' && !result.blastColor) {
      result.blastColor = firstColorIn(node);
    } else if (
      (node.name === 'SimpleClashL' || node.name === 'ResponsiveClashL') &&
      !result.clashColor
    ) {
      result.clashColor = firstColorIn(node);
    } else if (
      node.name === 'LockupTrL' ||
      node.name === 'ResponsiveLockupL'
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

/** Find the first color in the tree that isn't inside a known effect layer. */
function findBaseColor(ast: StyleNode): RGB | undefined {
  const effectLayerNames = new Set([
    'BlastL',
    'SimpleClashL',
    'ResponsiveClashL',
    'LockupTrL',
    'ResponsiveLockupL',
    'AudioFlickerL',
    'InOutTrL',
  ]);

  const walk = (node: StyleNode): RGB | undefined => {
    if (effectLayerNames.has(node.name)) return undefined;
    if (
      node.name === 'Rgb' ||
      node.name === 'RgbArg' ||
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
 * Reconstruct a BladeConfig from a parsed AST.
 */
export function reconstructConfig(ast: StyleNode): ReconstructedConfig {
  const warnings: string[] = [];
  let confidence = 0;

  // Detect style
  const { style, confidence: styleConfidence } = detectStyle(ast);
  confidence = styleConfidence;

  // Base color: first RGB encountered outside any effect layer.
  const baseColor = findBaseColor(ast) ?? { r: 0, g: 0, b: 255 };

  // Effect colors: resolved by the layer each color lives in.
  const containerColors = resolveColorsByContainer(ast);

  // Spatial lockup params from ResponsiveLockupL<>, if present.
  const spatialLockup = resolveSpatialLockup(ast);

  // Look for InOutTrL to extract ignition/retraction. Forward emits
  // `InOutTrL<ignitionTr, retractionTr>` — exactly 2 args, NOT 3+; the old
  // `inOut.args.length >= 3` guard silently masked ms extraction.
  let ignition: string | undefined;
  let retraction: string | undefined;
  let ignitionMs: number | undefined;
  let retractionMs: number | undefined;

  const inOutNodes = findNodes(ast, (n) => n.name === 'InOutTrL');
  if (inOutNodes.length > 0) {
    const inOut = inOutNodes[0];
    if (inOut.args.length >= 2) {
      const ignTr = inOut.args[0];
      const retTr = inOut.args[1];

      const ignLookup = ignitionFromAST(ignTr);
      const retLookup = retractionFromAST(retTr);

      ignition = ignLookup?.id;
      retraction = retLookup?.id;

      ignitionMs =
        ignLookup?.ms ?? extractTransitionDuration(ignTr) ?? undefined;
      retractionMs =
        retLookup?.ms ?? extractTransitionDuration(retTr) ?? undefined;

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

  return {
    style,
    baseColor,
    clashColor: containerColors.clashColor,
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
    confidence: Math.round(confidence * 100) / 100,
    warnings,
    rawAST: ast,
  };
}
