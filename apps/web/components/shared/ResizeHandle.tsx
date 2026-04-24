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
        // Phase 1.5p: handle widened 4px -> 8px in the drag axis so it's
        // much easier to target with the cursor. Visible rule stays at
        // 2px (same as before), centered in the 8px hit zone via the
        // gradient stops below.
        isHorizontal ? 'w-2 h-full cursor-col-resize' : 'h-2 w-full cursor-row-resize',
      ].join(' ')}
      style={{
        // Gradient places a 2px line at the center of the 8px hit area:
        //   0-3px transparent | 3-5px visible rule | 5-8px transparent
        // so the handle reads as a 2px divider while the entire 8px
        // band captures pointer events and flips the cursor.
        background: isHorizontal
          ? 'linear-gradient(to right, transparent 0, transparent 3px, rgb(var(--border-subtle) / 1) 3px, rgb(var(--border-subtle) / 1) 5px, transparent 5px)'
          : 'linear-gradient(to bottom, transparent 0, transparent 3px, rgb(var(--border-subtle) / 1) 3px, rgb(var(--border-subtle) / 1) 5px, transparent 5px)',
        outline: 'none',
        touchAction: 'none',
      }}
    />
  );
}
