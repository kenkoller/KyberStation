'use client';
import { useRef, useEffect, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import type { BladeConfig } from '@kyberstation/engine';

const STRIP_COLORS = ['#fff', '#88f', '#f88', '#8f8', '#ff8'];
const STRIP_LABELS = ['S1', 'S2', 'S3', 'S4', 'S5'];

function getStripCount(config: BladeConfig): number {
  switch (config.stripType) {
    case 'dual-neo': return 2;
    case 'tri-neo': case 'tri-cree': return 3;
    case 'quad-neo': case 'quad-cree': return 4;
    case 'penta-neo': case 'penta-cree': return 5;
    default: return 1;
  }
}

/**
 * UV Unwrap View — shows all LED strips laid flat as horizontal color bars.
 *
 * Each strip is a row of pixel colors, stacked vertically. For neopixel
 * blades all strips share the same data channel, so the colors are identical
 * but shown at different angular positions around the blade core.
 *
 * For future multi-data-pin configurations, each strip could show different data.
 */
export function UVUnwrapView() {
  const config = useBladeStore((s) => s.config);
  const { engineRef } = useBladeEngine();
  const brightness = useUIStore((s) => s.brightness);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const numStrips = getStripCount(config);
  const ledCount = config.ledCount ?? 144;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) {
      if (!reducedMotion) animRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const stripH = Math.max(8, (h - 20) / numStrips - 4);
    const pixelW = Math.max(1, (w - 40) / ledCount);
    const startX = 30;
    const brightnessScale = brightness / 100;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    const pixels = engine.getPixels();

    for (let s = 0; s < numStrips; s++) {
      const y = 10 + s * (stripH + 4);

      // Strip label
      ctx.fillStyle = STRIP_COLORS[s] ?? '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(STRIP_LABELS[s] ?? `S${s + 1}`, startX - 6, y + stripH / 2 + 3);

      // Strip border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(startX, y, ledCount * pixelW, stripH);

      // Per-pixel LED colors
      for (let i = 0; i < ledCount; i++) {
        const idx = i * 3;
        if (idx + 2 >= pixels.length) break;
        const r = Math.round(pixels[idx] * brightnessScale);
        const g = Math.round(pixels[idx + 1] * brightnessScale);
        const b = Math.round(pixels[idx + 2] * brightnessScale);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(startX + i * pixelW, y, Math.ceil(pixelW), stripH);
      }
    }

    // Pixel index markers
    ctx.fillStyle = '#555';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    const markerStep = ledCount <= 72 ? 12 : ledCount <= 144 ? 24 : 48;
    for (let i = 0; i <= ledCount; i += markerStep) {
      const x = startX + i * pixelW;
      ctx.fillText(String(i), x, h - 2);
    }

    if (!reducedMotion) {
      animRef.current = requestAnimationFrame(draw);
    }
  }, [engineRef, numStrips, ledCount, brightness, reducedMotion]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-ui-xs text-text-muted uppercase tracking-wider">
          UV Unwrap — {numStrips} strip{numStrips > 1 ? 's' : ''} &times; {ledCount} LEDs
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="flex-1 w-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
