// ─── routing barrel — Sidebar A/B v2 Phase 4e ─────────────────────────
//
// Public surface for the routing section. Consumers should import from
// `@/components/editor/routing` rather than reaching into individual
// files.
//
// Exports both the legacy `RoutingPanel` (off-flag fallback in
// MainContent) and the new `RoutingAB` (Phase 4e A/B mount).

export { RoutingPanel } from './RoutingPanel';
export { RoutingAB } from './RoutingAB';
export { RoutingColumnA } from './RoutingColumnA';
export { RoutingColumnB } from './RoutingColumnB';
