# KyberStation Visual Design System

> Comprehensive specification for the Star Wars-inspired visual layer: theming, animations,
> typography, sound design, HUD elements, and performance tiers.

---

## 1. Design Philosophy

The KyberStation UI draws from **Star Wars tactical HUD displays** — the screens seen in
cockpits, command centers, briefing rooms, and Imperial consoles across the films and series.
The aesthetic is functional-cinematic: it looks like something that *belongs* in the Star Wars
universe while remaining a productive tool.

### Core Principles

1. **Blade is the hero** — The lightsaber visualizer is always the focal point. All ambient
   effects, HUD elements, and decorative animations are *secondary* and must never compete
   with or distract from the blade display.
2. **Elevated, not overcomplicated** — The UI should feel polished and immersive but not
   busy. Every visual element earns its place.
3. **Editor neutrality** — The UI chrome does NOT reflect the user's current blade design.
   A red Sith blade should not tint the panels red. The editor stays neutral so the user
   maintains an unbiased eye on their work.
4. **Accessible by default** — Full experience for powerful machines, graceful degradation
   for weaker ones. Reduced motion, high contrast, and colorblind modes are first-class.
5. **Opt-in immersion** — Sound effects, ambient animations, and Aurebesh mode default
   to off. Users enable what they want during onboarding or in settings.

### Visual Reference Language

The design draws from these specific Star Wars screen aesthetics:
- **Imperial tactical displays** — Scan lines radiating from targets, grid overlays, cyan-on-black
- **Death Star control panels** — Geometric icon grids, angular shapes, red accent highlights
- **Technical readout schematics** — Wireframe blueprints on grids, Aurebesh data columns
- **Cockpit waveform displays** — Sine wave overlays, segmented arc gauges, bar graphs
- **Star Destroyer bridge consoles** — Circular gauges, detailed wireframes, data readouts

Common traits across all references:
- Dark backgrounds (near-black)
- Monochromatic color schemes per display
- Grid overlays and scan lines
- Geometric precision with clean angular shapes
- Aurebesh text as labels
- Thin line borders with corner accents
- Subtle glow/bloom on bright elements
- Dot-matrix style for secondary readouts

---

## 2. Performance Tiers

Three tiers allow the app to scale from high-end desktops to budget laptops and phones.
The user selects their tier in settings or during onboarding.

### Tier 1: Full

Target: Modern desktop, discrete GPU, or M-series Mac.

| Feature               | Implementation                                    |
|----------------------|--------------------------------------------------|
| Background particles  | Canvas2D particle system, 30-60 floating motes   |
| Scan sweeps           | CSS/SVG animated radial sweep lines in sidebar    |
| HUD data panels       | Animated real-time data readouts with transitions |
| Grid overlays         | Subtle animated grid with parallax on scroll      |
| Panel transitions     | Ignition-style wipe animations between tabs       |
| Glow effects          | CSS box-shadow bloom on active elements           |
| Ambient console blink | LED-style indicator animations on panels          |
| Aurebesh scroll       | Vertical scrolling Aurebesh text in gutters       |
| Sound effects         | Web Audio UI interaction sounds (if enabled)      |

### Tier 2: Medium

Target: Integrated GPU laptops, tablets.

| Feature               | Implementation                                    |
|----------------------|--------------------------------------------------|
| Background particles  | Reduced count (10-15), CSS-only animation         |
| Scan sweeps           | Static with opacity pulse (no sweep motion)       |
| HUD data panels       | Real-time data, simplified transitions            |
| Grid overlays         | Static grid, no parallax                          |
| Panel transitions     | CSS fade/slide transitions (no wipe animation)    |
| Glow effects          | Reduced shadow blur radius                        |
| Ambient console blink | CSS-only, reduced frequency                       |
| Aurebesh scroll       | Static decorative placement (no scroll)           |
| Sound effects         | Supported if enabled                              |

### Tier 3: Lite

Target: Low-end machines, accessibility preference, or user choice.

| Feature               | Implementation                                    |
|----------------------|--------------------------------------------------|
| Background particles  | None                                              |
| Scan sweeps           | None                                              |
| HUD data panels       | Static data display, no animations                |
| Grid overlays         | None                                              |
| Panel transitions     | Instant cut or 150ms CSS opacity fade             |
| Glow effects          | None (flat borders only)                          |
| Ambient console blink | None                                              |
| Aurebesh scroll       | None                                              |
| Sound effects         | Supported if enabled                              |

### Auto-Detection

On first launch, the app should attempt to detect device capability:
- `navigator.hardwareConcurrency` (core count)
- `navigator.deviceMemory` (RAM)
- GPU renderer string via WebGL context
- Frame rate benchmark during splash animation

Suggest a tier but let the user override. Persist choice in settings.

---

## 3. Theme System

### 3.1 Architecture

The existing theme system uses:
- **Zustand store** (`uiStore.canvasTheme`) for active theme selection
- **CSS custom properties** injected on `<html>` by `useThemeApplier()`
- **Tailwind config** referencing CSS variables for utility classes
- **300ms ease transition** on all color properties for live switching

This architecture remains. Themes are extended with new properties for material style,
ambient effect configuration, and faction metadata.

### 3.2 Extended Theme Interface

```typescript
export interface CanvasTheme {
  // --- Existing properties ---
  id: string;
  label: string;
  bgColor: string;
  vignetteColor: string;
  vignetteOpacity: number;
  gridColor: string;
  gridLabelColor: string;
  stripBg: string;
  stripBorder: string;
  graphBg: string;
  graphBorder: string;
  ui: UIThemePalette;

  // --- New properties ---
  category: 'location' | 'faction' | 'era';
  description: string;              // Flavor text for theme picker
  era?: string;                     // e.g., 'original-trilogy', 'prequel-era'
  affiliation?: 'light' | 'dark' | 'neutral'; // For faction themes

  material: {
    surfaceStyle: 'matte' | 'satin' | 'gloss'; // CSS surface treatment
    panelOpacity: number;            // 0-1, panel background transparency
    borderStyle: 'subtle' | 'lined' | 'glow';  // Border treatment
    cornerStyle: 'rounded' | 'angular' | 'clipped'; // Corner aesthetic
  };

  ambient: {
    particleDensity: number;         // 0-1, relative particle count
    particleColor: string;           // rgba
    scanSweep: boolean;              // Enable scan line sweep effect
    scanColor: string;               // rgba for sweep line
    consoleBlinkRate: number;        // Seconds per blink cycle, 0 = none
    gridAnimated: boolean;           // Subtle grid animation
    hudStyle: 'imperial' | 'rebel' | 'republic' | 'minimal'; // HUD element styling
  };
}
```

### 3.3 Existing Location Themes (9)

These are already implemented and should be preserved as-is:

| ID          | Name        | Accent Color | Vibe                          |
|-------------|-------------|-------------|-------------------------------|
| deep-space  | Deep Space  | #4a9eff     | Cool void, electric blue      |
| tatooine    | Tatooine    | #ffb84d     | Sandy gold, amber warmth      |
| bespin      | Bespin      | #ff8866     | Sunset coral, cloud city glow |
| dagobah     | Dagobah     | #4adf6a     | Swamp emerald, vivid green    |
| mustafar    | Mustafar    | #ff5533     | Volcanic ember, fiery red     |
| hoth        | Hoth        | #66bbff     | Icy blue, frozen tundra       |
| coruscant   | Coruscant   | #8080ff     | Neon midnight, purple-blue    |
| endor       | Endor       | #88cc44     | Forest moonlit, natural green |
| death-star  | Death Star  | #99aacc     | Industrial steel, cold gray   |

### 3.4 New Location Themes (Candidates)

Each must be visually distinct from existing themes. Prioritized by palette uniqueness:

| ID          | Name        | Palette Direction                    | Distinct From       |
|-------------|-------------|--------------------------------------|---------------------|
| kamino      | Kamino      | Storm silver, cold white-blue, rain  | Hoth (warmer white) |
| naboo       | Naboo       | Royal emerald-gold, Renaissance warm | Endor (richer gold) |
| scarif      | Scarif      | Tropical cyan, warm sand, palm shade | Tatooine (blue mix) |
| dathomir    | Dathomir    | Blood crimson, toxic green mist      | Mustafar (green tint)|
| exegol      | Exegol      | Deep purple, violet lightning, void  | Coruscant (darker)  |
| crait       | Crait       | Salt white surface, crimson mineral  | Hoth (red contrast) |
| jedha       | Jedha       | Desert sandstone, temple gold, dust  | Tatooine (cooler)   |
| kashyyyk    | Kashyyyk    | Deep bark brown, canopy green, moss  | Dagobah (warmer)    |
| ilum        | Ilum        | Crystal ice blue, white cavern glow  | Hoth (more magical) |
| malachor    | Malachor    | Ancient charcoal, Sith red, ruin     | Death Star (warmer) |
| lothal      | Lothal      | Prairie orange, open sky blue        | Bespin (earthier)   |
| mandalore   | Mandalore   | Beskar silver, cubist dark geometry  | Death Star (brighter)|

### 3.5 Faction Themes

Faction themes use the same color system but add distinct **material properties** that
change the feel of panel surfaces, borders, and interactive elements.

| ID              | Name             | Material Style                              |
|----------------|------------------|---------------------------------------------|
| jedi-order     | Jedi Order       | Matte cream/white, soft blue accents, parchment-like surfaces, rounded corners |
| sith           | Sith             | Glossy black, sharp red accents, glass reflections, angular clipped corners |
| galactic-empire| Galactic Empire  | Flat gunmetal gray, rigid angular borders, military precision, lined borders |
| rebel-alliance | Rebel Alliance   | Warm earth tones, slightly weathered texture, orange/brown, rounded corners |
| mandalorian    | Mandalorian      | Beskar metallic sheen, geometric patterns, satin finish, angular corners |
| first-order    | First Order      | Ultra-clean black/white/red, sharp edges, gloss finish, minimal chrome |
| old-republic   | Old Republic     | Deep maroon/gold, senatorial elegance, satin surfaces, decorative borders |
| nightsisters   | Nightsisters     | Dark organic green, mystical red mist, matte finish, organic curves |
| bounty-hunters | Bounty Hunters   | Mixed weathered materials, utilitarian rust/tan, matte, functional corners |

### 3.6 Material Properties (CSS Implementation)

Material styles are achieved with CSS only — no WebGL for UI chrome:

```css
/* Matte — flat, no reflections */
.material-matte {
  background: rgb(var(--bg-card));
  border: 1px solid var(--border-subtle);
}

/* Satin — subtle directional gradient */
.material-satin {
  background: linear-gradient(
    135deg,
    rgb(var(--bg-card)),
    rgb(var(--bg-surface)) 60%,
    rgb(var(--bg-card))
  );
  border: 1px solid var(--border-light);
}

/* Gloss — reflective highlight, glassmorphism */
.material-gloss {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.06) 0%,
    rgba(255, 255, 255, 0) 40%,
    rgb(var(--bg-card)) 100%
  );
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

Corner styles:
```css
.corner-rounded { border-radius: 6px; }
.corner-angular { border-radius: 2px; }
.corner-clipped {
  clip-path: polygon(
    8px 0%, 100% 0%, 100% calc(100% - 8px),
    calc(100% - 8px) 100%, 0% 100%, 0% 8px
  );
}
```

---

## 4. Typography

### 4.1 Font Stack (Existing)

| Role      | Font         | Usage                                      |
|-----------|--------------|--------------------------------------------|
| Monospace | IBM Plex Mono| Code output, data readouts, panel values   |
| Cinematic | Orbitron     | Section headers, panel titles, splash text  |
| Body      | Exo 2        | General UI body text, descriptions          |
| Aurebesh  | FT Aurebesh  | Decorative alien script, toggle-able labels |

### 4.2 Aurebesh Toggle

Aurebesh is a **full UI toggle**, not just decorative. When enabled, ALL readable text
labels switch to the Aurebesh font face. The underlying text remains English (for
accessibility, screen readers, and search) — only the visual rendering changes.

Implementation:
```css
/* When Aurebesh mode is active */
html.aurebesh-mode {
  /* Override all non-code text to Aurebesh font */
  --font-ui: 'FT Aurebesh', 'Exo 2', system-ui, sans-serif;
}

html.aurebesh-mode .font-mono,
html.aurebesh-mode code,
html.aurebesh-mode pre,
html.aurebesh-mode .no-aurebesh {
  /* Keep code output, generated ProffieOS code, and explicitly excluded
     elements in their original font */
  font-family: var(--font-mono);
}
```

Key behaviors:
- Toggle in settings: `uiStore.aurebeshMode: boolean`
- Screen readers still read English text (only `font-family` changes)
- Generated ProffieOS code always renders in monospace (never Aurebesh)
- Numeric values remain readable (Aurebesh has its own numerals but these
  could be confusing — consider a sub-toggle for Aurebesh numerals)
- Keyboard shortcuts / hotkey labels are excluded (usability)

### 4.3 Dot-Matrix Style

For secondary readouts and HUD decoration, a dot-matrix / segmented display style:

```css
.dot-matrix {
  font-family: 'IBM Plex Mono', monospace;
  font-size: var(--text-ui-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.6;
  color: rgb(var(--accent));
}
```

---

## 5. Animation Inventory

### 5.1 Existing Animations (Preserve)

| Name                | Duration | Description                          |
|---------------------|----------|--------------------------------------|
| ignite-pulse        | 2s       | Blue box-shadow pulse                |
| retract-breathe     | 1.5s    | Red box-shadow breathing             |
| blade-shimmer       | 3s       | Vertical background-position shift   |
| particle-float      | 20s      | Upward drift with fade-in/out        |
| console-fast-blink  | 1s       | Step animation, 50% opacity          |
| console-slow-breathe| 3s       | 0.04 to 0.15 opacity pulse           |
| console-alert-pulse | 0.5s    | Pulsing alert indicator              |
| data-scroll         | varies   | Vertical Aurebesh text scroll        |
| energy-flow         | 6s       | Gradient position shift border glow  |
| kyber-pulse         | 4s       | Radial glow pulse with subtle scale  |
| hyperspace-streak   | 2s       | Incoming light streaks               |

### 5.2 New Ambient Animations

#### Scan Sweep
A radial sweep line (like a radar) that rotates through a panel or sidebar region.
- CSS `conic-gradient` rotating via `transform: rotate()`
- Fades from accent color to transparent over ~30 degrees of arc
- One rotation per 8-12 seconds (slow, atmospheric)
- Only in designated HUD areas, never over the blade canvas

#### Grid Pulse
Subtle brightness modulation of background grid lines.
- Rows/columns of the grid gently pulse in accent color
- Staggered timing so it looks like data flowing through the grid
- Period: 4-6 seconds per pulse cycle

#### Holographic Flicker
Occasional micro-flicker on HUD elements to simulate holographic projection.
- Random 50-100ms opacity dip (0.9 to 0.7) on text/borders
- Infrequent: 1-3 times per 10 seconds
- CSS animation with random delay via custom properties
- Only applied to elements with `.holo-flicker` class

#### Corner Bracket Glow
Panel corner decorations (common in Star Wars UIs) that pulse gently.
- L-shaped bracket elements at panel corners
- `border-color` pulse in accent color, 4-6 second cycle
- Drawn with CSS `::before` / `::after` pseudo-elements

#### Energy Conduit Lines
Thin lines connecting panels that pulse with "energy flow."
- SVG paths between related panels
- Gradient animation moving along the path (energy-flow keyframes)
- Shows data relationship between connected panels

### 5.3 Transition Animations

#### Panel Wipe (Tab Switching)
When switching between editor tabs/panels, content wipes in like a lightsaber ignition.
- Horizontal or vertical wipe using `clip-path: inset()` animation
- 250-400ms duration
- Optional spark particles at the wipe edge (Full tier only)
- Falls back to opacity fade on Medium tier, instant cut on Lite

#### Modal Hologram Entry
Modals materialize like a holographic projection.
- Scale from 0.95 to 1.0 with slight vertical scan-line effect
- Blue/accent tinted edge glow that fades
- 200-300ms duration

#### Sidebar Slide
Sidebar panels slide in from the edge with a slight overshoot spring.
- `transform: translateX()` with `cubic-bezier(0.34, 1.56, 0.64, 1)` easing
- 250ms duration
- Content fades in 100ms after container arrives

### 5.4 Micro-Interactions

#### Button Hover — Saber Hum Glow
Interactive buttons gain a subtle glow on hover matching the active theme accent.
- `box-shadow: 0 0 8px rgba(var(--accent), 0.3)` on hover
- 150ms transition
- Optional: paired with a quiet "hum" sound (if UI sounds enabled)

#### Toggle Switch — Ignite/Retract
Toggle switches animate like a tiny blade ignition.
- Thumb slides with a small glow trail
- Active state has a steady subtle glow
- 200ms transition

#### Slider Thumb — Crystal Pulse
Slider thumbs (e.g., color pickers, parameter sliders) pulse gently when active.
- Subtle `kyber-pulse` animation when the slider is focused/active
- Stops pulsing when unfocused

#### Toast Notifications — Comm Channel
Toast messages appear styled like incoming comm transmissions.
- Slide in from the right with a scan-line flash
- Brief "incoming transmission" animation (thin horizontal lines sweep down)
- Auto-dismiss with a fade-wipe

---

## 6. HUD Data Panels

### 6.1 Design Principle

HUD elements that display **real data** must be clearly distinct from decorative elements:
- Real data panels have visible labels, units, and clear typography
- Decorative elements use muted opacity and are positioned in gutters/margins
- Real data panels are interactive (hover for detail, click to expand)
- Decorative elements are non-interactive (pointer-events: none)

### 6.2 Real-Time Data Displays

These panels show actual editor state data styled as Star Wars HUD readouts:

#### LED Power Meter
- Horizontal or arc-shaped gauge showing estimated power draw
- Derived from: active style complexity, LED count, color brightness
- Visual: segmented bar graph (like cockpit power gauges)

#### Memory Budget Bar
- Segmented display showing flash memory usage
- Shows: current style size vs. available Proffieboard flash
- Visual: horizontal bar with sections color-coded by usage type

#### Color Spectrum Analyzer
- Real-time RGB channel display of the current blade output
- Already exists as Analyze Mode — style it as a HUD waveform
- Visual: three layered sine-like waveforms (R, G, B channels)

#### Motion Telemetry
- Swing speed, blade angle, twist readings from the motion simulator
- Visual: circular gauge cluster (like cockpit instruments)
- Three gauges: speed (0-100%), angle (-90 to 90), twist (-180 to 180)

#### Frame Rate / Engine Stats
- Current render FPS, LED update rate, engine tick time
- Visual: dot-matrix numeric readout in corner
- Useful for performance monitoring, especially at Full tier

#### Style Complexity Index
- Computed score based on number of layers, effects, transitions
- Indicator of how heavy the style will be on the Proffieboard
- Visual: single arc gauge with green/yellow/red zones

### 6.3 Decorative HUD Elements

These are purely atmospheric — fake data that looks cool but communicates nothing:

- **Scrolling Aurebesh columns** — Vertical text streams in sidebar gutters
- **Blinking status indicators** — Small LED dots in panel corners
- **Scan sweep arcs** — Rotating radar-style sweep in empty panel regions
- **Grid coordinate labels** — Aurebesh grid references along panel edges
- **Data ticker** — Horizontal scrolling "data feed" at bottom of sidebar
- **Circuit trace lines** — Thin decorative lines connecting panel elements

All decorative elements:
- Use muted opacity (0.03 - 0.15)
- Are positioned in margins, gutters, or behind content
- Have `pointer-events: none`
- Are hidden at Lite tier
- Are reduced/static at Medium tier

---

## 7. Sound Design

### 7.1 Philosophy

UI sounds are modeled after Star Wars console and cockpit audio: subtle electronic
chirps, beeps, and hums. They enhance immersion without being annoying.

**Default state: OFF.** User enables during onboarding or in settings.

### 7.2 Sound Categories

#### Navigation Sounds
| Action                | Sound Reference                              | Duration |
|----------------------|----------------------------------------------|----------|
| Tab switch           | Soft console beep (Imperial bridge chirp)    | 100-200ms|
| Panel open/close     | Hydraulic door hiss (brief, quiet)           | 200-300ms|
| Modal open           | Comm channel open tone                       | 200ms    |
| Modal close          | Comm channel close tone                      | 150ms    |

#### Interaction Sounds
| Action                | Sound Reference                              | Duration |
|----------------------|----------------------------------------------|----------|
| Button click         | Console button press (tactile click + beep)  | 80-120ms |
| Toggle on            | System activation chirp                      | 100ms    |
| Toggle off           | System deactivation chirp (lower pitch)      | 100ms    |
| Slider adjust        | Quiet frequency sweep (pitch follows value)  | Continuous|
| Hover (buttons)      | Very subtle electronic hum swell             | 50ms     |

#### Feedback Sounds
| Action                | Sound Reference                              | Duration |
|----------------------|----------------------------------------------|----------|
| Success/save         | R2-D2 style affirmative chirp                | 300ms    |
| Error/warning        | Imperial alarm (brief, single pulse)         | 200ms    |
| Copy to clipboard    | Data transfer beep                           | 150ms    |
| Preset loaded        | Holocron activation tone                     | 400ms    |
| Theme switch         | Hyperdrive engage/disengage whoosh           | 500ms    |

#### Ambient Sounds (Optional)
| Sound                 | Description                                  | Loop     |
|----------------------|----------------------------------------------|----------|
| Bridge ambience      | Quiet background hum of a starship bridge    | Yes      |
| Console chatter      | Occasional random beeps/chirps (very quiet)  | Yes      |

### 7.3 Implementation

- Use Web Audio API (existing `packages/sound` infrastructure)
- Sounds stored as small audio sprites (single file, offset-based playback)
- Master volume control separate from blade sound preview volume
- Per-category volume/mute controls in settings
- Sounds should be synthesized or sourced from royalty-free sound-alike libraries
  (not ripped from films — even for a free app, clean sourcing is best practice)

### 7.4 Onboarding Sound Setup

During first-use onboarding, present sound as a choice:
```
"Enable cockpit sounds?"
[ Silent Mode ]  [ Subtle ]  [ Full Immersion ]
```
- Silent: No UI sounds
- Subtle: Navigation + interaction sounds only, low volume
- Full Immersion: All sounds including ambient, moderate volume

---

## 8. Splash / Loading Screen

### 8.1 Requirements

- **Integrated into app layout** — not a separate window or blocking overlay
- **Fast** — should not artificially delay app readiness
- **Dismissable** — show once per session by default, option to disable permanently
- **Functional** — displays app name, version number, and loading progress
- **Animated** — brief cinematic moment that sets the tone

### 8.2 Concept: Kyber Crystal Ignition

1. App shell renders immediately (dark background with theme colors)
2. Center of screen: a small crystalline shape (CSS/SVG) fades in
3. Crystal pulses with inner light (kyber-pulse animation, accent color)
4. Light expands outward in a horizontal wipe (like blade ignition)
5. App name resolves from the light, version number below in dot-matrix
6. Background UI panels fade in around the edges during the animation
7. Total duration: 1.5-2 seconds (not artificially padded)
8. If app is already loaded, animation still plays but UI is interactive beneath it

### 8.3 Settings

```typescript
interface SplashSettings {
  showSplash: boolean;       // Default true, user can disable
  splashAnimationTier: 'full' | 'minimal' | 'none'; // Follows performance tier
}
```

---

## 9. Aurebesh System

### 9.1 Toggle Modes

| Mode     | Behavior                                                      |
|----------|---------------------------------------------------------------|
| Off      | All text in standard fonts (Exo 2 / Orbitron / IBM Plex Mono) |
| Labels   | Panel titles, section headers, and navigation in Aurebesh. Values, descriptions, and code remain standard. |
| Full     | Everything except generated code, numeric values, and keyboard shortcuts renders in Aurebesh |

### 9.2 Exclusions (Never Aurebesh)

- Generated ProffieOS C++ code
- Keyboard shortcut labels (Ctrl+Z, etc.)
- Error messages (must be immediately readable)
- Numeric input fields
- File paths and technical identifiers
- Accessibility text (screen reader labels)

### 9.3 Implementation

The toggle applies a CSS class to `<html>` that overrides `font-family`:

```css
html.aurebesh-labels .panel-title,
html.aurebesh-labels .nav-label,
html.aurebesh-labels .section-header {
  font-family: 'FT Aurebesh', sans-serif;
}

html.aurebesh-full * {
  font-family: 'FT Aurebesh', sans-serif;
}

/* Exclusions */
html.aurebesh-full .no-aurebesh,
html.aurebesh-full code,
html.aurebesh-full pre,
html.aurebesh-full .font-mono,
html.aurebesh-full kbd,
html.aurebesh-full input[type="number"],
html.aurebesh-full .error-message {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
}
```

---

## 10. Future Ideas (Out of Scope)

These ideas emerged during design discussion and should be built into the product
at a later phase. They are captured here for reference.

### 10.1 Procedural Kyber Crystal Generator

A WebGL or Canvas2D procedural crystal shape generator:
- User provides or is assigned a **seed value** (could be their username hash,
  a random value, or tied to their preset configuration)
- The seed generates a unique crystalline geometry — facet count, proportions,
  internal refraction pattern, color intensity
- Crystal is displayed in the UI (settings page, splash screen, or sidebar decoration)
- Could be used as a visual identity / avatar for community features
- Implementation: vertex generation from seed, simple Lambert shading, inner glow

### 10.2 Reactive Crystal (Blade-Linked)

An alternative mode where a kyber crystal visualizer responds to the current blade
state — pulsing with the blade's shimmer, changing hue with color changes. This was
considered and explicitly deferred because it would compete with the blade visualizer
for visual attention. Could be offered as a standalone "meditation mode" or screensaver.

### 10.3 Location Ambient Backgrounds

Full-screen subtle background imagery tied to location themes:
- Tatooine: faint dust particles, heat shimmer
- Hoth: slow snowfall particles
- Mustafar: ember particles rising
- Dagobah: fog/mist drift
- Requires careful opacity management to avoid distraction

### 10.4 Hilt Material Preview

3D hilt viewer (Three.js) with material properties that match the active theme:
- Jedi Order theme: polished silver/chrome hilt materials
- Sith theme: dark chrome, red kyber glow from emitter
- Weathered/battle-damaged variants

### 10.5 Community Sound Packs

Allow users to swap UI sound packs:
- Imperial Bridge Pack
- Rebel Base Pack
- Cantina Pack (playful)
- Droid Pack (R2/BB-8 chirps)
- User-uploaded custom packs

### 10.6 Cinematic Mode

A "presentation mode" that strips the editor chrome and shows just the blade
with cinematic HUD overlays — for recording demos, streaming, or just enjoying
the blade in a more immersive view.

---

## 11. Implementation Priority

### Phase 1: Foundation

1. Extend `CanvasTheme` interface with `material` and `ambient` properties
2. Implement CSS material classes (matte/satin/gloss) and corner styles
3. Add Aurebesh toggle to `uiStore` with CSS class application
4. Add performance tier setting to `accessibilityStore`
5. Build splash/loading animation (CSS/SVG, not blocking)

### Phase 2: Themes

6. Design and implement 6-8 new location themes (highest visual variety first)
7. Design and implement 4-5 faction themes with material properties
8. Build enhanced theme picker UI with preview swatches and categories

### Phase 3: Animations

9. Implement scan sweep, grid pulse, corner bracket glow animations (CSS)
10. Build panel wipe transition system for tab switching
11. Add holographic flicker and console blink to HUD elements
12. Add decorative elements (Aurebesh scroll, data ticker, circuit traces)

### Phase 4: Data Panels

13. Build HUD-styled real-time data readout components
14. LED power meter, memory budget bar, motion telemetry gauges
15. Frame rate display, style complexity index
16. Ensure clear visual separation from decorative elements

### Phase 5: Sound

17. Source/synthesize UI sound sprite library
18. Implement sound manager with category controls
19. Wire sounds to UI interactions
20. Add onboarding sound preference step
21. Optional ambient sound loops

### Phase 6: Polish

22. Performance tier auto-detection
23. Reduced motion / accessibility audit of all new animations
24. Cross-browser testing of backdrop-filter, clip-path, conic-gradient
25. Mobile responsiveness of all HUD elements
