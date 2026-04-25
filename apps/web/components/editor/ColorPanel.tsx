'use client';

// ─── ColorPanel — unified color + gradient editor ────────────────────────────
//
// v0.14.0 left-rail overhaul (2026-04-24): the former GradientBuilder panel
// has been merged into ColorPanel. Picking a color and editing a gradient are
// the same conceptual job ("decide what color the blade is") — they live in
// one place now.
//
// Top-to-bottom flow:
//   1. CHANNEL selector — 4 buttons [Base · Clash · Lockup · Blast]. The
//      active channel determines what's being edited below.
//   2. Color preview swatch (sRGB + as-on-blade Neopixel approximation),
//      hex input, and RGB/HSL readouts.
//   3. HSL sliders (Hue · Saturation · Lightness).
//   4. Visual divider labelled "─── GRADIENT (base channel only) ───".
//   5. Gradient region — Linear/Smooth/Step interpolation picker, stops bar
//      with click-to-add, drag-to-reposition, Delete-to-remove. Only renders
//      when the active channel is "Base" (clash/lockup/blast are typically
//      solid colors and have no gradient editor).
//   6. RGB sliders, Color Harmony, Canon Presets, and Auto-Suggest are kept
//      from the previous ColorPanel — they apply to whichever channel is
//      currently active.
//
// Both halves are views over the same `bladeStore` — gradient stops live in
// `config.gradientStops`, gradient mode in `config.gradientInterpolation`,
// channel colors in `config.{baseColor|clashColor|lockupColor|blastColor}`.
// No state duplication.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import {
  rgbToHsl as engineRgbToHsl,
  getHarmonyColors,
} from '@kyberstation/engine';
import type { HarmonyType } from '@kyberstation/engine';
import { getSaberColorName } from '@/lib/saberColorNames';
import { playUISound } from '@/lib/uiSounds';
import {
  srgbToNeopixelPreview,
  rgbToHex as neopixelRgbToHex,
} from '@/lib/neopixelColor';
import { useDragToScrub } from '@/hooks/useDragToScrub';

// ─── Canon saber color presets ───

interface ColorPreset {
  id: string;
  label: string;
  color: { r: number; g: number; b: number };
  category: 'jedi' | 'sith' | 'neutral' | 'custom';
}

// RGB values below are derived from the corresponding `namingMath.ts` landmark
// HSL coords so clicking a preset lands on a tier-1 landmark-exact name in the
// color readout (e.g. "Obi-Wan Blue" → "Obi-Wan Azure"). Keep presets in sync
// with the landmark table — the landmark is the source of truth for the name.
const COLOR_PRESETS: ColorPreset[] = [
  // Jedi blues
  { id: 'jedi-blue', label: 'Jedi Blue', color: { r: 10, g: 57, b: 230 }, category: 'jedi' },              // Jedi Guardian (227, 92, 47)
  { id: 'obi-wan-blue', label: 'Obi-Wan Blue', color: { r: 22, g: 114, b: 243 }, category: 'jedi' },       // Obi-Wan Azure (215, 90, 52)
  { id: 'anakin-blue', label: 'Anakin Blue', color: { r: 15, g: 34, b: 245 }, category: 'jedi' },          // Anakin Skywalker (235, 92, 51)
  { id: 'luke-esb', label: 'Luke ESB', color: { r: 22, g: 114, b: 243 }, category: 'jedi' },               // Obi-Wan Azure (215, 90, 52) — hero-blue, shared with Obi-Wan
  // Jedi greens
  { id: 'luke-rotj', label: 'Luke ROTJ Green', color: { r: 6, g: 234, b: 25 }, category: 'jedi' },         // Luke ROTJ Green (125, 95, 47)
  { id: 'qui-gon', label: 'Qui-Gon Green', color: { r: 54, g: 210, b: 30 }, category: 'jedi' },            // Qui-Gon Sage (112, 75, 47)
  { id: 'yoda-green', label: 'Yoda Green', color: { r: 50, g: 245, b: 20 }, category: 'jedi' },            // Yoda Verdant (112, 92, 52)
  { id: 'kit-fisto', label: 'Kit Fisto Green', color: { r: 17, g: 238, b: 109 }, category: 'jedi' },       // Kit Fisto Emerald (145, 87, 50)
  // Jedi other
  { id: 'mace-purple', label: 'Mace Purple', color: { r: 132, g: 11, b: 218 }, category: 'jedi' },         // Mace Windu Violet (275, 90, 45)
  { id: 'temple-yellow', label: 'Temple Guard Yellow', color: { r: 245, g: 190, b: 10 }, category: 'jedi' }, // Temple Guard Gold (46, 92, 50)
  { id: 'rey-yellow', label: 'Rey Yellow', color: { r: 245, g: 206, b: 10 }, category: 'jedi' },           // Rey Skywalker Gold (50, 92, 50)
  { id: 'ahsoka-white', label: 'Ahsoka White', color: { r: 248, g: 247, b: 247 }, category: 'jedi' },      // Purified Kyber (0, 3, 97) — highest-priority achromatic
  // Sith reds
  { id: 'sith-red', label: 'Sith Red', color: { r: 228, g: 12, b: 12 }, category: 'sith' },                // Sith Crimson (0, 90, 47)
  { id: 'vader-red', label: 'Vader Red', color: { r: 249, g: 16, b: 20 }, category: 'sith' },              // Vader Bloodshine (359, 95, 52)
  { id: 'kylo-red', label: 'Kylo Unstable Red', color: { r: 245, g: 38, b: 15 }, category: 'sith' },       // Kylo Unstable (6, 92, 51)
  { id: 'dooku-red', label: 'Dooku Red', color: { r: 175, g: 29, b: 29 }, category: 'sith' },              // Inquisitor Red (0, 72, 40) — dark crimson, closest landmark
  { id: 'maul-red', label: 'Maul Red', color: { r: 201, g: 8, b: 8 }, category: 'sith' },                  // Maul Fury (0, 92, 41)
  { id: 'ventress-red', label: 'Ventress Red', color: { r: 228, g: 7, b: 7 }, category: 'sith' },          // Asajj Ventress Crimson (0, 94, 46)
  // Neutral / special
  { id: 'darksaber-white', label: 'Darksaber', color: { r: 255, g: 255, b: 255 }, category: 'neutral' },   // No corresponding namingMath landmark — the color is the source of truth for this name
  { id: 'cal-cyan', label: 'Cal Kestis Cyan', color: { r: 20, g: 200, b: 245 }, category: 'neutral' },     // Cal Kestis Cyan (192, 92, 52)
  { id: 'cal-orange', label: 'Cal Kestis Orange', color: { r: 245, g: 116, b: 10 }, category: 'neutral' }, // Cal Kestis Orange (27, 92, 50)
  { id: 'cal-magenta', label: 'Cal Kestis Magenta', color: { r: 228, g: 12, b: 149 }, category: 'neutral' }, // Cal Kestis Magenta (322, 90, 47)
  { id: 'revan-purple', label: 'Revan Purple', color: { r: 68, g: 16, b: 198 }, category: 'neutral' },     // Revan Indigo (257, 85, 42)
  { id: 'mara-jade', label: 'Mara Jade Purple-Blue', color: { r: 76, g: 38, b: 227 }, category: 'neutral' }, // Satele Shan Blue-Violet (252, 77, 52) — closest purple-blue landmark
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

function suggestLockupColor(_base: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
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

// ─── Blender-style drag-to-scrub label ───
// Thin wrapper over the shared `useDragToScrub` hook. The curve, modifier
// behaviour, and haptic zone logic live in `@/lib/severanceDragCurve` +
// `@/hooks/useDragToScrub` so every editor panel shares the exact same
// tactile "feels right" scrub. Keeps the native `<input type="range">` for
// keyboard + screen reader users so we don't regress accessibility.

function ScrubLabel({
  htmlFor,
  text,
  value,
  min,
  max,
  step = 1,
  onScrub,
  className = '',
}: {
  htmlFor: string;
  text: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onScrub: (next: number) => void;
  className?: string;
}) {
  const pointerHandlers = useDragToScrub<HTMLLabelElement>({
    value,
    min,
    max,
    step,
    onScrub,
  });

  return (
    <label
      htmlFor={htmlFor}
      title={`Drag to scrub (Shift 10×, Alt 0.1×). Click input to type.`}
      {...pointerHandlers}
      className={`font-mono cursor-ew-resize select-none touch-none ${className}`}
      style={{ touchAction: 'none' }}
    >
      {text}
    </label>
  );
}

// ─── Color channel registry ───
//
// v0.14.0: trimmed to the 4 primary channels. The former drag/melt/lightning
// channels were rarely customised; they fall back to clash by default in
// codegen, so dropping them from the picker is non-destructive — bindings
// in `config.dragColor` etc. are still persisted by `bladeStore.setColor`
// when set programmatically.

const COLOR_CHANNELS: Array<{ key: string; label: string; description: string }> = [
  { key: 'baseColor', label: 'Base', description: 'Primary blade color' },
  { key: 'clashColor', label: 'Clash', description: 'Flash on impact' },
  { key: 'lockupColor', label: 'Lockup', description: 'Sustained blade lock' },
  { key: 'blastColor', label: 'Blast', description: 'Blaster deflection' },
];

/**
 * Channels that show the gradient editor. Per the v0.14.0 brief, only the
 * base channel gets a gradient — clash/lockup/blast are typically solid
 * colors driven by hardware-fidelity `Rgb<>` templates in ProffieOS, not
 * gradients. Exported for the merged-panel tests.
 */
export const GRADIENT_ENABLED_CHANNELS: ReadonlyArray<string> = ['baseColor'];

/** Whether the active channel should render the inline gradient region. */
export function shouldShowGradient(activeChannel: string): boolean {
  return GRADIENT_ENABLED_CHANNELS.includes(activeChannel);
}

// ─── Gradient interpolation options ───

interface GradientStop {
  position: number;
  color: { r: number; g: number; b: number };
}

const DEFAULT_GRADIENT_STOPS: GradientStop[] = [
  { position: 0, color: { r: 0, g: 100, b: 255 } },
  { position: 1, color: { r: 255, g: 50, b: 0 } },
];

const INTERPOLATION_OPTIONS: Array<{
  id: 'linear' | 'smooth' | 'step';
  label: string;
  description: string;
}> = [
  { id: 'linear', label: 'Linear', description: 'Straight-line blending between colors' },
  { id: 'smooth', label: 'Smooth', description: 'Eased transitions (S-curve) between colors' },
  { id: 'step', label: 'Step', description: 'Hard color bands with no blending' },
];

// ─── Component ───

export function ColorPanel() {
  const config = useBladeStore((s) => s.config);
  const setColor = useBladeStore((s) => s.setColor);
  const activeChannel = useUIStore((s) => s.activeColorChannel);
  const setActiveChannel = useUIStore((s) => s.setActiveColorChannel);
  const [presetFilter, setPresetFilter] = useState<string>('all');

  const [hexInput, setHexInput] = useState('');
  const [hexFocused, setHexFocused] = useState(false);

  // Coerce non-canonical channels (e.g. legacy `dragColor` left over from
  // pre-v0.14.0 sessions) back to baseColor so the picker stays responsive.
  const isCanonicalChannel = COLOR_CHANNELS.some((c) => c.key === activeChannel);
  const effectiveChannel = isCanonicalChannel ? activeChannel : 'baseColor';

  const activeColor = (config as Record<string, unknown>)[effectiveChannel] as
    | { r: number; g: number; b: number }
    | undefined
    ?? { r: 128, g: 128, b: 128 };
  const hsl = rgbToHsl(activeColor.r, activeColor.g, activeColor.b);
  const currentHex = rgbToHex(activeColor.r, activeColor.g, activeColor.b).toUpperCase();

  // Sync hex input when color changes externally (slider, preset, etc.)
  useEffect(() => {
    if (!hexFocused) {
      setHexInput(currentHex);
    }
  }, [currentHex, hexFocused]);

  const handleHexSubmit = useCallback((value: string) => {
    const cleaned = value.trim().replace(/^#?/, '#');
    if (/^#[a-fA-F0-9]{6}$/.test(cleaned)) {
      const rgb = hexToRgb(cleaned);
      setColor(effectiveChannel, rgb);
      if (effectiveChannel === 'baseColor') {
        setColor('clashColor', suggestClashColor(rgb));
        setColor('lockupColor', suggestLockupColor(rgb));
      }
    }
  }, [effectiveChannel, setColor]);

  const handleHSLChange = useCallback((field: 'h' | 's' | 'l', value: number) => {
    const newHsl = { ...hsl, [field]: value };
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setColor(effectiveChannel, rgb);
  }, [hsl, effectiveChannel, setColor]);

  const handleRGBChange = useCallback((field: 'r' | 'g' | 'b', value: number) => {
    const newColor = { ...activeColor, [field]: value };
    setColor(effectiveChannel, newColor);
  }, [activeColor, effectiveChannel, setColor]);

  const handlePresetClick = useCallback((preset: ColorPreset) => {
    playUISound('button-click');
    setColor(effectiveChannel, preset.color);
    // Auto-suggest complementary clash/lockup when base color changes
    if (effectiveChannel === 'baseColor') {
      setColor('clashColor', suggestClashColor(preset.color));
      setColor('lockupColor', suggestLockupColor(preset.color));
    }
  }, [effectiveChannel, setColor]);

  const filteredPresets = presetFilter === 'all'
    ? COLOR_PRESETS
    : COLOR_PRESETS.filter(p => p.category === presetFilter);

  const showGradient = shouldShowGradient(effectiveChannel);

  return (
    <div className="space-y-2">
      {/* ── Channel selector ── */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Channel
          <HelpTooltip text="Select which color channel to edit. Base is the primary blade color, Clash flashes on impact, Lockup holds during sustained blade contact, Blast deflects blaster bolts. The gradient editor is available on the Base channel only — other channels are typically solid colors." proffie="Rgb<r,g,b> / RgbArg<>" />
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_CHANNELS.map((ch) => {
            const color = (config as Record<string, unknown>)[ch.key] as { r: number; g: number; b: number } | undefined;
            const isActive = effectiveChannel === ch.key;
            const displayColor = color ?? { r: 128, g: 128, b: 128 };
            return (
              <button
                key={ch.key}
                onClick={() => setActiveChannel(ch.key)}
                className={`touch-target flex items-center gap-1.5 px-2 py-1 rounded text-ui-sm border transition-colors ${
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
        </div>
      </div>

      {/* ── Color preview + hex input ── */}
      <div className="flex items-center gap-2 bg-bg-surface rounded-panel p-2 border border-border-subtle">
        <div
          className="flex flex-col gap-0.5 shrink-0"
          title="Top: picker (sRGB). Bottom: as-on-blade (Neopixel + polycarbonate diffusion approximation)."
        >
          <div
            className="w-14 h-7 rounded-t-sm border border-white/10"
            style={{ backgroundColor: rgbToHex(activeColor.r, activeColor.g, activeColor.b) }}
            aria-label="Picker colour (sRGB)"
          />
          <div
            className="w-14 h-7 rounded-b-sm border border-white/10"
            style={{
              backgroundColor: neopixelRgbToHex(srgbToNeopixelPreview(activeColor)),
            }}
            aria-label="As-on-blade preview (Neopixel approximation)"
          />
          <div className="text-ui-xs text-text-muted leading-tight font-mono text-center">
            sRGB<br />on-blade
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={rgbToHex(activeColor.r, activeColor.g, activeColor.b)}
              onChange={(e) => {
                const rgb = hexToRgb(e.target.value);
                setColor(effectiveChannel, rgb);
              }}
              aria-label={`Pick color for ${effectiveChannel}`}
              className="touch-target w-6 h-6 rounded cursor-pointer border border-border-subtle bg-transparent"
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value.toUpperCase())}
              onFocus={() => setHexFocused(true)}
              onBlur={(e) => {
                setHexFocused(false);
                handleHexSubmit(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleHexSubmit(hexInput);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              maxLength={7}
              spellCheck={false}
              aria-label={`Hex color for ${effectiveChannel}`}
              className="w-20 px-1.5 py-0.5 rounded text-ui-xs font-mono bg-bg-deep border border-border-subtle text-text-secondary focus:border-accent focus:text-accent focus:outline-none transition-colors"
            />
          </div>
          <div className="text-ui-sm text-accent italic leading-tight">
            {getSaberColorName(activeColor.r, activeColor.g, activeColor.b)}
          </div>
          <div className="text-ui-sm text-text-muted font-mono">
            Rgb&lt;{activeColor.r},{activeColor.g},{activeColor.b}&gt;
          </div>
          <div className="text-ui-sm text-text-muted font-mono">
            HSL({Math.round(hsl.h)}, {Math.round(hsl.s)}%, {Math.round(hsl.l)}%)
          </div>
        </div>
      </div>

      {/* ── HSL sliders ── */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          HSL Adjustment
          <HelpTooltip text="Hue, Saturation, Lightness — an intuitive way to fine-tune colors. Hue picks the color, Saturation controls vibrancy, Lightness sets brightness. ProffieOS uses RGB internally, but HSL is easier for color design." proffie="RotateColorsX<Int<hue>, Rgb<...>>" />
        </h3>
        <div className="space-y-2 bg-bg-surface rounded-panel p-2 border border-border-subtle">
          {/* Hue */}
          <div className="flex items-center gap-2">
            <ScrubLabel
              htmlFor="hsl-hue"
              text="H"
              value={hsl.h}
              min={0}
              max={360}
              step={1}
              onScrub={(v) => handleHSLChange('h', Math.round(v))}
              className="text-ui-sm text-text-secondary w-6"
            />
            <input
              id="hsl-hue"
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
            <span className="text-ui-sm text-text-muted font-mono w-8 text-right">{Math.round(hsl.h)}</span>
          </div>

          {/* Saturation */}
          <div className="flex items-center gap-2">
            <ScrubLabel
              htmlFor="hsl-saturation"
              text="S"
              value={hsl.s}
              min={0}
              max={100}
              step={0.5}
              onScrub={(v) => handleHSLChange('s', Math.round(v))}
              className="text-ui-sm text-text-secondary w-6"
            />
            <input
              id="hsl-saturation"
              type="range"
              min={0}
              max={100}
              value={Math.round(hsl.s)}
              onChange={(e) => handleHSLChange('s', Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-ui-sm text-text-muted font-mono w-8 text-right">{Math.round(hsl.s)}%</span>
          </div>

          {/* Lightness */}
          <div className="flex items-center gap-2">
            <ScrubLabel
              htmlFor="hsl-lightness"
              text="L"
              value={hsl.l}
              min={0}
              max={100}
              step={0.5}
              onScrub={(v) => handleHSLChange('l', Math.round(v))}
              className="text-ui-sm text-text-secondary w-6"
            />
            <input
              id="hsl-lightness"
              type="range"
              min={0}
              max={100}
              value={Math.round(hsl.l)}
              onChange={(e) => handleHSLChange('l', Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-ui-sm text-text-muted font-mono w-8 text-right">{Math.round(hsl.l)}%</span>
          </div>
        </div>
      </div>

      {/* ── Gradient region (base channel only) ── */}
      <div
        data-testid="gradient-divider"
        className="pt-2 border-t border-border-subtle"
        aria-hidden={!showGradient}
      >
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 font-mono flex items-center gap-1">
          ─── Gradient (base channel only) ───
        </h3>
      </div>
      {showGradient && <GradientRegion />}

      {/* ── RGB sliders ── */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          RGB Values
          <HelpTooltip text="Direct red/green/blue channel values (0-255). These map directly to ProffieOS Rgb<> template arguments. Tip: pure blue (0,0,255) draws less power than white (255,255,255)." proffie="Rgb<r,g,b>" />
        </h3>
        <div className="space-y-2 bg-bg-surface rounded-panel p-2 border border-border-subtle">
          {(['r', 'g', 'b'] as const).map((ch) => (
            <div key={ch} className="flex items-center gap-2">
              <ScrubLabel
                htmlFor={`rgb-${ch}`}
                text={ch.toUpperCase()}
                value={activeColor[ch]}
                min={0}
                max={255}
                step={1}
                onScrub={(v) => handleRGBChange(ch, Math.round(v))}
                className="text-ui-sm text-text-secondary w-6"
              />
              <input
                id={`rgb-${ch}`}
                type="range"
                min={0}
                max={255}
                value={activeColor[ch]}
                onChange={(e) => handleRGBChange(ch, Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-ui-sm text-text-muted font-mono w-8 text-right">{activeColor[ch]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Color Harmony ── */}
      <ColorHarmonySection
        activeColor={activeColor}
        activeChannel={effectiveChannel}
        setColor={setColor}
      />

      {/* ── Canon saber color presets ── */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Canon Presets
          <HelpTooltip text="Film-accurate lightsaber colors from Star Wars characters. Click any preset to apply it to the currently selected color channel." />
        </h3>
        <div className="flex gap-1.5 mb-2">
          {['all', 'jedi', 'sith', 'neutral'].map((cat) => (
            <button
              key={cat}
              onClick={() => setPresetFilter(cat)}
              className={`touch-target px-2 py-0.5 rounded text-ui-sm border transition-colors capitalize ${
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
                className={`touch-target flex items-center gap-2 px-2 py-1.5 rounded text-left text-ui-sm border transition-colors ${
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
      {effectiveChannel === 'baseColor' && (
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
            Auto-Suggest
            <HelpTooltip text="Generates complementary clash and lockup colors based on your base color. Blue blades get warm orange clashes, green blades get white/yellow, etc." />
          </h3>
          <p className="text-ui-sm text-text-muted mb-2">
            Click to apply complementary colors for effects:
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const clash = suggestClashColor(activeColor);
                setColor('clashColor', clash);
              }}
              className="touch-target flex items-center gap-1.5 px-2 py-1 rounded text-ui-sm border border-border-subtle bg-bg-deep text-text-secondary hover:border-accent transition-colors"
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
              className="touch-target flex items-center gap-1.5 px-2 py-1 rounded text-ui-sm border border-border-subtle bg-bg-deep text-text-secondary hover:border-accent transition-colors"
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

// ─── Color Harmony Section ───

const HARMONY_TYPES: Array<{ id: HarmonyType; label: string; description: string }> = [
  { id: 'complementary', label: 'Comp', description: 'Opposite on the color wheel (high contrast)' },
  { id: 'analogous', label: 'Analog', description: 'Adjacent hues (harmonious, low contrast)' },
  { id: 'triadic', label: 'Triad', description: 'Three evenly spaced hues (vibrant, balanced)' },
  { id: 'split-complementary', label: 'Split', description: 'Two colors adjacent to the complement (balanced contrast)' },
  { id: 'tetradic', label: 'Tetra', description: 'Four evenly spaced hues (rich, complex)' },
];

const EFFECT_CHANNELS = ['clashColor', 'lockupColor', 'blastColor', 'dragColor', 'meltColor', 'lightningColor'] as const;

function ColorHarmonySection({
  activeColor,
  activeChannel,
  setColor,
}: {
  activeColor: { r: number; g: number; b: number };
  activeChannel: string;
  setColor: (channel: string, color: { r: number; g: number; b: number }) => void;
}) {
  const [harmonyType, setHarmonyType] = useState<HarmonyType>('complementary');
  const wheelRef = useRef<HTMLCanvasElement>(null);

  const harmonyColors = getHarmonyColors(activeColor, harmonyType);
  const activeHsl = engineRgbToHsl(activeColor);

  // Draw color wheel
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 4;

    ctx.clearRect(0, 0, size, size);

    // Draw hue ring
    for (let angle = 0; angle < 360; angle++) {
      const rad = (angle - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(center + (radius - 16) * Math.cos(rad), center + (radius - 16) * Math.sin(rad));
      ctx.lineTo(center + radius * Math.cos(rad), center + radius * Math.sin(rad));
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw active color dot on wheel
    const activeRad = (activeHsl.h - 90) * (Math.PI / 180);
    const dotR = radius - 8;
    ctx.beginPath();
    ctx.arc(center + dotR * Math.cos(activeRad), center + dotR * Math.sin(activeRad), 5, 0, Math.PI * 2);
    ctx.fillStyle = rgbToHex(activeColor.r, activeColor.g, activeColor.b);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw harmony dots
    harmonyColors.forEach((hc) => {
      const hcHsl = engineRgbToHsl(hc);
      const hcRad = (hcHsl.h - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.arc(center + dotR * Math.cos(hcRad), center + dotR * Math.sin(hcRad), 4, 0, Math.PI * 2);
      ctx.fillStyle = rgbToHex(hc.r, hc.g, hc.b);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw lines connecting active to harmony dots
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    harmonyColors.forEach((hc) => {
      const hcHsl = engineRgbToHsl(hc);
      const hcRad = (hcHsl.h - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(center + dotR * Math.cos(activeRad), center + dotR * Math.sin(activeRad));
      ctx.lineTo(center + dotR * Math.cos(hcRad), center + dotR * Math.sin(hcRad));
      ctx.stroke();
    });
  }, [activeColor, activeHsl.h, harmonyColors]);

  const applyToEffects = useCallback(() => {
    // Distribute harmony colors across effect channels
    const channelsToFill = EFFECT_CHANNELS.slice(0, harmonyColors.length);
    channelsToFill.forEach((ch, i) => {
      setColor(ch, harmonyColors[i]);
    });
  }, [harmonyColors, setColor]);

  return (
    <div>
      <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
        Color Harmony
        <HelpTooltip text="Generate complementary, analogous, or triadic colors from your active color. Apply them to effect channels for cohesive blade styling." />
      </h3>
      <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
        {/* Harmony type buttons */}
        <div className="flex flex-wrap gap-1">
          {HARMONY_TYPES.map((ht) => (
            <button
              key={ht.id}
              onClick={() => setHarmonyType(ht.id)}
              className={`touch-target px-2 py-1 rounded text-ui-sm font-medium transition-colors border ${
                harmonyType === ht.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
              title={ht.description}
            >
              {ht.label}
            </button>
          ))}
        </div>

        {/* Wheel + swatches row */}
        <div className="flex items-start gap-3">
          <canvas
            ref={wheelRef}
            width={100}
            height={100}
            className="shrink-0 rounded"
          />
          <div className="flex-1 space-y-2">
            <div className="text-ui-xs text-text-muted">Generated colors:</div>
            <div className="flex flex-wrap gap-1.5">
              {harmonyColors.map((hc, i) => (
                <button
                  key={i}
                  onClick={() => setColor(activeChannel, hc)}
                  className="touch-target group relative"
                  aria-label={`Apply harmony color ${getSaberColorName(hc.r, hc.g, hc.b)} to ${activeChannel}`}
                  title={`${getSaberColorName(hc.r, hc.g, hc.b)} — Rgb<${hc.r},${hc.g},${hc.b}>`}
                >
                  <span
                    className="block w-7 h-7 rounded border border-white/15 group-hover:border-accent transition-colors"
                    style={{ backgroundColor: rgbToHex(hc.r, hc.g, hc.b) }}
                  />
                </button>
              ))}
            </div>
            {activeChannel === 'baseColor' && harmonyColors.length > 0 && (
              <button
                onClick={applyToEffects}
                className="touch-target text-ui-xs px-2 py-1 rounded border border-border-subtle text-text-muted hover:text-accent hover:border-accent-border/40 transition-colors"
                title="Auto-assign harmony colors to clash, lockup, blast, etc."
              >
                Apply to effects
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gradient region (inlined from former GradientBuilder.tsx) ─────────────
//
// Identical behavior to the standalone GradientBuilder panel: click bar to
// add stops, drag stops to reposition, select+Delete to remove (min 2).
// Reads/writes `config.gradientStops` and `config.gradientInterpolation`
// via `useBladeStore` — no state duplication with the picker above.

function GradientRegion() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const stops: GradientStop[] =
    (config.gradientStops as GradientStop[] | undefined) ?? DEFAULT_GRADIENT_STOPS;
  const interpolation =
    (config.gradientInterpolation as 'linear' | 'smooth' | 'step' | undefined) ?? 'linear';
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  const setStops = useCallback(
    (newStops: GradientStop[]) => {
      updateConfig({ gradientStops: newStops });
    },
    [updateConfig],
  );

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Don't add stops during drag
      if (draggingIndex !== null) return;
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      // Don't add if clicking near an existing stop
      const tooClose = stops.some((s) => Math.abs(s.position - pos) < 0.03);
      if (tooClose) return;

      // Interpolate color at this position
      const sorted = [...stops].sort((a, b) => a.position - b.position);
      let lower = sorted[0];
      let upper = sorted[sorted.length - 1];
      for (let i = 0; i < sorted.length - 1; i++) {
        if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
          lower = sorted[i];
          upper = sorted[i + 1];
          break;
        }
      }
      const range = upper.position - lower.position;
      const t = range > 0 ? (pos - lower.position) / range : 0;
      const newColor = {
        r: Math.round(lower.color.r + (upper.color.r - lower.color.r) * t),
        g: Math.round(lower.color.g + (upper.color.g - lower.color.g) * t),
        b: Math.round(lower.color.b + (upper.color.b - lower.color.b) * t),
      };

      const newStops = [...stops, { position: pos, color: newColor }];
      setStops(newStops);
      setSelectedIndex(newStops.length - 1);
    },
    [stops, setStops, draggingIndex],
  );

  const handleStopColorChange = useCallback(
    (index: number, hex: string) => {
      const newStops = stops.map((s, i) => (i === index ? { ...s, color: hexToRgb(hex) } : s));
      setStops(newStops);
    },
    [stops, setStops],
  );

  const handleDeleteStop = useCallback(
    (index: number) => {
      if (stops.length <= 2) return;
      const newStops = stops.filter((_, i) => i !== index);
      setStops(newStops);
      setSelectedIndex(null);
    },
    [stops, setStops],
  );

  // Drag-to-reposition stops
  const handleStopPointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingIndex(index);
      setSelectedIndex(index);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const rounded = Math.round(pos * 1000) / 1000;
      const newStops = stops.map((s, i) =>
        i === draggingIndex ? { ...s, position: rounded } : s,
      );
      setStops(newStops);
    },
    [draggingIndex, stops, setStops],
  );

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handlePositionInput = useCallback(
    (index: number, value: number) => {
      const clamped = Math.max(0, Math.min(100, value)) / 100;
      const newStops = stops.map((s, i) =>
        i === index ? { ...s, position: Math.round(clamped * 1000) / 1000 } : s,
      );
      setStops(newStops);
    },
    [stops, setStops],
  );

  // Handle keyboard delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIndex !== null) {
        e.preventDefault();
        handleDeleteStop(selectedIndex);
      }
    };
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIndex, handleDeleteStop]);

  // Build CSS gradient string
  const gradientCSS = sortedStops
    .map((s) => {
      const hex = rgbToHex(s.color.r, s.color.g, s.color.b);
      const pct = (s.position * 100).toFixed(0);
      return `${hex} ${pct}%`;
    })
    .join(', ');

  return (
    <div
      data-testid="gradient-region"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2"
    >
      {/* Interpolation mode picker */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-ui-xs text-text-muted uppercase tracking-wider font-mono">Mode</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Interpolation mode">
          {INTERPOLATION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              role="radio"
              aria-checked={interpolation === opt.id}
              onClick={() => updateConfig({ gradientInterpolation: opt.id })}
              className={`px-1.5 py-0.5 rounded text-ui-xs border transition-colors ${
                interpolation === opt.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
              title={opt.description}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stop color inputs positioned above the bar */}
      <div className="relative h-8">
        {stops.map((stop, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${stop.position * 100}%` }}
            onPointerDown={(e) => handleStopPointerDown(i, e)}
          >
            <input
              type="color"
              value={rgbToHex(stop.color.r, stop.color.g, stop.color.b)}
              onChange={(e) => handleStopColorChange(i, e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(i);
              }}
              aria-label={`Color for gradient stop ${i + 1}`}
              className={`w-5 h-5 rounded cursor-pointer border-2 bg-transparent ${
                selectedIndex === i ? 'border-accent' : 'border-border-subtle'
              }`}
              style={{ width: '20px', height: '20px' }}
              title={`Stop ${i + 1} — drag to reposition`}
            />
          </div>
        ))}
      </div>

      {/* Gradient bar */}
      <div
        ref={barRef}
        onClick={handleBarClick}
        role="application"
        aria-label="Gradient bar — click to add color stops"
        className={`h-6 rounded border border-border-subtle ${
          draggingIndex !== null ? 'cursor-grabbing' : 'cursor-crosshair'
        }`}
        style={{ background: `linear-gradient(to right, ${gradientCSS})` }}
      />

      {/* Stop markers below the bar */}
      <div className="relative h-3">
        {stops.map((stop, i) => (
          <div
            key={i}
            role="slider"
            aria-label={`Drag handle for gradient stop ${i + 1}`}
            aria-valuenow={Math.round(stop.position * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            className="absolute -translate-x-1/2 w-0 h-0 cursor-grab"
            style={{
              left: `${stop.position * 100}%`,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderBottom:
                selectedIndex === i ? '6px solid var(--accent)' : '6px solid var(--text-muted, #888)',
            }}
            onPointerDown={(e) => handleStopPointerDown(i, e)}
          />
        ))}
      </div>

      {/* Selected stop details */}
      {selectedIndex !== null && selectedIndex < stops.length && (
        <div className="flex items-center gap-2 bg-bg-primary rounded p-2 border border-border-subtle">
          <span className="text-ui-xs text-text-muted">Position:</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={Math.round(stops[selectedIndex].position * 100)}
            onChange={(e) => handlePositionInput(selectedIndex, Number(e.target.value))}
            aria-label="Stop position percent"
            className="w-12 px-1 py-0.5 rounded text-ui-sm bg-bg-deep border border-border-subtle text-text-primary text-center"
          />
          <span className="text-ui-xs text-text-muted">%</span>
          <div className="flex-1" />
          <button
            onClick={() => handleDeleteStop(selectedIndex)}
            disabled={stops.length <= 2}
            aria-label="Delete selected gradient stop"
            className="text-ui-xs px-1.5 py-0.5 rounded border border-border-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ color: 'rgb(var(--status-error))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgb(var(--status-error) / 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '';
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Instructions */}
      <p className="text-ui-xs text-text-muted">
        Click bar to add stops. Drag stops to reposition. Select + Delete to remove (min 2).
      </p>
    </div>
  );
}
