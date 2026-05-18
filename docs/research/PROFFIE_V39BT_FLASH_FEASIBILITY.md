# 89sabers Proffieboard V3.9-BT — Custom-Firmware Flash Feasibility

**Status:** Research / strategy. Captures the 2026-05-17 audit of whether KyberStation can ship a reliable "flash custom firmware" path for the current hardware-validation board.
**Companion docs:** [`docs/FLASH_GUIDE.md`](../FLASH_GUIDE.md) §10, [`docs/archive/SESSION_2026-05-15_V39BT_BENCH.md`](../archive/SESSION_2026-05-15_V39BT_BENCH.md), [`docs/research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md`](PROFFIEOS_RUNTIME_PRESET_FORMAT.md).
**Decision authority:** Ken Koller. Audit author: Claude Code (Opus 4.7).

---

## Executive summary

**Custom firmware flashing on the 89sabers V3.9-BT board is not reliable today and should not be a user-facing workflow.** The board boots cleanly only when both physical flash banks are restored to their factory-recorded contents byte-for-byte; every recompile-and-flash variant we've tried — stock ProffieOS, the vendor's published `89V3_allfont.h`, that config with BLE and SSD1306 uncommented, and KyberStation custom-paste splices of all of the above — hangs the chip and disappears it from USB. The factory image is in physical Bank 2 (BFB2 set, 78KB of dense ProffieOS code starting at `0x08040000`), and Bank 1 contains a separate 256KB region that is fully populated, contains no plaintext ProffieOS strings, and is empirically required for the boot to succeed — likely a custom 89sabers loader / coprocessor blob / BT-stack data region whose contents we cannot reproduce from public sources. Without ST-Link/SWD boot logs or vendor source, we can't characterize the missing piece, so any custom-firmware path through Bank 1 alone or Bank 2 alone is gambling. KyberStation should treat the runtime-preset path (PR #325) as the **only** sanctioned preset-loading workflow for this board, mark `proffie_runtime` as the production board mode for all 89sabers V3+ chassis, and defer "ship new blade-style algorithms via flashing" until either ST-Link arrives or 89sabers shares the missing config — both of which are tractable but neither of which is on the current critical path.

---

## Evidence

### Today's failure modes (2026-05-17)

The user attempted to flash a 72-preset custom `config.h` to the V3.9-BT. The board was at a known-good state at the start (factory firmware restored from `backups/89sabers-v39bt-factory-2026-05-14/`). Five flash attempts, all failed:

| # | Config flashed | `usb` mode | DFU suffix | Target | Result |
|---|---|---|---|---|---|
| 1 | KyberStation 72-preset custom | `cdc` | unstripped (.iap) | Bank 1 | Boot hang |
| 2 | Old vendor config (`89sabers-bt-2026-05-14.h`) | `cdc` | unstripped (.iap) | Bank 1 | Boot hang |
| 3 | Old vendor config | `cdc` | stripped | Bank 1 | Silent — no USB enumeration |
| 4 | Old vendor config | `cdc` | stripped | Bank 2 | Silent — no USB enumeration |
| 5 | Old vendor config | `cdc_msc` | stripped | Bank 1 | Silent — no USB enumeration |

In every case `dfu-util` reported success ("Submitting leave request / Transitioning to dfuMANIFEST state"), but post-`:leave` the chip never re-enumerated and the saber's power button produced no blade ignition. Hardware DFU recovery (BOOT + replug) always worked, and the factory image restored cleanly from the May 14 dual-bank dump every time.

### Prior session corroboration

The 2026-05-15 bench session ([`SESSION_2026-05-15_V39BT_BENCH.md`](../archive/SESSION_2026-05-15_V39BT_BENCH.md)) ran the same experiment with four additional config shapes:

| Hypothesis tested | Config | Result |
|---|---|---|
| Stock V3 codegen (no BT, no OLED) | `v3-modulation-test.h` from KyberStation | Boot hang |
| Vendor's public non-BT factory config, unmodified | `89V3_allfont.h` from CCSabers | Boot hang |
| Vendor config + BLE defines uncommented | `89V3_allfont.h` + BLE | Boot hang |
| Vendor config + BLE + OLED uncommented | `89V3_allfont.h` + BLE + SSD1306 | Boot hang |

That session also confirmed mechanics are not the problem: `arduino-cli` compiles cleanly, `dfu-util` writes complete, the custom-paste splicer is byte-perfect against unmodified `89V3_allfont.h`, and the factory backup/restore loop runs in ~30 seconds without incident. **The problem is what compiled firmware does after boot, not how we get it onto the chip.**

### Forensic analysis of `backups/89sabers-v39bt-factory-2026-05-14/`

The May 14 dump captured the BT board's full state before any modifications:

```
SHA256 manifest:
  d881a8e7…  bank1-pre.bin           (256 KiB at 0x08000000)
  61d9f615…  bank2-pre.bin           (256 KiB at 0x08040000)
  4c2b2194…  option-bytes-pre.bin    (64 B at 0x1FFF7800)
  5f4ecdb7…  otp-memory.bin          (1024 B at 0x1FFF7000)
```

Decoding what's in each region:

**Option Bytes (`option-bytes-pre.bin`):**
- First 32-bit word: `0xFFFFF8AA` (little-endian, bytes `aa f8 ff ff`)
- RDP byte = `0xAA` → level 0, no read protection
- `4c2b2194…` matches the documented "89sabers V3.9-BT pristine" fingerprint per [`FLASH_GUIDE.md`](../FLASH_GUIDE.md) §10
- Differs from the retired V3.9 (variant A, `5e98c71a…`) by one bit at OPTR byte 2 bit 4 — the bit position 89sabers support describes as "BFB2"

**Physical Bank 1 (`bank1-pre.bin`, 256 KiB, fully populated):**
- Bytes 0–7: SP = `0x2000C000` (valid SRAM), reset handler = `0x08000041` (valid flash, Thumb bit set). Looks like a valid Cortex-M vector table at offset 0.
- BUT the vector table is sparse — IRQ entries are dominated by a single "default handler" pointer at `0x08000215`, and most peripheral vectors are zeros. A full ProffieOS build has dozens of real ISR addresses (timer, USB, ADC, DMA, GPIO, etc.). This vector table is consistent with a *minimal* runtime, not the full ProffieOS application.
- Long ASCII strings (≥10 chars): only **15 total in the entire 256 KiB**. No `ProffieOS`, no `89sabers`, no font names, no `installed`, no `Fett263`. ProffieOS firmware would have hundreds.
- The 256 KiB are densely populated (no large 0xFF or 0x00 regions): byte-density of "other" content in the first 64 KiB is 61356 / 65536 ≈ 94 %. This is binary code or data, not erased space.
- **Interpretation:** Bank 1 is *not* the running ProffieOS application. It is something else — a custom 89sabers loader, a coprocessor/BT firmware blob, encrypted or packed payload, or a vendor-specific data partition. The vector table at offset 0 suggests it is the chip's entry point at reset, but the code body is not user-facing ProffieOS.

**Physical Bank 2 (`bank2-pre.bin`, 256 KiB total, 77.8 KiB used + 178 KiB of 0xFF erase pattern):**
- Bytes 0–7: `56 f9 41 f6 8b 51 41 f2` — does **not** form a valid Cortex-M vector table at offset 0 (initial SP `0xF641F956` is not in SRAM).
- Long ASCII strings: **323 in the first 80 KiB**, including:
  - `ProffieOS .For available serial commands, see:\nhttps://pod.…` at offset `0x10392`
  - `89sabers-config.h\nprop: SaberFett263Buttons\nbuttons: 2\ninstalled:…` at offset `0x111d0`
  - `Fett263Buttons.Display memory is not big enough, increase ma…` at offset `0x10e6b`
  - Font references (`Graflex;common`, `Vader;common`, `Anakin;common`, `QGJ;common`), track filenames (`tracks/Graflex.wav`), audio assets (`thirty.wav`, `seventy.wav`, `mselect.wav`, `mfalse.wav`)
- Candidate vector table at offset `0x13348` (SP = `0x20000370`, reset handler = `0x0804C35B`, Thumb bit set) — this lands at the very end of the populated region, which is unusual but is consistent with a non-standard linker layout where the application's effective entry vector is referenced from elsewhere (possibly by the Bank 1 loader).
- **Interpretation:** Bank 2 contains the running ProffieOS firmware (the v7.12 / Fett263 / 89sabers-config.h build). Its vector table is *not* at offset 0, suggesting either (a) the chip starts execution in Bank 1, and Bank 1's loader jumps to the Bank 2 entry point after setting VTOR, or (b) Bank 2 is loaded by a custom bootloader that handles vector relocation. Either way, **Bank 2 alone is not directly bootable** by the standard Cortex-M reset sequence.

**Combined picture:** The BT board uses a two-region layout where Bank 1 (the reset entry per its valid vector table at offset 0) bootstraps and then hands control to the ProffieOS application living in Bank 2. The empirical observation that single-bank custom flashes fail silently — including writing the factory's *own* recompiled `89V3_allfont.h` to Bank 2 — is consistent with Bank 1 implementing some validation, signature check, or version-pinned handshake that custom compilations do not satisfy.

### What worked: full factory restore

The single procedure that has consistently brought the board back to a booting state is writing **both** Bank 1 and Bank 2 byte-for-byte from the May 14 dump, with `:leave` on the second write:

```bash
dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000 \
  -D backups/89sabers-v39bt-factory-2026-05-14/bank1-pre.bin
dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08040000:leave \
  -D backups/89sabers-v39bt-factory-2026-05-14/bank2-pre.bin
```

This recovers the saber every time. Option Bytes are deliberately not touched (RDP=0xAA, BFB2 in factory state) and OTP is never written.

### What worked: runtime presets (no flashing)

The 2026-05-16 bench session loaded **15 custom KyberStation presets onto the factory firmware via serial commands alone**, without ever entering DFU mode:

- `proffie-serial.sh` over USB CDC sent `duplicate_preset` / `change_preset` / `set_font` / `set_track` / `set_style1` / `set_style2` / `set_name` for each KyberStation-emitted preset.
- ProffieOS atomically wrote `presets.tmp` → `presets.ini` on the SD card, mounted via the saber's own SDMMC interface.
- All 15 presets cycled correctly, the smoking-gun 16-bit RGB fix (`packages/codegen/src/emitters/ProffieRuntimeEmitter.ts` commit `45737f2`) was validated end-to-end at full brightness.
- The factory firmware was untouched. The path is fully recoverable: restoring the prior `presets.ini` backup or sending `delete_preset 1` in a loop returns the board to its 28-preset factory state.

This is the workflow KyberStation v0.22.0 ships as the v0.17 "design preset → put it on saber" pitch.

---

## Root-cause hypotheses (ranked by plausibility)

### H1 — Bank 1 is a custom 89sabers loader with a Bank 2 validity check ⭐ most likely

**Claim:** Bank 1 contains a vendor-written first-stage loader that the chip boots into via its valid vector table at offset 0. The loader performs some validation on Bank 2 (CRC, magic number, install_time pinning, version match) before jumping to the application's entry vector. Custom firmware written to Bank 2 fails the validation, so the loader stays in an idle / wait-for-DFU state. Custom firmware written to Bank 1 overwrites the loader itself, so the chip can't even reach the validation step. The chip only boots when both banks are byte-perfect.

**Supporting evidence:**
- Bank 1 vector table is valid → chip reset jumps into Bank 1.
- Bank 1 has minimal long strings → it's not ProffieOS, and being 256 KiB dense suggests it's substantial code, possibly with embedded BT module blob.
- Bank 2 has ProffieOS strings + a non-offset-0 vector-table-like region → application code that something else launches.
- Custom Bank 1 OR custom Bank 2 alone → silent. Both banks together (factory) → boots.
- The 2026-05-15 bench session tested four BT-relevant variations of the *non-BT vendor config* (`89V3_allfont.h`); all hung. The non-BT config lacks whatever the BT loader is checking for.

**How to test:** Wire up ST-Link to the V3.9-BT's SWD pads. With OpenOCD + gdb, single-step from chip reset; observe what Bank 1 code reads from Bank 2 before it decides whether to jump. Specifically check for: (a) reads of the first ~32 bytes of Bank 2 for a magic header, (b) CRC computations over Bank 2 contents, (c) reads of OTP that are checked against Bank 2.

### H2 — Bank 2 holds a non-Cortex-M coprocessor firmware blob (BT module)

**Claim:** The 78 KiB in Bank 2 is the Bluetooth radio's firmware, uploaded over UART/SPI by the Bank 1 ProffieOS application during BT init. The chip boots Bank 1 (which IS ProffieOS, just with sparse vector table because most strings live elsewhere); during boot it attempts to init the BT radio, fails because Bank 2 contents don't match expectations, and the failure mode is a hang rather than a fallback.

**Supporting evidence:**
- Bank 1's 256 KiB is plausible for a full ProffieOS build (typical sizes range 100–250 KiB with vendor extensions).
- Bank 2's 78 KiB matches the typical size of a Murata / Cypress / Nordic BT module firmware blob.
- The user's session said: "the board completely disappears from USB" after a custom Bank 1 flash — consistent with USB CDC init being downstream of BT init, so a BT hang prevents USB enumeration.

**Where it fails:** ProffieOS strings are clearly present in Bank 2 ("ProffieOS …For available serial commands, see https://pod…"), which is text the running application would print over USB CDC. A BT radio blob wouldn't contain this. Unless the 89sabers code embeds a *copy* of these strings in the BT firmware for branding, this hypothesis is weaker than H1.

**How to test:** Same as H1 — ST-Link + gdb at boot.

### H3 — The chip's BFB2 bit IS set and it does boot Bank 2 first, with Bank 1 holding a stage-2 application that Bank 2's startup loads

**Claim:** BFB2=1 in option bytes means the chip starts execution at `0x08040000` (Bank 2). Bank 2's first bytes are not a standard Cortex-M vector table because 89sabers compile Bank 2 with a custom startup that reads boot info from elsewhere (OTP, option bytes, Bank 1 header). Bank 1 holds the stage-2 application (ProffieOS proper); Bank 2's stage-1 jumps to Bank 1 after setup.

**Supporting evidence:**
- The session log explicitly says "where BFB2=1 factory firmware lives" referring to Bank 2.
- Bank 2 starts with Thumb-2 instructions (`MOVW r9, #0x1F56` …), not a vector table — consistent with a chip that doesn't need a standard vector table because it's not the boot entry from a cold reset.
- Wait — this conflicts with the previous bullet. If BFB2=1 makes the chip boot from `0x08040000`, then `0x08040000` *should* have a vector table at offset 0.

**Where it fails:** The chip's silicon-burned reset behavior reads SP and PC from the boot bank's first 8 bytes; it does not consult a custom startup. If BFB2=1 truly mapped Bank 2 as boot, the chip would attempt to load `0xF641F956` into SP and fault out. The empirical fact that the board boots reliably with these contents means *something* is reading from a different region first. Either BFB2 polarity is reversed on this chip (Bank 1 is the boot bank despite the bit being set), or there's a bootloader/system-memory mode active. We can't tell without ST-Link.

**How to test:** Read the actual STM32L452RE OPTR bit assignments from reference manual RM0394 against the live OB dump and check polarity. Wire up SWD and read PC at the moment of reset to determine which physical address the chip is actually executing from.

### H4 — Toolchain or ProffieOS version mismatch silently produces incompatible binaries

**Claim:** The factory firmware was built against a specific ProffieOS commit + Proffieboard core version + GCC version + linker script. Recompiling the same `89sabers-bt-2026-05-14.h` against today's tree produces a binary that *should* be equivalent but has subtle differences (different ISR table layout, different linker placement of code/data, different inline-asm encoding) that cause runtime hangs but compile cleanly.

**Supporting evidence:**
- The "old vendor config recompiled with usb=cdc, stripped" failed identically to other custom flashes, even though it's source-equivalent to factory.
- Reproducible build environments for firmware are notoriously fragile; small differences in tools produce different binaries.

**Where it fails:** This hypothesis alone doesn't explain why writing to Bank 1 OR Bank 2 *both* fail. If the only issue were a toolchain skew, writing the new binary to Bank 2 (where ProffieOS lives) should produce a board that boots into a subtly-broken ProffieOS — but the symptom is silent (no USB enumeration at all), which means it's hanging earlier than that. Toolchain skew is a contributing factor at best, not the root cause.

**How to test:** Even if we could pin the toolchain (which 89sabers has not published), we'd need to know the version to pin to. Out of reach without vendor cooperation.

### H5 — Option Bytes / OTP / PCROP have hidden state that custom flashing doesn't preserve

**Claim:** Some piece of vendor configuration lives in OTP, PCROP, or write-protected option bytes that custom firmware doesn't know to leave alone. Writing custom firmware works *mechanically* but leaves the chip in an inconsistent OB/OTP state that prevents boot.

**Supporting evidence:**
- The retired V3.9 board was bricked by an OB write that cleared BFB2; that confirms OB is load-bearing for boot.
- The BT board's OTP region is 1024 bytes and is captured in `otp-memory.bin` (SHA `5f4ecdb7…`). We don't touch it during normal flashing, so it's preserved. But if OTP contains a vendor-specific value the firmware checks at boot, a recompile that expects a *different* value would hang.

**Where it fails:** OTP is read-only after first write — we couldn't be inadvertently modifying it. And dfu-util's `alt=0` interface writes only flash banks, not OB. So OTP/OB state should be preserved across our flash attempts. Unless the *firmware itself* (which we just flashed) writes new OB at boot — possible but uncommon.

**How to test:** Diff `dfu-util -a 1 -U` output before and after each failed flash. If OB bytes change, this is the cause. Cheap to validate, but requires the chip to be in DFU mode (which it is, after a failed flash) — the test can be added to the safe-flash workflow without ST-Link.

---

## Recommended protocol

### Default recommendation: **do not flash custom firmware on the V3.9-BT.**

For all KyberStation user-facing preset-loading workflows, ship the runtime-preset path (`proffie_runtime` board mode, PR #325). This path:

- Requires no compile-and-flash toolchain
- Cannot brick the saber (worst case: bad `presets.ini` is silently rejected by `ValidatePresets()` and ProffieOS falls back to compiled-in presets)
- Validates 2026-05-16 on real V3.9-BT hardware
- Covers ~95 % of the v0.17 "design preset → put on saber" pitch — base/clash/blast/lockup colors, ignition/retraction timing, preset names, font/track assignments, ordering, duplication

The 5 % that runtime presets cannot deliver — new blade-style algorithms beyond the ~30 styles compiled into factory firmware, modulation routings that require `Layers<Mix<SwingSpeed<…>>>` AST shapes — should be **explicitly deferred** in the UI's deliverability summary with a clear "requires firmware flash, not currently supported on this chassis" message rather than being silently dropped.

### If a future session must flash the V3.9-BT (against this recommendation)

If ST-Link arrives and validation work is unblocked, the **only** flash protocol that has any evidence of safety is:

1. **Capture a fresh dual-bank backup** before doing anything. Even if we already have May 14's dump, take a same-day one — the SHA must match `4c2b2194…` on OB and `d881a8e7…/61d9f615…` on banks. If it doesn't match, abort.
2. **Verify the current state boots** by exiting DFU (BOOT + replug → release immediately) and confirming the saber ignites. Do this *before* writing anything custom. If the board is already in a broken state, custom flashing is not the diagnosis to start with.
3. **Strip the `.iap` DFU suffix** (16 trailing bytes) and verify the stripped binary's length matches what the linker reported.
4. **Write to Bank 2 only** (`0x08040000:leave`) — Bank 2 is where the factory ProffieOS lives, so a recompile of `89sabers-bt-2026-05-14.h` belongs there. Never write custom firmware to Bank 1; that overwrites the loader.
5. **Pre-stage the restore command** in a separate terminal before issuing `:leave`. The hardware DFU recovery (BOOT + replug) always works, but having `dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000 -D bank1-pre.bin && dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08040000:leave -D bank2-pre.bin` ready to paste is the difference between a 30-second recovery and a 5-minute scramble.
6. **Stop after one attempt.** If the saber doesn't boot, restore from backup and don't retry with the same binary. The 2026-05-15 and 2026-05-17 sessions both demonstrate that repeated attempts on the BT board don't converge to success — they just consume bench time. Each failed attempt is data; collect what was different and try a *different* hypothesis next, not the same one again.

This protocol is encoded in `scripts/hardware-test/safe-flash.sh` (proposed below). It refuses to flash unless a fresh backup matching the May 14 fingerprint succeeds.

### Recovery protocol (always-works fallback)

`scripts/hardware-test/restore-factory.sh` (proposed below) restores the BT board from the May 14 dual-bank dump. It's the named version of the recovery sequence and should be the first thing a future session runs if a flash attempt produces a non-booting saber.

---

## Decision matrix: when to use which path

| User intent | Runtime presets (`proffie_runtime`) | Compile + flash |
|---|---|---|
| Reorder / rename / duplicate presets | ✅ Phase A (`builtin N M`) | Overkill |
| Reassign fonts / tracks | ✅ Phase A | Overkill |
| Custom base / clash / blast / lockup colors | ✅ Phase C (`advanced …`) | Possible but not justified |
| Custom ignition / retraction timing | ✅ Phase C | Possible but not justified |
| Custom blade style algorithm (Stable, Rotoscope, Pulse, …) referencing factory style bank | ✅ Phase A `builtin` with overrides | Overkill |
| Showcase / Kinetic gallery styles (`Layers<Mix<SwingSpeed<…>>>`) | ❌ Cannot represent in `advanced` verb | ❌ Currently unsafe on V3.9-BT |
| Brand-new style algorithm not in factory bank (CrystalShatter, Aurora, Helix, Candle, …) | ❌ Not in compiled style bank | ❌ Currently unsafe on V3.9-BT |
| Add a new font/track folder | ❌ Requires physical SD swap (no USB_CLASS_MSC in this build) | N/A — fonts are SD data, not firmware |
| Change `numBlades`, blade pinout, BLE password, OLED config | ❌ Compile-time only | ❌ Currently unsafe on V3.9-BT |
| Update to a newer ProffieOS version | ❌ N/A | ❌ Currently unsafe on V3.9-BT |

**Concrete v0.22.0 implication:** The 32-of-33 engine-to-codegen parity claim for `proffie_runtime` ([`project_v017_runtime_presets_pivot.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/project_v017_runtime_presets_pivot.md)) covers the Phase C `advanced`-verb cases. The 1 style that doesn't have parity, plus all Layers/Mix/SwingSpeed/Showcase/Kinetic AST shapes, are the cases that fall off the right edge of the matrix — they require a flash path we don't have today. Mark them clearly in the deliverability summary.

For **stock Proffieboards** (Fredrik direct, DIY builds, `89V3` non-BT variant A boards): the [`FLASH_GUIDE.md`](../FLASH_GUIDE.md) compile-and-flash workflow continues to apply as documented. The V3.9-BT and its peers (Sabertrio BT, KR Sabers v3+, future BT-equipped vendor sabers) are the chassis subset where flashing is gated.

---

## Open questions and future experiments

### Validating Bank 1's role (1–2 hour bench session with ST-Link)

Highest-leverage next experiment once ST-Link is wired up:

1. Reset the chip and single-step from `0x08000000`. Confirm Bank 1 is the boot entry.
2. Observe what addresses Bank 1 reads early in execution. Specifically: does it read from `0x08040000` (Bank 2 start) and compare against a magic number / CRC?
3. Identify the jump from Bank 1 to Bank 2's entry. The Bank 2 candidate vector table at offset `0x13348` (= `0x08053348` physical) might be the jump target.
4. Determine what Bank 1 does if Bank 2 validation fails. Idle loop? Reset? DFU enter? This tells us why the failure mode is "silent" rather than "fallback to known-good".

If Bank 1 turns out to be a vendor loader with a documented checksum format, KyberStation could in principle emit firmware that satisfies it. If it's a signed image we don't have the key for, custom flashing is permanently off the table without vendor cooperation.

### Validating that runtime presets cover everything we think they cover (no hardware needed)

1. Enumerate the AST shapes used by every preset in `packages/presets/src/`. Cross-reference against what `advanced` and `builtin … overrides` can represent.
2. For each preset that *can't* be represented, classify as either "small refactor moves it inside `advanced`" or "fundamentally requires a flash". This is the input to a deliverability summary that's accurate at a per-preset level instead of approximated.
3. Report the count: how many of the 455 presets are flash-only? If <5 %, the runtime-only direction is defensible product strategy. If >20 %, we have a serious gap and ST-Link becomes urgent.

### Stock-Proffieboard validation (hour-scale, requires bare board)

Borrow or buy a stock Proffieboard V3.9 (Fredrik direct). Confirm KyberStation's compile-and-flash path produces a booting saber there. This:

- Validates that the FLASH_GUIDE works *as written* for the stock case
- Bounds the V3.9-BT failure to "vendor customization", not "KyberStation codegen drift"
- Gives us a "known good" reference chassis for future BT-board debugging

### Documenting what 89sabers ships (no hardware, just outreach)

Email or DM 89sabers asking for:
- The exact `89sabers-config.h` used for the V3.9-BT factory build
- The exact ProffieOS commit / Proffieboard core version
- Any custom bootloader source they install in Bank 1, or a binary image we can flash to recover from
- Their stance on customer firmware modification (warranty implications, etc.)

This is the cheapest way to close the gap if they're cooperative. The "vendor doesn't reply" outcome is also valuable data for KyberStation's product positioning (lean harder on runtime presets in the marketing copy).

### Documenting the OB bit-position question

The `4c2b2194…` ↔ `5e98c71a…` "one bit at OPTR byte 2 bit 4" delta documented in [`FLASH_GUIDE.md`](../FLASH_GUIDE.md) §10 is the BFB2 position per RM0394 (FLASH_OPTR bit 20 = byte 2 bit 4 of the 32-bit register). The interpretation in this audit is consistent with the user's reading and the prior session's "where BFB2=1 factory firmware lives" annotation: variant A had BFB2 cleared and boots Bank 1 contents; BT has BFB2 set and boots from Bank 2 — but Bank 2's first bytes are not a valid Cortex-M vector table, which means *something* between cold-reset and ProffieOS execution is rewiring the boot flow. ST-Link is the only way to characterize this rigorously. Without it, treat OB as load-bearing and don't touch it.

---

## What this means for KyberStation product roadmap

1. **Treat `proffie_runtime` as the sanctioned production board mode for all 89sabers V3+ chassis** (V3.9, V3.9-BT, future variants). The "Hardware Profiles MVP" entry on POST_LAUNCH_BACKLOG.md remains valuable for stock Proffieboards but should not be the V3.9-BT story.

2. **In the UI's deliverability summary, surface "requires firmware flash" cases explicitly** with a chassis-aware message. On 89sabers V3+ chassis the message is "this chassis does not currently support custom firmware flashing — these properties will be dropped from the exported `presets.ini`". On stock chassis it's "this requires re-flashing via [`FLASH_GUIDE.md`](../FLASH_GUIDE.md)".

3. **Do not ship a one-click flash button for the V3.9-BT in v0.22.0 or any near-term release.** The existing WebUSB FlashPanel is already documented as experimental ([`docs/FLASH_GUIDE.md`](../FLASH_GUIDE.md) §9) — keep it experimental, do not promote to "validated" until we have at least one reproducible success on this chassis. The runtime-preset Card Writer panel is the recommended-path UI.

4. **Update [`docs/HARDWARE_VALIDATION_TODO.md`](../HARDWARE_VALIDATION_TODO.md) and [`docs/BOARD_COMPATIBILITY_ROADMAP.md`](../BOARD_COMPATIBILITY_ROADMAP.md)** to reflect that 89sabers V3.9-BT is "runtime-preset validated, flash-path blocked pending ST-Link or vendor cooperation". The current docs treat flash as the default path and runtime presets as a workaround; the audit recommends inverting that framing.

5. **Capture the May 14 backup in a place that's not just one local Mac.** The `bank1-pre.bin` + `bank2-pre.bin` + `option-bytes-pre.bin` are the only known recovery image for this board today. Push them to a private GitHub release, an iCloud backup, or both — losing them means losing the ability to recover the board.

---

---

## 2026-05-18 postscript — what changed since the audit was written

The audit above was written 2026-05-17 and represents the state at that point in time. Between then and 2026-05-18, four developments landed that change the practical picture without changing the core conclusion. Captured here so the audit body remains an honest snapshot of what we knew when we wrote it.

### 1. 89Sabers shared the factory `89sabers-config.h` (W1.3 vendor outreach succeeded)

Outreach to 89Sabers was sent 2026-05-17 (memory: [`reference_89sabers_ccsabers_contacts.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_89sabers_ccsabers_contacts.md)). 89Sabers responded with the actual factory config used to build the V3.9-BT firmware (the build labeled `installed: Apr 21 2026 08:44:54`). This is significant: prior failed flashes used either KyberStation-emitted configs or the CCSabers public *non-BT* `89V3_allfont.h`. Compiling the **actual** V3.9-BT source against ProffieOS 7.12 with the matching Proffieboard core version is now possible.

What this changes:
- Re-running the failed flash experiments with the matching source becomes worthwhile — failure with byte-for-byte source equivalence is much stronger evidence of the Bank-1-loader / validation-gate hypothesis (H1 in §"Root-cause hypotheses").
- Success would mean toolchain skew (H4) was the real culprit, and KyberStation could ship a "custom config preserving the vendor's exact CONFIG_TOP + BladeConfig + prop defines" flow without needing ST-Link.

What this does **not** change:
- Until a flash attempt with the real factory source produces a booting saber, the recommended posture remains: do not flash custom firmware on the V3.9-BT; use runtime presets.

Draft of the outreach template lives at `docs/research/89SABERS_SUPPORT_REQUEST_DRAFT.md` (referenced from memory) for future similar requests.

### 2. Hardware access is front-side-only — ST-Link path is physically blocked

Memory: [`reference_proffieboard_hardware_access_2026-05-17.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_proffieboard_hardware_access_2026-05-17.md).

The V3.9-BT board is installed in a hilt-mounted chassis; only the USB-C port side is accessible. BOOT0, BFB2 jumpers, and any SWD/ST-Link debug pads (typically on the back) are not reachable without chassis disassembly. This means the audit's recommended W2.2 experiment — ST-Link single-step from reset to characterize the Bank 1 → Bank 2 boot handoff — is **physically blocked** until Ken next opens the chassis.

What this changes for the next-steps plan:
- W2.2 (ST-Link bench session) moves from "highest leverage next experiment" to "blocked pending chassis-open window."
- The new highest-leverage experiment is **try the 89Sabers factory source compile + flash with a USB-only DFU recovery plan staged**. Recovery is single-bank-restore from `bank2-pre.bin` via `dfu-util`; the May 14 backup is the safety net.
- Any procedure proposed in future sessions must be verifiable using USB + front-side only. ST-Link, BOOT0 toggling, JTAG, OB writes via writer pads, etc. are all blocked.

### 3. Eight runtime-preset verbs validated on V3.9-BT factory firmware

Memory: [`reference_proffieos_runtime_verbs_v39bt.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_proffieos_runtime_verbs_v39bt.md).

Direct serial validation 2026-05-17 confirmed the factory firmware accepts these style verbs in `presets.ini`: `builtin`, `advanced`, `standard`, `unstable`, `fire`, `cycle`, `strobe`, `rainbow`. Four of these are **animated** (`unstable`, `fire`, `cycle`, `rainbow`) — richer than the audit's "Phase A + Phase C `advanced` verb" framing implied. `cycle` in particular is audio-reactive (not time-cycling despite the name), so it can substitute for some KyberStation Pulse / Aurora presets.

What this changes for the decision matrix:
- Row "Custom blade style algorithm (Stable, Rotoscope, Pulse, …)" in the audit's decision matrix gains more granularity: `pulse / aurora` is **approximate-but-possible** via `cycle`, not flash-only.
- The flash-only set narrows to: blade-angle / swing-speed / twist-reactive AST shapes (`Mix<BladeAngle<...>, ...>`, `Mix<SwingSpeed<...>, ...>`), slow time-based modulation (e.g. 30s color cycle), custom `Stripes<>` / `BumpPositionPredictable<>` / `Layers<>` animations.
- KyberStation gallery → verb mapping (from the memory note):
  - `stable / rotoscope / gradient` → `advanced`
  - `unstable` (KS style) → `unstable` verb
  - `fire` (KS style) → `fire` verb
  - `pulse / aurora` → `cycle` (approximate, audio-reactive)
  - all other styles (helix / vortex / tidal / plasma / photon / etc.) → not translatable, flash-only

This makes the runtime-preset coverage analysis (W1.1) more tractable: most gallery presets map to one of the 8 verbs; the explicit flash-only set is well-defined.

### 4. Runtime preset deployment requires writing both `presets.ini` AND `presets.tmp`

Memory: [`reference_runtime_preset_double_buffer.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_runtime_preset_double_buffer.md).

A real deployment bug was observed 2026-05-17: writing only `presets.ini` to the SD card produced silent reversion to factory presets after power cycle. Root cause: ProffieOS's `OpenPresets()` selects whichever of `presets.ini` / `presets.tmp` has the higher iteration in its `SafeFileHeader`. A stale `.tmp` from a prior save can win against a fresh `.ini`. Mitigation: write identical content to both files at deploy time.

What this changes:
- This is an operational detail, not a posture change. Affects: the CardWriter UI (should write both files automatically), `docs/research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md` (should document the rule), and any deploy script.
- The audit's "runtime presets path is validated" claim is unchanged — the 2026-05-16 bench validation went via the serial command path (which routes through ProffieOS's own atomic save logic), not direct SD writes, so it wasn't subject to this bug.

### Bottom line

The audit's core recommendation stands: **runtime presets is the sanctioned path on the V3.9-BT; do not flash custom firmware on this chassis under current bench conditions.** The 2026-05-18 developments narrow the gap (more runtime-preset verbs covered, factory source now in hand, deploy detail clarified) and shift the next-steps plan (compile-factory-source becomes the new W2 entry point, ST-Link is blocked until chassis-open). Updated plan: [`V39BT_FLASH_NEXT_STEPS.md`](V39BT_FLASH_NEXT_STEPS.md) (the document was edited 2026-05-18 to reflect these constraints).

---

## See also

- [`docs/FLASH_GUIDE.md`](../FLASH_GUIDE.md) — user-facing flash workflow; §10 covers vendor-customized boards and §11 covers recovery
- [`docs/archive/SESSION_2026-05-15_V39BT_BENCH.md`](../archive/SESSION_2026-05-15_V39BT_BENCH.md) — prior bench session with the same failure pattern across 4 different configs
- [`docs/research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md`](PROFFIEOS_RUNTIME_PRESET_FORMAT.md) — the format we ship instead of firmware
- [`docs/research/RUNTIME_PRESETS_HARDWARE_TEST_PLAN.md`](RUNTIME_PRESETS_HARDWARE_TEST_PLAN.md) — the validated bench protocol for the recommended path
- [`scripts/hardware-test/backup-proffieboard-v3.sh`](../../scripts/hardware-test/backup-proffieboard-v3.sh) — capture the dual-bank + OB + OTP forensic dump
- [`scripts/hardware-test/restore-factory.sh`](../../scripts/hardware-test/restore-factory.sh) — recovery from the May 14 dump (this audit's proposal)
- [`scripts/hardware-test/safe-flash.sh`](../../scripts/hardware-test/safe-flash.sh) — guarded custom-flash wrapper, for the if-we-must case (this audit's proposal)
- Memory: [`reference_dfu_util_flash_workflow.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_dfu_util_flash_workflow.md), [`project_proffieboard_v39_replacement_2026-05-01.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/project_proffieboard_v39_replacement_2026-05-01.md), [`project_v017_runtime_presets_pivot.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/project_v017_runtime_presets_pivot.md), [`reference_89sabers_v39bt_serial_preset_commands.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_89sabers_v39bt_serial_preset_commands.md)
