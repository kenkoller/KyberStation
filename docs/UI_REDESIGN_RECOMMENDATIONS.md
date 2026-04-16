# UI Redesign Recommendations: Scaling to 82+ Blade Animations

**Status**: Design proposal (research phase)
**Date**: 2026-04-16
**Scope**: StylePanel, EffectPanel, CanvasToolbar, WorkbenchLayout action bar, ignition/retraction selectors

---

## Current State Analysis

| Component type | Count | UI surface | Problem |
|----------------|-------|-----------|---------|
| Blade styles | 29 | 2-column button grid (320px max-height scroll) | Wall of 58 buttons, no grouping, no search, identical visual weight |
| Effects | 21 | 14-button action bar + keyboard shortcuts | Bar overflows, 5 effects have no shortcut key, all buttons look the same |
| Ignitions | 19 | 2-column button grid per panel (3 separate copies of the list) | Duplicated across EffectPanel, TabColumnContent, CanvasToolbar |
| Retractions | 13 | 2-column button grid / dropdown | Same duplication issue; no pairing suggestions |

The UI was designed for ~32 total animations. At 82, several patterns have broken:

1. **Flat lists do not scale.** 29 styles in a grid forces users to scroll and scan every label. Cognitive load is high; discovery is low.
2. **Action bar overflow.** 14 effect buttons in a horizontal bar push past the viewport on smaller desktop screens. The last 5 effects (Scatter through Invert) have no keyboard shortcut, making them second-class.
3. **Triplicated data.** The ignition/retraction list is defined identically in `EffectPanel.tsx`, `TabColumnContent.tsx` (the `IgnitionRetractionPanel`), and `CanvasToolbar.tsx`. Adding a new ignition means editing 3 files.
4. **No visual previews.** Every style, ignition, and retraction is a text label. Users cannot tell what "Automata" or "Spaghettify" looks like without clicking it.
5. **No progressive disclosure.** First-time users see all 29 styles at once. There is no recommended starting point, no "beginner" vs "advanced" separation.

---

## 1. Style Selection Redesign

### 1.1 Category Groups

Organize the 29 styles into 5 semantic categories. Each category is a collapsible section with a header. Only "Classic" is expanded by default for new users.

```
CLASSIC (5)                          -- expanded by default
  Stable       Unstable      Rotoscope
  Pulse        Gradient

NATURE (6)                           -- collapsed
  Fire         Aurora        Candle
  Ember        Cinder        Tidal

ENERGY (7)                           -- collapsed
  Plasma       Photon        Helix
  Torrent      Cascade       Vortex
  Neutron

ABSTRACT (6)                         -- collapsed
  Crystal Shatter   Prism      Automata
  Shatter           Moire      Mirage

REACTIVE (3)                         -- collapsed
  Data Stream    Gravity      Nebula

CREATIVE (2)                         -- always visible at bottom
  Painted        Image Scroll
```

**Rationale**: Category names are intuitive (a user looking for a fire-like effect checks Nature; someone wanting physics checks Reactive). The 5 Classic styles are the ones most users will start with, matching the learning curve.

### 1.2 Search/Filter

Add a search input above the category accordion. Behavior:

- Typing filters styles across all categories in real time (matching label or description substring).
- When the search field is non-empty, category headers are hidden and results display as a flat filtered list.
- Clearing the search restores the category view.
- The search input has a monospace placeholder: `Search 29 styles...`

This is especially important as the style count grows past 30. At 50+ styles, search becomes the primary navigation mechanism.

### 1.3 Visual Preview Thumbnails

Replace the current text-only buttons with thumbnail cards. Each card shows:

```
+------------------------------+
| [animated preview strip]     |  <- 80x24px canvas showing 3 frames
| Plasma Storm                 |  <- style name
| Chaotic plasma arcs          |  <- description (truncated)
+------------------------------+
```

**Implementation approach**: Use a small offscreen canvas (80x24) per visible style, running the engine's `getColor()` at 3 sample positions (0.2, 0.5, 0.8) to produce a static 3-pixel-wide color bar. This is cheap (no animation loop needed) and gives users an instant visual sense of the style's color behavior with their current base color.

For the active style, the preview strip animates at ~8 FPS to show motion (scrolling, flickering, etc.).

**Fallback for performance tier "battery"**: Static color dots only (the current `StyleDot` approach), no canvas previews.

### 1.4 Surfacing Popular/Recommended Styles

Add a "Recommended" section above the categories. This is not a static list -- it adapts:

- **First-time users**: Show the 4 most distinctive styles: Stable, Fire, Aurora, Unstable. Label: "Good starting points."
- **Returning users**: Show the 3 most recently used styles (from localStorage) + 1 style they have never tried, labeled "Try something new." This encourages exploration.
- **After loading a preset**: Show the preset's style at the top with a "Currently from preset" badge.

### 1.5 Layout Mockup

```
+--------------------------------------------------+
| [Search styles...]                         [x]   |
+--------------------------------------------------+
| RECOMMENDED                                      |
|  [Stable*]  [Fire]  [Aurora]  [Try: Automata]    |
+--------------------------------------------------+
| v CLASSIC (5)                                     |
|   [Stable]  [Unstable]  [Rotoscope]              |
|   [Pulse]   [Gradient]                            |
| > NATURE (6)                                      |
| > ENERGY (7)                                      |
| > ABSTRACT (6)                                    |
| > REACTIVE (3)                                    |
|---                                                |
|   [Painted]  [Image Scroll]                       |
+--------------------------------------------------+
```

Asterisk (*) indicates the currently active style, highlighted with the accent border.

---

## 2. Effect Management at Scale

### 2.1 Tiered Action Bar

Split the 21 effects into 3 tiers based on real-world dueling frequency and ProffieOS usage patterns:

**Tier 1 -- Primary (always visible in action bar, with keyboard shortcut):**

| Effect | Key | Rationale |
|--------|-----|-----------|
| Clash | C | Most common dueling interaction |
| Blast | B | Blaster deflection, very common |
| Lockup | L | Blade bind, extended hold effect |
| Stab | S | Forward thrust, common in combat |
| Lightning | N | Dramatic hold effect |
| Drag | D | Floor drag, very recognizable |

These 6 + Ignite/Retract (Space) = 7 buttons in the primary action bar. This is a comfortable number for a horizontal toolbar.

**Tier 2 -- Secondary (visible via "More Effects" flyout, with keyboard shortcut):**

| Effect | Key | Rationale |
|--------|-----|-----------|
| Melt | M | Common but less frequent than Tier 1 |
| Force | F | Non-combat, situational |
| Shockwave | W | Dramatic, less frequent |
| Freeze | Z | Situational |

**Tier 3 -- Extended (accessible via Effects panel or command palette):**

| Effect | Rationale |
|--------|-----------|
| Scatter | Creative/experimental |
| Ripple | Creative/experimental |
| Overcharge | Power fantasy, niche |
| Invert | Utility/debug feel |
| Fragment | Dramatic, niche |
| Bifurcate | Advanced color effect |
| Ghost Echo | Experimental |
| Splinter | Experimental |
| Coronary | Experimental |
| Siphon | Experimental |
| Glitch Matrix | Experimental |

### 2.2 "More Effects" Flyout

The action bar gets a `[+ More]` button after the 6 primary effects. Clicking it opens a popover/flyout panel:

```
Action Bar:
[Ignite] | [Clash C] [Blast B] [Lockup L] [Stab S] [Lightning N] [Drag D] | [+ More]

Flyout (on click of "+ More"):
+-------------------------------------------+
| SECONDARY EFFECTS                         |
|  [Melt M]  [Force F]  [Shockwave W]      |
|  [Freeze Z]                               |
|-------------------------------------------|
| EXTENDED EFFECTS                          |
|  [Scatter]   [Ripple]    [Overcharge]     |
|  [Invert]    [Fragment]  [Bifurcate]      |
|  [Ghost Echo] [Splinter] [Coronary]       |
|  [Siphon]    [Glitch Matrix]              |
+-------------------------------------------+
| Tip: Press ? to see all keyboard shortcuts|
+-------------------------------------------+
```

The flyout stays open until the user clicks outside it or presses Escape, so users can trigger multiple extended effects in sequence.

### 2.3 Effect Categories in the Dynamics Tab

The full EffectPanel (in the Dynamics tab) should group effects by type:

```
COMBAT EFFECTS
  Clash, Blast, Stab, Lockup, Lightning, Drag

FORCE EFFECTS
  Force, Shockwave, Freeze, Overcharge

VISUAL EFFECTS
  Scatter, Ripple, Fragment, Bifurcate, Invert

EXPERIMENTAL
  Melt, Ghost Echo, Splinter, Coronary, Siphon, Glitch Matrix
```

Each effect in the panel shows:
- Trigger button
- Keyboard shortcut badge (if assigned)
- One-line description
- Link to per-effect parameter tuning (clash location, blast count, etc.)

### 2.4 Discovery: "Effect of the Session"

Each time the editor loads, highlight one random Tier 3 effect the user has never triggered (tracked via localStorage). Show it as a subtle banner at the top of the Dynamics tab:

```
+--------------------------------------------------+
| NEW TO TRY: Coronary -- Bright radial burst from  |
| center.  [Try It]  [Dismiss]                      |
+--------------------------------------------------+
```

This drives discovery without overwhelming the action bar.

---

## 3. Ignition/Retraction Selection

### 3.1 Eliminate Triplication

Currently the ignition/retraction list is defined in 3 separate files:

- `EffectPanel.tsx` (lines 23-59)
- `TabColumnContent.tsx` (lines 85-121)
- `CanvasToolbar.tsx` (lines 7-43)

**Recommendation**: Extract a single shared data file:

```
lib/animationCatalog.ts

  export const IGNITION_CATALOG: AnimationDef[] = [...]
  export const RETRACTION_CATALOG: AnimationDef[] = [...]
  export const STYLE_CATALOG: StyleDef[] = [...]  // also consolidate styles

  // Includes: id, label, description, category, tags, pairSuggestion
```

All three UI surfaces import from this single source of truth. Adding a new ignition means editing one file.

### 3.2 Category Grouping

Group the 19 ignitions into 4 categories:

```
STANDARD (4)
  Standard, Scroll, Wipe, Center Out

DRAMATIC (5)
  Spark, Stutter, Glitch, Flash Fill, Fracture

ORGANIC (4)
  Crackle, Drip Up, Pulse Wave, Seismic

REACTIVE (4)
  Twist, Swing, Stab, Summon

SPECIAL (2)
  Hyperspace, Custom Curve
```

Group the 13 retractions into 3 categories:

```
STANDARD (4)
  Standard, Scroll, Fade Out, Center In

DRAMATIC (4)
  Shatter, Dissolve, Flicker Out, Implode

ORGANIC (3)
  Unravel, Drain, Evaporate

SPECIAL (2)
  Spaghettify, Custom Curve
```

### 3.3 Animated Preview Thumbnails

Each ignition/retraction card shows a looping 2-second micro-animation:

```
+-------------------------------------+
| [===========>        ]  <- progress |  80x16px canvas, loops every 2s
| Spark                               |
| Crackling spark ignition            |
+-------------------------------------+
```

The micro-animation uses a simplified 1D representation: a horizontal bar that fills/empties according to the ignition/retraction algorithm. This reuses the engine's `getMask()` function at ~15 FPS.

Only the currently hovered or focused card animates. All others show a static "50% progress" frame to keep CPU usage low.

### 3.4 Pair Suggestions

When the user selects an ignition, show a "Suggested retraction" chip below the ignition grid:

```
Pair suggestion for "Spark":
  [Dissolve -- Random shuffle complements spark scatter]  [Apply]
```

Pairing logic is a simple lookup table in `animationCatalog.ts`:

| Ignition | Suggested Retraction | Rationale |
|----------|---------------------|-----------|
| Standard | Standard | Classic match |
| Scroll | Scroll | Symmetric scrolling |
| Spark | Dissolve | Scatter-in / scatter-out |
| Center Out | Center In | Mirror symmetry |
| Wipe | Fade Out | Soft in / soft out |
| Stutter | Flicker Out | Unstable theme |
| Glitch | Dissolve | Digital theme |
| Crackle | Shatter | Fragmented theme |
| Fracture | Shatter | Breaking theme |
| Flash Fill | Fade Out | Bright in / soft out |
| Pulse Wave | Drain | Wave in / flow out |
| Drip Up | Drain | Fluid theme |
| Hyperspace | Implode | Expansion / collapse |
| Summon | Evaporate | Force theme |
| Seismic | Unravel | Physical theme |
| Twist | Unravel | Rotational symmetry |
| Swing | Standard | Clean finish |
| Stab | Implode | Burst / collapse |
| Custom Curve | Custom Curve | User-defined both |

The suggestion is non-intrusive -- a single line of text with an [Apply] button. Users can ignore it entirely.

### 3.5 Combined Ignition/Retraction Selector

Replace the current two separate grids with a single split-view selector:

```
+--------------------------------------------------+
|  IGNITION              |  RETRACTION              |
|  [search...]           |  [search...]             |
|                        |                          |
|  v STANDARD            |  v STANDARD              |
|   [Standard] [Scroll]  |   [Standard] [Scroll]    |
|   [Wipe] [Center Out]  |   [Fade Out] [Center In] |
|  > DRAMATIC            |  > DRAMATIC              |
|  > ORGANIC             |  > ORGANIC               |
|  > REACTIVE            |  > SPECIAL               |
|  > SPECIAL             |                          |
|------------------------|--------------------------|
|  Speed: [====|====] 300ms  | Speed: [====|====] 500ms|
|------------------------|--------------------------|
|  Pair: "Spark" + "Dissolve" -- scatter symmetry   |
+--------------------------------------------------+
```

This side-by-side layout makes the pairing relationship visible and reduces tab switching.

---

## 4. Information Architecture

### 4.1 Recommended Panel Moves

| Panel | Current Tab | Proposed Tab | Rationale |
|-------|------------|-------------|-----------|
| Ignition/Retraction | Design (col 1) | Design (stays) | Core design choice, not dynamics |
| Effect Config (per-effect params) | Dynamics (col 1) | Dynamics (stays, but merge with Effect Triggers) | Currently split; should be inline |
| OLED Preview | Design (col 3) | Output (col 3) | OLED is about the physical device, not the blade design |
| Comparison View | Dynamics (col 3) | Design (col 3) | Comparing styles is a design activity |

### 4.2 First-Time User Default View

The current `DEFAULT_COLLAPSED_PANELS` set is a good start. Refine it with this principle: **a first-time user should see exactly 3 things on the Design tab: the blade preview, the style selector, and a color picker.**

Recommended first-time experience:

```
Design tab (3 panels visible):
  Col 0: Style Select (expanded, showing only "CLASSIC" category)
  Col 1: Color Picker (expanded)
  Col 2: Ignition/Retraction (collapsed with a "Set up your ignition" teaser)
  Col 3: (empty -- all advanced panels collapsed)
```

Everything else remains collapsed. The key insight: **the Design tab is the landing page of the app**, and it should feel approachable, not overwhelming.

### 4.3 Progressive Disclosure Path

Design the UI in 4 tiers of complexity:

```
Tier 1 -- IMMEDIATE (visible on first load)
  - Style selector (Classic category only)
  - Base color picker
  - Ignite/Retract button
  - Blade preview canvas

Tier 2 -- ONE CLICK AWAY (collapsed but labeled)
  - Full style categories (expand accordion)
  - Ignition/retraction selector
  - Clash/Blast/Lockup effect buttons (action bar, always visible)
  - Shimmer slider

Tier 3 -- INTENTIONAL EXPLORATION (requires navigating to a different tab or panel)
  - Style parameters (fire size, wave count, etc.)
  - Effect customization (clash location, blast spread)
  - Motion simulation
  - Gradient builder, Layer stack
  - All Tier 2/3 effects (via flyout)

Tier 4 -- POWER USER (settings modal, advanced panels)
  - Custom curve ignition/retraction
  - Dual-mode ignition
  - Easing curves
  - Gesture config
  - OLED editor
  - Power draw / storage budget
```

### 4.4 Learning Curve Path: Beginner to Expert

```
Session 1:  Pick a style -> Pick a color -> Ignite -> "That looks cool"
Session 2:  Try different ignitions -> Trigger Clash/Blast -> Discover effects
Session 3:  Explore Nature/Energy style categories -> Tune parameters
Session 4:  Layer stack -> Gradient builder -> Motion simulation
Session 5:  Presets -> Save/load -> Saber profiles -> Export
Session 10: Custom curves -> Dual-mode -> Gesture config -> SD card writer
```

The UI should not require reading documentation for Sessions 1-3. Tooltips (`HelpTooltip`) are sufficient. Sessions 4+ can benefit from the built-in docs link.

---

## 5. Navigation and Discovery

### 5.1 Style Browser (Full-Page Modal)

Add a "Browse All Styles" button at the bottom of the StylePanel that opens a full-width modal:

```
+================================================================+
| STYLE BROWSER                                        [X Close] |
|================================================================|
| [Search styles...]   [Category: All v]  [Sort: Name v]        |
|----------------------------------------------------------------|
|                                                                |
| +------------------+  +------------------+  +----------------+ |
| | [====PREVIEW====]|  | [====PREVIEW====]|  | [===PREVIEW===]| |
| | Stable           |  | Aurora           |  | Fire           | |
| | Classic solid    |  | Northern lights  |  | Flame-like     | |
| | blade            |  | shimmer          |  | animated blade | |
| |                  |  |                  |  |                | |
| | Tags: classic,   |  | Tags: nature,    |  | Tags: nature,  | |
| | simple, solid    |  | shimmer, waves   |  | warm, animated | |
| |                  |  |                  |  |                | |
| | [Apply]  [Star]  |  | [Apply]  [Star]  |  | [Apply] [Star] | |
| +------------------+  +------------------+  +----------------+ |
|                                                                |
| +------------------+  +------------------+  +----------------+ |
| | [====PREVIEW====]|  | ...              |  | ...            | |
| | Plasma Storm     |  |                  |  |                | |
| | ...              |  |                  |  |                | |
| +------------------+  +------------------+  +----------------+ |
|                                                                |
+================================================================+
```

Each card in the browser has:
- A ~120x40px animated preview canvas showing the style with the user's current base color
- Style name and description
- Category tags
- [Apply] button that sets the style and closes the modal
- [Star] toggle to mark favorites (persisted to localStorage, shown first in the sidebar panel)

The modal supports keyboard navigation: arrow keys move between cards, Enter applies the focused style.

### 5.2 Effect Pairings / Themed Bundles

Offer curated "vibe bundles" that set multiple settings at once. These appear in the Gallery tab and the Randomizer:

| Bundle Name | Style | Ignition | Retraction | Notes |
|-------------|-------|----------|------------|-------|
| **Classic Jedi** | Stable | Standard | Standard | Clean, film-accurate |
| **Kylo Rage** | Unstable | Stutter | Shatter | Crackling, aggressive |
| **Ember Glow** | Cinder | Drip Up | Drain | Warm, organic |
| **Digital Ghost** | Data Stream | Glitch | Dissolve | Sci-fi, matrix-like |
| **Northern Light** | Aurora | Pulse Wave | Fade Out | Ethereal, flowing |
| **Dark Ritual** | Plasma | Fracture | Implode | Dramatic, dark side |
| **Force Mystic** | Nebula | Summon | Evaporate | Cosmic, Force-aligned |
| **Inferno** | Fire | Flash Fill | Flicker Out | Aggressive fire theme |
| **Duelist** | Rotoscope | Spark | Scroll | Film-accurate OT |
| **Chaos Engine** | Automata | Crackle | Unravel | Experimental, generative |

Each bundle is a single "Apply Bundle" action that sets style + ignition + retraction + suggested colors. Users can modify any setting after applying.

### 5.3 "Try This Style in Context" Integration

When browsing the Gallery (preset browser), add a "Preview with my colors" toggle:

- **Off (default)**: Preset cards show the preset's original colors (Luke = blue, Vader = red).
- **On**: Preset cards re-render using the user's current base color, showing "what would Unstable look like in my green?"

This helps users understand that presets are starting points, not locked configurations.

### 5.4 Discovery Summary: How Users Find Things

```
                    +---------------------------+
                    |    Full Style Browser      |
                    |    (modal, all 29 styles)  |
                    +---------------------------+
                              ^
                              | "Browse All"
                              |
+------------------+    +------------------+    +------------------+
| Recommended      |    | Category         |    | Search           |
| (auto-curated)   |    | Accordion        |    | (instant filter) |
| 3-4 styles       |    | (5 groups)       |    | (by name/desc)   |
+------------------+    +------------------+    +------------------+
                              |
                              v
                    +---------------------------+
                    |    Randomizer              |
                    |    (themed or full random) |
                    +---------------------------+
                              |
                              v
                    +---------------------------+
                    |    Vibe Bundles            |
                    |    (style+ign+ret+color)   |
                    +---------------------------+
```

There are 5 distinct paths to finding a style:
1. **Direct**: User knows the name, types it in search
2. **Browse**: User opens a category, scans thumbnails
3. **Recommended**: System suggests styles based on usage history
4. **Random**: Randomizer generates a complete configuration
5. **Curated**: Vibe bundles or preset gallery provide opinionated combinations

---

## 6. Technical Debt to Address

### 6.1 Single Source of Truth for Animation Lists

The highest-priority technical change is extracting all animation metadata into a shared catalog. Currently:

- `BLADE_STYLES` in `StylePanel.tsx` (29 entries)
- `STYLE_OPTIONS` in `CanvasToolbar.tsx` (27 entries -- missing `painted` and `imageScroll`)
- `STYLE_OPTIONS` in `ComparisonView.tsx` (27 entries)
- `ALL_STYLES` in `Randomizer.tsx` (27 entries)
- `STYLE_LABELS` in `PresetGallery.tsx` (12 entries -- incomplete)
- `IGNITION_STYLES` in 3 files
- `RETRACTION_STYLES` in 3 files

Proposed structure:

```typescript
// lib/animationCatalog.ts

export interface AnimationDef {
  id: string;
  label: string;
  description: string;
  category: string;
  tags: string[];
  isNew?: boolean;       // show "NEW" badge for recently added animations
  pairSuggestion?: string; // for ignitions: suggested retraction id
}

export const STYLE_CATALOG: AnimationDef[] = [...];
export const IGNITION_CATALOG: AnimationDef[] = [...];
export const RETRACTION_CATALOG: AnimationDef[] = [...];
export const EFFECT_CATALOG: AnimationDef[] = [...];

// Derived helpers
export const STYLE_BY_CATEGORY: Record<string, AnimationDef[]> = ...;
export const IGNITION_BY_CATEGORY: Record<string, AnimationDef[]> = ...;
```

### 6.2 Keyboard Shortcut Registry

Currently keyboard shortcuts are hardcoded in the EffectPanel's "Keyboard Shortcuts" section and in `useKeyboardShortcuts.ts`. With 21 effects, this needs a centralized registry:

```typescript
// lib/shortcutRegistry.ts

export const EFFECT_SHORTCUTS: Record<string, string> = {
  clash: 'C',
  blast: 'B',
  stab: 'S',
  lockup: 'L',
  lightning: 'N',
  drag: 'D',
  melt: 'M',
  force: 'F',
  shockwave: 'W',
  freeze: 'Z',
  // Tier 3 effects: no default shortcut, user-configurable
};
```

This also enables future user-customizable shortcuts (Settings modal).

---

## 7. Implementation Priority

### Phase 1 -- Data consolidation (low risk, high impact)
1. Create `lib/animationCatalog.ts` with all 82 animations and categories
2. Refactor all components to import from the catalog
3. Fix the CanvasToolbar/ComparisonView/Randomizer desync (missing styles)

### Phase 2 -- Style panel categories + search (medium effort)
1. Category accordion in StylePanel
2. Search input with real-time filtering
3. "Recommended" section with usage-history logic

### Phase 3 -- Action bar tiering (medium effort)
1. Reduce action bar to 6 primary effects
2. Add "More Effects" flyout
3. Assign keyboard shortcuts to Tier 2 effects

### Phase 4 -- Ignition/retraction redesign (medium effort)
1. Combined split-view selector
2. Pair suggestions
3. Category grouping

### Phase 5 -- Visual previews (higher effort)
1. Style thumbnail canvas renderer
2. Ignition/retraction micro-animation previews
3. Full-page Style Browser modal

### Phase 6 -- Discovery features (medium effort)
1. Vibe bundles
2. "Effect of the Session" banner
3. "Try with my colors" gallery toggle
4. User favorites (star system)

---

## 8. Summary of Key Principles

1. **Categorize, do not flatten.** Any list over 10 items needs grouping. Any list over 20 needs search.
2. **Show, do not tell.** Visual previews beat text labels for spatial/visual content like blade animations.
3. **Tier by frequency.** The 6 most-used effects get permanent buttons. The rest are one click away. Nothing is hidden, but priority is explicit.
4. **Single source of truth.** Every animation is defined once, in `animationCatalog.ts`. UI components consume, never define.
5. **Progressive disclosure.** First-time users see 5 styles and 1 button. Power users can access all 82 animations. The transition between these states is smooth and user-driven.
6. **Pair and bundle.** Ignitions suggest retractions. Vibe bundles suggest complete configurations. The system has opinions, but users override freely.
