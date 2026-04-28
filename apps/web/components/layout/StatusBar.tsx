'use client';

import { useEffect, useMemo, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { usePresetListStore } from '@/stores/presetListStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useWebusbStore, type WebUSBConnectionStatus } from '@/stores/webusbStore';
import { StatusSignal, type StatusVariant } from '@/components/shared/StatusSignal';
import { BoardPicker } from '@/components/shared/BoardPicker';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import { LATEST_VERSION } from '@/lib/version';

// ─── Power constants (mirrors PowerDrawPanel) ─────────────────────────────────
const MA_PER_CHANNEL = 20;      // mA per WS2812B channel at full brightness
const BOARD_IDLE_MA = 50;       // Proffieboard quiescent draw
const BOARD_MAX_MA = 5000;      // Proffieboard rated max (5 A)

// ─── Storage constants ────────────────────────────────────────────────────────
/** Typical 16 GB SD card usable space in MB (FAT32 format overhead) */
const CARD_USABLE_MB = 14_400;
/** Rough average font footprint in MB (wav samples + config) */
const MB_PER_FONT = 120;
/** Minimum config overhead in MB */
const CONFIG_OVERHEAD_MB = 2;

/** Formats milliamps as "X.XA" */
function formatAmps(ma: number): string {
  return (ma / 1000).toFixed(1) + 'A';
}

/** Pads a non-negative integer with a leading zero when it's < 10. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Returns current UTC time as "HH:MM:SS" (no trailing "UTC" — label handles it). */
function formatUtcNow(): string {
  const d = new Date();
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

// ─── Segment primitives ─────────────────────────────────────────────────────
//
// Each PFD segment is a k/v pair: uppercase-mono label + separator + value.
// Segments are separated by a hairline vertical rule to match the reference
// `.status-bar` density. Values default to text-secondary so color accents
// read clearly against the default muted field.

interface SegmentProps {
  label: string;
  children: React.ReactNode;
  /** Optional class applied to the value span — e.g. color token overrides. */
  valueClassName?: string;
  /** Optional leading glyph/signal rendered before the label. */
  leading?: React.ReactNode;
  /** Hide on narrower viewports (<1440px). */
  wideOnly?: boolean;
  /** Extra classes for the wrapper (e.g. to align a `StatusSignal`). */
  className?: string;
}

function Segment({
  label,
  children,
  valueClassName = 'text-text-secondary',
  leading,
  wideOnly = false,
  className = '',
}: SegmentProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 text-ui-xs leading-none',
        wideOnly ? 'hidden wide:inline-flex' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {leading}
      <span className="uppercase tracking-[0.08em] text-text-muted">{label}</span>
      <span aria-hidden="true" className="text-text-muted/50">
        ·
      </span>
      <span className={`tabular-nums ${valueClassName}`}>{children}</span>
    </span>
  );
}

function SegmentDivider({ wideOnly = false }: { wideOnly?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'w-px h-3 bg-border-subtle shrink-0',
        wideOnly ? 'hidden wide:inline-block' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

// ─── Connection-display helper ──────────────────────────────────────────────
//
// Pure function mapping the global `webusbStore` status (six-state enum)
// into the StatusBar's three-channel render: a `StatusSignal` variant,
// a display string, and a color class. Lives outside the component so
// TypeScript can exhaustively check the union and the test file can
// import it directly.

interface ConnDisplay {
  status: WebUSBConnectionStatus;
  variant: StatusVariant;
  text: string;
  colorClass: string;
}

/** Truncate an arbitrary device name to fit alongside CONN. */
function truncateDeviceName(name: string, max = 24): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + '…';
}

function getConnectionDisplay(
  status: WebUSBConnectionStatus,
  deviceName: string | null,
): ConnDisplay {
  switch (status) {
    case 'connecting':
      return {
        status,
        variant: 'alert',
        text: 'CONNECTING…',
        colorClass: 'text-[rgb(var(--status-warn))]',
      };
    case 'connected': {
      const suffix = deviceName ? ` · ${truncateDeviceName(deviceName)}` : '';
      return {
        status,
        variant: 'success',
        text: `CONNECTED${suffix}`,
        colorClass: 'text-[rgb(var(--status-ok))]',
      };
    }
    case 'flashing':
      return {
        status,
        variant: 'alert',
        text: 'FLASHING…',
        colorClass: 'text-[rgb(var(--status-warn))]',
      };
    case 'verifying':
      return {
        status,
        variant: 'alert',
        text: 'VERIFYING…',
        colorClass: 'text-[rgb(var(--status-warn))]',
      };
    case 'error':
      return {
        status,
        variant: 'error',
        text: 'ERROR',
        colorClass: 'text-[rgb(var(--status-error))]',
      };
    case 'idle':
    default:
      return {
        status,
        variant: 'alert',
        text: 'IDLE',
        colorClass: 'text-[rgb(var(--status-warn))]',
      };
  }
}

// Exported for the unit tests in `apps/web/tests/webusbStore.test.ts`.
export { getConnectionDisplay as getStatusBarConnectionDisplay };

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * StatusBar
 *
 * Horizontal PFD segment strip rendered at the bottom of the editor
 * workbench. Aligned with the §4 StatusBar spec in
 * `docs/UX_NORTH_STAR.md` and the reference shape at
 * `docs/design-reference/2026-04-19-claude-design/src/status-bar.jsx`.
 *
 * Segments (left → right):
 *   Power Draw · Profile · Conn · Page · Layers · Modified · Storage
 *   · Theme · Preset · UTC (wide-only) · Build
 *
 * Values are derived live from:
 *   - bladeStore (led count, color → power draw)
 *   - uiStore    (activeTab, canvasTheme, brightness)
 *   - saberProfileStore (active profile name)
 *   - presetListStore   (active preset index + name)
 *   - historyStore      (dirty flag synthesized from past.length)
 *
 * WebUSB connection is currently a TODO placeholder — the live state
 * is held inside FlashPanel's local state machine; global wiring is
 * a follow-up wave.
 */
export function StatusBar() {
  const config = useBladeStore((s) => s.config);
  const brightness = useUIStore((s) => s.brightness);
  const activeTab = useUIStore((s) => s.activeTab);
  const canvasTheme = useUIStore((s) => s.canvasTheme);

  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const profiles = useSaberProfileStore((s) => s.profiles);

  const presetEntries = usePresetListStore((s) => s.entries);
  const activeEntryId = usePresetListStore((s) => s.activeEntryId);

  // Subscribe to past.length rather than the full array so unrelated
  // internal history churn doesn't re-render the bar.
  const pastLength = useHistoryStore((s) => s.past.length);

  const ledCount = config.ledCount ?? 132;
  const baseColor = config.baseColor ?? { r: 0, g: 0, b: 255 };
  const briScale = brightness / 100;

  // ── Power draw estimate ──────────────────────────────────────────────────
  const { colorMA, powerFraction } = useMemo(() => {
    const rFrac = (baseColor.r / 255) * briScale;
    const gFrac = (baseColor.g / 255) * briScale;
    const bFrac = (baseColor.b / 255) * briScale;
    const maPerLed = (rFrac + gFrac + bFrac) * MA_PER_CHANNEL;
    const draw = ledCount * maPerLed + BOARD_IDLE_MA;
    return {
      colorMA: draw,
      powerFraction: Math.min(draw / BOARD_MAX_MA, 1),
    };
  }, [ledCount, baseColor, briScale]);

  // ── Storage budget estimate ──────────────────────────────────────────────
  // Baseline: one font + config overhead. Identical math to the previous
  // three-cluster StatusBar implementation; the PFD rewrite does not change
  // the power/storage semantics.
  const storagePct = useMemo(() => {
    const usedMB = MB_PER_FONT + CONFIG_OVERHEAD_MB;
    return Math.round((usedMB / CARD_USABLE_MB) * 100);
  }, []);
  const storageFraction = storagePct / 100;

  // ── Profile / Preset derivations ─────────────────────────────────────────
  const profileName = useMemo(() => {
    const p = profiles.find((x) => x.id === activeProfileId);
    return p?.name?.trim() || 'KYBER';
  }, [profiles, activeProfileId]);

  const activePresetInfo = useMemo(() => {
    if (!activeEntryId) return null;
    const idx = presetEntries.findIndex((e) => e.id === activeEntryId);
    if (idx < 0) return null;
    return { idx, name: presetEntries[idx].presetName };
  }, [presetEntries, activeEntryId]);

  // ── Dirty flag ───────────────────────────────────────────────────────────
  // No explicit dirty field exists today; synthesize from the history stack.
  // The first entry is the initial snapshot, so anything above 1 means the
  // user has made at least one change in the current session. A proper
  // savepoint-aware dirty flag is a future follow-up.
  const isDirty = pastLength > 1;

  // ── WebUSB connection (live from webusbStore) ───────────────────────────
  // FlashPanel publishes its local state machine into `useWebusbStore` at
  // every transition, so StatusBar can render the same status without
  // having a direct reference into FlashPanel. Reload-safe — the store is
  // pure-runtime; on page reload we fall back to 'idle'.
  const webusbStatus = useWebusbStore((s) => s.status);
  const webusbDeviceName = useWebusbStore((s) => s.deviceName);
  const {
    variant: connVariant,
    text: connText,
    colorClass: connColorClass,
    status: connStatus,
  } = getConnectionDisplay(webusbStatus, webusbDeviceName);

  // ── Power / Storage color escalation ─────────────────────────────────────
  const powerVariant: StatusVariant =
    powerFraction >= 0.85 ? 'error' : powerFraction >= 0.6 ? 'alert' : 'success';
  const powerColorClass =
    powerFraction >= 0.85
      ? 'text-[rgb(var(--status-error))]'
      : powerFraction >= 0.6
        ? 'text-[rgb(var(--status-warn))]'
        : 'text-[rgb(var(--status-ok))]';

  // Storage escalation per scope:
  //   <60%  → magenta (nominal / data readout)
  //   60–85% → amber
  //   >85%  → red
  const storageVariant: StatusVariant =
    storageFraction >= 0.85
      ? 'error'
      : storageFraction >= 0.6
        ? 'alert'
        : 'modulation';
  const storageColorStyle =
    storageFraction >= 0.85
      ? { color: 'rgb(var(--status-error))' }
      : storageFraction >= 0.6
        ? { color: 'rgb(var(--status-warn))' }
        : { color: 'rgb(var(--status-magenta, 180 106 192))' };

  // ── UTC clock (1 Hz) ─────────────────────────────────────────────────────
  // A dedicated 1 Hz timer is cheaper than the global animation frame for
  // a second-resolution field. Interval is cleared on unmount.
  const [utcTime, setUtcTime] = useState<string>(() => formatUtcNow());
  useEffect(() => {
    const id = window.setInterval(() => setUtcTime(formatUtcNow()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // ── Display helpers ──────────────────────────────────────────────────────
  const activeTabDisplay = activeTab.toUpperCase();
  const themeDisplay = canvasTheme.toUpperCase();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Status bar"
      // Overall chrome:
      //   shrink-0          — don't let flex parents compress the bar
      //   px-3 py-1         — tight horizontal padding, 4px vertical
      //   border-b          — hairline bottom rule separating from blade section
      //                      (relocated from bottom-of-app to just-under-header
      //                      on 2026-04-20 per Ken's walkthrough — StatusBar
      //                      now replaces the decorative data ticker strip that
      //                      used to sit here). The `<footer>` tag also flipped
      //                      to `<div>` since the bar is no longer at the page
      //                      footer semantically; role="status" + aria-live
      //                      keep screen-reader announcements intact.
      //   bg-bg-secondary   — slightly elevated from the canvas background
      //   flex gap-2        — horizontal strip with breathing room
      //   overflow-hidden   — never let content push the bar vertically
      //   whitespace-nowrap — keep segments on one line
      //   font-mono         — JetBrains Mono throughout per §4 StatusBar
      className="shrink-0 px-3 py-1 border-b border-border-subtle bg-bg-secondary text-text-muted flex items-center gap-2 overflow-hidden whitespace-nowrap font-mono select-none"
      style={{ height: '1.5rem' /* 24px — matches reference grid-template-rows 22–24px */ }}
    >
      {/* 1 — Power Draw ─────────────────────────────────────────────────────
          KEEP: unique-to-our-app telemetry. PFD-styled as k/v pair. */}
      <Segment
        label="PWR"
        valueClassName={`${powerColorClass} tabular-nums`}
        leading={
          <StatusSignal
            variant={powerVariant}
            size="sm"
            compact
            label={`Power status: ${powerVariant}`}
          />
        }
      >
        <span aria-hidden="true" className="text-text-muted/60 mr-0.5">
          ⚡
        </span>
        <span aria-label={`Power draw: ${formatAmps(colorMA)} of ${formatAmps(BOARD_MAX_MA)}`}>
          {formatAmps(colorMA)}
          <span className="text-text-muted/40"> / </span>
          <span className="text-text-muted">{formatAmps(BOARD_MAX_MA)}</span>
        </span>
      </Segment>
      <SegmentDivider />

      {/* 2 — Profile ────────────────────────────────────────────────────── */}
      <Segment label="Profile">{profileName}</Segment>
      <SegmentDivider />

      {/* 2.5 — Board (Modulation Routing v1.0 Preview) ──────────────────── */}
      {/* Inline BoardPicker — shows the active board + opens the modal    */}
      {/* selector. Gates every capability-sensitive feature downstream    */}
      {/* (ROUTING pill visibility, Flash button enablement, etc.).         */}
      <BoardSegment />
      <SegmentDivider />

      {/* 3 — Conn (WebUSB) — TODO placeholder until global store exists */}
      <Segment
        label="Conn"
        valueClassName={`${connColorClass} tabular-nums`}
        leading={
          <StatusSignal
            variant={connVariant}
            size="sm"
            compact
            label={`Connection status: ${connStatus}`}
          />
        }
      >
        {connText}
      </Segment>
      <SegmentDivider />

      {/* 4 — Page (active tab) — amber accent per reference */}
      <Segment label="Page" valueClassName="tabular-nums">
        <span style={{ color: 'rgb(var(--status-warn))' }}>{activeTabDisplay}</span>
      </Segment>
      <SegmentDivider />

      {/* 5 — Layers (LED count) */}
      <Segment label="LEDs" valueClassName="tabular-nums text-text-secondary">
        {ledCount}
      </Segment>
      <SegmentDivider />

      {/* 6 — Modified (dirty flag) */}
      <Segment
        label="Mod"
        valueClassName={
          isDirty
            ? 'tabular-nums text-[rgb(var(--status-warn))]'
            : 'tabular-nums text-text-muted'
        }
        leading={
          <StatusSignal
            variant={isDirty ? 'alert' : 'success'}
            size="sm"
            compact
            label={isDirty ? 'Modified: unsaved' : 'Saved'}
          />
        }
      >
        {isDirty ? '● UNSAVED' : '✓ SAVED'}
      </Segment>
      <SegmentDivider />

      {/* 7 — Storage (magenta / amber / red escalation) */}
      <Segment
        label="Stor"
        valueClassName="tabular-nums"
        leading={
          <StatusSignal
            variant={storageVariant}
            size="sm"
            compact
            label={`Storage: ${storagePct} percent used`}
          />
        }
      >
        <span style={storageColorStyle}>{storagePct}%</span>
      </Segment>
      <SegmentDivider />

      {/* 8 — Theme */}
      <Segment label="Theme" valueClassName="tabular-nums text-text-secondary">
        {themeDisplay}
      </Segment>
      <SegmentDivider />

      {/* 9 — Preset (index + name) — cyan-ish info tint when present */}
      <Segment
        label="Preset"
        valueClassName={
          activePresetInfo
            ? 'tabular-nums text-[rgb(var(--status-info))]'
            : 'tabular-nums text-text-muted'
        }
      >
        {activePresetInfo
          ? `${pad2(activePresetInfo.idx + 1)} ${activePresetInfo.name.toUpperCase()}`
          : '—'}
      </Segment>

      {/* ── Right-side spacer pushing UTC + Build to the right edge ────── */}
      <span className="flex-1" />

      {/* 10 — UTC clock (wide-only; hidden on tablet/narrow desktop) */}
      <SegmentDivider wideOnly />
      <Segment
        label="UTC"
        valueClassName="tabular-nums text-text-secondary"
        wideOnly
      >
        {utcTime}
      </Segment>

      {/* 11 — Build version (always visible; lives here per W3 scope.
              The pre-existing version breadcrumb in WorkbenchLayout's
              header is deliberately left untouched — that removal is
              W4 (header trim). Duplicate display is intentional until
              then.) */}
      <SegmentDivider />
      <Segment label="Build" valueClassName="tabular-nums text-text-secondary">
        v{LATEST_VERSION}
      </Segment>
    </div>
  );
}

// ─── BoardSegment — Modulation Routing v1.0 Preview ────────────────────────
//
// Renders the inline BoardPicker as a StatusBar segment. The picker itself
// reads + writes through `useBoardProfile` (localStorage-backed with
// cross-tab sync via CustomEvent), so every capability-sensitive
// consumer reacts in lockstep. Falls into the same Segment skeleton as
// the rest of the bar (label + value wrapper) but replaces the value
// with the compact picker button.

function BoardSegment() {
  const { boardId, setBoardId } = useBoardProfile();
  return (
    <div
      className="flex items-baseline gap-1.5 px-2 shrink-0"
      data-statusbar-board
    >
      <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
        Board
      </span>
      <BoardPicker
        variant="inline"
        selectedBoardId={boardId}
        onSelect={setBoardId}
      />
    </div>
  );
}
