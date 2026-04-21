'use client';

/**
 * AnalysisRail — left-side column hosting the 9 line-graph-shaped
 * analysis layers (UI_OVERHAUL_v2_PROPOSAL.md §2 region diagram, §13
 * OV5 row).
 *
 * Replaces the previous vertical stack (VisualizationStack)'s share of
 * the line-graph layers. Pixel-shaped layers (blade, pixel-strip,
 * effect-overlay) stay with the blade preview; scalar-shaped layers
 * (storage-budget) move to the Delivery rail.
 *
 * Width:
 *   - Desktop: 200px full labels + ↗ expand affordance.
 *   - Tablet:  40px icon-only (matches VisualizationToolbar vertical
 *              orientation below 1024px).
 *   - Mobile:  hidden by default — the workbench itself is gated on
 *              `desktop:` via AppShell, so mobile goes through the
 *              mobile shell and never mounts this rail.
 *
 * Each row:
 *   - [color dot] LABEL     [↗ expand]
 *   - 40px canvas rendering the live waveform.
 *   - Visible only when the layer is visible in visualizationStore;
 *     hidden layers don't reserve space.
 */

import { useRef } from 'react';
import { useVisualizationStore } from '@/stores/visualizationStore';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { LayerCanvas } from '@/components/editor/VisualizationStack';
import {
  getLayerById,
  LINE_GRAPH_SHAPED_LAYER_IDS,
  VISUALIZATION_LAYERS,
  type VisualizationLayerId,
} from '@/lib/visualizationTypes';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ─── Pure helpers (exported for tests) ──────────────────────────────────────

/**
 * Filter + order the layer ids that belong in AnalysisRail — the
 * intersection of `layerOrder` (the user's persisted ordering from the
 * visualizationStore) and the line-graph-shape set. Hidden layers are
 * excluded so the rail only shows what the user enabled.
 *
 * Exported so node-only regression tests can verify the data-driven
 * classification without rendering the component.
 */
export function selectAnalysisRailLayerIds(
  layerOrder: VisualizationLayerId[],
  visibleLayers: Set<VisualizationLayerId>,
): VisualizationLayerId[] {
  return layerOrder.filter(
    (id) => visibleLayers.has(id) && LINE_GRAPH_SHAPED_LAYER_IDS.has(id),
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AnalysisRailProps {
  /** Pixel buffer the rail shares with the blade canvas + VisualizationStack. */
  pixels: Uint8Array | null;
  /** LED count matching engine.getPixels() shape. */
  pixelCount: number;
  /** Called when the user clicks a layer's ↗ icon. */
  onExpand: (layerId: VisualizationLayerId) => void;
  className?: string;
  /**
   * Inline style override. OV11 threads the user-draggable width from
   * uiStore.analysisRailWidth. When present, it takes precedence over
   * the breakpoint-derived default width below.
   */
  style?: React.CSSProperties;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AnalysisRail({
  pixels,
  pixelCount,
  onExpand,
  className = '',
  style,
}: AnalysisRailProps) {
  const visibleLayers = useVisualizationStore((s) => s.visibleLayers);
  const layerOrder = useVisualizationStore((s) => s.layerOrder);
  const toggleLayer = useVisualizationStore((s) => s.toggleLayer);
  const isPaused = useUIStore((s) => s.isPaused);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const { breakpoint } = useBreakpoint();

  // Icon-only collapse below desktop. Matches the proposal §10
  // responsive table: desktop 200px / tablet 40px / mobile drawer.
  // OV11: the caller can override the desktop width by passing a
  // `style.width` (drives the user-draggable value from uiStore).
  // The compact (tablet / mobile) width stays fixed at 40px — the
  // rail is icon-only there and resizing doesn't apply.
  const compact = breakpoint === 'phone' || breakpoint === 'tablet';
  const resolvedWidth =
    compact ? 40 : (typeof style?.width === 'number' ? style.width : 200);

  const activeIds = selectAnalysisRailLayerIds(layerOrder, visibleLayers);

  // Hidden layers — rendered under a collapsed "enable a layer" hint so
  // the rail isn't empty when the user has toggled everything off.
  const allLineGraphs = VISUALIZATION_LAYERS.filter(
    (l) => l.shape === 'line-graph',
  );

  return (
    <aside
      role="complementary"
      aria-label="Analysis layers"
      // OV11: right border removed — the ResizeHandle to our right
      // carries the seam, and doubling it with a border adds visual
      // weight without new information.
      className={`shrink-0 bg-bg-secondary/40 overflow-y-auto overflow-x-hidden ${className}`}
      style={{ ...style, width: resolvedWidth }}
    >
      {activeIds.length > 0 ? (
        <div className="flex flex-col gap-1 p-1">
          {activeIds.map((id) => (
            <AnalysisRailRow
              key={id}
              layerId={id}
              pixels={pixels}
              pixelCount={pixelCount}
              isPaused={isPaused}
              reducedMotion={reducedMotion}
              compact={compact}
              onExpand={onExpand}
              onHide={() => toggleLayer(id)}
            />
          ))}
        </div>
      ) : (
        // Empty state — no line-graph layers visible. Rather than hiding
        // the rail (which would make the blade jump horizontally on
        // toggle), show a small hint. The toolbar's layer toggles are
        // the primary path to show layers; this is a secondary nudge.
        <div
          className="flex flex-col gap-1 p-2 text-ui-xs text-text-muted font-mono"
          aria-live="polite"
        >
          {!compact && (
            <>
              <span className="uppercase tracking-[0.12em] text-text-muted/70">
                Analysis
              </span>
              <span className="leading-snug text-text-muted/80">
                Enable a line-graph layer from the toolbar to see waveforms here.
              </span>
            </>
          )}
          {compact && (
            <span
              aria-hidden="true"
              className="text-center text-ui-xs text-text-muted/60"
            >
              ···
            </span>
          )}
          {/* Surface the hidden layer count for visual-debug parity. */}
          {!compact && allLineGraphs.length > 0 && (
            <span className="text-text-muted/60">
              {allLineGraphs.length} layers available.
            </span>
          )}
        </div>
      )}
    </aside>
  );
}

// ─── Row — individual layer + expand affordance ──────────────────────────────

interface AnalysisRailRowProps {
  layerId: VisualizationLayerId;
  pixels: Uint8Array | null;
  pixelCount: number;
  isPaused: boolean;
  reducedMotion: boolean;
  compact: boolean;
  onExpand: (layerId: VisualizationLayerId) => void;
  onHide: () => void;
}

function AnalysisRailRow({
  layerId,
  pixels,
  pixelCount,
  isPaused,
  reducedMotion,
  compact,
  onExpand,
  onHide,
}: AnalysisRailRowProps) {
  const layer = getLayerById(layerId);
  const rowRef = useRef<HTMLDivElement>(null);
  if (!layer) return null;

  return (
    <div
      ref={rowRef}
      className="flex flex-col rounded-chrome bg-bg-deep/40 border border-border-subtle/40"
      aria-label={`${layer.label} analysis layer`}
    >
      {/* Header: dot + label + actions */}
      <div
        className={`flex items-center ${compact ? 'justify-center px-1' : 'justify-between px-2'} py-1`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            aria-hidden="true"
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: layer.color }}
          />
          {!compact && (
            <span
              className="text-ui-xs font-mono uppercase tracking-[0.08em] text-text-secondary truncate"
              title={layer.description}
            >
              {layer.label}
            </span>
          )}
        </div>

        {!compact && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onExpand(layerId)}
              aria-label={`Expand ${layer.label} to full width`}
              title="Expand"
              className="text-text-muted hover:text-accent transition-colors text-ui-xs w-5 h-5 rounded-chrome border border-border-subtle/60 hover:border-accent-border inline-flex items-center justify-center"
            >
              <span aria-hidden="true">↗</span>
            </button>
            <button
              type="button"
              onClick={onHide}
              aria-label={`Hide ${layer.label} layer`}
              title="Hide"
              className="text-text-muted hover:text-text-primary transition-colors text-ui-xs w-5 h-5 rounded-chrome border border-border-subtle/60 hover:border-border-light inline-flex items-center justify-center"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="w-full">
        <LayerCanvas
          layerId={layerId}
          pixels={pixels}
          pixelCount={pixelCount}
          height={compact ? 24 : layer.height}
          isPaused={isPaused}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Compact mode: tap-to-expand click target on the whole row so
          40px columns remain usable. Screen readers + keyboard users
          already have the toolbar buttons. */}
      {compact && (
        <button
          type="button"
          onClick={() => onExpand(layerId)}
          aria-label={`Expand ${layer.label}`}
          className="text-ui-xs text-text-muted hover:text-accent py-0.5 font-mono"
          title="Expand"
        >
          ↗
        </button>
      )}
    </div>
  );
}
