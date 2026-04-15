'use client';
import { useMemo } from 'react';
import { StylePanel } from './StylePanel';
import { ColorPanel } from './ColorPanel';
import { BladeHardwarePanel } from './BladeHardwarePanel';
import { LayerStack } from './LayerStack';
import { PowerDrawPanel } from './PowerDrawPanel';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { ReorderableSections, type SectionDef } from '@/components/shared/ReorderableSections';
import { useSurpriseMe } from './Randomizer';

export function DesignPanel() {
  const { surprise, undo, canUndo } = useSurpriseMe();

  const sections: SectionDef[] = useMemo(() => [
    {
      id: 'blade-style',
      title: 'Blade Style',
      tooltip: <HelpTooltip text="Select and configure the base blade animation. Each style creates a unique visual character for the blade." proffie="StylePtr<Layers<...>>" />,
      children: <StylePanel />,
    },
    {
      id: 'colors',
      title: 'Colors',
      tooltip: <HelpTooltip text="Edit effect colors — base blade color, clash, lockup, blast, and more. Each color channel controls a different combat interaction." />,
      children: <ColorPanel />,
    },
    {
      id: 'layer-compositor',
      title: 'Layer Compositor',
      tooltip: <HelpTooltip text="Stack and blend multiple style layers for complex blade designs. Advanced feature for combining effects." proffie="Layers<Base, Effect1, Effect2, ...>" />,
      children: <LayerStack />,
    },
    {
      id: 'blade-hardware',
      title: 'Blade Hardware',
      tooltip: <HelpTooltip text="Match the simulation to your physical saber hardware — blade topology, length, and LED strip configuration." />,
      children: <BladeHardwarePanel />,
    },
    {
      id: 'power-draw',
      title: 'Power Draw',
      defaultOpen: false,
      tooltip: <HelpTooltip text="Estimated power consumption and battery runtime based on your LED count, strip configuration, current color, and brightness. Helps prevent brownouts and plan battery life." />,
      children: <PowerDrawPanel />,
    },
  ], []);

  return (
    <div>
      {/* Prominent quick-access Surprise Me button */}
      <div className="flex gap-2 mb-4 px-1">
        <button
          onClick={surprise}
          className="relative flex-1 px-4 py-2.5 rounded-lg text-ui-sm font-semibold transition-all border border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent active:scale-[0.97] font-cinematic overflow-hidden group"
        >
          {/* Kyber glow pulse */}
          <span className="absolute inset-0 rounded-lg bg-accent/5 animate-pulse pointer-events-none" />
          <span className="relative z-10">Surprise Me</span>
        </button>
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`px-3 py-2 rounded-lg text-ui-xs font-medium transition-colors border ${
            canUndo
              ? 'border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              : 'border-border-subtle/50 text-text-muted/50 cursor-not-allowed'
          }`}
          title={canUndo ? 'Undo last Surprise Me' : 'No history'}
        >
          Undo
        </button>
      </div>
      <ReorderableSections tab="design" sections={sections} />
    </div>
  );
}
