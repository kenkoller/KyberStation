# Hardware validation TODO — v0.11.0 WebUSB flash

**Status**: Phases A + B + C ✅ **all complete on 2026-04-20 (89sabers Proffieboard V3.9, macOS + Brave)**, including recovery re-flash. Three real DFU protocol bugs caught + fixed. Brave is Chromium-based; Chrome/Edge/Arc should behave identically but are not independently verified. Cross-platform (Windows/Linux) and cross-board (V2, V3-OLED) still pending.

Everything in this checklist requires the 89sabers Proffieboard V3.9 to be plugged in. The WebUSB flasher has passing tests against a pure-TypeScript DfuSe mock, but the mock is our interpretation of the protocol — not a substitute for the real STM32L452RE bootloader.

## Phase A findings — macOS fallback (2026-04-20)

Phase A surfaced a real macOS-specific release-blocker that was never exercised by the mock tests:

- **Symptom**: connect succeeded at the USB layer but `connect.ts` threw `"Connected device has no writable internal-flash region. Refusing to flash."`
- **Root cause**: Chromium on macOS returns `null` for `USBAlternateInterface.interfaceName` on DFU alternate interfaces, even when the device advertises valid string descriptors — affects every Chromium-based browser on macOS (Chrome, Brave, Edge, Arc). Windows and Linux populate the field natively; macOS does not. Our parser had nothing to parse.
- **Confirmation**: a raw `GET_DESCRIPTOR(string, index N)` control transfer against the already-authorized device returned the expected DfuSe strings (`@Internal Flash  /0x08000000/0256*0002Kg`, etc.) — so the strings are on the board, just not surfaced through WebUSB's JS API on macOS.
- **Fix** (on `test/launch-readiness-2026-04-18`, uncommitted at time of writing): `DfuDevice.loadAlternates()` now falls back to reading the raw configuration descriptor + string descriptors directly when any alternate comes back nameless. Regression test covers the null-`interfaceName` path with a `macosNullInterfaceNames` mock option.
- **Outcome**: hard-refresh → reconnect produced the expected `STMicroelectronics STM32 BOOTLOADER — 512 KiB flash ready` banner and `findInternalFlash()` returned the correct 256×2KiB region. Phase A green.

### What was not captured in this pass

- Exact `wTransferSize` from the DFU functional descriptor — the ad-hoc console readback stalled after repeated reconnects. The connect flow's internal `readFunctionalDescriptor()` ran successfully (implied by the healthy banner), but the numeric value wasn't logged. Assumed `2048`. Grab it in Phase B via `DfuDevice.functionalDescriptor.transferSize` once a connection is stable.
- Disconnect → ready-state round-trip wasn't explicitly exercised. Implicit via repeated reconnects during troubleshooting, but worth an explicit check in Phase B.
- macOS is the only platform validated. Windows and Linux behave differently (`interfaceName` populated natively), so the fallback path is dormant there. Both are worth a smoke test before the v0.11.x tag.

## Phase A — connect-only test (zero flash risk) ✅ 2026-04-20

Goal: prove the browser can enumerate the board in DFU mode and read the descriptors we expect.

1. Open **Chrome / Edge / Brave** (not the embedded Claude preview — native Chromium handles the WebUSB permission flow differently).
2. `pnpm dev` and navigate to `http://localhost:<port>/editor`.
3. Put the Proffieboard in DFU mode. Two valid entry paths:
   - **Power-off entry** (no battery / USB unplugged): hold **BOOT**, plug USB in while still holding BOOT, keep held ~2s, release.
   - **Live-reset entry** (battery connected, or board already powered): hold **BOOT**, briefly press and release **RESET** while still holding BOOT, then release BOOT. This is the canonical method when the chip is already running ProffieOS — unplugging USB with a battery attached doesn't actually reset the chip, so BOOT0 is never resampled. Phase A 2026-04-20 confirmed this is the method that works on the 89sabers V3.9.
4. Output tab → **Flash to Saber** panel → accept disclaimer → **Connect Proffieboard (DFU mode)**.
5. Pick the STM32 BOOTLOADER entry in the Chrome picker.

### What to verify

- [ ] Success banner reads `STMicroelectronics STM32 BOOTLOADER — 512 KiB flash ready` (or 256 KiB for a V2 board).
- [ ] Browser console has zero WebUSB errors.
- [ ] Disconnect button returns to the "Connect Proffieboard" ready state.

### What to record

- The exact `interfaceName` string the board reports — paste it into the bug / PR note. If it doesn't match `@Internal Flash  /0x08000000/256*0002Kg` the memory layout parser may need to accommodate the real variant.
- The `wTransferSize` from the DFU functional descriptor. The flasher reads it via `DfuDevice.readFunctionalDescriptor()` and logs via `dfu.functionalDescriptor` — if it's not 2048 the fallback path is exercising.

## Phase B — dry-run test (zero flash risk) ✅ 2026-04-20

Ran with a 242,376-byte ProffieOS V3 .bin (stock `default_proffieboard_config.h`, later replaced by our fixed v3-standard.h). The flasher walked erase → writing → verifying → done with the final banner `Dry run complete. No bytes were written.` No protocol errors. No DNLOAD transfers issued (confirmed by clean completion — any real write attempt against the uninitialised erase state would have stalled).

## Phase B — dry-run test (original plan) — for reference only

Goal: walk through the full protocol sequence without writing any bytes.

**Prerequisite**: a ProffieOS `.bin` for the board variant. Two paths:
- **Remote build (recommended)**: trigger `.github/workflows/firmware-build.yml` via `gh workflow run firmware-build.yml` and download the `proffieos-7x-v3-standard.bin` artifact from the completed run.
- **Local build**: `arduino-cli` is already installed. Run `arduino-cli core install proffieboard:stm32l4` once, stage `firmware-configs/v3-standard.h` into `ProffieOS/config/config.h`, then `arduino-cli compile --fqbn 'proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,usb=cdc_msc' --output-dir /tmp/proffie-bin ProffieOS`. ~2–5 min.

1. Complete Phase A.
2. In the connected state, tick the **Dry run** toggle.
3. Pick the bundled V3 standard firmware variant. If `apps/web/public/firmware/` isn't populated yet, upload your own `.bin` from a previous `arduino-cli compile` build (check `/var/folders/.../ProffieOS*.bin` or re-run the compile).
4. Click **Run dry run**.

### What to verify

- [ ] Progress bar advances through erase → writing → verifying → done without issuing a single `DNLOAD`.
- [ ] Final status message contains `DRY RUN complete. No bytes were written.`
- [ ] Block count displayed in the progress message matches `ceil(firmware_size / wTransferSize)`.
- [ ] Erase page count matches what the memory layout parser would expect for that firmware size.

### What to record

- The block count and byte-exact byte counts shown. If they look off vs. `ceil(binary_size / 2048)`, the wTransferSize or memory layout is wrong.

## Phase C — real flash ✅ 2026-04-20

Ran with the fixed v3-standard.h firmware (209,864 bytes, 103 blocks at 2048 transferSize). **Blade ignited blue on first power press after replug.** USB serial enumerated as `/dev/tty.usbmodem2081399A4B301` (CDC), audio DAC confirmed working via ProffieOS voice-pack "font not found" / "SD card not found" announcements. Recovery re-flash of the same binary landed cleanly end-to-end with no errors in the FlashPanel — confirming the reflash loop users hit every time they tweak a config.

### Three DFU protocol bugs caught + fixed this session

1. **`verifyFlash` state bug** — `setAddressPointer` leaves the device in `dfuDNLOAD_IDLE`, but `UPLOAD` requires `dfuIDLE`. Real hardware correctly returned `STALL` on `UPLOAD block 2`; the mock accepted it. Fix: `abort()` between `setAddressPointer` and the upload loop. ([`DfuSeFlasher.ts:verifyFlash`](../apps/web/lib/webusb/DfuSeFlasher.ts))

2. **Manifest state bug** — after `UPLOAD` verify the device sits in `dfuUPLOAD_IDLE`, but manifest's zero-length `DNLOAD` at block 0 requires `dfuIDLE`. Hardware returned `STALL` on `DNLOAD block 0`. Fix: `abort()` before the manifest `download(0, undefined)`. ([`DfuSeFlasher.ts`](../apps/web/lib/webusb/DfuSeFlasher.ts) around the manifest call site)

3. **Manifest-completion error handling** — STM32 DfuSe bootloader resets the USB bus as part of manifest (`bitManifestationTolerant=0`). The resulting `controlTransferIn` failure comes back as a raw `DOMException`, not our `DfuError`. The old catch block only swallowed `DfuError` and mis-reported a successful flash as a red "transfer error" banner. Fix: any error during post-manifest polling is treated as success. ([`DfuSeFlasher.ts:waitForManifestComplete`](../apps/web/lib/webusb/DfuSeFlasher.ts))

### Followup

- ~~**Tighten `MockUsbDevice`** to enforce DFU state rules~~ — ✅ done 2026-04-20. `strictState` option rejects `UPLOAD` from non-idle states and `DNLOAD` from non-idle states; `resetAfterManifest` option throws a raw DOMException on the post-manifest GET_STATUS to simulate STM32's bus reset. Three regression tests (one per bug) added in `apps/web/tests/webusb/DfuSeFlasher.test.ts` under `describe('... regression: 2026-04-20 ...')`. Each test was independently verified to fail if its corresponding fix is reverted.

## Phase C — real flash (original plan) — for reference only

Only proceed after Phase A and B are both clean.

Recovery plan is documented in `docs/WEBUSB_FLASH.md` under "Recovery procedure" — the BOOT-button hardware DFU path always works even if the firmware we write is broken, so a mid-flash failure is self-recoverable.

1. **Back up current state**: SD card (the `config.h` you care about), and if you have one, a known-good ProffieOS `.bin` (from `arduino-cli compile --output-dir`).
2. Connect board in DFU mode → disable **Dry run** → click **Flash firmware**.

### What to verify

- [ ] Flash completes (all phases end green).
- [ ] **Verify phase** runs after write (progress bar re-advances 80%→95% while reading back).
- [ ] On-hardware: unplug → plug (normal USB, no BOOT button) → board boots into new firmware.
- [ ] Blade ignites with the preset compiled into the firmware.

### What to record

- Wall-clock duration of each phase (erase / write / verify / manifest). If any phase is dramatically longer than the mock's expectation, the poll-timeout handling may need tuning.
- Any error messages from the FlashPanel. The mock error paths are exhaustive but hardware can surface things we haven't simulated.

## What's still pending (post-2026-04-20)

Validated **only** on macOS 15 (Sonoma) + Brave + Proffieboard V3.9 (89sabers, STM32L452RE). Brave is Chromium-based; Chrome/Edge/Arc should behave identically but are not independently verified. Before promoting WebUSB flash to "validated for launch on all supported configurations":

- **Windows + Chrome/Edge** — different WebUSB driver path (WinUSB), historically the most fragile in the WebUSB ecosystem.
- **Linux + Chrome** — udev rules required, often a sharp edge for new users; worth a smoke test.
- **Proffieboard V2** (STM32L433CC) — different memory layout (256 KiB vs 512 KiB); the layout parser handles both but we haven't proven it on hardware.
- **Proffieboard V3 + OLED** — same chip as V3 standard, but the OLED build adds ENABLE_SSD1306; presumably no DFU-protocol implications, but worth confirming the OLED firmware actually flashes + boots.
- **Phone-camera QR scan** of the Kyber Glyph in `/editor` — not WebUSB but adjacent; a complete launch story includes "scan a friend's design and import it".

### Doc cleanup after the cross-platform sweeps

1. Update `CLAUDE.md`'s WebUSB row to "validated on all supported configurations" once the cross-board / cross-OS sweeps are done.
2. Archive this file or fold its current state into a one-line "validated" note in `WEBUSB_FLASH.md`.
3. Open a confidence-building blog post / README section noting the validated hardware (board revision + ProffieOS version).

## If validation fails

1. Record the exact failure mode (screenshot + console log).
2. Check whether the failure repros against the mock by writing a test that encodes the observed descriptor string / error.
3. If it doesn't repro → fix the mock + add the test + fix the real bug. That way the fix is regression-protected forever.

## What's already mitigated by code

- **Silent flash corruption**: post-write UPLOAD-based readback verification, enabled by default.
- **wTransferSize assumption**: the flasher prefers the bootloader-advertised value over the hardcoded 2048 fallback.
- **Poll-timeout bus-spam**: `pollUntilIdle` honours the 24-bit `bwPollTimeout` from the GET_STATUS response.
- **Recovery from mid-flash error**: the STM32 ROM bootloader BOOT-pin path always works; the FlashPanel error message explicitly calls this out.
- **First-flash surprise**: the disclaimer gate + sessionStorage ack prevents accidental one-click flashes before the user has read the risks.
