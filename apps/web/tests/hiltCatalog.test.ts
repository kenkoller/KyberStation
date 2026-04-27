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
    expect(emitters.length).toBeGreaterThanOrEqual(1);
    expect(emitters.map((p) => p.id)).toContain('graflex-emitter');
    for (const emitter of emitters) {
      expect(emitter.type).toBe('emitter');
    }
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

describe('v0.13.1 content batch — new parts', () => {
  const newPartIds = [
    'flat-top',
    'tapered',
    'maul-emitter',
    'ringed-emitter',
    'windu-switch',
    'inquisitor-switch',
    'windu-grip',
    'luke-rotj-grip',
    'covertec-grip',
    'windu-pommel',
    'inquisitor-mount',
    'leather-wrap',
    'activation-box',
    'gold-band',
  ];

  it('catalog contains all 14 new parts', () => {
    for (const id of newPartIds) {
      expect(getPart(id), `part "${id}" missing from catalog`).toBeDefined();
    }
  });

  it('new parts carry era + faction metadata', () => {
    for (const id of newPartIds) {
      const part = getPart(id)!;
      expect(part.era, `part "${id}" missing era`).toBeDefined();
      expect(part.faction, `part "${id}" missing faction`).toBeDefined();
    }
  });
});

describe('v0.13.1 content batch — new assemblies', () => {
  const newAssemblyIds = [
    'windu',
    'luke-rotj',
    'qui-gon',
    'savage',
    'inquisitor',
    'cal-kestis',
    'starkiller',
    'palpatine',
  ];

  it('all 8 new assemblies are in the catalog', () => {
    for (const id of newAssemblyIds) {
      expect(getAssembly(id), `assembly "${id}" missing`).toBeDefined();
    }
  });

  it('all 8 new assemblies compose cleanly in strict mode', () => {
    for (const id of newAssemblyIds) {
      const assembly = getAssembly(id)!;
      const { hilt, errors } = resolveAssembly(assembly, PART_CATALOG, 'strict');
      expect(
        errors,
        `${id}: ${errors.map((e) => e.message).join('; ')}`,
      ).toHaveLength(0);
      expect(hilt, `${id} produced null hilt`).not.toBeNull();
    }
  });
});

describe('v0.15.0 content batch — Stage 2 character parts', () => {
  const newPartIds = [
    // Emitters
    'anakin-rots-emitter',
    'ahsoka-clone-wars-emitter',
    'dooku-canon-emitter',
    'ventress-emitter',
    'rey-tros-emitter',
    'plo-koon-emitter',
    'leia-rebels-emitter',
    // Switches
    'anakin-rots-switch',
    'ahsoka-clone-wars-switch',
    'dooku-canon-switch',
    'ventress-switch',
    'rey-tros-switch',
    'plo-koon-switch',
    'leia-rebels-switch',
    // Grips
    'anakin-rots-grip',
    'ahsoka-clone-wars-grip',
    'dooku-canon-grip',
    'ventress-grip',
    'rey-tros-grip',
    'plo-koon-grip',
    'leia-rebels-grip',
    // Pommels
    'anakin-rots-pommel',
    'ahsoka-clone-wars-pommel',
    'dooku-canon-pommel',
    'ventress-pommel',
    'rey-tros-pommel',
    'plo-koon-pommel',
    // Accents
    'bronze-band',
    'chrome-trim',
  ];

  it('catalog contains all 29 new Stage 2 parts', () => {
    expect(newPartIds).toHaveLength(29);
    for (const id of newPartIds) {
      expect(getPart(id), `part "${id}" missing from catalog`).toBeDefined();
    }
  });

  it('all 29 new parts carry era + faction metadata', () => {
    for (const id of newPartIds) {
      const part = getPart(id)!;
      expect(part.era, `part "${id}" missing era`).toBeDefined();
      expect(part.faction, `part "${id}" missing faction`).toBeDefined();
    }
  });

  it('all 29 new parts pass spec width 48 + cx 24 invariants', () => {
    for (const id of newPartIds) {
      const part = getPart(id)!;
      expect(part.svg.width, `${id} canvas width`).toBe(48);
      expect(part.topConnector.cx, `${id} top cx`).toBe(24);
      expect(part.bottomConnector.cx, `${id} bottom cx`).toBe(24);
      expect(part.topConnector.cy, `${id} top cy`).toBe(0);
      expect(part.bottomConnector.cy, `${id} bottom cy`).toBe(part.svg.height);
    }
  });
});

describe('v0.15.0 content batch — Stage 2 character assemblies', () => {
  const newAssemblyIds = [
    'anakin-rots',
    'ahsoka-clone-wars',
    'dooku-canon',
    'ventress-pair',
    'rey-tros',
    'plo-koon',
    'leia-rebels',
  ];

  it('all 7 new assemblies are in the catalog', () => {
    for (const id of newAssemblyIds) {
      expect(getAssembly(id), `assembly "${id}" missing`).toBeDefined();
    }
  });

  it('all 7 new assemblies compose cleanly in strict mode', () => {
    for (const id of newAssemblyIds) {
      const assembly = getAssembly(id)!;
      const { hilt, errors } = resolveAssembly(assembly, PART_CATALOG, 'strict');
      expect(
        errors,
        `${id}: ${errors.map((e) => e.message).join('; ')}`,
      ).toHaveLength(0);
      expect(hilt, `${id} produced null hilt`).not.toBeNull();
    }
  });
});
