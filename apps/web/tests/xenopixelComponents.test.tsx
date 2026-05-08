// ─── Xenopixel component SSR contract tests ────────────────────────
//
// Pin down the rendered shape of all eight Xenopixel-specific panels:
//   1. XenoEffectPicker — 8 blade effect cards
//   2. XenoIgnitionPicker — 12 ignition style cards in 2 groups
//   3. XenoMotionPanel — gesture toggles + sensitivity sliders
//   4. XenoSettingsPanel — global config.ini settings
//   5. XenoBlasterPicker — 3 blaster effect cards
//   6. XenoForcePicker — 2 force effect cards
//   7. XenoConfigPreview — live INI file preview
//   8. XenoImportPanel — SD card config import UI
//
// Pattern: renderToStaticMarkup + string assertions (SSR-safe,
// no jsdom dependency).

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import {
  XENO_BLADE_EFFECTS,
  XENO_IGNITION_STYLES,
  XENO_BLASTER_EFFECTS,
  XENO_FORCE_EFFECTS,
} from '@kyberstation/boards';
import { XenoEffectPicker } from '@/components/editor/xenopixel/XenoEffectPicker';
import { XenoIgnitionPicker } from '@/components/editor/xenopixel/XenoIgnitionPicker';
import { XenoMotionPanel } from '@/components/editor/xenopixel/XenoMotionPanel';
import type { XenoMotionSettings } from '@/components/editor/xenopixel/XenoMotionPanel';
import { XenoSettingsPanel } from '@/components/editor/xenopixel/XenoSettingsPanel';
import type { XenoGlobalSettings } from '@/components/editor/xenopixel/XenoSettingsPanel';
import { XenoBlasterPicker } from '@/components/editor/xenopixel/XenoBlasterPicker';
import { XenoForcePicker } from '@/components/editor/xenopixel/XenoForcePicker';
import { XenoConfigPreview } from '@/components/editor/xenopixel/XenoConfigPreview';
import { XenoImportPanel } from '@/components/editor/xenopixel/XenoImportPanel';

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
  blasterEffect: 0,
  forceEffect: 0,
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

// ─── XenoBlasterPicker ─────────────────────────────────────────────

describe('XenoBlasterPicker', () => {
  it('renders all 3 blaster effects', () => {
    const html = renderToStaticMarkup(
      createElement(XenoBlasterPicker, { selectedBlaster: 0, onSelectBlaster: noop })
    );

    for (const effect of XENO_BLASTER_EFFECTS) {
      expect(html).toContain(effect.name);
      expect(html).toContain(`#${effect.id}`);
    }
  });

  it('renders the "Blaster Effect" heading', () => {
    const html = renderToStaticMarkup(
      createElement(XenoBlasterPicker, { selectedBlaster: 0, onSelectBlaster: noop })
    );

    expect(html).toContain('Blaster Effect');
  });

  it('renders 3 buttons (one per effect)', () => {
    const html = renderToStaticMarkup(
      createElement(XenoBlasterPicker, { selectedBlaster: 0, onSelectBlaster: noop })
    );

    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(3);
  });

  it('marks the selected blaster with aria-pressed="true"', () => {
    const html = renderToStaticMarkup(
      createElement(XenoBlasterPicker, { selectedBlaster: 1, onSelectBlaster: noop })
    );

    const pressedCount = (html.match(/aria-pressed="true"/g) || []).length;
    expect(pressedCount).toBe(1);

    const unpressedCount = (html.match(/aria-pressed="false"/g) || []).length;
    expect(unpressedCount).toBe(2);
  });

  it('renders blaster descriptions', () => {
    const html = renderToStaticMarkup(
      createElement(XenoBlasterPicker, { selectedBlaster: 0, onSelectBlaster: noop })
    );

    expect(html).toContain('Standard blaster deflection flash');
    expect(html).toContain('Rapid multi-point blaster sparks');
    expect(html).toContain('Wide blaster impact burst');
  });

  it('uses a 3-column grid', () => {
    const html = renderToStaticMarkup(
      createElement(XenoBlasterPicker, { selectedBlaster: 0, onSelectBlaster: noop })
    );

    expect(html).toContain('grid-cols-3');
  });

  it('highlights selected blaster with accent border class', () => {
    const html = renderToStaticMarkup(
      createElement(XenoBlasterPicker, { selectedBlaster: 2, onSelectBlaster: noop })
    );

    expect(html).toContain('border-[rgb(var(--color-accent))]');
  });
});

// ─── XenoForcePicker ───────────────────────────────────────────────

describe('XenoForcePicker', () => {
  it('renders all 2 force effects', () => {
    const html = renderToStaticMarkup(
      createElement(XenoForcePicker, { selectedForce: 0, onSelectForce: noop })
    );

    for (const effect of XENO_FORCE_EFFECTS) {
      expect(html).toContain(effect.name);
      expect(html).toContain(`#${effect.id}`);
    }
  });

  it('renders the "Force Effect" heading', () => {
    const html = renderToStaticMarkup(
      createElement(XenoForcePicker, { selectedForce: 0, onSelectForce: noop })
    );

    expect(html).toContain('Force Effect');
  });

  it('renders 2 buttons (one per effect)', () => {
    const html = renderToStaticMarkup(
      createElement(XenoForcePicker, { selectedForce: 0, onSelectForce: noop })
    );

    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(2);
  });

  it('marks the selected force with aria-pressed="true"', () => {
    const html = renderToStaticMarkup(
      createElement(XenoForcePicker, { selectedForce: 1, onSelectForce: noop })
    );

    const pressedCount = (html.match(/aria-pressed="true"/g) || []).length;
    expect(pressedCount).toBe(1);

    const unpressedCount = (html.match(/aria-pressed="false"/g) || []).length;
    expect(unpressedCount).toBe(1);
  });

  it('renders force descriptions', () => {
    const html = renderToStaticMarkup(
      createElement(XenoForcePicker, { selectedForce: 0, onSelectForce: noop })
    );

    expect(html).toContain('Smooth Force push/pull light sweep');
    expect(html).toContain('Intense Force lightning crackle');
  });

  it('uses a 2-column grid', () => {
    const html = renderToStaticMarkup(
      createElement(XenoForcePicker, { selectedForce: 0, onSelectForce: noop })
    );

    expect(html).toContain('grid-cols-2');
  });

  it('highlights selected force with accent border class', () => {
    const html = renderToStaticMarkup(
      createElement(XenoForcePicker, { selectedForce: 0, onSelectForce: noop })
    );

    expect(html).toContain('border-[rgb(var(--color-accent))]');
  });
});

// ─── XenoConfigPreview ─────────────────────────────────────────────
// Reads from bladeStore + xenopixelSettingsStore. During SSR,
// Zustand returns initial state: Obi-Wan ANH (0,140,255), style
// 'stable' (Xeno ID 1), ignition 'standard' (Xeno ID 0),
// blasterEffect 0, forceEffect 0, ignitionMs 300, retractionMs 800.

describe('XenoConfigPreview', () => {
  it('renders section headings', () => {
    const html = renderToStaticMarkup(createElement(XenoConfigPreview));

    expect(html).toContain('Config Preview');
    expect(html).toContain('fontconfig.ini');
    expect(html).toContain('set/config.ini');
  });

  it('renders the fontconfig.ini line from default store state', () => {
    const html = renderToStaticMarkup(createElement(XenoConfigPreview));

    // Default: Obi-Wan ANH base color (0,140,255), stable → Xeno ID 1,
    // blaster 0, force 0, D=0, E=0, standard ignition → F=0, 300ms, 800ms
    expect(html).toContain('font1=(0,140,255),1,0,0,0,0,0,300,800');
  });

  it('renders config.ini global settings from default store', () => {
    const html = renderToStaticMarkup(createElement(XenoConfigPreview));

    expect(html).toContain('pixel_number=133');
    expect(html).toContain('volume=70');
    expect(html).toContain('clash_sensitivity=3');
  });

  it('renders annotation block with readable labels', () => {
    const html = renderToStaticMarkup(createElement(XenoConfigPreview));

    expect(html).toContain('A (Blade Effect)');
    expect(html).toContain('B (Blaster)');
    expect(html).toContain('C (Force)');
    expect(html).toContain('F (Ignition)');
    expect(html).toContain('G (Ignite ms)');
    expect(html).toContain('H (Retract ms)');
  });

  it('renders descriptive help text', () => {
    const html = renderToStaticMarkup(createElement(XenoConfigPreview));

    expect(html).toContain('Live preview of the INI files');
  });

  it('respects custom fontNumber prop', () => {
    const html = renderToStaticMarkup(
      createElement(XenoConfigPreview, { fontNumber: 5 })
    );

    expect(html).toContain('font5=');
    expect(html).not.toContain('font1=');
  });
});

// ─── XenoImportPanel ───────────────────────────────────────────────

describe('XenoImportPanel', () => {
  it('renders the paste mode by default', () => {
    const html = renderToStaticMarkup(
      createElement(XenoImportPanel, { onApplyFont: noop })
    );

    expect(html).toContain('Import from SD Card');
    expect(html).toContain('fontconfig.ini');
    expect(html).toContain('set/config.ini');
  });

  it('renders two textareas for paste input', () => {
    const html = renderToStaticMarkup(
      createElement(XenoImportPanel, { onApplyFont: noop })
    );

    const textareaCount = (html.match(/<textarea/g) || []).length;
    expect(textareaCount).toBe(2);
  });

  it('renders the Parse Config button', () => {
    const html = renderToStaticMarkup(
      createElement(XenoImportPanel, { onApplyFont: noop })
    );

    expect(html).toContain('Parse Config');
  });

  it('renders the parse button as disabled by default (empty inputs)', () => {
    const html = renderToStaticMarkup(
      createElement(XenoImportPanel, { onApplyFont: noop })
    );

    // The button should be disabled since both textareas are empty
    expect(html).toContain('disabled');
  });

  it('renders placeholder text for fontconfig.ini', () => {
    const html = renderToStaticMarkup(
      createElement(XenoImportPanel, { onApplyFont: noop })
    );

    expect(html).toContain('font1=(0,0,255),1,0,0,0,0,0,300,500');
  });

  it('labels config.ini as optional', () => {
    const html = renderToStaticMarkup(
      createElement(XenoImportPanel, { onApplyFont: noop })
    );

    expect(html).toContain('(optional)');
  });

  it('renders descriptive help text', () => {
    const html = renderToStaticMarkup(
      createElement(XenoImportPanel, { onApplyFont: noop })
    );

    expect(html).toContain('Paste your Xenopixel SD card config files');
  });
});
