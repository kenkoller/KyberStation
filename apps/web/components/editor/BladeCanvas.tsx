'use client';
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import type { BladeEngine, BladeConfig } from '@bladeforge/engine';
import { TOPOLOGY_PRESETS } from '@bladeforge/engine';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { getThemeById } from '@/lib/canvasThemes';

type RenderMode = 'photorealistic' | 'pixel';

interface BladeCanvasProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
  vertical?: boolean;
  mobileFullscreen?: boolean;
  renderMode?: RenderMode;
  compact?: boolean;
}

// ─── Design-space constants (scaled at render time) ───
// Everything is authored at 1200x600 then mapped to actual canvas size.

const DESIGN_W = 1200;
const DESIGN_H = 600;

// Blade placement (design-space)
const EMITTER_W = 14;
const BLADE_START = 274; // hilt area ends here
const BLADE_LEN = 830;
const BLADE_Y = DESIGN_H / 2;
const BLADE_CORE_H = 26;

// Data readout positions (design-space Y)
const STRIP_Y = 400;       // pixel strip top
const GRAPH_TOP_Y = 455;   // RGB graph top (increased gap from strip)
const GRAPH_BOT_Y = 575;   // RGB graph bottom (padding from canvas edge)

// Reference: max blade inches that fills BLADE_LEN design-space
const MAX_BLADE_INCHES = 40;
// Hilt palette
const METAL_DARK = '#2a2a32';
const METAL_SPEC = '#6a6a78';
const METAL_RIB = '#1a1a22';
const EMITTER_DARK = '#555560';
const EMITTER_LIGHT = '#6a6a74';
const BUTTON_RED = '#cc0000';
const BUTTON_SPEC = '#ff6666';

// ─── Strip type definitions ───

interface StripType {
  id: string;
  label: string;
  description: string;
  ledsPerInch: number;
  stripCount: number; // physical LED strips in the blade
}

const STRIP_TYPES: StripType[] = [
  // Neopixel (per-pixel addressable)
  { id: 'single', label: 'Neopixel (1 strip)', description: 'Single strip, 144 LED/m', ledsPerInch: 3.66, stripCount: 1 },
  { id: 'dual-neo', label: 'Neopixel (2 strip)', description: 'Dual strip, brighter', ledsPerInch: 3.66, stripCount: 2 },
  { id: 'tri-neo', label: 'Neopixel (3 strip)', description: 'Tri strip, very even', ledsPerInch: 3.66, stripCount: 3 },
  { id: 'quad-neo', label: 'Neopixel (4 strip)', description: 'Quad strip, ultra-even', ledsPerInch: 3.66, stripCount: 4 },
  { id: 'penta-neo', label: 'Neopixel (5 strip)', description: 'Penta strip, maximum light', ledsPerInch: 3.66, stripCount: 5 },
  // In-hilt (high-power base LEDs, no per-pixel control)
  { id: 'tri-cree', label: 'Tri-Cree (In-Hilt)', description: '3 high-power base LEDs', ledsPerInch: 0, stripCount: 3 },
  { id: 'quad-cree', label: 'Quad-Star (In-Hilt)', description: '4 high-power base LEDs', ledsPerInch: 0, stripCount: 4 },
  { id: 'penta-cree', label: 'Penta-Star (In-Hilt)', description: '5 high-power base LEDs', ledsPerInch: 0, stripCount: 5 },
];

// ─── Blade length options ───

const BLADE_LENGTHS = [
  { label: 'Yoda (20")', inches: 20, ledCount: 73 },
  { label: 'Short (24")', inches: 24, ledCount: 88 },
  { label: 'Medium (28")', inches: 28, ledCount: 103 },
  { label: 'Standard (32")', inches: 32, ledCount: 117 },
  { label: 'Long (36")', inches: 36, ledCount: 132 },
  { label: 'Extra Long (40")', inches: 40, ledCount: 147 },
];

// ─── Topology options (for the selector) ───

const TOPOLOGY_OPTIONS = [
  { id: 'single', label: 'Single Blade' },
  { id: 'staff', label: 'Double / Staff' },
  { id: 'crossguard', label: 'Crossguard' },
  { id: 'triple', label: 'Triple' },
  { id: 'quad-star', label: 'Quad Star' },
  { id: 'inquisitor', label: 'Inquisitor' },
  { id: 'split-blade', label: 'Split Blade' },
  { id: 'accent', label: 'Accent LEDs' },
];

// ─── Hilt variations ───

interface HiltStyle {
  id: string;
  label: string;
  pommelW: number;
  gripW: number;
  shroudW: number;
  emitterW: number;
  hiltH: number;
  shroudInset: number;
  emitterFlare: number; // extra height on emitter
  ribSpacing: number;
  hasButton: boolean;
  hasWindowPort: boolean;
  metalTint: string; // slight color tint overlay
}

const HILT_STYLES: HiltStyle[] = [
  { id: 'minimal', label: 'Minimal', pommelW: 10, gripW: 80, shroudW: 10, emitterW: 16, hiltH: 20, shroudInset: 1, emitterFlare: 1, ribSpacing: 10, hasButton: false, hasWindowPort: false, metalTint: '' },
  { id: 'classic', label: 'Classic (ANH)', pommelW: 22, gripW: 110, shroudW: 24, emitterW: 38, hiltH: 28, shroudInset: 4, emitterFlare: 4, ribSpacing: 6, hasButton: true, hasWindowPort: false, metalTint: '' },
  { id: 'graflex', label: 'Graflex (ESB)', pommelW: 18, gripW: 120, shroudW: 16, emitterW: 30, hiltH: 26, shroudInset: 2, emitterFlare: 2, ribSpacing: 4, hasButton: true, hasWindowPort: true, metalTint: '#c8b060' },
  { id: 'thin-neck', label: 'Thin Neck (ROTJ)', pommelW: 20, gripW: 100, shroudW: 30, emitterW: 34, hiltH: 26, shroudInset: 7, emitterFlare: 6, ribSpacing: 5, hasButton: true, hasWindowPort: false, metalTint: '' },
  { id: 'maul', label: 'Maul (Staff)', pommelW: 12, gripW: 140, shroudW: 10, emitterW: 22, hiltH: 22, shroudInset: 2, emitterFlare: 1, ribSpacing: 8, hasButton: false, hasWindowPort: false, metalTint: '#a03030' },
  { id: 'dooku', label: 'Dooku (Curved)', pommelW: 28, gripW: 105, shroudW: 20, emitterW: 30, hiltH: 30, shroudInset: 3, emitterFlare: 3, ribSpacing: 7, hasButton: true, hasWindowPort: false, metalTint: '#806040' },
  { id: 'kylo', label: 'Kylo (Crossguard)', pommelW: 16, gripW: 100, shroudW: 20, emitterW: 48, hiltH: 24, shroudInset: 3, emitterFlare: 8, ribSpacing: 5, hasButton: false, hasWindowPort: false, metalTint: '#404040' },
  { id: 'ahsoka', label: 'Ahsoka (Fulcrum)', pommelW: 24, gripW: 90, shroudW: 28, emitterW: 42, hiltH: 24, shroudInset: 5, emitterFlare: 5, ribSpacing: 4, hasButton: true, hasWindowPort: false, metalTint: '#e0e0f0' },
  { id: 'cal', label: 'Cal Kestis', pommelW: 20, gripW: 115, shroudW: 18, emitterW: 32, hiltH: 26, shroudInset: 3, emitterFlare: 3, ribSpacing: 6, hasButton: true, hasWindowPort: true, metalTint: '#c0a070' },
];

// ─── Diffusion tube types ───

interface DiffusionType {
  id: string;
  label: string;
  description: string;
  blurKernel: number;       // pixel blur applied to LED array (0 = none)
  brightnessMultiplier: number; // 1.0 = full brightness
  hotspotVisibility: number;    // 0 = invisible, 1 = fully visible LED dots
}

const DIFFUSION_TYPES: DiffusionType[] = [
  { id: 'trans-white', label: 'Trans-White (No Diffusion)', description: 'Bright, LED hotspots visible', blurKernel: 0, brightnessMultiplier: 1.0, hotspotVisibility: 0.8 },
  { id: 'light', label: 'Light Diffusion', description: 'Slight smoothing, LEDs faintly visible', blurKernel: 1.5, brightnessMultiplier: 0.95, hotspotVisibility: 0.3 },
  { id: 'medium', label: 'Medium Diffusion', description: 'Smooth blending, no visible LEDs', blurKernel: 3.5, brightnessMultiplier: 0.85, hotspotVisibility: 0 },
  { id: 'heavy', label: 'Heavy Diffusion', description: 'Very smooth, dimmest, most cinematic', blurKernel: 6.0, brightnessMultiplier: 0.75, hotspotVisibility: 0 },
];

// ─── Blade diameter options ───

const BLADE_DIAMETERS = [
  { label: '3/4" (Thin)', inches: 0.75, coreScale: 0.75 },
  { label: '7/8" (Standard)', inches: 0.875, coreScale: 1.0 },
  { label: '1" (Heavy/Dueling)', inches: 1.0, coreScale: 1.15 },
];

// ─── In-hilt LED types (no per-pixel control) ───

const IN_HILT_TYPES = ['tri-cree', 'quad-cree', 'penta-cree'];

interface InHiltLEDType {
  id: string;
  label: string;
  description: string;
  ledCount: number;
  brightnessMultiplier: number;
}

const IN_HILT_LED_TYPES: InHiltLEDType[] = [
  { id: 'tri-cree', label: 'Tri-Cree', description: '3 high-power LEDs at base', ledCount: 3, brightnessMultiplier: 0.7 },
  { id: 'quad-cree', label: 'Quad-Star', description: '4 high-power LEDs', ledCount: 4, brightnessMultiplier: 0.85 },
  { id: 'penta-cree', label: 'Penta-Star', description: '5 high-power LEDs', ledCount: 5, brightnessMultiplier: 1.0 },
];

// ─── Per-color glow profiles ───

interface GlowProfile {
  coreWhiteout: number;     // 0-1, how much core blows out to white
  bloomRadius: number;       // multiplier on bloom blur radii
  bloomIntensity: number;    // multiplier on bloom opacity
  colorSaturation: number;   // how saturated the corona color is
  outerHue: number;          // hue shift for outermost bloom (degrees, 0 = none)
}

function getGlowProfile(r: number, g: number, b: number): GlowProfile {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;

  // White / very light colors
  if (chroma < 30 && lightness > 180) {
    return { coreWhiteout: 0.95, bloomRadius: 1.4, bloomIntensity: 1.3, colorSaturation: 0.3, outerHue: 0 };
  }

  // Determine dominant channel
  const isRed = r > g * 1.5 && r > b * 1.5;
  const isBlue = b > r * 1.2 && b > g * 1.2;
  const isCyan = g > r * 1.2 && b > r * 1.2 && Math.abs(g - b) < 60;
  const isGreen = g > r * 1.3 && g > b * 1.3;
  const isPurple = r > g * 1.3 && b > g * 1.3;
  const isYellow = r > b * 1.5 && g > b * 1.5 && Math.abs(r - g) < 80;
  const isOrange = r > g * 1.3 && g > b * 1.5 && r > 180;

  if (isRed) {
    // Red: deeper, tighter glow — menacing Sith look
    return { coreWhiteout: 0.80, bloomRadius: 1.1, bloomIntensity: 1.4, colorSaturation: 1.3, outerHue: 0 };
  }
  if (isBlue) {
    // Blue: wider spread, classic Jedi
    return { coreWhiteout: 0.88, bloomRadius: 1.5, bloomIntensity: 1.4, colorSaturation: 0.95, outerHue: 0 };
  }
  if (isCyan) {
    // Cyan: wide, bright, electric
    return { coreWhiteout: 0.90, bloomRadius: 1.5, bloomIntensity: 1.45, colorSaturation: 0.9, outerHue: 0 };
  }
  if (isGreen) {
    // Green: medium with slight warm edge
    return { coreWhiteout: 0.85, bloomRadius: 1.3, bloomIntensity: 1.3, colorSaturation: 1.0, outerHue: 5 };
  }
  if (isPurple) {
    // Purple: wide with desaturated outer ring
    return { coreWhiteout: 0.85, bloomRadius: 1.4, bloomIntensity: 1.35, colorSaturation: 0.8, outerHue: 0 };
  }
  if (isYellow) {
    // Yellow: Temple Guard, bright and warm
    return { coreWhiteout: 0.92, bloomRadius: 1.3, bloomIntensity: 1.35, colorSaturation: 0.9, outerHue: -5 };
  }
  if (isOrange) {
    // Orange: warm, moderate spread
    return { coreWhiteout: 0.86, bloomRadius: 1.2, bloomIntensity: 1.25, colorSaturation: 1.1, outerHue: 0 };
  }

  // Default / mixed colors
  return { coreWhiteout: 0.82, bloomRadius: 1.0, bloomIntensity: 1.0, colorSaturation: 1.0, outerHue: 0 };
}

// ─── Utility ───

function rgbStr(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerpToWhite(channel: number, t: number): number {
  return clamp(channel + (255 - channel) * t, 0, 255);
}

/** Boost saturation of an RGB color */
function saturateRGB(r: number, g: number, b: number, amount: number): [number, number, number] {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return [
    clamp(gray + (r - gray) * (1 + amount), 0, 255),
    clamp(gray + (g - gray) * (1 + amount), 0, 255),
    clamp(gray + (b - gray) * (1 + amount), 0, 255),
  ];
}

const VIEW_MODE_LABELS: Record<string, string> = {
  blade: 'Blade View',
  angle: 'Angle View',
  strip: 'Strip View',
  cross: 'Cross-Section',
};

// ─── Component ───

export function BladeCanvas({ engineRef, vertical = true, mobileFullscreen = false, renderMode = 'photorealistic', compact = false }: BladeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const fpsFrames = useRef<number[]>([]);
  const sizeRef = useRef({ w: DESIGN_W, h: DESIGN_H, dpr: 1 });

  // Compact strip mode: shorter design space with blade near top
  const layoutRef = useRef({
    designH: compact ? 240 : DESIGN_H,
    bladeY: compact ? 60 : BLADE_Y,
    stripY: compact ? 130 : STRIP_Y,
    graphTopY: compact ? 148 : GRAPH_TOP_Y,
    graphBotY: compact ? 230 : GRAPH_BOT_Y,
  });

  const config = useBladeStore((s) => s.config);
  const topology = useBladeStore((s) => s.topology);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const setTopology = useBladeStore((s) => s.setTopology);
  const viewMode = useUIStore((s) => s.viewMode);
  const brightness = useUIStore((s) => s.brightness);
  const canvasTheme = useUIStore((s) => s.canvasTheme);
  const analyzeMode = useUIStore((s) => s.analyzeMode);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const theme = useMemo(() => getThemeById(canvasTheme), [canvasTheme]);

  // Strip type from store (persisted via BladeConfig)
  const stripType = config.stripType ?? 'single';
  const setStripType = useCallback((v: string) => updateConfig({ stripType: v as BladeConfig['stripType'] }), [updateConfig]);
  const [bladeLength, setBladeLength] = useState<number>(config.ledCount <= 73 ? 20 : config.ledCount <= 88 ? 24 : config.ledCount <= 103 ? 28 : config.ledCount <= 117 ? 32 : config.ledCount <= 132 ? 36 : 40);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [hiltStyle, setHiltStyle] = useState<string>('minimal');
  const [diffusionType, setDiffusionType] = useState<string>('medium');
  const [bladeDiameter, setBladeDiameter] = useState<number>(0.875);
  const [zoom, setZoom] = useState<number>(1.25);
  const [panX, setPanX] = useState<number>(0); // pan offset in design-space pixels

  // Shimmer state for organic animation
  const shimmerRef = useRef<number>(1.0);
  const ignitionFlashRef = useRef<number>(0); // 0-1 flash intensity

  // ─── Responsive canvas sizing via ResizeObserver ───
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w < 1 || h < 1) return;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      sizeRef.current = { w, h, dpr };

      // Resize offscreen to match
      if (offscreenRef.current) {
        offscreenRef.current.width = w * dpr;
        offscreenRef.current.height = h * dpr;
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize(); // initial

    return () => observer.disconnect();
  }, []);

  // ─── Offscreen canvas (lazy, matches main size) ───
  const getOffscreen = useCallback((): HTMLCanvasElement => {
    const { w, h, dpr } = sizeRef.current;
    if (!offscreenRef.current) {
      const c = document.createElement('canvas');
      c.width = w * dpr;
      c.height = h * dpr;
      offscreenRef.current = c;
    }
    return offscreenRef.current;
  }, []);

  // ─── Scale factors: maps design-space → actual canvas pixels ───
  // Base scale: fits design space into canvas without zoom
  const getBaseScale = useCallback(() => {
    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;
    const sx = cw / DESIGN_W;
    const sy = ch / layoutRef.current.designH;
    return Math.min(sx, sy);
  }, []);

  // Zoomed scale: used for blade/hilt/glow rendering
  const getScale = useCallback(() => {
    return getBaseScale() * zoom;
  }, [getBaseScale, zoom]);

  // ─── Draw background + measurement grid ───
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;
    const scale = getScale();

    ctx.fillStyle = theme.bgColor;
    ctx.fillRect(0, 0, cw, ch);

    if (!showGrid) return;

    // Real-world measurement grid based on blade length (scale-accurate)
    const bladeLenInches = bladeLength;
    const scaledBladeLenDS = BLADE_LEN * (bladeLength / MAX_BLADE_INCHES);
    const pixelsPerInch = (scaledBladeLenDS * scale) / bladeLenInches;

    const bladeStartPx = (BLADE_START + panX) * scale;
    const bladeEndPx = bladeStartPx + scaledBladeLenDS * scale;
    const bladeCenterY = layoutRef.current.bladeY * scale;

    // Draw half-inch vertical lines along blade area
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let inch = 0; inch <= bladeLenInches; inch += 0.5) {
      const x = bladeStartPx + inch * pixelsPerInch;
      if (x > bladeEndPx + 1) break;

      const isWholeInch = inch === Math.floor(inch);
      const isMajor = inch % 6 === 0; // every 6 inches = bolder

      ctx.strokeStyle = isMajor
        ? theme.gridColor
        : isWholeInch
          ? theme.gridLabelColor
          : 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = isMajor ? 1.5 : 1;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();

      // Labels for whole inches
      if (isWholeInch && inch > 0) {
        const fontSize = Math.max(8, Math.min(11, scale * 8));
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = isMajor ? theme.gridLabelColor : theme.gridLabelColor;
        ctx.fillText(`${inch}"`, x, bladeCenterY + (BLADE_CORE_H * scale) / 2 + 6 * scale);
      }
    }

    // Horizontal guide lines at blade center area
    const guideOffsets = [0, -BLADE_CORE_H / 2, BLADE_CORE_H / 2];
    for (const offset of guideOffsets) {
      const y = (layoutRef.current.bladeY + offset) * scale;
      ctx.strokeStyle = offset === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bladeStartPx, y);
      ctx.lineTo(bladeEndPx, y);
      ctx.stroke();
    }

    // Ruler bar at top
    const rulerH = 16 * scale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(bladeStartPx, 0, bladeEndPx - bladeStartPx, rulerH);

    for (let inch = 0; inch <= bladeLenInches; inch++) {
      const x = bladeStartPx + inch * pixelsPerInch;
      if (x > bladeEndPx + 1) break;
      const isMajor = inch % 6 === 0;

      // Tick marks
      const tickH = isMajor ? rulerH : inch % 1 === 0 ? rulerH * 0.6 : rulerH * 0.3;
      ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, tickH);
      ctx.stroke();
    }

    // Half-inch tick marks in ruler
    for (let inch = 0.5; inch <= bladeLenInches; inch++) {
      const x = bladeStartPx + inch * pixelsPerInch;
      if (x > bladeEndPx + 1) break;
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rulerH * 0.3);
      ctx.stroke();
    }
  }, [showGrid, bladeLength, panX, getScale, theme]);

  // ─── Draw vignette ───
  const drawVignette = useCallback((ctx: CanvasRenderingContext2D) => {
    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;
    const cx = cw / 2;
    const cy = ch / 2;
    const radius = Math.sqrt(cx * cx + cy * cy);
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius);
    grad.addColorStop(0, `rgba(${theme.vignetteColor},0)`);
    grad.addColorStop(1, `rgba(${theme.vignetteColor},${theme.vignetteOpacity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
  }, [theme]);

  // ─── Draw metallic hilt (uses selected hilt style) ───
  const drawHilt = useCallback((ctx: CanvasRenderingContext2D, bladeColor: { r: number; g: number; b: number } | null, scale: number) => {
    const hs = HILT_STYLES.find(h => h.id === hiltStyle) ?? HILT_STYLES[0];

    // Compute hilt geometry from style
    const totalHiltW = hs.pommelW + hs.gripW + hs.shroudW + hs.emitterW;
    const hiltStartX = ((BLADE_START + panX) * scale) - totalHiltW * scale;
    const centerY = layoutRef.current.bladeY * scale;
    const hiltH = hs.hiltH * scale;
    const hiltTop = centerY - hiltH / 2;
    const hiltBot = centerY + hiltH / 2;

    let curX = hiltStartX;

    // --- Pommel (rounded left end) ---
    const pommelW = hs.pommelW * scale;
    const pommelGrad = ctx.createLinearGradient(curX, hiltTop, curX, hiltBot);
    pommelGrad.addColorStop(0, '#222228');
    pommelGrad.addColorStop(0.35, '#4a4a54');
    pommelGrad.addColorStop(0.5, METAL_SPEC);
    pommelGrad.addColorStop(0.65, '#4a4a54');
    pommelGrad.addColorStop(1, '#222228');
    ctx.fillStyle = pommelGrad;
    ctx.beginPath();
    ctx.roundRect(curX, hiltTop, pommelW, hiltH, [4 * scale, 0, 0, 4 * scale]);
    ctx.fill();
    curX += pommelW;

    // --- Grip section ---
    const gripW = hs.gripW * scale;
    const gripGrad = ctx.createLinearGradient(curX, hiltTop, curX, hiltBot);
    gripGrad.addColorStop(0, METAL_DARK);
    gripGrad.addColorStop(0.3, '#454550');
    gripGrad.addColorStop(0.5, METAL_SPEC);
    gripGrad.addColorStop(0.7, '#454550');
    gripGrad.addColorStop(1, METAL_DARK);
    ctx.fillStyle = gripGrad;
    ctx.fillRect(curX, hiltTop, gripW, hiltH);

    // Grip ribbing
    ctx.strokeStyle = METAL_RIB;
    ctx.lineWidth = 1;
    const ribSp = hs.ribSpacing * scale;
    for (let x = curX + ribSp; x < curX + gripW - 4 * scale; x += ribSp) {
      ctx.beginPath();
      ctx.moveTo(x, hiltTop + 3 * scale);
      ctx.lineTo(x, hiltBot - 3 * scale);
      ctx.stroke();
    }

    // Window port (Graflex-style)
    if (hs.hasWindowPort) {
      const wpX = curX + gripW * 0.6;
      const wpW = 12 * scale;
      const wpH = hiltH * 0.5;
      const wpY = hiltTop + (hiltH - wpH) / 2;
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(wpX, wpY, wpW, wpH);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(wpX, wpY, wpW, wpH);
      // Faint inner glow if blade is on
      if (bladeColor) {
        ctx.fillStyle = rgbStr(bladeColor.r, bladeColor.g, bladeColor.b, 0.15);
        ctx.fillRect(wpX + 1, wpY + 1, wpW - 2, wpH - 2);
      }
    }

    // Button
    if (hs.hasButton) {
      const buttonX = curX + gripW / 2;
      const buttonY = hiltTop - 3 * scale;
      ctx.fillStyle = BUTTON_RED;
      ctx.beginPath();
      ctx.arc(buttonX, buttonY, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BUTTON_SPEC;
      ctx.beginPath();
      ctx.arc(buttonX - 1 * scale, buttonY - 1 * scale, 1.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    curX += gripW;

    // --- Shroud / neck ---
    const shroudW = hs.shroudW * scale;
    const shroudInset = hs.shroudInset * scale;
    const shroudGrad = ctx.createLinearGradient(curX, hiltTop + shroudInset, curX, hiltBot - shroudInset);
    shroudGrad.addColorStop(0, '#333340');
    shroudGrad.addColorStop(0.5, '#5a5a64');
    shroudGrad.addColorStop(1, '#333340');
    ctx.fillStyle = shroudGrad;
    ctx.fillRect(curX, hiltTop + shroudInset, shroudW, hiltH - shroudInset * 2);
    curX += shroudW;

    // --- Emitter section ---
    const emW = hs.emitterW * scale;
    const flare = hs.emitterFlare * scale;
    const emitterGrad = ctx.createLinearGradient(curX, hiltTop - flare, curX, hiltBot + flare);
    emitterGrad.addColorStop(0, EMITTER_DARK);
    emitterGrad.addColorStop(0.3, EMITTER_LIGHT);
    emitterGrad.addColorStop(0.5, '#7a7a84');
    emitterGrad.addColorStop(0.7, EMITTER_LIGHT);
    emitterGrad.addColorStop(1, EMITTER_DARK);
    ctx.fillStyle = emitterGrad;
    ctx.fillRect(curX, hiltTop - flare, emW, hiltH + flare * 2);

    // Metal tint overlay
    if (hs.metalTint) {
      ctx.fillStyle = hs.metalTint;
      ctx.globalAlpha = 0.06;
      ctx.fillRect(hiltStartX, hiltTop, curX + emW - hiltStartX, hiltH);
      ctx.globalAlpha = 1;
    }

    // Emitter bore glow when blade is on
    if (bladeColor) {
      const boreX = curX + emW;
      const boreR = 14 * scale;
      const boreGrad = ctx.createRadialGradient(boreX, centerY, 0, boreX, centerY, boreR);
      boreGrad.addColorStop(0, rgbStr(bladeColor.r, bladeColor.g, bladeColor.b, 0.5));
      boreGrad.addColorStop(1, rgbStr(bladeColor.r, bladeColor.g, bladeColor.b, 0));
      ctx.fillStyle = boreGrad;
      ctx.beginPath();
      ctx.arc(boreX, centerY, boreR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle color wash on emitter body
      ctx.fillStyle = rgbStr(bladeColor.r, bladeColor.g, bladeColor.b, 0.06);
      ctx.fillRect(curX, hiltTop - flare, emW, hiltH + flare * 2);
    }
  }, [hiltStyle, panX]);

  // ─── Draw blade (photorealistic enhanced) ───
  const drawBladePhotorealistic = useCallback((ctx: CanvasRenderingContext2D, engine: BladeEngine) => {
    const scale = getScale();
    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;

    const leds = engine.leds;
    const ledCount = leds.count;
    const bri = brightness / 100;
    const extendProgress = engine.extendProgress;
    const isInHilt = IN_HILT_TYPES.includes(stripType);
    const currentStrip = STRIP_TYPES.find(s => s.id === stripType) ?? STRIP_TYPES[0];
    const diffusion = DIFFUSION_TYPES.find(d => d.id === diffusionType) ?? DIFFUSION_TYPES[2];
    const diameterConfig = BLADE_DIAMETERS.find(d => d.inches === bladeDiameter) ?? BLADE_DIAMETERS[1];

    // Scale blade length proportionally to inches (shorter blades = shorter visual)
    const scaledBladeLenDS = BLADE_LEN * (bladeLength / MAX_BLADE_INCHES);
    const bladeLenPx = scaledBladeLenDS * scale;
    const bladeStartPx = (BLADE_START + panX) * scale;
    const bladeYPx = layoutRef.current.bladeY * scale;
    const baseCoreH = BLADE_CORE_H * scale * diameterConfig.coreScale;
    const coreH = baseCoreH;

    const visibleLen = bladeLenPx * extendProgress;
    const visibleEnd = bladeStartPx + visibleLen;
    const segW = bladeLenPx / ledCount + 0.5 * scale;

    // Multi-strip brightness boost (non-linear due to diffusion overlap)
    const stripBrightness = isInHilt
      ? (IN_HILT_LED_TYPES.find(t => t.id === stripType)?.brightnessMultiplier ?? 0.7)
      : Math.min(currentStrip.stripCount * 0.7, 2.5);
    const effectiveBri = bri * diffusion.brightnessMultiplier * Math.min(stripBrightness, 2.0);

    // Organic shimmer: micro-variation per frame
    shimmerRef.current = 0.97 + Math.random() * 0.06; // 0.97-1.03
    const shimmer = shimmerRef.current;

    // Ignition flash: bright white burst that fades
    if (engine.state === 'igniting' && extendProgress < 0.15) {
      ignitionFlashRef.current = 1.0;
    } else if (ignitionFlashRef.current > 0) {
      ignitionFlashRef.current *= 0.88; // rapid decay
      if (ignitionFlashRef.current < 0.01) ignitionFlashRef.current = 0;
    }

    if (visibleLen <= 0) {
      drawHilt(ctx, null, scale);
      return;
    }

    // ── Compute average blade color + find farthest lit LED ──
    // Read all LEDs — the engine mask already zeroed unlit pixels,
    // so we don't clip to extendProgress (which breaks non-linear
    // retraction types like shatter).
    let avgR = 0, avgG = 0, avgB = 0, activeCount = 0;
    let maxLitT = 0;
    for (let i = 0; i < ledCount; i++) {
      const t = i / (ledCount - 1);
      const r = leds.getR(i) * effectiveBri;
      const g = leds.getG(i) * effectiveBri;
      const b = leds.getB(i) * effectiveBri;
      if (r + g + b > 1) {
        avgR += r; avgG += g; avgB += b; activeCount++;
        maxLitT = t;
      }
    }
    if (activeCount > 0) { avgR /= activeCount; avgG /= activeCount; avgB /= activeCount; }

    // Get glow profile based on average color
    const glow = getGlowProfile(avgR, avgG, avgB);

    // ── Boost saturation before bloom to prevent washout ──
    const [satR, satG, satB] = saturateRGB(avgR, avgG, avgB, 0.25 * glow.colorSaturation);

    // ── Draw LEDs onto offscreen buffer ──
    const offscreen = getOffscreen();
    const offCtx = offscreen.getContext('2d')!;
    offCtx.clearRect(0, 0, cw, ch);

    if (isInHilt) {
      // In-hilt LEDs: single color, brightness falloff from emitter to tip
      for (let i = 0; i < ledCount; i++) {
        const t = i / (ledCount - 1);
        const x = bladeStartPx + t * bladeLenPx;
        const falloff = Math.pow(1 - t, 1.8);
        const r = avgR * falloff * shimmer;
        const g = avgG * falloff * shimmer;
        const b = avgB * falloff * shimmer;
        if (r + g + b < 0.5) continue; // skip unlit LEDs
        offCtx.fillStyle = rgbStr(r, g, b);
        offCtx.fillRect(x, bladeYPx - coreH / 2, segW, coreH);
      }
    } else {
      // Neopixel: per-LED color segments — engine mask already handles visibility
      for (let i = 0; i < ledCount; i++) {
        const t = i / (ledCount - 1);
        const x = bladeStartPx + t * bladeLenPx;
        const r = leds.getR(i) * effectiveBri * shimmer;
        const g = leds.getG(i) * effectiveBri * shimmer;
        const b = leds.getB(i) * effectiveBri * shimmer;
        if (r + g + b < 0.5) continue; // skip unlit LEDs
        offCtx.fillStyle = rgbStr(r, g, b);
        offCtx.fillRect(x, bladeYPx - coreH / 2, segW, coreH);
      }
    }

    // ── Apply diffusion blur to offscreen if needed ──
    if (diffusion.blurKernel > 0) {
      offCtx.save();
      offCtx.filter = `blur(${diffusion.blurKernel * scale}px)`;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cw;
      tempCanvas.height = ch;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(offscreen, 0, 0);
      offCtx.clearRect(0, 0, cw, ch);
      offCtx.drawImage(tempCanvas, 0, 0);
      offCtx.restore();
    }

    // ══════════════════════════════════════════════════
    // ── SMOOTH BLOOM PIPELINE ──
    // Graduated blur passes with exponential alpha
    // falloff for seamless glow without visible steps.
    // ══════════════════════════════════════════════════

    const br = glow.bloomRadius;
    const bi = glow.bloomIntensity;

    // Bloom layers from widest (ambient) to tightest (edge),
    // each with progressively smaller radius and higher alpha.
    const bloomPasses: Array<[number, number]> = [
      [90,  0.025],  // ambient room glow
      [70,  0.04],   // outer atmospheric haze
      [52,  0.06],   // wide corona
      [38,  0.09],   // mid corona
      [26,  0.13],   // color corona
      [18,  0.18],   // inner glow
      [12,  0.24],   // tight glow
      [7,   0.32],   // near-blade softness
      [3.5, 0.42],   // blade edge blend
    ];

    for (const [radius, alpha] of bloomPasses) {
      ctx.save();
      ctx.filter = `blur(${radius * scale * br}px)`;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * bi * shimmer;
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    }

    // Pass 5.5: Bridge glow — soft additive layer to fill gap between bloom and blade body
    ctx.save();
    ctx.filter = `blur(${1.5 * scale * br}px)`;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * bi * shimmer;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();

    // Pass 6: Blade body (the solid LED segments with vertical gradient for depth)
    for (let i = 0; i < ledCount; i++) {
      const t = i / (ledCount - 1);
      const x = bladeStartPx + t * bladeLenPx;

      let r: number, g: number, b: number;
      if (isInHilt) {
        const falloff = Math.pow(1 - t, 1.8);
        r = avgR * falloff * shimmer;
        g = avgG * falloff * shimmer;
        b = avgB * falloff * shimmer;
      } else {
        r = leds.getR(i) * effectiveBri * shimmer;
        g = leds.getG(i) * effectiveBri * shimmer;
        b = leds.getB(i) * effectiveBri * shimmer;
      }
      if (r + g + b < 0.5) continue; // skip unlit LEDs

      const grad = ctx.createLinearGradient(x, bladeYPx - coreH / 2, x, bladeYPx + coreH / 2);
      // Softer edge dimming — avoids dark band between bloom and blade body
      const edgeDim = 0.72;
      // Center: slightly boosted
      const centerBoost = 1.15;
      const rW = clamp(r * centerBoost + 40, 0, 255);
      const gW = clamp(g * centerBoost + 40, 0, 255);
      const bW = clamp(b * centerBoost + 40, 0, 255);

      grad.addColorStop(0, rgbStr(r * edgeDim, g * edgeDim, b * edgeDim));
      grad.addColorStop(0.15, rgbStr(r * 0.88, g * 0.88, b * 0.88));
      grad.addColorStop(0.35, rgbStr(r, g, b));
      grad.addColorStop(0.5, rgbStr(rW, gW, bW));
      grad.addColorStop(0.65, rgbStr(r, g, b));
      grad.addColorStop(0.85, rgbStr(r * 0.88, g * 0.88, b * 0.88));
      grad.addColorStop(1, rgbStr(r * edgeDim, g * edgeDim, b * edgeDim));

      ctx.fillStyle = grad;
      ctx.fillRect(x, bladeYPx - coreH / 2, segW, coreH);

      // LED hotspot dots (visible on trans-white / light diffusion)
      if (diffusion.hotspotVisibility > 0 && !isInHilt) {
        const hotR = clamp(r * 1.3, 0, 255);
        const hotG = clamp(g * 1.3, 0, 255);
        const hotB = clamp(b * 1.3, 0, 255);
        ctx.fillStyle = rgbStr(hotR, hotG, hotB, diffusion.hotspotVisibility * 0.6);
        const dotRadius = 1.2 * scale;
        ctx.beginPath();
        ctx.arc(x + segW / 2, bladeYPx, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pass 7: Core whiteout (HDR overexposed center — fills middle of blade body)
    const whiteH = coreH * 0.45; // wider hot core reduces dark banding
    const coreWhiteout = glow.coreWhiteout;
    for (let i = 0; i < ledCount; i++) {
      const t = i / (ledCount - 1);
      const x = bladeStartPx + t * bladeLenPx;

      let r: number, g: number, b: number;
      if (isInHilt) {
        const falloff = Math.pow(1 - t, 1.8);
        r = avgR * falloff; g = avgG * falloff; b = avgB * falloff;
      } else {
        r = leds.getR(i) * effectiveBri;
        g = leds.getG(i) * effectiveBri;
        b = leds.getB(i) * effectiveBri;
      }
      if (r + g + b < 0.5) continue; // skip unlit LEDs

      // Blow out to near-white: real sabers are blinding at the core
      const wr = lerpToWhite(r, coreWhiteout);
      const wg = lerpToWhite(g, coreWhiteout);
      const wb = lerpToWhite(b, coreWhiteout);
      ctx.fillStyle = rgbStr(wr, wg, wb, 0.90 * shimmer);
      ctx.fillRect(x, bladeYPx - whiteH / 2, segW, whiteH);
    }

    // Compute actual visible end from LED data (matches engine mask,
    // not the linear extendProgress which diverges for shatter/fadeout).
    const actualVisibleEnd = bladeStartPx + maxLitT * bladeLenPx;
    const actualVisibleLen = maxLitT * bladeLenPx;

    // Pass 8: Specular highlight line (thin white line down center)
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * shimmer})`;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(bladeStartPx, bladeYPx);
    ctx.lineTo(actualVisibleEnd, bladeYPx);
    ctx.stroke();
    ctx.restore();

    // ── Blade tip corona ──
    if (actualVisibleLen > 1) {
      const tipIdx = Math.min(Math.floor(maxLitT * (ledCount - 1)), ledCount - 1);
      let tipR: number, tipG: number, tipB: number;
      if (isInHilt) {
        const falloff = Math.pow(1 - maxLitT, 1.8);
        tipR = avgR * falloff; tipG = avgG * falloff; tipB = avgB * falloff;
      } else {
        tipR = leds.getR(tipIdx) * effectiveBri;
        tipG = leds.getG(tipIdx) * effectiveBri;
        tipB = leds.getB(tipIdx) * effectiveBri;
      }

      // Colored tip cap
      ctx.fillStyle = rgbStr(tipR, tipG, tipB);
      ctx.beginPath();
      ctx.arc(actualVisibleEnd, bladeYPx, coreH / 2, -Math.PI / 2, Math.PI / 2);
      ctx.fill();

      // White-hot tip center
      const wr = lerpToWhite(tipR, coreWhiteout);
      const wg = lerpToWhite(tipG, coreWhiteout);
      const wb = lerpToWhite(tipB, coreWhiteout);
      ctx.fillStyle = rgbStr(wr, wg, wb, 0.90);
      ctx.beginPath();
      ctx.arc(actualVisibleEnd, bladeYPx, whiteH / 2, -Math.PI / 2, Math.PI / 2);
      ctx.fill();

      // Tip corona glow (larger, softer)
      const tipGlowR = (maxLitT < 1 ? 65 : 40) * scale * glow.bloomRadius;
      const tipGlowA = (maxLitT < 1 ? 0.6 : 0.25) * glow.bloomIntensity;
      const tipGrad = ctx.createRadialGradient(actualVisibleEnd, bladeYPx, 0, actualVisibleEnd, bladeYPx, tipGlowR);
      tipGrad.addColorStop(0, rgbStr(lerpToWhite(tipR, 0.5), lerpToWhite(tipG, 0.5), lerpToWhite(tipB, 0.5), tipGlowA));
      tipGrad.addColorStop(0.3, rgbStr(tipR, tipG, tipB, tipGlowA * 0.6));
      tipGrad.addColorStop(1, rgbStr(tipR, tipG, tipB, 0));
      ctx.fillStyle = tipGrad;
      ctx.beginPath();
      ctx.arc(actualVisibleEnd, bladeYPx, tipGlowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Ignition flash burst ──
    if (ignitionFlashRef.current > 0.01) {
      const flashAlpha = ignitionFlashRef.current * 0.7;
      const flashR = 60 * scale * glow.bloomRadius;
      const flashGrad = ctx.createRadialGradient(bladeStartPx, bladeYPx, 0, bladeStartPx, bladeYPx, flashR);
      flashGrad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
      flashGrad.addColorStop(0.3, rgbStr(satR, satG, satB, flashAlpha * 0.5));
      flashGrad.addColorStop(1, rgbStr(satR, satG, satB, 0));
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(bladeStartPx, bladeYPx, flashR, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Enhanced floor wash (wider, more saturated) ──
    if (activeCount > 0) {
      const washAlpha = 0.08 * glow.bloomIntensity;
      const floorGrad = ctx.createLinearGradient(0, bladeYPx + coreH / 2, 0, ch);
      floorGrad.addColorStop(0, rgbStr(satR, satG, satB, washAlpha));
      floorGrad.addColorStop(0.3, rgbStr(satR, satG, satB, washAlpha * 0.5));
      floorGrad.addColorStop(0.7, rgbStr(satR, satG, satB, washAlpha * 0.15));
      floorGrad.addColorStop(1, rgbStr(satR, satG, satB, 0));
      ctx.fillStyle = floorGrad;
      ctx.fillRect(bladeStartPx - 60 * scale, bladeYPx + coreH / 2, actualVisibleLen + 120 * scale, ch - bladeYPx);

      // Ceiling wash (subtle upward light spill)
      const ceilGrad = ctx.createLinearGradient(0, bladeYPx - coreH / 2, 0, 0);
      ceilGrad.addColorStop(0, rgbStr(satR, satG, satB, washAlpha * 0.5));
      ceilGrad.addColorStop(0.5, rgbStr(satR, satG, satB, washAlpha * 0.1));
      ceilGrad.addColorStop(1, rgbStr(satR, satG, satB, 0));
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(bladeStartPx - 60 * scale, 0, actualVisibleLen + 120 * scale, bladeYPx - coreH / 2);
    }

    // ── Background ambient tint (blade color bleeds into dark background) ──
    if (activeCount > 0) {
      const ambientAlpha = 0.015 * glow.bloomIntensity;
      ctx.fillStyle = rgbStr(satR, satG, satB, ambientAlpha);
      ctx.fillRect(0, 0, cw, ch);
    }

    // ── Draw hilt with blade illumination ──
    const bladeColor = activeCount > 0 ? { r: satR, g: satG, b: satB } : null;
    drawHilt(ctx, bladeColor, scale);

    // ── Hilt illumination: blade light washes over the metal ──
    if (bladeColor) {
      const hiltEndX = bladeStartPx;
      const hiltWash = ctx.createLinearGradient(hiltEndX, 0, hiltEndX - 200 * scale, 0);
      hiltWash.addColorStop(0, rgbStr(satR, satG, satB, 0.12 * glow.bloomIntensity));
      hiltWash.addColorStop(0.3, rgbStr(satR, satG, satB, 0.05));
      hiltWash.addColorStop(1, rgbStr(satR, satG, satB, 0));
      ctx.fillStyle = hiltWash;
      ctx.fillRect(hiltEndX - 200 * scale, bladeYPx - 30 * scale, 200 * scale, 60 * scale);
    }
  }, [brightness, drawHilt, getOffscreen, getScale, stripType, diffusionType, bladeDiameter, bladeLength, panX, theme]);

  // ─── Pixel Visualizer Mode ───
  // Shows individual LED pixels as distinct segments for debugging/tuning

  const drawBladePixelView = useCallback((ctx: CanvasRenderingContext2D, engine: BladeEngine) => {
    const scale = getScale();
    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;
    const bri = brightness / 100;
    const leds = engine.leds;
    const ledCount = leds.count;
    const currentStrip = STRIP_TYPES.find(s => s.id === stripType) ?? STRIP_TYPES[0];
    const isInHilt = currentStrip.ledsPerInch === 0;

    // Background (uses theme)
    ctx.fillStyle = theme.bgColor;
    ctx.fillRect(0, 0, cw, ch);

    // Blade position (scale-accurate: shorter blades = shorter visual)
    const bladeStartPx = (BLADE_START + panX) * scale;
    const scaledBladeLenDS = BLADE_LEN * (bladeLength / MAX_BLADE_INCHES);
    const bladeLenPx = scaledBladeLenDS * scale;
    const bladeYPx = layoutRef.current.bladeY * scale;
    const bladeH = BLADE_CORE_H * scale;
    const pixelGap = 1 * scale; // gap between LED pixels

    // Draw hilt (simplified)
    drawHilt(ctx, null, scale);

    // Draw blade tube outline
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bladeStartPx, bladeYPx - bladeH, bladeLenPx, bladeH * 2);

    if (isInHilt) {
      // In-hilt LEDs: single color fill with brightness falloff
      const baseR = leds.getR(0) * bri;
      const baseG = leds.getG(0) * bri;
      const baseB = leds.getB(0) * bri;

      for (let i = 0; i < 100; i++) {
        const t = i / 100;
        const x = bladeStartPx + t * bladeLenPx;
        const falloff = Math.exp(-t * 2.5); // exponential decay
        const r = baseR * falloff;
        const g = baseG * falloff;
        const b = baseB * falloff;
        const segW = bladeLenPx / 100;
        ctx.fillStyle = rgbStr(r, g, b);
        ctx.fillRect(x, bladeYPx - bladeH, segW, bladeH * 2);
      }

      // Label
      ctx.fillStyle = '#666';
      ctx.font = `${10 * scale}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`In-Hilt (${currentStrip.label}) - No per-pixel control`, bladeStartPx + bladeLenPx / 2, bladeYPx + bladeH + 20 * scale);
    } else {
      // Neopixel: draw each LED as a distinct pixel
      const pixelW = (bladeLenPx - (ledCount - 1) * pixelGap) / ledCount;

      for (let i = 0; i < ledCount; i++) {
        const r = leds.getR(i) * bri;
        const g = leds.getG(i) * bri;
        const b = leds.getB(i) * bri;
        const x = bladeStartPx + i * (pixelW + pixelGap);

        // LED pixel fill
        ctx.fillStyle = rgbStr(r, g, b);
        ctx.fillRect(x, bladeYPx - bladeH, pixelW, bladeH * 2);

        // Tiny glow per pixel
        const totalBri = r + g + b;
        if (totalBri > 30) {
          ctx.shadowColor = rgbStr(r, g, b);
          ctx.shadowBlur = 3 * scale;
          ctx.fillRect(x, bladeYPx - bladeH, pixelW, bladeH * 2);
          ctx.shadowBlur = 0;
        }
      }

      // LED index markers every 12 pixels
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `${8 * scale}px monospace`;
      ctx.textAlign = 'center';
      for (let i = 0; i < ledCount; i += 12) {
        const x = bladeStartPx + i * (pixelW + pixelGap) + pixelW / 2;
        ctx.fillText(String(i), x, bladeYPx + bladeH + 14 * scale);
        // Tick mark
        ctx.fillRect(x - 0.5, bladeYPx + bladeH + 1 * scale, 1, 3 * scale);
      }
    }

    // Strip count indicator
    if (!isInHilt && currentStrip.stripCount > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = `${9 * scale}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`x${currentStrip.stripCount} strips`, bladeStartPx, bladeYPx - bladeH - 6 * scale);
    }

    // RGB channel readout at bottom
    const readoutY = bladeYPx + bladeH + 30 * scale;
    const readoutH = 60 * scale;
    const margin = bladeStartPx;
    const readoutW = bladeLenPx;

    if (!isInHilt) {
      // Mini RGB channel bars
      const barH = readoutH / 3;
      const channelDefs = [
        { getter: (i: number) => leds.getR(i), color: 'rgba(255,60,60,0.8)', label: 'R' },
        { getter: (i: number) => leds.getG(i), color: 'rgba(60,255,60,0.8)', label: 'G' },
        { getter: (i: number) => leds.getB(i), color: 'rgba(60,60,255,0.8)', label: 'B' },
      ];

      channelDefs.forEach((ch, ci) => {
        const y = readoutY + ci * barH;
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(margin, y, readoutW, barH - 1);

        for (let i = 0; i < ledCount; i++) {
          const val = ch.getter(i) * bri;
          const x = margin + (i / ledCount) * readoutW;
          const cellW = readoutW / ledCount;
          const intensity = val / 255;
          ctx.fillStyle = ch.color;
          ctx.globalAlpha = intensity;
          ctx.fillRect(x, y, Math.max(cellW, 1), barH - 1);
        }
        ctx.globalAlpha = 1;

        // Channel label
        ctx.fillStyle = ch.color;
        ctx.font = `${8 * scale}px monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(ch.label, margin - 4 * scale, y + barH / 2 + 3 * scale);
      });
    }
  }, [brightness, drawHilt, getScale, stripType, bladeLength, panX]);

  // ─── View modes ───

  const drawBladeView = useCallback((ctx: CanvasRenderingContext2D, engine: BladeEngine) => {
    const drawBlade = renderMode === 'pixel' ? drawBladePixelView : drawBladePhotorealistic;
    const topoId = topology.presetId;

    if (topoId === 'staff') {
      // Staff: hilt in center, blade 1 extending right, blade 2 extending left (mirrored)
      const scale = getScale();
      const { w, dpr } = sizeRef.current;
      const cw = w * dpr;

      // Draw blade 1 (normal — extending right from hilt)
      ctx.save();
      // Shift everything left so hilt appears centered
      const hiltCenterX = BLADE_START * scale * 0.5;
      ctx.translate(-hiltCenterX, 0);
      drawBlade(ctx, engine);
      ctx.restore();

      // Draw blade 2 (mirrored — extending left from hilt)
      ctx.save();
      ctx.translate(cw + hiltCenterX, 0);
      ctx.scale(-1, 1);
      drawBlade(ctx, engine);
      ctx.restore();
    } else if (topoId === 'crossguard') {
      // Crossguard: main blade + two short perpendicular quillon blades at emitter
      drawBlade(ctx, engine);

      const scale = getScale();
      const emitterX = (BLADE_START + panX) * scale;
      const bladeY = layoutRef.current.bladeY * scale;
      const quillonLen = 60 * scale; // short quillon blades
      const quillonH = 6 * scale;

      // Get average blade color for quillon glow
      const leds = engine.leds;
      const bri = brightness / 100;
      let avgR = 0, avgG = 0, avgB = 0, count = 0;
      for (let i = 0; i < Math.min(6, leds.count); i++) {
        avgR += leds.getR(i); avgG += leds.getG(i); avgB += leds.getB(i); count++;
      }
      if (count > 0) { avgR = (avgR / count) * bri; avgG = (avgG / count) * bri; avgB = (avgB / count) * bri; }

      if (engine.extendProgress > 0) {
        const qProgress = Math.min(1, Math.max(0, (engine.extendProgress - 0.1) / 0.3));
        if (qProgress > 0) {
          // Quillon glow (bloom)
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.filter = `blur(${12 * scale}px)`;
          ctx.globalAlpha = 0.3 * qProgress;
          ctx.fillStyle = `rgb(${Math.round(avgR)},${Math.round(avgG)},${Math.round(avgB)})`;
          // Upper quillon
          ctx.fillRect(emitterX - quillonH / 2, bladeY - quillonLen * qProgress, quillonH, quillonLen * qProgress);
          // Lower quillon
          ctx.fillRect(emitterX - quillonH / 2, bladeY, quillonH, quillonLen * qProgress);
          ctx.restore();

          // Quillon core
          ctx.fillStyle = `rgba(${Math.round(Math.min(255, avgR * 1.5))},${Math.round(Math.min(255, avgG * 1.5))},${Math.round(Math.min(255, avgB * 1.5))},${0.9 * qProgress})`;
          ctx.fillRect(emitterX - quillonH / 4, bladeY - quillonLen * qProgress, quillonH / 2, quillonLen * qProgress);
          ctx.fillRect(emitterX - quillonH / 4, bladeY, quillonH / 2, quillonLen * qProgress);

          // White-hot center
          ctx.fillStyle = `rgba(255,255,255,${0.6 * qProgress})`;
          ctx.fillRect(emitterX - 1 * scale, bladeY - quillonLen * qProgress, 2 * scale, quillonLen * qProgress);
          ctx.fillRect(emitterX - 1 * scale, bladeY, 2 * scale, quillonLen * qProgress);
        }
      }
    } else {
      // Single blade or other topologies — default rendering
      drawBlade(ctx, engine);
    }
  }, [drawBladePhotorealistic, drawBladePixelView, renderMode, topology, brightness, getScale, panX]);

  const drawAngleView = useCallback((ctx: CanvasRenderingContext2D, engine: BladeEngine) => {
    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.transform(1, 0.15, 0, 0.7, 0, 0);
    ctx.translate(-cw / 2, -ch / 2);
    if (renderMode === 'pixel') {
      drawBladePixelView(ctx, engine);
    } else {
      drawBladePhotorealistic(ctx, engine);
    }
    ctx.restore();
  }, [drawBladePhotorealistic, drawBladePixelView, renderMode]);

  const drawStripView = useCallback((ctx: CanvasRenderingContext2D, engine: BladeEngine) => {
    const scale = getScale();
    const { w, dpr } = sizeRef.current;
    const cw = w * dpr;
    const leds = engine.leds;
    const ledCount = leds.count;
    const bri = brightness / 100;
    const stripY = 200 * scale;
    const stripH = 30 * scale;
    const margin = 40 * scale;
    const stripW = cw - margin * 2;
    const cellW = stripW / ledCount;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(margin - 2, stripY - 2, stripW + 4, stripH + 4);

    for (let i = 0; i < ledCount; i++) {
      const r = leds.getR(i) * bri;
      const g = leds.getG(i) * bri;
      const b = leds.getB(i) * bri;
      const x = margin + i * cellW;
      ctx.fillStyle = rgbStr(r, g, b);
      ctx.fillRect(x, stripY, Math.max(cellW - 0.5, 1), stripH);
    }

    ctx.fillStyle = '#666';
    ctx.font = `${10 * scale}px monospace`;
    ctx.textAlign = 'center';
    for (let i = 0; i < ledCount; i += 12) {
      const x = margin + i * cellW + cellW / 2;
      ctx.fillText(String(i), x, stripY + stripH + 14 * scale);
    }

    const graphY = stripY + stripH + 40 * scale;
    const graphH = 200 * scale;

    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(margin, graphY, stripW, graphH);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = graphY + (graphH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(margin + stripW, y);
      ctx.stroke();
    }

    const channels: Array<{ getter: (i: number) => number; color: string }> = [
      { getter: (i) => leds.getR(i), color: '#ff4444' },
      { getter: (i) => leds.getG(i), color: '#44ff44' },
      { getter: (i) => leds.getB(i), color: '#4444ff' },
    ];

    for (const ch of channels) {
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      for (let i = 0; i < ledCount; i++) {
        const x = margin + i * cellW;
        const val = ch.getter(i) * bri;
        const y = graphY + graphH - (val / 255) * graphH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#666';
    ctx.font = `${10 * scale}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText('255', margin - 4, graphY + 10 * scale);
    ctx.fillText('128', margin - 4, graphY + graphH / 2 + 4 * scale);
    ctx.fillText('0', margin - 4, graphY + graphH);
  }, [brightness, getScale]);

  const drawCrossSection = useCallback((ctx: CanvasRenderingContext2D, engine: BladeEngine) => {
    const scale = getScale();
    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;
    const leds = engine.leds;
    const ledCount = leds.count;
    const bri = brightness / 100;
    const centerX = cw / 2;
    const centerY = ch / 2;

    let avgR = 0, avgG = 0, avgB = 0, activeCount = 0;
    for (let i = 0; i < ledCount; i++) {
      const r = leds.getR(i);
      const g = leds.getG(i);
      const b = leds.getB(i);
      if (r + g + b > 0) { avgR += r; avgG += g; avgB += b; activeCount++; }
    }
    if (activeCount > 0) { avgR = (avgR / activeCount) * bri; avgG = (avgG / activeCount) * bri; avgB = (avgB / activeCount) * bri; }

    // Get strip info for cross-section rendering
    const currentStrip = STRIP_TYPES.find(s => s.id === stripType) ?? STRIP_TYPES[0];
    const numStrips = currentStrip.stripCount;

    const offscreen = getOffscreen();
    const offCtx = offscreen.getContext('2d')!;
    offCtx.clearRect(0, 0, cw, ch);

    const coreRadius = 20 * scale;

    // Draw LED strip positions in cross-section
    if (numStrips > 1) {
      const stripRadius = coreRadius * 0.6;
      for (let s = 0; s < numStrips; s++) {
        const angle = (s / numStrips) * Math.PI * 2 - Math.PI / 2;
        const sx = centerX + Math.cos(angle) * stripRadius;
        const sy = centerY + Math.sin(angle) * stripRadius;
        offCtx.fillStyle = rgbStr(avgR, avgG, avgB);
        offCtx.beginPath();
        offCtx.arc(sx, sy, 3 * scale, 0, Math.PI * 2);
        offCtx.fill();
      }
    } else {
      offCtx.fillStyle = rgbStr(avgR, avgG, avgB);
      offCtx.beginPath();
      offCtx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      offCtx.fill();
    }

    // Bloom passes
    ctx.save(); ctx.filter = `blur(${50 * scale}px)`; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.1; ctx.drawImage(offscreen, 0, 0); ctx.restore();
    ctx.save(); ctx.filter = `blur(${25 * scale}px)`; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.15; ctx.drawImage(offscreen, 0, 0); ctx.restore();
    ctx.save(); ctx.filter = `blur(${10 * scale}px)`; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3; ctx.drawImage(offscreen, 0, 0); ctx.restore();

    // Diffusion rings
    const rings = [
      { radius: 80 * scale, alpha: 0.04 },
      { radius: 60 * scale, alpha: 0.06 },
      { radius: 45 * scale, alpha: 0.1 },
      { radius: 32 * scale, alpha: 0.15 },
      { radius: 24 * scale, alpha: 0.25 },
    ];

    for (const ring of rings) {
      const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, ring.radius);
      grad.addColorStop(0, rgbStr(avgR, avgG, avgB, ring.alpha));
      grad.addColorStop(0.7, rgbStr(avgR, avgG, avgB, ring.alpha * 0.5));
      grad.addColorStop(1, rgbStr(avgR, avgG, avgB, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core
    const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
    const coreWR = lerpToWhite(avgR, 0.6);
    const coreWG = lerpToWhite(avgG, 0.6);
    const coreWB = lerpToWhite(avgB, 0.6);
    coreGrad.addColorStop(0, rgbStr(coreWR, coreWG, coreWB, 0.95));
    coreGrad.addColorStop(0.5, rgbStr(avgR, avgG, avgB, 0.9));
    coreGrad.addColorStop(1, rgbStr(avgR * 0.7, avgG * 0.7, avgB * 0.7, 0.5));
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // White center
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Tube outline
    ctx.strokeStyle = rgbStr(avgR * 0.5, avgG * 0.5, avgB * 0.5, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // Strip position markers in cross-section (when multi-strip)
    if (numStrips > 1) {
      const markerRadius = coreRadius + 8 * scale;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = `${9 * scale}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let s = 0; s < numStrips; s++) {
        const angle = (s / numStrips) * Math.PI * 2 - Math.PI / 2;
        const mx = centerX + Math.cos(angle) * markerRadius;
        const my = centerY + Math.sin(angle) * markerRadius;
        ctx.fillText(`S${s + 1}`, mx, my);
      }
    }

    // Crossguard quillon cross-sections at 90° offsets
    if (topology.presetId === 'crossguard' && engine.extendProgress > 0) {
      const quillonRadius = 8 * scale;
      const quillonOffset = coreRadius + 40 * scale;
      const quillonPositions = [
        { x: centerX, y: centerY - quillonOffset }, // top
        { x: centerX, y: centerY + quillonOffset }, // bottom
      ];
      for (const pos of quillonPositions) {
        // Quillon glow
        const qGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, quillonRadius * 3);
        qGrad.addColorStop(0, rgbStr(avgR, avgG, avgB, 0.2));
        qGrad.addColorStop(1, rgbStr(avgR, avgG, avgB, 0));
        ctx.fillStyle = qGrad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, quillonRadius * 3, 0, Math.PI * 2);
        ctx.fill();
        // Quillon core
        const qCoreGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, quillonRadius);
        qCoreGrad.addColorStop(0, rgbStr(lerpToWhite(avgR, 0.5), lerpToWhite(avgG, 0.5), lerpToWhite(avgB, 0.5), 0.9));
        qCoreGrad.addColorStop(1, rgbStr(avgR * 0.6, avgG * 0.6, avgB * 0.6, 0.4));
        ctx.fillStyle = qCoreGrad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, quillonRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Label
    ctx.fillStyle = '#555';
    ctx.font = `${11 * scale}px monospace`;
    ctx.textAlign = 'center';
    const topoLabel = topology.presetId !== 'single' ? `  |  ${topology.presetId}` : '';
    ctx.fillText(
      `AVG: R${avgR | 0} G${avgG | 0} B${avgB | 0}  |  ${currentStrip.label} (${numStrips} strip${numStrips > 1 ? 's' : ''})${topoLabel}`,
      centerX,
      ch - 40 * scale,
    );
  }, [brightness, getOffscreen, getScale, stripType, topology]);

  // ─── View mode label ───
  const drawViewLabel = useCallback((ctx: CanvasRenderingContext2D, mode: string) => {
    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;
    const scale = getScale();
    const label = VIEW_MODE_LABELS[mode] ?? mode;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = `${10 * scale}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(label, cw - 12 * scale, ch - 10 * scale);
  }, [getScale]);

  // ─── Inline Pixel Strip (always visible, docked to bottom area) ───
  const drawInlineStrip = useCallback((ctx: CanvasRenderingContext2D, engine: BladeEngine) => {
    const pixels = engine.getPixels();
    const bufferLeds = Math.floor(pixels.length / 3);
    const ledCount = Math.min(config.ledCount, bufferLeds);
    if (ledCount <= 0) return;

    const scale = getScale(); // zoomed scale — strip moves with blade
    const bri = brightness / 100;

    // Design-space coordinates, scaled uniformly with blade
    const stripTop = layoutRef.current.stripY * scale;
    const stripH = 16 * scale;
    const graphLeft = (BLADE_START + panX) * scale;
    const scaledBladeLenDS = BLADE_LEN * (bladeLength / MAX_BLADE_INCHES);
    const stripW = scaledBladeLenDS * scale;
    const cellW = stripW / ledCount;

    // Strip background — themed raised panel
    const bgX = graphLeft - 3 * scale;
    const bgY = stripTop - 2 * scale;
    const bgW = stripW + 6 * scale;
    const bgH = stripH + 4 * scale;
    ctx.fillStyle = theme.stripBg;
    ctx.fillRect(bgX, bgY, bgW, bgH);
    ctx.strokeStyle = theme.stripBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bgX, bgY, bgW, bgH);

    // Draw individual LED pixels
    for (let i = 0; i < ledCount; i++) {
      const r = (pixels[i * 3] ?? 0) * bri;
      const g = (pixels[i * 3 + 1] ?? 0) * bri;
      const b = (pixels[i * 3 + 2] ?? 0) * bri;
      const x = graphLeft + i * cellW;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x, stripTop, Math.max(cellW - 0.3, 0.5), stripH);
    }

    // "PIXEL" label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `${7 * scale}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('PIXEL', graphLeft + 2 * scale, stripTop - 4 * scale);

    // LED index labels every 24
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    for (let i = 0; i < ledCount; i += 24) {
      const x = graphLeft + i * cellW + cellW / 2;
      ctx.fillText(String(i), x, stripTop + stripH + 8 * scale);
    }

    // Divider line between pixel strip and RGB graph
    const dividerY = stripTop + stripH + 16 * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bgX, dividerY);
    ctx.lineTo(bgX + bgW, dividerY);
    ctx.stroke();
  }, [config.ledCount, getScale, brightness, bladeLength, panX, theme]);

  // ─── RGB Line Graph (docked to bottom, unaffected by zoom) ───
  const drawRGBGraph = useCallback((ctx: CanvasRenderingContext2D, engine: BladeEngine) => {
    const pixels = engine.getPixels();
    const bufferLeds = Math.floor(pixels.length / 3);
    const ledCount = Math.min(config.ledCount, bufferLeds);
    if (ledCount <= 0) return;

    const { dpr } = sizeRef.current;
    const scale = getScale(); // zoomed scale — graph moves with blade

    // Design-space coordinates, scaled uniformly with blade
    const graphTop = layoutRef.current.graphTopY * scale;
    const graphBottom = layoutRef.current.graphBotY * scale;
    const graphH = graphBottom - graphTop;
    const graphLeft = (BLADE_START + panX) * scale;
    const scaledBladeLenDS = BLADE_LEN * (bladeLength / MAX_BLADE_INCHES);
    const graphW = scaledBladeLenDS * scale;

    // Background — themed raised panel (extra left margin for Y-axis labels)
    const labelMargin = 22 * scale;
    const gBgX = graphLeft - labelMargin;
    const gBgY = graphTop - 4 * scale;
    const gBgW = graphW + labelMargin + 4 * scale;
    const gBgH = graphH + 8 * scale;
    ctx.fillStyle = theme.graphBg;
    ctx.fillRect(gBgX, gBgY, gBgW, gBgH);
    ctx.strokeStyle = theme.graphBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gBgX, gBgY, gBgW, gBgH);

    // Grid lines at 0, 64, 128, 192, 255 with value labels
    ctx.lineWidth = 0.5 * dpr;
    ctx.font = `${7 * scale}px monospace`;
    ctx.textAlign = 'right';
    for (const val of [0, 64, 128, 192, 255]) {
      const gy = graphBottom - (val / 255) * graphH;
      if (val > 0 && val < 255) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(graphLeft, gy);
        ctx.lineTo(graphLeft + graphW, gy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillText(String(val), graphLeft - 4 * scale, gy + 3 * scale);
    }

    // Draw R, G, B lines
    const channels = [
      { offset: 0, color: 'rgba(255, 60, 60, 0.95)' },
      { offset: 1, color: 'rgba(60, 255, 60, 0.95)' },
      { offset: 2, color: 'rgba(80, 130, 255, 0.95)' },
    ];

    ctx.lineWidth = 2 * dpr;
    for (const ch of channels) {
      ctx.strokeStyle = ch.color;
      ctx.beginPath();
      for (let i = 0; i < ledCount; i++) {
        const x = graphLeft + (i / (ledCount - 1)) * graphW;
        const val = pixels[i * 3 + ch.offset] ?? 0;
        const y = graphBottom - (val / 255) * graphH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `${8 * scale}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('RGB', graphLeft + 2 * scale, graphTop + 10 * scale);
  }, [config.ledCount, getScale, bladeLength, panX, theme]);

  // ─── Main render loop (throttled to 2fps when reduced motion is on) ───
  useAnimationFrame((deltaMs) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;

    engine.update(deltaMs, config);

    // FPS tracking
    const now = performance.now();
    fpsFrames.current.push(now);
    while (fpsFrames.current.length > 0 && fpsFrames.current[0]! < now - 1000) {
      fpsFrames.current.shift();
    }
    useBladeStore.getState().setFps(fpsFrames.current.length);
    useBladeStore.getState().setBladeState(engine.state);

    ctx.clearRect(0, 0, cw, ch);

    // Vertical mode: rotate 90° CCW so blade points upward, centered
    if (vertical && viewMode === 'blade') {
      // Fill entire actual canvas with background first (before rotation)
      ctx.fillStyle = theme.bgColor;
      ctx.fillRect(0, 0, cw, ch);

      ctx.save();

      // After rotation, effective drawing area is ch × cw (swapped)
      const rotatedW = ch; // device px
      const rotatedH = cw; // device px
      const scale = Math.min(rotatedW / DESIGN_W, rotatedH / layoutRef.current.designH);
      const renderedH = layoutRef.current.designH * scale;
      const centerOffsetY = (rotatedH - renderedH) / 2;

      ctx.translate(0, ch);
      ctx.rotate(-Math.PI / 2);
      // Center the design vertically (blade left-right on screen)
      ctx.translate(0, centerOffsetY);

      const curDpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: Math.floor(rotatedW / curDpr), h: Math.floor(rotatedH / curDpr), dpr: curDpr };
    }

    drawBackground(ctx);

    switch (viewMode) {
      case 'blade': drawBladeView(ctx, engine); break;
      case 'angle': drawAngleView(ctx, engine); break;
      case 'strip': drawStripView(ctx, engine); break;
      case 'cross': drawCrossSection(ctx, engine); break;
    }

    // Vignette drawn BEFORE data readouts so it doesn't dim them
    drawVignette(ctx);

    // Draw pixel strip + RGB graph in blade view when analyze mode is on
    if (viewMode === 'blade' && !mobileFullscreen && analyzeMode) {
      drawInlineStrip(ctx, engine);
      drawRGBGraph(ctx, engine);
    }

    drawViewLabel(ctx, viewMode);

    if (vertical && viewMode === 'blade') {
      ctx.restore();
      // Restore actual canvas dimensions
      const deviceDpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: Math.floor(canvas.width / deviceDpr), h: Math.floor(canvas.height / deviceDpr), dpr: deviceDpr };
    }
  }, { maxFps: reducedMotion ? 2 : undefined });

  // ─── Blade length change handler ───
  const handleBladeLengthChange = useCallback((inches: number) => {
    setBladeLength(inches);
    const preset = BLADE_LENGTHS.find(b => b.inches === inches);
    if (preset) {
      updateConfig({ ledCount: preset.ledCount });
    }
  }, [updateConfig]);

  // ─── Topology change handler ───
  const handleTopologyChange = useCallback((topoId: string) => {
    const topo = TOPOLOGY_PRESETS[topoId];
    if (topo) {
      setTopology(topo);
      // Update LED count to match topology
      updateConfig({ ledCount: topo.totalLEDs });
    }
  }, [setTopology, updateConfig]);

  // ─── Config bar content (reusable for both layouts) ───
  const configBar = (
    <div className="flex flex-wrap items-center gap-2 desktop:gap-3 px-2 py-1.5 bg-bg-secondary/50 rounded-md border border-border-subtle text-ui-sm shrink-0">
      {/* Topology */}
      <label className="flex items-center gap-1">
        <span className="text-text-muted">Type</span>
        <select
          value={topology.presetId}
          onChange={(e) => handleTopologyChange(e.target.value)}
          className="touch-target bg-bg-deep border border-border-subtle rounded px-1.5 py-0.5 text-text-secondary text-ui-sm focus:outline-none focus:border-accent"
        >
          {TOPOLOGY_OPTIONS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </label>

      {/* Hilt Style */}
      <label className="flex items-center gap-1">
        <span className="text-text-muted">Hilt</span>
        <select
          value={hiltStyle}
          onChange={(e) => setHiltStyle(e.target.value)}
          className="touch-target bg-bg-deep border border-border-subtle rounded px-1.5 py-0.5 text-text-secondary text-ui-sm focus:outline-none focus:border-accent"
        >
          {HILT_STYLES.map((h) => (
            <option key={h.id} value={h.id}>{h.label}</option>
          ))}
        </select>
      </label>

      {/* Strip Type */}
      <label className="flex items-center gap-1">
        <span className="text-text-muted">Strip</span>
        <select
          value={stripType}
          onChange={(e) => setStripType(e.target.value)}
          className="touch-target bg-bg-deep border border-border-subtle rounded px-1.5 py-0.5 text-text-secondary text-ui-sm focus:outline-none focus:border-accent"
        >
          {STRIP_TYPES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      {/* Blade Length */}
      <label className="flex items-center gap-1">
        <span className="text-text-muted">Blade</span>
        <select
          value={bladeLength}
          onChange={(e) => handleBladeLengthChange(Number(e.target.value))}
          className="touch-target bg-bg-deep border border-border-subtle rounded px-1.5 py-0.5 text-text-secondary text-ui-sm focus:outline-none focus:border-accent"
        >
          {BLADE_LENGTHS.map((b) => (
            <option key={b.inches} value={b.inches}>{b.label}</option>
          ))}
        </select>
      </label>

      {/* Blade Diameter */}
      <label className="flex items-center gap-1">
        <span className="text-text-muted">Dia</span>
        <select
          value={bladeDiameter}
          onChange={(e) => setBladeDiameter(Number(e.target.value))}
          className="touch-target bg-bg-deep border border-border-subtle rounded px-1.5 py-0.5 text-text-secondary text-ui-sm focus:outline-none focus:border-accent"
        >
          {BLADE_DIAMETERS.map((d) => (
            <option key={d.inches} value={d.inches}>{d.label}</option>
          ))}
        </select>
      </label>

      {/* Diffusion Type */}
      <label className="flex items-center gap-1">
        <span className="text-text-muted">Tube</span>
        <select
          value={diffusionType}
          onChange={(e) => setDiffusionType(e.target.value)}
          className="touch-target bg-bg-deep border border-border-subtle rounded px-1.5 py-0.5 text-text-secondary text-ui-sm focus:outline-none focus:border-accent"
        >
          {DIFFUSION_TYPES.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </label>

      {/* LED Count + Grid toggle */}
      <span className="text-text-muted">{config.ledCount} LEDs</span>
      <button
        onClick={() => setShowGrid(!showGrid)}
        className={`touch-target px-1.5 py-0.5 rounded border text-ui-sm transition-colors ${
          showGrid
            ? 'border-accent/40 text-accent bg-accent-dim/30'
            : 'border-border-subtle text-text-muted hover:text-text-secondary'
        }`}
        role="switch"
        aria-checked={showGrid}
        aria-label="Toggle grid overlay"
      >
        Grid
      </button>
    </div>
  );

  // ─── Always-in-frame zoom clamp ───
  // Ensures the blade never scrolls entirely off-screen during pan/zoom.
  const clampPanX = useCallback((newPanX: number, newZoom: number): number => {
    const { w, dpr } = sizeRef.current;
    const cw = w * dpr;
    const bs = getBaseScale();
    const scaledBladeLenDS = BLADE_LEN * (bladeLength / MAX_BLADE_INCHES);
    const visibleW = cw / (bs * newZoom);
    // At least 20% of blade (or 30% of viewport) must remain visible
    const margin = Math.min(scaledBladeLenDS * 0.2, visibleW * 0.3);

    const maxPan = visibleW - BLADE_START - margin;
    const minPan = -(BLADE_START + scaledBladeLenDS - margin);

    return Math.max(minPan, Math.min(maxPan, newPanX));
  }, [getBaseScale, bladeLength]);

  return (
    <div className="flex flex-col h-full w-full gap-1.5">
      {/* ── Blade Config Bar (mobile only — desktop uses CanvasToolbar + BladeHardwarePanel) ── */}
      {!mobileFullscreen && <div className="desktop:hidden">{configBar}</div>}

      {/* ── Canvas Container ── */}
      <div
        ref={containerRef}
        className={`relative flex-1 overflow-hidden ${
          mobileFullscreen
            ? 'rounded-none border-0'
            : 'rounded-panel border border-border-subtle'
        }`}
        style={{ minHeight: mobileFullscreen ? undefined : '200px' }}
      >
        <canvas
          ref={canvasRef}
          className="blade-canvas absolute inset-0 w-full h-full"
          role="img"
          aria-label="Blade style preview visualizer"
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom((prevZoom) => {
              const newZoom = Math.max(0.5, Math.min(3.0, prevZoom + delta));
              // Auto-center: keep blade midpoint at same screen position
              const bs = getBaseScale();
              const bladeMidDS = BLADE_START + (BLADE_LEN * (bladeLength / MAX_BLADE_INCHES)) / 2;
              const oldScreenX = (bladeMidDS + panX) * bs * prevZoom;
              const newPanX = oldScreenX / (bs * newZoom) - bladeMidDS;
              setPanX(clampPanX(newPanX, newZoom));
              return newZoom;
            });
          }}
        />
        {/* Zoom controls overlay */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-bg-deep/80 rounded px-1.5 py-0.5 border border-border-subtle">
          <button
            onClick={() => setZoom((prevZoom) => {
              const newZoom = Math.max(0.5, prevZoom - 0.25);
              const bs = getBaseScale();
              const bladeMidDS = BLADE_START + (BLADE_LEN * (bladeLength / MAX_BLADE_INCHES)) / 2;
              const oldScreenX = (bladeMidDS + panX) * bs * prevZoom;
              const newPanX = oldScreenX / (bs * newZoom) - bladeMidDS;
              setPanX(clampPanX(newPanX, newZoom));
              return newZoom;
            })}
            className="touch-target text-text-muted hover:text-text-primary text-ui-xs px-1"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="text-ui-xs text-text-muted tabular-nums w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((prevZoom) => {
              const newZoom = Math.min(3.0, prevZoom + 0.25);
              const bs = getBaseScale();
              const bladeMidDS = BLADE_START + (BLADE_LEN * (bladeLength / MAX_BLADE_INCHES)) / 2;
              const oldScreenX = (bladeMidDS + panX) * bs * prevZoom;
              const newPanX = oldScreenX / (bs * newZoom) - bladeMidDS;
              setPanX(clampPanX(newPanX, newZoom));
              return newZoom;
            })}
            className="touch-target text-text-muted hover:text-text-primary text-ui-xs px-1"
            aria-label="Zoom in"
          >
            +
          </button>
          {zoom !== 1.25 && (
            <button
              onClick={() => { setZoom(1.25); setPanX(0); }}
              className="touch-target text-text-muted hover:text-text-primary text-ui-xs px-1 border-l border-border-subtle ml-0.5 pl-1.5"
              aria-label="Reset zoom"
            >
              Reset
            </button>
          )}
        </div>
        {/* Analyze / Clean mode toggle */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-bg-deep/80 rounded px-1.5 py-0.5 border border-border-subtle">
          <button
            onClick={() => useUIStore.getState().toggleAnalyzeMode()}
            className={`touch-target text-ui-xs px-1.5 py-0.5 rounded transition-colors ${analyzeMode ? 'text-accent bg-accent/15' : 'text-text-muted hover:text-text-primary'}`}
            aria-label={analyzeMode ? 'Switch to clean view' : 'Switch to analyze view'}
            title={analyzeMode ? 'Hide pixel strip & RGB graph' : 'Show pixel strip & RGB graph'}
          >
            {analyzeMode ? 'Analyze' : 'Clean'}
          </button>
        </div>
        {/* Blade length label */}
        <div className="absolute top-2 left-2 text-ui-sm text-text-muted/50 font-mono">
          {bladeLength}" blade
        </div>
      </div>
    </div>
  );
}
