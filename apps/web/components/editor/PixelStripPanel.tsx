'use client';
import { useRef, useEffect } from 'react';
import type { BladeEngine } from '@bladeforge/engine';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

interface PixelStripPanelProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
}

/**
 * PixelStripPanel — standalone vertical LED pixel bar visualization.
 *
 * Renders each LED as a colored rectangle, LED 0 at the bottom (hilt)
 * to last LED at top (tip). Reads engine pixel buffer each frame.
 */
export function PixelStripPanel({ engineRef }: PixelStripPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const brightness = useUIStore((s) => s.brightness);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  // Resize observer to match canvas to container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        sizeRef.current = { w: width, h: height, dpr };
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Render loop
  useAnimationFrame(() => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;

    if (cw <= 0 || ch <= 0) return;

    const pixels = engine.getPixels();
    const bufferLeds = Math.floor(pixels.length / 3);
    const leds = Math.min(ledCount, bufferLeds);
    if (leds <= 0) return;

    const bri = brightness / 100;

    // Clear
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, cw, ch);

    // Layout: vertical strip centered horizontally
    const padX = 8 * dpr;
    const padY = 16 * dpr;
    const stripW = Math.min(cw - padX * 2, 36 * dpr);
    const stripX = (cw - stripW) / 2;
    const stripTopY = padY;
    const stripBotY = ch - padY;
    const stripH = stripBotY - stripTopY;
    const cellH = stripH / leds;

    // Background panel
    const bgPad = 4 * dpr;
    ctx.fillStyle = 'rgba(10, 12, 20, 0.8)';
    ctx.fillRect(stripX - bgPad, stripTopY - bgPad, stripW + bgPad * 2, stripH + bgPad * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(stripX - bgPad, stripTopY - bgPad, stripW + bgPad * 2, stripH + bgPad * 2);

    // LED pixels — LED 0 at bottom, last LED at top
    for (let i = 0; i < leds; i++) {
      const r = (pixels[i * 3] ?? 0) * bri;
      const g = (pixels[i * 3 + 1] ?? 0) * bri;
      const b = (pixels[i * 3 + 2] ?? 0) * bri;
      const y = stripBotY - (i + 1) * cellH;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(stripX, y, stripW, Math.max(cellH - 0.3, 0.5));
    }

    // LED index labels every 24 LEDs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    ctx.font = `${7 * dpr}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const labelX = stripX + stripW + 4 * dpr;
    if (labelX + 20 * dpr < cw) {
      for (let i = 0; i < leds; i += 24) {
        const y = stripBotY - (i + 0.5) * cellH;
        ctx.fillText(String(i), labelX, y);
      }
    }

    // "PIXEL" label at top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = `${7 * dpr}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('PIXEL', cw / 2, stripTopY - bgPad - 2 * dpr);
  }, { maxFps: reducedMotion ? 2 : undefined });

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        role="img"
        aria-label="LED pixel strip visualization"
      />
    </div>
  );
}
