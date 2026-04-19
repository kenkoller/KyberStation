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
  bladeLength = 600,
  bladeThickness = 8,
  hiltLength = 120,
  dwellMs = 5400,
  initialDelayMs = 0,
  cycle = true,
  controlledIgnited,
  hiltAccent,
  className,
  ariaLabel,
}: MiniSaberProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(config);
  configRef.current = config;
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

  useEffect(() => {
    const engine = new BladeEngine();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Warm to steady-state before the first paint to avoid a flash of
    // unlit blade on mount (when no initial delay is set and the blade
    // should start ignited).
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

    const drawPixels = () => {
      const pixels = engine.getPixels();
      const count = Math.min(ledCount, pixels.length / 3);
      ctx.clearRect(0, 0, canvasW, canvasH);
      if (count === 0) return;

      // Blade long-axis length in canvas coords. LEDs are distributed
      // along it, hilt at 0-end.
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

        if (isVertical) {
          // Hilt at bottom → LED i at the i-th slice counting UP from the
          // bottom (i=0 is the LED nearest the hilt).
          const y = canvasH - (i + 1) * slice;
          ctx.fillRect(0, y, shortAxis, slice + 0.5);
        } else {
          // Hilt at left → LED i at the i-th slice counting RIGHT from
          // the left (i=0 is the LED nearest the hilt).
          const x = i * slice;
          ctx.fillRect(x, 0, slice + 0.5, shortAxis);
        }
      }
    };

    drawPixels();

    const tick = (time: number) => {
      if (cancelled) return;
      const dt = Math.min(48, time - lastTime);
      lastTime = time;

      if (isControlled) {
        // Parent-driven mode — watch the ref for toggles and forward
        // them to the engine once per change.
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

      // Accent follows the brightest 25% of LEDs so the drop-shadow halo
      // stays coherent mid-cycle and doesn't track dim retraction tails.
      const pixels = engine.getPixels();
      const count = pixels.length / 3;
      let sumR = 0,
        sumG = 0,
        sumB = 0,
        lit = 0;
      for (let i = 0; i < count; i++) {
        const r = pixels[i * 3];
        const g = pixels[i * 3 + 1];
        const b = pixels[i * 3 + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum > 32) {
          sumR += r;
          sumG += g;
          sumB += b;
          lit++;
        }
      }
      if (lit > 0) {
        setAccent({
          r: Math.round(sumR / lit),
          g: Math.round(sumG / lit),
          b: Math.round(sumB / lit),
        });
      }

      drawPixels();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  // Engine + loop mount once per MiniSaber. Config changes are picked
  // up via configRef without re-subscribing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accentCss = `rgb(${accent.r | 0},${accent.g | 0},${accent.b | 0})`;
  // Hilt accent: neutral chrome by default so the blade stays the hero.
  // Callers can pass 'blade' to get the old color-tinted behaviour.
  const resolvedHiltAccent =
    hiltAccent === 'blade'
      ? accentCss
      : (hiltAccent ?? NEUTRAL_HILT_ACCENT);

  return (
    <div
      className={`relative flex items-center justify-center ${
        isVertical ? 'flex-col-reverse' : 'flex-row'
      } ${className ?? ''}`}
      aria-label={ariaLabel}
    >
      {/* Hilt */}
      <HiltRenderer
        assemblyId={hiltId}
        orientation={orientation}
        longAxisSize={hiltLength}
        accentOverride={resolvedHiltAccent}
        className="shrink-0"
        ariaLabel=""
      />
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
          borderRadius: `${Math.max(2, bladeThickness / 2)}px`,
        }}
      />
    </div>
  );
}
