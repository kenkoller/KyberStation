'use client';
/**
 * LayerThumbnail — ~40×8 px live preview of a single layer's standalone
 * output, rendered beside its row in LayerStack.
 *
 * Design notes:
 *
 * - We do NOT spin up a full BladeEngine per row. That's wasteful — each
 *   engine allocates its own LEDArray, motion simulator, easing + style
 *   caches, and effect pool. With 10+ layers the cost at 60fps is real.
 *   Instead we call `createStyle(id).getColor(pos, time, ctx)` directly
 *   into a tiny canvas. For base + accent layers this is the complete
 *   visible output; for mix layers we composite two styles on the JS
 *   side; for effect layers we render the trigger color so users can
 *   see which effect is which.
 *
 * - Throttling: total frame cost must stay under 16ms at 60fps. When the
 *   row count exceeds a threshold, rows are staggered to ~10fps each
 *   while the main canvas keeps 60fps. See `THUMBNAIL_FPS_HIGH_DENSITY`.
 *
 * - Pause: when `useUIStore.animationPaused` is true, we freeze the last
 *   rendered frame — no new draws. The Space key + global Pause button
 *   both freeze thumbnails identically.
 *
 * - Reduced motion: when `useAccessibilityStore.reducedMotion` is true,
 *   we render a single static frame at time=0 and never update it. The
 *   LED pattern is still visually informative, just not animated.
 *
 * - `muted` render state: draws black so users can see the compositor
 *   skipping the output. `skipped` (bypass) draws a diagonal-stripe
 *   placeholder to signal "this isn't running at all" — and, critically,
 *   does NOT evaluate the style, so bypass genuinely has zero style-
 *   evaluation cost even for its own thumbnail.
 */
import { useEffect, useRef } from 'react';
import { createStyle, type BladeStyle, type StyleContext, type RGB } from '@kyberstation/engine';
import type { BladeLayer, LayerRenderState } from '@/stores/layerStore';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

// ─── Constants ───────────────────────────────────────────────────────

export const THUMBNAIL_WIDTH = 40;
export const THUMBNAIL_HEIGHT = 8;

/**
 * Row-count threshold above which per-row thumbnails stagger their
 * updates. Below this count, every row redraws every frame (60fps).
 * At or above, rows update at ~10fps in a round-robin pattern.
 *
 * Picked by budget: a single style evaluation across 40 pixels runs
 * in ~30–100µs. At 10 layers × 40 px × 60fps the upper bound is
 * 10 × 100µs × 60 = 60ms/s of style evaluation on top of the main
 * canvas. Staggering to 10fps brings that to 10ms/s — safely under
 * the 16ms frame budget.
 */
export const HIGH_DENSITY_THRESHOLD = 10;

/** Target FPS for each row when the high-density threshold is reached. */
export const THUMBNAIL_FPS_HIGH_DENSITY = 10;

// ─── Pure helpers — testable without a DOM ──────────────────────────

export interface ThumbnailLoopDecision {
  /** Whether to paint at all on this tick. */
  paint: boolean;
  /**
   * The effective time to pass to `renderLayerThumbnail`. For paused
   * or reduced-motion thumbnails we clamp to 0 so the single frame is
   * deterministic and never animates.
   */
  time: number;
  /** Whether the RAF loop should continue scheduling itself. */
  scheduleNext: boolean;
}

/**
 * Decide what the RAF tick should do for a single thumbnail.
 *
 *   reducedMotion=true  → paint once at t=0, don't reschedule.
 *   paused=true         → paint once (if not yet painted) at t=0,
 *                         don't reschedule.
 *   stagger active      → paint only when `frameCount % total === turn`.
 *
 * Extracted as a pure function so the pause + reduced-motion gating
 * can be unit-tested in a node environment (no canvas, no jsdom).
 */
export function decideThumbnailTick(params: {
  reducedMotion: boolean;
  paused: boolean;
  hasPainted: boolean;
  elapsedMs: number;
  frameCount: number;
  staggerTurn?: number;
  staggerTotal?: number;
}): ThumbnailLoopDecision {
  const { reducedMotion, paused, hasPainted, elapsedMs, frameCount, staggerTurn, staggerTotal } = params;

  if (reducedMotion) {
    // Only paint on the first tick after mount to freeze the frame.
    return { paint: !hasPainted, time: 0, scheduleNext: false };
  }
  if (paused) {
    return { paint: !hasPainted, time: 0, scheduleNext: false };
  }
  // Active — respect stagger cadence if configured.
  const staggered =
    staggerTurn !== undefined && staggerTotal !== undefined && staggerTotal > 1;
  const paint = !staggered || frameCount % staggerTotal === staggerTurn;
  return { paint, time: elapsedMs, scheduleNext: true };
}

// ─── Default style context ───────────────────────────────────────────

/**
 * Minimal BladeConfig to pass into style.getColor(). Styles that read
 * config.baseColor etc. will see the layer's color; motion/swing
 * defaults to neutral so thumbnails don't jitter from scene motion.
 */
function buildStyleContext(layer: BladeLayer, time: number): StyleContext {
  const color =
    (layer.config.color as RGB | undefined) ?? { r: 0, g: 140, b: 255 };
  return {
    time,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1,
    // Minimal BladeConfig — styles that read additional fields will
    // get sensible defaults. We only populate what's commonly read.
    config: {
      baseColor: color,
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 80 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: (layer.config.style as string) ?? 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 500,
      shimmer: 0.1,
      ledCount: THUMBNAIL_WIDTH,
    },
  };
}

// ─── Style resolution ────────────────────────────────────────────────

interface ResolvedStyle {
  /** Primary style — always populated. */
  primary: BladeStyle;
  /** Second style for mix layers. */
  secondary?: BladeStyle;
  /** Mix ratio (0 = all primary, 1 = all secondary) for mix layers. */
  mixRatio?: number;
  /** Flat render color for effect layers (no time-varying style). */
  flatColor?: RGB;
}

/**
 * Resolve a layer's config into one or two style instances that can be
 * called directly. Falls back to 'stable' for unknown IDs — preserves
 * the visual even if a layer picks a style that isn't in this build.
 */
function resolveStyle(layer: BladeLayer): ResolvedStyle {
  const fallback = () => createStyle('stable');

  switch (layer.type) {
    case 'base':
    case 'accent': {
      const id = (layer.config.style as string) ?? 'stable';
      try {
        return { primary: createStyle(id) };
      } catch {
        return { primary: fallback() };
      }
    }
    case 'mix': {
      const aId = (layer.config.styleA as string) ?? 'stable';
      const bId = (layer.config.styleB as string) ?? 'fire';
      const ratio = ((layer.config.mixRatio as number) ?? 50) / 100;
      let a: BladeStyle;
      let b: BladeStyle;
      try { a = createStyle(aId); } catch { a = fallback(); }
      try { b = createStyle(bId); } catch { b = fallback(); }
      return { primary: a, secondary: b, mixRatio: ratio };
    }
    case 'effect': {
      // Effect layers don't have a time-varying style of their own —
      // draw the trigger color as a flat band so the thumbnail
      // communicates "this effect uses THAT color" at a glance.
      const color =
        (layer.config.color as RGB | undefined) ?? {
          r: 255,
          g: 255,
          b: 255,
        };
      return { primary: fallback(), flatColor: color };
    }
  }
}

// ─── Bypass placeholder ──────────────────────────────────────────────

/**
 * Draw a diagonal-stripe placeholder signifying "bypass — not running".
 * Uses foreground/background tokens rather than raw hex so theme
 * changes track automatically.
 */
function drawBypassPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  // Use computed style colors read from :root — fall back to semi-safe
  // hues if the CSS variables aren't available (e.g. in a jsdom test).
  let stripeA = 'rgba(120, 120, 130, 0.35)';
  let stripeB = 'rgba(60, 60, 70, 0.25)';
  if (typeof window !== 'undefined') {
    const root = window.getComputedStyle(document.documentElement);
    const muted = root.getPropertyValue('--text-muted').trim();
    const surface = root.getPropertyValue('--bg-surface').trim();
    if (muted) stripeA = `rgba(${muted}, 0.35)`;
    if (surface) stripeB = `rgba(${surface}, 0.8)`;
  }
  // Solid low-contrast base
  ctx.fillStyle = stripeB;
  ctx.fillRect(0, 0, width, height);
  // Diagonal hatch
  ctx.strokeStyle = stripeA;
  ctx.lineWidth = 1;
  for (let x = -height; x < width + height; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.stroke();
  }
}

// ─── Muted placeholder ───────────────────────────────────────────────

function drawMutedPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  // Honest black — the compositor would emit black, so we show that.
  ctx.fillStyle = 'rgb(8, 10, 14)';
  ctx.fillRect(0, 0, width, height);
}

// ─── Main render ─────────────────────────────────────────────────────

/**
 * Render one frame of a layer into the given canvas context.
 *
 * Pure function by signature — no store reads, so this is directly
 * testable against a jsdom canvas or mock.
 */
export function renderLayerThumbnail(
  ctx: CanvasRenderingContext2D,
  layer: BladeLayer,
  renderState: LayerRenderState,
  time: number,
  width: number = THUMBNAIL_WIDTH,
  height: number = THUMBNAIL_HEIGHT,
): void {
  if (renderState === 'skipped') {
    drawBypassPlaceholder(ctx, width, height);
    return;
  }
  if (renderState === 'muted') {
    drawMutedPlaceholder(ctx, width, height);
    return;
  }

  const resolved = resolveStyle(layer);
  const styleCtx = buildStyleContext(layer, time);

  // Clear before draw — prevents trails when we switch between states.
  ctx.clearRect(0, 0, width, height);

  // Render one column per pixel; fill the full height.
  for (let x = 0; x < width; x++) {
    const pos = width > 1 ? x / (width - 1) : 0;
    let color: RGB;
    if (resolved.flatColor) {
      // Effect layer — flat band.
      color = resolved.flatColor;
    } else if (resolved.secondary && resolved.mixRatio !== undefined) {
      // Mix layer — blend two style outputs.
      const a = resolved.primary.getColor(pos, time, styleCtx);
      const b = resolved.secondary.getColor(pos, time, styleCtx);
      const r = resolved.mixRatio;
      color = {
        r: Math.round(a.r * (1 - r) + b.r * r),
        g: Math.round(a.g * (1 - r) + b.g * r),
        b: Math.round(a.b * (1 - r) + b.b * r),
      };
    } else {
      color = resolved.primary.getColor(pos, time, styleCtx);
    }

    // Apply opacity to dim the row when the user's set opacity < 1
    // so the thumbnail mirrors the compositor's dimming honestly.
    const opacityScale = Math.max(0, Math.min(1, layer.opacity));
    ctx.fillStyle = `rgb(${Math.round(color.r * opacityScale)}, ${Math.round(
      color.g * opacityScale,
    )}, ${Math.round(color.b * opacityScale)})`;
    ctx.fillRect(x, 0, 1, height);
  }
}

// ─── React component ─────────────────────────────────────────────────

export interface LayerThumbnailProps {
  layer: BladeLayer;
  renderState: LayerRenderState;
  /**
   * Staggered update turn. When `undefined`, the thumbnail updates at
   * full frame rate. When a number 0..N-1 is provided alongside the
   * total row count N, the thumbnail will only redraw when
   * `(frameCount % N) === turn` — producing round-robin ~60/N FPS.
   */
  staggerTurn?: number;
  staggerTotal?: number;
}

export function LayerThumbnail({
  layer,
  renderState,
  staggerTurn,
  staggerTotal,
}: LayerThumbnailProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const hasPaintedRef = useRef<boolean>(false);

  // Subscribe to global flags that gate the draw loop.
  const paused = useUIStore((s) => s.animationPaused);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  // Capture the latest props in a ref so the RAF loop doesn't need to
  // re-subscribe when the store changes something that only affects
  // the next frame's style params.
  const layerRef = useRef(layer);
  const renderStateRef = useRef(renderState);
  layerRef.current = layer;
  renderStateRef.current = renderState;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reduced motion / paused: use the pure decision helper to paint
    // a single frame at t=0. We short-circuit before scheduling RAF.
    if (reducedMotion || paused) {
      const decision = decideThumbnailTick({
        reducedMotion,
        paused,
        hasPainted: hasPaintedRef.current,
        elapsedMs: 0,
        frameCount: 0,
        staggerTurn,
        staggerTotal,
      });
      if (decision.paint) {
        renderLayerThumbnail(ctx, layerRef.current, renderStateRef.current, decision.time);
        hasPaintedRef.current = true;
      }
      return;
    }

    let startTime = performance.now();
    const tick = (now: number) => {
      const decision = decideThumbnailTick({
        reducedMotion: false,
        paused: false,
        hasPainted: hasPaintedRef.current,
        elapsedMs: now - startTime,
        frameCount: frameCountRef.current,
        staggerTurn,
        staggerTotal,
      });
      if (decision.paint) {
        renderLayerThumbnail(ctx, layerRef.current, renderStateRef.current, decision.time);
        hasPaintedRef.current = true;
      }
      frameCountRef.current += 1;
      if (decision.scheduleNext) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, reducedMotion, staggerTurn, staggerTotal]);

  // Redraw immediately when the render state or visible config flips,
  // so swapping bypass/mute/solo takes effect on the paint without
  // waiting for the next rAF tick of the loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderLayerThumbnail(ctx, layer, renderState, 0);
    hasPaintedRef.current = true;
  }, [renderState, layer.type, layer.opacity, layer.config]);

  return (
    <canvas
      ref={canvasRef}
      width={THUMBNAIL_WIDTH}
      height={THUMBNAIL_HEIGHT}
      className="shrink-0 rounded-sm border border-border-subtle/50"
      style={{
        // CSS size matches internal pixel size — no scaling, crisp pixels.
        width: `${THUMBNAIL_WIDTH}px`,
        height: `${THUMBNAIL_HEIGHT}px`,
        imageRendering: 'pixelated',
      }}
      aria-hidden="true"
    />
  );
}
