// ─── addToQueue — unit tests for the "Add to Queue" action ─
//
// Tests:
//   1. generatePresetName produces a readable name from config
//   2. addConfigToQueue adds to the active profile's active card config
//   3. addConfigToQueue auto-creates a profile when none exists
//   4. addConfigToQueue returns correct preset count
//   5. addToQueueWithToast fires a success toast with count
//   6. addToQueueWithToast fires a warning toast when queue > 20
//   7. AddToQueueButton renders in the DOM
//
// Pattern: direct store manipulation + function calls (no jsdom needed
// for the pure-function tests).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { useSaberProfileStore } from '../stores/saberProfileStore';
import {
  generatePresetName,
  addConfigToQueue,
  addToQueueWithToast,
} from '../lib/addToQueue';
import { AddToQueueButton } from '../components/editor/AddToQueueButton';
import type { BladeConfig } from '@kyberstation/engine';

// ─── Mock toastManager ─
// vi.mock factory is hoisted — cannot reference outer `const` declarations.
// Use vi.hoisted() to create the mock object before the factory runs.
const mockToast = vi.hoisted(() => ({
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../lib/toastManager', () => ({ toast: mockToast }));

// ─── Mock crypto.randomUUID for deterministic IDs ─
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

// ─── Mock localStorage ─
const mockStorage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
});

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 0 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0.5,
    ledCount: 144,
    blendMode: 'normal' as const,
    ...overrides,
  };
}

describe('addToQueue', () => {
  beforeEach(() => {
    uuidCounter = 0;
    mockStorage.clear();
    mockToast.info.mockClear();
    mockToast.success.mockClear();
    mockToast.warning.mockClear();
    mockToast.error.mockClear();

    // Reset the saber profile store to empty
    useSaberProfileStore.setState({
      profiles: [],
      activeProfileId: null,
    });
  });

  // ─── generatePresetName ─
  describe('generatePresetName', () => {
    it('produces a name from base color + style', () => {
      const config = makeConfig({ style: 'fire' });
      const name = generatePresetName(config);

      // Name should contain the style capitalized
      expect(name).toContain('Fire');
      // Name should be non-empty
      expect(name.length).toBeGreaterThan(0);
    });

    it('capitalizes the style id', () => {
      const config = makeConfig({ style: 'crystalShatter' });
      const name = generatePresetName(config);

      expect(name).toContain('CrystalShatter');
    });

    it('falls back to "Custom" for empty style', () => {
      const config = makeConfig({ style: '' });
      const name = generatePresetName(config);

      expect(name).toContain('Custom');
    });
  });

  // ─── addConfigToQueue ─
  describe('addConfigToQueue', () => {
    it('auto-creates a profile when none exists', () => {
      const config = makeConfig();
      const result = addConfigToQueue(config);

      expect(result.success).toBe(true);
      expect(result.createdProfile).toBe(true);
      expect(result.profileName).toBe('My Saber');

      const state = useSaberProfileStore.getState();
      expect(state.profiles.length).toBe(1);
      expect(state.profiles[0].name).toBe('My Saber');
    });

    it('adds a preset to the active profile card config', () => {
      // Pre-create a profile
      useSaberProfileStore.getState().createProfile('Test Saber');

      const config = makeConfig({ style: 'pulse' });
      const result = addConfigToQueue(config);

      expect(result.success).toBe(true);
      expect(result.createdProfile).toBe(false);
      expect(result.presetCount).toBe(1);

      // Verify the entry landed in the card config
      const state = useSaberProfileStore.getState();
      const profile = state.profiles[0];
      const cardConfig = profile.cardConfigs[0];
      expect(cardConfig.entries.length).toBe(1);
      expect(cardConfig.entries[0].presetName).toContain('Pulse');
      expect(cardConfig.entries[0].source.type).toBe('inline');
      expect(cardConfig.entries[0].config.style).toBe('pulse');
    });

    it('returns correct preset count after multiple adds', () => {
      useSaberProfileStore.getState().createProfile('Test Saber');

      addConfigToQueue(makeConfig({ style: 'stable' }));
      addConfigToQueue(makeConfig({ style: 'fire' }));
      const result = addConfigToQueue(makeConfig({ style: 'pulse' }));

      expect(result.presetCount).toBe(3);
    });

    it('snapshots config without shared references', () => {
      useSaberProfileStore.getState().createProfile('Test Saber');

      const config = makeConfig({ style: 'stable' });
      addConfigToQueue(config);

      // Mutate the original — should not affect the queued copy
      config.style = 'fire';

      const state = useSaberProfileStore.getState();
      const entry = state.profiles[0].cardConfigs[0].entries[0];
      expect(entry.config.style).toBe('stable');
    });
  });

  // ─── addToQueueWithToast ─
  describe('addToQueueWithToast', () => {
    it('shows success toast with correct count', () => {
      useSaberProfileStore.getState().createProfile('Test Saber');

      addToQueueWithToast(makeConfig());

      expect(mockToast.success).toHaveBeenCalledWith(
        'Added to queue (1 presets)',
      );
    });

    it('shows warning toast when queue exceeds 20 presets', () => {
      vi.useFakeTimers();

      useSaberProfileStore.getState().createProfile('Test Saber');

      // Add 20 presets to fill the queue
      for (let i = 0; i < 20; i++) {
        addConfigToQueue(makeConfig());
      }

      // The 21st should trigger the warning
      addToQueueWithToast(makeConfig());

      expect(mockToast.success).toHaveBeenCalledWith(
        'Added to queue (21 presets)',
      );

      // Advance timers to fire the delayed warning
      vi.advanceTimersByTime(600);

      expect(mockToast.warning).toHaveBeenCalledWith(
        'Queue is getting large — consider removing unused presets',
      );

      vi.useRealTimers();
    });
  });

  // ─── AddToQueueButton component ─
  describe('AddToQueueButton', () => {
    it('renders a button with "Queue" label', () => {
      const html = renderToStaticMarkup(createElement(AddToQueueButton));

      expect(html).toContain('Queue');
      expect(html).toContain('button');
      expect(html).toContain('Add current design to card queue');
    });
  });
});
