'use client';

// ─── RoutingColumnA — Sidebar A/B v2 Phase 4e ──────────────────────────
//
// Column A of the routing A/B section. Hosts the "creation" surfaces at
// the top + the "active bindings" list below. Per
// `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.5:
//
//   - Top: "+ New Binding" button + RecipePicker dropdown
//   - Below top: ModulatorPlateBar (the click-to-route arming surface)
//   - Below bar: list of binding rows (source-color stripe + source name
//     + → + target parameter + amount %)
//
// Compared to the legacy single-panel `BindingList`, each row here is
// CONDENSED — combinator dropdown + amount slider move to Column B's
// deep editor when a row is selected. Bypass + remove stay inline as
// small icons so users can manage state without committing to editing.
//
// Selection state is owned by the parent `RoutingAB` wrapper; clicking
// a row writes the binding id, which Column B reads to render its
// editor. Clicking "+ New Binding" clears selection so Column B falls
// back to its empty/creating state (AddBindingForm).

import {
  BUILT_IN_MODULATORS,
  type SerializedBinding,
} from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import { getParameter } from '@/lib/parameterGroups';
import { ModulatorPlateBar } from './ModulatorPlateBar';
import { RecipePicker } from './RecipePicker';

// Stable empty array reference — mirrors BindingList's pattern.
// Passing `[]` as a Zustand selector fallback creates a new reference
// every render and triggers an infinite-rerender loop.
const EMPTY_BINDINGS: readonly SerializedBinding[] = [];

export interface RoutingColumnAProps {
  selectedBindingId: string | null;
  onSelect: (id: string | null) => void;
  /**
   * Test seam — when provided, overrides the store-derived bindings
   * list. Production code (RoutingAB wrapper) doesn't pass this; only
   * the SSR test suite uses it because Zustand's React binding pins
   * the server snapshot to `getInitialState()` and store mutations
   * before `renderToStaticMarkup` aren't visible to the snapshot.
   */
  bindings?: readonly SerializedBinding[];
}

export function RoutingColumnA({
  selectedBindingId,
  onSelect,
  bindings: bindingsProp,
}: RoutingColumnAProps): JSX.Element {
  const storeBindings = useBladeStore(
    (s) => s.config.modulation?.bindings ?? EMPTY_BINDINGS,
  );
  const bindings = bindingsProp ?? storeBindings;
  const removeBinding = useBladeStore((s) => s.removeBinding);
  const toggleBindingBypass = useBladeStore((s) => s.toggleBindingBypass);

  return (
    <div className="flex flex-col h-full" data-testid="routing-column-a">
      {/* Sticky top — creation surfaces + plate bar. */}
      <div
        className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0 space-y-2"
        data-testid="routing-column-a-creation"
      >
        {/* "+ New Binding" — clears Column B's selection so the empty
            state surfaces (which mounts AddBindingForm in B). */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={[
            'w-full px-2 py-1.5 rounded text-ui-xs font-mono uppercase tracking-wider',
            'border transition-colors',
            selectedBindingId === null
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light',
          ].join(' ')}
          aria-pressed={selectedBindingId === null}
        >
          + New Binding
        </button>

        {/* RecipePicker — 11 starter recipes; each applies to the
            current blade and creates 1+ bindings. */}
        <RecipePicker />

        {/* ModulatorPlateBar — click-to-arm UX. The plates write
            modulator id into uiStore.armedRoutingSourceId; the next
            ParameterBank label click consumes it to create a binding.
            Drag-to-route also uses dataTransfer with these plates as
            the source. */}
        <div className="-mx-3 px-3 pt-1 border-t border-border-subtle/50">
          <h4 className="font-mono uppercase text-ui-xs tracking-[0.10em] text-text-muted mb-1.5">
            Modulators
          </h4>
          <ModulatorPlateBar />
        </div>
      </div>

      {/* Scrollable list body — binding rows. Empty state when no
          bindings exist, nudging the user toward creation paths above. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {bindings.length === 0 ? (
          <div className="px-3 py-6 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-ui-sm text-text-secondary font-medium">
              No bindings yet
            </span>
            <span className="text-ui-xs text-text-muted leading-relaxed max-w-[240px]">
              Click + New Binding above to start with a form, pick a
              recipe, or click a modulator plate to arm click-to-route.
            </span>
          </div>
        ) : (
          <ul
            role="listbox"
            aria-label="Active modulation bindings"
            aria-activedescendant={
              selectedBindingId
                ? `routing-binding-row-${selectedBindingId}`
                : undefined
            }
            className="divide-y divide-border-subtle/40"
          >
            {bindings.map((binding) => (
              <BindingRowCondensed
                key={binding.id}
                binding={binding}
                isSelected={binding.id === selectedBindingId}
                onSelect={() => onSelect(binding.id)}
                onRemove={() => {
                  // If we're removing the selected binding, drop the
                  // selection so Column B falls back to empty state.
                  if (binding.id === selectedBindingId) {
                    onSelect(null);
                  }
                  removeBinding(binding.id);
                }}
                onToggleBypass={() => toggleBindingBypass(binding.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Condensed binding row ────────────────────────────────────────────
//
// Single-line: source-color stripe (left edge) · source name · →
// · target name · amount % · bypass toggle · remove. Combinator and
// amount slider live in Column B. Click anywhere on the row (except
// the bypass / remove buttons) to select.

interface BindingRowCondensedProps {
  binding: SerializedBinding;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onToggleBypass: () => void;
}

function BindingRowCondensed({
  binding,
  isSelected,
  onSelect,
  onRemove,
  onToggleBypass,
}: BindingRowCondensedProps): JSX.Element {
  const modulatorDesc = BUILT_IN_MODULATORS.find(
    (m) => (m.id as string) === binding.source,
  );
  const isExpression = binding.source === null && binding.expression !== null;
  const color = isExpression
    ? 'rgb(var(--status-magenta))'
    : (modulatorDesc?.colorVar ?? 'rgb(var(--text-muted))');
  const sourceName = isExpression
    ? 'fx'
    : (modulatorDesc?.displayName ?? String(binding.source ?? '—'));

  const paramDesc = getParameter(binding.target);
  const paramLabel = paramDesc?.displayName ?? binding.target;

  const isBypassed = binding.bypassed === true;
  const amountPct = Math.round(binding.amount * 100);

  return (
    <li
      id={`routing-binding-row-${binding.id}`}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        'flex items-center gap-2 px-3 py-2 cursor-pointer outline-none border-l-2 transition-colors',
        'focus-visible:bg-bg-surface/80',
        isSelected
          ? 'bg-accent-dim/30 border-l-accent text-accent'
          : 'border-l-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary',
      ].join(' ')}
      style={
        // Inline color stripe drawn by inset shadow when not selected.
        // When selected, the accent border-l takes over.
        !isSelected
          ? { boxShadow: `inset 3px 0 0 ${color}` }
          : undefined
      }
      data-bypassed={isBypassed ? 'true' : undefined}
    >
      {/* Source name — colored when not selected, accent when selected */}
      <span
        className="font-mono uppercase tracking-wider text-ui-xs truncate w-16 shrink-0"
        style={!isSelected ? { color } : undefined}
        title={
          isExpression
            ? `Expression: ${binding.expression?.source ?? '(opaque AST)'}`
            : `Source: ${sourceName}`
        }
      >
        {sourceName}
      </span>

      {/* Arrow */}
      <span className="text-text-muted/60 text-ui-xs shrink-0" aria-hidden="true">
        →
      </span>

      {/* Target parameter — flex-1 so it gets remaining space */}
      <span
        className="text-ui-xs truncate flex-1 min-w-0"
        title={`Target: ${paramLabel} (${binding.target})`}
      >
        {paramLabel}
      </span>

      {/* Amount % readout */}
      <span
        className={[
          'shrink-0 font-mono tabular-nums text-ui-xs w-9 text-right',
          isBypassed ? 'opacity-50 line-through' : '',
        ].join(' ')}
        title={`Amount: ${amountPct}%`}
      >
        {amountPct}%
      </span>

      {/* Bypass toggle — small inline */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleBypass();
        }}
        className="shrink-0 w-5 h-5 rounded border flex items-center justify-center text-[9px] font-mono transition-colors"
        style={{
          color: isBypassed ? 'rgb(var(--status-warn))' : 'rgb(var(--text-muted))',
          background: isBypassed ? 'rgba(var(--status-warn), 0.15)' : 'transparent',
          borderColor: isBypassed
            ? 'rgb(var(--status-warn))'
            : 'rgb(var(--border-subtle))',
        }}
        title={isBypassed ? 'Unbypass binding' : 'Bypass binding (A/B test)'}
        aria-pressed={isBypassed}
        aria-label="Toggle bypass"
      >
        {isBypassed ? '⏸' : '▶'}
      </button>

      {/* Remove — small inline */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 w-4 h-4 text-text-muted/50 hover:text-red-400 transition-colors text-ui-sm leading-none"
        title="Remove binding"
        aria-label="Remove binding"
      >
        ×
      </button>
    </li>
  );
}
