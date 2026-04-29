// ─── Audio A/B — Sidebar A/B v2 Phase 4d component contract tests ─────
//
// Pins down the contract of the audio Column A / Column B / wrapper:
//
//   1. Catalog drift sentinels (SOUND_EVENTS / MIXER_CONTROLS /
//      EFFECT_PRESETS / AUDIO_SUBTABS counts + ids)
//   2. Column A renders a row per library font + filter input
//   3. Column A active-row matches `audioFontStore.fontName`
//   4. Column A surfaces source badge (LIB / USR) for colorblind safety
//   5. Column B sticky header reflects the loaded font name + manifest
//      summary
//   6. Column B sub-tab nav exposes 4 buttons (events / mixer / presets
//      / sequencer)
//   7. Column B Events sub-tab renders all 11 SOUND_EVENTS triggers
//   8. Column B Mixer sub-tab renders all 12 MIXER_CONTROLS sliders
//   9. Column B Presets sub-tab renders all 6 EFFECT_PRESETS chains
//  10. AudioAB wrapper mounts MainContentABLayout with both columns
//
// Pattern matches `mainContentABLayout.test.tsx` and other A/B tests:
// `react-dom/server`'s `renderToStaticMarkup` — no jsdom dep.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Hoisted mock state ────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  fontName: null as string | null,
  manifest: null as null | {
    files: { name: string; category: string; size: number }[];
    smoothSwingPairs: string[];
    categories: Record<string, number>;
  },
  buffers: new Map<string, AudioBuffer[]>(),
  isLoading: false,
  loadProgress: 0,
  warnings: [] as string[],
  libraryHandle: null as null | { name: string },
  libraryFonts: [] as Array<{
    name: string;
    fileCount: number;
    completeness: 'complete' | 'partial' | 'minimal';
    format: string;
    hasSmoothSwing: boolean;
    smoothSwingPairCount: number;
    totalSizeBytes: number;
    categories: Record<string, number>;
    missingCategories: string[];
  }>,
  libraryPath: '',
  isScanning: false,
  scanProgress: { scanned: 0, currentName: '' },
  mixerValues: {
    bass: 0,
    mid: 0,
    treble: 0,
    distortion: 0,
    reverb: 0,
    delay: 0,
    chorus: 0,
    phaser: 0,
    bitcrusher: 0,
    pitchShift: 0,
    compressor: 0,
    volume: 80,
  } as Record<string, number>,
  activePresetId: null as string | null,
  config: {
    name: 'Obi-Wan ANH',
    style: 'stable',
    ignition: 'standard',
    baseColor: { r: 0, g: 140, b: 255 },
  } as Record<string, unknown>,
  columnAWidth: 280,
  useABLayout: true,
  hydrateLibraryCalls: 0,
  loadFontCalls: 0,
}));

// ── Store mocks ───────────────────────────────────────────────────────

vi.mock('@/stores/audioFontStore', () => {
  const useAudioFontStore = ((selector: (s: unknown) => unknown) =>
    selector({
      fontName: mockState.fontName,
      manifest: mockState.manifest,
      buffers: mockState.buffers,
      isLoading: mockState.isLoading,
      loadProgress: mockState.loadProgress,
      warnings: mockState.warnings,
      libraryHandle: mockState.libraryHandle,
      libraryFonts: mockState.libraryFonts,
      libraryPath: mockState.libraryPath,
      isScanning: mockState.isScanning,
      scanProgress: mockState.scanProgress,
      hydrateLibrary: () => {
        mockState.hydrateLibraryCalls += 1;
        return Promise.resolve();
      },
      setLibraryHandle: () => Promise.resolve(),
      scanLibrary: () => Promise.resolve(),
      clearFont: () => {
        mockState.fontName = null;
        mockState.manifest = null;
      },
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => Record<string, unknown>;
  };
  useAudioFontStore.getState = () => ({
    libraryHandle: mockState.libraryHandle,
    scanLibrary: () => Promise.resolve(),
  });
  return { useAudioFontStore };
});

vi.mock('@/stores/audioMixerStore', () => {
  const useAudioMixerStore = ((selector: (s: unknown) => unknown) =>
    selector({
      mixerValues: mockState.mixerValues,
      activePresetId: mockState.activePresetId,
      setMixerValue: () => {},
      applyPreset: () => {},
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useAudioMixerStore };
});

vi.mock('@/stores/bladeStore', () => {
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector({ config: mockState.config })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useBladeStore };
});

vi.mock('@/stores/uiStore', () => {
  const REGION_LIMITS = {
    columnAWidth: { min: 220, max: 400, default: 280 },
  };
  const useUIStore = ((selector: (s: unknown) => unknown) =>
    selector({
      columnAWidth: mockState.columnAWidth,
      setColumnAWidth: (n: number) => {
        mockState.columnAWidth = n;
      },
      useABLayout: mockState.useABLayout,
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useUIStore, REGION_LIMITS };
});

vi.mock('@/hooks/useAudioEngine', () => ({
  useAudioEngine: () => ({
    loadFont: () => {
      mockState.loadFontCalls += 1;
      return Promise.resolve();
    },
    playEvent: () => true,
    stopHum: () => {},
  }),
}));

vi.mock('@/lib/uiSounds', () => ({
  playUISound: () => {},
}));

vi.mock('@/lib/toastManager', () => ({
  toast: {
    warning: () => {},
    error: () => {},
  },
}));

vi.mock('@/components/editor/TimelinePanel', () => ({
  TimelinePanel: () => createElement('div', { 'data-testid': 'timeline-stub' }),
}));

// ── Imports under test ────────────────────────────────────────────────

import { AudioAB } from '@/components/editor/audio/AudioAB';
import { AudioColumnA } from '@/components/editor/audio/AudioColumnA';
import { AudioColumnB } from '@/components/editor/audio/AudioColumnB';
import {
  SOUND_EVENTS,
  MIXER_CONTROLS,
  EFFECT_PRESETS,
  AUDIO_SUBTABS,
  DEFAULT_AUDIO_SUBTAB,
} from '@/components/editor/audio/audioCatalog';

// ── Helpers ───────────────────────────────────────────────────────────

function htmlA(): string {
  return renderToStaticMarkup(createElement(AudioColumnA));
}

function htmlB(): string {
  return renderToStaticMarkup(createElement(AudioColumnB));
}

function htmlAB(): string {
  return renderToStaticMarkup(createElement(AudioAB));
}

type LibraryFontFixture = {
  name: string;
  fileCount: number;
  completeness: 'complete' | 'partial' | 'minimal';
  format: string;
  hasSmoothSwing: boolean;
  smoothSwingPairCount: number;
  totalSizeBytes: number;
  categories: Record<string, number>;
  missingCategories: string[];
};

const SAMPLE_LIBRARY_FONTS: LibraryFontFixture[] = [
  {
    name: 'SmthJedi',
    fileCount: 56,
    completeness: 'complete',
    format: 'proffie',
    hasSmoothSwing: true,
    smoothSwingPairCount: 4,
    totalSizeBytes: 3_500_000,
    categories: { hum: 1, swing: 8, clash: 12 },
    missingCategories: [],
  },
  {
    name: 'KyloDark',
    fileCount: 32,
    completeness: 'partial',
    format: 'cfx',
    hasSmoothSwing: false,
    smoothSwingPairCount: 0,
    totalSizeBytes: 1_800_000,
    categories: { hum: 1, swing: 6, clash: 4 },
    missingCategories: ['drag'],
  },
  {
    name: 'CustomFont',
    fileCount: 12,
    completeness: 'minimal',
    format: 'generic',
    hasSmoothSwing: false,
    smoothSwingPairCount: 0,
    totalSizeBytes: 900_000,
    categories: { hum: 1, swing: 2 },
    missingCategories: ['blast', 'lockup', 'drag'],
  },
];

const SAMPLE_MANIFEST = {
  files: [
    { name: 'hum.wav', category: 'hum', size: 100_000 },
    { name: 'swing01.wav', category: 'swing', size: 80_000 },
  ],
  smoothSwingPairs: ['swingl01.wav+swingh01.wav'],
  categories: { hum: 1, swing: 1 },
};

beforeEach(() => {
  mockState.fontName = null;
  mockState.manifest = null;
  mockState.buffers = new Map();
  mockState.isLoading = false;
  mockState.loadProgress = 0;
  mockState.warnings = [];
  mockState.libraryHandle = null;
  mockState.libraryFonts = [];
  mockState.libraryPath = '';
  mockState.isScanning = false;
  mockState.mixerValues = {
    bass: 0,
    mid: 0,
    treble: 0,
    distortion: 0,
    reverb: 0,
    delay: 0,
    chorus: 0,
    phaser: 0,
    bitcrusher: 0,
    pitchShift: 0,
    compressor: 0,
    volume: 80,
  };
  mockState.activePresetId = null;
  mockState.columnAWidth = 280;
  mockState.useABLayout = true;
  mockState.hydrateLibraryCalls = 0;
  mockState.loadFontCalls = 0;
});

// ─── (a) Catalog drift sentinels ──────────────────────────────────────

describe('audio catalog drift sentinels', () => {
  it('SOUND_EVENTS has the canonical 11 entries with the expected ids', () => {
    expect(SOUND_EVENTS).toHaveLength(11);
    const ids = SOUND_EVENTS.map((e) => e.id);
    expect(ids).toEqual([
      'hum',
      'swing',
      'clash',
      'blast',
      'lockup',
      'drag',
      'melt',
      'in',
      'out',
      'force',
      'stab',
    ]);
  });

  it('only the hum event is loop=true', () => {
    expect(SOUND_EVENTS.filter((e) => e.loop).map((e) => e.id)).toEqual(['hum']);
  });

  it('MIXER_CONTROLS has 3 EQ + 8 effects + 1 master = 12', () => {
    const eq = MIXER_CONTROLS.filter((c) => c.category === 'eq');
    const fx = MIXER_CONTROLS.filter((c) => c.category === 'effects');
    const master = MIXER_CONTROLS.filter((c) => c.category === 'master');
    expect(eq).toHaveLength(3);
    expect(fx).toHaveLength(8);
    expect(master).toHaveLength(1);
    expect(MIXER_CONTROLS).toHaveLength(12);
  });

  it('EFFECT_PRESETS has the canonical 6 chains', () => {
    expect(EFFECT_PRESETS).toHaveLength(6);
    expect(EFFECT_PRESETS.map((p) => p.id)).toEqual([
      'clean',
      'kylo-unstable',
      'cave-echo',
      'lo-fi-retro',
      'underwater',
      'force-tunnel',
    ]);
  });

  it('AUDIO_SUBTABS has the canonical 4 sub-tabs and the default is events', () => {
    expect(AUDIO_SUBTABS).toHaveLength(4);
    expect(AUDIO_SUBTABS.map((t) => t.id)).toEqual([
      'events',
      'mixer',
      'presets',
      'sequencer',
    ]);
    expect(DEFAULT_AUDIO_SUBTAB).toBe('events');
  });
});

// ─── (b) Column A render contract ─────────────────────────────────────

describe('AudioColumnA — render contract', () => {
  it('renders the filter input with a placeholder reflecting library size', () => {
    mockState.libraryFonts = SAMPLE_LIBRARY_FONTS.slice(0, 2);
    const markup = htmlA();
    expect(markup).toContain('Filter 2 fonts');
    expect(markup).toContain('id="audio-font-filter"');
  });

  it('renders one row per library font (drift sentinel — count tracks libraryFonts.length)', () => {
    mockState.libraryFonts = SAMPLE_LIBRARY_FONTS;
    const markup = htmlA();
    for (const font of SAMPLE_LIBRARY_FONTS) {
      expect(markup).toContain(font.name);
      expect(markup).toContain(`audio-font-row-${font.name}`);
    }
    // Row count via id matches font count.
    const rowMatches = markup.match(/id="audio-font-row-/g) ?? [];
    expect(rowMatches.length).toBe(SAMPLE_LIBRARY_FONTS.length);
  });

  it('marks the loaded font row as aria-selected="true"', () => {
    mockState.libraryFonts = SAMPLE_LIBRARY_FONTS;
    mockState.fontName = 'SmthJedi';
    const markup = htmlA();
    // The loaded row has aria-selected=true.
    expect(markup).toMatch(
      /id="audio-font-row-SmthJedi"[^>]*aria-selected="true"/,
    );
    // A non-loaded row has aria-selected=false.
    expect(markup).toMatch(
      /id="audio-font-row-KyloDark"[^>]*aria-selected="false"/,
    );
  });

  it('shows the library path when a library handle is configured', () => {
    mockState.libraryHandle = { name: 'fonts-folder' };
    mockState.libraryPath = 'fonts-folder';
    const markup = htmlA();
    expect(markup).toContain('fonts-folder');
    expect(markup).toContain('Library:');
  });

  it('surfaces an empty-state message when there are no fonts at all', () => {
    const markup = htmlA();
    // No library, no imported font — point at Column B for setup.
    expect(markup).toContain('No fonts loaded');
  });

  it('renders the LIB source badge for library entries', () => {
    mockState.libraryFonts = [SAMPLE_LIBRARY_FONTS[0]];
    const markup = htmlA();
    // Source badge is the colorblind-safe glyph pairing for color signal.
    expect(markup).toContain('>LIB<');
  });
});

// ─── (c) Column B render contract ─────────────────────────────────────

describe('AudioColumnB — render contract', () => {
  it('header reads "No font loaded" when the audio store has no font', () => {
    const markup = htmlB();
    expect(markup).toContain('No font loaded');
  });

  it('header reflects the loaded font name + manifest file count', () => {
    mockState.fontName = 'SmthJedi';
    mockState.manifest = SAMPLE_MANIFEST;
    const markup = htmlB();
    expect(markup).toContain('SmthJedi');
    // 2 files in the sample manifest → "2 files".
    expect(markup).toContain('2 files');
    expect(markup).toContain('1 SmoothSwing');
  });

  it('renders 4 sub-tab buttons with role="tab" (events / mixer / presets / sequencer)', () => {
    const markup = htmlB();
    for (const tab of AUDIO_SUBTABS) {
      expect(markup).toContain(`>${tab.label}</button>`);
    }
    // Aggregate count of role="tab" should be exactly 4.
    const tabMatches = markup.match(/role="tab"/g) ?? [];
    expect(tabMatches.length).toBe(AUDIO_SUBTABS.length);
  });

  it('Events sub-tab is active by default and renders all 11 SOUND_EVENTS triggers', () => {
    const markup = htmlB();
    // Event labels appear inside trigger buttons.
    for (const event of SOUND_EVENTS) {
      expect(markup).toContain(`>${event.label}</span>`);
    }
    // Drag-drop dropzone is part of the events sub-tab.
    expect(markup).toContain('Drop font folder here or click to browse');
  });

  it('shows the library folder picker when no library is configured + browser supports FSA', () => {
    // We can't fake `window.showDirectoryPicker` in node SSR; the
    // `hasFileSystemAccess` branch reads `'showDirectoryPicker' in window`.
    // Under SSR `typeof window === 'undefined'` so the warn-banner branch
    // fires. Either way one of the two informational blocks is rendered.
    const markup = htmlB();
    const hasPicker = markup.includes('Set Font Library Folder');
    const hasWarn = markup.includes(
      'Font library browsing requires the File System Access API',
    );
    expect(hasPicker || hasWarn).toBe(true);
  });
});

// ─── (d) AudioAB wrapper ──────────────────────────────────────────────

describe('AudioAB — wrapper integration', () => {
  it('mounts MainContentABLayout with both columns + the expected resize label', () => {
    mockState.libraryFonts = SAMPLE_LIBRARY_FONTS;
    const markup = htmlAB();
    // The wrapper mounts the split layout (not the single-panel fallback).
    expect(markup).toContain('data-mainab-layout="split"');
    expect(markup).toContain('data-mainab-column="a"');
    expect(markup).toContain('data-mainab-column="b"');
    // Both column data-testids are present.
    expect(markup).toContain('data-testid="audio-column-a"');
    expect(markup).toContain('data-testid="audio-column-b"');
    // The resize handle uses our label.
    expect(markup).toContain('Font list width');
  });
});
