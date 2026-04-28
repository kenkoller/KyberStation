// ─── Ignition / Retraction tab state — Phase 3 ─────────────────────────
//
// Tab state for the A/B `ignition-retraction` section. Owned by the
// parent `IgnitionRetractionAB` wrapper and threaded into both Column
// A (which renders the tab buttons + filtered list) and Column B
// (which reads it to decide whether to expose ignitionMs vs
// retractionMs sliders + which custom-curve config keys to edit).
//
// Deliberately NOT in uiStore — it's a transient view filter that
// resets when the user navigates away from the section. Persisting it
// would surprise users who expect "Ignite & Retract" to land them on
// the Ignition tab on every fresh load.

export type IgnitionRetractionTab = 'ignition' | 'retraction';

export const DEFAULT_IGNITION_RETRACTION_TAB: IgnitionRetractionTab = 'ignition';
