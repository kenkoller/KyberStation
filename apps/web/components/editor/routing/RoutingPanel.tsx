'use client';

// ─── RoutingPanel — v0.14.0 left-rail overhaul ───────────────────────
//
// Single panel that fuses the modulation-routing UX. Top-to-bottom:
//
//   1. MODULATORS section — `<ModulatorPlateBar />` rendered verbatim
//      (5 plates with live viz + click-to-route arming).
//   2. Divider with live binding count: "─── ACTIVE BINDINGS (N) ───"
//   3. BINDINGS section — `<BindingList />` rendered verbatim. That
//      component already nests RecipePicker + AddBindingForm + the
//      empty-state hint (which references the modulator plates), so we
//      keep it as-is rather than duplicating those entry points here.
//
// Board gating happens at the SIDEBAR level (Lane A) — RoutingPanel
// always renders assuming it is mounted. The internal components still
// self-guard for safety, but this panel does NOT re-check
// `canBoardModulate`.
//
// Lower-risk than rewriting either child — RoutingPanel is pure
// composition + a divider header.

import { ModulatorPlateBar } from './ModulatorPlateBar';
import { BindingList } from './BindingList';
import { useBladeStore } from '@/stores/bladeStore';

export function RoutingPanel() {
  // Subscribe to just the binding count so divider re-renders when the
  // user adds/removes bindings without thrashing on unrelated config
  // edits. Numeric primitive selectors are reference-stable in zustand.
  const bindingCount = useBladeStore(
    (s) => s.config.modulation?.bindings.length ?? 0,
  );

  return (
    <div className="flex flex-col gap-3" data-testid="routing-panel">
      {/* MODULATORS — section header + plate bar */}
      <section
        data-testid="routing-panel-modulators"
        aria-label="Modulators"
        className="flex flex-col gap-2"
      >
        <h4 className="font-mono uppercase text-ui-xs tracking-[0.12em] text-text-muted px-1">
          Modulators
        </h4>
        <ModulatorPlateBar />
      </section>

      {/* Divider with live binding count */}
      <div
        className="flex items-center gap-2 px-1 select-none"
        data-testid="routing-panel-divider"
        aria-hidden="true"
      >
        <span
          aria-hidden="true"
          className="flex-1 border-t border-border-subtle/60"
        />
        <span className="font-mono uppercase text-ui-xs tracking-[0.12em] text-text-muted">
          Active Bindings
          <span
            className="ml-1.5 tabular-nums"
            data-testid="routing-panel-binding-count"
          >
            ({bindingCount})
          </span>
        </span>
        <span
          aria-hidden="true"
          className="flex-1 border-t border-border-subtle/60"
        />
      </div>

      {/* BINDINGS — list + RecipePicker + AddBindingForm + empty state */}
      <section
        data-testid="routing-panel-bindings"
        aria-label="Active modulation bindings"
        className="flex flex-col gap-2"
      >
        <BindingList />
      </section>
    </div>
  );
}
