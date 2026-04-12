'use client';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { ParameterBank } from './ParameterBank';
import { Randomizer } from './Randomizer';

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

  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-text-secondary whitespace-nowrap">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={rgbToHex(color.r, color.g, color.b)}
          onChange={(e) => setColor(colorKey, hexToRgb(e.target.value))}
          className="w-8 h-6 rounded cursor-pointer border border-border-subtle bg-transparent"
          style={{ width: '32px', height: '24px' }}
        />
        <span className="text-[10px] text-text-muted font-mono w-[120px]">
          Rgb&lt;{color.r},{color.g},{color.b}&gt;
        </span>
      </div>
    </div>
  );
}

/** Renders a small colored dot representing the style preview. */
function StyleDot({
  styleId,
  baseColor,
  gradientEnd,
}: {
  styleId: string;
  baseColor: { r: number; g: number; b: number };
  gradientEnd?: { r: number; g: number; b: number };
}) {
  const hex = rgbToHex(baseColor.r, baseColor.g, baseColor.b);
  const isGradient = styleId === 'gradient' && gradientEnd;
  const endHex = gradientEnd ? rgbToHex(gradientEnd.r, gradientEnd.g, gradientEnd.b) : hex;

  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{
        background: isGradient
          ? `linear-gradient(135deg, ${hex}, ${endHex})`
          : hex,
      }}
    />
  );
}

export function StylePanel() {
  const config = useBladeStore((s) => s.config);
  const setStyle = useBladeStore((s) => s.setStyle);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const brightness = useUIStore((s) => s.brightness);
  const setBrightness = useUIStore((s) => s.setBrightness);

  const showGradientEnd = config.style === 'gradient';
  const showEdgeColor = config.style === 'plasma';

  return (
    <div className="space-y-5">
      {/* Style buttons */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-3">
          Blade Style
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {BLADE_STYLES.map((style) => {
            const isActive = config.style === style.id;
            return (
              <button
                key={style.id}
                onClick={() => setStyle(style.id)}
                className={`text-left px-3 py-2.5 rounded text-xs transition-colors border-l-[4px] border-r border-t border-b ${
                  isActive
                    ? 'border-l-accent bg-accent-dim border-r-accent-border border-t-accent-border border-b-accent-border text-accent'
                    : 'border-l-transparent bg-bg-surface border-r-border-subtle border-t-border-subtle border-b-border-subtle text-text-secondary hover:text-text-primary hover:border-l-border-light'
                }`}
              >
                <div className="flex items-center gap-2">
                  <StyleDot
                    styleId={style.id}
                    baseColor={config.baseColor}
                    gradientEnd={config.gradientEnd}
                  />
                  <span className="font-medium">{style.label}</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 ml-4">{style.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-3">
          Colors
        </h3>
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
      </div>

      {/* Core Parameters (brightness, LED count) */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-3">
          Hardware
        </h3>
        <div className="space-y-4 bg-bg-surface rounded-panel p-3 border border-border-subtle">
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary w-20 shrink-0">Brightness</label>
            <input
              type="range"
              min={10}
              max={100}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-[10px] text-text-muted font-mono w-10 text-right">
              {brightness}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary w-20 shrink-0">LED Count</label>
            <input
              type="range"
              min={36}
              max={288}
              step={12}
              value={config.ledCount}
              onChange={(e) => updateConfig({ ledCount: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-[10px] text-text-muted font-mono w-10 text-right">
              {config.ledCount}
            </span>
          </div>
        </div>
      </div>

      {/* Parameter Bank (quick-access + advanced accordion groups) */}
      <ParameterBank />

      {/* Randomizer / Style Generator */}
      <Randomizer />
    </div>
  );
}
