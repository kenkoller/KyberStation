'use client';

export interface XenoMotionSettings {
  motionControl: boolean;
  swingOn: boolean;
  swingSensitivity: number;
  twistOn: boolean;
  twistOff: boolean;
  twistSensitivity: number;
  pullPushOn: boolean;
  pushPullOff: boolean;
  pushSensitivity: number;
  pullSensitivity: number;
}

export interface XenoMotionPanelProps {
  settings: XenoMotionSettings;
  onSettingsChange: (settings: XenoMotionSettings) => void;
}

export function XenoMotionPanel({ settings, onSettingsChange }: XenoMotionPanelProps) {
  function update(patch: Partial<XenoMotionSettings>) {
    onSettingsChange({ ...settings, ...patch });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">
        Motion Controls
      </h3>

      {/* Master toggle */}
      <ToggleRow
        label="Motion Control"
        description="Enable gesture-based saber activation"
        checked={settings.motionControl}
        onChange={(v) => update({ motionControl: v })}
      />

      {/* Swing Ignition */}
      <GestureRow
        label="Swing Ignition"
        toggleChecked={settings.swingOn}
        onToggle={(v) => update({ swingOn: v })}
        sliderValue={settings.swingSensitivity}
        sliderMin={500}
        sliderMax={2000}
        sliderStep={50}
        onSlider={(v) => update({ swingSensitivity: v })}
        unit=""
        disabled={!settings.motionControl}
      />

      {/* Twist On */}
      <GestureRow
        label="Twist Ignition"
        toggleChecked={settings.twistOn}
        onToggle={(v) => update({ twistOn: v })}
        sliderValue={settings.twistSensitivity}
        sliderMin={100}
        sliderMax={500}
        sliderStep={10}
        onSlider={(v) => update({ twistSensitivity: v })}
        unit=""
        disabled={!settings.motionControl}
      />

      {/* Twist Off */}
      <ToggleRow
        label="Twist Retraction"
        description="Twist to power off"
        checked={settings.twistOff}
        onChange={(v) => update({ twistOff: v })}
        disabled={!settings.motionControl}
      />

      {/* Pull/Push On */}
      <GestureRow
        label="Pull/Push Ignition"
        toggleChecked={settings.pullPushOn}
        onToggle={(v) => update({ pullPushOn: v })}
        sliderValue={settings.pushSensitivity}
        sliderMin={5}
        sliderMax={30}
        sliderStep={1}
        onSlider={(v) => update({ pushSensitivity: v })}
        unit=""
        disabled={!settings.motionControl}
      />

      {/* Push/Pull Off */}
      <GestureRow
        label="Push/Pull Retraction"
        toggleChecked={settings.pushPullOff}
        onToggle={(v) => update({ pushPullOff: v })}
        sliderValue={settings.pullSensitivity}
        sliderMin={5}
        sliderMax={30}
        sliderStep={1}
        onSlider={(v) => update({ pullSensitivity: v })}
        unit=""
        disabled={!settings.motionControl}
      />
    </div>
  );
}

// ─── Internal subcomponents ─────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  const id = `xeno-toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] p-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-[rgb(var(--text-primary))]">
          {label}
        </label>
        {description && (
          <div className="text-xs text-[rgb(var(--text-muted))]">{description}</div>
        )}
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[rgb(var(--color-accent))]"
      />
    </div>
  );
}

interface GestureRowProps {
  label: string;
  toggleChecked: boolean;
  onToggle: (value: boolean) => void;
  sliderValue: number;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  onSlider: (value: number) => void;
  unit: string;
  disabled?: boolean;
}

function GestureRow({
  label,
  toggleChecked,
  onToggle,
  sliderValue,
  sliderMin,
  sliderMax,
  sliderStep,
  onSlider,
  unit,
  disabled,
}: GestureRowProps) {
  const toggleId = `xeno-gesture-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const sliderId = `${toggleId}-sensitivity`;
  const sliderDisabled = disabled || !toggleChecked;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={toggleId} className="text-sm font-medium text-[rgb(var(--text-primary))]">
          {label}
        </label>
        <input
          id={toggleId}
          type="checkbox"
          role="switch"
          checked={toggleChecked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 accent-[rgb(var(--color-accent))]"
        />
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor={sliderId} className="text-xs text-[rgb(var(--text-muted))] shrink-0">
          Sensitivity
        </label>
        <input
          id={sliderId}
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          value={sliderValue}
          disabled={sliderDisabled}
          onChange={(e) => onSlider(Number(e.target.value))}
          className="h-1.5 w-full accent-[rgb(var(--color-accent))] disabled:opacity-40"
          aria-label={`${label} sensitivity`}
        />
        <span className="text-xs font-mono text-[rgb(var(--text-muted))] w-10 text-right tabular-nums">
          {sliderValue}{unit}
        </span>
      </div>
    </div>
  );
}
