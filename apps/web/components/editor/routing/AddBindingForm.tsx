'use client';

// ─── AddBindingForm — v1.0 Modulation Preview ─────────────────────────
//
// Simple dropdown-based form for creating a new ModulationBinding.
// Complements the click-to-route UX from ModulatorPlateBar — some users
// prefer forms, and some surfaces (small viewports, a11y screen readers)
// work better with explicit controls.
//
// Friday v1.0 scope: bare-source bindings only (source + target +
// combinator + amount). Expression editor arrives in v1.1 Core.
//
// Board gating: hidden when the current board doesn't support
// modulation — the parent route already hides the whole ROUTING pill,
// but this component also self-guards in case it's mounted elsewhere.

import { useState } from 'react';
import {
  BUILT_IN_MODULATORS,
  type BindingCombinator,
  type SerializedBinding,
} from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import {
  getModulatableParameters,
} from '@/lib/parameterGroups';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import { canBoardModulate } from '@/lib/boardProfiles';

// Friday v1.0 plates the same 5 modulators as the plate bar.
const V1_0_MODULATOR_IDS: readonly string[] = [
  'swing',
  'sound',
  'angle',
  'time',
  'clash',
];

const COMBINATORS: readonly BindingCombinator[] = [
  'add',
  'replace',
  'multiply',
  'min',
  'max',
];

// Pick the most modulation-friendly defaults for the form's initial state.
const DEFAULT_SOURCE = 'swing';
const DEFAULT_TARGET = 'shimmer';
const DEFAULT_COMBINATOR: BindingCombinator = 'add';
const DEFAULT_AMOUNT = 0.6;

function newBindingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `b-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

export function AddBindingForm() {
  const boardId = useBoardProfile().boardId;
  const addBinding = useBladeStore((s) => s.addBinding);

  const [source, setSource] = useState<string>(DEFAULT_SOURCE);
  const [target, setTarget] = useState<string>(DEFAULT_TARGET);
  const [combinator, setCombinator] = useState<BindingCombinator>(DEFAULT_COMBINATOR);
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);

  if (!canBoardModulate(boardId)) {
    return null;
  }

  const modulators = BUILT_IN_MODULATORS.filter((m) =>
    V1_0_MODULATOR_IDS.includes(m.id as string),
  );
  const parameters = getModulatableParameters();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const binding: SerializedBinding = {
      id: newBindingId(),
      source,
      expression: null,
      target,
      combinator,
      amount,
      bypassed: false,
      label: `${source} → ${target}`,
    };
    addBinding(binding);
    // Keep the form values as-is so users can iterate quickly on the
    // same source/target shape.
  };

  const sourceDesc = BUILT_IN_MODULATORS.find((m) => (m.id as string) === source);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 p-2 rounded border border-border-subtle bg-bg-deep/40"
      aria-label="Create modulation binding"
    >
      <div
        className="grid gap-2 items-center"
        style={{ gridTemplateColumns: '70px 1fr' }}
      >
        <label htmlFor="binding-source" className="text-ui-xs font-mono uppercase text-text-muted">
          Source
        </label>
        <select
          id="binding-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-ui-xs focus:outline-none focus:border-accent"
          style={sourceDesc ? { color: sourceDesc.colorVar } : undefined}
        >
          {modulators.map((m) => (
            <option key={m.id as string} value={m.id as string}>
              {m.displayName}
            </option>
          ))}
        </select>

        <label htmlFor="binding-target" className="text-ui-xs font-mono uppercase text-text-muted">
          Target
        </label>
        <select
          id="binding-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-ui-xs focus:outline-none focus:border-accent"
        >
          {parameters.map((p) => (
            <option key={p.path} value={p.path}>
              {p.displayName} — {p.path}
            </option>
          ))}
        </select>

        <label htmlFor="binding-combinator" className="text-ui-xs font-mono uppercase text-text-muted">
          Combinator
        </label>
        <select
          id="binding-combinator"
          value={combinator}
          onChange={(e) => setCombinator(e.target.value as BindingCombinator)}
          className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-ui-xs font-mono uppercase focus:outline-none focus:border-accent"
        >
          {COMBINATORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor="binding-amount" className="text-ui-xs font-mono uppercase text-text-muted">
          Amount
        </label>
        <div className="flex items-center gap-2 min-w-0">
          <input
            id="binding-amount"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="font-mono tabular-nums text-text-secondary w-10 text-right text-ui-xs">
            {Math.round(amount * 100)}%
          </span>
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-1.5 rounded bg-accent/10 hover:bg-accent/20 text-accent border border-accent/40 hover:border-accent transition-colors text-ui-xs font-mono uppercase tracking-wider"
      >
        Wire Binding
      </button>
    </form>
  );
}
