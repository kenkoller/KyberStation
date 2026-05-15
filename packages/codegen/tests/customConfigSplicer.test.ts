import { describe, it, expect } from 'vitest';
import {
  splicePresetsIntoConfig,
  validateFactoryConfig,
} from '../src/customConfigSplicer.js';
import type { PresetEntry } from '../src/types.js';

// Synthetic factory config approximating the 89sabers V3.9 shape, kept
// minimal so the test file doesn't need a license header. The structural
// elements that matter for the splicer are: a CONFIG_TOP block, a
// CONFIG_PROP include, a Preset presets[] array with nested braces from
// preset constructor syntax, a BladeConfig blades[] array, and a
// CONFIG_BUTTONS block.
const FACTORY_FIXTURE = `#ifdef CONFIG_TOP
#include "proffieboard_v3_config.h"
#define NUM_BLADES 2
#define NUM_BUTTONS 2
#define VOLUME 1800
const unsigned int maxLedsPerStrip = 128;
#define CLASH_THRESHOLD_G 4.5
#define ENABLE_AUDIO
#define ENABLE_MOTION
#define ENABLE_WS2811
#define ENABLE_SD
#define ENABLE_SERIAL
#define ORIENTATION ORIENTATION_USB_TOWARDS_BLADE
#define FETT263_MULTI_PHASE
#define MOTION_TIMEOUT 60 * 3 * 800
#endif

#ifdef CONFIG_PROP
#include "../props/saber_fett263_buttons.h"
#endif

#ifdef CONFIG_PRESETS
Preset presets[] = {
   { "AhsokaTM;common", "tracks/mars.wav",
    StylePtr<InOutHelper<EasyBlade<OnSpark<BrownNoiseFlicker<Snow,Blue,50>>,White>,300,800>>(),
    StylePtr<InOutHelper<EasyBlade<OnSpark<BrownNoiseFlicker<Snow,Blue,50>>,White>,300,800>>(), "Ahsoka"},
   { "Ben;common", "tracks/mars.wav",
    StylePtr<InOutHelper<SimpleClash<Lockup<Blast<DeepSkyBlue,White>,AudioFlicker<DeepSkyBlue,White>>,White>,300,800>>(),
    StylePtr<InOutHelper<SimpleClash<Lockup<Blast<DeepSkyBlue,White>,AudioFlicker<DeepSkyBlue,White>>,White>,300,800>>(), "Ben"},
};

BladeConfig blades[] = {
 { 0, WS281XBladePtr<128, bladePin, Color8::GRB, PowerPINS<bladePowerPin2, bladePowerPin3> >(),
    WS281XBladePtr<30, blade2Pin, Color8::GRB, PowerPINS<bladePowerPin4, bladePowerPin5> >()
  , CONFIGARRAY(presets) },
};
#endif

#ifdef CONFIG_BUTTONS
Button PowerButton(BUTTON_POWER, powerButtonPin, "pow");
Button AuxButton(BUTTON_AUX, auxPin, "aux");
#endif
`;

const NEW_PRESETS: PresetEntry[] = [
  {
    fontName: 'MyFont',
    trackFile: 'tracks/track1.wav',
    styleCodes: ['StylePtr<Black>()'],
    presetName: 'My Preset',
  },
];

describe('splicePresetsIntoConfig', () => {
  it('replaces the Preset array while preserving everything else', () => {
    const result = splicePresetsIntoConfig(FACTORY_FIXTURE, NEW_PRESETS);

    // CONFIG_TOP block preserved
    expect(result).toContain('#define NUM_BLADES 2');
    expect(result).toContain('#define VOLUME 1800');
    expect(result).toContain('#define ORIENTATION ORIENTATION_USB_TOWARDS_BLADE');
    expect(result).toContain('#define MOTION_TIMEOUT 60 * 3 * 800');

    // CONFIG_PROP include preserved
    expect(result).toContain('#include "../props/saber_fett263_buttons.h"');

    // BladeConfig preserved verbatim (the line-broken format too)
    expect(result).toContain(
      'WS281XBladePtr<128, bladePin, Color8::GRB, PowerPINS<bladePowerPin2, bladePowerPin3> >()',
    );
    expect(result).toContain(
      'WS281XBladePtr<30, blade2Pin, Color8::GRB, PowerPINS<bladePowerPin4, bladePowerPin5> >()',
    );

    // CONFIG_BUTTONS preserved
    expect(result).toContain('Button PowerButton(BUTTON_POWER');

    // Old preset entries gone
    expect(result).not.toContain('AhsokaTM;common');
    expect(result).not.toContain('Ben;common');
    expect(result).not.toContain('BrownNoiseFlicker');

    // New preset entry present
    expect(result).toContain('"MyFont"');
    expect(result).toContain('"My Preset"');
    expect(result).toContain('StylePtr<Black>()');
  });

  it('preserves the surrounding #ifdef CONFIG_PRESETS / #endif markers', () => {
    const result = splicePresetsIntoConfig(FACTORY_FIXTURE, NEW_PRESETS);
    expect(result).toContain('#ifdef CONFIG_PRESETS');
    expect(result).toContain('#endif');
    // BladeConfig block still inside the same CONFIG_PRESETS section
    const presetsSection = result.slice(
      result.indexOf('#ifdef CONFIG_PRESETS'),
      result.indexOf('#ifdef CONFIG_BUTTONS'),
    );
    expect(presetsSection).toContain('BladeConfig blades[]');
  });

  it('handles nested braces in preset constructor syntax correctly', () => {
    // The 89sabers fixture has braces from `{ "Font", "track", Style, Style, "Name"}` —
    // the splicer's brace-matching must depth-count past those.
    const result = splicePresetsIntoConfig(FACTORY_FIXTURE, NEW_PRESETS);
    // BladeConfig braces are preserved (they came AFTER the replaced array)
    expect(result.match(/BladeConfig blades\[\]\s*=\s*\{/)).toBeTruthy();
    expect(result).toContain('CONFIGARRAY(presets) }');
  });

  it('respects string literals containing braces', () => {
    const configWithBracesInStrings = FACTORY_FIXTURE.replace(
      '"AhsokaTM;common"',
      '"Ahsoka{tricky}TM;common"',
    );
    const result = splicePresetsIntoConfig(configWithBracesInStrings, NEW_PRESETS);
    // The string-literal `{tricky}` would crash a naive brace counter —
    // splicer must skip braces inside strings. If this throws or splices
    // wrong, the BladeConfig will be missing from the output.
    expect(result).toContain('BladeConfig blades[]');
    expect(result).toContain('WS281XBladePtr<128, bladePin');
  });

  it('respects // line comments containing braces', () => {
    const configWithCommentedBrace = FACTORY_FIXTURE.replace(
      'Preset presets[] = {',
      'Preset presets[] = {\n  // junk } brace in comment',
    );
    const result = splicePresetsIntoConfig(configWithCommentedBrace, NEW_PRESETS);
    expect(result).toContain('BladeConfig blades[]');
  });

  it('respects /* block comments */ containing braces', () => {
    const configWithBlockComment = FACTORY_FIXTURE.replace(
      'Preset presets[] = {',
      'Preset presets[] = {\n  /* not a real } brace */',
    );
    const result = splicePresetsIntoConfig(configWithBlockComment, NEW_PRESETS);
    expect(result).toContain('BladeConfig blades[]');
  });

  it('emits each preset in the new array', () => {
    const presets: PresetEntry[] = [
      { fontName: 'fontA', styleCodes: ['StylePtr<Red>()'], presetName: 'A' },
      { fontName: 'fontB', styleCodes: ['StylePtr<Blue>()'], presetName: 'B' },
      { fontName: 'fontC', styleCodes: ['StylePtr<Green>()'], presetName: 'C' },
    ];
    const result = splicePresetsIntoConfig(FACTORY_FIXTURE, presets);
    expect(result).toContain('"fontA"');
    expect(result).toContain('"fontB"');
    expect(result).toContain('"fontC"');
    expect(result).toContain('StylePtr<Red>()');
    expect(result).toContain('StylePtr<Blue>()');
    expect(result).toContain('StylePtr<Green>()');
  });

  it('throws a clear error when Preset presets[] is missing', () => {
    const noPresets = FACTORY_FIXTURE.replace(/Preset presets\[\][^;]+;/s, '');
    expect(() => splicePresetsIntoConfig(noPresets, NEW_PRESETS)).toThrow(
      /Preset presets\[\]/,
    );
  });

  it('throws when the Preset array is unterminated', () => {
    // Truncate before the closing `};`
    const truncated = FACTORY_FIXTURE.slice(
      0,
      FACTORY_FIXTURE.indexOf('"Ben"}') + 1,
    );
    expect(() => splicePresetsIntoConfig(truncated, NEW_PRESETS)).toThrow(
      /Unterminated|matching/i,
    );
  });

  it('throws when the close brace is not followed by a semicolon', () => {
    const noSemi = FACTORY_FIXTURE.replace(/\};\s*\n\s*\nBladeConfig/, '}\n\nBladeConfig');
    expect(() => splicePresetsIntoConfig(noSemi, NEW_PRESETS)).toThrow(/Missing `;`/);
  });
});

describe('validateFactoryConfig', () => {
  it('accepts the canonical fixture', () => {
    expect(validateFactoryConfig(FACTORY_FIXTURE)).toEqual([]);
  });

  it('rejects empty input', () => {
    expect(validateFactoryConfig('')).toContain('Config is empty.');
    expect(validateFactoryConfig('   \n  \t  ')).toContain('Config is empty.');
  });

  it('reports missing CONFIG_TOP', () => {
    const noTop = FACTORY_FIXTURE.replace(/#ifdef CONFIG_TOP/g, '');
    const errors = validateFactoryConfig(noTop);
    expect(errors.some((e) => e.includes('CONFIG_TOP'))).toBe(true);
  });

  it('reports missing CONFIG_PRESETS', () => {
    const noPresets = FACTORY_FIXTURE.replace(/#ifdef CONFIG_PRESETS/g, '');
    const errors = validateFactoryConfig(noPresets);
    expect(errors.some((e) => e.includes('CONFIG_PRESETS'))).toBe(true);
  });

  it('reports missing Preset array', () => {
    const noPresetArray = FACTORY_FIXTURE.replace(
      /Preset\s+presets\s*\[\s*\]\s*=\s*\{/,
      '// no presets here',
    );
    const errors = validateFactoryConfig(noPresetArray);
    expect(errors.some((e) => e.includes('Preset presets[]'))).toBe(true);
  });

  it('reports missing BladeConfig', () => {
    const noBlades = FACTORY_FIXTURE.replace(
      /BladeConfig\s+blades\s*\[\s*\]\s*=\s*\{/,
      '// no blades here',
    );
    const errors = validateFactoryConfig(noBlades);
    expect(errors.some((e) => e.includes('BladeConfig'))).toBe(true);
  });

  it('reports multiple errors at once (soft-fail behavior)', () => {
    const errors = validateFactoryConfig('// just a comment, no real content');
    expect(errors.length).toBeGreaterThan(1);
  });
});
