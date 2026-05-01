# Session 2026-04-30 night — 89sabers Proffieboard V3.9 recovery (exhausted Tier 1+2)

## TL;DR

The 89sabers Proffieboard V3.9 (serial `2081399A4B30`) that hosted all KyberStation hardware validation through v0.16.0 launch was bricked beyond DFU recovery during the 2026-04-29 Option Bytes incident. This session ran the full Tier 1 + Tier 2 recovery protocol to confirm whether the chip was salvageable without ST-Link. **Conclusion: it isn't.** Even with byte-perfect validated firmware in both banks and Option Bytes restored to 89sabers factory state, the chip silently refuses to execute firmware. The remaining failure modes (Bank 2's separate OB region at `0x1FFFF800`, possible silicon-level damage) live beyond what standard DFU can read or write.

**Outcome:** the V3.9 was retired 2026-05-01. A replacement Bluetooth-enabled Proffieboard variant has been ordered.

## Context

Per the [`reference_dfu_util_flash_workflow`](../../../.claude/projects/-Users-KK-Development-KyberStation/memory/reference_dfu_util_flash_workflow.md) memory note from 2026-04-29:

> Live-confirmed 2026-04-29: clearing BFB2 on a working saber broke its boot capability. The chip remains DFU-recoverable via SW1+SW2 hardware buttons, but the saber won't boot any compiled firmware until either factory firmware is restored OR a complete Option Byte reset is done via ST-Link / STM32CubeProgrammer.

Tonight's session was the systematic confirmation pass: working through every reasonable Tier 1 (no Option Bytes) + Tier 2 (Option Bytes via dfu-util) variant, with full forensic capture before each change.

## Recovery attempts (all results: silent boot, solid green LED, no USB enumeration)

| # | Firmware | Bank | BFB2 | Notes |
|---|---|---|---|---|
| T1.1A | fwB-minimal (208KB) | 1 | 0 | Initial dfu-util manifest hang on `:leave`; flash bytes verified correct via readback |
| T1.1C | fwB-padded (262KB, full bank erase) | 1 | 0 | Eliminated stale-data tail interference theory |
| T2.2A | OB write only — flip BFB2 0→1 | — | 0→1 | `dfu-util: Error during download get_status` returned, but readback confirmed write succeeded |
| T1.1B-OB | fwB-padded | 2 | 1 | Cleanly-exited `:leave` (no manifest hang on Bank 2) |
| T1.fwC-1 | fwC (April 27 hardware-validated build) | 2 | 1 | Same `v3-modulation-test.h` config that ran successfully on this exact board on 2026-04-27 |
| T2.OB-revert | OB write only — flip BFB2 1→0 | — | 1→0 | Same misleading "error" response, write succeeded |
| T1.fwC-2 | fwC | 1 | 0 | Final attempt — validated firmware in both banks, both BFB2 settings exhausted |

## Key findings (worth carrying forward)

### 1. The dfu-util OB write "error" is misleading

When writing Option Bytes via `dfu-util -a 1 -s 0x1FFF7800:force -D ob.bin`, dfu-util **always** reports `Error during download get_status` at the data phase. This is **not** a write failure — STM32 auto-resets the chip when OB launch happens (immediately after a valid OB write), and dfu-util sees the USB disconnection as a status-read error. Verify by reading OB back after the "error"; the new bytes will be there. Don't retry on this error — you'll just trigger a second successful write.

This was the single biggest false-failure signal in the session. The 2026-04-29 memory note about OB writes being unreliable was misreading this same situation.

### 2. The Tier 1+Tier 2 recovery ceiling is real

After hours of varied attempts:

- **Flash bytes correct:** verified via byte-for-byte readback against compiled firmware (fwB-padded and fwC-padded both match perfectly in the banks they were written to)
- **Option Bytes correct:** OPTR = `0xFFFFF8AA` matches 89sabers factory state (BFB2=1, DBANK=1, nBOOT0=1, nSWBOOT0=1, RDP=0xAA = level 0, no read protection)
- **OTP clean:** all 0xFF, no permanent silicon writes
- **DFU bootloader functional:** chip enumerates correctly via SW1+SW2, accepts erase/write/read commands

Yet firmware doesn't boot. Solid green LED (not pulsing), no USB enumeration as runtime PID `1209:6668`, no boot sound from speaker.

The remaining failure modes all live beyond standard DFU's reach:

1. **Bank 2's separate Option Byte region at `0x1FFFF800`** — STM32L4 dual-bank devices have a SECOND OB region for Bank 2 (PCROP2_SR, PCROP2_ER, WRP2A_SR, WRP2A_ER, WRP2B_SR, WRP2B_ER). The DFU bootloader only exposes the first OB region at `0x1FFF7800`. If PCROP2 or WRP2 was set during the 2026-04-29 incident, Bank 2 firmware execution is blocked even though writes succeed and reads return correct data — PCROP only blocks read-from-CPU and execute-from-CPU, not external DFU access. **ST-Link via SWD is the only way to read or clear this region.**
2. **Silicon-level damage** to clock circuit (HSE crystal failure, brown-out reset triggering, voltage regulator damage) — would explain why the chip works in ROM bootloader (uses HSI internal RC) but hangs trying to boot firmware (requires HSE).
3. **Mass-erase-and-reset state** — sometimes STM32 chips need a full chip-erase via SWD with a hardware reset to clear deep state machine corruption.

All three require ST-Link.

### 3. Both `:leave` behaviors are bank-dependent

Flashing fwB-padded with `:leave` to Bank 1 hung at `Transitioning to dfuMANIFEST state` and required a kill. Flashing fwB-padded or fwC-padded to Bank 2 with `:leave` exited cleanly at ~72 seconds. Same firmware, same flag, different bank → different behavior. Suggests the manifest-phase bug is related to bank state at the moment of leave, not a bug in dfu-util or the firmware itself.

### 4. Forensic state capture is cheap and high-value

Before any write operation we captured the current state (Bank 1, Bank 2, OB) into a date-stamped backup folder. That folder is now permanent record at:

```
backups/89sabers-firmware-recovery-2026-04-30/
├── bank1-pre.bin                      256 KiB — Bank 1 contents at session start
├── bank2-pre.bin                      256 KiB — Bank 2 contents at session start (clean 207KB KyberStation build + 50KB erased trail)
├── option-bytes-pre.bin               64 B   — OB at session start (BFB2=0, the bricked state)
├── option-bytes-bfb2-set.bin          64 B   — Constructed OB candidate with BFB2=1 (proves the math)
├── option-bytes-after-2A.bin          64 B   — OB after T2.2A write, confirms BFB2=1 took effect
├── bank1-after-1A.bin                 256 KiB — Bank 1 after fwB-minimal flash (verifies bytes match)
├── option-bytes-after-1A.bin          64 B   — OB unchanged after Bank 1 flash
├── bank1-after-fwC.bin                256 KiB — Bank 1 after T1.fwC-2 flash
├── bank2-after-fwC.bin                256 KiB — Bank 2 after T1.fwC-1 flash (verifies fwC-padded byte-for-byte)
├── option-bytes-after-fwC.bin         64 B   — Final OB state with BFB2=1
└── otp-memory.bin                     1 KiB  — OTP region (all 0xFF, clean)
```

This is a complete record of an STM32L4 chip in the "writeable but not bootable" state. Useful reference if a similar issue ever recurs on the new board, or if anyone in the community runs into the same Option Bytes brick scenario.

### 5. SW1+SW2 hardware DFU recovery worked reliably throughout

Despite the chip's inability to boot firmware, the silicon-burned ROM bootloader DFU entry path worked every time. The buttons on this 89sabers V3.9 are tricky to press (small tactile switches, not user-facing) but the sequence (hold SW1 → tap SW2 → continue holding SW1 ~2s → release) was consistent. This confirms the chip's USB transceiver, BOOT0 pin (PH3), reset circuit, and ROM bootloader are all functional. The fault is purely in the path from "ROM bootloader exit → main flash execution start."

## What we accomplished

- ✅ Restored BFB2 from 0 → 1 via DFU OB write (the 2026-04-29 incident damage), confirmed bidirectional
- ✅ Got byte-perfect flashes of validated firmware into both banks
- ✅ Confirmed RDP is level 0 (ST-Link will work cleanly when it eventually arrives, if we want to attempt recovery)
- ✅ Confirmed OTP is clean (no permanent silicon damage from over-writes)
- ✅ Mapped the Tier 1+Tier 2 ceiling for STM32L4 recovery without ST-Link
- ✅ Documented the dfu-util "Error during download get_status" gotcha
- ✅ Built complete forensic record of a soft-bricked STM32L4 chip
- ✅ Updated [`reference_dfu_util_flash_workflow`](../../../.claude/projects/-Users-KK-Development-KyberStation/memory/reference_dfu_util_flash_workflow.md) memory with both findings
- ✅ Created [`project_proffieboard_v39_replacement_2026-05-01`](../../../.claude/projects/-Users-KK-Development-KyberStation/memory/project_proffieboard_v39_replacement_2026-05-01.md) memory documenting V3.9 retirement + new BT board incoming

## Decision: retire the V3.9, await replacement

A new Bluetooth-enabled Proffieboard variant has been ordered. The dead V3.9 is retired — we've gotten everything useful from it. Forensic dumps stay on disk indefinitely as a reference example.

## Next session handoff (when new board arrives)

Self-contained prompt for the next hardware session, paste-able into a fresh Claude conversation:

---

> The KyberStation team retired its 89sabers Proffieboard V3.9 hardware-validation board on 2026-05-01 after a 2026-04-29 Option Bytes incident soft-bricked it beyond DFU recovery. Full session archive: `docs/SESSION_2026-04-30_HARDWARE_RECOVERY.md`. A replacement Bluetooth-enabled Proffieboard variant has just arrived in the mail. Help me run the baseline-validation sweep on the new board so we can resume KyberStation hardware testing.
>
> Working directory: `/Users/KK/Development/KyberStation`
>
> Step 1 — Identify the board:
> 1. Plug battery + USB into the new board (no DFU button combo — let it boot normally)
> 2. Note board markings, MCU part number (visible on chip), BT module part number
> 3. Check macOS USB enumeration: `system_profiler SPUSBDataType | grep -B2 -A8 -E "Proffie|0x1209|0x6668"`
> 4. If it enumerates as Proffieboard runtime (`1209:6668`), firmware is alive — note serial number
> 5. If not, enter DFU via SW1+SW2: `dfu-util --list` should show `0483:df11`
>
> Step 2 — Capture forensic baseline (BEFORE any writes):
> 1. Create `backups/<vendor-and-model>-firmware-original-<date>/`
> 2. Dump Bank 1: `dfu-util -d 0483:df11 -a 0 -s 0x08000000:262144 -U bank1-factory.bin`
> 3. Dump Bank 2 (if dual-bank): `... -s 0x08040000:262144 -U bank2-factory.bin`
> 4. Dump OB: `dfu-util -d 0483:df11 -a 1 -s 0x1FFF7800:0x40 -U option-bytes-factory.bin`
> 5. Dump OTP: `... -a 2 -s 0x1FFF7000:0x400 -U otp-factory.bin`
> 6. Decode OB: read OPTR (bytes 0-3 little-endian) and check BFB2 (bit 20), DBANK (bit 22), RDP (bits 0-7), nBOOT0 (bit 27), nSWBOOT0 (bit 26)
>
> This factory baseline is the V3.9 "missing piece" — without ST-Link we couldn't capture the BT board's factory firmware on the dead V3.9, but on a working board we should grab it before doing anything else.
>
> Step 3 — Smoke-test the existing tooling against the new board:
> 1. KyberStation export → `config.h` for a simple blue blade
> 2. Drop config in `ProffieOS/config/`, point `ProffieOS.ino` at it
> 3. `arduino-cli compile --fqbn 'proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,usb=cdc_msc' --output-dir /tmp/proffie-build ProffieOS/ProffieOS.ino`
> 4. Strip 16-byte DFU suffix: `head -c $(($(stat -f%z ProffieOS.ino.iap) - 16)) ProffieOS.ino.iap > /tmp/firmware.bin`
> 5. Pad to bank size if dual-bank: `python3 -c "open('/tmp/fw-padded.bin','wb').write(open('/tmp/firmware.bin','rb').read() + b'\xff' * (262144 - $(stat -f%z /tmp/firmware.bin)))"`
> 6. Flash to whatever bank BFB2 selects: `dfu-util -d 0483:df11 -a 0 -s 0xADDR:leave -D /tmp/fw-padded.bin`
> 7. Power cycle, verify saber boots normally, runtime PID `1209:6668` enumerates
>
> Step 4 — BT validation (this is the new capability):
> 1. Identify what BT stack the board uses (Nordic nRF? Microchip? specific module name)
> 2. Check ProffieOS source tree for any BT-related code paths (`grep -r "Bluetooth\|BLE\|nrf" ProffieOS/`)
> 3. Test BT advertising: scan from phone or laptop, see if board advertises
> 4. If running Fredrik's Web Bluetooth POC firmware (https://github.com/profezzorn/lightsaber-web-bluetooth), test pairing + serial passthrough from a browser
>
> Step 5 — Update repo docs:
> - Add new board entry to `docs/HARDWARE_VALIDATION_TODO.md` with all the same Phase A/B/C content the V3.9 had
> - Update `CLAUDE.md` Current State if launch-relevant
> - Update memory file [`project_proffieboard_v39_replacement_2026-05-01`](../../../.claude/projects/-Users-KK-Development-KyberStation/memory/project_proffieboard_v39_replacement_2026-05-01.md) with the actual board model + chip part number
>
> Things to NOT do:
> - **Don't write Option Bytes** unless you have a specific reason and have ST-Link as recovery path (the 2026-04-30 session is a permanent reminder)
> - **Don't enable BT-related defines** in ProffieOS until you've confirmed the BT module is functional and you understand the wiring
> - **Don't flash a config that uses pin assignments from the old V3.9** without verifying the new board uses the same pins — vendor variants relocate pins
>
> Reference docs:
> - `docs/HARDWARE_VALIDATION_TODO.md` — Phase A/B/C protocol from V3.9
> - `docs/FLASH_GUIDE.md` — canonical end-user flash workflow
> - `docs/research/BLUETOOTH_FEASIBILITY.md` — v0.17 BT scope research
> - `backups/89sabers-firmware-recovery-2026-04-30/` — forensic example of a soft-bricked board
>
> Memory files relevant:
> - `reference_dfu_util_flash_workflow.md` (with the new "OB write error is misleading" finding from 2026-04-30)
> - `reference_brave_fsa_flag.md`
> - `project_proffieboard_v39_replacement_2026-05-01.md`

---
