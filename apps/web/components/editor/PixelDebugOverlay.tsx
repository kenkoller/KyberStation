'use client';

/**
 * PixelDebugOverlay
 *
 * Per-pixel debug / inspection layer that mounts on top of the pixel strip or
 * blade canvas area when isDebugMode is active.  Features:
 *
 *   • Hover tooltip  — index, RGB, hex, HSL, mA draw, Star Wars colour name
 *   • Highlight line — 1 px accent line at the hovered pixel position
 *   • Click-to-pin   — persistent info cards anchored to pixel positions
 *   • Tick marks     — index labels every 10 (≤144 LEDs) or 25 pixels
 *   • Range select   — click-drag to aggregate RGB / mA for a range
 *
 * The overlay is pointer-transparent everywhere except interactive elements so
 * the underlying canvas still receives events normally when debug mode is off.
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useVisualizationStore } from '@/stores/visualizationStore';
import { useBladeStore } from '@/stores/bladeStore';
import { getSaberColorName } from '@/lib/saberColorNames';

// ─── Colour math helpers ────────────────────────────────────────────────────

interface HSL { h: number; s: number; l: number }

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rN)      h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6;
    else if (max === gN) h = ((bN - rN) / d + 2) / 6;
    else                 h = ((rN - gN) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Each channel draws up to 20 mA at full brightness (60 mA total per pixel). */
function calcPixelMa(r: number, g: number, b: number): number {
  return ((r + g + b) / 255) * 20;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PixelData {
  index: number;
  r: number;
  g: number;
  b: number;
}

interface DragRange {
  start: number;
  end: number;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

// Tooltip shown at the hovered pixel
interface TooltipProps {
  pixel: PixelData;
  /** Position in px relative to overlay container */
  x: number;
  y: number;
  /** Total container height so we can flip above/below */
  containerH: number;
}

function PixelTooltip({ pixel, x, y, containerH }: TooltipProps) {
  const { r, g, b } = pixel;
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const mA  = calcPixelMa(r, g, b);
  const swName = getSaberColorName(r, g, b);

  // Flip tooltip above cursor if close to the bottom
  const flipUp = y > containerH * 0.75;

  return (
    <div
      role="tooltip"
      aria-live="polite"
      className={[
        'absolute z-50 pointer-events-none select-none',
        'w-44 rounded-lg border border-accent-border/60',
        'bg-bg-deep/95 backdrop-blur-sm shadow-lg shadow-black/50',
        'p-2 transition-none',
      ].join(' ')}
      style={{
        left:   Math.min(x + 12, window.innerWidth - 192),
        top:    flipUp ? y - 140 : y + 14,
        boxShadow: '0 0 10px 0 rgba(0,200,255,0.08), 0 4px 20px 0 rgba(0,0,0,0.6)',
      }}
    >
      {/* Header row — index + swatch */}
      <div className="flex items-center gap-2 mb-1.5 border-b border-white/10 pb-1.5">
        <span
          className="w-4 h-4 rounded-sm flex-shrink-0 border border-white/20"
          style={{ backgroundColor: `rgb(${r},${g},${b})` }}
          aria-hidden="true"
        />
        <span className="text-[10px] font-mono font-semibold text-accent tracking-widest">
          #{pixel.index.toString().padStart(3, '0')}
        </span>
        <span className="ml-auto text-ui-xs font-mono text-text-muted truncate">{hex}</span>
      </div>

      {/* SW name */}
      <p className="text-ui-xs font-cinematic text-amber-400/80 truncate mb-1.5 tracking-wide">
        {swName}
      </p>

      {/* Value grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <DebugRow label="R" value={r.toString()} color="text-red-400" />
        <DebugRow label="G" value={g.toString()} color="text-green-400" />
        <DebugRow label="B" value={b.toString()} color="text-blue-400" />
        <DebugRow label="H" value={`${hsl.h}\u00B0`} />
        <DebugRow label="S" value={`${hsl.s}%`} />
        <DebugRow label="L" value={`${hsl.l}%`} />
        <DebugRow label="mA" value={mA.toFixed(1)} color="text-amber-400" />
      </div>
    </div>
  );
}

interface DebugRowProps {
  label: string;
  value: string;
  color?: string;
}

function DebugRow({ label, value, color = 'text-text-primary' }: DebugRowProps) {
  return (
    <>
      <span className="text-ui-xs font-mono text-text-muted">{label}</span>
      <span className={`text-ui-xs font-mono ${color} tabular-nums`}>{value}</span>
    </>
  );
}

// Persistent pinned pixel card
interface PinnedCardProps {
  pixel: PixelData;
  /** CSS left % of the card anchor on the strip */
  anchorPct: number;
  /** Whether the strip is oriented vertically (true) or horizontally (false) */
  vertical: boolean;
  onUnpin: (index: number) => void;
}

function PinnedCard({ pixel, anchorPct, vertical, onUnpin }: PinnedCardProps) {
  const { r, g, b } = pixel;
  const hex   = rgbToHex(r, g, b);
  const hsl   = rgbToHsl(r, g, b);
  const mA    = calcPixelMa(r, g, b);
  const swName = getSaberColorName(r, g, b);

  // Horizontal layout: cards are positioned as absolute elements above the strip
  // Vertical layout (pixel strip panel): cards are to the right of the strip
  const positionStyle = vertical
    ? { top: `${anchorPct}%`, right: '100%', marginRight: '8px', transform: 'translateY(-50%)' }
    : { left: `${anchorPct}%`, bottom: '100%', marginBottom: '8px', transform: 'translateX(-50%)' };

  return (
    <div
      className={[
        'absolute z-40 select-none',
        'w-40 rounded-lg border border-accent-border/70',
        'bg-bg-deep/95 backdrop-blur-sm shadow-lg shadow-black/60',
        'p-2 text-ui-xs font-mono',
      ].join(' ')}
      style={{
        ...positionStyle,
        boxShadow: '0 0 8px 0 rgba(0,200,255,0.12), 0 4px 16px 0 rgba(0,0,0,0.7)',
      }}
    >
      {/* Title row */}
      <div className="flex items-center gap-1.5 mb-1.5 border-b border-white/10 pb-1.5">
        <span
          className="w-3.5 h-3.5 rounded-sm border border-white/20 flex-shrink-0"
          style={{ backgroundColor: `rgb(${r},${g},${b})` }}
          aria-hidden="true"
        />
        <span className="font-semibold text-accent tracking-widest">
          #{pixel.index.toString().padStart(3, '0')}
        </span>
        <span className="ml-auto text-text-muted">{hex}</span>
        <button
          onClick={() => onUnpin(pixel.index)}
          aria-label={`Unpin pixel ${pixel.index}`}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 text-text-muted hover:text-red-400 transition-colors ml-0.5"
        >
          <span aria-hidden="true" className="text-[10px] leading-none">&times;</span>
        </button>
      </div>

      {/* SW name */}
      <p className="text-ui-xs font-cinematic text-amber-400/70 truncate mb-1.5">
        {swName}
      </p>

      {/* Values */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <DebugRow label="R"  value={r.toString()}         color="text-red-400" />
        <DebugRow label="G"  value={g.toString()}         color="text-green-400" />
        <DebugRow label="B"  value={b.toString()}         color="text-blue-400" />
        <DebugRow label="H"  value={`${hsl.h}\u00B0`} />
        <DebugRow label="S"  value={`${hsl.s}%`} />
        <DebugRow label="L"  value={`${hsl.l}%`} />
        <DebugRow label="mA" value={mA.toFixed(1)} color="text-amber-400" />
      </div>

      {/* Connector line — rendered as a thin accent border pseudo-element via inline style */}
      <div
        aria-hidden="true"
        className="absolute bg-accent/40"
        style={vertical
          ? { right: '-8px', top: '50%', width: '8px', height: '1px' }
          : { left: '50%', bottom: '-8px', width: '1px', height: '8px' }
        }
      />
    </div>
  );
}

// Range selection stats bar
interface RangeStatsProps {
  pixels: PixelData[];
}

function RangeStats({ pixels }: RangeStatsProps) {
  if (pixels.length === 0) return null;

  const count  = pixels.length;
  const avgR   = Math.round(pixels.reduce((s, p) => s + p.r, 0) / count);
  const avgG   = Math.round(pixels.reduce((s, p) => s + p.g, 0) / count);
  const avgB   = Math.round(pixels.reduce((s, p) => s + p.b, 0) / count);
  const totalMa = pixels.reduce((s, p) => s + calcPixelMa(p.r, p.g, p.b), 0);
  const hex    = rgbToHex(avgR, avgG, avgB);

  return (
    <div
      className={[
        'absolute bottom-1 left-1/2 -translate-x-1/2 z-50 pointer-events-none',
        'flex items-center gap-2 px-3 py-1 rounded-full',
        'border border-accent-border/50 bg-bg-deep/95 backdrop-blur-sm',
        'text-ui-xs font-mono text-text-secondary shadow-lg',
      ].join(' ')}
    >
      <span className="text-accent font-semibold">{count} px</span>
      <span aria-hidden="true" className="text-white/20">|</span>
      <span>
        <span className="text-red-400">{avgR}</span>
        <span className="text-white/30">/</span>
        <span className="text-green-400">{avgG}</span>
        <span className="text-white/30">/</span>
        <span className="text-blue-400">{avgB}</span>
      </span>
      <span className="text-text-muted">{hex}</span>
      <span aria-hidden="true" className="text-white/20">|</span>
      <span className="text-amber-400">{totalMa.toFixed(1)} mA</span>
    </div>
  );
}

// ─── Main overlay ────────────────────────────────────────────────────────────

export interface PixelDebugOverlayProps {
  /**
   * A function that maps a pixel index to its current RGB values.
   * This decouples the overlay from any specific engine reference — the
   * parent (PixelStripPanel, BladeCanvas, etc.) provides the getter.
   */
  getPixelRgb: (index: number) => { r: number; g: number; b: number };
  /**
   * Whether the strip is oriented vertically (default true — pixel strip bar)
   * or horizontally (false — blade canvas drawn horizontally).
   */
  vertical?: boolean;
  /** Additional CSS classes for the root overlay div */
  className?: string;
}

export function PixelDebugOverlay({
  getPixelRgb,
  vertical = true,
  className = '',
}: PixelDebugOverlayProps) {
  const isDebugMode    = useVisualizationStore((s) => s.isDebugMode);
  const hoveredPixel   = useVisualizationStore((s) => s.hoveredPixel);
  const pinnedPixels   = useVisualizationStore((s) => s.pinnedPixels);
  const setHoveredPixel = useVisualizationStore((s) => s.setHoveredPixel);
  const pinPixel       = useVisualizationStore((s) => s.pinPixel);
  const unpinPixel     = useVisualizationStore((s) => s.unpinPixel);
  const ledCount       = useBladeStore((s) => s.config.ledCount);

  const overlayRef     = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos]   = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Drag range state
  const isDraggingRef  = useRef(false);
  const [dragRange, setDragRange]   = useState<DragRange | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // ── Resize observer ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Pixel index from cursor position ─────────────────────────────────────
  /**
   * Returns a pixel index [0, ledCount) given a clientX/clientY position
   * relative to the overlay element. Returns null if out of bounds.
   *
   * For vertical strips: LED 0 is at the bottom, last LED at top
   * (matches PixelStripPanel's rendering convention).
   * For horizontal strips: LED 0 is at the left.
   */
  const pixelIndexFromPos = useCallback(
    (relX: number, relY: number): number | null => {
      const { w, h } = containerSize;
      if (w <= 0 || h <= 0 || ledCount <= 0) return null;

      let ratio: number;
      if (vertical) {
        // relY = 0 is the top (last LED), relY = h is the bottom (LED 0)
        ratio = 1 - relY / h;
      } else {
        ratio = relX / w;
      }

      const idx = Math.floor(ratio * ledCount);
      if (idx < 0 || idx >= ledCount) return null;
      return idx;
    },
    [containerSize, ledCount, vertical],
  );

  // Convert pixel index to a percentage position along the strip axis
  const pixelToAnchorPct = useCallback(
    (index: number): number => {
      if (ledCount <= 0) return 0;
      if (vertical) {
        // Top = last LED.  Position from top = (ledCount - 1 - index) / (ledCount - 1)
        return ((ledCount - 1 - index) / Math.max(ledCount - 1, 1)) * 100;
      }
      return (index / Math.max(ledCount - 1, 1)) * 100;
    },
    [ledCount, vertical],
  );

  // Relative cursor position from a mouse event
  const relativePos = useCallback(
    (e: { clientX: number; clientY: number }): { x: number; y: number } => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [],
  );

  // ── Event handlers ───────────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!isDebugMode) return;
      const pos = relativePos(e.nativeEvent);
      setCursorPos(pos);
      const idx = pixelIndexFromPos(pos.x, pos.y);
      setHoveredPixel(idx);

      // Extend drag range if active
      if (isDraggingRef.current && dragRange && idx !== null) {
        setDragRange({ start: dragRange.start, end: idx });
      }
    },
    [isDebugMode, relativePos, pixelIndexFromPos, setHoveredPixel, dragRange],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPixel(null);
  }, [setHoveredPixel]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDebugMode) return;
      const pos = relativePos(e.nativeEvent);
      const idx = pixelIndexFromPos(pos.x, pos.y);
      if (idx === null) return;
      isDraggingRef.current = true;
      setDragRange({ start: idx, end: idx });
      setIsSelectingRange(false);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isDebugMode, relativePos, pixelIndexFromPos],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !isDebugMode) return;
      const pos = relativePos(e.nativeEvent);
      const idx = pixelIndexFromPos(pos.x, pos.y);
      if (idx === null) return;
      setDragRange((prev) => {
        if (!prev) return prev;
        const isRange = Math.abs(idx - prev.start) >= 1;
        if (isRange) setIsSelectingRange(true);
        return { start: prev.start, end: idx };
      });
    },
    [isDebugMode, relativePos, pixelIndexFromPos],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDebugMode) return;
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const pos = relativePos(e.nativeEvent);
      const idx = pixelIndexFromPos(pos.x, pos.y);

      // If it was a single click (no drag), toggle pin
      if (!isSelectingRange && idx !== null) {
        if (pinnedPixels.includes(idx)) {
          unpinPixel(idx);
        } else {
          pinPixel(idx);
        }
        setDragRange(null);
      }
      // Otherwise keep the range selection visible
    },
    [
      isDebugMode, relativePos, pixelIndexFromPos,
      isSelectingRange, pinnedPixels, pinPixel, unpinPixel,
    ],
  );

  // Dismiss range selection on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDragRange(null);
        setIsSelectingRange(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────

  // Build hovered pixel data
  const hoveredData: PixelData | null = hoveredPixel !== null
    ? { index: hoveredPixel, ...getPixelRgb(hoveredPixel) }
    : null;

  // Build pinned pixel data
  const pinnedData: PixelData[] = pinnedPixels.map((idx) => ({
    index: idx,
    ...getPixelRgb(idx),
  }));

  // Build range pixel data for aggregate stats
  const rangePixels: PixelData[] = (() => {
    if (!dragRange || !isSelectingRange) return [];
    const lo = Math.min(dragRange.start, dragRange.end);
    const hi = Math.max(dragRange.start, dragRange.end);
    const result: PixelData[] = [];
    for (let i = lo; i <= hi; i++) {
      result.push({ index: i, ...getPixelRgb(i) });
    }
    return result;
  })();

  // Tick interval
  const tickInterval = ledCount > 144 ? 25 : 10;

  // ── Render ───────────────────────────────────────────────────────────────

  if (!isDebugMode) {
    return (
      <div
        ref={overlayRef}
        className={`absolute inset-0 pointer-events-none ${className}`}
        aria-hidden="true"
      />
    );
  }

  // Highlight line position
  const highlightPos = hoveredPixel !== null
    ? pixelToAnchorPct(hoveredPixel) + '%'
    : null;

  // Range selection highlight bounds
  const rangeHighlight = (dragRange && isSelectingRange)
    ? {
        lo: Math.min(dragRange.start, dragRange.end),
        hi: Math.max(dragRange.start, dragRange.end),
      }
    : null;

  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 ${className}`}
      style={{ cursor: isDebugMode ? 'crosshair' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      aria-label="Pixel debug overlay — hover to inspect, click to pin"
      role="region"
    >
      {/* ── Hover highlight line ────────────────────────────────────────── */}
      {highlightPos && (
        <div
          aria-hidden="true"
          className="absolute pointer-events-none z-20"
          style={vertical
            ? {
                top:    highlightPos,
                left:   0,
                right:  0,
                height: '1px',
                background: 'rgba(0,200,255,0.85)',
                boxShadow: '0 0 4px 2px rgba(0,200,255,0.40)',
              }
            : {
                left:   highlightPos,
                top:    0,
                bottom: 0,
                width:  '1px',
                background: 'rgba(0,200,255,0.85)',
                boxShadow: '0 0 4px 2px rgba(0,200,255,0.40)',
              }
          }
        />
      )}

      {/* ── Range selection highlight band ──────────────────────────────── */}
      {rangeHighlight && (
        <div
          aria-hidden="true"
          className="absolute pointer-events-none z-10"
          style={vertical
            ? {
                top:    pixelToAnchorPct(rangeHighlight.hi) + '%',
                height: (pixelToAnchorPct(rangeHighlight.lo) - pixelToAnchorPct(rangeHighlight.hi)) + '%',
                left:   0,
                right:  0,
                background: 'rgba(0,200,255,0.10)',
                borderTop:    '1px solid rgba(0,200,255,0.35)',
                borderBottom: '1px solid rgba(0,200,255,0.35)',
              }
            : {
                left:   pixelToAnchorPct(rangeHighlight.lo) + '%',
                width:  (pixelToAnchorPct(rangeHighlight.hi) - pixelToAnchorPct(rangeHighlight.lo)) + '%',
                top:    0,
                bottom: 0,
                background: 'rgba(0,200,255,0.10)',
                borderLeft:  '1px solid rgba(0,200,255,0.35)',
                borderRight: '1px solid rgba(0,200,255,0.35)',
              }
          }
        />
      )}

      {/* ── Tick marks ──────────────────────────────────────────────────── */}
      <TickMarks
        ledCount={ledCount}
        interval={tickInterval}
        vertical={vertical}
        pixelToAnchorPct={pixelToAnchorPct}
        hoveredPixel={hoveredPixel}
      />

      {/* ── Pinned pixel cards ───────────────────────────────────────────── */}
      {pinnedData.map((pd) => (
        <PinnedCard
          key={pd.index}
          pixel={pd}
          anchorPct={pixelToAnchorPct(pd.index)}
          vertical={vertical}
          onUnpin={unpinPixel}
        />
      ))}

      {/* ── Hover tooltip ────────────────────────────────────────────────── */}
      {hoveredData && !isDraggingRef.current && (
        <PixelTooltip
          pixel={hoveredData}
          x={cursorPos.x}
          y={cursorPos.y}
          containerH={containerSize.h}
        />
      )}

      {/* ── Range selection stats ────────────────────────────────────────── */}
      {rangePixels.length > 0 && (
        <RangeStats pixels={rangePixels} />
      )}
    </div>
  );
}

// ─── TickMarks sub-component ─────────────────────────────────────────────────

interface TickMarksProps {
  ledCount:         number;
  interval:         number;
  vertical:         boolean;
  pixelToAnchorPct: (index: number) => number;
  hoveredPixel:     number | null;
}

function TickMarks({ ledCount, interval, vertical, pixelToAnchorPct, hoveredPixel }: TickMarksProps) {
  const ticks: number[] = [];
  for (let i = 0; i < ledCount; i += interval) {
    ticks.push(i);
  }
  // Always include last LED if not already in ticks
  if (ticks[ticks.length - 1] !== ledCount - 1) {
    ticks.push(ledCount - 1);
  }

  return (
    <>
      {ticks.map((idx) => {
        const pct = pixelToAnchorPct(idx);
        const isHovered = idx === hoveredPixel;

        return vertical ? (
          // Vertical strip: tick marks on the right edge, labels to the right
          <div
            key={idx}
            aria-hidden="true"
            className="absolute pointer-events-none flex items-center"
            style={{ top: `${pct}%`, right: 0, transform: 'translateY(-50%)' }}
          >
            <div
              className="flex-shrink-0"
              style={{
                width:  '4px',
                height: '1px',
                background: isHovered ? 'rgba(0,200,255,0.9)' : 'rgba(255,255,255,0.20)',
              }}
            />
            <span
              className="ml-0.5 leading-none"
              style={{
                fontSize:    '7px',
                fontFamily:  'var(--font-jetbrains-mono), JetBrains Mono, Fira Code, monospace',
                color:       isHovered ? 'rgba(0,200,255,0.9)' : 'rgba(255,255,255,0.25)',
                letterSpacing: '0.02em',
              }}
            >
              {idx}
            </span>
          </div>
        ) : (
          // Horizontal strip: tick marks on the bottom edge
          <div
            key={idx}
            aria-hidden="true"
            className="absolute pointer-events-none flex flex-col items-center"
            style={{ left: `${pct}%`, bottom: 0, transform: 'translateX(-50%)' }}
          >
            <div
              className="flex-shrink-0"
              style={{
                height: '4px',
                width:  '1px',
                background: isHovered ? 'rgba(0,200,255,0.9)' : 'rgba(255,255,255,0.20)',
              }}
            />
            <span
              className="mt-0.5 leading-none"
              style={{
                fontSize:    '7px',
                fontFamily:  'var(--font-jetbrains-mono), JetBrains Mono, Fira Code, monospace',
                color:       isHovered ? 'rgba(0,200,255,0.9)' : 'rgba(255,255,255,0.25)',
                letterSpacing: '0.02em',
              }}
            >
              {idx}
            </span>
          </div>
        );
      })}
    </>
  );
}
