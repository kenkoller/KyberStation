'use client';

// ─── OutputColumnA — Sidebar A/B v2 Phase 4f ────────────────────────────
//
// Vertical stepper rendered in Column A of MainContentABLayout when the
// active sidebar section is `output` AND `useABLayout` is true.
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.9, output is a multi-step
// pipeline (Generate Code → Configuration Summary → Preview OLED →
// Export to SD Card → Flash to Board) that doesn't fit the
// "list of things" A/B shape. The recommended pattern is Column A as a
// vertical stepper — one row per step, glyph indicating status,
// connecting line between rows.
//
// Visual treatment matches the rest of the Phase 4 A/B columns:
//   - Active row: `bg-accent-dim/30 + border-l-2 border-accent`
//   - Inactive row: `text-text-secondary` with hover state
//   - Status glyph on the right of each row (◯ pending / ● current /
//     ✓ done / ▲ warn / ✕ error)
//
// Keyboard nav mirrors `MiniGalleryPicker` / `MySaberColumnA`:
//   - Arrow up/down navigate between rows
//   - Enter / Space activates the focused row
//   - Tab moves through rows naturally via `tabIndex={0}`
//
// v1 status logic: only `current` / `pending` are wired. The active
// step gets `current`; everything else gets `pending`. Rich completion
// state per step (e.g. `done` once code has been generated, `error` if
// FlashPanel reported a flash failure) lands in a follow-up — see the
// TODO marker on `getStepStatus()` below.

import { useCallback, useMemo, useRef } from 'react';
import {
  OUTPUT_STEPS,
  OUTPUT_STATUS_GLYPHS,
  type OutputStepId,
  type OutputStepStatus,
} from './outputCatalog';

export interface OutputColumnAProps {
  /** Currently-active step. Owned by `OutputAB` wrapper. */
  activeStep: OutputStepId;
  /** Called when the user clicks (or keyboard-activates) a row. */
  onSelect: (stepId: OutputStepId) => void;
}

/**
 * Status resolver — currently a stub returning `current` for the active
 * step and `pending` for everything else.
 *
 * TODO(post-launch): derive real status from each step's actual state
 * once we have an output-pipeline status store. Candidates:
 *   - `generate-code`  : `done` once codegen has emitted text
 *                        (could probe codegen cache / generated code length)
 *   - `config-summary` : always `done` (it's a static read of bladeStore)
 *   - `preview-oled`   : `done` if user has toggled OLED preview mode
 *   - `export-card`    : `done` once a card-write completes; `warn` if
 *                        a partial write; `error` on a failed write.
 *   - `flash-board`    : `current` mirror of the connection store; `done`
 *                        once a flash completes; `warn` on dry-run only;
 *                        `error` on flash failure.
 *
 * The connection store landed in PR #104 — `flash-board` would be the
 * easiest first step to enrich. Status glyphs already exist in the
 * canonical catalog so adding completion state is purely additive.
 */
function getStepStatus(stepId: OutputStepId, activeStep: OutputStepId): OutputStepStatus {
  return stepId === activeStep ? 'current' : 'pending';
}

export function OutputColumnA({
  activeStep,
  onSelect,
}: OutputColumnAProps): JSX.Element {
  // Refs for keyboard nav between rows. One ref per step lets ArrowDown
  // / ArrowUp focus the next / previous row deterministically without
  // querying the DOM or relying on document.activeElement.
  const rowRefs = useRef<Record<OutputStepId, HTMLLIElement | null>>(
    OUTPUT_STEPS.reduce((acc, step) => {
      acc[step.id] = null;
      return acc;
    }, {} as Record<OutputStepId, HTMLLIElement | null>),
  );

  // Pre-compute the index map so ArrowUp/ArrowDown don't need a lookup
  // on every keypress.
  const indexById = useMemo(() => {
    const map = new Map<OutputStepId, number>();
    OUTPUT_STEPS.forEach((step, i) => map.set(step.id, i));
    return map;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLLIElement>, stepId: OutputStepId) => {
      const idx = indexById.get(stepId) ?? 0;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(stepId);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = OUTPUT_STEPS[Math.min(idx + 1, OUTPUT_STEPS.length - 1)];
        rowRefs.current[next.id]?.focus();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = OUTPUT_STEPS[Math.max(idx - 1, 0)];
        rowRefs.current[prev.id]?.focus();
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        rowRefs.current[OUTPUT_STEPS[0].id]?.focus();
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        rowRefs.current[OUTPUT_STEPS[OUTPUT_STEPS.length - 1].id]?.focus();
      }
    },
    [indexById, onSelect],
  );

  return (
    <div className="flex flex-col h-full" data-testid="output-column-a">
      {/* Sticky header — section label. Mirrors other A/B Column A
          headers (e.g. blade-style filter input area, my-saber + new
          profile button). Output has no filter — the steps are fixed. */}
      <div className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <h3 className="font-mono uppercase text-ui-xs tracking-[0.12em] text-text-secondary">
          Output Pipeline
        </h3>
        <p className="text-ui-xs text-text-muted mt-0.5">
          {OUTPUT_STEPS.length} steps
        </p>
      </div>

      {/* Stepper list. `role="listbox"` so screen readers announce each
          step as a selectable option (matches blade-style/gallery
          patterns). The visible connector line between rows is drawn
          by absolute-positioning a 1px line behind the badge column. */}
      <ol
        role="listbox"
        aria-label="Output pipeline step"
        aria-activedescendant={`output-step-row-${activeStep}`}
        className="flex-1 min-h-0 overflow-y-auto py-1"
      >
        {OUTPUT_STEPS.map((step, idx) => {
          const status = getStepStatus(step.id, activeStep);
          const isActive = status === 'current';
          const glyph = OUTPUT_STATUS_GLYPHS[status];
          const stepNumber = idx + 1;
          const isLast = idx === OUTPUT_STEPS.length - 1;

          return (
            <li
              key={step.id}
              ref={(el) => {
                rowRefs.current[step.id] = el;
              }}
              id={`output-step-row-${step.id}`}
              role="option"
              aria-selected={isActive}
              aria-label={`Step ${stepNumber}: ${step.label}, ${glyph.label}`}
              tabIndex={0}
              onClick={() => onSelect(step.id)}
              onKeyDown={(e) => handleKeyDown(e, step.id)}
              className={[
                'relative flex items-start gap-2.5 px-3 py-2 cursor-pointer outline-none border-l-2 transition-colors',
                'focus-visible:bg-bg-surface/80',
                isActive
                  ? 'bg-accent-dim/30 border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary',
              ].join(' ')}
              data-step-id={step.id}
              data-step-status={status}
            >
              {/* Step number badge + connector line. The connector
                  line is drawn behind the next row's badge so the
                  list reads as a vertical pipeline. */}
              <div className="shrink-0 relative">
                <div
                  className={[
                    'flex items-center justify-center font-mono text-ui-xs tabular-nums',
                    'bg-bg-deep border rounded-chrome',
                    isActive ? 'border-accent text-accent' : 'border-border-subtle text-text-muted',
                  ].join(' ')}
                  style={{ width: 24, height: 24 }}
                  aria-hidden="true"
                >
                  {stepNumber}
                </div>
                {/* Connector line — only rendered between rows, not
                    after the last one. Drawn with absolute positioning
                    so the badge stays visually anchored. */}
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className="absolute left-1/2 -translate-x-1/2 bg-border-subtle"
                    style={{
                      width: 1,
                      top: 24,
                      height: 'calc(100% + 16px - 24px)',
                    }}
                  />
                )}
              </div>

              {/* Label + description. */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div
                  className={[
                    'text-ui-sm font-medium truncate',
                    isActive ? 'text-accent' : 'text-text-primary',
                  ].join(' ')}
                >
                  {step.label}
                </div>
                <div className="text-ui-xs text-text-muted truncate">
                  {step.description}
                </div>
              </div>

              {/* Status glyph on the right. Colorblind-safe via the
                  typographic glyph — color is supporting signal only. */}
              <span
                className="shrink-0 text-ui-md font-mono pt-0.5"
                style={{ color: glyph.tokenColor }}
                title={glyph.label}
                aria-hidden="true"
                data-testid={`output-step-glyph-${step.id}`}
              >
                {glyph.glyph}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
