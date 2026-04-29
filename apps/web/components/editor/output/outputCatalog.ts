// ─── Output catalog — Sidebar A/B v2 Phase 4f ──────────────────────────
//
// Single source of truth for the output A/B section's vertical pipeline.
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.9 the output surface
// doesn't fit the "list of things → details" A/B shape that
// blade-style / color / audio etc. use; it's a multi-step pipeline. So
// Column A becomes a **vertical stepper** with one row per step + a
// status glyph, and Column B mounts the active step's body.
//
// The five steps (in the canonical authoring order):
//
//   1. generate-code   — emit the ProffieOS config.h text block
//   2. config-summary  — Style / Color / Ignition / LEDs / Board recap
//   3. preview-oled    — OLED font preview (post-flash chrome)
//   4. export-card     — write the SD-card file tree (CardWriter)
//   5. flash-board     — WebUSB DFU flash to the Proffieboard
//
// The status glyph set (`pending` / `current` / `done` / `warn` /
// `error`) is the same colorblind-safe pairing used by `<StatusSignal>`
// elsewhere in the editor (`docs/HARDWARE_FIDELITY_PRINCIPLE.md` lists
// the canonical aviation-color set). For v1 of this section we wire
// only `current` / `pending` — the active step glyph + dim glyphs for
// the rest. Rich completion / warning / error state per step is a
// post-launch enhancement (see TODO inline in `OutputColumnA.tsx`).

export type OutputStepId =
  | 'generate-code'
  | 'config-summary'
  | 'preview-oled'
  | 'export-card'
  | 'flash-board';

export type OutputStepStatus =
  | 'pending'
  | 'current'
  | 'done'
  | 'warn'
  | 'error';

export interface OutputStepDef {
  id: OutputStepId;
  /** Short label rendered in the stepper row + Column B sticky header. */
  label: string;
  /** One-line description rendered under the label in Column A. */
  description: string;
}

/**
 * Canonical 5-step output pipeline. Order matters: this is the order
 * users walk through (`Generate → Summary → Preview → Export → Flash`)
 * and Column A renders rows top-to-bottom in this order.
 *
 * If a future session adds a sixth step (e.g. "Verify Flash" after
 * `flash-board`), drop it in here AND update `OUTPUT_STEP_COUNT` +
 * the drift-sentinel test. The `OutputStepId` union enforces
 * exhaustiveness on the Column B body switch.
 */
export const OUTPUT_STEPS: ReadonlyArray<OutputStepDef> = [
  {
    id: 'generate-code',
    label: 'Generate Code',
    description: 'Emit ProffieOS config.h',
  },
  {
    id: 'config-summary',
    label: 'Configuration Summary',
    description: 'Recap style + color + LEDs',
  },
  {
    id: 'preview-oled',
    label: 'Preview OLED',
    description: 'Inspect on-board display',
  },
  {
    id: 'export-card',
    label: 'Export to SD Card',
    description: 'Write configs + fonts',
  },
  {
    id: 'flash-board',
    label: 'Flash to Board',
    description: 'WebUSB DFU upload',
  },
];

/** Drift-sentinel companion: must equal `OUTPUT_STEPS.length`. */
export const OUTPUT_STEP_COUNT = 5;

/** Default first step. */
export const DEFAULT_OUTPUT_STEP: OutputStepId = 'generate-code';

/**
 * Status glyph mapping. Mirrors the `<StatusSignal>` glyph alphabet.
 * Kept here so Column A can render glyphs without mounting the full
 * `<StatusSignal>` primitive (its props don't quite line up — it's
 * keyed off variant ids, not arbitrary states).
 *
 * Colorblind safety: every status pairs a typographic glyph with a
 * CSS-variable color, so the row is readable from glyph alone even
 * when color is suppressed.
 */
export const OUTPUT_STATUS_GLYPHS: Record<
  OutputStepStatus,
  { glyph: string; tokenColor: string; label: string }
> = {
  pending: { glyph: '◯', tokenColor: 'var(--text-muted)',     label: 'Pending'  },
  current: { glyph: '●', tokenColor: 'rgb(var(--color-accent))', label: 'Current'  },
  done:    { glyph: '✓', tokenColor: 'rgb(var(--status-ok))',    label: 'Done'     },
  warn:    { glyph: '▲', tokenColor: 'rgb(var(--status-warn))',  label: 'Warning'  },
  error:   { glyph: '✕', tokenColor: 'rgb(var(--status-error))', label: 'Error'    },
};
