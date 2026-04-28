// ─── ignition-retraction barrel — Sidebar A/B v2 Phase 3 ──────────────
//
// Public surface for the A/B ignition-retraction section. Consumers
// (MainContent, future tests) import from
// `@/components/editor/ignition-retraction` rather than reaching into
// the individual files.

export { IgnitionRetractionAB } from './IgnitionRetractionAB';
export { IgnitionRetractionColumnA } from './IgnitionRetractionColumnA';
export { IgnitionRetractionColumnB } from './IgnitionRetractionColumnB';
export {
  DEFAULT_IGNITION_RETRACTION_TAB,
  type IgnitionRetractionTab,
} from './tabState';
