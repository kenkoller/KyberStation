// ─── Command Palette — store + selector + pure-helper regression tests ──
//
// The vitest env for apps/web is node-only (no jsdom), matching the rest
// of apps/web/tests. These tests exercise everything that drives the
// palette's behavior without rendering the component itself:
//
//   1. `commandStore` — register (idempotent), run, open/close/toggle,
//      setQuery, unregister.
//   2. `selectGroupedFilteredCommands` — case-insensitive substring
//      filter against title + subtitle, grouped by `group` in
//      first-seen order.
//   3. `flattenGroups` + `cycleActiveIndex` — the pure helpers that
//      back the palette's keyboard navigation; if these are green, the
//      arrow-down / arrow-up / enter wiring in the component is a thin
//      shell over them.
//
// Items asserted by this file from the Wave 2a acceptance list:
//   - `commandStore.registerCommand` is idempotent (same id replaces).
//   - `commandStore.runCommand(id)` calls `run()` and closes the palette.
//   - `selectGroupedFilteredCommands` filters case-insensitively on
//     title + subtitle.
//   - With `isOpen=false`, the store yields no palette content (proxy
//     for "no portal content" — the component guard is `if (!isOpen)
//     return null`).
//   - With 3 commands across 2 groups, the selector yields 2 group
//     rows + 3 items (proxy for "2 group headers + 3 rows" rendered).
//   - Arrow-down cycles the active row; Enter calls the active
//     command's `run`; ESC closes (via store).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useCommandStore,
  selectGroupedFilteredCommands,
  type Command,
} from '../stores/commandStore';
import {
  flattenGroups,
  cycleActiveIndex,
} from '../components/shared/CommandPalette';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  useCommandStore.setState({
    commands: new Map<string, Command>(),
    isOpen: false,
    query: '',
  });
}

function cmd(
  id: string,
  group: string,
  title: string,
  extras: Partial<Omit<Command, 'id' | 'group' | 'title' | 'run'>> & {
    run?: () => void;
  } = {},
): Command {
  return {
    id,
    group,
    title,
    run: extras.run ?? (() => {}),
    ...(extras.subtitle !== undefined ? { subtitle: extras.subtitle } : {}),
    ...(extras.kbd !== undefined ? { kbd: extras.kbd } : {}),
    ...(extras.icon !== undefined ? { icon: extras.icon } : {}),
  };
}

// ─── registerCommand (idempotency) ─────────────────────────────────────────

describe('commandStore — registerCommand', () => {
  beforeEach(resetStore);

  it('adds a command to the registry', () => {
    useCommandStore.getState().registerCommand(cmd('ignite', 'AUDITION', 'Ignite blade'));
    const map = useCommandStore.getState().commands;
    expect(map.size).toBe(1);
    expect(map.get('ignite')?.title).toBe('Ignite blade');
  });

  it('is idempotent — re-registering the same id replaces rather than duplicates', () => {
    useCommandStore.getState().registerCommand(cmd('ignite', 'AUDITION', 'Ignite blade'));
    useCommandStore.getState().registerCommand(cmd('ignite', 'AUDITION', 'Ignite blade (v2)'));

    const map = useCommandStore.getState().commands;
    expect(map.size).toBe(1);
    // Second registration wins.
    expect(map.get('ignite')?.title).toBe('Ignite blade (v2)');
  });

  it('preserves distinct commands across multiple registrations', () => {
    useCommandStore.getState().registerCommand(cmd('ignite', 'AUDITION', 'Ignite'));
    useCommandStore.getState().registerCommand(cmd('clash', 'AUDITION', 'Clash'));
    useCommandStore.getState().registerCommand(cmd('blast', 'AUDITION', 'Blast'));

    const map = useCommandStore.getState().commands;
    expect(map.size).toBe(3);
    expect(Array.from(map.keys()).sort()).toEqual(['blast', 'clash', 'ignite']);
  });

  it('yields a new Map reference on each registration (enables React re-renders)', () => {
    useCommandStore.getState().registerCommand(cmd('a', 'G', 'A'));
    const map1 = useCommandStore.getState().commands;
    useCommandStore.getState().registerCommand(cmd('b', 'G', 'B'));
    const map2 = useCommandStore.getState().commands;
    expect(map1).not.toBe(map2);
  });
});

// ─── unregisterCommand ────────────────────────────────────────────────────────

describe('commandStore — unregisterCommand', () => {
  beforeEach(resetStore);

  it('removes a registered command', () => {
    useCommandStore.getState().registerCommand(cmd('a', 'G', 'A'));
    useCommandStore.getState().registerCommand(cmd('b', 'G', 'B'));
    useCommandStore.getState().unregisterCommand('a');
    const map = useCommandStore.getState().commands;
    expect(map.has('a')).toBe(false);
    expect(map.has('b')).toBe(true);
  });

  it('is a no-op when the id is absent', () => {
    useCommandStore.getState().registerCommand(cmd('a', 'G', 'A'));
    const before = useCommandStore.getState().commands;
    useCommandStore.getState().unregisterCommand('nope');
    const after = useCommandStore.getState().commands;
    // No mutation → same reference by our fast-path guard.
    expect(after).toBe(before);
    expect(after.size).toBe(1);
  });
});

// ─── runCommand ──────────────────────────────────────────────────────────────

describe('commandStore — runCommand', () => {
  beforeEach(resetStore);

  it('invokes the command run() and closes the palette', () => {
    const spy = vi.fn();
    useCommandStore.setState({ isOpen: true, query: 'ign' });
    useCommandStore
      .getState()
      .registerCommand(cmd('ignite', 'AUDITION', 'Ignite blade', { run: spy }));

    useCommandStore.getState().runCommand('ignite');

    expect(spy).toHaveBeenCalledTimes(1);
    const state = useCommandStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.query).toBe('');
  });

  it('is a no-op when the id is not registered', () => {
    useCommandStore.setState({ isOpen: true, query: 'foo' });
    // Should not throw.
    useCommandStore.getState().runCommand('missing');
    const state = useCommandStore.getState();
    // Open/query state preserved because the run() side-effect didn't fire.
    expect(state.isOpen).toBe(true);
    expect(state.query).toBe('foo');
  });

  it('still closes the palette even if the command run() throws', () => {
    const boom = vi.fn(() => {
      throw new Error('boom');
    });
    useCommandStore.setState({ isOpen: true, query: 'b' });
    useCommandStore.getState().registerCommand(cmd('boom', 'G', 'Boom', { run: boom }));

    expect(() => useCommandStore.getState().runCommand('boom')).toThrow('boom');
    const state = useCommandStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.query).toBe('');
  });
});

// ─── open / close / toggle / setQuery ─────────────────────────────────────

describe('commandStore — open/close/toggle/setQuery', () => {
  beforeEach(resetStore);

  it('open() sets isOpen true and clears query', () => {
    useCommandStore.setState({ query: 'leftover' });
    useCommandStore.getState().open();
    expect(useCommandStore.getState().isOpen).toBe(true);
    expect(useCommandStore.getState().query).toBe('');
  });

  it('close() sets isOpen false and clears query', () => {
    useCommandStore.setState({ isOpen: true, query: 'typed' });
    useCommandStore.getState().close();
    expect(useCommandStore.getState().isOpen).toBe(false);
    expect(useCommandStore.getState().query).toBe('');
  });

  it('toggle() flips open→closed and closed→open, always clearing query', () => {
    useCommandStore.setState({ isOpen: false, query: '' });
    useCommandStore.getState().toggle();
    expect(useCommandStore.getState().isOpen).toBe(true);

    useCommandStore.setState({ query: 'mid' });
    useCommandStore.getState().toggle();
    expect(useCommandStore.getState().isOpen).toBe(false);
    expect(useCommandStore.getState().query).toBe('');
  });

  it('setQuery() updates the query without touching isOpen', () => {
    useCommandStore.setState({ isOpen: true, query: '' });
    useCommandStore.getState().setQuery('lockup');
    const state = useCommandStore.getState();
    expect(state.query).toBe('lockup');
    expect(state.isOpen).toBe(true);
  });
});

// ─── selectGroupedFilteredCommands ────────────────────────────────────────

describe('selectGroupedFilteredCommands', () => {
  function mapFrom(list: Command[]): Map<string, Command> {
    const m = new Map<string, Command>();
    for (const c of list) m.set(c.id, c);
    return m;
  }

  it('returns all commands grouped when query is empty', () => {
    const commands = mapFrom([
      cmd('a', 'NAVIGATE', 'Go to Design'),
      cmd('b', 'LAYER', 'Add Layer'),
      cmd('c', 'NAVIGATE', 'Go to Output'),
    ]);
    const groups = selectGroupedFilteredCommands({ commands, query: '' });
    // Groups are first-seen order: NAVIGATE, LAYER.
    expect(groups.map((g) => g.group)).toEqual(['NAVIGATE', 'LAYER']);
    expect(groups[0].items.map((c) => c.id)).toEqual(['a', 'c']);
    expect(groups[1].items.map((c) => c.id)).toEqual(['b']);
  });

  it('treats a whitespace-only query as empty', () => {
    const commands = mapFrom([cmd('a', 'G', 'Alpha')]);
    const groups = selectGroupedFilteredCommands({ commands, query: '   ' });
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(1);
  });

  it('filters case-insensitively against title', () => {
    const commands = mapFrom([
      cmd('a', 'G', 'Ignite blade'),
      cmd('b', 'G', 'Retract blade'),
      cmd('c', 'G', 'Clash'),
    ]);
    const groups = selectGroupedFilteredCommands({ commands, query: 'BLADE' });
    const ids = groups.flatMap((g) => g.items.map((c) => c.id));
    expect(ids.sort()).toEqual(['a', 'b']);
  });

  it('filters case-insensitively against subtitle', () => {
    const commands = mapFrom([
      cmd('a', 'G', 'Ignite', { subtitle: 'Toggle blade on/off' }),
      cmd('b', 'G', 'Clash', { subtitle: 'Single clash impact' }),
    ]);
    const groups = selectGroupedFilteredCommands({ commands, query: 'toggle' });
    const ids = groups.flatMap((g) => g.items.map((c) => c.id));
    expect(ids).toEqual(['a']);
  });

  it('drops groups that have no remaining items after filtering', () => {
    const commands = mapFrom([
      cmd('a', 'NAVIGATE', 'Go to Output'),
      cmd('b', 'LAYER', 'Add Layer'),
    ]);
    const groups = selectGroupedFilteredCommands({ commands, query: 'navig' });
    // 'Go to Output' title doesn't contain 'navig' — empty result.
    expect(groups).toHaveLength(0);
  });

  it('yields 2 group entries + 3 items for 3 commands across 2 groups (no filter)', () => {
    // Parallels the "rendering with isOpen=true and 3 commands across 2
    // groups renders 2 group headers + 3 rows" acceptance bullet.
    const commands = mapFrom([
      cmd('a', 'NAVIGATE', 'Go to Design'),
      cmd('b', 'LAYER', 'Add Layer'),
      cmd('c', 'LAYER', 'Duplicate Layer'),
    ]);
    const groups = selectGroupedFilteredCommands({ commands, query: '' });
    expect(groups).toHaveLength(2);
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(3);
  });
});

// ─── isOpen=false → palette yields no content ─────────────────────────────

describe('palette visibility gate', () => {
  beforeEach(resetStore);

  it('isOpen defaults to false, and the component guard renders nothing', () => {
    // The component's guard is `if (!isOpen || !mounted) return null`.
    // The store default mirrors that: nothing shows until something
    // opens the palette.
    expect(useCommandStore.getState().isOpen).toBe(false);
  });

  it('after close(), isOpen is false regardless of prior state', () => {
    useCommandStore.getState().open();
    expect(useCommandStore.getState().isOpen).toBe(true);
    useCommandStore.getState().close();
    expect(useCommandStore.getState().isOpen).toBe(false);
  });
});

// ─── flattenGroups (pure) ──────────────────────────────────────────────────

describe('flattenGroups', () => {
  it('concatenates items across groups preserving order', () => {
    const flat = flattenGroups([
      { group: 'A', items: [cmd('a1', 'A', 'A1'), cmd('a2', 'A', 'A2')] },
      { group: 'B', items: [cmd('b1', 'B', 'B1')] },
    ]);
    expect(flat.map((c) => c.id)).toEqual(['a1', 'a2', 'b1']);
  });

  it('returns an empty array for no groups', () => {
    expect(flattenGroups([])).toEqual([]);
  });
});

// ─── cycleActiveIndex (Arrow navigation) ──────────────────────────────────

describe('cycleActiveIndex', () => {
  it('arrow-down advances by one and wraps at the end', () => {
    expect(cycleActiveIndex(0, 3, 'next')).toBe(1);
    expect(cycleActiveIndex(1, 3, 'next')).toBe(2);
    expect(cycleActiveIndex(2, 3, 'next')).toBe(0); // wrap
  });

  it('arrow-up decrements by one and wraps at zero', () => {
    expect(cycleActiveIndex(2, 3, 'prev')).toBe(1);
    expect(cycleActiveIndex(1, 3, 'prev')).toBe(0);
    expect(cycleActiveIndex(0, 3, 'prev')).toBe(2); // wrap
  });

  it('returns 0 for empty lists in either direction', () => {
    expect(cycleActiveIndex(0, 0, 'next')).toBe(0);
    expect(cycleActiveIndex(0, 0, 'prev')).toBe(0);
  });
});

// ─── Enter → runs active; ESC → closes (via store wiring) ──────────────

describe('keyboard wiring (simulated via store path)', () => {
  beforeEach(resetStore);

  it('arrow-down then Enter runs the second command', () => {
    // 3 commands across 2 groups. Starting activeIdx=0; arrow-down once
    // → activeIdx=1; Enter runs commands[1].run() and closes.
    const runs: string[] = [];
    useCommandStore.getState().registerCommand(
      cmd('a', 'NAVIGATE', 'Go to Design', { run: () => runs.push('a') }),
    );
    useCommandStore.getState().registerCommand(
      cmd('b', 'LAYER', 'Add Layer', { run: () => runs.push('b') }),
    );
    useCommandStore.getState().registerCommand(
      cmd('c', 'LAYER', 'Duplicate Layer', { run: () => runs.push('c') }),
    );
    useCommandStore.getState().open();

    const groups = selectGroupedFilteredCommands({
      commands: useCommandStore.getState().commands,
      query: useCommandStore.getState().query,
    });
    const flat = flattenGroups(groups);
    // Arrow-down once from idx 0 → 1; Enter runs flat[1].
    const nextIdx = cycleActiveIndex(0, flat.length, 'next');
    expect(nextIdx).toBe(1);
    useCommandStore.getState().runCommand(flat[nextIdx].id);

    expect(runs).toEqual(['b']);
    expect(useCommandStore.getState().isOpen).toBe(false);
  });

  it('ESC path — close() clears query and closes', () => {
    // The component delegates ESC to useModalDialog, which calls the
    // `onClose` it was given (our `close` action). We verify the close
    // action does what the keystroke ends up doing.
    useCommandStore.setState({ isOpen: true, query: 'typed' });
    useCommandStore.getState().close();
    expect(useCommandStore.getState().isOpen).toBe(false);
    expect(useCommandStore.getState().query).toBe('');
  });
});
