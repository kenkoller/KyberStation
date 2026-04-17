// ─── Parser Validation Tests (v0.10.0) ───
//
// Covers the non-fatal warnings the parser emits for:
//   - unknown template names (typos, unregistered OS7 features)
//   - arg-count mismatches against the template registry
//
// Warnings never prevent a successful parse — they're a diagnostic
// channel that the editor UI surfaces to help users spot typos before
// trying to compile.

import { describe, it, expect } from 'vitest';
import { parseStyleCode } from '../src/parser/index.js';

describe('parser validation — unknown templates', () => {
  it('warns on a clearly-misspelled template', () => {
    const { warnings, ast } = parseStyleCode('StyleFIRE<Rgb<0,0,255>>');
    expect(ast).not.toBeNull();
    expect(warnings.some((w) => w.template === 'StyleFIRE')).toBe(true);
  });

  it('does not warn for SaberBase enum values', () => {
    // LOCKUP_* and EFFECT_* are runtime enums, not templates.
    const { warnings } = parseStyleCode(
      'LockupTrL<Rgb<255,200,80>,TrInstant,TrFade<300>,SaberBase::LOCKUP_NORMAL>',
    );
    // None of the warnings should mention SaberBase or LOCKUP_.
    expect(warnings.every((w) => !(w.template ?? '').startsWith('SaberBase'))).toBe(true);
    expect(warnings.every((w) => !(w.template ?? '').startsWith('LOCKUP_'))).toBe(true);
  });

  it('does not warn for primitive colour names', () => {
    const { warnings } = parseStyleCode('TrWipeSparkTip<White,300>');
    expect(warnings.some((w) => w.template === 'White')).toBe(false);
  });

  it('does not warn for properly-registered templates', () => {
    const { warnings } = parseStyleCode(
      'StylePtr<Layers<AudioFlicker<Rgb<0,0,255>,Mix<Int<16384>,Rgb<0,0,255>,White>>>>',
    );
    expect(warnings.filter((w) => w.template)).toEqual([]);
  });
});

describe('parser validation — arg-count mismatches', () => {
  it('warns when Rgb has extra args', () => {
    // Rgb expects exactly 3 INTEGER args.
    const { warnings } = parseStyleCode('Rgb<0,0,255,42>');
    expect(warnings.some((w) => w.template === 'Rgb')).toBe(true);
    expect(
      warnings.find((w) => w.template === 'Rgb')?.message ?? '',
    ).toContain('3 arg');
  });

  it('warns when Int has zero args but was invoked with <>', () => {
    // The parser can't actually generate `Int<>` (angle brackets require
    // at least something in the current grammar), so instead test a
    // known-shape template with wrong count.
    const { warnings } = parseStyleCode('TrFade<300,400,500>');
    expect(warnings.some((w) => w.template === 'TrFade')).toBe(true);
  });

  it('does not warn when arg count matches registry', () => {
    const { warnings } = parseStyleCode('Rgb<255,100,50>');
    expect(warnings.some((w) => w.template === 'Rgb')).toBe(false);
  });

  it('does not warn for zero-arg templates like Rainbow', () => {
    const { warnings } = parseStyleCode('Rainbow');
    expect(warnings.filter((w) => w.template === 'Rainbow')).toEqual([]);
  });
});

describe('parser validation — warnings never block a parse', () => {
  it('returns a valid AST even for unknown templates', () => {
    const { ast, errors } = parseStyleCode('MadeUpTemplate<1,2,3>');
    expect(ast).not.toBeNull();
    expect(ast?.name).toBe('MadeUpTemplate');
    expect(errors).toEqual([]);
  });

  it('returns a valid AST even on arg-count mismatch', () => {
    const { ast, errors } = parseStyleCode('Rgb<1,2,3,4,5>');
    expect(ast).not.toBeNull();
    expect(ast?.args.length).toBe(5);
    expect(errors).toEqual([]);
  });
});
