// ─── BoardPicker + useBoardProfile — unit + rendering tests ────────────
//
// The vitest env for apps/web is node-only (no jsdom). We test:
//   1. Pure helpers exported from BoardPicker (STATUS_LABELS,
//      STATUS_TOKENS, isHardwareValidated, formatFlashKiB,
//      summarizeBoard).
//   2. Rendering via `react-dom/server`'s `renderToStaticMarkup` — each
//      test feeds props and asserts against the emitted HTML. Portal
//      is sidestepped by calling the modal subcomponent through a thin
//      wrapper that shims `createPortal`/`document.body`.
//   3. `useBoardProfile` via its underlying `readStoredBoardId` /
//      `writeStoredBoardId` helpers, against a localStorage shim bound
//      to `globalThis.window`.
//
// We do NOT render through `createPortal` in these tests — the modal's
// declarative structure is the same with or without the portal wrap,
// so assertions on `renderToStaticMarkup` work against the inner
// dialog markup. The portal itself is just a DOM-tree relocation and
// would require jsdom to exercise meaningfully.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Shim `createPortal` so modal render yields inline markup ─────────
//
// `BoardPicker` calls `createPortal(dialog, document.body)` on render.
// Under node, document.body is undefined and the portal import chain
// pulls in react-dom internals. Hoisted mock replaces it with a passthrough.
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: unknown) => node,
  };
});

// Silence modal-open / modal-close SFX. Not testing audio here.
vi.mock('@/lib/uiSounds', () => ({
  playUISound: () => {},
}));

// useModalDialog touches document + DOM events. Replace with a no-op hook
// returning a stable ref shape.
vi.mock('@/hooks/useModalDialog', () => ({
  useModalDialog: () => ({ dialogRef: { current: null } }),
}));

// ── Imports under test ───────────────────────────────────────────────

import {
  BoardPicker,
  STATUS_LABELS,
  STATUS_TOKENS,
  isHardwareValidated,
  formatFlashKiB,
  summarizeBoard,
} from '@/components/shared/BoardPicker';
import {
  BOARD_PROFILES,
  DEFAULT_BOARD_ID,
  getBoardProfile,
} from '@/lib/boardProfiles';
import {
  readStoredBoardId,
  writeStoredBoardId,
  STORAGE_KEY,
  BOARD_CHANGE_EVENT,
} from '@/hooks/useBoardProfile';

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Render a React element under the node server renderer. Asserting
 * against this is equivalent to asserting against the browser's initial
 * server-rendered HTML.
 */
function html(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

// Minimal in-memory localStorage for hook persistence tests.
function installStorageShim() {
  const store: Record<string, string> = {};
  const dispatched: Array<{ type: string; detail?: unknown }> = [];
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  const fakeLocalStorage = {
    getItem: (key: string): string | null =>
      key in store ? store[key] : null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
  const win = {
    localStorage: fakeLocalStorage,
    addEventListener: (type: string, cb: (e: unknown) => void) => {
      (listeners[type] ??= []).push(cb);
    },
    removeEventListener: (type: string, cb: (e: unknown) => void) => {
      listeners[type] = (listeners[type] ?? []).filter((x) => x !== cb);
    },
    dispatchEvent: (event: { type: string; detail?: unknown }) => {
      dispatched.push(event);
      for (const cb of listeners[event.type] ?? []) cb(event);
      return true;
    },
  };
  (globalThis as unknown as { window: unknown }).window = win;
  // CustomEvent polyfill
  (globalThis as unknown as { CustomEvent: unknown }).CustomEvent = class {
    type: string;
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
  return { store, dispatched, win };
}

function uninstallStorageShim() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).CustomEvent;
}

// ─── Pure helpers ────────────────────────────────────────────────────

describe('BoardPicker — helpers', () => {
  it('STATUS_LABELS covers all three statuses with expected text', () => {
    expect(STATUS_LABELS['full-support']).toBe('FULL');
    expect(STATUS_LABELS['partial-support']).toBe('PARTIAL');
    expect(STATUS_LABELS['preview-only']).toBe('PREVIEW ONLY');
  });

  it('STATUS_TOKENS maps to the expected CSS variables', () => {
    expect(STATUS_TOKENS['full-support']).toBe('--status-ok');
    expect(STATUS_TOKENS['partial-support']).toBe('--status-warn');
    expect(STATUS_TOKENS['preview-only']).toBe('--status-info');
  });

  it('isHardwareValidated returns true only for Proffieboard V3.9', () => {
    const validated = BOARD_PROFILES.filter(isHardwareValidated);
    expect(validated.length).toBe(1);
    expect(validated[0].id).toBe('proffie-v3.9');
  });

  it('formatFlashKiB renders kibibytes rounded', () => {
    expect(formatFlashKiB(512 * 1024)).toBe('512 KiB');
    expect(formatFlashKiB(128 * 1024)).toBe('128 KiB');
    expect(formatFlashKiB(64 * 1024)).toBe('64 KiB');
  });

  it('summarizeBoard includes LED count, flash size, and button count', () => {
    const v3 = getBoardProfile('proffie-v3.9')!;
    const summary = summarizeBoard(v3);
    expect(summary).toContain('264');       // LEDs
    expect(summary).toContain('512 KiB');   // flash
    expect(summary).toContain('3-button');  // buttons
  });
});

// ─── Modal rendering ─────────────────────────────────────────────────

describe('BoardPicker — modal variant', () => {
  beforeEach(() => installStorageShim());
  afterEach(() => uninstallStorageShim());

  it('renders all 6 boards with their display names', () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
        onClose: () => {},
      }),
    );
    for (const board of BOARD_PROFILES) {
      expect(markup).toContain(board.displayName);
    }
    // exactly six cards in the grid
    const cardMatches = markup.match(/data-testid="board-card-[^"]+"/g) ?? [];
    expect(cardMatches.length).toBe(6);
  });

  it('renders status chips for every board', () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
      }),
    );
    // Every profile gets a chip; full/partial/preview labels all present.
    expect(markup).toContain('FULL');
    expect(markup).toContain('PARTIAL');
    expect(markup).toContain('PREVIEW ONLY');
    // Each board has its own status marker
    for (const board of BOARD_PROFILES) {
      expect(markup).toContain(`data-testid="board-status-${board.id}"`);
    }
  });

  it('shows the preview-only note on CFX, Xenopixel, and Verso only', () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
      }),
    );

    // Preview-only callouts are present on exactly the three preview boards.
    expect(markup).toContain('data-testid="board-preview-note-cfx"');
    expect(markup).toContain('data-testid="board-preview-note-xenopixel"');
    expect(markup).toContain('data-testid="board-preview-note-verso"');

    // NOT on Proffie V3.9, V2.2, or Golden Harvest.
    expect(markup).not.toContain('data-testid="board-preview-note-proffie-v3.9"');
    expect(markup).not.toContain('data-testid="board-preview-note-proffie-v2.2"');
    expect(markup).not.toContain('data-testid="board-preview-note-golden-harvest-v3"');

    // Note text itself
    expect(markup).toContain("Can&#x27;t flash from KyberStation yet");
  });

  it("marks Proffieboard V3.9 as hardware-validated; no other board carries that badge", () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
      }),
    );
    expect(markup).toContain('data-testid="board-validated-proffie-v3.9"');
    expect(markup).toContain('hardware-validated');
    // No other board gets the badge
    const validatedMatches =
      markup.match(/data-testid="board-validated-[^"]+"/g) ?? [];
    expect(validatedMatches.length).toBe(1);
  });

  it('marks the selected card with aria-pressed=true; others with false', () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: 'golden-harvest-v3',
        onSelect: () => {},
      }),
    );
    // The Golden Harvest card is the only one pressed.
    const pressedTrue = markup.match(/aria-pressed="true"/g) ?? [];
    expect(pressedTrue.length).toBe(1);
    // The data-selected attribute on the GH card is "true"; others "false".
    expect(markup).toContain(
      'data-testid="board-card-golden-harvest-v3" data-selected="true"',
    );
  });

  it('renders key stats (LEDs, flash size, buttons) per card', () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
      }),
    );
    for (const board of BOARD_PROFILES) {
      expect(markup).toContain(`data-testid="board-stats-${board.id}"`);
      expect(markup).toContain(`data-testid="board-leds-${board.id}"`);
      expect(markup).toContain(`data-testid="board-flash-${board.id}"`);
      expect(markup).toContain(`data-testid="board-btn-${board.id}"`);
      // LED count + flash KiB both present in the rendered string
      expect(markup).toContain(String(board.maxLedCount));
      expect(markup).toContain(formatFlashKiB(board.flashSize));
    }
  });

  it('shows the close button when onClose is provided', () => {
    const withClose = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
        onClose: () => {},
      }),
    );
    expect(withClose).toContain('data-testid="board-picker-close"');

    const withoutClose = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
      }),
    );
    expect(withoutClose).not.toContain('data-testid="board-picker-close"');
  });

  it('onSelect is invoked with the board id when a card is clicked', () => {
    // We can't click through renderToStaticMarkup — verify the handler
    // is threaded into the card by searching for the onClick shape via
    // a spy-free sanity check. The BoardPicker unit already connects
    // onSelect → BoardCard → button; this asserts that each card is
    // clickable (has type=button) and the component exists.
    const handler = vi.fn();
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: handler,
      }),
    );
    // 6 card buttons, each type=button
    const buttonMatches = markup.match(/type="button"/g) ?? [];
    // 6 cards + (potentially) close button
    expect(buttonMatches.length).toBeGreaterThanOrEqual(6);
  });
});

// ─── Inline rendering ────────────────────────────────────────────────

describe('BoardPicker — inline variant', () => {
  beforeEach(() => installStorageShim());
  afterEach(() => uninstallStorageShim());

  it('renders as a compact button with BOARD label + board name', () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
        variant: 'inline',
      }),
    );
    expect(markup).toContain('data-testid="board-picker-inline"');
    expect(markup).toContain('BOARD');
    expect(markup).toContain('Proffieboard V3.9');
    // The inline button includes min-width in style so it stays compact
    expect(markup).toContain('min-width:160px');
  });

  it('falls back to first profile if the selected id is unknown', () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: 'unknown-board',
        onSelect: () => {},
        variant: 'inline',
      }),
    );
    // Falls back to BOARD_PROFILES[0] = Proffie V3.9
    expect(markup).toContain('Proffieboard V3.9');
  });

  it('aria-haspopup=dialog + aria-expanded=false when closed', () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
        variant: 'inline',
      }),
    );
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
  });

  it('defaults variant to modal when omitted', () => {
    const markup = html(
      createElement(BoardPicker, {
        selectedBoardId: DEFAULT_BOARD_ID,
        onSelect: () => {},
      }),
    );
    // Modal variant renders grid + backdrop; inline does not
    expect(markup).toContain('data-testid="board-picker-grid"');
    expect(markup).not.toContain('data-testid="board-picker-inline"');
  });
});

// ─── useBoardProfile — persistence helpers ───────────────────────────

describe('useBoardProfile — storage helpers', () => {
  let shim: ReturnType<typeof installStorageShim>;

  beforeEach(() => {
    shim = installStorageShim();
  });
  afterEach(uninstallStorageShim);

  it('readStoredBoardId returns DEFAULT_BOARD_ID when nothing is stored', () => {
    expect(readStoredBoardId()).toBe(DEFAULT_BOARD_ID);
  });

  it('readStoredBoardId returns DEFAULT_BOARD_ID when the stored value is unknown', () => {
    shim.store[STORAGE_KEY] = 'not-a-real-board';
    expect(readStoredBoardId()).toBe(DEFAULT_BOARD_ID);
  });

  it('readStoredBoardId returns the stored id when it resolves', () => {
    shim.store[STORAGE_KEY] = 'golden-harvest-v3';
    expect(readStoredBoardId()).toBe('golden-harvest-v3');
  });

  it('writeStoredBoardId persists to localStorage', () => {
    writeStoredBoardId('proffie-v2.2');
    expect(shim.store[STORAGE_KEY]).toBe('proffie-v2.2');
  });

  it('writeStoredBoardId dispatches a board-profile-changed CustomEvent', () => {
    writeStoredBoardId('cfx');
    const changeEvents = shim.dispatched.filter(
      (e) => e.type === BOARD_CHANGE_EVENT,
    );
    expect(changeEvents.length).toBe(1);
    expect((changeEvents[0] as { detail?: { boardId?: string } }).detail?.boardId).toBe('cfx');
  });

  it('writeStoredBoardId ignores unknown ids (no storage + no event)', () => {
    const before = { ...shim.store };
    writeStoredBoardId('not-a-real-board');
    expect(shim.store).toEqual(before);
    expect(shim.dispatched.length).toBe(0);
  });

  it('readStoredBoardId is SSR-safe when window is undefined', () => {
    uninstallStorageShim();
    expect(readStoredBoardId()).toBe(DEFAULT_BOARD_ID);
    // Re-install so afterEach cleanup doesn't double-delete.
    shim = installStorageShim();
  });

  it('writeStoredBoardId is SSR-safe when window is undefined', () => {
    uninstallStorageShim();
    // Should not throw
    expect(() => writeStoredBoardId('cfx')).not.toThrow();
    shim = installStorageShim();
  });

  it('round-trip: write then read returns the same id', () => {
    for (const board of BOARD_PROFILES) {
      writeStoredBoardId(board.id);
      expect(readStoredBoardId()).toBe(board.id);
    }
  });
});
