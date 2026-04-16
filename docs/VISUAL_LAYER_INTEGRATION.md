# Visual Layer Integration Guide

> **Paste the prompt block below into a new Claude Code session to provide full context
> for integrating the visual design layer into the running application.**

---

## Integration Prompt

```
I need you to integrate the visual design layer that was built in a parallel session into
the KyberStation app's running UI. This layer includes 37 new files — none of them are wired
into the app yet. They are all self-contained, type-checked, and conflict-free. Your job is
to wire them into the existing app shell, stores, and components.

Read docs/VISUAL_LAYER_INTEGRATION.md for the full inventory of what was built, why each
piece exists, which files need wiring, and the exact integration steps. Follow the
"Integration Steps" section in order. Do NOT rewrite or refactor any of the 37 new files —
they are complete. You are only connecting them to the existing app infrastructure.

Key files you'll be modifying:
- apps/web/stores/uiStore.ts (add aurebeshMode, performanceTier, soundPreset state)
- apps/web/components/layout/AppShell.tsx (mount SplashScreen, OnboardingFlow, ToastContainer, hooks)
- apps/web/lib/canvasThemes.ts (merge extended themes into CANVAS_THEMES array)
- apps/web/hooks/useThemeApplier.ts (apply material/ambient CSS classes from theme)
- apps/web/app/layout.tsx (ensure ToastContainer is mounted at root)

Key files you should NOT modify (they are complete):
- Everything in apps/web/components/hud/
- Everything in apps/web/components/shared/LoadingSkeleton.tsx
- Everything in apps/web/components/shared/ToastContainer.tsx
- apps/web/lib/uiSounds.ts, aurebesh.ts, performanceTier.ts, extendedThemes.ts
- apps/web/hooks/useUISound.ts, useAurebesh.ts, usePerformanceTier.ts
- apps/web/components/layout/SplashScreen.tsx, OnboardingFlow.tsx
- apps/web/components/editor/ThemePickerPanel.tsx, ThemePreviewCard.tsx, VisualSettingsPanel.tsx

Start by reading this integration doc, then read the current state of the files you'll
be modifying, and proceed step by step.
```

---

## What Was Built and Why

### Design Philosophy

The visual layer adds a Star Wars tactical HUD aesthetic to KyberStation — inspired by
Imperial bridge consoles, cockpit readouts, and briefing room displays from the films.
Every design decision follows these principles:

1. **Blade is the hero** — Ambient effects never compete with the lightsaber visualizer
2. **Editor neutrality** — UI chrome does NOT reflect the user's blade design
3. **Opt-in immersion** — Sounds, Aurebesh, and heavy animations default to off
4. **Accessible by default** — 3 performance tiers, reduced motion support, colorblind modes
5. **CSS-only materials** — No WebGL for UI chrome, glassmorphism via CSS

The full design spec is at `docs/VISUAL_DESIGN_SYSTEM.md`.

---

## File Inventory (37 files)

### CSS Foundation (1 file modified)

| File | What It Adds |
|------|-------------|
| `apps/web/app/globals.css` | 15 new keyframes, material surface classes (.material-matte/satin/gloss), corner styles (.corner-rounded/angular/clipped), border styles (.border-subtle/lined/glow), Aurebesh toggle rules (html.aurebesh-labels, html.aurebesh-full), dot-matrix text classes, scan-sweep/grid-pulse/holo-flicker/corner-bracket/energy-conduit animations, panel-wipe/modal-holo/sidebar-slide/toast-comm transitions, .btn-hum hover glow, .toggle-ignite, slider focus pulse, perf tier overrides (html.perf-medium, html.perf-lite). All new classes are added at the bottom of the file — no existing classes were modified. |

**Why:** These CSS classes are the foundation that all components reference. Material
classes give faction themes their distinct feel (glossy Sith, matte Jedi, satin Rebel).
Performance tier classes let a single `html.perf-lite` class disable all heavy effects
globally. Aurebesh classes override font-family on `<html>` so a single toggle changes
the entire UI's typography.

### Theme System (1 new file)

| File | Exports |
|------|---------|
| `apps/web/lib/extendedThemes.ts` | `ExtendedCanvasTheme` interface, `EXTENDED_LOCATION_THEMES` (12), `EXTENDED_FACTION_THEMES` (9), `ALL_EXTENDED_THEMES` (21) |

**Why:** The existing `canvasThemes.ts` has 9 location themes. This adds 12 more locations
(Kamino, Naboo, Scarif, Dathomir, Exegol, Crait, Jedha, Kashyyyk, Ilum, Malachor, Lothal,
Mandalore) and 9 faction themes (Jedi Order, Sith, Galactic Empire, Rebel Alliance,
Mandalorian, First Order, Old Republic, Nightsisters, Bounty Hunters). Each extended theme
adds `material` (surfaceStyle, panelOpacity, borderStyle, cornerStyle) and `ambient`
(particleDensity, scanSweep, hudStyle, etc.) metadata. The `ExtendedCanvasTheme` interface
extends the existing `CanvasTheme` interface so both can be used interchangeably for color
rendering.

**Integration:** Merge these into the main `CANVAS_THEMES` array in `canvasThemes.ts`, or
keep them separate and combine at the consumption point (ThemePickerPanel already does this).

### HUD Components (11 new files)

| File | Component | Type |
|------|-----------|------|
| `components/hud/ScanSweep.tsx` | Rotating radar sweep | Decorative |
| `components/hud/CornerBrackets.tsx` | L-shaped corner bracket wrapper | Decorative |
| `components/hud/AurebeshScroll.tsx` | Vertical scrolling alien text | Decorative |
| `components/hud/DataTicker.tsx` | Horizontal hex data feed | Decorative |
| `components/hud/ConsoleIndicator.tsx` | LED status dot (4 variants) | Decorative |
| `components/hud/HoloFlicker.tsx` | Holographic flicker wrapper | Decorative |
| `components/hud/CircularGauge.tsx` | SVG arc gauge | Data display |
| `components/hud/SegmentedBar.tsx` | Power-meter bar | Data display |
| `components/hud/MotionTelemetry.tsx` | 3-gauge motion cluster | Data composite |
| `components/hud/PowerDashboard.tsx` | 3-bar system status | Data composite |
| `components/hud/EngineStats.tsx` | FPS/tick/LED readout | Data composite |
| `components/hud/index.ts` | Barrel export | — |

**Why:** Decorative components add atmosphere to panels and sidebars without displaying
real data. Data display components (CircularGauge, SegmentedBar) are generic and reusable.
Composite components (MotionTelemetry, PowerDashboard, EngineStats) group gauges into
specific dashboard layouts ready to receive real engine data via props.

**Integration:** Drop decorative components into panel gutters/margins. Wire composite
components to engine state (swingSpeed, bladeAngle, etc. from bladeStore or the engine).

### Utilities (3 new files)

| File | Exports |
|------|---------|
| `apps/web/lib/performanceTier.ts` | `detectCapabilities()`, `recommendTier()`, `getPerformanceTier()`, `setPerformanceTier()`, `applyPerformanceTier()` |
| `apps/web/lib/aurebesh.ts` | `getAurebeshMode()`, `setAurebeshMode()`, `applyAurebeshMode()`, `AUREBESH_LETTERS`, `generateAurebeshStream()` |
| `apps/web/lib/uiSounds.ts` | `UISoundEngine` class (singleton), `getUISoundEngine()`, `playUISound()`, 14 synthesized sounds, 3 presets |

**Why:** Each utility manages one of the three new user preference systems. They all follow
the same pattern: detect/load from localStorage → apply CSS class to `<html>` or configure
AudioContext → persist changes. All three are pure TypeScript with no React dependencies
so they can be used anywhere.

**Performance tier detection** checks `navigator.hardwareConcurrency`, `navigator.deviceMemory`,
WebGL GPU renderer string, and user agent for mobile. Maps to full/medium/lite.

**Aurebesh** applies `html.aurebesh-labels` or `html.aurebesh-full` CSS class. Font-family
override only — underlying text stays English for screen readers.

**UI Sounds** synthesizes all audio at runtime using Web Audio API oscillators (sine waves,
frequency sweeps, noise bursts, multi-tone chirps). Zero external audio files. Sounds are
modeled after Star Wars console/cockpit audio. Default preset is 'silent'.

### React Hooks (4 new files)

| File | Hook |
|------|------|
| `apps/web/hooks/usePerformanceTier.ts` | `usePerformanceTier()` → { tier, isAutoDetected, setTier } |
| `apps/web/hooks/useAurebesh.ts` | `useAurebesh()` → { mode, setMode } |
| `apps/web/hooks/useUISound.ts` | `useUISound()` → { play, setPreset, ... }, `useUISoundEffect(id)` |

**Why:** Each hook wraps the corresponding utility, loading the saved state on mount,
applying CSS classes, and providing React-friendly setters. They're designed to be called
in AppShell or a top-level provider so the setting is applied once on app load.

### UI Components (7 new files)

| File | Component |
|------|-----------|
| `components/layout/SplashScreen.tsx` | Kyber crystal ignition animation, version display |
| `components/layout/OnboardingFlow.tsx` | 4-step first-use setup (perf, sound, Aurebesh) |
| `components/editor/ThemePreviewCard.tsx` | Mini theme swatch with glow, badge, corner styles |
| `components/editor/ThemePickerPanel.tsx` | Full theme browser (30 themes, tabs, search) |
| `components/editor/VisualSettingsPanel.tsx` | Grouped settings for all 3 preference systems |
| `components/shared/ToastContainer.tsx` | Toast renderer with comm-channel animation |
| `components/shared/LoadingSkeleton.tsx` | 6 skeleton variants (line, circle, panel, bar, gauge cluster, theme card) |

**Why:** SplashScreen and OnboardingFlow run on first launch. ThemePickerPanel and
VisualSettingsPanel are ready to drop into the sidebar or a settings modal.
ToastContainer renders notifications globally. LoadingSkeleton provides placeholders
while panels lazy-load.

### Supporting Files (2 new files)

| File | Purpose |
|------|---------|
| `apps/web/lib/toastManager.ts` | Pub/sub toast state manager (singleton) |
| `apps/web/app/docs/design-system/page.tsx` | Dev showcase page at `/docs/design-system` |

**Why:** Toast manager is a non-React event bus so toasts can be triggered from anywhere
(`toast.success('Saved!')`). The design system page renders every HUD component, animation,
material, and typography style in one view for visual testing.

### Documentation (2 new files)

| File | Purpose |
|------|---------|
| `docs/VISUAL_DESIGN_SYSTEM.md` | Full design spec (philosophy, tiers, themes, animations, sounds, future ideas) |
| `docs/VISUAL_LAYER_INTEGRATION.md` | This document |

---

## Integration Steps

### Step 1: Mount Global Systems in AppShell

In `apps/web/components/layout/AppShell.tsx`, add these hooks and components:

```typescript
import { usePerformanceTier } from '@/hooks/usePerformanceTier';
import { useAurebesh } from '@/hooks/useAurebesh';
import { SplashScreen } from './SplashScreen';
import { OnboardingFlow, isOnboardingComplete } from './OnboardingFlow';
import { ToastContainer } from '@/components/shared/ToastContainer';

// Inside the component:
const { tier } = usePerformanceTier();  // Applies perf CSS class on mount
const { mode } = useAurebesh();          // Applies Aurebesh CSS class on mount
const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingComplete());
const [showSplash, setShowSplash] = useState(true);

// In the JSX return:
<>
  {showSplash && <SplashScreen version="0.3.0" onComplete={() => setShowSplash(false)} />}
  {showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}
  {/* ... existing app content ... */}
  <ToastContainer />
</>
```

### Step 2: Add State to uiStore (Optional)

If centralized state management is preferred over localStorage-only, add to `uiStore.ts`:

```typescript
aurebeshMode: 'off' | 'labels' | 'full';
performanceTier: 'full' | 'medium' | 'lite';
soundPreset: 'silent' | 'subtle' | 'full';
setAurebeshMode: (mode: AurebeshMode) => void;
setPerformanceTier: (tier: PerformanceTier) => void;
setSoundPreset: (preset: UISoundPreset) => void;
```

**Note:** The hooks already read/write localStorage directly. Adding to uiStore is only
needed if other components need to reactively observe these values through Zustand. The
hooks can be used standalone without uiStore integration.

### Step 3: Merge Extended Themes

Option A — Merge into `canvasThemes.ts`:
```typescript
import { ALL_EXTENDED_THEMES } from './extendedThemes';
// Add to the end of CANVAS_THEMES array:
export const CANVAS_THEMES: CanvasTheme[] = [
  ...existingThemes,
  // Extended themes (material/ambient fields are ignored by existing consumers)
  ...ALL_EXTENDED_THEMES,
];
```

Option B — Keep separate, combine at consumption (ThemePickerPanel already does this).

### Step 4: Apply Material Classes from Active Theme

In `apps/web/hooks/useThemeApplier.ts`, after setting CSS variables, also apply the
material and ambient classes if the theme is an ExtendedCanvasTheme:

```typescript
import { type ExtendedCanvasTheme } from '@/lib/extendedThemes';

// After setting CSS custom properties:
if ('material' in theme) {
  const ext = theme as ExtendedCanvasTheme;
  document.documentElement.dataset.surfaceStyle = ext.material.surfaceStyle;
  document.documentElement.dataset.cornerStyle = ext.material.cornerStyle;
  document.documentElement.dataset.borderStyle = ext.material.borderStyle;
}
```

Components can then use `[data-surface-style="gloss"]` selectors or read the dataset
to apply the appropriate `.material-*` and `.corner-*` classes.

### Step 5: Wire Data Dashboards to Engine State

The composite HUD components accept props that map directly to engine/store values:

```typescript
// MotionTelemetry — wire to motion simulator output
<MotionTelemetry
  swingSpeed={bladeState.swingSpeed}    // 0-1
  bladeAngle={bladeState.bladeAngle}    // -1 to 1
  twistAngle={bladeState.twistAngle}    // -1 to 1
/>

// PowerDashboard — wire to storage/complexity estimates
<PowerDashboard
  powerDraw={estimatedPowerDraw}        // 0-1
  memoryUsage={flashMemoryUsage}        // 0-1
  complexity={styleComplexity}          // 0-1
/>

// EngineStats — wire to render loop metrics
<EngineStats
  fps={currentFps}
  engineTickMs={lastTickTime}
  ledCount={config.ledCount}
/>
```

### Step 6: Add Sound to Existing Interactions

Import `playUISound` or `useUISoundEffect` and call at interaction points:

```typescript
import { playUISound } from '@/lib/uiSounds';

// In event handlers:
playUISound('button-click');
playUISound('tab-switch');
playUISound('success');
playUISound('preset-loaded');
playUISound('theme-switch');
```

Or use the hook for pre-bound functions:
```typescript
const playClick = useUISoundEffect('button-click');
<button onClick={playClick}>...</button>
```

### Step 7: Drop Decorative HUD Elements into Panels

Add atmospheric elements to panel gutters and margins:

```typescript
import { AurebeshScroll, DataTicker, CornerBrackets, ConsoleIndicator } from '@/components/hud';

// In a sidebar panel:
<div className="relative">
  <AurebeshScroll side="right" />
  <CornerBrackets>
    {/* panel content */}
  </CornerBrackets>
  <DataTicker className="mt-2" />
</div>
```

### Step 8: Use Loading Skeletons for Lazy Content

```typescript
import { SkeletonPanel, SkeletonGaugeCluster } from '@/components/shared/LoadingSkeleton';

// While a panel is loading:
{isLoading ? <SkeletonPanel lines={4} /> : <ActualContent />}
```

### Step 9: Use Toasts for User Feedback

```typescript
import { toast } from '@/lib/toastManager';

// After user actions:
toast.success('Preset saved');
toast.error('Export failed — check your config');
toast.info('Theme changed to Sith');
toast.warning('Style complexity is high — may lag on Proffieboard V2');
```

---

## CSS Class Reference

### Materials
- `.material-matte` — Flat background, subtle border
- `.material-satin` — Directional gradient, light border
- `.material-gloss` — Reflective highlight, backdrop-filter blur

### Corners
- `.corner-rounded` — 6px border-radius
- `.corner-angular` — 2px border-radius
- `.corner-clipped` — Diagonal clip-path at corners

### Borders
- `.border-subtle` — Very faint border
- `.border-lined` — Double-line inset border
- `.border-glow` — Accent-colored glow border

### Transitions
- `.panel-wipe-enter` — Horizontal ignition wipe (350ms)
- `.panel-wipe-enter-vertical` — Vertical ignition wipe (350ms)
- `.modal-holo-enter` — Holographic scale-up entry (280ms)
- `.sidebar-enter-left` / `.sidebar-enter-right` — Spring slide-in (250ms)
- `.toast-comm-enter` — Comm channel slide-in (400ms)

### Micro-interactions
- `.btn-hum` — Accent glow on hover
- `.toggle-ignite` — Glow on active state
- `.dot-matrix` / `.dot-matrix-bright` — Monospace readout text

### Performance
- `html.perf-medium` — Reduces animations, disables backdrop-filter
- `html.perf-lite` — Strips all ambient effects, instant transitions

### Aurebesh
- `html.aurebesh-labels` — Headers/nav in Aurebesh font
- `html.aurebesh-full` — Everything in Aurebesh (exclusions via `.no-aurebesh`)

---

## Sound ID Reference

| ID | Category | Sound Description |
|----|----------|------------------|
| tab-switch | navigation | Two ascending tones |
| panel-open | navigation | Noise burst + ascending sweep |
| panel-close | navigation | Descending sweep + click |
| modal-open | navigation | Ascending tri-tone chirp |
| modal-close | navigation | Descending bi-tone |
| button-click | interaction | Click + beep |
| toggle-on | interaction | Ascending activation chirp |
| toggle-off | interaction | Descending deactivation |
| hover | interaction | Very subtle hum swell |
| success | feedback | R2-D2 style ascending chirp |
| error | feedback | Low pulsing alarm tone |
| copy | feedback | Quick double beep |
| preset-loaded | feedback | Resonant ascending chord |
| theme-switch | feedback | Sweep from low to high |

---

## Future Work (Documented, Not Built)

These ideas are captured in `docs/VISUAL_DESIGN_SYSTEM.md` Section 10:

1. **Procedural kyber crystal generator** — Seed-based unique crystal shapes (WebGL/Canvas2D)
2. **Reactive crystal** — Crystal that responds to blade state (deferred: competes with visualizer)
3. **Location ambient backgrounds** — Themed particle effects (snow for Hoth, embers for Mustafar)
4. **Hilt material preview** — 3D hilt materials matching active theme
5. **Community sound packs** — User-swappable UI sound themes
6. **Cinematic mode** — Presentation view with HUD overlays, no editor chrome
