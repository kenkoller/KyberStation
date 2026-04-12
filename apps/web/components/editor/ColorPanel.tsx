'use client';
import { useState, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';

// ─── Canon saber color presets ───

interface ColorPreset {
  id: string;
  label: string;
  color: { r: number; g: number; b: number };
  category: 'jedi' | 'sith' | 'neutral' | 'custom';
}

const COLOR_PRESETS: ColorPreset[] = [
  // Jedi blues
  { id: 'jedi-blue', label: 'Jedi Blue', color: { r: 0, g: 0, b: 255 }, category: 'jedi' },
  { id: 'obi-wan-blue', label: 'Obi-Wan Blue', color: { r: 0, g: 140, b: 255 }, category: 'jedi' },
  { id: 'anakin-blue', label: 'Anakin Blue', color: { r: 0, g: 80, b: 255 }, category: 'jedi' },
  { id: 'luke-esb', label: 'Luke ESB', color: { r: 0, g: 135, b: 255 }, category: 'jedi' },
  // Jedi greens
  { id: 'luke-rotj', label: 'Luke ROTJ Green', color: { r: 0, g: 255, b: 0 }, category: 'jedi' },
  { id: 'qui-gon', label: 'Qui-Gon Green', color: { r: 0, g: 220, b: 0 }, category: 'jedi' },
  { id: 'yoda-green', label: 'Yoda Green', color: { r: 80, g: 255, b: 20 }, category: 'jedi' },
  { id: 'kit-fisto', label: 'Kit Fisto Green', color: { r: 20, g: 255, b: 60 }, category: 'jedi' },
  // Jedi other
  { id: 'mace-purple', label: 'Mace Purple', color: { r: 128, g: 0, b: 255 }, category: 'jedi' },
  { id: 'temple-yellow', label: 'Temple Guard Yellow', color: { r: 255, g: 200, b: 0 }, category: 'jedi' },
  { id: 'rey-yellow', label: 'Rey Yellow', color: { r: 255, g: 180, b: 0 }, category: 'jedi' },
  { id: 'ahsoka-white', label: 'Ahsoka White', color: { r: 255, g: 255, b: 255 }, category: 'jedi' },
  // Sith reds
  { id: 'sith-red', label: 'Sith Red', color: { r: 255, g: 0, b: 0 }, category: 'sith' },
  { id: 'vader-red', label: 'Vader Red', color: { r: 255, g: 0, b: 0 }, category: 'sith' },
  { id: 'kylo-red', label: 'Kylo Unstable Red', color: { r: 255, g: 14, b: 0 }, category: 'sith' },
  { id: 'dooku-red', label: 'Dooku Red', color: { r: 200, g: 0, b: 0 }, category: 'sith' },
  { id: 'maul-red', label: 'Maul Red', color: { r: 255, g: 0, b: 10 }, category: 'sith' },
  { id: 'ventress-red', label: 'Ventress Red', color: { r: 240, g: 0, b: 20 }, category: 'sith' },
  // Neutral / special
  { id: 'darksaber-white', label: 'Darksaber', color: { r: 255, g: 255, b: 255 }, category: 'neutral' },
  { id: 'cal-cyan', label: 'Cal Kestis Cyan', color: { r: 0, g: 200, b: 255 }, category: 'neutral' },
  { id: 'cal-orange', label: 'Cal Kestis Orange', color: { r: 255, g: 90, b: 0 }, category: 'neutral' },
  { id: 'cal-magenta', label: 'Cal Kestis Magenta', color: { r: 255, g: 0, b: 180 }, category: 'neutral' },
  { id: 'revan-purple', label: 'Revan Purple', color: { r: 160, g: 0, b: 255 }, category: 'neutral' },
  { id: 'mara-jade', label: 'Mara Jade Purple-Blue', color: { r: 100, g: 0, b: 220 }, category: 'neutral' },
];

// ─── Clash color suggestions (complementary) ───

function suggestClashColor(base: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  const max = Math.max(base.r, base.g, base.b);
  // For dark or red bases, white clash looks best
  if (max < 100 || (base.r > base.g * 2 && base.r > base.b * 2)) {
    return { r: 255, g: 255, b: 255 };
  }
  // For blue/cyan, warm orange clash
  if (base.b > base.r && base.b > base.g) {
    return { r: 255, g: 180, b: 60 };
  }
  // For green, white/yellow clash
  if (base.g > base.r && base.g > base.b) {
    return { r: 255, g: 255, b: 100 };
  }
  // Default: white
  return { r: 255, g: 255, b: 255 };
}

function suggestLockupColor(base: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  // Lockup is typically warm orange/yellow
  return { r: 255, g: 200, b: 80 };
}

// ─── Color conversion helpers ───

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
  };
}

// ─── Color channel names ───

const COLOR_CHANNELS: Array<{ key: string; label: string; description: string }> = [
  { key: 'baseColor', label: 'Base Color', description: 'Primary blade color' },
  { key: 'clashColor', label: 'Clash', description: 'Flash on impact' },
  { key: 'lockupColor', label: 'Lockup', description: 'Sustained blade lock' },
  { key: 'blastColor', label: 'Blast', description: 'Blaster deflection' },
  { key: 'dragColor', label: 'Drag', description: 'Blade tip drag on ground' },
  { key: 'meltColor', label: 'Melt', description: 'Blade melt effect' },
  { key: 'lightningColor', label: 'Lightning Block', description: 'Force lightning deflection' },
];

// ─── Component ───

export function ColorPanel() {
  const config = useBladeStore((s) => s.config);
  const setColor = useBladeStore((s) => s.setColor);
  const [activeChannel, setActiveChannel] = useState<string>('baseColor');
  const [presetFilter, setPresetFilter] = useState<string>('all');

  const activeColor = (config as Record<string, unknown>)[activeChannel] as { r: number; g: number; b: number } | undefined
    ?? { r: 128, g: 128, b: 128 };
  const hsl = rgbToHsl(activeColor.r, activeColor.g, activeColor.b);

  const handleHSLChange = useCallback((field: 'h' | 's' | 'l', value: number) => {
    const newHsl = { ...hsl, [field]: value };
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setColor(activeChannel, rgb);
  }, [hsl, activeChannel, setColor]);

  const handleRGBChange = useCallback((field: 'r' | 'g' | 'b', value: number) => {
    const newColor = { ...activeColor, [field]: value };
    setColor(activeChannel, newColor);
  }, [activeColor, activeChannel, setColor]);

  const handlePresetClick = useCallback((preset: ColorPreset) => {
    setColor(activeChannel, preset.color);
    // Auto-suggest complementary clash/lockup when base color changes
    if (activeChannel === 'baseColor') {
      setColor('clashColor', suggestClashColor(preset.color));
      setColor('lockupColor', suggestLockupColor(preset.color));
    }
  }, [activeChannel, setColor]);

  const filteredPresets = presetFilter === 'all'
    ? COLOR_PRESETS
    : COLOR_PRESETS.filter(p => p.category === presetFilter);

  const showGradientEnd = config.style === 'gradient';
  const showEdgeColor = config.style === 'plasma';

  return (
    <div className="space-y-4">
      {/* ── Active channel selector ── */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
          Color Channel
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_CHANNELS.map((ch) => {
            const color = (config as Record<string, unknown>)[ch.key] as { r: number; g: number; b: number } | undefined;
            if (!color && ch.key !== 'baseColor' && ch.key !== 'clashColor' && ch.key !== 'lockupColor' && ch.key !== 'blastColor') return null;
            const isActive = activeChannel === ch.key;
            const displayColor = color ?? { r: 128, g: 128, b: 128 };
            return (
              <button
                key={ch.key}
                onClick={() => setActiveChannel(ch.key)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-colors ${
                  isActive
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light'
                }`}
                title={ch.description}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                  style={{ backgroundColor: rgbToHex(displayColor.r, displayColor.g, displayColor.b) }}
                />
                {ch.label}
              </button>
            );
          })}
          {showGradientEnd && (
            <button
              onClick={() => setActiveChannel('gradientEnd')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-colors ${
                activeChannel === 'gradientEnd'
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: rgbToHex(
                  (config.gradientEnd ?? { r: 0, g: 255, b: 100 }).r,
                  (config.gradientEnd ?? { r: 0, g: 255, b: 100 }).g,
                  (config.gradientEnd ?? { r: 0, g: 255, b: 100 }).b
                ) }}
              />
              Gradient End
            </button>
          )}
          {showEdgeColor && (
            <button
              onClick={() => setActiveChannel('edgeColor')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-colors ${
                activeChannel === 'edgeColor'
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: rgbToHex(
                  (config.edgeColor ?? { r: 255, g: 255, b: 255 }).r,
                  (config.edgeColor ?? { r: 255, g: 255, b: 255 }).g,
                  (config.edgeColor ?? { r: 255, g: 255, b: 255 }).b
                ) }}
              />
              Edge
            </button>
          )}
        </div>
      </div>

      {/* ── Color preview + hex input ── */}
      <div className="flex items-center gap-3 bg-bg-surface rounded-panel p-3 border border-border-subtle">
        <div
          className="w-14 h-14 rounded-lg border border-white/10 shrink-0"
          style={{ backgroundColor: rgbToHex(activeColor.r, activeColor.g, activeColor.b) }}
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={rgbToHex(activeColor.r, activeColor.g, activeColor.b)}
              onChange={(e) => {
                const rgb = hexToRgb(e.target.value);
                setColor(activeChannel, rgb);
              }}
              className="w-6 h-6 rounded cursor-pointer border border-border-subtle bg-transparent"
            />
            <span className="text-xs text-text-secondary font-mono">
              {rgbToHex(activeColor.r, activeColor.g, activeColor.b).toUpperCase()}
            </span>
          </div>
          <div className="text-[10px] text-text-muted font-mono">
            Rgb&lt;{activeColor.r},{activeColor.g},{activeColor.b}&gt;
          </div>
          <div className="text-[10px] text-text-muted font-mono">
            HSL({Math.round(hsl.h)}, {Math.round(hsl.s)}%, {Math.round(hsl.l)}%)
          </div>
        </div>
      </div>

      {/* ── HSL sliders ── */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
          HSL Adjustment
        </h3>
        <div className="space-y-3 bg-bg-surface rounded-panel p-3 border border-border-subtle">
          {/* Hue */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-text-secondary w-6">H</label>
            <input
              type="range"
              min={0}
              max={360}
              value={Math.round(hsl.h)}
              onChange={(e) => handleHSLChange('h', Number(e.target.value))}
              className="flex-1"
              style={{
                background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              }}
            />
            <span className="text-[10px] text-text-muted font-mono w-8 text-right">{Math.round(hsl.h)}</span>
          </div>

          {/* Saturation */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-text-secondary w-6">S</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(hsl.s)}
              onChange={(e) => handleHSLChange('s', Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-[10px] text-text-muted font-mono w-8 text-right">{Math.round(hsl.s)}%</span>
          </div>

          {/* Lightness */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-text-secondary w-6">L</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(hsl.l)}
              onChange={(e) => handleHSLChange('l', Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-[10px] text-text-muted font-mono w-8 text-right">{Math.round(hsl.l)}%</span>
          </div>
        </div>
      </div>

      {/* ── RGB sliders ── */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
          RGB Values
        </h3>
        <div className="space-y-3 bg-bg-surface rounded-panel p-3 border border-border-subtle">
          {(['r', 'g', 'b'] as const).map((ch) => (
            <div key={ch} className="flex items-center gap-2">
              <label className="text-[10px] text-text-secondary w-6 uppercase">{ch}</label>
              <input
                type="range"
                min={0}
                max={255}
                value={activeColor[ch]}
                onChange={(e) => handleRGBChange(ch, Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-[10px] text-text-muted font-mono w-8 text-right">{activeColor[ch]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Canon saber color presets ── */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
          Canon Presets
        </h3>
        <div className="flex gap-1.5 mb-2">
          {['all', 'jedi', 'sith', 'neutral'].map((cat) => (
            <button
              key={cat}
              onClick={() => setPresetFilter(cat)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors capitalize ${
                presetFilter === cat
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto">
          {filteredPresets.map((preset) => {
            const hex = rgbToHex(preset.color.r, preset.color.g, preset.color.b);
            const isMatch =
              activeColor.r === preset.color.r &&
              activeColor.g === preset.color.g &&
              activeColor.b === preset.color.b;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-left text-[10px] border transition-colors ${
                  isMatch
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-white/15 shrink-0"
                  style={{ backgroundColor: hex }}
                />
                <span className="truncate">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Auto-suggest ── */}
      {activeChannel === 'baseColor' && (
        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
          <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
            Auto-Suggest
          </h3>
          <p className="text-[10px] text-text-muted mb-2">
            Click to apply complementary colors for effects:
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const clash = suggestClashColor(activeColor);
                setColor('clashColor', clash);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border border-border-subtle bg-bg-deep text-text-secondary hover:border-accent transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: rgbToHex(...Object.values(suggestClashColor(activeColor)) as [number, number, number]) }}
              />
              Clash
            </button>
            <button
              onClick={() => {
                const lockup = suggestLockupColor(activeColor);
                setColor('lockupColor', lockup);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border border-border-subtle bg-bg-deep text-text-secondary hover:border-accent transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: rgbToHex(...Object.values(suggestLockupColor(activeColor)) as [number, number, number]) }}
              />
              Lockup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
