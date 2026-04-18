'use client';

// ─── CollapsibleSection — shared disclosure primitive ────────────────────────
//
// Consistent expand/collapse affordance for editor panel sections. Replaces
// the various ad-hoc `<h3>` + conditional-render patterns sprinkled across
// StylePanel, EffectPanel, GradientBuilder, etc. with a single primitive
// that pins:
//
//   - Header typography (text-ui-xs text-text-muted uppercase tracking-wider)
//     matching LayerStack's label register
//   - Chevron glyph (▾ open / ▸ closed) with CSS rotation
//   - Keyboard contract (Enter/Space toggle, aria-expanded, aria-controls)
//   - Optional localStorage persistence via `persistKey`
//
// The pure helpers below (storageKey, readStoredState, writeStoredState,
// resolveInitialOpen, isToggleKey) are exported for co-located unit tests
// — the vitest environment is node-only with no jsdom, so we verify the
// logic through its helpers rather than rendering the component.

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

// ─── Pure helpers (exported for tests) ───

/**
 * Namespace all CollapsibleSection persistKeys under a single prefix so
 * clearing `kyber.collapsible.*` is a one-liner if we ever need to reset.
 */
export const COLLAPSIBLE_STORAGE_PREFIX = 'kyber.collapsible.';

/** Build the full localStorage key for a given persistKey. */
export function storageKey(persistKey: string): string {
  return `${COLLAPSIBLE_STORAGE_PREFIX}${persistKey}`;
}

/**
 * Read a persisted open/closed state from localStorage.
 *
 * Returns `null` if there is no stored value, if localStorage is
 * unavailable (SSR / blocked), or if the stored value is unparseable.
 * Returning `null` lets the caller fall back to `defaultOpen`.
 */
export function readStoredState(persistKey: string): boolean | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(persistKey));
    if (raw === null) return null;
    if (raw === '1' || raw === 'true') return true;
    if (raw === '0' || raw === 'false') return false;
    return null;
  } catch {
    // localStorage can throw in Safari private mode or when quota-exceeded
    return null;
  }
}

/** Write an open/closed state to localStorage. Silent on failure. */
export function writeStoredState(persistKey: string, open: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(persistKey), open ? '1' : '0');
  } catch {
    // Quota exceeded / blocked — skip silently
  }
}

/**
 * Resolve the initial open state given both a defaultOpen preference and
 * a (possibly absent) persistKey. The stored value, if any, wins over
 * `defaultOpen` so the user's last choice survives reloads.
 */
export function resolveInitialOpen(
  defaultOpen: boolean,
  persistKey?: string,
): boolean {
  if (!persistKey) return defaultOpen;
  const stored = readStoredState(persistKey);
  return stored ?? defaultOpen;
}

/**
 * Per WAI-ARIA disclosure pattern: Enter and Space activate the toggle.
 * Native <button> already handles both in normal browser behavior, but
 * the helper is exported to document the contract and to let tests
 * assert key recognition without touching the DOM.
 */
export function isToggleKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

// ─── Component ───

export interface CollapsibleSectionProps {
  /** Header label — rendered in Inter uppercase tracked. */
  title: string;
  /** Whether the section starts expanded. Defaults to true. */
  defaultOpen?: boolean;
  /**
   * When set, open/closed state persists to localStorage under
   * `kyber.collapsible.<persistKey>`. Omit to get session-only state.
   */
  persistKey?: string;
  /** Section body. */
  children: ReactNode;
  /**
   * Optional override for the disclosure header's accessible name.
   * Defaults to the `title` string; use this when the visible title
   * alone isn't enough context (e.g. several sections share a label).
   */
  'aria-label'?: string;
  /** Fires whenever the user toggles the section. */
  onToggle?: (open: boolean) => void;
  /**
   * Optional right-aligned slot in the header row — typically a
   * HelpTooltip or a small count badge. Kept compact so it doesn't
   * shove the chevron around.
   */
  headerAccessory?: ReactNode;
  /** Optional passthrough className for the outer wrapper. */
  className?: string;
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  persistKey,
  children,
  onToggle,
  headerAccessory,
  className = '',
  ...rest
}: CollapsibleSectionProps) {
  // `resolveInitialOpen` is cheap and idempotent — calling it in the
  // useState initializer avoids a double-render flash on SSR → client
  // hydration when we do have a persisted value.
  const [open, setOpen] = useState(() =>
    resolveInitialOpen(defaultOpen, persistKey),
  );

  // `useId` gives us a stable unique id per mount, which we thread
  // through aria-controls to wire the header button to its region.
  const generatedId = useId();
  const regionId = `collapsible-${generatedId}`;

  // Track the first render so we skip persisting the initial resolved
  // state back to storage (it's already there).
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (persistKey) {
      writeStoredState(persistKey, open);
    }
  }, [open, persistKey]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  }, [onToggle]);

  // Native <button> handles Enter/Space click-fire by default, so we
  // don't need an explicit keydown handler. The `isToggleKey` helper is
  // exported separately for documentation + test coverage.
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      // Explicitly handle Space to prevent page scroll on some browsers
      // when the button is focused.
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  const ariaLabel = rest['aria-label'] ?? title;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        aria-controls={regionId}
        aria-label={ariaLabel}
        className="w-full flex items-center gap-1.5 text-left py-1 hover:text-text-primary transition-colors"
      >
        <span
          aria-hidden="true"
          className={`inline-block text-ui-xs leading-none text-text-muted transition-transform duration-150 ${
            open ? '' : '-rotate-90'
          }`}
          style={{ width: '0.75em' }}
        >
          {'\u25BE'}{/* ▾ */}
        </span>
        <span className="text-ui-xs text-text-muted uppercase tracking-wider flex-1">
          {title}
        </span>
        {headerAccessory ? (
          <span className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
            {headerAccessory}
          </span>
        ) : null}
      </button>
      <div
        id={regionId}
        role="region"
        aria-label={ariaLabel}
        hidden={!open}
        className={open ? 'pt-2 space-y-3' : ''}
      >
        {open ? children : null}
      </div>
    </div>
  );
}
