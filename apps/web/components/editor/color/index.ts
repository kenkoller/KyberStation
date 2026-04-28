// ─── color barrel — Sidebar A/B v2 Phase 3 ─────────────────────────────
//
// Public surface for the A/B color section. Consumers (MainContent,
// future tests) import from `@/components/editor/color` rather than
// reaching into the individual files.

export { ColorColumnA } from './ColorColumnA';
export { ColorColumnB } from './ColorColumnB';
export {
  COLOR_PRESETS,
  COLOR_CHANNELS,
  colorsMatch,
  findMatchingPreset,
} from './colorCatalog';
export type { ColorPreset, ColorChannel } from './colorCatalog';
