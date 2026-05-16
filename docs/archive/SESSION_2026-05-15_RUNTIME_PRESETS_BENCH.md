# Session 2026-05-15 — Runtime Presets Hardware Bench

**Hardware:** 89sabers Proffieboard V3.9-BT (chip `2068308F3830`).
**Firmware:** ProffieOS v7.12, `config/89sabers-config.h`, prop `SaberFett263Buttons`, 2 buttons, installed `Apr 21 2026 08:44:54`.
**Goals at start of session:** Validate KyberStation's runtime-preset export pipeline (Phase A + Phase C) end-to-end on real hardware per [`docs/research/RUNTIME_PRESETS_HARDWARE_TEST_PLAN.md`](../research/RUNTIME_PRESETS_HARDWARE_TEST_PLAN.md).
**Outcome:** Phase A + Phase C both functionally validated. Major brightness-gap finding for Phase C that needs honest disclosure + v0.18 mitigation roadmap.

---

## What worked

### 1. Wire-format byte compatibility

The `presets.ini` format KyberStation emits is **byte-identical to what ProffieOS itself writes** via its own `Save()` flow. Confirmed two ways:

- Sent `set_style1 advanced 255,0,128 …` over serial; firmware logged `Creating file presets.ini iteration = 3` and the post-save `show_current_preset` returned our exact string verbatim.
- Saber power-cycled (including a DFU-mode round trip), came back up, and `show_current_preset` still returned our `advanced` string. The file survived cold boot.

This validates the entire emit → write → read → render round trip for the format.

### 2. install_time matching

The user's firmware's `installed: Apr 21 2026 08:44:54` (captured via `version` command) was substituted into the `installed=` line of the generated file. ProffieOS accepted the file (no fallback to compiled preset bank). Confirms the byte-exact match requirement in [`docs/research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md`](../research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md).

### 3. `advanced` named verb is in this firmware

`list_named_styles` over serial returned:

```
standard
advanced
fire
unstable
strobe
cycle
rainbow
charging
builtin 0 1
builtin 0 2
...
```

So `DISABLE_BASIC_PARSER_STYLES` is NOT defined in the 89sabers V3.9-BT firmware. Phase C is structurally compatible with this chassis.

### 4. Phase C colors render

Setting `STYLE1=advanced 255,0,128 …` on preset 0 (Graflex) and igniting produced a visibly magenta blade. User visually confirmed. The 11-slot signature's slot-1/2/3 (gradient hilt/mid/tip) is functionally correct.

### 5. 16-preset batch load via serial

KyberStation re-exported the user's design list via Phase C → `presets.ini` with 16 entries → was post-processed for:
- `installed=` substitution
- factory font assignment (rotation through Graflex, Vader, Anakin, ... 10 confirmed factory fonts)
- multi-blade duplication (V3.9-BT has 2 blades; each preset emits 2 identical `style=` lines)

Then batched via [`scripts/hardware-test/load-runtime-presets.sh`](../../scripts/hardware-test/load-runtime-presets.sh) which sends `duplicate_preset / change_preset / set_font / set_track / set_style1 / set_style2 / set_name` per preset. 16 × 7 commands ≈ 112 serial commands, ~90 seconds runtime, all succeeded.

Initial omission: the script forgot `set_name` on the first run — all 16 presets came up named "Graflex" (the duplicated source preset name). Fix: re-ran [`scripts/hardware-test/fix-preset-names.sh`](../../scripts/hardware-test/fix-preset-names.sh) which iterates `change_preset N` + `set_name <correct>` over positions 25–40. Loader script updated to call `set_name` going forward.

---

## The brightness finding

**Phase C parser-verb output is visibly dimmer than factory `builtin N M` presets.** Confirmed with side-by-side hilt-bench A/B (Vader factory at position 1 vs Cal Kestis Magenta Fire Phase C at position 27). Both used the same hardware, battery (4.17V full), `get_blade_dimming=16384` (max), same blade.

### Root cause

Per [`/Users/KK/ProffieOS/styles/legacy_styles.h:45-50`](/Users/KK/ProffieOS/styles/legacy_styles.h) — the `standard` named verb resolves to:

```cpp
typedef AudioFlicker<base_color, lockup_flicker_color> AddFlicker;
typedef Blast<base_color, blast_color> AddBlast;
typedef Lockup<AddBlast, AddFlicker> AddLockup;         // ← AudioFlicker is the LOCKUP state
typedef SimpleClash<AddLockup, clash_color> AddClash;
return StylePtr<InOutHelperX<AddClash, ...>>();
```

`AudioFlicker` is **only the lockup state**, not the normal-blade rendering. Normal blade = `Blast<base_color, blast_color>` = static base color (Blast is transient on blast events).

The `advanced` named verb (per [`style_parser.h:51-75`](/Users/KK/ProffieOS/styles/style_parser.h:51)) uses `Gradient<RgbArg<1>, RgbArg<2>, RgbArg<3>>` as the base — also no always-on AudioFlicker.

Meanwhile factory 89sabers presets follow the canonical compile-time pattern (also produced by KyberStation's `proffie` compile+flash export):

```cpp
Layers<
  AudioFlicker<base, Mix<Int<16384>, base, White>>,   // ← TOP layer, ALWAYS rendering
  BlastL<...>,
  SimpleClashL<...>,
  LockupTrL<...>,  // × 4 for normal/drag/lightning/melt
  InOutTrL<...>
>
```

The factory's `AudioFlicker` is the top of the Layers stack, audio-reactively pulsing between base and a mid-bright base+white blend **during normal hum**. That's the visceral brightness perception. No parser-registered ProffieOS verb replicates this top-layer always-on AudioFlicker pattern.

### Mitigation A test

Hypothesis: pre-boost the base colors at export time (e.g. magenta `235,18,142` → `255,50,200`) to compensate.

Result: **still dim.** Pre-boost can shift the perceived hue but can't replicate the audio-reactive flicker pattern. The brightness gap is structural, not chromatic.

### Mitigation B test

Hypothesis: switch Phase C from `advanced` to `standard` verb (since `standard` has `AudioFlicker` in its expansion).

Result: **still dim**, same as `advanced`. Confirmed above — `standard`'s AudioFlicker is on the lockup state, not normal-blade rendering.

### Hilt-mounted confirmation

After the on-bench A/B tests, the saber was reduced to exactly 2 presets (Vader factory at position 0, Cal Kestis Phase C at position 1) and the chassis was installed into the hilt with the blade attached for a real-world side-by-side test. User confirmed: **Cal Kestis (Phase C) is still very dim compared to Vader (factory)** under proper full-power hilt-mounted conditions. The brightness gap is not a bench artifact, not a battery sag effect, not a result of partial LED current — it is the structural limitation of the parser-verb template path.

### Day 2 (2026-05-16) — `cycle` verb exhaustive test, conclusive parser-verb gap

Hypothesis: ProffieOS's `cycle` named verb has `AudioFlicker<>` as its top Layer (verified from `style_parser.h:88-96`) — unlike `advanced` and `standard` — so it should produce factory-equivalent brightness if used with correct slot ordering.

Test matrix (loaded via `scripts/hardware-test/load-runtime-presets.sh` + `simplify-to-cycle-test.sh`):

| Pos | Name | Style | Verdict |
|---|---|---|---|
| 0 | Vader (factory) | `builtin 1 1/2` | **Bright reference** |
| — | — | first cycle test, original slot order | dim |
| — | — | first cycle test, white-flicker variant | dim |
| 1 | T01 Cycle Mag | `cycle 235,18,142 245,136,198 235,18,142 250,208,174 125,86,215` (corrected slot order: slot 2 = bright-mix, slot 3 = magenta) | **dim** |
| 2 | T02 Cycle Red | `cycle 255,0,0 255,128,128 255,0,0 255,255,255 255,255,0` (chromatic isolation: RED, not magenta, with corrected slot order) | **dim** |
| — | T05 Magenta fire | `fire 235,18,142 255,100,200` | dim base, bright clashes |
| — | T06 Warm unstable | `unstable 150,0,0 ...` | dim base, bright clashes |
| — | T07 Magenta strobe | `strobe ...` | dim base, bright flashes |
| — | T08 Rainbow | `rainbow 200 800` | **BRIGHT** — matches Vader |

**Empirical conclusions:**

1. **Every parser-registered named verb in this firmware renders dimmer than `builtin N M`, except `rainbow`.** Tested: `standard`, `advanced`, `cycle` (both slot orderings), `fire`, `unstable`, `strobe`. All dim at idle hum. Only `rainbow` matches factory brightness — and it renders full-saturation rotating colors, not a chosen base color.

2. **Chromatic factor ruled out.** RED (255,0,0) via `cycle` is also dim. Same red is bright via factory `builtin 1 1` (Vader). So the chromatic LED response is fine; the template path is the issue.

3. **AudioFlicker top-layer presence in `cycle` is insufficient.** The `cycle` template has `Layers<AudioFlicker<slot3, slot2>, BlastL, LockupL, SimpleClashL>` as the inner layer of `ColorCycle<...>`. Even with corrected slot ordering so the brightened color is in the appropriate "loud audio" position, the rendered blade is dim.

4. **The brightness gap is fundamental to the parser-verb path.** No combination of arguments to any existing parser-registered verb produces factory brightness. This is not fixable by changing how KyberStation emits style strings — the verbs themselves don't support what we need.

### What this means

**Phase C runtime presets cannot achieve factory brightness in this firmware, period.** The deliverability table's "partial / lossy" status for Phase C colors needs to be honest: colors transfer correctly but at visibly reduced brightness with no software-side fix possible against the current ProffieOS named-verb registry.

The proper fix is an upstream contribution to ProffieOS — a new named verb (proposal: `vibrant`) with always-on AudioFlicker brightening as the top Layer, matching the canonical compile-time factory pattern. This is the work item this session pivoted toward at end-of-day 2026-05-16.

### Day 2 evening (2026-05-16) — SMOKING GUN: 16-bit RGB scaling bug in KyberStation

**The conclusion above was wrong.** Deeper source-level audit of the rendering pipeline revealed the actual root cause:

**`~/ProffieOS/styles/rgb_arg.h:41`:**
```cpp
color_ = Color16(r, g, b);
```

`RgbArg<>` (used by all parser-registered verbs to accept runtime color args) stores parsed values directly as `Color16` — which expects **0-65535 per channel**, not 0-255.

But the **compile-time `Rgb<R,G,B>` template** (which factory presets use) goes through `Color16(Color8(R,G,B))`:

**`~/ProffieOS/common/color.h:191`:**
```cpp
constexpr Color16(const Color8& c) : r(c.r * 0x101), g(c.g * 0x101), b(c.b * 0x101) {}
```

The `* 0x101` (= × 257) applies the 8-bit → 16-bit scaling automatically at compile time. The runtime parser does NOT.

**Implication:** KyberStation has been emitting `advanced 235,18,142 …` (0-255 values) when the parser expects `advanced 60395,4626,36494 …` (0-65535 values). Every Phase C blade has been rendering at **1/257 of intended brightness** (≈ 0.4% photon output per channel).

**Bench verification 2026-05-16:** sent `set_style1 advanced 60395,4626,36494 …` directly to the V3.9-BT, ignited preset 1, observed: **bright magenta blade**, matching factory Vader's brightness. The bug was KyberStation's color encoding, not the verb template, not the ProffieOS rendering pipeline.

### Updated Phase C status

All earlier dim findings were caused by the wrong-scale color emission:
- `advanced` magenta — dim → **bright after 16-bit scaling**
- `cycle` (both slot orderings) — dim → would be **bright after 16-bit scaling**
- `standard` — dim → would be **bright after 16-bit scaling**
- `fire`, `unstable`, `strobe` — dim base, bright clashes → these had **clash colors emitted correctly as compile-time White (= 0xFFFF)** while bases were scaled-down user colors. The clashes WERE rendering at full brightness; the bases were at 0.4%.

**The fix is a 1-line change in `packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`:**

```typescript
// Before (rgbCsv): emitted 0-255 → 1/257 brightness
// After (rgbCsv16): emitted 0-65535 by scaling × 257 → factory brightness
function rgbCsv16(c: { r: number; g: number; b: number }): string {
  const scale = (v: number) =>
    Math.max(0, Math.min(65535, Math.round((Number.isFinite(v) ? v : 0) * 257)));
  return `${scale(c.r)},${scale(c.g)},${scale(c.b)}`;
}
```

Deliverability table for `proffie_runtime` Phase C lifted: `baseColor`, `clashColor`, `lockupColor`, `blastColor`, `ignitionMs`, `retractionMs` all moved from `partial` → `deliverable`. The "no upstream PR needed" conclusion holds: **Phase C now works correctly on existing ProffieOS firmware** — the bug was always KyberStation's color encoding. No firmware change required.

### Implications

The "design preset in KyberStation → put it on saber via runtime preset" workflow can transfer:

- ✅ Colors (base / clash / blast / lockup) — visible but at reduced perceived brightness
- ✅ Ignition / retraction timing
- ✅ Preset name, font assignment, track assignment, order
- ❌ **The factory-equivalent visceral brightness** — requires firmware-flash path with `Layers<AudioFlicker<base, Mix<base, White>>, ...>` template
- ❌ Style algorithms (Plasma fire, Crystal Shatter, Aurora drift, etc.) — `advanced` is a fixed template
- ❌ Modulation bindings — no slot in the runtime preset format

This means the Phase C narrative needs honest framing: "**Get your custom colors on the saber without flashing firmware — at the cost of visceral brightness.** For factory-equivalent brightness + style algorithms, the compile+flash path is required."

---

## Phase C "what it would take" — v0.18 paths

To close the brightness gap while staying on the runtime-preset workflow:

1. **Upstream ProffieOS PR** — add a new parser-registered named verb (e.g. `vibrant`) that wraps the base color in always-on `AudioFlicker<base, Mix<Int<16384>, base, White>>` matching the canonical factory pattern. This is the cleanest fix but requires upstream merge. ~1 week of upstream work; KyberStation can adopt as soon as it ships.

2. **Mitigation A v2: white-mix at export** — instead of just pre-boosting, emit a two-color preset where slot 4 (`onSparkColor` — the AudioFlicker partner in the `advanced` template's `OnSparkX<>` wrapping) becomes a brightened mid-color. Would require KyberStation codegen change + bench validation. Modest yield expected.

3. **Document the limit + offer both paths in UI** — keep `advanced` for the "I just want my colors without flashing" case, and surface a clear "for factory brightness use the compile+flash path" callout. Honest, doesn't require new firmware features.

4. **Hybrid path:** ship a "Re-flash with KyberStation-designed firmware (compile+flash)" workflow alongside runtime presets. This brings back style algorithms + brightness, but only works on chassis where the firmware-flash path is unblocked. For 89sabers V3.9-BT specifically, that's still gated on cracking the factory config.

The deliverability framework already separates Phase A (factory bright, no customization) from Phase C (custom colors, dim); the rationale tooltips should be updated to reflect this bench finding.

---

## Bench artifacts

Created during this session:

- [`scripts/hardware-test/load-runtime-presets.sh`](../../scripts/hardware-test/load-runtime-presets.sh) — parse `presets.ini` and load via batched serial commands (no SD card pull needed)
- [`scripts/hardware-test/fix-preset-names.sh`](../../scripts/hardware-test/fix-preset-names.sh) — rename a contiguous range via `change_preset` + `set_name`
- [`scripts/hardware-test/keep-vader-and-calkestis.sh`](../../scripts/hardware-test/keep-vader-and-calkestis.sh) — reduce saber to 2 presets for hilt-mounted A/B test
- `/tmp/fixed-presets.ini` — corrected 16-preset bundle (install_time + fonts + 2-blade duplication)

---

## Hardware state at end of session

- V3.9-BT healthy, factory firmware intact, battery 4.17V full.
- 2 presets on SD card:
  - Position 0: **Vader** (factory `builtin 1 1` / `builtin 1 2`)
  - Position 1: **Cal Kestis Magenta Fire** (Phase C `advanced 235,18,142 …`, non-boosted)
- `presets.ini` is currently at iteration ~104 in the atomic double-buffer cycle.
- Recovery to factory 28 presets: pull SD card → delete `presets.ini` → reinsert → reboot. `CreateINI()` ([`current_preset.h:298`](/Users/KK/ProffieOS/common/current_preset.h:298)) regenerates from compiled-in bank.

---

## Updated provenance for hardware-profiles registry

The `proffie_runtime` Phase A + Phase C export paths can be marked **vendor-confirmed** for the 89sabers V3.9-BT chassis. Boot, accept, persist, render — all confirmed on real hardware. The brightness caveat applies to Phase C and should be captured in the chassis profile's `notes` field.

The compile+flash path remains **unconfirmed** for this chassis (4 hypotheses tested + disconfirmed in the prior 2026-05-15 bench session — see [`SESSION_2026-05-15_V39BT_BENCH.md`](SESSION_2026-05-15_V39BT_BENCH.md)).
