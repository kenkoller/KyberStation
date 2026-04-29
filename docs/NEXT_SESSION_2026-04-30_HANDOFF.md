# Tomorrow's session kickoff — 2026-04-30

> **Paste this entire prompt verbatim to start the new session.**
> The fresh session has zero memory of yesterday's work. Everything you need is here or in linked files.

---

## Context (read this in order)

You are continuing KyberStation launch prep. **Hard launch deadline: Friday May 1, 2026.** Today is April 30. ~24-30 hours of working time remain.

Read these in order before doing anything else:

1. `CLAUDE.md` — project context (always loaded automatically)
2. `docs/SESSION_2026-04-29_LAUNCH_POSTURE.md` — strategic decisions locked yesterday + hardware test outcome
3. `docs/LAUNCH_48H_CHECKLIST.md` — prioritized punch list
4. Memory files at `~/.claude/projects/-Users-KK-Development-KyberStation/memory/`

## Status snapshot (close of 2026-04-29 ~03:00 AM)

### What shipped yesterday
- **PR #115 merged** — `fix(sound): scan/load directory handle iterator yields tuples, not handles`. Real launch-blocker. Library scanner now works for modern Proffie nested-layout fonts.
- **PR #122 merged** (parallel session) — `feat(sound): recognize 12 modern Proffie / Kyberphonic sound categories`. Eliminates "30 unrecognized files" warnings.
- 32-font private library validated at `~/SaberFonts/`
- Documentation written: session archive + 48h checklist + 7 project memories

### What's IN-FLIGHT
- **PR #124** — `fix/audio-engine-shared-mute-state` — Done per latest PR body, ready to merge. Fixes preview button silence. **Check CI green and merge first thing.**
- **PR #118** — `fix/audio-library-brave-warning-copy` — Open. Cuts a launch-day Brave-user support ticket.
- **`fix/audio-engine-smoothswing-and-hotswap`** — Worktree active, no PR yet.
- **Ignition/retraction sound swap** — Task spawned, no branch yet.

### Hardware test outcome (the saga)
- KyberStation codegen + arduino-cli compile pipeline **VALIDATED** ✅
- 207 KB binary built cleanly from 89sabers' official OBI config
- dfu-util flash protocol works (bytes write, erase, verify all succeed)
- **89sabers V3.9 test saber stuck in fault loop** — flashed firmware writes successfully but won't boot on this specific hardware
- Chip is **NOT bricked** (recoverable via SW1+SW2 → STM32 ROM bootloader)
- Email sent to 89sabers (`pang89sabers@outlook.com` + `my89sabers@hotmail.com`) requesting factory firmware binary
- ST-Link V2 ordered (HiLetgo, Amazon Prime) — **arrives today**

### Critical gotchas discovered (full details in memory files)
- 89sabers V3.9 ships with **`BFB2=1` in Option Bytes** (boot from Bank 2). Standard ProffieOS firmware compiled for Bank 1 (`0x08000000`) won't boot.
- KyberStation's OUTPUT panel only generates a **style snippet**, not a complete `config.h` (multi-preset mode required for full config). Need to add this to FLASH_GUIDE.
- KyberStation's WebUSB FlashPanel **reported success but didn't actually transition the chip out of DFU**. Separate bug from the dfu-util path. Post-launch fix.
- arduino-cli's `.iap` output has a **DFU suffix** (last 16 bytes) that dfu-util rejects when flashing to STM32 ROM bootloader. Strip with `head -c $((SIZE - 16))`.

## Today's priorities (in order)

### P0 (must ship — launch blockers if not done)
1. **Recover the test saber** via ST-Link OR 89sabers email response. Once recovered, validate one full design→compile→flash→ignite cycle end-to-end. This is the make-or-break validation for the launch flash story.
2. **Write `docs/FLASH_GUIDE.md`** — copy-paste-ready for users. Must include:
   - `brew install dfu-util` step
   - DFU mode entry (POWER + AUX combo on saber, OR SW1+SW2 hardware)
   - **MANDATORY pre-flash backup**: `dfu-util -d 0x0483:0xdf11 -a 0 -U backup.bin -s 0x08000000:524288` (this is the single most important user-protection step — turns "bricked saber" into "30-second recovery")
   - Compile command (arduino-cli with V3 fqbn)
   - Strip DFU suffix step
   - dfu-util flash command with `:leave`
   - **Vendor-customized board warning** (89sabers BFB2=1, KR Sabers / Saberbay may have similar quirks)
   - **Recovery instructions** if custom flash fails (re-enter DFU via SW1+SW2, restore from backup.bin)
   - Brave flag note (`brave://flags/#file-system-access-api`)
   - Disclaimer: WebUSB FlashPanel is experimental, dfu-util is the validated path
3. **Update README.md** — launch-ready language, beta disclaimer, link to FLASH_GUIDE
4. **Strengthen FlashPanel disclaimer copy** in `apps/web/components/editor/FlashPanel.tsx` — explicitly warn about vendor-customized boards + require user acknowledgement they have a recovery plan
5. **WebUSB FlashPanel decision**: either fix the manifest-phase bug OR feature-flag it off for launch. The bug is: reports "flash complete" but chip doesn't transition out of DFU. Users could think they flashed and re-flash, leaving their boards in confused states. **Safer option**: ship with FlashPanel disabled, link users to FLASH_GUIDE.md (dfu-util workflow). Fix WebUSB properly post-launch with proper hardware-test infrastructure.

### P1 (in scope if time permits)
- Merge PR #124 (audio mute fix) — already done per body, just needs CI green + merge
- Merge PR #118 (Brave warning copy)
- Test on a clean machine if possible

### P2 (out of scope for launch — file as post-launch issues)
- KyberStation WebUSB FlashPanel `:leave` / manifest phase bug
- Ignition/retraction sound swap fix
- SmoothSwing + hot-swap audio fixes
- Electron flash companion (v0.16+ planned)

## Saber recovery paths (whichever lands first wins)

### Path A — 89sabers responds to email
Email sent ~03:00 last night to `pang89sabers@outlook.com` and `my89sabers@hotmail.com`. Subject: "Proffieboard V3.9 stuck after firmware flash, need recovery help". Asked for factory firmware binary + Option Byte defaults. CCSabers contact form also notified.

If they reply with a `.bin` or `.dfu`:
1. Re-enter DFU on saber (SW1+SW2)
2. Flash with dfu-util: `dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08040000:leave -D <their-binary>` (note: address might be 0x08000000 OR 0x08040000 depending on whether they expect BFB2=1 or BFB2=0 — confirm with them)
3. Should boot to factory state

### Path B — ST-Link arrives via Amazon Prime
HiLetgo ST-Link V2 expected today. When it arrives:
1. Install STM32CubeProgrammer (free download from st.com — start the install when you wake up)
2. Connect ST-Link to V3.9's SWD pads on the BOTTOM of the board:
   - SWDIO → SWDIO
   - SWCLK → SWDCLK
   - GND → GND
   - 3.3V leave disconnected (power saber from battery)
3. Open STM32CubeProgrammer → connect via ST-Link
4. **First: Option Bytes tab → reset to factory defaults** (this might be all that's needed)
5. **Then: Erasing & Programming → flash** the 89sabers OBI config binary you compiled last night
6. Saber should recover

The compiled 89sabers OBI binary is already on disk: `/tmp/89sabers-firmware.bin` (207 KB, stripped of DFU suffix). May not survive a Mac restart since it's in `/tmp` — re-compile if needed:
```bash
arduino-cli compile \
  --fqbn 'proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,usb=cdc_msc' \
  --output-dir /tmp/proffie-build-89sabers \
  ~/Downloads/Proffie7.12_V3_89Sabers/ProffieOS/ProffieOS.ino
```
The 89sabers ProffieOS tree at `~/Downloads/Proffie7.12_V3_89Sabers/ProffieOS/` is already configured with `89V3_OBI.h` as `CONFIG_FILE`.

## Files / locations to know

- `~/SaberFonts/` — 32-font live library (scanner-ready)
- `~/SaberSFX/` — wilhelm + voice packs + Kyberphonic bonus extras (2.2 GB)
- `~/SaberFontPacks/JediSurvivor/` — staging pack (8 unflattened characters)
- `~/Downloads/Proffie7.12_V3_89Sabers/` — official 89sabers OS pack (extracted)
- `~/Development/KyberStation/ProffieOS/` — primary ProffieOS source clone (currently configured with `bladeforge-recovery.h`, has `.bak` of original `ProffieOS.ino`)
- `~/Development/KyberStation/firmware-configs/v3-standard.h` — validated V3 reference config
- `/tmp/proffie-build-89sabers/` — compiled 89sabers OBI binary (may not survive restart)
- `/tmp/89sabers-firmware.bin` — stripped binary ready for dfu-util (may not survive restart)

## Things to NOT do

- **Don't touch Option Bytes again unless ST-Link is connected and you have STM32CubeProgrammer ready as a recovery path.** Last night's BFB2 clear contributed to the saber's stuck state.
- **Don't keep flashing custom configs in DFU mode hoping they'll boot.** If 89sabers' own OBI config doesn't boot, the issue is below the application layer (option bytes, custom bootloader stage, factory image expectations).
- **Don't rebuild WebUSB FlashPanel during launch prep.** It's broken in a way we don't fully understand. Document around it for now, fix post-launch.
- **Don't attempt mobile features.** iOS hard-blocked, Android marginal value (per `project_mobile_deferred` memory).

## What success looks like at end of today

1. ✅ Test saber recovered to factory state OR validated working with our compile-and-flash workflow
2. ✅ `docs/FLASH_GUIDE.md` written and linked from README
3. ✅ README updated with launch-ready language + beta disclaimer
4. ✅ FlashPanel disclaimer strengthened
5. ✅ At least PR #124 merged (audio mute fix)
6. ✅ Launch announcement post drafted (per `docs/LAUNCH_PLAN.md` + `docs/LAUNCH_ASSETS.md`)

If all 6 land today, tomorrow (Friday May 1) is launch day. Push v0.16.0 release tag, post to r/lightsabers + r/proffieboards, watch issues, respond fast.

## Spawn parallel work as needed

Per the parallel-agent dispatch memory, fan out independent workstreams:
- One session can write FLASH_GUIDE.md + README updates (docs lane)
- One session can debug the WebUSB FlashPanel issue (post-launch prep)
- Main session handles ST-Link recovery + final integration

## Session opens here

When you start, do these in order:

1. Run `git status && git log --oneline -5` to see current branch state
2. Check email for 89sabers response
3. Check Amazon delivery status for the HiLetgo ST-Link V2
4. Run `gh pr list --state open` to see in-flight PRs
5. Open `docs/LAUNCH_48H_CHECKLIST.md` and `docs/SESSION_2026-04-29_LAUNCH_POSTURE.md` for full context
6. Begin with whichever recovery path is closest (email response OR ST-Link delivery)
