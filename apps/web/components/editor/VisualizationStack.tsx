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

// ─── Per-layer canvas drawing helpers ───

/** Compute min, max, avg of a numeric array. Returns zeros if empty. */
function arrayStats(values: number[]): { min: number; max: number; avg: number } {
  const n = values.length;
  if (n === 0) return { min: 0, max: 0, avg: 0 };
  let min = values[0], max = values[0], sum = 0;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: sum / n };
}

/** Draw a horizontal waveform where X = pixel index, Y = value (yMin..yMax). */
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  values: number[],
  cw: number,
  ch: number,
  yMin: number,
  yMax: number,
  lineColor: string,
  label: string,
  dpr: number,
  /** Optional right-aligned stat string drawn in the header area */
  statLabel?: string,
) {
  const n = values.length;
  if (n === 0) return;

  const padX = 8 * dpr;
  const padTop = 14 * dpr;
  const padBot = 4 * dpr;
  const gx = padX;
  const gy = padTop;
  const gw = cw - padX * 2;
  const gh = ch - padTop - padBot;

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
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.stroke();

  // Waveform fill (area under curve)
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = gx + (i / Math.max(n - 1, 1)) * gw;
    const norm = (values[i] - yMin) / range;
    const y = gy + gh - norm * gh;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  // Close path down to baseline
  ctx.lineTo(gx + gw, gy + gh);
  ctx.lineTo(gx, gy + gh);
  ctx.closePath();
  ctx.fillStyle = lineColor.replace(/[\d.]+\)$/, '0.12)').replace(/^#/, 'rgba(').replace(/^rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})\)/, (_m, rh, gh2, bh) =>
    `rgba(${parseInt(rh, 16)},${parseInt(gh2, 16)},${parseInt(bh, 16)},0.12)`);
  // Simpler fill approach using the lineColor with low alpha
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = lineColor;
  ctx.fill();
  ctx.restore();

  // Waveform line
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

  // Label (left)
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.font = `${7 * dpr}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, gx + 2 * dpr, 2 * dpr);

  // Live stat readout (right-aligned)
  if (statLabel) {
    ctx.fillStyle = lineColor;
    ctx.globalAlpha = 0.55;
    ctx.font = `${7 * dpr}px monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(statLabel, gx + gw - 2 * dpr, 2 * dpr);
    ctx.globalAlpha = 1;
  }
}

// ─── Layer render functions ───

function renderChannelLayer(
  ctx: CanvasRenderingContext2D,
  pixels: ArrayLike<number>,
  leds: number,
  cw: number,
  ch: number,
  channelOffset: number, // 0=R, 1=G, 2=B
  lineColor: string,
  label: string,
  dpr: number,
) {
  const values: number[] = [];
  for (let i = 0; i < leds; i++) {
    values.push(pixels[i * 3 + channelOffset] ?? 0);
  }
  const { avg, max } = arrayStats(values);
  const stat = `avg:${Math.round(avg)} max:${max}`;
  drawWaveform(ctx, values, cw, ch, 0, 255, lineColor, label, dpr, stat);
}

function renderLuminanceLayer(
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
    values.push(0.299 * r + 0.587 * g + 0.114 * b);
  }
  const { avg } = arrayStats(values);
  const pct = Math.round((avg / 255) * 100);
  drawWaveform(ctx, values, cw, ch, 0, 255, '#cccccc', 'LUMA', dpr, `avg: ${pct}%`);
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
  const maxMaPerPixel = MA_PER_CHANNEL * 3; // 60 mA at full white
  const values: number[] = [];
  for (let i = 0; i < leds; i++) {
    const r = (pixels[i * 3] ?? 0) * briScale;
    const g = (pixels[i * 3 + 1] ?? 0) * briScale;
    const b = (pixels[i * 3 + 2] ?? 0) * briScale;
    const ma = ((r + g + b) / 255) * MA_PER_CHANNEL;
    values.push(ma);
  }

  // Compute total draw in amps for stat readout
  let totalMa = 0;
  for (let i = 0; i < values.length; i++) totalMa += values[i];
  const totalA = (totalMa / 1000).toFixed(2);
  drawWaveform(ctx, values, cw, ch, 0, maxMaPerPixel, '#ffaa00', 'POWER (mA)', dpr, `total: ${totalA}A`);

  // 5A limit line — draw as dashed red line across the graph area
  const padX = 8 * dpr;
  const padTop = 14 * dpr;
  const padBot = 4 * dpr;
  const gx = padX;
  const gy = padTop;
  const gw = cw - padX * 2;
  const gh = ch - padTop - padBot;

  if (gw > 0 && gh > 0) {
    // The per-pixel budget line: 5000 mA / leds (what each pixel can draw before total exceeds 5A)
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
  // Dominant hue via circular mean (hue wraps at 360)
  let sinSum = 0, cosSum = 0;
  for (let i = 0; i < values.length; i++) {
    const rad = (values[i] * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  let dominantHue = Math.round((Math.atan2(sinSum, cosSum) * 180) / Math.PI);
  if (dominantHue < 0) dominantHue += 360;
  drawWaveform(ctx, values, cw, ch, 0, 360, '#cc88ff', 'HUE (\u00B0)', dpr, `dominant: ${dominantHue}\u00B0`);
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
  const { avg } = arrayStats(values);
  drawWaveform(ctx, values, cw, ch, 0, 100, '#ff88cc', 'SAT (%)', dpr, `avg: ${Math.round(avg)}%`);
}

function renderEffectOverlayLayer(
  ctx: CanvasRenderingContext2D,
  pixels: ArrayLike<number>,
  leds: number,
  cw: number,
  ch: number,
  dpr: number,
) {
  // Detect "hot" pixels — ones that are significantly brighter or hue-shifted from
  // a stable base color. We use luminance > 200 as a rough "effect active" heuristic.
  const padX = 8 * dpr;
  const padTop = 4 * dpr;
  const gx = padX;
  const gw = cw - padX * 2;
  const gh = ch - padTop * 2;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cw, ch);

  if (leds <= 0 || gw <= 0 || gh <= 0) return;

  const cellW = gw / leds;
  let hotCount = 0;

  for (let i = 0; i < leds; i++) {
    const r = pixels[i * 3] ?? 0;
    const g = pixels[i * 3 + 1] ?? 0;
    const b = pixels[i * 3 + 2] ?? 0;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    // Hot pixel = very bright (effect flash) or high green/blue clash signature
    if (luma > 180) {
      hotCount++;
      const alpha = Math.min(1, (luma - 180) / 75);
      ctx.fillStyle = `rgba(${r},${g},${b},${(alpha * 0.7).toFixed(2)})`;
      ctx.fillRect(gx + i * cellW, padTop, Math.max(cellW, 1), gh);
    }
  }

  // Border
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(gx, padTop, gw, gh);

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.font = `${7 * dpr}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('EFFECTS', gx + 2 * dpr, 2 * dpr);

  // Live stat: count of hot (effect-active) pixels
  ctx.fillStyle = 'rgba(255,221,68,0.55)';
  ctx.textAlign = 'right';
  ctx.fillText(`hot: ${hotCount}px`, gx + gw - 2 * dpr, 2 * dpr);
}

function renderSwingResponseLayer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  swingSpeed: number, // 0-1 from motionSim.swing / 100
  dpr: number,
) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cw, ch);

  const padX = 8 * dpr;
  const padTop = 14 * dpr;
  const padBot = 4 * dpr;
  const gx = padX;
  const gy = padTop;
  const gw = cw - padX * 2;
  const gh = ch - padTop - padBot;

  if (gw <= 0 || gh <= 0) return;

  // Background track
  ctx.fillStyle = 'rgba(68,255,238,0.06)';
  ctx.fillRect(gx, gy, gw, gh);

  // Filled bar representing current swing intensity
  const barW = swingSpeed * gw;
  if (barW > 0) {
    const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    grad.addColorStop(0, 'rgba(68,255,238,0.20)');
    grad.addColorStop(Math.min(swingSpeed, 1), 'rgba(68,255,238,0.80)');
    grad.addColorStop(1, 'rgba(68,255,238,0.10)');
    ctx.fillStyle = grad;
    ctx.fillRect(gx, gy, barW, gh);
  }

  // Tick mark at current position
  const tickX = gx + swingSpeed * gw;
  ctx.strokeStyle = '#44ffee';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(tickX, gy);
  ctx.lineTo(tickX, gy + gh);
  ctx.stroke();

  // Border
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5 * dpr;
  ctx.strokeRect(gx, gy, gw, gh);

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.font = `${7 * dpr}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('SWING', gx + 2 * dpr, 2 * dpr);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(swingSpeed * 100)}%`, gx + gw - 2 * dpr, 2 * dpr);
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

  const padX = 8 * dpr;
  const padTop = 10 * dpr;
  const padBot = 4 * dpr;
  const gx = padX;
  const gy = padTop;
  const gw = cw - padX * 2;
  const gh = ch - padTop - padBot;

  if (gw <= 0 || gh <= 0) return;

  const isIgniting = bladeState === 'igniting';
  const isRetracting = bladeState === 'retracting';
  const isOn = bladeState === 'on';

  // Track
  ctx.fillStyle = 'rgba(136,170,255,0.06)';
  ctx.fillRect(gx, gy, gw, gh);

  // Fill: full when on, empty when off, animated midpoints would require engine progress
  const fillFrac = isOn ? 1 : (isIgniting || isRetracting) ? 0.5 : 0;

  if (fillFrac > 0) {
    const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    grad.addColorStop(0, 'rgba(136,170,255,0.15)');
    grad.addColorStop(fillFrac, `rgba(136,170,255,${isOn ? 0.70 : 0.45})`);
    if (fillFrac < 1) grad.addColorStop(1, 'rgba(136,170,255,0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(gx, gy, fillFrac * gw, gh);
  }

  // Border
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5 * dpr;
  ctx.strokeRect(gx, gy, gw, gh);

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.font = `${7 * dpr}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TRANS', gx + 2 * dpr, 2 * dpr);

  const stateLabel = isIgniting ? 'IGNITING' : isRetracting ? 'RETRACTING' : isOn ? 'ON' : 'OFF';
  ctx.textAlign = 'right';
  ctx.fillText(stateLabel, gx + gw - 2 * dpr, 2 * dpr);
}

function renderStorageBudgetLayer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  ledCount: number,
  dpr: number,
) {
  // Estimate style config size: very rough proxy based on LED count (more LEDs = larger style)
  // Real budget comes from StorageBudgetPanel; this is a lightweight inline indicator.
  const estimatedStyleKB = 2 + ledCount * 0.05; // ~8.6 KB for 132 LEDs
  const cardFreeKB = 16 * 1024 * 1024 / 1024; // assume 16 GB card, show relative %
  const usedFrac = Math.min(estimatedStyleKB / 1024, 1); // relative to 1 MB scale cap

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cw, ch);

  const padX = 8 * dpr;
  const padTop = 10 * dpr;
  const padBot = 4 * dpr;
  const gx = padX;
  const gy = padTop;
  const gw = cw - padX * 2;
  const gh = ch - padTop - padBot;

  if (gw <= 0 || gh <= 0) return;

  // Track
  ctx.fillStyle = 'rgba(170,255,170,0.06)';
  ctx.fillRect(gx, gy, gw, gh);

  // Used bar
  const usedColor = usedFrac > 0.8 ? '#ff6666' : usedFrac > 0.5 ? '#ffaa44' : '#aaffaa';
  ctx.fillStyle = usedColor;
  ctx.globalAlpha = 0.60;
  ctx.fillRect(gx, gy, usedFrac * gw, gh);
  ctx.globalAlpha = 1;

  // Border
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5 * dpr;
  ctx.strokeRect(gx, gy, gw, gh);

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.font = `${7 * dpr}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('BUDGET', gx + 2 * dpr, 2 * dpr);
  ctx.textAlign = 'right';
  ctx.fillText(`~${estimatedStyleKB.toFixed(1)} KB`, gx + gw - 2 * dpr, 2 * dpr);

  void cardFreeKB; // only used for context
}

// ─── Single layer canvas component ───

export interface LayerCanvasProps {
  layerId: VisualizationLayerId;
  pixels: ArrayLike<number> | null;
  pixelCount: number;
  height: number;
  isPaused: boolean;
  reducedMotion: boolean;
}

/**
 * Exported 2026-04-21 (OV5) so AnalysisRail can reuse the same
 * canvas renderer + RAF wiring for the 9 line-graph layers it owns.
 * The original signature is unchanged — VisualizationStack continues
 * to consume it exactly as before.
 */
export function LayerCanvas({ layerId, pixels, pixelCount, height, isPaused, reducedMotion }: LayerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const brightness = useUIStore((s) => s.brightness);
  const motionSim = useBladeStore((s) => s.motionSim);
  const bladeState = useBladeStore((s) => s.bladeState);
  const ledCount = useBladeStore((s) => s.config.ledCount);

  // Resize observer
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
      case 'channel-r':
        renderChannelLayer(ctx, pixels ?? [], leds, cw, ch, 0, '#ff4444', 'R', dpr);
        break;
      case 'channel-g':
        renderChannelLayer(ctx, pixels ?? [], leds, cw, ch, 1, '#44ff88', 'G', dpr);
        break;
      case 'channel-b':
        renderChannelLayer(ctx, pixels ?? [], leds, cw, ch, 2, '#4488ff', 'B', dpr);
        break;
      case 'luminance':
        renderLuminanceLayer(ctx, pixels ?? [], leds, cw, ch, dpr);
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
  }, [layerId, pixels, pixelCount, brightness, motionSim.swing, bladeState, ledCount]);

  useAnimationFrame(draw, {
    enabled: !isPaused,
    maxFps: reducedMotion ? 2 : undefined,
  });

  const layer = getLayerById(layerId);
  const ariaLabel = layer ? `${layer.label} visualization layer` : layerId;

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full shrink-0"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
}

// ─── VisualizationStack ───

export interface VisualizationStackProps {
  /** RGB pixel buffer from engine.getPixels() — null when engine not yet ready */
  pixelData: Uint8Array | number[] | null;
  /** How many LEDs to read from pixelData */
  pixelCount: number;
  /** Container width in pixels (used for canvas sizing, actual sizing via CSS) */
  width?: number;
  className?: string;
}

/**
 * VisualizationStack — renders the set of visible analysis layers below the blade canvas.
 *
 * Each layer is a thin horizontal strip drawn on its own HTML5 Canvas. Layers are rendered
 * in the order defined by `layerOrder` from the visualization store, filtered to only those
 * in `visibleLayers`. The `blade` and `pixel-strip` layers are skipped here because they
 * are rendered as standalone full-height components above this stack.
 */
export function VisualizationStack({ pixelData, pixelCount, className }: VisualizationStackProps) {
  const visibleLayers = useVisualizationStore((s) => s.visibleLayers);
  const layerOrder = useVisualizationStore((s) => s.layerOrder);
  const isPaused = useUIStore((s) => s.isPaused);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  // Layers rendered externally — skip them here.
  //
  //   - 'blade' + 'pixel-strip'       — rendered full-width above the stack.
  //   - 'storage-budget'               — scalar; moved to the DeliveryRail
  //                                      STORAGE segment (OV4).
  //   - All 'line-graph' shaped       — moved to the left-side
  //                                      AnalysisRail (OV5).
  //
  // That leaves the pixel-shaped layers that align with the blade canvas
  // (effect-overlay today; future pixel-shaped layers add here without
  // code changes). VisualizationStack will be empty on a fresh default
  // config since effect-overlay is hidden by default — VisualizationStack
  // returns null in that case so section 2b has no footprint.
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
