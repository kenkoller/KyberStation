'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  BOARD_PROFILES,
  type BoardProfile,
  type BoardStatus,
} from '@/lib/boardProfiles';
import { useModalDialog } from '@/hooks/useModalDialog';
import { playUISound } from '@/lib/uiSounds';

// ─── BoardPicker — Board Capability System entry surface ───────────────
//
// Two rendering variants from one component:
//   • `variant="modal"` (default) — centered portal dialog with the full
//     grid of 6 board cards. Used by the blade-creation wizard (required
//     step) and as the target of the inline quick-switcher.
//   • `variant="inline"` — compact ~160px button-dropdown for the
//     StatusBar. Renders a chip summary and opens the modal on click.
//
// The component is purely presentational: selection state lives in the
// caller via `selectedBoardId` + `onSelect`. Most callers will want to
// wire it to `useBoardProfile()` which owns the localStorage-backed
// selection — BoardPicker stays decoupled so it can render inside
// flows that haven't committed the choice yet (the wizard, for
// example, may want a user's click to stay local until they finish).
//
// Status badges + "preview-only" note come directly from the profile
// registry (`BoardProfile.status`). The only board we call out as
// "hardware-validated" is Proffieboard V3.9 — per the comment block in
// `boardProfiles.ts`, that's the one board whose firmware + flash has
// been validated end-to-end against real hardware.
//
// ── Styling ────────────────────────────────────────────────────────────
//
// Uses the existing theme tokens in `globals.css` exclusively:
//   • `--bg-card` / `--bg-surface` / `--bg-deep` / `--bg-primary` for
//     dialog + card chrome
//   • `--accent` / `--accent-dim` for the selected-card highlight
//   • `--status-ok` / `--status-warn` / `--status-info` for the status
//     chip colors (mapped from `BoardStatus` below)
//   • `--border-subtle` / `--border-light` for unselected-card borders
//   • `--r-interactive` / `--r-chrome` radii
//
// No new tokens needed — the `--status-*` palette already covers the
// full-support / partial-support / preview-only gradient (green /
// amber / blue). Leaving further design-system refinement (e.g. a
// dedicated `--board-status-*` group) as a follow-up.

// ─── Helpers (exported for tests) ────────────────────────────────────

/**
 * Mapping from `BoardStatus` → uppercased chip text. Exported so tests
 * can assert the visible label without depending on component markup.
 */
export const STATUS_LABELS: Record<BoardStatus, string> = {
  'full-support': 'FULL',
  'partial-support': 'PARTIAL',
  'preview-only': 'PREVIEW ONLY',
};

/** Status → CSS token (space-separated rgb triple) for chip coloring. */
export const STATUS_TOKENS: Record<BoardStatus, string> = {
  'full-support': '--status-ok',
  'partial-support': '--status-warn',
  'preview-only': '--status-info',
};

/**
 * True when a board has been end-to-end hardware-validated (flash →
 * boot → ignite on real hardware). Currently only Proffieboard V3.9
 * qualifies — see `CLAUDE.md` 2026-04-20 session notes.
 */
export function isHardwareValidated(profile: BoardProfile): boolean {
  return profile.id === 'proffie-v3.9';
}

/** Format flash size in KiB for card summary. */
export function formatFlashKiB(bytes: number): string {
  return `${Math.round(bytes / 1024)} KiB`;
}

/** Short plain-language summary shown on every card. */
export function summarizeBoard(profile: BoardProfile): string {
  const buttons = `${profile.buttonCount}-button`;
  return `${profile.maxLedCount} LED · ${formatFlashKiB(profile.flashSize)} · ${buttons}`;
}

// ─── Props ───────────────────────────────────────────────────────────

export interface BoardPickerProps {
  /** Currently-selected board id. Card with this id renders with accent. */
  selectedBoardId: string;
  /** Invoked when the user picks a board. The caller commits. */
  onSelect: (boardId: string) => void;
  /** `modal` (default) renders a centered portal dialog; `inline` renders a button-dropdown. */
  variant?: 'modal' | 'inline';
  /** Modal-only: invoked when the user dismisses (backdrop / ESC / close button). */
  onClose?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function BoardPicker(props: BoardPickerProps) {
  const { variant = 'modal' } = props;
  if (variant === 'inline') {
    return <BoardPickerInline {...props} />;
  }
  return <BoardPickerModal {...props} />;
}

// ─── Inline variant ──────────────────────────────────────────────────

function BoardPickerInline({
  selectedBoardId,
  onSelect,
}: BoardPickerProps) {
  const [open, setOpen] = useState(false);

  const selected =
    BOARD_PROFILES.find((b) => b.id === selectedBoardId) ??
    BOARD_PROFILES[0];
  const statusLabel = STATUS_LABELS[selected.status];
  const statusToken = STATUS_TOKENS[selected.status];

  const handleModalSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
    },
    [onSelect],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Board: ${selected.displayName} (${statusLabel})`}
        className="flex items-center gap-2 h-7 px-2 text-ui-xs font-mono uppercase tracking-wider
          text-text-primary bg-bg-surface border border-border-subtle
          hover:border-accent/50 hover:bg-bg-card transition-colors
          rounded-chrome"
        style={{ minWidth: 160, maxWidth: 220 }}
        data-testid="board-picker-inline"
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: `rgb(var(${statusToken}))`,
            boxShadow: `0 0 4px rgb(var(${statusToken}) / 0.6)`,
            flexShrink: 0,
          }}
        />
        <span className="text-text-muted shrink-0">BOARD</span>
        <span className="text-text-muted" aria-hidden="true">
          ·
        </span>
        <span className="truncate text-text-primary">
          {selected.displayName}
        </span>
      </button>
      {open && (
        <BoardPickerModal
          selectedBoardId={selectedBoardId}
          onSelect={handleModalSelect}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Modal variant ───────────────────────────────────────────────────

function BoardPickerModal({
  selectedBoardId,
  onSelect,
  onClose,
}: BoardPickerProps) {
  const handleClose = useCallback(() => {
    playUISound('modal-close');
    onClose?.();
  }, [onClose]);

  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen: true,
    onClose: handleClose,
  });

  useEffect(() => {
    playUISound('modal-open');
  }, []);

  // SSR safety for createPortal — only relevant after mount, where
  // document.body exists. Until then, we render the dialog inline so
  // SSR output + first client render match (prevents hydration
  // mismatch warnings).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center"
      style={{
        background: 'rgba(6, 8, 11, 0.72)',
        paddingTop: '10vh',
        paddingBottom: '10vh',
        paddingLeft: 20,
        paddingRight: 20,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) handleClose();
      }}
      data-testid="board-picker-modal-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-picker-title"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 880,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 20vh)',
          background: 'rgb(var(--bg-deep))',
          border: '1px solid rgb(var(--border-light) / 1)',
          borderRadius: 'var(--r-interactive, 4px)',
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.6), 0 4px 10px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        data-testid="board-picker-modal"
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgb(var(--border-subtle) / 1)' }}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2
              id="board-picker-title"
              className="text-ui-sm font-semibold uppercase tracking-widest text-accent font-cinematic"
              style={{ letterSpacing: '0.18em' }}
            >
              Select Board
            </h2>
            <p className="text-ui-xs text-text-muted">
              Board capability gates styles, effects, modulation, and flash.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close board picker"
              className="text-text-muted hover:text-text-primary transition-colors
                w-6 h-6 flex items-center justify-center text-ui-md rounded-chrome"
              data-testid="board-picker-close"
            >
              {'\u2715'}
            </button>
          )}
        </header>

        {/* Grid */}
        <div
          className="grid gap-3 p-4 overflow-y-auto"
          style={{
            gridTemplateColumns:
              'repeat(auto-fill, minmax(240px, 1fr))',
            flex: 1,
          }}
          data-testid="board-picker-grid"
        >
          {BOARD_PROFILES.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              selected={board.id === selectedBoardId}
              onSelect={onSelect}
            />
          ))}
        </div>

        {/* Footer legend */}
        <footer
          className="flex items-center gap-3 px-4 py-2 text-ui-xs font-mono
            text-text-muted"
          style={{
            borderTop: '1px solid rgb(var(--border-subtle) / 1)',
            background: 'rgb(var(--bg-primary))',
            letterSpacing: '0.06em',
          }}
        >
          <LegendChip status="full-support" />
          <LegendChip status="partial-support" />
          <LegendChip status="preview-only" />
          <span style={{ flex: 1 }} />
          <span>ESC to close</span>
        </footer>
      </div>
    </div>
  );

  // Before mount (SSR + first client render), render inline so
  // server + client markup agree. After mount, relocate via portal so
  // the dialog escapes any transformed / clipped ancestor.
  if (!mounted) return dialog;
  return createPortal(dialog, document.body);
}

// ─── Card subcomponent ───────────────────────────────────────────────

interface BoardCardProps {
  board: BoardProfile;
  selected: boolean;
  onSelect: (boardId: string) => void;
}

function BoardCard({ board, selected, onSelect }: BoardCardProps) {
  const statusLabel = STATUS_LABELS[board.status];
  const statusToken = STATUS_TOKENS[board.status];
  const validated = isHardwareValidated(board);
  const isPreview = board.status === 'preview-only';

  return (
    <button
      type="button"
      onClick={() => onSelect(board.id)}
      aria-pressed={selected}
      aria-label={`${board.displayName} — ${statusLabel}`}
      className="relative flex flex-col items-stretch gap-2 p-3 text-left
        transition-colors cursor-pointer rounded-interactive"
      style={{
        background: selected
          ? 'rgb(var(--accent) / 0.08)'
          : 'rgb(var(--bg-card))',
        border: selected
          ? '1px solid rgb(var(--accent))'
          : '1px solid var(--border-subtle)',
        boxShadow: selected
          ? '0 0 12px rgb(var(--accent) / 0.24), inset 0 0 0 1px rgb(var(--accent) / 0.5)'
          : 'none',
        minHeight: 148,
      }}
      data-testid={`board-card-${board.id}`}
      data-selected={selected ? 'true' : 'false'}
    >
      {/* Top row: status chip + validated mark */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-ui-xs
            font-mono uppercase tracking-widest rounded-chrome"
          style={{
            background: `rgb(var(${statusToken}) / 0.12)`,
            color: `rgb(var(${statusToken}))`,
            border: `1px solid rgb(var(${statusToken}) / 0.4)`,
            letterSpacing: '0.08em',
          }}
          data-testid={`board-status-${board.id}`}
        >
          <span
            aria-hidden="true"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: `rgb(var(${statusToken}))`,
            }}
          />
          {statusLabel}
        </span>
        {validated && (
          <span
            className="text-ui-xs font-mono uppercase tracking-widest"
            style={{
              color: 'rgb(var(--status-ok))',
              letterSpacing: '0.06em',
            }}
            title="End-to-end hardware validated 2026-04-20"
            data-testid={`board-validated-${board.id}`}
          >
            {'\u2713'} hardware-validated
          </span>
        )}
      </div>

      {/* Manufacturer + name */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-ui-xs uppercase tracking-widest text-text-muted truncate">
          {board.manufacturer}
        </span>
        <span className="text-ui-lg font-semibold text-text-primary truncate">
          {board.displayName}
        </span>
      </div>

      {/* Stats row */}
      <div
        className="flex flex-wrap gap-x-3 gap-y-1 text-ui-xs font-mono
          text-text-secondary tabular-nums"
        data-testid={`board-stats-${board.id}`}
      >
        <Stat
          label="LEDS"
          value={String(board.maxLedCount)}
          testId={`board-leds-${board.id}`}
        />
        <Stat
          label="FLASH"
          value={formatFlashKiB(board.flashSize)}
          testId={`board-flash-${board.id}`}
        />
        <Stat
          label="BTN"
          value={String(board.buttonCount)}
          testId={`board-btn-${board.id}`}
        />
      </div>

      {/* Footer note (preview-only callout) */}
      {isPreview && (
        <p
          className="text-ui-xs leading-relaxed"
          style={{ color: 'rgb(var(--status-info))' }}
          data-testid={`board-preview-note-${board.id}`}
        >
          Can't flash from KyberStation yet — designed for visualization.
        </p>
      )}
    </button>
  );
}

function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1" data-testid={testId}>
      <span className="text-text-muted uppercase tracking-widest">{label}</span>
      <span className="text-text-primary">{value}</span>
    </span>
  );
}

function LegendChip({ status }: { status: BoardStatus }) {
  const label = STATUS_LABELS[status];
  const token = STATUS_TOKENS[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: `rgb(var(${token}))`,
        }}
      />
      <span style={{ letterSpacing: '0.08em' }}>{label}</span>
    </span>
  );
}
