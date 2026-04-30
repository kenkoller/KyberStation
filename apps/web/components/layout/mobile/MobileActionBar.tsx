'use client';

// ─── MobileActionBar — Phase 4.2 (2026-04-30) ────────────────────────────────
//
// Five icon+letter effect chips: Ignite (I) · Clash (C) · Blaster (B) ·
// Lockup (L) · Stab (S), plus a `…` overflow that opens a popover with
// the remaining 3 effects (Lightning · Drag · Melt · Force).
//
// Per "Claude Design Mobile handoff/HANDOFF.md" Q2 verdict:
//   - 44 × 44px touch targets (Apple HIG floor)
//   - 18px icons, JetBrains Mono 600 / 9px / 0.08em letter
//   - Active fill: `rgba(var(--accent-warm) / 0.16)` for currently-firing
//   - Active letter: `rgb(var(--accent-warm))`
//
// Effect dispatch goes through `toggleOrTriggerEffect`, the canonical
// entry point used by keyboard shortcuts + the desktop EffectChip. That
// helper handles sustained-vs-momentary classification, the
// `activeEffectsStore` bookkeeping, and the optional accessibility
// auto-release timer — so taps on this bar behave identically to
// pressing the matching keyboard shortcut.

import { useState, useRef, useEffect } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useActiveEffectsStore } from '@/stores/activeEffectsStore';
import { toggleOrTriggerEffect, type EffectHandlers } from '@/lib/effectToggle';

interface MobileActionBarProps {
  /** Toggle blade on/off (Ignite chip). */
  onToggleIgnite: () => void;
  /** Trigger a momentary effect by type id (clash/blast/stab/etc). */
  onTriggerEffect: (type: string) => void;
  /** Release a sustained effect by type id (lockup/drag/melt/lightning). */
  onReleaseEffect: (type: string) => void;
}

interface ChipDef {
  id: string;
  label: string;
  letter: string;
  iconPath: string;
}

// Inline icon SVG paths copied from the handoff primitives.jsx — these
// match the visual language Ken's design exploration used and stay
// outside the existing component icon library so the action bar can
// be reshaped independently.
const I_PATH = {
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  flame:
    'M12 2c1 4-3 5-3 9a3 3 0 1 0 6 0c0-2-1-3-1-5 2 2 4 4 4 7a6 6 0 1 1-12 0c0-5 4-7 6-11Z',
  target:
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  shield: 'M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z',
  swords:
    'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M15 5l4-4 2 2-4 4M18 8l3-3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  zap: 'M3 12c2-2 5-2 7 0s5 2 7 0',
  flameAlt:
    'M12 2c0 4 3 6 3 9 0 2-1 3-3 3s-3-1-3-3c0-2 1-3 1-5-1 1-2 3-2 5a5 5 0 0 0 10 0c0-4-3-6-6-9Z',
  drag: 'M5 9h14M5 15h14',
  force: 'M12 2v20M2 12h20M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6',
} as const;

const PRIMARY_CHIPS: ChipDef[] = [
  // Ignite is index 0 — a synthetic "effect" that toggles the blade.
  // We treat it specially in the click handler below.
  { id: 'ignite', label: 'Ignite', letter: 'I', iconPath: I_PATH.bolt },
  { id: 'clash', label: 'Clash', letter: 'C', iconPath: I_PATH.flame },
  { id: 'blast', label: 'Blaster', letter: 'B', iconPath: I_PATH.target },
  { id: 'lockup', label: 'Lockup', letter: 'L', iconPath: I_PATH.shield },
  { id: 'stab', label: 'Stab', letter: 'S', iconPath: I_PATH.swords },
];

const OVERFLOW_CHIPS: ChipDef[] = [
  { id: 'lightning', label: 'Lightning', letter: 'N', iconPath: I_PATH.zap },
  { id: 'drag', label: 'Drag', letter: 'D', iconPath: I_PATH.drag },
  { id: 'melt', label: 'Melt', letter: 'M', iconPath: I_PATH.flameAlt },
  { id: 'force', label: 'Force', letter: 'F', iconPath: I_PATH.force },
];

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function MobileActionBar({
  onToggleIgnite,
  onTriggerEffect,
  onReleaseEffect,
}: MobileActionBarProps) {
  const isOn = useBladeStore((s) => s.isOn);
  // Subscribe to the whole `active` set so any held-effect change re-renders.
  // Cheap — store mutation creates a new Set reference only when membership
  // changes, so unrelated re-renders are filtered.
  const activeSet = useActiveEffectsStore((s) => s.active);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);

  // Close overflow on outside click + Escape.
  useEffect(() => {
    if (!overflowOpen) return;
    function onPointer(e: PointerEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOverflowOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [overflowOpen]);

  const handlers: EffectHandlers = {
    triggerEffect: onTriggerEffect,
    releaseEffect: onReleaseEffect,
  };

  function handleChipClick(chip: ChipDef) {
    if (chip.id === 'ignite') {
      onToggleIgnite();
      return;
    }
    if (!isOn) return;
    toggleOrTriggerEffect(chip.id, handlers);
    // Close overflow after picking an overflow effect.
    if (overflowOpen) setOverflowOpen(false);
  }

  function isChipFiring(chip: ChipDef): boolean {
    if (chip.id === 'ignite') return isOn;
    return activeSet.has(chip.id);
  }

  function renderChip(chip: ChipDef) {
    const firing = isChipFiring(chip);
    const disabled = chip.id !== 'ignite' && !isOn;
    return (
      <button
        key={chip.id}
        type="button"
        onClick={() => handleChipClick(chip)}
        disabled={disabled}
        aria-label={`${chip.label} effect (${chip.letter})`}
        aria-pressed={firing}
        data-firing={firing || undefined}
        data-chip-id={chip.id}
        className={[
          'mobile-action-chip',
          'relative flex items-center justify-center shrink-0',
          'rounded-interactive border transition-colors select-none',
          firing
            ? 'bg-[rgb(var(--accent-warm)/0.16)] border-[rgb(var(--accent-warm)/0.5)] text-[rgb(var(--accent-warm))]'
            : disabled
              ? 'bg-bg-surface border-border-subtle text-text-muted cursor-not-allowed opacity-60'
              : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light active:scale-[0.97]',
        ].join(' ')}
        style={{
          minHeight: 'var(--touch-target)',
          minWidth: 'var(--touch-target)',
          height: 'var(--touch-target)',
          width: 'var(--touch-target)',
        }}
        title={`${chip.label} (${chip.letter})`}
      >
        <Icon d={chip.iconPath} size={18} />
        <span
          aria-hidden="true"
          className="absolute right-1 bottom-0.5 font-mono text-[9px] font-semibold tracking-[0.08em] leading-none"
        >
          {chip.letter}
        </span>
      </button>
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="Effect triggers"
      className="mobile-action-bar w-full flex items-center justify-between gap-1 px-2 border-b border-border-subtle bg-bg-secondary/80"
      style={{ height: 'var(--actionbar-h)' }}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {PRIMARY_CHIPS.map(renderChip)}
      </div>

      {/* Overflow: opens a small popover anchored above the … button. */}
      <div ref={overflowRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOverflowOpen((v) => !v)}
          aria-label="More effects"
          aria-expanded={overflowOpen}
          aria-haspopup="menu"
          className={[
            'flex items-center justify-center rounded-interactive border transition-colors',
            overflowOpen
              ? 'bg-accent-dim border-accent-border/50 text-accent'
              : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary',
          ].join(' ')}
          style={{
            minHeight: 'var(--touch-target)',
            minWidth: 'var(--touch-target)',
            height: 'var(--touch-target)',
            width: 'var(--touch-target)',
          }}
        >
          <Icon d={I_PATH.more} size={18} />
        </button>

        {overflowOpen && (
          <div
            role="menu"
            aria-label="More effects"
            className="absolute right-0 z-30 flex flex-col gap-1 p-1 rounded-chrome border border-border-light bg-bg-card shadow-lg"
            style={{ bottom: 'calc(100% + 4px)' }}
          >
            {OVERFLOW_CHIPS.map(renderChip)}
          </div>
        )}
      </div>
    </div>
  );
}
