'use client';

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

// ─── Power Constants ───

/** mA per WS2812B LED channel at full brightness (one color channel) */
const MA_PER_CHANNEL = 20;
/** Number of color channels per LED (R, G, B) */
const CHANNELS_PER_LED = 3;
/** Max mA per LED at full white (60mA typical) */
const MAX_MA_PER_LED = MA_PER_CHANNEL * CHANNELS_PER_LED;
/** Proffieboard quiescent current draw (CPU, amplifier idle, etc.) */
const BOARD_IDLE_MA = 50;
/** Common battery capacities (mAh) */
const BATTERY_PRESETS = [
  { label: '18650 (3500 mAh)', capacity: 3500 },
  { label: '18650 (3000 mAh)', capacity: 3000 },
  { label: '18650 (2600 mAh)', capacity: 2600 },
  { label: '21700 (5000 mAh)', capacity: 5000 },
  { label: '14500 (800 mAh)', capacity: 800 },
];
/** Proffieboard max recommended continuous draw (mA) */
const BOARD_MAX_MA = 5000;
/** Battery safety margin — real capacity is ~80% of rated */
const BATTERY_DERATING = 0.80;

/** Strip type to strip count mapping */
function getStripCount(stripType: string): number {
  const map: Record<string, number> = {
    'single': 1, 'dual-neo': 2, 'tri-neo': 3, 'quad-neo': 4, 'penta-neo': 5,
    'tri-cree': 3, 'quad-cree': 4, 'penta-cree': 5,
  };
  return map[stripType] ?? 1;
}

function isInHilt(stripType: string): boolean {
  return stripType?.includes('cree') ?? false;
}

// ─── Component ───

export function PowerDrawPanel() {
  const config = useBladeStore((s) => s.config);
  const brightness = useUIStore((s) => s.brightness);
  const batteryIdx = useUIStore((s) => s.batteryPresetIdx ?? 0);
  const setBatteryIdx = useUIStore((s) => s.setBatteryPresetIdx);

  const stripType = (config.stripType as string) ?? 'single';
  const stripCount = getStripCount(stripType);
  const ledCount = config.ledCount ?? 132;
  const baseColor = config.baseColor ?? { r: 0, g: 0, b: 255 };
  const briScale = brightness / 100;

  const stats = useMemo(() => {
    const totalLEDs = isInHilt(stripType) ? stripCount : ledCount * stripCount;

    // Per-LED current at current color and brightness
    const rFrac = (baseColor.r / 255) * briScale;
    const gFrac = (baseColor.g / 255) * briScale;
    const bFrac = (baseColor.b / 255) * briScale;
    const maPerLed = (rFrac + gFrac + bFrac) * MA_PER_CHANNEL;

    // Peak: all LEDs at full white, full brightness
    const peakMA = totalLEDs * MAX_MA_PER_LED * briScale + BOARD_IDLE_MA;

    // Current color draw
    const colorMA = totalLEDs * maPerLed + BOARD_IDLE_MA;

    // Average estimate: styles average ~60% duty cycle over time
    const avgDuty = 0.60;
    const avgMA = totalLEDs * maPerLed * avgDuty + BOARD_IDLE_MA;

    // Battery runtime
    const battery = BATTERY_PRESETS[batteryIdx] ?? BATTERY_PRESETS[0];
    const usableCapacity = battery.capacity * BATTERY_DERATING;
    const runtimeMinutes = avgMA > 0 ? (usableCapacity / avgMA) * 60 : 0;

    // Per-channel breakdown
    const rMA = totalLEDs * rFrac * MA_PER_CHANNEL;
    const gMA = totalLEDs * gFrac * MA_PER_CHANNEL;
    const bMA = totalLEDs * bFrac * MA_PER_CHANNEL;

    return {
      totalLEDs,
      peakMA: Math.round(peakMA),
      colorMA: Math.round(colorMA),
      avgMA: Math.round(avgMA),
      runtimeMinutes: Math.round(runtimeMinutes),
      rMA: Math.round(rMA),
      gMA: Math.round(gMA),
      bMA: Math.round(bMA),
      overLimit: peakMA > BOARD_MAX_MA,
      batteryLabel: battery.label,
    };
  }, [ledCount, stripType, stripCount, baseColor, briScale, batteryIdx]);

  // Visual intensity — how full is the power gauge. Tokenised to the
  // global status palette so the aviation R/G/B semantic reads the same
  // across all 30 themes.
  const gaugePercent = Math.min(100, (stats.colorMA / BOARD_MAX_MA) * 100);
  const gaugeTokenVar =
    gaugePercent > 80 ? '--status-error' : gaugePercent > 50 ? '--status-warn' : '--status-ok';

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
        Power Draw
        <HelpTooltip text="Estimated LED power consumption based on your blade configuration, current color, and brightness. WS2812B LEDs draw up to 60mA per LED at full white. Proffieboard V3.9 supports up to 5A continuous. See also: Blade Hardware panel for LED count and strip config." proffie="maxLedsPerStrip / PowerPINS<>" />
      </h3>

      {/* Main power gauge */}
      <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-ui-sm text-text-secondary">Current Draw</span>
          <span
            className="text-lg font-bold font-mono tabular-nums"
            style={{ color: `rgb(var(${gaugeTokenVar}))` }}
          >
            {stats.colorMA.toLocaleString()} mA
          </span>
        </div>
        <div
          className="h-3 bg-bg-deep rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(gaugePercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Power draw gauge"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${gaugePercent}%`,
              background: `rgb(var(${gaugeTokenVar}))`,
            }}
          />
        </div>
        <div className="flex justify-between text-ui-xs text-text-muted">
          <span>0 mA</span>
          <span>{BOARD_MAX_MA.toLocaleString()} mA max</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <div className="text-ui-xs text-text-muted">Peak (white)</div>
          <div className="text-ui-sm font-mono text-text-secondary">{stats.peakMA.toLocaleString()} mA</div>
        </div>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <div className="text-ui-xs text-text-muted">Avg (~60% duty)</div>
          <div className="text-ui-sm font-mono text-text-secondary">{stats.avgMA.toLocaleString()} mA</div>
        </div>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <div className="text-ui-xs text-text-muted">Total LEDs</div>
          <div className="text-ui-sm font-mono text-text-secondary">{stats.totalLEDs} ({stripCount}x strip)</div>
        </div>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <div className="text-ui-xs text-text-muted">Runtime Est.</div>
          <div className="text-ui-sm font-mono text-text-secondary">
            {stats.runtimeMinutes >= 60
              ? `${Math.floor(stats.runtimeMinutes / 60)}h ${stats.runtimeMinutes % 60}m`
              : `${stats.runtimeMinutes}m`
            }
          </div>
        </div>
      </div>

      {/* Per-channel breakdown — R/G/B stay as literal R/G/B channel colors
          by design (those are color-channel identities, not chrome). */}
      <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle space-y-1.5">
        <div className="text-ui-xs text-text-muted mb-1">Channel Breakdown</div>
        {[
          { label: 'R', value: stats.rMA, color: '#ef4444' },
          { label: 'G', value: stats.gMA, color: '#22c55e' },
          { label: 'B', value: stats.bMA, color: '#3b82f6' },
        ].map((ch) => {
          const chPercent = stats.colorMA > BOARD_IDLE_MA ? (ch.value / (stats.colorMA - BOARD_IDLE_MA)) * 100 : 0;
          return (
            <div key={ch.label} className="flex items-center gap-2">
              <span className="text-ui-xs font-mono w-4" style={{ color: ch.color }}>{ch.label}</span>
              <div className="flex-1 h-2 bg-bg-deep rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, chPercent)}%`, opacity: 0.7, background: ch.color }}
                />
              </div>
              <span className="text-ui-xs font-mono text-text-muted w-14 text-right tabular-nums">{ch.value} mA</span>
            </div>
          );
        })}
      </div>

      {/* Battery selector */}
      <div className="flex items-center gap-2">
        <span className="text-ui-xs text-text-muted shrink-0">Battery:</span>
        <select
          value={batteryIdx}
          onChange={(e) => setBatteryIdx?.(Number(e.target.value))}
          aria-label="Battery type"
          className="flex-1 bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-xs text-text-secondary"
        >
          {BATTERY_PRESETS.map((bp, i) => (
            <option key={i} value={i}>{bp.label}</option>
          ))}
        </select>
      </div>

      {/* Warnings */}
      {stats.overLimit && (
        <div
          className="text-ui-xs p-2 rounded border flex items-start gap-2"
          style={{
            background: 'rgb(var(--status-error) / 0.1)',
            borderColor: 'rgb(var(--status-error) / 0.3)',
            color: 'rgb(var(--status-error))',
          }}
        >
          <span aria-hidden="true">✕</span>
          <span>
            Peak draw ({stats.peakMA.toLocaleString()} mA) exceeds Proffieboard 5A limit.
            Reduce LED count, brightness, or use a lighter color.
          </span>
        </div>
      )}
      {stats.runtimeMinutes < 30 && !stats.overLimit && (
        <div
          className="text-ui-xs p-2 rounded border flex items-start gap-2"
          style={{
            background: 'rgb(var(--status-warn) / 0.1)',
            borderColor: 'rgb(var(--status-warn) / 0.3)',
            color: 'rgb(var(--status-warn))',
          }}
        >
          <span aria-hidden="true">⚠</span>
          <span>
            Estimated runtime under 30 minutes. Consider a higher capacity battery or lower brightness.
          </span>
        </div>
      )}
    </div>
  );
}
