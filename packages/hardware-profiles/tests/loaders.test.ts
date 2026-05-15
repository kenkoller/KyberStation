import { describe, it, expect } from 'vitest';
import {
  ALL_PROFILES,
  all,
  byId,
  byVendor,
  STOCK_PROFFIEBOARD_V3,
  SABERS89_V3_9,
  SABERTRIO_STANDARD,
} from '../src/index.js';

describe('hardware-profiles loaders', () => {
  it('byId returns the stock Proffieboard V3 profile', () => {
    expect(byId('stock-proffieboard-v3')).toBe(STOCK_PROFFIEBOARD_V3);
  });

  it('byId returns the 89sabers V3.9 profile', () => {
    expect(byId('89sabers-v3.9')).toBe(SABERS89_V3_9);
  });

  it('byId returns undefined for an unknown id', () => {
    expect(byId('does-not-exist')).toBeUndefined();
  });

  it('byVendor returns 89sabers profiles', () => {
    const profiles = byVendor('89sabers');
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toBe(SABERS89_V3_9);
  });

  it('byVendor returns hubbe profile for the stock board', () => {
    const profiles = byVendor('hubbe');
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toBe(STOCK_PROFFIEBOARD_V3);
  });

  it('byVendor returns an empty array for an unknown vendor', () => {
    expect(byVendor('not-a-vendor')).toEqual([]);
  });

  it('all() returns every registered profile', () => {
    expect(all()).toHaveLength(ALL_PROFILES.length);
    expect(all()).toEqual(Array.from(ALL_PROFILES));
  });

  it('all() returns a fresh array (mutating does not affect ALL_PROFILES)', () => {
    const result = all();
    const originalLength = ALL_PROFILES.length;
    result.push(STOCK_PROFFIEBOARD_V3);
    expect(ALL_PROFILES).toHaveLength(originalLength);
  });

  it('ALL_PROFILES has distinct ids', () => {
    const ids = ALL_PROFILES.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('byId returns the Sabertrio Standard profile', () => {
    expect(byId('sabertrio-standard')).toBe(SABERTRIO_STANDARD);
  });

  it('byVendor returns Sabertrio profiles', () => {
    const profiles = byVendor('sabertrio');
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toBe(SABERTRIO_STANDARD);
  });

  it('ships three profiles after Sabertrio addition', () => {
    expect(ALL_PROFILES.map((p) => p.id).sort()).toEqual([
      '89sabers-v3.9',
      'sabertrio-standard',
      'stock-proffieboard-v3',
    ]);
  });
});
