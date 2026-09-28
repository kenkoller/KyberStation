// @vitest-environment jsdom
// ─── Saber-aware delivery — chassis drives the path to the saber ─────────
//
// The chassis on the active saber profile decides how a design should
// reach real hardware (see `getDeliveryGuidance` in
// @kyberstation/hardware-profiles). These tests pin the three surfaces
// that act on it:
//
//   1. `assignChassis` — sets the chassis, creating + activating a saber
//      profile when none exists (the chassis picker used to dead-end with
//      "create a profile, then come back").
//   2. ChassisPicker + OnboardingFlow — both can assign a chassis on a
//      fresh install with zero profiles.
//   3. FlashPanel — when the chassis is known to reject custom firmware
//      (89sabers V3.9-BT, 11/11 failed on the bench), it warns on every
//      visit, offers a jump to the Card Writer, and keeps Connect disabled
//      until the user explicitly opts in.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createElement } from 'react';

vi.mock('@/components/layout/ToastContainer', () => ({ toast: vi.fn() }));

import { toast } from '@/components/layout/ToastContainer';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { useChassisPickerStore } from '@/stores/chassisPickerStore';
import { ChassisPicker } from '@/components/layout/ChassisPicker';
import { OnboardingFlow } from '@/components/layout/OnboardingFlow';
import { FlashPanel } from '@/components/editor/FlashPanel';

const DISCLAIMER_ACK_KEY = 'kyberstation:webusb-disclaimer-ack';

function resetProfiles(): void {
  useSaberProfileStore.setState({ profiles: [], activeProfileId: null });
}

function activeProfile() {
  return useSaberProfileStore.getState().getActiveProfile();
}

function withActiveChassis(hardwareProfileId: string | undefined): void {
  resetProfiles();
  const profile = useSaberProfileStore.getState().createProfile('Bench saber');
  if (hardwareProfileId) {
    useSaberProfileStore.getState().updateProfile(profile.id, { hardwareProfileId });
  }
}

beforeEach(() => {
  resetProfiles();
  vi.mocked(toast).mockClear();
});

afterEach(() => {
  cleanup();
  useChassisPickerStore.getState().close();
});

describe('assignChassis', () => {
  it('creates and activates a profile named after the chassis when none exists', () => {
    const p = useSaberProfileStore.getState().assignChassis('89sabers-v3.9-bt', '89sabers V3.9-BT');
    expect(p.hardwareProfileId).toBe('89sabers-v3.9-bt');
    expect(p.name).toBe('89sabers V3.9-BT');
    expect(activeProfile()?.id).toBe(p.id);
    expect(useSaberProfileStore.getState().profiles).toHaveLength(1);
  });

  it('updates the active profile instead of creating another', () => {
    const existing = useSaberProfileStore.getState().createProfile('My Vader');
    const p = useSaberProfileStore.getState().assignChassis('stock-proffieboard-v3', 'unused');
    expect(p.id).toBe(existing.id);
    expect(p.name).toBe('My Vader');
    expect(activeProfile()?.hardwareProfileId).toBe('stock-proffieboard-v3');
    expect(useSaberProfileStore.getState().profiles).toHaveLength(1);
  });

  it('recovers from a stale activeProfileId that points at a deleted profile', () => {
    useSaberProfileStore.setState({ profiles: [], activeProfileId: 'deleted-id' });
    const p = useSaberProfileStore.getState().assignChassis('89sabers-v3.9', '89sabers V3.9');
    expect(activeProfile()?.id).toBe(p.id);
    expect(activeProfile()?.hardwareProfileId).toBe('89sabers-v3.9');
  });
});

describe('ChassisPicker', () => {
  it('saves a chassis on a fresh install with no saber profile', () => {
    useChassisPickerStore.getState().open('manual');
    render(createElement(ChassisPicker));

    fireEvent.click(screen.getByText('89SABERS · V3.9-BT'));
    const save = screen.getByRole('button', { name: 'Save chassis' }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);

    expect(activeProfile()?.hardwareProfileId).toBe('89sabers-v3.9-bt');
    expect(activeProfile()?.name).toBe('89sabers V3.9-BT');
    expect(toast).toHaveBeenCalledWith(
      expect.stringMatching(/SD-card runtime presets/),
      'success',
    );
  });

  it('labels the V3.9-BT card with its delivery path and flash warning', () => {
    useChassisPickerStore.getState().open('manual');
    render(createElement(ChassisPicker));
    expect(screen.getAllByText('SD CARD PRESETS').length).toBeGreaterThan(0);
    expect(screen.getByText(/Custom firmware has never booted on this chassis/)).toBeTruthy();
  });
});

describe('OnboardingFlow — YOUR SABER step', () => {
  beforeEach(() => {
    // jsdom has no matchMedia; the performance-tier auto-detect calls it.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });

  it('assigns the picked chassis when the user leaves the step', () => {
    render(createElement(OnboardingFlow, { onComplete: () => {} }));
    fireEvent.click(screen.getByRole('button', { name: 'GET STARTED' }));

    expect(screen.getByText('YOUR SABER')).toBeTruthy();
    fireEvent.click(screen.getByText('89SABERS · V3.9-BT'));
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }));

    expect(activeProfile()?.hardwareProfileId).toBe('89sabers-v3.9-bt');
    expect(screen.getByText('VISUAL QUALITY')).toBeTruthy();
  });

  it('"Just designing" leaves the install without a profile', () => {
    render(createElement(OnboardingFlow, { onComplete: () => {} }));
    fireEvent.click(screen.getByRole('button', { name: 'GET STARTED' }));
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }));

    expect(useSaberProfileStore.getState().profiles).toHaveLength(0);
    expect(screen.getByText('VISUAL QUALITY')).toBeTruthy();
  });
});

describe('FlashPanel chassis gate', () => {
  beforeEach(() => {
    // WebUSB present + generic disclaimer already acknowledged this session,
    // so the panel is on its Connect step — where the chassis gate must hold.
    Object.defineProperty(navigator, 'usb', { value: {}, configurable: true });
    sessionStorage.setItem(DISCLAIMER_ACK_KEY, '1');
  });

  afterEach(() => {
    sessionStorage.removeItem(DISCLAIMER_ACK_KEY);
    delete (navigator as { usb?: unknown }).usb;
  });

  function connectButton(): HTMLButtonElement {
    return screen.getByRole('button', { name: /Connect Proffieboard/ }) as HTMLButtonElement;
  }

  it('V3.9-BT: warns, disables Connect until the user opts in', () => {
    withActiveChassis('89sabers-v3.9-bt');
    render(createElement(FlashPanel, { onOpenCardWriter: () => {} }));

    expect(screen.getByRole('alert').textContent).toMatch(/Custom firmware doesn.t boot on your saber.s chassis/);
    expect(connectButton().disabled).toBe(true);

    fireEvent.click(screen.getByRole('checkbox', { name: /Flash anyway/ }));
    expect(connectButton().disabled).toBe(false);
  });

  it('V3.9-BT: "Open Card Writer" hands off to the host', () => {
    withActiveChassis('89sabers-v3.9-bt');
    const openCardWriter = vi.fn();
    render(createElement(FlashPanel, { onOpenCardWriter: openCardWriter }));

    fireEvent.click(screen.getByRole('button', { name: 'Open Card Writer (SD card)' }));
    expect(openCardWriter).toHaveBeenCalledTimes(1);
  });

  it('hides the Card Writer shortcut when no host callback is supplied', () => {
    withActiveChassis('89sabers-v3.9-bt');
    render(createElement(FlashPanel, {}));
    expect(screen.queryByRole('button', { name: 'Open Card Writer (SD card)' })).toBeNull();
  });

  it('stock Proffieboard: no chassis warning, Connect enabled', () => {
    withActiveChassis('stock-proffieboard-v3');
    render(createElement(FlashPanel, {}));
    expect(screen.queryByText(/Custom firmware doesn.t boot on your saber.s chassis/)).toBeNull();
    expect(connectButton().disabled).toBe(false);
  });

  it('no chassis assigned: no chassis warning', () => {
    withActiveChassis(undefined);
    render(createElement(FlashPanel, {}));
    expect(screen.queryByText(/Custom firmware doesn.t boot on your saber.s chassis/)).toBeNull();
  });
});
