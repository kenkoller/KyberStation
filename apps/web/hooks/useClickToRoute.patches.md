# useClickToRoute — required store extensions

**Status (2026-04-22 evening):** Landed. Parallel sprint agents patched
both `uiStore` and `bladeStore` with the fields the hook reads before
this hook was written. The shape documented below matches what already
exists on the branch today — this file now serves as a spec reference
+ a changelog entry explaining the patch's provenance, rather than a
pending-work checklist.

Agent P4's hook (`useClickToRoute.ts`) reads the shipped fields
directly. `// TODO(bladeStore-modulation-patch)` markers remain in the
hook as follow-up cleanup hints (see §3) now that no store adapter
shims remain.

**Companion doc:** [`docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md`](../../../docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md) §5
(Thursday UI integration — the file lists `apps/web/stores/bladeStore.ts`
and `apps/web/stores/uiStore.ts` as patch targets).

---

## 1. uiStore additions

File: `apps/web/stores/uiStore.ts`.

### 1.1 State

Add to the `UIStore` interface and the `create<UIStore>((set) => ({…}))`
default block:

```ts
interface UIStore {
  // …existing fields…

  /**
   * Id of the modulator plate the user has armed for click-to-route.
   * When non-null, the next click on a modulatable parameter scrub
   * field creates a ModulationBinding from this modulator to that
   * parameter. Cleared on Escape, on successful binding creation, or
   * when the user clicks the armed plate again.
   *
   * Introduced 2026-04-23 for the Friday v1.0 Routing Preview. True
   * drag-to-route in v1.1 replaces this single-slot state with a
   * richer DnD drag session.
   */
  armedModulatorId: string | null;
}
```

Default value in the `create` initializer: `armedModulatorId: null`.

### 1.2 Action

Add alongside the other setters:

```ts
interface UIStore {
  // …existing setters…
  setArmedModulatorId: (id: string | null) => void;
}
```

Implementation inside `create`:

```ts
setArmedModulatorId: (armedModulatorId) => set({ armedModulatorId }),
```

No persistence required — the armed state is session-only. (Note:
`hoveredModulatorId` already lives on uiStore as a separate v1.1
modulation-highlight seam — the two are distinct.)

---

## 2. bladeStore additions

File: `apps/web/stores/bladeStore.ts`.

### 2.1 Config field

`BladeConfig` from `@kyberstation/engine` already carries a
`[key: string]: any` escape hatch, so no upstream type change is needed.
However, for clarity, declare the modulation payload shape on the
default config so the typechecker sees it:

```ts
import type { ModulationPayload, ModulationBinding } from '@kyberstation/engine';

const DEFAULT_CONFIG: BladeConfig = {
  // …existing fields…
  // Friday v1.0: optional. If the field is undefined at binding
  // creation time, the action initializes it to `{ version: 1,
  // bindings: [] }` before appending.
  // modulation is OMITTED from defaults so new blades don't ship with
  // an empty ModulationPayload — only blades that actually bind
  // anything carry the payload.
};
```

No explicit field addition to `DEFAULT_CONFIG` — the field is born the
first time `addBinding` runs.

### 2.2 Actions

Add to `BladeStore` interface:

```ts
export interface BladeStore {
  // …existing…
  addBinding: (binding: ModulationBinding) => void;
  removeBinding: (id: string) => void;
  updateBinding: (id: string, partial: Partial<ModulationBinding>) => void;
  toggleBindingBypass: (id: string) => void;
}
```

Implementations inside `create`:

```ts
addBinding: (binding) =>
  set((state) => {
    const payload: ModulationPayload = state.config.modulation ?? {
      version: 1,
      bindings: [],
    };
    // Dedupe by id — re-adding an existing id replaces.
    const withoutDup = payload.bindings.filter((b) => b.id !== binding.id);
    const next: ModulationPayload = {
      ...payload,
      version: 1,
      bindings: [...withoutDup, serializeBinding(binding)],
    };
    return { config: { ...state.config, modulation: next } };
  }),

removeBinding: (id) =>
  set((state) => {
    const payload = state.config.modulation;
    if (!payload) return state;
    const next: ModulationPayload = {
      ...payload,
      bindings: payload.bindings.filter((b) => b.id !== id),
    };
    return { config: { ...state.config, modulation: next } };
  }),

updateBinding: (id, partial) =>
  set((state) => {
    const payload = state.config.modulation;
    if (!payload) return state;
    const next: ModulationPayload = {
      ...payload,
      bindings: payload.bindings.map((b) =>
        b.id === id ? { ...b, ...partial } : b,
      ),
    };
    return { config: { ...state.config, modulation: next } };
  }),

toggleBindingBypass: (id) =>
  set((state) => {
    const payload = state.config.modulation;
    if (!payload) return state;
    const next: ModulationPayload = {
      ...payload,
      bindings: payload.bindings.map((b) =>
        b.id === id ? { ...b, bypassed: !b.bypassed } : b,
      ),
    };
    return { config: { ...state.config, modulation: next } };
  }),
```

### 2.3 Serialization helper

The store stores `SerializedBinding` (the wire-format shape), not the
runtime `ModulationBinding` (which may carry a live `ExpressionNode`).
For Friday v1.0 the two shapes overlap — `expression: null` in every
binding — but the helper is cheap insurance against v1.1 drift:

```ts
function serializeBinding(b: ModulationBinding): SerializedBinding {
  return {
    id: b.id,
    source: b.source,
    expression: b.expression
      ? { source: '', ast: b.expression } // v1.1 fills `source` from parser text
      : null,
    target: b.target,
    combinator: b.combinator,
    amount: b.amount,
    ...(b.label !== undefined ? { label: b.label } : {}),
    ...(b.colorVar !== undefined ? { colorVar: b.colorVar } : {}),
    ...(b.bypassed !== undefined ? { bypassed: b.bypassed } : {}),
  };
}
```

Import `SerializedBinding` from `@kyberstation/engine`.

---

## 3. Post-patch hook cleanup

§1 and §2 already landed on `feat/modulation-routing`, so the hook
reads the shipped store fields directly. Two cosmetic cleanups remain
for a future sweep, flagged via `// TODO(bladeStore-modulation-patch)`:

- Remove the two cleanup-comment blocks above the `useUIStore` +
  `useBladeStore` selector calls. Once the Inspector ROUTING tab +
  FlashPanel mapping report converge on the same selector pattern the
  cross-surface consistency check is over and the comments are noise.
- Decide whether `options.generateBindingId` + `options.boardId` stay
  as injection points. Tests depend on them today; once a `useBoardProfile`
  hook lands (impl plan §5, "Thursday — UI integration" new files),
  production call sites can drop `options` entirely and read the
  current board from uiStore.

A single `grep -n "TODO(bladeStore-modulation-patch)" apps/web/hooks/useClickToRoute.ts`
surfaces every site. Expect 3 matches — the header reference + 2
cleanup-comment blocks in the hook body.

---

## 4. Test updates

When the patches land:

- `apps/web/tests/useClickToRoute.test.ts` stops needing the
  `generateBindingId` override and the option-injected `boardId`. Keep
  the tests green by letting the hook read the wired store + board
  picker state.
- Add a bladeStore test at `apps/web/tests/bladeStore.test.ts` asserting
  `addBinding` / `removeBinding` / `updateBinding` / `toggleBindingBypass`
  round-trip through the `ModulationPayload`.
