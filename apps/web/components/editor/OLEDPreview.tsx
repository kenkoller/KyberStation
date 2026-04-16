'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import type { OLEDResolution } from '@kyberstation/engine';

// ─── 5x7 Bitmap Font ───
// Each character is a 5-wide x 7-tall boolean grid stored as rows of bitmask integers.
// Bit 4 = leftmost pixel, bit 0 = rightmost pixel.

const FONT_5X7: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0e],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x0a, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x0e, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x04, 0x04, 0x04],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04],
  '-': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  ':': [0x00, 0x00, 0x04, 0x00, 0x04, 0x00, 0x00],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  '+': [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  '\'': [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  ',': [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08],
};

// 3x5 compact font for small text
const FONT_3X5: Record<string, number[]> = {
  A: [0x02, 0x05, 0x07, 0x05, 0x05],
  B: [0x06, 0x05, 0x06, 0x05, 0x06],
  C: [0x03, 0x04, 0x04, 0x04, 0x03],
  D: [0x06, 0x05, 0x05, 0x05, 0x06],
  E: [0x07, 0x04, 0x06, 0x04, 0x07],
  F: [0x07, 0x04, 0x06, 0x04, 0x04],
  G: [0x03, 0x04, 0x05, 0x05, 0x03],
  H: [0x05, 0x05, 0x07, 0x05, 0x05],
  I: [0x07, 0x02, 0x02, 0x02, 0x07],
  J: [0x01, 0x01, 0x01, 0x05, 0x02],
  K: [0x05, 0x05, 0x06, 0x05, 0x05],
  L: [0x04, 0x04, 0x04, 0x04, 0x07],
  M: [0x05, 0x07, 0x07, 0x05, 0x05],
  N: [0x05, 0x07, 0x07, 0x05, 0x05],
  O: [0x02, 0x05, 0x05, 0x05, 0x02],
  P: [0x06, 0x05, 0x06, 0x04, 0x04],
  Q: [0x02, 0x05, 0x05, 0x06, 0x03],
  R: [0x06, 0x05, 0x06, 0x05, 0x05],
  S: [0x03, 0x04, 0x02, 0x01, 0x06],
  T: [0x07, 0x02, 0x02, 0x02, 0x02],
  U: [0x05, 0x05, 0x05, 0x05, 0x02],
  V: [0x05, 0x05, 0x05, 0x05, 0x02],
  W: [0x05, 0x05, 0x07, 0x07, 0x05],
  X: [0x05, 0x05, 0x02, 0x05, 0x05],
  Y: [0x05, 0x05, 0x02, 0x02, 0x02],
  Z: [0x07, 0x01, 0x02, 0x04, 0x07],
  '0': [0x02, 0x05, 0x05, 0x05, 0x02],
  '1': [0x02, 0x06, 0x02, 0x02, 0x07],
  '2': [0x06, 0x01, 0x02, 0x04, 0x07],
  '3': [0x06, 0x01, 0x02, 0x01, 0x06],
  '4': [0x05, 0x05, 0x07, 0x01, 0x01],
  '5': [0x07, 0x04, 0x06, 0x01, 0x06],
  '6': [0x03, 0x04, 0x06, 0x05, 0x02],
  '7': [0x07, 0x01, 0x02, 0x02, 0x02],
  '8': [0x02, 0x05, 0x02, 0x05, 0x02],
  '9': [0x02, 0x05, 0x03, 0x01, 0x06],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x02],
  '-': [0x00, 0x00, 0x07, 0x00, 0x00],
  ':': [0x00, 0x02, 0x00, 0x02, 0x00],
  '/': [0x01, 0x01, 0x02, 0x04, 0x04],
  '%': [0x05, 0x01, 0x02, 0x04, 0x05],
  '(': [0x01, 0x02, 0x02, 0x02, 0x01],
  ')': [0x02, 0x01, 0x01, 0x01, 0x02],
};

// Default OLED native resolution
const DEFAULT_OLED_W = 128;
const DEFAULT_OLED_H = 32;

// Display scale factor (3x for crisp upscaling)
const SCALE = 3;

function getOLEDDims(resolution: OLEDResolution): { w: number; h: number } {
  return resolution === '128x64'
    ? { w: 128, h: 64 }
    : { w: DEFAULT_OLED_W, h: DEFAULT_OLED_H };
}

// Pixel colors simulating real SSD1306 OLED
const PIXEL_ON = '#e0e8ff';
const PIXEL_DIM = '#b8c4e0'; // scanline dimmed row
const PIXEL_OFF = '#000000';

// ─── Pixel Drawing Helpers ───

type PixelBuffer = boolean[][];

function createBuffer(w: number = DEFAULT_OLED_W, h: number = DEFAULT_OLED_H): PixelBuffer {
  return Array.from({ length: h }, () => new Array(w).fill(false) as boolean[]);
}

function setPixel(buf: PixelBuffer, x: number, y: number, on: boolean = true): void {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (yi >= 0 && yi < buf.length && xi >= 0 && xi < (buf[0]?.length ?? 0)) {
    buf[yi][xi] = on;
  }
}

function drawChar5x7(buf: PixelBuffer, ch: string, ox: number, oy: number): void {
  const glyph = FONT_5X7[ch.toUpperCase()];
  if (!glyph) return;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row] & (1 << (4 - col))) {
        setPixel(buf, ox + col, oy + row);
      }
    }
  }
}

function drawChar3x5(buf: PixelBuffer, ch: string, ox: number, oy: number): void {
  const glyph = FONT_3X5[ch.toUpperCase()];
  if (!glyph) return;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (glyph[row] & (1 << (2 - col))) {
        setPixel(buf, ox + col, oy + row);
      }
    }
  }
}

function drawText5x7(buf: PixelBuffer, text: string, x: number, y: number): number {
  let cx = x;
  for (const ch of text) {
    drawChar5x7(buf, ch, cx, y);
    cx += 6; // 5px char + 1px spacing
  }
  return cx;
}

function drawText3x5(buf: PixelBuffer, text: string, x: number, y: number): number {
  let cx = x;
  for (const ch of text) {
    drawChar3x5(buf, ch, cx, y);
    cx += 4; // 3px char + 1px spacing
  }
  return cx;
}

function measureText5x7(text: string): number {
  return Math.max(0, text.length * 6 - 1);
}

function measureText3x5(text: string): number {
  return Math.max(0, text.length * 4 - 1);
}

function drawTextCentered5x7(buf: PixelBuffer, text: string, y: number, bufW?: number): void {
  const w = measureText5x7(text);
  const totalW = bufW ?? buf[0]?.length ?? DEFAULT_OLED_W;
  drawText5x7(buf, text, Math.floor((totalW - w) / 2), y);
}

function drawTextCentered3x5(buf: PixelBuffer, text: string, y: number, bufW?: number): void {
  const w = measureText3x5(text);
  const totalW = bufW ?? buf[0]?.length ?? DEFAULT_OLED_W;
  drawText3x5(buf, text, Math.floor((totalW - w) / 2), y);
}

function drawHLine(buf: PixelBuffer, x1: number, x2: number, y: number): void {
  for (let x = x1; x <= x2; x++) {
    setPixel(buf, x, y);
  }
}

function drawRect(buf: PixelBuffer, x: number, y: number, w: number, h: number): void {
  drawHLine(buf, x, x + w - 1, y);
  drawHLine(buf, x, x + w - 1, y + h - 1);
  for (let row = y; row < y + h; row++) {
    setPixel(buf, x, row);
    setPixel(buf, x + w - 1, row);
  }
}

function fillRect(buf: PixelBuffer, x: number, y: number, w: number, h: number): void {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      setPixel(buf, col, row);
    }
  }
}

// ─── Screen Renderers ───

function renderBootScreen(buf: PixelBuffer, _t: number): void {
  drawTextCentered5x7(buf, 'KYBERSTATION', 5);
  drawTextCentered3x5(buf, 'V1.0', 18);
  // decorative line
  drawHLine(buf, 24, 103, 26);
}

function renderOffScreen(
  buf: PixelBuffer,
  presetName: string,
  styleName: string,
  _t: number,
): void {
  // Preset name - large font, centered near top
  const displayName = presetName.length > 18 ? presetName.slice(0, 17) + '.' : presetName;
  drawTextCentered5x7(buf, displayName.toUpperCase(), 2);

  // Style name - small font below
  const styleDisplay = styleName.toUpperCase();
  drawTextCentered3x5(buf, styleDisplay, 12);

  // Battery bar at bottom
  const barX = 4;
  const barY = 22;
  const barW = 100;
  const barH = 7;
  drawRect(buf, barX, barY, barW, barH);
  // battery nub
  fillRect(buf, barX + barW, barY + 2, 2, 3);
  // fill to 85%
  const fillW = Math.floor((barW - 2) * 0.85);
  fillRect(buf, barX + 1, barY + 1, fillW, barH - 2);
  // percentage text
  drawText3x5(buf, '85%', barX + barW + 5, barY + 1);
}

function renderIgnitionScreen(buf: PixelBuffer, progress: number, dims: {w: number; h: number}): void {
  // Horizontal sweep from left to right
  const sweepX = Math.floor(progress * dims.w);

  // Draw blade line at vertical center
  const cy = Math.floor(dims.h / 2);
  for (let x = 0; x < sweepX; x++) {
    setPixel(buf, x, cy);
    setPixel(buf, x, cy - 1);
    setPixel(buf, x, cy + 1);
  }

  // Bright tip with spark effect
  if (sweepX > 0 && sweepX < dims.w) {
    for (let dy = -4; dy <= 4; dy++) {
      setPixel(buf, sweepX, cy + dy);
    }
    // Sparks near tip
    if (progress > 0.1) {
      const sparkSpread = Math.floor(3 + progress * 5);
      for (let i = 0; i < 4; i++) {
        const sx = sweepX - Math.floor(Math.random() * 6);
        const sy = cy + Math.floor((Math.random() - 0.5) * sparkSpread * 2);
        setPixel(buf, sx, sy);
      }
    }
  }

  // Flash effect at start
  if (progress < 0.15) {
    const flashIntensity = 1 - progress / 0.15;
    const flashW = Math.floor(flashIntensity * 20);
    for (let dy = -flashW; dy <= flashW; dy++) {
      for (let dx = 0; dx < flashW; dx++) {
        setPixel(buf, dx, cy + dy);
      }
    }
  }
}

function renderActiveScreen(
  buf: PixelBuffer,
  styleName: string,
  t: number,
  dims: {w: number; h: number},
): void {
  // Style name at top - small font
  drawText3x5(buf, styleName.toUpperCase(), 2, 1);

  // Animated blade bar in middle area
  const barY = Math.floor(dims.h * 0.3);
  const barH = 5;
  for (let x = 4; x < dims.w - 4; x++) {
    // Pulse along the blade
    const wave = Math.sin((x * 0.08) + (t * 0.004)) * 0.5 + 0.5;
    const shimmer = Math.sin((x * 0.15) + (t * 0.007)) * 0.3 + 0.7;
    if (wave * shimmer > 0.3) {
      for (let dy = 0; dy < barH; dy++) {
        setPixel(buf, x, barY + dy);
      }
    }
  }
  // Solid core
  for (let x = 4; x < dims.w - 4; x++) {
    setPixel(buf, x, barY + 2);
  }

  // VU meter / waveform at bottom
  const waveY = Math.floor(dims.h * 0.65);
  for (let x = 2; x < dims.w - 2; x++) {
    const v1 = Math.sin((x * 0.12) + (t * 0.005)) * 4;
    const v2 = Math.sin((x * 0.06) + (t * 0.003)) * 2;
    const v3 = Math.sin((x * 0.25) + (t * 0.01)) * 1.5;
    const val = v1 + v2 + v3;
    const h = Math.max(1, Math.floor(Math.abs(val)));
    for (let dy = 0; dy < h; dy++) {
      setPixel(buf, x, waveY + (val > 0 ? -dy : dy));
    }
  }

  // Bottom line
  drawHLine(buf, 0, dims.w - 1, dims.h - 1);
}

function renderRetractionScreen(buf: PixelBuffer, progress: number, dims: {w: number; h: number}): void {
  // Reverse sweep from right to left
  const remaining = Math.floor((1 - progress) * dims.w);
  const cy = Math.floor(dims.h / 2);

  for (let x = 0; x < remaining; x++) {
    setPixel(buf, x, cy);
    setPixel(buf, x, cy - 1);
    setPixel(buf, x, cy + 1);
  }

  // Dim tail effect
  if (remaining > 0 && remaining < dims.w) {
    for (let dy = -2; dy <= 2; dy++) {
      setPixel(buf, remaining, cy + dy);
    }
  }

  // Fade-out sparks near retraction point
  if (progress > 0.2 && progress < 0.9) {
    for (let i = 0; i < 3; i++) {
      const sx = remaining + Math.floor(Math.random() * 8);
      const sy = cy + Math.floor((Math.random() - 0.5) * 8);
      setPixel(buf, sx, sy);
    }
  }
}

// ─── Canvas Renderer ───

function renderBufferToCanvas(
  ctx: CanvasRenderingContext2D,
  buf: PixelBuffer,
  dims: {w: number; h: number},
): void {
  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, dims.w * SCALE, dims.h * SCALE);

  for (let y = 0; y < dims.h; y++) {
    // Scanline effect: every other row slightly dimmer
    const color = y % 2 === 0 ? PIXEL_ON : PIXEL_DIM;
    for (let x = 0; x < dims.w; x++) {
      if (buf[y]?.[x]) {
        ctx.fillStyle = color;
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      }
    }
  }
}

// ─── Component ───

const BOOT_DURATION_MS = 2000;

export function OLEDPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(0);
  const stateStartRef = useRef<number>(0);
  const prevStateRef = useRef<string>('');
  const [resolution, setResolution] = useState<OLEDResolution>('128x32');

  const bladeState = useBladeStore((s) => s.bladeState);
  const isOn = useBladeStore((s) => s.isOn);
  const config = useBladeStore((s) => s.config);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  const dims = getOLEDDims(resolution);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const elapsed = now - mountTimeRef.current;

    // Detect state transitions
    const currentState = String(bladeState);
    if (currentState !== prevStateRef.current) {
      stateStartRef.current = now;
      prevStateRef.current = currentState;
    }

    const stateElapsed = now - stateStartRef.current;
    const buf = createBuffer(dims.w, dims.h);

    // Screen selection based on state
    if (elapsed < BOOT_DURATION_MS) {
      renderBootScreen(buf, elapsed);
    } else if (bladeState === 'igniting') {
      const ignitionMs = config.ignitionMs || 300;
      const progress = Math.min(1, stateElapsed / ignitionMs);
      renderIgnitionScreen(buf, progress, dims);
    } else if (bladeState === 'retracting') {
      const retractionMs = config.retractionMs || 800;
      const progress = Math.min(1, stateElapsed / retractionMs);
      renderRetractionScreen(buf, progress, dims);
    } else if (isOn || bladeState === 'on') {
      renderActiveScreen(buf, config.style, now, dims);
    } else {
      renderOffScreen(buf, config.name || 'CUSTOM', config.style, now);
    }

    renderBufferToCanvas(ctx, buf, dims);
    if (!reducedMotion) {
      animRef.current = requestAnimationFrame(render);
    }
  }, [bladeState, isOn, config, dims, reducedMotion]);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    stateStartRef.current = performance.now();
    prevStateRef.current = String(bladeState);
    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [render, bladeState]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Resolution selector */}
      <div className="flex items-center gap-2">
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value as OLEDResolution)}
          aria-label="OLED preview resolution"
          className="bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-sm text-text-secondary"
        >
          <option value="128x32">128x32 (SSD1306)</option>
          <option value="128x64">128x64 (SSD1306)</option>
        </select>
      </div>

      {/* OLED module housing */}
      <div
        className="relative rounded-lg border border-neutral-600 bg-neutral-900 p-2 shadow-lg"
        style={{
          boxShadow: '0 0 8px rgba(0,0,0,0.8), inset 0 0 2px rgba(255,255,255,0.03)',
        }}
      >
        {/* Screen bezel */}
        <div
          className="rounded-sm overflow-hidden"
          style={{
            border: '1px solid #222',
            lineHeight: 0,
          }}
        >
          <canvas
            ref={canvasRef}
            width={dims.w * SCALE}
            height={dims.h * SCALE}
            style={{
              width: dims.w * SCALE,
              height: dims.h * SCALE,
              imageRendering: 'pixelated',
            }}
          />
        </div>
        {/* Module label */}
        <div className="mt-1.5 text-center">
          <span className="text-[7px] text-neutral-600 tracking-widest uppercase font-mono">
            SSD1306 {resolution}
          </span>
        </div>
      </div>
      <p className="text-ui-xs text-text-muted">
        Simulated Proffieboard OLED output
      </p>
    </div>
  );
}
