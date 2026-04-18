'use client';

import { useEffect, useRef, useState } from 'react';
import { BladeEngine } from '@kyberstation/engine';
import type { BladeConfig, RGB } from '@kyberstation/engine';

export interface LiveBladePreviewProps {
  config: BladeConfig;
  label?: string;
  width?: number;
  height?: number;
  cycleLitMs?: number;
  loop?: boolean;
  onCycle?: () => void;
  className?: string;
}

const FRAME_DT = 16;
const TARGET_FPS = 30;
const TARGET_FRAME_MS = 1000 / TARGET_FPS;

const rgbCss = (c: RGB): string => `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`;

const shouldUseStaticFallback = (): boolean => {
  if (typeof window === 'undefined') return true;
  const root = document.documentElement;
  if (root.classList.contains('perf-lite')) return true;
  if (root.classList.contains('reduced-motion')) return true;
  if (document.body?.classList.contains('reduced-motion')) return true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  return false;
};

function elapsedOrZero(now: number, start: number): number {
  const e = now - start;
  return e > 0 ? e : 0;
}

/**
 * A compact, horizontal, live-rendered blade preview that runs the
 * BladeEngine on the marketing site. Pauses its update loop when
 * scrolled out of view, throttles to 30fps, and falls back to a
 * tinted gradient bar when the reduced-motion / perf-lite signals
 * are active.
 *
 * Pair with the full vertical hero in `LandingBladeHero.tsx` —
 * this is the "many previews inline in a grid" variant.
 */
export function LiveBladePreview({
  config,
  label,
  width = 200,
  height = 48,
  cycleLitMs = 3000,
  loop = true,
  onCycle,
  className,
}: LiveBladePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<BladeConfig>(config);
  const onCycleRef = useRef<typeof onCycle>(onCycle);
  const [staticMode, setStaticMode] = useState<boolean>(true);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    onCycleRef.current = onCycle;
  }, [onCycle]);

  useEffect(() => {
    setStaticMode(shouldUseStaticFallback());
  }, []);

  useEffect(() => {
    if (staticMode) return;

    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = new BladeEngine();
    engine.ignite();

    const warmupFrames =
      Math.ceil((configRef.current.ignitionMs ?? 300) / FRAME_DT) + 10;
    for (let i = 0; i < warmupFrames; i++) {
      engine.update(FRAME_DT, configRef.current);
    }

    let cancelled = false;
    let rafId = 0;
    let lastRender = performance.now();
    let cycleStart = performance.now();
    let retractScheduled = false;
    let igniteScheduledAt = 0;
    let visible = true;

    const drawPixels = () => {
      const pixels = engine.getPixels();
      const count = pixels.length / 3;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const sliceW = w / count;
      for (let i = 0; i < count; i++) {
        const off = i * 3;
        ctx.fillStyle = `rgb(${pixels[off]},${pixels[off + 1]},${pixels[off + 2]})`;
        ctx.fillRect(i * sliceW, 0, sliceW + 0.5, h);
      }
    };

    drawPixels();

    const tick = (time: number) => {
      if (cancelled) return;
      rafId = requestAnimationFrame(tick);

      if (!visible) return;

      const dt = Math.min(48, time - lastRender);
      if (dt < TARGET_FRAME_MS) return;
      lastRender = time;

      const elapsed = time - cycleStart;
      const cfg = configRef.current;

      if (!retractScheduled && elapsed > cycleLitMs) {
        if (loop) {
          engine.retract();
          retractScheduled = true;
          igniteScheduledAt = time + (cfg.retractionMs ?? 400) + 60;
        }
      }
      if (retractScheduled && time >= igniteScheduledAt) {
        onCycleRef.current?.();
        engine.ignite();
        retractScheduled = false;
        cycleStart = time + (cfg.ignitionMs ?? 300);
      }

      engine.update(dt, cfg);
      drawPixels();
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const wasVisible = visible;
          visible = entry.isIntersecting;
          if (visible && !wasVisible) {
            const now = performance.now();
            lastRender = now;
            if (!retractScheduled) {
              cycleStart =
                now - Math.min(elapsedOrZero(now, cycleStart), cycleLitMs - 500);
            }
          }
        }
      },
      { threshold: 0.01 },
    );
    io.observe(wrap);

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      io.disconnect();
    };
  }, [staticMode, cycleLitMs, loop, width, height]);

  const accent = rgbCss(config.baseColor);
  const clash = rgbCss(config.clashColor);
  const thickness = Math.max(4, Math.round(height / 6));
  const vMargin = Math.round((height - thickness) / 2);

  return (
    <div
      ref={wrapRef}
      className={`relative inline-block ${className ?? ''}`}
      aria-hidden="true"
      data-preview-label={label ?? ''}
    >
      <div className="relative" style={{ width, height }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 220% at center, ${accent} 0%, transparent 70%)`,
            opacity: 0.35,
            filter: 'blur(18px)',
          }}
        />
        {staticMode ? (
          <div
            className="relative block rounded-full"
            style={{
              width,
              height: thickness,
              margin: `${vMargin}px 0`,
              background: `linear-gradient(90deg, ${accent} 0%, ${clash} 50%, ${accent} 100%)`,
              filter: `drop-shadow(0 0 4px ${accent}) drop-shadow(0 0 12px ${accent})`,
            }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={Math.max(64, width)}
            height={thickness}
            className="relative block rounded-full"
            style={{
              width,
              height: thickness,
              margin: `${vMargin}px 0`,
              filter: `drop-shadow(0 0 4px ${accent}) drop-shadow(0 0 12px ${accent})`,
            }}
          />
        )}
      </div>
      {label ? (
        <div
          className="dot-matrix tabular-nums mt-1 text-center text-[10px] opacity-70"
          style={{ width }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
