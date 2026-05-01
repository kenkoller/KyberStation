'use client';

// ─── ColorColumnB — Sidebar A/B v2 Phase 3 ────────────────────────────
//
// Deep editor for whichever channel is active in Column A. Renders, in
// top-to-bottom order:
//
//   1. Header — channel name (BASE / CLASH / LOCKUP / BLAST) + current hex.
//   2. Color preview swatch (sRGB + as-on-blade Neopixel approximation),
//      hex input, and RGB/HSL readouts.
//   3. HSL sliders (H · S · L).
//   4. RGB sliders (R · G · B).
//   5. Color Harmony section (wheel + complementary/analogous/triadic
//      generated colors, with "Apply to effects" on Base channel).
//   6. Auto-Suggest clash / lockup buttons (Base channel only).
//   7. GradientEditorPanel — only on Base channel (shared `lib/gradient`).
//
// Mirrors the inline picker + harmony + gradient blocks from legacy
// `ColorPanel.tsx`. The 24-canon-preset list moved to Column A; the
// channel selector moved to Column A's sticky-top tabs. Everything
// else in this column is the same as the legacy panel (same store
// wiring, same math, same components).
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.2:
//   - HSL/RGB/hex picker
//   - Harmony picker (`getHarmonyColors`)
//   - Auto-suggest clash button
//   - GradientEditorPanel mount — only on Base channel

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import {
  rgbToHsl as engineRgbToHsl,
  getHarmonyColors,
} from '@kyberstation/engine';
import type { HarmonyType } from '@kyberstation/engine';
import { getSaberColorName } from '@/lib/saberColorNames';
import {
  srgbToNeopixelPreview,
  rgbToHex as neopixelRgbToHex,
} from '@/lib/neopixelColor';
import { useDragToScrub } from '@/hooks/useDragToScrub';
import { GradientEditorPanel } from '@/lib/gradient';
import { COLOR_CHANNELS } from './colorCatalog';

// ─── Color conversion helpers ───

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
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
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

// ─── Auto-suggest helpers ───

function suggestClashColor(base: { r: number; g: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  const max = Math.max(base.r, base.g, base.b);
  if (max < 100 || (base.r > base.g * 2 && base.r > base.b * 2)) {
    return { r: 255, g: 255, b: 255 };
  }
  if (base.b > base.r && base.b > base.g) {
    return { r: 255, g: 180, b: 60 };
  }
  if (base.g > base.r && base.g > base.b) {
    return { r: 255, g: 255, b: 100 };
  }
  return { r: 255, g: 255, b: 255 };
}

function suggestLockupColor(_base: { r: number; g: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  return { r: 255, g: 200, b: 80 };
}

// ─── Drag-to-scrub label (mirrored from ColorPanel) ───

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
      title="Drag to scrub (Shift 10×, Alt 0.1×). Click input to type."
      {...pointerHandlers}
      className={`font-mono cursor-ew-resize select-none touch-none ${className}`}
      style={{ touchAction: 'none' }}
    >
      {text}
    </label>
  );
}

// ─── Harmony types (mirrors ColorPanel) ───

const HARMONY_TYPES: Array<{ id: HarmonyType; label: string; description: string }> = [
  { id: 'complementary',       label: 'Comp',   description: 'Opposite on the color wheel' },
  { id: 'analogous',           label: 'Analog', description: 'Adjacent hues' },
  { id: 'triadic',             label: 'Triad',  description: 'Three evenly spaced hues' },
  { id: 'split-complementary', label: 'Split',  description: 'Two colors adjacent to the complement' },
  { id: 'tetradic',            label: 'Tetra',  description: 'Four evenly spaced hues' },
];

const EFFECT_CHANNELS = [
  'clashColor',
  'lockupColor',
  'blastColor',
  'dragColor',
  'meltColor',
  'lightningColor',
] as const;

// ─── Component ───

export function ColorColumnB(): JSX.Element {
  const config = useBladeStore((s) => s.config);
  const setColor = useBladeStore((s) => s.setColor);
  const activeChannel = useUIStore((s) => s.activeColorChannel);

  const [hexInput, setHexInput] = useState('');
  const [hexFocused, setHexFocused] = useState(false);
  const [harmonyType, setHarmonyType] = useState<HarmonyType>('complementary');
  const wheelRef = useRef<HTMLCanvasElement>(null);

  // Coerce non-canonical channels (legacy `dragColor` etc.) → baseColor.
  const isCanonicalChannel = COLOR_CHANNELS.some((c) => c.key === activeChannel);
  const effectiveChannel = isCanonicalChannel ? activeChannel : 'baseColor';

  const channelLabel =
    COLOR_CHANNELS.find((c) => c.key === effectiveChannel)?.label ?? 'Base';

  const activeColor =
    ((config as Record<string, unknown>)[effectiveChannel] as
      | { r: number; g: number; b: number }
      | undefined) ?? { r: 128, g: 128, b: 128 };
  const hsl = rgbToHsl(activeColor.r, activeColor.g, activeColor.b);
  const currentHex = rgbToHex(activeColor.r, activeColor.g, activeColor.b).toUpperCase();

  // Sync hex input on external changes (slider, preset, etc.).
  useEffect(() => {
    if (!hexFocused) {
      setHexInput(currentHex);
    }
  }, [currentHex, hexFocused]);

  const handleHexSubmit = useCallback(
    (value: string) => {
      const cleaned = value.trim().replace(/^#?/, '#');
      if (/^#[a-fA-F0-9]{6}$/.test(cleaned)) {
        const rgb = hexToRgb(cleaned);
        setColor(effectiveChannel, rgb);
      }
    },
    [effectiveChannel, setColor],
  );

  const handleHSLChange = useCallback(
    (field: 'h' | 's' | 'l', value: number) => {
      const newHsl = { ...hsl, [field]: value };
      const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
      setColor(effectiveChannel, rgb);
    },
    [hsl, effectiveChannel, setColor],
  );

  const handleRGBChange = useCallback(
    (field: 'r' | 'g' | 'b', value: number) => {
      const newColor = { ...activeColor, [field]: value };
      setColor(effectiveChannel, newColor);
    },
    [activeColor, effectiveChannel, setColor],
  );

  // Color harmony — derive once per render.
  const harmonyColors = getHarmonyColors(activeColor, harmonyType);
  const activeHsl = engineRgbToHsl(activeColor);

  // Draw the harmony color wheel.
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 4;

    ctx.clearRect(0, 0, size, size);

    // Hue ring
    for (let angle = 0; angle < 360; angle++) {
      const rad = (angle - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(
        center + (radius - 16) * Math.cos(rad),
        center + (radius - 16) * Math.sin(rad),
      );
      ctx.lineTo(center + radius * Math.cos(rad), center + radius * Math.sin(rad));
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Active color dot
    const activeRad = (activeHsl.h - 90) * (Math.PI / 180);
    const dotR = radius - 8;
    ctx.beginPath();
    ctx.arc(center + dotR * Math.cos(activeRad), center + dotR * Math.sin(activeRad), 5, 0, Math.PI * 2);
    ctx.fillStyle = rgbToHex(activeColor.r, activeColor.g, activeColor.b);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Harmony dots
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

    // Connecting lines
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

  const applyHarmonyToEffects = useCallback(() => {
    const channelsToFill = EFFECT_CHANNELS.slice(0, harmonyColors.length);
    channelsToFill.forEach((ch, i) => {
      setColor(ch, harmonyColors[i]);
    });
  }, [harmonyColors, setColor]);

  const isBaseChannel = effectiveChannel === 'baseColor';

  return (
    <div className="flex flex-col h-full" data-testid="color-column-b">
      {/* Sticky header — channel name + current hex. */}
      <header className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <div className="flex items-baseline gap-3">
          <h3 className="font-mono uppercase text-ui-sm tracking-[0.10em] text-text-primary">
            {channelLabel.toUpperCase()}
          </h3>
          <span className="text-ui-xs text-text-muted font-mono">{currentHex}</span>
        </div>
      </header>

      {/* Scrolling body. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* Color preview + hex input */}
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
              sRGB
              <br />
              on-blade
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

        {/* HSL sliders */}
        <div>
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
            HSL Adjustment
            <HelpTooltip
              text="Hue, Saturation, Lightness — an intuitive way to fine-tune colors. ProffieOS uses RGB internally, but HSL is easier for color design."
              proffie="RotateColorsX<Int<hue>, Rgb<...>>"
            />
          </h3>
          <div className="space-y-2 bg-bg-surface rounded-panel p-2 border border-border-subtle">
            {/* Hue */}
            <div className="flex items-center gap-2">
              <ScrubLabel
                htmlFor="cb-hsl-hue"
                text="H"
                value={hsl.h}
                min={0}
                max={360}
                step={1}
                onScrub={(v) => handleHSLChange('h', Math.round(v))}
                className="text-ui-sm text-text-secondary w-6"
              />
              <input
                id="cb-hsl-hue"
                type="range"
                min={0}
                max={360}
                value={Math.round(hsl.h)}
                onChange={(e) => handleHSLChange('h', Number(e.target.value))}
                className="flex-1"
                style={{
                  background:
                    'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                }}
              />
              <span className="text-ui-sm text-text-muted font-mono w-8 text-right">
                {Math.round(hsl.h)}
              </span>
            </div>
            {/* Saturation */}
            <div className="flex items-center gap-2">
              <ScrubLabel
                htmlFor="cb-hsl-saturation"
                text="S"
                value={hsl.s}
                min={0}
                max={100}
                step={0.5}
                onScrub={(v) => handleHSLChange('s', Math.round(v))}
                className="text-ui-sm text-text-secondary w-6"
              />
              <input
                id="cb-hsl-saturation"
                type="range"
                min={0}
                max={100}
                value={Math.round(hsl.s)}
                onChange={(e) => handleHSLChange('s', Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-ui-sm text-text-muted font-mono w-8 text-right">
                {Math.round(hsl.s)}%
              </span>
            </div>
            {/* Lightness */}
            <div className="flex items-center gap-2">
              <ScrubLabel
                htmlFor="cb-hsl-lightness"
                text="L"
                value={hsl.l}
                min={0}
                max={100}
                step={0.5}
                onScrub={(v) => handleHSLChange('l', Math.round(v))}
                className="text-ui-sm text-text-secondary w-6"
              />
              <input
                id="cb-hsl-lightness"
                type="range"
                min={0}
                max={100}
                value={Math.round(hsl.l)}
                onChange={(e) => handleHSLChange('l', Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-ui-sm text-text-muted font-mono w-8 text-right">
                {Math.round(hsl.l)}%
              </span>
            </div>
          </div>
        </div>

        {/* RGB sliders */}
        <div>
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
            RGB Values
            <HelpTooltip
              text="Direct red/green/blue channel values (0-255). These map directly to ProffieOS Rgb<> template arguments."
              proffie="Rgb<r,g,b>"
            />
          </h3>
          <div className="space-y-2 bg-bg-surface rounded-panel p-2 border border-border-subtle">
            {(['r', 'g', 'b'] as const).map((ch) => (
              <div key={ch} className="flex items-center gap-2">
                <ScrubLabel
                  htmlFor={`cb-rgb-${ch}`}
                  text={ch.toUpperCase()}
                  value={activeColor[ch]}
                  min={0}
                  max={255}
                  step={1}
                  onScrub={(v) => handleRGBChange(ch, Math.round(v))}
                  className="text-ui-sm text-text-secondary w-6"
                />
                <input
                  id={`cb-rgb-${ch}`}
                  type="range"
                  min={0}
                  max={255}
                  value={activeColor[ch]}
                  onChange={(e) => handleRGBChange(ch, Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-ui-sm text-text-muted font-mono w-8 text-right">
                  {activeColor[ch]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Color Harmony */}
        <div>
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
            Color Harmony
            <HelpTooltip text="Generate complementary, analogous, or triadic colors from your active color. Apply them to effect channels for cohesive blade styling." />
          </h3>
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
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
            <div className="flex items-start gap-3">
              <canvas ref={wheelRef} width={100} height={100} className="shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <div className="text-ui-xs text-text-muted">Generated colors:</div>
                <div className="flex flex-wrap gap-1.5">
                  {harmonyColors.map((hc, i) => (
                    <button
                      key={i}
                      onClick={() => setColor(effectiveChannel, hc)}
                      className="touch-target group relative"
                      aria-label={`Apply harmony color ${getSaberColorName(hc.r, hc.g, hc.b)} to ${effectiveChannel}`}
                      title={`${getSaberColorName(hc.r, hc.g, hc.b)} — Rgb<${hc.r},${hc.g},${hc.b}>`}
                    >
                      <span
                        className="block w-7 h-7 rounded border border-white/15 group-hover:border-accent transition-colors"
                        style={{ backgroundColor: rgbToHex(hc.r, hc.g, hc.b) }}
                      />
                    </button>
                  ))}
                </div>
                {isBaseChannel && harmonyColors.length > 0 && (
                  <button
                    onClick={applyHarmonyToEffects}
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

        {/* Auto-Suggest — Base channel only. */}
        {isBaseChannel && (
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
            <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
              Auto-Suggest
              <HelpTooltip text="Generates complementary clash and lockup colors based on your base color." />
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
                  style={{
                    backgroundColor: rgbToHex(
                      ...(Object.values(suggestClashColor(activeColor)) as [number, number, number]),
                    ),
                  }}
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
                  style={{
                    backgroundColor: rgbToHex(
                      ...(Object.values(suggestLockupColor(activeColor)) as [number, number, number]),
                    ),
                  }}
                />
                Lockup
              </button>
            </div>
          </div>
        )}

        {/* Gradient editor — Base channel only. `<GradientEditorPanel>`
            wraps the shared editor body in a CollapsibleSection. State lives
            in `config.gradientStops` + `config.gradientInterpolation` via
            `bladeStore`, so consumers just mount the panel. */}
        {isBaseChannel && (
          <div>
            <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
              Gradient
              <HelpTooltip text="Multi-stop gradient applied to the Base channel. Click the bar to add stops, drag to reposition, select + Delete to remove." />
            </h3>
            <GradientEditorPanel persistKey="ColorColumnB.gradient" />
          </div>
        )}
      </div>
    </div>
  );
}
