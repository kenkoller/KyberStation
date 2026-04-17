'use client';

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { ConsoleIndicator } from '@/components/hud/ConsoleIndicator';
import { StatusSignal, type StatusVariant } from '@/components/shared/StatusSignal';

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a Tailwind color class for a 0-1 usage fraction. */
function usageFgClass(fraction: number): string {
  if (fraction >= 0.85) return 'text-red-400';
  if (fraction >= 0.60) return 'text-yellow-400';
  return 'text-green-400';
}

/** Formats milliamps as "X.XA" */
function formatAmps(ma: number): string {
  return (ma / 1000).toFixed(1) + 'A';
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * StatusBar
 *
 * Slim full-width bar rendered at the bottom of the editor workbench.
 * Provides always-visible at-a-glance readouts without requiring a panel
 * to be open:
 *
 *  Left        — estimated power draw (⚡ X.XA / 5A), color-coded
 *  Left-center — SD storage budget (💾 XX%), color-coded
 *  Right       — active LED count
 *
 * All values are derived live from bladeStore / uiStore — no additional
 * store selectors are needed.
 */
export function StatusBar() {
  const config = useBladeStore((s) => s.config);
  const brightness = useUIStore((s) => s.brightness);

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
  // Uses ledCount as a rough proxy for style complexity (more LEDs → larger
  // config). A realistic count comes from PresetList, but StatusBar is
  // intentionally lightweight and avoids additional store subscriptions.
  const storagePct = useMemo(() => {
    // One font + config overhead as a baseline estimate
    const usedMB = MB_PER_FONT + CONFIG_OVERHEAD_MB;
    return Math.round((usedMB / CARD_USABLE_MB) * 100);
  }, []);

  const storageFraction = storagePct / 100;

  const powerFgClass = usageFgClass(powerFraction);
  const storageFgClass = usageFgClass(storageFraction);

  // Paired glyph variant for each indicator — redundant channel for
  // colorblind users + a subtle craft cue. Thresholds mirror the color
  // classes above so glyph + color always agree.
  const powerStatus: StatusVariant =
    powerFraction >= 0.85 ? 'error' : powerFraction >= 0.6 ? 'alert' : 'success';
  const storageStatus: StatusVariant =
    storageFraction >= 0.85 ? 'error' : storageFraction >= 0.6 ? 'alert' : 'success';

  return (
    <footer
      // overflow-hidden prevents tablet/narrow layouts from pushing the
      // status bar vertically. The middle storage cluster gets hidden on
      // tablet via desktop:inline-flex on its parent when needed.
      className="flex items-center justify-between px-3 border-t border-border-subtle bg-bg-deep text-text-muted font-mono select-none shrink-0 overflow-hidden whitespace-nowrap"
      style={{ height: '1.625rem' /* h-[26px] — slimmer than h-7 */ }}
      aria-label="Status bar"
    >
      {/* ── Left: Power draw ─────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        <ConsoleIndicator
          variant={powerFraction >= 0.85 ? 'alert' : powerFraction >= 0.60 ? 'blink' : 'breathe'}
          color={
            powerFraction >= 0.85
              ? 'rgb(var(--status-warn))'
              : powerFraction >= 0.60
                ? 'rgb(var(--status-warn))'
                : 'rgb(var(--status-ok))'
          }
          size={4}
        />
        <StatusSignal variant={powerStatus} size="sm" label={`Power status: ${powerStatus}`} />
        <span className="text-text-muted/60 text-ui-xs" aria-hidden="true">⚡</span>
        <span className={`text-ui-xs tabular-nums ${powerFgClass}`} aria-label={`Power draw: ${formatAmps(colorMA)}`}>
          {formatAmps(colorMA)}
        </span>
        <span className="text-text-muted/40 text-ui-xs">/</span>
        <span className="text-ui-xs text-text-muted tabular-nums">
          {formatAmps(BOARD_MAX_MA)}
        </span>
      </div>

      {/* ── Center: Storage budget ───────────────────────── */}
      <div className="flex items-center gap-1.5">
        <ConsoleIndicator
          variant={storageFraction >= 0.85 ? 'alert' : storageFraction >= 0.60 ? 'blink' : 'steady'}
          color={
            storageFraction >= 0.85
              ? 'rgb(var(--status-warn))'
              : storageFraction >= 0.60
                ? 'rgb(var(--status-warn))'
                : 'rgb(var(--status-info))'
          }
          size={4}
        />
        <StatusSignal variant={storageStatus} size="sm" label={`Storage status: ${storageStatus}`} />
        <span className="text-text-muted/60 text-ui-xs" aria-hidden="true">💾</span>
        <span className={`text-ui-xs tabular-nums ${storageFgClass}`} aria-label={`Storage used: ${storagePct} percent`}>
          {storagePct}%
        </span>
        <span className="text-text-muted/40 text-ui-xs">used</span>
      </div>

      {/* ── Right: LED count ─────────────────────────────── */}
      <div
        className="flex items-center gap-1.5 text-ui-xs tabular-nums text-text-muted"
        aria-label={`${ledCount} LEDs`}
      >
        <ConsoleIndicator variant="breathe" color="rgb(var(--accent))" size={4} />
        <StatusSignal variant="active" size="sm" label="Active LED count" />
        {ledCount}&thinsp;LEDs
      </div>
    </footer>
  );
}
