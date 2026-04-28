'use client';

// ─── MainContent — left-rail overhaul (v0.14.0) ──────────────────────────────
//
// Routes uiStore.activeSection to the matching panel component. Replaces
// the multi-column TabContent panel area when `useNewLayout` is on.
//
// Each section renders one panel full-width; sections are not stacked.
// Selection happens in the Sidebar; this component just renders.

import { useUIStore, type SectionId } from '@/stores/uiStore';
import { StylePanel } from '@/components/editor/StylePanel';
import { ColorPanel } from '@/components/editor/ColorPanel';
import { IgnitionRetractionPanel } from '@/components/editor/IgnitionRetractionPanel';
import { EffectPanel } from '@/components/editor/EffectPanel';
import { GestureControlPanel } from '@/components/editor/GestureControlPanel';
import { LayerStack } from '@/components/editor/LayerStack';
import { MotionSimPanel } from '@/components/editor/MotionSimPanel';
import { HardwarePanel } from '@/components/editor/HardwarePanel';
import { CrystalPanel } from '@/components/editor/CrystalPanel';
import { MySaberPanel } from '@/components/editor/MySaberPanel';
import { RoutingPanel } from '@/components/editor/routing/RoutingPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
import { OutputPanel } from '@/components/editor/OutputPanel';
import { MainContentABLayout } from '@/components/layout/MainContentABLayout';
import {
  BladeStyleColumnA,
  BladeStyleColumnB,
} from '@/components/editor/blade-style';
import {
  ColorColumnA,
  ColorColumnB,
} from '@/components/editor/color';
import { IgnitionRetractionAB } from '@/components/editor/ignition-retraction';

interface MainContentProps {
  className?: string;
  style?: React.CSSProperties;
}

const SECTION_LABELS: Record<SectionId, string> = {
  'my-saber':            'My Saber',
  'hardware':            'Hardware',
  'blade-style':         'Blade Style',
  'color':               'Color',
  'ignition-retraction': 'Ignition & Retraction',
  'combat-effects':      'Combat Effects',
  'layer-compositor':    'Layers',
  'routing':             'Routing',
  'motion-simulation':   'Motion Simulation',
  'gesture-controls':    'Gesture Controls',
  'audio':               'Audio',
  'output':              'Output',
  'my-crystal':          'My Crystal',
};

function renderLegacySection(activeSection: SectionId): React.ReactNode {
  switch (activeSection) {
    case 'my-saber':            return <MySaberPanel />;
    case 'hardware':            return <HardwarePanel />;
    case 'blade-style':         return <StylePanel />;
    case 'color':               return <ColorPanel />;
    case 'ignition-retraction': return <IgnitionRetractionPanel />;
    case 'combat-effects':      return <EffectPanel />;
    case 'layer-compositor':    return <LayerStack />;
    case 'routing':             return <RoutingPanel />;
    case 'motion-simulation':   return <MotionSimPanel />;
    case 'gesture-controls':    return <GestureControlPanel />;
    case 'audio':               return <AudioPanel />;
    case 'output':              return <OutputPanel />;
    case 'my-crystal':          return <CrystalPanel />;
  }
}

export function MainContent({ className, style }: MainContentProps) {
  const activeSection = useUIStore((s) => s.activeSection);
  const useABLayout = useUIStore((s) => s.useABLayout);
  const label = SECTION_LABELS[activeSection];

  // Sidebar A/B v2 — sections that consume the MainContentABLayout
  // wrapper render their own section-internal chrome (Column A list /
  // Column B header), so the outer panel-header is suppressed when A/B
  // is active for the section. Phase 2 added `blade-style`; Phase 3
  // adds `color` + `ignition-retraction`. Other sections still render
  // the legacy single-panel shell with the SECTION_LABELS header above
  // the body.
  let abContent: React.ReactNode = null;
  if (useABLayout) {
    if (activeSection === 'blade-style') {
      abContent = (
        <MainContentABLayout
          columnA={<BladeStyleColumnA />}
          columnB={<BladeStyleColumnB />}
          resizeLabel="Style list width"
        />
      );
    } else if (activeSection === 'color') {
      abContent = (
        <MainContentABLayout
          columnA={<ColorColumnA />}
          columnB={<ColorColumnB />}
          resizeLabel="Color preset list width"
        />
      );
    } else if (activeSection === 'ignition-retraction') {
      // The ignition-retraction wrapper owns its own MainContentABLayout
      // mount because it threads transient tab state into both columns.
      abContent = <IgnitionRetractionAB />;
    }
  }

  if (abContent) {
    return (
      <main
        className={[
          'flex-1 min-w-0 min-h-0 flex flex-col bg-bg-deep overflow-hidden',
          className ?? '',
        ].join(' ')}
        role="main"
        aria-label={label}
        style={style}
      >
        {abContent}
      </main>
    );
  }

  return (
    <main
      className={[
        'flex-1 min-w-0 min-h-0 flex flex-col bg-bg-deep overflow-hidden',
        className ?? '',
      ].join(' ')}
      role="main"
      aria-label={label}
      style={style}
    >
      <header className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <h2 className="font-mono uppercase text-ui-xs tracking-[0.12em] text-text-secondary">
          {label}
        </h2>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {renderLegacySection(activeSection)}
      </div>
    </main>
  );
}
