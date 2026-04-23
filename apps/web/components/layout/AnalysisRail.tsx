'use client';

/**
 * AnalysisRail — left-side column hosting every line-graph analysis
 * layer. Post-W1 (2026-04-22) every line-graph layer is always visible:
 *
 *   - Eyeball hide removed — the product contract is "always on."
 *   - Hidden-layer restore chips removed — nothing to restore.
 *   - Per-row chips for `rgb-luma` moved to the ExpandedAnalysisSlot
 *     header (next to the RGB+L label down there).
 *   - Each row is a click target (click anywhere = expand below pixel
 *     strip). The expand arrow is still shown for keyboard + mouse
 *     visual discoverability but the whole row is the hit area.
 *   - Canvas-internal labels / readouts gone (W1 VisualizationStack
 *     rewrite). Labels live in the row header; numeric readouts come
 *     from `computeLayerReadout` and render inline, responsive to row
 *     width (full text → short label, readout hides at narrow widths).
 *   - Rows flex-share the rail's vertical space with a floor of 36px —
 *     no scrolling. Below the floor the rail enters a "compact" mode
 *     where the canvas collapses and only the header row shows.
 */

import { useState, useMemo } from 'react';
import { useVisualizationStore } from '@/stores/visualizationStore';
import { useUIStore } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { LayerCanvas, computeLayerReadout } from '@/components/editor/VisualizationStack';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import {
  getLayerById,
  LINE_GRAPH_SHAPED_LAYER_IDS,
  type VisualizationLayer,
  type VisualizationLayerId,
} from '@/lib/visualizationTypes';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ─── Pure helpers (exported for tests) ──────────────────────────────────────

export function selectAnalysisRailLayerIds(
  layerOrder: VisualizationLayerId[],
  visibleLayers: Set<VisualizationLayerId>,
): VisualizationLayerId[] {
  return layerOrder.filter(
    (id) => visibleLayers.has(id) && LINE_GRAPH_SHAPED_LAYER_IDS.has(id),
  );
}

// ─── Layout constants ───────────────────────────────────────────────────────

/** Absolute row minimum — the header still fits at this height (18px
 *  header + 4px breathing room). Below this the rail's
 *  overflow-y auto kicks in and the rail becomes scrollable. */
const ROW_MIN_HEIGHT = 22;
/** Header band inside each row (reserved for the label + readout). */
const ROW_HEADER_HEIGHT = 18;
/** Width at which the row header switches from descriptive → short label. */
const SHORT_LABEL_WIDTH_PX = 168;
/** Width at which the readout gets dropped entirely. */
const HIDE_READOUT_WIDTH_PX = 140;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AnalysisRailProps {
  pixels: Uint8Array | null;
  pixelCount: number;
  onExpand: (layerId: VisualizationLayerId) => void;
  expandedLayerId?: VisualizationLayerId | null;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AnalysisRail({
  pixels,
  pixelCount,
  onExpand,
  expandedLayerId = null,
  className = '',
  style,
}: AnalysisRailProps) {
  const visibleLayers = useVisualizationStore((s) => s.visibleLayers);
  const layerOrder = useVisualizationStore((s) => s.layerOrder);
  const isPaused = useUIStore((s) => s.isPaused);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const { breakpoint } = useBreakpoint();

  // OV10 icon-only on tablet/phone still applies. The "always visible"
  // contract covers desktop; the mobile shell owns its own affordances.
  const icon = breakpoint === 'phone' || breakpoint === 'tablet';
  const resolvedWidth =
    icon ? 40 : (typeof style?.width === 'number' ? style.width : 200);

  const activeIds = useMemo(
    () => selectAnalysisRailLayerIds(layerOrder, visibleLayers),
    [layerOrder, visibleLayers],
  );

  // Dynamic height distribution is pure CSS now:
  //   - Rows use `flex: 1 1 0` so they share rail height equally and
  //     grow past the old "preferred" cap as the parent is enlarged.
  //   - Each row's own min-height floors at ROW_MIN_HEIGHT. When the
  //     rail shrinks below rowCount × ROW_MIN_HEIGHT, the container's
  //     overflow-y: auto engages and the rail becomes scrollable.
  //   - Each row's canvas wrapper is flex-1 inside the row, so at
  //     larger row heights the waveform takes the extra pixels
  //     automatically.

  return (
    <aside
      role="complementary"
      aria-label="Analysis layers"
      className={`shrink-0 bg-bg-secondary/40 overflow-x-hidden overflow-y-auto ${className}`}
      style={{ ...style, width: resolvedWidth }}
    >
      {activeIds.length > 0 ? (
        <div className="flex flex-col gap-1 p-1 h-full min-h-0">
          {activeIds.map((id) => {
            const layer = getLayerById(id);
            if (!layer) return null;
            return (
              <AnalysisRailRow
                key={id}
                layer={layer}
                pixels={pixels}
                pixelCount={pixelCount}
                isPaused={isPaused}
                reducedMotion={reducedMotion}
                icon={icon}
                railWidth={resolvedWidth}
                isExpanded={expandedLayerId === id}
                onExpand={onExpand}
              />
            );
          })}
        </div>
      ) : (
        !icon && (
          <div
            className="flex flex-col gap-1 p-2 text-ui-xs text-text-muted font-mono"
            aria-live="polite"
          >
            <span className="uppercase tracking-[0.12em] text-text-muted/70">
              Analysis
            </span>
            <span className="leading-snug text-text-muted/80">
              No layers available.
            </span>
          </div>
        )
      )}
    </aside>
  );
}

// ─── Row — one analysis layer, click-anywhere-to-expand ─────────────────────

interface AnalysisRailRowProps {
  layer: VisualizationLayer;
  pixels: Uint8Array | null;
  pixelCount: number;
  isPaused: boolean;
  reducedMotion: boolean;
  icon: boolean;
  railWidth: number;
  isExpanded: boolean;
  onExpand: (layerId: VisualizationLayerId) => void;
}

function AnalysisRailRow({
  layer,
  pixels,
  pixelCount,
  isPaused,
  reducedMotion,
  icon,
  railWidth,
  isExpanded,
  onExpand,
}: AnalysisRailRowProps) {
  const showShortLabel = railWidth < SHORT_LABEL_WIDTH_PX;
  const showReadout = railWidth >= HIDE_READOUT_WIDTH_PX;

  const labelText = showShortLabel ? layer.shortLabel : layer.label;

  return (
    <button
      type="button"
      onClick={() => onExpand(layer.id)}
      aria-label={`${layer.label} — ${isExpanded ? 'currently expanded' : 'click to expand below pixel strip'}`}
      aria-pressed={isExpanded}
      title={layer.description}
      className={`flex flex-col rounded-chrome text-left w-full overflow-hidden transition-colors ${
        isExpanded
          ? 'bg-accent-dim/25 border border-accent-border/60'
          : 'bg-bg-deep/40 border border-border-subtle/40 hover:border-accent-border/50 hover:bg-bg-deep/60'
      }`}
      // flex: 1 1 0 lets rows share rail height evenly and grow past
      // the old preferred cap. min-height floors at ROW_MIN_HEIGHT so
      // the header stays readable; when the rail shrinks past
      // rowCount × ROW_MIN_HEIGHT, the container's overflow-y:auto
      // engages and rows scroll instead of compress further.
      style={{ flex: '1 1 0', minHeight: ROW_MIN_HEIGHT }}
    >
      {/* Header: dot + label + readout + active-state arrow */}
      <div
        className={`flex items-center ${icon ? 'justify-center px-1' : 'justify-between px-2'} shrink-0`}
        style={{ height: ROW_HEADER_HEIGHT }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            aria-hidden="true"
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: layer.color }}
          />
          {!icon && (
            <span
              className="text-ui-xs font-mono uppercase tracking-[0.08em] text-text-secondary truncate"
            >
              {labelText}
            </span>
          )}
        </div>

        {!icon && (
          <div className="flex items-center gap-1.5 shrink-0">
            {showReadout && (
              <LayerReadout
                layerId={layer.id}
                pixels={pixels}
                pixelCount={pixelCount}
                isPaused={isPaused}
              />
            )}
            <span
              aria-hidden="true"
              className={`text-ui-xs transition-colors ${isExpanded ? 'text-accent' : 'text-text-muted/70'}`}
            >
              ↗
            </span>
          </div>
        )}
      </div>

      {/* Canvas — flex-1 fills remaining row height. When the row
          shrinks to its floor, the canvas gets ~4px and effectively
          disappears under the header; when the rail grows, the canvas
          absorbs all extra pixels automatically. No compact-mode branch
          needed. */}
      {!icon && (
        <div className="w-full flex-1 min-h-0">
          <LayerCanvas
            layerId={layer.id}
            pixels={pixels}
            pixelCount={pixelCount}
            isPaused={isPaused}
            reducedMotion={reducedMotion}
          />
        </div>
      )}
    </button>
  );
}

// ─── Inline readout (throttled to ~10fps for legibility) ────────────────────

/**
 * Render the per-layer numeric readout inline with the row label. The
 * readout is refreshed at a modest rate (~8fps) — high enough to track
 * blade state but low enough to avoid flicker and unnecessary re-renders.
 */
function LayerReadout({
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
      // Only trigger a render if the value changed — string compare is cheap.
      setReadout((prev) => (prev === next ? prev : next));
    },
    { enabled: !isPaused, maxFps: 8 },
  );

  if (!readout) return null;
  return (
    <span className="text-ui-xs font-mono tabular-nums text-text-muted/80 truncate max-w-[96px]">
      {readout}
    </span>
  );
}
