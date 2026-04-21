'use client';

// ─── Inspector — OV7 ────────────────────────────────────────────────────────
//
// Right-column panel on the Design tab. Five tabs:
//
//   STATE   — 9-state vertical blade stack (placeholder; OV8 lands the
//             engine.captureStateFrame API that drives the live content)
//   STYLE   — StylePanel (style picker + style-specific params)
//   COLOR   — ColorPanel + GradientBuilder
//   EFFECTS — IgnitionRetractionPanel + EffectPanel + GestureControlPanel
//   ROUTING — placeholder reserved for v1.1 modulation-routing
//
// The Inspector composes existing panel components rather than
// deep-extracting their internals; OV9 already migrated the pickers to
// MiniGalleryPicker, so the content inside each tab is the same surface
// users are already familiar with.

import { useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { StylePanel } from './StylePanel';
import { ColorPanel } from './ColorPanel';
import { GradientBuilder } from './GradientBuilder';
import { EffectPanel } from './EffectPanel';
import { IgnitionRetractionPanel } from './IgnitionRetractionPanel';
import { GestureControlPanel } from './GestureControlPanel';

export type InspectorTab = 'state' | 'style' | 'color' | 'effects' | 'routing';

const TABS: Array<{ id: InspectorTab; label: string }> = [
  { id: 'state',   label: 'STATE' },
  { id: 'style',   label: 'STYLE' },
  { id: 'color',   label: 'COLOR' },
  { id: 'effects', label: 'EFFECTS' },
  { id: 'routing', label: 'ROUTING' },
];

const STATE_ROWS = [
  { id: 'off',           label: 'OFF',           hint: 'All dark' },
  { id: 'preon',         label: 'PREON',         hint: 'Flash tint at 50%' },
  { id: 'igniting',      label: 'IGNITING 50%',  hint: 'Half-extended frame' },
  { id: 'on',            label: 'IDLE ON',       hint: 'Steady full blade' },
  { id: 'clash',         label: 'CLASH',         hint: 'White flash held' },
  { id: 'blast',         label: 'BLAST',         hint: 'Blast mark held' },
  { id: 'lockup',        label: 'LOCKUP',        hint: 'Flicker bump held' },
  { id: 'drag',          label: 'DRAG',          hint: 'Tip bleed held' },
  { id: 'retracting',    label: 'RETRACTING 50%', hint: 'Half-retracted frame' },
] as const;

interface InspectorProps {
  className?: string;
}

export function Inspector({ className }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('state');
  const ledCount = useBladeStore((s) => s.config.ledCount);

  return (
    <aside
      className={['flex flex-col bg-bg-secondary/60 border-l border-border-subtle', className ?? ''].join(' ')}
      role="region"
      aria-label="Inspector"
      style={{ width: 400, flexShrink: 0 }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center border-b border-border-subtle bg-bg-deep/40 shrink-0"
        role="tablist"
        aria-label="Inspector tabs"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 min-w-0 px-2 py-2 font-mono uppercase text-ui-xs transition-colors whitespace-nowrap',
                'tracking-[0.1em]',
                active
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-secondary border-b-2 border-transparent',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'state' && <InspectorStateTab ledCount={ledCount} />}
        {activeTab === 'style' && (
          <div className="p-3">
            <StylePanel />
          </div>
        )}
        {activeTab === 'color' && (
          <div className="p-3 space-y-4">
            <ColorPanel />
            <GradientBuilder />
          </div>
        )}
        {activeTab === 'effects' && (
          <div className="p-3 space-y-4">
            <IgnitionRetractionPanel />
            <EffectPanel />
            <GestureControlPanel />
          </div>
        )}
        {activeTab === 'routing' && <InspectorRoutingTab />}
      </div>
    </aside>
  );
}

// ─── STATE tab — placeholder grid ────────────────────────────────────────────
//
// OV8 lands the engine.captureStateFrame API that drives the live
// snapshot + motion-on-hover behavior described in UI_OVERHAUL_v2_PROPOSAL §6.
// For OV7 we ship the structural scaffold — same-width rows, same
// heights, state labels — with a static accent bar standing in for each
// state's captured frame. The row click handler is already wired up to
// log to the effect log as a hint that this is the audition surface.

interface InspectorStateTabProps {
  ledCount: number;
}

function InspectorStateTab({ ledCount }: InspectorStateTabProps) {
  return (
    <div className="p-3 space-y-2">
      <div
        className="font-mono uppercase text-text-muted"
        style={{ fontSize: 10, letterSpacing: '0.1em', lineHeight: '14px' }}
      >
        Preview across blade states — click to audition
      </div>
      <div className="space-y-1">
        {STATE_ROWS.map((row) => (
          <InspectorStateRow key={row.id} label={row.label} hint={row.hint} />
        ))}
      </div>
      <p className="text-ui-xs text-text-muted/60 pt-2">
        {ledCount} LEDs · Live snapshots arrive in OV8 (engine captureStateFrame API).
      </p>
    </div>
  );
}

function InspectorStateRow({ label, hint }: { label: string; hint: string }) {
  return (
    <button
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded border border-border-subtle bg-bg-deep/40 hover:border-border-light hover:bg-bg-deep transition-colors group text-left"
      title={hint}
    >
      <span
        className="font-mono uppercase text-text-secondary group-hover:text-text-primary shrink-0"
        style={{ fontSize: 9, letterSpacing: '0.08em', width: 96 }}
      >
        {label}
      </span>
      {/* Accent bar stands in for the state's captured frame. OV8 replaces
          this with a real pixel-row rendering at the shared bladeRenderWidth
          so every row lines up visually. */}
      <span
        className="flex-1 h-3 rounded-sm"
        style={{
          background: `linear-gradient(to right, rgb(var(--accent) / 0.25), rgb(var(--accent) / 0.6), rgb(var(--accent) / 0.25))`,
        }}
      />
    </button>
  );
}

// ─── ROUTING tab — v1.1 placeholder ──────────────────────────────────────────

function InspectorRoutingTab() {
  return (
    <div className="p-4 text-center space-y-2">
      <div
        className="font-mono uppercase text-text-muted"
        style={{ fontSize: 10, letterSpacing: '0.1em' }}
      >
        Modulation Routing
      </div>
      <p className="text-ui-xs text-text-muted/70">
        Reserved for v1.1 — modulator plates in the LayerStack will wire to parameters here.
      </p>
      <p className="text-ui-xs text-text-muted/50">
        See <code className="text-accent/70">docs/MODULATION_ROUTING_V1.1.md</code>.
      </p>
    </div>
  );
}
