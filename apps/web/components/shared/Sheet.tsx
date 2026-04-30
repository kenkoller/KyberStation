'use client';

// ─── <Sheet> primitive ──────────────────────────────────────────────────
//
// Phase 4 PR #2 (2026-04-30). Full-screen bottom-sheet pattern for the
// mobile shell. Slides up from below, dims a backdrop, dismisses on
// backdrop-tap / Escape / swipe-down on the drag handle.
//
// This is a primitive — it has zero call sites in this PR. PR #6+ will
// thread it into the per-section A/B layouts and per-row "Edit" chips
// per `docs/mobile-implementation-plan.md` § PR #6.
//
// Architectural notes:
//   - Reuses `useModalDialog` for focus-trap + Escape + restore-on-close.
//     Same pattern as `<CommandPalette>`, the wizard, and SettingsModal.
//   - Animations are pure CSS transitions on `transform` (sheet) and
//     `opacity` (backdrop). When `prefers-reduced-motion: reduce` is
//     active, the transitions are dropped and the sheet snaps into place.
//   - z-index 100 matches CommandPalette's overlay layer.
//   - Render is null when `open === false` (no DOM weight closed).
//   - Drag-to-dismiss: the visual drag handle is a touchable strip at
//     the top of the sheet. Touch / pointer move below a threshold
//     fires `onClose`. Pointer types unified via PointerEvent so mouse
//     drag works on desktop for testing too.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '@/hooks/useModalDialog';
import type { SheetProps, SheetSize } from './Sheet.types';

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Resolve the sheet body's height/maxHeight CSS based on the size variant.
 * Pure helper exported for tests so the variant matrix can be asserted
 * without rendering.
 */
export function resolveSheetSizing(size: SheetSize): {
  height?: string;
  maxHeight: string;
} {
  switch (size) {
    case 'half':
      return { height: '50vh', maxHeight: '50vh' };
    case 'full':
      // Full-height sheet uses 100% of the visual viewport. Padding-bottom
      // for the safe-area inset is layered on the inner body so the
      // outer surface still touches the bottom edge.
      return { height: '100vh', maxHeight: '100vh' };
    case 'auto':
    default:
      // Cap auto-sized sheets so a long body doesn't push the drag
      // handle off-screen; users always have a way to grab + dismiss.
      return { maxHeight: '85vh' };
  }
}

// SSR / test environments don't have matchMedia. Use a guarded check.
// Exported so tests can stub matchMedia and assert the branch behavior.
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Stable id generator for default `aria-labelledby`. Avoids `crypto` so
// the helper works in both browser + node test environments without
// pulling in extra polyfills.
let sheetTitleIdCounter = 0;
function nextSheetTitleId(): string {
  sheetTitleIdCounter += 1;
  return `kyberstation-sheet-title-${sheetTitleIdCounter}`;
}

// ─── Component ──────────────────────────────────────────────────────────

/**
 * Stateless inner shell. Owns the dialog markup and behavior wiring, but
 * NOT the SSR `mounted` gate or the portal indirection. Exported for
 * tests so the dialog markup is `renderToStaticMarkup`-able without
 * having to flip a `mounted` private ref.
 *
 * Production callers should use the wrapped `<Sheet>` instead — it
 * ensures portals only render after first mount and that
 * `useModalDialog`'s focus trap fires when the sheet opens.
 */
export function SheetContent({
  open,
  onClose,
  title,
  size = 'auto',
  footer,
  children,
  ariaLabelledById,
}: SheetProps) {
  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen: open,
    onClose,
  });

  // Stable title id — generated once per mount, not per render.
  const [defaultTitleId] = useState(() => nextSheetTitleId());
  const titleId = ariaLabelledById ?? defaultTitleId;

  const reduceMotion = prefersReducedMotion();

  // ─── Drag-to-dismiss on the handle ─────────────────────────────────
  //
  // Pointer-down on the drag handle records the start Y. Pointer-move
  // tracks the delta and offsets the sheet body via inline transform.
  // Pointer-up either commits the dismissal (if dragged > 60px) or
  // springs back to 0. Captures pointer to keep the gesture alive even
  // if the finger leaves the handle hit area.

  const sheetSurfaceRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; startY: number } | null>(null);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);

  const onDragStart = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragStateRef.current = { pointerId: e.pointerId, startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onDragMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const delta = e.clientY - state.startY;
    // Only allow downward drags. Upward drags clamp at 0 (no rubber-band).
    if (delta > 0) {
      setDragOffsetPx(delta);
    } else {
      setDragOffsetPx(0);
    }
  }, []);

  const onDragEnd = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== e.pointerId) return;
      const delta = e.clientY - state.startY;
      dragStateRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      // Threshold tuned for thumb-flick gestures: 60px down dismisses,
      // anything less springs back.
      if (delta > 60) {
        onClose();
      }
      setDragOffsetPx(0);
    },
    [onClose],
  );

  // Reset drag offset when the sheet opens / closes — guards against a
  // stale offset surviving a quick close + reopen.
  useEffect(() => {
    if (!open) {
      setDragOffsetPx(0);
      dragStateRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  const sizing = resolveSheetSizing(size);

  // Backdrop opacity / sheet transform are interpolated based on drag.
  // At 200px of drag, backdrop is half-faded; the dismiss threshold
  // (60px) lands well before the backdrop disappears entirely.
  const dragFraction = Math.min(dragOffsetPx / 200, 1);
  const backdropOpacity = 1 - dragFraction * 0.5;

  const sheetTransform = `translateY(${dragOffsetPx}px)`;

  // Transition strings: when reduceMotion is on, omit transition entirely
  // so screen-reader users + motion-sensitive users get a snap-in. The
  // test relies on the absence of the `transition` substring in the
  // serialized style attribute.
  const sheetTransition = reduceMotion
    ? undefined
    : 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
  const backdropTransition = reduceMotion ? undefined : 'opacity 220ms ease-out';

  const backdropStyle: CSSProperties = {
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    opacity: backdropOpacity,
    transition: backdropTransition,
  };

  const isFull = size === 'full';

  // For 'full' sheets at phone-sm we want true edge-to-edge; for the
  // default 'auto' / 'half' sizes a tiny inset reads better at the
  // ≤599px (phone:) breakpoint. Tailwind `phone:px-2` would be ideal
  // but the surface uses inline styles for consistency with the rest
  // of the modal primitives (CommandPalette etc.) — we use a
  // `data-sheet-size` hook that globals.css can target if a future
  // pass wants to tune the inset per breakpoint.

  const surfaceStyle: CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgb(var(--bg-deep))',
    borderTop: '1px solid rgb(var(--border-subtle) / 1)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.4)',
    transform: sheetTransform,
    transition: sheetTransition,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    paddingBottom: 'var(--mobile-safe-pb, 0px)',
    ...sizing,
  };

  // ─── DOM ────────────────────────────────────────────────────────────

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      data-sheet-size={size}
      style={backdropStyle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={(el) => {
          sheetSurfaceRef.current = el;
          // Forward to the modal-dialog focus-trap ref.
          (dialogRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        style={surfaceStyle}
      >
        {/* ── Drag handle ── */}
        <div
          role="button"
          aria-label="Drag to dismiss"
          tabIndex={-1}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 8,
            paddingBottom: 8,
            cursor: 'grab',
            touchAction: 'none',
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'rgb(var(--border-light))',
            }}
          />
        </div>

        {/* ── Header ── */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px 12px 16px',
            borderBottom: '1px solid rgb(var(--border-subtle) / 1)',
            flexShrink: 0,
          }}
        >
          <h2
            id={titleId}
            className="font-display"
            style={{
              flex: 1,
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgb(var(--text-primary))',
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid rgb(var(--border-subtle) / 1)',
              borderRadius: 'var(--r-interactive, 4px)',
              color: 'rgb(var(--text-muted))',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>

        {/* ── Body ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            // For full-screen sheets the children take the full
            // remaining height; for auto-sized sheets the body grows
            // to fit naturally up to the maxHeight cap.
            minHeight: isFull ? 0 : undefined,
          }}
        >
          {children}
        </div>

        {/* ── Footer ── */}
        {footer ? (
          <footer
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgb(var(--border-subtle) / 1)',
              background: 'rgb(var(--bg-primary))',
              flexShrink: 0,
            }}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );

  return dialog;
}

/**
 * `<Sheet>` — full-screen bottom-sheet primitive. Renders nothing when
 * closed; on open, slides up from below into a dimmed-backdrop overlay
 * and traps focus inside until dismissed. Composed in three pieces
 * (drag-handle / header / body) with an optional sticky footer slot
 * for action buttons.
 *
 * The actual dialog markup lives in `<SheetContent>`; this wrapper adds
 * the `mounted` gate (so portals only render after first client tick)
 * + the `createPortal(..., document.body)` indirection.
 */
export function Sheet(props: SheetProps) {
  // Mount gate so `createPortal(..., document.body)` only fires on the
  // client. Same pattern as CommandPalette + HelpTooltip.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!props.open || !mounted) return null;

  return createPortal(<SheetContent {...props} />, document.body);
}
