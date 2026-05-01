import { describe, it, expect } from 'vitest';
import { isCanonicalPresetConfig, ALL_PRESETS } from '../src/index.js';
import type { Preset } from '../src/types.js';

/**
 * Tests for `isCanonicalPresetConfig` — the helper consumed by the
 * Kyber Glyph encoder to assign the `CNO` archetype prefix.
 *
 * Detection rule: a config is "canonical" when its `name` matches a
 * preset where `screenAccurate === true` AND `(continuity ?? 'canon')
 * === 'canon'`. Pop-culture / legends / mythology / creative-community
 * presets all return false.
 *
 * Drift sentinel: when a new on-screen preset is added, this test
 * automatically extends coverage. When a preset's continuity flips, the
 * archetype detection follows.
 */

describe('isCanonicalPresetConfig — canon presets return true', () => {
  it("matches the canonical 'Obi-Wan ANH' default name (CANONICAL_DEFAULT_CONFIG)", () => {
    expect(isCanonicalPresetConfig({ name: 'Obi-Wan ANH' })).toBe(true);
  });

  it("normalizes spacing/hyphens — 'ObiWanANH' matches preset.config.name", () => {
    // The OT preset's BladeConfig.name is 'ObiWanANH' (no separators).
    expect(isCanonicalPresetConfig({ name: 'ObiWanANH' })).toBe(true);
  });

  it("matches by outer preset.name (e.g. 'Luke Skywalker (ANH)')", () => {
    expect(isCanonicalPresetConfig({ name: 'Luke Skywalker (ANH)' })).toBe(true);
  });

  it('matches every screen-accurate canon preset by config.name OR preset.name', () => {
    const canonPresets: Preset[] = ALL_PRESETS.filter(
      (p) => p.screenAccurate === true && (p.continuity ?? 'canon') === 'canon',
    );
    expect(canonPresets.length).toBeGreaterThan(0);
    for (const preset of canonPresets) {
      // Either name field should be detectable.
      const byOuterName = isCanonicalPresetConfig({ name: preset.name });
      const byInnerName = isCanonicalPresetConfig({ name: preset.config.name });
      expect(
        byOuterName || byInnerName,
        `Expected ${preset.id} (${preset.name}) to detect as canonical`,
      ).toBe(true);
    }
  });
});

describe('isCanonicalPresetConfig — non-canon presets return false', () => {
  it("rejects pop-culture preset names (e.g. 'Mjolnir', 'Buster Sword')", () => {
    expect(isCanonicalPresetConfig({ name: 'Mjolnir' })).toBe(false);
    expect(isCanonicalPresetConfig({ name: 'Buster Sword' })).toBe(false);
    expect(isCanonicalPresetConfig({ name: 'Master Sword' })).toBe(false);
  });

  it("rejects every pop-culture preset's name", () => {
    const popCulture = ALL_PRESETS.filter(
      (p) => p.continuity === 'pop-culture' || p.continuity === 'mythology',
    );
    expect(popCulture.length).toBeGreaterThan(80); // 89 shipped in v0.15.0
    for (const preset of popCulture) {
      expect(
        isCanonicalPresetConfig({ name: preset.name }),
        `Expected pop-culture preset ${preset.id} (${preset.name}) NOT to detect as canonical`,
      ).toBe(false);
      expect(
        isCanonicalPresetConfig({ name: preset.config.name }),
        `Expected pop-culture preset config name ${preset.config.name} NOT to detect as canonical`,
      ).toBe(false);
    }
  });

  it('rejects legends preset names (Legends continuity, not canon)', () => {
    const legends = ALL_PRESETS.filter((p) => p.continuity === 'legends');
    expect(legends.length).toBeGreaterThan(0);
    for (const preset of legends) {
      expect(
        isCanonicalPresetConfig({ name: preset.config.name }),
        `Expected legends preset ${preset.id} NOT to detect as canonical`,
      ).toBe(false);
    }
  });

  it('rejects unknown / custom names', () => {
    expect(isCanonicalPresetConfig({ name: 'My Custom Saber' })).toBe(false);
    expect(isCanonicalPresetConfig({ name: 'XYZQ123' })).toBe(false);
  });
});

describe('isCanonicalPresetConfig — edge cases', () => {
  it('returns false for missing name', () => {
    expect(isCanonicalPresetConfig({})).toBe(false);
  });

  it('returns false for empty-string name', () => {
    expect(isCanonicalPresetConfig({ name: '' })).toBe(false);
  });

  it('returns false for a name that normalizes to empty (only punctuation)', () => {
    expect(isCanonicalPresetConfig({ name: '---' })).toBe(false);
    expect(isCanonicalPresetConfig({ name: '   ' })).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isCanonicalPresetConfig({ name: 'obi-wan anh' })).toBe(true);
    expect(isCanonicalPresetConfig({ name: 'OBI-WAN ANH' })).toBe(true);
  });
});
