'use client';
import { useRef, useState } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useUIStore, REGION_LIMITS } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useVisualizationStore, type RgbLumaChannelKey } from '@/stores/visualizationStore';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { ResizeHandle } from '@/components/shared/ResizeHandle';
import { BladeCanvas } from './BladeCanvas';
import { PixelStripPanel } from './PixelStripPanel';
import { LayerCanvas, computeLayerReadout } from './VisualizationStack';
import { getLayerById, type VisualizationLayerId } from '@/lib/visualizationTypes';

interface CanvasLayoutProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
  /** Stable engine pixel buffer (re-used across frames — mutated in
   *  place). Passed through to the ExpandedAnalysisSlot so its
   *  LayerCanvas reads the same buffer the blade/pixel-strip above use. */
  pixels?: Uint8Array | null;
  /** Current LED count — matches `pixels.length / 3`. */
  pixelCount?: number;
}

/**
 * CanvasLayout — vertically stacked full-width visualization panels.
 *
 * Renders:
 *   1. Blade canvas — horizontal, full width (hilt left, tip right)
 *   2. Pixel strip — horizontal, full width (aligned to blade render extent)
 *   3. Expanded analysis layer — whichever line-graph layer the user
 *      selected via AnalysisRail's ↗ button (default: rgb-luma). Sized
 *      to the same blade-render-width as the pixel strip so the
 *      waveform maps 1:1 to the LEDs above.
 */
export function CanvasLayout({ engineRef, pixels = null, pixelCount = 0 }: CanvasLayoutProps) {
  const showBladePanel = useUIStore((s) => s.showBladePanel);
  const showPixelPanel = useUIStore((s) => s.showPixelPanel);
  const showHilt = useUIStore((s) => s.showHilt);
  const showGrid = useUIStore((s) => s.showGrid);
  const toggleBladePanel = useUIStore((s) => s.toggleBladePanel);
  const togglePixelPanel = useUIStore((s) => s.togglePixelPanel);
  const toggleShowHilt = useUIStore((s) => s.toggleShowHilt);
  const toggleShowGrid = useUIStore((s) => s.toggleShowGrid);
  const animationPaused = useUIStore((s) => s.animationPaused);
  const toggleAnimationPaused = useUIStore((s) => s.toggleAnimationPaused);
  const pixelStripHeight = useUIStore((s) => s.pixelStripHeight);
  const setPixelStripHeight = useUIStore((s) => s.setPixelStripHeight);
  const expandedLayerId = useUIStore((s) => s.expandedAnalysisLayerId);

  const containerRef = useRef<HTMLDivElement>(null);

  const visiblePanels = [showBladePanel, showPixelPanel].filter(Boolean).length;

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full gap-0 overflow-hidden rounded-panel border border-border-subtle">
      {/* ── Blade Panel — full width, horizontal ── */}
      {showBladePanel && (
        <div className="flex flex-col min-h-0 overflow-hidden relative flex-1">
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
            <button
              onClick={toggleShowGrid}
              className={`text-ui-xs px-1.5 py-0.5 rounded transition-colors ${
                showGrid
                  ? 'text-accent/70 bg-accent/10'
                  : 'text-text-muted/40 hover:text-text-muted'
              }`}
              aria-label={showGrid ? 'Hide inch-ruler grid' : 'Show inch-ruler grid'}
              title={showGrid ? 'Hide grid' : 'Show grid'}
            >
              Grid
            </button>
          </PanelHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* `compact` selects the 240-tall design-space layout (bladeY=60)
                which is sized for small panel renders. */}
            <BladeCanvas engineRef={engineRef} vertical={false} renderMode="photorealistic" panelMode compact />
          </div>
        </div>
      )}

      {/* W2 resize handle between blade preview ↔ pixel strip. Only
          rendered when both panels are visible so the handle always
          has something to pivot between. */}
      {showBladePanel && showPixelPanel && (
        <ResizeHandle
          orientation="vertical"
          value={pixelStripHeight}
          min={REGION_LIMITS.pixelStripHeight.min}
          max={REGION_LIMITS.pixelStripHeight.max}
          defaultValue={REGION_LIMITS.pixelStripHeight.default}
          onChange={setPixelStripHeight}
          invert
          ariaLabel="Resize pixel strip height"
        />
      )}

      {/* ── Pixel Strip Panel — horizontal, full width (user-draggable) ── */}
      {showPixelPanel && (
        <div className="flex flex-col min-h-0 overflow-hidden relative shrink-0" style={{ height: pixelStripHeight }}>
          <div className="flex-1 min-h-0 overflow-hidden">
            <PixelStripPanel engineRef={engineRef} />
          </div>
        </div>
      )}

      {/* W2 resize handle between pixel strip ↔ expanded slot. Only
          rendered when a layer is expanded (slot is mounted). */}
      {showPixelPanel && expandedLayerId && (
        <ExpandedSlotResizeHandle />
      )}

      {/* ── Expanded Analysis Slot ──
          Populated by AnalysisRail's ↗ affordance. Defaults to rgb-luma
          so the "pixel strip + waveform below" shape users had before
          the overhaul is preserved on fresh load. */}
      <ExpandedAnalysisSlot pixels={pixels} pixelCount={pixelCount} />

      {/* Show hidden panels indicator when panels are hidden */}
      {visiblePanels < 2 && (
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
 * ExpandedAnalysisSlot — renders the currently-expanded line-graph
 * layer at blade-render-width, directly beneath the pixel strip.
 *
 * Replaces the former `RGBGraphPanel` slot (which only rendered RGB).
 * The `LayerCanvas` inside paints to its container extent; alignment
 * with the pixel strip above happens because both panels receive the
 * same container width and the underlying `computeBladeRenderMetrics`
 * is pure — there's nothing to thread.
 *
 * Close button (×) in the header clears `expandedAnalysisLayerId`,
 * collapsing the slot and handing the vertical space back to the
 * blade preview.
 */
/** Resize handle between pixel strip and expanded slot. Extracted so
 *  it can pull uiStore state without polluting the CanvasLayout render
 *  when no layer is expanded. */
function ExpandedSlotResizeHandle() {
  const expandedSlotHeight = useUIStore((s) => s.expandedSlotHeight);
  const setExpandedSlotHeight = useUIStore((s) => s.setExpandedSlotHeight);
  return (
    <ResizeHandle
      orientation="vertical"
      value={expandedSlotHeight}
      min={REGION_LIMITS.expandedSlotHeight.min}
      max={REGION_LIMITS.expandedSlotHeight.max}
      defaultValue={REGION_LIMITS.expandedSlotHeight.default}
      onChange={setExpandedSlotHeight}
      invert
      ariaLabel="Resize expanded analysis view"
    />
  );
}

function ExpandedAnalysisSlot({
  pixels,
  pixelCount,
}: {
  pixels: Uint8Array | null;
  pixelCount: number;
}) {
  const expandedId = useUIStore((s) => s.expandedAnalysisLayerId);
  const setExpandedId = useUIStore((s) => s.setExpandedAnalysisLayerId);
  const expandedSlotHeight = useUIStore((s) => s.expandedSlotHeight);
  const isPaused = useUIStore((s) => s.isPaused);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  if (!expandedId) return null;

  const layer = getLayerById(expandedId);
  // A pixel-shaped or scalar layer should never wind up here (the rail
  // only exposes line-graphs), but defend against persisted stale ids.
  if (!layer || layer.shape !== 'line-graph') return null;

  return (
    <div
      className="flex flex-col min-h-0 overflow-hidden relative shrink-0"
      style={{ height: expandedSlotHeight }}
      aria-label={`${layer.label} expanded view`}
    >
      <div className="flex items-center justify-between px-2 py-1 bg-bg-secondary/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: layer.color }}
          />
          <span className="text-ui-xs font-mono uppercase tracking-[0.08em] text-text-muted shrink-0">
            {layer.label}
          </span>
          {/* RGB+L channel chips relocated from the AnalysisRail row
              (W1 2026-04-22). The slot header is where the composite
              is actually inspected at scale, so toggles live here. */}
          {expandedId === 'rgb-luma' && <RgbLumaSlotChips />}
          <SlotHeaderReadout
            layerId={expandedId}
            pixels={pixels}
            pixelCount={pixelCount}
            isPaused={isPaused}
          />
        </div>
        <button
          type="button"
          onClick={() => setExpandedId(null)}
          className="text-ui-xs text-text-muted/60 hover:text-text-primary transition-colors px-1 shrink-0"
          aria-label={`Close ${layer.label} expanded view`}
          title="Close expanded view"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <LayerCanvas
          layerId={expandedId}
          pixels={pixels}
          pixelCount={pixelCount}
          isPaused={isPaused}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
}

/** Per-channel chips for the rgb-luma slot header. Moved from the
 *  AnalysisRail row (W1). */
function RgbLumaSlotChips() {
  const channels = useVisualizationStore((s) => s.rgbLumaChannels);
  const toggle = useVisualizationStore((s) => s.toggleRgbLumaChannel);

  const chips: Array<{ key: RgbLumaChannelKey; label: string; color: string }> = [
    { key: 'r', label: 'R', color: '#ff4444' },
    { key: 'g', label: 'G', color: '#44ff88' },
    { key: 'b', label: 'B', color: '#4488ff' },
    { key: 'l', label: 'L', color: '#e8e8e8' },
  ];

  return (
    <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="RGB+L channel toggles">
      {chips.map((c) => {
        const enabled = channels[c.key];
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => toggle(c.key)}
            aria-label={`Toggle ${c.label} channel`}
            aria-pressed={enabled}
            title={`${c.label} channel · ${enabled ? 'on' : 'off'}`}
            className="w-4 h-4 rounded-[2px] border text-[9px] font-mono leading-none inline-flex items-center justify-center transition-colors"
            style={{
              borderColor: enabled ? c.color : 'rgba(255,255,255,0.18)',
              color: enabled ? c.color : 'rgba(255,255,255,0.35)',
              backgroundColor: enabled ? `${c.color}1a` : 'transparent',
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

/** Inline numeric readout for the slot header. Mirrors the rail row
 *  readout but refreshed slightly faster since the slot is the
 *  primary forensic surface. */
function SlotHeaderReadout({
  layerId,
  pixels,
  pixelCount,
  isPaused,
}: {
  layerId: VisualizationLayerId;
  pixels: Uint8Array | null;
  pixelCount: number;
  isPaused: boolean;
}) {
  const brightness = useUIStore((s) => s.brightness);
  const swing = useBladeStore((s) => s.motionSim.swing);
  const bladeState = useBladeStore((s) => s.bladeState);
  const rgbLumaChannels = useVisualizationStore((s) => s.rgbLumaChannels);

  const [readout, setReadout] = useState<string | null>(null);

  useAnimationFrame(
    () => {
      const next = computeLayerReadout(layerId, pixels, pixelCount, {
        brightness,
        swingSpeed: swing / 100,
        bladeState: bladeState as string,
        rgbLumaChannels,
      });
      setReadout((prev) => (prev === next ? prev : next));
    },
    { enabled: !isPaused, maxFps: 10 },
  );

  if (!readout) return null;
  return (
    <span className="text-ui-xs font-mono tabular-nums text-text-muted/80 truncate min-w-0">
      {readout}
    </span>
  );
}
