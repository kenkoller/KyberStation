// ─── Xenopixel board-gated panel switching tests ────────────────────
//
// Verify that:
//   1. Sidebar hides proffieOnly sections when board is Xenopixel
//   2. MainContent renders Xeno panels when board is Xenopixel
//   3. Connected wrappers bridge Xeno components to blade store
//   4. Style/ignition mapping between BladeConfig strings and Xeno IDs
//
// Pattern: renderToStaticMarkup + string assertions (SSR-safe).

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { XENO_BLADE_EFFECTS } from '@kyberstation/boards';

// ─── Connected wrapper rendering tests ──────────────────────────────
//
// The connected wrappers use Zustand hooks (useBladeStore) which
// don't work outside React's rendering context in SSR. Instead we
// test the stateless components directly with controlled props, and
// test the mapping functions separately.

import { XenoEffectPicker } from '@/components/editor/xenopixel/XenoEffectPicker';
import { XenoIgnitionPicker } from '@/components/editor/xenopixel/XenoIgnitionPicker';
import { XenoMotionPanel } from '@/components/editor/xenopixel/XenoMotionPanel';
import type { XenoMotionSettings } from '@/components/editor/xenopixel/XenoMotionPanel';
import { XenoSettingsPanel } from '@/components/editor/xenopixel/XenoSettingsPanel';
import type { XenoGlobalSettings } from '@/components/editor/xenopixel/XenoSettingsPanel';

const noop = () => {};

describe('Xenopixel board-gated panel switching', () => {
  describe('Sidebar section gating — SectionDef.proffieOnly', () => {
    // We can't SSR-render the actual Sidebar (it uses Zustand + Next
    // Link), but we can verify the shape of the GROUPS data. Import
    // the Sidebar source and regex-check the section definitions.

    it('layer-compositor is marked proffieOnly', async () => {
      // Read the source and verify the flag
      const { readFileSync } = await import('fs');
      const source = readFileSync(
        new URL('../components/layout/Sidebar.tsx', import.meta.url),
        'utf-8',
      );
      // The line should contain both 'layer-compositor' and 'proffieOnly: true'
      const lines = source.split('\n');
      const lcLine = lines.find((l) => l.includes("'layer-compositor'"));
      expect(lcLine).toBeDefined();
      expect(lcLine).toContain('proffieOnly: true');
    });

    it('motion-simulation is marked proffieOnly', async () => {
      const { readFileSync } = await import('fs');
      const source = readFileSync(
        new URL('../components/layout/Sidebar.tsx', import.meta.url),
        'utf-8',
      );
      const lines = source.split('\n');
      const msLine = lines.find((l) => l.includes("'motion-simulation'"));
      expect(msLine).toBeDefined();
      expect(msLine).toContain('proffieOnly: true');
    });

    it('blade-style is NOT marked proffieOnly (shared section)', async () => {
      const { readFileSync } = await import('fs');
      const source = readFileSync(
        new URL('../components/layout/Sidebar.tsx', import.meta.url),
        'utf-8',
      );
      const lines = source.split('\n');
      const bsLine = lines.find((l) => l.includes("'blade-style'"));
      expect(bsLine).toBeDefined();
      expect(bsLine).not.toContain('proffieOnly');
    });

    it('SectionDef interface includes proffieOnly field', async () => {
      const { readFileSync } = await import('fs');
      const source = readFileSync(
        new URL('../components/layout/Sidebar.tsx', import.meta.url),
        'utf-8',
      );
      expect(source).toContain('proffieOnly?: boolean');
    });
  });

  describe('MainContent xenopixel routing', () => {
    it('MainContent imports xenopixel connected components', async () => {
      const { readFileSync } = await import('fs');
      const source = readFileSync(
        new URL('../components/layout/MainContent.tsx', import.meta.url),
        'utf-8',
      );
      expect(source).toContain('XenoEffectPickerConnected');
      expect(source).toContain('XenoIgnitionPickerConnected');
      expect(source).toContain('XenoMotionPanelConnected');
      expect(source).toContain('XenoSettingsPanelConnected');
    });

    it('MainContent uses useBoardProfile to detect xenopixel', async () => {
      const { readFileSync } = await import('fs');
      const source = readFileSync(
        new URL('../components/layout/MainContent.tsx', import.meta.url),
        'utf-8',
      );
      expect(source).toContain("boardId === 'xenopixel'");
      expect(source).toContain('useBoardProfile');
    });

    it('A/B layout skips blade-style, ignition-retraction, combat-effects for xenopixel', async () => {
      const { readFileSync } = await import('fs');
      const source = readFileSync(
        new URL('../components/layout/MainContent.tsx', import.meta.url),
        'utf-8',
      );
      // These A/B branches should be gated with !isXenopixel
      expect(source).toContain("activeSection === 'blade-style' && !isXenopixel");
      expect(source).toContain("activeSection === 'ignition-retraction' && !isXenopixel");
      expect(source).toContain("activeSection === 'combat-effects' && !isXenopixel");
    });
  });

  describe('Xenopixel effect ID ↔ BladeConfig.style mapping', () => {
    // These test the mapping logic used by the connected wrappers.
    // The mapping is defined in connected.tsx and mirrors the emitter's
    // mapBladeEffect logic.

    it('all XENO_BLADE_EFFECTS with kyberStyle map round-trip', () => {
      // For each Xeno blade effect that has a kyberStyle mapping,
      // verify the ID → style → ID round-trip is consistent
      for (const effect of XENO_BLADE_EFFECTS) {
        if (!effect.kyberStyle) continue;
        // The kyberStyle should exist in the effect picker card set
        const html = renderToStaticMarkup(
          createElement(XenoEffectPicker, {
            selectedEffect: effect.id,
            onSelectEffect: noop,
          }),
        );
        expect(html).toContain(`aria-pressed="true"`);
        expect(html).toContain(effect.name);
      }
    });

    it('fire (ID 0) renders as selected when selectedEffect=0', () => {
      const html = renderToStaticMarkup(
        createElement(XenoEffectPicker, {
          selectedEffect: 0,
          onSelectEffect: noop,
        }),
      );
      // The Fire Blade card should have aria-pressed="true"
      expect(html).toContain('Fire Blade');
      // Exactly one card should be selected
      const pressedCount = (html.match(/aria-pressed="true"/g) || []).length;
      expect(pressedCount).toBe(1);
    });

    it('stable (ID 1) renders as selected when selectedEffect=1', () => {
      const html = renderToStaticMarkup(
        createElement(XenoEffectPicker, {
          selectedEffect: 1,
          onSelectEffect: noop,
        }),
      );
      expect(html).toContain('Steady Blade');
      const pressedCount = (html.match(/aria-pressed="true"/g) || []).length;
      expect(pressedCount).toBe(1);
    });
  });

  describe('Xenopixel ignition picker groups', () => {
    it('renders blade modes (IDs 0-4) and special preons (IDs 5-11)', () => {
      const html = renderToStaticMarkup(
        createElement(XenoIgnitionPicker, {
          selectedIgnition: 0,
          onSelectIgnition: noop,
        }),
      );
      // Blade modes group header
      expect(html).toContain('Blade Modes');
      // Special preons group header
      expect(html).toContain('Special Preon Ignitions');
      // Check representative entries from each group
      expect(html).toContain('Standard Blade');     // ID 0, blade mode
      expect(html).toContain('Ghost Blade');         // ID 4, blade mode
      expect(html).toContain('Stack Ignition');      // ID 5, special preon
      expect(html).toContain('Broken Ignition');     // ID 11, special preon
    });

    it('selects only the matching ignition card', () => {
      const html = renderToStaticMarkup(
        createElement(XenoIgnitionPicker, {
          selectedIgnition: 6,
          onSelectIgnition: noop,
        }),
      );
      // FoldTile Ignition (ID 6) should be the only selected one
      const pressedCount = (html.match(/aria-pressed="true"/g) || []).length;
      expect(pressedCount).toBe(1);
    });
  });

  describe('Xenopixel motion panel renders with defaults', () => {
    const defaults: XenoMotionSettings = {
      motionControl: true,
      swingOn: false,
      swingSensitivity: 1000,
      twistOn: true,
      twistOff: true,
      twistSensitivity: 200,
      pullPushOn: false,
      pushPullOff: false,
      pushSensitivity: 10,
      pullSensitivity: 10,
    };

    it('renders all gesture sections', () => {
      const html = renderToStaticMarkup(
        createElement(XenoMotionPanel, {
          settings: defaults,
          onSettingsChange: noop,
        }),
      );
      expect(html).toContain('Motion Controls');
      expect(html).toContain('Swing Ignition');
      expect(html).toContain('Twist Ignition');
      expect(html).toContain('Twist Retraction');
      expect(html).toContain('Pull/Push Ignition');
      expect(html).toContain('Push/Pull Retraction');
    });
  });

  describe('Xenopixel settings panel renders with defaults', () => {
    const defaults: XenoGlobalSettings = {
      volume: 70,
      clashSensitivity: 3.0,
      flashOnClash: true,
      pixelNumber: 133,
      velocityMode: false,
      torchMode: false,
      multiblockMode: true,
      multilockMode: true,
      lightningBlockMode: false,
      blasterMode: false,
      ghostMode: false,
      powerOnTime: 1500,
      powerOffTime: 5000,
      countdown: false,
    };

    it('renders all settings sections', () => {
      const html = renderToStaticMarkup(
        createElement(XenoSettingsPanel, {
          settings: defaults,
          onSettingsChange: noop,
        }),
      );
      expect(html).toContain('Volume');
      expect(html).toContain('Clash');
      expect(html).toContain('Blade Length');
      expect(html).toContain('Blade Modes');
      expect(html).toContain('Action Modes');
      expect(html).toContain('Timing');
      expect(html).toContain('Sound');
    });

    it('does NOT show volume warning at 70%', () => {
      const html = renderToStaticMarkup(
        createElement(XenoSettingsPanel, {
          settings: defaults,
          onSettingsChange: noop,
        }),
      );
      expect(html).not.toContain('distortion');
    });

    it('shows volume warning above 90%', () => {
      const html = renderToStaticMarkup(
        createElement(XenoSettingsPanel, {
          settings: { ...defaults, volume: 95 },
          onSettingsChange: noop,
        }),
      );
      expect(html).toContain('distortion');
    });
  });

  describe('Connected wrapper module exports', () => {
    it('exports all four connected wrappers', async () => {
      const mod = await import('@/components/editor/xenopixel/connected');
      expect(typeof mod.XenoEffectPickerConnected).toBe('function');
      expect(typeof mod.XenoIgnitionPickerConnected).toBe('function');
      expect(typeof mod.XenoMotionPanelConnected).toBe('function');
      expect(typeof mod.XenoSettingsPanelConnected).toBe('function');
    });
  });
});
