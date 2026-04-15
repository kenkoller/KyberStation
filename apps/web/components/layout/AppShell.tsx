'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BladeState } from '@bladeforge/engine';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTimelinePlayback } from '@/hooks/useTimelinePlayback';
import { useDeviceMotion } from '@/hooks/useDeviceMotion';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useUIStore } from '@/stores/uiStore';
import type { ActiveTab, RenderMode, CanvasMode } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { BladeCanvas } from '@/components/editor/BladeCanvas';
import { BladeCanvas3D } from '@/components/editor/BladeCanvas3DWrapper';
import { EffectTriggerBar } from '@/components/editor/EffectTriggerBar';
import { PresetGallery } from '@/components/editor/PresetGallery';
import { DesignPanel } from '@/components/editor/DesignPanel';
import { DynamicsPanel } from '@/components/editor/DynamicsPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
import { OutputPanel } from '@/components/editor/OutputPanel';
import { CanvasToolbar } from '@/components/editor/CanvasToolbar';
import { EffectComparisonPanel } from '@/components/editor/EffectComparisonPanel';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useThemeApplier } from '@/hooks/useThemeApplier';
import { useAccessibilityApplier } from '@/hooks/useAccessibilityApplier';
import { usePresetListSync } from '@/hooks/usePresetListSync';
import { usePresetListStore } from '@/stores/presetListStore';
import Link from 'next/link';
import { AccessibilityPanel } from '@/components/editor/AccessibilityPanel';
import { SaberProfileSwitcher } from '@/components/editor/SaberProfileSwitcher';

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

export function AppShell() {
  const { engineRef, toggle, triggerEffect } = useBladeEngine();
  const audio = useAudioEngine();
  useThemeApplier();
  useAccessibilityApplier();
  usePresetListSync();
  const presetListCount = usePresetListStore((s) => s.entries.length);
  const renderMode = useUIStore((s) => s.renderMode);
  const setRenderMode = useUIStore((s) => s.setRenderMode);
  const canvasMode = useUIStore((s) => s.canvasMode);
  const setCanvasMode = useUIStore((s) => s.setCanvasMode);
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const showEffectComparison = useUIStore((s) => s.showEffectComparison);
  const toggleEffectComparison = useUIStore((s) => s.toggleEffectComparison);
  const isOn = useBladeStore((s) => s.isOn);
  const bladeState = useBladeStore((s) => s.bladeState);
  const fps = useBladeStore((s) => s.fps);
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

  const { isMobile, isTablet, isWide } = useBreakpoint();
  const [showPanel, setShowPanel] = useState(false);
  const [showA11yPanel, setShowA11yPanel] = useState(false);
  const [bladeOrientation, setBladeOrientation] = useState<BladeOrientation>('horizontal');
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
    () => ({ toggle: toggleWithAudio, triggerEffect: triggerEffectWithAudio }),
    [toggleWithAudio, triggerEffectWithAudio],
  );

  useKeyboardShortcuts(handlers);
  useTimelinePlayback(toggleWithAudio, triggerEffectWithAudio);

  // ─── Mobile Layout ───
  if (isMobile) {
    const isVertical = bladeOrientation === 'vertical';
    return (
      <div className="h-[100dvh] flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">
        {/* ── Compact Mobile Header ── */}
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
              {isVertical ? '↔' : '↕'}
            </button>

            {/* Accessibility settings */}
            <button
              onClick={() => setShowA11yPanel(true)}
              className="touch-target px-1 py-1 rounded text-ui-xs font-medium border border-border-subtle text-text-muted transition-colors active:border-accent active:text-accent"
              aria-label="Accessibility settings"
            >
              ⚙
            </button>

            {/* Gyro button */}
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
                title={motionData.isActive ? 'Gyro active' : permissionState === 'denied' ? 'Gyro denied' : 'Enable gyro'}
              >
                {motionData.isActive ? '📡' : permissionState === 'denied' ? '🚫' : '📡'}
              </button>
            )}

            {/* Ignite */}
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

        {/* ── Blade Canvas (maximized — takes all available space) ── */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-1">
          <BladeCanvas engineRef={engineRef} vertical={isVertical} mobileFullscreen />
        </div>

        {/* ── Effect triggers (compact row) ── */}
        <div className="px-1 pb-0.5 shrink-0">
          <EffectTriggerBar onTrigger={triggerEffectWithAudio} />
        </div>

        {/* ── Bottom Panel Toggle + Content ── */}
        <div className="shrink-0 border-t border-border-subtle bg-bg-secondary pb-[env(safe-area-inset-bottom)]">
          {/* Tab bar (always visible) */}
          <div className="flex overflow-x-auto px-1 pt-0.5" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowPanel(true);
                }}
                className={`flex-1 min-w-0 min-h-[44px] px-2 py-1.5 text-ui-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id && showPanel
                    ? 'text-accent'
                    : 'text-text-muted'
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
            {/* Collapse button */}
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="min-h-[44px] px-2 py-1.5 text-ui-sm text-text-muted"
            >
              {showPanel ? '\u25BC' : '\u25B2'}
            </button>
          </div>

          {/* Panel content (collapsible) */}
          {showPanel && (
            <div className="max-h-[40vh] overflow-y-auto p-3" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
              <TabContent activeTab={activeTab} />
            </div>
          )}
        </div>

        {/* Accessibility Settings Modal */}
        {showA11yPanel && <AccessibilityPanel onClose={() => setShowA11yPanel(false)} />}
      </div>
    );
  }

  // ─── Tablet Layout (600-1023px) ───
  if (isTablet) {
    return (
      <div className="h-[100dvh] flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">
        {/* ── Tablet Header ── */}
        <header className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-bg-secondary shrink-0">
          <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
            <span className="text-white">BLADE</span>
            <span className="text-accent">FORGE</span>
          </h1>

          <div className="flex items-center gap-2">
            <SaberProfileSwitcher />
            {/* Canvas mode toggle (2D / 3D) */}
            <div className="flex items-center gap-0.5 bg-bg-deep rounded-full p-0.5 border border-border-subtle">
              {([
                { id: '2d' as CanvasMode, label: '2D' },
                { id: '3d' as CanvasMode, label: '3D' },
              ]).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setCanvasMode(mode.id)}
                  className={`touch-target px-2.5 py-1 rounded-full text-ui-xs font-medium transition-colors ${
                    canvasMode === mode.id
                      ? 'bg-accent-dim text-accent border border-accent-border'
                      : 'text-text-muted hover:text-text-secondary border border-transparent'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
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
            {/* Ignite */}
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

        {/* ── Main Content ── */}
        <div id="main-content" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* ── Canvas Strip ── */}
          <div className="shrink-0 h-[180px] border-b border-border-subtle" role="region" aria-label="Blade preview">
            <div className="h-full p-1">
              {canvasMode === '3d' ? (
                <BladeCanvas3D className="w-full h-full rounded-lg overflow-hidden" />
              ) : (
                <BladeCanvas engineRef={engineRef} compact vertical={false} renderMode={renderMode} />
              )}
            </div>
          </div>

          {/* ── Effect triggers ── */}
          <div className="px-3 py-1 shrink-0">
            <EffectTriggerBar onTrigger={triggerEffectWithAudio} />
          </div>

          {/* ── Panel Area ── */}
          <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary/50">
            <div className="flex border-b border-border-subtle shrink-0 px-2 pt-2 overflow-x-auto" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-ui-base font-medium transition-colors relative whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-accent'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {tab.shortLabel}
                  {tab.id === 'output' && presetListCount > 0 && (
                    <span className="ml-0.5 text-ui-xs text-accent">({presetListCount})</span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-t" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
              <TabContent activeTab={activeTab} />
            </div>
          </div>
        </div>

        {/* ── Status Bar ── */}
        <footer className="flex items-center justify-between px-4 py-1.5 border-t border-border-subtle bg-bg-secondary text-ui-sm text-text-muted shrink-0">
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                bladeState === BladeState.ON ? 'console-blink' :
                bladeState === BladeState.IGNITING ? 'console-alert' :
                bladeState === BladeState.RETRACTING ? 'console-alert' :
                'console-breathe'
              }`}
              style={{
                backgroundColor: bladeState === BladeState.ON ? 'rgb(var(--status-ok))' :
                  bladeState === BladeState.IGNITING ? 'rgb(var(--status-warn))' :
                  bladeState === BladeState.RETRACTING ? 'rgb(var(--status-warn))' :
                  'rgb(var(--status-info))'
              }}
            />
            <span className="sr-only">
              {bladeState === BladeState.ON ? 'Status: active' :
                bladeState === BladeState.IGNITING ? 'Status: igniting' :
                bladeState === BladeState.RETRACTING ? 'Status: retracting' :
                'Status: idle'}
            </span>
            State:{' '}
            <span
              role="status"
              className={
                bladeState === BladeState.ON
                  ? 'text-green-400'
                  : bladeState === BladeState.IGNITING
                    ? 'text-yellow-400'
                    : bladeState === BladeState.RETRACTING
                      ? 'text-orange-400'
                      : 'text-text-muted'
              }
            >
              {String(bladeState).toUpperCase()}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full console-breathe" style={{ backgroundColor: 'rgb(var(--status-info))' }} />
            <span className="sr-only">Frames per second</span>
            <span className="tabular-nums">{fps}</span> FPS
          </span>
          <span className="tabular-nums">{ledCount} LEDs</span>
        </footer>

        {/* Accessibility Settings Modal */}
        {showA11yPanel && <AccessibilityPanel onClose={() => setShowA11yPanel(false)} />}
      </div>
    );
  }

  // ─── Desktop Layout ───
  return (
    <div className="h-screen flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden particle-drift">
      {/* ── Toolbar ── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-secondary shrink-0 energy-border">
        <div className="flex items-center gap-4">
          <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
            <span className="text-white">BLADE</span>
            <span className="text-accent">FORGE</span>
          </h1>
          <span className="text-ui-sm text-text-muted font-sw-body hidden desktop:inline">
            Universal Saber Style Engine
          </span>
          <SaberProfileSwitcher />
        </div>

        <div className="flex items-center gap-2">
          {/* Canvas mode toggle (2D / 3D) */}
          <div className="flex items-center gap-0.5 bg-bg-deep rounded-full p-0.5 border border-border-subtle">
            {([
              { id: '2d' as CanvasMode, label: '2D' },
              { id: '3d' as CanvasMode, label: '3D' },
            ]).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setCanvasMode(mode.id)}
                className={`px-2 py-0.5 rounded-full text-ui-xs font-medium transition-colors ${
                  canvasMode === mode.id
                    ? 'bg-accent-dim text-accent border border-accent-border'
                    : 'text-text-muted hover:text-text-secondary border border-transparent'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          {/* Render mode toggle */}
          <div className="flex items-center gap-0.5 bg-bg-deep rounded-full p-0.5 border border-border-subtle">
            {([
              { id: 'photorealistic' as RenderMode, label: 'Photo' },
              { id: 'pixel' as RenderMode, label: 'Pixel' },
            ]).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setRenderMode(mode.id)}
                className={`px-2 py-0.5 rounded-full text-ui-xs font-medium transition-colors ${
                  renderMode === mode.id
                    ? 'bg-accent-dim text-accent border border-accent-border'
                    : 'text-text-muted hover:text-text-secondary border border-transparent'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          {/* Audio mute toggle */}
          <button
            onClick={audio.toggleMute}
            className={`px-2 py-1 rounded text-ui-xs font-medium border transition-colors ${
              audio.muted
                ? 'border-border-subtle text-text-muted hover:text-text-secondary'
                : 'border-accent-border/40 text-accent bg-accent-dim/30'
            }`}
            title={audio.muted ? 'Unmute audio' : 'Mute audio'}
          >
            {audio.muted ? 'Sound OFF' : 'Sound ON'}
          </button>
          {/* Effect Comparison toggle */}
          <button
            onClick={toggleEffectComparison}
            className={`hidden wide:inline-flex px-2 py-1 rounded text-ui-xs font-medium border transition-colors ${
              showEffectComparison
                ? 'border-accent-border/40 text-accent bg-accent-dim/30'
                : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light'
            }`}
            title="Toggle effect comparison view"
          >
            FX Compare
          </button>
          {/* Accessibility settings */}
          <button
            onClick={() => setShowA11yPanel(true)}
            className="items-center justify-center w-5 h-5 rounded-full border border-border-subtle text-text-muted hover:text-accent hover:border-accent-border transition-colors text-ui-sm hidden desktop:inline-flex"
            aria-label="Accessibility settings"
          >
            ⚙
          </button>
          <span className="text-ui-xs text-text-muted tabular-nums hidden wide:inline">
            {fps} FPS
          </span>
          <button
            onClick={toggleWithAudio}
            className={`px-4 py-1.5 rounded-md text-ui-xs font-bold uppercase tracking-wider transition-all border ${
              isOn
                ? 'bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-900/50 ignite-btn-on'
                : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20 ignite-btn-off'
            }`}
          >
            {isOn ? 'Retract' : 'Ignite'}
          </button>
        </div>
      </header>

      {/* ── Main Content (sidebar + canvas split) ── */}
      <div id="main-content" className="flex-1 min-h-0 flex overflow-hidden">
        {/* ── Left Sidebar (tabs + panel content) ── */}
        <aside className="w-[380px] wide:w-[420px] shrink-0 flex flex-col border-r border-border-subtle bg-bg-secondary/50 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-border-subtle shrink-0 px-1 pt-1.5 overflow-x-auto" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1.5 text-ui-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-accent'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab.label}
                {tab.id === 'output' && presetListCount > 0 && (
                  <span className="ml-0.5 text-ui-xs text-accent">({presetListCount})</span>
                )}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-1 right-1 h-[2px] bg-accent rounded-t" />
                )}
              </button>
            ))}
          </div>
          {/* Panel content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            <TabContent activeTab={activeTab} />
          </div>
          {/* Quick actions bar — always visible at bottom of sidebar */}
          <div className="shrink-0 border-t border-border-subtle bg-bg-secondary px-3 py-2 flex gap-2">
            <button
              onClick={() => {
                const store = usePresetListStore.getState();
                const config = useBladeStore.getState().config;
                store.addEntry({
                  presetName: config.name || 'Custom Preset',
                  fontName: (config.name || 'custom').toLowerCase().replace(/[^a-z0-9]/g, '_'),
                  config,
                });
                setActiveTab('output');
              }}
              className="flex-1 px-2 py-1.5 rounded text-ui-xs font-medium border border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              title="Save current design and add to output preset list"
            >
              + Add to Card
            </button>
          </div>
        </aside>

        {/* ── Right: Canvas + Effects ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Effect trigger bar */}
          <div className="shrink-0 border-b border-border-subtle">
            <EffectTriggerBar onTrigger={triggerEffectWithAudio} compact />
          </div>

          {/* Canvas (fills all remaining space) */}
          <div className="flex-1 min-h-0 p-1" role="region" aria-label="Blade preview">
            {canvasMode === '3d' ? (
              <BladeCanvas3D className="w-full h-full rounded-lg overflow-hidden" />
            ) : (
              <BladeCanvas engineRef={engineRef} vertical={false} renderMode={renderMode} />
            )}
          </div>

          {/* Effect Comparison (togglable, below canvas) */}
          {showEffectComparison && <EffectComparisonPanel />}
        </div>
      </div>

      {/* ── Status Bar ── */}
      <footer className="flex items-center justify-between px-4 py-1.5 border-t border-border-subtle bg-bg-secondary text-ui-sm text-text-muted shrink-0">
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              bladeState === BladeState.ON ? 'console-blink' :
              bladeState === BladeState.IGNITING ? 'console-alert' :
              bladeState === BladeState.RETRACTING ? 'console-alert' :
              'console-breathe'
            }`}
            style={{
              backgroundColor: bladeState === BladeState.ON ? 'rgb(var(--status-ok))' :
                bladeState === BladeState.IGNITING ? 'rgb(var(--status-warn))' :
                bladeState === BladeState.RETRACTING ? 'rgb(var(--status-warn))' :
                'rgb(var(--status-info))'
            }}
          />
          <span className="sr-only">
            {bladeState === BladeState.ON ? 'Status: active' :
              bladeState === BladeState.IGNITING ? 'Status: igniting' :
              bladeState === BladeState.RETRACTING ? 'Status: retracting' :
              'Status: idle'}
          </span>
          State:{' '}
          <span
            role="status"
            className={
              bladeState === BladeState.ON
                ? 'text-green-400'
                : bladeState === BladeState.IGNITING
                  ? 'text-yellow-400'
                  : bladeState === BladeState.RETRACTING
                    ? 'text-orange-400'
                    : 'text-text-muted'
            }
          >
            {String(bladeState).toUpperCase()}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full console-breathe" style={{ backgroundColor: 'rgb(var(--status-info))' }} />
          <span className="sr-only">Frames per second</span>
          <span className="tabular-nums">{fps}</span> FPS
        </span>
        <span className="tabular-nums">{ledCount} LEDs</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full console-breathe" style={{ backgroundColor: 'rgb(var(--status-ok))' }} />
          <span className="sr-only">ProffieOS version</span>
          ProffieOS 7.x
        </span>
      </footer>

      {/* Accessibility Settings Modal */}
      {showA11yPanel && <AccessibilityPanel onClose={() => setShowA11yPanel(false)} />}
    </div>
  );
}
