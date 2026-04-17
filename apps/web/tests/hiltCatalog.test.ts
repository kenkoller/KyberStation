import { describe, expect, it } from 'vitest';

import {
  PART_CATALOG,
  allParts,
  getPart,
  getPartsByType,
} from '@/lib/hilts/catalog';
import {
  allAssemblies,
  getAssembly,
  graflexAssembly,
} from '@/lib/hilts/assemblies';
import { resolveAssembly } from '@/lib/hilts/composer';
import { INTERFACE_DIAMETER_UNITS } from '@/lib/hilts/types';

describe('PART_CATALOG', () => {
  it('contains all 4 Graflex parts', () => {
    expect(getPart('graflex-emitter')).toBeDefined();
    expect(getPart('graflex-switch')).toBeDefined();
    expect(getPart('t-tracks-grip')).toBeDefined();
    expect(getPart('classic-pommel')).toBeDefined();
  });

  it('returns undefined for unknown id', () => {
    expect(getPart('does-not-exist')).toBeUndefined();
  });

  it('all parts obey spec: canvas width 48, cx 24 on both connectors', () => {
    for (const part of allParts()) {
      expect(part.svg.width).toBe(48);
      expect(part.topConnector.cx).toBe(24);
      expect(part.bottomConnector.cx).toBe(24);
      expect(part.topConnector.cy).toBe(0);
      expect(part.bottomConnector.cy).toBe(part.svg.height);
    }
  });

  it('getPartsByType filters correctly', () => {
    const emitters = getPartsByType('emitter');
    expect(emitters).toHaveLength(1);
    expect(emitters[0].id).toBe('graflex-emitter');
  });
});

describe('ASSEMBLY_CATALOG', () => {
  it('contains the Graflex assembly', () => {
    expect(getAssembly('graflex')).toBe(graflexAssembly);
    expect(allAssemblies()).toContain(graflexAssembly);
  });

  it('Graflex assembly composes without errors', () => {
    const { hilt, errors, warnings } = resolveAssembly(graflexAssembly, PART_CATALOG);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    expect(hilt).not.toBeNull();
    expect(hilt!.placements).toHaveLength(4);
  });

  it('Graflex total height is the sum of part heights minus overlaps', () => {
    const { hilt } = resolveAssembly(graflexAssembly, PART_CATALOG);
    expect(hilt!.totalHeight).toBe(60 + 72 + 100 + 36 - 3 * 2);
    expect(hilt!.totalHeight).toBe(262);
  });

  it('Graflex emitter sits at the top (y = 0)', () => {
    const { hilt } = resolveAssembly(graflexAssembly, PART_CATALOG);
    expect(hilt!.placements[0].part.id).toBe('graflex-emitter');
    expect(hilt!.placements[0].y).toBe(0);
  });

  it('all parts in shipped assemblies have matching connector diameters', () => {
    for (const assembly of allAssemblies()) {
      const { errors } = resolveAssembly(assembly, PART_CATALOG, 'strict');
      expect(errors, `assembly ${assembly.id} had composition errors`).toHaveLength(0);
    }
  });
});

describe('interface diameter units', () => {
  it('matches the spec mapping', () => {
    expect(INTERFACE_DIAMETER_UNITS.narrow).toBe(24);
    expect(INTERFACE_DIAMETER_UNITS.standard).toBe(30);
    expect(INTERFACE_DIAMETER_UNITS.wide).toBe(36);
  });
});
