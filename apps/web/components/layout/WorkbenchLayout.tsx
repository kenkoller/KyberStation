'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTimelinePlayback } from '@/hooks/useTimelinePlayback';

import { useUIStore } from '@/stores/uiStore';
import type { ActiveTab } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
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
import { KeyboardShortcutsModal } from '@/components/layout/KeyboardShortcutsModal';
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
import { CommandPalette } from '@/components/shared/CommandPalette';
import { useCommandPalette, useRegisterCommands } from '@/hooks/useCommandPalette';
import { useCommandStore, type Command } from '@/stores/commandStore';
import { CANVAS_THEMES } from '@/lib/canvasThemes';
import { EXTENDED_LOCATION_THEMES, EXTENDED_FACTION_THEMES } from '@/lib/extendedThemes';
import { useMetaKey } from '@/lib/platform';
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
  { id: 'design', label: 'DESIGN' },
  { id: 'dynamics', label: 'DYNAMICS' },
  { id: 'audio', label: 'AUDIO' },
  { id: 'gallery', label: 'GALLERY' },
  { id: 'output', label: 'OUTPUT' },
];

/**
 * Canonical tab-switch kbd positions (by index in the shipped TABS
 * array, not the user's reordered view). The actual display string is
 * computed at render time via `useMetaKey()` so Mac shows `⌘1` and
 * Windows / Linux shows `Ctrl+1`. The keyboard handler in
 * `useKeyboardShortcuts` uses `(e.metaKey || e.ctrlKey)` so either
 * modifier works regardless of platform — the display is purely cosmetic.
 */
const TAB_CANONICAL_DIGIT: Record<ActiveTab, string> = {
  design: '1',
  dynamics: '2',
  audio: '3',
  gallery: '4',
  output: '5',
};

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

  // Platform-aware kbd display: Mac shows ⌘K, Windows / Linux shows Ctrl+K.
  // The keyboard event handlers read (e.metaKey || e.ctrlKey) so either
  // physical modifier works regardless of what we display.
  const meta = useMetaKey();
  const kbdFor = (key: string) => `${meta.symbol}${meta.sep}${key}`;

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

  // Canvas theme — surfaced via the ⌘K command palette. We only need the
  // setter; subscribing to the current theme would churn the memoized
  // command list every time a theme command runs.
  const setCanvasTheme = useUIStore((s) => s.setCanvasTheme);

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

  // ── Modal visibility state ──
  // Declared before `handlers` so that `openShortcutsHelp` is in scope
  // when the keyboard-shortcut memo references it.
  const [showSettings, setShowSettings] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const openShortcutsHelp = useCallback(() => setShowShortcutsHelp(true), []);

  // ── Keyboard shortcuts + timeline ──
  const handlers = useMemo(
    () => ({
      toggle: toggleWithAudio,
      triggerEffect: triggerEffectWithAudio,
      releaseEffect,
      openHelp: openShortcutsHelp,
    }),
    [toggleWithAudio, triggerEffectWithAudio, releaseEffect, openShortcutsHelp],
  );
  useKeyboardShortcuts(handlers);
  useTimelinePlayback(toggleWithAudio, triggerEffectWithAudio);

  // ── ⌘K command palette ──
  // Arm the global ⌘K listener. Registration below supplies the initial
  // command set; owning panels may register more on mount in later waves.
  useCommandPalette();

  const commands = useMemo<Command[]>(() => {
    const nav = (tab: ActiveTab) => () => {
      playUISound('tab-switch');
      setActiveTab(tab);
    };
    const out: Command[] = [
      // ── NAVIGATE ───────────────────────────────────────────────────
      {
        id: 'nav:design',
        group: 'NAVIGATE',
        title: 'Go to Design',
        kbd: kbdFor('1'),
        icon: '⚒',
        run: nav('design'),
      },
      {
        id: 'nav:dynamics',
        group: 'NAVIGATE',
        title: 'Go to Dynamics',
        kbd: kbdFor('2'),
        icon: '⚒',
        run: nav('dynamics'),
      },
      {
        id: 'nav:audio',
        group: 'NAVIGATE',
        title: 'Go to Audio',
        kbd: kbdFor('3'),
        icon: '⚒',
        run: nav('audio'),
      },
      {
        id: 'nav:gallery',
        group: 'NAVIGATE',
        title: 'Go to Gallery',
        kbd: kbdFor('4'),
        icon: '⚒',
        run: nav('gallery'),
      },
      {
        id: 'nav:output',
        group: 'NAVIGATE',
        title: 'Go to Output',
        kbd: kbdFor('5'),
        icon: '⚒',
        run: nav('output'),
      },
      // ── AUDITION ──────────────────────────────────────────────────
      {
        id: 'audition:ignite',
        group: 'AUDITION',
        title: 'Ignite / Retract blade',
        subtitle: 'Toggle blade on/off',
        kbd: 'Space',
        icon: '▶',
        run: toggleWithAudio,
      },
      {
        id: 'audition:clash',
        group: 'AUDITION',
        title: 'Trigger Clash',
        kbd: 'C',
        icon: '▶',
        run: () => triggerEffectWithAudio('clash'),
      },
      {
        id: 'audition:blast',
        group: 'AUDITION',
        title: 'Trigger Blast',
        kbd: 'B',
        icon: '▶',
        run: () => triggerEffectWithAudio('blast'),
      },
      {
        id: 'audition:lockup',
        group: 'AUDITION',
        title: 'Hold Lockup',
        kbd: 'L',
        icon: '▶',
        run: () => triggerEffectWithAudio('lockup'),
      },
      {
        id: 'audition:stab',
        group: 'AUDITION',
        title: 'Trigger Stab',
        kbd: 'S',
        icon: '▶',
        run: () => triggerEffectWithAudio('stab'),
      },
      // ── VIEW ──────────────────────────────────────────────────────
      {
        id: 'view:toggle-fx-compare',
        group: 'VIEW',
        title: 'Toggle FX Comparison strips',
        subtitle: 'Show or hide the reference comparison row',
        icon: '·',
        run: toggleEffectComparison,
      },
      {
        id: 'view:mute-audio',
        group: 'VIEW',
        title: 'Toggle audio mute',
        subtitle: 'Silence font audio + UI sounds',
        icon: '·',
        run: toggleSoundMute,
      },
      {
        id: 'view:settings',
        group: 'VIEW',
        title: 'Open Settings',
        icon: '·',
        run: () => setShowSettings(true),
      },
      {
        id: 'view:help',
        group: 'VIEW',
        title: 'Keyboard shortcuts help',
        kbd: '?',
        icon: '·',
        run: openShortcutsHelp,
      },
      // ── WIZARD ────────────────────────────────────────────────────
      {
        id: 'wizard:open',
        group: 'WIZARD',
        title: 'Open Saber Wizard',
        subtitle: '3-step guided preset — archetype / colour / vibe',
        icon: '✦',
        run: () => setShowWizard(true),
      },
    ];

    // ── THEME ──────────────────────────────────────────────────────
    // Emit commands for the base 9 + extended locations + factions.
    // Capped at 8 entries for this wave — the palette is searchable, so
    // users can type the theme name even if it's not in the top 8.
    // TODO: remove the cap once theme rows land their own section.
    const THEME_CAP = 8;
    const themeEntries: Array<{ id: string; label: string }> = [
      ...CANVAS_THEMES.map((t) => ({ id: t.id, label: t.label })),
      ...EXTENDED_LOCATION_THEMES.map((t) => ({ id: t.id, label: t.label })),
      ...EXTENDED_FACTION_THEMES.map((t) => ({ id: t.id, label: t.label })),
    ].slice(0, THEME_CAP);
    for (const t of themeEntries) {
      out.push({
        id: `theme:${t.id}`,
        group: 'THEME',
        title: `Theme: ${t.label}`,
        icon: '◆',
        run: () => setCanvasTheme(t.id),
      });
    }

    return out;
  }, [
    setActiveTab,
    toggleWithAudio,
    triggerEffectWithAudio,
    toggleEffectComparison,
    toggleSoundMute,
    openShortcutsHelp,
    setCanvasTheme,
  ]);

  useRegisterCommands(commands);

  // ── Engine ready guard — show CanvasSkeleton until the engine mounts ──
  const [engineReady, setEngineReady] = useState(false);
  useEffect(() => {
    // engineRef is populated by useBladeEngine's first useEffect; wait one
    // microtask to let it run before marking ready.
    const id = requestAnimationFrame(() => setEngineReady(true));
    return () => cancelAnimationFrame(id);
  }, [engineRef]);

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
        {/* Left cluster: logo + project name.
            Wave 4 trim: the "Universal Saber Style Engine" subtitle and the
            version/profile breadcrumb were removed — StatusBar now owns PROFILE
            + BUILD identity (see W3). */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-none">
            <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
              <span className="text-white">KYBER</span>
              <span className="text-accent">STATION</span>
            </h1>
          </div>

          <UndoRedoButtons />

          <SaberProfileSwitcher />
        </div>

        {/* Right cluster: FPS, controls, ignite.
            Wave 4 trim: the "FX Compare" toggle moved to the ⌘K palette
            (its keybinding + toggle logic remain wired below). */}
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

          {/* Docs */}
          <Link
            href="/docs"
            target="_blank"
            className="px-2 py-1 rounded text-ui-xs font-medium border border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light transition-colors hidden desktop:inline-flex"
          >
            Docs
          </Link>

          {/* ⌘K Command palette chip — reference `title-strip .cmd-hint`.
              Hidden on tablet; the palette hotkey still works at every
              width via useCommandPalette. */}
          <button
            onClick={() => useCommandStore.getState().open()}
            className="hidden desktop:inline-flex items-center gap-1.5 font-mono text-text-muted hover:text-text-secondary hover:border-border-light transition-colors"
            style={{
              fontSize: 11,
              padding: '2px 8px',
              border: '1px solid rgb(var(--border-subtle) / 1)',
              borderRadius: 'var(--r-chrome, 2px)',
              background: 'rgb(var(--bg-deep) / 0.4)',
              letterSpacing: '0.04em',
            }}
            title={`Open command palette (${kbdFor('K')})`}
            aria-label="Open command palette"
          >
            Command <kbd className="font-mono text-text-muted/80">{kbdFor('K')}</kbd>
          </button>

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
            onClick={openShortcutsHelp}
            className="px-2 py-1 rounded text-ui-xs font-medium border border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light transition-colors hidden desktop:inline-flex"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            ?
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
       * 1b. HUD DATA TICKER — dedicated decorative strip
       *
       * Lives as its own 12px row between the header and the blade
       * section so the ambient scrolling text can't visually overlap
       * the undo/redo buttons or the right-cluster controls. Previously
       * this was `absolute inset-0` inside the header, which competed
       * with foreground chrome on tight-padded layouts.
       * ════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 border-b border-border-subtle bg-bg-deep/60 overflow-hidden"
        style={{ height: 12 }}
        aria-hidden="true"
      >
        <DataTicker
          data={HUD_TICKER_MESSAGES}
          speed={30}
          className="h-full flex items-center pointer-events-none"
        />
      </div>

      {/* ════════════════════════════════════════════════════
       * 2. BLADE + VISUALIZATION STACK — always visible
       * ════════════════════════════════════════════════════ */}
      <section
        className="shrink-0 border-b border-border-subtle bg-bg-primary flex overflow-hidden"
        style={{ height: 320 }}
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
              'font-mono uppercase tracking-[0.08em]',
              'cursor-grab active:cursor-grabbing inline-flex items-center gap-2',
              activeTab === tab.id
                ? 'text-accent'
                : 'text-text-muted hover:text-text-secondary',
              tabDragOverId === tab.id && tabDragId !== tab.id
                ? 'border-l-2 border-l-accent'
                : 'border-l-2 border-l-transparent',
            ].join(' ')}
          >
            <span>{tab.label}</span>
            {/* Canonical ⌘1–⌘5 (Mac) / Ctrl+1–Ctrl+5 (other) kbd hint.
                Position is fixed by the shipped TABS order — user-
                reordering the tab bar does NOT change which digit
                switches which tab. */}
            <kbd
              aria-hidden="true"
              className="font-mono text-text-muted/70 tabular-nums"
              style={{ fontSize: 10, letterSpacing: '0.04em' }}
            >
              {kbdFor(TAB_CANONICAL_DIGIT[tab.id])}
            </kbd>
            {tab.id === 'output' && presetListCount > 0 && (
              <span className="text-ui-xs text-accent">({presetListCount})</span>
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
      <KeyboardShortcutsModal
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
      <SaberWizard open={showWizard} onClose={() => setShowWizard(false)} />

      {/* ════════════════════════════════════════════════════
       * ⌘K COMMAND PALETTE — portal-rendered, opens globally
       * ════════════════════════════════════════════════════ */}
      <CommandPalette />
    </div>
  );
}
