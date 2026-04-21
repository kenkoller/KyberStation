'use client';

/**
 * DeliveryRail — persistent 50px bottom bar surfacing the ship-now
 * affordances on every tab.
 *
 * Spec: `docs/UI_OVERHAUL_v2_PROPOSAL.md` §7.
 *
 * Segments (left → right):
 *   [🗡 PROFILE ▾]  [STOR X.X / Y.Y MB ●]  [EXPORT ▸]  [FLASH ▸]  [● CONN …]
 *
 * Mounts between the PerformanceBar (section 5b) and the DataTicker
 * (section 6) in WorkbenchLayout. Always visible regardless of tab —
 * per the proposal §7 "the core message is 'you can ship this at any
 * time'". PerformanceBar tab-gating (§13 / OV5) happens above; this
 * rail stays put.
 *
 * Responsive:
 *   - Desktop: full labels.
 *   - Tablet: glyphs + short labels, storage collapses to tier dot + %.
 *   - Mobile: icon-only.
 */

import { useState } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { SaberProfileSwitcher } from '@/components/editor/SaberProfileSwitcher';
import { CardWriterModal } from '@/components/editor/CardWriterModal';
import { FlashPanelModal } from '@/components/editor/FlashPanelModal';
import {
  useStorageBudget,
  type StorageTier,
  STORAGE_WARN_FRACTION,
  STORAGE_ERROR_FRACTION,
} from '@/lib/storageBudget';
import { formatBytes } from '@kyberstation/engine';

// ─── Tier → CSS color token mapping ──────────────────────────────────────────
//
// Pure function so the regression test can verify the mapping without
// a DOM. Follows the six-status-color family (§6 UX_NORTH_STAR).

export function tierColor(tier: StorageTier): string {
  switch (tier) {
    case 'error':
      return 'rgb(var(--status-error) / 1)';
    case 'warn':
      return 'rgb(var(--status-warn) / 1)';
    case 'ok':
    default:
      return 'rgb(var(--status-ok) / 1)';
  }
}

/** Threshold boundaries exported so tests can verify the classification. */
export const STORAGE_TIER_BOUNDARIES = {
  warn: STORAGE_WARN_FRACTION,
  error: STORAGE_ERROR_FRACTION,
} as const;

// ─── Segment primitives ──────────────────────────────────────────────────────

interface SegmentWrapperProps {
  children: React.ReactNode;
  /** Optional ARIA label for the segment region. */
  ariaLabel?: string;
  className?: string;
}

function SegmentWrapper({ children, ariaLabel, className = '' }: SegmentWrapperProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex items-center gap-1.5 px-3 h-full ${className}`}
    >
      {children}
    </div>
  );
}

function SegmentDivider() {
  return <span aria-hidden="true" className="w-px h-5 bg-border-subtle shrink-0" />;
}

// ─── STORAGE segment ─────────────────────────────────────────────────────────

function StorageSegment({ compact }: { compact: boolean }) {
  const { budget, tier, usageFraction } = useStorageBudget();
  const color = tierColor(tier);
  const usedLabel = formatBytes(budget.totalBytes);
  const capLabel = formatBytes(budget.cardSizeBytes);
  const percentLabel = `${Math.round(usageFraction * 100)}%`;

  // Title reads the full context even when the label is compact — screen
  // readers + tooltip hover both get the full story.
  const title = `SD storage: ${usedLabel} of ${capLabel} used (${percentLabel}) · tier ${tier}`;

  return (
    <SegmentWrapper ariaLabel="Storage usage">
      <span
        aria-hidden="true"
        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: color,
          boxShadow: `0 0 6px ${color.replace(' / 1)', ' / 0.6)')}`,
        }}
      />
      <span
        className="font-mono uppercase tracking-[0.08em] text-text-muted text-ui-xs shrink-0"
      >
        STOR
      </span>
      <span
        className="font-mono tabular-nums text-ui-xs whitespace-nowrap"
        style={{ color }}
        title={title}
      >
        {compact
          ? percentLabel
          : `${usedLabel} / ${capLabel}`}
      </span>
    </SegmentWrapper>
  );
}

// ─── EXPORT / FLASH action segments ──────────────────────────────────────────

interface ActionSegmentProps {
  label: string;
  shortLabel: string;
  glyph: string;
  onClick: () => void;
  ariaLabel: string;
  compact: boolean;
  /** Visual accent — EXPORT uses accent, FLASH uses status-warn (danger). */
  accent?: 'accent' | 'warn';
}

function ActionSegment({
  label,
  shortLabel,
  glyph,
  onClick,
  ariaLabel,
  compact,
  accent = 'accent',
}: ActionSegmentProps) {
  const textColor =
    accent === 'warn'
      ? 'rgb(var(--status-warn) / 1)'
      : 'rgb(var(--accent) / 1)';
  const borderColor =
    accent === 'warn'
      ? 'rgb(var(--status-warn) / 0.35)'
      : 'rgb(var(--accent) / 0.35)';
  const hoverBg =
    accent === 'warn'
      ? 'rgb(var(--status-warn) / 0.10)'
      : 'rgb(var(--accent) / 0.10)';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center gap-1.5 px-3 h-8 rounded-chrome font-mono uppercase tracking-[0.08em] text-ui-xs transition-colors shrink-0"
      style={{
        color: textColor,
        border: `1px solid ${borderColor}`,
        background: 'rgb(var(--bg-deep) / 0.4)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgb(var(--bg-deep) / 0.4)';
      }}
    >
      <span aria-hidden="true">{glyph}</span>
      <span>{compact ? shortLabel : label}</span>
      <span aria-hidden="true" className="text-text-muted">
        ▸
      </span>
    </button>
  );
}

// ─── CONN segment (passive, mirrors StatusBar CONN) ──────────────────────────
//
// No global WebUSB store exists yet (FlashPanel holds its state locally),
// so this mirrors the StatusBar's placeholder "IDLE" readout. When the
// global store lands, swap the hardcoded 'idle' for the actual hook —
// same swap the StatusBar docs in getConnectionDisplay() call out.

type ConnStatus = 'connected' | 'idle' | 'error';

function connDisplay(status: ConnStatus): { text: string; color: string } {
  switch (status) {
    case 'connected':
      return { text: 'READY', color: 'rgb(var(--status-ok) / 1)' };
    case 'error':
      return { text: 'ERROR', color: 'rgb(var(--status-error) / 1)' };
    case 'idle':
    default:
      return { text: 'IDLE', color: 'rgb(var(--status-warn) / 1)' };
  }
}

function ConnSegment({ compact }: { compact: boolean }) {
  // TODO(OV5.follow-up): swap this for a global WebUSB connection
  // signal once the FlashPanel's internal state machine is lifted into
  // a store. Rail + StatusBar should both read from the same source.
  const status: ConnStatus = 'idle';
  const { text, color } = connDisplay(status);
  return (
    <SegmentWrapper ariaLabel="WebUSB connection status">
      <span
        aria-hidden="true"
        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: color,
          boxShadow: `0 0 6px ${color.replace(' / 1)', ' / 0.6)')}`,
        }}
      />
      <span className="font-mono uppercase tracking-[0.08em] text-text-muted text-ui-xs shrink-0">
        CONN
      </span>
      <span
        className="font-mono tabular-nums text-ui-xs whitespace-nowrap"
        style={{ color }}
      >
        {compact ? '·' : text}
      </span>
    </SegmentWrapper>
  );
}

// ─── Main DeliveryRail ───────────────────────────────────────────────────────

/**
 * Persistent bottom rail. Mounted once in WorkbenchLayout section 5c,
 * between PerformanceBar (5b) and DataTicker (6). Rail height = 50px.
 *
 * The modals live inside this component's state so the rail is
 * self-contained — WorkbenchLayout doesn't need to know which modal is
 * open. Both modals portal-mount to document.body.
 */
export function DeliveryRail() {
  const [exportOpen, setExportOpen] = useState(false);
  const [flashOpen, setFlashOpen] = useState(false);

  // Observe viewport — below the desktop breakpoint (1024px) the rail
  // should compact labels to short forms (per §10 responsive table).
  // `useBreakpoint()` returns { breakpoint, isMobile, isTablet, isWide };
  // anything tablet or below collapses labels.
  const { breakpoint } = useBreakpoint();
  const compact = breakpoint === 'phone' || breakpoint === 'tablet';

  return (
    <>
      <section
        role="region"
        aria-label="Delivery rail"
        className="shrink-0 border-t border-border-subtle bg-bg-secondary/60 flex items-center"
        style={{ height: 50 }}
      >
        {/* PROFILE — left-most. Wraps SaberProfileSwitcher in compact mode
            so the dropdown opens upward (dropdown would otherwise collide
            with the rail's own 50px height). */}
        <SegmentWrapper ariaLabel="Active saber profile">
          <SaberProfileSwitcher variant="compact" glyph="🗡" />
        </SegmentWrapper>

        <SegmentDivider />

        {/* STORAGE — passive readout, tier-colored dot. */}
        <StorageSegment compact={compact} />

        <SegmentDivider />

        {/* EXPORT — opens CardWriter modal. */}
        <div className="flex items-center h-full px-2">
          <ActionSegment
            label="Export"
            shortLabel="EXP"
            glyph="⬇"
            onClick={() => setExportOpen(true)}
            ariaLabel="Open export to SD card"
            compact={compact}
            accent="accent"
          />
        </div>

        {/* FLASH — opens FlashPanel modal. */}
        <div className="flex items-center h-full px-2">
          <ActionSegment
            label="Flash"
            shortLabel="FLS"
            glyph="⚡"
            onClick={() => setFlashOpen(true)}
            ariaLabel="Open flash to saber"
            compact={compact}
            accent="warn"
          />
        </div>

        {/* Flex spacer — pushes CONN to the right. */}
        <div className="flex-1" />

        <SegmentDivider />

        {/* CONN — passive readout, right-most. */}
        <ConnSegment compact={compact} />
      </section>

      <CardWriterModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
      <FlashPanelModal isOpen={flashOpen} onClose={() => setFlashOpen(false)} />
    </>
  );
}
