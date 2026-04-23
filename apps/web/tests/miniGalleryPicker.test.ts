// ─── MiniGalleryPicker — pure-helper regression tests ────────────────────
//
// The vitest env for apps/web is node-only (no jsdom), so we exercise
// the pure helpers that drive the picker's behaviour rather than
// rendering the component. If these stay green, the component itself
// is a thin JSX shell over them — anything that breaks at runtime
// will show up here first.
//
// Items asserted:
//   - `resolveGridCols(n)` yields the expected Tailwind class string
//     for n = 2 / 3 / 4, with the desktop ceiling matching the caller's
//     choice and tablet/mobile degrading sensibly.
//   - `cycleGridIndex` does the right thing in all four directions,
//     including wrap at both edges and proper column-aware up/down.
//   - `keyToDirection` maps arrow keys to directions and returns null
//     for anything else.
//   - `isSelectKey` recognizes Enter and Space (including legacy
//     Spacebar) and ignores other keys.

import { describe, it, expect } from 'vitest';
import {
  resolveGridCols,
  cycleGridIndex,
  keyToDirection,
  isSelectKey,
} from '../components/shared/MiniGalleryPicker';

// ─── resolveGridCols ──────────────────────────────────────────────────────

describe('resolveGridCols', () => {
  it('returns a 3-wide desktop grid by default (columns=3)', () => {
    expect(resolveGridCols(3)).toBe(
      'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3',
    );
  });

  it('returns a 2-wide desktop grid when columns=2 (tablet still 2)', () => {
    expect(resolveGridCols(2)).toBe(
      'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-2',
    );
  });

  it('returns a 4-wide desktop grid when columns=4 (tablet stays 2)', () => {
    expect(resolveGridCols(4)).toBe(
      'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4',
    );
  });

  it('always starts from `grid-cols-1` on mobile — the 1-col mandate', () => {
    expect(resolveGridCols(2).startsWith('grid-cols-1 ')).toBe(true);
    expect(resolveGridCols(3).startsWith('grid-cols-1 ')).toBe(true);
    expect(resolveGridCols(4).startsWith('grid-cols-1 ')).toBe(true);
  });
});

// ─── cycleGridIndex ────────────────────────────────────────────────────────

describe('cycleGridIndex — horizontal navigation', () => {
  it('ArrowRight advances by one and wraps at the end', () => {
    expect(cycleGridIndex(0, 6, 3, 'right')).toBe(1);
    expect(cycleGridIndex(4, 6, 3, 'right')).toBe(5);
    expect(cycleGridIndex(5, 6, 3, 'right')).toBe(0); // wrap
  });

  it('ArrowLeft decrements by one and wraps at zero', () => {
    expect(cycleGridIndex(5, 6, 3, 'left')).toBe(4);
    expect(cycleGridIndex(1, 6, 3, 'left')).toBe(0);
    expect(cycleGridIndex(0, 6, 3, 'left')).toBe(5); // wrap
  });
});

describe('cycleGridIndex — vertical navigation', () => {
  it('ArrowDown jumps by `columns`', () => {
    // 6 items, 3 cols → grid is 2 rows of 3. idx 0 → 3 (one row down).
    expect(cycleGridIndex(0, 6, 3, 'down')).toBe(3);
    expect(cycleGridIndex(1, 6, 3, 'down')).toBe(4);
    expect(cycleGridIndex(2, 6, 3, 'down')).toBe(5);
  });

  it('ArrowDown from the bottom row wraps to the same column on row 0', () => {
    // idx 3 is on row 1 (bottom); +3 would be 6 which is out of range, so
    // we wrap to col 0 (3 % 3 = 0).
    expect(cycleGridIndex(3, 6, 3, 'down')).toBe(0);
    expect(cycleGridIndex(4, 6, 3, 'down')).toBe(1);
    expect(cycleGridIndex(5, 6, 3, 'down')).toBe(2);
  });

  it('ArrowUp jumps by `columns` from the bottom', () => {
    expect(cycleGridIndex(3, 6, 3, 'up')).toBe(0);
    expect(cycleGridIndex(4, 6, 3, 'up')).toBe(1);
    expect(cycleGridIndex(5, 6, 3, 'up')).toBe(2);
  });

  it('ArrowUp from row 0 wraps to the same column on the last row', () => {
    expect(cycleGridIndex(0, 6, 3, 'up')).toBe(3);
    expect(cycleGridIndex(1, 6, 3, 'up')).toBe(4);
    expect(cycleGridIndex(2, 6, 3, 'up')).toBe(5);
  });

  it('ArrowUp from row 0 lands on the nearest in-bounds cell when the grid is ragged', () => {
    // 5 items, 3 cols → row 0 = [0,1,2], row 1 = [3,4] (col 2 missing).
    // ArrowUp from idx 2 (col 2 on row 0) would target lastRowStart + 2 = 5
    // which is out of range, so we fall back to candidate - columns = 2.
    expect(cycleGridIndex(2, 5, 3, 'up')).toBe(2);
  });
});

describe('cycleGridIndex — edge cases', () => {
  it('returns 0 for an empty grid in every direction', () => {
    expect(cycleGridIndex(0, 0, 3, 'right')).toBe(0);
    expect(cycleGridIndex(0, 0, 3, 'left')).toBe(0);
    expect(cycleGridIndex(0, 0, 3, 'up')).toBe(0);
    expect(cycleGridIndex(0, 0, 3, 'down')).toBe(0);
  });

  it('treats columns<=0 as 1-column (defensive)', () => {
    expect(cycleGridIndex(0, 4, 0, 'down')).toBe(1);
    expect(cycleGridIndex(3, 4, 0, 'up')).toBe(2);
  });

  it('single-column grids behave like a flat list for up/down', () => {
    expect(cycleGridIndex(0, 3, 1, 'down')).toBe(1);
    expect(cycleGridIndex(1, 3, 1, 'down')).toBe(2);
    expect(cycleGridIndex(2, 3, 1, 'down')).toBe(0);
  });
});

// ─── keyToDirection ────────────────────────────────────────────────────────

describe('keyToDirection', () => {
  it('maps the four arrow keys to their direction strings', () => {
    expect(keyToDirection('ArrowRight')).toBe('right');
    expect(keyToDirection('ArrowLeft')).toBe('left');
    expect(keyToDirection('ArrowUp')).toBe('up');
    expect(keyToDirection('ArrowDown')).toBe('down');
  });

  it('returns null for any other key (Tab, Enter, letters, etc.)', () => {
    expect(keyToDirection('Tab')).toBeNull();
    expect(keyToDirection('Enter')).toBeNull();
    expect(keyToDirection(' ')).toBeNull();
    expect(keyToDirection('Escape')).toBeNull();
    expect(keyToDirection('a')).toBeNull();
  });
});

// ─── isSelectKey ───────────────────────────────────────────────────────────

describe('isSelectKey', () => {
  it('recognizes Enter and Space per the button keyboard contract', () => {
    expect(isSelectKey('Enter')).toBe(true);
    expect(isSelectKey(' ')).toBe(true);
    expect(isSelectKey('Spacebar')).toBe(true); // legacy IE/Edge
  });

  it('ignores every other key', () => {
    expect(isSelectKey('Tab')).toBe(false);
    expect(isSelectKey('Escape')).toBe(false);
    expect(isSelectKey('ArrowDown')).toBe(false);
    expect(isSelectKey('a')).toBe(false);
  });
});
