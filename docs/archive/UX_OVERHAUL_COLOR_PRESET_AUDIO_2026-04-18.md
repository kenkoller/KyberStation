# UX Overhaul — Color / Preset / Audio workflows
### 2026-04-18 · branch `test/launch-readiness-2026-04-18`

Source-level audit against the `docs/UX_NORTH_STAR.md` §4 per-panel specs and
§3 anti-references. Dev server confirmed up (`curl /editor → 200`); inspection
done from source since the delta is textual, not pixel-level.

---

## Panels probed

- `apps/web/components/editor/ColorPanel.tsx` (696 LOC)
- `apps/web/components/editor/PresetGallery.tsx` (1096 LOC)
- `apps/web/components/editor/PresetBrowser.tsx` (832 LOC)
- `apps/web/components/editor/SoundFontPanel.tsx` (919 LOC)
- `apps/web/components/editor/SmoothSwingPanel.tsx` (436 LOC)
- `apps/web/components/editor/ComparisonView.tsx` (275 LOC)
- `apps/web/components/editor/GradientBuilder.tsx` (301 LOC)

No `docs/UX_NORTH_STAR.md` change — the spec is the rubric, not the artefact.

---

## FIX-INLINE (applied)

### ColorPanel
1. **Blender-style drag-to-scrub on RGB + HSL numerics.** Added an inline
   `<ScrubLabel>` primitive that turns each channel label (R / G / B / H / S / L)
   into a horizontal-drag handle. Pixel delta maps to value step; Shift = 10×,
   Alt = 0.1×. Pointer-capture, `touch-action: none`, cursor `ew-resize`.
   Native `<input type="range">` kept for keyboard + screen-reader parity.
2. **Mono-font channel letters.** R/G/B/H/S/L labels now render in `font-mono`
   so they read as data-signal glyphs (Mutable typographic restraint).
3. **Radius token discipline.** Neopixel preview stack was `rounded-t-lg` /
   `rounded-b-lg` (8px pillow) — tightened to `rounded-t-sm` / `rounded-b-sm`
   per §6 candidate scale (2px chrome).

### PresetGallery
4. **Identity-card subtitle line.** Each `GalleryCard` now carries a
   `{character} · {tier}` subtitle line in `font-mono text-ui-xs
   text-text-muted` below the existing name / style / faction row — the
   closest analog we have to VCV-Rack's "author / version" band given
   today's `Preset` type.

### PresetBrowser
5. **Theme-token discipline for affiliation colors.** Removed raw
   `text-blue-400 / text-red-400 / text-purple-400` in favour of
   `affiliationColor()` from `lib/factionStyles.ts` — keeps all faction
   chromatics under a single theme + colour-blind overlay.
6. **Identity subtitle line** (same subtitle treatment as gallery cards).

### SoundFontPanel
7. **JetBrains Mono on font-path listings.** `FontLibraryRow` font names,
   loaded-font display, library path, and font-content category lists all
   pick up `font-mono`. Matches §4 "entries rendered in JetBrains Mono"
   and the Andor/Mutable data-signal rule.

### SmoothSwingPanel
8. **Theme-token discipline on viz palette.** Replaced raw `bg-blue-500/70 /
   bg-yellow-400/70 / bg-red-400/60` markers with `--status-cyan /
   --status-warn / --status-error` CSS-var refs.
9. **Removed `text-[10px]` arbitrary sizing** across 11 spans → `text-ui-xs`
   (theme-token-backed).
10. **Preview-only disclosure added.** An inline amber note now tells the
    user that SmoothSwing values are not yet persisted / exported and will
    live as a LayerStack plate in v1.0 (per §4 "refactored as a specialised
    modulator plate"). Clears the prior silent UX failure where slider
    changes did nothing observable downstream.

### GradientBuilder
11. **Theme-token discipline on Delete.** Raw `text-red-400 hover:bg-red-900/20`
    → `--status-error` CSS-var refs with inline hover handler.

### ComparisonView
No changes required — already tracks theme tokens for all chrome; no
anti-reference triggers identified.

---

## DEFER (reasoned, not applied)

- **Severance-inverted haptic drag for ColorPanel.** The spec calls for a
  non-linear "inverted" physics model (motion decays as value approaches
  bounds). Our `<ScrubLabel>` is a linear pixel-delta mapper; upgrading it
  to a Severance-register curve needs a motion-design decision we shouldn't
  take mid-sprint. **Next step:** dedicated 45-min motion-curve session
  tied to the existing `--motion-*` token set.
- **BR2049 filename-reveal on preset load.** `filenameReveal()` is a §7
  primitive we haven't built yet. Would require a transient full-surface
  overlay and typography-system agreement. Planned as part of the
  `sceneTransitionToFullscreen` / `firstIgnition` companion work.
- **Outer Wilds lineage graph on each preset.** No lineage data model exists
  — `Preset` type has `id / name / character / era / affiliation / tier /
  screenAccurate`, no fork-of / derived-from / author fields. Requires a
  `PresetMetadata` extension + backfill across ~200 bundled presets before
  any UI can consume it.
- **VCV-Rack style author/version fields on cards.** Same reason — needs
  `Preset.author` / `Preset.version` added to `packages/presets/src/types.ts`
  and a sweep across the curated character presets.
- **`<MiniBladePreview>` mini-render tiles.** Already present via
  `usePresetAnimation` — not a gap. (Noted for completeness; no action.)
- **SmoothSwing as LayerStack plate.** The real refactor — moving the
  panel into a `<LayerStackRow>` with `modulator` kind and extra parameter
  pages — waits on the LayerStack plate API being surfaced. Today's inline
  preview-only disclosure is the stopgap.
- **Full Figma color model (gradient stops / opacity / blend modes on the
  main ColorPanel).** Would replace the current single-color-per-channel
  model with a layer composite; out of scope for a polish pass.

---

## Verification

```
pnpm -w typecheck   →  11/11 tasks successful
pnpm -w test        →  11/11 tasks successful
                       engine: 457 tests passed (7 files)
                       web:    428 tests passed (25 files)
```

No regressions, no new warnings.

---

## Next-sprint hooks

If a follow-up sprint picks up the DEFER list, the smallest-wins order is:

1. `Preset.author` + `Preset.version` (types.ts, one-line per preset).
2. LayerStack plate API → move `SmoothSwingPanel` body into it.
3. `filenameReveal()` primitive — pairs with the existing
   `firstIgnition()` + `sceneTransitionToFullscreen()` set.
4. Severance-inverted scrub curve → replace the linear inner of
   `<ScrubLabel>`. Contract is already `(clientX, startValue) → next`,
   so swap is mechanical.
5. Lineage graph — the most new surface area; deserves its own planning
   round.
