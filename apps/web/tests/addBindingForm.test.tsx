// ─── AddBindingForm — Wave 8 UI shell tests ──────────────────────────
//
// Pins down the source dropdown's grouping after Wave 8 UI shell
// (2026-05-01) added 8 aux/gesture event modulators. The form's source
// dropdown now renders <optgroup> elements matching the categorization
// in ModulatorPlateBar (Motion / Audio / Power / State / Button /
// Gesture) so users see the same mental model in both surfaces.
//
// Coverage:
//
//   1. All 19 modulator IDs appear as <option> in the source dropdown.
//   2. Each of the 6 <optgroup> labels appears.
//   3. The 8 new aux/gesture IDs are present (drift sentinel for any
//      future SOURCE_GROUPS reshape).
//   4. Form is hidden on boards without modulation.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// Hoisted board-id slot for the gating test.
type GlobalWithBoardId = {
  __addBindingFormTestBoardId: string;
};

(globalThis as unknown as GlobalWithBoardId).__addBindingFormTestBoardId =
  'proffieboard-v3';

function setBoardId(boardId: string): void {
  (globalThis as unknown as GlobalWithBoardId).__addBindingFormTestBoardId = boardId;
}

vi.mock('@/hooks/useBoardProfile', () => ({
  useBoardProfile: () => ({
    boardId: (globalThis as unknown as GlobalWithBoardId)
      .__addBindingFormTestBoardId,
  }),
}));

vi.mock('@/lib/boardProfiles', () => ({
  canBoardModulate: (boardId: string) =>
    boardId === 'proffieboard-v3' || boardId === 'golden-harvest-v3',
}));

vi.mock('@/stores/bladeStore', () => ({
  useBladeStore: (selector: (state: unknown) => unknown) =>
    selector({
      addBinding: () => {},
    }),
}));

vi.mock('@/lib/parameterGroups', () => ({
  getModulatableParameters: () => [
    { path: 'shimmer', displayName: 'Shimmer' },
    { path: 'baseColor.r', displayName: 'Base Red' },
  ],
}));

import { AddBindingForm } from '@/components/editor/routing/AddBindingForm';

function html(): string {
  return renderToStaticMarkup(createElement(AddBindingForm));
}

const ALL_MODULATOR_IDS = [
  // v1.1 Core
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
  // Wave 8 LITE
  'aux-click',
  'aux-hold',
  'aux-double-click',
  'gesture-twist',
  'gesture-stab',
  'gesture-swing',
  'gesture-clash',
  'gesture-shake',
] as const;

const OPTGROUP_LABELS = [
  'Motion',
  'Audio',
  'Power',
  'State',
  'Button',
  'Gesture',
] as const;

describe('AddBindingForm — board gating', () => {
  beforeEach(() => {
    setBoardId('proffieboard-v3');
  });

  it('renders the form when the board supports modulation', () => {
    setBoardId('proffieboard-v3');
    const markup = html();
    expect(markup).toContain('aria-label="Create modulation binding"');
  });

  it('returns null on non-modulating boards', () => {
    setBoardId('xenopixel-v2');
    expect(html()).toBe('');
  });
});

describe('AddBindingForm — source dropdown population', () => {
  beforeEach(() => {
    setBoardId('proffieboard-v3');
  });

  it('renders an <option value="<id>"> for every one of the 19 built-in modulators', () => {
    const markup = html();
    for (const id of ALL_MODULATOR_IDS) {
      expect(
        markup,
        `expected <option value="${id}"> in dropdown`,
      ).toContain(`value="${id}"`);
    }
  });

  it('renders an <optgroup> for every category', () => {
    const markup = html();
    for (const label of OPTGROUP_LABELS) {
      expect(markup).toContain(`label="${label}"`);
    }
  });

  it('Button optgroup precedes Gesture optgroup so users find aux events first', () => {
    const markup = html();
    const buttonIdx = markup.indexOf('label="Button"');
    const gestureIdx = markup.indexOf('label="Gesture"');
    expect(buttonIdx).toBeGreaterThan(-1);
    expect(gestureIdx).toBeGreaterThan(buttonIdx);
  });

  it('every Wave 8 LITE modulator surfaces as an <option>', () => {
    // Drift sentinel — if SOURCE_GROUPS drops one of the 8, the source
    // dropdown silently loses an entry. Catch here.
    const markup = html();
    const wave8Ids = [
      'aux-click',
      'aux-hold',
      'aux-double-click',
      'gesture-twist',
      'gesture-stab',
      'gesture-swing',
      'gesture-clash',
      'gesture-shake',
    ];
    for (const id of wave8Ids) {
      expect(markup).toContain(`value="${id}"`);
    }
  });
});
