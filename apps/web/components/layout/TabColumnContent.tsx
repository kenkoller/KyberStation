'use client';

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useLayoutStore } from '@/stores/layoutStore';
import type { PanelId, TabId } from '@/stores/layoutStore';
import { ColumnGrid } from './ColumnGrid';
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns';

// ─── Panel imports — only components that exist ───────────────────────────────

import { StylePanel } from '@/components/editor/StylePanel';
import { ColorPanel } from '@/components/editor/ColorPanel';
import { ParameterBank } from '@/components/editor/ParameterBank';
import { Randomizer } from '@/components/editor/Randomizer';
import { LayerStack } from '@/components/editor/LayerStack';
import { OLEDPreview } from '@/components/editor/OLEDPreview';
import { EffectPanel } from '@/components/editor/EffectPanel';
import { MotionSimPanel } from '@/components/editor/MotionSimPanel';
import { SoundFontPanel } from '@/components/editor/SoundFontPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
import { PresetGallery } from '@/components/editor/PresetGallery';
import { CommunityGallery } from '@/components/editor/CommunityGallery';
import { CodeOutput } from '@/components/editor/CodeOutput';
import { PowerDrawPanel } from '@/components/editor/PowerDrawPanel';
import { StorageBudgetPanel } from '@/components/editor/StorageBudgetPanel';
import { SaberProfileManager } from '@/components/editor/SaberProfileManager';
import { CardWriter } from '@/components/editor/CardWriter';

// ─── Coming-soon placeholder ──────────────────────────────────────────────────

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
      <span className="text-ui-sm text-text-muted font-mono">{label}</span>
      <span className="text-ui-xs text-text-muted/50">Coming soon</span>
    </div>
  );
}

// ─── Panel renderer ───────────────────────────────────────────────────────────

/**
 * Maps a PanelId string to the concrete React component (or placeholder) for
 * that panel.  This is passed to ColumnGrid as the `renderPanel` prop.
 */
function renderPanel(panelId: string): React.ReactNode {
  switch (panelId as PanelId) {
    // ── Design ──
    case 'style-select':
      return <StylePanel />;
    case 'color-picker':
      return <ColorPanel />;
    case 'parameters':
      return <ParameterBank />;
    case 'randomizer':
      return <Randomizer />;
    case 'layer-stack':
      return <LayerStack />;
    case 'oled-preview':
      return <OLEDPreview />;

    // ── Dynamics ──
    case 'effect-triggers':
      return <EffectPanel />;
    case 'effect-config':
      return <EffectPanel />;
    case 'motion-simulation':
      return <MotionSimPanel />;
    case 'ignition-retraction':
      return <EffectPanel />;

    // ── Audio ──
    case 'font-library':
      return <SoundFontPanel />;
    case 'font-preview':
      return <SoundFontPanel />;
    case 'mixer-eq':
      return <AudioPanel />;
    case 'smoothswing-config':
      return <ComingSoon label="SmoothSwing Config" />;

    // ── Gallery ──
    case 'builtin-presets':
      return <PresetGallery />;
    case 'my-presets':
      return <PresetGallery />;
    case 'community-gallery':
      return <CommunityGallery />;
    case 'preset-detail':
      return <PresetGallery />;

    // ── Output ──
    case 'code-output':
      return <CodeOutput />;
    case 'power-draw':
      return <PowerDrawPanel />;
    case 'storage-budget':
      return <StorageBudgetPanel />;
    case 'saber-profiles':
      return <SaberProfileManager />;
    case 'card-writer':
      return <CardWriter />;

    default:
      return <ComingSoon label={panelId} />;
  }
}

// ─── TabColumnContent ─────────────────────────────────────────────────────────

/**
 * TabColumnContent bridges the tab + layout stores with the ColumnGrid
 * component.  It reads the active tab, retrieves the persisted column
 * assignment and column count for that tab, and renders ColumnGrid with a
 * fully-wired renderPanel function.
 *
 * Usage:
 *   <TabColumnContent />
 *
 * No props needed — everything is read from stores.
 */
export function TabColumnContent() {
  const activeTab = useUIStore((s) => s.activeTab) as TabId;

  // Drive the store's columnCount from the viewport width automatically.
  // The hook also returns the current value so we can pass it straight to
  // ColumnGrid without a second store selector.
  const columnCount = useResponsiveColumns();
  const columns = useLayoutStore((s) => s.columns[activeTab] ?? [[]]);
  const collapsedPanels = useLayoutStore((s) => s.collapsedPanels);

  const movePanelToColumn = useLayoutStore((s) => s.movePanelToColumn);
  const reorderPanelInColumn = useLayoutStore((s) => s.reorderPanelInColumn);
  const togglePanelCollapsed = useLayoutStore((s) => s.togglePanelCollapsed);

  // Stable callbacks that capture the current activeTab via closure
  const handleMovePanel = useCallback(
    (panelId: string, targetColumn: number, targetIndex: number) => {
      movePanelToColumn(activeTab, panelId as PanelId, targetColumn, targetIndex);
    },
    [activeTab, movePanelToColumn],
  );

  const handleReorderPanel = useCallback(
    (column: number, fromIndex: number, toIndex: number) => {
      reorderPanelInColumn(activeTab, column, fromIndex, toIndex);
    },
    [activeTab, reorderPanelInColumn],
  );

  const handleToggleCollapse = useCallback(
    (panelId: string) => {
      togglePanelCollapsed(panelId as PanelId);
    },
    [togglePanelCollapsed],
  );

  return (
    <ColumnGrid
      tabId={activeTab}
      columnCount={columnCount}
      columns={columns}
      onMovePanel={handleMovePanel}
      onReorderPanel={handleReorderPanel}
      onToggleCollapse={handleToggleCollapse}
      collapsedPanels={collapsedPanels}
      renderPanel={renderPanel}
    />
  );
}
