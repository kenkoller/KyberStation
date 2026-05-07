# Xenopixel Configuration Mode — Implementation Plan

> KyberStation becomes the best Xenopixel configuration tool available:
> visual design, accurate previews of the real blade effects, full SD card
> ZIP export ready to drop onto the card.

## Background

Xenopixel V3 (XENO3.0) boards by LGT are closed-source, fixed-firmware
lightsaber controllers. Unlike Proffieboard (where KyberStation generates
custom C++ style code), Xenopixel customization lives entirely on the SD
card via two config files:

- **`fontconfig.ini`** — per-font: blade color (RGB), blade effect,
  ignition style, blaster/force/lockup effects, ignition/retraction speed
- **`config.ini`** (in `set/` folder) — global: motion controls,
  sensitivity, volume, blade mode toggles, blade length, clash settings

The firmware ships ~8 blade effects + ~12 ignition styles baked in. Users
select from these via numeric IDs in the config files. No user-authored
blade code is possible.

### What KyberStation can do for Xenopixel users

1. **Visual blade effect picker** — see what each of the 8 effects
   actually looks like before committing
2. **Full RGB color designer** — same color tools as Proffie mode
3. **Ignition/retraction timing** — slider-driven, mapped to ms values
4. **Motion control tuner** — toggle + sensitivity for each gesture
5. **Multi-font SD card builder** — generate complete folder structure
6. **Crossguard/double-blade config** — side blade length + delay
7. **One-click ZIP download** — ready to unpack onto the SD card

---

## Phase 1 — Board Profile + Emitter Rewrite (1 session)

### 1A. Update Xenopixel board profiles

**File:** `packages/boards/src/profiles/xenopixel.ts`

Update capability flags to match the actual Xenopixel V3 manual:

```typescript
// New: accurate effect/style enums for Xenopixel
export const XENO_BLADE_EFFECTS = [
  { id: 0, name: 'Fire Blade',     kyberStyle: 'fire' },
  { id: 1, name: 'Steady Blade',   kyberStyle: 'stable' },
  { id: 2, name: 'Unstable Blade', kyberStyle: 'unstable' },
  { id: 3, name: 'Rainbow Blade',  kyberStyle: 'rainbow' },
  { id: 4, name: 'Candy Blade',    kyberStyle: null },      // no KS equivalent
  { id: 5, name: 'Crack Blade',    kyberStyle: 'crystalShatter' },
  { id: 6, name: 'Pulse Blade',    kyberStyle: 'pulse' },
  { id: 7, name: 'Flashing Blade', kyberStyle: null },      // no KS equivalent
] as const;

export const XENO_IGNITION_STYLES = [
  { id: 0,  name: 'Standard Blade' },
  { id: 1,  name: 'Velocity Blade' },
  { id: 2,  name: 'Torch Blade' },
  { id: 3,  name: 'Blaster Blade' },
  { id: 4,  name: 'Ghost Blade' },
  { id: 5,  name: 'Stack Ignition',     category: 'special-preon' },
  { id: 6,  name: 'FoldTile Ignition',  category: 'special-preon' },
  { id: 7,  name: 'Word Ignition',      category: 'special-preon' },
  { id: 8,  name: 'Faser Ignition',     category: 'special-preon' },
  { id: 9,  name: 'Scavenger Ignition', category: 'special-preon' },
  { id: 10, name: 'Hunter Ignition',    category: 'special-preon' },
  { id: 11, name: 'Broken Ignition',    category: 'special-preon' },
] as const;

export const XENO_BLASTER_EFFECTS = [
  { id: 0, name: 'Light Effect 1' },
  { id: 1, name: 'Light Effect 2' },
  { id: 2, name: 'Light Effect 3' },
] as const;

export const XENO_FORCE_EFFECTS = [
  { id: 0, name: 'Light Effect 1' },
  { id: 1, name: 'Light Effect 2' },
] as const;
```

Update `configFormat` from `'json'` to `'ini-txt'` (it generates INI
files, not JSON).

Add new capability fields:

```typescript
// New fields on BoardCapabilities (or a Xenopixel-specific extension)
xenopixelConfig?: {
  bladeEffects: typeof XENO_BLADE_EFFECTS;
  ignitionStyles: typeof XENO_IGNITION_STYLES;
  blasterEffects: typeof XENO_BLASTER_EFFECTS;
  forceEffects: typeof XENO_FORCE_EFFECTS;
  supportsCrossguard: boolean;
  supportsDoubleBlade: boolean;
  maxFonts: number;              // ~40
  firmwareVersions: string[];    // ['1.0', '1.2', '1.2.5', '1.3.1', '1.4.0']
};
```

### 1B. Rewrite XenopixelEmitter to generate real config files

**File:** `packages/codegen/src/emitters/XenopixelEmitter.ts`

Replace the current JSON output with actual `fontconfig.ini` + `config.ini`
generation.

**fontconfig.ini output:**

```ini
font1=(255,0,0),0,2,0,0,0,0,300,500
```

Format: `font{N}=(R,G,B),A,B,C,D,E,F,G,H`
- A = blade effect ID (0-7)
- B = blaster light effect (0-2)
- C = force lighting effect (0-1)
- D = lockup lighting effect (0)
- E = default light effect (0-2)
- F = blade style/ignition (0-11)
- G = ignition speed ms (default 200)
- H = retraction speed ms (default 500)

**config.ini output:**

```ini
#Main blade length
pixel_number=133

#Motion control
motion_control=1
pull_push_on=1
push_pull_off=1
push_sensitivity=18
pull_sensitivity=13
swing_on=1
swing_sensitivity=1100
twist_on=0
twist_off=0
twist_sensitivity=220

#Volume
volume=80

#Blade modes
velocity_mode=0
torch_mode=0
multiblock_mode=0
multilock_mode=0
lightning_block_mode=0
blaster_mode=0
ghost_mode=0

#Sound
countdown=1

#Clash
flash_on_clash=1
clash_sensitivity=2.0

#Power timing
PowerOnTime=2000
PowerOffTime=10000
```

**New emitter methods:**

```typescript
class XenopixelEmitter implements BoardEmitter {
  emitFontConfig(preset: XenoPreset, fontNumber: number): string;
  emitGlobalConfig(settings: XenoGlobalSettings): string;
  emitSDCardStructure(presets: XenoPreset[], settings: XenoGlobalSettings): SDCardFile[];
}
```

### 1C. Update ZIP exporter

**File:** `apps/web/lib/zipExporter.ts`

Change from design-reference JSON to real SD card structure:

```
SD Card ZIP/
  set/
    config.ini              # Global settings
  1/
    fontconfig.ini          # Per-font config
    (sound files if paired)
  2/
    fontconfig.ini
  ...
  KYBERSTATION_README.txt   # Still included — explains the files
```

Update `exportType` from `'design-reference'` to `'sd-card-config'`.

---

## Phase 2 — Board-Aware UI Gating (1-2 sessions)

### 2A. Xenopixel blade effect picker

**New component:** `apps/web/components/editor/xenopixel/XenoEffectPicker.tsx`

Visual card grid showing the 8 blade effects. Each card has:
- Effect name
- Animated preview thumbnail (simplified engine render matching what
  the firmware actually produces)
- Currently-selected indicator

Replaces the full ProffieOS style picker when the active board is
Xenopixel.

### 2B. Xenopixel ignition style picker

**New component:** `apps/web/components/editor/xenopixel/XenoIgnitionPicker.tsx`

12-card grid for ignition styles. Standard/Velocity/Torch/Blaster/Ghost
are blade-mode styles; Stack through Broken are special preon ignitions.

Replaces the ProffieOS ignition/retraction pickers.

### 2C. Board-gated panel switching

**File:** `apps/web/components/layout/MainContent.tsx` (and section
components)

When `activeBoardId` starts with `'xenopixel'`:

| ProffieOS surface | Xenopixel replacement |
|---|---|
| StylePanel (29 styles) | XenoEffectPicker (8 effects) |
| IgnitionRetractionPanel (19+13) | XenoIgnitionPicker (12 styles) |
| LayerStack compositor | Hidden (not applicable) |
| EffectPanel (21 effects) | Simplified: Clash + Lockup + Blast + Force only |
| Modulation routing | Hidden (not applicable) |
| Code output (C++) | Config preview (fontconfig.ini + config.ini) |
| Flash panel (WebUSB DFU) | SD card export panel |

Panels that stay the same:
- Color picker (full RGB — V3 supports it)
- Sound font pairing
- My Saber / profiles
- Gallery (with Xenopixel-compatible presets filtered)

### 2D. Xenopixel motion control panel

**New component:** `apps/web/components/editor/xenopixel/XenoMotionPanel.tsx`

Toggle + sensitivity slider for each gesture:
- Stab ON/OFF + sensitivity
- Twist ON/OFF + sensitivity
- Swing ON/OFF + sensitivity
- Pull OFF (retraction gesture)

Maps directly to `config.ini` fields.

### 2E. Xenopixel global settings panel

**New component:** `apps/web/components/editor/xenopixel/XenoSettingsPanel.tsx`

- Volume slider (0-100, warn above 90)
- Clash sensitivity slider
- FoC toggle
- Blade mode toggles (Velocity, Torch, Blaster, Ghost)
- Action mode toggles (MultiBlock, MultiLock, Lightning Block)
- Countdown sound toggle
- Blade length selector (pixel count — reuse existing blade length UI)
- Crossguard: side blade length + delay timing

---

## Phase 3 — Accurate Blade Effect Previews (1-2 sessions)

### 3A. Xenopixel effect engine implementations

**New directory:** `packages/engine/src/styles/xenopixel/`

Simplified style implementations that approximate what the Xenopixel
firmware actually renders. These are NOT the full ProffieOS-grade styles
— they match the simpler algorithms in the Xenopixel firmware.

```
xenopixel/
  XenoFireStyle.ts        # Simpler than ProffieOS StyleFire
  XenoSteadyStyle.ts      # Solid color (≈ StableStyle)
  XenoUnstableStyle.ts    # Random flicker (simpler than ProffieOS)
  XenoRainbowStyle.ts     # Cycling rainbow
  XenoCandyStyle.ts       # Multi-color segments
  XenoCrackStyle.ts       # Crack/break effect
  XenoPulseStyle.ts       # Breathing pulse
  XenoFlashingStyle.ts    # Strobe/flash
```

**Important:** These should be authored from video reference of actual
Xenopixel sabers, not from ProffieOS equivalents. The visual output
should match what a real Xenopixel V3 produces. YouTube has plenty of
Xenopixel V3 demo videos showing each effect.

### 3B. Xenopixel ignition animations

```
xenopixel/ignitions/
  XenoStandardIgnition.ts
  XenoVelocityIgnition.ts
  XenoTorchIgnition.ts
  XenoStackIgnition.ts
  XenoFoldTileIgnition.ts
  XenoWordIgnition.ts
  XenoFaserIgnition.ts
  XenoScavengerIgnition.ts
  XenoHunterIgnition.ts
  XenoBrokenIgnition.ts
```

### 3C. Board-aware engine mode

**File:** `packages/engine/src/BladeEngine.ts`

Add a `renderMode: 'proffie' | 'xenopixel'` flag. When set to
`'xenopixel'`, the engine uses the Xeno style/ignition implementations
instead of the ProffieOS ones. The visualizer shows what the user's
saber will actually look like.

---

## Phase 4 — Preset Library + Import (1 session)

### 4A. Xenopixel-compatible preset filter

**File:** `packages/presets/src/`

Add a `xenopixelCompat` field to preset metadata:

```typescript
interface PresetMetadata {
  // ... existing fields
  xenopixelCompat?: {
    bladeEffect: number;     // closest Xeno effect ID
    ignitionStyle: number;   // closest Xeno ignition ID
    degradationNote?: string; // "Approximated as Fire Blade"
  };
}
```

Gallery can filter to "Xenopixel-compatible" presets that map cleanly.

### 4B. Proffie-to-Xenopixel design porter

When a user has designed a blade in Proffie mode and switches their board
to Xenopixel, show a conversion dialog:

> "Your current design uses **Aurora** style with **Spark Ignition**.
> The closest Xenopixel equivalents are **Rainbow Blade** and
> **Standard Ignition**. Switch to these?"

Map each ProffieOS style/effect to the closest Xenopixel equivalent
with an honest degradation note.

### 4C. Import existing Xenopixel SD card

Read a user's existing SD card (via File System Access API):
- Parse `config.ini` from `set/`
- Parse `fontconfig.ini` from each numbered folder
- Reconstruct KyberStation presets from the config values
- User can then tweak colors/effects visually and re-export

---

## Phase 5 — Polish + Hardware Validation (1 session)

### 5A. Firmware version awareness

Different Xenopixel firmware versions have slightly different
`fontconfig.ini` formats and available effects. Add a firmware version
selector:

- V1.0 — base effects
- V1.2.0 — adds motor crystal chamber, BT toggle
- V1.2.5 — per-font fontconfig (moved from global)
- V1.3.1 — adds knock/poke, lightning block, melt
- V1.4.0 — configurable in/out time, custom function

The emitter adjusts its output format based on the selected version.

### 5B. Hardware validation on real Xenopixel V3

- Generate a test SD card config from KyberStation
- Flash onto a real Xenopixel V3 saber
- Verify: colors match, effects match, ignition speed matches
- Document any format discrepancies
- Fix and re-test

### 5C. Xeno Configurator BLE integration (stretch goal)

If the BLE protocol can be reverse-engineered from the APK:
- Push color changes directly via Bluetooth
- Real-time preview on the physical saber
- No SD card removal needed

This is a stretch goal — depends on APK decompilation yielding
usable service UUIDs and characteristic formats.

---

## Implementation Order + Effort Estimates

| Phase | Sessions | Depends on | Ships |
|---|---|---|---|
| **1A** Board profiles | 0.5 | — | Updated capability flags |
| **1B** Emitter rewrite | 0.5 | 1A | Real fontconfig.ini + config.ini |
| **1C** ZIP exporter | 0.5 | 1B | Downloadable SD card ZIP |
| **2A-2B** Effect/ignition pickers | 1 | 1A | Visual selection UI |
| **2C** Panel gating | 1 | 2A-2B | Board-aware editor |
| **2D-2E** Motion + settings panels | 0.5 | 1A | Full config surface |
| **3A-3C** Accurate previews | 2 | Video reference | What-you-see-is-what-you-get |
| **4A-4C** Presets + import | 1 | 1B, 2C | Library + SD card import |
| **5A-5B** Version awareness + validation | 1 | All above | Hardware-verified |
| **5C** BLE integration | 2+ | APK RE | Wireless config push |

**Total: ~8-9 sessions for Phases 1-5A, plus hardware validation time.**

Phase 5C (BLE) is independent and can be pursued in parallel if someone
decompiles the Xeno Configurator APK.

---

## Risks + Mitigations

| Risk | Mitigation |
|---|---|
| fontconfig.ini format varies by firmware version | Version selector + format detection on import |
| Video reference for effects may not be pixel-accurate | Ship with "approximate" label; refine post-hardware-validation |
| Crossguard/double-blade config underdocumented | Start with single-blade; add multi-blade after testing |
| Users may expect Proffie-level customization | Clear "Xenopixel Mode" branding + honest capability callouts |
| SD card folder numbering varies by saber vendor | Let user set starting font number; default to 1 |

---

## What this does NOT include

- **Custom firmware** — Xenopixel firmware is closed-source; we cannot
  generate or modify it
- **New blade effects** — only the 8 built-in effects are available;
  we cannot add more
- **ProffieOS-on-Xenopixel** — the MCU is unknown and the hardware is
  a black box; porting ProffieOS is not feasible
- **Xeno Configurator replacement** — the BLE app handles firmware
  updates; we handle SD card config only (unless BLE RE succeeds)

---

## Success criteria

A Xenopixel V3 user should be able to:

1. Open KyberStation, select "Xenopixel V3" as their board
2. See only the effects/styles their saber can actually produce
3. Pick a blade effect, set colors, choose an ignition style
4. Tune motion controls and sensitivity
5. Pair a sound font
6. Download a ZIP
7. Unpack it onto their SD card
8. Power on the saber and see exactly what they designed

That last step — "see exactly what they designed" — is the bar.
The visualizer preview must match the real hardware output.
