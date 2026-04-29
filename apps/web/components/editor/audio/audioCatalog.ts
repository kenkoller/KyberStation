// ─── Audio catalog — Sidebar A/B v2 Phase 4d ───────────────────────────
//
// Shared between AudioColumnA (the font library list) and AudioColumnB
// (the deep editor for the selected/loaded font). The audio surface is
// a little different from blade-style or ignition-retraction because the
// "list of things" comes from `audioFontStore.libraryFonts` at runtime
// — there is no static catalog of fonts. What lives here is:
//
//   1. SOUND_EVENTS — the 11-row event table (hum / swing / clash / etc.)
//      the deep editor renders. This MUST mirror the inline copy in
//      legacy `SoundFontPanel.tsx` so both surfaces play the same set.
//   2. MIXER_CONTROLS — the 12-row EQ + effects + master slider table.
//   3. EFFECT_PRESETS — the 6 one-click effect chains.
//   4. FORMAT_LABELS / COMPLETENESS_COLORS — display helpers shared by
//      Column A row rendering AND Column B's font-detail header.
//   5. AUDIO_SUBTABS — Column B's internal sub-tab list, declared once
//      so the wrapper test can assert against it.
//
// Kept colocated with the column components rather than promoted to /lib
// because every entry is consumed by ONE feature (the audio A/B section).

import type { MixerValues } from '@/stores/audioMixerStore';

// ─── Sound events ──────────────────────────────────────────────────────

export interface AudioSoundEvent {
  id: string;
  label: string;
  description: string;
  loop: boolean;
}

/**
 * The 11 sound events the audio engine knows how to trigger. Mirror of
 * the inline `SOUND_EVENTS` table in legacy SoundFontPanel; if a new
 * event ships, both lists need to grow together (the legacy panel is
 * still the off-flag fallback).
 */
export const SOUND_EVENTS: ReadonlyArray<AudioSoundEvent> = [
  { id: 'hum',    label: 'Hum',        description: 'Idle hum loop',         loop: true  },
  { id: 'swing',  label: 'Swing',      description: 'Swing whoosh',          loop: false },
  { id: 'clash',  label: 'Clash',      description: 'Blade clash impact',    loop: false },
  { id: 'blast',  label: 'Blast',      description: 'Blaster deflection',    loop: false },
  { id: 'lockup', label: 'Lockup',     description: 'Blade lock sustained',  loop: false },
  { id: 'drag',   label: 'Drag',       description: 'Blade tip drag',        loop: false },
  { id: 'melt',   label: 'Melt',       description: 'Blade melt effect',     loop: false },
  { id: 'out',    label: 'Ignition',   description: 'Ignition sound (out.wav)',  loop: false },
  { id: 'in',     label: 'Retraction', description: 'Retraction sound (in.wav)', loop: false },
  { id: 'force',  label: 'Force',      description: 'Force effect',          loop: false },
  { id: 'stab',   label: 'Stab',       description: 'Stab thrust',           loop: false },
];

// ─── Mixer controls ────────────────────────────────────────────────────

export interface AudioMixerControl {
  id: keyof MixerValues;
  label: string;
  category: 'eq' | 'effects' | 'master';
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
}

/**
 * EQ + effects + master slider definitions. Mirror of the inline
 * `MIXER_CONTROLS` table in legacy SoundFontPanel.
 */
export const MIXER_CONTROLS: ReadonlyArray<AudioMixerControl> = [
  // EQ
  { id: 'bass',       label: 'Bass',       category: 'eq',      min: -12, max: 12,  step: 0.5, default: 0,  unit: 'dB' },
  { id: 'mid',        label: 'Mid',        category: 'eq',      min: -12, max: 12,  step: 0.5, default: 0,  unit: 'dB' },
  { id: 'treble',     label: 'Treble',     category: 'eq',      min: -12, max: 12,  step: 0.5, default: 0,  unit: 'dB' },
  // Effects
  { id: 'distortion', label: 'Distortion', category: 'effects', min: 0,   max: 100, step: 1,   default: 0,  unit: '%'  },
  { id: 'reverb',     label: 'Reverb',     category: 'effects', min: 0,   max: 100, step: 1,   default: 0,  unit: '%'  },
  { id: 'delay',      label: 'Echo/Delay', category: 'effects', min: 0,   max: 100, step: 1,   default: 0,  unit: '%'  },
  { id: 'chorus',     label: 'Chorus',     category: 'effects', min: 0,   max: 100, step: 1,   default: 0,  unit: '%'  },
  { id: 'phaser',     label: 'Phaser',     category: 'effects', min: 0,   max: 100, step: 1,   default: 0,  unit: '%'  },
  { id: 'bitcrusher', label: 'Bitcrusher', category: 'effects', min: 0,   max: 100, step: 1,   default: 0,  unit: '%'  },
  { id: 'pitchShift', label: 'Pitch Shift', category: 'effects', min: -12, max: 12, step: 0.5, default: 0,  unit: 'st' },
  { id: 'compressor', label: 'Compressor', category: 'effects', min: 0,   max: 100, step: 1,   default: 0,  unit: '%'  },
  // Master
  { id: 'volume',     label: 'Volume',     category: 'master',  min: 0,   max: 100, step: 1,   default: 80, unit: '%'  },
];

// ─── Effect chain presets ──────────────────────────────────────────────

export interface AudioEffectPreset {
  id: string;
  label: string;
  description: string;
}

/**
 * Six one-click effect chains. The actual mixer-state mapping lives in
 * `audioMixerStore.applyPreset`; this catalog is just the picker copy.
 */
export const EFFECT_PRESETS: ReadonlyArray<AudioEffectPreset> = [
  { id: 'clean',         label: 'Clean',         description: 'No effects, pure sound' },
  { id: 'kylo-unstable', label: 'Kylo Unstable', description: 'Distortion + high-pass crackle' },
  { id: 'cave-echo',     label: 'Cave Echo',     description: 'Deep reverb + echo' },
  { id: 'lo-fi-retro',   label: 'Lo-Fi Retro',   description: 'Bitcrusher + low-pass warmth' },
  { id: 'underwater',    label: 'Underwater',    description: 'Heavy low-pass + chorus' },
  { id: 'force-tunnel',  label: 'Force Tunnel',  description: 'Phaser + reverb + pitch shift' },
];

// ─── Display helpers ───────────────────────────────────────────────────

/** Compact 3-letter format codes for the row badge. */
export const FORMAT_LABELS: Record<string, string> = {
  proffie: 'PRF',
  cfx:     'CFX',
  generic: 'GEN',
};

/**
 * Status-token backed completeness colors for the library row dot.
 * Tracks `--status-ok/warn/error` so theme + colorblind overrides flow
 * through automatically.
 */
export const COMPLETENESS_COLORS: Record<
  string,
  { color: string; label: string }
> = {
  complete: { color: 'rgb(var(--status-ok))',    label: 'Complete' },
  partial:  { color: 'rgb(var(--status-warn))',  label: 'Partial'  },
  minimal:  { color: 'rgb(var(--status-error))', label: 'Minimal'  },
};

// ─── Column B sub-tabs ─────────────────────────────────────────────────

export type AudioSubTab = 'events' | 'mixer' | 'presets' | 'sequencer';

export interface AudioSubTabDef {
  id: AudioSubTab;
  label: string;
}

/**
 * Column B is itself tabbed — events / mixer / effect presets / sequencer.
 * Declared as a static catalog so the wrapper test can assert against
 * the count without reaching into the rendered DOM.
 *
 * "Sequencer" here means the legacy `TimelinePanel` — it used to live
 * as a peer of SoundFontPanel under the AudioPanel `ReorderableSections`
 * shell; in the A/B layout it folds into Column B as one more sub-tab
 * so users don't lose access to the effect cue list.
 */
export const AUDIO_SUBTABS: ReadonlyArray<AudioSubTabDef> = [
  { id: 'events',    label: 'Events'         },
  { id: 'mixer',     label: 'EQ / Effects'   },
  { id: 'presets',   label: 'Effect Presets' },
  { id: 'sequencer', label: 'Sequencer'      },
];

export const DEFAULT_AUDIO_SUBTAB: AudioSubTab = 'events';

// ─── Format helpers ────────────────────────────────────────────────────

/** Human-readable byte sizes (1024-base, mirrors the legacy helper). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
