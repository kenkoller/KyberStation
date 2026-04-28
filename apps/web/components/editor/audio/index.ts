// ─── audio barrel — Sidebar A/B v2 Phase 4d ────────────────────────────
//
// Public surface for the A/B audio section. Consumers (MainContent,
// future tests) import from `@/components/editor/audio` rather than
// reaching into the individual files; this lets the implementation
// reorganize freely without rippling through call sites.

export { AudioAB } from './AudioAB';
export { AudioColumnA } from './AudioColumnA';
export { AudioColumnB } from './AudioColumnB';
export {
  SOUND_EVENTS,
  MIXER_CONTROLS,
  EFFECT_PRESETS,
  AUDIO_SUBTABS,
  DEFAULT_AUDIO_SUBTAB,
  COMPLETENESS_COLORS,
  FORMAT_LABELS,
  formatBytes,
} from './audioCatalog';
export type {
  AudioSoundEvent,
  AudioMixerControl,
  AudioEffectPreset,
  AudioSubTab,
  AudioSubTabDef,
} from './audioCatalog';
