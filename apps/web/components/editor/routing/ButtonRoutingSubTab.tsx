'use client';

// ─── ButtonRoutingSubTab — Wave 8 A3 ──────────────────────────────────
//
// "Routing" sub-tab of the Gesture Control panel. Surfaces every
// prop-file event (button click/hold/double-click + gesture
// swing/stab/twist/etc.) as a row that accepts a drag-drop from
// `ModulatorPlateBar` and creates a binding with the matching
// `triggerEvent` attached.
//
// Pre-Wave-8 the only way to react to a button event was to author a
// prop-file `#define` (handled by `Fett263PropEditor` on the DEFINES
// sub-tab). The Routing sub-tab is the new structured path: a user
// drags an aux/gesture modulator plate onto an event row, the binding
// is created with `triggerEvent` set, and the firmware fires the
// binding's target parameter only when the prop file emits that
// specific event.
//
// Engine type contract: `SerializedBinding.triggerEvent?: string`,
// validated by `isValidTriggerEventBinding` in the engine. Source must
// be one of the 8 aux/gesture event modulators when `triggerEvent` is
// set; the UI here only exposes those 8 plates as valid drop sources.
//
// Source of truth for the event vocabulary is
// `apps/web/lib/propFileProfiles.ts`. The Routing sub-tab is hidden by
// `GestureControlPanel` when the active prop file's profile has no
// button or gesture events.

import { useMemo, useState } from 'react';
import { type SerializedBinding } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import {
  type PropFileProfile,
  type ButtonEvent,
  type GestureEvent,
} from '@/lib/propFileProfiles';
import { MODULATOR_DRAG_MIME_TYPE } from '@/hooks/useClickToRoute';

// ─── Event metadata ───────────────────────────────────────────────────
//
// Human-readable labels + one-line descriptions for every prop-file
// event the UI surfaces. Kept here rather than in propFileProfiles so
// that registry stays vocabulary-only (no UI copy mixed in).

interface PropFileEventMeta {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: 'button' | 'gesture';
  /**
   * Default modulator id to pair with this event when the user drops a
   * plate that doesn't match any category-specific id. Used as the
   * source for the binding's continuous decay envelope. The 8
   * aux/gesture modulator IDs here mirror the registry in
   * `packages/engine/src/modulation/registry.ts`.
   */
  readonly defaultSourceId: string;
}

const BUTTON_EVENT_META: Record<ButtonEvent, PropFileEventMeta> = {
  'click': {
    id: 'click',
    label: 'Click',
    description: 'Single aux button press.',
    category: 'button',
    defaultSourceId: 'aux-click',
  },
  'long-press': {
    id: 'long-press',
    label: 'Long Press',
    description: 'Aux button held briefly past click threshold.',
    category: 'button',
    defaultSourceId: 'aux-hold',
  },
  'hold': {
    id: 'hold',
    label: 'Hold',
    description: 'Sustained aux button hold.',
    category: 'button',
    defaultSourceId: 'aux-hold',
  },
  'double-click': {
    id: 'double-click',
    label: 'Double-Click',
    description: 'Two aux clicks in rapid succession.',
    category: 'button',
    defaultSourceId: 'aux-double-click',
  },
  'triple-click': {
    id: 'triple-click',
    label: 'Triple-Click',
    description: 'Three aux clicks in rapid succession.',
    category: 'button',
    defaultSourceId: 'aux-double-click',
  },
  'click-and-hold': {
    id: 'click-and-hold',
    label: 'Click + Hold',
    description: 'Click followed by an immediate hold.',
    category: 'button',
    defaultSourceId: 'aux-hold',
  },
  'held-plus-other-click': {
    id: 'held-plus-other-click',
    label: 'Held + Other Click',
    description: 'Aux held while a second button is clicked.',
    category: 'button',
    defaultSourceId: 'aux-hold',
  },
};

const GESTURE_EVENT_META: Record<GestureEvent, PropFileEventMeta> = {
  'swing': {
    id: 'swing',
    label: 'Swing',
    description: 'IMU-detected swing event.',
    category: 'gesture',
    defaultSourceId: 'gesture-swing',
  },
  'stab': {
    id: 'stab',
    label: 'Stab',
    description: 'IMU-detected forward thrust.',
    category: 'gesture',
    defaultSourceId: 'gesture-stab',
  },
  'thrust': {
    id: 'thrust',
    label: 'Thrust',
    description: 'IMU-detected sustained forward thrust.',
    category: 'gesture',
    defaultSourceId: 'gesture-stab',
  },
  'twist': {
    id: 'twist',
    label: 'Twist',
    description: 'IMU-detected rotation about the long axis.',
    category: 'gesture',
    defaultSourceId: 'gesture-twist',
  },
  'shake': {
    id: 'shake',
    label: 'Shake',
    description: 'Sustained IMU shake gesture.',
    category: 'gesture',
    defaultSourceId: 'gesture-shake',
  },
};

// ─── Valid source modulators for triggerEvent bindings ────────────────
//
// The engine validates that when `triggerEvent` is set, the binding's
// source must be one of the 8 aux/gesture event modulators. The drop
// handler enforces this UI-side too — drops carrying a non-event source
// id silently fall back to the event's `defaultSourceId`.
const VALID_EVENT_SOURCE_IDS: readonly string[] = [
  'aux-click',
  'aux-hold',
  'aux-double-click',
  'gesture-twist',
  'gesture-stab',
  'gesture-swing',
  'gesture-clash',
  'gesture-shake',
];

// Stable empty array reference — passing `[]` as a Zustand selector
// fallback creates a new reference every render and triggers an
// infinite-rerender loop. Mirrors the BindingList pattern.
const EMPTY_BINDINGS: readonly SerializedBinding[] = [];

const DEFAULT_TARGET = 'shimmer';
const DEFAULT_AMOUNT = 0.5;

function newBindingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `b-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

interface ButtonRoutingSubTabProps {
  /** The currently-active prop-file profile. */
  profile: PropFileProfile;
}

export function ButtonRoutingSubTab({ profile }: ButtonRoutingSubTabProps) {
  const bindings = useBladeStore(
    (s) => s.config.modulation?.bindings ?? EMPTY_BINDINGS,
  );
  const addBinding = useBladeStore((s) => s.addBinding);
  const removeBinding = useBladeStore((s) => s.removeBinding);

  // Build the ordered event roster from the profile. Buttons first,
  // gestures second — mirrors ModulatorPlateBar's BUTTON-then-GESTURE
  // ordering so users see a parallel mental model in both surfaces.
  const eventRows = useMemo<readonly PropFileEventMeta[]>(() => {
    const rows: PropFileEventMeta[] = [];
    for (const ev of profile.buttonEvents) {
      rows.push(BUTTON_EVENT_META[ev]);
    }
    for (const ev of profile.gestureEvents) {
      rows.push(GESTURE_EVENT_META[ev]);
    }
    return rows;
  }, [profile.buttonEvents, profile.gestureEvents]);

  // Bindings keyed by triggerEvent — used to render routed-event chips.
  // A given event may have multiple bindings (e.g. one for shimmer, one
  // for blast color); we surface them all.
  const bindingsByEvent = useMemo(() => {
    const map = new Map<string, SerializedBinding[]>();
    for (const b of bindings) {
      if (b.triggerEvent === undefined) continue;
      const list = map.get(b.triggerEvent) ?? [];
      list.push(b);
      map.set(b.triggerEvent, list);
    }
    return map;
  }, [bindings]);

  const totalRoutedEvents = bindingsByEvent.size;

  const onDropForEvent = (event: PropFileEventMeta) => (e: React.DragEvent) => {
    e.preventDefault();
    const draggedSourceId = e.dataTransfer.getData(MODULATOR_DRAG_MIME_TYPE);
    if (!draggedSourceId) return;

    // Engine validation enforces source ∈ {aux-*, gesture-*} when
    // triggerEvent is set. If a user drops a non-event plate (swing,
    // clash, time, etc.), fall back to the event's category default.
    const source = VALID_EVENT_SOURCE_IDS.includes(draggedSourceId)
      ? draggedSourceId
      : event.defaultSourceId;

    const binding: SerializedBinding = {
      id: newBindingId(),
      source,
      expression: null,
      target: DEFAULT_TARGET,
      combinator: 'replace',
      amount: DEFAULT_AMOUNT,
      triggerEvent: event.id,
      bypassed: false,
      label: `${source} on ${event.label} → ${DEFAULT_TARGET}`,
    };
    addBinding(binding);
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(MODULATOR_DRAG_MIME_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
  };

  return (
    <div className="space-y-2" data-testid="button-routing-sub-tab">
      <header className="flex items-baseline justify-between gap-2 px-0.5">
        <div className="space-y-0.5">
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold">
            Button & Gesture Routing
          </h3>
          <p className="text-ui-xs text-text-muted leading-snug">
            Drag a Button or Gesture plate from the routing toolbar onto an
            event below. The binding fires only when {profile.displayName}{' '}
            emits that exact prop-file event.
          </p>
        </div>
        <span
          className="text-ui-xs font-mono uppercase tracking-wider text-text-muted shrink-0"
          aria-live="polite"
        >
          {totalRoutedEvents} routed
        </span>
      </header>

      {totalRoutedEvents === 0 && (
        <div
          role="status"
          className="text-ui-xs text-text-muted/80 italic px-2 py-1.5 border border-dashed border-border-subtle/60 rounded bg-bg-surface/30"
          data-testid="button-routing-empty-state"
        >
          No routing yet — drop a Button or Gesture plate onto an event row
          to wire it.
        </div>
      )}

      <ul role="list" className="space-y-1">
        {eventRows.map((event) => {
          const routed = bindingsByEvent.get(event.id) ?? [];
          return (
            <EventRow
              key={`${event.category}-${event.id}`}
              event={event}
              routed={routed}
              onDrop={onDropForEvent(event)}
              onDragOver={onDragOver}
              onRemoveBinding={(bindingId) => removeBinding(bindingId)}
            />
          );
        })}
      </ul>
    </div>
  );
}

// ── Individual event row ────────────────────────────────────────────

interface EventRowProps {
  event: PropFileEventMeta;
  routed: readonly SerializedBinding[];
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onRemoveBinding: (bindingId: string) => void;
}

function EventRow({
  event,
  routed,
  onDrop,
  onDragOver,
  onRemoveBinding,
}: EventRowProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const hasRouting = routed.length > 0;

  return (
    <li
      data-testid={`event-row-${event.id}`}
      data-event-category={event.category}
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes(MODULATOR_DRAG_MIME_TYPE)) return;
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDragOver={onDragOver}
      onDrop={(e) => {
        setIsDragOver(false);
        onDrop(e);
      }}
      className={[
        'grid gap-2 items-center px-2 py-1.5 rounded border transition-colors',
        hasRouting ? 'bg-bg-surface' : 'bg-bg-surface/40',
        isDragOver
          ? 'border-accent bg-accent-dim/40'
          : 'border-border-subtle',
      ].join(' ')}
      style={{
        gridTemplateColumns: 'minmax(120px, 180px) 1fr auto',
      }}
    >
      {/* Event label + description */}
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] font-mono uppercase tracking-wider px-1 py-0 rounded bg-bg-deep border border-border-subtle text-text-muted shrink-0"
            aria-hidden="true"
          >
            {event.category === 'button' ? 'BTN' : 'GES'}
          </span>
          <span className="text-ui-sm font-semibold text-text-primary truncate">
            {event.label}
          </span>
        </div>
        <p className="text-[10px] text-text-muted leading-snug truncate">
          {event.description}
        </p>
      </div>

      {/* Drop zone / routed chips */}
      <div className="min-w-0 flex flex-wrap items-center gap-1">
        {hasRouting ? (
          routed.map((b) => (
            <span
              key={b.id}
              data-testid={`event-binding-chip-${b.id}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border-subtle bg-bg-deep text-ui-xs font-mono"
              title={`${b.source ?? 'fx'} → ${b.target} (${Math.round((b.amount ?? 0) * 100)}%)`}
            >
              <span className="text-text-secondary">{b.source ?? 'fx'}</span>
              <span className="text-text-muted/60" aria-hidden="true">→</span>
              <span className="text-accent">{b.target}</span>
              <button
                type="button"
                onClick={() => onRemoveBinding(b.id)}
                className="ml-0.5 text-text-muted hover:text-red-400 transition-colors"
                aria-label={`Remove ${b.source ?? 'binding'} → ${b.target} on ${event.label}`}
                title="Remove this routing"
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span
            className={[
              'flex-1 text-center text-ui-xs italic px-2 py-1 rounded border border-dashed transition-colors',
              isDragOver
                ? 'border-accent text-accent'
                : 'border-border-subtle/70 text-text-muted/60',
            ].join(' ')}
            data-testid={`event-drop-zone-${event.id}`}
          >
            {isDragOver ? 'Drop to wire' : 'Drag a plate here'}
          </span>
        )}
      </div>

      {/* Routed-count chip on the right */}
      <span
        className="text-[10px] font-mono uppercase tracking-wider text-text-muted/70 shrink-0 w-10 text-right tabular-nums"
        aria-hidden={!hasRouting}
      >
        {hasRouting ? `${routed.length}×` : ''}
      </span>
    </li>
  );
}

// ─── Re-export for tests + parent ────────────────────────────────────

export { BUTTON_EVENT_META, GESTURE_EVENT_META, VALID_EVENT_SOURCE_IDS };
