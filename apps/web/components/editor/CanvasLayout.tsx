'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BladeEngine } from '@bladeforge/engine';
import { useUIStore } from '@/stores/uiStore';
import { BladeCanvas } from './BladeCanvas';
import { PixelStripPanel } from './PixelStripPanel';
import { RGBGraphPanel } from './RGBGraphPanel';

// ─── Constants ───

/** Minimum panel ratios (sum must leave room for all three) */
const MIN_BLADE = 0.20;
const MIN_STRIP = 0.05;
const MIN_GRAPH = 0.10;

/** Breakpoint (px) below which panels stack vertically */
const VERTICAL_BREAKPOINT = 768;

interface CanvasLayoutProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
}

/**
 * Clamp panel widths so every visible panel meets its minimum and the sum is 1.0.
 * Returns a new widths object (never mutates the input).
 */
function clampWidths(
  blade: number,
  strip: number,
  graph: number,
): { blade: number; strip: number; graph: number } {
  // Enforce individual minimums
  blade = Math.max(MIN_BLADE, blade);
  strip = Math.max(MIN_STRIP, strip);
  graph = Math.max(MIN_GRAPH, graph);

  // If they exceed 1.0, proportionally shrink the largest panels back down
  const total = blade + strip + graph;
  if (total > 1) {
    blade /= total;
    strip /= total;
    graph /= total;
  }

  // If they're under 1.0 due to clamping, give the surplus to graph (most flexible)
  const remainder = 1 - blade - strip - graph;
  if (remainder > 0.001) {
    graph += remainder;
  }

  return { blade, strip, graph };
}

/**
 * CanvasLayout — three-panel container for blade visualization.
 *
 * Arranges BladePanel, PixelStripPanel, and RGBGraphPanel horizontally
 * with resizable drag handles between them. At narrow widths (< 768px
 * container width) the panels stack vertically instead, with height
 * ratios matching the stored width ratios.
 */
export function CanvasLayout({ engineRef }: CanvasLayoutProps) {
  const verticalPanelWidths = useUIStore((s) => s.verticalPanelWidths);
  const setVerticalPanelWidths = useUIStore((s) => s.setVerticalPanelWidths);
  const showBladePanel = useUIStore((s) => s.showBladePanel);
  const showPixelPanel = useUIStore((s) => s.showPixelPanel);
  const showGraphPanel = useUIStore((s) => s.showGraphPanel);
  const showHilt = useUIStore((s) => s.showHilt);
  const toggleBladePanel = useUIStore((s) => s.toggleBladePanel);
  const togglePixelPanel = useUIStore((s) => s.togglePixelPanel);
  const toggleGraphPanel = useUIStore((s) => s.toggleGraphPanel);
  const toggleShowHilt = useUIStore((s) => s.toggleShowHilt);
  const animationPaused = useUIStore((s) => s.animationPaused);
  const toggleAnimationPaused = useUIStore((s) => s.toggleAnimationPaused);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isVertical, setIsVertical] = useState(false);
  const dragRef = useRef<{
    handle: 'blade-pixel' | 'pixel-graph';
    startPos: number; // clientX (horizontal) or clientY (vertical)
    startWidths: { blade: number; strip: number; graph: number };
  } | null>(null);

  // ─── Responsive: observe container width for vertical stacking ───
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setIsVertical(width < VERTICAL_BREAKPOINT);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Count visible panels for proportional layout
  const visiblePanels = [showBladePanel, showPixelPanel, showGraphPanel].filter(Boolean).length;

  // Compute effective widths — redistribute hidden panel space proportionally
  const getEffectiveWidths = useCallback(() => {
    if (visiblePanels === 0) return { blade: 1, strip: 0, graph: 0 };

    let blade = showBladePanel ? verticalPanelWidths.blade : 0;
    let strip = showPixelPanel ? verticalPanelWidths.strip : 0;
    let graph = showGraphPanel ? verticalPanelWidths.graph : 0;

    // Normalize to fill available space
    const total = blade + strip + graph;
    if (total > 0) {
      blade /= total;
      strip /= total;
      graph /= total;
    }

    return { blade, strip, graph };
  }, [showBladePanel, showPixelPanel, showGraphPanel, verticalPanelWidths, visiblePanels]);

  // ─── Drag handle resize ───
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Use the appropriate axis depending on layout direction
      const extent = isVertical ? rect.height : rect.width;
      const clientPos = isVertical ? e.clientY : e.clientX;
      const deltaRatio = (clientPos - dragRef.current.startPos) / extent;
      const sw = dragRef.current.startWidths;

      if (dragRef.current.handle === 'blade-pixel') {
        // Blade grows/shrinks; strip+graph absorb the change proportionally
        const rawBlade = sw.blade + deltaRatio;
        const consumed = rawBlade - sw.blade;

        const dataTotal = sw.strip + sw.graph;
        if (dataTotal > 0) {
          const ratio = sw.strip / dataTotal;
          const rawStrip = sw.strip - consumed * ratio;
          const rawGraph = sw.graph - consumed * (1 - ratio);
          setVerticalPanelWidths(clampWidths(rawBlade, rawStrip, rawGraph));
        }
      } else {
        // pixel-graph handle: blade stays fixed, strip ↔ graph
        const rawStrip = sw.strip + deltaRatio;
        const rawGraph = sw.graph - deltaRatio;
        setVerticalPanelWidths(clampWidths(sw.blade, rawStrip, rawGraph));
      }
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [setVerticalPanelWidths, isVertical]);

  const startDrag = useCallback(
    (handle: 'blade-pixel' | 'pixel-graph', e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current = {
        handle,
        startPos: isVertical ? e.clientY : e.clientX,
        startWidths: { ...verticalPanelWidths },
      };
      document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [isVertical, verticalPanelWidths],
  );

  const ew = getEffectiveWidths();

  // Choose flex direction and size property based on layout mode
  const containerClass = isVertical
    ? 'flex flex-col h-full w-full gap-0 overflow-hidden rounded-panel border border-border-subtle'
    : 'flex h-full w-full gap-0 overflow-hidden rounded-panel border border-border-subtle';

  const panelSizeStyle = (ratio: number) =>
    isVertical ? { height: `${ratio * 100}%` } : { width: `${ratio * 100}%` };

  return (
    <div ref={containerRef} className={containerClass}>
      {/* ── Blade Panel ── */}
      {showBladePanel && (
        <div
          className="flex flex-col min-w-0 min-h-0 overflow-hidden relative"
          style={panelSizeStyle(ew.blade)}
        >
          <PanelHeader
            title="Blade Preview"
            onToggle={toggleBladePanel}
          >
            <button
              onClick={toggleAnimationPaused}
              className={`text-ui-xs px-1.5 py-0.5 rounded transition-colors ${
                animationPaused
                  ? 'text-yellow-400 bg-yellow-900/20'
                  : 'text-text-muted/40 hover:text-text-muted'
              }`}
              aria-label={animationPaused ? 'Resume animation' : 'Pause animation'}
              title={animationPaused ? 'Resume' : 'Pause'}
            >
              {animationPaused ? 'Paused' : 'Pause'}
            </button>
            <button
              onClick={toggleShowHilt}
              className={`text-ui-xs px-1.5 py-0.5 rounded transition-colors ${
                showHilt
                  ? 'text-accent/70 bg-accent/10'
                  : 'text-text-muted/40 hover:text-text-muted'
              }`}
              aria-label={showHilt ? 'Hide hilt' : 'Show hilt'}
              title={showHilt ? 'Hide hilt' : 'Show hilt'}
            >
              Hilt
            </button>
          </PanelHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <BladeCanvas engineRef={engineRef} vertical renderMode="photorealistic" panelMode />
          </div>
        </div>
      )}

      {/* Blade ↔ Pixel handle */}
      {showBladePanel && showPixelPanel && (
        <ResizeHandle
          direction={isVertical ? 'horizontal' : 'vertical'}
          onPointerDown={(e) => startDrag('blade-pixel', e)}
        />
      )}

      {/* ── Pixel Strip Panel ── */}
      {showPixelPanel && (
        <div
          className="flex flex-col min-w-0 min-h-0 overflow-hidden relative"
          style={panelSizeStyle(ew.strip)}
        >
          <PanelHeader
            title="Pixel Strip"
            onToggle={togglePixelPanel}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <PixelStripPanel engineRef={engineRef} />
          </div>
        </div>
      )}

      {/* Pixel ↔ Graph handle */}
      {showPixelPanel && showGraphPanel && (
        <ResizeHandle
          direction={isVertical ? 'horizontal' : 'vertical'}
          onPointerDown={(e) => startDrag('pixel-graph', e)}
        />
      )}

      {/* ── RGB Graph Panel ── */}
      {showGraphPanel && (
        <div
          className="flex flex-col min-w-0 min-h-0 overflow-hidden relative"
          style={panelSizeStyle(ew.graph)}
        >
          <PanelHeader
            title="RGB Analysis"
            onToggle={toggleGraphPanel}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <RGBGraphPanel engineRef={engineRef} />
          </div>
        </div>
      )}

      {/* Show hidden panels indicator when panels are hidden */}
      {visiblePanels < 3 && (
        <div className="absolute bottom-2 right-2 flex gap-1 z-10">
          {!showBladePanel && (
            <button onClick={toggleBladePanel} className="text-ui-xs bg-bg-deep/80 border border-border-subtle rounded px-1.5 py-0.5 text-text-muted hover:text-accent transition-colors">
              + Blade
            </button>
          )}
          {!showPixelPanel && (
            <button onClick={togglePixelPanel} className="text-ui-xs bg-bg-deep/80 border border-border-subtle rounded px-1.5 py-0.5 text-text-muted hover:text-accent transition-colors">
              + Pixel
            </button>
          )}
          {!showGraphPanel && (
            <button onClick={toggleGraphPanel} className="text-ui-xs bg-bg-deep/80 border border-border-subtle rounded px-1.5 py-0.5 text-text-muted hover:text-accent transition-colors">
              + RGB
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function PanelHeader({
  title,
  onToggle,
  children,
}: {
  title: string;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1 bg-bg-secondary/80 border-b border-border-subtle shrink-0">
      <span className="text-ui-xs text-text-muted uppercase tracking-wider font-medium select-none">
        {title}
      </span>
      <div className="flex items-center gap-1">
        {children}
        <button
          onClick={onToggle}
          className="text-ui-xs text-text-muted/50 hover:text-text-muted transition-colors px-1"
          aria-label={`Hide ${title} panel`}
          title={`Hide ${title}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * ResizeHandle — drag divider between panels.
 * @param direction - 'vertical' for col-resize (horizontal layout),
 *                    'horizontal' for row-resize (vertical/stacked layout)
 */
function ResizeHandle({
  direction,
  onPointerDown,
}: {
  direction: 'vertical' | 'horizontal';
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  if (direction === 'horizontal') {
    return (
      <div
        className="h-[6px] shrink-0 cursor-row-resize group flex items-center justify-center"
        onPointerDown={onPointerDown}
      >
        <div className="h-[2px] w-full bg-border-subtle group-hover:bg-accent/40 transition-colors" />
      </div>
    );
  }
  return (
    <div
      className="w-[6px] shrink-0 cursor-col-resize group flex items-center justify-center"
      onPointerDown={onPointerDown}
    >
      <div className="w-[2px] h-full bg-border-subtle group-hover:bg-accent/40 transition-colors" />
    </div>
  );
}
