'use client';

// ─── AppPerfStrip — consolidated status + perf footer (W11, 2026-04-22) ─────
//
// Single horizontal bar at the bottom of the editor. W11 consolidated:
//
//   - Former StatusBar (PWR / PROFILE / CONN / LEDs / MOD / STOR /
//     THEME / PRESET / UTC / BUILD) — was mounted under the header.
//   - Former action-bar `● LIVE` indicator — next to the effect chips.
//   - Former Blade Dynamics right-column readouts (PRESET / STATE /
//     PROFILE / LEDS / RMS) — lived inside PerformanceBar.
//   - Original AppPerfStrip contents (APP FPS + GFX HIGH/MED/LOW +
//     hover popover of app-perf metrics).
//
// Everything informational now reads from one bar. Action surfaces
// (Delivery Rail profile dropdown, FLASH, EXPORT) stay separate.
//
// Height: 26px. Segments lay out left → right with hairline dividers.
// UTC + Build collapse at narrower widths (`wide-only`). Hover
// anywhere on the bar reveals the perf-hint popover (FPS frame-ms,
// canvas count, hottest canvas, GFX quality hints).

import { useEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import {
  useAccessibilityStore,
  type GraphicsQuality,
} from '@/stores/accessibilityStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { usePresetListStore } from '@/stores/presetListStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useRmsLevel } from '@/hooks/useRmsLevel';
import { LATEST_VERSION } from '@/lib/version';

// ─── Power / storage constants (mirror the old StatusBar) ──────────────────
const MA_PER_CHANNEL = 20;
const BOARD_IDLE_MA = 50;
const BOARD_MAX_MA = 5000;
const CARD_USABLE_MB = 14_400;
const MB_PER_FONT = 120;
const CONFIG_OVERHEAD_MB = 2;

function formatAmps(ma: number): string {
  return (ma / 1000).toFixed(1) + 'A';
}
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function formatUtcNow(): string {
  const d = new Date();
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

// ─── Exported perf helpers (preserved for tests) ────────────────────────────

export function classifyFps(fps: number): 'ok' | 'warn' | 'error' {
  if (fps >= 50) return 'ok';
  if (fps >= 30) return 'warn';
  return 'error';
}

export function describePerfHints(input: {
  fps: number;
  canvasCount: number;
  hotCanvasArea: number;
  quality: GraphicsQuality;
}): string[] {
  const reasons: string[] = [];
  if (input.fps < 30) reasons.push('FPS below 30 — reduce canvas count or drop GFX quality.');
  if (input.canvasCount > 20) reasons.push(`${input.canvasCount} canvases mounted — close analysis tabs you aren't using.`);
  if (input.hotCanvasArea > 2_000_000) reasons.push('A large canvas is rasterizing each frame — consider shrinking the blade preview or closing the expanded analysis slot.');
  if (input.quality === 'high' && input.fps < 45) reasons.push('Running at High quality — click Medium or Low to cap the frame rate.');
  if (reasons.length === 0) reasons.push('Running smooth — nothing to report.');
  return reasons.slice(0, 3);
}

// ─── Segment primitives ────────────────────────────────────────────────────

interface SegmentProps {
  label: string;
  children: ReactNode;
  valueClassName?: string;
  wideOnly?: boolean;
  /** Optional leading glyph — tiny status dot placed before the label. */
  leadingDot?: string;
}

function Segment({
  label,
  children,
  valueClassName = 'text-text-secondary',
  wideOnly = false,
  leadingDot,
}: SegmentProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 text-ui-xs leading-none shrink-0',
        wideOnly ? 'hidden wide:inline-flex' : '',
      ].filter(Boolean).join(' ')}
    >
      {leadingDot && (
        <span
          aria-hidden="true"
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: leadingDot }}
        />
      )}
      <span className="uppercase tracking-[0.08em] text-text-muted">{label}</span>
      <span aria-hidden="true" className="text-text-muted/50">·</span>
      <span className={`tabular-nums ${valueClassName}`}>{children}</span>
    </span>
  );
}

function Divider({ wideOnly = false }: { wideOnly?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'w-px h-3 bg-border-subtle shrink-0',
        wideOnly ? 'hidden wide:inline-block' : '',
      ].filter(Boolean).join(' ')}
    />
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export interface AppPerfStripProps {
  /** Engine ref for the live blade RMS readout (shared with ShiftLightRail). */
  engineRef?: RefObject<BladeEngine | null>;
}

export function AppPerfStrip({ engineRef }: AppPerfStripProps) {
  // ── Stores ──
  const config = useBladeStore((s) => s.config);
  const brightness = useUIStore((s) => s.brightness);
  const isOn = useBladeStore((s) => s.isOn);
  const bladeState = useBladeStore((s) => s.bladeState);
  const canvasTheme = useUIStore((s) => s.canvasTheme);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const profiles = useSaberProfileStore((s) => s.profiles);
  const presetEntries = usePresetListStore((s) => s.entries);
  const activeEntryId = usePresetListStore((s) => s.activeEntryId);
  const pastLength = useHistoryStore((s) => s.past.length);
  const graphicsQuality = useAccessibilityStore((s) => s.graphicsQuality);
  const setGraphicsQuality = useAccessibilityStore((s) => s.setGraphicsQuality);

  // ── Live measurements ──
  const fps = useFps();
  // Shift-light shares the same RMS via useRmsLevel, but the hook is
  // cheap (one RAF per usage, no duplicate buffer reads) so calling it
  // again here is fine for the readout.
  const rms = useRmsLevel(engineRef ?? { current: null }, true);

  // ── Derivations ──
  const ledCount = config.ledCount ?? 132;
  const baseColor = config.baseColor ?? { r: 0, g: 0, b: 255 };
  const briScale = brightness / 100;

  const { colorMA, powerFraction } = useMemo(() => {
    const rFrac = (baseColor.r / 255) * briScale;
    const gFrac = (baseColor.g / 255) * briScale;
    const bFrac = (baseColor.b / 255) * briScale;
    const maPerLed = (rFrac + gFrac + bFrac) * MA_PER_CHANNEL;
    const draw = ledCount * maPerLed + BOARD_IDLE_MA;
    return { colorMA: draw, powerFraction: Math.min(draw / BOARD_MAX_MA, 1) };
  }, [ledCount, baseColor, briScale]);

  const storagePct = useMemo(() => {
    const usedMB = MB_PER_FONT + CONFIG_OVERHEAD_MB;
    return Math.round((usedMB / CARD_USABLE_MB) * 100);
  }, []);

  const profileName = useMemo(
    () => profiles.find((x) => x.id === activeProfileId)?.name?.trim() || 'KYBER',
    [profiles, activeProfileId],
  );

  const activePresetName = useMemo(() => {
    if (!activeEntryId) return config.name ?? '—';
    const e = presetEntries.find((x) => x.id === activeEntryId);
    return e?.presetName ?? config.name ?? '—';
  }, [presetEntries, activeEntryId, config.name]);

  const isDirty = pastLength > 1;

  // Hydration-safe: initialise UTC to an empty string so server + client
  // agree on the first paint. The effect below fills it in after mount
  // and ticks every second thereafter.
  const [utcTime, setUtcTime] = useState<string>('');
  useEffect(() => {
    setUtcTime(formatUtcNow());
    const id = window.setInterval(() => setUtcTime(formatUtcNow()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // ── Perf popover metrics ──
  const [hovered, setHovered] = useState(false);
  const [metrics, setMetrics] = useState({
    canvasCount: 0,
    hotCanvasArea: 0,
    frameMs: 16.67,
  });
  useEffect(() => {
    if (!hovered) return;
    const cs = Array.from(document.querySelectorAll('canvas'));
    let hot = 0;
    for (const c of cs) {
      const r = c.getBoundingClientRect();
      const area = Math.round(r.width) * Math.round(r.height);
      if (area > hot) hot = area;
    }
    setMetrics({
      canvasCount: cs.length,
      hotCanvasArea: hot,
      frameMs: fps > 0 ? 1000 / fps : 0,
    });
  }, [hovered, fps]);

  // ── Color escalations ──
  const powerColor = powerFraction >= 0.85
    ? 'rgb(var(--status-error))'
    : powerFraction >= 0.6
      ? 'rgb(var(--status-warn))'
      : 'rgb(var(--status-ok))';
  const storageFrac = storagePct / 100;
  const storageColor = storageFrac >= 0.85
    ? 'rgb(var(--status-error))'
    : storageFrac >= 0.6
      ? 'rgb(var(--status-warn))'
      : 'rgb(var(--status-magenta))';
  const fpsBucket = classifyFps(fps);
  const fpsColor = fpsBucket === 'ok'
    ? 'rgb(var(--status-ok))'
    : fpsBucket === 'warn'
      ? 'rgb(var(--status-warn))'
      : 'rgb(var(--status-error))';
  const stateText = bladeState === 'on' ? 'LIVE'
    : bladeState === 'igniting' ? 'IGNITING'
    : bladeState === 'retracting' ? 'RETRACTING'
    : bladeState === 'preon' ? 'PREON'
    : 'IDLE';
  const stateColor = isOn ? 'rgb(var(--status-ok))' : 'rgb(var(--text-muted))';
  const rmsPct = Math.round(rms * 100);
  const rmsColor = rms > 0.75 ? 'rgb(var(--status-error))'
    : rms > 0.5 ? 'rgb(var(--status-warn))'
    : 'rgb(var(--status-ok))';
  const connColor = 'rgb(var(--status-warn))';

  const hints = describePerfHints({
    fps,
    canvasCount: metrics.canvasCount,
    hotCanvasArea: metrics.hotCanvasArea,
    quality: graphicsQuality,
  });

  return (
    <div
      className="shrink-0 relative flex items-center gap-2 px-3 bg-bg-deep/70 border-b border-border-subtle font-mono text-text-muted overflow-hidden whitespace-nowrap"
      style={{ height: 26 }}
      role="status"
      aria-live="polite"
      aria-label="App status and performance"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Blade state + RMS (most-watched readouts up front) */}
      <Segment
        label="State"
        valueClassName="tabular-nums"
        leadingDot={stateColor}
      >
        <span style={{ color: stateColor }}>{stateText}</span>
      </Segment>
      <Divider />

      <Segment label="RMS" valueClassName="tabular-nums">
        <span style={{ color: rmsColor }}>{rmsPct}%</span>
      </Segment>
      <Divider />

      {/* Power */}
      <Segment label="Pwr" valueClassName="tabular-nums" leadingDot={powerColor}>
        <span style={{ color: powerColor }}>
          <span aria-hidden="true" className="text-text-muted/60 mr-0.5">⚡</span>
          {formatAmps(colorMA)}
          <span className="text-text-muted/40"> / </span>
          <span className="text-text-muted">{formatAmps(BOARD_MAX_MA)}</span>
        </span>
      </Segment>
      <Divider />

      {/* Profile + Preset */}
      <Segment label="Profile">{profileName}</Segment>
      <Divider />
      <Segment
        label="Preset"
        valueClassName={activeEntryId ? 'tabular-nums text-[rgb(var(--status-info))]' : 'tabular-nums text-text-muted'}
      >
        {activePresetName}
      </Segment>
      <Divider />

      {/* LEDs + Modified */}
      <Segment label="LEDs" valueClassName="tabular-nums">{ledCount}</Segment>
      <Divider />
      <Segment
        label="Mod"
        valueClassName={isDirty ? 'tabular-nums text-[rgb(var(--status-warn))]' : 'tabular-nums text-text-muted'}
      >
        {isDirty ? '● UNSAVED' : '✓ SAVED'}
      </Segment>
      <Divider />

      {/* Storage + Conn */}
      <Segment label="Stor" valueClassName="tabular-nums" leadingDot={storageColor}>
        <span style={{ color: storageColor }}>{storagePct}%</span>
      </Segment>
      <Divider />
      <Segment label="Conn" valueClassName="tabular-nums" leadingDot={connColor}>
        <span style={{ color: connColor }}>IDLE</span>
      </Segment>
      <Divider />

      {/* Theme */}
      <Segment label="Theme" valueClassName="tabular-nums" wideOnly>
        {canvasTheme.toUpperCase()}
      </Segment>
      <Divider wideOnly />

      {/* UTC + Build */}
      <Segment label="UTC" valueClassName="tabular-nums" wideOnly>{utcTime}</Segment>
      <Divider wideOnly />
      <Segment label="Build" valueClassName="tabular-nums" wideOnly>v{LATEST_VERSION}</Segment>

      {/* Right cluster: APP FPS + GFX */}
      <span className="flex-1" />

      <Segment label="App" valueClassName="tabular-nums" leadingDot={fpsColor}>
        <span style={{ color: fpsColor }}>{fps} FPS</span>
      </Segment>
      <Divider />
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="uppercase tracking-[0.08em] text-text-muted text-ui-xs">GFX</span>
        <div role="group" aria-label="Graphics quality" className="flex rounded-chrome border border-border-subtle overflow-hidden">
          {(['high', 'medium', 'low'] as const).map((q) => {
            const active = graphicsQuality === q;
            return (
              <button
                key={q}
                type="button"
                onClick={() => setGraphicsQuality(q)}
                aria-pressed={active}
                className={`px-1.5 uppercase tracking-[0.08em] text-ui-xs transition-colors ${
                  active
                    ? 'bg-accent-dim text-accent'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                style={{ height: 18 }}
              >
                {q}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hover popover (perf hints) */}
      {hovered && (
        <div
          className="absolute right-3 bottom-full mb-1 z-30 rounded-chrome border border-border-light bg-bg-secondary shadow-lg font-mono text-ui-xs p-3 min-w-[280px] max-w-[360px]"
          role="tooltip"
        >
          <div className="uppercase tracking-[0.14em] text-text-muted mb-1">App Performance</div>
          <Row label="FPS" value={String(fps)} color={fpsColor} />
          <Row label="Frame time" value={`${metrics.frameMs.toFixed(1)} ms`} />
          <Row label="Canvases" value={String(metrics.canvasCount)} />
          <Row label="Largest canvas" value={`${(metrics.hotCanvasArea / 1000).toFixed(0)}k px²`} />
          <Row label="GFX quality" value={graphicsQuality.toUpperCase()} color="rgb(var(--accent))" />
          <div className="mt-2 pt-2 border-t border-border-subtle text-text-muted uppercase tracking-[0.12em]">Hints</div>
          <ul className="mt-1 text-text-secondary space-y-1">
            {hints.map((h, i) => <li key={i}>· {h}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="tabular-nums" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

// ─── Local FPS hook ──────────────────────────────────────────────────────────

function useFps(): number {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFlushRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    function loop(ts: number) {
      if (lastFlushRef.current === 0) lastFlushRef.current = ts;
      frameCountRef.current += 1;
      const elapsed = ts - lastFlushRef.current;
      if (elapsed >= 500) {
        setFps(Math.round((frameCountRef.current / elapsed) * 1000));
        frameCountRef.current = 0;
        lastFlushRef.current = ts;
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return fps;
}
