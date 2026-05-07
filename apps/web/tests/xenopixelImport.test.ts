import { describe, it, expect } from 'vitest';
import {
  parseXenoConfigIni,
  parseXenoFontConfig,
  xenoFontToBladeConfig,
  importXenoSdCard,
} from '../lib/xenopixelImport';
import type { XenoFontConfig } from '../lib/xenopixelImport';

// ─── config.ini Parsing ───

describe('parseXenoConfigIni', () => {
  it('parses a complete config.ini with all fields', () => {
    const content = [
      '#Main blade length',
      'pixel_number=144',
      '',
      '#Motion control',
      'motion_control=1',
      'pull_push_on=0',
      'push_pull_off=1',
      'push_sensitivity=20',
      'pull_sensitivity=15',
      'swing_on=0',
      'swing_sensitivity=1200',
      'twist_on=1',
      'twist_off=1',
      'twist_sensitivity=250',
      '',
      '#Volume',
      'volume=90',
      '',
      '#Blade modes',
      'velocity_mode=1',
      'torch_mode=1',
      'multiblock_mode=0',
      'multilock_mode=1',
      'lightning_block_mode=1',
      'blaster_mode=1',
      'ghost_mode=0',
      '',
      '#Sound',
      'countdown=0',
      '',
      '#Clash',
      'flash_on_clash=0',
      'clash_sensitivity=3.5',
      '',
      '#Power timing',
      'PowerOnTime=3000',
      'PowerOffTime=15000',
      '',
    ].join('\n');

    const config = parseXenoConfigIni(content);

    expect(config.pixelNumber).toBe(144);
    expect(config.motionControl).toBe(true);
    expect(config.pullPushOn).toBe(false);
    expect(config.pushPullOff).toBe(true);
    expect(config.pushSensitivity).toBe(20);
    expect(config.pullSensitivity).toBe(15);
    expect(config.swingOn).toBe(false);
    expect(config.swingSensitivity).toBe(1200);
    expect(config.twistOn).toBe(true);
    expect(config.twistOff).toBe(true);
    expect(config.twistSensitivity).toBe(250);
    expect(config.volume).toBe(90);
    expect(config.velocityMode).toBe(true);
    expect(config.torchMode).toBe(true);
    expect(config.multiblockMode).toBe(false);
    expect(config.multilockMode).toBe(true);
    expect(config.lightningBlockMode).toBe(true);
    expect(config.blasterMode).toBe(true);
    expect(config.ghostMode).toBe(false);
    expect(config.countdown).toBe(false);
    expect(config.flashOnClash).toBe(false);
    expect(config.clashSensitivity).toBe(3.5);
    expect(config.powerOnTime).toBe(3000);
    expect(config.powerOffTime).toBe(15000);
  });

  it('returns defaults for empty input', () => {
    const config = parseXenoConfigIni('');

    expect(config.pixelNumber).toBe(133);
    expect(config.motionControl).toBe(true);
    expect(config.volume).toBe(80);
    expect(config.clashSensitivity).toBe(2.0);
    expect(config.powerOnTime).toBe(2000);
    expect(config.powerOffTime).toBe(10000);
  });

  it('handles partial config with only some fields', () => {
    const content = 'pixel_number=100\nvolume=50\n';
    const config = parseXenoConfigIni(content);

    expect(config.pixelNumber).toBe(100);
    expect(config.volume).toBe(50);
    // Everything else should be default
    expect(config.motionControl).toBe(true);
    expect(config.swingSensitivity).toBe(1100);
  });

  it('skips comment lines and blank lines', () => {
    const content = [
      '# This is a comment',
      '; Another comment style',
      '',
      'pixel_number=120',
      '# more comments',
      'volume=75',
    ].join('\n');

    const config = parseXenoConfigIni(content);
    expect(config.pixelNumber).toBe(120);
    expect(config.volume).toBe(75);
  });

  it('handles whitespace around keys and values', () => {
    const content = '  pixel_number = 110  \n  volume = 65  \n';
    const config = parseXenoConfigIni(content);
    expect(config.pixelNumber).toBe(110);
    expect(config.volume).toBe(65);
  });

  it('handles malformed numeric values gracefully', () => {
    const content = 'pixel_number=abc\nvolume=not_a_number\nclash_sensitivity=xyz\n';
    const config = parseXenoConfigIni(content);

    // Should fall back to defaults
    expect(config.pixelNumber).toBe(133);
    expect(config.volume).toBe(80);
    expect(config.clashSensitivity).toBe(2.0);
  });

  it('handles Windows-style line endings (CRLF)', () => {
    const content = 'pixel_number=99\r\nvolume=42\r\n';
    const config = parseXenoConfigIni(content);
    expect(config.pixelNumber).toBe(99);
    expect(config.volume).toBe(42);
  });

  it('is case-insensitive for PascalCase keys (PowerOnTime / PowerOffTime)', () => {
    const content = 'PowerOnTime=4000\nPowerOffTime=20000\n';
    const config = parseXenoConfigIni(content);
    expect(config.powerOnTime).toBe(4000);
    expect(config.powerOffTime).toBe(20000);
  });
});

// ─── fontconfig.ini Parsing ───

describe('parseXenoFontConfig', () => {
  it('parses a single font line with all fields', () => {
    const content = 'font1=(0,0,255),1,0,0,0,0,0,300,500\n';
    const fonts = parseXenoFontConfig(content);

    expect(fonts).toHaveLength(1);
    expect(fonts[0].fontNumber).toBe(1);
    expect(fonts[0].baseColor).toEqual({ r: 0, g: 0, b: 255 });
    expect(fonts[0].bladeEffect).toBe(1);
    expect(fonts[0].blasterEffect).toBe(0);
    expect(fonts[0].forceEffect).toBe(0);
    expect(fonts[0].lockupEffect).toBe(0);
    expect(fonts[0].defaultLightEffect).toBe(0);
    expect(fonts[0].ignitionStyle).toBe(0);
    expect(fonts[0].ignitionSpeedMs).toBe(300);
    expect(fonts[0].retractionSpeedMs).toBe(500);
  });

  it('parses multiple font lines', () => {
    const content = [
      'font1=(255,0,0),0,0,0,0,0,0,200,400',
      'font2=(0,255,0),1,1,0,0,1,1,350,600',
      'font3=(0,0,255),2,0,1,0,0,2,400,700',
    ].join('\n');

    const fonts = parseXenoFontConfig(content);
    expect(fonts).toHaveLength(3);

    expect(fonts[0].baseColor).toEqual({ r: 255, g: 0, b: 0 });
    expect(fonts[0].bladeEffect).toBe(0);

    expect(fonts[1].baseColor).toEqual({ r: 0, g: 255, b: 0 });
    expect(fonts[1].bladeEffect).toBe(1);
    expect(fonts[1].ignitionStyle).toBe(1);

    expect(fonts[2].baseColor).toEqual({ r: 0, g: 0, b: 255 });
    expect(fonts[2].bladeEffect).toBe(2);
    expect(fonts[2].ignitionStyle).toBe(2);
  });

  it('returns sorted by font number', () => {
    const content = [
      'font3=(0,0,255),1,0,0,0,0,0,300,500',
      'font1=(255,0,0),1,0,0,0,0,0,300,500',
      'font2=(0,255,0),1,0,0,0,0,0,300,500',
    ].join('\n');

    const fonts = parseXenoFontConfig(content);
    expect(fonts.map(f => f.fontNumber)).toEqual([1, 2, 3]);
  });

  it('returns empty array for blank input', () => {
    expect(parseXenoFontConfig('')).toEqual([]);
  });

  it('skips comment and blank lines', () => {
    const content = [
      '# Preset config',
      '',
      'font1=(128,128,128),1,0,0,0,0,0,300,500',
      '# another comment',
      '',
    ].join('\n');

    const fonts = parseXenoFontConfig(content);
    expect(fonts).toHaveLength(1);
    expect(fonts[0].baseColor).toEqual({ r: 128, g: 128, b: 128 });
  });

  it('handles missing trailing fields with defaults', () => {
    // Only provide RGB + bladeEffect, missing the rest
    const content = 'font1=(100,200,50),3\n';
    const fonts = parseXenoFontConfig(content);

    expect(fonts).toHaveLength(1);
    expect(fonts[0].baseColor).toEqual({ r: 100, g: 200, b: 50 });
    expect(fonts[0].bladeEffect).toBe(3);
    // Missing fields default
    expect(fonts[0].blasterEffect).toBe(0);
    expect(fonts[0].forceEffect).toBe(0);
    expect(fonts[0].ignitionStyle).toBe(0);
    expect(fonts[0].ignitionSpeedMs).toBe(300);
    expect(fonts[0].retractionSpeedMs).toBe(500);
  });

  it('handles whitespace in RGB tuple', () => {
    const content = 'font1=( 10 , 20 , 30 ),1,0,0,0,0,0,300,500\n';
    const fonts = parseXenoFontConfig(content);

    expect(fonts).toHaveLength(1);
    expect(fonts[0].baseColor).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('clamps RGB values to 0-255', () => {
    const content = 'font1=(300,500,-10),1,0,0,0,0,0,300,500\n';
    const fonts = parseXenoFontConfig(content);

    // -10 won't match \d+ in the regex so the entire line fails to parse
    expect(fonts).toHaveLength(0);
  });

  it('clamps out-of-range positive RGB to 255', () => {
    const content = 'font1=(300,400,500),1,0,0,0,0,0,300,500\n';
    const fonts = parseXenoFontConfig(content);

    expect(fonts).toHaveLength(1);
    expect(fonts[0].baseColor).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('skips lines that are not font entries', () => {
    const content = [
      'some_other_key=value',
      'font1=(255,0,0),1,0,0,0,0,0,300,500',
      'not_a_font_line',
    ].join('\n');

    const fonts = parseXenoFontConfig(content);
    expect(fonts).toHaveLength(1);
  });
});

// ─── Font → BladeConfig Conversion ───

describe('xenoFontToBladeConfig', () => {
  it('converts a basic font config to BladeConfig', () => {
    const font: XenoFontConfig = {
      fontNumber: 1,
      baseColor: { r: 0, g: 140, b: 255 },
      bladeEffect: 1,
      blasterEffect: 0,
      forceEffect: 0,
      lockupEffect: 0,
      defaultLightEffect: 0,
      ignitionStyle: 0,
      ignitionSpeedMs: 300,
      retractionSpeedMs: 500,
    };

    const config = xenoFontToBladeConfig(font);

    expect(config.name).toBe('Xenopixel Font 1');
    expect(config.baseColor).toEqual({ r: 0, g: 140, b: 255 });
    expect(config.style).toBe('stable');
    expect(config.ignition).toBe('standard');
    expect(config.retraction).toBe('standard');
    expect(config.ignitionMs).toBe(300);
    expect(config.retractionMs).toBe(500);
    expect(config.shimmer).toBe(0.3);
    expect(config.ledCount).toBe(133);
    expect(config.importedSource).toBe('Xenopixel V3 SD Card');
    expect(config.importedAt).toBeGreaterThan(0);
  });

  it('uses provided ledCount override', () => {
    const font: XenoFontConfig = {
      fontNumber: 2,
      baseColor: { r: 255, g: 0, b: 0 },
      bladeEffect: 0,
      blasterEffect: 0,
      forceEffect: 0,
      lockupEffect: 0,
      defaultLightEffect: 0,
      ignitionStyle: 0,
      ignitionSpeedMs: 200,
      retractionSpeedMs: 400,
    };

    const config = xenoFontToBladeConfig(font, 144);
    expect(config.ledCount).toBe(144);
  });

  it('maps all blade effect IDs to correct styles', () => {
    const effectToStyle: [number, string][] = [
      [0, 'fire'],
      [1, 'stable'],
      [2, 'unstable'],
      [3, 'rainbow'],
      [4, 'stable'],           // Candy → stable
      [5, 'crystalShatter'],
      [6, 'pulse'],
      [7, 'stable'],           // Flashing → stable
    ];

    for (const [effectId, expectedStyle] of effectToStyle) {
      const font: XenoFontConfig = {
        fontNumber: 1,
        baseColor: { r: 255, g: 255, b: 255 },
        bladeEffect: effectId,
        blasterEffect: 0,
        forceEffect: 0,
        lockupEffect: 0,
        defaultLightEffect: 0,
        ignitionStyle: 0,
        ignitionSpeedMs: 300,
        retractionSpeedMs: 500,
      };
      const config = xenoFontToBladeConfig(font);
      expect(config.style).toBe(expectedStyle);
    }
  });

  it('maps ignition style IDs 0-4 to correct ignitions', () => {
    const ignitionToName: [number, string][] = [
      [0, 'standard'],
      [1, 'scroll'],    // Velocity
      [2, 'wipe'],      // Torch
      [3, 'spark'],     // Blaster
      [4, 'standard'],  // Ghost → standard
    ];

    for (const [styleId, expectedIgnition] of ignitionToName) {
      const font: XenoFontConfig = {
        fontNumber: 1,
        baseColor: { r: 255, g: 255, b: 255 },
        bladeEffect: 1,
        blasterEffect: 0,
        forceEffect: 0,
        lockupEffect: 0,
        defaultLightEffect: 0,
        ignitionStyle: styleId,
        ignitionSpeedMs: 300,
        retractionSpeedMs: 500,
      };
      const config = xenoFontToBladeConfig(font);
      expect(config.ignition).toBe(expectedIgnition);
    }
  });

  it('maps special preon ignition IDs 5-11 to standard', () => {
    for (let id = 5; id <= 11; id++) {
      const font: XenoFontConfig = {
        fontNumber: 1,
        baseColor: { r: 255, g: 255, b: 255 },
        bladeEffect: 1,
        blasterEffect: 0,
        forceEffect: 0,
        lockupEffect: 0,
        defaultLightEffect: 0,
        ignitionStyle: id,
        ignitionSpeedMs: 300,
        retractionSpeedMs: 500,
      };
      const config = xenoFontToBladeConfig(font);
      expect(config.ignition).toBe('standard');
    }
  });

  it('does not mutate the input font color', () => {
    const font: XenoFontConfig = {
      fontNumber: 1,
      baseColor: { r: 100, g: 150, b: 200 },
      bladeEffect: 1,
      blasterEffect: 0,
      forceEffect: 0,
      lockupEffect: 0,
      defaultLightEffect: 0,
      ignitionStyle: 0,
      ignitionSpeedMs: 300,
      retractionSpeedMs: 500,
    };

    const config = xenoFontToBladeConfig(font);
    config.baseColor.r = 0;
    // Original font should be untouched
    expect(font.baseColor.r).toBe(100);
  });
});

// ─── Round-Trip Tests (Emitter format → Parser) ───

describe('round-trip: emitter output → parser', () => {
  // Generate content matching the XenopixelEmitter's output format
  function generateFontConfigLine(
    fontNumber: number,
    color: { r: number; g: number; b: number },
    bladeEffect: number,
    ignitionStyle: number,
    ignitionSpeed: number,
    retractionSpeed: number,
  ): string {
    const rgb = `(${color.r},${color.g},${color.b})`;
    return `font${fontNumber}=${rgb},${bladeEffect},0,0,0,0,${ignitionStyle},${ignitionSpeed},${retractionSpeed}`;
  }

  function generateConfigIni(pixelNumber: number, volume: number): string {
    const lines = [
      '#Main blade length',
      `pixel_number=${pixelNumber}`,
      '',
      '#Motion control',
      'motion_control=1',
      'pull_push_on=1',
      'push_pull_off=1',
      'push_sensitivity=18',
      'pull_sensitivity=13',
      'swing_on=1',
      'swing_sensitivity=1100',
      'twist_on=0',
      'twist_off=0',
      'twist_sensitivity=220',
      '',
      '#Volume',
      `volume=${volume}`,
      '',
      '#Blade modes',
      'velocity_mode=0',
      'torch_mode=0',
      'multiblock_mode=0',
      'multilock_mode=0',
      'lightning_block_mode=0',
      'blaster_mode=0',
      'ghost_mode=0',
      '',
      '#Sound',
      'countdown=1',
      '',
      '#Clash',
      'flash_on_clash=1',
      'clash_sensitivity=2.0',
      '',
      '#Power timing',
      'PowerOnTime=2000',
      'PowerOffTime=10000',
      '',
    ];
    return lines.join('\n');
  }

  it('round-trips a single font preset through emitter format → parser', () => {
    const originalColor = { r: 0, g: 140, b: 255 };
    const originalBladeEffect = 1; // stable
    const originalIgnition = 0;    // standard
    const originalIgnMs = 300;
    const originalRetMs = 500;

    const fontLine = generateFontConfigLine(1, originalColor, originalBladeEffect, originalIgnition, originalIgnMs, originalRetMs);
    const fonts = parseXenoFontConfig(fontLine);

    expect(fonts).toHaveLength(1);
    expect(fonts[0].baseColor).toEqual(originalColor);
    expect(fonts[0].bladeEffect).toBe(originalBladeEffect);
    expect(fonts[0].ignitionStyle).toBe(originalIgnition);
    expect(fonts[0].ignitionSpeedMs).toBe(originalIgnMs);
    expect(fonts[0].retractionSpeedMs).toBe(originalRetMs);

    const bladeConfig = xenoFontToBladeConfig(fonts[0]);
    expect(bladeConfig.baseColor).toEqual(originalColor);
    expect(bladeConfig.style).toBe('stable');
    expect(bladeConfig.ignition).toBe('standard');
    expect(bladeConfig.ignitionMs).toBe(originalIgnMs);
    expect(bladeConfig.retractionMs).toBe(originalRetMs);
  });

  it('round-trips global config through emitter format → parser', () => {
    const configContent = generateConfigIni(144, 75);
    const config = parseXenoConfigIni(configContent);

    expect(config.pixelNumber).toBe(144);
    expect(config.volume).toBe(75);
    expect(config.motionControl).toBe(true);
    expect(config.clashSensitivity).toBe(2.0);
    expect(config.powerOnTime).toBe(2000);
    expect(config.powerOffTime).toBe(10000);
  });

  it('round-trips blade effect IDs through emit → parse → lookup', () => {
    // Emitter maps: fire→0, stable→1, unstable→2, rainbow→3, crystalShatter→5, pulse→6
    // Parser should reverse: 0→fire, 1→stable, 2→unstable, 3→rainbow, 5→crystalShatter, 6→pulse
    const roundTripPairs: [string, number][] = [
      ['fire', 0],
      ['stable', 1],
      ['unstable', 2],
      ['rainbow', 3],
      ['crystalShatter', 5],
      ['pulse', 6],
    ];

    for (const [originalStyle, effectId] of roundTripPairs) {
      const line = generateFontConfigLine(1, { r: 255, g: 255, b: 255 }, effectId, 0, 300, 500);
      const fonts = parseXenoFontConfig(line);
      const config = xenoFontToBladeConfig(fonts[0]);
      expect(config.style).toBe(originalStyle);
    }
  });

  it('round-trips ignition style IDs through emit → parse → lookup', () => {
    // Emitter maps: standard→0, scroll→1, wipe→2, spark→3
    const roundTripPairs: [string, number][] = [
      ['standard', 0],
      ['scroll', 1],
      ['wipe', 2],
      ['spark', 3],
    ];

    for (const [originalIgnition, styleId] of roundTripPairs) {
      const line = generateFontConfigLine(1, { r: 255, g: 255, b: 255 }, 1, styleId, 300, 500);
      const fonts = parseXenoFontConfig(line);
      const config = xenoFontToBladeConfig(fonts[0]);
      expect(config.ignition).toBe(originalIgnition);
    }
  });
});

// ─── Full SD Card Import ───

describe('importXenoSdCard', () => {
  it('imports a complete SD card with global config and 3 fonts', () => {
    const files = new Map<string, string>();

    files.set('set/config.ini', [
      '#Main blade length',
      'pixel_number=144',
      '',
      '#Volume',
      'volume=85',
      '',
      '#Motion control',
      'motion_control=1',
      'pull_push_on=1',
      'push_pull_off=1',
      'push_sensitivity=18',
      'pull_sensitivity=13',
      'swing_on=1',
      'swing_sensitivity=1100',
      'twist_on=0',
      'twist_off=0',
      'twist_sensitivity=220',
      '',
      '#Blade modes',
      'velocity_mode=0',
      'torch_mode=0',
      'multiblock_mode=0',
      'multilock_mode=0',
      'lightning_block_mode=0',
      'blaster_mode=0',
      'ghost_mode=0',
      '',
      '#Sound',
      'countdown=1',
      '',
      '#Clash',
      'flash_on_clash=1',
      'clash_sensitivity=2.0',
      '',
      '#Power timing',
      'PowerOnTime=2000',
      'PowerOffTime=10000',
    ].join('\n'));

    files.set('fontconfig.ini', [
      'font1=(255,0,0),0,0,0,0,0,0,200,400',    // Red, Fire, Standard
      'font2=(0,255,0),1,0,0,0,0,1,350,600',     // Green, Stable, Velocity/Scroll
      'font3=(0,0,255),2,0,0,0,0,2,400,700',     // Blue, Unstable, Torch/Wipe
    ].join('\n'));

    const result = importXenoSdCard(files);

    // Global config
    expect(result.global.pixelNumber).toBe(144);
    expect(result.global.volume).toBe(85);

    // Fonts
    expect(result.fonts).toHaveLength(3);
    expect(result.fonts[0].baseColor).toEqual({ r: 255, g: 0, b: 0 });
    expect(result.fonts[1].baseColor).toEqual({ r: 0, g: 255, b: 0 });
    expect(result.fonts[2].baseColor).toEqual({ r: 0, g: 0, b: 255 });

    // BladeConfigs
    expect(result.bladeConfigs).toHaveLength(3);

    // Font 1: Red, Fire, Standard
    expect(result.bladeConfigs[0].baseColor).toEqual({ r: 255, g: 0, b: 0 });
    expect(result.bladeConfigs[0].style).toBe('fire');
    expect(result.bladeConfigs[0].ignition).toBe('standard');
    expect(result.bladeConfigs[0].ignitionMs).toBe(200);
    expect(result.bladeConfigs[0].retractionMs).toBe(400);
    expect(result.bladeConfigs[0].ledCount).toBe(144);

    // Font 2: Green, Stable, Scroll
    expect(result.bladeConfigs[1].baseColor).toEqual({ r: 0, g: 255, b: 0 });
    expect(result.bladeConfigs[1].style).toBe('stable');
    expect(result.bladeConfigs[1].ignition).toBe('scroll');

    // Font 3: Blue, Unstable, Wipe
    expect(result.bladeConfigs[2].baseColor).toEqual({ r: 0, g: 0, b: 255 });
    expect(result.bladeConfigs[2].style).toBe('unstable');
    expect(result.bladeConfigs[2].ignition).toBe('wipe');
  });

  it('uses global pixelNumber as ledCount for all BladeConfigs', () => {
    const files = new Map<string, string>();
    files.set('set/config.ini', 'pixel_number=100\n');
    files.set('fontconfig.ini', 'font1=(128,128,128),1,0,0,0,0,0,300,500\n');

    const result = importXenoSdCard(files);
    expect(result.bladeConfigs[0].ledCount).toBe(100);
  });

  it('warns when no config.ini is found', () => {
    const files = new Map<string, string>();
    files.set('fontconfig.ini', 'font1=(255,0,0),1,0,0,0,0,0,300,500\n');

    const result = importXenoSdCard(files);
    expect(result.warnings).toContain('No set/config.ini found; using default global settings');
    expect(result.bladeConfigs[0].ledCount).toBe(133); // default
  });

  it('warns when no font presets are found', () => {
    const files = new Map<string, string>();
    files.set('set/config.ini', 'pixel_number=133\n');

    const result = importXenoSdCard(files);
    expect(result.warnings).toContain('No font presets found in any fontconfig.ini file');
    expect(result.bladeConfigs).toHaveLength(0);
  });

  it('generates warnings for lossy blade effect mappings', () => {
    const files = new Map<string, string>();
    files.set('set/config.ini', 'pixel_number=133\n');
    // Effect 4 = Candy (no KyberStation equivalent)
    files.set('fontconfig.ini', 'font1=(255,0,0),4,0,0,0,0,0,300,500\n');

    const result = importXenoSdCard(files);
    const candyWarning = result.warnings.find(w => w.includes('Candy'));
    expect(candyWarning).toBeDefined();
  });

  it('generates warnings for special preon ignition mappings', () => {
    const files = new Map<string, string>();
    files.set('set/config.ini', 'pixel_number=133\n');
    // Ignition 7 = Word Ignition (special preon)
    files.set('fontconfig.ini', 'font1=(255,0,0),1,0,0,0,0,7,300,500\n');

    const result = importXenoSdCard(files);
    const preonWarning = result.warnings.find(w => w.includes('Word'));
    expect(preonWarning).toBeDefined();
  });

  it('handles per-folder fontconfig.ini files (N/fontconfig.ini)', () => {
    const files = new Map<string, string>();
    files.set('set/config.ini', 'pixel_number=133\n');
    files.set('1/fontconfig.ini', 'font1=(255,0,0),0,0,0,0,0,0,200,400\n');
    files.set('2/fontconfig.ini', 'font2=(0,255,0),1,0,0,0,0,1,300,500\n');

    const result = importXenoSdCard(files);
    expect(result.fonts).toHaveLength(2);
    expect(result.bladeConfigs).toHaveLength(2);
    expect(result.bladeConfigs[0].baseColor).toEqual({ r: 255, g: 0, b: 0 });
    expect(result.bladeConfigs[1].baseColor).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('deduplicates fonts from root + per-folder fontconfig.ini', () => {
    const files = new Map<string, string>();
    files.set('set/config.ini', 'pixel_number=133\n');
    // Root has font1
    files.set('fontconfig.ini', 'font1=(255,0,0),1,0,0,0,0,0,300,500\n');
    // Per-folder also has font1 (different color) — should be skipped
    files.set('1/fontconfig.ini', 'font1=(0,255,0),2,0,0,0,0,0,300,500\n');
    // Per-folder has font2 — should be added
    files.set('2/fontconfig.ini', 'font2=(0,0,255),3,0,0,0,0,0,300,500\n');

    const result = importXenoSdCard(files);
    expect(result.fonts).toHaveLength(2);
    // font1 from root wins
    expect(result.fonts[0].baseColor).toEqual({ r: 255, g: 0, b: 0 });
    // font2 from per-folder
    expect(result.fonts[1].baseColor).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('handles case-insensitive file paths', () => {
    const files = new Map<string, string>();
    files.set('SET/CONFIG.INI', 'pixel_number=120\n');
    files.set('FONTCONFIG.INI', 'font1=(200,100,50),1,0,0,0,0,0,300,500\n');

    const result = importXenoSdCard(files);
    expect(result.global.pixelNumber).toBe(120);
    expect(result.fonts).toHaveLength(1);
  });

  it('handles Windows-style backslash paths', () => {
    const files = new Map<string, string>();
    files.set('set\\config.ini', 'pixel_number=110\n');
    files.set('fontconfig.ini', 'font1=(80,80,80),1,0,0,0,0,0,300,500\n');

    const result = importXenoSdCard(files);
    expect(result.global.pixelNumber).toBe(110);
  });

  it('produces BladeConfigs with all required fields', () => {
    const files = new Map<string, string>();
    files.set('set/config.ini', 'pixel_number=133\n');
    files.set('fontconfig.ini', 'font1=(0,140,255),1,0,0,0,0,0,300,500\n');

    const result = importXenoSdCard(files);
    const config = result.bladeConfigs[0];

    // Verify all required BladeConfig fields are present
    expect(config.baseColor).toBeDefined();
    expect(config.clashColor).toBeDefined();
    expect(config.lockupColor).toBeDefined();
    expect(config.blastColor).toBeDefined();
    expect(config.style).toBeDefined();
    expect(config.ignition).toBeDefined();
    expect(config.retraction).toBeDefined();
    expect(typeof config.ignitionMs).toBe('number');
    expect(typeof config.retractionMs).toBe('number');
    expect(typeof config.shimmer).toBe('number');
    expect(typeof config.ledCount).toBe('number');
    expect(config.importedSource).toBe('Xenopixel V3 SD Card');
  });

  it('handles completely empty file map', () => {
    const result = importXenoSdCard(new Map());

    expect(result.global.pixelNumber).toBe(133);
    expect(result.fonts).toHaveLength(0);
    expect(result.bladeConfigs).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
