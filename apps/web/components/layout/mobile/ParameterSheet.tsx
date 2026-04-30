'use client';

// ─── ParameterSheet — Phase 4.4 (2026-04-30) ─────────────────────────────────
//
// 3-stop bottom sheet for per-parameter deep-edit on the mobile shell.
// Per "Claude Design Mobile handoff/HANDOFF.md" §"Q5 Sheet primitive":
//
//   Closed:  height 0 (unmounted)
//   Peek:    168px — quick tweak surface (slider + display)
//   Full:    min(92vh, 720px) — opens modulation graph + range editor
//
//   Drag stops: only the three (no free-drag — animates to nearest on
//   release). Drag threshold: 48px per stop transition.
//
//   Backdrop: only at `full` (rgba(0,0,0,0.5) fade-in 200ms). No
//   backdrop at `peek` so the live blade above stays visible.
//
//   Animation: transform: translateY(), cubic-bezier(0.32, 0.72, 0, 1),
//   260ms — pulled from the new --ease-sheet / --dur-sheet tokens.
//
//   Handle: 36 × 4px, top-centered, top inset 6px.
//   Header: 56px, monospace title left, close × right.
//   Footer: 56px, two flex-1 buttons (Reset / Done).
//
// ─── State machine ──────────────────────────────────────────────────────
//
// External API: `open` boolean + `initialState: 'peek' | 'full'`. Internal
// state machine tracks the live snap point. Drag-up across 48px from
// peek → full; drag-down across 48px from full → peek; drag-down across
// 48px from peek → close (calls onClose).
//
// Pointer capture on the drag handle keeps the gesture alive even if the
// finger leaves the handle hit area.
//
// ─── Coexistence with Sheet primitive ───────────────────────────────────
//
// `apps/web/components/shared/Sheet.tsx` (PR #195) is a single-state
// general-purpose modal. ParameterSheet is the parameter-edit-specific
// 3-stop variant. They share no implementation but use the same
// underlying CSS tokens (--sheet-radius, --sheet-shadow). When either
// is open, the other should not be — host coordinates this via mutually-
// exclusive open state.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '@/hooks/useModalDialog';

// ─── Constants ───────────────────────────────────────────────────────────

export const PEEK_HEIGHT_PX = 168;
/** `min(92vh, 720px)` baked into the snap math (we measure window.innerHeight). */
export const FULL_HEIGHT_VH = 0.92;
export const FULL_HEIGHT_CAP_PX = 720;
/** Drag delta required to transition between snap stops, in CSS pixels. */
export const STOP_THRESHOLD_PX = 48;
/** Drag delta below `peek` that fires onClose (treated as a swipe-down dismiss). */
export const DISMISS_THRESHOLD_PX = 48;

export type ParameterSheetState = 'peek' | 'full';

interface ParameterSheetProps {
  /** True when the sheet is mounted; false unmounts. */
  open: boolean;
  /** Initial snap state when `open` flips from false → true. */
  initialState?: ParameterSheetState;
  /** Called when the sheet is dismissed (× tap, drag-down past peek, Escape). */
  onClose: () => void;
  /** Sheet title — also used as the aria-labelledby target. */
  title: string;
  /** Sheet body content. Provided by the host per parameter. */
  children: ReactNode;
  /** Optional sticky footer. Defaults to a Reset / Done pair. */
  footer?: ReactNode;
  /** Reset button handler. Required when default footer is used. */
  onReset?: () => void;
}

// ─── Pure compute helpers (exported for testing) ─────────────────────────

/**
 * Resolve the "full" snap-point pixel height for a given viewport.
 * Matches the handoff spec `min(92vh, 720px)` — never quite full
 * height so the OS status bar stays visible.
 */
export function resolveFullHeightPx(viewportPx: number): number {
  return Math.min(Math.round(viewportPx * FULL_HEIGHT_VH), FULL_HEIGHT_CAP_PX);
}

/**
 * Map a pointer-up drag delta to the next state machine outcome.
 *
 * Conventions:
 *   - `delta` is `(release.clientY - down.clientY)`. Positive = drag-down.
 *   - Returns the next state: `'peek'`, `'full'`, or `null` for "close
 *     this sheet" (caller fires onClose).
 *
 * Logic per handoff spec:
 *   - From peek: drag-down past 48px → close; drag-up past 48px → full.
 *   - From full: drag-down past 48px → peek; further drag-down doesn't
 *     close from full (user must tap × or pass through peek first).
 */
export function resolveDragSnap(
  current: ParameterSheetState,
  delta: number,
): ParameterSheetState | null {
  if (current === 'peek') {
    if (delta > DISMISS_THRESHOLD_PX) return null;
    if (delta < -STOP_THRESHOLD_PX) return 'full';
    return 'peek';
  }
  // current === 'full'
  if (delta > STOP_THRESHOLD_PX) return 'peek';
  return 'full';
}

// ─── Component ───────────────────────────────────────────────────────────

function ParameterSheetContent({
  open,
  initialState = 'peek',
  onClose,
  title,
  children,
  footer,
  onReset,
}: ParameterSheetProps) {
  const [snapState, setSnapState] = useState<ParameterSheetState>(initialState);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const dragStateRef = useRef<{ pointerId: number; startY: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const titleId = useRef(`kyberstation-param-sheet-${Math.random().toString(36).slice(2, 8)}`);

  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen: open,
    onClose,
  });

  // Reset to initialState whenever sheet re-opens.
  useEffect(() => {
    if (open) {
      setSnapState(initialState);
      setDragOffsetPx(0);
    }
  }, [open, initialState]);

  // Resolve viewport-dependent heights once mounted; update on resize.
  const [viewportH, setViewportH] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );
  useEffect(() => {
    function onResize() {
      setViewportH(window.innerHeight);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fullHeightPx = resolveFullHeightPx(viewportH);
  // Per handoff §Q5: animation is `transform: translateY()`. The sheet
  // is sized to FULL height; translateY pushes it down so only the
  // peek slice is visible at peek state. At full → translateY(0).
  // Drag delta adds directly to the translateY (drag-down = positive
  // delta = sheet moves down).
  const peekTranslateY = fullHeightPx - PEEK_HEIGHT_PX;
  const targetTranslateY = snapState === 'peek' ? peekTranslateY : 0;
  // Clamp so a fast drag-up can't push the sheet past full (no
  // rubber-band overshoot at the top), and a fast drag-down can't
  // push past the dismiss threshold below peek (visual stop while the
  // pointer-up handler decides the snap).
  const visibleTranslateY = Math.max(
    0,
    Math.min(peekTranslateY + DISMISS_THRESHOLD_PX, targetTranslateY + dragOffsetPx),
  );

  // ─── Pointer drag ──────────────────────────────────────────────────

  const onDragStart = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragStateRef.current = { pointerId: e.pointerId, startY: e.clientY };
    // setPointerCapture throws NotFoundError on synthetic-dispatched
    // PointerEvents (test-driven paths) because the browser has no
    // active pointer with that id. Real touch + mouse always succeed;
    // we swallow the failure so test infra can drive the handle
    // without surfacing a runtime error overlay.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore — capture is a perf hint, not load-bearing
    }
  }, []);

  const onDragMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const delta = e.clientY - state.startY;
    setDragOffsetPx(delta);
  }, []);

  const onDragEnd = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== e.pointerId) return;
      const delta = e.clientY - state.startY;
      dragStateRef.current = null;
      // hasPointerCapture itself can throw on synthetic events; guard
      // both the check + the release for the same reason as
      // setPointerCapture above.
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      setDragOffsetPx(0);
      const nextState = resolveDragSnap(snapState, delta);
      if (nextState === null) {
        onClose();
      } else if (nextState !== snapState) {
        setSnapState(nextState);
      }
    },
    [snapState, onClose],
  );

  if (!open) return null;

  const isFull = snapState === 'full';

  return (
    <>
      {/* ── Backdrop layer (sibling, not parent — keeps the sheet's
          children from inheriting the backdrop's opacity transition).
          Per handoff §Q5: backdrop only at full, fade-in 200ms. */}
      <div
        className="fixed inset-0 z-30"
        style={{
          // Encode the opacity in the rgba(...) so the CSS `opacity`
          // property doesn't cascade to children mounted later (we
          // moved the sheet out of this subtree to avoid that).
          background: isFull
            ? 'rgba(0,0,0,0.5)'
            : 'rgba(0,0,0,0)',
          backdropFilter: isFull ? 'blur(2px)' : 'none',
          WebkitBackdropFilter: isFull ? 'blur(2px)' : 'none',
          transition: 'background 200ms ease-out, backdrop-filter 200ms ease-out',
          pointerEvents: isFull ? 'auto' : 'none',
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <div
        ref={(el) => {
          surfaceRef.current = el;
          (dialogRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        role="dialog"
        aria-modal={isFull}
        aria-labelledby={titleId.current}
        data-parameter-sheet
        data-state={snapState}
        className="fixed left-0 right-0 bottom-0 z-40 flex flex-col bg-bg-deep border-t border-border-subtle"
        onPointerDown={(e) => e.stopPropagation()}
        style={
          {
            // Sized once to FULL — translateY hides the bottom-anchored
            // sheet behind the viewport so only the peek slice shows.
            height: `${fullHeightPx}px`,
            transform: `translateY(${visibleTranslateY}px)`,
            borderTopLeftRadius: 'var(--sheet-radius, 14px)',
            borderTopRightRadius: 'var(--sheet-radius, 14px)',
            boxShadow: 'var(--sheet-shadow, 0 -8px 24px -8px rgba(0,0,0,0.5))',
            transition: dragStateRef.current
              ? 'none'
              : 'transform var(--dur-sheet, 260ms) var(--ease-sheet, cubic-bezier(0.32, 0.72, 0, 1))',
            paddingBottom: 'var(--mobile-safe-pb, 0px)',
            willChange: 'transform',
          } as CSSProperties
        }
      >
        {/* ── Drag handle (gesture target) ────────────────────────── */}
        <div
          role="button"
          aria-label="Drag to resize parameter sheet"
          tabIndex={-1}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="flex justify-center"
          style={{ paddingTop: 6, paddingBottom: 6, touchAction: 'none', cursor: 'grab' }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'rgb(var(--text-muted) / 0.5)',
            }}
          />
        </div>

        {/* ── Header (56px) ────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between gap-2 px-4 border-b border-border-subtle shrink-0"
          style={{ height: 56 }}
        >
          <h2
            id={titleId.current}
            className="font-mono text-text-primary uppercase tracking-[0.08em] text-[12px] font-semibold"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close parameter sheet"
            className="flex items-center justify-center rounded-interactive border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-light transition-colors"
            style={{ width: 32, height: 32, fontSize: 14, lineHeight: 1 }}
          >
            ×
          </button>
        </header>

        {/* ── Body (flex-1, scrolls on full) ──────────────────────── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
          data-parameter-sheet-body
        >
          {children}
        </div>

        {/* ── Footer (56px) ───────────────────────────────────────── */}
        <footer
          className="flex items-stretch gap-2 px-4 py-2 border-t border-border-subtle bg-bg-secondary/40 shrink-0"
          style={{ height: 56 }}
        >
          {footer ?? (
            <>
              <button
                type="button"
                onClick={onReset}
                disabled={!onReset}
                className="flex-1 flex items-center justify-center rounded-interactive border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light transition-colors text-ui-xs uppercase tracking-wider font-medium disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 flex items-center justify-center rounded-interactive border border-accent-border bg-accent-dim text-accent hover:bg-accent-dim/70 transition-colors text-ui-xs uppercase tracking-wider font-bold"
              >
                Done
              </button>
            </>
          )}
        </footer>
      </div>
    </>
  );
}

export function ParameterSheet(props: ParameterSheetProps) {
  // Mount-gate so createPortal only fires on the client. Same pattern
  // as Sheet / CommandPalette.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!props.open || !mounted) return null;

  return createPortal(<ParameterSheetContent {...props} />, document.body);
}

// SSR-shape export so tests can reach the inner content without the
// portal indirection. Same dual-export pattern as the Sheet primitive.
export { ParameterSheetContent };
