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

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { BladeEngine, EffectType } from '@kyberstation/engine';
import { BladeState } from '@kyberstation/engine';
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

interface StateRowDef {
  id: string;
  label: string;
  hint: string;
  state: BladeState;
  effect?: EffectType;
  progress?: number;
}

const STATE_ROWS: readonly StateRowDef[] = [
  { id: 'off',        label: 'OFF',            hint: 'All dark',              state: BladeState.OFF },
  { id: 'preon',      label: 'PREON',          hint: 'Flash tint at 50%',     state: BladeState.PREON,      progress: 0.5 },
  { id: 'igniting',   label: 'IGNITING 50%',   hint: 'Half-extended frame',   state: BladeState.IGNITING,   progress: 0.5 },
  { id: 'on',         label: 'IDLE ON',        hint: 'Steady full blade',     state: BladeState.ON },
  { id: 'clash',      label: 'CLASH',          hint: 'White flash held',      state: BladeState.ON,         effect: 'clash' },
  { id: 'blast',      label: 'BLAST',          hint: 'Blast mark held',       state: BladeState.ON,         effect: 'blast' },
  { id: 'lockup',     label: 'LOCKUP',         hint: 'Flicker bump held',     state: BladeState.ON,         effect: 'lockup' },
  { id: 'drag',       label: 'DRAG',           hint: 'Tip bleed held',        state: BladeState.ON,         effect: 'drag' },
  { id: 'retracting', label: 'RETRACTING 50%', hint: 'Half-retracted frame',  state: BladeState.RETRACTING, progress: 0.5 },
] as const;

interface InspectorProps {
  className?: string;
  /** Main blade engine ref (from useBladeEngine). Used by the STATE tab
   *  to call captureStateFrame for per-row snapshots. */
  engineRef?: RefObject<BladeEngine | null>;
  /** Inline style overrides. OV11 uses this to thread the user-
   *  draggable width from uiStore.inspectorWidth. */
  style?: React.CSSProperties;
}

export function Inspector({ className, engineRef, style }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('state');
  const ledCount = useBladeStore((s) => s.config.ledCount);

  return (
    <aside
      className={[
        'flex flex-col bg-bg-secondary/60 shrink-0',
        // OV11: left border removed — the ResizeHandle to our left
        // carries the seam. Width now comes from uiStore.inspectorWidth
        // via the `style` prop; OV10's Tailwind width classes are the
        // fallback when no style is provided (e.g. if the Inspector is
        // ever mounted outside WorkbenchLayout).
        style?.width ? '' : 'w-[320px] xl:w-[400px]',
        className ?? '',
      ].join(' ')}
      role="region"
      aria-label="Inspector"
      style={style}
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
        {activeTab === 'state' && <InspectorStateTab ledCount={ledCount} engineRef={engineRef} />}
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

// ─── STATE tab — live snapshots via engine.captureStateFrame (OV8) ──────────
//
// Each row renders a real RGB snapshot for its state via the engine's
// `captureStateFrame(state, config, effectHeld?, { progress })` API.
// Snapshots refresh via useMemo when the blade config changes; the
// main engine tick isn't disturbed (captureStateFrame uses a scratch
// engine per call). Rows are vertically stacked at the same width so
// changing a color / param reads uniformly across all 9 states.

interface InspectorStateTabProps {
  ledCount: number;
  engineRef?: RefObject<BladeEngine | null>;
}

function InspectorStateTab({ ledCount, engineRef }: InspectorStateTabProps) {
  const config = useBladeStore((s) => s.config);

  // Compute 9 snapshots on config change. Each frame is ~132 × 3 bytes
  // (plus a scratch engine's update cost). Cheap enough per-edit, not
  // per-frame — no rAF loop here.
  const frames = useMemo(() => {
    const engine = engineRef?.current;
    if (!engine) return null;
    return STATE_ROWS.map((row) => {
      try {
        return engine.captureStateFrame(row.state, config, row.effect, {
          progress: row.progress ?? 1,
        });
      } catch {
        // Defensive: if a state/effect combination throws, fall back to
        // an all-zero buffer so the row still renders.
        return new Uint8Array(ledCount * 3);
      }
    });
  }, [config, engineRef, ledCount]);

  return (
    <div className="p-3 space-y-2">
      <div
        className="font-mono uppercase text-text-muted"
        style={{ fontSize: 10, letterSpacing: '0.1em', lineHeight: '14px' }}
      >
        Preview across blade states — refresh on edit
      </div>
      <div className="space-y-1">
        {STATE_ROWS.map((row, i) => (
          <InspectorStateRow
            key={row.id}
            label={row.label}
            hint={row.hint}
            frame={frames?.[i] ?? null}
            ledCount={ledCount}
          />
        ))}
      </div>
      <p className="text-ui-xs text-text-muted/60 pt-2">
        {ledCount} LEDs · Snapshots refresh on config change (no live tick).
      </p>
    </div>
  );
}

interface InspectorStateRowProps {
  label: string;
  hint: string;
  frame: Uint8Array | null;
  ledCount: number;
}

function InspectorStateRow({ label, hint, frame, ledCount }: InspectorStateRowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    // Clear to near-black
    ctx.fillStyle = '#03030a';
    ctx.fillRect(0, 0, w, h);
    if (!frame || ledCount <= 0) return;
    const leds = Math.min(ledCount, Math.floor(frame.length / 3));
    const cellW = w / leds;
    for (let i = 0; i < leds; i++) {
      const r = frame[i * 3] ?? 0;
      const g = frame[i * 3 + 1] ?? 0;
      const b = frame[i * 3 + 2] ?? 0;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i * cellW, 0, Math.max(cellW + 0.5, 1), h);
    }
  }, [frame, ledCount]);

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
      <canvas
        ref={canvasRef}
        width={256}
        height={12}
        className="flex-1 h-3 rounded-sm"
        style={{ imageRendering: 'pixelated', minWidth: 0 }}
        aria-hidden="true"
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
