'use client';

import { useEffect, useRef, useState } from 'react';
import { BladeEngine } from '@kyberstation/engine';
import type { BladeConfig, RGB } from '@kyberstation/engine';

interface HeroPreset {
  label: string;
  config: BladeConfig;
}

const baseConfig = (overrides: Partial<BladeConfig>): BladeConfig =>
  ({
    name: 'hero',
    baseColor: { r: 0, g: 135, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 255 },
    blastColor: { r: 255, g: 255, b: 255 },
    dragColor: { r: 255, g: 180, b: 0 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 320,
    retractionMs: 420,
    shimmer: 0.06,
    ledCount: 144,
    swingFxIntensity: 0,
    noiseLevel: 0,
    ...overrides,
  }) as BladeConfig;

const HERO_PRESETS: HeroPreset[] = [
  {
    label: 'Luke ROTJ',
    config: baseConfig({
      baseColor: { r: 60, g: 255, b: 40 },
      style: 'rotoscope',
      shimmer: 0.05,
    }),
  },
  {
    label: 'Anakin',
    config: baseConfig({
      baseColor: { r: 0, g: 135, b: 255 },
      style: 'stable',
    }),
  },
  {
    label: 'Kylo Ren',
    config: baseConfig({
      baseColor: { r: 255, g: 40, b: 20 },
      style: 'unstable',
      ignition: 'crackle',
    }),
  },
  {
    label: 'Ahsoka',
    config: baseConfig({
      baseColor: { r: 250, g: 245, b: 225 },
      style: 'stable',
      shimmer: 0.04,
    }),
  },
];

const DWELL_MS = 5400; // lit time before retracting
const CANVAS_W = 48;
const CANVAS_H = 720;

interface LandingBladeHeroProps {
  className?: string;
}

export function LandingBladeHero({ className }: LandingBladeHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [presetIdx, setPresetIdx] = useState(0);
  const presetIdxRef = useRef(0);
  const [accentRgb, setAccentRgb] = useState<RGB>(HERO_PRESETS[0].config.baseColor);

  // Stable engine + render loop — mounts once
  useEffect(() => {
    const engine = new BladeEngine();
    engine.ignite();

    // Warm up to steady-state ignition before first paint
    const FRAME_DT = 16;
    const initialConfig = HERO_PRESETS[0].config;
    const warmupFrames = Math.ceil(initialConfig.ignitionMs / FRAME_DT) + 10;
    for (let i = 0; i < warmupFrames; i++) {
      engine.update(FRAME_DT, initialConfig);
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!canvas || !ctx) return;

    let cancelled = false;
    let lastTime = performance.now();
    let retractScheduled = false;
    let igniteScheduledAt = 0;
    let cycleStart = performance.now();
    let frameCount = 0;

    const drawPixels = () => {
      const c = canvasRef.current;
      if (!c) return;
      const cx = c.getContext('2d');
      if (!cx) return;
      const pixels = engine.getPixels();
      const count = pixels.length / 3;
      cx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const sliceH = CANVAS_H / count;
      for (let i = 0; i < count; i++) {
        const off = i * 3;
        cx.fillStyle = `rgb(${pixels[off]},${pixels[off + 1]},${pixels[off + 2]})`;
        cx.fillRect(0, CANVAS_H - (i + 1) * sliceH, CANVAS_W, sliceH + 0.5);
      }
    };

    // Paint the warm-up state immediately
    drawPixels();

    const tick = (time: number) => {
      if (cancelled) return;
      frameCount++;
      const dt = Math.min(48, time - lastTime);
      lastTime = time;

      const elapsed = time - cycleStart;
      if (!retractScheduled && elapsed > DWELL_MS) {
        engine.retract();
        retractScheduled = true;
        igniteScheduledAt = time + HERO_PRESETS[presetIdxRef.current].config.retractionMs + 60;
      }
      if (retractScheduled && time >= igniteScheduledAt) {
        presetIdxRef.current = (presetIdxRef.current + 1) % HERO_PRESETS.length;
        setPresetIdx(presetIdxRef.current);
        setAccentRgb(HERO_PRESETS[presetIdxRef.current].config.baseColor);
        engine.ignite();
        retractScheduled = false;
        cycleStart = time + HERO_PRESETS[presetIdxRef.current].config.ignitionMs;
      }

      const activeConfig = HERO_PRESETS[presetIdxRef.current].config;
      engine.update(dt, activeConfig);
      drawPixels();

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
    };
  }, []);

  const accentCss = `rgb(${accentRgb.r | 0},${accentRgb.g | 0},${accentRgb.b | 0})`;

  return (
    <div
      className={`relative ${className ?? ''}`}
      aria-hidden="true"
      data-active-preset={HERO_PRESETS[presetIdx].label}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 40% 80% at center, ${accentCss} 0%, transparent 70%)`,
          opacity: 0.35,
          filter: 'blur(40px)',
          transition: 'background 600ms ease',
        }}
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="relative block mx-auto rounded-full"
        style={{
          width: '6px',
          height: 'min(72vh, 600px)',
          filter: `drop-shadow(0 0 8px ${accentCss}) drop-shadow(0 0 24px ${accentCss})`,
          transition: 'filter 600ms ease',
        }}
      />
    </div>
  );
}
