'use client';

// ─── EffectChip — clickable action-bar chip for a single effect ──────────────
//
// Extracted from WorkbenchLayout W4 (2026-04-22) so the new
// EffectsPinDropdown can render its own instance per pinned effect
// without coupling to WorkbenchLayout's internal helper function.
//
// Sustained effects (Lockup, Drag, Melt, Lightning, Force) show a
// "held / active" glow while the engine is driving them; clicking an
// active chip releases the effect. One-shot effects (Clash / Blast /
// Stab / …) never show the held state; they fire once and decay in
// the engine.

import { useActiveEffectsStore } from '@/stores/activeEffectsStore';
import { SUSTAINED_EFFECT_IDS } from '@/lib/keyboardShortcuts';

export interface EffectChipProps {
  type: string;
  label: string;
  hotkey: string;
  /**
   * Dispatch function that owns the shared trigger / release path
   * (keyboard + chip + palette go through the same helper so the
   * `activeEffectsStore` + auto-release timer registry stay in sync).
   */
  onToggle: (
    effectType: string,
    handlers: { triggerEffect: (type: string) => void; releaseEffect: (type: string) => void },
  ) => void;
  triggerHandler: (type: string) => void;
  releaseHandler: (type: string) => void;
}

export function EffectChip({
  type,
  label,
  hotkey,
  onToggle,
  triggerHandler,
  releaseHandler,
}: EffectChipProps) {
  const isSustained = SUSTAINED_EFFECT_IDS.has(type);
  const isActive = useActiveEffectsStore((s) =>
    isSustained && s.active.has(type),
  );

  const activeTitle = isSustained && isActive
    ? `Release ${label} (press ${hotkey} or click)`
    : `${label} effect (${hotkey})`;

  return (
    <button
      type="button"
      onClick={() =>
        onToggle(type, {
          triggerEffect: triggerHandler,
          releaseEffect: releaseHandler,
        })
      }
      className={[
        'px-2 py-1 rounded text-ui-xs font-medium border transition-colors',
        isActive
          ? 'border-accent-border text-accent bg-accent/15 shadow-[0_0_12px_0_rgb(var(--accent)/0.35)] ignite-btn-on'
          : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light hover:bg-bg-secondary',
      ].join(' ')}
      title={activeTitle}
      aria-pressed={isSustained ? isActive : undefined}
    >
      <span className="hidden desktop:inline">{label}</span>
      <span className="desktop:hidden">{hotkey}</span>
      <kbd className="hidden desktop:inline ml-1 text-ui-xs text-text-muted/50">{hotkey}</kbd>
    </button>
  );
}
