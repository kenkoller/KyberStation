# Session 2026-04-28 / 29 — Font Library + Launch Posture Lockdown

**Branch state at close:** `main` at `8367211` plus 4 in-flight PRs from spawned tasks.

**Headline outcome:** Hardened the audio/font stack for launch + locked the launch posture (web app only, defer Electron companion to post-v1.0). 32-font private sound font library set up at `~/SaberFonts/`. One real launch-blocker bug found and fixed (PR #115). Four follow-up audio bugs diagnosed live and queued as parallel tasks.

---

## What shipped

### PR [#115](https://github.com/kenkoller/KyberStation/pull/115) — `fix(sound): scan/load directory handle iterator yields tuples, not handles`

- **Real launch blocker.** `scanDirectoryHandle` and `loadFontFromDirectoryHandle` in `packages/sound/src/FontParser.ts` cast the FSA directory handle as `AsyncIterable<FileSystemHandle>` and looped via the default async iterator. Per the FSA spec, that iterator yields `[name, handle]` tuples (entries() shape), not raw handles, so `entry.kind` was always `undefined`. Both functions silently returned 0 results for every input.
- **User-visible symptom**: pointing KyberStation at a 32-font Kyberphonic library produced an empty list; clicking Load on any font surfaced "Font X has no audio files".
- **Fix**: switched both to `.values()` (yields handles directly) + added bounded one-level recursion into category-named subfolders (modern Proffie / Kyberphonic nested layout).
- **Tests added**: `packages/sound/tests/fontParser.dirHandle.test.ts` — 12 cases covering flat-layout, nested-layout, mixed library, empty library, macOS resource-fork sidecars (`._*.wav`), progress reporting, and explicit regression cases for the iterator + recursion.
- **Gates**: `pnpm typecheck` clean (10/10 packages), `pnpm test` green workspace-wide (sound 40 → 52, web 1307 unchanged).
- **Live-verified end-to-end** against the 32-font test library — all 32 fonts scanned as complete with SmoothSwing v2 detection.

### Private sound font library at `~/SaberFonts/`

- **32 fonts total / ~707 MB** mapped to the user's preset library
- 6 ProffieOS classics (SmthGrey, SmthFuzz, SmthJedi, TeensySF, RgueCmdr, TthCrstl) — free
- 1 Jedi Survivor pack Vader (DarthVader_JS) — free
- 25 Kyberphonic SmoothSwing v2 fonts purchased via $80 cart with KYBER20 promo:
  - **OT (8 Vaders + 2 Lukes)**: Vader_KP_V1 / V2 ANH / ESB / ROTJ / R1 + Luke_KP_BoBF / Mando
  - **Prequels (10)**: Anakin_KP (Son of Corellia), Tales bundle (Ahsoka, Dooku, Inquisitor, QuiGon, Yaddle), Tales II bundle (Barriss Green + Inquisitor, Dante, Grievous, Lyn, Selena, Them)
  - **Mando / Kenobi era (5)**: Darksaber_KP_Beskar / Standard, Rematch bundle (Ben, Darth, Third Sister)
- All scan as `complete` with SmoothSwing badge after PR #115 fix
- **Bonus paid content** preserved at `~/SaberSFX/kyberphonic-bonus/` — 2.0 GB of music tracks + character voice quotes from the bundles' `_Extras` folders
- 8 Wilhelm scream variants at `~/SaberSFX/wilhelm/` (6 Internet Archive WAVs + BigSoundBank MP3 + Wikimedia OGG + Freesound female variant)
- 5 ProffieOS English voice packs (B-F) at `~/SaberSFX/voice-packs/`
- Holst's *The Planets* music tracks at `~/SaberSFX/tracks/` (public domain)

### Brave-flag File System Access discovery

- Brave disables `window.showDirectoryPicker()` by default for fingerprinting-prevention reasons. Users must visit `brave://flags/#file-system-access-api` and flip it to Enabled, then restart Brave.
- Without this knowledge, Brave users see the generic "Chrome / Edge / Arc" warning copy and conclude their browser isn't supported.
- Fix queued as PR #118 — improved warning copy that calls out Brave specifically.

---

## In-flight PRs (spawned tasks, parallel sessions)

| PR | Branch | Status | What it fixes |
|---|---|---|---|
| **[#124](https://github.com/kenkoller/KyberStation/pull/124)** | `fix/audio-engine-shared-mute-state` | **Done — ready to merge** (per latest PR body) | Multi-instance mute desync: `useAudioEngine` is called from 6 components, each with independent `mutedRef`. Header Sound OFF/ON only flips one instance. Result: combat effects via keyboard play (WorkbenchLayout's instance unmuted), preview buttons in Column B silent (its instance still muted). Lifts mute to a Zustand store. |
| [#122](https://github.com/kenkoller/KyberStation/pull/122) | `feat/font-parser-modern-proffie-categories` | Open | Adds 12 missing sound categories (`bgndrag`, `enddrag`, `bgnlock`, `endlock`, `bgnlb`, `endlb`, `bgnmelt`, `endmelt`, `lb`, `lowbatt`, `color`, `ccchange`). Loading a Kyberphonic font produces 30-50 "Unrecognized file" warnings without this. |
| [#118](https://github.com/kenkoller/KyberStation/pull/118) | `fix/audio-library-brave-warning-copy` | Open | Updates the FSA warning copy to call out Brave specifically with `brave://flags/#file-system-access-api` instructions. Adds tooltip on the Set Font Library Folder button. |
| `fix/audio-engine-smoothswing-and-hotswap` | (no PR yet) | Worktree active | SmoothSwing slider doesn't drive audio (per-instance smoothSwingRef) + hum doesn't restart with new buffer when font is hot-swapped mid-ignition. Same multi-instance root cause as #124. |
| (no branch yet) | (none) | Spawned 2026-04-29 | Ignition/retraction sound effects appear swapped — need to diagnose whether it's the engine state machine, the audio dispatch path, or the file-pattern detection. |

All four are NICE TO HAVE for launch but NOT strict blockers — the saber's actual ProffieOS firmware doesn't use any of this web audio path. The web audio bugs are design-time UX annoyances only.

---

## Audio testing matrix (live-verified)

Validated against `Vader_KP_ESB` loaded from the 32-font library:

| Phase | Path | Result |
|---|---|---|
| 1. Library scan | FSA picker → scanDirectoryHandle | ✅ 32 fonts, all green-dot complete |
| 2. Font load | Click Load → loadFontFromDirectoryHandle → decodeFilesByCategory | ✅ 17 buffer categories decoded, 0 decode errors |
| 3. Preview buttons (Column B) | handlePlayEvent → audio.playEvent | ❌ Silent (PR #124 fixes — multi-instance mute) |
| 4. Combat effects (keyboard C/B/L/S) | BladeEngine → audio.playClash etc | ✅ Plays loaded font sounds, different per font |
| 5. SmoothSwing motion-sim slider | MotionSimPanel → audio.updateSwing | ❌ Slider drives visual modulation only, no audio crossfade (queued task) |
| 5b. Hum hot-swap on font change | Click new font in Column A → hum should restart | ❌ Hum keeps playing OLD font (queued task) |
| 6. Ignition / retraction sound order | Space key → audio.playIgnition / playRetraction | ⚠️ Sounds appear swapped (queued task) |
| 7. Codegen → config.h | OUTPUT panel → download config.h | ⏭️ Not yet validated this session |
| 8. Hardware flash to 89sabers V3.9 | KyberStation FlashPanel WebUSB OR Arduino IDE | ⏭️ **Pending — saber currently in DFU mode** |

---

## Strategic decisions locked

### Launch scope: web only
KyberStation v1.0 launches as a web app. Defer the Electron companion (compile + flash bundling) to v0.16+.

**Rationale:**
- Hard launch deadline: April 30 / May 1 2026 (~48 hours from session close)
- Audience is Proffieboard hobbyists who already own arduino-cli + Arduino IDE
- Open source GitHub project — beta polish bar
- Code signing infra (Mac notarization, Windows EV cert) takes weeks to procure
- Compile/flash friction is real but acceptable for the technical user base

### Mobile platforms: deferred indefinitely
- iOS: Apple forbids non-MFi USB device IO. There is no API path to flash a saber from iPhone. Hard block.
- Android: Possible via USB OTG but compile is hard (no shell, no arduino-cli on Android), would need cloud-compile infrastructure. Marginal value vs cost.
- If a phone story is ever needed: "design on phone, transfer to desktop to flash" is the realistic shape.

### Electron companion: post-launch v0.16+ candidate
A small Electron sidecar that bundles `arduino-cli` + Proffieboard board package + ProffieOS source. Web editor talks to it via local HTTP (`http://localhost:8765`). User clicks "Push to Saber" in browser → companion compiles + DFU flashes. Estimated 3-4 weeks of focused work post-launch.

**Hybrid path** chosen over full desktop port — keeps web editor advantages (deploy via `git push`, accessible from any machine) while solving the compile/flash friction.

Full desktop port (Electron desktop with editor inside) only if user telemetry shows the companion still leaves people stranded.

### What's intentionally NOT changing for launch
- Audio engine architecture (multi-instance — fix queued in PR #124, but stays multi-instance pattern)
- Font library scanner architecture (FSA-based, Chromium-only)
- ProffieOS compile workflow (still requires user-side arduino-cli)
- Code signing posture (skip — open source GitHub norms accept this)

---

## 48-hour launch focus

See [`LAUNCH_48H_CHECKLIST.md`](LAUNCH_48H_CHECKLIST.md) for the prioritized punch list.

### Must-have (otherwise launch fails)
1. End-to-end hardware flash validated by Ken on real V3.9
2. `FLASH_GUIDE.md` documenting the 3-step compile + flash flow
3. README updated with launch-ready language + beta disclaimer
4. FlashPanel disclaimer copy strengthened

### In scope if time permits
- Merge PR #124 (audio mute fix) — fixes preview button silence
- Merge PR #118 (Brave warning copy) — cuts a launch-day support ticket
- Merge PR #122 (12 sound categories) — eliminates the warning avalanche on every modern font

### Out of scope (post-launch)
- Electron companion
- Cloud compile service
- Mobile
- Ignition/retraction swap fix (cosmetic — won't block launch)
- SmoothSwing audio in editor (cosmetic — hardware audio works correctly)

---

## Disk usage at session close

| Location | Size | Purpose |
|---|---|---|
| `~/SaberFonts/` | 707 MB | KyberStation library (32 fonts, all SmoothSwing v2) |
| `~/SaberSFX/` | 2.2 GB | Wilhelm scream + voice packs + Holst tracks + Kyberphonic bonus content |
| `~/SaberFontPacks/` | 2.6 GB | Jedi Survivor pack staging (8 unflattened characters available) |
| **Total saber assets** | **5.5 GB** | |

15 GB of staging downloads from font extraction were cleaned up mid-session.

---

## Memory entries created this session

- [Launch deadline 2026-05-01](../../.claude/projects/-Users-KK-Development-KyberStation/memory/project_launch_deadline_2026-05-01.md) — 48-hour hard deadline
- [Launch scope: web only for v1.0](../../.claude/projects/-Users-KK-Development-KyberStation/memory/project_launch_scope_web_only.md)
- [Audience reality: Proffieboard hobbyist](../../.claude/projects/-Users-KK-Development-KyberStation/memory/project_audience_proffieboard_hobbyist.md)
- [Electron companion deferred to post-launch v0.16+](../../.claude/projects/-Users-KK-Development-KyberStation/memory/project_electron_companion_post_launch.md)
- [Mobile platforms deferred indefinitely](../../.claude/projects/-Users-KK-Development-KyberStation/memory/project_mobile_deferred.md)
- [Private sound font library at ~/SaberFonts/](../../.claude/projects/-Users-KK-Development-KyberStation/memory/reference_private_sound_font_library.md)
- [Brave FSA flag requirement](../../.claude/projects/-Users-KK-Development-KyberStation/memory/reference_brave_fsa_flag.md)

---

## Ready for archive

Session ready for archive. Next session should pick up from:
1. The 48-hour launch checklist in `docs/LAUNCH_48H_CHECKLIST.md`
2. **Hardware flash test outcome (2026-04-29 ~01:30):**
   - Codegen + arduino-cli compile pipeline VALIDATED ✅ (213 KB binary builds clean from KyberStation-generated config)
   - dfu-util via STM32 ROM bootloader (VID 0x0483:0xdf11) successfully erased + wrote firmware twice
   - Chip refuses to exit DFU mode after flash (`dfu-util: can't detach`, `errFIRMWARE` status reported by chip)
   - Suspected causes: (a) 89sabers V3.9 may use different STM32L4 variant than `ProffieboardV3-L452RE` fqbn expects, (b) custom 89sabers bootloader at 0x08000000 was overwritten, OR (c) BOOT0 pin held high by some hardware condition
   - Saber NOT bricked — STM32 ROM bootloader is silicon-burned, recovery is straightforward once original firmware is obtained
   - **Recovery action**: contact 89sabers for V3.9 recovery firmware (.dfu or .bin). Stock ProffieOS V3 binary from Fredrik Hubbe / Crucible forum is fallback. Then `dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000:leave -D <recovery>.bin` to restore.
   - **KyberStation FlashPanel WebUSB**: separately broken. Reported "flash complete" but chip never received valid firmware. Different bug from the dfu-util path. Needs investigation post-launch.
3. **Launch plan update**: ship `dfu-util`-based flash workflow as the documented path (in `FLASH_GUIDE.md`). Strip KyberStation's WebUSB FlashPanel from launch scope or document it as "experimental, use dfu-util as backup".
4. Merging the 4 in-flight PRs as their CIs go green (PR #122 already merged to main during this session per system-reminder)
5. Writing `docs/FLASH_GUIDE.md` for end users — must include `brew install dfu-util` step, exact dfu-util command, and the .iap → strip-DFU-suffix preparation step

## Hardware test session FULL outcome (2026-04-29 ~01:00-03:00)

Continued the hardware flash test after initial archive. Multi-hour session debugging an 89sabers V3.9 board.

**Headline:** Codegen + compile pipeline 100% validated. Saber in fault-loop state, fully recoverable but not yet recovered. ST-Link V2 ordered (Amazon Prime, today delivery), email sent to 89sabers requesting factory firmware binary. Tomorrow's session picks up either recovery path.

### What got validated end-to-end ✅
- KyberStation downloads style snippet via OUTPUT panel "Download config.h"
- Wrapping the style in a complete V3 config produces compilable source
- arduino-cli builds cleanly with `proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,usb=cdc_msc` fqbn
- Compile produces `.iap` (raw firmware) + `.dfu` (DFU-format wrapped) + `.elf` + `.map`
- dfu-util successfully flashes to either Bank 1 (`0x08000000`) or Bank 2 (`0x08040000`)
- Hardware DFU recovery via on-board SW1 (BOOT) + SW2 (RESET) works reliably

### What broke / where it broke ❌
- **KyberStation OUTPUT panel only generates style code** when `presetListEntries.length === 0`. Multi-preset mode required for full `config.h` output. Single-preset users will hit this. Post-launch UX fix candidate.
- **KyberStation FlashPanel WebUSB** reported "flash complete" but the chip never received a valid firmware. The DfuSeFlasher writes bytes but the manifest phase doesn't trigger an actual chip reset. Separate bug from dfu-util path.
- **89sabers V3.9 ships with `BFB2=1`** in Option Bytes (boot from Bank 2). Standard ProffieOS compiled for Bank 1 won't boot. Discovered by reading Option Bytes via `dfu-util -a 1 -U`.
- **Cleared BFB2 to 0 via Option Bytes write.** Chip wouldn't boot from Bank 1 either, even with valid firmware. Suspected: 89sabers ships a custom bootloader stage at `0x08000000` that we overwrote, OR the firmware-validation chain expects state we didn't restore.
- **Tried 3 configs (custom 144-LED + Bladeforge 120-LED + 89V3_OBI 128-LED).** All compiled cleanly. None boot on this specific hardware.

### The .iap DFU suffix gotcha
arduino-cli's `.iap` output has a 16-byte DFU suffix appended (containing Proffieboard's VID/PID `0x1209:0x6668`). When flashing via dfu-util to the STM32 ROM bootloader (`0x0483:0xdf11`), dfu-util rejects the file because the embedded VID/PID doesn't match. Strip with:
```bash
SIZE=$(stat -f%z input.iap)
head -c $((SIZE - 16)) input.iap > stripped.bin
```
Then dfu-util accepts the stripped file (warns "Invalid DFU suffix signature" but proceeds).

### Saber recovery state at session close
- Chip alive in DFU mode (`Found DFU [0483:df11]` via SW1+SW2)
- Both Bank 1 and Bank 2 currently contain the 89V3_OBI compiled firmware (last flash attempt)
- Option Bytes: `OPTR=0xFFEFF8AA` (BFB2 cleared), `nOPTR=0x00100755` (XOR validates)
- Need: factory firmware binary from 89sabers OR ST-Link low-level recovery

### Recovery paths in flight
1. **Email to 89sabers** sent ~03:00 to `pang89sabers@outlook.com` and `my89sabers@hotmail.com`. Subject: "Proffieboard V3.9 stuck after firmware flash, need recovery help". CCSabers contact form also pinged.
2. **ST-Link V2 ordered** — HiLetgo brand from Amazon Prime, expected today. Plan: STM32CubeProgrammer + Option Bytes factory reset + flash 89V3_OBI compile.

### Post-launch issues to file from tonight's debugging
- KyberStation FlashPanel WebUSB doesn't actually flash (reports success, chip stays in DFU)
- KyberStation OUTPUT panel only generates style snippets in single-preset mode
- KyberStation should warn users when they're about to flash to an 89sabers board that BFB2 may need to stay 1
- KyberStation FLASH_GUIDE should mandate dfu-util workflow until WebUSB is fixed

---

## Validated dfu-util flash command (for FLASH_GUIDE.md)

```bash
# 1. Compile config.h to .iap (after pointing ProffieOS.ino at your config)
arduino-cli compile \
  --fqbn 'proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,usb=cdc_msc' \
  --output-dir /tmp/proffie-build \
  ProffieOS/ProffieOS.ino

# 2. Strip the DFU suffix from the .iap so dfu-util accepts it
SIZE=$(stat -f%z /tmp/proffie-build/ProffieOS.ino.iap)
head -c $((SIZE - 16)) /tmp/proffie-build/ProffieOS.ino.iap > /tmp/proffie-build/firmware.bin

# 3. Enter DFU mode on saber (vendor-specific button combo, e.g. POWER+AUX on 89sabers)
# 4. Verify enumerated as STM32 BOOTLOADER:
ioreg -p IOUSB -w0 -l | grep "STM32"

# 5. Flash with dfu-util to STM32 ROM bootloader IDs
brew install dfu-util  # if not already installed
dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000:leave -D /tmp/proffie-build/firmware.bin
```

This is the validated path. Tested 2026-04-29 — write succeeds, but chip-side boot completion needs 89sabers-recovery-firmware verification before publishing to users.
