'use client';

// ─── QuickTransitionPicker — shared internal for QuickIgnition/Retraction ──
//
// Compact single-row control for the Inspector sidebar. Renders as:
//
//   ┌─ LABEL ─────────────────────────────────┐
//   │ [▦]  Current Name           [ 500 ] ms  │   ← row (36px tall)
//   └─────────────────────────────────────────┘
//     ▼ click thumbnail → MGP expands here
//
// Both QuickIgnitionPicker and QuickRetractionPicker are near-identical —
// they differ only in the items catalog, the label, the active value
// selector, the ms field, and the onSelect / onChangeMs handlers. This
// helper consumes all of those as props so each wrapper stays thin.
//
// The picker is an INLINE expansion (not a portal popover). The Inspector
// sidebar is narrow enough that the MGP's 3-col card grid fits directly
// below the row without overlap concerns, and inline reveal keeps the
// control self-contained so it scrolls with the rest of the Inspector.
//
// Keyboard: Escape collapses the expanded picker. Selecting an item
// auto-collapses. Focus returns to the trigger button on close.

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  MiniGalleryPicker,
  type MiniGalleryItem,
} from '@/components/shared/MiniGalleryPicker';

export interface QuickTransitionPickerProps {
  /** Visible section heading — usually 'IGNITION' or 'RETRACTION'. */
  label: string;
  /** Catalog of MGP items (id, label, thumbnail, description). */
  items: MiniGalleryItem[];
  /** Currently-selected item id (`config.ignition` / `config.retraction`). */
  activeId: string;
  /** Commit a new id back to the bladeStore. */
  onSelect: (id: string) => void;
  /** Current ms timing (`config.ignitionMs` / `config.retractionMs`). */
  ms: number;
  /** Commit a new ms value back to the bladeStore. */
  onChangeMs: (ms: number) => void;
  /** Min ms (defaults to 50). */
  msMin?: number;
  /** Max ms (defaults to 3000). */
  msMax?: number;
  /** Increment step on the numeric input (defaults to 50). */
  msStep?: number;
  /** ARIA label for the MGP listbox. */
  pickerAriaLabel?: string;
}

/** Resolve the active MGP item, falling back to a neutral placeholder. */
export function findActiveItem(
  items: MiniGalleryItem[],
  activeId: string,
): MiniGalleryItem | undefined {
  return items.find((it) => it.id === activeId);
}

/** Clamp an incoming ms value to the configured min/max. Pure + testable. */
export function clampMs(raw: number, min: number, max: number): number {
  if (!Number.isFinite(raw)) return min;
  if (raw < min) return min;
  if (raw > max) return max;
  return Math.round(raw);
}

export function QuickTransitionPicker({
  label,
  items,
  activeId,
  onSelect,
  ms,
  onChangeMs,
  msMin = 50,
  msMax = 3000,
  msStep = 50,
  pickerAriaLabel,
}: QuickTransitionPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const expandedId = useId();

  const active = findActiveItem(items, activeId);
  const activeLabel = active?.label ?? activeId;
  const activeThumbnail: ReactNode = active?.thumbnail ?? null;
  // T1.2 (2026-04-29): when the registry ships an optimised 24×24
  // SVG, render it natively instead of scaling the 100×60 down.
  // Falls through to the scale-transform branch below when absent.
  const activeCompactThumbnail: ReactNode = active?.compactThumbnail ?? null;

  const toggle = useCallback(() => setOpen((v) => !v), []);

  // Close on Escape when expanded. Focus returns to the trigger button so
  // keyboard users don't lose their place.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  const handlePick = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
      // Restore focus to the trigger so the next Tab continues where the
      // user started rather than jumping to whatever came after the now-
      // unmounted MGP.
      triggerRef.current?.focus();
    },
    [onSelect],
  );

  const handleMsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(e.target.value);
      // If the user clears the field mid-type, don't commit — let the blur
      // handler coerce it back to a valid value.
      if (e.target.value === '') return;
      onChangeMs(clampMs(parsed, msMin, msMax));
    },
    [onChangeMs, msMin, msMax],
  );

  const handleMsBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = Number(e.target.value);
      onChangeMs(clampMs(parsed, msMin, msMax));
    },
    [onChangeMs, msMin, msMax],
  );

  return (
    <div data-testid="quick-transition-picker" data-transition-label={label}>
      <h3 className="font-mono uppercase text-ui-xs tracking-[0.12em] text-text-secondary mb-1">
        {label}
      </h3>
      <div className="flex items-center gap-2 h-9">
        {/* Thumbnail trigger — 24×24 button with the active transition's SVG. */}
        <button
          type="button"
          ref={triggerRef}
          onClick={toggle}
          aria-expanded={open}
          aria-controls={expandedId}
          aria-label={`Change ${label.toLowerCase()} — current: ${activeLabel}`}
          title={active?.description ?? `Change ${label.toLowerCase()}`}
          className={`shrink-0 w-6 h-6 rounded overflow-hidden flex items-center justify-center bg-bg-deep transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            open
              ? 'border-2 border-accent'
              : 'border border-border-subtle hover:border-accent-border'
          }`}
        >
          {/* T1.2 (2026-04-29): two render paths depending on whether
              the registry shipped an optimised 24×24 compactThumbnail.
              When present, render it at native 24×24 — strokes/fills
              authored at the small scale read crisper. When absent,
              fall back to the legacy 100×60 down-scaled-by-0.24
              transform that ships today. */}
          {activeCompactThumbnail !== null ? (
            <span
              aria-hidden="true"
              className="block pointer-events-none"
              style={{ width: 24, height: 24 }}
            >
              {activeCompactThumbnail}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="block pointer-events-none"
              style={{
                width: 100,
                height: 60,
                transform: 'scale(0.24)',
                transformOrigin: 'center',
              }}
            >
              {activeThumbnail}
            </span>
          )}
        </button>

        {/* Name — flex-1 so long labels truncate rather than push the ms
            field off the row. */}
        <span
          className="flex-1 text-ui-sm text-text-primary truncate"
          title={activeLabel}
        >
          {activeLabel}
        </span>

        {/* Numeric ms input. Width capped so the row doesn't grow; suffix
            sits outside the input so the number aligns right. */}
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            value={ms}
            onChange={handleMsChange}
            onBlur={handleMsBlur}
            min={msMin}
            max={msMax}
            step={msStep}
            aria-label={`${label.toLowerCase()} duration in milliseconds`}
            className="w-14 h-6 px-1.5 text-ui-xs font-mono text-right bg-bg-deep border border-border-subtle rounded text-text-primary outline-none focus-visible:border-accent"
          />
          <span
            aria-hidden="true"
            className="text-ui-xs font-mono text-text-muted"
          >
            ms
          </span>
        </div>
      </div>

      {/* Expanded picker — inline below the row. Mounted only when open so
          the MGP's matchMedia listener doesn't spin up on every mount. */}
      {open ? (
        <div id={expandedId} className="mt-1.5">
          <MiniGalleryPicker
            items={items}
            activeId={activeId}
            onSelect={handlePick}
            columns={3}
            ariaLabel={pickerAriaLabel ?? `${label} picker`}
          />
        </div>
      ) : null}
    </div>
  );
}
