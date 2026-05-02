// ─── Multi-preset import flow integration test (Sprint 5D MVP) ────────
//
// End-to-end verification of the user's actual stated workflow:
//
//   "If I made something really cool a while ago and want to have the
//    same style with different effect its really hard to replicate as
//    there is no save feature."
//
// User pastes their saved Fett263-generated config.h with N presets.
// Sprint 5D MVP: each preset becomes its own entry in the user library,
// preserving JUST that preset's style block (not the entire pasted file)
// as importedRawCode. Each preset is independently loadable + editable.
//
// This test exercises the helpers + applyReconstructedConfig pipeline
// that CodeOutput.tsx's "Import N Presets" button calls. The actual
// React event-handler code lives in CodeOutput; the test pins the data
// flow contract.

import { describe, it, expect } from 'vitest';
import { extractPresets } from '@/lib/import/configShapeDetect';
import { applyReconstructedConfig } from '@/components/editor/CodeOutput';
import { parseStyleCode, reconstructConfig } from '@kyberstation/codegen';

const REAL_FETT263_CONFIG_H = `#ifdef CONFIG_TOP
#include "proffieboard_v3_config.h"
#define NUM_BLADES 1
#define NUM_BUTTONS 2
#define VOLUME 1500
#define ENABLE_AUDIO
#define ENABLE_MOTION
#define ENABLE_WS2811
#define ENABLE_SD
#define FETT263_EDIT_MODE_MENU
#endif

#ifdef CONFIG_PROP
#include "../props/saber_fett263_buttons.h"
#endif

#ifdef CONFIG_PRESETS
Preset presets[] = {
   { "ObiWanANH", "tracks/episode4.wav",
      StyleNormalPtr<CYAN, WHITE, 300, 800>(),
      "Obi-Wan ANH"
   },
   { "DarthMaul", "tracks/dueloffates.wav",
      StylePtr<Layers<AudioFlicker<Rgb<255,0,0>,Mix<Int<16384>,Rgb<255,0,0>,White>>,InOutTrL<TrWipe<300>,TrWipeIn<800>,Black>>>(),
      "Darth Maul Sith Saber"
   },
   { "Mace", "tracks/windutheme.wav",
      StylePtr<Layers<AudioFlicker<Rgb<128,0,255>,Mix<Int<16384>,Rgb<128,0,255>,White>>,ResponsiveLockupL<Rgb<255,200,80>,TrInstant,TrFade<300>>,InOutTrL<TrWipe<300>,TrWipeIn<800>,Black>>>(),
      "Mace Windu Amethyst"
   }
};

BladeConfig blades[] = {
   { 0, WS281XBladePtr<144, bladePin, Color8::GRB, PowerPINS<bladePowerPin2, bladePowerPin3>>(), CONFIGARRAY(presets) },
};
#endif`;

describe('multi-preset import flow — Sprint 5D MVP', () => {
  it('extractPresets finds all 3 presets in a real Fett263-shaped config.h', () => {
    const presets = extractPresets(REAL_FETT263_CONFIG_H);
    expect(presets.length).toBe(3);
    expect(presets.map((p) => p.displayLabel)).toEqual([
      'Obi-Wan ANH',
      'Darth Maul Sith Saber',
      'Mace Windu Amethyst',
    ]);
    expect(presets.map((p) => p.fontName)).toEqual([
      'ObiWanANH',
      'DarthMaul',
      'Mace',
    ]);
    expect(presets.map((p) => p.track)).toEqual([
      'tracks/episode4.wav',
      'tracks/dueloffates.wav',
      'tracks/windutheme.wav',
    ]);
  });

  it('each extracted preset has its OWN style block (not the full config)', () => {
    const presets = extractPresets(REAL_FETT263_CONFIG_H);
    // Obi-Wan: legacy StyleNormalPtr — should NOT contain the other 2 presets' content
    expect(presets[0].styleBlock).toBe('StyleNormalPtr<CYAN, WHITE, 300, 800>()');
    expect(presets[0].styleBlock).not.toContain('Maul');
    expect(presets[0].styleBlock).not.toContain('Mace');
    // Maul: contains Red but NOT cyan or amethyst
    expect(presets[1].styleBlock).toContain('Rgb<255,0,0>');
    expect(presets[1].styleBlock).not.toContain('CYAN');
    expect(presets[1].styleBlock).not.toContain('128,0,255');
    // Mace: contains amethyst but NOT cyan or red
    expect(presets[2].styleBlock).toContain('Rgb<128,0,255>');
    expect(presets[2].styleBlock).not.toContain('CYAN');
    expect(presets[2].styleBlock).not.toContain('255,0,0');
  });

  it('each preset survives parse → reconstruct → applyReconstructedConfig with importedRawCode preserved', () => {
    const presets = extractPresets(REAL_FETT263_CONFIG_H);
    const savedConfigs = presets.map((preset) => {
      const parsed = parseStyleCode(preset.styleBlock);
      expect(parsed.ast).not.toBeNull();
      const reconstructed = reconstructConfig(parsed.ast!);
      const sourceLabel = preset.fontName
        ? `Pasted ProffieOS C++ — ${preset.fontName}`
        : 'Pasted ProffieOS C++';
      return applyReconstructedConfig(reconstructed, 144, preset.styleBlock, sourceLabel);
    });

    // Each saved config has the per-preset style block as importedRawCode
    expect(savedConfigs[0].importedRawCode).toBe('StyleNormalPtr<CYAN, WHITE, 300, 800>()');
    expect(savedConfigs[1].importedRawCode).toContain('Rgb<255,0,0>');
    expect(savedConfigs[1].importedRawCode).not.toContain('CYAN');
    expect(savedConfigs[2].importedRawCode).toContain('Rgb<128,0,255>');

    // Each has the source label with the font name
    expect(savedConfigs[0].importedSource).toBe('Pasted ProffieOS C++ — ObiWanANH');
    expect(savedConfigs[1].importedSource).toBe('Pasted ProffieOS C++ — DarthMaul');
    expect(savedConfigs[2].importedSource).toBe('Pasted ProffieOS C++ — Mace');

    // Each has importedAt set
    savedConfigs.forEach((cfg) => {
      expect(cfg.importedAt).toBeTypeOf('number');
    });
  });

  it('handles a config with NO Preset[] wrapping — multiple naked StylePtrs in sequence', () => {
    const code = `
      StylePtr<Layers<AudioFlicker<Blue, White>, InOutTrL<TrWipe<300>, TrWipeIn<800>, Black>>>();
      StyleNormalPtr<RED, WHITE, 300, 800>();
      StyleFirePtr<Yellow, Orange, 0, 3>()
    `;
    const presets = extractPresets(code);
    expect(presets.length).toBe(3);
    // No surrounding {} → no metadata
    expect(presets.every((p) => p.fontName === null)).toBe(true);
    expect(presets.every((p) => p.displayLabel === null)).toBe(true);
    // But each has its own style block
    expect(presets[0].styleBlock).toContain('AudioFlicker<Blue, White>');
    expect(presets[1].styleBlock).toBe('StyleNormalPtr<RED, WHITE, 300, 800>()');
    expect(presets[2].styleBlock).toBe('StyleFirePtr<Yellow, Orange, 0, 3>()');
  });

  it('preserves multi-preset extraction even when only some presets have display labels', () => {
    const code = `
      Preset presets[] = {
         { "Font1", "track1.wav", StylePtr<Blue>(), "Display 1" },
         { "Font2", "track2.wav", StylePtr<Red>() }
      };
    `;
    const presets = extractPresets(code);
    expect(presets.length).toBe(2);
    expect(presets[0].displayLabel).toBe('Display 1');
    // Second preset has no 3rd string literal, so displayLabel is null
    expect(presets[1].displayLabel).toBeNull();
    expect(presets[1].fontName).toBe('Font2');
  });
});
