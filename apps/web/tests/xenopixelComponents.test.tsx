// ─── Xenopixel component SSR contract tests ────────────────────────
//
// Pin down the rendered shape of all four Xenopixel-specific panels:
//   1. XenoEffectPicker — 8 blade effect cards
//   2. XenoIgnitionPicker — 12 ignition style cards in 2 groups
//   3. XenoMotionPanel — gesture toggles + sensitivity sliders
//   4. XenoSettingsPanel — global config.ini settings
//
// Pattern: renderToStaticMarkup + string assertions (SSR-safe,
// no jsdom dependency).

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { XENO_BLADE_EFFECTS, XENO_IGNITION_STYLES } from '@kyberstation/boards';
import { XenoEffectPicker } from '@/components/editor/xenopixel/XenoEffectPicker';
import { XenoIgnitionPicker } from '@/components/editor/xenopixel/XenoIgnitionPicker';
import { XenoMotionPanel } from '@/components/editor/xenopixel/XenoMotionPanel';
import type { XenoMotionSettings } from '@/components/editor/xenopixel/XenoMotionPanel';
import { XenoSettingsPanel } from '@/components/editor/xenopixel/XenoSettingsPanel';
import type { XenoGlobalSettings } from '@/components/editor/xenopixel/XenoSettingsPanel';

// ─── Fixtures ───────────────────────────────────────────────────────

const noop = () => {};

const DEFAULT_MOTION_SETTINGS: XenoMotionSettings = {
  motionControl: true,
  swingOn: true,
  swingSensitivity: 1100,
  twistOn: true,
  twistOff: true,
  twistSensitivity: 220,
  pullPushOn: false,
  pushPullOff: false,
  pushSensitivity: 18,
  pullSensitivity: 13,
};

const DEFAULT_GLOBAL_SETTINGS: XenoGlobalSettings = {
  volume: 80,
  clashSensitivity: 2.0,
  flashOnClash: true,
  pixelNumber: 133,
  velocityMode: true,
  torchMode: false,
  multiblockMode: false,
  multilockMode: false,
  lightningBlockMode: false,
  blasterMode: false,
  ghostMode: false,
  powerOnTime: 2000,
  powerOffTime: 10000,
  countdown: false,
};

// ─── XenoEffectPicker ───────────────────────────────────────────────

describe('XenoEffectPicker', () => {
  it('renders all 8 blade effects', () => {
    const html = renderToStaticMarkup(
      createElement(XenoEffectPicker, { selectedEffect: 1, onSelectEffect: noop })
    );

    for (const effect of XENO_BLADE_EFFECTS) {
      expect(html).toContain(effect.name);
      expect(html).toContain(`#${effect.id}`);
    }
  });

  it('renders the "Blade Effect" heading', () => {
    const html = renderToStaticMarkup(
      createElement(XenoEffectPicker, { selectedEffect: 0, onSelectEffect: noop })
    );

    expect(html).toContain('Blade Effect');
  });

  it('renders 8 buttons (one per effect)', () => {
    const html = renderToStaticMarkup(
      createElement(XenoEffectPicker, { selectedEffect: 0, onSelectEffect: noop })
    );

    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(8);
  });

  it('marks the selected effect with aria-pressed="true"', () => {
    const html = renderToStaticMarkup(
      createElement(XenoEffectPicker, { selectedEffect: 3, onSelectEffect: noop })
    );

    // Only 1 button should have aria-pressed="true"
    const pressedCount = (html.match(/aria-pressed="true"/g) || []).length;
    expect(pressedCount).toBe(1);

    // The rest should have aria-pressed="false"
    const unpressedCount = (html.match(/aria-pressed="false"/g) || []).length;
    expect(unpressedCount).toBe(7);
  });

  it('renders effect descriptions', () => {
    const html = renderToStaticMarkup(
      createElement(XenoEffectPicker, { selectedEffect: 0, onSelectEffect: noop })
    );

    expect(html).toContain('Flickering flame animation');
    expect(html).toContain('Solid steady color');
    expect(html).toContain('Fast strobe/flash');
  });

  it('highlights selected effect with accent border class', () => {
    const html = renderToStaticMarkup(
      createElement(XenoEffectPicker, { selectedEffect: 2, onSelectEffect: noop })
    );

    // The selected card should have the accent border style
    expect(html).toContain('border-[rgb(var(--color-accent))]');
  });
});

// ─── XenoIgnitionPicker ─────────────────────────────────────────────

describe('XenoIgnitionPicker', () => {
  it('renders all 12 ignition styles', () => {
    const html = renderToStaticMarkup(
      createElement(XenoIgnitionPicker, { selectedIgnition: 0, onSelectIgnition: noop })
    );

    for (const style of XENO_IGNITION_STYLES) {
      expect(html).toContain(style.name);
    }
  });

  it('renders 12 buttons (one per style)', () => {
    const html = renderToStaticMarkup(
      createElement(XenoIgnitionPicker, { selectedIgnition: 0, onSelectIgnition: noop })
    );

    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(12);
  });

  it('separates blade modes and special preon ignitions', () => {
    const html = renderToStaticMarkup(
      createElement(XenoIgnitionPicker, { selectedIgnition: 0, onSelectIgnition: noop })
    );

    expect(html).toContain('Blade Modes');
    expect(html).toContain('Special Preon Ignitions');

    // Blade modes should appear before special preons in the output
    const bladeModeIdx = html.indexOf('Blade Modes');
    const specialPreonIdx = html.indexOf('Special Preon Ignitions');
    expect(bladeModeIdx).toBeLessThan(specialPreonIdx);
  });

  it('has 5 blade-mode cards and 7 special-preon cards', () => {
    // Verify the data layer's grouping — blade modes have no category,
    // special preons have category === 'special-preon'
    const bladeModes = XENO_IGNITION_STYLES.filter((s) => !s.category);
    const specialPreons = XENO_IGNITION_STYLES.filter((s) => s.category === 'special-preon');
    expect(bladeModes).toHaveLength(5);
    expect(specialPreons).toHaveLength(7);
  });

  it('marks the selected ignition with aria-pressed="true"', () => {
    const html = renderToStaticMarkup(
      createElement(XenoIgnitionPicker, { selectedIgnition: 7, onSelectIgnition: noop })
    );

    const pressedCount = (html.match(/aria-pressed="true"/g) || []).length;
    expect(pressedCount).toBe(1);

    const unpressedCount = (html.match(/aria-pressed="false"/g) || []).length;
    expect(unpressedCount).toBe(11);
  });
});

// ─── XenoMotionPanel ────────────────────────────────────────────────

describe('XenoMotionPanel', () => {
  it('renders a toggle for each gesture type', () => {
    const html = renderToStaticMarkup(
      createElement(XenoMotionPanel, {
        settings: DEFAULT_MOTION_SETTINGS,
        onSettingsChange: noop,
      })
    );

    expect(html).toContain('Motion Control');
    expect(html).toContain('Swing Ignition');
    expect(html).toContain('Twist Ignition');
    expect(html).toContain('Twist Retraction');
    expect(html).toContain('Pull/Push Ignition');
    expect(html).toContain('Push/Pull Retraction');
  });

  it('renders sensitivity sliders for gesture rows', () => {
    const html = renderToStaticMarkup(
      createElement(XenoMotionPanel, {
        settings: DEFAULT_MOTION_SETTINGS,
        onSettingsChange: noop,
      })
    );

    // Sensitivity labels should appear for swing, twist, pull/push, push/pull
    const sensitivityCount = (html.match(/Sensitivity/g) || []).length;
    expect(sensitivityCount).toBeGreaterThanOrEqual(4);
  });

  it('disables sensitivity slider when gesture toggle is off', () => {
    const settings: XenoMotionSettings = {
      ...DEFAULT_MOTION_SETTINGS,
      swingOn: false,
    };

    const html = renderToStaticMarkup(
      createElement(XenoMotionPanel, {
        settings,
        onSettingsChange: noop,
      })
    );

    // When swingOn is false, the swing sensitivity slider should be disabled.
    // The slider for "Swing Ignition" has aria-label="Swing Ignition sensitivity"
    expect(html).toContain('disabled');
  });

  it('renders checkbox inputs with role="switch"', () => {
    const html = renderToStaticMarkup(
      createElement(XenoMotionPanel, {
        settings: DEFAULT_MOTION_SETTINGS,
        onSettingsChange: noop,
      })
    );

    const switchCount = (html.match(/role="switch"/g) || []).length;
    // 6 toggles: motionControl, swingOn, twistOn, twistOff, pullPushOn, pushPullOff
    expect(switchCount).toBe(6);
  });
});

// ─── XenoSettingsPanel ──────────────────────────────────────────────

describe('XenoSettingsPanel', () => {
  it('renders the volume slider', () => {
    const html = renderToStaticMarkup(
      createElement(XenoSettingsPanel, {
        settings: DEFAULT_GLOBAL_SETTINGS,
        onSettingsChange: noop,
      })
    );

    expect(html).toContain('Volume');
    expect(html).toContain('Master Volume');
  });

  it('shows warning when volume exceeds 90', () => {
    const settings: XenoGlobalSettings = {
      ...DEFAULT_GLOBAL_SETTINGS,
      volume: 95,
    };

    const html = renderToStaticMarkup(
      createElement(XenoSettingsPanel, {
        settings,
        onSettingsChange: noop,
      })
    );

    expect(html).toContain('distortion');
    expect(html).toContain('role="alert"');
  });

  it('does not show volume warning at 90 or below', () => {
    const html = renderToStaticMarkup(
      createElement(XenoSettingsPanel, {
        settings: DEFAULT_GLOBAL_SETTINGS,
        onSettingsChange: noop,
      })
    );

    expect(html).not.toContain('distortion');
  });

  it('renders all settings sections', () => {
    const html = renderToStaticMarkup(
      createElement(XenoSettingsPanel, {
        settings: DEFAULT_GLOBAL_SETTINGS,
        onSettingsChange: noop,
      })
    );

    expect(html).toContain('Clash');
    expect(html).toContain('Blade Length');
    expect(html).toContain('Blade Modes');
    expect(html).toContain('Action Modes');
    expect(html).toContain('Timing');
    expect(html).toContain('Sound');
  });

  it('renders blade mode toggles', () => {
    const html = renderToStaticMarkup(
      createElement(XenoSettingsPanel, {
        settings: DEFAULT_GLOBAL_SETTINGS,
        onSettingsChange: noop,
      })
    );

    expect(html).toContain('Velocity');
    expect(html).toContain('Torch');
    expect(html).toContain('Blaster');
    expect(html).toContain('Ghost');
  });

  it('renders pixel count input', () => {
    const html = renderToStaticMarkup(
      createElement(XenoSettingsPanel, {
        settings: DEFAULT_GLOBAL_SETTINGS,
        onSettingsChange: noop,
      })
    );

    expect(html).toContain('Pixel Count');
    expect(html).toContain('133');
  });

  it('renders timing sliders', () => {
    const html = renderToStaticMarkup(
      createElement(XenoSettingsPanel, {
        settings: DEFAULT_GLOBAL_SETTINGS,
        onSettingsChange: noop,
      })
    );

    expect(html).toContain('Power-On Time');
    expect(html).toContain('Power-Off Time');
  });
});
