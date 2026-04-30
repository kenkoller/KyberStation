'use client';

// ─── HardwarePanel — merged blade hardware + power draw ───
//
// v0.14.0 left-rail overhaul: BladeHardwarePanel and PowerDrawPanel are
// no longer separate cards. Power draw is a *consequence* of the
// hardware config (LEDs × brightness × style), not a parallel concern,
// so they live in one panel with cause flowing into effect.
//
// Layout, top to bottom:
//   1. CONFIGURATION header
//   2. Inputs:
//        – Board (inline picker)
//        – Topology (single / staff / crossguard / triple / inquisitor)
//        – Blade length (preset ladder; derives ledCount)
//        – Strip configuration (1..5 strip variants)
//        – LEDs (numeric override — bypass the blade-length preset)
//        – Brightness slider
//   3. Visual divider — "─── POWER DRAW (live) ───"
//   4. Power draw readout:
//        – Big "X.X A peak" / "X.X A battery limit" pair
//        – Headroom % indicator paired with StatusSignal glyph
//        – Per-LED breakdown (avg / peak mA + R/G/B channel bars)
//        – Battery preset selector + life estimate
//
// All math lives in `lib/powerDraw.ts` so it can be unit-tested
// without React or the UI store.

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { TOPOLOGY_PRESETS, type BladeConfig } from '@kyberstation/engine';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { RadialGauge } from '@/components/shared/RadialGauge';
import { StatusSignal } from '@/components/shared/StatusSignal';
import { BoardPicker } from '@/components/shared/BoardPicker';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import {
  computePowerDraw,
  classifyHeadroom,
  headroomLabel,
  BATTERY_PRESETS,
  BOARD_MAX_MA,
} from '@/lib/powerDraw';
import {
  BATTERIES,
  DEFAULT_CUSTOM_BATTERY,
  resolveBattery,
  exceedsBatteryMargin,
  BATTERY_WARNING_THRESHOLD,
  type BatteryType,
} from '@/lib/batteryTypes';
import {
  BLADE_LENGTHS,
  canonicalLedCountForInches,
  inferBladeInches,
} from '@/lib/bladeLengths';

// ─── Local hardware-input constants ───
//
// BLADE_LENGTHS are derived from the engine's canonical BLADE_LENGTH_PRESETS
// via lib/bladeLengths.ts so the table only ever lives in one place — including
// the vendor-reality human captions (`Standard (36")`, `Combat (24")`, etc.).
// STRIP and TOPOLOGY tables stay local because they're UI-presentation enums
// with no engine-side counterpart.

const STRIP_TYPES = [
  { id: 'single', label: '1 Strip', icon: '│', desc: 'Single neopixel strip' },
  { id: 'dual-neo', label: '2 Strip', icon: '║', desc: 'Dual strip, brighter' },
  { id: 'tri-neo', label: '3 Strip', icon: '┃┃┃', desc: 'Tri strip, even light' },
  { id: 'quad-neo', label: '4 Strip', icon: '╬', desc: 'Quad strip, ultra-even' },
  { id: 'penta-neo', label: '5 Strip', icon: '╬│', desc: 'Penta strip, maximum light' },
];

// Topology BETA flag (2026-04-29): only single-blade is launch-shipped at
// full fidelity. Staff / Crossguard / Triple / Inquisitor (and Quad-Star
// / Split / Accent below in BladeCanvas's mirror list) are wired through
// the engine but render with WIP markers — flagged BETA in the UI so
// users know they're using a preview surface.
const TOPOLOGY_OPTIONS = [
  { id: 'single', label: 'Single Blade', icon: '╱', desc: 'Standard lightsaber', beta: false },
  { id: 'staff', label: 'Staff', icon: '╲╱', desc: 'Double-ended saber staff', beta: true },
  { id: 'crossguard', label: 'Crossguard', icon: '┼', desc: 'Main blade + quillons', beta: true },
  { id: 'triple', label: 'Triple', icon: '╲│╱', desc: 'Three blades', beta: true },
  { id: 'inquisitor', label: 'Inquisitor', icon: '◎', desc: 'Spinning double ring', beta: true },
];

// ─── Component ───────────────────────────────────────────────────────

export function HardwarePanel(): JSX.Element {
  const config = useBladeStore((s) => s.config);
  const topology = useBladeStore((s) => s.topology);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const setTopology = useBladeStore((s) => s.setTopology);

  const brightness = useUIStore((s) => s.brightness);
  const setBrightness = useUIStore((s) => s.setBrightness);
  const batteryIdx = useUIStore((s) => s.batteryPresetIdx ?? 0);
  const setBatteryIdx = useUIStore((s) => s.setBatteryPresetIdx);
  const batteryId = useUIStore((s) => s.batteryId);
  const setBatteryId = useUIStore((s) => s.setBatteryId);
  const customBattery = useUIStore((s) => s.customBattery);
  const setCustomBattery = useUIStore((s) => s.setCustomBattery);

  // Resolved battery — full spec used for the warning math + display.
  const battery: BatteryType = resolveBattery(batteryId, customBattery);

  const { boardId, setBoardId } = useBoardProfile();

  // ─── Derived state ───
  const stripType = (config.stripType as string) ?? 'single';
  const ledCount = config.ledCount ?? 132;
  const baseColor = config.baseColor ?? { r: 0, g: 0, b: 255 };
  const currentLength = inferBladeInches(ledCount);

  // LED-count divergence warning: real-world Neopixel saber blades
  // ship with vendor-canonical LED counts for each length (e.g. 36"
  // = 144 LEDs from a 1m WS2812B strip). Manually setting an LED
  // count outside that mapping is allowed (custom builds exist) but
  // worth flagging so a user doesn't accidentally desync the
  // simulator from their actual hardware. Non-blocking — the warning
  // never gates the input.
  const canonicalLedCount = canonicalLedCountForInches(currentLength);
  const ledCountIsUnusual =
    canonicalLedCount !== undefined && ledCount !== canonicalLedCount;

  const stats = useMemo(
    () =>
      computePowerDraw({
        ledCount,
        stripType,
        baseColor,
        brightnessPct: brightness,
        batteryIdx,
      }),
    [ledCount, stripType, baseColor, brightness, batteryIdx],
  );

  const headroomVariant = classifyHeadroom(stats);
  const headroomText = headroomLabel(stats);

  // ─── Handlers ───
  const handleLengthChange = (inches: number) => {
    const preset = BLADE_LENGTHS.find((b) => b.inches === inches);
    if (preset) updateConfig({ ledCount: preset.ledCount });
  };

  const handleTopologyChange = (topoId: string) => {
    const topo = TOPOLOGY_PRESETS[topoId];
    if (topo) {
      setTopology(topo);
      updateConfig({ ledCount: topo.totalLEDs });
    }
  };

  const handleStripTypeChange = (sid: string) => {
    const isInHilt = sid.includes('cree');
    updateConfig({
      stripType: sid as BladeConfig['stripType'],
      bladeType: isInHilt ? 'in-hilt-led' : 'neopixel',
    });
  };

  const handleLedOverride = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0 && n <= 1024) {
      updateConfig({ ledCount: n });
    }
  };

  // Convert mA → A for the radial gauge. Existing thresholds: 50% / 80%
  // of 5A = 2.5A warn / 4A critical.
  const drawAmps = stats.colorMA / 1000;
  const peakAmps = stats.peakMA / 1000;
  const budgetAmps = BOARD_MAX_MA / 1000;
  const warnAmps = budgetAmps * 0.50;
  const criticalAmps = budgetAmps * 0.80;

  // ── Battery margin check ──
  // The warning fires ONLY when peak draw exceeds 90% of the selected
  // battery's manufacturer-rated continuous discharge. No heuristics, no
  // guesses — just the math: peakDrawA > maxDischargeA × 0.9 → warn.
  const batteryWarning = exceedsBatteryMargin(peakAmps, battery.maxDischargeA);
  const batteryWarningPct = battery.maxDischargeA > 0
    ? Math.round((peakAmps / battery.maxDischargeA) * 100)
    : 0;

  return (
    <div className="space-y-4" data-testid="hardware-panel">
      {/* ─── CONFIGURATION header ─── */}
      <h3
        className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1 font-mono"
        data-testid="hw-section-config"
      >
        Configuration
        <HelpTooltip
          text="Physical hardware config — board, blade topology, length, strip count, LED override, brightness. Power draw flows from these inputs into the live readout below."
          proffie="BladeConfig / WS281XBladePtr<>"
        />
      </h3>

      {/* Board */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider font-mono mb-2 block">
          Board
        </label>
        <BoardPicker
          selectedBoardId={boardId}
          onSelect={(id) => setBoardId(id)}
          variant="inline"
        />
      </div>

      {/* Topology */}
      <div>
        <label className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Topology
          <HelpTooltip
            text="Physical blade layout. Single = standard saber, Staff = double-ended, Crossguard = main blade + quillons (Kylo Ren style)."
            proffie="BladeConfig blades[]"
          />
        </label>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Blade topology">
          {TOPOLOGY_OPTIONS.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={topology.presetId === t.id}
              onClick={() => handleTopologyChange(t.id)}
              className={`text-left px-3 py-2 rounded-interactive text-ui-xs transition-colors border ${
                topology.presetId === t.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-ui-sm font-mono opacity-60" aria-hidden="true">
                  {t.icon}
                </span>
                <div>
                  <div className="font-medium flex items-center gap-1.5">
                    <span>{t.label}</span>
                    {t.beta && (
                      <span
                        className="text-[8px] tracking-wider font-mono"
                        style={{ color: 'rgb(var(--status-magenta))' }}
                        aria-label="Beta feature"
                      >
                        BETA
                      </span>
                    )}
                  </div>
                  <div className="text-ui-xs text-text-muted mt-0.5">{t.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Blade Length */}
      <div>
        <label className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Blade Length
          <HelpTooltip
            text="Physical blade length in inches. LED count auto-adjusts at standard 3.6 LEDs/inch density."
            proffie="maxLedsPerStrip"
          />
        </label>
        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
          <div className="space-y-1.5 mb-3" role="radiogroup" aria-label="Blade length">
            {BLADE_LENGTHS.map((b) => (
              <button
                key={b.inches}
                role="radio"
                aria-checked={currentLength === b.inches}
                aria-label={`${b.label}, ${b.ledCount} LEDs`}
                onClick={() => handleLengthChange(b.inches)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded-interactive transition-colors ${
                  currentLength === b.inches
                    ? 'bg-accent-dim/40 text-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="text-ui-sm w-20 text-left shrink-0">{b.label}</span>
                <div className="flex-1 h-2 bg-bg-deep rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      currentLength === b.inches ? 'bg-accent' : 'bg-text-muted/20'
                    }`}
                    style={{ width: `${(b.inches / 40) * 100}%` }}
                  />
                </div>
                <span className="text-ui-xs text-text-muted tabular-nums w-10 text-right">
                  {b.ledCount} LED
                </span>
              </button>
            ))}
          </div>
          <div className="text-ui-xs text-text-muted text-center">
            {currentLength}" = {ledCount} LEDs
          </div>
        </div>
      </div>

      {/* Strip Configuration */}
      <div>
        <label className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Strip Configuration
          <HelpTooltip
            text="Number of neopixel LED strips inside the blade tube. More strips = brighter and more even illumination, but draw more power."
            proffie="WS281XBladePtr<ledCount, bladePin, Color8::GRB, PowerPINS<...>>"
          />
        </label>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Strip configuration">
          {STRIP_TYPES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={stripType === s.id}
              onClick={() => handleStripTypeChange(s.id)}
              className={`text-left px-3 py-2 rounded-interactive text-ui-xs transition-colors border ${
                stripType === s.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-ui-sm font-mono opacity-60" aria-hidden="true">
                  {s.icon}
                </span>
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-ui-xs text-text-muted mt-0.5">{s.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* LED count override + brightness, side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="hw-led-override"
            className="text-ui-xs text-text-muted uppercase tracking-wider font-mono mb-1 flex items-center gap-1"
          >
            LEDs
            <HelpTooltip text="Override the blade-length LED preset. Use for non-standard builds." proffie="maxLedsPerStrip" />
          </label>
          <input
            id="hw-led-override"
            type="number"
            min={1}
            max={1024}
            value={ledCount}
            onChange={(e) => handleLedOverride(e.target.value)}
            aria-invalid={ledCountIsUnusual}
            aria-describedby={ledCountIsUnusual ? 'hw-led-override-warning' : undefined}
            className={`w-full bg-bg-deep border rounded-interactive px-2 py-1.5 text-ui-sm font-mono tabular-nums text-text-primary focus:outline-none ${
              ledCountIsUnusual
                ? 'border-[rgb(var(--badge-creative))] focus:border-[rgb(var(--badge-creative))]'
                : 'border-border-subtle focus:border-accent-border'
            }`}
            aria-label="LED count override"
            data-testid="hw-led-override"
          />
          {ledCountIsUnusual && canonicalLedCount !== undefined ? (
            <div
              id="hw-led-override-warning"
              role="status"
              aria-live="polite"
              data-testid="hw-led-override-warning"
              className="mt-1 text-ui-xs text-[rgb(var(--badge-creative))] leading-snug"
            >
              {ledCount} LEDs is unusual for a {currentLength}&quot; blade
              (typical: {canonicalLedCount}). Most Neopixel sabers ship with
              the canonical count for their length.
            </div>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="hw-brightness"
            className="text-ui-xs text-text-muted uppercase tracking-wider font-mono mb-1 flex items-center gap-1"
          >
            Brightness
            <HelpTooltip text="UI brightness scaling, 0–100%. Drives the live power draw readout below." />
          </label>
          <div className="flex items-center gap-2">
            <input
              id="hw-brightness"
              type="range"
              min={0}
              max={100}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="flex-1 h-1 accent-accent"
              aria-label="Brightness percentage"
              data-testid="hw-brightness"
            />
            <span className="text-ui-xs font-mono tabular-nums text-text-secondary w-9 text-right">
              {brightness}%
            </span>
          </div>
        </div>
      </div>

      {/* ─── Divider — POWER DRAW (live) ─── */}
      <div className="flex items-center gap-2 pt-2" aria-hidden="true">
        <span className="flex-1 h-px bg-border-subtle" />
        <span className="text-ui-xs text-text-muted font-mono uppercase tracking-widest">
          Power Draw (live)
        </span>
        <span className="flex-1 h-px bg-border-subtle" />
      </div>

      {/* ─── Big readout — peak A / battery limit + headroom signal ─── */}
      <div
        className="bg-bg-surface rounded-panel p-3 border border-border-subtle flex items-center gap-4"
        data-testid="hw-power-readout"
      >
        <RadialGauge
          value={drawAmps}
          max={budgetAmps}
          unit="A"
          label="POWER"
          tiers={{ warn: warnAmps, critical: criticalAmps }}
          glyphPairing
          size={120}
          pulseOnThresholdCrossing
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono tabular-nums text-text-primary" data-testid="hw-peak-amps">
              {peakAmps.toFixed(1)} A
            </span>
            <span className="text-ui-xs text-text-muted">peak</span>
          </div>
          <div className="text-ui-xs text-text-muted">
            <span className="tabular-nums">{budgetAmps.toFixed(1)} A</span> battery limit
          </div>
          <div data-testid="hw-headroom-signal">
            <StatusSignal variant={headroomVariant} size="sm" label={headroomText}>
              {headroomText}
            </StatusSignal>
          </div>
        </div>
      </div>

      {/* Per-LED breakdown — avg / peak / total LEDs / runtime */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <div className="text-ui-xs text-text-muted">Peak (white)</div>
          <div className="text-ui-sm font-mono tabular-nums text-text-secondary">
            {stats.peakMA.toLocaleString()} mA
          </div>
        </div>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <div className="text-ui-xs text-text-muted">Avg (~60% duty)</div>
          <div className="text-ui-sm font-mono tabular-nums text-text-secondary">
            {stats.avgMA.toLocaleString()} mA
          </div>
        </div>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <div className="text-ui-xs text-text-muted">Total LEDs</div>
          <div className="text-ui-sm font-mono tabular-nums text-text-secondary">
            {stats.totalLEDs}
          </div>
        </div>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <div className="text-ui-xs text-text-muted">Runtime Est.</div>
          <div className="text-ui-sm font-mono tabular-nums text-text-secondary" data-testid="hw-runtime">
            {stats.runtimeMinutes >= 60
              ? `${Math.floor(stats.runtimeMinutes / 60)}h ${stats.runtimeMinutes % 60}m`
              : `${stats.runtimeMinutes}m`}
          </div>
        </div>
      </div>

      {/* Per-channel R/G/B breakdown — channel hex stays literal R/G/B identity */}
      <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle space-y-1.5">
        <div className="text-ui-xs text-text-muted mb-1">Channel Breakdown</div>
        {[
          { label: 'R', value: stats.rMA, color: '#ef4444' },
          { label: 'G', value: stats.gMA, color: '#22c55e' },
          { label: 'B', value: stats.bMA, color: '#3b82f6' },
        ].map((ch) => {
          const denom = stats.colorMA - 50; // BOARD_IDLE_MA inlined to avoid extra import
          const chPercent = denom > 0 ? (ch.value / denom) * 100 : 0;
          return (
            <div key={ch.label} className="flex items-center gap-2">
              <span className="text-ui-xs font-mono w-4" style={{ color: ch.color }}>
                {ch.label}
              </span>
              <div className="flex-1 h-2 bg-bg-deep rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, chPercent)}%`,
                    opacity: 0.7,
                    background: ch.color,
                  }}
                />
              </div>
              <span className="text-ui-xs font-mono text-text-muted w-14 text-right tabular-nums">
                {ch.value} mA
              </span>
            </div>
          );
        })}
      </div>

      {/* ─── Battery (selector + spec readout + safety check) ─── */}
      <div data-testid="hw-battery-section">
        <label
          htmlFor="hw-battery-id"
          className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1"
        >
          Battery
          <HelpTooltip
            text="The Li-ion cell in your saber chassis. Specs (capacity, max continuous discharge, voltage) come from manufacturer datasheets. The peak-draw warning fires when calculated peak amperage exceeds 90% of the cell's rated continuous discharge."
            proffie="BATTERY_MONITOR_PIN — battery state monitoring"
          />
        </label>
        <select
          id="hw-battery-id"
          value={batteryId}
          onChange={(e) => setBatteryId(e.target.value)}
          aria-label="Battery type"
          aria-describedby="hw-battery-spec"
          className="w-full bg-bg-deep border border-border-subtle rounded-interactive px-2 py-1.5 text-ui-sm text-text-primary mb-2"
          data-testid="hw-battery-select"
        >
          {BATTERIES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
          <option value="custom">Custom (specify mAh + max discharge)</option>
        </select>

        {/* Custom battery editor — only shown for the 'custom' selection. */}
        {batteryId === 'custom' && (
          <div
            className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2 mb-2"
            data-testid="hw-battery-custom-editor"
          >
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor="hw-battery-custom-mah"
                  className="text-ui-xs text-text-muted uppercase tracking-wider font-mono mb-1 block"
                >
                  mAh
                </label>
                <input
                  id="hw-battery-custom-mah"
                  type="number"
                  min={100}
                  max={20000}
                  value={(customBattery ?? DEFAULT_CUSTOM_BATTERY).capacityMah}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isFinite(n) || n <= 0) return;
                    setCustomBattery({
                      ...(customBattery ?? DEFAULT_CUSTOM_BATTERY),
                      capacityMah: n,
                    });
                  }}
                  className="w-full bg-bg-deep border border-border-subtle rounded-interactive px-2 py-1 text-ui-sm font-mono tabular-nums text-text-primary"
                  data-testid="hw-battery-custom-mah"
                />
              </div>
              <div>
                <label
                  htmlFor="hw-battery-custom-amax"
                  className="text-ui-xs text-text-muted uppercase tracking-wider font-mono mb-1 block"
                >
                  Max A
                </label>
                <input
                  id="hw-battery-custom-amax"
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={(customBattery ?? DEFAULT_CUSTOM_BATTERY).maxDischargeA}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    if (!Number.isFinite(n) || n <= 0) return;
                    setCustomBattery({
                      ...(customBattery ?? DEFAULT_CUSTOM_BATTERY),
                      maxDischargeA: n,
                    });
                  }}
                  className="w-full bg-bg-deep border border-border-subtle rounded-interactive px-2 py-1 text-ui-sm font-mono tabular-nums text-text-primary"
                  data-testid="hw-battery-custom-amax"
                />
              </div>
              <div>
                <label
                  htmlFor="hw-battery-custom-volt"
                  className="text-ui-xs text-text-muted uppercase tracking-wider font-mono mb-1 block"
                >
                  Volts
                </label>
                <input
                  id="hw-battery-custom-volt"
                  type="number"
                  min={2.5}
                  max={4.5}
                  step={0.1}
                  value={(customBattery ?? DEFAULT_CUSTOM_BATTERY).voltageNominal}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    if (!Number.isFinite(n) || n <= 0) return;
                    setCustomBattery({
                      ...(customBattery ?? DEFAULT_CUSTOM_BATTERY),
                      voltageNominal: n,
                    });
                  }}
                  className="w-full bg-bg-deep border border-border-subtle rounded-interactive px-2 py-1 text-ui-sm font-mono tabular-nums text-text-primary"
                  data-testid="hw-battery-custom-volt"
                />
              </div>
            </div>
            <div className="text-ui-xs text-text-muted leading-snug">
              Use values from your cell&apos;s manufacturer datasheet. The
              max-discharge value drives the safety warning below.
            </div>
          </div>
        )}

        {/* Spec readout — shows the resolved battery's specs for transparency. */}
        <div
          id="hw-battery-spec"
          className="bg-bg-surface rounded-panel p-2 border border-border-subtle text-ui-xs text-text-muted grid grid-cols-3 gap-2"
          data-testid="hw-battery-spec"
        >
          <div>
            <div className="text-text-muted/60 uppercase tracking-wider font-mono mb-0.5">
              Capacity
            </div>
            <div className="text-text-secondary font-mono tabular-nums">
              {battery.capacityMah.toLocaleString()} mAh
            </div>
          </div>
          <div>
            <div className="text-text-muted/60 uppercase tracking-wider font-mono mb-0.5">
              Max A
            </div>
            <div className="text-text-secondary font-mono tabular-nums">
              {battery.maxDischargeA} A
            </div>
          </div>
          <div>
            <div className="text-text-muted/60 uppercase tracking-wider font-mono mb-0.5">
              Voltage
            </div>
            <div className="text-text-secondary font-mono tabular-nums">
              {battery.voltageNominal.toFixed(1)} V
            </div>
          </div>
        </div>
        {battery.notes && (
          <div className="text-ui-xs text-text-muted/80 mt-1 leading-snug">
            {battery.notes}
          </div>
        )}

        {/* Battery margin warning — fires only when math justifies it. */}
        {batteryWarning && (
          <div
            className="text-ui-xs p-2 mt-2 rounded-interactive border flex items-start gap-2"
            style={{
              background: 'rgb(var(--status-error) / 0.1)',
              borderColor: 'rgb(var(--status-error) / 0.3)',
              color: 'rgb(var(--status-error))',
            }}
            data-testid="hw-battery-warning"
            role="alert"
          >
            <span aria-hidden="true">⚠</span>
            <span>
              Peak draw{' '}
              <span className="font-mono tabular-nums">
                {peakAmps.toFixed(1)}A
              </span>{' '}
              approaches the {battery.label.split(' (')[0]} rated max{' '}
              <span className="font-mono tabular-nums">
                {battery.maxDischargeA}A
              </span>{' '}
              ({batteryWarningPct}% of rating, threshold{' '}
              {Math.round(BATTERY_WARNING_THRESHOLD * 100)}%). Consider a
              higher-drain cell or reduce LED count / brightness.
            </span>
          </div>
        )}
      </div>

      {/* Legacy mAh-only runtime estimator (drives the runtime readout above). */}
      <div className="flex items-center gap-2">
        <label htmlFor="hw-battery-runtime" className="text-ui-xs text-text-muted shrink-0">
          Runtime cell:
        </label>
        <select
          id="hw-battery-runtime"
          value={batteryIdx}
          onChange={(e) => setBatteryIdx?.(Number(e.target.value))}
          aria-label="Battery type for runtime estimation"
          className="flex-1 bg-bg-deep border border-border-subtle rounded-interactive px-2 py-1 text-ui-xs text-text-secondary"
        >
          {BATTERY_PRESETS.map((bp, i) => (
            <option key={i} value={i}>
              {bp.label}
            </option>
          ))}
        </select>
      </div>

      {/* Warnings */}
      {stats.overLimit && (
        <div
          className="text-ui-xs p-2 rounded-interactive border flex items-start gap-2"
          style={{
            background: 'rgb(var(--status-error) / 0.1)',
            borderColor: 'rgb(var(--status-error) / 0.3)',
            color: 'rgb(var(--status-error))',
          }}
          data-testid="hw-overlimit-warning"
        >
          <span aria-hidden="true">✕</span>
          <span>
            Peak draw ({stats.peakMA.toLocaleString()} mA) exceeds Proffieboard 5A limit. Reduce
            LED count, brightness, or use a lighter color.
          </span>
        </div>
      )}
      {stats.runtimeMinutes < 30 && !stats.overLimit && (
        <div
          className="text-ui-xs p-2 rounded-interactive border flex items-start gap-2"
          style={{
            background: 'rgb(var(--status-warn) / 0.1)',
            borderColor: 'rgb(var(--status-warn) / 0.3)',
            color: 'rgb(var(--status-warn))',
          }}
        >
          <span aria-hidden="true">⚠</span>
          <span>
            Estimated runtime under 30 minutes. Consider a higher capacity battery or lower
            brightness.
          </span>
        </div>
      )}
    </div>
  );
}
