'use client';
import { useMemo, useState } from 'react';
import { BladeState } from '@bladeforge/engine';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDeviceMotion } from '@/hooks/useDeviceMotion';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useUIStore } from '@/stores/uiStore';
import type { ViewMode, ActiveTab, RenderMode } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { BladeCanvas } from '@/components/editor/BladeCanvas';
import { EffectTriggerBar } from '@/components/editor/EffectTriggerBar';
import { StylePanel } from '@/components/editor/StylePanel';
import { EffectPanel } from '@/components/editor/EffectPanel';
import { MotionSimPanel } from '@/components/editor/MotionSimPanel';
import { PresetBrowser } from '@/components/editor/PresetBrowser';
import { PresetGallery } from '@/components/editor/PresetGallery';
import { CodeOutput } from '@/components/editor/CodeOutput';
import { ColorPanel } from '@/components/editor/ColorPanel';
import { SoundFontPanel } from '@/components/editor/SoundFontPanel';
import { TimelinePanel } from '@/components/editor/TimelinePanel';
import { CardWriter } from '@/components/editor/CardWriter';

const VIEW_MODES: Array<{ id: ViewMode; label: string }> = [
  { id: 'blade', label: 'Blade' },
  { id: 'angle', label: 'Angle' },
  { id: 'strip', label: 'Strip' },
  { id: 'cross', label: 'Cross' },
];

const TABS: Array<{ id: ActiveTab; label: string; shortLabel: string }> = [
  { id: 'style', label: 'Style', shortLabel: 'Style' },
  { id: 'colors', label: 'Colors', shortLabel: 'Colors' },
  { id: 'effects', label: 'Effects', shortLabel: 'FX' },
  { id: 'motion', label: 'Motion', shortLabel: 'Motion' },
  { id: 'sound', label: 'Sound', shortLabel: 'Sound' },
  { id: 'timeline', label: 'Timeline', shortLabel: 'Time' },
  { id: 'presets', label: 'Gallery', shortLabel: 'Gallery' },
  { id: 'code', label: 'Code', shortLabel: 'Code' },
  { id: 'export', label: 'Export', shortLabel: 'Export' },
];

type BladeOrientation = 'vertical' | 'horizontal';

function TabContent({ activeTab }: { activeTab: ActiveTab }) {
  switch (activeTab) {
    case 'style':
      return <StylePanel />;
    case 'colors':
      return <ColorPanel />;
    case 'effects':
      return <EffectPanel />;
    case 'motion':
      return <MotionSimPanel />;
    case 'sound':
      return <SoundFontPanel />;
    case 'timeline':
      return <TimelinePanel />;
    case 'presets':
      return <PresetGallery />;
    case 'code':
      return <CodeOutput />;
    case 'export':
      return <CardWriter />;
  }
}

export function AppShell() {
  const { engineRef, toggle, triggerEffect } = useBladeEngine();
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const renderMode = useUIStore((s) => s.renderMode);
  const setRenderMode = useUIStore((s) => s.setRenderMode);
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const isOn = useBladeStore((s) => s.isOn);
  const bladeState = useBladeStore((s) => s.bladeState);
  const fps = useBladeStore((s) => s.fps);
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const setMotionSim = useBladeStore((s) => s.setMotionSim);

  const isMobile = useIsMobile();
  const [showPanel, setShowPanel] = useState(false);
  const [bladeOrientation, setBladeOrientation] = useState<BladeOrientation>('vertical');
  const { motionData, permissionState, requestPermission, isSupported } = useDeviceMotion();

  // Feed gyro data into the engine's motion simulator
  if (motionData.isActive) {
    setMotionSim({
      swing: motionData.swingSpeed * 100,
      angle: (motionData.bladeAngle + 1) * 50, // map -1..1 to 0..100
      twist: (motionData.twistAngle + 1) * 50,
    });
  }

  const handlers = useMemo(
    () => ({ toggle, triggerEffect }),
    [toggle, triggerEffect],
  );

  useKeyboardShortcuts(handlers);

  // ─── Mobile Layout ───
  if (isMobile) {
    const isVertical = bladeOrientation === 'vertical';
    return (
      <div className="h-[100dvh] flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">
        {/* ── Compact Mobile Header ── */}
        <header className="flex items-center justify-between px-2 py-1 border-b border-border-subtle bg-bg-secondary shrink-0">
          <h1 className="font-cinematic text-[10px] font-bold tracking-[0.15em] select-none">
            <span className="text-white">BLADE</span>
            <span className="text-accent">FORGE</span>
          </h1>

          <div className="flex items-center gap-1.5">
            {/* Orientation toggle */}
            <button
              onClick={() => setBladeOrientation(isVertical ? 'horizontal' : 'vertical')}
              className="px-1.5 py-1 rounded text-[9px] font-medium border border-border-subtle text-text-muted transition-colors active:border-accent active:text-accent"
              title={isVertical ? 'Switch to horizontal' : 'Switch to vertical'}
            >
              {isVertical ? '┃↔' : '━↕'}
            </button>

            {/* Gyro button */}
            {isSupported && (
              <button
                onClick={requestPermission}
                className={`px-1.5 py-1 rounded text-[9px] font-medium border transition-colors ${
                  motionData.isActive
                    ? 'border-green-500/40 text-green-400 bg-green-900/20'
                    : permissionState === 'denied'
                      ? 'border-red-500/30 text-red-400'
                      : 'border-border-subtle text-text-muted'
                }`}
              >
                {motionData.isActive ? 'Gyro ON' : permissionState === 'denied' ? 'Denied' : 'Gyro'}
              </button>
            )}

            {/* Ignite */}
            <button
              onClick={toggle}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                isOn
                  ? 'bg-red-900/30 border-red-700/50 text-red-400 ignite-btn-on'
                  : 'bg-accent-dim border-accent-border text-accent ignite-btn-off'
              }`}
            >
              {isOn ? 'Retract' : 'Ignite'}
            </button>
          </div>
        </header>

        {/* ── Blade Canvas (maximized — takes all available space) ── */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-1">
          <BladeCanvas engineRef={engineRef} vertical={isVertical} mobileFullscreen />
        </div>

        {/* ── Effect triggers (compact row) ── */}
        <div className="px-1 pb-0.5 shrink-0">
          <EffectTriggerBar onTrigger={triggerEffect} />
        </div>

        {/* ── Bottom Panel Toggle + Content ── */}
        <div className="shrink-0 border-t border-border-subtle bg-bg-secondary">
          {/* Tab bar (always visible) */}
          <div className="flex overflow-x-auto px-1 pt-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowPanel(true);
                }}
                className={`flex-1 min-w-0 px-2 py-1.5 text-[10px] font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id && showPanel
                    ? 'text-accent'
                    : 'text-text-muted'
                }`}
              >
                {tab.shortLabel}
                {activeTab === tab.id && showPanel && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-t" />
                )}
              </button>
            ))}
            {/* Collapse button */}
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="px-2 py-1.5 text-[10px] text-text-muted"
            >
              {showPanel ? '\u25BC' : '\u25B2'}
            </button>
          </div>

          {/* Panel content (collapsible) */}
          {showPanel && (
            <div className="max-h-[40vh] overflow-y-auto p-3">
              <TabContent activeTab={activeTab} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Desktop Layout ───
  return (
    <div className="h-screen flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden holo-scanline particle-drift">
      {/* ── Toolbar ── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-secondary shrink-0 energy-border">
        <div className="flex items-center gap-4">
          <h1 className="font-cinematic text-sm font-bold tracking-[0.15em] select-none">
            <span className="text-white">BLADE</span>
            <span className="text-accent">FORGE</span>
          </h1>
          <span className="text-[10px] text-text-muted font-sw-body hidden desktop:inline">
            Universal Saber Style Engine
          </span>
        </div>

        <div className="flex items-center gap-0.5 bg-bg-deep rounded-full p-0.5 border border-border-subtle">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                viewMode === mode.id
                  ? 'bg-accent-dim text-accent border border-accent-border'
                  : 'text-text-muted hover:text-text-secondary border border-transparent'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Render mode toggle */}
          <div className="hidden desktop:flex items-center gap-0.5 bg-bg-deep rounded-full p-0.5 border border-border-subtle">
            {([
              { id: 'photorealistic' as RenderMode, label: 'Photo' },
              { id: 'pixel' as RenderMode, label: 'Pixel' },
            ]).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setRenderMode(mode.id)}
                className={`px-2.5 py-1 rounded-full text-[9px] font-medium transition-colors ${
                  renderMode === mode.id
                    ? 'bg-accent-dim text-accent border border-accent-border'
                    : 'text-text-muted hover:text-text-secondary border border-transparent'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-text-muted tabular-nums hidden tablet:inline desktop:inline">
            {fps} FPS
          </span>
          <button
            onClick={toggle}
            className={`px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all border ${
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
      <div className="flex-1 min-h-0 flex flex-col desktop:flex-row overflow-hidden">
        <div className="flex flex-col min-h-[300px] desktop:min-h-0 desktop:flex-1 desktop:border-r desktop:border-border-subtle">
          <div className="flex-1 min-h-[250px] p-3 desktop:p-4">
            <BladeCanvas engineRef={engineRef} vertical renderMode={renderMode} />
          </div>
          <div className="px-3 pb-2 desktop:px-4 desktop:pb-3 shrink-0">
            <EffectTriggerBar onTrigger={triggerEffect} />
          </div>
        </div>

        <div className="flex flex-col min-h-[200px] desktop:min-h-0 desktop:w-[380px] desktop:shrink-0 bg-bg-secondary/50 border-t desktop:border-t-0 border-border-subtle holo-grid">
          <div className="flex border-b border-border-subtle shrink-0 px-2 pt-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-[11px] font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-accent'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <span className="hidden desktop:inline">{tab.label}</span>
                <span className="desktop:hidden">{tab.shortLabel}</span>
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-t" />
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 desktop:p-4">
            <TabContent activeTab={activeTab} />
          </div>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <footer className="flex items-center justify-between px-4 py-1.5 border-t border-border-subtle bg-bg-secondary text-[10px] text-text-muted shrink-0">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
            bladeState === BladeState.ON ? 'bg-green-400 console-blink' :
            bladeState === BladeState.IGNITING ? 'bg-yellow-400 console-alert' :
            bladeState === BladeState.RETRACTING ? 'bg-orange-400 console-alert' :
            'bg-text-muted console-breathe'
          }`} />
          State:{' '}
          <span
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
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent console-breathe" />
          {fps} FPS
        </span>
        <span>{ledCount} LEDs</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 console-breathe" />
          ProffieOS 7.x
        </span>
      </footer>
    </div>
  );
}
