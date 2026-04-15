# BladeForge QA Test Plan

Interactive test plan. Work through each test sequentially. Report results using the letter codes. Tests marked [BLOCKER] must pass before proceeding to the next phase.

---

## Phase 1: App Launch & Basic Rendering

### T1.1 — App loads without crash [BLOCKER]
Open `http://localhost:3000/editor` in Brave/Chrome.
- A) Editor loads, blade canvas visible, no error overlay
- B) Editor loads but error overlay appears (describe error)
- C) Blank page or infinite loading
- D) Console errors only (app works but errors in console — list them)

### T1.2 — Blade canvas renders
Look at the canvas area above the tab panels.
- A) Hilt + blade visible, pixel strip visible, RGB graph visible
- B) Hilt + blade visible, but pixel strip or RGB graph cut off
- C) Canvas area is blank / black
- D) Canvas area shows content but is distorted or misaligned

### T1.3 — Ignite / Retract
Press the Ignite button in the top toolbar.
- A) Blade ignites with animation, button changes to "Retract", retract also works
- B) Blade appears instantly (no animation)
- C) Button text changes but blade doesn't appear
- D) Nothing happens

---

## Phase 2: Style & Color Controls

### T2.1 — Style switching
In the Design tab, try selecting 3 different blade styles (e.g. Stable, Fire, Unstable). Ignite after each.
- A) All 3 styles visually distinct on canvas
- B) Some styles work, some don't (which ones fail?)
- C) Styles change in the dropdown but blade looks the same
- D) Crash or error when switching

### T2.2 — Color picker
In the Colors section, change the Base color.
- A) Blade color updates immediately on canvas
- B) Color picker works but blade doesn't update
- C) Color picker is broken or missing
- D) Crash or error

### T2.3 — Ignition / Retraction types
In the toolbar, change Ignition to each option (Standard, Scroll, Spark, Center Out, Wipe, Stutter, Glitch). Ignite after each.
- A) All 7 ignition types produce visually different animations
- B) Some work, some look identical (which?)
- C) Some cause errors (which?)
- D) Dropdown doesn't respond

### T2.4 — Retraction types
Change Retraction to each option (Standard, Scroll, Fade Out, Center In, Shatter). Retract after each.
- A) All 5 retraction types produce visually different animations
- B) Some work, some look identical (which?)
- C) Some cause errors (which?)
- D) Dropdown doesn't respond

---

## Phase 3: Effects

### T3.1 — Ignite blade, then press each effect button
With blade on, press: Clash, Blast, Stab, Lockup, Lightning, Drag, Melt, Force (one at a time, wait for each to finish).
- A) All 8 effects produce a visible flash/change on the blade
- B) Some effects work, some don't (which?)
- C) Effects crash the app (which?)
- D) Effect buttons are disabled or unresponsive

### T3.2 — Effect overlap
Rapidly press Clash 3 times in quick succession.
- A) Effects play cleanly, each one visible
- B) Effects overlap/stack in a messy way
- C) Only the first one plays, others ignored
- D) Crash

---

## Phase 4: Randomizer

### T4.1 — Randomize a style
Find and use the Randomizer (in Design tab, below style options).
- A) Randomizer changes style, colors, ignition, retraction — all valid, blade updates
- B) Randomizer works but sometimes produces errors (describe)
- C) Randomizer button doesn't respond
- D) Crash

---

## Phase 5: Gallery / Presets

### T5.1 — Browse preset gallery
Click the Gallery tab. Browse through character presets.
- A) Presets load with names, descriptions, and color previews
- B) Gallery loads but looks broken or incomplete
- C) Gallery tab is empty
- D) Crash

### T5.2 — Load a preset
Click on any preset to load it.
- A) Preset loads, blade updates to match the preset's style and colors
- B) Preset loads data but blade doesn't update
- C) Nothing happens on click
- D) Crash (describe error)

---

## Phase 6: Code Output [BLOCKER]

### T6.1 — View generated code
Click the Output tab. Look for generated ProffieOS C++ code.
- A) Code is visible, looks like valid C++ with template brackets
- B) Code area is empty
- C) Code is visible but looks malformed
- D) Output tab crashes

### T6.2 — Copy code
Click the Copy button to copy generated code to clipboard. Paste it here.
- A) Code copied successfully (paste it for review)
- B) Copy button doesn't work
- C) No copy button visible

### T6.3 — Full config.h
If there's a "Full Config" or multi-preset mode, switch to it.
- A) Full config.h visible with CONFIG_TOP, CONFIG_PRESETS, CONFIG_BUTTONS sections
- B) Only single style code visible, no full config option
- C) Crash or error

---

## Phase 7: Export [BLOCKER]

### T7.1 — Download ZIP
In the Output/CardWriter section, click Download ZIP.
- A) ZIP file downloads successfully
- B) Download button doesn't respond
- C) Error message appears
- D) No CardWriter section visible

### T7.2 — Inspect ZIP contents
Unzip the downloaded file and describe the folder structure.
- A) Contains config.h at root + font folders
- B) Contains files but structure looks wrong (describe)
- C) ZIP is empty or corrupt

---

## Phase 8: SD Card Write

### T8.1 — Card detection
Insert SD card. Click "Write to Card" and select the SD card directory.
- A) Detects "ProffieOS" board, lists existing presets
- B) Detects wrong board type
- C) No detection, generic directory picker only
- D) Error on directory selection

### T8.2 — Write preset
With backup enabled, write the test preset to card.
- A) Write completes, verification passes
- B) Write completes but verification fails
- C) Write fails with error (describe)
- D) Button doesn't respond

---

## Phase 9: Physical Saber Test

### T9.1 — Boot
Insert SD card into saber, power on.
- A) Saber boots (boot sound plays)
- B) No boot sound, but saber powers on
- C) Saber doesn't respond
- D) Error sounds or unusual behavior

### T9.2 — Ignition
Activate the saber.
- A) Blade ignites with correct color and animation
- B) Blade ignites but wrong color (what color?)
- C) Blade ignites but no animation (instant on)
- D) Saber doesn't ignite

### T9.3 — Effects
Test clash (tap blade), lockup (hold + clash), blast (button combo).
- A) All effects work with correct colors
- B) Some effects work, some don't (which?)
- C) Effects trigger but colors are wrong
- D) No effects respond

### T9.4 — Retraction
Deactivate the saber.
- A) Blade retracts with animation
- B) Blade turns off instantly
- C) Saber doesn't retract

### T9.5 — Existing presets
Cycle through your other presets on the saber.
- A) All original presets still work
- B) Some presets broken (which?)
- C) Can't cycle presets
- D) Only the new preset exists (old ones deleted)

---

## Phase 10: Responsive Layout

### T10.1 — Desktop wide (1440px+)
Resize browser to full width on your MacBook.
- A) Layout looks good, no overlaps, all controls accessible
- B) Minor issues (describe)
- C) Major layout problems

### T10.2 — Desktop narrow (1024-1439px)
Resize browser to roughly 1100px wide.
- A) Layout adapts cleanly
- B) Controls overlap or get cut off (describe where)
- C) Layout breaks significantly

### T10.3 — Tablet (600-1023px)
Resize to roughly 800px wide.
- A) Tablet layout activates, everything accessible
- B) Some elements overlap or disappear
- C) Layout is unusable

### T10.4 — Mobile (<600px)
Resize to roughly 400px wide.
- A) Mobile layout activates, touch-friendly
- B) Layout has issues but is usable
- C) Layout breaks completely
