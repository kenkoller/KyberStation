'use client';

// ─── DesignPanel — W10f B+ layout (2026-04-22) ─────────────────────────────
//
// Three pill groups up top: APPEARANCE / BEHAVIOR / ADVANCED. Clicking
// a pill swaps the body to that group's sections rendered as a 3-
// column responsive grid so all of the group's controls stay visible
// simultaneously. No intra-group collapse / reorder — simplicity wins.
//
// Groups:
//
//   APPEARANCE — how the blade looks
//     · Blade Style
//     · Colors (base / clash / lockup / blast)
//     · Gradient Builder
//
//   BEHAVIOR — how the blade reacts
//     · Ignition & Retraction (transition + timing)
//     · Combat Effects (clash / blast / lockup tuning)
//     · Gesture Controls (motion-activated triggers)
//
//   ADVANCED — less-used tuning / power-user
//     · Layer Compositor
//     · Motion Simulation
//     · Blade Hardware
//     · Power Draw
//     · My Crystal
//
// The 3-column grid collapses to 2-col on medium widths and 1-col on
// narrow viewports. Each section lives in a bordered card with a
// header + body; no internal collapse since the pill does the hiding.

import { useState } from 'react';
import { StylePanel } from './StylePanel';
import { ColorPanel } from './ColorPanel';
import { GradientBuilder } from './GradientBuilder';
import { IgnitionRetractionPanel } from './IgnitionRetractionPanel';
import { EffectPanel } from './EffectPanel';
import { GestureControlPanel } from './GestureControlPanel';
import { LayerStack } from './LayerStack';
import { MotionSimPanel } from './MotionSimPanel';
import { BladeHardwarePanel } from './BladeHardwarePanel';
import { PowerDrawPanel } from './PowerDrawPanel';
import { CrystalPanel } from './CrystalPanel';
import { ModulatorPlateBar } from './routing/ModulatorPlateBar';
import { BindingList } from './routing/BindingList';
import { useSurpriseMe } from './Randomizer';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import { canBoardModulate } from '@/lib/boardProfiles';
import type { ReactNode } from 'react';

type DesignGroup = 'appearance' | 'behavior' | 'advanced' | 'routing';

interface GroupDef {
  id: DesignGroup;
  label: string;
  hint: string;
  sections: Array<{ id: string; title: string; content: ReactNode }>;
}

const GROUPS: GroupDef[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    hint: 'How the blade looks',
    sections: [
      { id: 'blade-style',      title: 'Blade Style',     content: <StylePanel /> },
      { id: 'colors',           title: 'Colors',          content: <ColorPanel /> },
      { id: 'gradient-builder', title: 'Gradient Builder', content: <GradientBuilder /> },
    ],
  },
  {
    id: 'behavior',
    label: 'Behavior',
    hint: 'How the blade reacts',
    sections: [
      { id: 'ignition-retraction', title: 'Ignition & Retraction', content: <IgnitionRetractionPanel /> },
      { id: 'effects',             title: 'Combat Effects',         content: <EffectPanel /> },
      { id: 'gestures',            title: 'Gesture Controls',       content: <GestureControlPanel /> },
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    hint: 'Power-user tuning + hardware',
    sections: [
      { id: 'layer-compositor', title: 'Layer Compositor',   content: <LayerStack /> },
      { id: 'motion-simulation', title: 'Motion Simulation', content: <MotionSimPanel /> },
      { id: 'blade-hardware',   title: 'Blade Hardware',     content: <BladeHardwarePanel /> },
      { id: 'power-draw',       title: 'Power Draw',         content: <PowerDrawPanel /> },
      { id: 'my-crystal',       title: 'My Crystal',         content: <CrystalPanel /> },
    ],
  },
  // ROUTING — v1.0 Modulation Preview (gated by board capability below)
  {
    id: 'routing',
    label: 'Routing',
    hint: 'Live-signal modulation wiring · BETA',
    sections: [
      { id: 'modulator-plates', title: 'Modulators',       content: <ModulatorPlateBar /> },
      { id: 'binding-list',     title: 'Active Bindings',  content: <BindingList /> },
    ],
  },
];

export function DesignPanel() {
  const [activeGroup, setActiveGroup] = useState<DesignGroup>('appearance');
  const { surprise, undo, canUndo } = useSurpriseMe();
  const boardId = useBoardProfile().boardId;
  const boardSupportsModulation = canBoardModulate(boardId);

  // Board gating: on boards that don't support modulation (CFX /
  // Xenopixel / Verso / Proffie V2.2 for v1.0), the ROUTING pill is
  // hidden entirely. If the user was previously on routing, bounce
  // back to Appearance.
  const visibleGroups = GROUPS.filter(
    (g) => g.id !== 'routing' || boardSupportsModulation,
  );
  if (!boardSupportsModulation && activeGroup === 'routing') {
    setActiveGroup('appearance');
  }

  const group = visibleGroups.find((g) => g.id === activeGroup) ?? visibleGroups[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar: Surprise Me + group pills */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={surprise}
            className="relative px-4 py-2 rounded-lg text-ui-sm font-semibold transition-all border border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent active:scale-[0.97] font-cinematic overflow-hidden group"
          >
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

        <div
          role="tablist"
          aria-label="Design section groups"
          className="flex items-center gap-1 ml-auto"
        >
          {visibleGroups.map((g) => {
            const active = g.id === activeGroup;
            const isRouting = g.id === 'routing';
            return (
              <button
                key={g.id}
                role="tab"
                aria-selected={active}
                aria-controls={`design-group-${g.id}`}
                onClick={() => setActiveGroup(g.id)}
                title={g.hint}
                className={[
                  'px-4 py-2 rounded-lg font-mono uppercase text-ui-xs tracking-[0.12em] border transition-colors relative',
                  active
                    ? 'text-accent bg-accent-dim/30 border-accent-border/60'
                    : 'text-text-muted hover:text-text-secondary border-border-subtle/60 hover:border-border-light',
                ].join(' ')}
              >
                {g.label}
                {isRouting && (
                  <span
                    className="ml-1.5 text-[8px] font-mono uppercase tracking-wider opacity-70"
                    style={{ color: 'rgb(var(--status-magenta))' }}
                    aria-label="Beta feature"
                  >
                    BETA
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group body — responsive 3-column grid. */}
      <div
        role="tabpanel"
        id={`design-group-${group.id}`}
        aria-label={`${group.label} controls`}
        className="grid gap-3 grid-cols-1 lg:grid-cols-2 desktop:grid-cols-3"
      >
        {group.sections.map((section) => (
          <SectionCard key={section.id} title={section.title}>
            {section.content}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-panel border border-border-subtle bg-bg-secondary/40 overflow-hidden">
      <header className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <h3 className="font-mono uppercase text-ui-xs tracking-[0.12em] text-text-secondary">
          {title}
        </h3>
      </header>
      <div className="p-3 flex-1 min-h-0 overflow-auto">
        {children}
      </div>
    </section>
  );
}
