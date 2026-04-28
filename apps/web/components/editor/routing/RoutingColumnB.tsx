'use client';

// ─── RoutingColumnB — Sidebar A/B v2 Phase 4e ──────────────────────────
//
// Column B of the routing A/B section. Two modes:
//
//   1. NO SELECTION — `selectedBindingId` is null, OR is a stale id
//      (binding was removed). Renders `<AddBindingForm />` + a brief
//      hint pointing the user to other creation paths in Column A.
//
//   2. EDITING — `selectedBindingId` matches an existing binding.
//      Renders the deep editor: source dropdown / target dropdown /
//      combinator dropdown / amount slider + bypass toggle + remove.
//      For expression-based bindings, an "Edit expression" button
//      opens the existing `<ExpressionEditor />` popover anchored to
//      the row (preserves the proven popover UX rather than reshaping
//      it for inline mounting).
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.5, Column B is meant
// to host a "live viz of source signal × combinator → target output."
// That visualization is deferred to v1.2 — the sampler + binding
// engine produce the data, but rendering the per-frame trace requires
// new wiring this PR doesn't take on. A "Live viz coming in v1.2"
// banner makes the absence honest.

import { useState } from 'react';
import {
  BUILT_IN_MODULATORS,
  type BindingCombinator,
  type SerializedBinding,
} from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import {
  getModulatableParameters,
  getParameter,
} from '@/lib/parameterGroups';
import { AddBindingForm } from './AddBindingForm';
import { ExpressionEditor } from './ExpressionEditor';

const COMBINATORS: readonly BindingCombinator[] = [
  'add',
  'replace',
  'multiply',
  'min',
  'max',
];

const EMPTY_BINDINGS: readonly SerializedBinding[] = [];

export interface RoutingColumnBProps {
  selectedBindingId: string | null;
  onClearSelection: () => void;
  /**
   * Test seam — when provided, overrides the store-derived bindings
   * list. Production (RoutingAB wrapper) doesn't pass this. Same
   * reasoning as RoutingColumnA's `bindings` prop: Zustand's React
   * binding pins the SSR snapshot to `getInitialState()`, so seeded
   * state can't reach `renderToStaticMarkup`.
   */
  bindings?: readonly SerializedBinding[];
}

export function RoutingColumnB({
  selectedBindingId,
  onClearSelection,
  bindings: bindingsProp,
}: RoutingColumnBProps): JSX.Element {
  const storeBindings = useBladeStore(
    (s) => s.config.modulation?.bindings ?? EMPTY_BINDINGS,
  );
  const bindings = bindingsProp ?? storeBindings;

  const selected = selectedBindingId
    ? bindings.find((b) => b.id === selectedBindingId)
    : null;

  // Stale-id case: binding was removed in a sibling tab / via Column A
  // remove. Treat as "no selection" so the user gets the AddBindingForm.
  if (selectedBindingId !== null && !selected) {
    return <NoSelectionView onClearSelection={onClearSelection} staleId />;
  }

  if (!selected) {
    return <NoSelectionView onClearSelection={onClearSelection} />;
  }

  return <EditBindingView binding={selected} />;
}

// ─── No selection ────────────────────────────────────────────────────

function NoSelectionView({
  onClearSelection,
  staleId = false,
}: {
  onClearSelection: () => void;
  staleId?: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col h-full" data-testid="routing-column-b-empty">
      <header className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <div className="flex items-baseline gap-3">
          <h3 className="font-mono uppercase text-ui-sm tracking-[0.10em] text-text-primary">
            New Binding
          </h3>
          <span className="text-ui-xs text-text-muted truncate">
            Pick source + target, then click Wire
          </span>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {staleId && (
          <div
            className="rounded border border-border-subtle bg-bg-surface px-3 py-2 text-ui-xs text-text-muted"
            role="status"
          >
            <p className="leading-relaxed">
              That binding was just removed. Pick another from the list, or
              create a new one below.
              <button
                type="button"
                onClick={onClearSelection}
                className="ml-1 underline decoration-dotted text-text-secondary hover:text-text-primary"
              >
                Dismiss
              </button>
            </p>
          </div>
        )}

        <AddBindingForm />

        <div
          className="rounded-panel border border-border-subtle bg-bg-surface px-3 py-2 text-ui-xs text-text-muted"
          aria-label="Other creation paths"
        >
          <p className="leading-relaxed">
            Or use the surfaces in Column A:
          </p>
          <ul className="list-disc list-inside leading-relaxed mt-1">
            <li>
              <span className="text-text-secondary">Recipe Picker</span> applies
              starter wirings (heartbeat, breathing, etc.) in one click
            </li>
            <li>
              <span className="text-text-secondary">Modulator plates</span>{' '}
              click-to-arm + click a parameter slider to wire
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Edit binding ────────────────────────────────────────────────────

interface EditBindingViewProps {
  binding: SerializedBinding;
}

function EditBindingView({ binding }: EditBindingViewProps): JSX.Element {
  const updateBinding = useBladeStore((s) => s.updateBinding);
  const removeBinding = useBladeStore((s) => s.removeBinding);
  const toggleBindingBypass = useBladeStore((s) => s.toggleBindingBypass);
  const [showExpressionEditor, setShowExpressionEditor] = useState(false);

  const isExpression = binding.source === null && binding.expression !== null;
  const modulatorDesc = BUILT_IN_MODULATORS.find(
    (m) => (m.id as string) === binding.source,
  );
  const sourceColor = isExpression
    ? 'rgb(var(--status-magenta))'
    : (modulatorDesc?.colorVar ?? 'rgb(var(--text-muted))');
  const sourceName = isExpression
    ? 'fx'
    : (modulatorDesc?.displayName ?? String(binding.source ?? '—'));

  const paramDesc = getParameter(binding.target);
  const paramLabel = paramDesc?.displayName ?? binding.target;

  const isBypassed = binding.bypassed === true;
  const amountPct = Math.round(binding.amount * 100);

  // Source + target dropdown options. updateBinding accepts partial
  // updates, so re-targeting from B is supported (per spec §4.5).
  const modulators = BUILT_IN_MODULATORS;
  const parameters = getModulatableParameters();

  return (
    <div className="flex flex-col h-full" data-testid="routing-column-b-edit">
      <header className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="font-mono uppercase text-ui-sm leading-none tracking-wider"
            style={{ color: sourceColor }}
          >
            {sourceName}
          </span>
          <span className="text-text-muted/60 text-ui-sm leading-none" aria-hidden="true">
            →
          </span>
          <span className="font-mono uppercase text-ui-sm leading-none tracking-wider text-text-primary">
            {paramLabel}
          </span>
          {isBypassed && (
            <span
              className="text-ui-xs uppercase tracking-wider px-1.5 rounded font-mono"
              style={{
                color: 'rgb(var(--status-warn))',
                background: 'rgba(var(--status-warn), 0.15)',
                border: '1px solid rgb(var(--status-warn))',
              }}
            >
              bypassed
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* Bypass + remove — large + visible, mirrors Column A icons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleBindingBypass(binding.id)}
            className={[
              'flex-1 px-3 py-1.5 rounded border text-ui-xs font-mono uppercase tracking-wider transition-colors',
              isBypassed
                ? 'bg-status-warn/15 border-status-warn text-status-warn'
                : 'bg-bg-surface border-border-subtle text-text-secondary hover:border-border-light',
            ].join(' ')}
            style={
              isBypassed
                ? {
                    color: 'rgb(var(--status-warn))',
                    background: 'rgba(var(--status-warn), 0.15)',
                    borderColor: 'rgb(var(--status-warn))',
                  }
                : undefined
            }
            aria-pressed={isBypassed}
          >
            {isBypassed ? '⏸ Unbypass' : '▶ Bypass (A/B test)'}
          </button>
          <button
            type="button"
            onClick={() => removeBinding(binding.id)}
            className="px-3 py-1.5 rounded border border-border-subtle bg-bg-surface text-text-muted hover:text-red-400 hover:border-red-400 transition-colors text-ui-xs font-mono uppercase tracking-wider"
            aria-label="Remove binding"
            title="Remove binding"
          >
            × Remove
          </button>
        </div>

        {/* SOURCE — read-only display for expression bindings (re-author
            by clicking Edit Expression below); editable dropdown for
            bare-source bindings. updateBinding accepts source changes,
            so re-targeting works seamlessly. */}
        <div>
          <label
            htmlFor="binding-edit-source"
            className="text-ui-xs font-mono uppercase tracking-wider text-text-muted block mb-1.5"
          >
            Source
          </label>
          {isExpression ? (
            <div className="px-3 py-2 rounded border border-border-subtle bg-bg-surface text-ui-xs">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-mono uppercase tracking-wider"
                  style={{ color: 'rgb(var(--status-magenta))' }}
                >
                  fx · expression
                </span>
              </div>
              <code
                className="block font-mono text-text-secondary text-[11px] break-all"
                title={binding.expression?.source ?? ''}
              >
                {binding.expression?.source ?? '(opaque AST)'}
              </code>
              <button
                type="button"
                onClick={() => setShowExpressionEditor((v) => !v)}
                className="mt-2 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors"
                style={
                  showExpressionEditor
                    ? {
                        color: 'rgb(var(--status-magenta))',
                        background: 'rgba(var(--status-magenta), 0.15)',
                        borderColor: 'rgb(var(--status-magenta))',
                      }
                    : {
                        color: 'rgb(var(--status-magenta))',
                        background: 'transparent',
                        borderColor: 'rgba(var(--status-magenta), 0.5)',
                      }
                }
                aria-pressed={showExpressionEditor}
              >
                {showExpressionEditor ? 'Close' : 'Edit Expression'}
              </button>

              {/* ExpressionEditor pops in absolute-positioned beneath
                  this row when open. The container is relative-anchored
                  via the wrapping div with position: relative below. */}
              {showExpressionEditor && (
                <div className="relative mt-2">
                  <ExpressionEditor
                    targetPath={binding.target}
                    targetLabel={paramLabel}
                    initialSource={binding.expression?.source ?? ''}
                    existingBindingId={binding.id}
                    onClose={() => setShowExpressionEditor(false)}
                  />
                </div>
              )}
            </div>
          ) : (
            <select
              id="binding-edit-source"
              value={binding.source ?? ''}
              onChange={(e) =>
                updateBinding(binding.id, {
                  source: e.target.value,
                  // Clear any expression payload when switching back to
                  // bare-source — keeps the binding shape consistent
                  // with the engine's runtime expectations.
                  expression: null,
                })
              }
              className="w-full bg-bg-surface border border-border-subtle rounded px-2 py-1.5 text-ui-xs focus:outline-none focus:border-accent"
              style={modulatorDesc ? { color: modulatorDesc.colorVar } : undefined}
            >
              {modulators.map((m) => (
                <option key={m.id as string} value={m.id as string}>
                  {m.displayName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* TARGET — always editable. Re-targeting is a real UX win
            from the A/B migration; previously you'd have to delete +
            recreate to change a binding's target. */}
        <div>
          <label
            htmlFor="binding-edit-target"
            className="text-ui-xs font-mono uppercase tracking-wider text-text-muted block mb-1.5"
          >
            Target
          </label>
          <select
            id="binding-edit-target"
            value={binding.target}
            onChange={(e) => updateBinding(binding.id, { target: e.target.value })}
            className="w-full bg-bg-surface border border-border-subtle rounded px-2 py-1.5 text-ui-xs focus:outline-none focus:border-accent"
          >
            {parameters.map((p) => (
              <option key={p.path} value={p.path}>
                {p.displayName} — {p.path}
              </option>
            ))}
          </select>
        </div>

        {/* COMBINATOR — how this binding composes with the static value */}
        <div>
          <label
            htmlFor="binding-edit-combinator"
            className="text-ui-xs font-mono uppercase tracking-wider text-text-muted block mb-1.5"
          >
            Combinator
          </label>
          <select
            id="binding-edit-combinator"
            value={binding.combinator}
            onChange={(e) =>
              updateBinding(binding.id, {
                combinator: e.target.value as BindingCombinator,
              })
            }
            className="w-full bg-bg-surface border border-border-subtle rounded px-2 py-1.5 text-ui-xs font-mono uppercase focus:outline-none focus:border-accent"
          >
            {COMBINATORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
            <span className="font-mono">add</span> blends modulation onto the
            slider value. <span className="font-mono">replace</span> overrides
            it entirely. <span className="font-mono">multiply</span> /{' '}
            <span className="font-mono">min</span> /{' '}
            <span className="font-mono">max</span> for shaping.
          </p>
        </div>

        {/* AMOUNT — 0..1 scaler on the modulator output */}
        <div>
          <label
            htmlFor="binding-edit-amount"
            className="text-ui-xs font-mono uppercase tracking-wider text-text-muted flex items-center justify-between mb-1.5"
          >
            <span>Amount</span>
            <span className="font-mono tabular-nums text-text-secondary">
              {amountPct}%
            </span>
          </label>
          <input
            id="binding-edit-amount"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={binding.amount}
            onChange={(e) =>
              updateBinding(binding.id, { amount: parseFloat(e.target.value) })
            }
            className="w-full accent-accent"
            aria-label={`Amount, currently ${amountPct} percent`}
          />
        </div>

        {/* Live viz placeholder — real per-frame trace ships in v1.2
            once the sampler exposes a public subscription API. */}
        <div
          className="rounded border border-dashed border-border-subtle/60 bg-bg-surface/40 px-3 py-2"
          aria-label="Live signal viz placeholder"
        >
          <p className="text-ui-xs font-mono uppercase tracking-wider text-text-muted">
            Live signal viz
          </p>
          <p className="text-[10px] text-text-muted/70 leading-relaxed mt-0.5">
            Source × combinator → target trace ships in v1.2. The engine
            already computes this per-frame; the visualization is wiring,
            not new math.
          </p>
        </div>
      </div>
    </div>
  );
}
