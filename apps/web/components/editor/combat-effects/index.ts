// ─── combat-effects barrel — Sidebar A/B v2 Phase 4 ──────────────────
//
// Public surface for the A/B combat-effects section. Consumers
// (MainContent, future tests) import from
// `@/components/editor/combat-effects` rather than reaching into the
// individual files.

export { CombatEffectsAB } from './CombatEffectsAB';
export { CombatEffectsColumnA } from './CombatEffectsColumnA';
export { CombatEffectsColumnB } from './CombatEffectsColumnB';
export {
  COMBAT_EFFECTS,
  COMBAT_EFFECT_GENERAL,
  COMBAT_EFFECT_GENERAL_ID,
  DEFAULT_COMBAT_EFFECT_ID,
  getCombatEffect,
  isEffectRowId,
} from './effectCatalog';
export type {
  CombatEffectCategory,
  CombatEffectEntry,
  CombatEffectGeneralEntry,
  CombatEffectRowId,
} from './effectCatalog';
