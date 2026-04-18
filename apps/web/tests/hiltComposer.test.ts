import { describe, expect, it } from 'vitest';

import {
  OVERLAP_UNITS,
  composeOrThrow,
  resolveAssembly,
} from '@/lib/hilts/composer';
import type { HiltAssembly, HiltPart } from '@/lib/hilts/types';

function makePart(
  id: string,
  type: HiltPart['type'],
  height: number,
  diameter: HiltPart['topConnector']['diameter'] = 'standard',
): HiltPart {
  return {
    id,
    displayName: id,
    type,
    svg: {
      viewBox: `0 0 48 ${height}`,
      width: 48,
      height,
      bodyPath: `M 9 0 L 39 0 L 39 ${height} L 9 ${height} Z`,
      detailPath: '',
    },
    topConnector: { diameter, cx: 24, cy: 0 },
    bottomConnector: { diameter, cx: 24, cy: height },
  };
}

describe('resolveAssembly', () => {
  it('stacks parts top-to-bottom with overlap', () => {
    const catalog = {
      a: makePart('a', 'emitter', 40),
      b: makePart('b', 'grip', 80),
      c: makePart('c', 'pommel', 20),
    };
    const assembly: HiltAssembly = {
      id: 'test',
      displayName: 'Test',
      archetype: 'single-classic',
      parts: [{ partId: 'a' }, { partId: 'b' }, { partId: 'c' }],
    };

    const { hilt, errors, warnings } = resolveAssembly(assembly, catalog);

    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    expect(hilt).not.toBeNull();
    expect(hilt!.placements).toHaveLength(3);
    expect(hilt!.placements[0].y).toBe(0);
    expect(hilt!.placements[1].y).toBe(40 - OVERLAP_UNITS);
    expect(hilt!.placements[2].y).toBe(40 - OVERLAP_UNITS + 80 - OVERLAP_UNITS);
    // Total height = sum of parts - 2 × overlap between 3 parts + final OVERLAP_UNITS add-back
    expect(hilt!.totalHeight).toBe(40 + 80 + 20 - 2 * OVERLAP_UNITS);
  });

  it('reports missing part error', () => {
    const catalog = { a: makePart('a', 'emitter', 40) };
    const assembly: HiltAssembly = {
      id: 'broken',
      displayName: 'Broken',
      archetype: 'single-classic',
      parts: [{ partId: 'a' }, { partId: 'missing' }],
    };

    const { hilt, errors } = resolveAssembly(assembly, catalog);

    expect(hilt).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe('missing-part');
    expect(errors[0].partId).toBe('missing');
  });

  it('reports diameter mismatch in strict mode', () => {
    const catalog = {
      a: makePart('a', 'emitter', 40, 'standard'),
      b: makePart('b', 'grip', 80, 'narrow'),
    };
    const assembly: HiltAssembly = {
      id: 'mismatch',
      displayName: 'Mismatch',
      archetype: 'single-classic',
      parts: [{ partId: 'a' }, { partId: 'b' }],
    };

    const { hilt, errors } = resolveAssembly(assembly, catalog, 'strict');

    expect(hilt).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe('diameter-mismatch');
    expect(errors[0].expectedDiameter).toBe('standard');
    expect(errors[0].actualDiameter).toBe('narrow');
  });

  it('downgrades diameter mismatch to warning in permissive mode', () => {
    const catalog = {
      a: makePart('a', 'emitter', 40, 'standard'),
      b: makePart('b', 'grip', 80, 'wide'),
    };
    const assembly: HiltAssembly = {
      id: 'loose',
      displayName: 'Loose',
      archetype: 'single-classic',
      parts: [{ partId: 'a' }, { partId: 'b' }],
    };

    const { hilt, errors, warnings } = resolveAssembly(
      assembly,
      catalog,
      'permissive',
    );

    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(hilt).not.toBeNull();
    expect(hilt!.placements).toHaveLength(2);
  });

  it('rejects an empty assembly', () => {
    const catalog = { a: makePart('a', 'emitter', 40) };
    const assembly: HiltAssembly = {
      id: 'empty',
      displayName: 'Empty',
      archetype: 'single-classic',
      parts: [],
    };

    const { hilt, errors } = resolveAssembly(assembly, catalog);
    expect(hilt).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe('no-parts');
  });

  it('tracks emitter Y at the top of the first part', () => {
    const catalog = {
      a: makePart('a', 'emitter', 40),
      b: makePart('b', 'grip', 80),
    };
    const assembly: HiltAssembly = {
      id: 'emitter-check',
      displayName: 'Emitter Check',
      archetype: 'single-classic',
      parts: [{ partId: 'a' }, { partId: 'b' }],
    };

    const { hilt } = resolveAssembly(assembly, catalog);
    expect(hilt!.emitterY).toBe(0);
  });

  it('surfaces the widest part as total width', () => {
    const narrow = makePart('narrow', 'emitter', 40);
    const wide: HiltPart = {
      ...makePart('wide', 'grip', 80),
      svg: { ...makePart('wide', 'grip', 80).svg, width: 60 },
    };
    const catalog = { narrow, wide };
    const assembly: HiltAssembly = {
      id: 'width-check',
      displayName: 'Width Check',
      archetype: 'single-classic',
      parts: [{ partId: 'narrow' }, { partId: 'wide' }],
    };

    const { hilt } = resolveAssembly(assembly, catalog);
    expect(hilt!.totalWidth).toBe(60);
  });

  it('composeOrThrow throws on broken assembly', () => {
    const catalog = { a: makePart('a', 'emitter', 40) };
    const assembly: HiltAssembly = {
      id: 'broken',
      displayName: 'Broken',
      archetype: 'single-classic',
      parts: [{ partId: 'missing' }],
    };

    expect(() => composeOrThrow(assembly, catalog)).toThrow(/missing/);
  });
});
