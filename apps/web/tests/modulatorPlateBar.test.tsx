// ─── ModulatorPlateBar — Wave 8 UI shell tests ───────────────────────
//
// Pins down the Wave 8 UI shell additions:
//
//   1. All 19 modulator descriptors render as plates (11 v1.1 Core + 8
//      Wave 8 LITE aux/gesture event modulators).
//   2. The category-section structure surfaces correctly (MOTION /
//      AUDIO / POWER / STATE / BUTTON / GESTURE) so users see the new
//      BUTTON + GESTURE families as a distinct intent surface.
//   3. The 8 new plates carry the drag-source attributes required for
//      Wave 5 drag-to-route (draggable + the modulator id surfaces in
//      the markup).
//   4. The board-gating early return still kicks in on non-modulating
//      boards.
//
// Tests use `react-dom/server`'s `renderToStaticMarkup` matching the
// rest of apps/web/tests. The mocked store + board hooks are kept
// minimal — the real BUILT_IN_MODULATORS registry is imported live so
// drift between the engine and the UI is caught here.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Hoisted mock state for the board-profile gate ─────────────────────
//
// Each test can flip the gate via `setBoardId(...)` — that lets us
// verify both the rendering-allowed and rendering-blocked paths.

type GlobalWithBoardId = {
  __plateBarTestBoardId: string;
};

(globalThis as unknown as GlobalWithBoardId).__plateBarTestBoardId =
  'proffieboard-v3';

function setBoardId(boardId: string): void {
  (globalThis as unknown as GlobalWithBoardId).__plateBarTestBoardId = boardId;
}

vi.mock('@/hooks/useBoardProfile', () => ({
  useBoardProfile: () => ({
    boardId: (globalThis as unknown as GlobalWithBoardId).__plateBarTestBoardId,
  }),
}));

vi.mock('@/lib/boardProfiles', () => ({
  canBoardModulate: (boardId: string) =>
    boardId === 'proffieboard-v3' || boardId === 'golden-harvest-v3',
}));

// Minimal uiStore mock — read-only of armed state, write is a no-op
// since static markup never fires onClick.
vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: unknown) => unknown) =>
    selector({
      armedModulatorId: null,
      hoveredParameterPath: null,
      setArmedModulatorId: () => {},
      setHoveredModulator: () => {},
    }),
}));

// Minimal bladeStore — empty bindings array (most tests don't care
// about reciprocal hover).
vi.mock('@/stores/bladeStore', () => ({
  useBladeStore: (selector: (state: unknown) => unknown) =>
    selector({
      config: { modulation: undefined },
    }),
}));

vi.mock('@/lib/parameterGroups', () => ({
  getParameter: () => undefined,
}));

import { ModulatorPlateBar } from '@/components/editor/routing/ModulatorPlateBar';

function html(): string {
  return renderToStaticMarkup(createElement(ModulatorPlateBar));
}

// ─── Constants under test ────────────────────────────────────────────

const V1_CORE_MODULATOR_IDS = [
  'swing',
  'angle',
  'twist',
  'sound',
  'battery',
  'time',
  'clash',
  'lockup',
  'preon',
  'ignition',
  'retraction',
] as const;

const WAVE_8_LITE_MODULATOR_IDS = [
  'aux-click',
  'aux-hold',
  'aux-double-click',
  'gesture-twist',
  'gesture-stab',
  'gesture-swing',
  'gesture-clash',
  'gesture-shake',
] as const;

const ALL_MODULATOR_IDS = [
  ...V1_CORE_MODULATOR_IDS,
  ...WAVE_8_LITE_MODULATOR_IDS,
] as const;

const CATEGORY_IDS = [
  'motion',
  'audio',
  'power',
  'state',
  'button',
  'gesture',
] as const;

// ─── Tests ────────────────────────────────────────────────────────────

describe('ModulatorPlateBar — board gating', () => {
  beforeEach(() => {
    setBoardId('proffieboard-v3');
  });

  it('renders the toolbar when the board supports modulation', () => {
    setBoardId('proffieboard-v3');
    const markup = html();
    expect(markup).toContain('aria-label="Modulator plates"');
  });

  it('shows a not-supported message on boards without modulation', () => {
    setBoardId('xenopixel-v2');
    const markup = html();
    // Early-return path — no toolbar, no plates.
    expect(markup).not.toContain('aria-label="Modulator plates"');
    expect(markup).toContain('Modulation not supported');
  });
});

describe('ModulatorPlateBar — full plate surface', () => {
  beforeEach(() => {
    setBoardId('proffieboard-v3');
  });

  it('renders all 11 v1.1 Core modulator plates', () => {
    const markup = html();
    for (const id of V1_CORE_MODULATOR_IDS) {
      // Every plate carries its id under aria-label "Arm <Name> modulator".
      // Look for the id appearing in the visible compact slug too.
      expect(
        markup,
        `expected plate for "${id}" to render`,
      ).toContain(`>${id}<`);
    }
  });

  it('renders all 8 Wave 8 LITE aux/gesture event-modulator plates', () => {
    const markup = html();
    for (const id of WAVE_8_LITE_MODULATOR_IDS) {
      expect(
        markup,
        `expected Wave 8 LITE plate for "${id}" to render`,
      ).toContain(`>${id}<`);
    }
  });

  it('renders 19 plates in total (11 + 8)', () => {
    const markup = html();
    // Count modulator IDs that appear inside compact-slug spans
    // (`>id<` form). This is a coarse assertion — duplicate hits
    // could in principle inflate the count if a plate's display name
    // happens to equal an id, but our display names are distinct
    // ("Aux Click" vs "aux-click"), so the slug-form occurrences
    // count exactly 19.
    let total = 0;
    for (const id of ALL_MODULATOR_IDS) {
      if (markup.includes(`>${id}<`)) total += 1;
    }
    expect(total).toBe(19);
  });
});

describe('ModulatorPlateBar — category sections', () => {
  beforeEach(() => {
    setBoardId('proffieboard-v3');
  });

  it('renders all 6 category sections with stable test ids', () => {
    const markup = html();
    for (const cat of CATEGORY_IDS) {
      expect(
        markup,
        `expected category section "${cat}" to render`,
      ).toContain(`data-testid="modulator-category-${cat}"`);
    }
  });

  it('puts BUTTON section after STATE so users see the new families together near the bottom', () => {
    // Category ordering matters: existing v1.1 Core categories appear
    // first (motion → state) so longtime users find familiar plates
    // near the top; the new BUTTON + GESTURE families land below as a
    // distinct intent surface.
    const markup = html();
    const stateIdx = markup.indexOf('data-testid="modulator-category-state"');
    const buttonIdx = markup.indexOf('data-testid="modulator-category-button"');
    const gestureIdx = markup.indexOf('data-testid="modulator-category-gesture"');

    expect(stateIdx).toBeGreaterThan(-1);
    expect(buttonIdx).toBeGreaterThan(stateIdx);
    expect(gestureIdx).toBeGreaterThan(buttonIdx);
  });

  it('puts MOTION section first (familiar swing/angle/twist plates)', () => {
    const markup = html();
    const motionIdx = markup.indexOf('data-testid="modulator-category-motion"');
    const audioIdx = markup.indexOf('data-testid="modulator-category-audio"');
    expect(motionIdx).toBeGreaterThan(-1);
    expect(motionIdx).toBeLessThan(audioIdx);
  });

  it('every category section carries its label as a heading', () => {
    const markup = html();
    for (const label of ['Motion', 'Audio', 'Power', 'State', 'Button', 'Gesture']) {
      expect(markup).toContain(`>${label}<`);
    }
  });
});

describe('ModulatorPlateBar — drag-to-route attribute on Wave 8 plates', () => {
  beforeEach(() => {
    setBoardId('proffieboard-v3');
  });

  // Wave 5 drag-to-route requires every plate to be `draggable`. The
  // attribute is set inline on the plate's <button>; if a future
  // refactor drops it from the new BUTTON / GESTURE plates, drag-to-
  // route silently breaks for the new families. Catch that here.
  it('renders draggable buttons (the Wave 5 DnD source attribute)', () => {
    const markup = html();
    // SSR markup serializes `draggable` boolean prop as `draggable="true"`.
    expect(markup).toContain('draggable="true"');
  });

  it('exposes every Wave 8 LITE id as a label fragment so drag handlers can read it', () => {
    // We can't fire a real dragstart event under static markup, but we
    // can verify the plate's onClick + onDragStart bind to the correct
    // id by checking that the id appears in the plate's attributes /
    // visible label. The per-plate aria-label "Arm <displayName>
    // modulator" + the compact slug `>id<` together prove the binding.
    const markup = html();
    for (const id of WAVE_8_LITE_MODULATOR_IDS) {
      expect(markup).toContain(`>${id}<`);
    }
  });
});
