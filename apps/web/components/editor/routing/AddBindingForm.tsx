'use client';

// ─── AddBindingForm — v1.1 Core Modulation ────────────────────────────
//
// Simple dropdown-based form for creating a new ModulationBinding.
// Complements the click-to-route UX from ModulatorPlateBar — some users
// prefer forms, and some surfaces (small viewports, a11y screen readers)
// work better with explicit controls.
//
// Scope: bare-source bindings (source + target + combinator + amount).
// Expression-based bindings authored via the inline ExpressionEditor on
// any SliderControl.
//
// Source dropdown surfaces all 19 built-in modulators (11 v1.1 Core +
// 8 Wave 8 LITE aux/gesture event modulators) from
// `packages/engine/src/modulation/registry.ts`. Wave 8 UI shell
// organizes them under <optgroup> labels matching the categorization
// in ModulatorPlateBar so users see the same mental model in both
// surfaces.
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
import {
  getPropFileProfile,
  type PropFileProfile,
} from '@/lib/propFileProfiles';

const COMBINATORS: readonly BindingCombinator[] = [
  'add',
  'replace',
  'multiply',
  'min',
  'max',
];

// ─── Source-dropdown groupings ───────────────────────────────────────
//
// Wave 8 UI shell. Mirrors the `MODULATOR_CATEGORIES` shape in
// ModulatorPlateBar; intentionally duplicated here rather than imported
// to keep AddBindingForm independent of the plate-bar's render
// implementation (parallel surface, not nested).
interface SourceGroup {
  readonly label: string;
  readonly modulatorIds: readonly string[];
}

const SOURCE_GROUPS: readonly SourceGroup[] = [
  { label: 'Motion',  modulatorIds: ['swing', 'angle', 'twist'] },
  { label: 'Audio',   modulatorIds: ['sound'] },
  { label: 'Power',   modulatorIds: ['battery', 'time'] },
  { label: 'State',   modulatorIds: ['clash', 'lockup', 'preon', 'ignition', 'retraction'] },
  { label: 'Button',  modulatorIds: ['aux-click', 'aux-hold', 'aux-double-click'] },
  {
    label: 'Gesture',
    modulatorIds: [
      'gesture-twist',
      'gesture-stab',
      'gesture-swing',
      'gesture-clash',
      'gesture-shake',
    ],
  },
];

// Pick the most modulation-friendly defaults for the form's initial state.
const DEFAULT_SOURCE = 'swing';
const DEFAULT_TARGET = 'shimmer';
const DEFAULT_COMBINATOR: BindingCombinator = 'add';
const DEFAULT_AMOUNT = 0.6;

// ─── Wave 8 — triggerEvent coupling ──────────────────────────────────
//
// When the source is one of the 8 aux/gesture event modulators, an
// optional `triggerEvent` dropdown surfaces so the user can couple the
// binding to a specific prop-file event (e.g. "fire on double-click,
// not every aux-click decay frame"). For non-event sources the
// dropdown is hidden — the engine validation in
// `applyBindings.isValidTriggerEventBinding` requires
// source ∈ {aux-*, gesture-*} when triggerEvent is set.
const EVENT_SOURCE_PREFIXES = ['aux-', 'gesture-'] as const;

function isEventSource(sourceId: string): boolean {
  return EVENT_SOURCE_PREFIXES.some((p) => sourceId.startsWith(p));
}

function getActivePropFileProfile(propFileId: string | undefined): PropFileProfile | undefined {
  if (!propFileId) return undefined;
  // Bridge from the short local ids stored on bladeStore (`bc`, `default`)
  // to the longer propFileProfiles ids (`bc-button-controls`, `default-fett`).
  // Mirrors `GestureControlPanel.PROFILE_ID_BY_PROP_FILE_ID`.
  const mapping: Record<string, string | undefined> = {
    fett263: 'fett263',
    sa22c: 'sa22c',
    bc: 'bc-button-controls',
    shtok: undefined,
    default: 'default-fett',
  };
  const registryId = mapping[propFileId];
  if (!registryId) return undefined;
  return getPropFileProfile(registryId);
}

function newBindingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `b-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

export function AddBindingForm() {
  const boardId = useBoardProfile().boardId;
  const addBinding = useBladeStore((s) => s.addBinding);
  // `config` may be absent in some mocked or partial-store scenarios —
  // guard so the form still renders when the test/mock harness doesn't
  // populate it. Production always supplies the full store shape.
  const propFileId = useBladeStore(
    (s) => (s.config as { propFileId?: string } | undefined)?.propFileId,
  );

  const [source, setSource] = useState<string>(DEFAULT_SOURCE);
  const [target, setTarget] = useState<string>(DEFAULT_TARGET);
  const [combinator, setCombinator] = useState<BindingCombinator>(DEFAULT_COMBINATOR);
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  // Wave 8 — optional prop-file event coupling. Empty string = "no
  // coupling, drive every frame" (the legacy behavior). Non-empty is
  // a prop-file event id from the active profile's vocabulary.
  const [triggerEvent, setTriggerEvent] = useState<string>('');

  if (!canBoardModulate(boardId)) {
    return null;
  }

  // v1.1 Core + Wave 8 LITE: surface all 19 built-in modulators
  // grouped by category (same shape as ModulatorPlateBar's grid
  // sections).
  const descriptorsById = new Map<string, typeof BUILT_IN_MODULATORS[number]>(
    BUILT_IN_MODULATORS.map((m) => [m.id as string, m]),
  );
  const parameters = getModulatableParameters();

  // Wave 8 — surface the prop-file event vocabulary when the source
  // is an aux/gesture event modulator.
  const sourceIsEvent = isEventSource(source);
  const propProfile = getActivePropFileProfile(propFileId);
  const availableEvents: readonly string[] = sourceIsEvent && propProfile
    ? [...propProfile.buttonEvents, ...propProfile.gestureEvents]
    : [];

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
      // Only attach triggerEvent when (a) the source is an event
      // modulator and (b) the user picked a specific event. Otherwise
      // leave the field absent so the binding fires every frame as
      // before — round-trip-safe with pre-Wave-8 storage.
      ...(sourceIsEvent && triggerEvent
        ? { triggerEvent }
        : {}),
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
          {SOURCE_GROUPS.map((group) => {
            const groupOptions = group.modulatorIds
              .map((id) => descriptorsById.get(id))
              .filter((m): m is NonNullable<typeof m> => m !== undefined);
            if (groupOptions.length === 0) return null;
            return (
              <optgroup key={group.label} label={group.label}>
                {groupOptions.map((m) => (
                  <option key={m.id as string} value={m.id as string}>
                    {m.displayName}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>

        {/* Wave 8 — Optional prop-file event coupling.
            Only rendered when the source is an aux/gesture event
            modulator AND the active prop file exposes events. The
            engine's `isValidTriggerEventBinding` enforces source ∈
            {aux-*, gesture-*} when triggerEvent is set; this UI gate
            mirrors that contract. */}
        {sourceIsEvent && availableEvents.length > 0 && (
          <>
            <label
              htmlFor="binding-trigger-event"
              className="text-ui-xs font-mono uppercase text-text-muted"
            >
              Event
            </label>
            <select
              id="binding-trigger-event"
              data-testid="binding-trigger-event-select"
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-ui-xs focus:outline-none focus:border-accent"
              title="Fire only when the prop file emits this exact event (optional)."
            >
              <option value="">(every frame)</option>
              {availableEvents.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </>
        )}

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
