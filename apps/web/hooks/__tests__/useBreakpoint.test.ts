// ─── useBreakpoint Regression Tests (P16-001) ───────────────────────────────
//
// QA Finding P16-001: at 1440×900 viewport after a preview_stop →
// preview_start cycle + `window.location.href = '/editor'` navigation,
// AppShell sometimes rendered MobileShell instead of WorkbenchLayout on the
// first paint. A hard reload corrected it.
//
// Root cause: `useState<Breakpoint>('desktop')` + `useEffect(() => check(), [])`
// meant the initial commit used a default value rather than the real viewport,
// and the correcting setState only fired after paint. Any intermediate state
// read during that window saw the wrong breakpoint.
//
// Fix: lazy `useState(readBreakpoint)` initializer reads `window.innerWidth`
// synchronously on first CSR render, so the very first commit already has the
// correct breakpoint. `readBreakpoint()` is SSR-safe (falls back to
// `'desktop'` when `window` is undefined).
//
// These tests pin the pure-function layer (`getBreakpoint`) and the SSR-safe
// reader (`readBreakpoint`). Mounting-through-React is not exercised here
// because the project doesn't depend on @testing-library/react — the
// pure-function layer is where the bug lived.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { getBreakpoint, readBreakpoint } from '../useBreakpoint';

describe('getBreakpoint — pure boundary function', () => {
  it('returns "phone" below 600px', () => {
    expect(getBreakpoint(0)).toBe('phone');
    expect(getBreakpoint(320)).toBe('phone');
    expect(getBreakpoint(599)).toBe('phone');
  });

  it('returns "tablet" in [600, 1024)', () => {
    expect(getBreakpoint(600)).toBe('tablet');
    expect(getBreakpoint(768)).toBe('tablet');
    expect(getBreakpoint(1023)).toBe('tablet');
  });

  it('returns "desktop" in [1024, 1440)', () => {
    expect(getBreakpoint(1024)).toBe('desktop');
    expect(getBreakpoint(1280)).toBe('desktop');
    expect(getBreakpoint(1439)).toBe('desktop');
  });

  it('returns "wide" at 1440+ (P16-001 repro viewport)', () => {
    // 1440×900 is the viewport from the finding. WorkbenchLayout handles both
    // "desktop" and "wide" branches (the `if (isMobile)` / `if (isTablet)`
    // checks in AppShell fall through for both).
    expect(getBreakpoint(1440)).toBe('wide');
    expect(getBreakpoint(1920)).toBe('wide');
    expect(getBreakpoint(3440)).toBe('wide');
  });
});

describe('readBreakpoint — SSR-safe synchronous reader (P16-001 fix)', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    // Restore the original window binding between tests.
    if (originalWindow === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window = originalWindow;
    }
    vi.restoreAllMocks();
  });

  it('falls back to "desktop" on the server (no window)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
    expect(readBreakpoint()).toBe('desktop');
  });

  it('reads window.innerWidth synchronously when client-side', () => {
    // Stub window with a phone-sized innerWidth.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { innerWidth: 375 };
    expect(readBreakpoint()).toBe('phone');
  });

  it('reports the correct breakpoint for the P16-001 repro viewport (1440)', () => {
    // The finding was that a 1440-wide viewport mounted into MobileShell.
    // readBreakpoint must return "wide" (which flows through to
    // WorkbenchLayout in AppShell), NEVER "phone".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { innerWidth: 1440 };
    const bp = readBreakpoint();
    expect(bp).toBe('wide');
    expect(bp).not.toBe('phone');
    expect(bp).not.toBe('tablet');
  });

  it('reports desktop for a common laptop viewport (1280×800)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { innerWidth: 1280 };
    expect(readBreakpoint()).toBe('desktop');
  });

  it('crosses the tablet boundary cleanly at 1024', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { innerWidth: 1023 };
    expect(readBreakpoint()).toBe('tablet');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { innerWidth: 1024 };
    expect(readBreakpoint()).toBe('desktop');
  });
});
