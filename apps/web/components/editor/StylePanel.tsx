'use client';
import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { playUISound } from '@/lib/uiSounds';
import { ParameterBank } from './ParameterBank';
import { Randomizer } from './Randomizer';
import { GradientBuilder } from './GradientBuilder';
import { GradientMixer } from './GradientMixer';
import { BladePainter } from './BladePainter';
import { ImageScrollPanel } from './ImageScrollPanel';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { ScrubField } from '@/components/shared/ScrubField';
import { MiniGalleryPicker } from '@/components/shared/MiniGalleryPicker';
import { getStyleThumbnail } from '@/lib/styleThumbnails';

const BLADE_STYLES = [
  { id: 'stable', label: 'Stable', desc: 'Classic solid blade' },
  { id: 'unstable', label: 'Unstable', desc: 'Kylo Ren crackling energy' },
  { id: 'fire', label: 'Fire', desc: 'Flame-like animated blade' },
  { id: 'pulse', label: 'Pulse', desc: 'Rhythmic energy pulse' },
  { id: 'rotoscope', label: 'Rotoscope', desc: 'Film-accurate OT shimmer' },
  { id: 'gradient', label: 'Gradient', desc: 'Multi-color gradient blend' },
  { id: 'photon', label: 'Photon Blade', desc: 'Particle stream effect' },
  { id: 'plasma', label: 'Plasma Storm', desc: 'Chaotic plasma arcs' },
  { id: 'crystalShatter', label: 'Crystal Shatter', desc: 'Fractured kyber effect' },
  { id: 'aurora', label: 'Aurora', desc: 'Northern lights shimmer' },
  { id: 'cinder', label: 'Cinder', desc: 'Dying ember trail' },
  { id: 'prism', label: 'Prism', desc: 'Rainbow refraction' },
  { id: 'dataStream', label: 'Data Stream', desc: 'Traveling data packets' },
  { id: 'gravity', label: 'Gravity', desc: 'Accelerometer-driven pooling' },
  { id: 'ember', label: 'Ember', desc: 'Rising ember particles' },
  { id: 'automata', label: 'Automata', desc: 'Cellular automaton pattern' },
  { id: 'helix', label: 'Helix', desc: 'Double helix sine waves' },
  { id: 'candle', label: 'Candle', desc: 'Fbm flicker with gust events' },
  { id: 'shatter', label: 'Shatter', desc: 'Independent shard pulses' },
  { id: 'neutron', label: 'Neutron', desc: 'Bouncing particle with trail' },
  { id: 'torrent', label: 'Torrent', desc: 'Rushing energy torrent' },
  { id: 'moire', label: 'Moir\u00e9', desc: 'Moir\u00e9 interference pattern' },
  { id: 'cascade', label: 'Cascade', desc: 'Cascading energy waves' },
  { id: 'vortex', label: 'Vortex', desc: 'Swirling vortex effect' },
  { id: 'nebula', label: 'Nebula', desc: 'Cosmic nebula clouds' },
  { id: 'tidal', label: 'Tidal', desc: 'Tidal wave oscillation' },
  { id: 'mirage', label: 'Mirage', desc: 'Heat shimmer mirage' },
  { id: 'painted', label: 'Painted', desc: 'Hand-painted blade colors' },
  { id: 'imageScroll', label: 'Image Scroll', desc: 'Scroll an image for light painting' },
];

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

interface ColorPickerRowProps {
  label: string;
  colorKey: string;
  color: { r: number; g: number; b: number };
}

function ColorPickerRow({ label, colorKey, color }: ColorPickerRowProps) {
  const setColor = useBladeStore((s) => s.setColor);

  const inputId = `color-${colorKey}`;

  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={inputId} className="text-ui-xs text-text-secondary whitespace-nowrap">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="color"
          value={rgbToHex(color.r, color.g, color.b)}
          onChange={(e) => setColor(colorKey, hexToRgb(e.target.value))}
          className="w-8 h-6 rounded cursor-pointer border border-border-subtle bg-transparent"
          style={{ width: '32px', height: '24px' }}
        />
        <span className="text-ui-sm text-text-muted font-mono w-[120px]">
          Rgb&lt;{color.r},{color.g},{color.b}&gt;
        </span>
      </div>
    </div>
  );
}

// ─── Style-Specific Parameter Definitions ───

interface StyleParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const STYLE_PARAMS: Record<string, StyleParamDef[]> = {
  fire: [
    { key: 'fireSize', label: 'Fire Size', min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
    { key: 'sparkRate', label: 'Spark Rate', min: 0, max: 1, step: 0.05, defaultValue: 0.3 },
    { key: 'heatSpread', label: 'Heat Spread', min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
  ],
  aurora: [
    { key: 'waveCount', label: 'Wave Count', min: 1, max: 8, step: 1, defaultValue: 3 },
    { key: 'driftSpeed', label: 'Drift Speed', min: 0, max: 2, step: 0.1, defaultValue: 0.5 },
  ],
  plasma: [
    { key: 'frequency', label: 'Frequency', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
    { key: 'phaseSpeed', label: 'Phase Speed', min: 0, max: 3, step: 0.1, defaultValue: 1 },
  ],
  prism: [
    { key: 'facets', label: 'Facets', min: 2, max: 12, step: 1, defaultValue: 6 },
    { key: 'rotationSpeed', label: 'Rotation Speed', min: 0, max: 5, step: 0.1, defaultValue: 1 },
  ],
  gradient: [
    { key: 'gradientSpeed', label: 'Scroll Speed', min: 0, max: 3, step: 0.1, defaultValue: 0.5 },
  ],
  pulse: [
    { key: 'pulseSpeed', label: 'Pulse Speed', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
    { key: 'pulseMinBright', label: 'Min Brightness', min: 0, max: 1, step: 0.05, defaultValue: 0.3 },
  ],
  unstable: [
    { key: 'flicker', label: 'Flicker Intensity', min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
  ],
  painted: [],
  imageScroll: [],
};

function StyleParamSlider({
  param,
  value,
  onChange,
}: {
  param: StyleParamDef;
  value: number;
  onChange: (value: number) => void;
}) {
  const decimals = param.step < 1 ? (param.step < 0.1 ? 2 : 1) : 0;
  return (
    <ScrubField
      id={`style-param-${param.key}`}
      label={param.label}
      min={param.min}
      max={param.max}
      step={param.step}
      value={value}
      onChange={onChange}
      format={(v) => v.toFixed(decimals)}
      labelClassName="w-24"
      readoutClassName="w-10"
    />
  );
}

// Legacy `StyleDot` removed 2026-04-21 as part of OV9 — the hue preview
// is now folded into the SVG thumbnails rendered by MiniGalleryPicker.

export function StylePanel() {
  const config = useBladeStore((s) => s.config);
  const setStyle = useBladeStore((s) => s.setStyle);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const brightness = useUIStore((s) => s.brightness);
  const setBrightness = useUIStore((s) => s.setBrightness);

  const showGradientEnd = config.style === 'gradient';
  const showEdgeColor = config.style === 'plasma';

  // Build MiniGalleryPicker items from BLADE_STYLES + static thumbnails.
  // Memoized on the shipped catalog (stable identity), so the grid's
  // active-id + click path is the only churn when the user flips styles.
  const styleItems = useMemo(
    () =>
      BLADE_STYLES.map((style) => {
        const entry = getStyleThumbnail(style.id);
        return {
          id: style.id,
          label: style.label,
          thumbnail: entry.thumbnail,
          description: style.desc,
        };
      }),
    [],
  );

  return (
    <div className="space-y-2">
      {/* Style buttons */}
      <CollapsibleSection
        title="Blade Style"
        defaultOpen={true}
        persistKey="StylePanel.blade-style"
        headerAccessory={
          <HelpTooltip text="Choose the base animation style. Each style has a unique visual character and may expose its own tunable parameters below." proffie="StylePtr<...>" />
        }
      >
        <div className="max-h-[420px] overflow-y-auto rounded border border-border-subtle p-1.5">
          {/* OV9: thumbnail-grid picker replaces the prior button list.
              Each style gets a signature SVG thumbnail (static) keyed by
              styleId in lib/styleThumbnails.tsx. Click applies immediately
              (preserving the existing setStyle + SFX behavior). Arrow
              keys + Enter/Space work via the MiniGalleryPicker primitive's
              keyboard-grid nav. StyleDot hue preview is folded into the
              SVG thumbnails' accent-token tint. */}
          <MiniGalleryPicker
            items={styleItems}
            activeId={config.style}
            onSelect={(id) => {
              playUISound('button-click');
              setStyle(id);
              playUISound('success');
            }}
            columns={3}
            ariaLabel="Blade style picker"
          />
        </div>
      </CollapsibleSection>

      {/* Style-Specific Parameters */}
      {STYLE_PARAMS[config.style] && (
        <CollapsibleSection
          title="Style Parameters"
          defaultOpen={true}
          persistKey="StylePanel.style-parameters"
          headerAccessory={
            <HelpTooltip text="Fine-tune the selected style's behavior. These sliders are specific to the current style — switching styles may show different parameters." />
          }
        >
          <div className="space-y-2 bg-bg-surface rounded-panel p-2 border border-border-subtle">
            {STYLE_PARAMS[config.style].map((param) => (
              <StyleParamSlider
                key={param.key}
                param={param}
                value={(config[param.key] as number | undefined) ?? param.defaultValue}
                onChange={(val) => updateConfig({ [param.key]: val })}
              />
            ))}
            {config.style === 'gradient' && (
              <>
                <GradientBuilder />
                <GradientMixer />
              </>
            )}
            {config.style === 'painted' && <BladePainter />}
            {config.style === 'imageScroll' && <ImageScrollPanel />}
          </div>
        </CollapsibleSection>
      )}

      {/* Colors */}
      <CollapsibleSection
        title="Colors"
        defaultOpen={true}
        persistKey="StylePanel.colors"
        headerAccessory={
          <HelpTooltip text="Quick color pickers for base blade and effect trigger colors. For advanced color editing with HSL sliders, harmony wheels, and canon presets, use the full Color Panel." proffie="Rgb<r,g,b>" />
        }
      >
        <div className="space-y-2 bg-bg-surface rounded-panel p-3 border border-border-subtle">
          <ColorPickerRow label="Base" colorKey="baseColor" color={config.baseColor} />
          <ColorPickerRow label="Clash" colorKey="clashColor" color={config.clashColor} />
          <ColorPickerRow label="Lockup" colorKey="lockupColor" color={config.lockupColor} />
          <ColorPickerRow label="Blast" colorKey="blastColor" color={config.blastColor} />
          {showGradientEnd && (
            <ColorPickerRow
              label="Gradient End"
              colorKey="gradientEnd"
              color={config.gradientEnd ?? { r: 0, g: 255, b: 100 }}
            />
          )}
          {showEdgeColor && (
            <ColorPickerRow
              label="Edge"
              colorKey="edgeColor"
              color={config.edgeColor ?? { r: 255, g: 255, b: 255 }}
            />
          )}
        </div>
      </CollapsibleSection>

      {/* Core Parameters (brightness, LED count) */}
      <CollapsibleSection
        title="Hardware"
        defaultOpen={false}
        persistKey="StylePanel.hardware"
        headerAccessory={
          <HelpTooltip text="LED brightness and count. These should match your physical blade setup for accurate simulation. See also: Blade Hardware panel for topology and strip config, Power Draw for battery estimates." proffie="MaxLedsPerStrip" />
        }
      >
        <div className="space-y-2 bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <ScrubField
            id="hw-brightness"
            label="Brightness"
            min={10} max={100}
            value={brightness}
            onChange={setBrightness}
            unit="%"
            labelClassName="w-20"
            readoutClassName="w-10"
          />
          <ScrubField
            id="hw-led-count"
            label="LED Count"
            min={36} max={288} step={12}
            value={config.ledCount}
            onChange={(v) => updateConfig({ ledCount: v })}
            labelClassName="w-20"
            readoutClassName="w-10"
          />
        </div>
      </CollapsibleSection>

      {/* Parameter Bank (quick-access + advanced accordion groups) */}
      <ParameterBank />

      {/* Randomizer / Style Generator */}
      <Randomizer />
    </div>
  );
}
