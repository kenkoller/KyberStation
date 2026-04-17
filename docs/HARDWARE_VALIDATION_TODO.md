# Hardware validation TODO — v0.11.0 WebUSB flash

**Status**: all protocol logic merged, **not yet validated against real hardware.**

Everything in this checklist requires the 89sabers Proffieboard V3.9 to be plugged in. The WebUSB flasher has 43 passing tests against a pure-TypeScript DfuSe mock, but the mock is our interpretation of the protocol — not a substitute for the real STM32L452RE bootloader.

## Phase A — connect-only test (zero flash risk)

Goal: prove the browser can enumerate the board in DFU mode and read the descriptors we expect.

1. Open **Chrome / Edge / Brave** (not the embedded Claude preview — native Chromium handles the WebUSB permission flow differently).
2. `pnpm dev` and navigate to `http://localhost:<port>/editor`.
3. Put the Proffieboard in DFU mode: unplug → hold **BOOT** → plug USB → release BOOT.
4. Output tab → **Flash to Saber** panel → accept disclaimer → **Connect Proffieboard (DFU mode)**.
5. Pick the STM32 BOOTLOADER entry in the Chrome picker.

### What to verify

- [ ] Success banner reads `STMicroelectronics STM32 BOOTLOADER — 512 KiB flash ready` (or 256 KiB for a V2 board).
- [ ] Browser console has zero WebUSB errors.
- [ ] Disconnect button returns to the "Connect Proffieboard" ready state.

### What to record

- The exact `interfaceName` string the board reports — paste it into the bug / PR note. If it doesn't match `@Internal Flash  /0x08000000/256*0002Kg` the memory layout parser may need to accommodate the real variant.
- The `wTransferSize` from the DFU functional descriptor. The flasher reads it via `DfuDevice.readFunctionalDescriptor()` and logs via `dfu.functionalDescriptor` — if it's not 2048 the fallback path is exercising.

## Phase B — dry-run test (zero flash risk)

Goal: walk through the full protocol sequence without writing any bytes.

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

## Phase C — real flash (actual flash risk)

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

## After hardware validation

Once all three phases pass:

1. Update `CLAUDE.md` — move the WebUSB flash entry from "tested against mock" to "tested on hardware".
2. Remove or archive this file.
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
