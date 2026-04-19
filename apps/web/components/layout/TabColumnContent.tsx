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
import { Randomizer } from '@/components/editor/Randomizer';
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
import { ComparisonView } from '@/components/editor/ComparisonView';
import { OutputWorkflowGuide } from '@/components/editor/OutputWorkflowGuide';
import dynamic from 'next/dynamic';

// CrystalPanel pulls in the Three.js Kyber Crystal renderer. Even though
// the heavy three.js payload is already dynamic inside the panel, the
// panel module itself (and its transitive static imports) used to
// evaluate on every editor mount because TabColumnContent is always
// loaded. Deferring the panel module to actual render-time keeps it
// out of the editor page bundle for users who never open the "My
// Crystal" panel. See the 2026-04-19 perf audit §2.
const CrystalPanel = dynamic(
  () => import('@/components/editor/CrystalPanel').then((m) => m.CrystalPanel),
  {
    ssr: false,
    loading: () => (
      <div className="text-ui-xs text-text-muted italic p-3">
        Loading crystal…
      </div>
    ),
  },
);
import { useBladeStore } from '@/stores/bladeStore';
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

// ─── Font preview placeholder ─────────────────────────────────────────────────

function FontPreviewPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
      <span className="text-ui-sm text-text-muted font-mono">Font Preview</span>
      <span className="text-ui-xs text-text-muted/50">Select a font from the library to preview</span>
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

// ─── Ignition / Retraction focused panel ─────────────────────────────────────
//
// Renders only the ignition + retraction sections so the ignition-retraction
// panel slot has a distinct view instead of duplicating the full EffectPanel.

const IGNITION_STYLES_IR = [
  { id: 'standard',     label: 'Standard',    desc: 'Classic linear ignition' },
  { id: 'scroll',       label: 'Scroll',       desc: 'Scrolling pixel fill' },
  { id: 'spark',        label: 'Spark',        desc: 'Crackling spark ignition' },
  { id: 'center',       label: 'Center Out',   desc: 'Ignites from center' },
  { id: 'wipe',         label: 'Wipe',         desc: 'Soft wipe reveal' },
  { id: 'stutter',      label: 'Stutter',      desc: 'Flickering unstable ignition' },
  { id: 'glitch',       label: 'Glitch',       desc: 'Digital glitch effect' },
  { id: 'twist',        label: 'Twist',        desc: 'Spiral ignition driven by twist' },
  { id: 'swing',        label: 'Swing',        desc: 'Speed-reactive swing ignition' },
  { id: 'stab',         label: 'Stab',         desc: 'Rapid center-out burst' },
  { id: 'crackle',      label: 'Crackle',      desc: 'Random segment flicker fill' },
  { id: 'fracture',     label: 'Fracture',     desc: 'Radiating crack points' },
  { id: 'flash-fill',   label: 'Flash Fill',   desc: 'White flash then color wipe' },
  { id: 'pulse-wave',   label: 'Pulse Wave',   desc: 'Sequential building waves' },
  { id: 'drip-up',      label: 'Drip Up',      desc: 'Fluid upward flow' },
  { id: 'hyperspace',   label: 'Hyperspace',   desc: 'Streaking star-line ignition' },
  { id: 'summon',       label: 'Summon',       desc: 'Force-pull ignition' },
  { id: 'seismic',      label: 'Seismic',      desc: 'Ground-shake ripple ignition' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];

const RETRACTION_STYLES_IR = [
  { id: 'standard',     label: 'Standard',    desc: 'Linear retraction' },
  { id: 'scroll',       label: 'Scroll',       desc: 'Scrolling retract' },
  { id: 'fadeout',      label: 'Fade Out',     desc: 'Fading retraction' },
  { id: 'center',       label: 'Center In',    desc: 'Retracts to center' },
  { id: 'shatter',      label: 'Shatter',      desc: 'Shattering retraction' },
  { id: 'dissolve',     label: 'Dissolve',     desc: 'Random shuffle turn-off' },
  { id: 'flickerOut',   label: 'Flicker Out',  desc: 'Tip-to-base flicker band' },
  { id: 'unravel',      label: 'Unravel',      desc: 'Sinusoidal thread unwind' },
  { id: 'drain',        label: 'Drain',        desc: 'Gravity drain with meniscus' },
  { id: 'implode',      label: 'Implode',      desc: 'Collapsing inward retraction' },
  { id: 'evaporate',    label: 'Evaporate',    desc: 'Fading particle evaporation' },
  { id: 'spaghettify',  label: 'Spaghettify',  desc: 'Stretching gravitational pull' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];

function IgnitionRetractionPanel() {
  const config = useBladeStore((s) => s.config);
  const setIgnition = useBladeStore((s) => s.setIgnition);
  const setRetraction = useBladeStore((s) => s.setRetraction);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  return (
    <div className="space-y-4">
      {/* Ignition */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Ignition Style
          <HelpTooltip
            text="How the blade extends when activated. Controls the visual transition from off to on."
            proffie="InOutTrL<TrWipe<300>>"
          />
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {IGNITION_STYLES_IR.map((style) => (
            <button
              key={style.id}
              onClick={() => setIgnition(style.id)}
              title={style.desc}
              className={`touch-target text-left px-2 py-1.5 rounded text-ui-base font-medium transition-colors border ${
                config.ignition === style.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-ui-xs text-text-muted w-24 shrink-0">Ignition Speed</span>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={(config.ignitionMs as number | undefined) ?? 300}
            onChange={(e) => updateConfig({ ignitionMs: Number(e.target.value) })}
            aria-label="Ignition speed in milliseconds"
            className="flex-1"
          />
          <span className="text-ui-xs text-text-muted font-mono w-12 text-right">
            {(config.ignitionMs as number | undefined) ?? 300}ms
          </span>
        </div>
      </div>

      {/* Retraction */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Retraction Style
          <HelpTooltip text="How the blade retracts when deactivated." proffie="InOutTrL<TrWipe<500>>" />
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {RETRACTION_STYLES_IR.map((style) => (
            <button
              key={style.id}
              onClick={() => setRetraction(style.id)}
              title={style.desc}
              className={`touch-target text-left px-2 py-1.5 rounded text-ui-base font-medium transition-colors border ${
                config.retraction === style.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-ui-xs text-text-muted w-24 shrink-0">Retraction Speed</span>
          <input
            type="range"
            min={100}
            max={3000}
            step={50}
            value={(config.retractionMs as number | undefined) ?? 500}
            onChange={(e) => updateConfig({ retractionMs: Number(e.target.value) })}
            aria-label="Retraction speed in milliseconds"
            className="flex-1"
          />
          <span className="text-ui-xs text-text-muted font-mono w-12 text-right">
            {(config.retractionMs as number | undefined) ?? 500}ms
          </span>
        </div>
      </div>
    </div>
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
    case 'randomizer':
      return <Randomizer />;
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
    case 'gesture-config':
      return <GestureControlPanel />;
    case 'comparison-view':
      return <ComparisonView />;

    // ── Audio ──
    case 'font-library':
      // Full font browser: library scanner, font list, load-to-active
      return <SoundFontPanel />;
    case 'font-preview':
      // Placeholder until SoundFontPanel gains a dedicated preview-only mode
      return <FontPreviewPlaceholder />;
    case 'mixer-eq':
      return <AudioPanel />;
    case 'effect-presets':
      return <EffectPresetsPanel />;

    // ── Gallery ──
    case 'gallery-browser':
      // Unified gallery with Built-in / My Presets / Community sub-tabs
      return <PresetGallery />;
    case 'builtin-presets':
      // Legacy slot — redirects to the unified gallery on the built-in tab
      return <PresetGallery initialTab="gallery" />;
    case 'my-presets':
      // Legacy slot — redirects to the unified gallery on the my-presets tab
      return <PresetGallery initialTab="my-presets" />;
    case 'community-gallery':
      // Legacy slot — redirects to the unified gallery on the community tab
      return <PresetGallery initialTab="community" />;
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
