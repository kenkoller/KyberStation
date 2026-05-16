# Runtime Presets — Hardware Validation Test Plan

**Status:** Active test plan for the 89sabers V3.9-BT bench board.
**Companion code:** [`packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`](../../packages/codegen/src/emitters/ProffieRuntimeEmitter.ts) (Phase A + C).
**Format reference:** [`docs/research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md`](PROFFIEOS_RUNTIME_PRESET_FORMAT.md).
**Goal:** validate end-to-end that a KyberStation-designed preset survives the round trip through the SD card to a real saber, without firmware flashing.

## Hardware needed

- 89sabers V3.9-BT bench board (chip `2068308F3830`) restored to factory firmware ([SESSION_2026-05-15_V39BT_BENCH.md](../archive/SESSION_2026-05-15_V39BT_BENCH.md) end-state).
- USB-C cable.
- Chrome or Edge (for File System Access API). Firefox/Safari work for the ZIP path but require manual install_time substitution.

## Pre-flight

1. Connect V3.9-BT over USB-C. Confirm it enumerates as a serial device ("Proffieboard").
2. From a serial terminal (e.g. `screen /dev/tty.usbmodem* 115200`), send `pli` (or `list_presets`). Verify the firmware responds and the third line shows the `installed: ` timestamp. Copy that timestamp string — you'll need it.
3. (Optional but recommended) `find_blade` to confirm the saber detects the blade and is in a known healthy state.

## Test 1 — Phase A (reorder/rename safe path)

**What it proves:** `presets.ini` byte format is correct and ProffieOS accepts it. No risk to firmware; if it fails, the saber falls back to compiled-in presets silently.

1. Open KyberStation in Chrome/Edge.
2. Open the **Output Pipeline → Export to SD Card** panel.
3. **Target Board:** ProffieOS Runtime (SD card).
4. **Style Mode:** Phase A — reference factory presets (the safe default).
5. Add 3 presets to the Saber Preset List (any colors — they won't transfer in Phase A but you'll see them in the deliverability panel as "Dropped"):
   - Preset 1: name "KS Test Alpha", font Graflex, builtin index 0
   - Preset 2: name "KS Test Bravo", font Vader, builtin index 1
   - Preset 3: name "KS Test Charlie", font Graflex, builtin index 0 (duplicate)
6. Output method: **Write to Card**. Mount the SD card on your Mac (via the saber's USB MSC or by pulling the card).
7. Click "Write to SD Card." KyberStation will:
   - Read the existing `presets.ini` install_time automatically and use it
   - Back up the existing `presets.ini` to `presets.ini.backup_<timestamp>`
   - Write the new `presets.ini`
   - Verify the contents

**Success criteria:**
- New `presets.ini` on the card has 3 `new_preset` blocks with `style=builtin N M` lines.
- First line is `installed=<exact_string_from_pli>`.
- File ends with `end\n`.

**Hardware validation:**
1. Eject the SD card / disconnect storage.
2. Reboot the saber (power-cycle or `reboot` over serial).
3. Run `pli` over serial. Verify output shows 3 entries with NAMES "KS Test Alpha", "KS Test Bravo", "KS Test Charlie" in that order.
4. Cycle through presets via the main button. Confirm each loads — the actual blade colors will be whatever the factory firmware's preset 0 / 1 / 0 look like (which is the Phase A contract).

**If it fails:**
- "Bad header in presets.ini" in serial output → install_time mismatch. Re-check the value from `pli`.
- `pli` shows the OLD 28 presets, not your 3 → the file was rejected silently. Check the `installed=` line matches exactly (including the spaces and casing).
- Saber boots but doesn't cycle to new presets → the firmware never got the new file; verify the write actually landed by re-reading the SD card.

## Test 2 — Phase C (custom colors via `advanced` verb)

**What it proves:** the user's firmware accepts `style=advanced …` style strings and renders custom colors. Validates the v0.17 "design colors → put on saber" pitch end-to-end.

1. In KyberStation, set the editor's **Base Color** to a distinctive color (e.g. magenta `255, 0, 128` — something your factory presets don't use).
2. Set **Clash Color** to `0, 255, 255` (cyan), **Blast Color** to `255, 255, 0` (yellow).
3. Set **Ignition Time** to `200ms`, **Retraction Time** to `1000ms`.
4. Switch the Card Writer's **Style Mode** to **Phase C — custom styles (experimental)**.
5. Verify the deliverability panel now shows `base color`, `clash color`, `blast color`, `lockup color`, `ignition timing`, `retraction timing` under **Partial / lossy** (not Dropped).
6. Output method: **Write to Card**. Save the new preset list to the SD card.

**Success criteria:**
- New `presets.ini` lines start with `style=advanced 255,0,128 255,0,128 255,0,128 …`.
- File ends with `end\n`.

**Hardware validation:**
1. Eject + reboot the saber.
2. `pli` over serial. Verify output shows your KyberStation-named presets with `STYLE1=advanced 255,0,128 …` instead of `STYLE1=builtin N M`.
3. Cycle to a Phase C preset. **Ignite the blade.** It should show your magenta color, not the factory color.
4. Trigger a clash (`clash` over serial or physically tap). Should briefly flash cyan.
5. Trigger a blast (`blast` over serial or button combo). Should flash yellow.
6. Measure ignition + retraction time — should feel ~200ms in / ~1000ms out (the difference is noticeable).

**If it fails:**
- `pli` shows `STYLE1=advanced …` but blade displays the OLD factory color → firmware accepted the string but the `advanced` named style isn't registered. This means `DISABLE_BASIC_PARSER_STYLES` is defined in the firmware. Phase C won't work on this chassis; back out to Phase A.
- `pli` shows `STYLE1=builtin 0 1` (not advanced) → the export wrote the wrong format. Verify the Phase C toggle is on in CardWriter and the ZIP was regenerated.
- Saber refuses to boot or hangs → the style string failed `IsValidStyleString()`. Capture the exact `presets.ini` content and file a bug — this is an emitter regression.

## Test 3 — Round-trip safety check

**What it proves:** Phase A and Phase C don't break each other. The user can switch between modes without bricking their saber.

1. Run Test 1 (Phase A) — confirm saber works.
2. Run Test 2 (Phase C) — confirm custom colors work.
3. In KyberStation, switch back to Phase A and re-export with `runtimeUseAdvancedVerb=false`. Write to card.
4. Reboot saber. Verify `pli` shows `STYLE1=builtin N M` again and the saber displays factory colors.
5. Restore the original `presets.ini.backup_<timestamp>` to the SD card. Reboot. Verify saber returns to the factory 28-preset state.

**Success criteria:** All three states are reachable and the saber recovers cleanly each time.

## Test 4 — Stress: install_time mismatch

**What it proves:** ProffieOS's `ValidatePresets()` correctly rejects mismatched install_time. Confirms our "must match exactly" warning is real, not theoretical.

1. Open `presets.ini` on the SD card in a text editor.
2. Change the first line from `installed=Apr 21 2026 08:44:54` to `installed=BogusValue 2026 00:00:00`.
3. Save, eject, reboot saber.
4. `pli` over serial. Verify output shows the ORIGINAL 28 factory presets (not the KyberStation entries). The firmware silently fell back.

**Success criteria:** The fallback is silent (not a serial error) and the saber stays operational.

## Reporting back to KyberStation

After running these tests, please file a hardware report at:
https://github.com/kenkoller/KyberStation/issues/new?template=hardware_report.md

Include:
- Saber vendor + board variant
- Firmware install_time (from `pli`)
- Test 1 / 2 / 3 / 4 PASS or FAIL
- Any serial output that contradicts the success criteria
- For Test 2 failure: whether `DISABLE_BASIC_PARSER_STYLES` is defined (look in the saber's factory `config.h` if you have it, or test by sending `make_style standard` over serial — error = parser styles disabled)

This data is what we need to mark `proffie_runtime` and `proffie_runtime + advanced` paths as **vendor-confirmed** in the hardware profiles registry and the deliverability summary.
