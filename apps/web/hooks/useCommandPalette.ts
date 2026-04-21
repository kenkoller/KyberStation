'use client';

import { useEffect } from 'react';
import { useCommandStore, type Command } from '@/stores/commandStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the given DOM target is an editable surface where
 * `⌘K` / `Ctrl+K` would interrupt the user — `<input>`, `<textarea>`,
 * `<select>`, or anything marked `contenteditable`. The palette must
 * not open from inside a text field.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== 'string') {
    return false;
  }
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * `useCommandPalette` — mount once at the app-shell level (WorkbenchLayout).
 *
 * Registers the global `⌘K` / `Ctrl+K` shortcut that opens the palette.
 * Intentionally does *not* own any other keys when the palette is
 * closed — once the palette is visible, `CommandPalette` itself takes
 * over (arrow keys, enter, esc) via `useModalDialog`.
 *
 * The global shortcut is guarded against input/textarea/select focus so
 * that typing `K` inside a field never accidentally opens the palette.
 */
export function useCommandPalette(): void {
  const toggle = useCommandStore((s) => s.toggle);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Modifier requirement: ⌘K on Mac, Ctrl+K elsewhere.
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== 'k') return;
      // Don't steal ⌘K while the user is typing in a field.
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      toggle();
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [toggle]);
}

/**
 * `useRegisterCommands` — companion hook for panels / hooks that want to
 * contribute commands to the palette.
 *
 * Register on mount, unregister on unmount. The dependency is the array
 * identity of `commands`, so callers should pass a `useMemo`'d / constant
 * array (or accept the re-registration cost).
 *
 * @example
 *   useRegisterCommands([
 *     { id: 'layer.add', group: 'LAYER', title: 'Add Layer', run: addLayer },
 *   ]);
 */
export function useRegisterCommands(commands: Command[]): void {
  const registerCommand = useCommandStore((s) => s.registerCommand);
  const unregisterCommand = useCommandStore((s) => s.unregisterCommand);

  useEffect(() => {
    for (const cmd of commands) {
      registerCommand(cmd);
    }
    return () => {
      for (const cmd of commands) {
        unregisterCommand(cmd.id);
      }
    };
  }, [commands, registerCommand, unregisterCommand]);
}
