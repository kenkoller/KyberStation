// ─── Combat-effects catalog — Sidebar A/B v2 Phase 4 ──────────────────
//
// Shared between CombatEffectsColumnA (the 21-row list + the leading
// GENERAL row) and CombatEffectsColumnB (the deep editor header). One
// table — id / label / desc / glyph / category / sustained / shortcut —
// drives both columns + the test fixtures.
//
// ID alignment notes:
//   - `id` matches the `EffectType` union from `@kyberstation/engine`,
//     so passing `effect.id` straight to `triggerEffect` / `releaseEffect`
//     works without remapping.
//   - `shortcut` mirrors `EFFECT_SHORTCUTS` in `@/lib/keyboardShortcuts`.
//     If a shortcut moves there, this table must follow — the keyboard
//     module is the source of truth and the test below pins the link.
//
// Category buckets are visual-only — the list renders flat (one effect
// per row), but the category drives the glyph color and lets future
// sort modes group rows ("show only sustained" / "impacts first").

import type { EffectType } from '@kyberstation/engine';

export type CombatEffectCategory = 'impact' | 'sustained' | 'exotic';

export interface CombatEffectEntry {
  /** Engine `EffectType` id; passes straight to triggerEffect. */
  id: EffectType;
  /** Title-cased label shown in the row + B-column header. */
  label: string;
  /** 1-line description shown in the row + B-column header. */
  desc: string;
  /** Single-character glyph rendered in the 40×40 thumbnail well. */
  glyph: string;
  /** Visual grouping — drives the glyph badge color in the row. */
  category: CombatEffectCategory;
  /** Sustained = toggles on/off; one-shot = fires + decays. */
  sustained: boolean;
  /** Single-key keyboard shortcut (uppercase letter), if any. */
  shortcut: string | null;
}

export const COMBAT_EFFECTS: ReadonlyArray<CombatEffectEntry> = [
  // ── Impact one-shots — direct mechanical hits on the blade ──
  { id: 'clash',        label: 'Clash',        desc: 'Two blades striking',           glyph: '✦', category: 'impact',    sustained: false, shortcut: 'C' },
  { id: 'blast',        label: 'Blast',        desc: 'Bolt deflection mark',          glyph: '◉', category: 'impact',    sustained: false, shortcut: 'B' },
  { id: 'stab',         label: 'Stab',         desc: 'Blade tip impact',              glyph: '➤', category: 'impact',    sustained: false, shortcut: 'S' },
  { id: 'shockwave',    label: 'Shockwave',    desc: 'Dual Gaussian wavefronts',      glyph: '◎', category: 'impact',    sustained: false, shortcut: 'W' },
  { id: 'fragment',     label: 'Fragment',     desc: 'Expanding segment gaps',        glyph: '✣', category: 'impact',    sustained: false, shortcut: 'R' },

  // ── Sustained — held until released ──
  { id: 'lockup',       label: 'Lockup',       desc: 'Two blades in contact',         glyph: '⚔', category: 'sustained', sustained: true,  shortcut: 'L' },
  { id: 'drag',         label: 'Drag',         desc: 'Blade dragged along surface',   glyph: '↻', category: 'sustained', sustained: true,  shortcut: 'D' },
  { id: 'melt',         label: 'Melt',         desc: 'Blade burning through material', glyph: '◐', category: 'sustained', sustained: true,  shortcut: 'M' },
  { id: 'lightning',    label: 'Lightning',    desc: 'Force-lightning absorption',    glyph: '⚡', category: 'sustained', sustained: true,  shortcut: 'N' },

  // ── Exotic one-shots — character-driven flourishes ──
  { id: 'force',        label: 'Force',        desc: 'Force pulse / push',            glyph: '◈', category: 'exotic',    sustained: false, shortcut: 'F' },
  { id: 'scatter',      label: 'Scatter',      desc: 'Random pixel flash burst',      glyph: '⁘', category: 'exotic',    sustained: false, shortcut: null },
  { id: 'ripple',       label: 'Ripple',       desc: 'Concentric ring waves',         glyph: '◯', category: 'exotic',    sustained: false, shortcut: null },
  { id: 'freeze',       label: 'Freeze',       desc: 'Icy crystal spread',            glyph: '❄', category: 'exotic',    sustained: false, shortcut: null },
  { id: 'overcharge',   label: 'Overcharge',   desc: 'Power surge + flicker',         glyph: '⚠', category: 'exotic',    sustained: false, shortcut: null },
  { id: 'bifurcate',    label: 'Bifurcate',    desc: 'Warm / cool color split',       glyph: '⬔', category: 'exotic',    sustained: false, shortcut: 'V' },
  { id: 'invert',       label: 'Invert',       desc: 'Negative-space flash',          glyph: '◑', category: 'exotic',    sustained: false, shortcut: null },
  { id: 'ghostEcho',    label: 'Ghost Echo',   desc: 'Trailing afterimage',           glyph: '⌖', category: 'exotic',    sustained: false, shortcut: 'G' },
  { id: 'splinter',     label: 'Splinter',     desc: 'Cracked-shard scatter',         glyph: '✶', category: 'exotic',    sustained: false, shortcut: 'P' },
  { id: 'coronary',     label: 'Coronary',     desc: 'Pulsing heartbeat ring',        glyph: '♥', category: 'exotic',    sustained: false, shortcut: 'E' },
  { id: 'glitchMatrix', label: 'Glitch Matrix', desc: 'Datamosh-style scramble',      glyph: '⌗', category: 'exotic',    sustained: false, shortcut: 'X' },
  { id: 'siphon',       label: 'Siphon',       desc: 'Energy drain toward emitter',   glyph: '↧', category: 'exotic',    sustained: false, shortcut: 'H' },
];

// ─── Special "GENERAL" row ────────────────────────────────────────────
//
// Hosts effect-related global config that doesn't belong to any one
// effect — Preon (pre-ignition flash) + Dual-Mode Ignition (angle-based
// ignition switching). Per `IgnitionRetractionColumnB.tsx` line 250's
// pointer card, these belong to "Combat Effects" in the new IA.
//
// The GENERAL row is treated specially: rendered first in Column A
// with a distinct "globe" glyph; its `id` does NOT exist in the engine
// `EffectType` union and therefore must NEVER be passed to
// `triggerEffect`. Column B branches on this id to swap views.

export const COMBAT_EFFECT_GENERAL_ID = '__general__' as const;

export interface CombatEffectGeneralEntry {
  id: typeof COMBAT_EFFECT_GENERAL_ID;
  label: string;
  desc: string;
  glyph: string;
}

export const COMBAT_EFFECT_GENERAL: CombatEffectGeneralEntry = {
  id: COMBAT_EFFECT_GENERAL_ID,
  label: 'General',
  desc: 'Preon flash · Dual-mode ignition · Effect log',
  glyph: '◌',
};

/** Row identity exposed to consumers — either an effect or the GENERAL row. */
export type CombatEffectRowId = typeof COMBAT_EFFECT_GENERAL_ID | EffectType;

/**
 * Type guard: is the row id one of the 21 actual effects (i.e. safe to
 * pass to `triggerEffect`)? Exported because Column B's trigger-button
 * + filtered log code paths must NOT activate when GENERAL is selected.
 */
export function isEffectRowId(id: CombatEffectRowId | string): id is EffectType {
  if (id === COMBAT_EFFECT_GENERAL_ID) return false;
  return COMBAT_EFFECTS.some((e) => e.id === id);
}

export function getCombatEffect(id: string): CombatEffectEntry | undefined {
  return COMBAT_EFFECTS.find((e) => e.id === id);
}

// Default selection — opens the panel on Clash since it's the most
// common effect users tune first (per existing EffectPanel ordering).
export const DEFAULT_COMBAT_EFFECT_ID: EffectType = 'clash';
