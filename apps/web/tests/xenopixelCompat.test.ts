// ─── Xenopixel Compatibility Utility Tests ────────────────────────
//
// Covers:
//   1. Direct style → Xeno effect mapping (exact matches)
//   2. Approximate style → Xeno effect mapping (fallback + closest)
//   3. Direct ignition → Xeno ignition mapping (exact matches)
//   4. Approximate ignition → Xeno ignition mapping
//   5. Full getXenopixelCompat() integration
//   6. Quick boolean helpers for gallery filtering

import { describe, it, expect } from 'vitest';
import {
  getXenopixelCompat,
  isXenopixelCompatibleStyle,
  getXenopixelCompatibleStyles,
} from '@/lib/xenopixelCompat';
import { XENO_BLADE_EFFECTS } from '@kyberstation/boards';

describe('Xenopixel Compatibility Utilities', () => {
  // ─── Style → Xeno Effect mapping ──────────────────────────────

  describe('style → Xeno effect ID (via getXenopixelCompat)', () => {
    it('maps styles with direct kyberStyle matches exactly', () => {
      // Every XENO_BLADE_EFFECT with a kyberStyle should produce an exact match
      for (const effect of XENO_BLADE_EFFECTS) {
        if (!effect.kyberStyle) continue;
        const result = getXenopixelCompat({
          style: effect.kyberStyle,
          ignition: 'standard', // direct match ignition to isolate style test
        });
        expect(result.bladeEffectId).toBe(effect.id);
        expect(result.bladeEffectName).toBe(effect.name);
        expect(result.styleExact).toBe(true);
      }
    });

    it('maps "fire" → Fire Blade (ID 0) exactly', () => {
      const result = getXenopixelCompat({ style: 'fire', ignition: 'standard' });
      expect(result.bladeEffectId).toBe(0);
      expect(result.bladeEffectName).toBe('Fire Blade');
      expect(result.styleExact).toBe(true);
    });

    it('maps "stable" → Steady Blade (ID 1) exactly', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'standard' });
      expect(result.bladeEffectId).toBe(1);
      expect(result.bladeEffectName).toBe('Steady Blade');
      expect(result.styleExact).toBe(true);
    });

    it('maps "unstable" → Unstable Blade (ID 2) exactly', () => {
      const result = getXenopixelCompat({ style: 'unstable', ignition: 'standard' });
      expect(result.bladeEffectId).toBe(2);
      expect(result.styleExact).toBe(true);
    });
  });

  describe('approximate style mappings', () => {
    it('maps candle → Fire Blade (ID 0, approximate)', () => {
      const result = getXenopixelCompat({ style: 'candle', ignition: 'standard' });
      expect(result.bladeEffectId).toBe(0);
      expect(result.styleExact).toBe(false);
      expect(result.degradationNote).toContain('candle');
      expect(result.degradationNote).toContain('approximate');
    });

    it('maps darksaber → Steady Blade (ID 1, approximate)', () => {
      const result = getXenopixelCompat({ style: 'darksaber', ignition: 'standard' });
      expect(result.bladeEffectId).toBe(1);
      expect(result.styleExact).toBe(false);
    });

    it('maps plasma → Unstable Blade (ID 2, approximate)', () => {
      const result = getXenopixelCompat({ style: 'plasma', ignition: 'standard' });
      expect(result.bladeEffectId).toBe(2);
      expect(result.styleExact).toBe(false);
    });

    it('maps prism → Rainbow Blade (ID 3, approximate)', () => {
      const result = getXenopixelCompat({ style: 'prism', ignition: 'standard' });
      expect(result.bladeEffectId).toBe(3);
      expect(result.styleExact).toBe(false);
    });

    it('maps gradient → Pulse Blade (ID 6, approximate)', () => {
      const result = getXenopixelCompat({ style: 'gradient', ignition: 'standard' });
      expect(result.bladeEffectId).toBe(6);
      expect(result.styleExact).toBe(false);
    });

    it('maps dataStream → Flashing Blade (ID 7, approximate)', () => {
      const result = getXenopixelCompat({ style: 'dataStream', ignition: 'standard' });
      expect(result.bladeEffectId).toBe(7);
      expect(result.styleExact).toBe(false);
    });

    it('falls back to Steady Blade (ID 1) for unknown styles', () => {
      const result = getXenopixelCompat({
        style: 'totallyUnknownStyle',
        ignition: 'standard',
      });
      expect(result.bladeEffectId).toBe(1);
      expect(result.bladeEffectName).toBe('Steady Blade');
      expect(result.styleExact).toBe(false);
    });
  });

  // ─── Ignition → Xeno Ignition mapping ─────────────────────────

  describe('ignition → Xeno ignition ID', () => {
    it('maps standard → Standard Blade (ID 0) exactly', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'standard' });
      expect(result.ignitionStyleId).toBe(0);
      expect(result.ignitionExact).toBe(true);
    });

    it('maps scroll → Scroll Blade (ID 1) exactly', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'scroll' });
      expect(result.ignitionStyleId).toBe(1);
      expect(result.ignitionExact).toBe(true);
    });

    it('maps wipe → Wipe Blade (ID 2) exactly', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'wipe' });
      expect(result.ignitionStyleId).toBe(2);
      expect(result.ignitionExact).toBe(true);
    });

    it('maps spark → Blaster Blade (ID 3) exactly', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'spark' });
      expect(result.ignitionStyleId).toBe(3);
      expect(result.ignitionExact).toBe(true);
    });

    it('maps ghost → Ghost Blade (ID 4) exactly', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'ghost' });
      expect(result.ignitionStyleId).toBe(4);
      expect(result.ignitionExact).toBe(true);
    });
  });

  describe('approximate ignition mappings', () => {
    it('maps center → Standard (ID 0, approximate)', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'center' });
      expect(result.ignitionStyleId).toBe(0);
      expect(result.ignitionExact).toBe(false);
    });

    it('maps stutter → Blaster Blade (ID 3, approximate)', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'stutter' });
      expect(result.ignitionStyleId).toBe(3);
      expect(result.ignitionExact).toBe(false);
    });

    it('maps crackle → Stack Ignition (ID 5, approximate)', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'crackle' });
      expect(result.ignitionStyleId).toBe(5);
      expect(result.ignitionExact).toBe(false);
    });

    it('maps flashFill → FoldTile Ignition (ID 6, approximate)', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'flashFill' });
      expect(result.ignitionStyleId).toBe(6);
      expect(result.ignitionExact).toBe(false);
    });

    it('falls back to Standard (ID 0) for unknown ignitions', () => {
      const result = getXenopixelCompat({
        style: 'stable',
        ignition: 'totallyUnknownIgnition',
      });
      expect(result.ignitionStyleId).toBe(0);
      expect(result.ignitionExact).toBe(false);
    });
  });

  // ─── Full integration ─────────────────────────────────────────

  describe('getXenopixelCompat integration', () => {
    it('returns compatible=true when both style and ignition match exactly', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'standard' });
      expect(result.compatible).toBe(true);
      expect(result.styleExact).toBe(true);
      expect(result.ignitionExact).toBe(true);
      expect(result.degradationNote).toBeNull();
    });

    it('returns compatible=false when style is approximate', () => {
      const result = getXenopixelCompat({ style: 'candle', ignition: 'standard' });
      expect(result.compatible).toBe(false);
      expect(result.styleExact).toBe(false);
      expect(result.ignitionExact).toBe(true);
      expect(result.degradationNote).not.toBeNull();
    });

    it('returns compatible=false when ignition is approximate', () => {
      const result = getXenopixelCompat({ style: 'stable', ignition: 'center' });
      expect(result.compatible).toBe(false);
      expect(result.styleExact).toBe(true);
      expect(result.ignitionExact).toBe(false);
      expect(result.degradationNote).not.toBeNull();
    });

    it('returns compatible=false when both are approximate', () => {
      const result = getXenopixelCompat({ style: 'plasma', ignition: 'glitch' });
      expect(result.compatible).toBe(false);
      expect(result.styleExact).toBe(false);
      expect(result.ignitionExact).toBe(false);
      // Both approximations should appear in the note
      expect(result.degradationNote).toContain('plasma');
      expect(result.degradationNote).toContain('glitch');
    });

    it('degradation note joins multiple approximations with semicolon', () => {
      const result = getXenopixelCompat({ style: 'candle', ignition: 'stutter' });
      expect(result.degradationNote).toContain(';');
      // Two separate notes joined
      const parts = result.degradationNote!.split(';');
      expect(parts.length).toBe(2);
    });

    it('returns the full XenopixelCompat shape', () => {
      const result = getXenopixelCompat({ style: 'fire', ignition: 'ghost' });
      // Type-level check: all fields present
      expect(result).toHaveProperty('compatible');
      expect(result).toHaveProperty('bladeEffectId');
      expect(result).toHaveProperty('bladeEffectName');
      expect(result).toHaveProperty('ignitionStyleId');
      expect(result).toHaveProperty('ignitionStyleName');
      expect(result).toHaveProperty('styleExact');
      expect(result).toHaveProperty('ignitionExact');
      expect(result).toHaveProperty('degradationNote');
      // Both exact
      expect(result.compatible).toBe(true);
    });
  });

  // ─── Gallery filter helpers ────────────────────────────────────

  describe('isXenopixelCompatibleStyle', () => {
    it('returns true for styles with direct kyberStyle mapping', () => {
      for (const effect of XENO_BLADE_EFFECTS) {
        if (!effect.kyberStyle) continue;
        expect(isXenopixelCompatibleStyle(effect.kyberStyle)).toBe(true);
      }
    });

    it('returns false for styles without direct mapping', () => {
      expect(isXenopixelCompatibleStyle('candle')).toBe(false);
      expect(isXenopixelCompatibleStyle('darksaber')).toBe(false);
      expect(isXenopixelCompatibleStyle('plasma')).toBe(false);
      expect(isXenopixelCompatibleStyle('totallyFake')).toBe(false);
    });
  });

  describe('getXenopixelCompatibleStyles', () => {
    it('returns an array of style strings', () => {
      const styles = getXenopixelCompatibleStyles();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles.length).toBeGreaterThan(0);
      // Every returned style should be a string
      for (const s of styles) {
        expect(typeof s).toBe('string');
      }
    });

    it('every returned style has a direct XENO_BLADE_EFFECTS match', () => {
      const styles = getXenopixelCompatibleStyles();
      for (const style of styles) {
        const match = XENO_BLADE_EFFECTS.find((e) => e.kyberStyle === style);
        expect(match).toBeDefined();
      }
    });

    it('does not include null kyberStyle entries', () => {
      const styles = getXenopixelCompatibleStyles();
      expect(styles).not.toContain(null);
      expect(styles).not.toContain(undefined);
    });

    it('matches the count of XENO_BLADE_EFFECTS with non-null kyberStyle', () => {
      const styles = getXenopixelCompatibleStyles();
      const expected = XENO_BLADE_EFFECTS.filter((e) => e.kyberStyle !== null).length;
      expect(styles.length).toBe(expected);
    });
  });
});
