// ─── AST → BladeConfig Reconstructor ───
// Heuristic pattern matching to reverse-engineer BladeConfig from a parsed AST.

import type { StyleNode } from '../types.js';

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
  ignition?: string;
  retraction?: string;
  ignitionMs?: number;
  retractionMs?: number;
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
 * Extract an integer value from an Int<N> or raw integer node.
 */
function extractInt(node: StyleNode): number | null {
  if (node.name === 'Int' && node.args.length > 0 && node.args[0].type === 'raw') {
    return parseInt(node.args[0].name, 10);
  }
  if (node.type === 'raw') {
    return parseInt(node.name, 10);
  }
  if (node.type === 'integer' && node.args.length > 0 && node.args[0].type === 'raw') {
    return parseInt(node.args[0].name, 10);
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
 */
function detectStyle(node: StyleNode): { style: string; confidence: number } {
  // Unwrap StylePtr and InOutTrL to find the core style
  const core = unwrapToCore(node);
  if (!core) return { style: 'custom', confidence: 0.1 };

  const name = core.name;

  // Direct matches
  if (name === 'AudioFlicker') return { style: 'stable', confidence: 0.9 };
  if (name === 'StyleFire') return { style: 'fire', confidence: 0.95 };
  if (name === 'Stripes') return { style: 'unstable', confidence: 0.9 };
  if (name === 'Pulsing') return { style: 'pulse', confidence: 0.9 };
  if (name === 'Gradient') return { style: 'gradient', confidence: 0.85 };
  if (name === 'Rainbow') return { style: 'gradient', confidence: 0.7 };
  if (name === 'HumpFlicker') return { style: 'stable', confidence: 0.8 };
  if (name === 'Rgb') return { style: 'stable', confidence: 0.6 };

  // Named colors
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

/**
 * Detect ignition transition type from a transition node name.
 */
function detectIgnitionType(name: string): string {
  if (name === 'TrWipe' || name === 'TrWipeX') return 'standard';
  if (name === 'TrWipeIn' || name === 'TrWipeInX') return 'scroll';
  if (name === 'TrCenterWipe' || name === 'TrCenterWipeX') return 'center';
  if (name === 'TrFade' || name === 'TrFadeX') return 'fadeout';
  if (name === 'TrWipeSparkTip' || name === 'TrWipeSparkTipX') return 'spark';
  if (name === 'TrSmoothFade') return 'standard';
  return 'standard';
}

/**
 * Extract transition duration from a transition node.
 */
function extractTransitionDuration(node: StyleNode): number | null {
  if (node.args.length > 0) {
    return extractInt(node.args[0]);
  }
  return null;
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

  // Extract all RGB colors from the tree
  const rgbNodes = findNodes(ast, (n) => n.name === 'Rgb' || n.name === 'RgbArg' || !!NAMED_COLORS[n.name]);
  const colors = rgbNodes.map(extractRGB).filter((c): c is RGB => c !== null);

  // Assign colors based on position (heuristic: first = base, effect colors come later in Layers)
  const baseColor = colors[0] ?? { r: 0, g: 0, b: 255 };
  const blastColor = colors.length > 1 ? colors[1] : { r: 255, g: 255, b: 255 };
  const clashColor = colors.length > 2 ? colors[2] : { r: 255, g: 255, b: 255 };
  const lockupColor = colors.length > 3 ? colors[3] : { r: 255, g: 255, b: 255 };

  // Look for InOutTrL to extract ignition/retraction
  let ignition = 'standard';
  let retraction = 'standard';
  let ignitionMs = 300;
  let retractionMs = 800;

  const inOutNodes = findNodes(ast, (n) => n.name === 'InOutTrL');
  if (inOutNodes.length > 0) {
    const inOut = inOutNodes[0];
    // InOutTrL<style, ignitionTr, retractionTr, offColor>
    if (inOut.args.length >= 3) {
      const ignTr = inOut.args[1];
      const retTr = inOut.args[2];

      ignition = detectIgnitionType(ignTr.name);
      retraction = detectIgnitionType(retTr.name);

      const ignMs = extractTransitionDuration(ignTr);
      const retMs = extractTransitionDuration(retTr);
      if (ignMs !== null) ignitionMs = ignMs;
      if (retMs !== null) retractionMs = retMs;

      confidence = Math.min(confidence + 0.1, 1);
    }
  }

  // Detect RgbArg usage (Edit Mode)
  const rgbArgNodes = findNodes(ast, (n) => n.name === 'RgbArg');
  if (rgbArgNodes.length > 0) {
    // Re-assign colors from RgbArg positions
    for (const argNode of rgbArgNodes) {
      const idx = argNode.args.length > 0 ? extractInt(argNode.args[0]) : null;
      const color = argNode.args.length > 1 ? extractRGB(argNode.args[1]) : null;
      if (idx !== null && color) {
        // Standard Fett263 mapping
        // We don't reassign here since we already extracted colors above
        confidence = Math.min(confidence + 0.05, 1);
      }
    }
  }

  if (colors.length === 0) {
    warnings.push('No colors found in style — using defaults');
    confidence *= 0.5;
  }

  if (colors.length < 3) {
    warnings.push(`Only ${colors.length} color(s) found — some effect colors will use defaults`);
  }

  return {
    style,
    baseColor,
    clashColor,
    blastColor,
    lockupColor,
    ignition,
    retraction,
    ignitionMs,
    retractionMs,
    confidence: Math.round(confidence * 100) / 100,
    warnings,
    rawAST: ast,
  };
}
