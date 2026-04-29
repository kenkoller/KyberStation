// ─── output barrel — Sidebar A/B v2 Phase 4f ───────────────────────────
//
// Public surface for the A/B output section. Consumers (MainContent,
// tests) import from `@/components/editor/output` rather than reaching
// into the individual files; this lets the implementation reorganize
// freely without rippling through call sites.

export { OutputAB } from './OutputAB';
export { OutputColumnA } from './OutputColumnA';
export { OutputColumnB } from './OutputColumnB';
export { ConfigSummary } from './ConfigSummary';
export {
  OUTPUT_STEPS,
  OUTPUT_STEP_COUNT,
  DEFAULT_OUTPUT_STEP,
  OUTPUT_STATUS_GLYPHS,
} from './outputCatalog';
export type {
  OutputStepId,
  OutputStepStatus,
  OutputStepDef,
} from './outputCatalog';
