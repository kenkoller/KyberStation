/**
 * Regression test for `useAudioEngine.CATEGORY_MAP`.
 *
 * The map routes sound events (ignition / retraction / clash / etc.) to
 * the font category names the audio engine reads from. Pre-fix, ignition
 * routed to 'in' and retraction to 'out' — that's inverted relative to
 * actual ProffieOS hardware behavior (`sound/hybrid_font.h`):
 *
 *   - IGNITION plays `out.wav` (saber blade goes OUT of the hilt)
 *   - RETRACTION plays `in.wav` (saber blade comes IN to the hilt)
 *
 * This test pins the corrected mapping at the data layer so a future
 * refactor can't silently re-invert the convention.
 */
import { describe, it, expect } from 'vitest';
import { CATEGORY_MAP } from '@/hooks/useAudioEngine';

describe('useAudioEngine CATEGORY_MAP', () => {
  it('routes ignition to "out" (ProffieOS power-on convention)', () => {
    expect(CATEGORY_MAP.ignition).toEqual(['out']);
  });

  it('routes retraction to "in" (ProffieOS power-off convention)', () => {
    expect(CATEGORY_MAP.retraction).toEqual(['in']);
  });

  it('does NOT have ignition→in or retraction→out (the pre-fix swap)', () => {
    expect(CATEGORY_MAP.ignition).not.toEqual(['in']);
    expect(CATEGORY_MAP.retraction).not.toEqual(['out']);
  });

  it('every other event maps to its like-named category', () => {
    expect(CATEGORY_MAP.hum).toEqual(['hum']);
    expect(CATEGORY_MAP.clash).toEqual(['clash']);
    expect(CATEGORY_MAP.blast).toEqual(['blast']);
    expect(CATEGORY_MAP.lockup).toEqual(['lockup']);
    expect(CATEGORY_MAP.stab).toEqual(['stab']);
    expect(CATEGORY_MAP.drag).toEqual(['drag']);
    expect(CATEGORY_MAP.melt).toEqual(['melt']);
    expect(CATEGORY_MAP.force).toEqual(['force']);
  });

  it('swing falls through swing → swingl (modern Proffie SmoothSwing fallback)', () => {
    expect(CATEGORY_MAP.swing).toEqual(['swing', 'swingl']);
  });
});
