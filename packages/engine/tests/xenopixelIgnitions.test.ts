import { describe, it, expect } from 'vitest';
import {
  XENO_IGNITION_MAP,
  XENO_IGNITION_REGISTRY,
  createXenoIgnition,
  xenoIgnitionIdToStyleId,
} from '../src/ignition/xenopixel/index';

describe('XENO_IGNITION_MAP', () => {
  it('has exactly 12 entries (IDs 0-11)', () => {
    expect(Object.keys(XENO_IGNITION_MAP)).toHaveLength(12);
  });

  it('maps consecutive IDs 0 through 11', () => {
    for (let i = 0; i <= 11; i++) {
      expect(XENO_IGNITION_MAP).toHaveProperty(String(i));
    }
  });

  it('Broken is at ID 11 (not 9)', () => {
    const broken = new XENO_IGNITION_MAP[11]();
    expect(broken.id).toBe('xeno-broken');
  });

  it('Scavenger is at ID 9', () => {
    const scavenger = new XENO_IGNITION_MAP[9]();
    expect(scavenger.id).toBe('xeno-scavenger');
  });

  it('Hunter is at ID 10', () => {
    const hunter = new XENO_IGNITION_MAP[10]();
    expect(hunter.id).toBe('xeno-hunter');
  });
});

describe('XENO_IGNITION_REGISTRY', () => {
  it('has exactly 12 entries', () => {
    expect(Object.keys(XENO_IGNITION_REGISTRY)).toHaveLength(12);
  });

  it('contains xeno-scavenger and xeno-hunter', () => {
    expect(XENO_IGNITION_REGISTRY).toHaveProperty('xeno-scavenger');
    expect(XENO_IGNITION_REGISTRY).toHaveProperty('xeno-hunter');
  });

  it('each factory produces an ignition with matching id', () => {
    for (const [key, factory] of Object.entries(XENO_IGNITION_REGISTRY)) {
      const ignition = factory();
      expect(ignition.id).toBe(key);
    }
  });
});

describe('createXenoIgnition', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])('creates ignition for ID %i', (id) => {
    const ignition = createXenoIgnition(id);
    expect(ignition).toBeDefined();
    expect(ignition.id).toBeTruthy();
  });

  it('throws for ID 12 (out of range)', () => {
    expect(() => createXenoIgnition(12)).toThrow();
  });

  it('throws for negative ID', () => {
    expect(() => createXenoIgnition(-1)).toThrow();
  });
});

describe('xenoIgnitionIdToStyleId', () => {
  const expectedMap: [number, string][] = [
    [0, 'xeno-standard'],
    [1, 'xeno-velocity'],
    [2, 'xeno-torch'],
    [3, 'xeno-blaster'],
    [4, 'xeno-ghost'],
    [5, 'xeno-stack'],
    [6, 'xeno-fold-tile'],
    [7, 'xeno-word'],
    [8, 'xeno-faser'],
    [9, 'xeno-scavenger'],
    [10, 'xeno-hunter'],
    [11, 'xeno-broken'],
  ];

  it.each(expectedMap)('maps ID %i to "%s"', (id, expected) => {
    expect(xenoIgnitionIdToStyleId(id)).toBe(expected);
  });
});

// Per-ignition mask validity
const TEST_POSITIONS = [0, 0.25, 0.5, 0.75, 1.0];
const TEST_PROGRESS = [0, 0.25, 0.5, 0.75, 1.0];

describe.each(Object.entries(XENO_IGNITION_REGISTRY))('Xeno ignition: %s', (id, factory) => {
  const ignition = factory();

  it('returns 0 at progress 0 for non-base positions', () => {
    // Most ignitions should be dark at progress=0 (except possibly position=0)
    const mask = ignition.getMask(0.5, 0);
    expect(mask).toBeGreaterThanOrEqual(0);
    expect(mask).toBeLessThanOrEqual(1);
  });

  it('returns close to 1 at progress 1 for all positions', () => {
    for (const pos of TEST_POSITIONS) {
      const mask = ignition.getMask(pos, 1);
      expect(mask).toBeGreaterThanOrEqual(0.8);
    }
  });

  it.each(TEST_POSITIONS)('mask is in [0,1] at position %f', (pos) => {
    for (const prog of TEST_PROGRESS) {
      const mask = ignition.getMask(pos, prog);
      expect(mask).toBeGreaterThanOrEqual(0);
      expect(mask).toBeLessThanOrEqual(1.01); // tiny float tolerance
    }
  });
});
