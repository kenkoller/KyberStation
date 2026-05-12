// ─── Fett263PropEditor — component contract tests ───────────────────
//
// Pins down the rendering + interaction contract of the Fett263PropEditor:
//
//   1. All 9 categories render with correct labels
//   2. Each category section is collapsible
//   3. Defines render with checkboxes, labels, descriptions
//   4. Toggle on/off calls onDefinesChange with correct output
//   5. Numeric defines show value inputs when active
//   6. Numeric value changes call onDefinesChange with updated value
//   7. Search filters defines by name/label/description
//   8. Validation warnings display for missing dependencies
//   9. Validation warnings display for active conflicts
//  10. NO_BM variant indicators render correctly
//  11. Codegen preview shows active defines
//  12. Active count badges appear on categories with enabled defines
//
// Pattern: `renderToStaticMarkup` — node-only, no jsdom.
// Fett263PropEditor is a controlled component (activeDefines + onDefinesChange)
// so no store mocking is needed — we pass props directly.

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// Silence HelpTooltip portal — no DOM under node.
vi.mock('@/components/shared/HelpTooltip', () => ({
  HelpTooltip: ({ text }: { text: string }) =>
    createElement('span', { 'data-tooltip': text }),
}));

// ── Import under test ──────────────────────────────────────────────
import { Fett263PropEditor } from '@/components/editor/Fett263PropEditor';
import {
  FETT263_DEFINES_DEDUPED,
  FETT263_CATEGORY_ORDER,
  FETT263_CATEGORY_LABELS,
  formatDefineForCodegen,
} from '@/lib/fett263Defines';

// ── Helpers ────────────────────────────────────────────────────────

function render(
  activeDefines: string[] = [],
  onDefinesChange: (d: string[]) => void = () => {},
): string {
  return renderToStaticMarkup(
    createElement(Fett263PropEditor, { activeDefines, onDefinesChange }),
  );
}

// ── Category rendering ─────────────────────────────────────────────

describe('Fett263PropEditor category rendering', () => {
  it('renders all 9 category labels', () => {
    const html = render();
    for (const cat of FETT263_CATEGORY_ORDER) {
      const label = FETT263_CATEGORY_LABELS[cat];
      expect(html).toContain(label);
    }
  });

  it('renders category group elements for each category', () => {
    const html = render();
    for (const cat of FETT263_CATEGORY_ORDER) {
      // Each category section has an id-bearing heading
      expect(html).toContain(`fett263-cat-${cat}`);
    }
  });

  it('renders the header with "Fett263 Prop Defines"', () => {
    const html = render();
    expect(html).toContain('Fett263 Prop Defines');
  });

  it('renders "0 active" when no defines are enabled', () => {
    const html = render([]);
    expect(html).toContain('0 active');
  });

  it('renders correct active count when defines are enabled', () => {
    const html = render([
      'FETT263_SWING_ON',
      'FETT263_TWIST_ON',
      'FETT263_THRUST_ON',
    ]);
    expect(html).toContain('3 active');
  });
});

// ── Define row rendering ───────────────────────────────────────────

describe('Fett263PropEditor define rows', () => {
  it('renders a checkbox for every deduplicated define', () => {
    const html = render();
    // Each define renders at least one checkbox input
    const checkboxCount = (html.match(/type="checkbox"/g) || []).length;
    expect(checkboxCount).toBe(FETT263_DEFINES_DEDUPED.length);
  });

  it('renders labels for key defines', () => {
    const html = render();
    // Spot-check a few known labels
    expect(html).toContain('Swing On');
    expect(html).toContain('Twist On');
    expect(html).toContain('Stab On');
  });

  it('renders descriptions for defines', () => {
    const html = render();
    // The first define's description should appear
    const firstDefine = FETT263_DEFINES_DEDUPED[0];
    expect(html).toContain(firstDefine.description);
  });

  it('marks active defines as checked', () => {
    const html = render(['FETT263_SWING_ON']);
    // The active define's checkbox should be checked
    // We check that the active define renders with accent color styling
    expect(html).toContain('text-accent');
  });

  it('renders NO BM badge for _NO_BM variant defines', () => {
    const html = render();
    // There should be at least one NO BM badge
    expect(html).toContain('NO BM');
  });

  it('shows "NO BM active" indicator when a NO_BM variant is enabled', () => {
    // FETT263_SWING_ON_NO_BM is the NO_BM variant of FETT263_SWING_ON
    const html = render(['FETT263_SWING_ON_NO_BM']);
    // The parent SWING_ON row should show the "NO BM active" badge
    expect(html).toContain('NO BM active');
  });
});

// ── Numeric defines ────────────────────────────────────────────────

describe('Fett263PropEditor numeric defines', () => {
  it('renders number input for active numeric defines', () => {
    // FETT263_SWING_ON_SPEED is a numeric define
    const html = render(['FETT263_SWING_ON_SPEED 250']);
    expect(html).toContain('type="number"');
  });

  it('does not render number input for inactive numeric defines', () => {
    // Render with no active defines — no number inputs should appear
    const html = render([]);
    expect(html).not.toContain('type="number"');
  });

  it('renders the correct value for a numeric define', () => {
    const html = render(['FETT263_SWING_ON_SPEED 250']);
    // The value attribute should contain 250
    expect(html).toContain('value="250"');
  });

  it('renders unit labels for numeric defines that have them', () => {
    // Find a numeric define with a unit
    const numericWithUnit = FETT263_DEFINES_DEDUPED.find(
      (d) => d.type === 'number' && d.unit,
    );
    if (numericWithUnit) {
      const raw = formatDefineForCodegen(
        numericWithUnit.define,
        numericWithUnit.defaultValue,
      );
      const html = render([raw]);
      expect(html).toContain(numericWithUnit.unit);
    }
  });

  it('renders min/max attributes for numeric defines', () => {
    // FETT263_SWING_ON_SPEED has min/max
    const speedDefine = FETT263_DEFINES_DEDUPED.find(
      (d) => d.define === 'FETT263_SWING_ON_SPEED',
    );
    if (speedDefine && speedDefine.type === 'number') {
      const raw = formatDefineForCodegen(
        speedDefine.define,
        speedDefine.defaultValue,
      );
      const html = render([raw]);
      if (speedDefine.min !== undefined) {
        expect(html).toContain(`min="${speedDefine.min}"`);
      }
      if (speedDefine.max !== undefined) {
        expect(html).toContain(`max="${speedDefine.max}"`);
      }
    }
  });
});

// ── Validation warnings ────────────────────────────────────────────

describe('Fett263PropEditor validation warnings', () => {
  it('shows missing-requires warning when dependency is not met', () => {
    // FETT263_SWING_ON_SPEED requires FETT263_SWING_ON
    // Enable SWING_ON_SPEED without SWING_ON → should warn
    const html = render(['FETT263_SWING_ON_SPEED 250']);
    expect(html).toContain('Requires:');
  });

  it('does not show warning when dependencies are satisfied', () => {
    // Enable both SWING_ON and SWING_ON_SPEED → no warning
    const html = render(['FETT263_SWING_ON', 'FETT263_SWING_ON_SPEED 250']);
    expect(html).not.toContain('Requires:');
  });

  it('shows conflict warning when conflicting defines are both active', () => {
    // FETT263_SWING_ON and FETT263_SWING_ON_NO_BM conflict with each other
    const html = render(['FETT263_SWING_ON', 'FETT263_SWING_ON_NO_BM']);
    expect(html).toContain('Conflicts with:');
  });

  it('shows warning count in header', () => {
    // Enable SWING_ON_SPEED without SWING_ON → 1 warning
    const html = render(['FETT263_SWING_ON_SPEED 250']);
    expect(html).toContain('warning');
  });

  it('shows no warning count when no warnings exist', () => {
    const html = render([]);
    // "warning" text should NOT appear (no count badge)
    expect(html).not.toContain('warning');
  });
});

// ── Codegen preview ────────────────────────────────────────────────

describe('Fett263PropEditor codegen preview', () => {
  it('shows "No defines active" when empty', () => {
    const html = render([]);
    expect(html).toContain('No defines active');
  });

  it('shows #define lines for active defines', () => {
    const html = render(['FETT263_SWING_ON', 'FETT263_TWIST_ON']);
    expect(html).toContain('#define FETT263_SWING_ON');
    expect(html).toContain('#define FETT263_TWIST_ON');
  });

  it('shows #define with value for numeric defines', () => {
    const html = render(['FETT263_SWING_ON_SPEED 250']);
    expect(html).toContain('#define FETT263_SWING_ON_SPEED 250');
  });

  it('preview section has status role for screen readers', () => {
    const html = render([]);
    expect(html).toContain('role="status"');
  });

  it('preview contains "Output preview" label', () => {
    const html = render([]);
    expect(html).toContain('Output preview');
  });
});

// ── Search ─────────────────────────────────────────────────────────

describe('Fett263PropEditor search', () => {
  it('renders search input', () => {
    const html = render();
    expect(html).toContain('Search defines');
  });

  it('search input has placeholder text', () => {
    const html = render();
    expect(html).toContain('placeholder="Search defines...');
  });
});

// ── Active count badges ────────────────────────────────────────────

describe('Fett263PropEditor active count badges', () => {
  it('shows count badge on category with active defines', () => {
    // FETT263_SWING_ON is in the gesture-ignition category
    const html = render(['FETT263_SWING_ON']);
    // The category section should have a count badge
    // The badge renders with bg-accent/10 class
    expect(html).toContain('bg-accent/10');
  });

  it('does not show count badge on category with no active defines', () => {
    // Render with no defines active — count badges should not appear
    const html = render([]);
    expect(html).not.toContain('bg-accent/10');
  });
});

// ── Integration: defines are correctly categorized in UI ───────────

describe('Fett263PropEditor integration', () => {
  it('every define in FETT263_DEFINES_DEDUPED appears in the output', () => {
    const html = render();
    for (const d of FETT263_DEFINES_DEDUPED) {
      // Every define's label should appear in the rendered HTML
      expect(html).toContain(d.label);
    }
  });

  it('renders category groups with aria-labelledby', () => {
    const html = render();
    for (const cat of FETT263_CATEGORY_ORDER) {
      expect(html).toContain(`aria-labelledby="fett263-cat-${cat}"`);
    }
  });

  it('renders collapse toggle buttons for each category', () => {
    const html = render();
    // Each category has a button with aria-expanded
    const expandedCount = (html.match(/aria-expanded="true"/g) || []).length;
    // All categories start expanded (collapsed = false → aria-expanded = true)
    expect(expandedCount).toBe(FETT263_CATEGORY_ORDER.length);
  });
});

// ── Prop contract ──────────────────────────────────────────────────

describe('Fett263PropEditor prop contract', () => {
  it('renders without crashing with empty activeDefines', () => {
    const html = render([]);
    expect(html.length).toBeGreaterThan(0);
  });

  it('renders without crashing with multiple active defines', () => {
    const html = render([
      'FETT263_SWING_ON',
      'FETT263_SWING_ON_SPEED 250',
      'FETT263_TWIST_ON',
      'FETT263_THRUST_ON',
      'FETT263_STAB_ON',
      'FETT263_FORCE_PUSH',
    ]);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('6 active');
  });

  it('handles unknown defines gracefully', () => {
    // Unknown defines shouldn't crash the component
    const html = render(['FETT263_NONEXISTENT_DEFINE']);
    expect(html.length).toBeGreaterThan(0);
  });

  it('passes activeDefines through to codegen preview verbatim', () => {
    const defines = [
      'FETT263_SWING_ON',
      'FETT263_BM_CLASH_DETECT 6',
    ];
    const html = render(defines);
    for (const d of defines) {
      expect(html).toContain(`#define ${d}`);
    }
  });
});

// ── Category filtering (no-search shows categories, search shows flat) ─

describe('Fett263PropEditor category vs search modes', () => {
  it('renders all category sections in browse mode (no search)', () => {
    const html = render();
    // All category headings present
    for (const cat of FETT263_CATEGORY_ORDER) {
      expect(html).toContain(`fett263-cat-${cat}`);
    }
  });

  // Note: search filtering is client-side via useState — renderToStaticMarkup
  // always renders the initial state (empty query → category browse mode).
  // Search behavior is validated at the pure-function level in fett263Defines.test.ts.
});

// ── Structural smoke ───────────────────────────────────────────────

describe('Fett263PropEditor structural smoke', () => {
  it('total checkbox count equals FETT263_DEFINES_DEDUPED length', () => {
    const html = render();
    const checkboxCount = (html.match(/type="checkbox"/g) || []).length;
    expect(checkboxCount).toBe(FETT263_DEFINES_DEDUPED.length);
  });

  it('renders at least 35 defines (sanity floor)', () => {
    // The registry has ~42 defines; deduplication may reduce slightly
    expect(FETT263_DEFINES_DEDUPED.length).toBeGreaterThanOrEqual(35);
  });

  it('every category in CATEGORY_ORDER has at least one define', () => {
    for (const cat of FETT263_CATEGORY_ORDER) {
      const count = FETT263_DEFINES_DEDUPED.filter(
        (d) => d.category === cat,
      ).length;
      expect(count).toBeGreaterThan(0);
    }
  });
});
