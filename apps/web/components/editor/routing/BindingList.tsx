'use client';

// ─── BindingList — v1.0 Modulation Preview ────────────────────────────
//
// Displays every active modulation binding on the current blade. Each
// row shows source → target + combinator dropdown + amount scrub +
// bypass toggle + delete button.
//
// Empty state nudges the user toward the ModulatorPlateBar workflow.
//
// Per docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md §3.1, the Friday v1.0
// Preview supports bare-source bindings only (no math expressions).
// v1.1 adds Cmd+click → expression editor on parameter scrub fields.

import {
  BUILT_IN_MODULATORS,
  type BindingCombinator,
  type SerializedBinding,
} from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import { getParameter } from '@/lib/parameterGroups';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import { canBoardModulate } from '@/lib/boardProfiles';
import { AddBindingForm } from './AddBindingForm';

// Stable empty array reference — passing `[]` as a Zustand selector
// fallback creates a new reference every render and triggers an
// infinite-rerender loop. See commit note in dcd4dd4 / fix commit.
const EMPTY_BINDINGS: readonly SerializedBinding[] = [];

const COMBINATORS: readonly BindingCombinator[] = [
  'add',
  'replace',
  'multiply',
  'min',
  'max',
];

export function BindingList() {
  const boardId = useBoardProfile().boardId;
  const bindings = useBladeStore((s) => s.config.modulation?.bindings ?? EMPTY_BINDINGS);
  const clearAllBindings = useBladeStore((s) => s.clearAllBindings);

  if (!canBoardModulate(boardId)) {
    return null;
  }

  return (
    <div className="space-y-2">
      <AddBindingForm />

      {bindings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded border border-dashed border-border-subtle/60 bg-bg-surface/40">
          <span className="text-ui-sm text-text-secondary font-medium">
            No bindings yet
          </span>
          <span className="text-ui-xs text-text-muted text-center max-w-[260px] leading-relaxed">
            Pick a source and target above, then click Wire. Or click a
            modulator plate to arm it for click-to-route.
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between pt-1">
            <span
              className="text-ui-xs font-mono uppercase tracking-wider text-text-muted"
              aria-live="polite"
            >
              {bindings.length} binding{bindings.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={clearAllBindings}
              className="text-ui-xs text-text-muted/70 hover:text-red-400 underline decoration-dotted transition-colors"
              title="Remove every binding on this blade"
            >
              Clear all
            </button>
          </div>
          <ul role="list" className="space-y-1">
            {bindings.map((binding) => (
              <li key={binding.id}>
                <BindingRow binding={binding} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Individual binding row ───────────────────────────────────────────

interface BindingRowProps {
  binding: SerializedBinding;
}

function BindingRow({ binding }: BindingRowProps) {
  const removeBinding = useBladeStore((s) => s.removeBinding);
  const updateBinding = useBladeStore((s) => s.updateBinding);
  const toggleBindingBypass = useBladeStore((s) => s.toggleBindingBypass);

  const modulatorDesc = BUILT_IN_MODULATORS.find(
    (m) => (m.id as string) === binding.source,
  );
  const color = modulatorDesc?.colorVar ?? 'rgb(var(--text-muted))';
  const sourceName = modulatorDesc?.displayName ?? String(binding.source ?? 'expr');

  const paramDesc = getParameter(binding.target);
  const paramLabel = paramDesc?.displayName ?? binding.target;

  const isBypassed = binding.bypassed === true;

  return (
    <div
      className="grid gap-2 items-center px-2 py-1.5 rounded border text-ui-xs"
      style={{
        gridTemplateColumns: 'minmax(80px, 120px) 10px minmax(80px, 1fr) 70px 1fr 24px 20px',
        background: isBypassed ? 'rgba(var(--bg-deep), 0.4)' : 'rgb(var(--bg-surface))',
        borderColor: isBypassed
          ? 'rgb(var(--border-subtle))'
          : 'rgb(var(--border-subtle))',
        borderStyle: isBypassed ? 'dashed' : 'solid',
        boxShadow: isBypassed ? 'none' : `inset 3px 0 0 ${color}`,
        opacity: isBypassed ? 0.55 : 1,
      }}
    >
      {/* Source modulator label */}
      <span
        className="font-mono uppercase tracking-wider truncate"
        style={{ color }}
        title={`Source: ${sourceName}`}
      >
        {sourceName}
      </span>

      {/* → arrow */}
      <span
        className="text-center text-text-muted/60"
        aria-hidden="true"
      >
        →
      </span>

      {/* Target parameter */}
      <span
        className="truncate text-text-secondary"
        title={`Target: ${paramLabel} (${binding.target})`}
      >
        {paramLabel}
      </span>

      {/* Combinator dropdown */}
      <select
        value={binding.combinator}
        onChange={(e) =>
          updateBinding(binding.id, {
            combinator: e.target.value as BindingCombinator,
          })
        }
        className="bg-bg-deep border border-border-subtle rounded px-1 py-0.5 text-ui-xs font-mono uppercase cursor-pointer hover:border-border-light focus:outline-none focus:border-accent"
        title="How this binding composes with the static parameter value"
        aria-label="Combinator"
      >
        {COMBINATORS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Amount scrub — range input for v1.0 (scrub field comes v1.1) */}
      <div className="flex items-center gap-1.5 min-w-0">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={binding.amount}
          onChange={(e) =>
            updateBinding(binding.id, { amount: parseFloat(e.target.value) })
          }
          className="flex-1 accent-accent"
          aria-label="Amount"
          title={`Amount: ${Math.round(binding.amount * 100)}%`}
        />
        <span className="font-mono tabular-nums text-text-muted shrink-0 w-8 text-right">
          {Math.round(binding.amount * 100)}%
        </span>
      </div>

      {/* Bypass toggle */}
      <button
        type="button"
        onClick={() => toggleBindingBypass(binding.id)}
        className="w-6 h-6 rounded border flex items-center justify-center font-mono text-ui-xs transition-colors"
        style={{
          color: isBypassed ? 'rgb(var(--status-warn))' : 'rgb(var(--text-muted))',
          background: isBypassed ? 'rgba(var(--status-warn), 0.15)' : 'transparent',
          borderColor: isBypassed
            ? 'rgb(var(--status-warn))'
            : 'rgb(var(--border-subtle))',
        }}
        title={isBypassed ? 'Unbypass this binding' : 'Bypass this binding (A/B test)'}
        aria-pressed={isBypassed}
        aria-label="Toggle bypass"
      >
        {isBypassed ? '⏸' : '▶'}
      </button>

      {/* Remove */}
      <button
        type="button"
        onClick={() => removeBinding(binding.id)}
        className="w-5 h-5 text-text-muted/50 hover:text-red-400 transition-colors text-ui-sm"
        title="Remove binding"
        aria-label="Remove binding"
      >
        ×
      </button>
    </div>
  );
}
