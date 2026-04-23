'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useVisualizationStore } from '@/stores/visualizationStore';
import { useUIStore } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import {
  VISUALIZATION_LAYERS,
  getLayerById,
  LINE_GRAPH_SHAPED_LAYER_IDS,
  type VisualizationLayerId,
} from '@/lib/visualizationTypes';

// ─── Constants ───

/** mA per WS2812B channel at full brightness */
const MA_PER_CHANNEL = 20;
/** Proffieboard max recommended continuous draw (mA) */
const BOARD_MAX_MA = 5000;
/** Dark background color for all layer graphs */
const BG_COLOR = '#030305';
/** Subtle grid / border color */
const GRID_COLOR = 'rgba(255,255,255,0.07)';

// ─── RGB-to-HSV helper ───

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

// ─── Readout helpers (exported for header consumers) ─────────────────────────
//
// W1 (2026-04-22): duplicate canvas-internal labels + readouts were stripped
// from every render function. The numeric readouts are still useful, just not
// useful drawn INSIDE the already-labelled waveform — they belong in the row
// header (AnalysisRail) and the slot header (ExpandedAnalysisSlot). These
// pure helpers compute the same short strings (`total: 3.88A`, `dominant: 207°`,
// etc.) off the engine pixel buffer so both headers can render them inline.

export interface ReadoutContext {
  brightness?: number;
  swingSpeed?: number;
  bladeState?: string;
  ledCount?: number;
  rgbLumaChannels?: { r: boolean; g: boolean; b: boolean; l: boolean };
}

export function computeLayerReadout(
  layerId: VisualizationLayerId,
  pixels: ArrayLike<number> | null,
  pixelCount: number,
  ctx: ReadoutContext = {},
): string | null {
  const leds = pixels ? Math.min(pixelCount, Math.floor(pixels.length / 3)) : 0;
  if (leds <= 0 && (layerId === 'rgb-luma' || layerId === 'power-draw' || layerId === 'hue' || layerId === 'saturation' || layerId === 'effect-overlay')) {
    return null;
  }

  switch (layerId) {
    case 'rgb-luma': {
      if (!pixels) return null;
      const channels = ctx.rgbLumaChannels ?? { r: true, g: true, b: true, l: true };
      let rSum = 0, gSum = 0, bSum = 0, lSum = 0;
      for (let i = 0; i < leds; i++) {
        const r = pixels[i * 3] ?? 0;
        const g = pixels[i * 3 + 1] ?? 0;
        const b = pixels[i * 3 + 2] ?? 0;
        rSum += r; gSum += g; bSum += b;
        lSum += 0.299 * r + 0.587 * g + 0.114 * b;
      }
      const parts: string[] = [];
      if (channels.r) parts.push(`R ${Math.round(rSum / leds)}`);
      if (channels.g) parts.push(`G ${Math.round(gSum / leds)}`);
      if (channels.b) parts.push(`B ${Math.round(bSum / leds)}`);
      if (channels.l) parts.push(`L ${Math.round((lSum / leds / 255) * 100)}%`);
      return parts.length > 0 ? parts.join(' · ') : null;
    }
    case 'power-draw': {
      if (!pixels) return null;
      const briScale = (ctx.brightness ?? 100) / 100;
      let totalMa = 0;
      for (let i = 0; i < leds; i++) {
        const r = (pixels[i * 3] ?? 0) * briScale;
        const g = (pixels[i * 3 + 1] ?? 0) * briScale;
        const b = (pixels[i * 3 + 2] ?? 0) * briScale;
        totalMa += ((r + g + b) / 255) * MA_PER_CHANNEL;
      }
      return `${(totalMa / 1000).toFixed(2)}A`;
    }
    case 'hue': {
      if (!pixels) return null;
      let sinSum = 0, cosSum = 0;
      for (let i = 0; i < leds; i++) {
        const r = pixels[i * 3] ?? 0;
        const g = pixels[i * 3 + 1] ?? 0;
        const b = pixels[i * 3 + 2] ?? 0;
        const h = rgbToHsv(r, g, b).h;
        const rad = (h * Math.PI) / 180;
        sinSum += Math.sin(rad);
        cosSum += Math.cos(rad);
      }
      let dom = Math.round((Math.atan2(sinSum, cosSum) * 180) / Math.PI);
      if (dom < 0) dom += 360;
      return `${dom}°`;
    }
    case 'saturation': {
      if (!pixels) return null;
      let sat = 0;
      for (let i = 0; i < leds; i++) {
        const r = pixels[i * 3] ?? 0;
        const g = pixels[i * 3 + 1] ?? 0;
        const b = pixels[i * 3 + 2] ?? 0;
        sat += rgbToHsv(r, g, b).s * 100;
      }
      return `${Math.round(sat / leds)}%`;
    }
    case 'swing-response':
      return `${Math.round((ctx.swingSpeed ?? 0) * 100)}%`;
    case 'transition-progress': {
      const s = ctx.bladeState;
      if (s === 'igniting') return 'IGNITING';
      if (s === 'retracting') return 'RETRACTING';
      if (s === 'on') return 'ON';
      return 'OFF';
    }
    case 'effect-overlay': {
      if (!pixels) return null;
      let hot = 0;
      for (let i = 0; i < leds; i++) {
        const r = pixels[i * 3] ?? 0;
        const g = pixels[i * 3 + 1] ?? 0;
        const b = pixels[i * 3 + 2] ?? 0;
        if (0.299 * r + 0.587 * g + 0.114 * b > 180) hot++;
      }
      return `${hot} hot px`;
    }
    default:
      return null;
  }
}

// ─── Per-layer canvas draw helpers ───
//
// W1: label/stat text removed. Each draw fn now paints only the waveform +
// grid lines. Labels live in the row header; readouts are computed
// separately via `computeLayerReadout` above.

/** Paint grid + filled area + trace. Pure canvas, no text. */
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  values: number[],
  cw: number,
  ch: number,
  yMin: number,
  yMax: number,
  lineColor: string,
  dpr: number,
) {
  const n = values.length;
  if (n === 0) return;

  const padX = 6 * dpr;
  const padY = 3 * dpr;
  const gx = padX;
  const gy = padY;
  const gw = cw - padX * 2;
  const gh = ch - padY * 2;
  if (gw <= 0 || gh <= 0) return;

  const range = yMax - yMin || 1;

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cw, ch);

  // Subtle top/bottom grid lines
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + gw, gy);
  ctx.moveTo(gx, gy + gh);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.stroke();

  // Filled area under curve
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = gx + (i / Math.max(n - 1, 1)) * gw;
    const norm = (values[i] - yMin) / range;
    const y = gy + gh - norm * gh;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(gx + gw, gy + gh);
  ctx.lineTo(gx, gy + gh);
  ctx.closePath();
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = lineColor;
  ctx.fill();
  ctx.restore();

  // Trace
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = gx + (i / Math.max(n - 1, 1)) * gw;
    const norm = (values[i] - yMin) / range;
    const y = gy + gh - norm * gh;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();
}

// ─── Layer render functions ───

function renderRgbLumaLayer(
  ctx: CanvasRenderingContext2D,
  pixels: ArrayLike<number>,
  leds: number,
  cw: number,
  ch: number,
  channels: { r: boolean; g: boolean; b: boolean; l: boolean },
  dpr: number,
) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cw, ch);
  if (leds <= 0) return;

  const padX = 6 * dpr;
  const padY = 3 * dpr;
  const gx = padX;
  const gy = padY;
  const gw = cw - padX * 2;
  const gh = ch - padY * 2;
  if (gw <= 0 || gh <= 0) return;

  // Grid
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + gw, gy);
  ctx.moveTo(gx, gy + gh);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.stroke();

  const rVals: number[] = [];
  const gVals: number[] = [];
  const bVals: number[] = [];
  const lVals: number[] = [];
  for (let i = 0; i < leds; i++) {
    const r = pixels[i * 3] ?? 0;
    const g = pixels[i * 3 + 1] ?? 0;
    const b = pixels[i * 3 + 2] ?? 0;
    rVals.push(r);
    gVals.push(g);
    bVals.push(b);
    lVals.push(0.299 * r + 0.587 * g + 0.114 * b);
  }

  const traces: Array<{ values: number[]; color: string; width: number }> = [];
  if (channels.r) traces.push({ values: rVals, color: '#ff4444', width: 1.25 * dpr });
  if (channels.g) traces.push({ values: gVals, color: '#44ff88', width: 1.25 * dpr });
  if (channels.b) traces.push({ values: bVals, color: '#4488ff', width: 1.25 * dpr });
  if (channels.l) traces.push({ values: lVals, color: '#e8e8e8', width: 1.5 * dpr });

  for (const trace of traces) {
    ctx.beginPath();
    for (let i = 0; i < trace.values.length; i++) {
      const x = gx + (i / Math.max(trace.values.length - 1, 1)) * gw;
      const norm = trace.values[i] / 255;
      const y = gy + gh - norm * gh;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = trace.color;
    ctx.lineWidth = trace.width;
    ctx.stroke();
  }
}

function renderPowerDrawLayer(
  ctx: CanvasRenderingContext2D,
  pixels: ArrayLike<number>,
  leds: number,
  cw: number,
  ch: number,
  brightness: number,
  dpr: number,
) {
  const briScale = brightness / 100;
  const maxMaPerPixel = MA_PER_CHANNEL * 3;
  const values: number[] = [];
  for (let i = 0; i < leds; i++) {
    const r = (pixels[i * 3] ?? 0) * briScale;
    const g = (pixels[i * 3 + 1] ?? 0) * briScale;
    const b = (pixels[i * 3 + 2] ?? 0) * briScale;
    values.push(((r + g + b) / 255) * MA_PER_CHANNEL);
  }
  drawWaveform(ctx, values, cw, ch, 0, maxMaPerPixel, '#ffaa00', dpr);

  // 5A limit line
  const padX = 6 * dpr;
  const padY = 3 * dpr;
  const gx = padX;
  const gy = padY;
  const gw = cw - padX * 2;
  const gh = ch - padY * 2;
  if (gw > 0 && gh > 0) {
    const safePerPixel = leds > 0 ? BOARD_MAX_MA / leds : maxMaPerPixel;
    const limitNorm = Math.min(safePerPixel / maxMaPerPixel, 1);
    const limitY = gy + gh - limitNorm * gh;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,60,60,0.70)';
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([4 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(gx, limitY);
    ctx.lineTo(gx + gw, limitY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function renderHueLayer(
  ctx: CanvasRenderingContext2D,
  pixels: ArrayLike<number>,
  leds: number,
  cw: number,
  ch: number,
  dpr: number,
) {
  const values: number[] = [];
  for (let i = 0; i < leds; i++) {
    const r = pixels[i * 3] ?? 0;
    const g = pixels[i * 3 + 1] ?? 0;
    const b = pixels[i * 3 + 2] ?? 0;
    values.push(rgbToHsv(r, g, b).h);
  }
  drawWaveform(ctx, values, cw, ch, 0, 360, '#cc88ff', dpr);
}

function renderSaturationLayer(
  ctx: CanvasRenderingContext2D,
  pixels: ArrayLike<number>,
  leds: number,
  cw: number,
  ch: number,
  dpr: number,
) {
  const values: number[] = [];
  for (let i = 0; i < leds; i++) {
    const r = pixels[i * 3] ?? 0;
    const g = pixels[i * 3 + 1] ?? 0;
    const b = pixels[i * 3 + 2] ?? 0;
    values.push(rgbToHsv(r, g, b).s * 100);
  }
  drawWaveform(ctx, values, cw, ch, 0, 100, '#ff88cc', dpr);
}

function renderEffectOverlayLayer(
  ctx: CanvasRenderingContext2D,
  pixels: ArrayLike<number>,
  leds: number,
  cw: number,
  ch: number,
  dpr: number,
) {
  const padX = 6 * dpr;
  const padY = 3 * dpr;
  const gx = padX;
  const gw = cw - padX * 2;
  const gh = ch - padY * 2;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cw, ch);

  if (leds <= 0 || gw <= 0 || gh <= 0) return;

  const cellW = gw / leds;
  for (let i = 0; i < leds; i++) {
    const r = pixels[i * 3] ?? 0;
    const g = pixels[i * 3 + 1] ?? 0;
    const b = pixels[i * 3 + 2] ?? 0;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma > 180) {
      const alpha = Math.min(1, (luma - 180) / 75);
      ctx.fillStyle = `rgba(${r},${g},${b},${(alpha * 0.7).toFixed(2)})`;
      ctx.fillRect(gx + i * cellW, padY, Math.max(cellW, 1), gh);
    }
  }

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(gx, padY, gw, gh);
}

function renderSwingResponseLayer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  swingSpeed: number,
  dpr: number,
) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cw, ch);

  const padX = 6 * dpr;
  const padY = 3 * dpr;
  const gx = padX;
  const gy = padY;
  const gw = cw - padX * 2;
  const gh = ch - padY * 2;
  if (gw <= 0 || gh <= 0) return;

  ctx.fillStyle = 'rgba(68,255,238,0.06)';
  ctx.fillRect(gx, gy, gw, gh);

  const barW = swingSpeed * gw;
  if (barW > 0) {
    const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    grad.addColorStop(0, 'rgba(68,255,238,0.20)');
    grad.addColorStop(Math.min(swingSpeed, 1), 'rgba(68,255,238,0.80)');
    grad.addColorStop(1, 'rgba(68,255,238,0.10)');
    ctx.fillStyle = grad;
    ctx.fillRect(gx, gy, barW, gh);
  }

  const tickX = gx + swingSpeed * gw;
  ctx.strokeStyle = '#44ffee';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(tickX, gy);
  ctx.lineTo(tickX, gy + gh);
  ctx.stroke();

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5 * dpr;
  ctx.strokeRect(gx, gy, gw, gh);
}

function renderTransitionProgressLayer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  bladeState: string,
  dpr: number,
) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cw, ch);

  const padX = 6 * dpr;
  const padY = 3 * dpr;
  const gx = padX;
  const gy = padY;
  const gw = cw - padX * 2;
  const gh = ch - padY * 2;
  if (gw <= 0 || gh <= 0) return;

  const isIgniting = bladeState === 'igniting';
  const isRetracting = bladeState === 'retracting';
  const isOn = bladeState === 'on';

  ctx.fillStyle = 'rgba(136,170,255,0.06)';
  ctx.fillRect(gx, gy, gw, gh);

  const fillFrac = isOn ? 1 : (isIgniting || isRetracting) ? 0.5 : 0;
  if (fillFrac > 0) {
    const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    grad.addColorStop(0, 'rgba(136,170,255,0.15)');
    grad.addColorStop(fillFrac, `rgba(136,170,255,${isOn ? 0.70 : 0.45})`);
    if (fillFrac < 1) grad.addColorStop(1, 'rgba(136,170,255,0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(gx, gy, fillFrac * gw, gh);
  }

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5 * dpr;
  ctx.strokeRect(gx, gy, gw, gh);
}

function renderStorageBudgetLayer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  ledCount: number,
  dpr: number,
) {
  const estimatedStyleKB = 2 + ledCount * 0.05;
  const usedFrac = Math.min(estimatedStyleKB / 1024, 1);

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cw, ch);

  const padX = 6 * dpr;
  const padY = 3 * dpr;
  const gx = padX;
  const gy = padY;
  const gw = cw - padX * 2;
  const gh = ch - padY * 2;
  if (gw <= 0 || gh <= 0) return;

  ctx.fillStyle = 'rgba(170,255,170,0.06)';
  ctx.fillRect(gx, gy, gw, gh);

  const usedColor = usedFrac > 0.8 ? '#ff6666' : usedFrac > 0.5 ? '#ffaa44' : '#aaffaa';
  ctx.fillStyle = usedColor;
  ctx.globalAlpha = 0.60;
  ctx.fillRect(gx, gy, usedFrac * gw, gh);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5 * dpr;
  ctx.strokeRect(gx, gy, gw, gh);
}

// ─── Single layer canvas component ───

export interface LayerCanvasProps {
  layerId: VisualizationLayerId;
  pixels: ArrayLike<number> | null;
  pixelCount: number;
  /**
   * Pixel height for the rendered canvas. Omit to fill the parent's
   * height (useful inside a flex column where the row height is
   * dynamic). The canvas's internal ResizeObserver tracks width +
   * height either way.
   */
  height?: number;
  isPaused: boolean;
  reducedMotion: boolean;
}

export function LayerCanvas({ layerId, pixels, pixelCount, height, isPaused, reducedMotion }: LayerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const brightness = useUIStore((s) => s.brightness);
  const motionSim = useBladeStore((s) => s.motionSim);
  const bladeState = useBladeStore((s) => s.bladeState);
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const rgbLumaChannels = useVisualizationStore((s) => s.rgbLumaChannels);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height: h } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${h}px`;
        sizeRef.current = { w: width, h: h, dpr };
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;
    if (cw <= 0 || ch <= 0) return;

    const leds = pixels ? Math.min(pixelCount, Math.floor(pixels.length / 3)) : 0;

    switch (layerId) {
      case 'rgb-luma':
        renderRgbLumaLayer(ctx, pixels ?? [], leds, cw, ch, rgbLumaChannels, dpr);
        break;
      case 'power-draw':
        renderPowerDrawLayer(ctx, pixels ?? [], leds, cw, ch, brightness, dpr);
        break;
      case 'hue':
        renderHueLayer(ctx, pixels ?? [], leds, cw, ch, dpr);
        break;
      case 'saturation':
        renderSaturationLayer(ctx, pixels ?? [], leds, cw, ch, dpr);
        break;
      case 'effect-overlay':
        renderEffectOverlayLayer(ctx, pixels ?? [], leds, cw, ch, dpr);
        break;
      case 'swing-response':
        renderSwingResponseLayer(ctx, cw, ch, motionSim.swing / 100, dpr);
        break;
      case 'transition-progress':
        renderTransitionProgressLayer(ctx, cw, ch, bladeState as string, dpr);
        break;
      case 'storage-budget':
        renderStorageBudgetLayer(ctx, cw, ch, ledCount, dpr);
        break;
      default:
        break;
    }
  }, [layerId, pixels, pixelCount, brightness, motionSim.swing, bladeState, ledCount, rgbLumaChannels]);

  useAnimationFrame(draw, {
    enabled: !isPaused,
    maxFps: reducedMotion ? 2 : undefined,
  });

  const layer = getLayerById(layerId);
  const ariaLabel = layer ? `${layer.label} visualization layer` : layerId;

  return (
    <div
      ref={containerRef}
      // When `height` is omitted, fill the flex slot we're dropped into.
      // When provided, honor it (the expanded slot + pixel strip still
      // use fixed heights).
      style={height !== undefined ? { height } : { height: '100%' }}
      className={height !== undefined ? 'w-full shrink-0' : 'w-full min-h-0'}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
}

// ─── VisualizationStack ───

export interface VisualizationStackProps {
  pixelData: Uint8Array | number[] | null;
  pixelCount: number;
  width?: number;
  className?: string;
}

/**
 * VisualizationStack — renders any pixel-shaped analysis layers that align
 * with the blade canvas. Line-graph layers render in the AnalysisRail on
 * the left; scalar layers render in the Delivery rail. After W1 most
 * pixel-shaped layers are hidden by default, so this stack returns null
 * in a fresh install and mounts lazily if the user enables effect-overlay
 * or a future pixel layer.
 */
export function VisualizationStack({ pixelData, pixelCount, className }: VisualizationStackProps) {
  const visibleLayers = useVisualizationStore((s) => s.visibleLayers);
  const layerOrder = useVisualizationStore((s) => s.layerOrder);
  const isPaused = useUIStore((s) => s.isPaused);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  const SKIP_LAYERS = new Set<VisualizationLayerId>([
    'blade',
    'pixel-strip',
    'storage-budget',
  ]);

  const orderedVisible = layerOrder.filter(
    (id) =>
      visibleLayers.has(id) &&
      !SKIP_LAYERS.has(id) &&
      !LINE_GRAPH_SHAPED_LAYER_IDS.has(id),
  );

  if (orderedVisible.length === 0) return null;

  return (
    <div className={`flex flex-col w-full gap-px${className ? ` ${className}` : ''}`}>
      {orderedVisible.map((id) => {
        const layer = VISUALIZATION_LAYERS.find((l) => l.id === id);
        const layerHeight = layer?.height ?? 40;

        return (
          <LayerCanvas
            key={id}
            layerId={id}
            pixels={pixelData}
            pixelCount={pixelCount}
            height={layerHeight}
            isPaused={isPaused}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </div>
  );
}
