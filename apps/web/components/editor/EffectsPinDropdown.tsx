'use client';

// ─── EffectsPinDropdown + PinnedEffectChips ─────────────────────────────────
//
// W4 (2026-04-22): effects-visibility rework for the action bar.
//
// `PinnedEffectChips` renders the user's currently pinned effects as
// clickable `EffectChip` instances in render order.
//
// `EffectsPinDropdown` is the `[ + more ▼ ]` chip that opens a menu of
// every known effect. The menu top has a "Show all" toggle that pins
// every effect at once; individual rows are checkboxes that pin / unpin
// single effects. Default pins are `clash / blast / lockup / stab`,
// set in uiStore (see `pinnedEffects`).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { EFFECT_SHORTCUTS, type EffectShortcut } from '@/lib/keyboardShortcuts';
import { EffectChip } from '@/components/editor/EffectChip';

// ─── Pure helpers (exported for tests) ──────────────────────────────────────

/**
 * Order the pinned effects as they should render left-to-right. We
 * preserve the user's pin order exactly — `pinnedEffects` is the
 * source of truth. Invalid entries (effects not present in
 * EFFECT_SHORTCUTS anymore) are dropped silently.
 */
export function orderPinnedEffects(
  pinned: readonly string[],
  known: readonly EffectShortcut[] = EFFECT_SHORTCUTS,
): EffectShortcut[] {
  const byKey = new Map(known.map((s) => [s.effect, s]));
  return pinned
    .map((id) => byKey.get(id))
    .filter((s): s is EffectShortcut => s !== undefined);
}

// ─── Pinned chips ────────────────────────────────────────────────────────────

export function PinnedEffectChips({
  onToggle,
  triggerHandler,
  releaseHandler,
}: {
  /** Matches `toggleOrTriggerEffect` from `@/lib/effectToggle` — the
   *  shared trigger/release dispatcher keyboard + click paths both use. */
  onToggle: (
    effectType: string,
    handlers: { triggerEffect: (type: string) => void; releaseEffect: (type: string) => void },
  ) => void;
  triggerHandler: (type: string) => void;
  releaseHandler: (type: string) => void;
}) {
  const pinnedEffects = useUIStore((s) => s.pinnedEffects);
  const ordered = useMemo(() => orderPinnedEffects(pinnedEffects), [pinnedEffects]);

  return (
    <>
      {ordered.map((shortcut) => (
        <EffectChip
          key={shortcut.effect}
          type={shortcut.effect as Parameters<typeof EffectChip>[0]['type']}
          label={shortcut.label}
          hotkey={shortcut.key}
          onToggle={onToggle}
          triggerHandler={triggerHandler}
          releaseHandler={releaseHandler}
        />
      ))}
    </>
  );
}

// ─── Dropdown ────────────────────────────────────────────────────────────────

export function EffectsPinDropdown() {
  const pinnedEffects = useUIStore((s) => s.pinnedEffects);
  const setPinnedEffects = useUIStore((s) => s.setPinnedEffects);
  const togglePinnedEffect = useUIStore((s) => s.togglePinnedEffect);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const allPinned = EFFECT_SHORTCUTS.every((s) =>
    pinnedEffects.includes(s.effect),
  );

  const onToggleShowAll = () => {
    if (allPinned) {
      // All pinned → unpin everything (no effects visible, IGNITE alone).
      setPinnedEffects([]);
    } else {
      // Pin every known effect, preserving the canonical EFFECT_SHORTCUTS
      // order.
      setPinnedEffects(EFFECT_SHORTCUTS.map((s) => s.effect));
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Configure pinned effects"
        className="px-2 py-1 text-ui-xs font-mono uppercase tracking-[0.08em] rounded border border-border-subtle text-text-muted hover:text-accent hover:border-accent-border transition-colors"
        title="Pin or unpin effects shown in the action bar"
      >
        + More ▾
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Effect pin list"
          className="absolute right-0 top-full mt-1 z-40 min-w-[220px] rounded-chrome border border-border-light bg-bg-secondary shadow-lg text-ui-xs font-mono"
        >
          {/* Show-all toggle */}
          <label className="flex items-center gap-2 px-2 py-1.5 border-b border-border-subtle cursor-pointer hover:bg-bg-deep/40">
            <input
              type="checkbox"
              checked={allPinned}
              onChange={onToggleShowAll}
              className="accent-current"
            />
            <span className="uppercase tracking-[0.08em] text-text-secondary">
              Show all effects
            </span>
          </label>
          {/* Individual effect checkboxes */}
          <div className="max-h-[280px] overflow-y-auto py-1">
            {EFFECT_SHORTCUTS.map((s) => {
              const pinned = pinnedEffects.includes(s.effect);
              return (
                <label
                  key={s.effect}
                  className="flex items-center justify-between gap-2 px-2 py-1 cursor-pointer hover:bg-bg-deep/40"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={pinned}
                      onChange={() => togglePinnedEffect(s.effect)}
                      className="accent-current"
                    />
                    <span className="text-text-secondary truncate">
                      {s.label}
                    </span>
                  </span>
                  <span className="text-text-muted/70 shrink-0">{s.key}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
