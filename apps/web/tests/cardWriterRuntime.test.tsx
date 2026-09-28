// @vitest-environment jsdom
//
// ─── CardWriter — ProffieOS Runtime (SD card) UX contract ───
//
// Pins the runtime-preset panel copy that users actually read:
//   - plain-language blade-style options (no internal "Phase A/C" terms)
//   - the factory-styles option says the design does NOT travel, and each
//     preset row says which factory slot's style it will play
//   - custom-styles mode shows a per-preset fidelity label before export
//   - the export summary + hint list presets.ini + presets.tmp + README and
//     no font folders

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { CardWriter } from '@/components/editor/CardWriter';

function renderRuntimeCardWriter() {
  const utils = render(<CardWriter />);
  fireEvent.change(screen.getByLabelText('Target Board'), {
    target: { value: 'proffie_runtime' },
  });
  return utils;
}

describe('CardWriter — proffie_runtime', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: false,
      media: q,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('offers plain-language blade-style options with no Phase A/C jargon', () => {
    const { container } = renderRuntimeCardWriter();
    expect(screen.getByLabelText('Keep factory blade styles')).toBeTruthy();
    expect(screen.getByLabelText('Use my colors and blade style')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Phase [AC]\b/);
  });

  it('factory mode says the design stays on the computer and names the factory slot', () => {
    const { container } = renderRuntimeCardWriter();
    expect(container.textContent).toContain(
      'Only preset names, order and sound fonts change — your colors and blade style stay on your computer.',
    );
    expect(container.textContent).toContain("Plays factory slot 1's style");
  });

  it('custom mode shows the per-preset fidelity label', () => {
    const { container } = renderRuntimeCardWriter();
    fireEvent.click(screen.getByLabelText('Use my colors and blade style'));
    expect(container.textContent).toMatch(/(Faithful|Approximate) · \w+ verb|Colors only — this style needs a firmware flash/);
    expect(container.textContent).toMatch(/\d+ faithful · \d+ approximate · \d+ colors only/);
  });

  it('export summary + hint list both preset files and no font folders', () => {
    const { container } = renderRuntimeCardWriter();
    const text = container.textContent ?? '';
    expect(text).toContain('Files (SD card root):');
    expect(text).toContain('presets.tmp');
    expect(text).not.toContain('Font folders:');
    expect(text).not.toContain('font folder structure');
    expect(text).toContain('Downloads a ZIP with presets.ini and an identical presets.tmp.');
  });
});
