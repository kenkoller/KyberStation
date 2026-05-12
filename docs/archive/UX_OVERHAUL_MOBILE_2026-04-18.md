# UX Overhaul — Mobile + Tablet + `/m` — 2026-04-18

Companion to the desktop UX overhaul on `test/launch-readiness-2026-04-18`.
Scope: mobile editor shell (≤599px), tablet editor shell (600–1023px),
and the `/m` companion route.

## Viewports probed

- **Mobile**: 400 × 800 (iframe; Chrome window clamped to macOS min-width
  so a same-origin iframe was used to exercise the breakpoint branches).
  Hits the `phone` breakpoint → `MobileShell` in `AppShell.tsx`.
- **Tablet**: 800 × 1024. Hits the `tablet` branch → `TabletShell`.
- **`/m` companion**: 400 × 800 (iframe). Always mobile-shaped regardless
  of breakpoint — renders `app/m/page.tsx`.

Pages exercised at each viewport: `/`, `/editor`, `/m`.

## FIX-INLINE (landed in this pass)

### 1. `/m` companion was bleeding editor chrome

The `/m` companion passes `mobileFullscreen` to `<BladeCanvas>`, but four
decorative overlays ignored that flag and rendered anyway:

- Zoom controls (`− 94% + Fit`) bottom-right
- `Analyze` / `Clean` toggle bottom-left
- `40" blade` length label top-left
- `Blade View` mode watermark drawn directly to the canvas

**Fix**: guarded all four behind `!mobileFullscreen` in
`apps/web/components/editor/BladeCanvas.tsx`:

- Zoom controls JSX (line ~2558)
- Analyze/Clean button JSX (line ~2601, joined with the existing
  `!panelMode` guard)
- Blade length label JSX (line ~2614)
- Both `drawViewLabel(ctx, viewMode)` canvas calls (lines ~2228 + ~2284)

Result: `/m` now shows only header / blade / hilt / Ignite button — the
clean preset-browser experience it was always supposed to be. No effect
on the desktop or tablet editors (they never set `mobileFullscreen`).

### 2. Mobile `/editor` blade preview was being clipped

`MobileShell` wrapped `<BladeCanvas>` in a `shrink-0` box with a fixed
`height: 120px`. The mobile `<BladeCanvas>` renders an inline config bar
(Type / Hilt / Strip / Blade / Dia / Tube / LEDs / Grid — 7 controls
behind `desktop:hidden`) that wraps to 3–4 rows at 400px, plus the
canvas itself has `minHeight: 200px`. With only 120px of parent space,
the config bar overflowed into the canvas region, and the canvas
overflowed into the visualization toolbar and effect-trigger bar below
— producing the `"Tube / Medium Diffusion / 40\" blade / Clash / Blast /
Stab"` pile-up visible at 400px.

**Fix**: replace `style={{ height: '120px' }}` with Tailwind `min-h-[260px]`
on the wrapper in `AppShell.tsx`. The canvas region now grows to fit the
wrapped config bar without clipping the blade. Everything below (viz
toolbar, effect triggers, tabs, status bar) lays out cleanly.

### 3. Mobile header touch targets below WCAG 2.5.5

Measured targets on 400×800:

| Control | Before | After |
|---------|--------|-------|
| Orientation toggle | 44×44 | 44×44 |
| A11y settings | 44×44 | 44×44 |
| Gyro | 44×44 | 44×44 |
| Fullscreen | 44×44 | 44×44 |
| **Pause** | 55×23 | 55×44 wrapper |
| **Ignite/Retract** | **30×44** | **44×44** |

**Fix**: added `min-w-[44px]` + explicit `aria-label` to the Ignite
button; wrapped the shared `<PauseButton>` in a `min-h-[44px] flex
items-center` container. `PauseButton` itself is a shared component
(also used on desktop), so its inner button size (23px) is deferred —
see **DEFER** item 3.

## DEFER (out of scope for this pass)

### 1. PauseButton touch-target uplift for mobile

`components/layout/PauseButton.tsx` uses `px-2 py-1 text-ui-xs`, giving
the button a 23px intrinsic height. On desktop that's fine; on mobile
it fails WCAG 2.5.5 AAA. My wrapper in `AppShell.tsx` enlarges the
visual slot to 44px but the actual hit target is still the button.
**Right fix**: add the `touch-target` utility class to `PauseButton`
(the CSS rule in `globals.css` applies `min-height: 44px` only at
`max-width: 1023px`, so desktop is unaffected). Belongs in the shared-
components / design-system pass, not in mobile shell work.

### 2. Mobile editor information density

At 400×800 the mobile editor is coherent but *dense*:

- Config bar (7 dropdowns) wraps to 3–4 rows — 160px of vertical real
  estate on a 796px viewport.
- The config bar content duplicates what the Design tab's
  `BladeHardwarePanel` already provides.
- The tab bar sits around y=636, leaving ~150px for actual panel
  content before the status bar.

**Right fix**: hide the `desktop:hidden` config-bar-in-canvas on the
phone breakpoint (it's there for tablet where 2 wrapped rows is fine)
and promote the Design tab's hardware panel as the single source of
truth. That's a BladeCanvas prop change (`hideConfigBarOnPhone`) and
a layout decision — scoped as its own workstream.

### 3. Mobile editor navigation model

The editor at 400px currently uses a horizontal tab strip
(`Design / Dyn / Audio / Gallery / Out`) that's visually cramped and
sits below the fold. A bottom tab bar with larger icons would align
with how every other touch app works (Instagram, Twitter, Spotify)
and keep the five areas one tap away at any scroll position.
**Explicitly out of scope per the prompt** ("Building a new
bottom-tab-bar").

### 4. `/m` blade-off empty state

When a preset is first loaded, the blade is dark by default — the
viewport shows a grid canvas with a hilt thumbnail floating in the
middle. That's correct behaviour (Ignite defaults to off) but reads
as "something's broken" to a first-time user. A faint **"Tap Ignite"**
affordance near the blade, or auto-ignition on first swipe, would
close the loop. Not a rendering bug — UX polish.

### 5. Landing-page CTA hierarchy at 400px

The three CTAs (`OPEN EDITOR` / `LAUNCH WIZARD` / `BROWSE GALLERY`)
stack vertically and look fine, but `BROWSE GALLERY` has no border at
mobile (ghost button) and becomes hard to see against the dark
background. Cosmetic — flag for the landing-polish pass.

## Verification

Post-fix, at 400×800 and 800×1024:

- Mobile `/` — clean, no overflow (scrollWidth == clientWidth == 390).
- Mobile `/editor` — blade preview rendered in full, no overlapping
  content, viz toolbar scrolls horizontally as designed.
- Mobile `/m` — preset browser only: header / swipe dots / blade /
  hilt / Ignite (Retract when on). No editor chrome leaks.
- Tablet `/editor` — unchanged (all BladeCanvas overlays still visible
  because `mobileFullscreen` is only set on `/m`).

### Gate results

```
pnpm -w typecheck   → 11/11 successful (5.07s total, cached)
pnpm -w test        → 11/11 successful
                      codegen   1323/1323
                      engine     457/457
                      web        428/428
```

## Files touched

- `apps/web/components/layout/AppShell.tsx` — mobile blade wrapper
  `min-h-[260px]`, Ignite button `min-w-[44px] + aria-label`,
  PauseButton wrapper for 44px slot.
- `apps/web/components/editor/BladeCanvas.tsx` — `mobileFullscreen`
  guards on zoom controls / Analyze toggle / length label / two
  `drawViewLabel` calls.

No changes to `WorkbenchLayout.tsx`, `ColumnGrid.tsx`,
`DraggablePanel.tsx`, `globals.css`, landing components, or shared
primitives under `components/shared/`.
