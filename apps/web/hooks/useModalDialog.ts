'use client';

import { useEffect, useRef, type RefObject } from 'react';

interface UseModalDialogOptions {
  /**
   * Whether the modal is currently open. Hook no-ops when false.
   */
  isOpen: boolean;

  /**
   * Called when the user presses Escape. Typically the modal's close handler.
   */
  onClose: () => void;

  /**
   * Optional: disable Escape-to-close. Defaults to true.
   */
  closeOnEscape?: boolean;
}

interface UseModalDialogResult<T extends HTMLElement> {
  /**
   * Attach this ref to the modal's outermost dialog container.
   * Used as the keydown-listener target and the focusable-element
   * query scope.
   */
  dialogRef: RefObject<T>;
}

/**
 * Shared modal dialog behavior:
 *   1. On open: remember what had focus, then move focus to the first
 *      focusable element inside the dialog.
 *   2. While open: trap Tab / Shift+Tab so focus stays inside.
 *   3. While open: ESC triggers onClose (can be disabled).
 *   4. On close: restore focus to whatever was focused before open.
 *
 * Host component is still responsible for:
 *   - role="dialog" / aria-modal / aria-labelledby attributes
 *   - Click-outside-to-close (if desired)
 *   - Visual animations / sound effects
 */
export function useModalDialog<T extends HTMLElement = HTMLDivElement>(
  options: UseModalDialogOptions,
): UseModalDialogResult<T> {
  const { isOpen, onClose, closeOnEscape = true } = options;
  const dialogRef = useRef<T>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;

    const dialog = dialogRef.current;
    if (!dialog) return;

    // Query every focusable element inside the dialog. Buttons,
    // links, inputs, selects, textareas, and anything with an
    // explicit non-negative tabindex. Excluded disabled elements.
    const getFocusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    const focusables = getFocusables();
    // Prefer an explicit `[data-autofocus]` element (lets the host
    // point at the primary action button even when it isn't first
    // in DOM order — e.g. onboarding has a Skip button rendered
    // above GET STARTED). Otherwise fall back to the first
    // focusable element.
    const autofocusTarget = dialog.querySelector<HTMLElement>('[data-autofocus]');
    (autofocusTarget ?? focusables[0])?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      // Re-query on each Tab — focusables can change as steps advance.
      const current = getFocusables();
      if (current.length === 0) return;
      const first = current[0];
      const last = current[current.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !dialog.contains(document.activeElement)) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last || !dialog.contains(document.activeElement)) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that opened the modal.
      const previous = previousFocusRef.current as HTMLElement | null;
      if (previous && typeof previous.focus === 'function') {
        previous.focus();
      }
    };
  }, [isOpen, onClose, closeOnEscape]);

  return { dialogRef };
}
