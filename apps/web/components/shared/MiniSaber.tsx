'use client';

import { useEffect, useRef, useState } from 'react';
import { BladeEngine } from '@kyberstation/engine';
import type { BladeConfig, RGB } from '@kyberstation/engine';
import { HiltRenderer } from '@/components/hilt/HiltRenderer';

/**
 * Neutral chrome tint applied to the hilt's accent parts. The design
 * intent is that the blade is the hero — hilts shouldn't compete with
 * vibrant color. A restrained cool silver reads as "metal" regardless
 * of what color the blade is.
 */
const NEUTRAL_HILT_ACCENT = 'rgb(178, 182, 192)';

export interface MiniSaberProps {
  /** Blade config (passed to BladeEngine). */
  config: BladeConfig;
  /** Hilt assembly id (e.g. "graflex", "mpp", "ren-vent"). */
  hiltId: string;
  /** vertical = hilt at bottom, blade rising up. horizontal = hilt at left,
   *  blade extending right. Default vertical. */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Which end of the saber the hilt sits on:
   *   - 'start' (default): natural — hilt at the "start" of the axis
   *     (bottom for vertical, left for horizontal), blade extends toward
   *     the "end" (up / right).
   *   - 'end': reversed — hilt at the "end" of the axis (top / right),
   *     blade extends toward the "start" (down / left). Used when we
   *     want a saber pointing back at the viewer or mirrored opposite
   *     another saber in the layout.
   *
   * The LED draw direction follows — LED 0 always sits next to the hilt.
   */
  hiltPosition?: 'start' | 'end';
  /** Blade length along its long axis, in CSS pixels. */
  bladeLength?: number;
  /** Blade thickness (core), in CSS pixels. The halo extends beyond. */
  bladeThickness?: number;
  /** Hilt length along its long axis, in CSS pixels. */
  hiltLength?: number;
  /** Ignited-dwell time before retracting, in ms. Default 5400. */
  dwellMs?: number;
  /** Delay before the very first ignition, in ms. Default 0. Used by the
   *  array to stagger ignitions so all 8 don't fire simultaneously. */
  initialDelayMs?: number;
  /** When false, engine holds the ignited state forever (no retract/cycle). */
  cycle?: boolean;
  /**
   * When defined, overrides the self-cycle behavior — the blade is
   * ignited iff this is true, retracted otherwise. Toggle it externally
   * to drive the cycle from a parent (e.g. an array that synchronizes
   * all 8 sabers). Supersedes `cycle` + `initialDelayMs` when set.
   */
  controlledIgnited?: boolean;
  /**
   * Override the hilt's accent colour. Defaults to a neutral cool
   * silver so the blade stays the hero. Pass `'blade'` to use the
   * current blade colour as the accent (legacy color-tinted behaviour).
   */
  hiltAccent?: string | 'blade';
  /**
   * When `false`, the engine warms up to the ignited steady state and
   * draws a single frame, then STOPS. The blade stays rendered but the
   * engine doesn't tick — zero per-frame CPU cost. When toggled back
   * to `true` (e.g. on hover), the engine resumes ticking from its
   * current state, so styles like fire / plasma / unstable come to
   * life. Default `true`.
   */
  animated?: boolean;
  /** Extra container class. */
  className?: string;
  /** Optional aria-label; defaults to the hilt's assembly display name. */
  ariaLabel?: string;
}

/**
 * Lightweight saber renderer: canonical hilt (SVG line-art) + live blade
 * (2D canvas driven by BladeEngine) + CSS drop-shadow glow.
 *
 * Intentionally NOT the full photoreal BladeCanvas pipeline — that's
 * 2.6k lines, 14-pass bloom, diffusion blur, and neopixel gamma, tuned
 * for a single editor-grade hero at ~1440px. For the landing page we
 * want to render many sabers at once without burning frame budget, and
 * the canvas + CSS drop-shadow reads as "lightsaber" just fine.
 *
 * Design note: the canvas's intrinsic dimensions match the display
 * dimensions 1:1, and the draw code is orientation-aware (horizontal:
 * LEDs laid out along X, hilt at left. vertical: LEDs laid out along
 * Y, hilt at bottom). This avoids any post-layout transform trickery
 * that would desync the layout box from the visible content.
 */
export function MiniSaber({
  config,
  hiltId,
  orientation = 'vertical',
  hiltPosition = 'start',
  bladeLength = 600,
  bladeThickness = 8,
  hiltLength = 120,
  dwellMs = 5400,
  initialDelayMs = 0,
  cycle = true,
  controlledIgnited,
  hiltAccent,
  animated = true,
  className,
  ariaLabel,
}: MiniSaberProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BladeEngine | null>(null);
  const drawPixelsRef = useRef<() => void>(() => {});
  const configRef = useRef(config);
  configRef.current = config;
  const animatedRef = useRef(animated);
  animatedRef.current = animated;
  const controlledRef = useRef(controlledIgnited);
  controlledRef.current = controlledIgnited;
  const isControlled = controlledIgnited !== undefined;
  const [accent, setAccent] = useState<RGB>(config.baseColor);

  const isVertical = orientation === 'vertical';
  const ledCount = config.ledCount ?? 144;

  // Canvas intrinsic = display px 1:1 (no DPR multiplication — would
  // cause an SSR vs client hydration mismatch since `window` is only
  // available after mount, and the CSS drop-shadow hides any aliasing
  // that 1:1 would otherwise show).
  const canvasW = Math.round(isVertical ? bladeThickness : bladeLength);
  const canvasH = Math.round(isVertical ? bladeLength : bladeThickness);

  // ─── Engine setup + initial draw (mount-once) ────────────────────────────
  //
  // Creates a BladeEngine, warms it up to the ignited steady-state
  // (or keeps it retracted if controlledIgnited=false), paints one
  // frame, then exits. The RAF tick loop lives in a separate effect
  // below so we can stop/start it as the caller toggles `animated`.
  useEffect(() => {
    const engine = new BladeEngine();
    engineRef.current = engine;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startIgnited = isControlled
      ? controlledRef.current === true
      : cycle === false || initialDelayMs <= 0;
    if (startIgnited) {
      engine.ignite();
      const FRAME_DT = 16;
      const warmupFrames =
        Math.ceil((configRef.current.ignitionMs ?? 320) / FRAME_DT) + 10;
      for (let i = 0; i < warmupFrames; i++) {
        engine.update(FRAME_DT, configRef.current);
      }
    }

    const drawPixels = () => {
      const pixels = engine.getPixels();
      const count = Math.min(ledCount, pixels.length / 3);
      ctx.clearRect(0, 0, canvasW, canvasH);
      if (count === 0) return;

      const longAxis = isVertical ? canvasH : canvasW;
      const shortAxis = isVertical ? canvasW : canvasH;
      const slice = longAxis / count;

      for (let i = 0; i < count; i++) {
        const off = i * 3;
        const r = pixels[off];
        const g = pixels[off + 1];
        const b = pixels[off + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum < 8) continue;
        ctx.fillStyle = `rgb(${r},${g},${b})`;

        // LED 0 always sits next to the hilt; direction flips based on
        // hiltPosition so the blade grows away from the hilt.
        if (isVertical) {
          const y =
            hiltPosition === 'end'
              ? i * slice
              : canvasH - (i + 1) * slice;
          ctx.fillRect(0, y, shortAxis, slice + 0.5);
        } else {
          const x =
            hiltPosition === 'end'
              ? canvasW - (i + 1) * slice
              : i * slice;
          ctx.fillRect(x, 0, slice + 0.5, shortAxis);
        }
      }
    };
    drawPixelsRef.current = drawPixels;

    // Seed accent from the current engine state so the halo matches
    // the first-painted frame without waiting for the RAF loop.
    const pixels = engine.getPixels();
    let sumR = 0, sumG = 0, sumB = 0, lit = 0;
    const pxCount = pixels.length / 3;
    for (let i = 0; i < pxCount; i++) {
      const r = pixels[i * 3];
      const g = pixels[i * 3 + 1];
      const b = pixels[i * 3 + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum > 32) { sumR += r; sumG += g; sumB += b; lit++; }
    }
    if (lit > 0) {
      setAccent({
        r: Math.round(sumR / lit),
        g: Math.round(sumG / lit),
        b: Math.round(sumB / lit),
      });
    }

    drawPixels();

    return () => {
      engineRef.current = null;
    };
  // Engine mounts once per MiniSaber. Config + controlled state flow
  // in via refs without re-subscribing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── RAF tick loop (only when `animated` is true) ────────────────────────
  //
  // When animated=false the engine freezes on its last-drawn frame,
  // costing zero CPU per frame. When animated flips to true (e.g.
  // hover), we start a fresh RAF loop that picks up from the engine's
  // current state — no retract/re-ignite, no flash.
  useEffect(() => {
    if (!animated) return;
    const engine = engineRef.current;
    if (!engine) return;

    let cancelled = false;
    let raf = 0;
    let lastTime = performance.now();
    let cycleStart = performance.now() + initialDelayMs;
    let retractScheduled = false;
    let igniteScheduledAt = 0;
    let firstIgnited = initialDelayMs <= 0 || cycle === false;
    let lastControlled: boolean | undefined = isControlled
      ? controlledRef.current
      : undefined;

    const tick = (time: number) => {
      if (cancelled) return;
      const dt = Math.min(48, time - lastTime);
      lastTime = time;

      if (isControlled) {
        const want = controlledRef.current;
        if (want !== undefined && want !== lastControlled) {
          if (want) engine.ignite();
          else engine.retract();
          lastControlled = want;
        }
      } else {
        if (!firstIgnited && time >= cycleStart) {
          engine.ignite();
          firstIgnited = true;
        }

        if (cycle && firstIgnited) {
          const elapsed = time - cycleStart;
          if (!retractScheduled && elapsed > dwellMs) {
            engine.retract();
            retractScheduled = true;
            igniteScheduledAt =
              time + (configRef.current.retractionMs ?? 420) + 60;
          }
          if (retractScheduled && time >= igniteScheduledAt) {
            engine.ignite();
            retractScheduled = false;
            cycleStart = time + (configRef.current.ignitionMs ?? 320);
          }
        }
      }

      engine.update(dt, configRef.current);

      const pixels = engine.getPixels();
      const count = pixels.length / 3;
      let sumR = 0, sumG = 0, sumB = 0, lit = 0;
      for (let i = 0; i < count; i++) {
        const r = pixels[i * 3];
        const g = pixels[i * 3 + 1];
        const b = pixels[i * 3 + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum > 32) { sumR += r; sumG += g; sumB += b; lit++; }
      }
      if (lit > 0) {
        setAccent({
          r: Math.round(sumR / lit),
          g: Math.round(sumG / lit),
          b: Math.round(sumB / lit),
        });
      }

      drawPixelsRef.current();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated]);

  const accentCss = `rgb(${accent.r | 0},${accent.g | 0},${accent.b | 0})`;
  // Hilt accent: neutral chrome by default so the blade stays the hero.
  // Callers can pass 'blade' to get the old color-tinted behaviour.
  const resolvedHiltAccent =
    hiltAccent === 'blade'
      ? accentCss
      : (hiltAccent ?? NEUTRAL_HILT_ACCENT);

  // Flex direction reflects hiltPosition. For vertical, `flex-col-reverse`
  // puts the first child (hilt) at the bottom (hiltPosition='start');
  // `flex-col` puts it at the top (hiltPosition='end'). Analogous for
  // horizontal: `flex-row` = hilt at left (start), `flex-row-reverse` =
  // hilt at right (end).
  const flexDirection = isVertical
    ? hiltPosition === 'end'
      ? 'flex-col'
      : 'flex-col-reverse'
    : hiltPosition === 'end'
      ? 'flex-row-reverse'
      : 'flex-row';

  return (
    <div
      className={`relative flex items-center justify-center ${flexDirection} ${className ?? ''}`}
      aria-label={ariaLabel}
    >
      {/* Hilt — mirrored via CSS when hiltPosition='end' so the emitter
          always faces the blade. The SVG itself always draws with
          emitter at the "start" end; the outer transform flips it
          when we render the hilt on the opposite side. */}
      <div
        className="shrink-0"
        style={{
          transform:
            hiltPosition === 'end'
              ? isVertical
                ? 'scaleY(-1)'
                : 'scaleX(-1)'
              : undefined,
        }}
      >
        <HiltRenderer
          assemblyId={hiltId}
          orientation={orientation}
          longAxisSize={hiltLength}
          accentOverride={resolvedHiltAccent}
          ariaLabel=""
        />
      </div>
      {/* Blade */}
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        aria-hidden="true"
        className="block shrink-0"
        style={{
          width: isVertical ? `${bladeThickness}px` : `${bladeLength}px`,
          height: isVertical ? `${bladeLength}px` : `${bladeThickness}px`,
          filter: `drop-shadow(0 0 6px ${accentCss}) drop-shadow(0 0 18px ${accentCss})`,
          // Round only the tip end so the hilt end sits flush against
          // the emitter. border-radius order is top-left top-right
          // bottom-right bottom-left.
          borderRadius: (() => {
            const r = Math.max(2, bladeThickness / 2);
            if (isVertical) {
              return hiltPosition === 'end'
                ? `0 0 ${r}px ${r}px` // hilt at top, tip at bottom → round bottom
                : `${r}px ${r}px 0 0`; // hilt at bottom, tip at top → round top
            }
            return hiltPosition === 'end'
              ? `${r}px 0 0 ${r}px` // hilt at right, tip at left → round left
              : `0 ${r}px ${r}px 0`; // hilt at left, tip at right → round right
          })(),
        }}
      />
    </div>
  );
}
