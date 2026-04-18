'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { playUISound } from '@/lib/uiSounds';
import { useModalDialog } from '@/hooks/useModalDialog';
import {
  BLADE_CONTROL_SHORTCUTS,
  EDITOR_SHORTCUTS,
  EFFECT_SHORTCUTS,
  type EffectShortcut,
} from '@/lib/keyboardShortcuts';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  key: string;
  label: string;
  description?: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Single keycap — JetBrains Mono for tight monospace rhythm, per
 *  UX North Star. Matches the kbd styling used in SettingsModal. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-0.5 rounded bg-bg-surface border border-border-light text-ui-xs text-text-primary font-mono tabular-nums shrink-0">
      {children}
    </kbd>
  );
}

function ShortcutGroup({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: readonly ShortcutRow[];
}) {
  return (
    <section className="space-y-1.5">
      <div>
        <p className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
          {title}
        </p>
        {subtitle && (
          <p className="text-ui-xs text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={`${title}-${row.key}-${row.label}`}
            className="flex items-center justify-between gap-4 px-3 py-1.5 rounded bg-bg-deep/50 border border-border-subtle"
          >
            <div className="min-w-0 flex-1">
              <p className="text-ui-sm text-text-secondary truncate">
                {row.label}
              </p>
              {row.description && (
                <p className="text-ui-xs text-text-muted truncate mt-0.5">
                  {row.description}
                </p>
              )}
            </div>
            <Kbd>{row.key}</Kbd>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * Keyboard Shortcuts Modal — flat Linear-style overlay listing every
 * shortcut the editor binds. Opened by `?`, `F1`, or the `?` icon
 * button in the header.
 *
 * Sourced from `@/lib/keyboardShortcuts` so the listing stays in sync
 * with the event dispatcher automatically.
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  const handleClose = useCallback(() => {
    playUISound('modal-close');
    onClose();
  }, [onClose]);

  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen,
    onClose: handleClose,
  });

  // Play open SFX to match SettingsModal behavior.
  useEffect(() => {
    if (isOpen) {
      playUISound('modal-open');
    }
  }, [isOpen]);

  // Partition effect shortcuts into one-shot vs sustained for display.
  const { oneShotRows, sustainedRows } = useMemo(() => {
    const toRow = (s: EffectShortcut): ShortcutRow => ({
      key: s.key,
      label: s.label,
    });
    return {
      oneShotRows: EFFECT_SHORTCUTS.filter((s) => !s.sustained).map(toRow),
      sustainedRows: EFFECT_SHORTCUTS.filter((s) => s.sustained).map(toRow),
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-modal-title"
    >
      <div className="bg-bg-secondary border border-border-light rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <div>
            <h2
              id="keyboard-shortcuts-modal-title"
              className="text-ui-lg font-semibold text-text-primary tracking-wide"
            >
              Keyboard Shortcuts
            </h2>
            <p className="text-ui-xs text-text-muted mt-0.5">
              Press <Kbd>?</Kbd> anywhere to reopen this panel
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors text-lg"
            aria-label="Close keyboard shortcuts"
          >
            &times;
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <ShortcutGroup
            title="Blade control"
            rows={BLADE_CONTROL_SHORTCUTS}
          />

          <ShortcutGroup
            title="One-shot effects"
            subtitle="Fire a single triggered effect on the blade"
            rows={oneShotRows}
          />

          <ShortcutGroup
            title="Sustained effects"
            subtitle="Press once to activate, press again to release"
            rows={sustainedRows}
          />

          <ShortcutGroup
            title="Editor"
            rows={EDITOR_SHORTCUTS}
          />
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-3 border-t border-border-subtle flex items-center justify-between">
          <p className="text-ui-xs text-text-muted">
            Shortcuts ignored while typing in a field
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded border border-border-subtle text-ui-sm font-medium text-text-muted hover:text-text-primary hover:border-border-light transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
