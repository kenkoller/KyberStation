# KyberStation — UX North Star

**Status:** v0.1 draft · Synthesized from a 40-reference curated review
**Owner:** Ken · **Project:** KyberStation (Proffieboard V3.9 / ProffieOS 7.x blade-style workbench)
**Intended audience:** the founder, future contributors, any contractor picking up a component

---

## 1. Posture

KyberStation is a **desktop + web instrument-grade workbench** for designing Neopixel lightsaber blade styles. It is not a chat product, not a dashboard, not a note-taking app, and not a v0-generated SaaS template. It targets a technical hobbyist community (cosplay, dueling, collecting) that overlaps heavily with Blender, sim-racing, modular-synth, and Proffie-DIY cultures. The tone is humble — first public programming project by a one-person S-Corp, Star Wars community-toned, not corporate — and the craft bar is professional-instrument, not beginner-permissive.

---

## 2. Primary north-star references (top 5 A's)

| # | Reference | What we steal |
|---|-----------|---------------|
| 1 | **Ableton Live 12** | Architectural skeleton: device-chain-style LayerStack, rack-macro pattern for PerformanceBar, single-screen workbench shape, color-as-grouping discipline. |
| 2 | **Vital (synth)** | Aesthetic and tonal primary: flat-themable chrome, animated live previews on every modulator, drag-to-route modulation with persistent source-color propagation, community-first brand register. |
| 3 | **Linear** | Polish ceiling and keyboard-first discipline: ⌘K command palette as a primary navigation surface, dark UI restraint with semantic-only chrome, empty states as shipped design artifacts, sub-200ms microinteraction craft. |
| 4 | **The Expanse (Territory Studio)** | Motion language: always-moving data that breathes even at idle, motion-frequency as visual hierarchy, thin precise line weights, two-chroma-per-moment palette discipline. |
| 5 | **Mutable Instruments** | Signature aesthetic discipline: typographic panel design, ruthless graphic restraint, design-system-as-ethos, open-source community posture baked into the visual language. |

**Honorable A-grade references also driving the project:** Andor (Imperial flagship theme + monospace-as-data-signal), Savi's Workshop (ceremonial onboarding moments), SSL 4000 (LayerStack strip discipline), Bitwig (modulation plates), Resolve (page-based workspace architecture), Blender (theme system + drag-to-scrub), Raycast (two-level palette with action sheet), F1 steering wheel (PerformanceBar shift-light rail + per-style macro customization), Outer Wilds (Rumor Map for future Graph View / BuildLog).

---

## 3. Explicit anti-references (D's — "if KyberStation looks like this, ship it back")

| # | Anti-reference | What we avoid |
|---|----------------|---------------|
| 1 | **SWTOR / KOTOR character menus** | No ornate borders, no beveled edges, no fantasy-RPG trim, no rarity-color coding on presets, no MMO stat-block tooltip trees. |
| 2 | **ChatGPT desktop app** | No conversation-as-UI, no oversized whitespace, no default-system-chrome, no "generic AI app" register anywhere. |
| 3 | **Notion default workspace** | No block-based content metaphor, no infinite-sidebar-of-pages nav, no pale-gray corporate-pleasant defaults, no blank-canvas-expects-customization shape. |
| 4 | **v0.dev / Vercel AI dashboards** | No card-wrapped-everything layouts, no metric-tile 2x2 grid dashboards, no inverted chrome-to-content ratio. |
| 5 | **Untouched shadcn/ui defaults** | No shipped zinc-token skins, no 8px-everything corner radius, no stock shadcn Card/Dialog/DropdownMenu appearing unstyled. Radix primitives are the foundation; the shadcn *skin* is never the product. |

**Test for any screenshot:** would a Proffie-forum regular look at it and think "this was made by someone who cares about lightsabers," or would they think "this is another Next.js dashboard"? The first answer is the only acceptable one.

---

## 4. Per-component mapping

| Panel / surface | Emulate | For specifically |
|-----------------|---------|------------------|
| **WorkbenchLayout** | Resolve (pages) + Blender (workspaces) + Ableton (single-screen discipline) | Bottom tab bar with 4 named pages (Design / Audition / Code / Deliver); per-page editable layouts that persist; ⌘1–4 to switch; frame chrome (top + bottom) identical across pages. |
| **BladeCanvas** | Serum + Resolume + Diva (for committed depth) | Hero surface occupying 40–55% of workbench, always animating, never iconified; the *one* place cinematic depth is permitted (emissive blade, physically-plausible glow); overlays follow Mando HUD rules. |
| **LayerStack** | Ableton (device chain) + Resolume (compositor rail) + SSL (identical-strip discipline) + Mutable (typographic restraint) | Vertical rail of identical-shape rows; each row: live mini-thumbnail, layer-type badge, name, blend mode, bypass/solo/mute, fold-out parameters; solo binds to BladeCanvas isolation (Jedi: Survivor); consistent SSL color grammar for functions. |
| **StylePanel / EffectPanel** | Figma (Inspector conventions) + TouchDesigner (parameter density + expression fields) + Blender (drag-to-scrub) | Right-side Inspector pattern, 24–28px row rhythm, collapsible sections with consistent headers, tabbed parameter pages, drag-to-scrub on every numeric, math expressions on type, expression/modulation color signals on the field itself. |
| **PerformanceBar** | SSL (master section) + Maschine (8-knob page discipline) + F1 steering wheel (shift-light rail + per-user macro customization) + Serum (persistent bottom row) | Persistent bottom region chrome-differentiated from LayerStack; 8 macros per page with swap-pages affordance; per-style macro assignment; shift-light LED rail above showing real-time activity of the top modulators in their identity colors. |
| **StatusBar** | Boeing/Airbus PFD + Andor terminal typography | Thin always-visible PFD strip below PerformanceBar: profile name, connection state, active page, modified flag, storage %, active theme, current preset. Never moves, never hides. Rendered in JetBrains Mono. |
| **Modulator plates (in LayerStack)** | Bitwig (plates-on-devices) + Vital (animated previews + drag-to-route) + Mutable (typographic panel) | First-class citizens alongside layers; each plate shows live waveform/oscilloscope/event indicator; drag-to-assign to any numeric; source-identity color propagates to every parameter driven. |
| **ColorPanel** | Figma (color controls) + Severance inverted (haptic "feels right" drag) + Tron (glow-as-function only) | Standard color-picker affordances plus gradient stops, opacity, blend modes; drag interactions tuned for "feel"; color previews glow only because the blade glows, never because chrome glows. |
| **MotionSimPanel** | The Expanse (live telemetry rhythm) + F1 (central telemetry LCD) + Mando HUD (overlay restraint) | Live motion telemetry with Expanse-grade always-moving readouts; when active, can project a compact F1-LCD-style central readout onto BladeCanvas during Audition page; all edge-anchored, event-driven. |
| **TimelinePanel** | ETC Eos (cue list) + Expanse (live rhythm) + SSL (color grammar) | Tabular score of named blade-style events (ignite / flicker / lockup / clash / blast / retract), row-per-event with timing + parameters; color-coded by event type using the SSL/aviation palette; editable inline. |
| **CodeOutput** | Andor (monospace terminal register) + BR2049 (large hero typography for filename/header) + Linear (microinteraction polish) | JetBrains Mono throughout; Andor-grade utilitarian terminal feel; header treatment (current style identifier + Proffie config version) gets BR2049-scale display weight; syntax coloring uses the 6 global status colors, not theme accents. |
| **PresetGallery** | VCV Rack library + Savi's Workshop (identity cards) + Outer Wilds (lineage graph snippet) + Scarif (filename reveal on load) | Library-model browsable index with author / version / lineage on each preset; tiles are "identity cards" with live mini-render, author, path-cluster tag, version; load animation uses BR2049-style large reveal; community distribution built on the Blender extensions / VCV library pattern. |
| **SoundFontPanel** | Ableton (chain metaphor) + Mutable (typographic restraint) | Sound-font structure presented as a navigable tree matching the ProffieOS font-mounting model; entries rendered in JetBrains Mono; live playback with waveform preview per clip (Vital/Expanse animation discipline). |
| **SaberProfileManager** | Linear (restrained list UI) + SWTOR character-sheet metaphor inverted (executed flat) + Andor typography | Each saber profile as a "character sheet" — hero render at top, categorized attribute groups (blade specs / button map / equipped style / equipped sound font / smoothswing settings), rendered in Linear-grade flat chrome without SWTOR's ornate trim. |
| **CardWriter** | Rogue One Scarif (physical-slot ceremony) + Mandalorian forge (amber commit lighting) + Maschine (hardware legibility) + Boeing cockpit (operation-under-load discipline) | The one elevated-ceremony panel; multi-stage commit flow (card detected → payload prepared → writing → verified); ambient chrome warms amber briefly on commit; explicit green/amber/red aviation state colors for each stage. |
| **StorageBudgetPanel** | Returnal integrity gauge + Maschine state legibility | Radial integrity-style gauge showing % used; event-flash on threshold crossings via the `criticalStateChange` primitive; always-visible % also reflected in StatusBar. |
| **OLEDPreview** | Maschine (1:1 hardware mirror) + Hoth rangefinder (vector wireframe) + Andor (mono typography) | Pixel-exact 128×32 (or configured resolution) OLED mirror; 1x / 2x / 4x zoom; rendered in the exact font the Proffie uses at the exact pixel density it will display; optional Hoth-wireframe overlay for pixel-grid visibility. |
| **VisualizationStack** | The Expanse (layered live readouts) + BR2049 (single-hero-readout) | Composable live-view stack for BladeCanvas overlays: layer 1 = blade itself (always); layer 2 = technical wireframe (toggleable, Hoth-rangefinder aesthetic); layer 3 = telemetry readouts (toggleable, Expanse-rhythm, amber/cyan corner anchors). |
| **FullscreenPreview** | Savi's Workshop (first-ignition payoff) + Foundation (cinematic transition only) + Diva (committed depth register) | The reveal scene; workbench chrome bokeh-blurs out, BladeCanvas fills frame; transition is Foundation-grade cinematic, *destination* is Diva-grade committed depth (on the blade and the ambient environment around it). |
| **SmoothSwingPanel** | Bitwig (plate-in-the-stack) | Refactored as a specialized modulator plate with extra parameter pages, living inside LayerStack rather than as a sibling panel with unclear relationship. |
| **SettingsModal** | Linear (restraint) + Blender (theme section architecture) | Linear-grade modal chrome; Theme section modeled on Blender's Preferences → Themes panel with browse / install / preview / fork / publish flow. |

### Deferred to post-v1 (with references assigned)

| Panel | Emulate | Ships as |
|-------|---------|----------|
| **Graph View / Expert Mode** | Outer Wilds Rumor Map + hard-wire to CodeOutput | Optional toggle showing the actual ProffieOS template tree as a flat, clustered, sector-grouped node graph. Ships with BuildLog as a power-user pair. |
| **BuildLogPanel / StyleHistoryPanel** | Outer Wilds ship log | Per-style journal showing versions, fork points, author notes, narrative-organized. |
| **ModulationGraphPanel** | Pigments Mod Overview | When a style's modulation graph outgrows hover-to-highlight, a dedicated mod-matrix view. |
| **Persistent command-line bar** | Eos lighting console | Thin typeable command surface above StatusBar, toggleable with backtick, same verbs as ⌘K palette. |
| **Community extensions** | Raycast extensions + VCV library | Third-party palette commands, installable. |

---

## 5. House style (one paragraph, contractor-readable)

KyberStation is an instrument-grade workbench for designing lightsaber blade styles, not a dashboard or a chat product. Visually: flat, calm, dark-by-default chrome with a single accent and a single warning color per theme; sharp or near-sharp corners, never the pillow-soft 8px rounding of generic SaaS; Inter for chrome and JetBrains Mono for all data, numerics, code, and identifiers — plus Orbitron as the single sanctioned ceremonial display face for the KyberStation wordmark, /docs hero headers, and cinematic reveal moments. Spatially: a persistent hero (BladeCanvas) anchors the top half, a compositor rail (LayerStack) anchors one side, a macro surface (PerformanceBar) anchors the bottom, and a thin status strip (StatusBar) sits below that — these frames never move. A bottom tab bar swaps four named workspace pages (Design / Audition / Code / Deliver), each with an opinionated authored layout that users can adjust within. Color is strictly functional — never decoration — and six aviation-standard status colors (green / amber / red / cyan / magenta / white) stay constant across all 30 themes so muscle memory survives theme changes. Motion is always-on but disciplined: live data breathes at its natural frequency, critical state changes pulse-and-settle in under a second, and cinematic depth is reserved exclusively for the Three.js Kyber Crystal renderer and the FullscreenPreview transition. Typography carries hierarchy — reach for type weight and scale before reaching for cards or borders. Empty states are shipped design artifacts, never blank rectangles. The tone is humble, technical, community-toned — a hobbyist instrument made with care, not a corporate SaaS product.

---

## 6. One-line directions

| Axis | Direction |
|------|-----------|
| **Typography** | Inter (humanist sans, chrome + labels) + JetBrains Mono (all data / numerics / code / identifiers / code-register ceremonial use) + Orbitron (single sanctioned ceremonial display face — KyberStation wordmark, page-level hero headers on `/docs`, cinematic reveal moments). Row rhythm 24–28px. Minimum 16–18px for live telemetry. Three faces is the cap — no fourth typeface. FT Aurebesh remains a theme-mode substitution, not an addition. |
| **Color** | Per-theme 3-chroma grammar (accent + warning + neutral scale). Six global status colors fixed across every theme (green/amber/red/cyan/magenta/white). Color is function — grouping, source identity, state, modulation — never decoration. |
| **Density** | TouchDesigner-grade parameter density. Chrome-to-content ratio aggressively low. Reach for type and rule before reaching for cards or borders. |
| **Motion** | Expanse-rhythm always-on live data that breathes at its natural frequency. `criticalStateChange` motion primitive = 180ms pulse + color-shift + 600ms decay. Cinematic depth only on Kyber Crystal + FullscreenPreview transition. |
| **Glow** | Reserved and meaningful. The blade glows because the blade is emissive. Chrome does not glow. Buttons do not halo. Glow signals *live* and *active*; nothing else. |
| **Radius** | Deliberate tokens, not blanket 8px. Candidate scale: 2px chrome / 4–6px interactive / 0px data cells. Never default-Tailwind soft-rounded-everything. |
| **Keyboard-first** | ⌘K palette is a v1 primary surface with Raycast-grade rich rows and two-level find→act. Every common action has a shortcut, discoverable inline. Space = audition, ⌘1–4 = page swap, ⌘S = save, ⌘↵ = commit to card, / = focus palette. |
| **Theming** | CSS variables everywhere, portable JSON theme files, Blender-style extensions library for community themes. Four flagship themes at launch: Imperial (Andor) / Jedi (Savi's + Survivor parchment) / Rebel (OT vector-green) / Rocinante (Expanse cool-telemetry). 30-theme library ships alongside. |
| **Defaults** | Ship opinionated. SaberWizard completes into a complete working style. PresetGallery ships with curated presets. Pages ship with authored layouts. Empty space is a design failure. |

---

## 7. Named motion + interaction primitives

| Primitive | Spec | Used on |
|-----------|------|---------|
| `criticalStateChange(element)` | 180ms scale-pulse + color-shift to warning/error + 600ms decay to resting | StorageBudgetPanel thresholds, CardWriter state changes, CodeOutput error flags, any threshold crossing. |
| `firstIgnition()` | Play ignite animation with current-style on-sound, dim workbench chrome to ~60% during, restore over 800ms | End of SaberWizard; first render of a brand-new style. |
| `commitCeremony(stage)` | Ambient amber lighting cast on chrome for 800–1500ms during commit operations; three-stage reveal (prepared / writing / verified) | CardWriter only. |
| `filenameReveal(name)` | Large JetBrains Mono Bold (80–120px) stagger-in of identifier, 400ms ease-out, settle | PresetGallery load, SaberWizard preset commit, potentially Audition page preset swap. |
| `sceneTransitionToFullscreen()` | Workbench chrome depth-of-field blur to irrelevance over 400ms; BladeCanvas scales and sharpens to frame-fill | FullscreenPreview entry/exit. |
| `layerSoloIsolate(layerId)` | Ghost all other layers to 25% opacity; pulse the active LED range on BladeCanvas in the layer's identity color | Solo button on any LayerStack row. |
| `modulatorHoverHighlight(modId)` | Every parameter driven by this modulator lights up in the modulator's identity color for as long as hover persists | Hover on any modulator plate. |

---

## 8. Open questions (tracked — resolve before v1 or consciously defer)

1. **Graph View + BuildLog release timing.** Both deferred to post-v1 with shared design language (Outer Wilds Rumor Map + ship log). Decide whether they ship together as v1.1 or individually.
2. **Persistent command-line bar (backtick) timing.** Ships as v1 or post-launch? Cheap to build if the ⌘K command registry is already there; not strictly required for launch.
3. **Theme editor UX in v1 vs post-v1.** Users can install community themes at launch (Blender extensions pattern). Whether they can *author* themes in-app at launch is open. Defaulting to: install at v1, author post-v1.
4. **Ceremonial display-weight type.** ~~Currently locked as JetBrains Mono Bold at 80–120px for reveal moments.~~ **Resolved 2026-04-18:** Orbitron is the sanctioned ceremonial display face — it pre-dated this doc (in the codebase since the initial commit, 2026-04-12) as `.font-cinematic` on the KyberStation wordmark + `/docs` hero headers + design-system page. It reads angular / geometric / sci-fi without tripping the §3 SWTOR fantasy-RPG anti-ref, and leaves JetBrains Mono free to stay in its code-register role. §5 (house style) and §6 (typography row) updated to reflect the three-face system (Inter + JetBrains Mono + Orbitron). A fourth typeface is still out of scope.
5. **PerformanceBar macro count.** Currently 8 per page with page-swap affordance (Maschine + F1). If community feedback in beta says 4 is enough or 12 is needed, adjust.
6. **BladeCanvas hero proportion.** Currently specced at 40–55% of workbench. Exact value depends on minimum supported resolution and whether the technical-overlay layer is on by default.
7. **How much of the Proffie C++ template system is surfaced directly** vs. wrapped in KyberStation abstractions. Affects whether Graph View is a "view of real templates" or "a view of a KyberStation-native graph that compiles to templates."
8. **Launch scope of the community library.** Themes — yes, v1. Workspaces — yes or soon. Presets — staged rollout (curated-only at launch, community-upload post-launch). Confirm before hitting May 4 marketing amplification.

---

## 9. Reference index (all 40, for traceability)

| # | Reference | Category | Signal |
|---|-----------|----------|--------|
| 1 | Ableton Live 12 | Workbench DAW | A |
| 2 | Resolume Arena | Workbench DAW | B |
| 3 | TouchDesigner | Workbench DAW | B |
| 4 | Bitwig Studio | Workbench DAW | A |
| 5 | Xfer Serum | Workbench DAW | B |
| 6 | Vital | Workbench DAW | A |
| 7 | Native Instruments Maschine+ | Workbench DAW | B |
| 8 | u-he Diva | Workbench DAW | C |
| 9 | Arturia Pigments | Workbench DAW | B |
| 10 | VCV Rack 2 | Workbench DAW | C |
| 11 | Andor S1/S2 | Star Wars | A |
| 12 | Rogue One (Scarif) | Star Wars | B |
| 13 | Mandalorian HUD | Star Wars | C |
| 14 | Jedi: Survivor | Star Wars | B |
| 15 | Savi's Workshop | Star Wars | A |
| 16 | Mandalorian forge | Star Wars | B |
| 17 | Original Trilogy practical UIs | Star Wars | B |
| 18 | SWTOR / KOTOR | Star Wars | D |
| 19 | The Expanse (Territory) | Hard sci-fi FUI | A |
| 20 | Blade Runner 2049 | Hard sci-fi FUI | B |
| 21 | Foundation (Apple TV) | Hard sci-fi FUI | C |
| 22 | Severance | Hard sci-fi FUI | C |
| 23 | Tron: Legacy | Hard sci-fi FUI | B |
| 24 | Death Stranding | Hard sci-fi FUI | B |
| 25 | Returnal | Hard sci-fi FUI | B |
| 26 | Outer Wilds | Hard sci-fi FUI | A |
| 27 | Figma | Pro creative | B |
| 28 | Linear | Pro creative | A |
| 29 | DaVinci Resolve | Pro creative | A |
| 30 | Blender 4.x | Pro creative | A |
| 31 | Raycast | Pro creative | A |
| 32 | SSL 4000 console | Hardware | A |
| 33 | ETC Eos / GrandMA3 | Hardware | B |
| 34 | Mutable Instruments / Eurorack | Hardware | A |
| 35 | Boeing 787 / Airbus A350 cockpit | Hardware | B |
| 36 | F1 steering wheel | Hardware | A |
| 37 | ChatGPT desktop | Anti-reference | D |
| 38 | Notion default | Anti-reference | D |
| 39 | v0.dev dashboard | Anti-reference | D |
| 40 | shadcn/ui defaults | Anti-reference | D |

---

## 10. How this document is meant to be used

- **Contractor / collaborator onboarding:** read sections 1, 5, 6, and 7 first. That's the whole visual language in ~5 minutes. Then scan section 4 for the specific panel you're working on.
- **Design review:** compare any proposed screen against section 3 (the D's) first — if it triggers any of those, revise before presenting. Then check it against the relevant row of section 4.
- **New component not listed in section 4:** find the closest two existing components, average their references, and propose. Raise ambiguity in the project channel before building.
- **Theme contributions:** see section 6's *Theming* row and the forthcoming `docs/THEMING.md`. Every theme must hold the six global status colors fixed.
- **Updating this document:** changes to the *primary north-stars* (section 2), the *house style* (section 5), or the *motion primitives* (section 7) require deliberate review — they propagate. Changes to the *per-component mapping* (section 4) or *open questions* (section 8) are expected to evolve during the v1 build.

---

_End of draft._
