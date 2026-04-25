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
import { RoutingPanel } from '@/components/editor/routing/RoutingPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
import { OutputPanel } from '@/components/editor/OutputPanel';

interface MainContentProps {
  className?: string;
  style?: React.CSSProperties;
}

const SECTION_LABELS: Record<SectionId, string> = {
  'blade-style':         'Blade Style',
  'color':               'Color',
  'ignition-retraction': 'Ignition & Retraction',
  'combat-effects':      'Combat Effects',
  'gesture-controls':    'Gesture Controls',
  'layer-compositor':    'Layer Compositor',
  'motion-simulation':   'Motion Simulation',
  'hardware':            'Hardware',
  'my-crystal':          'My Crystal',
  'routing':             'Routing',
  'audio':               'Audio',
  'output':              'Output',
};

function renderSection(activeSection: SectionId): React.ReactNode {
  switch (activeSection) {
    case 'blade-style':         return <StylePanel />;
    case 'color':               return <ColorPanel />;
    case 'ignition-retraction': return <IgnitionRetractionPanel />;
    case 'combat-effects':      return <EffectPanel />;
    case 'gesture-controls':    return <GestureControlPanel />;
    case 'layer-compositor':    return <LayerStack />;
    case 'motion-simulation':   return <MotionSimPanel />;
    case 'hardware':            return <HardwarePanel />;
    case 'my-crystal':          return <CrystalPanel />;
    case 'routing':             return <RoutingPanel />;
    case 'audio':               return <AudioPanel />;
    case 'output':              return <OutputPanel />;
  }
}

export function MainContent({ className, style }: MainContentProps) {
  const activeSection = useUIStore((s) => s.activeSection);
  const label = SECTION_LABELS[activeSection];

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
        {renderSection(activeSection)}
      </div>
    </main>
  );
}
