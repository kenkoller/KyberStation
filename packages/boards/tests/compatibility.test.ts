import { describe, it, expect } from 'vitest';
import {
  BOARD_PROFILES,
  getBoardProfile,
  getBoardsByTier,
  scoreCompatibility,
} from '../src/index.js';
import type { BoardProfile, BoardId } from '../src/index.js';

// ─── All 14 Board IDs ───

const ALL_BOARD_IDS: BoardId[] = [
  'proffieboard-v2',
  'proffieboard-v3',
  'proffie-lite',
  'proffie-clone',
  'cfx',
  'ghv3',
  'ghv4',
  'verso',
  'xenopixel-v2',
  'xenopixel-v3',
  'lgt-baselit',
  'asteria',
  'darkwolf',
  'damiensaber',
];

// ─── Shared test configs ───

const SIMPLE_CONFIG = {
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
};

const COMPLEX_CONFIG = {
  style: 'crystal-shatter',
  ignition: 'glitch',
  retraction: 'shatter',
  clashColor: { r: 255, g: 200, b: 50 },
  lockupColor: { r: 255, g: 255, b: 255 },
  blastColor: { r: 200, g: 200, b: 255 },
  meltColor: { r: 255, g: 80, b: 0 },
  lightningColor: { r: 100, g: 100, b: 255 },
};

// ──────────────────────────────────────────────
// Board Profile Loading
// ──────────────────────────────────────────────

describe('Board Profile Loading', () => {
  it('BOARD_PROFILES contains exactly 14 boards', () => {
    expect(Object.keys(BOARD_PROFILES)).toHaveLength(14);
  });

  it.each(ALL_BOARD_IDS)('profile "%s" loads correctly via getBoardProfile', (id) => {
    const profile = getBoardProfile(id);
    expect(profile).toBeDefined();
    expect(profile.id).toBe(id);
  });

  it('throws on unknown board ID', () => {
    expect(() => getBoardProfile('nonexistent' as BoardId)).toThrow('Unknown board ID');
  });

  describe.each(ALL_BOARD_IDS)('profile "%s" has required fields', (id) => {
    const profile = getBoardProfile(id);

    it('has id, name, and manufacturer', () => {
      expect(profile.id).toBe(id);
      expect(profile.name).toBeTruthy();
      expect(profile.manufacturer).toBeTruthy();
    });

    it('has versions array', () => {
      expect(Array.isArray(profile.versions)).toBe(true);
      expect(profile.versions.length).toBeGreaterThan(0);
    });

    it('has capabilities object with required keys', () => {
      const caps = profile.capabilities;
      expect(typeof caps.neopixelSupport).toBe('boolean');
      expect(typeof caps.maxLEDs).toBe('number');
      expect(typeof caps.smoothSwing).toBe('boolean');
      expect(typeof caps.bluetoothConfig).toBe('boolean');
      expect(typeof caps.editMode).toBe('boolean');
      expect(typeof caps.customBladeStyles).toBe('boolean');
      expect(typeof caps.gestureControl).toBe('boolean');
      expect([1, 2, 3]).toContain(caps.tier);
      expect(typeof caps.customIgnition).toBe('boolean');
      expect(typeof caps.customRetraction).toBe('boolean');
      expect(['none', 'fixed-palette', 'color-wheel', 'full-rgb']).toContain(caps.colorChangeMode);
    });

    it('has supportedEffects array with 8 entries', () => {
      expect(Array.isArray(profile.supportedEffects)).toBe(true);
      expect(profile.supportedEffects).toHaveLength(8);
    });

    it('has supportedStyles array with 12 entries', () => {
      expect(Array.isArray(profile.supportedStyles)).toBe(true);
      expect(profile.supportedStyles).toHaveLength(12);
    });

    it('has ledConfig with defaultCount and maxCount', () => {
      expect(profile.ledConfig.defaultCount).toBeGreaterThan(0);
      expect(profile.ledConfig.maxCount).toBeGreaterThanOrEqual(profile.ledConfig.defaultCount);
      expect(profile.ledConfig.colorOrders.length).toBeGreaterThan(0);
    });

    it('has terminology map with required keys', () => {
      expect(profile.terminology['blade style']).toBeTruthy();
      expect(profile.terminology.clash).toBeTruthy();
      expect(profile.terminology.lockup).toBeTruthy();
      expect(profile.terminology.preset).toBeTruthy();
      expect(profile.terminology.ignition).toBeTruthy();
      expect(profile.terminology.retraction).toBeTruthy();
      expect(profile.terminology['sound font']).toBeTruthy();
    });

    it('has uiOverrides with required arrays', () => {
      expect(Array.isArray(profile.uiOverrides.hideFeatures)).toBe(true);
      expect(Array.isArray(profile.uiOverrides.disableFeatures)).toBe(true);
      expect(Array.isArray(profile.uiOverrides.showWarnings)).toBe(true);
    });
  });
});

// ──────────────────────────────────────────────
// getBoardsByTier
// ──────────────────────────────────────────────

describe('getBoardsByTier', () => {
  it('tier 1 includes Proffieboard V2, V3, Proffie Lite, and Proffie Clone', () => {
    const tier1 = getBoardsByTier(1);
    const ids = tier1.map((p) => p.id);
    expect(ids).toContain('proffieboard-v2');
    expect(ids).toContain('proffieboard-v3');
    expect(ids).toContain('proffie-lite');
    expect(ids).toContain('proffie-clone');
  });

  it('tier 2 includes CFX, GHv3, GHv4, Verso, and DamienSaber', () => {
    const tier2 = getBoardsByTier(2);
    const ids = tier2.map((p) => p.id);
    expect(ids).toContain('cfx');
    expect(ids).toContain('ghv3');
    expect(ids).toContain('ghv4');
    expect(ids).toContain('verso');
    expect(ids).toContain('damiensaber');
  });

  it('tier 3 includes budget boards', () => {
    const tier3 = getBoardsByTier(3);
    const ids = tier3.map((p) => p.id);
    expect(ids).toContain('xenopixel-v2');
    expect(ids).toContain('xenopixel-v3');
    expect(ids).toContain('lgt-baselit');
    expect(ids).toContain('asteria');
    expect(ids).toContain('darkwolf');
  });

  it('all 14 boards are assigned to a tier', () => {
    const allTiered = [
      ...getBoardsByTier(1),
      ...getBoardsByTier(2),
      ...getBoardsByTier(3),
    ];
    expect(allTiered).toHaveLength(14);
  });
});

// ──────────────────────────────────────────────
// scoreCompatibility — return value shape
// ──────────────────────────────────────────────

describe('scoreCompatibility return value', () => {
  it('returns a valid CompatibilityReport shape', () => {
    const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('proffieboard-v3'));
    expect(typeof report.overallScore).toBe('number');
    expect(Array.isArray(report.featureScores)).toBe(true);
    expect(Array.isArray(report.degradations)).toBe(true);
    expect(Array.isArray(report.warnings)).toBe(true);
  });

  it('overallScore is between 0 and 100', () => {
    for (const id of ALL_BOARD_IDS) {
      const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile(id));
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    }
  });

  it('featureScores has 6 entries', () => {
    const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('cfx'));
    expect(report.featureScores).toHaveLength(6);
  });

  it('each featureScore has feature, weight, score, and supported fields', () => {
    const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('cfx'));
    for (const fs of report.featureScores) {
      expect(typeof fs.feature).toBe('string');
      expect(typeof fs.weight).toBe('number');
      expect(typeof fs.score).toBe('number');
      expect(typeof fs.supported).toBe('boolean');
      expect(fs.score).toBeGreaterThanOrEqual(0);
      expect(fs.score).toBeLessThanOrEqual(100);
    }
  });
});

// ──────────────────────────────────────────────
// Simple stable style scores high on all boards
// ──────────────────────────────────────────────

describe('Simple stable style scoring', () => {
  it.each(ALL_BOARD_IDS)('stable style scores > 0 on "%s"', (id) => {
    const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile(id));
    expect(report.overallScore).toBeGreaterThan(0);
  });

  it('stable style scores 100 on Proffieboard V3', () => {
    const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('proffieboard-v3'));
    expect(report.overallScore).toBe(100);
  });

  it('stable style scores 100 on Proffieboard V2', () => {
    const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('proffieboard-v2'));
    expect(report.overallScore).toBe(100);
  });

  it('stable style scores 100 on Proffie Clone', () => {
    const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('proffie-clone'));
    expect(report.overallScore).toBe(100);
  });

  it('stable style scores high on tier 1 boards (>= 90)', () => {
    for (const profile of getBoardsByTier(1)) {
      const report = scoreCompatibility(SIMPLE_CONFIG, profile);
      expect(report.overallScore).toBeGreaterThanOrEqual(90);
    }
  });
});

// ──────────────────────────────────────────────
// Complex ProffieOS-only features score low on budget boards
// ──────────────────────────────────────────────

describe('Complex features on budget boards', () => {
  it('crystal-shatter + glitch ignition scores lower on LGT Baselit than on Proffieboard', () => {
    const proffieReport = scoreCompatibility(COMPLEX_CONFIG, getBoardProfile('proffieboard-v3'));
    const baselitReport = scoreCompatibility(COMPLEX_CONFIG, getBoardProfile('lgt-baselit'));
    expect(proffieReport.overallScore).toBeGreaterThan(baselitReport.overallScore);
  });

  it('LGT Baselit scores below 40 for complex config', () => {
    const report = scoreCompatibility(COMPLEX_CONFIG, getBoardProfile('lgt-baselit'));
    expect(report.overallScore).toBeLessThan(40);
  });

  it('Asteria scores below 40 for complex config', () => {
    const report = scoreCompatibility(COMPLEX_CONFIG, getBoardProfile('asteria'));
    expect(report.overallScore).toBeLessThan(40);
  });

  it('Darkwolf scores below 40 for complex config', () => {
    const report = scoreCompatibility(COMPLEX_CONFIG, getBoardProfile('darkwolf'));
    expect(report.overallScore).toBeLessThan(40);
  });

  it('complex config generates degradations on budget boards', () => {
    const report = scoreCompatibility(COMPLEX_CONFIG, getBoardProfile('lgt-baselit'));
    expect(report.degradations.length).toBeGreaterThan(0);
  });

  it('complex config on Proffieboard V3 has no degradations', () => {
    const report = scoreCompatibility(COMPLEX_CONFIG, getBoardProfile('proffieboard-v3'));
    expect(report.degradations).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// Xenopixel / CFX limitations
// ──────────────────────────────────────────────

describe('Xenopixel limitations', () => {
  it('Xenopixel V2 reports degradation for non-stable styles', () => {
    const config = { style: 'fire', ignition: 'standard', retraction: 'standard' };
    const report = scoreCompatibility(config, getBoardProfile('xenopixel-v2'));
    expect(report.degradations.length).toBeGreaterThan(0);
    const baseDeg = report.degradations.find((d) => d.feature === 'Base Style');
    expect(baseDeg).toBeDefined();
    expect(baseDeg!.degradedTo).toBe('solid');
  });

  it('Xenopixel V2 has low color score (fixed-palette)', () => {
    const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('xenopixel-v2'));
    const colorFS = report.featureScores.find((fs) => fs.feature === 'Colors');
    expect(colorFS).toBeDefined();
    expect(colorFS!.score).toBe(50); // fixed-palette = 50
  });

  it('Xenopixel V3 has higher color score than V2 (color-wheel)', () => {
    const v2Report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('xenopixel-v2'));
    const v3Report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('xenopixel-v3'));
    const v2Color = v2Report.featureScores.find((fs) => fs.feature === 'Colors')!.score;
    const v3Color = v3Report.featureScores.find((fs) => fs.feature === 'Colors')!.score;
    expect(v3Color).toBeGreaterThan(v2Color);
  });

  it('Xenopixel boards have warnings about firmware-baked effects', () => {
    const v2Report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('xenopixel-v2'));
    const v3Report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('xenopixel-v3'));
    expect(v2Report.warnings.some((w) => w.includes('firmware'))).toBe(true);
    expect(v3Report.warnings.some((w) => w.includes('firmware'))).toBe(true);
  });

  it('Xenopixel V2 motion/audio reactivity score is 0', () => {
    const report = scoreCompatibility(SIMPLE_CONFIG, getBoardProfile('xenopixel-v2'));
    const motionFS = report.featureScores.find((fs) => fs.feature === 'Motion/Audio Reactivity');
    expect(motionFS).toBeDefined();
    expect(motionFS!.score).toBe(0);
  });
});

describe('CFX limitations', () => {
  it('CFX does not support melt or lightning effects', () => {
    const profile = getBoardProfile('cfx');
    const melt = profile.supportedEffects.find((e) => e.bladeforgeEffect === 'melt');
    const lightning = profile.supportedEffects.find((e) => e.bladeforgeEffect === 'lightning');
    expect(melt!.boardEffectName).toBeNull();
    expect(lightning!.boardEffectName).toBeNull();
  });

  it('CFX has color-wheel mode (not full-rgb)', () => {
    const profile = getBoardProfile('cfx');
    expect(profile.capabilities.colorChangeMode).toBe('color-wheel');
  });

  it('CFX does not support custom ignition or retraction', () => {
    const profile = getBoardProfile('cfx');
    expect(profile.capabilities.customIgnition).toBe(false);
    expect(profile.capabilities.customRetraction).toBe(false);
  });

  it('CFX scores lower than Proffie for complex config', () => {
    const proffieReport = scoreCompatibility(COMPLEX_CONFIG, getBoardProfile('proffieboard-v3'));
    const cfxReport = scoreCompatibility(COMPLEX_CONFIG, getBoardProfile('cfx'));
    expect(proffieReport.overallScore).toBeGreaterThan(cfxReport.overallScore);
  });

  it('CFX has uiOverrides warnings about predefined blade effects', () => {
    const profile = getBoardProfile('cfx');
    expect(profile.uiOverrides.showWarnings.length).toBeGreaterThan(0);
    expect(profile.uiOverrides.showWarnings.some((w) => w.includes('predefined'))).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Board capability flags
// ──────────────────────────────────────────────

describe('Board capability flags', () => {
  describe('Proffieboard V3 (tier 1 flagship)', () => {
    const profile = getBoardProfile('proffieboard-v3');

    it('supports smoothSwing', () => {
      expect(profile.capabilities.smoothSwing).toBe(true);
    });

    it('supports neopixel', () => {
      expect(profile.capabilities.neopixelSupport).toBe(true);
    });

    it('supports bluetooth', () => {
      expect(profile.capabilities.bluetoothConfig).toBe(true);
    });

    it('supports OLED', () => {
      expect(profile.capabilities.oledSupport).toBe(true);
    });

    it('supports edit mode', () => {
      expect(profile.capabilities.editMode).toBe(true);
    });

    it('has full-rgb color change mode', () => {
      expect(profile.capabilities.colorChangeMode).toBe('full-rgb');
    });

    it('supports layer compositing', () => {
      expect(profile.capabilities.layerCompositing).toBe(true);
    });

    it('supports subBlade', () => {
      expect(profile.capabilities.subBladeSupport).toBe(true);
    });

    it('has unlimited presets', () => {
      expect(profile.capabilities.maxPresets).toBe('unlimited');
    });

    it('supports all custom effects', () => {
      expect(profile.capabilities.customIgnition).toBe(true);
      expect(profile.capabilities.customRetraction).toBe(true);
      expect(profile.capabilities.customClash).toBe(true);
      expect(profile.capabilities.customLockup).toBe(true);
      expect(profile.capabilities.customBlast).toBe(true);
      expect(profile.capabilities.customDrag).toBe(true);
      expect(profile.capabilities.customMelt).toBe(true);
      expect(profile.capabilities.customLightning).toBe(true);
    });
  });

  describe('Proffieboard V2', () => {
    const profile = getBoardProfile('proffieboard-v2');

    it('does not support bluetooth (V2 only)', () => {
      expect(profile.capabilities.bluetoothConfig).toBe(false);
    });

    it('otherwise matches V3 tier and capabilities', () => {
      expect(profile.capabilities.tier).toBe(1);
      expect(profile.capabilities.smoothSwing).toBe(true);
      expect(profile.capabilities.neopixelSupport).toBe(true);
      expect(profile.capabilities.customBladeStyles).toBe(true);
    });
  });

  describe('LGT Baselit (most limited board)', () => {
    const profile = getBoardProfile('lgt-baselit');

    it('does not support neopixel', () => {
      expect(profile.capabilities.neopixelSupport).toBe(false);
    });

    it('has maxLEDs of 1', () => {
      expect(profile.capabilities.maxLEDs).toBe(1);
    });

    it('does not support smoothSwing', () => {
      expect(profile.capabilities.smoothSwing).toBe(false);
    });

    it('has no custom effects at all', () => {
      expect(profile.capabilities.customIgnition).toBe(false);
      expect(profile.capabilities.customRetraction).toBe(false);
      expect(profile.capabilities.customClash).toBe(false);
      expect(profile.capabilities.customLockup).toBe(false);
      expect(profile.capabilities.customBlast).toBe(false);
      expect(profile.capabilities.customDrag).toBe(false);
      expect(profile.capabilities.customMelt).toBe(false);
      expect(profile.capabilities.customLightning).toBe(false);
    });

    it('has fixed-palette color mode', () => {
      expect(profile.capabilities.colorChangeMode).toBe('fixed-palette');
    });

    it('no audio or motion reactivity', () => {
      expect(profile.capabilities.audioReactiveStyles).toBe(false);
      expect(profile.capabilities.motionReactiveStyles).toBe(false);
    });
  });

  describe('Golden Harvest V3 (tier 2)', () => {
    const profile = getBoardProfile('ghv3');

    it('supports smoothSwing', () => {
      expect(profile.capabilities.smoothSwing).toBe(true);
    });

    it('supports neopixel', () => {
      expect(profile.capabilities.neopixelSupport).toBe(true);
    });

    it('does not support bluetooth', () => {
      expect(profile.capabilities.bluetoothConfig).toBe(false);
    });

    it('does not support OLED', () => {
      expect(profile.capabilities.oledSupport).toBe(false);
    });

    it('does not support custom ignition or retraction', () => {
      expect(profile.capabilities.customIgnition).toBe(false);
      expect(profile.capabilities.customRetraction).toBe(false);
    });

    it('has color-wheel color change mode', () => {
      expect(profile.capabilities.colorChangeMode).toBe('color-wheel');
    });

    it('supports motion-reactive styles but not audio-reactive', () => {
      expect(profile.capabilities.motionReactiveStyles).toBe(true);
      expect(profile.capabilities.audioReactiveStyles).toBe(false);
    });
  });

  describe('Golden Harvest V4 upgrades over V3', () => {
    const v3 = getBoardProfile('ghv3');
    const v4 = getBoardProfile('ghv4');

    it('V4 adds bluetooth', () => {
      expect(v3.capabilities.bluetoothConfig).toBe(false);
      expect(v4.capabilities.bluetoothConfig).toBe(true);
    });

    it('V4 adds OLED support', () => {
      expect(v3.capabilities.oledSupport).toBe(false);
      expect(v4.capabilities.oledSupport).toBe(true);
    });

    it('V4 adds audio-reactive styles', () => {
      expect(v3.capabilities.audioReactiveStyles).toBe(false);
      expect(v4.capabilities.audioReactiveStyles).toBe(true);
    });

    it('V4 supports melt effect but V3 does not', () => {
      const v3Melt = v3.supportedEffects.find((e) => e.bladeforgeEffect === 'melt');
      const v4Melt = v4.supportedEffects.find((e) => e.bladeforgeEffect === 'melt');
      expect(v3Melt!.boardEffectName).toBeNull();
      expect(v4Melt!.boardEffectName).toBe('melt');
    });
  });
});
