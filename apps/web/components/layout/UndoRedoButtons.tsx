'use client';

import { useEffect, useCallback } from 'react';
import { useHistoryStore } from '@/stores/historyStore';
import { useBladeStore } from '@/stores/bladeStore';
import {
  beginHistoryRestore,
  endHistoryRestore,
} from '@/stores/historyRestoreFlag';
import { playUISound } from '@/lib/uiSounds';

/**
 * UndoRedoButtons — compact undo / redo controls for the header bar.
 *
 * - Reads canUndo / canRedo / labels from historyStore.
 * - On undo/redo, applies the restored snapshot to bladeStore via setConfig.
 * - Registers Cmd/Ctrl+Z (undo) and Cmd/Ctrl+Shift+Z (redo) keyboard shortcuts.
 * - Plays a 'button-click' UI sound on each action.
 */
export function UndoRedoButtons() {
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undoLabel = useHistoryStore((s) => s.undoLabel);
  const redoLabel = useHistoryStore((s) => s.redoLabel);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const setConfig = useBladeStore((s) => s.setConfig);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const entry = undo();
    if (entry) {
      // Guard the setConfig call so useHistoryTracking's subscription
      // does not re-push this restored snapshot onto the stack. See
      // historyRestoreFlag.ts for rationale.
      beginHistoryRestore();
      try {
        setConfig(entry.snapshot);
      } finally {
        endHistoryRestore();
      }
      playUISound('button-click');
    }
  }, [canUndo, undo, setConfig]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const entry = redo();
    if (entry) {
      beginHistoryRestore();
      try {
        setConfig(entry.snapshot);
      } finally {
        endHistoryRestore();
      }
      playUISound('button-click');
    }
  }, [canRedo, redo, setConfig]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Cmd/Ctrl+Shift+Z  OR  Cmd/Ctrl+Y (Windows-style redo)
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // ── Shared button styles ────────────────────────────────────────────────
  const baseClass =
    'flex items-center justify-center w-7 h-6 rounded text-ui-xs font-medium border transition-colors select-none';
  const activeClass =
    'border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light';
  const disabledClass =
    'border-transparent text-text-muted opacity-30 cursor-not-allowed';

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Undo/Redo">
      {/* Undo */}
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        title={undoLabel ? `Undo: ${undoLabel}` : 'Nothing to undo'}
        aria-label={undoLabel ? `Undo: ${undoLabel}` : 'Undo'}
        className={`${baseClass} ${canUndo ? activeClass : disabledClass}`}
      >
        {/* Counter-clockwise arrow */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3.5 5H10a4 4 0 0 1 0 8H6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="1,3 3.5,5 1,7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="rotate(180 2.25 5)"
          />
        </svg>
      </button>

      {/* Redo */}
      <button
        onClick={handleRedo}
        disabled={!canRedo}
        title={redoLabel ? `Redo: ${redoLabel}` : 'Nothing to redo'}
        aria-label={redoLabel ? `Redo: ${redoLabel}` : 'Redo'}
        className={`${baseClass} ${canRedo ? activeClass : disabledClass}`}
      >
        {/* Clockwise arrow */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12.5 5H6a4 4 0 0 0 0 8h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="14.5,3 12.5,5 14.5,7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
