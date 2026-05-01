// ─── parameterSheetStore — Phase 4.4.x (2026-05-01) ─────────────────────
//
// Pure store contract for the global parameter sheet single-active state.
//
// Coverage:
//   1. Initial state: closed, no spec.
//   2. open(spec) flips isOpen + writes spec.
//   3. close() resets isOpen + clears spec.
//   4. open(specA) then open(specB) swaps the active spec.
//   5. Closing while already closed is a no-op (idempotent).
//   6. spec.read / spec.write callbacks are preserved through the
//      store (not deep-cloned).

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useParameterSheetStore,
  type ParameterSheetSpec,
} from '../stores/parameterSheetStore';

function makeSpec(overrides: Partial<ParameterSheetSpec> = {}): ParameterSheetSpec {
  return {
    id: 'test-param',
    title: 'Edit Test',
    min: 0,
    max: 100,
    step: 1,
    color: 'accent',
    defaultValue: 50,
    formatDisplay: (v) => v.toFixed(0),
    read: () => 0,
    write: () => {},
    ...overrides,
  };
}

describe('parameterSheetStore', () => {
  beforeEach(() => {
    useParameterSheetStore.setState({ isOpen: false, spec: null });
  });

  it('starts closed with no spec', () => {
    const s = useParameterSheetStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.spec).toBeNull();
  });

  it('open(spec) flips isOpen + writes spec', () => {
    const spec = makeSpec({ id: 'hue', title: 'Edit Hue' });
    useParameterSheetStore.getState().open(spec);
    const s = useParameterSheetStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.spec?.id).toBe('hue');
    expect(s.spec?.title).toBe('Edit Hue');
  });

  it('close() resets isOpen + clears spec', () => {
    useParameterSheetStore.getState().open(makeSpec());
    expect(useParameterSheetStore.getState().isOpen).toBe(true);
    useParameterSheetStore.getState().close();
    const s = useParameterSheetStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.spec).toBeNull();
  });

  it('open(specA) then open(specB) swaps the active spec', () => {
    const specA = makeSpec({ id: 'hue', title: 'Edit Hue' });
    const specB = makeSpec({ id: 'sat', title: 'Edit Saturation' });
    useParameterSheetStore.getState().open(specA);
    expect(useParameterSheetStore.getState().spec?.id).toBe('hue');
    useParameterSheetStore.getState().open(specB);
    const s = useParameterSheetStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.spec?.id).toBe('sat');
    expect(s.spec?.title).toBe('Edit Saturation');
  });

  it('close() while already closed is a no-op', () => {
    const before = useParameterSheetStore.getState();
    useParameterSheetStore.getState().close();
    const after = useParameterSheetStore.getState();
    expect(after.isOpen).toBe(before.isOpen);
    expect(after.spec).toBe(before.spec);
  });

  it('spec.read + spec.write callbacks survive through the store', () => {
    let writeReceived: number | null = null;
    const spec = makeSpec({
      id: 'shimmer',
      read: () => 42,
      write: (v) => {
        writeReceived = v;
      },
    });
    useParameterSheetStore.getState().open(spec);
    const stored = useParameterSheetStore.getState().spec;
    expect(stored).toBeTruthy();
    expect(stored!.read()).toBe(42);
    stored!.write(7);
    expect(writeReceived).toBe(7);
  });
});
