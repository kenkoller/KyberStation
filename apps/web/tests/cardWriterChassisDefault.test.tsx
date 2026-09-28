// @vitest-environment jsdom
//
// ─── CardWriter — chassis-aware export defaults ───
//
// A chassis tagged `recommendedDelivery: 'runtime-presets'` (89sabers
// V3.9-BT: custom firmware failed 11/11 on the bench) should open the Card
// Writer on ProffieOS Runtime (SD card) with the user's colors + style on,
// say why, and warn if the user switches to a config.h export anyway.
// Every other case keeps the old default (ProffieOS config.h, factory styles).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { CardWriter } from '@/components/editor/CardWriter';
import { useSaberProfileStore } from '@/stores/saberProfileStore';

function setChassis(hardwareProfileId: string | undefined): void {
  useSaberProfileStore.setState({ profiles: [], activeProfileId: null });
  if (!hardwareProfileId) return;
  useSaberProfileStore.getState().assignChassis(hardwareProfileId, 'Bench saber');
}

function boardSelect(): HTMLSelectElement {
  return screen.getByLabelText('Target Board') as HTMLSelectElement;
}

describe('CardWriter chassis-aware defaults', () => {
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
    useSaberProfileStore.setState({ profiles: [], activeProfileId: null });
  });

  it('no chassis: opens on ProffieOS config.h with no chassis note', () => {
    setChassis(undefined);
    render(<CardWriter />);
    expect(boardSelect().value).toBe('proffie');
    expect(screen.queryByText(/Picked for your/)).toBeNull();
  });

  it('V3.9-BT: opens on runtime presets with custom styles on, and says why', () => {
    setChassis('89sabers-v3.9-bt');
    render(<CardWriter />);
    expect(boardSelect().value).toBe('proffie_runtime');
    expect((screen.getByLabelText('Use my colors and blade style') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/Picked for your 89sabers V3\.9-BT/).textContent).toMatch(/never booted/);
  });

  it('V3.9-BT: switching to a config.h export warns that it will not run', () => {
    setChassis('89sabers-v3.9-bt');
    render(<CardWriter />);
    fireEvent.change(boardSelect(), { target: { value: 'proffie' } });
    expect(screen.getByRole('alert').textContent).toMatch(/doesn.t boot custom firmware/);
  });

  it('stock Proffieboard: keeps the config.h default and shows no warning', () => {
    setChassis('stock-proffieboard-v3');
    render(<CardWriter />);
    expect(boardSelect().value).toBe('proffie');
    expect(screen.queryByText(/doesn.t boot custom firmware/)).toBeNull();
  });
});
