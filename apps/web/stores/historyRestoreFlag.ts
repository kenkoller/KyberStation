/**
 * historyRestoreFlag — module-level guard that lets useHistoryTracking
 * distinguish "user edited the config" from "undo/redo restored a
 * snapshot so we SHOULDN'T push it back onto the history stack."
 *
 * Why a module-level flag (not Zustand state)?
 *   The flag is a transient, synchronous marker around a single
 *   `bladeStore.setConfig(snapshot)` call. Putting it in Zustand
 *   state would itself trigger a store subscription and force us
 *   to filter updates by shape, which is fiddly and slower. A plain
 *   closure-scoped boolean is simpler and lives only in the editor's
 *   single-page session, so cross-tab / SSR concerns don't apply.
 *
 * Callers:
 *   - UndoRedoButtons.handleUndo / handleRedo wrap their setConfig
 *     call in begin/end.
 *   - useHistoryTracking's subscription short-circuits when the flag
 *     is set, so the restored snapshot is not queued for re-push.
 *
 * Guard discipline: always pair begin/end in try/finally so a thrown
 * setConfig cannot leave the flag stuck on.
 */

let restoring = false;

export function beginHistoryRestore(): void {
  restoring = true;
}

export function endHistoryRestore(): void {
  restoring = false;
}

export function isRestoringFromHistory(): boolean {
  return restoring;
}
