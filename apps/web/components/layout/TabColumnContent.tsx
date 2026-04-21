'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useLayoutStore } from '@/stores/layoutStore';
import type { PanelId, TabId } from '@/stores/layoutStore';
import { ColumnGrid } from './ColumnGrid';
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns';
import { TabContentSkeleton } from '@/components/shared/Skeleton';

// ─── Panel imports — only components that exist ───────────────────────────────

import { StylePanel } from '@/components/editor/StylePanel';
import { ColorPanel } from '@/components/editor/ColorPanel';
import { ParameterBank } from '@/components/editor/ParameterBank';
import { LayerStack } from '@/components/editor/LayerStack';
import { OLEDPreview } from '@/components/editor/OLEDPreview';
import { ThemePickerPanel } from '@/components/editor/ThemePickerPanel';
import { EffectPanel } from '@/components/editor/EffectPanel';
import { GestureControlPanel } from '@/components/editor/GestureControlPanel';
import { MotionSimPanel } from '@/components/editor/MotionSimPanel';
import { SoundFontPanel } from '@/components/editor/SoundFontPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
// SmoothSwingPanel is kept as a fallback for persisted layouts that still
// reference the legacy `smoothswing-config` panel slot. It now renders a
// "SmoothSwing has moved" notice and a one-click action to add (or
// select) the SmoothSwing layer in LayerStack — per item #15 of the
// 2026-04-18 UX overhaul, SmoothSwing lives inside LayerStack as a
// modulator plate rather than as a sibling panel.
import { SmoothSwingPanel } from '@/components/editor/SmoothSwingPanel';
import { PresetGallery, PresetDetail } from '@/components/editor/PresetGallery';
import { usePresetDetailStore } from '@/stores/presetDetailStore';
import { CodeOutput } from '@/components/editor/CodeOutput';
import { PowerDrawPanel } from '@/components/editor/PowerDrawPanel';
import { StorageBudgetPanel } from '@/components/editor/StorageBudgetPanel';
import { SaberProfileManager } from '@/components/editor/SaberProfileManager';
import { CardWriter } from '@/components/editor/CardWriter';
import { FlashPanel } from '@/components/editor/FlashPanel';
import { CompatibilityPanel } from '@/components/editor/CompatibilityPanel';
import { OLEDEditor } from '@/components/editor/OLEDEditor';
import { GradientBuilder } from '@/components/editor/GradientBuilder';
import { OutputWorkflowGuide } from '@/components/editor/OutputWorkflowGuide';
import { IgnitionRetractionPanel } from '@/components/editor/IgnitionRetractionPanel';
// CrystalPanel stays statically imported — the Three.js payload is
// already dynamic inside the panel (apps/web/components/editor/CrystalPanel.tsx
// wraps `KyberCrystal` via next/dynamic), which carries the real perf
// cost. A second-level dynamic() wrapper here caused a ChunkLoadError
// under Turbopack HMR (`_next/undefined` chunk URL), so we keep the
// static import for stability and revisit the named-export dynamic
// pattern in a follow-up. Originally flagged in the 2026-04-19 perf
// audit §2.
import { CrystalPanel } from '@/components/editor/CrystalPanel';
import { useAudioMixerStore } from '@/stores/audioMixerStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

// ─── Coming-soon placeholder ──────────────────────────────────────────────────

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
      <span className="text-ui-sm text-text-muted font-mono">{label}</span>
      <span className="text-ui-xs text-text-muted/50">Coming soon</span>
    </div>
  );
}

// ─── Preset Detail standalone panel ───────────────────────────────────────────

/**
 * Standalone workbench-slot panel for the preset-detail view. Reads the
 * currently-selected preset from `presetDetailStore` — the same store the
 * PresetGallery writes to when a user clicks a preset tile — so docking
 * this panel anywhere in the layout keeps it in sync with gallery
 * selection automatically. Shows a useful empty state when no preset is
 * currently selected.
 */
function PresetDetailPanelConnected() {
  const detailPreset = usePresetDetailStore((s) => s.detailPreset);
  const clearDetailPreset = usePresetDetailStore((s) => s.clearDetailPreset);

  if (!detailPreset) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
        <span className="text-ui-sm text-text-muted font-mono">No preset selected</span>
        <span className="text-ui-xs text-text-muted/60">
          Open the Gallery and click a preset tile to view its details here.
        </span>
      </div>
    );
  }

  return <PresetDetail preset={detailPreset} onClose={clearDetailPreset} />;
}

// ─── ThemePickerPanel wrapper (needs store-bound props) ───────────────────────

/**
 * Thin wrapper that reads canvasTheme from uiStore and passes it as props to
 * ThemePickerPanel, since renderPanel is a plain function and cannot call hooks.
 */
function ThemePickerPanelConnected() {
  const canvasTheme = useUIStore((s) => s.canvasTheme);
  const setCanvasTheme = useUIStore((s) => s.setCanvasTheme);
  return (
    <ThemePickerPanel
      activeThemeId={canvasTheme}
      onSelectTheme={setCanvasTheme}
    />
  );
}

// ─── Effect Presets standalone panel ──────────────────────────────────────────
//
// Extracted from SoundFontPanel so it can live in its own layout slot.

const AUDIO_EFFECT_PRESETS = [
  { id: 'clean', label: 'Clean', description: 'No effects, pure sound' },
  { id: 'kylo-unstable', label: 'Kylo Unstable', description: 'Distortion + high-pass crackle' },
  { id: 'cave-echo', label: 'Cave Echo', description: 'Deep reverb + echo' },
  { id: 'lo-fi-retro', label: 'Lo-Fi Retro', description: 'Bitcrusher + low-pass warmth' },
  { id: 'underwater', label: 'Underwater', description: 'Heavy low-pass + chorus' },
  { id: 'force-tunnel', label: 'Force Tunnel', description: 'Phaser + reverb + pitch shift' },
];

function EffectPresetsPanel() {
  const activePreset = useAudioMixerStore((s) => s.activePresetId);
  const applyPreset = useAudioMixerStore((s) => s.applyPreset);

  return (
    <div className="space-y-3">
      <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
        Effect Chain Presets
        <HelpTooltip text="One-click audio effect combos for common saber sounds. Each preset sets multiple EQ and effects sliders at once. Switch to the Mixer / EQ panel to fine-tune after applying." />
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {AUDIO_EFFECT_PRESETS.map((preset) => {
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`text-left px-3 py-2.5 rounded text-ui-xs transition-colors border ${
                isActive
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light'
              }`}
            >
              <div className="font-medium">{preset.label}</div>
              <div className="text-ui-sm text-text-muted mt-0.5">{preset.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Panel renderer ───────────────────────────────────────────────────────────

/**
 * Maps a PanelId string to the concrete React component (or placeholder) for
 * that panel.  This is passed to ColumnGrid as the renderPanel prop.
 */
function renderPanel(panelId: string): React.ReactNode {
  // Legacy alias: 'smoothswing-config' is a panel slot from before the
  // 2026-04-18 UX overhaul. Persisted layouts on returning users' machines
  // may still reference it, so we route it to SmoothSwingPanel (which now
  // renders a "SmoothSwing has moved \u2014 add a plate in LayerStack" notice)
  // rather than letting it fall through to ComingSoon. Users can drop the
  // panel from their column at that point.
  if (panelId === 'smoothswing-config') {
    return <SmoothSwingPanel />;
  }

  switch (panelId as PanelId) {
    // ── Design ──
    case 'style-select':
      return <StylePanel />;
    case 'color-picker':
      return <ColorPanel />;
    case 'parameters':
      return <ParameterBank />;
    // Legacy: `randomizer` was a dockable Design-tab panel until OV3
    // (2026-04-21). The randomizer is now surfaced as the SURPRISE ME
    // card in the Gallery tab marquee. Any persisted user layout that
    // still lists 'randomizer' in its column arrangement will fall
    // through to ComingSoon (harmless placeholder); users can drop
    // that entry at will.
    case 'my-crystal':
      return <CrystalPanel />;
    case 'layer-stack':
      return <LayerStack />;
    case 'oled-preview':
      return <OLEDPreview />;
    case 'theme-picker':
      // Canvas background theme selector — wires to uiStore.canvasTheme
      return <ThemePickerPanelConnected />;
    case 'gradient-builder':
      return <GradientBuilder />;
    case 'ignition-retraction':
      // Ignition style selector + speed, retraction style selector + speed only
      return <IgnitionRetractionPanel />;

    // ── Dynamics ──
    case 'effect-triggers':
      // Main effect panel: clash, blast, lockup, stab, force triggers + per-effect config
      return <EffectPanel />;
    case 'effect-config':
      // Fett263 gesture defines — prop-level effect configuration (#define statements)
      return <GestureControlPanel />;
    case 'motion-simulation':
      return <MotionSimPanel />;

    // ── Audio ──
    case 'font-library':
      // Full font browser: library scanner, font list, load-to-active
      return <SoundFontPanel />;
    case 'mixer-eq':
      return <AudioPanel />;
    case 'effect-presets':
      return <EffectPresetsPanel />;

    // ── Gallery ──
    case 'gallery-browser':
      // Unified gallery with Built-in / My Presets / Community sub-tabs
      return <PresetGallery />;
    case 'preset-detail':
      // Reads selected preset from presetDetailStore — stays in sync with
      // any click-to-select action inside PresetGallery automatically.
      return <PresetDetailPanelConnected />;

    // ── Output ──
    case 'output-workflow':
      return <OutputWorkflowGuide />;
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
    case 'flash-to-saber':
      return <FlashPanel />;
    case 'compatibility':
      // Board compatibility matrix — Proffie V3/V2, CFX, GH, Xeno, etc.
      return <CompatibilityPanel />;
    case 'oled-editor':
      return <OLEDEditor />;

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

  // Suppress SSR / first-paint flash — show skeleton until layout store is
  // hydrated on the client (the store reads from localStorage on mount).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Drive the store's columnCount from the viewport width automatically.
  // The hook also returns the current value so we can pass it straight to
  // ColumnGrid without a second store selector.
  const columnCount = useResponsiveColumns();
  const columns = useLayoutStore((s) => s.columns[activeTab] ?? [[]]);
  const collapsedPanels = useLayoutStore((s) => s.collapsedPanels);

  const columnWidths = useLayoutStore((s) => s.columnWidths[activeTab]);
  const setColumnWidths = useLayoutStore((s) => s.setColumnWidths);
  const movePanelToColumn = useLayoutStore((s) => s.movePanelToColumn);
  const reorderPanelInColumn = useLayoutStore((s) => s.reorderPanelInColumn);
  const togglePanelCollapsed = useLayoutStore((s) => s.togglePanelCollapsed);

  const handleColumnWidthsChange = useCallback(
    (widths: number[]) => {
      setColumnWidths(activeTab, widths);
    },
    [activeTab, setColumnWidths],
  );

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

  if (!mounted) {
    return <TabContentSkeleton columns={columnCount} />;
  }

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
      columnWidths={columnWidths}
      onColumnWidthsChange={handleColumnWidthsChange}
    />
  );
}
