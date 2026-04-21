'use client';

// ─── ResizeHandle — OV11 ─────────────────────────────────────────────────────
//
// Slim drag-handle primitive for the main workbench region seams.
//
// Usage:
//   <ResizeHandle
//     orientation="horizontal"   // drags left/right, sets a WIDTH
//     value={analysisRailWidth}
//     min={140} max={320} defaultValue={200}
//     onChange={setAnalysisRailWidth}
//     invert={false}              // true when the dragged region is to
//                                 // the right of the handle (Inspector)
//   />
//
// The handle is 4px wide in the drag axis with a 6px hit-slop. Visible
// border is 1px neutral; on hover / active the handle blooms to the
// accent color so the interaction is legible. Cursor flips to
// col-resize / row-resize during drag.
//
// Pure pointer-events (setPointerCapture) — no global mousemove
// listeners, no window pollution. Double-click resets to defaultValue.
// No transition on the resize target (only on the handle's own hover
// affordance) so drag feels immediate.

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';

export type ResizeOrientation = 'horizontal' | 'vertical';

export interface ResizeHandleProps {
  orientation: ResizeOrientation;
  value: number;
  min: number;
  max: number;
  /** Double-click-to-reset target. */
  defaultValue: number;
  onChange: (next: number) => void;
  /**
   * When true, positive pointer motion *shrinks* the value. Use this
   * for regions that live on the trailing side of the handle — e.g.
   * the Inspector on the right: dragging right grows the blade area,
   * which is the same as shrinking the Inspector.
   */
  invert?: boolean;
  /** Optional label for screen readers + title tooltip. */
  ariaLabel?: string;
}

// ─── Pure compute (exported for tests) ───────────────────────────────────────

export interface ApplyResizeDeltaInput {
  startValue: number;
  delta: number;
  min: number;
  max: number;
  invert?: boolean;
}

export function applyResizeDelta({
  startValue,
  delta,
  min,
  max,
  invert,
}: ApplyResizeDeltaInput): number {
  const signed = invert ? -delta : delta;
  const next = startValue + signed;
  return Math.min(max, Math.max(min, next));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ResizeHandle({
  orientation,
  value,
  min,
  max,
  defaultValue,
  onChange,
  invert,
  ariaLabel,
}: ResizeHandleProps) {
  const dragState = useRef<{
    pointerId: number;
    startCoord: number;
    startValue: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      dragState.current = {
        pointerId: e.pointerId,
        startCoord: orientation === 'horizontal' ? e.clientX : e.clientY,
        startValue: value,
      };
    },
    [orientation, value],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = dragState.current;
      if (!s || s.pointerId !== e.pointerId) return;
      const coord = orientation === 'horizontal' ? e.clientX : e.clientY;
      const delta = coord - s.startCoord;
      const next = applyResizeDelta({
        startValue: s.startValue,
        delta,
        min,
        max,
        invert,
      });
      onChange(next);
    },
    [orientation, min, max, invert, onChange],
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const s = dragState.current;
    if (s && s.pointerId === e.pointerId) {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      dragState.current = null;
    }
  }, []);

  const onDoubleClick = useCallback(() => {
    onChange(defaultValue);
  }, [defaultValue, onChange]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 24 : 8;
      const forward = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
      const backward = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      if (e.key === forward) {
        e.preventDefault();
        onChange(applyResizeDelta({ startValue: value, delta: step, min, max, invert }));
      } else if (e.key === backward) {
        e.preventDefault();
        onChange(applyResizeDelta({ startValue: value, delta: -step, min, max, invert }));
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        onChange(defaultValue);
      }
    },
    [orientation, value, min, max, invert, defaultValue, onChange],
  );

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-label={ariaLabel ?? `Resize (${orientation})`}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={[
        'shrink-0 bg-transparent hover:bg-accent/40 active:bg-accent/70 transition-colors',
        // The handle visually occupies 4px; 2px of padding on each
        // side of the hit target keeps it reachable without bloating
        // the layout. Tailwind arbitrary values for the exact pixel
        // footprint (rounding issues kept cropping up with w-[3px]).
        isHorizontal ? 'w-1 h-full cursor-col-resize' : 'h-1 w-full cursor-row-resize',
      ].join(' ')}
      style={{
        // A thin inner rule gives the handle visible form at rest
        // (matches the border-subtle token the surrounding chrome
        // uses) without needing an adjacent element's border.
        background: isHorizontal
          ? 'linear-gradient(to right, transparent 0, transparent 1px, rgb(var(--border-subtle) / 1) 1px, rgb(var(--border-subtle) / 1) 3px, transparent 3px)'
          : 'linear-gradient(to bottom, transparent 0, transparent 1px, rgb(var(--border-subtle) / 1) 1px, rgb(var(--border-subtle) / 1) 3px, transparent 3px)',
        outline: 'none',
        touchAction: 'none',
      }}
    />
  );
}
