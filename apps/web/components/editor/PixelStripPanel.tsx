'use client';
import { useRef, useEffect } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { computeBladeRenderMetrics } from '@/lib/bladeRenderMetrics';

interface PixelStripPanelProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
}

/**
 * PixelStripPanel — standalone horizontal LED pixel bar visualization.
 *
 * Renders each LED as a colored rectangle, LED 0 at the left (hilt)
 * to last LED at right (tip). Reads engine pixel buffer each frame.
 */
export function PixelStripPanel({ engineRef }: PixelStripPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const brightness = useUIStore((s) => s.brightness);
  const bladeStartFrac = useUIStore((s) => s.bladeStartFrac);
  const isPaused = useUIStore((s) => s.isPaused);
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

    // Layout: horizontal strip anchored to the blade's rendered extent in
    // BladeCanvas (OV2). `computeBladeRenderMetrics` mirrors BladeCanvas's
    // auto-fit geometry so the per-LED strip under a 24" blade renders at
    // ~55% of container width, not 100%. Container width comes from the
    // ResizeObserver in CSS pixels; the metrics helper is CSS-pixel-native,
    // so we multiply by dpr once to convert to canvas space.
    const padY = 2 * dpr;
    // Phase 1.5m: use the CONFIG ledCount (not the buffer-clamped `leds`)
    // so inferBladeInches always resolves to the full blade length. If the
    // engine is mid-resize or exposes fewer LEDs momentarily, the metrics
    // helper would drop to a shorter bladeInches bucket (e.g. 132 LEDs →
    // 36" instead of 144 → 40"), shrinking bladeWidthPx by 10% and
    // making the strip end ~77 px left of where the blade canvas ends.
    const metrics = computeBladeRenderMetrics({
      containerWidthPx: w,
      ledCount,
      bladeStartFrac,
    });
    const stripLeft = metrics.bladeLeftPx * dpr;
    const stripW = metrics.bladeWidthPx * dpr;
    const stripRight = stripLeft + stripW;
    const stripTopY = padY;
    const stripH = ch - padY * 2;
    const cellW = stripW / leds;

    // Background panel
    const bgPad = 2 * dpr;
    ctx.fillStyle = 'rgba(10, 12, 20, 0.8)';
    ctx.fillRect(stripLeft - bgPad, stripTopY - bgPad, stripW + bgPad * 2, stripH + bgPad * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(stripLeft - bgPad, stripTopY - bgPad, stripW + bgPad * 2, stripH + bgPad * 2);

    // LED pixels — LED 0 at left (hilt), last LED at right (tip)
    // Also accumulate stats while iterating
    let totalMa = 0;
    let lumaSum = 0;
    for (let i = 0; i < leds; i++) {
      const r = (pixels[i * 3] ?? 0) * bri;
      const g = (pixels[i * 3 + 1] ?? 0) * bri;
      const b = (pixels[i * 3 + 2] ?? 0) * bri;
      const x = stripLeft + i * cellW;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x, stripTopY, Math.max(cellW - 0.3, 0.5), stripH);

      // mA: each channel draws up to 20 mA at full brightness (255)
      totalMa += ((r + g + b) / 255) * 20;
      // Perceptual luminance
      lumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Phase 1.5j: the in-canvas "PIXEL" label + `0.00A bri:N%` stats
    // readout were drawn INSIDE this canvas (ON TOP of LED rendering
    // at the right edge). Both moved to the new PIXEL STRIP panel
    // header in CanvasLayout — they read more cleanly there and
    // don't obscure the rightmost LEDs. `totalMa` / `lumaSum`
    // computed above are intentionally unused here now; the header
    // re-derives them from the engine pixel buffer.
    void totalMa;
    void lumaSum;
    void stripRight;
  }, {
    // W5 pause model: freeze on any pause scope (full AND partial).
    // Partial-pause keeps the realistic blade canvas alive, but the
    // LED pixel strip is part of the analysis chrome and should
    // freeze so the user can read off specific pixel values.
    enabled: !isPaused,
    maxFps: reducedMotion ? 2 : undefined,
  });

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
