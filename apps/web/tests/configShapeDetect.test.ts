// ─── configShapeDetect — Step 2 of Sprint 5 (full config.h shape detection) ──

import { describe, it, expect } from 'vitest';
import {
  detectConfigShape,
  countStyleBlocks,
  extractFirstStylePtr,
  findStylePtrBlocks,
  extractPresets,
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

  describe('findStylePtrBlocks', () => {
    it('finds all 2 style blocks in the FULL_CONFIG_H sample', () => {
      const blocks = findStylePtrBlocks(FULL_CONFIG_H);
      expect(blocks.length).toBe(2);
      expect(blocks[0].name).toBe('StyleNormalPtr');
      expect(blocks[1].name).toBe('StylePtr');
    });

    it('returns blocks in source order (ascending index)', () => {
      const blocks = findStylePtrBlocks(FULL_CONFIG_H);
      expect(blocks[0].index).toBeLessThan(blocks[1].index);
    });

    it('returns empty array for code with no style templates', () => {
      expect(findStylePtrBlocks('#define VOLUME 1500')).toEqual([]);
    });

    it('handles back-to-back style-ptrs without preset wrapping', () => {
      const code = `StylePtr<Blue>(); StyleNormalPtr<RED, WHITE, 300, 800>(); StyleFirePtr<Yellow, Orange, 0, 3>()`;
      const blocks = findStylePtrBlocks(code);
      expect(blocks.length).toBe(3);
      expect(blocks.map((b) => b.name)).toEqual([
        'StylePtr',
        'StyleNormalPtr',
        'StyleFirePtr',
      ]);
    });

    it('does not infinite-loop on unbalanced brackets', () => {
      const code = `StylePtr<Layers<Blue StyleNormalPtr<CYAN, WHITE, 300, 800>()`;
      // Should make progress past the unbalanced first block.
      const blocks = findStylePtrBlocks(code);
      // The unbalanced StylePtr is skipped; the StyleNormalPtr inside is found.
      expect(blocks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('extractPresets', () => {
    it('extracts both presets from the FULL_CONFIG_H sample', () => {
      const presets = extractPresets(FULL_CONFIG_H);
      expect(presets.length).toBe(2);
    });

    it('captures fontName as the first quoted string', () => {
      const presets = extractPresets(FULL_CONFIG_H);
      expect(presets[0].fontName).toBe('ObiWan');
      expect(presets[1].fontName).toBe('Maul');
    });

    it('captures track as the second quoted string', () => {
      const presets = extractPresets(FULL_CONFIG_H);
      expect(presets[0].track).toBe('tracks/episode4.wav');
      expect(presets[1].track).toBe('tracks/dueloffates.wav');
    });

    it('captures displayLabel as the last quoted string when 3+ literals present', () => {
      const presets = extractPresets(FULL_CONFIG_H);
      expect(presets[0].displayLabel).toBe('Obi-Wan ANH');
      expect(presets[1].displayLabel).toBe('Darth Maul');
    });

    it('captures the per-preset style block (not the entire config)', () => {
      const presets = extractPresets(FULL_CONFIG_H);
      expect(presets[0].styleBlock).toBe('StyleNormalPtr<CYAN, WHITE, 300, 800>()');
      expect(presets[1].styleBlock).toContain('Layers<Blue, ResponsiveLockupL');
      // Critical: the second preset's styleBlock should NOT contain the first preset's content
      expect(presets[1].styleBlock).not.toContain('CYAN');
    });

    it('returns empty array for code with no style templates', () => {
      expect(extractPresets('#define VOLUME 1500')).toEqual([]);
    });

    it('returns presets with null metadata when style is naked (no surrounding {})', () => {
      const presets = extractPresets(NAKED_STYLE);
      expect(presets.length).toBe(1);
      expect(presets[0].fontName).toBeNull();
      expect(presets[0].track).toBeNull();
      expect(presets[0].displayLabel).toBeNull();
      expect(presets[0].styleBlock).toBe(NAKED_STYLE);
    });

    it('handles a 3-preset config with all metadata captured', () => {
      const code = `
        Preset presets[] = {
           { "ObiWanANH", "tracks/episode4.wav",
              StyleNormalPtr<CYAN, WHITE, 300, 800>(),
              "Obi-Wan ANH"
           },
           { "DarthMaul", "tracks/dueloffates.wav",
              StylePtr<Layers<Red, ResponsiveLockupL<White, TrInstant, TrFade<300>>>>(),
              "Darth Maul"
           },
           { "Mace", "tracks/windutheme.wav",
              StylePtr<Layers<AudioFlicker<Rgb<128,0,255>,Mix<Int<16384>,Rgb<128,0,255>,White>>,InOutTrL<TrWipe<300>,TrWipeIn<800>,Black>>>(),
              "Mace Windu Amethyst"
           }
        };
      `;
      const presets = extractPresets(code);
      expect(presets.length).toBe(3);
      expect(presets.map((p) => p.fontName)).toEqual(['ObiWanANH', 'DarthMaul', 'Mace']);
      expect(presets.map((p) => p.displayLabel)).toEqual([
        'Obi-Wan ANH',
        'Darth Maul',
        'Mace Windu Amethyst',
      ]);
    });

    it('preserves source order in the returned array', () => {
      const presets = extractPresets(FULL_CONFIG_H);
      expect(presets[0].styleIndex).toBeLessThan(presets[1].styleIndex);
    });
  });
});
