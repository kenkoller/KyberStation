'use client';

// ─── useClickToRoute — Friday v1.0 "click a plate, click a param" binder ──
//
// The Friday v1.0 "Routing Preview" ships a single routing UX gesture:
//
//   1. User clicks a modulator plate in the LayerStack → the plate arms.
//   2. The next click on any modulatable numeric scrub field creates a
//      SerializedBinding wiring that plate's modulator to that parameter.
//   3. Escape (or clicking the armed plate again) disarms without
//      creating a binding.
//
// v1.1 Wave 5 — drag-to-route. HTML5 drag-and-drop layered on top of
// click-to-route as the primary mouse/trackpad interaction (Vital /
// Bitwig pattern). Plates become draggable; slider rows become drop
// targets. The drop handler calls `dragBind(modulatorId, targetPath)`
// (added below) which atomically creates a binding without touching
// the armed-plate state. Click-to-route remains the keyboard / a11y
// path — the two flows are independent. See impl plan §10.
//
// ── Store wiring ────────────────────────────────────────────────────────
//
// The hook reads two store fields:
//
//   • `uiStore.armedModulatorId: string | null` + `setArmedModulatorId`
//   • `bladeStore.addBinding(binding: SerializedBinding)` — appends onto
//     `config.modulation.bindings`.
//
// Agent P4 (this file) does NOT edit those stores. Parallel sprint
// agents landed the fields on `feat/modulation-routing` before this
// hook was written; the patch spec is archived in
// `./useClickToRoute.patches.md`. The transitional `// TODO
// (bladeStore-modulation-patch)` markers were removed in 2026-04-29
// after the audit confirmed no store-adapter shims remain.

import { useCallback, useEffect, useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import {
  getParameter,
  isParameterModulatable,
} from '@/lib/parameterGroups';
import {
  isParameterModulatableOnBoard,
  DEFAULT_BOARD_ID,
} from '@/lib/boardProfiles';
import type { SerializedBinding } from '@kyberstation/engine';

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * The MIME type used for HTML5 drag-and-drop payloads when a modulator
 * plate is dragged onto a parameter row. v1.1 Wave 5 — drag-to-route.
 *
 * Specific enough that random external drags (text, files, images from
 * other apps) don't accidentally register as modulator drops. Drop
 * targets check `dataTransfer.types.includes(MODULATOR_DRAG_MIME_TYPE)`
 * before calling `preventDefault` on dragover.
 */
export const MODULATOR_DRAG_MIME_TYPE = 'application/x-kyberstation-modulator';

export type BindingCreateResult =
  | { kind: 'created'; bindingId: string }
  | { kind: 'ignored'; reason: 'not-armed' | 'not-modulatable' | 'board-rejects' };

export interface UseClickToRouteReturn {
  /**
   * The id of the modulator plate that is currently armed, or null if
   * the hook is idle. Consumers read this to render the "armed" ring
   * around the corresponding plate.
   */
  armedModulatorId: string | null;
  /** Convenience flag — `armedModulatorId !== null`. */
  isArmed: boolean;
  /**
   * Arm a plate. Stores the given `modulatorId` on `uiStore`. If another
   * plate was already armed, this replaces it — UX is "only one plate
   * armed at a time".
   */
  arm: (modulatorId: string) => void;
  /** Clear the armed plate. Safe to call when nothing is armed. */
  disarm: () => void;
  /**
   * Attempt to create a binding at `targetPath`. Only does so when a
   * plate is armed, the parameter is modulatable, and the currently
   * selected board permits modulation on that path. Always disarms
   * after a successful call.
   */
  onParameterClick: (targetPath: string) => BindingCreateResult;
  /**
   * One-shot binding creation for drag-and-drop drops. Bypasses the
   * arm/click sequence — given the modulator id from the drag payload
   * and the target path under the cursor, atomically arms the source
   * and creates the binding. Used by drop handlers in ParameterBank.
   *
   * Returns the same `BindingCreateResult` shape as `onParameterClick`,
   * with the same gating semantics (modulatable + board-permits checks
   * still apply).
   */
  dragBind: (modulatorId: string, targetPath: string) => BindingCreateResult;
}

// ─── Optional hook options ──────────────────────────────────────────────
//
// Exposed primarily for tests so the hook can dependency-inject a
// synthetic board id + binding-id generator without pulling in the app's
// real stores. Production call sites pass no options and get the
// defaults.

export interface UseClickToRouteOptions {
  /**
   * Override the board id the hook consults for capability gating.
   * Defaults to the v1.0 target board (Proffieboard V3.9). v1.1 wires
   * this to the real "current board" selector from uiStore + BCS.
   */
  boardId?: string;
  /**
   * Generate a stable id for newly created bindings. Defaults to
   * `crypto.randomUUID` when available, falling back to a time-seeded
   * pseudo-random id so the hook works in node-only vitest suites.
   */
  generateBindingId?: () => string;
}

const DEFAULT_BINDING_AMOUNT = 0.6;

function defaultBindingIdGenerator(): string {
  // Prefer Web Crypto when it's around — browsers, newer Node.
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  // Node-only fallback for test runs. The id only needs to be unique
  // within a single session — crypto-quality randomness isn't required.
  const rand = Math.random().toString(36).slice(2, 10);
  return `binding-${Date.now().toString(36)}-${rand}`;
}

// ─── Pure helpers (exported for tests) ──────────────────────────────────

/**
 * Decide whether a click on `targetPath` should create a binding, given
 * the hook's current context. Returning `'created'` tells the caller it
 * is safe to build a SerializedBinding; any other variant explains why
 * the click is a no-op.
 *
 * Exported separately from the hook so the decision logic is trivially
 * testable in the node-only vitest environment without mounting React.
 */
export function decideBindingOutcome(input: {
  armedModulatorId: string | null;
  targetPath: string;
  boardId: string;
}): BindingCreateResult | { kind: 'allowed' } {
  const { armedModulatorId, targetPath, boardId } = input;

  if (armedModulatorId === null) {
    return { kind: 'ignored', reason: 'not-armed' };
  }
  if (!isParameterModulatable(targetPath)) {
    return { kind: 'ignored', reason: 'not-modulatable' };
  }
  if (!isParameterModulatableOnBoard(boardId, targetPath)) {
    return { kind: 'ignored', reason: 'board-rejects' };
  }
  return { kind: 'allowed' };
}

/**
 * Build the `SerializedBinding` the hook writes to `bladeStore`. Pulled
 * out of the hook so tests can assert the shape without hitting the
 * store. Amount / combinator / bypassed mirror the Friday v1.0 defaults
 * per impl plan §3.1.
 */
export function buildBinding(input: {
  id: string;
  source: string;
  target: string;
}): SerializedBinding {
  const { id, source, target } = input;
  const p = getParameter(target);
  return {
    id,
    source,
    expression: null,
    target,
    combinator: 'add',
    amount: DEFAULT_BINDING_AMOUNT,
    bypassed: false,
    ...(p !== undefined ? { label: `${source} → ${p.displayName}` } : {}),
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useClickToRoute(
  options: UseClickToRouteOptions = {},
): UseClickToRouteReturn {
  const boardId = options.boardId ?? DEFAULT_BOARD_ID;
  const generateBindingId = options.generateBindingId ?? defaultBindingIdGenerator;

  // ── uiStore — armed plate state ──────────────────────────────────────
  //
  // `armedModulatorId` + `setArmedModulatorId` ship on uiStore (see
  // `./useClickToRoute.patches.md` §1).
  const armedModulatorId = useUIStore((s) => s.armedModulatorId);
  const setArmedModulatorId = useUIStore((s) => s.setArmedModulatorId);

  // ── bladeStore — addBinding action ───────────────────────────────────
  //
  // `addBinding` ships on bladeStore.
  const addBinding = useBladeStore((s) => s.addBinding);

  // ── Actions ──────────────────────────────────────────────────────────

  const arm = useCallback(
    (modulatorId: string) => {
      setArmedModulatorId(modulatorId);
    },
    [setArmedModulatorId],
  );

  const disarm = useCallback(() => {
    setArmedModulatorId(null);
  }, [setArmedModulatorId]);

  const onParameterClick = useCallback(
    (targetPath: string): BindingCreateResult => {
      const outcome = decideBindingOutcome({
        armedModulatorId,
        targetPath,
        boardId,
      });
      if (outcome.kind !== 'allowed') {
        return outcome;
      }

      // armedModulatorId is guaranteed non-null when outcome is 'allowed'.
      const source = armedModulatorId as string;
      const id = generateBindingId();
      const binding = buildBinding({ id, source, target: targetPath });

      addBinding(binding);
      setArmedModulatorId(null);

      return { kind: 'created', bindingId: id };
    },
    [
      addBinding,
      armedModulatorId,
      boardId,
      generateBindingId,
      setArmedModulatorId,
    ],
  );

  // ── Drag-to-route: one-shot bind from a drop event ───────────────────
  //
  // Wave 5 (v1.1 Core). Used by ParameterBank's slider-row onDrop
  // handler. Skips the "arm then click" two-step entirely: the drop
  // event already carries the source modulator id in dataTransfer, so
  // we go straight from `(modulatorId, targetPath)` to a binding,
  // gated by the same modulatable + board-permits checks as the click
  // path. We deliberately don't touch the armed-plate state during the
  // drag so click-to-route remains uninterrupted; if the user happens
  // to have a plate armed when they drop, the drop still wins because
  // we ignore the armed state and bind to the dragged source.
  const dragBind = useCallback(
    (modulatorId: string, targetPath: string): BindingCreateResult => {
      const outcome = decideBindingOutcome({
        armedModulatorId: modulatorId,
        targetPath,
        boardId,
      });
      if (outcome.kind !== 'allowed') {
        return outcome;
      }

      const id = generateBindingId();
      const binding = buildBinding({ id, source: modulatorId, target: targetPath });

      addBinding(binding);
      // If a plate happened to be armed when the drop completed, clear
      // it — the user's expressed intent (the drop) takes precedence
      // and we don't want a stale armed state to keep the next click
      // from doing what they expect.
      if (armedModulatorId !== null) {
        setArmedModulatorId(null);
      }

      return { kind: 'created', bindingId: id };
    },
    [
      addBinding,
      armedModulatorId,
      boardId,
      generateBindingId,
      setArmedModulatorId,
    ],
  );

  // ── Global Escape-key listener ───────────────────────────────────────
  //
  // Disarm on Escape. Only attach the listener while something is armed
  // so we don't contend with other global Esc handlers (modals, command
  // palette) when idle.
  useEffect(() => {
    if (armedModulatorId === null) return;
    if (typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setArmedModulatorId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [armedModulatorId, setArmedModulatorId]);

  // ── Return shape ─────────────────────────────────────────────────────

  return useMemo<UseClickToRouteReturn>(
    () => ({
      armedModulatorId,
      isArmed: armedModulatorId !== null,
      arm,
      disarm,
      onParameterClick,
      dragBind,
    }),
    [armedModulatorId, arm, disarm, onParameterClick, dragBind],
  );
}
