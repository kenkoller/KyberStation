// ─── blade-style barrel — Sidebar A/B v2 Phase 2 ───────────────────────
//
// Public surface for the A/B blade-style section. Consumers (MainContent,
// future tests) import from `@/components/editor/blade-style` rather than
// reaching into the individual files; this lets the implementation
// reorganize freely without rippling through call sites.

export { BladeStyleColumnA } from './BladeStyleColumnA';
export { BladeStyleColumnB } from './BladeStyleColumnB';
export { BLADE_STYLES, STYLE_PARAMS, getBladeStyle } from './styleCatalog';
export type { BladeStyleCatalogEntry, StyleParamDef } from './styleCatalog';
