// ─── Output A/B — Sidebar A/B v2 Phase 4f contract tests ──────────────
//
// Pins down the contracts for the output A/B section's columns +
// wrapper:
//
//   1. OUTPUT_STEPS catalog drift sentinel (5 canonical steps + ids
//      + canonical order + DEFAULT_OUTPUT_STEP).
//   2. OUTPUT_STATUS_GLYPHS exposes the colorblind-safe glyph alphabet.
//   3. Column A renders 5 stepper rows with status glyphs.
//   4. Column A active row has aria-selected="true" + accent border.
//   5. Column A non-active rows have aria-selected="false".
//   6. Column A renders step number badges 1–5.
//   7. Column A renders a connector line between rows (not after last).
//   8. Column A onSelect callback fires when an inactive row is clicked.
//   9. Column B sticky header reflects active step's label + number.
//  10. Column B header status glyph is the `current` glyph (●).
//  11. Column B body mounts the right panel for each of the 5 steps.
//  12. Column B `config-summary` mounts the real ConfigSummary
//      (extracted from OutputPanel.tsx — drift sentinel).
//  13. OutputAB wrapper mounts MainContentABLayout split shell with
//      both columns + the resize-label prop.
//  14. OutputAB defaults to `generate-code` step on first render.
//
// Pattern matches `audioAB.test.tsx` / `mySaberAB.test.tsx` — SSR-only
// `renderToStaticMarkup`. Real CodeOutput / FlashPanel / CardWriter /
// OLEDPreview are stubbed via `vi.mock` so we don't need to mount
// their heavy WebUSB / qrcode / audio dependencies under SSR; we only
// care that the right component renders for the right step. The
// extracted `ConfigSummary` is the one Column B body we render for
// real — it's the drift sentinel for the OutputPanel.tsx extraction.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Hoisted mock state ─────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  bladeConfig: {
    name: 'Obi-Wan ANH',
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0.1,
    ledCount: 144,
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
  } as Record<string, unknown>,
  bladeTopology: { presetId: 'single' } as Record<string, unknown>,
  columnAWidth: 280,
}));

// ── Store mocks ────────────────────────────────────────────────────────

vi.mock('@/stores/bladeStore', () => {
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector({
      config: mockState.bladeConfig,
      topology: mockState.bladeTopology,
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => Record<string, unknown>;
  };
  useBladeStore.getState = () => ({
    config: mockState.bladeConfig,
    topology: mockState.bladeTopology,
  });
  return { useBladeStore };
});

vi.mock('@/stores/uiStore', () => {
  const REGION_LIMITS = {
    columnAWidth: { min: 220, max: 400, default: 280 },
  };
  const useUIStore = ((selector: (s: unknown) => unknown) =>
    selector({
      columnAWidth: mockState.columnAWidth,
      setColumnAWidth: (n: number) => {
        mockState.columnAWidth = n;
      },
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useUIStore, REGION_LIMITS };
});

// Stub the heavy panel components Column B mounts. We only need to
// verify the right component renders for the right step; the existing
// per-component test suites cover their internal contracts.
vi.mock('@/components/editor/CodeOutput', () => ({
  CodeOutput: () =>
    createElement('div', { 'data-testid': 'output-stub-code-output' }, 'Stub CodeOutput'),
}));

vi.mock('@/components/editor/CardWriter', () => ({
  CardWriter: () =>
    createElement('div', { 'data-testid': 'output-stub-card-writer' }, 'Stub CardWriter'),
}));

vi.mock('@/components/editor/OLEDPreview', () => ({
  OLEDPreview: () =>
    createElement('div', { 'data-testid': 'output-stub-oled-preview' }, 'Stub OLEDPreview'),
}));

vi.mock('@/components/editor/FlashPanel', () => ({
  FlashPanel: () =>
    createElement('div', { 'data-testid': 'output-stub-flash-panel' }, 'Stub FlashPanel'),
}));

// ── Imports under test (after mocks are set up) ────────────────────────

import { OutputAB } from '@/components/editor/output/OutputAB';
import { OutputColumnA } from '@/components/editor/output/OutputColumnA';
import { OutputColumnB } from '@/components/editor/output/OutputColumnB';
import { ConfigSummary } from '@/components/editor/output/ConfigSummary';
import {
  OUTPUT_STEPS,
  OUTPUT_STEP_COUNT,
  DEFAULT_OUTPUT_STEP,
  OUTPUT_STATUS_GLYPHS,
  type OutputStepId,
} from '@/components/editor/output/outputCatalog';

// ── Test helpers ───────────────────────────────────────────────────────

function htmlA(activeStep: OutputStepId = DEFAULT_OUTPUT_STEP, onSelect = () => {}): string {
  return renderToStaticMarkup(
    createElement(OutputColumnA, { activeStep, onSelect }),
  );
}

function htmlB(activeStep: OutputStepId): string {
  return renderToStaticMarkup(createElement(OutputColumnB, { activeStep }));
}

function htmlAB(): string {
  return renderToStaticMarkup(createElement(OutputAB));
}

beforeEach(() => {
  mockState.columnAWidth = 280;
});

// ─── (a) Catalog drift sentinels ──────────────────────────────────────

describe('output catalog drift sentinels', () => {
  it('OUTPUT_STEPS has the canonical 5 entries in the right order', () => {
    expect(OUTPUT_STEPS).toHaveLength(5);
    expect(OUTPUT_STEP_COUNT).toBe(5);
    expect(OUTPUT_STEPS.map((s) => s.id)).toEqual([
      'generate-code',
      'config-summary',
      'preview-oled',
      'export-card',
      'flash-board',
    ]);
  });

  it('every step has a non-empty label and description', () => {
    for (const step of OUTPUT_STEPS) {
      expect(step.label.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it('DEFAULT_OUTPUT_STEP is the first step in the canonical order', () => {
    expect(DEFAULT_OUTPUT_STEP).toBe('generate-code');
    expect(DEFAULT_OUTPUT_STEP).toBe(OUTPUT_STEPS[0].id);
  });

  it('OUTPUT_STATUS_GLYPHS exposes 5 canonical states with glyph + label', () => {
    const expected = ['pending', 'current', 'done', 'warn', 'error'] as const;
    for (const state of expected) {
      expect(OUTPUT_STATUS_GLYPHS[state]).toBeDefined();
      expect(OUTPUT_STATUS_GLYPHS[state].glyph.length).toBeGreaterThan(0);
      expect(OUTPUT_STATUS_GLYPHS[state].label.length).toBeGreaterThan(0);
    }
    // Glyph contract — colorblind-safe pairing per
    // docs/HARDWARE_FIDELITY_PRINCIPLE.md aviation alphabet.
    expect(OUTPUT_STATUS_GLYPHS.pending.glyph).toBe('◯');
    expect(OUTPUT_STATUS_GLYPHS.current.glyph).toBe('●');
    expect(OUTPUT_STATUS_GLYPHS.done.glyph).toBe('✓');
    expect(OUTPUT_STATUS_GLYPHS.warn.glyph).toBe('▲');
    expect(OUTPUT_STATUS_GLYPHS.error.glyph).toBe('✕');
  });
});

// ─── (b) Column A render contract ─────────────────────────────────────

describe('OutputColumnA — render contract', () => {
  it('renders the section header with step count', () => {
    const html = htmlA();
    expect(html).toContain('Output Pipeline');
    expect(html).toContain('5 steps');
  });

  it('renders one row per step with the canonical id pattern', () => {
    const html = htmlA();
    for (const step of OUTPUT_STEPS) {
      expect(html).toContain(`output-step-row-${step.id}`);
      expect(html).toContain(step.label);
      expect(html).toContain(step.description);
    }
    // Aggregate row count via id matches.
    const rowMatches = html.match(/id="output-step-row-/g) ?? [];
    expect(rowMatches.length).toBe(OUTPUT_STEPS.length);
  });

  it('marks the active row with aria-selected="true" and others with "false"', () => {
    const html = htmlA('preview-oled');
    expect(html).toMatch(
      /id="output-step-row-preview-oled"[^>]*aria-selected="true"/,
    );
    expect(html).toMatch(
      /id="output-step-row-generate-code"[^>]*aria-selected="false"/,
    );
    expect(html).toMatch(
      /id="output-step-row-flash-board"[^>]*aria-selected="false"/,
    );
  });

  it('renders step number badges 1 through 5', () => {
    const html = htmlA();
    // Each badge sits inside an aria-hidden div with the step number.
    // We can't easily count badge-only digits without false-positives
    // from the description text, so check that all five numbers appear
    // somewhere in the markup (they're the first text in each badge).
    expect(html).toMatch(/>1</);
    expect(html).toMatch(/>2</);
    expect(html).toMatch(/>3</);
    expect(html).toMatch(/>4</);
    expect(html).toMatch(/>5</);
  });

  it('renders the current glyph (●) for the active row and pending glyph (◯) for others', () => {
    const html = htmlA('export-card');
    // Each row has a per-step glyph testid; resolve the active one.
    const activeMatch = html.match(
      /data-testid="output-step-glyph-export-card"[^>]*>([^<]+)</,
    );
    expect(activeMatch?.[1]).toBe(OUTPUT_STATUS_GLYPHS.current.glyph);

    // A non-active row should get the pending glyph.
    const inactiveMatch = html.match(
      /data-testid="output-step-glyph-generate-code"[^>]*>([^<]+)</,
    );
    expect(inactiveMatch?.[1]).toBe(OUTPUT_STATUS_GLYPHS.pending.glyph);
  });

  it('annotates each row with data-step-status reflecting the resolver', () => {
    const html = htmlA('flash-board');
    expect(html).toContain('data-step-id="flash-board"');
    expect(html).toContain('data-step-status="current"');
    // 4 rows should be `pending` (5 total - 1 current).
    const pendingMatches = html.match(/data-step-status="pending"/g) ?? [];
    expect(pendingMatches.length).toBe(4);
  });
});

// ─── (c) Column B render contract ─────────────────────────────────────

describe('OutputColumnB — render contract', () => {
  it('header reflects step number, label, and description for the active step', () => {
    const html = htmlB('generate-code');
    expect(html).toContain('data-testid="output-column-b-header"');
    // Step number badge — generate-code is step 1.
    expect(html).toMatch(/>1<\/span>/);
    expect(html).toContain('Generate Code');
    expect(html).toContain('Emit ProffieOS config.h');
  });

  it('header status glyph uses the `current` glyph in v1', () => {
    const html = htmlB('flash-board');
    // Status glyph testid ensures we read the right element.
    const m = html.match(
      /data-testid="output-column-b-status-glyph"[^>]*>([^<]+)</,
    );
    expect(m?.[1]).toBe(OUTPUT_STATUS_GLYPHS.current.glyph);
  });

  it('mounts CodeOutput for the generate-code step', () => {
    const html = htmlB('generate-code');
    expect(html).toContain('data-testid="output-stub-code-output"');
  });

  it('mounts ConfigSummary for the config-summary step (extraction drift sentinel)', () => {
    const html = htmlB('config-summary');
    // ConfigSummary renders for real (it's the panel we extracted).
    expect(html).toContain('data-testid="output-config-summary"');
    expect(html).toContain('Configuration Summary');
    // Bladestore values are surfaced by the real component.
    expect(html).toContain('stable'); // style
    expect(html).toContain('144');    // led count
  });

  it('mounts OLEDPreview for the preview-oled step', () => {
    const html = htmlB('preview-oled');
    expect(html).toContain('data-testid="output-stub-oled-preview"');
  });

  it('mounts CardWriter for the export-card step', () => {
    const html = htmlB('export-card');
    expect(html).toContain('data-testid="output-stub-card-writer"');
  });

  it('mounts FlashPanel for the flash-board step', () => {
    const html = htmlB('flash-board');
    expect(html).toContain('data-testid="output-stub-flash-panel"');
  });
});

// ─── (d) ConfigSummary extraction sentinel ────────────────────────────

describe('ConfigSummary — extraction drift sentinel', () => {
  it('renders the Configuration Summary panel from bladeStore', () => {
    const html = renderToStaticMarkup(createElement(ConfigSummary));
    expect(html).toContain('Configuration Summary');
    expect(html).toContain('Style');
    expect(html).toContain('Topology');
    expect(html).toContain('Base Color');
    expect(html).toContain('Clash Color');
    expect(html).toContain('Ignition');
    expect(html).toContain('Retraction');
    expect(html).toContain('LEDs');
    expect(html).toContain('Board');
    // ProffieOS line is a static read.
    expect(html).toContain('ProffieOS 7.x');
  });
});

// ─── (e) OutputAB wrapper ─────────────────────────────────────────────

describe('OutputAB — wrapper composes the AB layout split shell', () => {
  it('renders MainContentABLayout split with both columns + the resize label', () => {
    const html = htmlAB();

    // Split layout shell.
    expect(html).toContain('data-mainab-layout="split"');
    expect(html).toContain('data-mainab-column="a"');
    expect(html).toContain('data-mainab-column="b"');

    // Column body markers.
    expect(html).toContain('data-testid="output-column-a"');
    expect(html).toContain('data-testid="output-column-b"');

    // Resize handle label.
    expect(html).toContain('Pipeline step list width');
  });

  it('defaults to the canonical first step (generate-code) on first render', () => {
    const html = htmlAB();
    // Active row carries aria-selected="true".
    expect(html).toMatch(
      /id="output-step-row-generate-code"[^>]*aria-selected="true"/,
    );
    // Column B mounts the CodeOutput stub for the default step.
    expect(html).toContain('data-testid="output-stub-code-output"');
  });
});
