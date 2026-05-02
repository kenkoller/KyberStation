// ─── configShapeDetect — Step 2 of Sprint 5 (full config.h shape detection) ──

import { describe, it, expect } from 'vitest';
import {
  detectConfigShape,
  countStyleBlocks,
  extractFirstStylePtr,
} from '@/lib/import/configShapeDetect';

const FULL_CONFIG_H = `#ifdef CONFIG_TOP
#include "proffieboard_v3_config.h"
#define NUM_BLADES 1
#endif

#ifdef CONFIG_PRESETS
Preset presets[] = {
   { "ObiWan", "tracks/episode4.wav",
      StyleNormalPtr<CYAN, WHITE, 300, 800>(),
      "Obi-Wan ANH"
   },
   { "Maul", "tracks/dueloffates.wav",
      StylePtr<Layers<Blue, ResponsiveLockupL<White, TrInstant, TrFade<300>>>>(),
      "Darth Maul"
   }
};

BladeConfig blades[] = {
   { 0, WS281XBladePtr<144, bladePin, Color8::GRB, PowerPINS<bladePowerPin2>>(), CONFIGARRAY(presets) },
};
#endif`;

const NAKED_STYLE = `StylePtr<Layers<AudioFlicker<Blue, White>, InOutTrL<TrWipe<300>, TrWipeIn<800>, Black>>>()`;

const LEGACY_NAKED = `StyleNormalPtr<CYAN, WHITE, 300, 800>()`;

describe('configShapeDetect', () => {
  describe('detectConfigShape', () => {
    it('flags full config.h as isFullConfig=true', () => {
      const shape = detectConfigShape(FULL_CONFIG_H);
      expect(shape.isFullConfig).toBe(true);
      expect(shape.hasPreprocessor).toBe(true);
      expect(shape.styleCount).toBe(2);
    });

    it('flags naked StylePtr as isFullConfig=false', () => {
      const shape = detectConfigShape(NAKED_STYLE);
      expect(shape.isFullConfig).toBe(false);
      expect(shape.hasPreprocessor).toBe(false);
      expect(shape.styleCount).toBe(1);
    });

    it('flags naked StyleNormalPtr as isFullConfig=false', () => {
      const shape = detectConfigShape(LEGACY_NAKED);
      expect(shape.isFullConfig).toBe(false);
      expect(shape.styleCount).toBe(1);
    });

    it('handles empty / whitespace input', () => {
      expect(detectConfigShape('').isFullConfig).toBe(false);
      expect(detectConfigShape('   ').isFullConfig).toBe(false);
      expect(detectConfigShape('').styleCount).toBe(0);
    });

    it('detects preprocessor without preset_array as full config', () => {
      const code = `#define VOLUME 1500\nStylePtr<Blue>()`;
      const shape = detectConfigShape(code);
      expect(shape.hasPreprocessor).toBe(true);
      expect(shape.isFullConfig).toBe(true);
    });

    it('detects CONFIGARRAY marker even without #ifdef', () => {
      const code = `BladeConfig blades[] = { CONFIGARRAY(presets) };`;
      expect(detectConfigShape(code).isFullConfig).toBe(true);
    });
  });

  describe('countStyleBlocks', () => {
    it('counts a single naked StylePtr', () => {
      expect(countStyleBlocks(NAKED_STYLE)).toBe(1);
    });

    it('counts multiple presets in a config.h', () => {
      expect(countStyleBlocks(FULL_CONFIG_H)).toBe(2);
    });

    it('counts mixed style-ptr variants', () => {
      const code = `StylePtr<Blue>(), StyleNormalPtr<Red, White, 300, 800>(), StyleFirePtr<Yellow, Orange, 0, 3>()`;
      expect(countStyleBlocks(code)).toBe(3);
    });

    it('returns 0 for code without any style templates', () => {
      expect(countStyleBlocks('#ifdef CONFIG_TOP\n#define VOLUME 1500\n#endif')).toBe(0);
    });
  });

  describe('extractFirstStylePtr', () => {
    it('extracts a naked StylePtr unchanged', () => {
      const result = extractFirstStylePtr(NAKED_STYLE);
      expect(result).toBe(NAKED_STYLE);
    });

    it('extracts a naked StyleNormalPtr unchanged', () => {
      const result = extractFirstStylePtr(LEGACY_NAKED);
      expect(result).toBe(LEGACY_NAKED);
    });

    it('extracts the FIRST preset from a full config.h', () => {
      const result = extractFirstStylePtr(FULL_CONFIG_H);
      expect(result).toBe('StyleNormalPtr<CYAN, WHITE, 300, 800>()');
    });

    it('returns null when no style template is present', () => {
      expect(extractFirstStylePtr('')).toBeNull();
      expect(extractFirstStylePtr('// just a comment')).toBeNull();
      expect(extractFirstStylePtr('#define VOLUME 1500')).toBeNull();
    });

    it('handles deeply nested angle brackets', () => {
      const code = `StylePtr<Layers<AudioFlicker<Rgb<0,140,255>,Mix<Int<16384>,Rgb<0,140,255>,White>>,InOutTrL<TrWipe<300>,TrWipeIn<800>,Black>>>()`;
      expect(extractFirstStylePtr(code)).toBe(code);
    });

    it('handles whitespace between template close and paren', () => {
      const code = `StylePtr<Blue>   ()`;
      expect(extractFirstStylePtr(code)).toBe(code);
    });

    it('handles missing trailing parens (robustness)', () => {
      const code = `StylePtr<Blue>`;
      expect(extractFirstStylePtr(code)).toBe('StylePtr<Blue>');
    });

    it('returns null on unbalanced angle brackets', () => {
      const code = `StylePtr<Layers<Blue`;
      expect(extractFirstStylePtr(code)).toBeNull();
    });

    it('finds StylePtr inside a multi-line preset_array', () => {
      const result = extractFirstStylePtr(FULL_CONFIG_H);
      // First style is StyleNormalPtr (Obi-Wan); second is StylePtr (Maul)
      expect(result).toContain('CYAN');
      expect(result).not.toContain('Maul');
    });

    it('handles ChargingStylePtr', () => {
      const code = `ChargingStylePtr<Blue, Red>()`;
      expect(extractFirstStylePtr(code)).toBe(code);
    });
  });
});
