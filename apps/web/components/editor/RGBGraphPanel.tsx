'use client';
import { useRef, useEffect } from 'react';
import type { BladeEngine } from '@bladeforge/engine';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { useBladeStore } from '@/stores/bladeStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

interface RGBGraphPanelProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
}

/**
 * RGBGraphPanel — standalone RGB line chart visualization.
 *
 * Plots R, G, B channel values (0-255 on X-axis) against LED position
 * (bottom=hilt, top=tip on Y-axis). Reads engine pixel buffer each frame.
 */
export function RGBGraphPanel({ engineRef }: RGBGraphPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  // Resize observer
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

    // Clear
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, cw, ch);

    // Layout
    const padX = 12 * dpr;
    const padY = 16 * dpr;
    const labelH = 14 * dpr;
    const graphX = padX;
    const graphW = cw - padX * 2;
    const graphTopY = padY;
    const graphBotY = ch - padY - labelH;
    const graphH = graphBotY - graphTopY;

    if (graphW <= 0 || graphH <= 0) return;

    // Background panel
    const bgPad = 4 * dpr;
    ctx.fillStyle = 'rgba(10, 12, 20, 0.6)';
    ctx.fillRect(graphX - bgPad, graphTopY - bgPad, graphW + bgPad * 2, graphH + labelH + bgPad * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(graphX - bgPad, graphTopY - bgPad, graphW + bgPad * 2, graphH + labelH + bgPad * 2);

    // Vertical grid lines at value marks (X axis = 0-255)
    ctx.lineWidth = 0.5 * dpr;
    ctx.font = `${7 * dpr}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const val of [0, 64, 128, 192, 255]) {
      const gx = graphX + (val / 255) * graphW;
      if (val > 0 && val < 255) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.beginPath();
        ctx.moveTo(gx, graphTopY);
        ctx.lineTo(gx, graphBotY);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
      ctx.fillText(String(val), gx, graphBotY + 2 * dpr);
    }
    ctx.textBaseline = 'alphabetic';

    // Horizontal guide lines (Y = LED position fractions)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5 * dpr;
    for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
      const y = graphBotY - frac * graphH;
      ctx.beginPath();
      ctx.moveTo(graphX, y);
      ctx.lineTo(graphX + graphW, y);
      ctx.stroke();
    }

    // R, G, B lines — Y = LED position (bottom to top), X = channel value
    const channels = [
      { offset: 0, color: 'rgba(255, 60, 60, 0.90)' },
      { offset: 1, color: 'rgba(60, 255, 60, 0.90)' },
      { offset: 2, color: 'rgba(80, 130, 255, 0.90)' },
    ];
    ctx.lineWidth = 1.5 * dpr;
    for (const ch of channels) {
      ctx.strokeStyle = ch.color;
      ctx.beginPath();
      for (let i = 0; i < leds; i++) {
        const val = pixels[i * 3 + ch.offset] ?? 0;
        const x = graphX + (val / 255) * graphW;
        const y = graphBotY - (i / Math.max(leds - 1, 1)) * graphH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // "RGB" label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = `${8 * dpr}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('RGB', graphX + 2 * dpr, graphTopY + 12 * dpr);

    // Channel legend
    const legendX = graphX + graphW - 60 * dpr;
    const legendY = graphTopY + 10 * dpr;
    ctx.font = `${7 * dpr}px monospace`;
    const labels = [
      { label: 'R', color: 'rgba(255, 60, 60, 0.90)' },
      { label: 'G', color: 'rgba(60, 255, 60, 0.90)' },
      { label: 'B', color: 'rgba(80, 130, 255, 0.90)' },
    ];
    labels.forEach((l, i) => {
      ctx.fillStyle = l.color;
      ctx.fillText(l.label, legendX + i * 16 * dpr, legendY);
    });
  }, { maxFps: reducedMotion ? 2 : undefined });

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        role="img"
        aria-label="RGB channel analysis graph"
      />
    </div>
  );
}
