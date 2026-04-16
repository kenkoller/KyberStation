'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTimelinePlayback } from '@/hooks/useTimelinePlayback';
import { useDeviceMotion } from '@/hooks/useDeviceMotion';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useUIStore } from '@/stores/uiStore';
import type { ActiveTab, RenderMode } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { BladeCanvas } from '@/components/editor/BladeCanvas';

import { EffectTriggerBar } from '@/components/editor/EffectTriggerBar';
import { PresetGallery } from '@/components/editor/PresetGallery';
import { DesignPanel } from '@/components/editor/DesignPanel';
import { DynamicsPanel } from '@/components/editor/DynamicsPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
import { OutputPanel } from '@/components/editor/OutputPanel';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useThemeApplier } from '@/hooks/useThemeApplier';
import { useAccessibilityApplier } from '@/hooks/useAccessibilityApplier';
import { usePerformanceTier } from '@/hooks/usePerformanceTier';
import { useAurebesh } from '@/hooks/useAurebesh';
import { usePauseSystem } from '@/hooks/usePauseSystem';
import { PauseButton } from '@/components/layout/PauseButton';
import { usePresetListSync } from '@/hooks/usePresetListSync';
import { usePresetListStore } from '@/stores/presetListStore';
import { AccessibilityPanel } from '@/components/editor/AccessibilityPanel';
import { SaberProfileSwitcher } from '@/components/editor/SaberProfileSwitcher';
import { WorkbenchLayout } from '@/components/layout/WorkbenchLayout';
import { FullscreenPreview, FullscreenButton } from '@/components/editor/FullscreenPreview';
import { StatusBar } from '@/components/layout/StatusBar';
import { VisualizationToolbar } from '@/components/editor/VisualizationToolbar';
import { VisualizationStack } from '@/components/editor/VisualizationStack';
import { TabColumnContent } from '@/components/layout/TabColumnContent';
import { playUISound } from '@/lib/uiSounds';

const TABS: Array<{ id: ActiveTab; label: string; shortLabel: string }> = [
  { id: 'design', label: 'Design', shortLabel: 'Design' },
  { id: 'dynamics', label: 'Dynamics', shortLabel: 'Dyn' },
  { id: 'audio', label: 'Audio', shortLabel: 'Audio' },
  { id: 'gallery', label: 'Gallery', shortLabel: 'Gallery' },
  { id: 'output', label: 'Output', shortLabel: 'Out' },
];

type BladeOrientation = 'vertical' | 'horizontal';

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

// ─── Mobile Shell ────────────────────────────────────────────────────────────
// Extracted into its own component so swipe-gesture refs live here rather than
// inside AppShell, which would force conditional hook calls (rules of hooks).

interface MobileShellProps {
  isVertical: boolean;
  setBladeOrientation: (o: BladeOrientation) => void;
  showA11yPanel: boolean;
  setShowA11yPanel: (v: boolean) => void;
  showPanel: boolean;
  setShowPanel: (v: boolean) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentTabIndex: number;
  tabIds: ActiveTab[];
  presetListCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineRef: React.RefObject<any>;
  isOn: boolean;
  toggleWithAudio: () => void;
  triggerEffectWithAudio: (type: string) => void;
  motionData: { isActive: boolean; swingSpeed: number; bladeAngle: number; twistAngle: number };
  permissionState: string;
  requestPermission: () => void;
  isSupported: boolean;
}

/** Minimum horizontal drag distance (px) to register as a tab swipe. */
const SWIPE_THRESHOLD = 50;

function MobileShell({
  isVertical,
  setBladeOrientation,
  showA11yPanel,
  setShowA11yPanel,
  showPanel,
  setShowPanel,
  activeTab,
  setActiveTab,
  currentTabIndex,
  tabIds,
  presetListCount,
  engineRef,
  isOn,
  toggleWithAudio,
  triggerEffectWithAudio,
  motionData,
  permissionState,
  requestPermission,
  isSupported,
}: MobileShellProps) {
  // ── Touch swipe gesture tracking ──────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  // null = undetermined; true = user is scrolling vertically; false = swiping horizontally
  const isScrollGesture = useRef<boolean | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isScrollGesture.current = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Classify intent on the first substantial movement
    if (isScrollGesture.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isScrollGesture.current = Math.abs(dy) > Math.abs(dx);
    }

    // Prevent default scroll when committed to a horizontal swipe so the
    // panel content doesn't scroll at the same time.
    if (isScrollGesture.current === false) {
      e.preventDefault();
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || isScrollGesture.current !== false) {
        touchStartX.current = null;
        touchStartY.current = null;
        isScrollGesture.current = null;
        return;
      }

      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      touchStartY.current = null;
      isScrollGesture.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      if (dx < 0) {
        // Swipe left → advance to next tab
        const next = tabIds[currentTabIndex + 1];
        if (next) {
          setActiveTab(next);
          setShowPanel(true);
        }
      } else {
        // Swipe right → go back to previous tab
        const prev = tabIds[currentTabIndex - 1];
        if (prev) {
          setActiveTab(prev);
          setShowPanel(true);
        }
      }
    },
    [currentTabIndex, tabIds, setActiveTab, setShowPanel],
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">

      {/* ── Compact Mobile Header ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-2 py-1 border-b border-border-subtle bg-bg-secondary shrink-0 min-w-0">
        <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none shrink-0">
          <span className="text-white">BF</span>
        </h1>

        <div className="flex items-center gap-1 min-w-0 flex-wrap justify-end">
          {/* Orientation toggle */}
          <button
            onClick={() => setBladeOrientation(isVertical ? 'horizontal' : 'vertical')}
            className="touch-target px-1 py-1 rounded text-ui-xs font-medium border border-border-subtle text-text-muted transition-colors active:border-accent active:text-accent"
            title={isVertical ? 'Switch to horizontal' : 'Switch to vertical'}
          >
            {isVertical ? '\u2194' : '\u2195'}
          </button>

          {/* Accessibility settings */}
          <button
            onClick={() => setShowA11yPanel(true)}
            className="touch-target px-1 py-1 rounded text-ui-xs font-medium border border-border-subtle text-text-muted transition-colors active:border-accent active:text-accent"
            aria-label="Accessibility settings"
          >
            {'\u2699'}
          </button>

          {/* Gyro */}
          {isSupported && (
            <button
              onClick={requestPermission}
              className={`touch-target px-1 py-1 rounded text-ui-xs font-medium border transition-colors ${
                motionData.isActive
                  ? 'border-green-500/40 text-green-400 bg-green-900/20'
                  : permissionState === 'denied'
                    ? 'border-red-500/30 text-red-400'
                    : 'border-border-subtle text-text-muted'
              }`}
              title={
                motionData.isActive
                  ? 'Gyro active'
                  : permissionState === 'denied'
                    ? 'Gyro denied'
                    : 'Enable gyro'
              }
            >
              {'\uD83D\uDCE1'}
            </button>
          )}

          {/* Fullscreen — pinned in header so it's always reachable on mobile */}
          <FullscreenButton className="touch-target w-9 h-9" />

          {/* Global pause */}
          <PauseButton />

          {/* Ignite / Retract */}
          <button
            onClick={toggleWithAudio}
            className={`min-h-[44px] px-2 py-1 rounded-md text-ui-xs font-bold uppercase tracking-wider transition-all border shrink-0 ${
              isOn
                ? 'bg-red-900/30 border-red-700/50 text-red-400 ignite-btn-on'
                : 'bg-accent-dim border-accent-border text-accent ignite-btn-off'
            }`}
          >
            {isOn ? 'Off' : 'On'}
          </button>
        </div>
      </header>

      {/* ── Blade Canvas — horizontal by default, full screen width ─────── */}
      <div
        className="w-full shrink-0 flex items-center justify-center bg-bg-primary"
        style={{ height: '120px' }}
        role="region"
        aria-label="Blade preview"
      >
        <BladeCanvas engineRef={engineRef} vertical={false} compact />
      </div>

      {/* ── Visualization Toolbar — compact horizontal strip below blade ── */}
      <div className="shrink-0 px-2 py-1 border-b border-border-subtle bg-bg-secondary/60 flex items-center overflow-x-auto">
        <VisualizationToolbar orientation="horizontal" />
      </div>

      {/* ── Effect Trigger Bar ────────────────────────────────────────────── */}
      <div className="px-1 py-0.5 shrink-0 border-b border-border-subtle">
        <EffectTriggerBar onTrigger={triggerEffectWithAudio} />
      </div>

      {/* ── Panel Area — swipeable, single scrollable column ─────────────── */}
      <div
        className="flex-1 min-h-0 flex flex-col bg-bg-secondary/50"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Tab bar */}
        <div
          className="flex overflow-x-auto px-1 pt-0.5 shrink-0 border-b border-border-subtle"
          role="tablist"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`mobile-panel-${tab.id}`}
              onClick={() => {
                playUISound('tab-switch');
                setActiveTab(tab.id);
                setShowPanel(true);
              }}
              className={`flex-1 min-w-0 min-h-[44px] px-2 py-1.5 text-ui-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab.id && showPanel ? 'text-accent' : 'text-text-muted'
              }`}
            >
              {tab.shortLabel}
              {tab.id === 'output' && presetListCount > 0 && (
                <span className="ml-0.5 text-ui-xs text-accent">({presetListCount})</span>
              )}
              {activeTab === tab.id && showPanel && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-t" />
              )}
            </button>
          ))}

          {/* Swipe position indicator dots */}
          <div className="flex items-center px-2 gap-1 shrink-0" aria-hidden="true">
            {TABS.map((tab, i) => (
              <span
                key={tab.id}
                className={`inline-block rounded-full transition-all duration-200 ${
                  i === currentTabIndex ? 'w-2 h-2 bg-accent' : 'w-1.5 h-1.5 bg-border-subtle'
                }`}
              />
            ))}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="min-h-[44px] px-2 py-1.5 text-ui-sm text-text-muted shrink-0"
            aria-label={showPanel ? 'Collapse panel' : 'Expand panel'}
          >
            {showPanel ? '\u25BC' : '\u25B2'}
          </button>
        </div>

        {/* Panel content — single scrollable column */}
        {showPanel && (
          <div
            className="flex-1 min-h-0 overflow-y-auto p-3"
            role="tabpanel"
            id={`mobile-panel-${activeTab}`}
            aria-labelledby={`mobile-tab-${activeTab}`}
          >
            <TabContent activeTab={activeTab} />
          </div>
        )}
      </div>

      {/* ── Status Bar — slim readout, accounts for safe-area bottom ─────── */}
      <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
        <StatusBar />
      </div>

      {/* Accessibility Settings Modal */}
      {showA11yPanel && <AccessibilityPanel onClose={() => setShowA11yPanel(false)} />}

      {/* Fullscreen preview overlay */}
      <FullscreenPreview engineRef={engineRef} onTriggerEffect={triggerEffectWithAudio} />
    </div>
  );
}

// ─── Tablet Shell ────────────────────────────────────────────────────────────
// Extracted into its own component so swipe-gesture refs live here rather than
// inside AppShell, which would force conditional hook calls (rules of hooks).

interface TabletShellProps {
  showA11yPanel: boolean;
  setShowA11yPanel: (v: boolean) => void;
  showPanel: boolean;
  setShowPanel: (v: boolean) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentTabIndex: number;
  tabIds: ActiveTab[];
  presetListCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineRef: React.RefObject<any>;
  isOn: boolean;
  toggleWithAudio: () => void;
  triggerEffectWithAudio: (type: string) => void;
  renderMode: RenderMode;
  pixelBufRef: React.RefObject<Uint8Array | null>;
  ledCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audio: any;
}

function TabletShell({
  showA11yPanel,
  setShowA11yPanel,
  showPanel,
  setShowPanel,
  activeTab,
  setActiveTab,
  currentTabIndex,
  tabIds,
  presetListCount,
  engineRef,
  isOn,
  toggleWithAudio,
  triggerEffectWithAudio,
  renderMode,
  pixelBufRef,
  ledCount,
  audio,
}: TabletShellProps) {
  // ── Touch swipe gesture tracking (same pattern as MobileShell) ─────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  // null = undetermined; true = user is scrolling vertically; false = swiping horizontally
  const isScrollGesture = useRef<boolean | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isScrollGesture.current = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Classify intent on the first substantial movement
    if (isScrollGesture.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isScrollGesture.current = Math.abs(dy) > Math.abs(dx);
    }

    // Prevent default scroll when committed to a horizontal swipe
    if (isScrollGesture.current === false) {
      e.preventDefault();
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || isScrollGesture.current !== false) {
        touchStartX.current = null;
        touchStartY.current = null;
        isScrollGesture.current = null;
        return;
      }

      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      touchStartY.current = null;
      isScrollGesture.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      if (dx < 0) {
        // Swipe left → advance to next tab
        const next = tabIds[currentTabIndex + 1];
        if (next) {
          setActiveTab(next);
          setShowPanel(true);
        }
      } else {
        // Swipe right → go back to previous tab
        const prev = tabIds[currentTabIndex - 1];
        if (prev) {
          setActiveTab(prev);
          setShowPanel(true);
        }
      }
    },
    [currentTabIndex, tabIds, setActiveTab, setShowPanel],
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">

      {/* ── Tablet Header ───────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-bg-secondary shrink-0">
        <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
          <span className="text-white">BLADE</span>
          <span className="text-accent">FORGE</span>
        </h1>

        <div className="flex items-center gap-2">
          <SaberProfileSwitcher />
          {/* Audio mute toggle */}
          <button
            onClick={audio.toggleMute}
            className={`touch-target px-2 py-1 rounded text-ui-sm font-medium border transition-colors ${
              audio.muted
                ? 'border-border-subtle text-text-muted hover:text-text-secondary'
                : 'border-accent-border/40 text-accent bg-accent-dim/30'
            }`}
            title={audio.muted ? 'Unmute audio' : 'Mute audio'}
          >
            {audio.muted ? 'Sound OFF' : 'Sound ON'}
          </button>
          {/* Accessibility settings */}
          <button
            onClick={() => setShowA11yPanel(true)}
            className="touch-target w-7 h-7 flex items-center justify-center rounded-full border border-border-subtle text-text-muted hover:text-accent hover:border-accent-border transition-colors text-ui-sm"
            aria-label="Accessibility settings"
          >
            ⚙
          </button>
          {/* Fullscreen — accessible in tablet header */}
          <FullscreenButton className="touch-target w-8 h-8" />
          {/* Global pause */}
          <PauseButton />
          {/* Ignite / Retract */}
          <button
            onClick={toggleWithAudio}
            className={`px-5 py-2 rounded-md text-ui-xs font-bold uppercase tracking-wider transition-all border ${
              isOn
                ? 'bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-900/50 ignite-btn-on'
                : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20 ignite-btn-off'
            }`}
          >
            {isOn ? 'Retract' : 'Ignite'}
          </button>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div id="main-content" className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* ── Blade Canvas — horizontal, full width ─────────────────────────── */}
        <div
          className="shrink-0 h-[160px] border-b border-border-subtle"
          role="region"
          aria-label="Blade preview"
        >
          <div className="h-full p-1">
            <BladeCanvas engineRef={engineRef} compact vertical={false} renderMode={renderMode} />
          </div>
        </div>

        {/* ── Visualization Toolbar — compact strip below blade ─────────────── */}
        <div className="shrink-0 px-2 py-1 border-b border-border-subtle bg-bg-secondary/60 flex items-center overflow-x-auto">
          <VisualizationToolbar orientation="horizontal" />
        </div>

        {/* ── Visualization Stack — analysis layers, capped height ──────────── */}
        <div
          className="shrink-0 overflow-y-auto max-h-[160px] border-b border-border-subtle bg-bg-primary"
          role="region"
          aria-label="Visualization analysis layers"
        >
          <VisualizationStack
            pixelData={pixelBufRef.current}
            pixelCount={ledCount}
          />
        </div>

        {/* ── Effect Trigger Bar ────────────────────────────────────────────── */}
        <div className="px-3 py-1 shrink-0 border-b border-border-subtle">
          <EffectTriggerBar onTrigger={triggerEffectWithAudio} />
        </div>

        {/* ── Panel Area — swipeable, 2-column grid via TabColumnContent ──────── */}
        <div
          className="flex-1 min-h-0 flex flex-col bg-bg-secondary/50"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Tab bar */}
          <div
            className="flex overflow-x-auto border-b border-border-subtle shrink-0 px-2 pt-1"
            role="tablist"
            aria-label="Editor sections"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`tablet-tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tablet-panel-${tab.id}`}
                onClick={() => {
                  playUISound('tab-switch');
                  setActiveTab(tab.id);
                  setShowPanel(true);
                }}
                className={`flex-shrink-0 min-h-[44px] px-3 py-2 text-ui-base font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id && showPanel
                    ? 'text-accent'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab.label}
                {tab.id === 'output' && presetListCount > 0 && (
                  <span className="ml-0.5 text-ui-xs text-accent">({presetListCount})</span>
                )}
                {activeTab === tab.id && showPanel && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-t" />
                )}
              </button>
            ))}

            {/* Swipe position indicator dots */}
            <div className="flex items-center px-2 gap-1 shrink-0 ml-auto" aria-hidden="true">
              {TABS.map((tab, i) => (
                <span
                  key={tab.id}
                  className={`inline-block rounded-full transition-all duration-200 ${
                    i === currentTabIndex ? 'w-2 h-2 bg-accent' : 'w-1.5 h-1.5 bg-border-subtle'
                  }`}
                />
              ))}
            </div>

            {/* Collapse toggle */}
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="min-h-[44px] px-2 py-1.5 text-ui-sm text-text-muted shrink-0"
              aria-label={showPanel ? 'Collapse panel' : 'Expand panel'}
            >
              {showPanel ? '\u25BC' : '\u25B2'}
            </button>
          </div>

          {/* Panel content — 2-column ColumnGrid via TabColumnContent */}
          {showPanel && (
            <div
              className="flex-1 min-h-0 overflow-y-auto"
              role="tabpanel"
              id={`tablet-panel-${activeTab}`}
              aria-labelledby={`tablet-tab-${activeTab}`}
            >
              <TabColumnContent />
            </div>
          )}
        </div>
      </div>

      {/* ── Status Bar — proper component, safe-area aware ───────────────────── */}
      <div className="shrink-0">
        <StatusBar />
      </div>

      {/* Accessibility Settings Modal */}
      {showA11yPanel && <AccessibilityPanel onClose={() => setShowA11yPanel(false)} />}

      {/* Fullscreen preview overlay */}
      <FullscreenPreview engineRef={engineRef} onTriggerEffect={triggerEffectWithAudio} />
    </div>
  );
}

export function AppShell() {
  const { engineRef, toggle, triggerEffect, releaseEffect } = useBladeEngine();
  const audio = useAudioEngine();
  useThemeApplier();
  useAccessibilityApplier();
  usePerformanceTier();
  useAurebesh();
  usePauseSystem();
  usePresetListSync();
  const presetListCount = usePresetListStore((s) => s.entries.length);
  const renderMode = useUIStore((s) => s.renderMode);
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const isOn = useBladeStore((s) => s.isOn);
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const setMotionSim = useBladeStore((s) => s.setMotionSim);

  // Wrap toggle with audio
  const toggleWithAudio = useCallback(() => {
    const wasOn = useBladeStore.getState().isOn;
    toggle();
    if (wasOn) {
      audio.playRetraction();
    } else {
      audio.playIgnition();
    }
  }, [toggle, audio]);

  // Wrap effect triggers with audio
  const triggerEffectWithAudio = useCallback((type: string) => {
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
  }, [triggerEffect, audio]);

  const { isMobile, isTablet } = useBreakpoint();
  const [showPanel, setShowPanel] = useState(false);
  const [showA11yPanel, setShowA11yPanel] = useState(false);
  const [bladeOrientation, setBladeOrientation] = useState<BladeOrientation>('horizontal');

  // ── Pixel buffer for VisualizationStack (tablet layout) ──
  // Same pattern as WorkbenchLayout: capture the engine's live Uint8Array once after
  // mount. getPixels() returns the same buffer reference every call (mutated in place
  // each frame), so LayerCanvas draw calls always read the latest pixel values.
  const pixelBufRef = useRef<Uint8Array | null>(null);
  useEffect(() => {
    pixelBufRef.current = engineRef.current?.getPixels() ?? null;
  }, [engineRef]);

  // ── Sidebar resize handling ──
  const sidebarDragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!sidebarDragRef.current) return;
      const delta = e.clientX - sidebarDragRef.current.startX;
      setSidebarWidth(sidebarDragRef.current.startWidth + delta);
    };
    const onUp = () => {
      if (!sidebarDragRef.current) return;
      sidebarDragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [setSidebarWidth]);
  const { motionData, permissionState, requestPermission, isSupported } = useDeviceMotion();

  // Feed gyro data into the engine's motion simulator + smooth-swing audio
  useEffect(() => {
    if (motionData.isActive) {
      setMotionSim({
        swing: motionData.swingSpeed * 100,
        angle: (motionData.bladeAngle + 1) * 50, // map -1..1 to 0..100
        twist: (motionData.twistAngle + 1) * 50,
      });
      audio.updateSwing(motionData.swingSpeed);
    }
  }, [motionData, setMotionSim, audio]);

  // Subscribe to motion sim slider changes so that manual slider
  // adjustments also drive the smooth-swing crossfade.
  useEffect(() => {
    let prevSwing = useBladeStore.getState().motionSim.swing;
    const unsub = useBladeStore.subscribe((state) => {
      const swing = state.motionSim.swing;
      if (swing !== prevSwing) {
        prevSwing = swing;
        // motionSim.swing is 0-100; normalise to 0-1
        audio.updateSwing(swing / 100);
      }
    });
    return unsub;
  }, [audio]);

  const handlers = useMemo(
    () => ({ toggle: toggleWithAudio, triggerEffect: triggerEffectWithAudio, releaseEffect }),
    [toggleWithAudio, triggerEffectWithAudio, releaseEffect],
  );

  useKeyboardShortcuts(handlers);
  useTimelinePlayback(toggleWithAudio, triggerEffectWithAudio);

  // ─── Mobile Layout ───
  if (isMobile) {
    const isVertical = bladeOrientation === 'vertical';
    const tabIds = TABS.map((t) => t.id);
    const currentTabIndex = tabIds.indexOf(activeTab);

    return (
      <MobileShell
        isVertical={isVertical}
        setBladeOrientation={setBladeOrientation}
        showA11yPanel={showA11yPanel}
        setShowA11yPanel={setShowA11yPanel}
        showPanel={showPanel}
        setShowPanel={setShowPanel}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentTabIndex={currentTabIndex}
        tabIds={tabIds}
        presetListCount={presetListCount}
        engineRef={engineRef}
        isOn={isOn}
        toggleWithAudio={toggleWithAudio}
        triggerEffectWithAudio={triggerEffectWithAudio}
        motionData={motionData}
        permissionState={permissionState}
        requestPermission={requestPermission}
        isSupported={isSupported}
      />
    );
  }

  // ─── Tablet Layout (600-1023px) ───
  if (isTablet) {
    const tabIds = TABS.map((t) => t.id);
    const currentTabIndex = tabIds.indexOf(activeTab);

    return (
      <TabletShell
        showA11yPanel={showA11yPanel}
        setShowA11yPanel={setShowA11yPanel}
        showPanel={showPanel}
        setShowPanel={setShowPanel}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentTabIndex={currentTabIndex}
        tabIds={tabIds}
        presetListCount={presetListCount}
        engineRef={engineRef}
        isOn={isOn}
        toggleWithAudio={toggleWithAudio}
        triggerEffectWithAudio={triggerEffectWithAudio}
        renderMode={renderMode}
        pixelBufRef={pixelBufRef}
        ledCount={ledCount}
        audio={audio}
      />
    );
  }

  // ─── Desktop Layout ───
  return <WorkbenchLayout />;
}
