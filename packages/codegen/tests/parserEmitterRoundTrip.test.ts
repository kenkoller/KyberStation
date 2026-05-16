// ─── Parser ↔ Emitter Round-Trip Tests ───
//
// Regression coverage for the Int<> double-wrap quirk discovered by PR #328.
//
// The bug: `parse → emit → parse → emit ...` was adding an extra `Int<>`
// wrapper per cycle around bare integer literals because the parser
// produced a non-flat shape for bare integers that the emitter then
// re-emitted as `Int<...>`. Each round-trip compounded the corruption.
//
// Shapes the codebase recognizes for integers (see transitionMap.ts:36-49):
//   - Emitter / ASTBuilder bare integer: { type: 'integer', name: '<num>', args: [] }
//   - Explicit `Int<num>` wrapper:        { type: 'function', name: 'Int', args: [<bareInt>] }
//
// Before this fix, the parser produced a third "mixed" shape for bare ints
// — `{ type: 'integer', name: 'Int', args: [<raw num>] }` — that emit() then
// rendered as `Int<200>`. The fix flattens the parser output to the canonical
// emitter-produced shape so parse → emit becomes idempotent on bare integers.

import { describe, it, expect } from 'vitest';
import { parseStyleCode } from '../src/parser/index.js';
import { emitCode } from '../src/CodeEmitter.js';

function parseAndEmit(source: string): string {
  const { ast, errors } = parseStyleCode(source);
  if (!ast) throw new Error(`parse failed for ${source}: ${JSON.stringify(errors)}`);
  return emitCode(ast, { minified: true });
}

describe('parse → emit round-trip on bare integer literals', () => {
  it('preserves a bare integer arg without wrapping it in Int<>', () => {
    const source = 'Layers<Black,BlastL<White,200>>';
    expect(parseAndEmit(source)).toBe(source);
  });

  it('preserves an explicit Int<n> wrapper exactly', () => {
    const source = 'Layers<Black,BlastL<White,Int<200>>>';
    expect(parseAndEmit(source)).toBe(source);
  });

  it('keeps bare and wrapped integers distinct across emit', () => {
    expect(parseAndEmit('Rgb<255,128,0>')).toBe('Rgb<255,128,0>');
    expect(parseAndEmit('Rgb<Int<255>,Int<128>,Int<0>>')).toBe(
      'Rgb<Int<255>,Int<128>,Int<0>>',
    );
  });

  it('is idempotent after multiple parse → emit cycles on bare ints', () => {
    const source = 'Layers<Black,BlastL<White,200>>';
    const once = parseAndEmit(source);
    const twice = parseAndEmit(once);
    const thrice = parseAndEmit(twice);
    expect(once).toBe(source);
    expect(twice).toBe(source);
    expect(thrice).toBe(source);
  });

  it('does not introduce Int<> wrappers when none were in the source', () => {
    const source = 'TrFade<300>';
    const emitted = parseAndEmit(source);
    expect(emitted).toBe(source);
    expect(emitted).not.toContain('Int<');
  });

  it('does not strip Int<> wrappers when they were in the source', () => {
    const source = 'TrFade<Int<300>>';
    const emitted = parseAndEmit(source);
    expect(emitted).toBe(source);
    expect(emitted).toContain('Int<');
  });

  it('handles nested templates with multiple bare ints', () => {
    const source = 'Mix<Int<16384>,Black,White>';
    expect(parseAndEmit(source)).toBe(source);
  });

  it('handles deeply nested AST without compounding Int<> wraps', () => {
    const source =
      'StylePtr<Layers<AudioFlicker<Blue,Mix<Int<16384>,Blue,White>>,BlastL<White,200>,SimpleClashL<White,40>>>()';
    const once = parseAndEmit(source);
    const twice = parseAndEmit(once);
    expect(once).toBe(source);
    expect(twice).toBe(once);
  });
});

describe('parse → emit round-trip — AST shape invariants', () => {
  it('bare integer literal parses to a flat integer node (no args)', () => {
    const { ast } = parseStyleCode('200');
    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('integer');
    expect(ast?.name).toBe('200');
    expect(ast?.args).toEqual([]);
  });

  it('Int<200> parses to a function wrapper around a bare integer', () => {
    const { ast } = parseStyleCode('Int<200>');
    expect(ast).not.toBeNull();
    expect(ast?.type).toBe('function');
    expect(ast?.name).toBe('Int');
    expect(ast?.args.length).toBe(1);
    expect(ast?.args[0]?.type).toBe('integer');
    expect(ast?.args[0]?.name).toBe('200');
    expect(ast?.args[0]?.args).toEqual([]);
  });
});
