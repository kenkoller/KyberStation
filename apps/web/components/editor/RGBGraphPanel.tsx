'use client';
import { useRef, useEffect } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { useBladeStore } from '@/stores/bladeStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

interface RGBGraphPanelProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
}

/**
 * RGBGraphPanel — standalone horizontal RGB line chart visualization.
 *
 * Plots R, G, B channel values (0-255 on Y-axis) against LED position
 * (left=hilt, right=tip on X-axis). Reads engine pixel buffer each frame.
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

    // Layout: X = LED position (hilt left, tip right), Y = channel value (0-255)
    const padX = 8 * dpr;
    const padTop = 10 * dpr;
    const padBot = 6 * dpr;
    const graphX = padX;
    const graphW = cw - padX * 2;
    const graphTopY = padTop;
    const graphBotY = ch - padBot;
    const graphH = graphBotY - graphTopY;

    if (graphW <= 0 || graphH <= 0) return;

    // Background panel
    const bgPad = 2 * dpr;
    ctx.fillStyle = 'rgba(10, 12, 20, 0.6)';
    ctx.fillRect(graphX - bgPad, graphTopY - bgPad, graphW + bgPad * 2, graphH + bgPad * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(graphX - bgPad, graphTopY - bgPad, graphW + bgPad * 2, graphH + bgPad * 2);

    // Horizontal guide lines (Y = channel value marks: 0, 64, 128, 192, 255)
    ctx.lineWidth = 0.5 * dpr;
    ctx.font = `${7 * dpr}px monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const val of [0, 64, 128, 192, 255]) {
      const gy = graphBotY - (val / 255) * graphH;
      if (val > 0 && val < 255) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(graphX, gy);
        ctx.lineTo(graphX + graphW, gy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
      ctx.fillText(String(val), graphX - 3 * dpr, gy);
    }

    // Vertical guide lines (X = LED position fractions)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5 * dpr;
    for (const frac of [0.25, 0.5, 0.75]) {
      const gx = graphX + frac * graphW;
      ctx.beginPath();
      ctx.moveTo(gx, graphTopY);
      ctx.lineTo(gx, graphBotY);
      ctx.stroke();
    }

    // R, G, B lines — X = LED position (left to right), Y = channel value
    // Also accumulate per-channel stats while iterating
    const channels = [
      { offset: 0, color: 'rgba(255, 60, 60, 0.90)', label: 'R', sum: 0, max: 0 },
      { offset: 1, color: 'rgba(60, 255, 60, 0.90)', label: 'G', sum: 0, max: 0 },
      { offset: 2, color: 'rgba(80, 130, 255, 0.90)', label: 'B', sum: 0, max: 0 },
    ];
    ctx.lineWidth = 1.5 * dpr;
    for (const chan of channels) {
      ctx.strokeStyle = chan.color;
      ctx.beginPath();
      for (let i = 0; i < leds; i++) {
        const val = pixels[i * 3 + chan.offset] ?? 0;
        chan.sum += val;
        if (val > chan.max) chan.max = val;
        const x = graphX + (i / Math.max(leds - 1, 1)) * graphW;
        const y = graphBotY - (val / 255) * graphH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // "RGB" label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = `${8 * dpr}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('RGB', graphX + 2 * dpr, graphTopY + 10 * dpr);

    // Live per-channel stat readouts — right-aligned, stacked vertically
    const statX = graphX + graphW - 2 * dpr;
    const statStartY = graphTopY + 10 * dpr;
    const statLineH = 9 * dpr;
    ctx.font = `${7 * dpr}px monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let ci = 0; ci < channels.length; ci++) {
      const ch2 = channels[ci];
      const avg = leds > 0 ? Math.round(ch2.sum / leds) : 0;
      ctx.fillStyle = ch2.color;
      ctx.globalAlpha = 0.60;
      ctx.fillText(
        `${ch2.label}: avg ${avg}  max ${ch2.max}`,
        statX,
        statStartY + ci * statLineH,
      );
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
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
