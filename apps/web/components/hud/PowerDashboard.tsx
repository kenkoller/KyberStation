'use client';

import { SegmentedBar } from './SegmentedBar';
import { CornerBrackets } from './CornerBrackets';
import { ConsoleIndicator } from './ConsoleIndicator';
import { StatusSignal, type StatusVariant } from '../shared/StatusSignal';

interface PowerDashboardProps {
  powerDraw: number;   // 0-1 normalized (estimated LED power)
  memoryUsage: number; // 0-1 (flash memory budget)
  complexity: number;  // 0-1 (style complexity score)
  className?: string;
}

const POWER_STOPS: [number, string][] = [
  [0, 'rgb(var(--status-ok))'],
  [0.6, 'rgb(var(--status-warn))'],
  [0.85, 'rgb(var(--status-error))'],
];

const MEMORY_STOPS: [number, string][] = [
  [0, 'rgb(var(--status-ok))'],
  [0.7, 'rgb(var(--status-warn))'],
  [0.9, 'rgb(var(--status-error))'],
];

const COMPLEXITY_STOPS: [number, string][] = [
  [0, 'rgb(var(--status-ok))'],
  [0.5, 'rgb(var(--status-warn))'],
  [0.75, 'rgb(var(--status-error))'],
];

function getStatusVariant(
  powerDraw: number,
  memoryUsage: number,
  complexity: number,
): 'breathe' | 'blink' | 'alert' {
  const highest = Math.max(powerDraw, memoryUsage, complexity);
  if (highest > 0.85) return 'alert';
  if (highest > 0.6) return 'blink';
  return 'breathe';
}

function getStatusColor(variant: 'breathe' | 'blink' | 'alert'): string {
  switch (variant) {
    case 'alert':
      return 'rgb(var(--status-error))';
    case 'blink':
      return 'rgb(var(--status-warn))';
    default:
      return 'rgb(var(--status-ok))';
  }
}

function variantToStatusSignal(variant: 'breathe' | 'blink' | 'alert'): StatusVariant {
  switch (variant) {
    case 'alert': return 'error';
    case 'blink': return 'warning';
    default: return 'success';
  }
}

/**
 * Power and memory status display with three segmented bars.
 * Shows estimated LED power draw, flash memory budget, and style complexity
 * with color-coded thresholds and an adaptive status indicator.
 */
export function PowerDashboard({
  powerDraw,
  memoryUsage,
  complexity,
  className = '',
}: PowerDashboardProps) {
  const variant = getStatusVariant(powerDraw, memoryUsage, complexity);
  const indicatorColor = getStatusColor(variant);

  return (
    <CornerBrackets
      className={`pointer-events-auto ${className}`}
      size={10}
    >
      <div
        className="flex flex-col gap-2 p-3"
        role="group"
        aria-label="System status"
      >
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <ConsoleIndicator
            variant={variant}
            color={indicatorColor}
            size={4}
          />
          <StatusSignal
            variant={variantToStatusSignal(variant)}
            size="sm"
            compact
            label={`System status: ${variantToStatusSignal(variant)}`}
          />
          <span
            className="dot-matrix"
            style={{
              fontSize: 9,
              color: 'rgb(var(--text-muted))',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            System Status
          </span>
        </div>

        {/* Bars */}
        <div className="flex flex-col gap-1.5">
          <SegmentedBar
            value={powerDraw}
            label="POWER"
            segments={10}
            colorStops={POWER_STOPS}
            className="w-full"
          />
          <SegmentedBar
            value={memoryUsage}
            label="MEMORY"
            segments={10}
            colorStops={MEMORY_STOPS}
            className="w-full"
          />
          <SegmentedBar
            value={complexity}
            label="COMPLEXITY"
            segments={10}
            colorStops={COMPLEXITY_STOPS}
            className="w-full"
          />
        </div>
      </div>
    </CornerBrackets>
  );
}
