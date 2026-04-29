// ─── cardTheme — bladeComposite contract tests ─────────────────────
//
// Drift sentinel for the per-theme blade composite mode introduced in
// `fix/light-theme-blade-bloom`. The boolean `lightBackdrop` flag was
// retired in favour of each theme declaring its own preference, so
// `drawBlade` no longer special-cases theme ids. These tests pin:
//
//   • Every theme in THEME_CATALOG declares a `bladeComposite`.
//   • Dark themes use `'lighter'` (additive halo over deep-space chrome).
//   • LIGHT_THEME uses `'source-over'` (no white-out on paper backdrop).
//   • The `getTheme` fallback default carries a composite too.
//
// If a future theme adds the catalog without declaring `bladeComposite`,
// or if the LIGHT_THEME composite is changed without an explicit
// rationale, this file fails loudly.

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_THEME,
  IMPERIAL_THEME,
  JEDI_THEME,
  LIGHT_THEME,
  SPACE_THEME,
  THEME_CATALOG,
  getTheme,
} from '../lib/sharePack/card/cardTheme';
import type { CardTheme } from '../lib/sharePack/card/cardTypes';

describe('CardTheme.bladeComposite', () => {
  it('every theme in the catalog declares a bladeComposite', () => {
    for (const [id, theme] of Object.entries(THEME_CATALOG)) {
      expect(
        theme.bladeComposite,
        `theme '${id}' must declare bladeComposite`,
      ).toBeDefined();
      expect(typeof theme.bladeComposite).toBe('string');
    }
  });

  it('DEFAULT_THEME (deep-space dark) uses lighter for additive halo', () => {
    expect(DEFAULT_THEME.bladeComposite).toBe('lighter');
  });

  it('IMPERIAL_THEME (crimson on charcoal — dark) uses lighter', () => {
    expect(IMPERIAL_THEME.bladeComposite).toBe('lighter');
  });

  it('JEDI_THEME (cream on parchment — dark mid-tone) uses lighter', () => {
    expect(JEDI_THEME.bladeComposite).toBe('lighter');
  });

  it('SPACE_THEME (pure black minimal) uses lighter', () => {
    expect(SPACE_THEME.bladeComposite).toBe('lighter');
  });

  it('LIGHT_THEME (paper-white) uses source-over to avoid white-out', () => {
    // Additive `'lighter'` over a near-white backdrop saturates to
    // pure white — the blade loses its color identity. `'source-over'`
    // (default canvas op) lets the blade composite normally over the
    // light field, preserving hue.
    expect(LIGHT_THEME.bladeComposite).toBe('source-over');
  });

  it('getTheme falls back to DEFAULT_THEME with its composite intact', () => {
    const fallback = getTheme('not-a-real-theme-id');
    expect(fallback).toBe(DEFAULT_THEME);
    expect(fallback.bladeComposite).toBe('lighter');
  });

  it('all known catalog ids resolve via getTheme', () => {
    for (const id of Object.keys(THEME_CATALOG)) {
      const theme = getTheme(id);
      expect(theme.id).toBe(id);
      expect(theme.bladeComposite).toBe(THEME_CATALOG[id].bladeComposite);
    }
  });

  it('CardTheme type permits canonical GlobalCompositeOperation values', () => {
    // Compile-time pin: if `bladeComposite` ever loses its
    // GlobalCompositeOperation type, this assignment errors.
    const lighter: CardTheme['bladeComposite'] = 'lighter';
    const sourceOver: CardTheme['bladeComposite'] = 'source-over';
    const screen: CardTheme['bladeComposite'] = 'screen';
    expect(lighter).toBe('lighter');
    expect(sourceOver).toBe('source-over');
    expect(screen).toBe('screen');
  });
});
