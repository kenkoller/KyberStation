'use client';
import { create } from 'zustand';

/**
 * Global WebUSB connection state — read by `StatusBar` (CONN segment) and
 * `DeliveryRail` (CONN segment) so they show live state instead of the
 * hardcoded "IDLE" placeholder both surfaces shipped with.
 *
 * The store is a *publication*, not the state machine. The canonical
 * connection state machine still lives inside `FlashPanel`'s local
 * `useState` — this store is a read-only mirror that FlashPanel pushes
 * into at every transition. Any future consumer that needs richer
 * detail (full DfuDevice handle, FlashProgress, etc.) should keep
 * reading from FlashPanel-internal state; this store carries only the
 * subset that's safe to expose globally.
 *
 * Pure runtime state — not persisted. On page reload we fall back to
 * 'idle'; any active USB session was already torn down by the browser.
 */

/**
 * Six-state coarse status the store exposes globally.
 *
 *   idle         — no connection attempt in flight
 *   connecting   — `requestDevice()` picker is open, or DFU handshake is running
 *   connected    — DFU interface claimed, board ready for flash
 *   flashing     — DNLOAD phase in progress
 *   verifying    — UPLOAD-and-compare phase in progress
 *   error        — any of the above failed; `errorMessage` carries the detail
 */
export type WebUSBConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'flashing'
  | 'verifying'
  | 'error';

export interface WebUSBConnection {
  status: WebUSBConnectionStatus;
  /** Human-readable device name (e.g. "STM32 BOOTLOADER"). Null when idle. */
  deviceName: string | null;
  /** USB vendor ID of the connected device (e.g. 0x0483 for STM). Null when idle. */
  deviceVendorId: number | null;
  /** Last error message — set alongside `status: 'error'`. Null otherwise. */
  errorMessage: string | null;
}

interface WebUSBStoreState extends WebUSBConnection {
  /** Idempotent — skips the update if the new status matches. */
  setStatus: (status: WebUSBConnectionStatus) => void;
  /** Sets both name + vendorId atomically; pass nulls to clear. */
  setDevice: (name: string | null, vendorId: number | null) => void;
  /** Set the error message. Does NOT auto-flip status to 'error' — callers
   * pair `setError(msg)` with `setStatus('error')` for clarity. */
  setError: (message: string | null) => void;
  /** Clear all four fields back to defaults. */
  reset: () => void;
}

const INITIAL_STATE: WebUSBConnection = {
  status: 'idle',
  deviceName: null,
  deviceVendorId: null,
  errorMessage: null,
};

export const useWebusbStore = create<WebUSBStoreState>((set) => ({
  ...INITIAL_STATE,
  setStatus: (status) =>
    set((state) => (state.status === status ? state : { status })),
  setDevice: (deviceName, deviceVendorId) =>
    set((state) =>
      state.deviceName === deviceName && state.deviceVendorId === deviceVendorId
        ? state
        : { deviceName, deviceVendorId },
    ),
  setError: (errorMessage) =>
    set((state) =>
      state.errorMessage === errorMessage ? state : { errorMessage },
    ),
  reset: () =>
    set((state) => {
      // Avoid churning the reference when already at defaults — keeps
      // unrelated subscribers stable across redundant resets.
      if (
        state.status === INITIAL_STATE.status &&
        state.deviceName === INITIAL_STATE.deviceName &&
        state.deviceVendorId === INITIAL_STATE.deviceVendorId &&
        state.errorMessage === INITIAL_STATE.errorMessage
      ) {
        return state;
      }
      return { ...INITIAL_STATE };
    }),
}));

// ─── Selectors ──────────────────────────────────────────────────────────────

/** True when status is 'connected' (board claimed, ready to flash). */
export const isConnectedSelector = (state: WebUSBStoreState): boolean =>
  state.status === 'connected';

/** True when an operation is actively in flight (connecting/flashing/verifying). */
export const isBusySelector = (state: WebUSBStoreState): boolean =>
  state.status === 'connecting' ||
  state.status === 'flashing' ||
  state.status === 'verifying';
