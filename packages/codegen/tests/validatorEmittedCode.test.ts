// ─── Validator ↔ emitter contract ───
//
// validateAST()'s bracket check scans the text emitCode() actually prints,
// so it catches an emitter bug even when every node in the tree is well
// formed. To prove that, this file swaps in a deliberately broken emitter
// (drops the final '>' / ')' ) and checks that a perfectly valid tree is
// then reported invalid. The pre-2026-09 validator counted brackets over the
// tree itself and could never notice this.
//
// Kept in its own file because vi.mock replaces CodeEmitter for every test
// in the module.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/CodeEmitter.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/CodeEmitter.js')>();
  return {
    ...actual,
    emitCode: (...args: Parameters<typeof actual.emitCode>) => {
      const code = actual.emitCode(...args);
      // Simulated regression: the emitter forgets the last closing character.
      return code.slice(0, -1);
    },
  };
});

import { buildAST, validateAST } from '../src/index.js';
import type { BladeConfig } from '../src/index.js';

const config: BladeConfig = {
  baseColor: { r: 0, g: 0, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 255, b: 0 },
  blastColor: { r: 255, g: 0, b: 0 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 400,
  shimmer: 0,
  ledCount: 144,
};

describe('validateAST checks the emitted text, not the tree', () => {
  it('reports a well-formed tree invalid when the emitter drops a delimiter', () => {
    const result = validateAST(buildAST(config));
    // Every node is fine, so the only error is the bracket check on the
    // (broken) emitted text: StylePtr<…>( is left with an open '('.
    expect(result.valid).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(
      /^Parentheses are unbalanced: '\(' at \d+:\d+ is never closed$/,
    );
    expect(result.errors[0].path).toMatch(/^emitted@\d+:\d+$/);
  });
});
