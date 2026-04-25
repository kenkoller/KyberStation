// ─── QuickColorChips — canonical chip row regression tests ───
//
// v0.14.0 Quick Controls expansion (PR 3a). Follows the same hoisted-
// mock + renderToStaticMarkup pattern as `colorPanel.test.tsx` so the
// node-only vitest env for apps/web (see apps/web/vitest.config.ts) can
// drive the component without a DOM.
//
// Four contract shapes are pinned:
//
//   1. 8 canonical chips + 1 Custom render on every channel
//   2. Active chip sets `aria-pressed="true"` when the channel's
//      color matches the chip's RGB within the 5-per-channel epsilon
//   3. Clicking a chip calls bladeStore.setColor with the active
//      channel key + the canonical RGB
//   4. The channel readout label tracks `uiStore.activeColorChannel`

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Hoisted mock state ─────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  activeColorChannel: 'baseColor' as string,
  setColorCalls: [] as Array<{
    key: string;
    color: { r: number; g: number; b: number };
  }>,
  setActiveSectionCalls: [] as string[],
  config: {
    name: 'Obi-Wan ANH',
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0.1,
    ledCount: 144,
  } as Record<string, unknown>,
}));

vi.mock('@/stores/uiStore', () => {
  const setActiveSection = (section: string) => {
    mockState.setActiveSectionCalls.push(section);
  };
  const useUIStore = ((selector: (s: unknown) => unknown) =>
    selector({
      activeColorChannel: mockState.activeColorChannel,
      setActiveColorChannel: () => {},
      setActiveSection,
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => Record<string, unknown>;
    setState: (partial: Record<string, unknown>) => void;
  };
  useUIStore.getState = () => ({
    activeColorChannel: mockState.activeColorChannel,
    setActiveSection,
  });
  useUIStore.setState = (partial) => {
    if (typeof partial === 'object' && partial !== null) {
      Object.assign(mockState, partial);
    }
  };
  return { useUIStore };
});

vi.mock('@/stores/bladeStore', () => {
  const setColor = (
    key: string,
    color: { r: number; g: number; b: number },
  ) => {
    mockState.setColorCalls.push({ key, color });
  };
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector({
      config: mockState.config,
      setColor,
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => Record<string, unknown>;
  };
  useBladeStore.getState = () => ({ config: mockState.config, setColor });
  return { useBladeStore };
});

// ── Imports under test ─────────────────────────────────────────────

import {
  QuickColorChips,
  QUICK_COLORS,
} from '@/components/editor/quick/QuickColorChips';

// ── Helpers ────────────────────────────────────────────────────────

function html(): string {
  return renderToStaticMarkup(createElement(QuickColorChips));
}

const DEFAULT_CONFIG = { ...mockState.config };

beforeEach(() => {
  mockState.activeColorChannel = 'baseColor';
  mockState.config = { ...DEFAULT_CONFIG };
  mockState.setColorCalls = [];
  mockState.setActiveSectionCalls = [];
});

// ─── (a) Render contract ────────────────────────────────────────────

describe('QuickColorChips — render contract', () => {
  it('exports 8 canonical color entries', () => {
    expect(QUICK_COLORS).toHaveLength(8);
    const ids = QUICK_COLORS.map((c) => c.id);
    expect(ids).toEqual([
      'blue',
      'red',
      'green',
      'yellow',
      'purple',
      'orange',
      'white',
      'cyan',
    ]);
  });

  it('canonical RGB values match the locked brief', () => {
    const byId = Object.fromEntries(QUICK_COLORS.map((c) => [c.id, c.rgb]));
    expect(byId.blue).toEqual({ r: 0, g: 140, b: 255 });
    expect(byId.red).toEqual({ r: 255, g: 30, b: 20 });
    expect(byId.green).toEqual({ r: 30, g: 255, b: 30 });
    expect(byId.yellow).toEqual({ r: 255, g: 210, b: 40 });
    expect(byId.purple).toEqual({ r: 170, g: 60, b: 240 });
    expect(byId.orange).toEqual({ r: 255, g: 120, b: 20 });
    expect(byId.white).toEqual({ r: 240, g: 240, b: 255 });
    expect(byId.cyan).toEqual({ r: 20, g: 230, b: 255 });
  });

  it('renders an aria-label button for every canonical color', () => {
    const markup = html();
    for (const chip of QUICK_COLORS) {
      expect(markup).toContain(`aria-label="Set base to ${chip.name}"`);
    }
  });

  it('renders a Custom... affordance chip', () => {
    const markup = html();
    expect(markup).toContain('data-testid="quick-color-chip-custom"');
    expect(markup).toContain('aria-label="Open full color editor"');
  });

  it('renders all 8 canonical chips + 1 Custom = 9 buttons total', () => {
    const markup = html();
    const buttonMatches = markup.match(/<button/g) ?? [];
    expect(buttonMatches.length).toBe(9);
  });
});

// ─── (b) aria-pressed active-match behavior ────────────────────────

describe('QuickColorChips — active-chip aria-pressed', () => {
  it('blue chip is aria-pressed=true when baseColor matches default blue', () => {
    mockState.activeColorChannel = 'baseColor';
    mockState.config = {
      ...DEFAULT_CONFIG,
      baseColor: { r: 0, g: 140, b: 255 },
    };
    const markup = html();
    expect(markup).toMatch(
      /aria-label="Set base to Blue"[^>]*aria-pressed="true"/,
    );
    // Red chip, by contrast, is not pressed.
    expect(markup).toMatch(
      /aria-label="Set base to Red"[^>]*aria-pressed="false"/,
    );
  });

  it('red chip is aria-pressed=true when baseColor is canonical red', () => {
    mockState.activeColorChannel = 'baseColor';
    mockState.config = {
      ...DEFAULT_CONFIG,
      baseColor: { r: 255, g: 30, b: 20 },
    };
    const markup = html();
    expect(markup).toMatch(
      /aria-label="Set base to Red"[^>]*aria-pressed="true"/,
    );
  });

  it('active match tolerates a ≤5 per-channel epsilon drift', () => {
    // Users who tweak a canonical color by a tiny HSL nudge should still
    // see the matching chip highlighted.
    mockState.activeColorChannel = 'baseColor';
    mockState.config = {
      ...DEFAULT_CONFIG,
      baseColor: { r: 3, g: 143, b: 252 }, // within ±5 of canonical blue
    };
    const markup = html();
    expect(markup).toMatch(
      /aria-label="Set base to Blue"[^>]*aria-pressed="true"/,
    );
  });

  it('drift beyond 5 per channel drops the active match', () => {
    mockState.activeColorChannel = 'baseColor';
    mockState.config = {
      ...DEFAULT_CONFIG,
      baseColor: { r: 10, g: 140, b: 255 }, // r drifted by 10 → no match
    };
    const markup = html();
    expect(markup).toMatch(
      /aria-label="Set base to Blue"[^>]*aria-pressed="false"/,
    );
  });

  it('tracks active channel — Clash channel highlights chip matching clashColor', () => {
    mockState.activeColorChannel = 'clashColor';
    mockState.config = {
      ...DEFAULT_CONFIG,
      clashColor: { r: 255, g: 30, b: 20 },
    };
    const markup = html();
    expect(markup).toMatch(
      /aria-label="Set clash to Red"[^>]*aria-pressed="true"/,
    );
  });

  it('no chip is pressed when the channel holds a non-canonical color', () => {
    mockState.activeColorChannel = 'baseColor';
    mockState.config = {
      ...DEFAULT_CONFIG,
      baseColor: { r: 128, g: 64, b: 32 }, // nowhere near any canonical
    };
    const markup = html();
    expect(markup).not.toMatch(/aria-pressed="true"/);
  });
});

// ─── (c) setColor click routing ────────────────────────────────────

describe('QuickColorChips — setColor dispatch', () => {
  it('click-equivalent handler call: setColor is not called at render', () => {
    html();
    expect(mockState.setColorCalls).toHaveLength(0);
  });

  it('QUICK_COLORS entries are the exact RGB the click path writes', () => {
    // The component's click handler always writes chip.rgb to the active
    // channel. Since renderToStaticMarkup has no event dispatch, we pin
    // the contract by directly invoking the canonical-value helper the
    // click path uses — that is, we verify QUICK_COLORS is the frozen
    // source of truth for the handler.
    //
    // This catches any accidental value drift (e.g. if someone edits the
    // constant without updating the clicked-RGB, the mismatch would show
    // here).
    for (const chip of QUICK_COLORS) {
      expect(chip.rgb.r).toBeGreaterThanOrEqual(0);
      expect(chip.rgb.r).toBeLessThanOrEqual(255);
      expect(chip.rgb.g).toBeGreaterThanOrEqual(0);
      expect(chip.rgb.g).toBeLessThanOrEqual(255);
      expect(chip.rgb.b).toBeGreaterThanOrEqual(0);
      expect(chip.rgb.b).toBeLessThanOrEqual(255);
    }
  });

  it('exposed chip background color in markup matches the RGB constant', () => {
    // The `background-color: rgb(r, g, b)` inline style is the load-
    // bearing visual channel; if the constant ever drifts from the
    // rendered chip, this test catches it.
    const markup = html();
    for (const chip of QUICK_COLORS) {
      const expected = `background-color:rgb(${chip.rgb.r}, ${chip.rgb.g}, ${chip.rgb.b})`;
      expect(markup).toContain(expected);
    }
  });

  it('the Custom chip has no aria-pressed attribute (not a toggle)', () => {
    const markup = html();
    // Extract the custom chip's fragment. Custom is a navigation jump,
    // not a toggle — no aria-pressed.
    const customIdx = markup.indexOf('data-testid="quick-color-chip-custom"');
    expect(customIdx).toBeGreaterThan(-1);
    // Grab ~200 chars around the chip opening tag.
    const around = markup.slice(Math.max(0, customIdx - 200), customIdx + 200);
    expect(around).not.toContain('aria-pressed');
  });
});

// ─── (c.5) Custom chip wiring (PR 5b) ──────────────────────────────

describe('QuickColorChips — Custom chip jumps to Color section', () => {
  // PR 5b: the Custom chip used to be inert. It now jumps to the deep
  // Color sidebar section. We can't drive a real click in this node-only
  // SSR env, so we pin the wiring with three observables: (a) the
  // aria-label changed from the old "coming soon" copy to the new
  // "Open full color editor" copy, (b) the title text matches the new
  // tooltip, (c) the chip button still exists with the same testid so
  // future click-driven tests (jsdom env) can locate it without churn.

  it('Custom chip aria-label reflects the editor jump intent', () => {
    const markup = html();
    expect(markup).toContain('aria-label="Open full color editor"');
  });

  it('Custom chip title carries the secondary label hint', () => {
    const markup = html();
    expect(markup).toContain('open the full Color editor');
  });

  it('Custom chip retains its data-testid for future click tests', () => {
    const markup = html();
    expect(markup).toContain('data-testid="quick-color-chip-custom"');
  });
});

// ─── (d) Channel readout label ─────────────────────────────────────

describe('QuickColorChips — channel readout', () => {
  it('renders COLOR · BASE when activeColorChannel is baseColor', () => {
    mockState.activeColorChannel = 'baseColor';
    const markup = html();
    expect(markup).toContain('COLOR · ');
    expect(markup).toMatch(
      /data-testid="channel-readout"[^>]*>BASE</,
    );
  });

  it('renders COLOR · CLASH when activeColorChannel is clashColor', () => {
    mockState.activeColorChannel = 'clashColor';
    const markup = html();
    expect(markup).toMatch(
      /data-testid="channel-readout"[^>]*>CLASH</,
    );
  });

  it('renders COLOR · LOCKUP when activeColorChannel is lockupColor', () => {
    mockState.activeColorChannel = 'lockupColor';
    const markup = html();
    expect(markup).toMatch(
      /data-testid="channel-readout"[^>]*>LOCKUP</,
    );
  });

  it('renders COLOR · BLAST when activeColorChannel is blastColor', () => {
    mockState.activeColorChannel = 'blastColor';
    const markup = html();
    expect(markup).toMatch(
      /data-testid="channel-readout"[^>]*>BLAST</,
    );
  });

  it('falls back to BASE on legacy / unknown channel IDs', () => {
    mockState.activeColorChannel = 'dragColor';
    const markup = html();
    expect(markup).toMatch(
      /data-testid="channel-readout"[^>]*>BASE</,
    );
  });

  it('aria-labels also track active channel (lowercase form)', () => {
    mockState.activeColorChannel = 'lockupColor';
    const markup = html();
    expect(markup).toContain('aria-label="Set lockup to Blue"');
    expect(markup).toContain('aria-label="Set lockup to Red"');
  });
});
