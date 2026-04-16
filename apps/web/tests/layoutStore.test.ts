import { describe, it, expect, beforeEach } from 'vitest';
import {
  useLayoutStore,
  DEFAULT_COLUMN_ASSIGNMENT,
  PANEL_DEFINITIONS,
  type PanelId,
  type TabId,
} from '../stores/layoutStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Reset the store to its structural defaults before each test. */
function resetStore() {
  useLayoutStore.setState({
    columns: structuredClone(DEFAULT_COLUMN_ASSIGNMENT) as typeof DEFAULT_COLUMN_ASSIGNMENT,
    columnCount: 4,
    collapsedPanels: new Set<PanelId>(),
    savedPresets: [],
  });
}

// Collect all panel IDs for a specific tab from PANEL_DEFINITIONS
function panelsForTab(tab: TabId): PanelId[] {
  return PANEL_DEFINITIONS.filter((p) => p.tab === tab).map((p) => p.id);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('layoutStore — default column assignment', () => {
  beforeEach(resetStore);

  it('design tab has 4 columns', () => {
    const { columns } = useLayoutStore.getState();
    expect(columns.design).toHaveLength(4);
  });

  it('every design panel appears in exactly one column', () => {
    const { columns } = useLayoutStore.getState();
    const allInColumns = columns.design.flat();
    const expected = panelsForTab('design');
    expect(allInColumns.sort()).toEqual(expected.sort());
  });

  it('dynamics tab contains all 4 expected panels', () => {
    const { columns } = useLayoutStore.getState();
    const allInColumns = columns.dynamics.flat();
    const expected = panelsForTab('dynamics');
    expect(allInColumns.sort()).toEqual(expected.sort());
  });

  it('audio tab contains all 4 expected panels', () => {
    const { columns } = useLayoutStore.getState();
    const allInColumns = columns.audio.flat();
    const expected = panelsForTab('audio');
    expect(allInColumns.sort()).toEqual(expected.sort());
  });

  it('gallery tab contains all 4 expected panels', () => {
    const { columns } = useLayoutStore.getState();
    const allInColumns = columns.gallery.flat();
    const expected = panelsForTab('gallery');
    expect(allInColumns.sort()).toEqual(expected.sort());
  });

  it('output tab contains all 5 expected panels', () => {
    const { columns } = useLayoutStore.getState();
    const allInColumns = columns.output.flat();
    const expected = panelsForTab('output');
    expect(allInColumns.sort()).toEqual(expected.sort());
  });

  it('style-select is in design column 0', () => {
    const { columns } = useLayoutStore.getState();
    expect(columns.design[0]).toContain('style-select');
  });

  it('color-picker is in design column 0 after style-select', () => {
    const { columns } = useLayoutStore.getState();
    const col = columns.design[0];
    expect(col.indexOf('style-select')).toBeLessThan(col.indexOf('color-picker'));
  });

  it('code-output is in output column 0', () => {
    const { columns } = useLayoutStore.getState();
    expect(columns.output[0]).toContain('code-output');
  });

  it('card-writer is in output column 3', () => {
    const { columns } = useLayoutStore.getState();
    expect(columns.output[3]).toContain('card-writer');
  });
});

describe('layoutStore — movePanelToColumn', () => {
  beforeEach(resetStore);

  it('moves a panel to a different column within the same tab', () => {
    const store = useLayoutStore.getState();

    // 'parameters' starts in design column 1; move it to column 3
    store.movePanelToColumn('design', 'parameters', 3, 0);

    const { columns } = useLayoutStore.getState();
    expect(columns.design[3]).toContain('parameters');
    expect(columns.design[1]).not.toContain('parameters');
  });

  it('removes the panel from its original column', () => {
    const { columns: before } = useLayoutStore.getState();
    // Confirm starting position
    expect(before.design[0]).toContain('style-select');

    useLayoutStore.getState().movePanelToColumn('design', 'style-select', 2, 0);

    const { columns: after } = useLayoutStore.getState();
    expect(after.design[0]).not.toContain('style-select');
    expect(after.design[2]).toContain('style-select');
  });

  it('inserts at the correct position within the target column', () => {
    // Move 'layer-stack' (currently in design col 2) to col 0 at index 0 (before style-select)
    useLayoutStore.getState().movePanelToColumn('design', 'layer-stack', 0, 0);

    const { columns } = useLayoutStore.getState();
    expect(columns.design[0][0]).toBe('layer-stack');
  });

  it('clamps targetIndex to valid range (beyond end inserts at end)', () => {
    // Column 3 of design currently has only 'oled-preview'; insert at index 99 should append
    useLayoutStore.getState().movePanelToColumn('design', 'randomizer', 3, 99);

    const { columns } = useLayoutStore.getState();
    const col3 = columns.design[3];
    expect(col3[col3.length - 1]).toBe('randomizer');
  });

  it('total panel count for the tab is unchanged after move', () => {
    const before = useLayoutStore.getState().columns.design.flat().length;
    useLayoutStore.getState().movePanelToColumn('design', 'color-picker', 3, 0);
    const after = useLayoutStore.getState().columns.design.flat().length;
    expect(after).toBe(before);
  });
});

describe('layoutStore — reorderPanelInColumn', () => {
  beforeEach(resetStore);

  it('swaps two panels within a column', () => {
    // Design column 0 has: ['style-select', 'color-picker']
    useLayoutStore.getState().reorderPanelInColumn('design', 0, 0, 1);

    const { columns } = useLayoutStore.getState();
    expect(columns.design[0][0]).toBe('color-picker');
    expect(columns.design[0][1]).toBe('style-select');
  });

  it('is a no-op when fromIndex equals toIndex', () => {
    const before = [...useLayoutStore.getState().columns.design[0]];
    useLayoutStore.getState().reorderPanelInColumn('design', 0, 0, 0);
    const after = useLayoutStore.getState().columns.design[0];
    expect(after).toEqual(before);
  });

  it('is a no-op when fromIndex is out of range', () => {
    const before = [...useLayoutStore.getState().columns.design[0]];
    useLayoutStore.getState().reorderPanelInColumn('design', 0, 99, 0);
    const after = useLayoutStore.getState().columns.design[0];
    expect(after).toEqual(before);
  });

  it('column length is unchanged after reorder', () => {
    const len = useLayoutStore.getState().columns.design[0].length;
    useLayoutStore.getState().reorderPanelInColumn('design', 0, 0, 1);
    expect(useLayoutStore.getState().columns.design[0]).toHaveLength(len);
  });
});

describe('layoutStore — togglePanelCollapsed', () => {
  beforeEach(resetStore);

  it('collapses an uncollapsed panel', () => {
    useLayoutStore.getState().togglePanelCollapsed('color-picker');
    expect(useLayoutStore.getState().collapsedPanels.has('color-picker')).toBe(true);
  });

  it('expands a collapsed panel', () => {
    useLayoutStore.setState({
      collapsedPanels: new Set<PanelId>(['color-picker']),
    });
    useLayoutStore.getState().togglePanelCollapsed('color-picker');
    expect(useLayoutStore.getState().collapsedPanels.has('color-picker')).toBe(false);
  });

  it('toggling twice restores original state', () => {
    useLayoutStore.getState().togglePanelCollapsed('parameters');
    useLayoutStore.getState().togglePanelCollapsed('parameters');
    expect(useLayoutStore.getState().collapsedPanels.has('parameters')).toBe(false);
  });

  it('can collapse multiple panels independently', () => {
    useLayoutStore.getState().togglePanelCollapsed('color-picker');
    useLayoutStore.getState().togglePanelCollapsed('layer-stack');
    const { collapsedPanels } = useLayoutStore.getState();
    expect(collapsedPanels.has('color-picker')).toBe(true);
    expect(collapsedPanels.has('layer-stack')).toBe(true);
    expect(collapsedPanels.has('parameters')).toBe(false);
  });
});

describe('layoutStore — setColumnCount', () => {
  beforeEach(resetStore);

  it('sets a valid column count', () => {
    useLayoutStore.getState().setColumnCount(2);
    expect(useLayoutStore.getState().columnCount).toBe(2);
  });

  it('clamps to minimum of 1', () => {
    useLayoutStore.getState().setColumnCount(0);
    expect(useLayoutStore.getState().columnCount).toBe(1);
  });

  it('clamps to maximum of 4', () => {
    useLayoutStore.getState().setColumnCount(99);
    expect(useLayoutStore.getState().columnCount).toBe(4);
  });

  it('accepts all valid values 1-4', () => {
    for (const count of [1, 2, 3, 4]) {
      useLayoutStore.getState().setColumnCount(count);
      expect(useLayoutStore.getState().columnCount).toBe(count);
    }
  });
});

describe('layoutStore — preset lifecycle (savePreset / loadPreset / deletePreset)', () => {
  beforeEach(resetStore);

  it('savePreset adds a new preset to savedPresets', () => {
    useLayoutStore.getState().savePreset('My Layout');
    expect(useLayoutStore.getState().savedPresets).toHaveLength(1);
    expect(useLayoutStore.getState().savedPresets[0].name).toBe('My Layout');
  });

  it('savePreset stores a snapshot of the current columns', () => {
    // Move a panel so the columns differ from defaults
    useLayoutStore.getState().movePanelToColumn('design', 'oled-preview', 0, 0);
    useLayoutStore.getState().savePreset('Custom');

    const preset = useLayoutStore.getState().savedPresets[0];
    expect(preset.columns.design[0]).toContain('oled-preview');
  });

  it('savePreset assigns a unique id to each preset', () => {
    useLayoutStore.getState().savePreset('A');
    useLayoutStore.getState().savePreset('B');
    const [a, b] = useLayoutStore.getState().savedPresets;
    expect(a.id).not.toBe(b.id);
  });

  it('savePreset trims blank names to "My Layout"', () => {
    useLayoutStore.getState().savePreset('   ');
    expect(useLayoutStore.getState().savedPresets[0].name).toBe('My Layout');
  });

  it('loadPreset applies saved columns to the current store', () => {
    // Save a layout with oled-preview moved to column 0
    useLayoutStore.getState().movePanelToColumn('design', 'oled-preview', 0, 0);
    useLayoutStore.getState().savePreset('Modified');
    const presetId = useLayoutStore.getState().savedPresets[0].id;

    // Reset to defaults, then load the preset
    useLayoutStore.getState().resetToDefaults();
    expect(useLayoutStore.getState().columns.design[0]).not.toContain('oled-preview');

    useLayoutStore.getState().loadPreset(presetId);
    expect(useLayoutStore.getState().columns.design[0]).toContain('oled-preview');
  });

  it('loadPreset is a no-op for an unknown id', () => {
    const before = [...useLayoutStore.getState().columns.design[0]];
    useLayoutStore.getState().loadPreset('nonexistent-id');
    expect(useLayoutStore.getState().columns.design[0]).toEqual(before);
  });

  it('deletePreset removes the preset by id', () => {
    useLayoutStore.getState().savePreset('ToDelete');
    const id = useLayoutStore.getState().savedPresets[0].id;
    useLayoutStore.getState().deletePreset(id);
    expect(useLayoutStore.getState().savedPresets).toHaveLength(0);
  });

  it('deletePreset leaves other presets intact', () => {
    useLayoutStore.getState().savePreset('Keep');
    useLayoutStore.getState().savePreset('Remove');
    const removeId = useLayoutStore.getState().savedPresets[1].id;
    useLayoutStore.getState().deletePreset(removeId);

    const remaining = useLayoutStore.getState().savedPresets;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('Keep');
  });
});

describe('layoutStore — resetToDefaults', () => {
  beforeEach(resetStore);

  it('restores the default column assignment', () => {
    useLayoutStore.getState().movePanelToColumn('design', 'oled-preview', 0, 0);
    useLayoutStore.getState().resetToDefaults();

    const { columns } = useLayoutStore.getState();
    expect(columns.design[3]).toContain('oled-preview');
    expect(columns.design[0]).not.toContain('oled-preview');
  });

  it('resets columnCount to 4', () => {
    useLayoutStore.getState().setColumnCount(2);
    useLayoutStore.getState().resetToDefaults();
    expect(useLayoutStore.getState().columnCount).toBe(4);
  });

  it('clears all collapsed panels', () => {
    useLayoutStore.getState().togglePanelCollapsed('color-picker');
    useLayoutStore.getState().togglePanelCollapsed('layer-stack');
    useLayoutStore.getState().resetToDefaults();
    expect(useLayoutStore.getState().collapsedPanels.size).toBe(0);
  });

  it('does not clear saved presets', () => {
    useLayoutStore.getState().savePreset('Keep Me');
    useLayoutStore.getState().resetToDefaults();
    expect(useLayoutStore.getState().savedPresets).toHaveLength(1);
  });
});
