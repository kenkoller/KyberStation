'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BOARD_PROFILES,
  DEFAULT_BOARD_ID,
  getBoardProfile,
  type BoardProfile,
} from '@/lib/boardProfiles';

// ─── Board Profile Hook — Board Capability System ──────────────────────
//
// Reactive access to the user's currently-selected board. Every feature
// that gates on board capability (ROUTING tab visibility, click-to-route
// drop targets, FlashPanel compatibility filter, StatusBar BOARD badge)
// subscribes through this hook so they react to changes in lockstep.
//
// Persistence: localStorage under `STORAGE_KEY`. Falls back to
// `DEFAULT_BOARD_ID` (Proffieboard V3.9 — the hardware-validated
// baseline) when the key is absent, unset, or references an unknown id.
//
// Cross-tab sync: every `setBoardId` dispatches a synthetic
// `board-profile-changed` CustomEvent on the window so other hook
// instances and listeners can react without a full page reload. We also
// listen to the native `storage` event so a second tab flipping the key
// flows through the same path.
//
// SSR: every browser-only touch guards `typeof window`. The initial
// useState seed is always `DEFAULT_BOARD_ID`; the useEffect then hydrates
// from localStorage on mount so server and first client render match.

/** localStorage key for the persisted selection. */
export const STORAGE_KEY = 'kyberstation.board.selected';

/** Synthetic event name dispatched on window when the selection changes. */
export const BOARD_CHANGE_EVENT = 'board-profile-changed';

interface BoardChangeEventDetail {
  boardId: string;
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Read the persisted board id. Returns `DEFAULT_BOARD_ID` if:
 *   - we're on the server (no window), or
 *   - the key is absent / unset, or
 *   - the stored id doesn't match any known board profile.
 * Exposed for tests.
 */
export function readStoredBoardId(): string {
  if (typeof window === 'undefined') return DEFAULT_BOARD_ID;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BOARD_ID;
    return getBoardProfile(raw) ? raw : DEFAULT_BOARD_ID;
  } catch {
    // localStorage access can throw in sandboxed / private-mode contexts.
    return DEFAULT_BOARD_ID;
  }
}

/**
 * Persist the id and dispatch the change event. No-op on the server and
 * when the id doesn't resolve to a known profile. Exposed for tests.
 */
export function writeStoredBoardId(id: string): void {
  if (typeof window === 'undefined') return;
  if (!getBoardProfile(id)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Swallow — we still want the event to fire so in-memory listeners
    // observe the change even without durable persistence.
  }
  const event = new CustomEvent<BoardChangeEventDetail>(BOARD_CHANGE_EVENT, {
    detail: { boardId: id },
  });
  window.dispatchEvent(event);
}

// ─── Hook ────────────────────────────────────────────────────────────

export interface UseBoardProfileResult {
  /** The currently-active board id. Always a valid id from `BOARD_PROFILES`. */
  boardId: string;
  /** The full profile for `boardId`. Never undefined; falls back to default. */
  profile: BoardProfile;
  /** Switch to another board. Invalid ids are silently ignored. */
  setBoardId: (id: string) => void;
}

/**
 * React hook returning the current board id + full profile. Reactive to:
 *   • Direct calls to the returned `setBoardId`.
 *   • `board-profile-changed` CustomEvents from other hook instances
 *     or direct `writeStoredBoardId` callers.
 *   • `storage` events from other browser tabs.
 */
export function useBoardProfile(): UseBoardProfileResult {
  // Always seed with DEFAULT_BOARD_ID so SSR-rendered HTML matches the
  // server's output. The useEffect below hydrates from localStorage on
  // mount, triggering a second render with the real value on the client.
  const [boardId, setBoardIdState] = useState<string>(DEFAULT_BOARD_ID);

  // ── Hydrate from localStorage on mount ──────────────────────────────
  useEffect(() => {
    const stored = readStoredBoardId();
    if (stored !== boardId) {
      setBoardIdState(stored);
    }
    // We intentionally only want to run this on mount — the effect
    // below handles subsequent changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Subscribe to change events ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBoardChange = (e: Event) => {
      const detail = (e as CustomEvent<BoardChangeEventDetail>).detail;
      if (!detail) return;
      if (!getBoardProfile(detail.boardId)) return;
      setBoardIdState(detail.boardId);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      // Other tab cleared the key — fall back to default.
      if (e.newValue === null) {
        setBoardIdState(DEFAULT_BOARD_ID);
        return;
      }
      if (getBoardProfile(e.newValue)) {
        setBoardIdState(e.newValue);
      }
    };

    window.addEventListener(BOARD_CHANGE_EVENT, handleBoardChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(BOARD_CHANGE_EVENT, handleBoardChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setBoardId = useCallback((id: string) => {
    if (!getBoardProfile(id)) return;
    // writeStoredBoardId dispatches the event, which the listener above
    // picks up and calls setBoardIdState — this keeps every hook
    // instance in sync, including the caller.
    writeStoredBoardId(id);
  }, []);

  const profile = getBoardProfile(boardId) ?? getBoardProfile(DEFAULT_BOARD_ID)!;

  return { boardId, profile, setBoardId };
}

// Re-export a handful of registry pieces so consumers only need one
// import when both hook + catalog listing are required.
export { BOARD_PROFILES, DEFAULT_BOARD_ID, getBoardProfile };
export type { BoardProfile };
