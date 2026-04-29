'use client';

// ─── OutputColumnB — Sidebar A/B v2 Phase 4f ────────────────────────────
//
// Active step's body, mounted in Column B of MainContentABLayout when
// the active sidebar section is `output`. Per
// `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.9:
//
//   - Sticky header: step number + label + status glyph
//   - Body: switches on the active step id, mounting the existing
//     panel for each step:
//       generate-code   → <CodeOutput />
//       config-summary  → <ConfigSummary />
//       preview-oled    → <OLEDPreview />
//       export-card     → <CardWriter />
//       flash-board     → <FlashPanel />
//
// All five panels already exist as exported components in
// `apps/web/components/editor/`. The only one that wasn't an export
// before this PR is `ConfigSummary` — it was a private helper inside
// `OutputPanel.tsx`. We extracted it into `output/ConfigSummary.tsx`
// so both surfaces (this A/B path + the legacy `<OutputPanel />`
// fallback) consume the same component.
//
// Selection state flows in via the `activeStep` prop from `OutputAB`.
// No store writes here — this is a pure-render shell.

import { CodeOutput } from '../CodeOutput';
import { CardWriter } from '../CardWriter';
import { OLEDPreview } from '../OLEDPreview';
import { FlashPanel } from '../FlashPanel';
import { ConfigSummary } from './ConfigSummary';
import {
  OUTPUT_STEPS,
  OUTPUT_STATUS_GLYPHS,
  type OutputStepId,
} from './outputCatalog';

export interface OutputColumnBProps {
  /** Active pipeline step. Owned by `OutputAB` wrapper. */
  activeStep: OutputStepId;
}

function renderStepBody(stepId: OutputStepId): React.ReactNode {
  switch (stepId) {
    case 'generate-code':
      return <CodeOutput />;
    case 'config-summary':
      return <ConfigSummary />;
    case 'preview-oled':
      return <OLEDPreview />;
    case 'export-card':
      return <CardWriter />;
    case 'flash-board':
      return <FlashPanel />;
  }
}

export function OutputColumnB({
  activeStep,
}: OutputColumnBProps): JSX.Element {
  // Look up the step descriptor — guaranteed to exist because the
  // OutputStepId union and OUTPUT_STEPS array are kept in sync via the
  // catalog drift sentinels in outputAB.test.tsx.
  const stepIdx = OUTPUT_STEPS.findIndex((s) => s.id === activeStep);
  const step = OUTPUT_STEPS[stepIdx];
  const stepNumber = stepIdx + 1;
  // v1 status logic: every Column B render is for the `current` step.
  // When per-step rich status arrives (see OutputColumnA's TODO),
  // wire it through here so the header glyph reflects real state.
  const glyph = OUTPUT_STATUS_GLYPHS.current;

  return (
    <div className="flex flex-col h-full" data-testid="output-column-b">
      {/* Sticky header — step number + label + status glyph + short
          description. Mirrors the AudioColumnB / RoutingColumnB header
          shape so the A/B sections read as a family. */}
      <header
        className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0"
        data-testid="output-column-b-header"
      >
        <div className="flex items-baseline gap-3">
          <span
            className="font-mono text-ui-xs tabular-nums px-1.5 py-0.5 rounded-chrome border border-accent text-accent bg-accent-dim/30"
            aria-hidden="true"
          >
            {stepNumber}
          </span>
          <h3 className="font-mono uppercase text-ui-sm tracking-[0.10em] text-text-primary truncate">
            {step.label}
          </h3>
          <span className="text-ui-xs text-text-muted truncate">
            {step.description}
          </span>
          <span
            className="ml-auto text-ui-md font-mono shrink-0"
            style={{ color: glyph.tokenColor }}
            title={glyph.label}
            aria-label={glyph.label}
            data-testid="output-column-b-status-glyph"
          >
            {glyph.glyph}
          </span>
        </div>
      </header>

      {/* Scrolling body — mounts the active step's existing panel
          component. `p-3` matches the legacy MainContent panel
          padding so users moving between A/B and legacy paths don't
          see a layout jump. */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-3"
        data-testid="output-column-b-body"
      >
        {renderStepBody(activeStep)}
      </div>
    </div>
  );
}
