// ─── MySaberAB — Sidebar A/B v2 Phase 4c contract tests ───────────────
//
// Pin down the my-saber A/B section's contracts:
//
//   1. Column A renders one row per profile in saberProfileStore.
//   2. Column A's active row matches `activeProfileId`.
//   3. Column A renders the "+ New Profile" affordance.
//   4. Column A renders the empty-state message when there are 0 profiles.
//   5. Column A surfaces each profile's chassis + LED count + board.
//   6. Column B's header reflects the active profile's name.
//   7. Column B's header falls back to "My Saber" when no profile is active.
//   8. Column B mounts SaberProfileManager (the spec's character sheet).
//   9. The MySaberAB wrapper composes Column A + Column B + the
//      MainContentABLayout split shell (data-mainab-layout="split").
//
// Pattern matches `colorPanel.test.tsx` — the apps/web vitest env is
// node-only, and Zustand v4's React binding pins `getServerSnapshot` to
// `getInitialState()` (see `node_modules/zustand/esm/react.mjs`), so we
// must hoist a mock state object and intercept the hook entirely. The
// hoisted-mock pattern lets us drive multiple render variants from one
// suite by mutating the mock object before each `renderToStaticMarkup`.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { SaberProfile } from '@/stores/saberProfileStore';

// ── Hoisted mock state — mutate before each render ──────────────────

interface MockBladeConfig {
  baseColor: { r: number; g: number; b: number };
  ledCount: number;
  [key: string]: unknown;
}

const mockState = vi.hoisted(() => ({
  profiles: [] as SaberProfile[],
  activeProfileId: null as string | null,
  switchCalls: [] as string[],
  createCalls: [] as string[],
}));

// Helper for tests to build a SaberProfile fixture without re-typing
// every required field. Defined here so it sits beside the mock state
// and the helper-vs-mock relationship is clear.
function makeProfile(overrides: Partial<SaberProfile> & { id: string; name: string }): SaberProfile {
  const config: MockBladeConfig = {
    baseColor: { r: 0, g: 140, b: 255 },
    ledCount: 144,
  };
  // Keep `id` + `name` out of the spread base so the explicit values
  // below win deterministically (TypeScript flags later spread keys
  // overwriting earlier ones, which masks intent).
  const { id, name, ...rest } = overrides;
  return {
    id,
    name,
    chassisType: '',
    boardType: 'Proffie V3',
    cardSize: '16GB',
    presetEntries: [],
    fontAssignments: {},
    cardConfigs: [
      {
        id: `${id}-cc-1`,
        name: 'Default',
        entries: [
          {
            id: `${id}-entry-1`,
            order: 0,
            presetName: 'First Preset',
            fontName: 'first',
            source: { type: 'inline' },
            config: config as unknown as SaberProfile['cardConfigs'][number]['entries'][number]['config'],
          },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    activeCardConfigId: `${id}-cc-1`,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...rest,
  };
}

// Replace useSaberProfileStore so its selector reads from the hoisted
// mockState. We expose getState + setState so the wrapper test that
// reaches for `useSaberProfileStore.setState(...)` (which it doesn't
// today, but might on a future polish pass) doesn't blow up.
vi.mock('@/stores/saberProfileStore', () => {
  const buildState = () => ({
    profiles: mockState.profiles,
    activeProfileId: mockState.activeProfileId,
    switchProfile: (id: string) => {
      mockState.switchCalls.push(id);
      mockState.activeProfileId = id;
    },
    createProfile: (name: string) => {
      mockState.createCalls.push(name);
      const created = makeProfile({ id: `new-${mockState.createCalls.length}`, name });
      mockState.profiles = [...mockState.profiles, created];
      if (mockState.activeProfileId == null) {
        mockState.activeProfileId = created.id;
      }
      return created;
    },
    // The legacy SaberProfileManager pulls a wider surface than Column A
    // does. Mock the rest as no-ops so it can render without throwing.
    duplicateProfile: () => null,
    deleteProfile: () => {},
    updateProfile: () => {},
    exportProfile: () => null,
    importProfile: () => null,
    copyPresetsToProfile: () => {},
    getActiveProfile: () => null,
    addCardConfig: () => '',
    deleteCardConfig: () => {},
    renameCardConfig: () => {},
    duplicateCardConfig: () => '',
    setActiveCardConfig: () => {},
    getActiveCardConfig: () => null,
    addCardEntry: () => '',
    removeCardEntry: () => {},
    updateCardEntry: () => {},
    reorderCardEntries: () => {},
  });

  const useSaberProfileStore = ((selector: (s: unknown) => unknown) =>
    selector(buildState())) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => Record<string, unknown>;
    setState: (partial: Record<string, unknown>) => void;
  };
  useSaberProfileStore.getState = () => buildState();
  useSaberProfileStore.setState = (partial) => {
    if (typeof partial === 'object' && partial !== null) {
      Object.assign(mockState, partial);
    }
  };
  return { useSaberProfileStore };
});

// uiStore — Column B is the only consumer that reaches into uiStore,
// and only via the MainContentABLayout wrapper (columnAWidth /
// useABLayout). Mount real uiStore here; mainContentABLayout's own
// tests already exercise its contract.
//
// Other stores SaberProfileManager touches:
//   - bladeStore (config) — drives the fallback config path; mock
//     enough surface that the legacy component renders without
//     throwing.
//   - audioFontStore (fontName) — read inside EquippedFontBlock.

vi.mock('@/stores/bladeStore', () => {
  const config = {
    name: 'Default',
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
  };
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector({ config })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => Record<string, unknown>;
    setState: () => void;
  };
  useBladeStore.getState = () => ({ config });
  useBladeStore.setState = () => {};
  return { useBladeStore };
});

vi.mock('@/stores/audioFontStore', () => {
  const useAudioFontStore = ((selector: (s: unknown) => unknown) =>
    selector({ fontName: null })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => Record<string, unknown>;
  };
  useAudioFontStore.getState = () => ({ fontName: null });
  return { useAudioFontStore };
});

// uiSounds is invoked by Column A's create/select handlers — a no-op
// keeps the suite running without playing audio in node.
vi.mock('@/lib/uiSounds', () => ({ playUISound: () => {} }));

// MainContentABLayout reaches into uiStore (columnAWidth, useABLayout).
// It's already covered by mainContentABLayout.test.tsx; here we just
// need it to render without crashing so the wrapper test can verify
// composition. Real wrapper has all the data-mainab-* attributes we
// assert on, so we let it run as-is rather than mocking it.

// ── Now import the components under test (after mocks are set up) ──

import { MySaberAB } from '@/components/editor/my-saber';
import { MySaberColumnA } from '@/components/editor/my-saber/MySaberColumnA';
import { MySaberColumnB } from '@/components/editor/my-saber/MySaberColumnB';

// ── Suite ──────────────────────────────────────────────────────────

function reset(): void {
  mockState.profiles = [];
  mockState.activeProfileId = null;
  mockState.switchCalls = [];
  mockState.createCalls = [];
}

describe('MySaberColumnA — profile list', () => {
  beforeEach(reset);

  it('renders the "+ New Profile" affordance at the top of A', () => {
    const html = renderToStaticMarkup(createElement(MySaberColumnA));
    expect(html).toContain('+ New Profile');
  });

  it('renders the empty-state message when there are no profiles', () => {
    const html = renderToStaticMarkup(createElement(MySaberColumnA));
    expect(html).toContain('No saber profiles yet');
  });

  it('renders one row per profile in saberProfileStore', () => {
    mockState.profiles = [
      makeProfile({ id: 'p1', name: 'Anakin Prequel' }),
      makeProfile({ id: 'p2', name: 'Obi-Wan ANH' }),
      makeProfile({ id: 'p3', name: 'Luke ROTJ' }),
    ];
    mockState.activeProfileId = 'p1';

    const html = renderToStaticMarkup(createElement(MySaberColumnA));

    expect(html).toContain('Anakin Prequel');
    expect(html).toContain('Obi-Wan ANH');
    expect(html).toContain('Luke ROTJ');
    // Three list rows, each carrying the per-row id pattern from the
    // component (`my-saber-row-<id>`).
    expect(html).toContain('id="my-saber-row-p1"');
    expect(html).toContain('id="my-saber-row-p2"');
    expect(html).toContain('id="my-saber-row-p3"');
  });

  it('marks the active row with aria-selected="true"', () => {
    mockState.profiles = [
      makeProfile({ id: 'p1', name: 'Active' }),
      makeProfile({ id: 'p2', name: 'Inactive' }),
    ];
    mockState.activeProfileId = 'p1';

    const html = renderToStaticMarkup(createElement(MySaberColumnA));

    // Active row: aria-selected="true" + accent text class.
    const activeMatch = html.match(/id="my-saber-row-p1"[^>]*aria-selected="true"/);
    expect(activeMatch).not.toBeNull();

    // Inactive row: aria-selected="false".
    const inactiveMatch = html.match(/id="my-saber-row-p2"[^>]*aria-selected="false"/);
    expect(inactiveMatch).not.toBeNull();
  });

  it('surfaces chassis, LED count, and board for each profile', () => {
    mockState.profiles = [
      makeProfile({ id: 'p1', name: 'My Saber 1', chassisType: '89sabers Vader', boardType: 'Proffie V3' }),
    ];
    mockState.activeProfileId = 'p1';

    const html = renderToStaticMarkup(createElement(MySaberColumnA));

    expect(html).toContain('89sabers Vader');
    // makeProfile defaults baseColor + ledCount: 144.
    expect(html).toContain('144 LEDs');
    expect(html).toContain('Proffie V3');
  });

  it('falls back to "—" for chassis when blank', () => {
    mockState.profiles = [
      makeProfile({ id: 'p1', name: 'Unconfigured', chassisType: '' }),
    ];
    mockState.activeProfileId = 'p1';

    const html = renderToStaticMarkup(createElement(MySaberColumnA));
    // The em-dash placeholder appears inside the chassis row.
    expect(html).toContain('Unconfigured');
    expect(html).toMatch(/Unconfigured[\s\S]*?—/);
  });

  it('falls back to "No presets yet" when the active config has no entries', () => {
    const profile = makeProfile({ id: 'p1', name: 'Empty' });
    profile.cardConfigs[0].entries = [];

    mockState.profiles = [profile];
    mockState.activeProfileId = 'p1';

    const html = renderToStaticMarkup(createElement(MySaberColumnA));
    expect(html).toContain('No presets yet');
  });
});

describe('MySaberColumnB — character sheet shell', () => {
  beforeEach(reset);

  it('renders the header label using the active profile name', () => {
    mockState.profiles = [
      makeProfile({ id: 'p1', name: 'Vader ANH', chassisType: '89sabers Vader' }),
    ];
    mockState.activeProfileId = 'p1';

    const html = renderToStaticMarkup(createElement(MySaberColumnB));
    expect(html).toContain('data-testid="my-saber-column-b-header"');
    expect(html).toContain('Vader ANH');
    expect(html).toContain('89sabers Vader');
  });

  it('falls back to "My Saber" when no profile is active', () => {
    const html = renderToStaticMarkup(createElement(MySaberColumnB));
    expect(html).toContain('My Saber');
  });

  it('mounts SaberProfileManager — its panel header lives in the body', () => {
    mockState.profiles = [makeProfile({ id: 'p1', name: 'Test' })];
    mockState.activeProfileId = 'p1';

    const html = renderToStaticMarkup(createElement(MySaberColumnB));
    // SaberProfileManager renders a "Saber Profiles" h3 in its panel
    // header — the marker we use to confirm the legacy component is
    // mounted under Column B.
    expect(html).toContain('Saber Profiles');
  });
});

describe('MySaberAB — wrapper composes the AB layout split shell', () => {
  beforeEach(reset);

  it('renders the MainContentABLayout split shape with both columns', () => {
    mockState.profiles = [makeProfile({ id: 'p1', name: 'Test' })];
    mockState.activeProfileId = 'p1';

    const html = renderToStaticMarkup(createElement(MySaberAB));

    // MainContentABLayout split shell.
    expect(html).toContain('data-mainab-layout="split"');
    expect(html).toContain('data-mainab-column="a"');
    expect(html).toContain('data-mainab-column="b"');

    // Column A's body marker.
    expect(html).toContain('data-testid="my-saber-column-a"');
    // Column B's body marker.
    expect(html).toContain('data-testid="my-saber-column-b"');
    // Resize handle's a11y label is the wrapper's resizeLabel prop.
    expect(html).toContain('Profile list width');
  });
});
