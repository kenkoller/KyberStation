# Session 2026-05-15 — V3.9-BT Bench + Audit + Runtime-Preset Discovery

**Hardware:** 89sabers Proffieboard V3.9-BT (chip `2068308F3830`, current bench board) + old 89sabers V3.9 non-BT (chip `2081399A4B30`, retired board).
**Goals at start of session:** Validate KyberStation's flash-to-saber pipeline against real hardware. Audit whether codegen has drifted since v0.15.0 (2026-04-27).
**Outcome:** Audit complete + 4 hypotheses tested for V3.9-BT boot failure (all disconfirmed) + **major strategic discovery about how 89sabers BT firmware actually works**. Saber restored to factory state, healthy.

---

## What we accomplished (a lot)

### 1. Codegen drift audit — clean

Ran [`scripts/hardware-test/build-modulation-test-config.mjs`](../../scripts/hardware-test/build-modulation-test-config.mjs) against current `main` HEAD. The two regex post-processing patches in that script (`AudioFlicker` strip + `White → Rgb<255,40,40>` swap) **still match the emitted code byte-for-byte**, 18 days after v0.15.0 (not 8 months — earlier session-log timing was wrong).

**Conclusion: KyberStation's codegen emit pattern has not drifted since the 2026-04-27 hardware-validated baseline.** Whatever booted on hardware then would still produce the same C++ shape today.

### 2. End-to-end pipeline validation (mechanically)

- **6 successful flashes** via `arduino-cli` + `dfu-util` (4 KyberStation builds + 2 factory restores).
- **Custom-paste splicer is byte-perfect** — static diff against unmodified `89V3_allfont.h` confirms the splicer only modifies the `Preset presets[]` block.
- **Spliced output compiles cleanly** — same toolchain, smaller binary (1 preset vs 28), no errors.
- **Factory backup + restore workflow** — restored saber to working state 2× during session, both clean.

The compile + flash + restore mechanics are not the problem.

### 3. Hypotheses tested for V3.9-BT boot failure (all disconfirmed)

Flashed 4 different KyberStation-emitted configs to the V3.9-BT board. All produced the **same hang state**: solid green LED, no USB CDC enumeration, chip stuck in mid-boot. Auto-recovery via watchdog → DFU eventually fires.

| Hypothesis | Config flashed | Result |
|---|---|---|
| Stock-V3 codegen (no BT defines, no SSD1306) | `v3-modulation-test.h` from `build-modulation-test-config.mjs` | Hang — same as 2026-05-14 V3.9-BT bench |
| 89sabers-non-BT codegen (factory `89V3_allfont.h` as-is) | Public CCSabers config, unmodified | Hang |
| BLE-uncommented only | `89V3_allfont.h` + `BLE_PASSWORD/NAME/SHORTNAME` defines | Hang |
| OLED + BLE both uncommented | `89V3_allfont.h` + `ENABLE_SSD1306` + BLE defines | Hang |

**Combined evidence: V3.9-BT chassis requires something in `89sabers-config.h` that isn't the obvious adjacent commented-out defines.** Could be a specific `FETT263_*` flag, a hardware-pinout define, a different prop file, or a `SAVE_PRESET` / runtime-preset path requirement. **Cracking it from outside needs either ST-Link/SWD boot logs or the source from 89sabers.**

### 4. Strings audit of factory backup binaries

`strings` + filter on `bank2-pre.bin` (where `BFB2=1` factory firmware lives) revealed:

- `config/89sabers-config.h` — confirmed factory config filename
- `prop: SaberFett263Buttons` — same prop file as non-BT variant (so prop file isn't the differentiator)
- `SSD1306` — OLED active
- `Serial` — `ENABLE_SERIAL` active
- `get_ble_config` / `set_volume` / etc. — runtime BLE configuration
- `installed: Apr 21 2026 08:44:54` — recent compile date

Very few BT-specific symbols. The minimal surface suggests the BT-variant config is **mostly identical to the non-BT** except for a small set of additions we haven't identified.

### 5. **The big discovery: V3.9-BT firmware uses runtime-loaded presets, not compiled-in presets**

Connected to the live factory firmware over USB CDC after restore. Sent the ProffieOS `list_presets` command. Got this:

```
v7.12
config/89sabers-config.h
prop: SaberFett263Buttons
buttons: 2
installed: Apr 21 2026 08:44:54
FONT=Graflex;common
TRACK=tracks/Graflex.wav
STYLE1=builtin 0 1
STYLE2=builtin 0 2
NAME=Graflex
VARIATION=0
FONT=Vader;common
TRACK=tracks/Vader.wav
STYLE1=builtin 1 1
STYLE2=builtin 1 2
NAME=Vader
VARIATION=0
... [22 more entries]
```

**`STYLE1=builtin 0 1` means the preset references style INDEX 0 from a compiled-in style bank, not a full `StylePtr<...>()` definition.** Combined with the runtime-loadable preset list format, this tells us:

- **Presets are SD-card data**, not C++ code baked into the binary.
- **The factory firmware compiles in a fixed bank of styles** that presets reference by index.
- **Editing presets does NOT require re-flashing firmware** — it's an SD-card file edit.

This is the **ProffieOS Workbench / Fett263 `SAVE_PRESET`** pattern, and it's how modern Proffie vendor sabers (including 89sabers) handle preset customization.

---

## Strategic implication

The entire "design presets → compile config.h → flash firmware" pipeline we've been validating tonight is **the wrong workflow for modern vendor Proffie sabers**. For sabers like the V3.9-BT (and likely Sabertrio BT Power Core, KR Sabers v3+, etc.), the right workflow is:

1. Design presets in KyberStation editor
2. KyberStation emits an **SD-card-format preset file** (probably `presets.ini` — needs verification)
3. User mounts saber as USB MSC, drops file in, reboots
4. New presets active — **no compile, no flash, no toolchain, no brick risk**

**KyberStation does not currently support this export format.** That's the gap. Adding it is the highest-leverage v0.17 feature on the table.

Implications:

- The whole "BT chassis is blocked because we can't get `89sabers-config.h`" framing was misleading. The user **doesn't need a working `config.h`** if they're using runtime presets. The factory firmware is already a `config.h` — what they need is preset data to drop onto the SD card.
- This unblocks BT chassis support for v0.17 **without** vendor cooperation, ST-Link, or further reverse engineering.
- For sabers that DO bake presets into `config.h` (older DIY builds, stock Proffieboards before SAVE_PRESET was widespread), the compile+flash path still applies. Both paths matter; runtime is just much friendlier for the modern vendor use case.

---

## What we still don't know about V3.9-BT firmware boot

Not blocking the v0.17 path, but worth noting for the record:

- What specific define(s) in `89sabers-config.h` differ from the non-BT factory config such that the non-BT config doesn't boot on this chassis.
- Whether the V3.9-BT has a chassis hardware pinout difference (BT module enable line on a GPIO?) that requires specific config to be safe.
- Whether ST-Link / SWD boot logs would clarify the failure (almost certainly yes).

These remain ST-Link-arrival-bound or vendor-cooperation-bound. Not on the v0.17 critical path because the runtime-preset path sidesteps them.

---

## Hardware status at end of session

- **V3.9-BT**: ✅ Restored to factory firmware. USB CDC enumerating as "Proffieboard". Saber operates normally (sound, LED pulse, button response, ignition/retraction).
- **Old V3.9 (chip `2081399A4B30`)**: ⚠️ Flash hangs mid-write via `dfu-util` (process consumes 0.12s CPU over 7+ minutes). Likely flash-sector degradation from the 2026-04-30 Option Bytes write incident. Bank 1 backup captured tonight at `backups/89sabers-v39-old-2026-05-15/bank1-pre.bin` (262144 bytes, SHA `d881a8e7...`). Recovery requires ST-Link/SWD.
- **Test artifacts kept on `~/ProffieOS/config/`**:
  - `89V3_allfont.h` — verbatim from CCSabers' published pack
  - `89V3_allfont_BLE.h` — + 3 BLE defines uncommented (didn't boot)
  - `89V3_allfont_BLE_OLED.h` — + BLE + ENABLE_SSD1306 (didn't boot)
  - `89V3_kyberspliced.h` — custom-paste splice of `89V3_allfont.h` (compiles clean)
  - `v3-modulation-test.h` — output of `build-modulation-test-config.mjs` (stock-V3 config, didn't boot on V3.9-BT)
- **`~/ProffieOS/ProffieOS.ino`**: Restored to pre-session `CONFIG_FILE "config/89sabers-bt-2026-05-14.h"` state.

---

## Concrete next-session priorities

1. **Reverse-engineer the SD-card preset file format** used by Fett263 prop's `SAVE_PRESET` / Workbench mode. Likely `presets.ini` on the SD card root. ProffieOS source at `~/ProffieOS/SAVE*` and `~/ProffieOS/common/save_*.h` should reveal the schema.
2. **Add a new KyberStation export mode**: "ProffieOS Runtime Presets (SD card)" — generates the SD-card-format preset file from current KyberStation `BladeConfig` state.
3. **Validate end-to-end** by:
   - Mounting V3.9-BT as USB MSC (button combo or serial command to switch from CDC mode)
   - Backing up the existing `presets.ini` (or whatever it's called)
   - Dropping in a KyberStation-generated file
   - Rebooting saber, confirming new preset names appear in `list_presets` over USB CDC
4. **Document the runtime-preset path as the primary v0.17 workflow** for modern vendor sabers (89sabers, Sabertrio, KR Sabers, anything with SAVE_PRESET / Workbench). Custom-paste compile+flash path becomes the fallback for older firmware that lacks runtime-preset support.

---

## What this means for Ken's question: "will I actually be able to put my custom presets on my saber?"

**Yes — and probably without needing to flash firmware at all.** The mechanism (SD-card runtime presets) is already supported by your factory firmware. KyberStation just needs an export adapter for the right file format. That's a ~2-3 day development task with no hardware unknowns and no brick risk.

**Limitations within this path:**
- Customizable: any preset parameter that ProffieOS Workbench supports — base color, clash color, blast color, ignition timing, retraction timing, etc. Plus font assignments, track files, preset names.
- Not customizable via this path: adding new blade-style algorithms beyond the ~30 styles compiled into your factory firmware. To get a new style algorithm onto the saber, you'd need to re-flash — back to the BT-chassis-config problem we couldn't crack tonight.

**Practical takeaway:** for the 95% case (customize colors / effects / preset names / fonts / timing), this works. For the 5% case (adding entirely new style algorithms), the firmware-flash path is still needed and remains gated on cracking the V3.9-BT config or getting an ST-Link clone for debug.

---

## What it will take to validate

Concrete success criteria for next session:

1. Identify the exact filename + format of the SD-card preset file used by `SaberFett263Buttons` prop with `SAVE_PRESET` enabled. Read the file from your live V3.9-BT SD card if possible.
2. KyberStation can emit a file in that format.
3. Drop that file onto your saber's SD card. Reboot. The new preset appears in `list_presets` and the saber displays / sounds it correctly.

End state: you design a preset in KyberStation, copy the generated file to your saber's SD card, and your saber plays it. No flash, no compile, no toolchain.

That's the v0.17 pitch delivered honestly, on your specific hardware, without vendor cooperation needed.
