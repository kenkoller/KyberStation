'use client';

export interface XenoGlobalSettings {
  volume: number;
  clashSensitivity: number;
  flashOnClash: boolean;
  pixelNumber: number;
  velocityMode: boolean;
  torchMode: boolean;
  multiblockMode: boolean;
  multilockMode: boolean;
  lightningBlockMode: boolean;
  blasterMode: boolean;
  ghostMode: boolean;
  powerOnTime: number;
  powerOffTime: number;
  countdown: boolean;
}

export interface XenoSettingsPanelProps {
  settings: XenoGlobalSettings;
  onSettingsChange: (settings: XenoGlobalSettings) => void;
}

export function XenoSettingsPanel({ settings, onSettingsChange }: XenoSettingsPanelProps) {
  function update(patch: Partial<XenoGlobalSettings>) {
    onSettingsChange({ ...settings, ...patch });
  }

  return (
    <div className="space-y-6">
      {/* ── Volume ────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">Volume</h3>
        {settings.volume > 90 && (
          <div
            role="alert"
            className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300"
          >
            High volume may cause distortion or speaker damage.
          </div>
        )}
        <SliderRow
          label="Master Volume"
          value={settings.volume}
          min={0}
          max={100}
          step={1}
          onChange={(v) => update({ volume: v })}
          unit="%"
        />
      </section>

      {/* ── Clash ─────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">Clash</h3>
        <SliderRow
          label="Clash Sensitivity"
          value={settings.clashSensitivity}
          min={0.5}
          max={5.0}
          step={0.1}
          onChange={(v) => update({ clashSensitivity: v })}
          unit=""
        />
        <SettingsToggle
          label="Flash on Clash"
          checked={settings.flashOnClash}
          onChange={(v) => update({ flashOnClash: v })}
        />
      </section>

      {/* ── Blade Length ───────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">Blade Length</h3>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] p-3">
          <label
            htmlFor="xeno-pixel-number"
            className="text-sm text-[rgb(var(--text-primary))] shrink-0"
          >
            Pixel Count
          </label>
          <input
            id="xeno-pixel-number"
            type="number"
            min={1}
            max={300}
            value={settings.pixelNumber}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n)) update({ pixelNumber: Math.max(1, Math.min(n, 300)) });
            }}
            className="w-20 rounded border border-[var(--border-subtle)] bg-transparent px-2 py-1 text-sm font-mono text-[rgb(var(--text-primary))] text-right"
          />
          <span className="text-xs text-[rgb(var(--text-muted))]">LEDs</span>
        </div>
        <p className="text-xs text-[rgb(var(--text-muted))] px-1">
          Count the number of LEDs in your blade strip. Default is 133 for a standard 36&quot; blade.
        </p>
      </section>

      {/* ── Blade Modes ───────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">Blade Modes</h3>
        <div className="grid grid-cols-2 gap-2">
          <SettingsToggle
            label="Velocity"
            checked={settings.velocityMode}
            onChange={(v) => update({ velocityMode: v })}
          />
          <SettingsToggle
            label="Torch"
            checked={settings.torchMode}
            onChange={(v) => update({ torchMode: v })}
          />
          <SettingsToggle
            label="Blaster"
            checked={settings.blasterMode}
            onChange={(v) => update({ blasterMode: v })}
          />
          <SettingsToggle
            label="Ghost"
            checked={settings.ghostMode}
            onChange={(v) => update({ ghostMode: v })}
          />
        </div>
      </section>

      {/* ── Action Modes ──────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">Action Modes</h3>
        <div className="grid grid-cols-2 gap-2">
          <SettingsToggle
            label="Multi-Block"
            checked={settings.multiblockMode}
            onChange={(v) => update({ multiblockMode: v })}
          />
          <SettingsToggle
            label="Multi-Lock"
            checked={settings.multilockMode}
            onChange={(v) => update({ multilockMode: v })}
          />
          <SettingsToggle
            label="Lightning Block"
            checked={settings.lightningBlockMode}
            onChange={(v) => update({ lightningBlockMode: v })}
          />
        </div>
      </section>

      {/* ── Timing ────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">Timing</h3>
        <SliderRow
          label="Power-On Time"
          value={settings.powerOnTime}
          min={500}
          max={5000}
          step={100}
          onChange={(v) => update({ powerOnTime: v })}
          unit="ms"
        />
        <SliderRow
          label="Power-Off Time"
          value={settings.powerOffTime}
          min={1000}
          max={30000}
          step={500}
          onChange={(v) => update({ powerOffTime: v })}
          unit="ms"
        />
      </section>

      {/* ── Sound ─────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">Sound</h3>
        <SettingsToggle
          label="Countdown"
          checked={settings.countdown}
          onChange={(v) => update({ countdown: v })}
        />
      </section>
    </div>
  );
}

// ─── Internal subcomponents ─────────────────────────────────────────

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit: string;
}

function SliderRow({ label, value, min, max, step, onChange, unit }: SliderRowProps) {
  const id = `xeno-slider-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] p-3">
      <label htmlFor={id} className="text-sm text-[rgb(var(--text-primary))] shrink-0">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full accent-[rgb(var(--color-accent))]"
      />
      <span className="text-xs font-mono text-[rgb(var(--text-muted))] w-16 text-right tabular-nums">
        {value}{unit}
      </span>
    </div>
  );
}

interface SettingsToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function SettingsToggle({ label, checked, onChange }: SettingsToggleProps) {
  const id = `xeno-setting-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] p-3">
      <label htmlFor={id} className="text-sm text-[rgb(var(--text-primary))]">
        {label}
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[rgb(var(--color-accent))]"
      />
    </div>
  );
}
