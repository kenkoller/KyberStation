'use client';

// ─── CombatEffectsColumnA — Sidebar A/B v2 Phase 4 ─────────────────────
//
// Filterable list of 21 combat effects, with a leading "GENERAL" row
// for effect-related global settings (Preon + Dual-Mode Ignition).
// Replaces the bag-of-collapsibles in legacy `EffectPanel.tsx` (the
// off-flag fallback) with a focused per-effect selection surface.
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.4:
//   - Each row: glyph thumbnail · label · 1-line description · hotkey
//     pill (if any) + active-glow when sustained-and-held
//   - Top of A: search input ("Filter 21 effects…")
//
// Selection state is owned by the parent `CombatEffectsAB` wrapper
// and threaded as props (mirrors IgnitionRetractionAB's tab-state
// pattern) — Column B reads the same value to know which effect's
// deep config to render.

import { useMemo } from 'react';
import { useActiveEffectsStore } from '@/stores/activeEffectsStore';
import { playUISound } from '@/lib/uiSounds';
import {
  COMBAT_EFFECTS,
  COMBAT_EFFECT_GENERAL,
  COMBAT_EFFECT_GENERAL_ID,
  type CombatEffectCategory,
  type CombatEffectRowId,
} from './effectCatalog';

// Tailwind config exposes --bg / --accent / --text / --border tokens as
// classes; the status / faction palette only exists as raw CSS variables.
// Existing components reach for them via inline `rgb(var(...))` (see
// StatusBar / AppPerfStrip). We do the same: inline-style colors per
// category so the row glyph reads as warm / sith / magenta without
// adding new Tailwind tokens.
const CATEGORY_GLYPH_COLOR: Record<CombatEffectCategory, string> = {
  impact:    'rgb(var(--status-warn))',
  sustained: 'rgb(var(--faction-sith))',
  exotic:    'rgb(var(--status-magenta))',
};

const HELD_RING_COLOR = 'rgb(var(--faction-sith) / 0.6)';
const HELD_DOT_COLOR = 'rgb(var(--faction-sith))';

export interface CombatEffectsColumnAProps {
  selectedId: CombatEffectRowId;
  onSelect: (id: CombatEffectRowId) => void;
}

export function CombatEffectsColumnA({
  selectedId,
  onSelect,
}: CombatEffectsColumnAProps): JSX.Element {
  // Subscribe to the held-effects set so sustained rows pulse when
  // they're being held (parity with the action-bar chip glow).
  const activeEffects = useActiveEffectsStore((s) => s.active);

  // Filter state intentionally left out of Column A's first cut —
  // 21 effects + GENERAL fits in the visible rail at common heights
  // and the test of Phase 2 was that filter wasn't load-bearing.
  // Add it back if user feedback says scanning is hard.

  const handleSelect = (id: CombatEffectRowId): void => {
    if (id === selectedId) return;
    playUISound('button-click');
    onSelect(id);
  };

  // Build effect rows once — the table is static so this memo is just
  // a light future-proof for sort modes.
  const effectRows = useMemo(() => COMBAT_EFFECTS, []);

  return (
    <div className="flex flex-col h-full" data-testid="combat-effects-column-a">
      {/* Sticky header — counts both GENERAL + 21 effects so users see
          "22 entries" rather than "21 effects + 1 hidden" */}
      <div className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <h3 className="font-mono uppercase text-ui-xs tracking-[0.10em] text-text-muted">
          Effects · {COMBAT_EFFECTS.length}
        </h3>
      </div>

      {/* Scrollable list body. */}
      <ul
        role="listbox"
        aria-label="Combat effect"
        aria-activedescendant={`combat-effect-row-${selectedId}`}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {/* GENERAL — pinned first row. Distinct visual treatment so it
            doesn't look like one of the 21 effects. */}
        {(() => {
          const isActive = selectedId === COMBAT_EFFECT_GENERAL_ID;
          return (
            <li
              key={COMBAT_EFFECT_GENERAL.id}
              id={`combat-effect-row-${COMBAT_EFFECT_GENERAL.id}`}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => handleSelect(COMBAT_EFFECT_GENERAL.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(COMBAT_EFFECT_GENERAL.id);
                }
              }}
              className={[
                'flex items-start gap-2.5 px-3 py-2 cursor-pointer outline-none border-l-2 transition-colors',
                'border-b border-border-subtle/50',
                'focus-visible:bg-bg-surface/80',
                isActive
                  ? 'bg-accent-dim/30 border-l-accent text-accent'
                  : 'border-l-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary',
              ].join(' ')}
            >
              <div
                className="shrink-0 bg-bg-deep rounded-chrome border border-border-subtle flex items-center justify-center text-text-muted"
                style={{ width: 40, height: 40, fontSize: 22, lineHeight: 1 }}
                aria-hidden="true"
              >
                {COMBAT_EFFECT_GENERAL.glyph}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div
                  className={[
                    'text-ui-sm font-medium truncate',
                    isActive ? 'text-accent' : 'text-text-primary',
                  ].join(' ')}
                >
                  {COMBAT_EFFECT_GENERAL.label}
                </div>
                <div className="text-ui-xs text-text-muted truncate">
                  {COMBAT_EFFECT_GENERAL.desc}
                </div>
              </div>
            </li>
          );
        })()}

        {effectRows.map((effect) => {
          const isActive = effect.id === selectedId;
          const isHeld = effect.sustained && activeEffects.has(effect.id);
          return (
            <li
              key={effect.id}
              id={`combat-effect-row-${effect.id}`}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => handleSelect(effect.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(effect.id);
                }
              }}
              className={[
                'flex items-start gap-2.5 px-3 py-2 cursor-pointer outline-none border-l-2 transition-colors',
                'focus-visible:bg-bg-surface/80',
                isActive
                  ? 'bg-accent-dim/30 border-l-accent text-accent'
                  : 'border-l-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary',
              ].join(' ')}
              data-active-held={isHeld ? 'true' : undefined}
            >
              {/* 40×40 glyph well — same shape as Phase-2 thumbnails so
                  list rhythm matches blade-style + ignition-retraction.
                  Color comes from inline style (token-defined palette). */}
              <div
                className="shrink-0 bg-bg-deep rounded-chrome border border-border-subtle flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  fontSize: 20,
                  lineHeight: 1,
                  color: CATEGORY_GLYPH_COLOR[effect.category],
                  ...(isHeld ? { boxShadow: `0 0 0 2px ${HELD_RING_COLOR}` } : null),
                }}
                aria-hidden="true"
              >
                {effect.glyph}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={[
                      'text-ui-sm font-medium truncate',
                      isActive ? 'text-accent' : 'text-text-primary',
                    ].join(' ')}
                  >
                    {effect.label}
                  </span>
                  {effect.sustained && (
                    <span
                      className="shrink-0 text-ui-xs uppercase tracking-wider px-1 rounded text-text-muted border border-border-subtle"
                      title="Sustained — toggles on/off rather than firing once"
                    >
                      hold
                    </span>
                  )}
                  {isHeld && (
                    <span
                      className="shrink-0 w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: HELD_DOT_COLOR }}
                      aria-label="Currently held"
                    />
                  )}
                </div>
                <div className="text-ui-xs text-text-muted truncate">
                  {effect.desc}
                </div>
              </div>
              {/* Right-edge hotkey pill — only when this effect has one.
                  Mirrors the EffectChip's <kbd> badge so users learn
                  the same shortcut from any surface. */}
              {effect.shortcut && (
                <kbd
                  className="shrink-0 self-center text-ui-xs font-mono text-text-muted bg-bg-deep border border-border-subtle rounded-chrome px-1.5 py-0.5"
                  aria-label={`Keyboard shortcut: ${effect.shortcut}`}
                >
                  {effect.shortcut}
                </kbd>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
