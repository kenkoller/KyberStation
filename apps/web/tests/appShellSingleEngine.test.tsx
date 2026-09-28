// @vitest-environment jsdom
//
// ─── One BladeEngine per layout ──────────────────────────────────────
//
// AppShell used to call useBladeEngine() and then, on desktop, render
// WorkbenchLayout — which calls useBladeEngine() too. Every desktop
// session ran two engines with two rAF ticks writing `bladeState` over
// each other, and registered keyboard shortcuts + timeline playback twice
// (Space / L toggled once on each engine). AppShell now leaves the engine
// to WorkbenchLayout on desktop and only creates one for the compact
// (mobile / tablet) shells.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useBladeEngine: vi.fn(),
  breakpoint: { isMobile: false, isTablet: false },
}));

vi.mock('@/hooks/useBladeEngine', () => ({
  useBladeEngine: mocks.useBladeEngine,
}));
vi.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: () => mocks.breakpoint,
}));
vi.mock('@/hooks/useAudioEngine', () => ({
  useAudioEngine: () => ({
    playIgnition: vi.fn(), playRetraction: vi.fn(), playClash: vi.fn(), playBlast: vi.fn(),
    playStab: vi.fn(), playLockup: vi.fn(), playSwing: vi.fn(), updateSwing: vi.fn(),
    toggleMute: vi.fn(), muted: false,
  }),
}));
vi.mock('@/hooks/useAudioSync', () => ({ useAudioSync: () => {} }));
vi.mock('@/components/layout/WorkbenchLayout', () => ({
  WorkbenchLayout: () => <div data-testid="workbench" />,
}));
vi.mock('@/components/layout/MobileShell', () => ({
  MobileShell: (props: { engineRef: unknown }) => (
    <div data-testid="mobile" data-has-engine={props.engineRef ? 'yes' : 'no'} />
  ),
}));

import { AppShell } from '@/components/layout/AppShell';

beforeEach(() => {
  // jsdom has no matchMedia (used by the accessibility / theme appliers).
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  mocks.useBladeEngine.mockReset();
  mocks.useBladeEngine.mockReturnValue({
    engineRef: { current: null },
    config: {},
    ignite: vi.fn(),
    retract: vi.fn(),
    toggle: vi.fn(),
    triggerEffect: vi.fn(),
    releaseEffect: vi.fn(),
  });
});

describe('AppShell engine ownership', () => {
  it('desktop: renders WorkbenchLayout without creating a second engine', () => {
    mocks.breakpoint = { isMobile: false, isTablet: false };
    const { getByTestId } = render(<AppShell />);
    expect(getByTestId('workbench')).toBeTruthy();
    // WorkbenchLayout (stubbed here) owns the desktop engine; AppShell
    // itself must not call useBladeEngine.
    expect(mocks.useBladeEngine).not.toHaveBeenCalled();
  });

  it('mobile: the compact shell owns the engine and passes it down', () => {
    mocks.breakpoint = { isMobile: true, isTablet: false };
    const { getByTestId } = render(<AppShell />);
    expect(mocks.useBladeEngine).toHaveBeenCalled();
    expect(getByTestId('mobile').getAttribute('data-has-engine')).toBe('yes');
  });
});
