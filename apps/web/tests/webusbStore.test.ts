// ─── webusbStore — global WebUSB connection state ──────────────────────────
//
// Pure-Zustand store unit tests. The store is a side-effect-free
// publication of the FlashPanel state machine, mirrored into a global
// surface so StatusBar + DeliveryRail can read live status without
// coupling to the FlashPanel component tree.
//
// The vitest env for apps/web is node-only (no jsdom), matching the
// rest of apps/web/tests. Zustand's `create` works fine under node.
//
// Coverage:
//   1. Initial defaults — 'idle' / null / null / null.
//   2. setStatus is idempotent (no churn when value matches).
//   3. setStatus moves through every legal state.
//   4. setDevice writes both fields atomically.
//   5. setError writes the message without flipping status.
//   6. reset() clears all four fields.
//   7. The display helpers in StatusBar + DeliveryRail map the six
//      states correctly + truncate long device names.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useWebusbStore,
  isConnectedSelector,
  isBusySelector,
  type WebUSBConnectionStatus,
} from '../stores/webusbStore';
import { getStatusBarConnectionDisplay } from '../components/layout/StatusBar';
import {
  deliveryRailConnDisplay,
  compactDeviceName,
} from '../components/layout/DeliveryRail';

beforeEach(() => {
  // Reset between tests so state from a previous case can't leak.
  useWebusbStore.getState().reset();
});

describe('webusbStore — initial state', () => {
  it('starts in idle with null device + error', () => {
    const s = useWebusbStore.getState();
    expect(s.status).toBe<WebUSBConnectionStatus>('idle');
    expect(s.deviceName).toBeNull();
    expect(s.deviceVendorId).toBeNull();
    expect(s.errorMessage).toBeNull();
  });
});

describe('webusbStore — setStatus', () => {
  it('walks through every legal status', () => {
    const { setStatus } = useWebusbStore.getState();
    const order: WebUSBConnectionStatus[] = [
      'connecting',
      'connected',
      'flashing',
      'verifying',
      'error',
      'idle',
    ];
    for (const status of order) {
      setStatus(status);
      expect(useWebusbStore.getState().status).toBe(status);
    }
  });

  it('is idempotent — re-setting the current status returns the same object reference', () => {
    const { setStatus } = useWebusbStore.getState();
    setStatus('connecting');
    const a = useWebusbStore.getState();
    setStatus('connecting');
    const b = useWebusbStore.getState();
    // Zustand returns the prior state reference when the setter
    // returns the existing state object.
    expect(b).toBe(a);
  });
});

describe('webusbStore — setDevice', () => {
  it('writes name + vendorId atomically', () => {
    const { setDevice } = useWebusbStore.getState();
    setDevice('STM32 BOOTLOADER', 0x0483);
    const s = useWebusbStore.getState();
    expect(s.deviceName).toBe('STM32 BOOTLOADER');
    expect(s.deviceVendorId).toBe(0x0483);
  });

  it('clears both fields with nulls', () => {
    const { setDevice } = useWebusbStore.getState();
    setDevice('STM32 BOOTLOADER', 0x0483);
    setDevice(null, null);
    const s = useWebusbStore.getState();
    expect(s.deviceName).toBeNull();
    expect(s.deviceVendorId).toBeNull();
  });

  it('is idempotent on identical values', () => {
    const { setDevice } = useWebusbStore.getState();
    setDevice('STM32 BOOTLOADER', 0x0483);
    const a = useWebusbStore.getState();
    setDevice('STM32 BOOTLOADER', 0x0483);
    const b = useWebusbStore.getState();
    expect(b).toBe(a);
  });
});

describe('webusbStore — setError + setStatus(error) compose', () => {
  it('does NOT auto-flip status when only setError is called', () => {
    const { setError } = useWebusbStore.getState();
    setError('Failed to claim DFU interface.');
    const s = useWebusbStore.getState();
    expect(s.errorMessage).toBe('Failed to claim DFU interface.');
    // Important: setError is a pure write — callers compose with setStatus.
    expect(s.status).toBe<WebUSBConnectionStatus>('idle');
  });

  it('full error compose: setError + setStatus(error) leaves both fields set', () => {
    const { setError, setStatus } = useWebusbStore.getState();
    setError('Verification failed at block 42.');
    setStatus('error');
    const s = useWebusbStore.getState();
    expect(s.status).toBe<WebUSBConnectionStatus>('error');
    expect(s.errorMessage).toBe('Verification failed at block 42.');
  });
});

describe('webusbStore — reset', () => {
  it('clears all four fields back to defaults', () => {
    const { setStatus, setDevice, setError, reset } = useWebusbStore.getState();
    setDevice('STM32 BOOTLOADER', 0x0483);
    setError('Some error.');
    setStatus('error');

    reset();
    const s = useWebusbStore.getState();
    expect(s.status).toBe<WebUSBConnectionStatus>('idle');
    expect(s.deviceName).toBeNull();
    expect(s.deviceVendorId).toBeNull();
    expect(s.errorMessage).toBeNull();
  });

  it('is idempotent when already at defaults — preserves reference', () => {
    const a = useWebusbStore.getState();
    a.reset();
    const b = useWebusbStore.getState();
    expect(b).toBe(a);
  });
});

describe('webusbStore — selectors', () => {
  it('isConnectedSelector matches only the "connected" status', () => {
    const { setStatus } = useWebusbStore.getState();
    setStatus('connected');
    expect(isConnectedSelector(useWebusbStore.getState())).toBe(true);

    setStatus('flashing');
    expect(isConnectedSelector(useWebusbStore.getState())).toBe(false);

    setStatus('idle');
    expect(isConnectedSelector(useWebusbStore.getState())).toBe(false);
  });

  it('isBusySelector matches connecting + flashing + verifying', () => {
    const { setStatus } = useWebusbStore.getState();
    const busy: WebUSBConnectionStatus[] = ['connecting', 'flashing', 'verifying'];
    const idle: WebUSBConnectionStatus[] = ['idle', 'connected', 'error'];
    for (const s of busy) {
      setStatus(s);
      expect(isBusySelector(useWebusbStore.getState())).toBe(true);
    }
    for (const s of idle) {
      setStatus(s);
      expect(isBusySelector(useWebusbStore.getState())).toBe(false);
    }
  });
});

describe('StatusBar.getStatusBarConnectionDisplay — six-state mapping', () => {
  it('idle → IDLE/alert/warn', () => {
    const d = getStatusBarConnectionDisplay('idle', null);
    expect(d.text).toBe('IDLE');
    expect(d.variant).toBe('alert');
    expect(d.colorClass).toContain('--status-warn');
  });

  it('connecting → CONNECTING…/alert/warn', () => {
    const d = getStatusBarConnectionDisplay('connecting', null);
    expect(d.text).toBe('CONNECTING…');
    expect(d.variant).toBe('alert');
  });

  it('connected with deviceName → CONNECTED · <name>/success/ok', () => {
    const d = getStatusBarConnectionDisplay('connected', 'STM32 BOOTLOADER');
    expect(d.text).toBe('CONNECTED · STM32 BOOTLOADER');
    expect(d.variant).toBe('success');
    expect(d.colorClass).toContain('--status-ok');
  });

  it('connected without deviceName → CONNECTED only', () => {
    const d = getStatusBarConnectionDisplay('connected', null);
    expect(d.text).toBe('CONNECTED');
    expect(d.variant).toBe('success');
  });

  it('truncates long device names', () => {
    const d = getStatusBarConnectionDisplay(
      'connected',
      'A Very Very Long Device Name That Does Not Fit',
    );
    // Truncation budget is 24 chars; result should fit comfortably.
    expect(d.text.startsWith('CONNECTED · ')).toBe(true);
    expect(d.text.endsWith('…')).toBe(true);
  });

  it('flashing/verifying → warn variant', () => {
    expect(getStatusBarConnectionDisplay('flashing', null).text).toBe('FLASHING…');
    expect(getStatusBarConnectionDisplay('verifying', null).text).toBe('VERIFYING…');
  });

  it('error → ERROR/error/error', () => {
    const d = getStatusBarConnectionDisplay('error', null);
    expect(d.text).toBe('ERROR');
    expect(d.variant).toBe('error');
    expect(d.colorClass).toContain('--status-error');
  });
});

describe('DeliveryRail.deliveryRailConnDisplay — compact + full', () => {
  it('idle → IDLE in both modes', () => {
    expect(deliveryRailConnDisplay('idle', null, false).text).toBe('IDLE');
    expect(deliveryRailConnDisplay('idle', null, true).text).toBe('IDLE');
  });

  it('connected with name expands fully when not compact', () => {
    expect(deliveryRailConnDisplay('connected', 'STM32 BOOTLOADER', false).text).toBe(
      'READY · STM32 BOOTLOADER',
    );
  });

  it('connected with name collapses to ≤16-char name in compact', () => {
    const d = deliveryRailConnDisplay(
      'connected',
      'STMicroelectronics STM32 BOOTLOADER',
      true,
    );
    // Compact mode hides the "READY · " prefix and trims the name.
    expect(d.text.length).toBeLessThanOrEqual(16);
  });

  it('connected without name → READY in both modes', () => {
    expect(deliveryRailConnDisplay('connected', null, false).text).toBe('READY');
    expect(deliveryRailConnDisplay('connected', null, true).text).toBe('READY');
  });

  it('flashing/verifying use shortened verb in compact mode', () => {
    expect(deliveryRailConnDisplay('flashing', null, false).text).toBe('FLASHING…');
    expect(deliveryRailConnDisplay('flashing', null, true).text).toBe('FLASH…');
    expect(deliveryRailConnDisplay('verifying', null, false).text).toBe('VERIFYING…');
    expect(deliveryRailConnDisplay('verifying', null, true).text).toBe('VERIFY…');
  });

  it('error short-circuits to ERROR regardless of mode', () => {
    expect(deliveryRailConnDisplay('error', 'STM32 BOOTLOADER', false).text).toBe('ERROR');
    expect(deliveryRailConnDisplay('error', 'STM32 BOOTLOADER', true).text).toBe('ERROR');
  });
});

describe('compactDeviceName helper', () => {
  it('passes short names through unchanged', () => {
    expect(compactDeviceName('STM32')).toBe('STM32');
  });

  it('truncates with ellipsis at the configured budget', () => {
    expect(compactDeviceName('A Very Very Long Device Name')).toMatch(/^.{15}…$/);
  });
});
