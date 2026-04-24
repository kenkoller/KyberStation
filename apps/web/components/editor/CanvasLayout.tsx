'use client';
import { useCallback, useRef, useState } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useUIStore, REGION_LIMITS } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useVisualizationStore, type RgbLumaChannelKey } from '@/stores/visualizationStore';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { ResizeHandle } from '@/components/shared/ResizeHandle';
import { PauseButton } from '@/components/layout/PauseButton';
import { PinnedEffectChips, EffectsPinDropdown } from '@/components/editor/EffectsPinDropdown';
import { toggleOrTriggerEffect } from '@/lib/effectToggle';
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
  /**
   * Phase 1.5d: action-bar handlers owned by WorkbenchLayout (they
   * wrap the engine-level toggle/trigger with audio playback). We
   * receive them as props and render the action bar inside the
   * BLADE PREVIEW panel's toolbar row so the user's primary blade
   * controls live in the same visual region as the blade they drive.
   */
  onToggleBlade?: () => void;
  onTriggerEffect?: (type: string) => void;
  onReleaseEffect?: (type: string) => void;
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
export function CanvasLayout({
  engineRef,
  pixels = null,
  pixelCount = 0,
  onToggleBlade,
  onTriggerEffect,
  onReleaseEffect,
}: CanvasLayoutProps) {
  const showBladePanel = useUIStore((s) => s.showBladePanel);
  const showPixelPanel = useUIStore((s) => s.showPixelPanel);
  const showHilt = useUIStore((s) => s.showHilt);
  const showGrid = useUIStore((s) => s.showGrid);
  const bladeStartFrac = useUIStore((s) => s.bladeStartFrac);
  const setBladeStartFrac = useUIStore((s) => s.setBladeStartFrac);
  const toggleBladePanel = useUIStore((s) => s.toggleBladePanel);
  const togglePixelPanel = useUIStore((s) => s.togglePixelPanel);
  const toggleShowHilt = useUIStore((s) => s.toggleShowHilt);
  const toggleShowGrid = useUIStore((s) => s.toggleShowGrid);
  const isOn = useBladeStore((s) => s.isOn);

  // Phase 1.5d: handlers plumbed from WorkbenchLayout. When any of the
  // three are omitted, BladeActionBar is not rendered (keeps the standalone
  // `/m` route from hosting a half-wired action bar).
  const canMountActionBar =
    onToggleBlade !== undefined &&
    onTriggerEffect !== undefined &&
    onReleaseEffect !== undefined;

  // Phase 1.5f: draggable Point-A divider — spans the entire BLADE
  // PREVIEW panel vertically (toolbar + blade canvas + pixel strip +
  // analysis rail). Dragging horizontally updates
  // uiStore.bladeStartFrac, which every rail reads so they all
  // re-anchor to the new Point A.
  const handleDividerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const panel = (e.currentTarget.parentElement as HTMLElement | null);
    if (!panel) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const rect = panel.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      const frac = Math.round(((ev.clientX - rect.left) / rect.width) * 1000);
      // clampRegion in uiStore enforces REGION_LIMITS.bladeStartFrac bounds.
      setBladeStartFrac(frac);
    };
    const onUp = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      try { target.releasePointerCapture(ev.pointerId); } catch { /* noop */ }
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
  }, [setBladeStartFrac]);

  const handleDividerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      // Read latest value from store each press — closure-captured
      // `bladeStartFrac` goes stale under rapid key repeat.
      setBladeStartFrac(useUIStore.getState().bladeStartFrac - step);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setBladeStartFrac(useUIStore.getState().bladeStartFrac + step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setBladeStartFrac(REGION_LIMITS.bladeStartFrac.default);
    }
  }, [setBladeStartFrac]);

  const handleDividerDoubleClick = useCallback(() => {
    setBladeStartFrac(REGION_LIMITS.bladeStartFrac.default);
  }, [setBladeStartFrac]);
  const pixelStripHeight = useUIStore((s) => s.pixelStripHeight);
  const setPixelStripHeight = useUIStore((s) => s.setPixelStripHeight);
  const expandedLayerId = useUIStore((s) => s.expandedAnalysisLayerId);
  const isPausedForStats = useUIStore((s) => s.isPaused);

  const containerRef = useRef<HTMLDivElement>(null);

  const visiblePanels = [showBladePanel, showPixelPanel].filter(Boolean).length;

  return (
    <div ref={containerRef} className="relative flex flex-col h-full w-full gap-0 overflow-hidden border border-border-subtle">
      {/* ── Blade Panel — full width, horizontal ── */}
      {showBladePanel && (
        <div className="flex flex-col min-h-0 overflow-hidden relative flex-1">
          {/*
            Phase 1.5l: row order swapped. Action bar (IGNITE + effects)
            is now the TOP row — it's the highest-frequency interaction
            so it belongs at the top edge of the panel where the cursor
            naturally lands. The title/toggles row sits BELOW the action
            bar, still above the blade canvas.
          */}
          {canMountActionBar && (
            <div
              className="shrink-0 flex items-center gap-1.5 px-2 py-1 border-b border-border-subtle bg-bg-secondary/40 flex-wrap"
              role="toolbar"
              aria-label="Blade actions and effects"
            >
              <button
                onClick={onToggleBlade}
                className={`px-3 py-1 rounded text-ui-xs font-bold uppercase tracking-wider transition-all border ${
                  isOn
                    ? 'bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-900/50 ignite-btn-on'
                    : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20 ignite-btn-off'
                }`}
                title={isOn ? 'Retract blade (Space)' : 'Ignite blade (Space)'}
              >
                {isOn ? 'Retract' : 'Ignite'}
              </button>
              <PauseButton />
              <span className="w-px h-5 bg-border-subtle mx-1" aria-hidden="true" />
              <PinnedEffectChips
                onToggle={toggleOrTriggerEffect}
                triggerHandler={onTriggerEffect!}
                releaseHandler={onReleaseEffect!}
              />
              <EffectsPinDropdown />
            </div>
          )}
          <PanelHeader
            title="Blade Preview"
            onToggle={toggleBladePanel}
          >
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
      {/*
        Phase 1.5j: wrapped PixelStripPanel with a small header row
        mirroring the BLADE PREVIEW panel's header — title + live
        stats (total amperage + avg luma). The in-canvas `PIXEL`
        label + `0.00A bri:N%` readout were removed from
        PixelStripPanel because they drew ON TOP of the rightmost
        LEDs; rendering them in the DOM header is cleaner and
        accessible to screen readers.
      */}
      {showPixelPanel && (
        <div
          className="flex flex-col min-h-0 overflow-hidden relative shrink-0"
          style={{ height: pixelStripHeight }}
        >
          <PixelStripHeader pixels={pixels} pixelCount={pixelCount} isPaused={isPausedForStats} togglePixelPanel={togglePixelPanel} />
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

      {/*
        Phase 1.5f: draggable Point-A divider. Absolute-positioned
        so it spans the entire BLADE PREVIEW panel vertically (panel
        header, action bar, blade canvas, strip, analysis slot). The
        divider's X is `bladeStartFrac / 10`% of the panel width —
        identical formula to the one every rail's
        computeBladeRenderMetrics call uses, so they all anchor
        to this same X.

        Drag to reposition; arrow keys step by 5 (shift+arrow 20);
        Home / double-click reset to REGION_LIMITS default.
      */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize blade start divider (Point A)"
        aria-valuemin={REGION_LIMITS.bladeStartFrac.min}
        aria-valuemax={REGION_LIMITS.bladeStartFrac.max}
        aria-valuenow={bladeStartFrac}
        tabIndex={0}
        onPointerDown={handleDividerPointerDown}
        onKeyDown={handleDividerKeyDown}
        onDoubleClick={handleDividerDoubleClick}
        className="absolute top-0 bottom-0 w-2 z-20 cursor-col-resize bg-transparent hover:bg-accent/30 active:bg-accent/50 transition-colors"
        style={{
          left: `calc(${bladeStartFrac / 10}% - 4px)`,
          background:
            'linear-gradient(to right, transparent 0, transparent 3px, rgb(var(--border-subtle) / 0.6) 3px, rgb(var(--border-subtle) / 0.6) 5px, transparent 5px)',
          outline: 'none',
          touchAction: 'none',
        }}
      />

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

/**
 * PixelStripHeader — Phase 1.5j. Small header above PixelStripPanel
 * with a uppercase `PIXEL STRIP` title + live stats readout (total
 * amperage + avg blade luminance). Mirrors the BLADE PREVIEW panel's
 * PanelHeader shape so the two stacked panels read as a pair. Title
 * + readout on the left; ✕ close button on the right.
 *
 * Stats are computed by sampling the shared engine pixel buffer
 * each animation frame (10fps cap — cheap + reads fine). The same
 * buffer the ExpandedAnalysisSlot header already uses, so there's
 * one source of truth for blade readouts across the workbench.
 */
function PixelStripHeader({
  pixels,
  pixelCount,
  isPaused,
  togglePixelPanel,
}: {
  pixels: Uint8Array | null;
  pixelCount: number;
  isPaused: boolean;
  togglePixelPanel: () => void;
}) {
  const brightness = useUIStore((s) => s.brightness);
  const [readout, setReadout] = useState<string>('');

  useAnimationFrame(
    () => {
      if (!pixels || pixelCount <= 0) {
        setReadout('');
        return;
      }
      const briScale = brightness / 100;
      let totalMa = 0;
      let lumaSum = 0;
      const count = Math.min(pixelCount, Math.floor(pixels.length / 3));
      for (let i = 0; i < count; i++) {
        const r = (pixels[i * 3] ?? 0) * briScale;
        const g = (pixels[i * 3 + 1] ?? 0) * briScale;
        const b = (pixels[i * 3 + 2] ?? 0) * briScale;
        totalMa += ((r + g + b) / 255) * 20;
        lumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
      }
      const totalA = (totalMa / 1000).toFixed(2);
      const avgBri = count > 0 ? Math.round((lumaSum / count / 255) * 100) : 0;
      const next = `${totalA} A · ${avgBri}%`;
      setReadout((prev) => (prev === next ? prev : next));
    },
    { enabled: !isPaused, maxFps: 10 },
  );

  return (
    <div className="flex items-center justify-between px-2 py-2 bg-bg-secondary/80 border-b border-border-subtle shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-ui-xs text-text-muted uppercase tracking-wider font-medium select-none shrink-0">
          Pixel Strip
        </span>
        {readout && (
          <span className="text-ui-xs font-mono tabular-nums text-[rgba(255,170,0,0.75)] truncate">
            {readout}
          </span>
        )}
      </div>
      <button
        onClick={togglePixelPanel}
        className="text-ui-xs text-text-muted/50 hover:text-text-muted transition-colors px-1 shrink-0"
        aria-label="Hide Pixel Strip panel"
        title="Hide Pixel Strip"
      >
        ✕
      </button>
    </div>
  );
}

function PanelHeader({
  title,
  onToggle,
  children,
}: {
  title: string;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  // Phase 1.5e: title + accessory buttons sit on the LEFT (right after
  // the title) instead of far-right. This clears the panel's top-right
  // corner for the absolute-positioned State/2D-3D/Fullscreen overlay
  // in WorkbenchLayout (moved DOWN to top-11 in 1.5e so it no longer
  // competes with this row for horizontal space).
  //
  // Phase 1.5j: `pr-20` spacer dropped now that the overlay is moved
  // vertically out of the collision zone. The children row gets the
  // full horizontal space it needs for the consolidated IGNITE +
  // effects + view toggles.
  return (
    <div className="flex items-center justify-between px-2 py-2 bg-bg-secondary/80 border-b border-border-subtle shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <span className="text-ui-xs text-text-muted uppercase tracking-wider font-medium select-none shrink-0">
          {title}
        </span>
        <div className="flex items-center gap-1 min-w-0 flex-wrap">
          {children}
        </div>
      </div>
      <button
        onClick={onToggle}
        className="text-ui-xs text-text-muted/50 hover:text-text-muted transition-colors px-1 shrink-0"
        aria-label={`Hide ${title} panel`}
        title={`Hide ${title}`}
      >
        ✕
      </button>
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
