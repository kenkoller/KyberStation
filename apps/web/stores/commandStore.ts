import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A single executable entry in the ⌘K command palette.
 *
 * Shape follows the Raycast two-level convention: commands belong to a
 * `group` (uppercase category), and render as `icon · title · subtitle ·
 * kbd-hint`. Commands register at runtime from their owning panel/hook
 * (see `useRegisterCommands` in `@/hooks/useCommandPalette`), which keeps
 * the palette content-aware without a global catalog file.
 */
export interface Command {
  /** Stable unique id, e.g. `'ignite'` or `'theme:imperial'`. Registering
   *  the same id twice is idempotent — the second call replaces the first. */
  id: string;
  /** UPPERCASE category header in the palette list, e.g. `'NAVIGATE'`,
   *  `'LAYER'`, `'AUDITION'`, `'THEME'`, `'DELIVER'`, `'GALLERY'`. */
  group: string;
  /** Short human-readable title, e.g. `'Ignite blade'`. */
  title: string;
  /** Optional monospace hint shown after the title, e.g. `'Toggle blade on/off'`. */
  subtitle?: string;
  /** Optional keyboard-shortcut label, e.g. `'Space'`, `'⌘K'`, `'C'`. */
  kbd?: string;
  /** Single glyph rendered in the icon slot, e.g. `'✦'` `'◆'` `'·'`. */
  icon?: string;
  /** Imperative side-effect invoked when the command is chosen. */
  run: () => void;
}

export interface CommandStoreState {
  /** Runtime registry of commands, keyed by `Command.id`. */
  commands: Map<string, Command>;
  /** Whether the palette is currently rendered. */
  isOpen: boolean;
  /** Current filter string entered into the search input. */
  query: string;

  /** Register a command (idempotent — re-registering by id replaces). */
  registerCommand: (cmd: Command) => void;
  /** Remove a command by id. No-op if absent. */
  unregisterCommand: (id: string) => void;
  /** Execute a command by id, then close the palette and clear the query. */
  runCommand: (id: string) => void;

  /** Open the palette. Clears the query so it always opens fresh. */
  open: () => void;
  /** Close the palette. Clears the query. */
  close: () => void;
  /** Flip `isOpen`. When opening, clears the query. */
  toggle: () => void;

  /** Set the filter string entered in the search input. */
  setQuery: (q: string) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * Zustand store backing the ⌘K command palette.
 *
 * - Commands are registered at runtime — nothing is persisted. Panels /
 *   hooks call `registerCommand` on mount and `unregisterCommand` on
 *   unmount (see `useRegisterCommands`).
 * - `runCommand` fire-and-forgets the command's `run()` and always closes
 *   the palette. If a command wants to re-open the palette, it can call
 *   `open()` itself from within `run`.
 * - The store intentionally doesn't own the global ⌘K keybinding — that
 *   lives in `useCommandPalette`, which the app-shell mounts once.
 */
export const useCommandStore = create<CommandStoreState>((set, get) => ({
  commands: new Map<string, Command>(),
  isOpen: false,
  query: '',

  registerCommand: (cmd) => {
    set((state) => {
      const next = new Map(state.commands);
      next.set(cmd.id, cmd);
      return { commands: next };
    });
  },

  unregisterCommand: (id) => {
    set((state) => {
      if (!state.commands.has(id)) return state;
      const next = new Map(state.commands);
      next.delete(id);
      return { commands: next };
    });
  },

  runCommand: (id) => {
    const cmd = get().commands.get(id);
    if (!cmd) return;
    try {
      cmd.run();
    } finally {
      set({ isOpen: false, query: '' });
    }
  },

  open: () => set({ isOpen: true, query: '' }),
  close: () => set({ isOpen: false, query: '' }),
  toggle: () =>
    set((state) =>
      state.isOpen
        ? { isOpen: false, query: '' }
        : { isOpen: true, query: '' },
    ),

  setQuery: (q) => set({ query: q }),
}));

// ─── Selectors / helpers ────────────────────────────────────────────────────

export interface CommandGroup {
  /** Uppercase group header label. */
  group: string;
  /** Commands belonging to this group, in registration order (first-seen wins). */
  items: Command[];
}

/**
 * Slice of the store state that the filter selector cares about. Keeps
 * the selector testable without constructing a full store state.
 */
export interface GroupedFilteredCommandsInput {
  commands: Map<string, Command>;
  query: string;
}

/**
 * Selector that returns the active command list filtered by the current
 * query and grouped by `Command.group`.
 *
 * Filter semantics:
 *   - Empty / whitespace-only query → all commands.
 *   - Otherwise case-insensitive substring match against
 *     `title + ' ' + (subtitle ?? '')`.
 *
 * Group order is the order in which the first command in each group was
 * registered, which keeps the palette stable as long as registration is
 * stable.
 */
export function selectGroupedFilteredCommands(
  state: GroupedFilteredCommandsInput,
): CommandGroup[] {
  const needle = state.query.trim().toLowerCase();
  const groups = new Map<string, Command[]>();

  for (const cmd of state.commands.values()) {
    if (needle) {
      const haystack = (cmd.title + ' ' + (cmd.subtitle ?? '')).toLowerCase();
      if (!haystack.includes(needle)) continue;
    }
    const bucket = groups.get(cmd.group);
    if (bucket) {
      bucket.push(cmd);
    } else {
      groups.set(cmd.group, [cmd]);
    }
  }

  return Array.from(groups.entries()).map(([group, items]) => ({
    group,
    items,
  }));
}
