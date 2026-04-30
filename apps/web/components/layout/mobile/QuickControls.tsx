'use client';

// ─── QuickControls — Phase 4.3 (2026-04-30) ─────────────────────────────────
//
// 2-col grid of MiniSlider knobs sitting above the main content on the
// editing tabs (Color / Style / Motion / FX). Per "Claude Design Mobile
// handoff/HANDOFF.md" §"Quick controls" + the v1-synthesis bodies, the
// slider set differs per section:
//
//   COLOR  → Hue / Sat / Bright / Shimmer / Tempo / Depth
//   STYLE  → Tempo / Depth / Wave / Emitter / Shimmer / Hue Shft
//   MOTION → Swing / Stab / Twist / Angle / Auto Sw / Auto Du
//
// Phase 4.3 ships the COLOR variant fully wired: Hue / Sat / Bright +
// Shimmer all read + write live store fields. Tempo + Depth render
// in placeholder mode (`disabled` + static display values) until the
// follow-up phases expose style-specific tempo + depth on bladeStore.
// The slot is occupied so the 2-col layout matches the handoff spec
// today; the wiring is a one-line follow-up when the fields land.

import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { rgbToHsl, hslToRgb } from '@/lib/colorHsl';
import { MiniSlider } from '@/components/layout/mobile/MiniSlider';

/** Color-tab QuickControls — wired against bladeStore + uiStore. */
export function ColorQuickControls() {
  const baseColor = useBladeStore((s) => s.config.baseColor);
  const shimmer = useBladeStore((s) => s.config.shimmer ?? 0);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const brightness = useUIStore((s) => s.brightness);
  const setBrightness = useUIStore((s) => s.setBrightness);

  const hsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);

  function setHue(h: number) {
    const next = hslToRgb(h, hsl.s, hsl.l);
    updateConfig({ baseColor: next });
  }
  function setSat(s: number) {
    const next = hslToRgb(hsl.h, s, hsl.l);
    updateConfig({ baseColor: next });
  }
  function setShimmer(v: number) {
    updateConfig({ shimmer: v });
  }

  return (
    <div
      className="quick-controls grid gap-2 p-3 bg-bg-primary border-b border-border-subtle"
      style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      role="group"
      aria-label="Quick controls"
      data-quick-controls="color"
    >
      <MiniSlider
        label="Hue"
        displayValue={Math.round(hsl.h).toString()}
        unit="°"
        value={hsl.h}
        min={0}
        max={359}
        step={1}
        color="accent"
        onChange={setHue}
      />
      <MiniSlider
        label="Sat"
        displayValue={Math.round(hsl.s).toString()}
        unit="%"
        value={hsl.s}
        min={0}
        max={100}
        step={1}
        color="accent"
        onChange={setSat}
      />
      <MiniSlider
        label="Bright"
        displayValue={brightness.toString()}
        unit="%"
        value={brightness}
        min={0}
        max={100}
        step={1}
        color="warm"
        onChange={setBrightness}
      />
      <MiniSlider
        label="Shimmer"
        displayValue={Math.round(shimmer * 100).toString()}
        unit="%"
        value={shimmer}
        min={0}
        max={1}
        step={0.01}
        color="info"
        onChange={setShimmer}
      />
      {/* Tempo + Depth — placeholder slots awaiting Phase 4.3.x style-
          specific store fields. Disabled state telegraphs they're
          read-only today; the 2-col layout still matches handoff. */}
      <MiniSlider
        label="Tempo"
        displayValue="—"
        unit="bpm"
        value={0}
        min={0}
        max={1}
        color="muted"
        disabled
      />
      <MiniSlider
        label="Depth"
        displayValue="—"
        value={0}
        min={0}
        max={1}
        color="muted"
        disabled
      />
    </div>
  );
}
