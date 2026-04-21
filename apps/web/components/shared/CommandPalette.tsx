'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '@/hooks/useModalDialog';
import { useMetaKey } from '@/lib/platform';
import {
  useCommandStore,
  selectGroupedFilteredCommands,
  type Command,
  type CommandGroup,
} from '@/stores/commandStore';

// ─── Helpers (exported for tests) ────────────────────────────────────────────

/**
 * Flatten grouped commands into a single ordered list for active-row
 * indexing. Order matches visual render order — groups in their
 * registration order, commands within each group likewise.
 */
export function flattenGroups(groups: CommandGroup[]): Command[] {
  const out: Command[] = [];
  for (const g of groups) {
    for (const c of g.items) out.push(c);
  }
  return out;
}

/**
 * Pure cycle helper used by the palette's arrow-key handler. Given the
 * current active index and a list length, returns the next active
 * index wrapping across either edge. Returns 0 for empty lists.
 *
 * Exported so the keyboard wiring can be exercised without a DOM.
 */
export function cycleActiveIndex(
  current: number,
  length: number,
  direction: 'next' | 'prev',
): number {
  if (length <= 0) return 0;
  if (direction === 'next') return (current + 1) % length;
  return (current - 1 + length) % length;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * `CommandPalette` — Raycast-shape `⌘K` command palette.
 *
 * Mounts at `document.body` via `createPortal` when `isOpen` is true in
 * the shared `commandStore`. Renders only when open — nothing is in the
 * DOM while closed.
 *
 * Shape (matches the reference design at
 * `docs/design-reference/2026-04-19-claude-design/workbench.css:923–1050`):
 *   - 640px wide, capped at `min(60vh, 480px)`, centered near the top.
 *   - Background `rgb(var(--bg-deep))` w/ hairline border.
 *   - Border-radius `var(--r-interactive, 4px)` (falls back if the W1
 *     token sweep hasn't landed).
 *   - Header: crumb chip (`Command · ⌘K`) + search input.
 *   - Body: scrollable group list, each row icon · title · subtitle · kbd.
 *   - Footer: nav/run/close keycaps.
 *
 * Keyboard:
 *   - ↑ / ↓ move the active row (wrapping).
 *   - ↵ runs the active command.
 *   - ESC closes (via `useModalDialog`).
 *   - Tab / Shift+Tab are trapped within the dialog (via `useModalDialog`).
 *
 * The component deliberately does NOT register any commands — that's
 * done by the owning panels/hooks via `useRegisterCommands`. The palette
 * itself is content-agnostic.
 */
export function CommandPalette() {
  const isOpen = useCommandStore((s) => s.isOpen);
  const query = useCommandStore((s) => s.query);
  const setQuery = useCommandStore((s) => s.setQuery);
  const close = useCommandStore((s) => s.close);
  const runCommand = useCommandStore((s) => s.runCommand);

  // Platform-aware modifier display for the `Command · ⌘K` / `Ctrl+K` crumb.
  const meta = useMetaKey();
  const metaKbd = `${meta.symbol}${meta.sep}K`;

  // Subscribe to the raw command map so our selector recomputes whenever
  // a command is (un)registered. Zustand returns a fresh Map reference
  // on every registerCommand / unregisterCommand.
  const commandMap = useCommandStore((s) => s.commands);

  const groups = useMemo<CommandGroup[]>(
    () => selectGroupedFilteredCommands({ commands: commandMap, query }),
    [commandMap, query],
  );
  const flat = useMemo(() => flattenGroups(groups), [groups]);

  const [activeIdx, setActiveIdx] = useState(0);
  const listboxId = 'command-palette-listbox';

  // Reset active row whenever the palette opens or the filtered list
  // shrinks to exclude the current index.
  useEffect(() => {
    if (!isOpen) return;
    setActiveIdx(0);
  }, [isOpen]);

  useEffect(() => {
    if (activeIdx > 0 && activeIdx >= flat.length) {
      setActiveIdx(flat.length === 0 ? 0 : flat.length - 1);
    }
  }, [flat.length, activeIdx]);

  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen,
    onClose: close,
  });

  // SSR safety — `createPortal(..., document.body)` needs a client-side
  // mount before accessing `document`. Matches the HelpTooltip pattern.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => cycleActiveIndex(i, flat.length, 'next'));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => cycleActiveIndex(i, flat.length, 'prev'));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = flat[activeIdx];
        if (cmd) runCommand(cmd.id);
      }
    },
    [flat, activeIdx, runCommand],
  );

  // Keep the active row visible as the user arrows through long lists.
  const activeRowRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, isOpen]);

  if (!isOpen || !mounted) return null;

  // Backdrop click dismisses, but clicks inside the dialog surface stop
  // bubbling. Event wiring matches the reference palette.jsx.
  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center"
      style={{
        background: 'rgba(6, 8, 11, 0.72)',
        paddingTop: '14vh',
        animation: 'fade-in 120ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1))',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'min(60vh, 480px)',
          background: 'rgb(var(--bg-deep))',
          border: '1px solid rgb(var(--border-light) / 1)',
          borderRadius: 'var(--r-interactive, 4px)',
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.6), 0 4px 10px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            height: 44,
            borderBottom: '1px solid rgb(var(--border-subtle) / 1)',
            gap: 10,
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: 'rgb(var(--accent))',
              padding: '2px 7px',
              border: '1px solid rgb(var(--accent) / 0.35)',
              background: 'rgb(var(--accent) / 0.08)',
              borderRadius: 'var(--r-chrome, 2px)',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
          >
            Command · {metaKbd}
          </span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Search commands…"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={
              flat[activeIdx]
                ? `command-palette-row-${flat[activeIdx].id}`
                : undefined
            }
            role="combobox"
            aria-expanded="true"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'rgb(var(--text-primary))',
              fontSize: 15,
              outline: 'none',
            }}
          />
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: 'rgb(var(--text-muted))',
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}
          >
            {flat.length} {flat.length === 1 ? 'RESULT' : 'RESULTS'}
          </span>
        </div>

        {/* ── Body ── */}
        <div
          role="listbox"
          id={listboxId}
          aria-label="Commands"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 4,
          }}
        >
          {flat.length === 0 ? (
            <div
              className="font-mono"
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'rgb(var(--text-muted))',
                fontSize: 11,
              }}
            >
              No commands match
            </div>
          ) : (
            <CommandRows
              groups={groups}
              activeIdx={activeIdx}
              activeRowRef={activeRowRef}
              onHover={setActiveIdx}
              onPick={(id) => runCommand(id)}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="font-mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '0 14px',
            height: 28,
            borderTop: '1px solid rgb(var(--border-subtle) / 1)',
            fontSize: 10,
            color: 'rgb(var(--text-muted))',
            letterSpacing: '0.02em',
            background: 'rgb(var(--bg-primary))',
          }}
        >
          <FooterChord glyph="↑↓" label="navigate" />
          <FooterChord glyph="↵" label="run" />
          <FooterChord glyph="ESC" label="close" />
          <div style={{ flex: 1 }} />
          <span>KyberStation · {metaKbd}</span>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

// ─── Row list ────────────────────────────────────────────────────────────────

interface CommandRowsProps {
  groups: CommandGroup[];
  activeIdx: number;
  activeRowRef: React.MutableRefObject<HTMLButtonElement | null>;
  onHover: (idx: number) => void;
  onPick: (id: string) => void;
}

function CommandRows({
  groups,
  activeIdx,
  activeRowRef,
  onHover,
  onPick,
}: CommandRowsProps) {
  // Running index across groups so each row knows whether it's the
  // currently-active one.
  let cursor = 0;
  return (
    <>
      {groups.map((g) => (
        <div key={g.group}>
          <div
            className="font-mono"
            style={{
              padding: '8px 10px 4px',
              fontSize: 9.5,
              color: 'rgb(var(--text-muted))',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {g.group}
          </div>
          {g.items.map((c) => {
            const idx = cursor++;
            const active = idx === activeIdx;
            return (
              <button
                key={c.id}
                id={`command-palette-row-${c.id}`}
                ref={active ? activeRowRef : undefined}
                role="option"
                aria-selected={active}
                type="button"
                onMouseEnter={() => onHover(idx)}
                onClick={() => onPick(c.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '22px 1fr auto auto',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  borderRadius: 'var(--r-chrome, 2px)',
                  background: active
                    ? 'rgb(var(--bg-surface))'
                    : 'transparent',
                  borderLeft: active
                    ? '2px solid rgb(var(--accent))'
                    : '2px solid transparent',
                  paddingLeft: active ? 8 : 10,
                  cursor: 'pointer',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                  transition: 'background 80ms linear',
                }}
              >
                <div
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    color: active
                      ? 'rgb(var(--accent))'
                      : 'rgb(var(--text-muted))',
                    textAlign: 'center',
                  }}
                >
                  {c.icon ?? '·'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'rgb(var(--text-primary))',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.title}
                  </div>
                  {c.subtitle && (
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 10.5,
                        color: 'rgb(var(--text-muted))',
                        letterSpacing: '0.02em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.subtitle}
                    </div>
                  )}
                </div>
                <div />
                {c.kbd && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 10,
                      color: 'rgb(var(--text-muted))',
                      padding: '1px 6px',
                      border: '1px solid rgb(var(--border-subtle) / 1)',
                      borderRadius: 'var(--r-chrome, 2px)',
                    }}
                  >
                    {c.kbd}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
}

// ─── Footer keycaps ──────────────────────────────────────────────────────────

function FooterChord({ glyph, label }: { glyph: string; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <kbd
        className="font-mono"
        style={{
          fontSize: 9.5,
          color: 'rgb(var(--text-secondary))',
          padding: '1px 4px',
          border: '1px solid rgb(var(--border-subtle) / 1)',
          borderRadius: 'var(--r-chrome, 2px)',
        }}
      >
        {glyph}
      </kbd>
      <span>{label}</span>
    </span>
  );
}
