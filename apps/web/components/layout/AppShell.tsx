'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTimelinePlayback } from '@/hooks/useTimelinePlayback';
import { useDeviceMotion } from '@/hooks/useDeviceMotion';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useUIStore } from '@/stores/uiStore';
import type { RenderMode } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { BladeCanvas } from '@/components/editor/BladeCanvas';

import { EffectTriggerBar } from '@/components/editor/EffectTriggerBar';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioSync } from '@/hooks/useAudioSync';
import { useThemeApplier } from '@/hooks/useThemeApplier';
import { useAccessibilityApplier } from '@/hooks/useAccessibilityApplier';
import { useCrystalAccent } from '@/hooks/useCrystalAccent';
import { usePerformanceTier } from '@/hooks/usePerformanceTier';
import { useAurebesh } from '@/hooks/useAurebesh';
import { usePauseSystem } from '@/hooks/usePauseSystem';
import { PauseButton } from '@/components/layout/PauseButton';
import { usePresetListSync } from '@/hooks/usePresetListSync';
import { AccessibilityPanel } from '@/components/editor/AccessibilityPanel';
import { SaberProfileSwitcher } from '@/components/editor/SaberProfileSwitcher';
import { WorkbenchLayout } from '@/components/layout/WorkbenchLayout';
import { FullscreenPreview, FullscreenButton } from '@/components/editor/FullscreenPreview';
import { StatusBar } from '@/components/layout/StatusBar';
import { VisualizationToolbar } from '@/components/editor/VisualizationToolbar';
import { VisualizationStack } from '@/components/editor/VisualizationStack';
// Left-rail overhaul (v0.14.0 PR 5c): tablet migrated off TabColumnContent
// to Sidebar + MainContent. Mobile shell migrated to the same shell
// (PR feat/mobile-overhaul-v1, 2026-04-30) — see MobileShell.tsx.
import { Sidebar } from '@/components/layout/Sidebar';
import { MainContent } from '@/components/layout/MainContent';
import { MobileShell } from '@/components/layout/MobileShell';

// ─── Tablet Shell ────────────────────────────────────────────────────────────
// Extracted into its own component so swipe-gesture refs live here rather than
// inside AppShell, which would force conditional hook calls (rules of hooks).

interface TabletShellProps {
  showA11yPanel: boolean;
  setShowA11yPanel: (v: boolean) => void;
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

// Left-rail overhaul (v0.14.0 PR 5c): TabletShell migrated from the
// 4-tab + TabColumnContent layout to the unified Sidebar + MainContent
// pattern that desktop uses.
function TabletShell({
  showA11yPanel,
  setShowA11yPanel,
  engineRef,
  isOn,
  toggleWithAudio,
  triggerEffectWithAudio,
  renderMode,
  pixelBufRef,
  ledCount,
  audio,
}: TabletShellProps) {
  return (
    <div className="h-[100dvh] flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">

      {/* ── Tablet Header ───────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-bg-secondary shrink-0">
        <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
          <span className="text-white">KYBER</span>
          <span className="text-accent">STATION</span>
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
            {'⚙'}
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

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div id="main-content" className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* ── Blade Canvas — horizontal, full width ───────────────────── */}
        <div
          className="shrink-0 h-[160px] border-b border-border-subtle"
          role="region"
          aria-label="Blade preview"
        >
          <div className="h-full p-1">
            <BladeCanvas engineRef={engineRef} compact vertical={false} renderMode={renderMode} />
          </div>
        </div>

        {/* ── Visualization Toolbar — compact strip below blade ──────── */}
        <div className="shrink-0 px-2 py-1 border-b border-border-subtle bg-bg-secondary/60 flex items-center overflow-x-auto">
          <VisualizationToolbar orientation="horizontal" />
        </div>

        {/* ── Visualization Stack — analysis layers, capped height ───── */}
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

        {/* ── Effect Trigger Bar ──────────────────────────────────────── */}
        <div className="px-3 py-1 shrink-0 border-b border-border-subtle">
          <EffectTriggerBar onTrigger={triggerEffectWithAudio} />
        </div>

        {/* ── Panel Area — Sidebar + MainContent ─────────────────────── */}
        <div
          className="flex-1 min-h-0 flex bg-bg-secondary/50"
          role="region"
          aria-label="Section navigation and content"
        >
          <Sidebar style={{ width: 240 }} />
          <MainContent />
        </div>
      </div>

      {/* ── Status Bar ─────────────────────────────────────────────────── */}
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
  useAudioSync(audio);
  useThemeApplier();
  useAccessibilityApplier();
  useCrystalAccent();
  usePerformanceTier();
  useAurebesh();
  usePauseSystem();
  usePresetListSync();
  const renderMode = useUIStore((s) => s.renderMode);
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
  const [showA11yPanel, setShowA11yPanel] = useState(false);

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
  const { motionData } = useDeviceMotion();

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
    return (
      <MobileShell
        showA11yPanel={showA11yPanel}
        setShowA11yPanel={setShowA11yPanel}
        engineRef={engineRef}
        isOn={isOn}
        toggleWithAudio={toggleWithAudio}
        triggerEffectWithAudio={triggerEffectWithAudio}
        releaseEffect={releaseEffect}
        audio={audio}
      />
    );
  }

  // ─── Tablet Layout (600-1023px) ───
  if (isTablet) {
    return (
      <TabletShell
        showA11yPanel={showA11yPanel}
        setShowA11yPanel={setShowA11yPanel}
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
