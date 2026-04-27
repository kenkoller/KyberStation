'use client';
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import type { BladeEngine, BladeConfig } from '@kyberstation/engine';
import { TOPOLOGY_PRESETS } from '@kyberstation/engine';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { getThemeById } from '@/lib/canvasThemes';
import { playUISound } from '@/lib/uiSounds';
import { AUTO_FIT_FILL } from '@/lib/bladeRenderMetrics';
import { HiltRenderer } from '@/components/hilt/HiltRenderer';
import { BladeLayersDebugOverlay, type DebugLayerCapture } from './BladeLayersDebugOverlay';

type RenderMode = 'photorealistic' | 'pixel';

interface BladeCanvasProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
  vertical?: boolean;
  mobileFullscreen?: boolean;
  renderMode?: RenderMode;
  compact?: boolean;
  /** When true, renders blade only — no inline strip/graph/resize handles (used inside CanvasLayout) */
  panelMode?: boolean;
}

// ─── Design-space constants (scaled at render time) ───
// Everything is authored at 1200x600 then mapped to actual canvas size.

const DESIGN_W = 1200;
const DESIGN_H = 600;

// Blade placement (design-space)
const BLADE_START = 274; // hilt area ends here
const BLADE_LEN = 830;
const BLADE_Y = DESIGN_H / 2;
const BLADE_CORE_H = 26;

// W6 (2026-04-22): default auto-fit pan pulls the whole composition
// left so the hilt's left half slips off the left edge. Imported from
// `apps/web/lib/bladeRenderMetrics.ts` — single source of truth shared
// with every sibling panel (pixel strip, analysis rail, etc.) so the
// two can never drift out of alignment.

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
  // Modular SVG assemblies — routed through HiltRenderer overlay instead of canvas primitives.
  // Primitive values kept for the canvas-path fallback so the hilt toolbar geometry remains coherent
  // if the SVG overlay ever misses (defensive — shouldn't happen in practice).
  { id: 'graflex-svg', label: 'Graflex ✦', pommelW: 18, gripW: 120, shroudW: 16, emitterW: 30, hiltH: 26, shroudInset: 2, emitterFlare: 2, ribSpacing: 4, hasButton: true, hasWindowPort: true, metalTint: '' },
  { id: 'mpp-svg', label: 'MPP ✦', pommelW: 16, gripW: 120, shroudW: 12, emitterW: 32, hiltH: 24, shroudInset: 2, emitterFlare: 2, ribSpacing: 4, hasButton: true, hasWindowPort: false, metalTint: '' },
  { id: 'negotiator-svg', label: 'Negotiator ✦', pommelW: 20, gripW: 110, shroudW: 20, emitterW: 32, hiltH: 26, shroudInset: 3, emitterFlare: 3, ribSpacing: 5, hasButton: true, hasWindowPort: false, metalTint: '' },
  { id: 'count-svg', label: 'Count ✦', pommelW: 24, gripW: 110, shroudW: 18, emitterW: 30, hiltH: 28, shroudInset: 3, emitterFlare: 3, ribSpacing: 6, hasButton: true, hasWindowPort: false, metalTint: '' },
  { id: 'shoto-sage-svg', label: 'Shoto (Sage) ✦', pommelW: 12, gripW: 70, shroudW: 10, emitterW: 22, hiltH: 20, shroudInset: 2, emitterFlare: 1, ribSpacing: 5, hasButton: false, hasWindowPort: false, metalTint: '' },
  { id: 'ren-vent-svg', label: 'Vented Crossguard ✦', pommelW: 14, gripW: 100, shroudW: 20, emitterW: 40, hiltH: 26, shroudInset: 3, emitterFlare: 6, ribSpacing: 5, hasButton: false, hasWindowPort: false, metalTint: '' },
  { id: 'zabrak-staff-svg', label: 'Staff ✦', pommelW: 0, gripW: 180, shroudW: 0, emitterW: 24, hiltH: 22, shroudInset: 0, emitterFlare: 1, ribSpacing: 8, hasButton: false, hasWindowPort: false, metalTint: '' },
  { id: 'fulcrum-pair-svg', label: 'Fulcrum ✦', pommelW: 18, gripW: 90, shroudW: 14, emitterW: 22, hiltH: 22, shroudInset: 3, emitterFlare: 2, ribSpacing: 5, hasButton: true, hasWindowPort: false, metalTint: '' },
];

/** Hilt style ids whose rendering is delegated to the modular SVG HiltRenderer overlay */
const SVG_HILT_STYLE_TO_ASSEMBLY: Record<string, string> = {
  'graflex-svg': 'graflex',
  'mpp-svg': 'mpp',
  'negotiator-svg': 'negotiator',
  'count-svg': 'count',
  'shoto-sage-svg': 'shoto-sage',
  'ren-vent-svg': 'ren-vent',
  'zabrak-staff-svg': 'zabrak-staff',
  'fulcrum-pair-svg': 'fulcrum-pair',
};

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

export function BladeCanvas({ engineRef, vertical = true, mobileFullscreen = false, renderMode = 'photorealistic', compact = false, panelMode = false }: BladeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  // Scratch canvas reused by the diffusion-blur pass. Allocated lazily
  // and resized in-place whenever the main canvas resizes (mirrors the
  // offscreenRef resize path at line ~437). Previously we allocated a
  // fresh <canvas> every frame, which caused GC churn (see the
  // 2026-04-19 perf audit P0).
  const diffusionTempRef = useRef<HTMLCanvasElement | null>(null);

  // Phase 2 bloom: 3-mip downsampled bright-pass chain. Lazily
  // allocated + reused across frames (HMR-safe since they're
  // component-scoped refs, not module-level). Sized per frame to
  // 1/2, 1/4, 1/8 of the main canvas device-pixel dims.
  const bloomMipsRef = useRef<{
    mip0: HTMLCanvasElement;
    mip1: HTMLCanvasElement;
    mip2: HTMLCanvasElement;
  } | null>(null);

  // Phase 3 motion blur: persistent ghost buffer matching mip0 dims
  // that each frame composites the current bloom mip 0 at a swing-
  // speed-driven alpha, then blits back to main. Gives the blade a
  // "trailing streak" during fast swings. Gated on !reducedMotion.
  const motionGhostRef = useRef<HTMLCanvasElement | null>(null);

  // Phase 4 ambient coupling: last-computed average bloom-mip-2
  // luma, 0–1. Set each frame by drawBladePhotorealistic; read by
  // the floor wash + hilt illumination + ambient tint passes so
  // those scale proportionally to blade brightness.
  const avgBloomLumRef = useRef<number>(0);
  const fpsFrames = useRef<number[]>([]);
  const sizeRef = useRef({ w: DESIGN_W, h: DESIGN_H, dpr: 1 });

  /**
   * Edit Mode hit-test geometry — updated each render frame so the click
   * handler doesn't need to re-derive the blade's screen-space position
   * (which would require duplicating the rotation / scaling logic).
   * Null when the blade hasn't been rendered yet or the mode isn't supported.
   */
  const bladeHitRef = useRef<{
    mode: 'vertical' | 'horizontal';
    /** In canvas device-pixel coords. */
    hiltX: number;
    hiltY: number;
    tipX: number;
    tipY: number;
    /** Perpendicular half-thickness tolerance in canvas px. */
    thicknessTolerance: number;
  } | null>(null);

  /** Pointer hover position (canvas DPR coords) during Edit Mode — drives the ghost caret. */
  const hoverPosRef = useRef<number | null>(null); // 0..1 along the blade, or null

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
  const verticalPanelWidths = useUIStore((s) => s.verticalPanelWidths);
  const showHilt = useUIStore((s) => s.showHilt);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const reduceBloom = useAccessibilityStore((s) => s.reduceBloom);
  const isPaused = useUIStore((s) => s.isPaused);
  const pauseScope = useUIStore((s) => s.pauseScope);
  const editMode = useUIStore((s) => s.editMode);
  const theme = useMemo(() => getThemeById(canvasTheme), [canvasTheme]);

  // Strip type from store (persisted via BladeConfig)
  const stripType = config.stripType ?? 'single';
  const setStripType = useCallback((v: string) => updateConfig({ stripType: v as BladeConfig['stripType'] }), [updateConfig]);
  const [bladeLength, setBladeLength] = useState<number>(config.ledCount <= 73 ? 20 : config.ledCount <= 88 ? 24 : config.ledCount <= 103 ? 28 : config.ledCount <= 117 ? 32 : config.ledCount <= 132 ? 36 : 40);
  // v0.14.0 Phase 1.5: showGrid lifted to uiStore so the BLADE PREVIEW
  // toolbar in CanvasLayout can toggle it alongside Pause/Hilt.
  const showGrid = useUIStore((s) => s.showGrid);
  const toggleShowGrid = useUIStore((s) => s.toggleShowGrid);
  const [hiltStyle, setHiltStyle] = useState<string>('minimal');
  const [diffusionType, setDiffusionType] = useState<string>('medium');
  const [bladeDiameter, setBladeDiameter] = useState<number>(0.875);

  // ─── Render-layer debug capture (?debug=layers) ───
  // Lazy initializer reads the URL once on first client render — avoids
  // the useEffect-then-setState round trip that can leave the button
  // hidden during Fast Refresh. When the flag is on, a floating "Capture
  // Layers" button appears bottom-right; clicking it sets captureRequestRef,
  // and the next render frame snapshots the canvas before/after each pass,
  // computes the per-pass diff, and pushes each as its own opaque-on-black
  // canvas. Zero overhead when the flag is off (one ref read).
  const [debugLayersEnabled] = useState(() =>
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === 'layers',
  );
  const [debugCaptures, setDebugCaptures] = useState<DebugLayerCapture[] | null>(null);
  const captureRequestRef = useRef(false);
  const captureCollectorRef = useRef<DebugLayerCapture[] | null>(null);
  const debugSnapBeforeRef = useRef<ImageData | null>(null);

  // Helper: snapshot the visible canvas into a fresh canvas of the same
  // size so the cumulative-view captures don't share pixels with the live
  // canvas (which keeps drawing on subsequent passes).
  const cloneVisibleCanvas = useCallback((cw: number, ch: number): HTMLCanvasElement => {
    const visible = canvasRef.current;
    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    if (visible) {
      out.getContext('2d')!.drawImage(visible, 0, 0);
    }
    return out;
  }, []);

  // Snapshot a ready-made canvas (offscreen, mip buffer, motion ghost) onto
  // its own black background so the user can see what the buffer looks like
  // in isolation. Also snapshots the visible canvas state at this point so
  // the cumulative-view shows the in-progress render. No-op when not capturing.
  const captureBufferAsLayer = useCallback((
    source: HTMLCanvasElement,
    name: string,
    description: string,
    cw: number,
    ch: number,
  ) => {
    const collector = captureCollectorRef.current;
    if (!collector) return;
    const isolated = document.createElement('canvas');
    isolated.width = cw;
    isolated.height = ch;
    const iCtx = isolated.getContext('2d')!;
    iCtx.fillStyle = '#000';
    iCtx.fillRect(0, 0, cw, ch);
    iCtx.drawImage(source, 0, 0, source.width, source.height, 0, 0, cw, ch);
    collector.push({
      name,
      description,
      isolatedCanvas: isolated,
      cumulativeCanvas: cloneVisibleCanvas(cw, ch),
    });
  }, [cloneVisibleCanvas]);

  // Diff the visible canvas against the previous snapshot — the changed
  // pixels become the isolated layer, unchanged pixels render black. Also
  // captures the cumulative visible canvas state. Updates the baseline
  // snapshot so the next call captures only what's NEW after this one.
  // No-op when not capturing.
  const captureDeltaAsLayer = useCallback((
    ctx: CanvasRenderingContext2D,
    name: string,
    description: string,
    cw: number,
    ch: number,
  ) => {
    const collector = captureCollectorRef.current;
    const snapBefore = debugSnapBeforeRef.current;
    if (!collector || !snapBefore) return;
    const after = ctx.getImageData(0, 0, cw, ch);
    const isolated = document.createElement('canvas');
    isolated.width = cw;
    isolated.height = ch;
    const iCtx = isolated.getContext('2d')!;
    const diff = new ImageData(cw, ch);
    const before = snapBefore.data;
    const aft = after.data;
    for (let i = 0; i < aft.length; i += 4) {
      diff.data[i + 3] = 255;
      if (before[i] !== aft[i] || before[i + 1] !== aft[i + 1] || before[i + 2] !== aft[i + 2]) {
        diff.data[i] = aft[i];
        diff.data[i + 1] = aft[i + 1];
        diff.data[i + 2] = aft[i + 2];
      }
    }
    iCtx.putImageData(diff, 0, 0);
    // Cumulative = the canvas state right now, after this pass.
    const cumulative = document.createElement('canvas');
    cumulative.width = cw;
    cumulative.height = ch;
    cumulative.getContext('2d')!.putImageData(after, 0, 0);
    collector.push({
      name,
      description,
      isolatedCanvas: isolated,
      cumulativeCanvas: cumulative,
    });
    debugSnapBeforeRef.current = after;
  }, []);

  // ─── Auto-fit scale ───
  // Phase 1.5f (v0.14.0): horizontal placement is driven by the user's
  // draggable Point-A divider in CanvasLayout — `uiStore.bladeStartFrac`
  // (fraction-of-container × 1000). Hilt renders to the LEFT of that X,
  // blade + pixel strip + analysis waveform all anchor to the RIGHT.
  // `panX` stays at 0 (legacy prop kept so vertical / 3D call sites
  // unchanged).
  const bladeStartFrac = useUIStore((s) => s.bladeStartFrac);
  const [panX] = useState<number>(0);
  const hasAutoFitRef = useRef(false);

  // Re-run layout when blade length changes
  useEffect(() => {
    if (hasAutoFitRef.current && sizeRef.current.w > 1 && sizeRef.current.h > 1) {
      // Force a redraw cycle; the new bladeLength propagates through getScale
      // via `bladeLength` being read at draw time. No state to mutate here
      // now that zoom is gone — kept as a hook so the next phase can wire
      // mip-buffer resets here if bladeLength affects buffer sizing.
    }
  }, [bladeLength]);

  // Panel resize drag state
  const dragRef = useRef<{ handle: 'blade-strip' | 'strip-graph'; startX: number; startWidths: { blade: number; strip: number; graph: number } } | null>(null);

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
      if (diffusionTempRef.current) {
        diffusionTempRef.current.width = w * dpr;
        diffusionTempRef.current.height = h * dpr;
      }
    };

    // RAF-coalesce: during rapid ResizeHandle drags the observer fires at
    // sub-frame cadence. Batch the canvas-dim update into a single paint
    // cycle so we don't do N mid-frame re-layouts per drag-pixel, and so
    // subsequent state reads always see a coherent size.
    let rafHandle: number | null = null;
    const observer = new ResizeObserver(() => {
      if (rafHandle !== null) return;
      rafHandle = requestAnimationFrame(() => {
        rafHandle = null;
        resize();
        hasAutoFitRef.current = true;
      });
    });
    observer.observe(container);
    resize(); // initial
    hasAutoFitRef.current = true;

    return () => {
      observer.disconnect();
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
    };
  }, []);

  // ─── Panel resize drag handling ───
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;

      if (drag.handle === 'blade-strip') {
        const newBlade = clamp(fraction, 0.25, 0.70);
        const totalData = 1 - newBlade;
        // Keep strip/graph ratio from drag start
        const origDataRatio = drag.startWidths.strip / (drag.startWidths.strip + drag.startWidths.graph);
        const newStrip = clamp(totalData * origDataRatio, 0.05, 0.25);
        const newGraph = totalData - newStrip;
        if (newGraph >= 0.15) {
          useUIStore.getState().setVerticalPanelWidths({ blade: newBlade, strip: newStrip, graph: newGraph });
        }
      } else {
        const bladeW = drag.startWidths.blade;
        const newStripEnd = clamp(fraction, bladeW + 0.05, 0.85);
        const newStrip = newStripEnd - bladeW;
        const newGraph = 1 - bladeW - newStrip;
        if (newGraph >= 0.15 && newStrip >= 0.05) {
          useUIStore.getState().setVerticalPanelWidths({ blade: bladeW, strip: newStrip, graph: newGraph });
        }
      }
    };

    const onPointerUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
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
  //
  // Phase 1.5f (v0.14.0): horizontal mode is WIDTH-driven AND anchored
  // to the user-draggable Point-A divider. A 40" blade fills the
  // entire post-divider space (up to AUTO_FIT_FILL right margin); a
  // 20" blade fills half of that space and leaves the rest empty.
  //
  //   bladeStartPx = cw * (bladeStartFrac / 1000)
  //   maxBladePx   = cw * AUTO_FIT_FILL - bladeStartPx
  //   scale        = maxBladePx / BLADE_LEN
  //
  // BLADE_LEN is the 40"-blade length in design-space so a 40" blade
  // at scale `maxBladePx / BLADE_LEN` draws exactly maxBladePx pixels
  // wide — Point B lands at AUTO_FIT_FILL × cw. Shorter blades render
  // proportionally shorter from the divider rightward.
  //
  // Vertical mode (mobile fullscreen `/m` route) keeps the legacy
  // height-driven math — blade runs along canvas height there.
  const getBaseScale = useCallback(() => {
    const { w, h, dpr } = sizeRef.current;
    if (vertical) {
      const ch = h * dpr;
      return ch / layoutRef.current.designH;
    }
    const cw = w * dpr;
    if (cw <= 0 || BLADE_LEN <= 0) return 1;
    const startPx = cw * (bladeStartFrac / 1000);
    const maxBladePx = Math.max(0, cw * AUTO_FIT_FILL - startPx);
    return maxBladePx / BLADE_LEN;
  }, [vertical, bladeStartFrac]);

  // Render scale: auto-fit. v0.14.0 removed the user zoom multiplier —
  // auto-fit IS the scale now.
  const getScale = useCallback(() => {
    return getBaseScale();
  }, [getBaseScale]);

  // ─── Horizontal blade-start X (user-draggable Point A) ───
  // Phase 1.5f: horizontal mode anchors the blade to
  // `bladeStartFrac` — the user-draggable divider in CanvasLayout.
  // Vertical (`/m` route) keeps the legacy `(BLADE_START + panX) * scale`
  // math because the rotation transform is independent of the divider.
  const getBladeStartPx = useCallback(() => {
    const { w, dpr } = sizeRef.current;
    const cw = w * dpr;
    return cw * (bladeStartFrac / 1000);
  }, [bladeStartFrac]);

  // ─── Blade vertical center (canvas-height-driven) ───
  // Phase 1.5 split: horizontal extent follows container width (above),
  // vertical center follows container height. This keeps the blade
  // vertically centered in its canvas region regardless of how the
  // pixel-strip resize handle below has reshaped the blade's vertical
  // allocation.
  const getBladeCenterY = useCallback(() => {
    const { h, dpr } = sizeRef.current;
    return (h * dpr) / 2;
  }, []);

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

    const bladeStartPx = getBladeStartPx();
    const bladeEndPx = bladeStartPx + scaledBladeLenDS * scale;
    const bladeCenterY = getBladeCenterY();

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
      const y = bladeCenterY + offset * scale;
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
  }, [showGrid, bladeLength, getScale, getBladeStartPx, getBladeCenterY, theme]);

  // ─── Draw metallic hilt (uses selected hilt style) ───
  const drawHilt = useCallback((ctx: CanvasRenderingContext2D, bladeColor: { r: number; g: number; b: number } | null, scale: number) => {
    if (!showHilt) return; // Hilt visibility toggle
    // Modular SVG assemblies render via HiltRenderer overlay — skip canvas primitive path.
    if (SVG_HILT_STYLE_TO_ASSEMBLY[hiltStyle]) return;
    const hs = HILT_STYLES.find(h => h.id === hiltStyle) ?? HILT_STYLES[0];

    // Compute hilt geometry from style
    const totalHiltW = hs.pommelW + hs.gripW + hs.shroudW + hs.emitterW;
    const hiltStartX = getBladeStartPx() - totalHiltW * scale;
    const centerY = getBladeCenterY();
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
  }, [hiltStyle, showHilt, getBladeStartPx, getBladeCenterY]);

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
    const bladeStartPx = getBladeStartPx();
    const bladeYPx = getBladeCenterY();
    const baseCoreH = BLADE_CORE_H * scale * diameterConfig.coreScale;
    const coreH = baseCoreH;

    const visibleLen = bladeLenPx * extendProgress;
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

    captureBufferAsLayer(offscreen, '01. Offscreen — LED segments', 'Per-LED rectangles drawn to the offscreen buffer. Raw pixel-strip data, before tip caps, blur, or bloom.', cw, ch);

    // ── Draw rounded tip cap on offscreen buffer ──
    // Ensures bloom passes wrap glow around the tip naturally
    // instead of producing a flat rectangular cutoff.
    if (activeCount > 0 && maxLitT > 0) {
      const tipEndX = bladeStartPx + maxLitT * bladeLenPx;
      const tipIdx = Math.min(Math.floor(maxLitT * (ledCount - 1)), ledCount - 1);
      let capR: number, capG: number, capB: number;
      if (isInHilt) {
        const falloff = Math.pow(1 - maxLitT, 1.8);
        capR = avgR * falloff * shimmer;
        capG = avgG * falloff * shimmer;
        capB = avgB * falloff * shimmer;
      } else {
        capR = leds.getR(tipIdx) * effectiveBri * shimmer;
        capG = leds.getG(tipIdx) * effectiveBri * shimmer;
        capB = leds.getB(tipIdx) * effectiveBri * shimmer;
      }
      if (capR + capG + capB > 0.5) {
        // Semicircular cap matching blade core height
        offCtx.fillStyle = rgbStr(capR, capG, capB);
        offCtx.beginPath();
        offCtx.arc(tipEndX, bladeYPx, coreH / 2, -Math.PI / 2, Math.PI / 2);
        offCtx.fill();

        // Wider soft glow seed at the tip — must extend beyond the widest
        // blur kernel (up to ~100 device px at default scale × bloomRadius)
        // so the bloom's outermost mip wraps the rounded tip smoothly
        // instead of producing a rectangular cutoff.
        const glowCapRadius = coreH * 4.0;
        const capGrad = offCtx.createRadialGradient(
          tipEndX, bladeYPx, 0,
          tipEndX, bladeYPx, glowCapRadius,
        );
        capGrad.addColorStop(0, rgbStr(capR, capG, capB, 0.8));
        capGrad.addColorStop(0.1, rgbStr(capR, capG, capB, 0.55));
        capGrad.addColorStop(0.22, rgbStr(capR, capG, capB, 0.3));
        capGrad.addColorStop(0.4, rgbStr(capR, capG, capB, 0.12));
        capGrad.addColorStop(0.65, rgbStr(capR, capG, capB, 0.04));
        capGrad.addColorStop(0.85, rgbStr(capR, capG, capB, 0.01));
        capGrad.addColorStop(1, rgbStr(capR, capG, capB, 0));
        offCtx.fillStyle = capGrad;
        offCtx.beginPath();
        offCtx.arc(tipEndX, bladeYPx, glowCapRadius, 0, Math.PI * 2);
        offCtx.fill();
      }
      // Emitter end intentionally left flat — the hilt covers the visible
      // portion, and any rectangular bloom artifact peeking past the hilt
      // edges is acceptable per the v0.14.x pipeline-cleanup pass. If the
      // boxy artifact ever becomes visible in practice, escalate to a soft
      // alpha falloff at x=bladeStartPx (or mask the offscreen behind the
      // hilt outline).
    }

    captureBufferAsLayer(offscreen, '02. Offscreen — tip rounded cap + glow seed', 'LED strip + rounded semicircular cap at the TIP only (color borrowed from the last lit LED) + soft radial gradient seed extending beyond the bloom kernel. Emitter end stays flat — the hilt covers it, so no seed work needed there.', cw, ch);

    // ── Apply diffusion blur to offscreen if needed ──
    if (diffusion.blurKernel > 0) {
      offCtx.save();
      offCtx.filter = `blur(${diffusion.blurKernel * scale}px)`;
      // Reuse a single scratch canvas across frames — allocating a
      // fresh <canvas> every frame was a GC-churn source per the
      // 2026-04-19 perf audit P0. Size is kept in sync with the main
      // canvas via the ResizeObserver callback above.
      let tempCanvas = diffusionTempRef.current;
      if (!tempCanvas) {
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = cw;
        tempCanvas.height = ch;
        diffusionTempRef.current = tempCanvas;
      } else if (tempCanvas.width !== cw || tempCanvas.height !== ch) {
        tempCanvas.width = cw;
        tempCanvas.height = ch;
      }
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.clearRect(0, 0, cw, ch);
      tempCtx.drawImage(offscreen, 0, 0);
      offCtx.clearRect(0, 0, cw, ch);
      offCtx.drawImage(tempCanvas, 0, 0);
      offCtx.restore();
      captureBufferAsLayer(offscreen, '03. Offscreen — diffusion blur', `CSS blur filter (kernel ${diffusion.blurKernel}px × scale) applied to the offscreen buffer. Simulates the polycarbonate diffusion tube. Only present when the selected diffusion type has blurKernel > 0.`, cw, ch);
    }

    // ── Draw hilt BEFORE bloom so glow overlaps it naturally ──
    const bladeColor = activeCount > 0 ? { r: satR, g: satG, b: satB } : null;
    drawHilt(ctx, bladeColor, scale);
    captureDeltaAsLayer(ctx, '04. Hilt', 'Procedural metallic hilt drawn on the visible canvas (pommel, grip ribs, shroud, emitter). Drawn BEFORE the bloom so the halo can spill over it naturally.', cw, ch);

    // ══════════════════════════════════════════════════
    // ── PHASE 2 BLOOM PIPELINE ──
    // Bright-pass (contrast+brightness threshold) → downsample to
    // 3 mip levels (1/2, 1/4, 1/8) → blur each mip at its own
    // resolution → composite all three back additively. Each blur
    // kernel is small-pixel in its small buffer but gives a wide
    // effective halo once upscaled, so the widest mip produces a
    // smooth full-blade glow instead of the stacked-pass seam
    // ridges the old 14-pass loop suffered from.
    //
    // Cost is ~1/8 the old loop's fragment work at DPR 2:
    // 3 draws at downsampled sizes vs 14+ at full canvas res.
    // ══════════════════════════════════════════════════

    const br = glow.bloomRadius;
    const bi = glow.bloomIntensity;

    const bloomActive = activeCount > 0 && bi > 0;
    if (bloomActive) {
      // Lazy allocate mip chain. Canvases are resized in place each
      // frame to match the 1/2, 1/4, 1/8 dims of the main canvas.
      if (!bloomMipsRef.current) {
        bloomMipsRef.current = {
          mip0: document.createElement('canvas'),
          mip1: document.createElement('canvas'),
          mip2: document.createElement('canvas'),
        };
      }
      const mips = bloomMipsRef.current;
      const mipDefs: Array<{
        canvas: HTMLCanvasElement;
        w: number;
        h: number;
        blurPx: number;
        alpha: number;
      }> = [
        // mip0: tight near-core glow (bumped 0.55 → 0.65 to compensate
        // for the dropped Layer 18 floor+ceiling wash)
        { canvas: mips.mip0, w: Math.max(1, Math.ceil(cw / 2)), h: Math.max(1, Math.ceil(ch / 2)), blurPx: 6 * br, alpha: 0.65 },
        // mip1: body-wide halo (bumped 0.40 → 0.52)
        { canvas: mips.mip1, w: Math.max(1, Math.ceil(cw / 4)), h: Math.max(1, Math.ceil(ch / 4)), blurPx: 10 * br, alpha: 0.52 },
        // mip2: widest ambient wash — bumped most aggressively (0.28 → 0.45)
        // since this mip's role most overlaps the dropped floor+ceiling wash.
        // Also still sampled below for avgBloomLum (background tint, etc).
        { canvas: mips.mip2, w: Math.max(1, Math.ceil(cw / 8)), h: Math.max(1, Math.ceil(ch / 8)), blurPx: 14 * br, alpha: 0.45 },
      ];

      // Populate each mip: single drawImage with a chained CSS filter
      // (bright-pass threshold + blur) does the work in one GPU pass.
      for (const def of mipDefs) {
        if (def.canvas.width !== def.w || def.canvas.height !== def.h) {
          def.canvas.width = def.w;
          def.canvas.height = def.h;
        }
        const mCtx = def.canvas.getContext('2d')!;
        mCtx.clearRect(0, 0, def.w, def.h);
        mCtx.save();
        // Soft bright-pass: contrast(1.15) + brightness(1.05) gently
        // pushes mid tones toward 0 and highlights toward 1 without
        // crushing the falloff into a near-binary mask. The previous
        // 1.4 contrast produced a hard threshold edge — when blurred,
        // that edge showed through as a visible rectangular cutoff at
        // the bloom outer extent (most obvious on mips 1 + 2). With
        // 1.15 the bright-pass is a smooth gradient, so blurring it
        // produces a smooth halo with natural falloff instead of a
        // box-shaped wash. blur runs in the same filter chain so the
        // small canvas holds a pre-blurred bright-pass image ready
        // for additive compositing.
        //
        // Trade-offs (intentional, both wins for accuracy):
        //  - bloom now bleeds slightly onto darker adjacent surfaces
        //    (hilt, dim blade areas). This is physically correct —
        //    real bright lights spill onto adjacent matter.
        //  - bloom looks less "snappy" / more diffuse. Closer to what
        //    real cameras + real eyes produce.
        mCtx.filter = `contrast(1.15) brightness(1.05) blur(${def.blurPx}px)`;
        mCtx.drawImage(offscreen, 0, 0, cw, ch, 0, 0, def.w, def.h);
        mCtx.restore();
      }

      captureBufferAsLayer(mipDefs[0].canvas, '05. Bloom mip 0 — raw (1/2 res)', `Bright-pass + ${mipDefs[0].blurPx.toFixed(1)}px blur in 1/2 res buffer. The TIGHTEST near-core glow source. Composited at α ${mipDefs[0].alpha}.`, cw, ch);
      captureBufferAsLayer(mipDefs[1].canvas, '06. Bloom mip 1 — raw (1/4 res)', `Bright-pass + ${mipDefs[1].blurPx.toFixed(1)}px blur in 1/4 res buffer. The MID body-wide halo source. Composited at α ${mipDefs[1].alpha}.`, cw, ch);
      captureBufferAsLayer(mipDefs[2].canvas, '07. Bloom mip 2 — raw (1/8 res)', `Bright-pass + ${mipDefs[2].blurPx.toFixed(1)}px blur in 1/8 res buffer. The WIDEST ambient wash source — also sampled below for avgBloomLum (drives floor wash, hilt wash, vignette opacity). Composited at α ${mipDefs[2].alpha}.`, cw, ch);

      // Composite the three mips back onto the main canvas additively.
      // Upscaled drawImage with bilinear smoothing + `lighter` gives
      // a soft continuous halo that wraps the entire blade without
      // visible ridges. shimmer adds the per-frame micro-variation
      // the old pipeline relied on for "alive" look.
      //
      // Phase 3: reduceBloom (a11y) scales the mip alpha to 40% of
      // the authored value so photosensitive users get a dimmer halo
      // while still seeing the blade is lit. Does NOT disable bloom
      // entirely — the halo is intrinsic to the "lightsaber" identity.
      const bloomAlphaScale = reduceBloom ? 0.4 : 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      for (let mIdx = 0; mIdx < mipDefs.length; mIdx++) {
        const def = mipDefs[mIdx];
        ctx.globalAlpha = def.alpha * bi * shimmer * bloomAlphaScale;
        ctx.drawImage(def.canvas, 0, 0, def.w, def.h, 0, 0, cw, ch);
        if (captureCollectorRef.current) {
          // Restore + capture + re-save so the delta call sees the
          // composited mip without the bloom-loop's globalAlpha bleeding
          // into the diff snapshot.
          ctx.restore();
          captureDeltaAsLayer(ctx, `${8 + mIdx}. Bloom mip ${mIdx} — composited (lighter blend, α=${(def.alpha * bi * shimmer * bloomAlphaScale).toFixed(3)})`, `Mip ${mIdx} (${def.canvas.width}×${def.canvas.height}) upscaled to canvas size and composited additively. Stacks on top of the previous bloom contribution.`, cw, ch);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
      }
      ctx.restore();

      // Phase 3 motion blur: persistent ghost buffer at mip 0 dims
      // composites current mip 0 each frame with `(1 - swing * 0.3)`
      // persistence. When the user's swing is fast, a blade trail
      // lags visibly; at rest the ghost fades to nothing so there
      // is zero visual cost. Gated on !reducedMotion so vestibular-
      // sensitive users don't get streaks. Ghost buffer is separate
      // from bloomMipsRef so the trail survives across frames
      // independently of the current bloom chain.
      if (!reducedMotion) {
        const swing = Math.max(0, Math.min(1, useBladeStore.getState().motionSim.swing / 100));
        if (swing > 0.02) {
          const ghost = motionGhostRef.current ?? document.createElement('canvas');
          if (!motionGhostRef.current) motionGhostRef.current = ghost;
          const def0 = mipDefs[0];
          if (ghost.width !== def0.w || ghost.height !== def0.h) {
            ghost.width = def0.w;
            ghost.height = def0.h;
          }
          const gCtx = ghost.getContext('2d')!;
          // Fade the existing ghost by `swing * 0.3` of its own
          // opacity, then paint the current mip 0 on top — that's
          // the temporal integration the trail uses.
          gCtx.save();
          gCtx.globalCompositeOperation = 'destination-in';
          gCtx.globalAlpha = Math.max(0, 1 - swing * 0.3);
          gCtx.fillStyle = '#fff';
          gCtx.fillRect(0, 0, def0.w, def0.h);
          gCtx.restore();
          gCtx.save();
          gCtx.globalCompositeOperation = 'lighter';
          gCtx.globalAlpha = 1;
          gCtx.drawImage(def0.canvas, 0, 0);
          gCtx.restore();
          // Composite the trail back onto main. Upscaled with
          // `lighter` so it stacks on top of the fresh bloom.
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.5, swing * 0.5) * bloomAlphaScale;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(ghost, 0, 0, def0.w, def0.h, 0, 0, cw, ch);
          ctx.restore();
          captureBufferAsLayer(ghost, '11a. Motion ghost — raw buffer', `Persistent mip-0-sized ghost buffer integrating mip 0 across frames with (1 - swing × 0.3) persistence. Current swing: ${(swing * 100).toFixed(1)}%. Empty when swing < 2%.`, cw, ch);
          captureDeltaAsLayer(ctx, '11b. Motion ghost — composited trail', `Ghost buffer composited additively at α=${(Math.min(0.5, swing * 0.5) * bloomAlphaScale).toFixed(3)}. The blade trail you see at high swing speeds.`, cw, ch);
        } else if (motionGhostRef.current) {
          // Below the swing threshold — clear the ghost so the next
          // swing starts from a clean buffer, not stale last-swing
          // residual.
          const g = motionGhostRef.current;
          g.getContext('2d')?.clearRect(0, 0, g.width, g.height);
        }
      }
    }

    // Compute actual visible end from LED data (matches engine mask,
    // not the linear extendProgress which diverges for shatter/fadeout).
    // Used by both Pass 6 (tip cap) + Pass 7 (whiteout cap) below.
    const actualVisibleEnd = bladeStartPx + maxLitT * bladeLenPx;
    const actualVisibleLen = maxLitT * bladeLenPx;

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
      // Gentle edge dimming — smoother transition into bloom halo
      const edgeDim = 0.82;
      // Center: slightly boosted for depth
      const centerBoost = 1.12;
      const rW = clamp(r * centerBoost + 35, 0, 255);
      const gW = clamp(g * centerBoost + 35, 0, 255);
      const bW = clamp(b * centerBoost + 35, 0, 255);

      grad.addColorStop(0, rgbStr(r * edgeDim, g * edgeDim, b * edgeDim, 0.92));
      grad.addColorStop(0.08, rgbStr(r * 0.88, g * 0.88, b * 0.88));
      grad.addColorStop(0.2, rgbStr(r * 0.95, g * 0.95, b * 0.95));
      grad.addColorStop(0.4, rgbStr(r, g, b));
      grad.addColorStop(0.5, rgbStr(rW, gW, bW));
      grad.addColorStop(0.6, rgbStr(r, g, b));
      grad.addColorStop(0.8, rgbStr(r * 0.95, g * 0.95, b * 0.95));
      grad.addColorStop(0.92, rgbStr(r * 0.88, g * 0.88, b * 0.88));
      grad.addColorStop(1, rgbStr(r * edgeDim, g * edgeDim, b * edgeDim, 0.92));

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

    // Colored tip cap on the visible blade body — semicircle of the tip
    // LED's color extending past the last rectangular segment. Without
    // this, the visible blade body ends in a flat rectangle even though
    // the offscreen bloom feed has a rounded cap. Restored after the
    // dropped tip-corona pass (Layer 16) lost it.
    if (actualVisibleLen > 1) {
      const tipIdx = Math.min(Math.floor(maxLitT * (ledCount - 1)), ledCount - 1);
      let tipR: number, tipG: number, tipB: number;
      if (isInHilt) {
        const falloff = Math.pow(1 - maxLitT, 1.8);
        tipR = avgR * falloff * shimmer;
        tipG = avgG * falloff * shimmer;
        tipB = avgB * falloff * shimmer;
      } else {
        tipR = leds.getR(tipIdx) * effectiveBri * shimmer;
        tipG = leds.getG(tipIdx) * effectiveBri * shimmer;
        tipB = leds.getB(tipIdx) * effectiveBri * shimmer;
      }
      if (tipR + tipG + tipB > 0.5) {
        ctx.fillStyle = rgbStr(tipR, tipG, tipB);
        ctx.beginPath();
        ctx.arc(actualVisibleEnd, bladeYPx, coreH / 2, -Math.PI / 2, Math.PI / 2);
        ctx.fill();
      }
    }
    captureDeltaAsLayer(ctx, '12. LED body segments + tip cap (visible canvas)', 'Per-LED filled rectangles with 4-stop vertical gradient (edge dim → mid → bright center → mid → edge dim), capped with a colored semicircle at the tip using the last lit LED color. Plus optional hotspot dots when diffusion.hotspotVisibility > 0 (trans-white tubes).', cw, ch);

    // Pass 7: Core whiteout (HDR overexposed center — fills middle of
    // blade body AND extends past the last LED with a semicircular cap
    // at the tip so the rounded end matches the body's whiteout band.
    // The tip whiteout used to live in the dedicated Tip Corona pass,
    // which has been folded in here so the entire blade has consistent
    // HDR treatment in one pass.
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

    // Tip whiteout cap — semicircle matching the FULL colored tip cap
    // radius (coreH/2), not the narrower body whiteout band radius
    // (whiteH/2 = 22% of coreH). Real saber tips emit light in all
    // directions (not just radially through the tube), so the rounded
    // tip end is uniformly bright/over-exposed — not just a small
    // white dot in the middle of the rounded cap. Matching the colored
    // cap radius makes the entire rounded tip read as "bright glowing
    // hemisphere" instead of "small white center inside colored ring."
    //
    // The slight discontinuity where the whiteout balloons out from
    // the body band (whiteH wide) to the tip cap (coreH/2 = 2.2× wider
    // radius) is physically reasonable — the tip really is brighter
    // than the body's edges, and bloom softens any visible seam.
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
      const wr = lerpToWhite(tipR, coreWhiteout);
      const wg = lerpToWhite(tipG, coreWhiteout);
      const wb = lerpToWhite(tipB, coreWhiteout);
      ctx.fillStyle = rgbStr(wr, wg, wb, 0.90 * shimmer);
      ctx.beginPath();
      ctx.arc(actualVisibleEnd, bladeYPx, coreH / 2, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }
    captureDeltaAsLayer(ctx, '13. Core whiteout (HDR overexposure + full tip cap)', `Narrower (45% of coreH) stripe of LED color lerped toward white by glow.coreWhiteout (${glow.coreWhiteout}) along the body. At the tip, the whiteout cap matches the FULL colored tip radius (coreH/2) so the entire rounded tip reads as bright glowing hemisphere — like real saber tips that emit in all directions.`, cw, ch);

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
    captureDeltaAsLayer(ctx, '17. Ignition flash burst', `Bright white radial centered at the emitter, decaying quickly via ignitionFlashRef (current value: ${ignitionFlashRef.current.toFixed(3)}). Empty unless mid-ignition.`, cw, ch);

    // ── Phase 4: ambient wash driven by mip 2 buffer luma ──
    // Sample the bloom mip-2 buffer's average green-channel value
    // as a luma proxy. This value tracks the blade's overall
    // brightness automatically — ignitions pulse it, clash flashes
    // spike it, retraction fades it — so the floor / ceiling /
    // ambient-tint / hilt-wash alphas track the blade state without
    // manual `* glow.bloomIntensity` multipliers. Falls back to the
    // prior static formula when mip 2 hasn't been populated yet
    // (first frame before bloom runs).
    //
    // Sampling mip 2 is cheap: at canvas 980×295 dim, mip 2 is
    // ~123×37 = 4500 pixels. getImageData reads ~18 KB/frame.
    let avgBloomLum = 0;
    if (bloomActive && bloomMipsRef.current) {
      const m2 = bloomMipsRef.current.mip2;
      if (m2.width > 0 && m2.height > 0) {
        try {
          const m2Ctx = m2.getContext('2d')!;
          const data = m2Ctx.getImageData(0, 0, m2.width, m2.height).data;
          let sum = 0;
          const count = data.length / 4;
          for (let i = 0; i < data.length; i += 4) sum += data[i + 1];
          avgBloomLum = count > 0 ? sum / (count * 255) : 0;
        } catch {
          // Cross-origin-tainted canvas or 0-size — skip coupling.
          avgBloomLum = 0;
        }
      }
    }
    // Publish to ref for downstream wash + tint passes.
    avgBloomLumRef.current = avgBloomLum;
    // Coupling coefficient: 0.5 avg luma → back to prior 0.08 alpha.
    const lumaWash = Math.max(0.005, avgBloomLum * 0.18) * (reduceBloom ? 0.4 : 1);

    // Layer 18 (Floor + ceiling wash) removed in v0.14.x pipeline cleanup.
    // The wash was a vertical gradient above + below the blade body that
    // produced a "lit floor / lit ceiling" effect — but it stopped at the
    // blade tip horizontally, leaving the tip with no surrounding glow.
    // Bumping the bloom mip alphas (above) replaces the missing brightness
    // with a more uniform halo that wraps the blade including its tip.
    // `lumaWash` stays computed because Layer 19 (background tint) and
    // Layer 20 (hilt wash, when re-enabled) read avgBloomLum directly.
    void lumaWash;

    // ── Background ambient tint (blade color bleeds into dark background) ──
    if (activeCount > 0) {
      ctx.fillStyle = rgbStr(satR, satG, satB, Math.max(0.003, avgBloomLum * 0.04) * (reduceBloom ? 0.4 : 1));
      ctx.fillRect(0, 0, cw, ch);
    }
    captureDeltaAsLayer(ctx, '19. Background ambient tint', `Full-canvas color tint at α=${(Math.max(0.003, avgBloomLum * 0.04) * (reduceBloom ? 0.4 : 1)).toFixed(4)}. Pulls the dark surroundings toward the blade hue.`, cw, ch);

    // Layer 20 (Hilt illumination wash) removed in v0.14.x pipeline
    // cleanup. The softened bloom threshold (1.4 → 1.15) now bleeds onto
    // the hilt naturally via additive blending, replacing the explicit
    // directional wash. Keeps `bladeColor` available for any future
    // hilt-coupled effect without a stale `unused-var` warning.
    void bladeColor;
  }, [brightness, drawHilt, getOffscreen, getScale, getBladeStartPx, getBladeCenterY, stripType, diffusionType, bladeDiameter, bladeLength, theme, reduceBloom, reducedMotion, captureBufferAsLayer, captureDeltaAsLayer]);

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
    const bladeStartPx = getBladeStartPx();
    const scaledBladeLenDS = BLADE_LEN * (bladeLength / MAX_BLADE_INCHES);
    const bladeLenPx = scaledBladeLenDS * scale;
    const bladeYPx = getBladeCenterY();
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
  }, [brightness, drawHilt, getScale, getBladeStartPx, getBladeCenterY, stripType, bladeLength]);

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
      const emitterX = getBladeStartPx();
      const bladeY = getBladeCenterY();
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
  }, [drawBladePhotorealistic, drawBladePixelView, renderMode, topology, brightness, getScale, getBladeStartPx, getBladeCenterY]);

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
    // Phase 1.5i: suppress the "Blade View" label in default mode —
    // the BLADE PREVIEW panel header above the canvas already names
    // the region. Keep the label for the less-common angle / strip /
    // cross modes where the user might benefit from the hint.
    if (mode === 'blade') return;
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

  // ─── Edit Mode overlay ───
  // Drawn last in the vertical-mode render pipeline when uiStore.editMode is
  // on. Shows a caret on the blade at the current config.lockupPosition plus a
  // ghost caret tracking the pointer during hover. Both are drawn in canvas
  // device-pixel coords using the geometry captured in bladeHitRef during
  // render (we can't reverse-engineer the rotation transform after the fact).
  const drawEditModeOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, hit: typeof bladeHitRef.current) => {
      if (!hit) return;
      const { dpr } = sizeRef.current;
      const cfg = useBladeStore.getState().config;

      const markerOffset = 16 * dpr; // distance to the side of the blade
      // Position a caret at `position` (0..1 along blade) with a given opacity.
      const drawCaret = (
        position: number,
        opacity: number,
        showLabel: boolean,
      ) => {
        const t = Math.max(0, Math.min(1, position));
        const x = hit.hiltX + (hit.tipX - hit.hiltX) * t;
        const y = hit.hiltY + (hit.tipY - hit.hiltY) * t;

        // Caret glyph — small triangle pointing at the blade, drawn next to it.
        const side = hit.thicknessTolerance * 0.35 + markerOffset;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = 'rgba(0, 200, 255, 1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(x + side, y);
        ctx.lineTo(x + side + 8 * dpr, y - 5 * dpr);
        ctx.lineTo(x + side + 8 * dpr, y + 5 * dpr);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (showLabel) {
          ctx.globalAlpha = opacity;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = `${10 * dpr}px monospace`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const pct = Math.round(t * 100);
          ctx.fillText(`${pct}%`, x + side + 12 * dpr, y);
        }
        ctx.restore();
      };

      // Blast position marker (if set) — a subtle secondary caret without
      // radius brackets (blast has no radius). Drawn under the blade,
      // slightly lower than the lockup caret so they don't overlap.
      if (typeof cfg.blastPosition === 'number') {
        const t = cfg.blastPosition;
        const x = hit.hiltX + (hit.tipX - hit.hiltX) * t;
        const y = hit.hiltY + (hit.tipY - hit.hiltY) * t;
        const side = hit.thicknessTolerance * 0.35 + markerOffset + 16 * dpr;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 180, 90, 0.95)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(x + side, y);
        ctx.lineTo(x + side + 6 * dpr, y - 4 * dpr);
        ctx.lineTo(x + side + 6 * dpr, y + 4 * dpr);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${9 * dpr}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`blast ${Math.round(t * 100)}%`, x + side + 10 * dpr, y);
        ctx.restore();
      }

      // Radius bracket at the committed lockup position.
      if (typeof cfg.lockupPosition === 'number') {
        const r = cfg.lockupRadius ?? 0.12;
        const t = cfg.lockupPosition;
        const t0 = Math.max(0, t - r / 2);
        const t1 = Math.min(1, t + r / 2);
        const x0 = hit.hiltX + (hit.tipX - hit.hiltX) * t0;
        const y0 = hit.hiltY + (hit.tipY - hit.hiltY) * t0;
        const x1 = hit.hiltX + (hit.tipX - hit.hiltX) * t1;
        const y1 = hit.hiltY + (hit.tipY - hit.hiltY) * t1;
        const side = hit.thicknessTolerance * 0.35 + markerOffset;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.55)';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(x0 + side, y0);
        ctx.lineTo(x1 + side, y1);
        ctx.stroke();
        // End caps
        ctx.beginPath();
        ctx.moveTo(x0 + side - 3 * dpr, y0);
        ctx.lineTo(x0 + side + 3 * dpr, y0);
        ctx.moveTo(x1 + side - 3 * dpr, y1);
        ctx.lineTo(x1 + side + 3 * dpr, y1);
        ctx.stroke();
        ctx.restore();

        drawCaret(t, 1, true);
      }

      // Ghost caret tracking the pointer.
      const hover = hoverPosRef.current;
      if (typeof hover === 'number' && hover !== cfg.lockupPosition) {
        drawCaret(hover, 0.45, false);
      }
    },
    [],
  );

  // ─── Inline Pixel Strip (always visible, docked to bottom area) ───
  const drawInlineStrip = useCallback((ctx: CanvasRenderingContext2D, engine: BladeEngine) => {
    const pixels = engine.getPixels();
    const bufferLeds = Math.floor(pixels.length / 3);
    const ledCount = Math.min(config.ledCount, bufferLeds);
    if (ledCount <= 0) return;

    const scale = getScale(); // auto-fit scale — strip tracks blade
    const bri = brightness / 100;

    // Design-space coordinates, scaled uniformly with blade
    const stripTop = layoutRef.current.stripY * scale;
    const stripH = 16 * scale;
    const graphLeft = getBladeStartPx();
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
  }, [config.ledCount, getScale, getBladeStartPx, brightness, bladeLength, theme]);

  // ─── RGB Line Graph (docked to bottom) ───
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
    const graphLeft = getBladeStartPx();
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
  }, [config.ledCount, getScale, getBladeStartPx, bladeLength, theme]);

  // ─── Vertical Pixel Strip (native screen-space, bottom → top) ───
  const drawVerticalStrip = useCallback((
    ctx: CanvasRenderingContext2D,
    engine: BladeEngine,
    topY: number,
    bottomY: number,
    startX: number,
    stripW: number,
  ) => {
    const pixels = engine.getPixels();
    const bufferLeds = Math.floor(pixels.length / 3);
    const ledCount = Math.min(config.ledCount, bufferLeds);
    if (ledCount <= 0) return;

    const { dpr } = sizeRef.current;
    const bri = brightness / 100;
    const stripH = bottomY - topY;
    const cellH = stripH / ledCount;

    // Background panel
    const pad = 3 * dpr;
    ctx.fillStyle = theme.stripBg;
    ctx.fillRect(startX - pad, topY - pad, stripW + pad * 2, stripH + pad * 2);
    ctx.strokeStyle = theme.stripBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX - pad, topY - pad, stripW + pad * 2, stripH + pad * 2);

    // LED pixels — LED 0 at bottom, last LED at top
    for (let i = 0; i < ledCount; i++) {
      const r = (pixels[i * 3] ?? 0) * bri;
      const g = (pixels[i * 3 + 1] ?? 0) * bri;
      const b = (pixels[i * 3 + 2] ?? 0) * bri;
      const y = bottomY - (i + 1) * cellH;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(startX, y, stripW, Math.max(cellH - 0.3, 0.5));
    }

    // "PIXEL" label rotated along left edge
    ctx.save();
    ctx.translate(startX - pad - 2 * dpr, bottomY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `${7 * dpr}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('PIXEL', 4 * dpr, 0);
    ctx.restore();

    // LED index labels every 24 LEDs (to the right of strip)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = `${7 * dpr}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < ledCount; i += 24) {
      const y = bottomY - (i + 0.5) * cellH;
      ctx.fillText(String(i), startX + stripW + 4 * dpr, y);
    }
    ctx.textBaseline = 'alphabetic';
  }, [config.ledCount, brightness, theme]);

  // ─── Vertical RGB Line Graph (native screen-space, bottom → top) ───
  const drawVerticalRGBGraph = useCallback((
    ctx: CanvasRenderingContext2D,
    engine: BladeEngine,
    topY: number,
    bottomY: number,
    startX: number,
    graphW: number,
  ) => {
    const pixels = engine.getPixels();
    const bufferLeds = Math.floor(pixels.length / 3);
    const ledCount = Math.min(config.ledCount, bufferLeds);
    if (ledCount <= 0) return;

    const { dpr } = sizeRef.current;
    const graphH = bottomY - topY;

    // Background panel
    const pad = 4 * dpr;
    ctx.fillStyle = theme.graphBg;
    ctx.fillRect(startX - pad, topY - pad, graphW + pad * 2, graphH + pad * 2);
    ctx.strokeStyle = theme.graphBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX - pad, topY - pad, graphW + pad * 2, graphH + pad * 2);

    // Reserve bottom for value labels
    const labelH = 14 * dpr;
    const innerTop = topY;
    const innerBottom = bottomY - labelH;
    const innerH = innerBottom - innerTop;
    if (innerH <= 0) return;

    // Vertical grid lines at value marks (X axis = 0–255)
    ctx.lineWidth = 0.5 * dpr;
    ctx.font = `${7 * dpr}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const val of [0, 64, 128, 192, 255]) {
      const gx = startX + (val / 255) * graphW;
      if (val > 0 && val < 255) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.beginPath();
        ctx.moveTo(gx, innerTop);
        ctx.lineTo(gx, innerBottom);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
      ctx.fillText(String(val), gx, innerBottom + 2 * dpr);
    }
    ctx.textBaseline = 'alphabetic';

    // Horizontal guide lines (Y = LED position fractions)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5 * dpr;
    for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
      const y = innerBottom - frac * innerH;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + graphW, y);
      ctx.stroke();
    }

    // R, G, B lines — Y = LED position (bottom → top), X = value
    const channels = [
      { offset: 0, color: 'rgba(255, 60, 60, 0.90)' },
      { offset: 1, color: 'rgba(60, 255, 60, 0.90)' },
      { offset: 2, color: 'rgba(80, 130, 255, 0.90)' },
    ];
    ctx.lineWidth = 1.5 * dpr;
    for (const ch of channels) {
      ctx.strokeStyle = ch.color;
      ctx.beginPath();
      for (let i = 0; i < ledCount; i++) {
        const val = pixels[i * 3 + ch.offset] ?? 0;
        const x = startX + (val / 255) * graphW;
        const y = innerBottom - (i / Math.max(ledCount - 1, 1)) * innerH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // "RGB" label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = `${8 * dpr}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('RGB', startX + 2 * dpr, topY + 12 * dpr);
  }, [config.ledCount, theme]);

  // ─── Main render loop ───
  //
  // W5 (2026-04-22) pause integration:
  //   - Full pause  (isPaused=true, pauseScope='full')    → engine is
  //     frozen; we stop redrawing (last frame stays on canvas).
  //   - Partial pause (isPaused=true, pauseScope='partial') → engine
  //     keeps ticking; we keep drawing so the realistic blade stays
  //     alive while everything else freezes.
  //   - Not paused → run as usual.
  useAnimationFrame((_deltaMs) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    const cw = w * dpr;
    const ch = h * dpr;

    // Engine update + bladeState sync are driven by useBladeEngine's
    // global tick loop (saber-visibility fix 2026-04-18) — not here. That
    // way engine advances correctly even when BladeCanvas isn't mounted
    // (e.g. 3D mode, fullscreen reveal overlay).

    // FPS tracking (draw-rate, kept here because it's paint-time specific)
    const now = performance.now();
    fpsFrames.current.push(now);
    while (fpsFrames.current.length > 0 && fpsFrames.current[0]! < now - 1000) {
      fpsFrames.current.shift();
    }
    useBladeStore.getState().setFps(fpsFrames.current.length);

    ctx.clearRect(0, 0, cw, ch);

    // ── Render-layer debug capture lifecycle (?debug=layers) ──
    // Begin a capture session if the floating "Capture Layers" button
    // was clicked. Each instrumented draw call below contributes one
    // layer; the session is finalized at the bottom of this callback.
    // Zero overhead when not capturing (one ref read).
    if (captureRequestRef.current) {
      captureCollectorRef.current = [];
      captureRequestRef.current = false;
      debugSnapBeforeRef.current = ctx.getImageData(0, 0, cw, ch);
    }

    if (vertical && viewMode === 'blade') {
      // ══════════════════════════════════════════════════
      // ── VERTICAL BLADE MODE ──
      // Blade renders via 90° CCW rotation (hilt at bottom,
      // tip at top). Pixel strip + RGB graph render natively
      // (unrotated) to the right of the blade column.
      // ══════════════════════════���═══════════════════════

      ctx.fillStyle = theme.bgColor;
      ctx.fillRect(0, 0, cw, ch);

      // Panel zone geometry (from resizable store)
      const showDataPanels = !panelMode && !mobileFullscreen && analyzeMode && w > 500;
      const bladeEndX = showDataPanels ? cw * verticalPanelWidths.blade : cw;

      // Rotation geometry — blade length fits canvas height; width never constrains
      const rotatedW = ch;          // design-space W → canvas height
      const rotatedH = bladeEndX;   // design-space H → blade panel width (for centering only)
      const baseScale = rotatedW / DESIGN_W;
      const rScale = baseScale;
      const scaledBladeLenDS = BLADE_LEN * (bladeLength / MAX_BLADE_INCHES);
      const renderedH = layoutRef.current.designH * baseScale;

      // Position blade within its panel: bias toward left (35% of remaining space)
      const centerOffsetY = showDataPanels
        ? Math.max(0, (bladeEndX - renderedH) * 0.35)
        : Math.max(0, (cw - renderedH) / 2);
      // Push hilt slightly toward bottom of screen
      const verticalBias = showDataPanels ? ch * 0.06 : 0;

      // Blade screen-space bounds (for positioning data panels)
      const hiltScreenY = ch - (BLADE_START + panX) * rScale + verticalBias;
      const tipScreenY = ch - (BLADE_START + panX + scaledBladeLenDS) * rScale + verticalBias;

      // Capture blade geometry for Edit Mode hit-testing.
      // In vertical mode the blade's screen X is roughly the left half of
      // `bladeEndX`; we center it on `centerOffsetY + BLADE_CORE_H*scale/2`
      // offset from the rotation frame's origin. After the rotation+translate
      // transform, the blade's screen-space centre X is centerOffsetY (the
      // horizontal axis of the pre-rotation space becomes vertical post-rotation
      // — and vice versa). What matters for click-to-LED is the Y span.
      const bladeScreenX = centerOffsetY + (layoutRef.current.bladeY * baseScale);
      bladeHitRef.current = {
        mode: 'vertical',
        hiltX: bladeScreenX,
        hiltY: hiltScreenY,
        tipX: bladeScreenX,
        tipY: tipScreenY,
        thicknessTolerance: Math.max(24 * dpr, 40 * baseScale),
      };

      // Apply rotation transform
      const savedSize = { ...sizeRef.current };
      ctx.save();
      ctx.translate(0, ch);
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-verticalBias, centerOffsetY);
      const curDpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: Math.floor(rotatedW / curDpr), h: Math.floor(rotatedH / curDpr), dpr: curDpr };

      // Draw blade + background in rotated space
      drawBackground(ctx);
      captureDeltaAsLayer(ctx, '00. Background — theme fill + grid + rulers', 'Theme background color + (optional) measurement grid + edge rulers. The starting canvas before any blade pixels are drawn.', cw, ch);
      drawBladeView(ctx, engine);

      // Restore rotation and original dimensions
      ctx.restore();
      sizeRef.current = savedSize;

      // Vignette + data panels in native screen space

      if (showDataPanels) {
        const padY = 20 * dpr;
        const topY = Math.max(padY, Math.min(tipScreenY, ch * 0.04));
        const botY = Math.min(ch - padY, Math.max(hiltScreenY, ch * 0.96));

        if (botY - topY > 80 * dpr) {
          // Strip zone (from panel widths)
          const stripZoneStart = cw * verticalPanelWidths.blade;
          const stripZoneEnd = stripZoneStart + cw * verticalPanelWidths.strip;
          const stripPad = 10 * dpr;
          const stripX = stripZoneStart + stripPad;
          const stripW = Math.max(14 * dpr, Math.min(30 * dpr, (stripZoneEnd - stripZoneStart) * 0.5));

          // Graph zone (from panel widths)
          const graphZoneStart = stripZoneEnd;
          const graphPad = 12 * dpr;
          const graphX = graphZoneStart + graphPad;
          const graphW = Math.max(50 * dpr, cw - graphZoneStart - graphPad * 2 - 12 * dpr);

          // Panel divider lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(stripZoneStart, topY - 8 * dpr);
          ctx.lineTo(stripZoneStart, botY + 8 * dpr);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(stripZoneEnd, topY - 8 * dpr);
          ctx.lineTo(stripZoneEnd, botY + 8 * dpr);
          ctx.stroke();

          drawVerticalStrip(ctx, engine, topY, botY, stripX, stripW);
          if (graphW > 50 * dpr) {
            drawVerticalRGBGraph(ctx, engine, topY, botY, graphX, graphW);
          }
        }
      }

      // ── Edit Mode overlay (drawn last so it sits on top of the blade) ──
      const editModeOn = useUIStore.getState().editMode;
      if (editModeOn) {
        drawEditModeOverlay(ctx, bladeHitRef.current);
      }

      if (!mobileFullscreen) drawViewLabel(ctx, viewMode);

    } else {
      // ══════════════════════════════════════════════════
      // ── HORIZONTAL / OTHER VIEW MODES ──
      // ══════════════════════════════════════════════════

      // ── Capture blade geometry for Edit Mode (horizontal + compact) ──
      // Blade runs left→right in this branch (hilt at design-space
      // BLADE_START, tip at BLADE_START+BLADE_LEN*bladeLength scale).
      // Vertical centre is `layoutRef.current.bladeY`, which already
      // accounts for compact mode (60 vs 300). getScale() returns the
      // DPR-adjusted design→screen scale. We compute screen-space
      // coordinates and stash them so pointerToBladePosition (which is
      // mode-agnostic) can project clicks onto the hilt→tip line.
      if (viewMode === 'blade') {
        const scale = getScale();
        const bladeYScreen = getBladeCenterY();
        const hiltXScreen = getBladeStartPx();
        const scaledBladeLenDS = BLADE_LEN * (bladeLength / MAX_BLADE_INCHES);
        const tipXScreen = hiltXScreen + scaledBladeLenDS * scale;
        bladeHitRef.current = {
          mode: 'horizontal',
          hiltX: hiltXScreen,
          hiltY: bladeYScreen,
          tipX: tipXScreen,
          tipY: bladeYScreen,
          thicknessTolerance: Math.max(24 * dpr, 40 * scale),
        };
      } else {
        // Non-blade view modes (angle/strip/cross) don't support Edit Mode.
        bladeHitRef.current = null;
      }

      drawBackground(ctx);
      captureDeltaAsLayer(ctx, '00. Background — theme fill + grid + rulers', 'Theme background color + (optional) measurement grid + edge rulers. The starting canvas before any blade pixels are drawn.', cw, ch);

      switch (viewMode) {
        case 'blade': drawBladeView(ctx, engine); break;
        case 'angle': drawAngleView(ctx, engine); break;
        case 'strip': drawStripView(ctx, engine); break;
        case 'cross': drawCrossSection(ctx, engine); break;
      }


      if (viewMode === 'blade' && !panelMode && !mobileFullscreen && analyzeMode) {
        drawInlineStrip(ctx, engine);
        drawRGBGraph(ctx, engine);
      }

      // Edit Mode caret + radius bracket overlay (blade view only).
      const editModeOn = useUIStore.getState().editMode;
      if (editModeOn && viewMode === 'blade') {
        drawEditModeOverlay(ctx, bladeHitRef.current);
      }

      if (!mobileFullscreen) drawViewLabel(ctx, viewMode);
    }

    // ── Capture-session finalize ──
    // Hand the collected layers to React state so the overlay can render
    // them, then tear down the session ref so subsequent frames are
    // normal renders.
    if (captureCollectorRef.current) {
      const finalCaptures = captureCollectorRef.current;
      captureCollectorRef.current = null;
      debugSnapBeforeRef.current = null;
      setDebugCaptures(finalCaptures);
    }
  }, {
    maxFps: reducedMotion ? 2 : undefined,
    // W5: when `isPaused` is full-scope, every RAF that honors
    // `{enabled:!isPaused}` stops — but BladeCanvas stays always-on in
    // partial-scope pause so the realistic saber keeps rendering.
    enabled: !isPaused || pauseScope === 'partial',
  });

  // ─── Edit Mode click / hover handlers ───
  /**
   * Map a pointer event to a 0..1 blade position using the geometry the
   * render loop captured in `bladeHitRef`. Returns null if:
   *   - Edit Mode is off
   *   - blade geometry hasn't been rendered yet
   *   - the pointer is outside the blade's thickness tolerance band
   */
  const pointerToBladePosition = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): number | null => {
      const canvas = canvasRef.current;
      const hit = bladeHitRef.current;
      if (!canvas || !hit) return null;

      const rect = canvas.getBoundingClientRect();
      const dpr = sizeRef.current.dpr;
      // Screen → canvas DPR space (same space bladeHitRef is recorded in).
      const px = (e.clientX - rect.left) * (canvas.width / rect.width);
      const py = (e.clientY - rect.top) * (canvas.height / rect.height);

      // Project (px, py) onto the line from (hiltX,hiltY) → (tipX,tipY).
      const dx = hit.tipX - hit.hiltX;
      const dy = hit.tipY - hit.hiltY;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1) return null;
      const t = ((px - hit.hiltX) * dx + (py - hit.hiltY) * dy) / lenSq;
      // Distance from the line (perpendicular tolerance).
      const projX = hit.hiltX + dx * t;
      const projY = hit.hiltY + dy * t;
      const perpDist = Math.hypot(px - projX, py - projY);
      if (perpDist > hit.thicknessTolerance) return null;
      // Clamp t into [0, 1]; anything strictly outside is a miss.
      if (t < -0.02 || t > 1.02) return null;
      return Math.max(0, Math.min(1, t));
      // Intentionally ignore dpr here — we're comparing canvas-px to canvas-px.
      void dpr;
    },
    [],
  );

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const ui = useUIStore.getState();
      if (!ui.editMode) return;
      const pos = pointerToBladePosition(e);
      if (pos === null) return;

      if (ui.editTarget === 'blast') {
        updateConfig({ blastPosition: pos });
      } else {
        const prev = useBladeStore.getState().config.lockupRadius;
        updateConfig({
          lockupPosition: pos,
          lockupRadius: prev ?? 0.12,
        });
      }
      playUISound('button-click');
    },
    [pointerToBladePosition, updateConfig],
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!useUIStore.getState().editMode) {
        hoverPosRef.current = null;
        return;
      }
      hoverPosRef.current = pointerToBladePosition(e);
    },
    [pointerToBladePosition],
  );

  const handleCanvasPointerLeave = useCallback(() => {
    hoverPosRef.current = null;
  }, []);

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
        onClick={toggleShowGrid}
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

  return (
    <div className="flex flex-col h-full w-full gap-1.5">
      {/* ── Blade Config Bar (tablet only — desktop uses CanvasToolbar + BladeHardwarePanel;
             phone uses the Design tab's BladeHardwarePanel to reduce crunch) ── */}
      {!mobileFullscreen && <div className="hidden tablet:block desktop:hidden">{configBar}</div>}

      {/* ── Canvas Container ── */}
      {/*
        Phase 1.5c: drop the 200px minHeight when in panelMode (inside
        CanvasLayout). The outer panel already has `min-h-0 overflow-hidden`
        and the expanded-slot / pixel-strip resize handles have their own
        region mins — the old 200px floor was causing the blade canvas to
        overflow its parent when both handles dragged their regions large,
        so the blade visibly shifted out of view. Outside panelMode (the
        standalone mobile `/m` route) keep a small floor of 80px so the
        canvas is still usable at extreme viewport sizes.
      */}
      <div
        ref={containerRef}
        className={`relative flex-1 min-h-0 overflow-hidden ${
          mobileFullscreen
            ? 'rounded-none border-0'
            : panelMode
              ? 'border-0'
              : 'rounded-panel border border-border-subtle'
        }`}
        style={{
          minHeight: mobileFullscreen || panelMode ? undefined : '80px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="blade-canvas absolute inset-0 w-full h-full"
          role="img"
          aria-label="Blade style preview visualizer"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerLeave={handleCanvasPointerLeave}
          style={{
            cursor: editMode ? 'crosshair' : undefined,
          }}
        />
        {/*
          Modular SVG hilt overlay (v0.11.2 Stage 1).
          Right edge approximates BLADE_START / DESIGN_W = 274 / 1200 ≈ 22.8%.
          Pan/zoom-aware alignment is a Stage 3 refinement — this Phase-1
          placement validates the SVG pipeline end-to-end.
        */}
        {SVG_HILT_STYLE_TO_ASSEMBLY[hiltStyle] && showHilt && (
          <div
            className="absolute pointer-events-none flex items-center"
            style={{
              left: 0,
              top: 0,
              bottom: 0,
              width: '22.8%',
              justifyContent: 'flex-end',
              paddingRight: '2px',
            }}
            aria-hidden="true"
          >
            <HiltRenderer
              assemblyId={SVG_HILT_STYLE_TO_ASSEMBLY[hiltStyle]}
              orientation="horizontal"
              longAxisSize={180}
            />
          </div>
        )}
        {/* Zoom controls removed in v0.14.0 — auto-fit is the only scale. */}
        {/* Analyze / Clean mode toggle (hidden in panelMode — panels have their own visibility toggles; hidden in mobileFullscreen so `/m` stays a clean preset browser) */}
        {!panelMode && !mobileFullscreen && (
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
        )}
        {/* Blade length label — hidden in mobileFullscreen to keep the `/m` preset browser clean */}
        {!mobileFullscreen && (
          <div className="absolute top-2 left-2 text-ui-sm text-text-muted/50 font-mono">
            {bladeLength}" blade
          </div>
        )}
        {/* Panel resize handles (vertical analyze mode only — hidden in panelMode) */}
        {!panelMode && vertical && analyzeMode && viewMode === 'blade' && (
          <>
            {/* Blade ↔ Strip handle */}
            <div
              className="absolute top-0 bottom-0 w-[6px] cursor-col-resize z-10 group"
              style={{ left: `${verticalPanelWidths.blade * 100}%`, transform: 'translateX(-50%)' }}
              onPointerDown={(e) => {
                e.preventDefault();
                dragRef.current = { handle: 'blade-strip', startX: e.clientX, startWidths: { ...verticalPanelWidths } };
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
              }}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/10 group-hover:bg-white/30 transition-colors" />
            </div>
            {/* Strip ↔ Graph handle */}
            <div
              className="absolute top-0 bottom-0 w-[6px] cursor-col-resize z-10 group"
              style={{ left: `${(verticalPanelWidths.blade + verticalPanelWidths.strip) * 100}%`, transform: 'translateX(-50%)' }}
              onPointerDown={(e) => {
                e.preventDefault();
                dragRef.current = { handle: 'strip-graph', startX: e.clientX, startWidths: { ...verticalPanelWidths } };
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
              }}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/10 group-hover:bg-white/30 transition-colors" />
            </div>
          </>
        )}
      </div>
      {/* Render-layer debug overlay (?debug=layers) — floating capture button + grid modal. */}
      <BladeLayersDebugOverlay
        enabled={debugLayersEnabled}
        captures={debugCaptures}
        onCapture={() => { captureRequestRef.current = true; }}
        onClear={() => setDebugCaptures(null)}
      />
    </div>
  );
}
