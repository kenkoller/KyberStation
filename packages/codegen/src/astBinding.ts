// ─── AST Binding Layer ───
//
// Single-entry façade over the Config ↔ AST ↔ Code pipeline. Six seams:
//   1. configToAST   — Config → AST              (thin wrapper over buildAST)
//   2. astToCode     — AST    → Code             (thin wrapper over emitCode)
//   3. codeToAST     — Code   → AST              (thin wrapper over parseStyleCode)
//   4. astToConfig   — AST    → Config           (thin wrapper over reconstructConfig)
//   5. sync{FromConfig,FromCode} — pure BindingState transitions
//   6. hitToLED / positionToProffie — pure hit-test math for the Edit Mode UI
//
// All seams are side-effect-free and framework-independent (no React, Zustand,
// window, DOM). The webapp binds them via a Zustand store in later phases.

import type {
  StyleNode,
  EmitOptions,
} from './types.js';
import type {
  BladeConfig,
  BuildOptions,
} from './ASTBuilder.js';
import { buildAST } from './ASTBuilder.js';
import { emitCode } from './CodeEmitter.js';
import { parseStyleCode } from './parser/index.js';
import type {
  ParseError,
  ParseWarning,
  ReconstructedConfig,
} from './parser/index.js';
import { reconstructConfig } from './parser/index.js';

// ─── Seams 1–4 ───

export function configToAST(
  config: BladeConfig,
  opts?: BuildOptions,
): StyleNode {
  return buildAST(config, opts);
}

export function astToCode(ast: StyleNode, opts?: EmitOptions): string {
  return emitCode(ast, opts);
}

export function codeToAST(code: string): {
  ast: StyleNode | null;
  errors: ParseError[];
  warnings: ParseWarning[];
} {
  const result = parseStyleCode(code);
  return {
    ast: result.ast,
    errors: result.errors,
    warnings: result.warnings,
  };
}

export function astToConfig(ast: StyleNode): ReconstructedConfig {
  return reconstructConfig(ast);
}

// ─── Seam 5: Pure binding state ───
//
// The BindingState is a snapshot of the three representations. The `dirty`
// field tracks which side most recently changed so downstream UI can decide
// whether to re-render the code editor or the visual editor. `syncFromConfig`
// and `syncFromCode` are pure transitions — they never throw; parse errors
// are returned alongside the new state.

export interface BindingState {
  config: BladeConfig;
  ast: StyleNode;
  code: string;
  dirty: 'none' | 'fromConfig' | 'fromCode';
}

export function makeInitialBindingState(config: BladeConfig): BindingState {
  const ast = configToAST(config);
  return {
    config,
    ast,
    code: astToCode(ast),
    dirty: 'none',
  };
}

export function syncFromConfig(
  // `prev` is accepted for symmetry with `syncFromCode` and future uses
  // (e.g. preserving computed metadata across syncs), but not currently read.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: BindingState,
  next: BladeConfig,
): BindingState {
  const ast = configToAST(next);
  return {
    config: next,
    ast,
    code: astToCode(ast),
    dirty: 'fromConfig',
  };
}

export function syncFromCode(
  prev: BindingState,
  nextCode: string,
): { state: BindingState; errors: ParseError[] } {
  const { ast, errors } = codeToAST(nextCode);
  if (!ast) {
    // Parse failed — keep the previous config/AST but surface the attempted code.
    return {
      state: { ...prev, code: nextCode, dirty: 'fromCode' },
      errors,
    };
  }
  const reconstructed = astToConfig(ast);
  // reconstructed is a partial; fall back to prev.config for fields that
  // didn't round-trip. This is the main reason `syncFromCode` cannot lose
  // work silently — if parsing succeeds but reconstruction drops a field,
  // the prior value is preserved.
  const nextConfig: BladeConfig = {
    ...prev.config,
    ...Object.fromEntries(
      Object.entries(reconstructed).filter(
        ([k, v]) =>
          v !== undefined &&
          k !== 'confidence' &&
          k !== 'warnings' &&
          k !== 'rawAST',
      ),
    ),
  } as BladeConfig;

  return {
    state: {
      config: nextConfig,
      ast,
      code: nextCode,
      dirty: 'fromCode',
    },
    errors,
  };
}

// ─── Seam 6: Hit-test math ───
//
// Pure geometry — no DOM, no canvas. Takes design-space coordinates (the
// 1200×600 coordinate system the BladeCanvas renders in) and computes which
// LED (if any) the pointer is over.

export interface HitGeometry {
  /** X coord of the emitter end of the blade in design space. */
  bladeStartX: number;
  /** Length of the blade in design space. */
  bladeLenX: number;
  /** Y coord of the blade core's vertical centerline in design space. */
  bladeY: number;
  /**
   * Vertical tolerance (px) around `bladeY` where hits still register.
   * Defaults to 40 (covers blade core + glow).
   */
  toleranceY?: number;
}

export interface LEDHit {
  /** 0-based LED index. */
  ledIndex: number;
  /** Position along blade 0..1 (0 = hilt end, 1 = tip). */
  position: number;
  /**
   * Same position expressed in ProffieOS's 0..32768 fixed-point units —
   * the scale used by Int<> arguments to ResponsiveLockupL, etc.
   */
  proffiePos: number;
}

/** Clamp a number to [0, 1]. */
export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Convert a 0..1 blade position to ProffieOS fixed-point (0..32768). */
export function positionToProffie(position01: number): number {
  return Math.round(clamp01(position01) * 32768);
}

/**
 * Map a design-space click to an LED index on the blade.
 * Returns `null` if the point is off-blade or outside the vertical tolerance.
 */
export function hitToLED(
  canvasX: number,
  canvasY: number,
  geom: HitGeometry,
  ledCount: number,
): LEDHit | null {
  const tolerance = geom.toleranceY ?? 40;
  if (Math.abs(canvasY - geom.bladeY) > tolerance) return null;
  if (canvasX < geom.bladeStartX) return null;
  if (canvasX > geom.bladeStartX + geom.bladeLenX) return null;

  const position = clamp01((canvasX - geom.bladeStartX) / geom.bladeLenX);
  const ledIndex = Math.max(
    0,
    Math.min(ledCount - 1, Math.round(position * (ledCount - 1))),
  );
  const proffiePos = positionToProffie(position);

  return { ledIndex, position, proffiePos };
}
