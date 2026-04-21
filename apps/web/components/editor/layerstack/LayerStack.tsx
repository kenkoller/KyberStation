'use client';
import { useRef, useState } from 'react';
import { useLayerStore } from '@/stores/layerStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { AddLayerDropdown } from './AddLayerDropdown';
import { LayerConfigPanel } from './LayerConfigPanel';
import { LayerRow } from './LayerRow';

/**
 * Banner shown above the layer list whenever any layer has solo=true.
 * Click "Clear solo" to remove solo from every layer at once.
 */
function SoloBanner() {
  const soloedCount = useLayerStore(
    (s) => s.layers.filter((l) => l.solo).length,
  );
  const totalCount = useLayerStore((s) => s.layers.length);
  const clearSolo = useLayerStore((s) => s.clearSolo);

  if (soloedCount === 0) return null;

  return (
    <button
      onClick={clearSolo}
      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-ui-xs font-medium transition-colors"
      style={{
        background: 'rgba(var(--status-ok), 0.1)',
        border: '1px solid rgba(var(--status-ok), 0.4)',
        color: 'rgb(var(--status-ok))',
      }}
      title="Click to exit solo mode for all layers"
      aria-label={`Solo mode active — ${soloedCount} of ${totalCount} layers isolated. Click to clear solo.`}
    >
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="text-ui-sm">{'\u25C9'}</span>
        <span className="tracking-wider uppercase">
          Solo active — {soloedCount} of {totalCount} layer
          {totalCount !== 1 ? 's' : ''} isolated
        </span>
      </span>
      <span className="underline decoration-dotted opacity-80 hover:opacity-100">
        Clear solo
      </span>
    </button>
  );
}

export function LayerStack() {
  const layers = useLayerStore((s) => s.layers);
  const selectedLayerId = useLayerStore((s) => s.selectedLayerId);
  const [showAddMenu, setShowAddMenu] = useState(false);
  // Anchor ref for the portal-rendered AddLayerDropdown — lets the
  // menu escape the LayerStack subpanel's rounded-panel overflow clip.
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Render layers bottom-to-top: reverse for display (top layer at top of list)
  const displayLayers = [...layers].reverse();
  const totalRows = displayLayers.length;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
          Layer Stack
          <HelpTooltip text="Stack multiple visual layers to compose complex blade styles. Base layers provide the primary look, Effect layers add combat reactions, Accent layers create tip/hilt highlights, and Mix layers blend two styles. Order matters: top layers render on top. Per-row B/M/S buttons control Bypass (skip entirely), Mute (composite as black), and Solo (isolate). See also: Color Panel for per-layer colors." proffie="Layers<base, BlastL<>, SimpleClashL<>, ...>" />
        </h3>
        <span className="text-ui-xs text-text-muted tabular-nums" aria-live="polite">
          {layers.length} layer{layers.length !== 1 ? 's' : ''}
        </span>
      </div>

      <SoloBanner />

      {/* Layer list */}
      <div className="space-y-1">
        {displayLayers.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded border border-dashed border-border-subtle/60 bg-bg-surface/40">
            <span className="text-ui-sm text-text-secondary font-medium">No layers yet</span>
            <span className="text-ui-xs text-text-muted text-center max-w-[240px] leading-relaxed">
              Start with a Base layer, then stack Effect / Accent / Mix layers on top to compose.
            </span>
          </div>
        )}
        {displayLayers.map((layer, idx) => (
          <LayerRow
            key={layer.id}
            layerId={layer.id}
            isSelected={selectedLayerId === layer.id}
            rowIndex={idx}
            totalRows={totalRows}
          />
        ))}
      </div>

      {/* Add layer button — dropdown is portal-rendered to escape the
          LayerStack subpanel's overflow clip. See AddLayerDropdown. */}
      <div>
        <button
          ref={addButtonRef}
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full px-3 py-1.5 rounded text-ui-sm font-medium border border-dashed border-border-subtle text-text-muted hover:border-accent hover:text-accent transition-colors"
        >
          + Add Layer
        </button>
        {showAddMenu && (
          <AddLayerDropdown
            anchorRef={addButtonRef}
            onClose={() => setShowAddMenu(false)}
          />
        )}
      </div>

      {/* Selected layer config */}
      {selectedLayerId && (
        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle mt-2">
          <CollapsibleSection
            title="Layer Config"
            defaultOpen={true}
            persistKey="LayerStack.layer-config"
            headerAccessory={
              <HelpTooltip text="Settings specific to the selected layer. Base layers choose a style, Effect layers pick a trigger type (clash, blast, etc.), Accent layers set position along the blade, and Mix layers blend two styles with a ratio." />
            }
          >
            <LayerConfigPanel layerId={selectedLayerId} />
          </CollapsibleSection>
        </div>
      )}

      {/* ProffieOS mapping hint */}
      <div className="text-ui-xs text-text-muted/50 text-center pt-1">
        Maps to ProffieOS Layers&lt;&gt; template nesting
      </div>
    </div>
  );
}
