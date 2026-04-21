# Next hardware validation session — prompt

Self-contained prompt for the session that picks up where [`HARDWARE_VALIDATION_TODO.md`](HARDWARE_VALIDATION_TODO.md) Phase A left off on 2026-04-20. Paste the block below into a fresh `claude` (or `claude-code`) session opened in the KyberStation repo.

The prompt assumes:

- Branch `test/launch-readiness-2026-04-18` is checked out.
- 89sabers Proffieboard V3.9 (STM32L452RE) is on hand.
- macOS + native Chrome / Edge / Brave available.
- No other Claude session is actively editing `apps/web/lib/webusb/` or `apps/web/tests/webusb/`.

---

```
Continue hardware validation for KyberStation's WebUSB flash (feature #16).
Branch: test/launch-readiness-2026-04-18. Hardware on hand: one 89sabers
Proffieboard V3.9 (STM32L452RE), Mac laptop. Goal: finish as many
launch-critical hardware checks as possible in one focused session.

CONTEXT FROM PRIOR SESSION (2026-04-20)
- Phase A ✅ complete on this board. Docs at docs/HARDWARE_VALIDATION_TODO.md.
- Surfaced + fixed a release-blocker: Chrome on macOS returns null for
  USBAlternateInterface.interfaceName on DFU alternates. DfuDevice now
  falls back to raw GET_DESCRIPTOR(config + string) when any alternate
  is nameless. Regression test added. Change landed in commit c70b4e5
  (misleadingly titled "feat(workbench): W4..." because a parallel
  session's commit accidentally swept up the staged hardware files —
  the code is correct, tests pass, just ignore the title mismatch).
- DFU entry method confirmed for this board: hold BOOT, tap RESET while
  BOOT held, release BOOT. (Not "unplug + hold BOOT + replug" — that
  doesn't reset the chip when the battery is connected.)

WHAT TO DO IN ORDER

1. Verify the branch is clean and the webusb tests pass:
   `git status && pnpm --filter @kyberstation/web test -- tests/webusb`
   If the prior session's macOS fix is still staged, commit it first
   with the message from docs/NEXT_HARDWARE_SESSION.md (or a fresh
   message that preserves the Co-Authored-By footer) so Phase B/C
   commits build on a clean base.

2. Prep firmware. Two paths — pick whichever is faster for your setup:
   a. Remote build: `gh workflow run firmware-build.yml` → wait for run
      to go green (`gh run watch`) → `gh run download --name proffieos-7x-v3-standard`
      to fetch the .bin locally.
   b. Local build: `arduino-cli core update-index && arduino-cli core
      install proffieboard:stm32l4`, then stage
      `firmware-configs/v3-standard.h` into `ProffieOS/config/config.h`,
      then `arduino-cli compile --fqbn
      'proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,usb=cdc_msc'
      --output-dir /tmp/proffie-bin ProffieOS`. Pick the .bin from
      /tmp/proffie-bin.

3. BEFORE any real flash: back up what's currently on the board.
   - Pop the SD card out, copy the whole SD contents to a safe folder
     (especially config.h/config.ini, any presets, sound fonts).
   - If you have a known-good ProffieOS .bin from a prior compile, save
     that too — it's the re-flash-back target if Phase C goes wrong.

4. Phase B — dry-run (zero flash risk). In the FlashPanel, connect via
   BOOT+RESET, tick Dry run, upload the .bin via "Custom .bin (power
   user) → Choose .bin file...", click the run button. Verify:
   - Progress walks erase → writing → verifying → done
   - Final status contains "DRY RUN complete. No bytes were written."
   - Block count == ceil(firmware_size / 2048)
   - No DNLOAD control transfers were issued
   Record: exact block count + wTransferSize (probe
   `DfuDevice.functionalDescriptor.transferSize` via a DevTools console
   snippet, or add a one-line console.log during the session and revert).

5. Phase C — real flash. Only if Phase B was clean. Turn off Dry run,
   click Flash firmware. Verify:
   - All phases end green
   - Verify phase runs after write (progress re-advances 80→95%)
   - Unplug USB, replug normally (no BOOT). Board boots into new firmware.
   - Blade ignites with the preset baked into firmware-configs/v3-standard.h.
   - Record wall-clock per phase; paste any FlashPanel errors verbatim.
   If Phase C errors: BOOT+RESET back into DFU and re-flash your known-
   good .bin. That path is documented in docs/WEBUSB_FLASH.md → Recovery.

6. Recovery proof. After a successful Phase C, do one more full cycle:
   - BOOT+RESET back into DFU
   - Flash the same binary again
   - Reboot and confirm the blade still ignites identically
   This proves re-flashing is safe + repeatable — the scenario a user
   hits every time they tweak their config.

7. SD card + config.h flow (the other half of KyberStation's value
   proposition, not just the flasher itself):
   - In the KyberStation editor, build a distinct preset (different
     blade style + ignition than what the firmware shipped with)
   - Export the config.h via the Code Output panel
   - Copy that file onto the saber's SD card, replacing whatever's there
   - Reboot the saber, confirm it boots with the new preset
   - This proves the end-to-end "design in KyberStation → flash to
     board → boot with your config" story that the app exists to tell.

8. Update docs/HARDWARE_VALIDATION_TODO.md for whatever phases you
   completed. If all of 4–7 pass, move the WebUSB flash feature in
   CLAUDE.md from "🧪 merged, pending hardware validation" to "✅
   validated on Proffieboard V3.9 (macOS/Chrome)". That unblocks the
   v0.11.x tag.

OUT OF SCOPE FOR THIS SESSION (log as followups, don't attempt unless
you have the hardware):
- Windows / Linux validation of the WebUSB flow
- Proffieboard V2 or V3+OLED board variants
- BOOT-pin-only DFU recovery rigorously retested
- Phone-camera QR scan of the Kyber Glyph in the Crystal panel

END-OF-SESSION WRAP
- One commit per phase (or one cumulative) on the branch, with a message
  that references which phase + any findings
- Update CLAUDE.md's "Current State" section with a 2-3 bullet summary
  of what got validated today
- If any new bugs found during Phase B/C, file them as docs/ notes
  with enough detail that a future session can pick them up cold
```
