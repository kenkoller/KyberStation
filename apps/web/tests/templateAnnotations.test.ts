// ─── Template Annotations — unit tests ──────────────────────────────
//
// Phase 5B: parameter annotation registry + color helper utilities.
// Pure functions, no React rendering needed.

import { describe, it, expect } from 'vitest';
import {
  PARAM_ANNOTATIONS,
  getParamAnnotation,
  isColorNode,
  isNamedColorNode,
  extractRgbFromNode,
  namedColorToRgb,
} from '../lib/templateAnnotations';

// ─── PARAM_ANNOTATIONS registry ─

describe('PARAM_ANNOTATIONS registry', () => {
  it('has entries for common ProffieOS templates', () => {
    const requiredKeys = [
      'Rgb', 'Rgb16', 'Mix', 'Layers', 'AudioFlicker',
      'TrFade', 'TrWipe', 'Scale', 'Int', 'SwingSpeed',
      'AlphaL', 'BlastL', 'LockupTrL', 'InOutTrL',
    ];
    for (const key of requiredKeys) {
      expect(PARAM_ANNOTATIONS).toHaveProperty(key);
    }
  });

  it('Rgb has exactly 3 annotations for R/G/B', () => {
    expect(PARAM_ANNOTATIONS.Rgb).toHaveLength(3);
    expect(PARAM_ANNOTATIONS.Rgb[0]).toContain('Red');
    expect(PARAM_ANNOTATIONS.Rgb[1]).toContain('Green');
    expect(PARAM_ANNOTATIONS.Rgb[2]).toContain('Blue');
  });

  it('all entries are string arrays', () => {
    for (const [key, value] of Object.entries(PARAM_ANNOTATIONS)) {
      expect(Array.isArray(value), `${key} should be an array`).toBe(true);
      for (const item of value) {
        expect(typeof item, `${key} should contain strings`).toBe('string');
      }
    }
  });
});

// ─── getParamAnnotation ─

describe('getParamAnnotation', () => {
  it('returns the annotation for a known template + index', () => {
    expect(getParamAnnotation('Rgb', 0)).toBe('Red (0-255)');
    expect(getParamAnnotation('Rgb', 1)).toBe('Green (0-255)');
    expect(getParamAnnotation('Rgb', 2)).toBe('Blue (0-255)');
  });

  it('returns undefined for an out-of-bounds index', () => {
    expect(getParamAnnotation('Rgb', 3)).toBeUndefined();
    expect(getParamAnnotation('Rgb', 99)).toBeUndefined();
  });

  it('returns undefined for an unknown template name', () => {
    expect(getParamAnnotation('FakeTemplateThatDoesNotExist', 0)).toBeUndefined();
  });

  it('returns correct annotation for TrFade', () => {
    expect(getParamAnnotation('TrFade', 0)).toBe('Fade time (ms)');
  });

  it('returns correct annotation for Scale args', () => {
    expect(getParamAnnotation('Scale', 0)).toBe('Function to scale');
    expect(getParamAnnotation('Scale', 1)).toBe('Output when 0');
    expect(getParamAnnotation('Scale', 2)).toBe('Output when 32768');
  });

  it('returns correct annotation for SwingSpeed', () => {
    expect(getParamAnnotation('SwingSpeed', 0)).toBe('Full-speed threshold (RPM)');
  });
});

// ─── isColorNode ─

describe('isColorNode', () => {
  it('returns true for Rgb, Rgb16, RgbArg', () => {
    expect(isColorNode('Rgb')).toBe(true);
    expect(isColorNode('Rgb16')).toBe(true);
    expect(isColorNode('RgbArg')).toBe(true);
  });

  it('returns false for non-color nodes', () => {
    expect(isColorNode('Red')).toBe(false);
    expect(isColorNode('Mix')).toBe(false);
    expect(isColorNode('Layers')).toBe(false);
    expect(isColorNode('AudioFlicker')).toBe(false);
  });
});

// ─── isNamedColorNode ─

describe('isNamedColorNode', () => {
  it('recognizes standard named colors', () => {
    expect(isNamedColorNode('Red')).toBe(true);
    expect(isNamedColorNode('Blue')).toBe(true);
    expect(isNamedColorNode('White')).toBe(true);
    expect(isNamedColorNode('Black')).toBe(true);
    expect(isNamedColorNode('DeepSkyBlue')).toBe(true);
    expect(isNamedColorNode('HotPink')).toBe(true);
  });

  it('returns false for template names that are not named colors', () => {
    expect(isNamedColorNode('Rgb')).toBe(false);
    expect(isNamedColorNode('Mix')).toBe(false);
    expect(isNamedColorNode('Layers')).toBe(false);
    expect(isNamedColorNode('123')).toBe(false);
  });
});

// ─── extractRgbFromNode ─

describe('extractRgbFromNode', () => {
  it('extracts RGB from valid integer-named args', () => {
    const args = [{ name: '255' }, { name: '0' }, { name: '128' }];
    expect(extractRgbFromNode(args)).toEqual({ r: 255, g: 0, b: 128 });
  });

  it('clamps values to 0-255 range', () => {
    const args = [{ name: '300' }, { name: '-10' }, { name: '128' }];
    const result = extractRgbFromNode(args);
    expect(result).toEqual({ r: 255, g: 0, b: 128 });
  });

  it('returns null for wrong arg count', () => {
    expect(extractRgbFromNode([{ name: '255' }])).toBeNull();
    expect(extractRgbFromNode([{ name: '255' }, { name: '0' }])).toBeNull();
    expect(extractRgbFromNode([])).toBeNull();
  });

  it('returns null for non-integer arg names', () => {
    const args = [{ name: 'Red' }, { name: '0' }, { name: '128' }];
    expect(extractRgbFromNode(args)).toBeNull();
  });
});

// ─── namedColorToRgb ─

describe('namedColorToRgb', () => {
  it('maps Red to correct RGB', () => {
    expect(namedColorToRgb('Red')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('maps Blue to correct RGB', () => {
    expect(namedColorToRgb('Blue')).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('maps White to correct RGB', () => {
    expect(namedColorToRgb('White')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('maps DodgerBlue to correct RGB', () => {
    expect(namedColorToRgb('DodgerBlue')).toEqual({ r: 30, g: 144, b: 255 });
  });

  it('returns null for unknown color names', () => {
    expect(namedColorToRgb('FakeColor')).toBeNull();
    expect(namedColorToRgb('Rgb')).toBeNull();
  });

  it('every named color in isNamedColorNode has an RGB mapping or is gracefully null', () => {
    // The named-color set in isNamedColorNode is a superset of the
    // namedColorToRgb map — some rare colors (Ivory, LemonChiffon,
    // etc.) may not have an explicit mapping. This test verifies the
    // core colors that users actually encounter all map correctly.
    const coreColors = ['Red', 'Green', 'Blue', 'Yellow', 'Cyan', 'Magenta', 'White', 'Black', 'Orange'];
    for (const name of coreColors) {
      expect(isNamedColorNode(name), `${name} should be a named color`).toBe(true);
      expect(namedColorToRgb(name), `${name} should have an RGB mapping`).not.toBeNull();
    }
  });
});
