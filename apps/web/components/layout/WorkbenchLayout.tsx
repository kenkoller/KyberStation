'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTimelinePlayback } from '@/hooks/useTimelinePlayback';

import { useUIStore } from '@/stores/uiStore';
import type { ActiveTab } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { playUISound, getUISoundEngine } from '@/lib/uiSounds';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useThemeApplier } from '@/hooks/useThemeApplier';
import { useAccessibilityApplier } from '@/hooks/useAccessibilityApplier';
import { usePerformanceTier } from '@/hooks/usePerformanceTier';
import { useAurebesh } from '@/hooks/useAurebesh';
import { usePauseSystem } from '@/hooks/usePauseSystem';
import { usePresetListSync } from '@/hooks/usePresetListSync';
import { useHistoryTracking } from '@/hooks/useHistoryTracking';
import { usePresetListStore } from '@/stores/presetListStore';
import { PauseButton } from '@/components/layout/PauseButton';
import { ShareButton } from '@/components/layout/ShareButton';
import { UndoRedoButtons } from '@/components/layout/UndoRedoButtons';
import { StatusBar } from '@/components/layout/StatusBar';
import { FPSCounter } from '@/components/layout/FPSCounter';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { SaberWizard } from '@/components/onboarding/SaberWizard';
import { VisualizationToolbar } from '@/components/editor/VisualizationToolbar';
import { VisualizationStack } from '@/components/editor/VisualizationStack';
import { PixelDebugOverlay } from '@/components/editor/PixelDebugOverlay';
import { CanvasLayout } from '@/components/editor/CanvasLayout';
import { BladeCanvas3D } from '@/components/editor/BladeCanvas3DWrapper';
import { DesignPanel } from '@/components/editor/DesignPanel';
import { DynamicsPanel } from '@/components/editor/DynamicsPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
import { PresetGallery } from '@/components/editor/PresetGallery';
import { OutputPanel } from '@/components/editor/OutputPanel';
import { EffectComparisonPanel } from '@/components/editor/EffectComparisonPanel';
import { SaberProfileSwitcher } from '@/components/editor/SaberProfileSwitcher';
import { TabColumnContent } from '@/components/layout/TabColumnContent';
import { FullscreenPreview, FullscreenButton } from '@/components/editor/FullscreenPreview';
import { DataTicker } from '@/components/hud/DataTicker';
import { ScanSweep } from '@/components/hud/ScanSweep';
import { CornerBrackets } from '@/components/hud/CornerBrackets';
import { CanvasSkeleton } from '@/components/shared/Skeleton';
import { LATEST_VERSION } from '@/lib/version';
import Link from 'next/link';

// ─── HUD status messages for the header DataTicker ───
const HUD_TICKER_MESSAGES = [
  'SYSTEMS NOMINAL',
  'BLADE CALIBRATED',
  'KYBER ALIGNED',
  'POWER STABLE',
  'CRYSTAL RESONANT',
  'STYLE ENGINE READY',
  'PROFFIE OS 7.x',
  'LED MATRIX SYNC',
];

// ─── Tab Definitions ───

const TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'design', label: 'Design' },
  { id: 'dynamics', label: 'Dynamics' },
  { id: 'audio', label: 'Audio' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'output', label: 'Output' },
];

// ─── Tab Reorder Hook ───

function useOrderedTabs() {
  const tabOrder = useUIStore((s) => s.tabOrder);

  return useMemo(() => {
    if (!tabOrder || tabOrder.length === 0) return TABS;

    const byId = new Map(TABS.map((t) => [t.id, t]));
    const ordered: typeof TABS = [];

    for (const id of tabOrder) {
      const t = byId.get(id as ActiveTab);
      if (t) {
        ordered.push(t);
        byId.delete(id as ActiveTab);
      }
    }

    // Append any tabs not in saved order (e.g. newly added tabs)
    for (const t of byId.values()) {
      ordered.push(t);
    }

    return ordered;
  }, [tabOrder]);
}

// ─── Tab Content Router ───

function TabContent({ activeTab }: { activeTab: ActiveTab }) {
  switch (activeTab) {
    case 'design':
      return <DesignPanel />;
    case 'dynamics':
      return <DynamicsPanel />;
    case 'audio':
      return <AudioPanel />;
    case 'gallery':
      return <PresetGallery />;
    case 'output':
      return <OutputPanel />;
  }
}

// ─── Main Component ───

/**
 * WorkbenchLayout — desktop editor layout for KyberStation.
 *
 * Structure (top to bottom):
 *  1. Header bar — logo, project name, undo/redo, FPS, share, settings
 *  2. Blade + visualization stack — horizontal blade canvas, always visible
 *  3. Tab bar — horizontal, drag-to-reorder
 *  4. Multi-column panel content — fills remaining space, scrollable
 *  5. Effect comparison strips — collapsible
 *  6. Status bar — power draw, storage budget, LED count
 *
 * Designed for desktop only. AppShell can render this for the desktop breakpoint
 * while keeping mobile/tablet layouts separate.
 */
export function WorkbenchLayout() {
  const { engineRef, toggle, triggerEffect, releaseEffect } = useBladeEngine();
  const audio = useAudioEngine();
  useThemeApplier();
  useAccessibilityApplier();
  usePerformanceTier();
  useAurebesh();
  usePauseSystem();
  usePresetListSync();
  useHistoryTracking();

  // ── Store selectors ──
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const showEffectComparison = useUIStore((s) => s.showEffectComparison);
  const toggleEffectComparison = useUIStore((s) => s.toggleEffectComparison);
  const setTabOrder = useUIStore((s) => s.setTabOrder);
  const presetListCount = usePresetListStore((s) => s.entries.length);
  const canvasMode = useUIStore((s) => s.canvasMode);
  const setCanvasMode = useUIStore((s) => s.setCanvasMode);

  const isOn = useBladeStore((s) => s.isOn);
  const ledCount = useBladeStore((s) => s.config.ledCount);

  // Active saber profile name — used in the header breadcrumb alongside
  // the version string. Falls back to undefined when no profile exists.
  const activeSaberName = useSaberProfileStore((s) => {
    const active = s.profiles.find((p) => p.id === s.activeProfileId);
    return active?.name;
  });

  // ── Pixel buffer for VisualizationStack ──
  // Capture the engine's live Uint8Array once after mount. getPixels() returns
  // the same buffer reference every call (mutated in place each frame), so
  // LayerCanvas draw calls will always read the latest pixel values.
  const pixelBufRef = useRef<Uint8Array | null>(null);
  useEffect(() => {
    pixelBufRef.current = engineRef.current?.getPixels() ?? null;
  }, [engineRef]);

  // ── Audio-wrapped toggle + effects ──
  const toggleWithAudio = useCallback(() => {
    const wasOn = useBladeStore.getState().isOn;
    toggle();
    if (wasOn) {
      audio.playRetraction();
    } else {
      audio.playIgnition();
    }
  }, [toggle, audio]);

  const triggerEffectWithAudio = useCallback(
    (type: string) => {
      triggerEffect(type);
      const audioMap: Record<string, () => void> = {
        clash: audio.playClash,
        blast: audio.playBlast,
        stab: audio.playStab,
        lockup: audio.playLockup,
        lightning: audio.playClash,
        drag: audio.playLockup,
        melt: audio.playLockup,
        force: audio.playSwing,
      };
      audioMap[type]?.();
    },
    [triggerEffect, audio],
  );

  // ── Combined sound mute toggle — controls font audio + UI sounds ──
  const toggleSoundMute = useCallback(() => {
    audio.toggleMute();
    // Sync UI sound engine: if we're about to unmute, set UI sounds to 'subtle';
    // if muting, set to 'silent'.  audio.muted is the *current* value (pre-toggle).
    const uiEngine = getUISoundEngine();
    if (audio.muted) {
      // Was muted, now unmuting — enable UI sounds
      uiEngine.setPreset('subtle');
    } else {
      // Was unmuted, now muting — silence UI sounds
      uiEngine.setPreset('silent');
    }
  }, [audio]);

  // ── Keyboard shortcuts + timeline ──
  const handlers = useMemo(
    () => ({ toggle: toggleWithAudio, triggerEffect: triggerEffectWithAudio, releaseEffect }),
    [toggleWithAudio, triggerEffectWithAudio, releaseEffect],
  );
  useKeyboardShortcuts(handlers);
  useTimelinePlayback(toggleWithAudio, triggerEffectWithAudio);

  // ── Engine ready guard — show CanvasSkeleton until the engine mounts ──
  const [engineReady, setEngineReady] = useState(false);
  useEffect(() => {
    // engineRef is populated by useBladeEngine's first useEffect; wait one
    // microtask to let it run before marking ready.
    const id = requestAnimationFrame(() => setEngineReady(true));
    return () => cancelAnimationFrame(id);
  }, [engineRef]);

  // ── Settings modal state ──
  const [showSettings, setShowSettings] = useState(false);
  // ── Saber Wizard state ──
  const [showWizard, setShowWizard] = useState(false);

  // ── Tab drag-to-reorder state ──
  const orderedTabs = useOrderedTabs();
  const [tabDragId, setTabDragId] = useState<string | null>(null);
  const [tabDragOverId, setTabDragOverId] = useState<string | null>(null);

  const handleTabDragStart = useCallback((e: React.DragEvent, id: string) => {
    setTabDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // Capture the node before rAF — React pools SyntheticEvent and nulls currentTarget.
    const target = e.currentTarget;
    if (target instanceof HTMLElement) {
      requestAnimationFrame(() => {
        target.style.opacity = '0.4';
      });
    }
  }, []);

  const handleTabDragEnd = useCallback((e: React.DragEvent) => {
    setTabDragId(null);
    setTabDragOverId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '';
    }
  }, []);

  const handleTabDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (id !== tabDragId) {
        setTabDragOverId(id);
      }
    },
    [tabDragId],
  );

  const handleTabDragLeave = useCallback(() => {
    setTabDragOverId(null);
  }, []);

  const handleTabDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain');
      if (!sourceId || sourceId === targetId) {
        setTabDragOverId(null);
        return;
      }

      const currentOrder = orderedTabs.map((t) => t.id);
      const sourceIdx = currentOrder.indexOf(sourceId as ActiveTab);
      const targetIdx = currentOrder.indexOf(targetId as ActiveTab);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const newOrder = [...currentOrder];
      newOrder.splice(sourceIdx, 1);
      newOrder.splice(targetIdx, 0, sourceId as ActiveTab);

      setTabOrder(newOrder);
      setTabDragOverId(null);
    },
    [orderedTabs, setTabOrder],
  );

  // ─── Render ───
  return (
    <div className="h-screen flex flex-col bg-bg-deep text-text-primary font-mono overflow-hidden">
      {/* ════════════════════════════════════════════════════
       * 1. HEADER BAR
       * ════════════════════════════════════════════════════ */}
      <header className="relative flex items-center justify-between px-4 py-1.5 border-b border-border-subtle bg-bg-secondary shrink-0">
        {/* HUD: decorative data ticker running behind header content */}
        <DataTicker
          data={HUD_TICKER_MESSAGES}
          speed={30}
          className="absolute inset-0 flex items-end pb-px pointer-events-none"
        />
        {/* Left cluster: logo + project name */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-none">
            <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
              <span className="text-white">KYBER</span>
              <span className="text-accent">STATION</span>
            </h1>
            {/* Version + active saber breadcrumb — single source of truth
                via `@/lib/version`. JetBrains Mono / tabular-nums per UX
                North Star (monospace for version + telemetry data). */}
            <span
              className="font-mono text-text-muted tabular-nums select-none tracking-wide"
              style={{ fontSize: 9, marginTop: 1 }}
              aria-label={`KyberStation version ${LATEST_VERSION}${activeSaberName ? `, active saber ${activeSaberName}` : ''}`}
            >
              v{LATEST_VERSION}
              {activeSaberName && (
                <>
                  <span className="text-text-muted/60 mx-1" aria-hidden="true">·</span>
                  <span>{activeSaberName}</span>
                </>
              )}
            </span>
          </div>
          <span className="text-ui-xs text-text-muted font-sw-body hidden desktop:inline">
            Universal Saber Style Engine
          </span>

          <UndoRedoButtons />

          <SaberProfileSwitcher />
        </div>

        {/* Right cluster: FPS, controls, ignite */}
        <div className="flex items-center gap-2">
          <ShareButton />

          <FPSCounter />

          <PauseButton />

          {/* Audio mute — controls both font audio engine and UI sounds */}
          <button
            onClick={toggleSoundMute}
            className={`px-2 py-1 rounded text-ui-xs font-medium border transition-colors ${
              audio.muted
                ? 'border-border-subtle text-text-muted hover:text-text-secondary'
                : 'border-accent-border/40 text-accent bg-accent-dim/30'
            }`}
            title={audio.muted ? 'Unmute all audio (font sounds + UI sounds)' : 'Mute all audio'}
          >
            {audio.muted ? 'Sound OFF' : 'Sound ON'}
          </button>

          {/* Effect comparison toggle */}
          <button
            onClick={toggleEffectComparison}
            className={`px-2 py-1 rounded text-ui-xs font-medium border transition-colors ${
              showEffectComparison
                ? 'border-accent-border/40 text-accent bg-accent-dim/30'
                : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light'
            }`}
            title="Toggle effect comparison strips"
          >
            FX Compare
          </button>

          {/* Docs */}
          <Link
            href="/docs"
            target="_blank"
            className="px-2 py-1 rounded text-ui-xs font-medium border border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light transition-colors hidden desktop:inline-flex"
          >
            Docs
          </Link>

          <button
            onClick={() => setShowWizard(true)}
            className="px-2 py-1 rounded text-ui-xs font-medium border border-accent/40 text-accent hover:bg-accent/10 transition-colors inline-flex items-center gap-1"
            title="Launch the guided Saber Wizard — 3 steps to a complete preset"
            aria-label="Open Saber Wizard"
            style={{
              // Subtle crystal-colour glow on hover — the var is set by
              // useCrystalAccent to match the current blade base colour.
              boxShadow: '0 0 8px rgb(var(--crystal-accent, var(--accent)) / 0.25)',
            }}
          >
            <span aria-hidden="true">✦</span>
            <span className="hidden tablet:inline">Wizard</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="px-2 py-1 rounded text-ui-xs font-medium border border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light transition-colors hidden desktop:inline-flex"
            title="Settings"
            aria-label="Open settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════
       * 2. BLADE + VISUALIZATION STACK — always visible
       * ════════════════════════════════════════════════════ */}
      <section
        className="shrink-0 border-b border-border-subtle bg-bg-primary flex"
        style={{ height: 280 }}
        role="region"
        aria-label="Blade visualization"
      >
        <VisualizationToolbar className="shrink-0 w-10" orientation="vertical" />

        {/* Blade canvas area — horizontal, fills remaining width */}
        <CornerBrackets className="flex-1 min-w-0" size={16} thickness={1} pulse={true}>
          <div className="h-full p-1 relative">
            {!engineReady ? (
              <CanvasSkeleton className="h-full" />
            ) : canvasMode === '3d' ? (
              <BladeCanvas3D />
            ) : (
              <CanvasLayout engineRef={engineRef} />
            )}
            {/* Controls — top-right corner of canvas area */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
              {/* 2D / 3D view toggle */}
              <div className="flex rounded overflow-hidden border border-border-subtle">
                <button
                  onClick={() => setCanvasMode('2d')}
                  className={`px-2 py-0.5 text-ui-xs font-medium transition-colors ${
                    canvasMode === '2d'
                      ? 'bg-accent-dim text-accent border-r border-accent-border/40'
                      : 'bg-transparent text-text-muted hover:text-text-secondary border-r border-border-subtle'
                  }`}
                  title="2D blade view"
                  aria-pressed={canvasMode === '2d'}
                >
                  2D
                </button>
                <button
                  onClick={() => setCanvasMode('3d')}
                  className={`px-2 py-0.5 text-ui-xs font-medium transition-colors ${
                    canvasMode === '3d'
                      ? 'bg-accent-dim text-accent'
                      : 'bg-transparent text-text-muted hover:text-text-secondary'
                  }`}
                  title="3D hilt + blade view"
                  aria-pressed={canvasMode === '3d'}
                >
                  3D
                </button>
              </div>
              <FullscreenButton />
            </div>
            {/* Pixel debug overlay only applies to 2D canvas mode */}
            {canvasMode === '2d' && (
              <PixelDebugOverlay
                getPixelRgb={(index) => {
                  const engine = engineRef.current;
                  if (engine) {
                    const buf = engine.getPixels();
                    const base = index * 3;
                    if (base + 2 < buf.length) {
                      return { r: buf[base], g: buf[base + 1], b: buf[base + 2] };
                    }
                  }
                  return { r: 0, g: 0, b: 0 };
                }}
                vertical={false}
                className="absolute inset-0 z-20"
              />
            )}
          </div>
        </CornerBrackets>
      </section>

      {/* ════════════════════════════════════════════════════
       * 2b. VISUALIZATION STACK — analysis layers below blade
       * ════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 overflow-y-auto max-h-[400px] border-b border-border-subtle bg-bg-primary"
        role="region"
        aria-label="Visualization analysis layers"
      >
        <VisualizationStack
          pixelData={pixelBufRef.current}
          pixelCount={ledCount}
        />
      </div>

      {/* ════════════════════════════════════════════════════
       * 2c. ACTION BAR — Ignite/Retract + effect trigger buttons
       * ════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b border-border-subtle bg-bg-secondary/40"
        role="toolbar"
        aria-label="Blade actions and effects"
      >
        {/* Ignite / Retract */}
        <button
          onClick={toggleWithAudio}
          className={`px-3 py-1 rounded text-ui-xs font-bold uppercase tracking-wider transition-all border ${
            isOn
              ? 'bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-900/50 ignite-btn-on'
              : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20 ignite-btn-off'
          }`}
          title={isOn ? 'Retract blade (Space)' : 'Ignite blade (Space)'}
        >
          {isOn ? 'Retract' : 'Ignite'}
        </button>

        <span className="w-px h-5 bg-border-subtle mx-1" aria-hidden="true" />

        {/* Effect trigger buttons */}
        {([
          { type: 'clash',     label: 'Clash',     key: 'C' },
          { type: 'blast',     label: 'Blast',     key: 'B' },
          { type: 'stab',      label: 'Stab',      key: 'S' },
          { type: 'lockup',    label: 'Lockup',    key: 'L' },
          { type: 'lightning',  label: 'Lightning', key: 'N' },
          { type: 'drag',      label: 'Drag',      key: 'D' },
          { type: 'melt',      label: 'Melt',      key: 'M' },
          { type: 'force',     label: 'Force',     key: 'F' },
          { type: 'shockwave', label: 'Shockwave', key: 'W' },
          { type: 'scatter',   label: 'Scatter',   key: '' },
          { type: 'fragment',  label: 'Fragment',  key: 'R' },
          { type: 'ripple',    label: 'Ripple',    key: '' },
          { type: 'freeze',    label: 'Freeze',    key: '' },
          { type: 'overcharge', label: 'Overcharge', key: '' },
          { type: 'bifurcate', label: 'Bifurcate', key: 'V' },
          { type: 'invert',    label: 'Invert',    key: '' },
          { type: 'ghostEcho', label: 'Ghost Echo', key: 'G' },
          { type: 'splinter',  label: 'Splinter',  key: 'P' },
          { type: 'coronary',  label: 'Coronary',  key: 'E' },
          { type: 'glitchMatrix', label: 'Glitch Matrix', key: 'X' },
          { type: 'siphon',    label: 'Siphon',    key: 'H' },
        ] as const).map(({ type, label, key }) => (
          <button
            key={type}
            onClick={() => triggerEffectWithAudio(type)}
            className="px-2 py-1 rounded text-ui-xs font-medium border border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light hover:bg-bg-secondary transition-colors"
            title={key ? `${label} effect (${key})` : `${label} effect`}
          >
            <span className="hidden desktop:inline">{label}</span>
            <span className="desktop:hidden">{key || label.slice(0, 2)}</span>
            {key && <kbd className="hidden desktop:inline ml-1 text-ui-xs text-text-muted/50">{key}</kbd>}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
       * 3. TAB BAR — horizontal, drag-to-reorder
       * ════════════════════════════════════════════════════ */}
      <nav
        className="relative flex items-center border-b border-border-subtle shrink-0 px-3 bg-bg-secondary/60"
        role="tablist"
        aria-label="Editor sections"
      >
        {/* HUD: subtle scan sweep in the far-right corner of the tab bar */}
        <ScanSweep
          size={48}
          speed={12}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40"
        />
        {orderedTabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            draggable
            onDragStart={(e) => handleTabDragStart(e, tab.id)}
            onDragEnd={handleTabDragEnd}
            onDragOver={(e) => handleTabDragOver(e, tab.id)}
            onDragLeave={handleTabDragLeave}
            onDrop={(e) => handleTabDrop(e, tab.id)}
            onClick={() => { playUISound('tab-switch'); setActiveTab(tab.id); }}
            className={[
              'px-3 py-2 text-ui-sm font-medium transition-colors relative whitespace-nowrap',
              'cursor-grab active:cursor-grabbing',
              activeTab === tab.id
                ? 'text-accent'
                : 'text-text-muted hover:text-text-secondary',
              tabDragOverId === tab.id && tabDragId !== tab.id
                ? 'border-l-2 border-l-accent'
                : 'border-l-2 border-l-transparent',
            ].join(' ')}
          >
            {tab.label}
            {tab.id === 'output' && presetListCount > 0 && (
              <span className="ml-1 text-ui-xs text-accent">({presetListCount})</span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1 right-1 h-[2px] bg-accent rounded-t" />
            )}
          </button>
        ))}
      </nav>

      {/* ════════════════════════════════════════════════════
       * 4. MULTI-COLUMN PANEL CONTENT — fills remaining space
       * ════════════════════════════════════════════════════ */}
      <main
        className="flex-1 min-h-0 overflow-y-auto bg-bg-deep"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {/* Desktop: multi-column draggable grid driven by layoutStore */}
        <div className="hidden desktop:block max-w-[1920px] mx-auto p-4">
          <TabColumnContent />
        </div>

        {/* Mobile / tablet fallback: single-column tab content */}
        <div className="desktop:hidden max-w-6xl mx-auto p-4">
          <TabContent activeTab={activeTab} />
        </div>
      </main>

      {/* ════════════════════════════════════════════════════
       * 5. EFFECT COMPARISON STRIPS — collapsible
       * ════════════════════════════════════════════════════ */}
      {showEffectComparison && (
        <section
          className="shrink-0 border-t border-border-subtle"
          role="region"
          aria-label="Effect comparison"
        >
          <EffectComparisonPanel />
        </section>
      )}

      {/* ════════════════════════════════════════════════════
       * 6. STATUS BAR — always visible
       * ════════════════════════════════════════════════════ */}
      <StatusBar />

      {/* ════════════════════════════════════════════════════
       * FULLSCREEN PREVIEW — portal-style fixed overlay
       * ════════════════════════════════════════════════════ */}
      <FullscreenPreview engineRef={engineRef} onTriggerEffect={triggerEffectWithAudio} />

      {/* ════════════════════════════════════════════════════
       * SETTINGS MODAL
       * ════════════════════════════════════════════════════ */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <SaberWizard open={showWizard} onClose={() => setShowWizard(false)} />
    </div>
  );
}
