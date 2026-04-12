import { describe, it, expect } from 'vitest';
import { ParameterResolver } from '../src/filters/ParameterResolver.js';
import { FILTER_CHAIN_PRESETS } from '../src/filters/presets.js';
import { FILTER_DEFINITIONS } from '../src/filters/definitions.js';
import type {
  SoundCategory,
  FontFormat,
  SoundFile,
  SmoothSwingPair,
  FontManifest,
} from '../src/types.js';
import type {
  AudioFilterType,
  ParameterSourceType,
  LFOWaveform,
  ParameterSource,
  FilterParameter,
  AudioFilterConfig,
  AudioFilterChainConfig,
  DynamicParameterSources,
} from '../src/filters/types.js';
import type {
  FilterDefinition,
  ParameterSchema,
} from '../src/filters/definitions.js';

// ---------------------------------------------------------------------------
// FontParser-equivalent tests: font folder structure parsing
// ---------------------------------------------------------------------------
// Note: FontParser.ts does not exist yet in the codebase. These tests validate
// the data structures (types) that would back a font parser, ensuring the
// FontManifest / SoundFile shapes are correct and usable.

describe('Font manifest data structures', () => {
  const PROFFIE_CATEGORIES: SoundCategory[] = [
    'hum', 'swing', 'clash', 'blast', 'lockup', 'drag', 'melt',
    'in', 'out', 'force', 'stab', 'quote', 'boot', 'font', 'track',
    'ccbegin', 'ccend', 'swingl', 'swingh',
  ];

  it('correctly represents a Proffie font folder structure', () => {
    const files: SoundFile[] = [
      { name: 'hum.wav', category: 'hum', path: '/fonts/kyber/hum.wav' },
      { name: 'swing1.wav', category: 'swing', index: 1, path: '/fonts/kyber/swing1.wav' },
      { name: 'swing2.wav', category: 'swing', index: 2, path: '/fonts/kyber/swing2.wav' },
      { name: 'clash1.wav', category: 'clash', index: 1, path: '/fonts/kyber/clash1.wav' },
      { name: 'blast1.wav', category: 'blast', index: 1, path: '/fonts/kyber/blast1.wav' },
      { name: 'in.wav', category: 'in', path: '/fonts/kyber/in.wav' },
      { name: 'out.wav', category: 'out', path: '/fonts/kyber/out.wav' },
      { name: 'swingl1.wav', category: 'swingl', index: 1, path: '/fonts/kyber/swingl1.wav' },
      { name: 'swingh1.wav', category: 'swingh', index: 1, path: '/fonts/kyber/swingh1.wav' },
    ];

    const smoothSwingPairs: SmoothSwingPair[] = [
      {
        index: 1,
        low: files.find(f => f.name === 'swingl1.wav')!,
        high: files.find(f => f.name === 'swingh1.wav')!,
      },
    ];

    const emptyCounts = Object.fromEntries(
      PROFFIE_CATEGORIES.map(c => [c, 0]),
    ) as Record<SoundCategory, number>;

    const manifest: FontManifest = {
      format: 'proffie',
      files,
      smoothSwingPairs,
      categories: {
        ...emptyCounts,
        hum: 1,
        swing: 2,
        clash: 1,
        blast: 1,
        in: 1,
        out: 1,
        swingl: 1,
        swingh: 1,
      },
      warnings: [],
    };

    expect(manifest.format).toBe('proffie');
    expect(manifest.files).toHaveLength(9);
    expect(manifest.smoothSwingPairs).toHaveLength(1);
    expect(manifest.smoothSwingPairs[0].low.category).toBe('swingl');
    expect(manifest.smoothSwingPairs[0].high.category).toBe('swingh');
    expect(manifest.categories.hum).toBe(1);
    expect(manifest.categories.swing).toBe(2);
    expect(manifest.warnings).toHaveLength(0);
  });

  it('handles missing optional sounds gracefully', () => {
    // A minimal font with only hum and ignition -- no clash, blast, etc.
    const files: SoundFile[] = [
      { name: 'hum.wav', category: 'hum', path: '/fonts/minimal/hum.wav' },
      { name: 'in.wav', category: 'in', path: '/fonts/minimal/in.wav' },
    ];

    const emptyCounts = Object.fromEntries(
      PROFFIE_CATEGORIES.map(c => [c, 0]),
    ) as Record<SoundCategory, number>;

    const manifest: FontManifest = {
      format: 'proffie',
      files,
      smoothSwingPairs: [],
      categories: {
        ...emptyCounts,
        hum: 1,
        in: 1,
      },
      warnings: ['No clash sounds found', 'No swing sounds found'],
    };

    expect(manifest.files).toHaveLength(2);
    expect(manifest.smoothSwingPairs).toHaveLength(0);
    expect(manifest.categories.clash).toBe(0);
    expect(manifest.categories.swing).toBe(0);
    expect(manifest.categories.blast).toBe(0);
    expect(manifest.warnings).toHaveLength(2);
    expect(manifest.warnings[0]).toContain('clash');
  });

  it('supports all FontFormat variants', () => {
    const formats: FontFormat[] = ['proffie', 'cfx', 'plecter', 'generic'];
    expect(formats).toHaveLength(4);
    formats.forEach(f => expect(typeof f).toBe('string'));
  });

  it('SoundFile index is optional', () => {
    const withIndex: SoundFile = {
      name: 'swing01.wav',
      category: 'swing',
      index: 1,
      path: '/fonts/test/swing01.wav',
    };
    const withoutIndex: SoundFile = {
      name: 'hum.wav',
      category: 'hum',
      path: '/fonts/test/hum.wav',
    };

    expect(withIndex.index).toBe(1);
    expect(withoutIndex.index).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AudioFilterChain: configuration and structure tests
// (Actual AudioContext-based chain building requires Web Audio, so we test
//  the config layer, definitions, and factory dispatcher coverage.)
// ---------------------------------------------------------------------------

describe('AudioFilterChain', () => {
  const ALL_FILTER_TYPES: AudioFilterType[] = [
    'lowpass', 'highpass', 'bandpass', 'distortion', 'reverb', 'delay',
    'tremolo', 'chorus', 'flanger', 'phaser', 'compressor', 'bitcrusher',
    'pitch-shift',
  ];

  it('filter types are all registered in FILTER_DEFINITIONS', () => {
    const definedTypes = Object.keys(FILTER_DEFINITIONS) as AudioFilterType[];
    expect(definedTypes.sort()).toEqual([...ALL_FILTER_TYPES].sort());
  });

  it('every FILTER_DEFINITION has required fields', () => {
    for (const [type, def] of Object.entries(FILTER_DEFINITIONS)) {
      expect(def.type).toBe(type);
      expect(typeof def.name).toBe('string');
      expect(def.name.length).toBeGreaterThan(0);
      expect(typeof def.description).toBe('string');
      expect(def.description.length).toBeGreaterThan(0);
      expect(['eq', 'dynamics', 'modulation', 'time', 'distortion', 'special']).toContain(
        def.category,
      );
      expect(Object.keys(def.parameters).length).toBeGreaterThan(0);
    }
  });

  it('every ParameterSchema in definitions has valid min/max/defaultValue', () => {
    for (const def of Object.values(FILTER_DEFINITIONS)) {
      for (const [name, schema] of Object.entries(def.parameters)) {
        expect(schema.min).toBeLessThanOrEqual(schema.max);
        expect(schema.defaultValue).toBeGreaterThanOrEqual(schema.min);
        expect(schema.defaultValue).toBeLessThanOrEqual(schema.max);
        expect(typeof schema.displayName).toBe('string');
      }
    }
  });

  it('can create a valid AudioFilterChainConfig programmatically', () => {
    const config: AudioFilterChainConfig = {
      id: 'test-chain',
      name: 'Test Chain',
      filters: [
        {
          id: 'f1',
          type: 'lowpass',
          enabled: true,
          parameters: {
            frequency: {
              name: 'frequency',
              displayName: 'Frequency',
              source: { type: 'static', value: 1000, outputMin: 1000, outputMax: 1000 },
              unit: 'Hz',
              defaultValue: 1000,
              min: 20,
              max: 20000,
            },
            Q: {
              name: 'Q',
              displayName: 'Resonance',
              source: { type: 'static', value: 1, outputMin: 1, outputMax: 1 },
              defaultValue: 1,
              min: 0.1,
              max: 20,
            },
          },
          appliesTo: 'all',
          mix: {
            name: 'mix',
            displayName: 'Mix',
            source: { type: 'static', value: 1, outputMin: 1, outputMax: 1 },
            defaultValue: 1,
            min: 0,
            max: 1,
          },
        },
      ],
      masterVolume: 0.9,
    };

    expect(config.filters).toHaveLength(1);
    expect(config.filters[0].type).toBe('lowpass');
    expect(config.masterVolume).toBe(0.9);
  });
});

// ---------------------------------------------------------------------------
// ParameterResolver
// ---------------------------------------------------------------------------

describe('ParameterResolver', () => {
  const baseSources: DynamicParameterSources = {
    swingSpeed: 0.5,
    bladeAngle: 0.0,
    twistAngle: -0.5,
    soundLevel: 0.7,
    batteryLevel: 0.9,
    ignitionProgress: 1.0,
    time: 1000,
  };

  it('resolves static parameters', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'static',
      value: 42,
      outputMin: 42,
      outputMax: 42,
    };
    const result = resolver.resolve('test.param', source, baseSources);
    expect(result).toBe(42);
  });

  it('resolves manual parameters', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'manual',
      value: 0.75,
      outputMin: 0,
      outputMax: 100,
    };
    const result = resolver.resolve('test.manual', source, baseSources);
    expect(result).toBe(75);
  });

  it('resolves swing-speed dynamic source', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'swing-speed',
      outputMin: 200,
      outputMax: 2000,
    };
    const result = resolver.resolve('test.swing', source, baseSources);
    // swingSpeed=0.5 -> normalized 0.5 -> 200 + 0.5 * 1800 = 1100
    expect(result).toBe(1100);
  });

  it('resolves blade-angle dynamic source (normalizes -1..1 to 0..1)', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'blade-angle',
      outputMin: 0,
      outputMax: 100,
    };
    // bladeAngle=0.0 -> normalized=(0+1)/2=0.5 -> 0 + 0.5*100 = 50
    const result = resolver.resolve('test.angle', source, baseSources);
    expect(result).toBe(50);
  });

  it('resolves twist-angle dynamic source', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'twist-angle',
      outputMin: 0,
      outputMax: 100,
    };
    // twistAngle=-0.5 -> normalized=(-0.5+1)/2=0.25 -> 0 + 0.25*100 = 25
    const result = resolver.resolve('test.twist', source, baseSources);
    expect(result).toBe(25);
  });

  it('resolves sound-level dynamic source', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'sound-level',
      outputMin: 0,
      outputMax: 1,
    };
    const result = resolver.resolve('test.sound', source, baseSources);
    expect(result).toBeCloseTo(0.7);
  });

  it('resolves battery-level dynamic source', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'battery-level',
      outputMin: 0,
      outputMax: 1,
    };
    const result = resolver.resolve('test.battery', source, baseSources);
    expect(result).toBeCloseTo(0.9);
  });

  it('resolves ignition-progress dynamic source', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'ignition-progress',
      outputMin: 0,
      outputMax: 1,
    };
    const result = resolver.resolve('test.ignition', source, baseSources);
    expect(result).toBeCloseTo(1.0);
  });

  it('resolves random-noise source to a value between outputMin and outputMax', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'random-noise',
      outputMin: 0,
      outputMax: 1,
    };
    const result = resolver.resolve('test.noise', source, baseSources);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('resolves LFO source (sine waveform)', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'lfo',
      lfoWaveform: 'sine',
      lfoRate: 1,
      lfoPhase: 0,
      outputMin: 0,
      outputMax: 1,
    };
    const result = resolver.resolve('test.lfo', source, baseSources);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('resolves LFO source with different waveforms', () => {
    const resolver = new ParameterResolver();
    const waveforms: LFOWaveform[] = ['sine', 'triangle', 'square', 'sawtooth'];

    for (const waveform of waveforms) {
      const source: ParameterSource = {
        type: 'lfo',
        lfoWaveform: waveform,
        lfoRate: 2,
        lfoPhase: 0,
        outputMin: 0,
        outputMax: 1,
      };
      const result = resolver.resolve(`test.lfo.${waveform}`, source, baseSources);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it('applies output range mapping correctly', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'swing-speed',
      inputMin: 0,
      inputMax: 1,
      outputMin: 500,
      outputMax: 5000,
    };
    // swingSpeed=0.5 -> mapped to 500 + 0.5 * 4500 = 2750
    const result = resolver.resolve('test.range', source, baseSources);
    expect(result).toBe(2750);
  });

  it('applies smoothing via exponential moving average', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'static',
      value: 1.0,
      outputMin: 0,
      outputMax: 1,
      smoothing: 0.9,
    };

    // First call: no previous value, so smoothed = mapped
    const first = resolver.resolve('test.smooth', source, baseSources);
    expect(first).toBeCloseTo(1.0);

    // Now change the value; smoothing should pull result toward previous
    const source2: ParameterSource = {
      ...source,
      value: 0.0,
      outputMin: 0,
      outputMax: 0,
    };
    const second = resolver.resolve('test.smooth', source2, baseSources);
    // prev=1.0, mapped=0.0, result = 1.0 + (0.0 - 1.0) * (1 - 0.9) = 0.9
    expect(second).toBeCloseTo(0.9);
  });

  it('reset() clears smoothing state', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'static',
      value: 0.5,
      outputMin: 0.5,
      outputMax: 0.5,
      smoothing: 0.9,
    };

    resolver.resolve('test.reset', source, baseSources);
    resolver.reset();

    // After reset, smoothing should behave as if first call
    const result = resolver.resolve('test.reset', source, baseSources);
    expect(result).toBeCloseTo(0.5);
  });

  it('clamps input to 0..1 when outside inputMin/inputMax range', () => {
    const resolver = new ParameterResolver();
    const source: ParameterSource = {
      type: 'swing-speed',
      inputMin: 0.2,
      inputMax: 0.8,
      outputMin: 0,
      outputMax: 100,
    };
    // swingSpeed=0.5 -> normalized=(0.5-0.2)/(0.8-0.2)=0.5 -> 50
    const result = resolver.resolve('test.clamp', source, baseSources);
    expect(result).toBe(50);

    // Test clamping at extremes
    const extremeSources: DynamicParameterSources = {
      ...baseSources,
      swingSpeed: 0.0, // below inputMin=0.2
    };
    const clamped = resolver.resolve('test.clamp2', source, extremeSources);
    // (0.0 - 0.2) / 0.6 = -0.333, clamped to 0 -> outputMin = 0
    expect(clamped).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Filter presets
// ---------------------------------------------------------------------------

describe('Filter presets', () => {
  const EXPECTED_PRESETS = [
    'clean',
    'kylo-unstable',
    'cave-echo',
    'lofi-retro',
    'underwater',
    'force-tunnel',
  ];

  it('all 6 built-in presets are present', () => {
    const keys = Object.keys(FILTER_CHAIN_PRESETS);
    expect(keys.sort()).toEqual([...EXPECTED_PRESETS].sort());
  });

  it('each preset has a valid id, name, and masterVolume', () => {
    for (const [key, preset] of Object.entries(FILTER_CHAIN_PRESETS)) {
      expect(typeof preset.id).toBe('string');
      expect(preset.id.length).toBeGreaterThan(0);
      expect(typeof preset.name).toBe('string');
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.masterVolume).toBeGreaterThan(0);
      expect(preset.masterVolume).toBeLessThanOrEqual(1);
    }
  });

  it('clean preset has no filters', () => {
    const clean = FILTER_CHAIN_PRESETS['clean'];
    expect(clean.filters).toHaveLength(0);
    expect(clean.masterVolume).toBe(1.0);
  });

  it('kylo-unstable preset has distortion and highpass', () => {
    const preset = FILTER_CHAIN_PRESETS['kylo-unstable'];
    expect(preset.filters).toHaveLength(2);
    expect(preset.filters[0].type).toBe('distortion');
    expect(preset.filters[1].type).toBe('highpass');
  });

  it('cave-echo preset has reverb and delay', () => {
    const preset = FILTER_CHAIN_PRESETS['cave-echo'];
    expect(preset.filters).toHaveLength(2);
    expect(preset.filters[0].type).toBe('reverb');
    expect(preset.filters[1].type).toBe('delay');
  });

  it('lofi-retro preset has bitcrusher and lowpass', () => {
    const preset = FILTER_CHAIN_PRESETS['lofi-retro'];
    expect(preset.filters).toHaveLength(2);
    expect(preset.filters[0].type).toBe('bitcrusher');
    expect(preset.filters[1].type).toBe('lowpass');
  });

  it('underwater preset has lowpass and chorus', () => {
    const preset = FILTER_CHAIN_PRESETS['underwater'];
    expect(preset.filters).toHaveLength(2);
    expect(preset.filters[0].type).toBe('lowpass');
    expect(preset.filters[1].type).toBe('chorus');
  });

  it('force-tunnel preset has phaser, reverb, and pitch-shift', () => {
    const preset = FILTER_CHAIN_PRESETS['force-tunnel'];
    expect(preset.filters).toHaveLength(3);
    expect(preset.filters[0].type).toBe('phaser');
    expect(preset.filters[1].type).toBe('reverb');
    expect(preset.filters[2].type).toBe('pitch-shift');
  });

  it('all preset filters are enabled by default', () => {
    for (const preset of Object.values(FILTER_CHAIN_PRESETS)) {
      for (const filter of preset.filters) {
        expect(filter.enabled).toBe(true);
      }
    }
  });

  it('all preset filter types reference valid FILTER_DEFINITIONS', () => {
    for (const preset of Object.values(FILTER_CHAIN_PRESETS)) {
      for (const filter of preset.filters) {
        expect(FILTER_DEFINITIONS).toHaveProperty(filter.type);
      }
    }
  });

  it('all preset filter parameters have valid source configs', () => {
    for (const preset of Object.values(FILTER_CHAIN_PRESETS)) {
      for (const filter of preset.filters) {
        for (const [name, param] of Object.entries(filter.parameters)) {
          expect(param.source).toBeDefined();
          expect(typeof param.source.type).toBe('string');
          expect(typeof param.source.outputMin).toBe('number');
          expect(typeof param.source.outputMax).toBe('number');
        }
        // Mix parameter
        expect(filter.mix).toBeDefined();
        expect(filter.mix.source).toBeDefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Type exports: verify all expected types are accessible from the package
// ---------------------------------------------------------------------------

describe('Type exports', () => {
  it('exports font-related types from types.ts', () => {
    // These are type-only exports; we verify the interfaces are usable by
    // constructing values that satisfy them.
    const file: SoundFile = {
      name: 'hum.wav',
      category: 'hum',
      path: '/test/hum.wav',
    };
    expect(file.name).toBe('hum.wav');

    const manifest: FontManifest = {
      format: 'proffie',
      files: [file],
      smoothSwingPairs: [],
      categories: {
        hum: 1, swing: 0, clash: 0, blast: 0, lockup: 0, drag: 0, melt: 0,
        in: 0, out: 0, force: 0, stab: 0, quote: 0, boot: 0, font: 0,
        track: 0, ccbegin: 0, ccend: 0, swingl: 0, swingh: 0,
      },
      warnings: [],
    };
    expect(manifest.format).toBe('proffie');
  });

  it('exports filter-related types from filters/types.ts', () => {
    const source: ParameterSource = {
      type: 'static',
      value: 1,
      outputMin: 0,
      outputMax: 1,
    };
    expect(source.type).toBe('static');

    const param: FilterParameter = {
      name: 'test',
      displayName: 'Test',
      source,
      defaultValue: 1,
      min: 0,
      max: 1,
    };
    expect(param.name).toBe('test');

    const filterConfig: AudioFilterConfig = {
      id: 'f1',
      type: 'lowpass',
      enabled: true,
      parameters: { test: param },
      appliesTo: 'all',
      mix: param,
    };
    expect(filterConfig.type).toBe('lowpass');

    const chainConfig: AudioFilterChainConfig = {
      id: 'chain1',
      name: 'Chain',
      filters: [filterConfig],
      masterVolume: 1.0,
    };
    expect(chainConfig.filters).toHaveLength(1);

    const dynSources: DynamicParameterSources = {
      swingSpeed: 0,
      bladeAngle: 0,
      twistAngle: 0,
      soundLevel: 0,
      batteryLevel: 1,
      ignitionProgress: 0,
      time: 0,
    };
    expect(dynSources.batteryLevel).toBe(1);
  });

  it('exports definition types from filters/definitions.ts', () => {
    const schema: ParameterSchema = {
      displayName: 'Test',
      defaultValue: 0,
      min: 0,
      max: 1,
    };
    expect(schema.defaultValue).toBe(0);

    const def: FilterDefinition = {
      type: 'lowpass',
      name: 'Test Filter',
      description: 'A test',
      category: 'eq',
      parameters: { test: schema },
    };
    expect(def.type).toBe('lowpass');
  });

  it('ParameterResolver is a constructable class export', () => {
    const resolver = new ParameterResolver();
    expect(resolver).toBeInstanceOf(ParameterResolver);
    expect(typeof resolver.resolve).toBe('function');
    expect(typeof resolver.reset).toBe('function');
  });

  it('FILTER_CHAIN_PRESETS is a record export', () => {
    expect(typeof FILTER_CHAIN_PRESETS).toBe('object');
    expect(Object.keys(FILTER_CHAIN_PRESETS).length).toBe(6);
  });

  it('FILTER_DEFINITIONS is a record export', () => {
    expect(typeof FILTER_DEFINITIONS).toBe('object');
    expect(Object.keys(FILTER_DEFINITIONS).length).toBe(13);
  });
});
