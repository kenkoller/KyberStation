# Launch 48-Hour Checklist (closes 2026-05-01)

**Hard deadline:** Friday May 1, 2026.
**Started:** 2026-04-29 ~01:00 AM.
**Posture:** Web app only. No Electron companion in launch scope. Beta-quality acceptable per open-source GitHub norms.

> Companion docs: [`LAUNCH_PLAN.md`](LAUNCH_PLAN.md) (vision + posture) · [`SESSION_2026-04-29_LAUNCH_POSTURE.md`](SESSION_2026-04-29_LAUNCH_POSTURE.md) (decisions + state)

---

## P0 — Must ship (otherwise launch fails)

### ⚠️ User safety additions (added 2026-04-29 ~03:30 after hardware test learnings)

The hardware test session revealed real risks to users flashing custom firmware. These items MUST land before launch to avoid users putting their sabers into the same fault state we did tonight.

### ☐ `FLASH_GUIDE.md` MUST include mandatory pre-flash backup workflow

Before any user flashes custom firmware, they should dump their existing firmware as a recovery file:

```bash
dfu-util -d 0x0483:0xdf11 -a 0 -U my-saber-backup.bin -s 0x08000000:524288
```

If custom flash fails, they restore via:

```bash
dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000:leave -D my-saber-backup.bin
```

This single workflow turns "potentially bricked saber" into "recoverable in 30 seconds". Mandatory inclusion in FLASH_GUIDE.md and reinforced in FlashPanel disclaimer.

### ☐ FlashPanel disclaimer adds vendor-customized board warning

```
89Sabers boards ship with BFB2=1 in Option Bytes (boot from Bank 2).
Standard ProffieOS firmware compiled for Bank 1 may not boot until
your original firmware is restored. KR Sabers, Saberbay, and other
custom-board vendors may have similar quirks.

If your saber doesn't boot after flashing, it's likely a vendor-specific
boot configuration. Re-enter DFU mode (hardware SW1+SW2 sequence) and
flash your vendor's recovery firmware OR contact your saber vendor for
a factory firmware binary.
```

### ☐ WebUSB FlashPanel — clearly labeled experimental OR disabled for launch

WebUSB FlashPanel reports "flash complete" but the manifest phase doesn't actually transition the chip out of DFU. Verified live 2026-04-29. Until fixed:
- Add "EXPERIMENTAL — use dfu-util CLI workflow if this fails" warning to the panel
- OR feature-flag the FlashPanel off for launch and link to FLASH_GUIDE
- Document the dfu-util workflow as the canonical, validated flash path

### ☐ Pre-flash Option Byte check (nice-to-have, post-launch fix candidate if time short)

Add a pre-flash safety check that reads `dfu-util -a 1 -U` Option Bytes and warns user if `BFB2=1` (likely vendor-customized board). Could be a wrapper script, a CLI tool, or built into a future WebUSB FlashPanel rev.



### ☐ End-to-end hardware flash validated on real V3.9
Take a font (e.g. `Vader_KP_ROTJ` from `~/SaberFonts/`), generate a KyberStation preset that uses it, compile to `.bin` via arduino-cli, flash via WebUSB, ignite the saber, hear the right audio.

**Why blocker:** You cannot launch flash software you haven't validated yourself. If anything in the chain (codegen → compile → flash → boot) breaks, you'd want to know now.

**Time estimate:** 30-45 min (if arduino-cli + Proffieboard core already installed).

### ☐ `docs/FLASH_GUIDE.md` written
Step-by-step manual covering the 3-step flow:
1. KyberStation editor → OUTPUT panel → download `config.h`
2. arduino-cli compile (with the exact fqbn for V3 + V2 + V3-OLED)
3. KyberStation FlashPanel → Custom .bin → upload + flash

Include:
- Prerequisite install commands (arduino-cli + Proffieboard board package)
- Brave-flag callout for File System Access
- DFU mode entry instructions (BOOT + RESET dance)
- Troubleshooting: common errors + fixes
- Screenshots of FlashPanel states
- Link from README

**Time estimate:** 1-2 hours.

### ☐ README updated for launch
- "What KyberStation does / does not do" framing at the top
- Link to `FLASH_GUIDE.md` prominently
- "Beta — use at your own risk" disclaimer near the install instructions
- Link to GitHub Issues for bug reports / feature requests
- Credits: Fett263, ProffieOS / Fredrik Hubbe, the saber community

**Time estimate:** 30-45 min.

### ☐ FlashPanel disclaimer copy strengthened
Current disclaimer is functional. Add:
- "Active beta / pre-1.0 software"
- "KyberStation is not affiliated with ProffieOS or any board manufacturer"
- "No warranty — use at your own risk"
- "Brick risk is low (DFU recovery is robust on STM32) but possible"
- One-time ack with checkbox + persistent in localStorage (already wired per `FlashPanel.tsx` `hasAckedDisclaimer`)

**Time estimate:** 15-30 min.

---

## P1 — In scope if time permits

### ☐ Merge PR [#124](https://github.com/kenkoller/KyberStation/pull/124) — audio mute fix
Done per latest PR body. Just needs CI green + click merge. Fixes preview-button silence in Column B.

### ☐ Merge PR [#118](https://github.com/kenkoller/KyberStation/pull/118) — Brave warning copy
Cuts a guaranteed launch-day support ticket. Brave users hit this on day one without it.

### ☐ Merge PR [#122](https://github.com/kenkoller/KyberStation/pull/122) — 12 modern Proffie sound categories
Eliminates the 30-50 "Unrecognized file" warnings every modern font produces. Big polish win for any user importing premium fonts (Kyberphonic, BK Saber Sounds, Greyscale, etc.).

### ☐ Smoke test from a clean machine
If you have a second Mac or can borrow one:
1. Clone fresh from GitHub
2. `pnpm install`
3. `pnpm dev`
4. Walk through font library setup + design + flash from scratch
5. Note every friction point

**Why valuable:** Reveals install/setup gaps your own machine has hidden.

---

## P2 — Out of scope (post-launch)

- Electron companion (v0.16+)
- Cloud compile service
- Mobile (deferred indefinitely)
- Ignition/retraction sound swap fix (cosmetic — file follow-up issue)
- SmoothSwing audio crossfade in editor (cosmetic — hardware audio works correctly)
- Audio engine multi-instance refactor beyond the mute fix
- Font library import-as-mega-font UX fix (drag-drop on parent folder loads as one giant font)

---

## Daily structure

### Tonight (Wed Apr 29, ~01:00 onwards)
- Hardware flash test ← IF saber is connected and Ken is awake
- Otherwise: sleep, fresh start tomorrow

### Wednesday daytime
- Merge ready PRs (#118, #122, #124) as their CIs go green
- Write `FLASH_GUIDE.md`
- Update README + FlashPanel disclaimer

### Thursday
- Smoke test from clean machine if possible
- Final pass on all docs
- Pick launch announcement target: r/lightsabers + r/proffieboards primary, YouTube outreach list as follow-up
- Draft launch post (per `LAUNCH_ASSETS.md`)

### Friday May 1
- Push v0.16.0 (or appropriate semver) GitHub release
- Post launch announcement
- Watch for issues, respond fast, fix as needed

---

## Launch announcement notes

Per `LAUNCH_PLAN.md`: humble tone, "first publicly released programming project", "would love your feedback". Not "shiny launch announcement". Don't overclaim.

Critical things to mention:
- What it does (visual blade design + ProffieOS config generation)
- What it does NOT do (compile firmware — still need arduino-cli)
- Beta software disclaimer
- Open source GitHub link
- Bug reports welcome at GitHub Issues

Things to NOT mention:
- Anything that sounds like a sales pitch
- Comparisons to existing tools (Fett263, etc.) — be additive not competitive
- Specific timeline promises ("v1.1 will have X" — defer commitments until you have launch data)

---

## Failure mode triage

### If hardware flash test fails
**Highest-priority blocker.** Diagnose immediately:
1. Does config.h compile? (arduino-cli error → check ProffieOS version + config syntax)
2. Does .bin flash? (WebUSB error → check DFU state + browser permissions)
3. Does saber boot? (silence → check SD card state + font folder names match config)
4. Does ignite work? (no sound → check audio engine wiring on hardware)

If any step fails irrecoverably, **delay launch**. Better to ship a week late and working than ship Friday and broken.

### If a P0 PR fails CI on a regression
Roll back the offending commit, ship without that PR's fix. The 4 in-flight PRs all add polish — none are launch blockers individually.

### If launch traffic exceeds expectations
GitHub Pages handles arbitrary traffic for free. Vercel/Netlify free tier should handle hundreds of users/day for the editor. Bottleneck would be GitHub Issues / Discord support — set expectations in the announcement post about response times.

---

## Status field — update as work progresses

| Item | Status | Notes |
|---|---|---|
| Codegen + compile pipeline validated | ✅ done 2026-04-29 | 207 KB binaries built cleanly multiple times from KyberStation-generated configs |
| dfu-util flash protocol validated | ✅ done 2026-04-29 | Bytes write, erase, verify all succeed |
| Hardware flash boot-to-saber validated | ⏭️ blocked | Test saber stuck post-flash. Recovery via ST-Link (arriving 2026-04-30) OR 89sabers email response. |
| FLASH_GUIDE.md | ✅ done 2026-04-30 PM | PR [#145](https://github.com/kenkoller/KyberStation/pull/145). 13 sections + TL;DR. Mandatory backup workflow front-and-center per safety addition above. |
| README updated | ✅ done 2026-04-30 PM | PR [#145](https://github.com/kenkoller/KyberStation/pull/145). Beta posture callout + dfu-util-first framing + humble credits rewrite. |
| FlashPanel disclaimer | ✅ done 2026-04-30 PM | PR [#145](https://github.com/kenkoller/KyberStation/pull/145). EXPERIMENTAL badge + 3-checkbox gate (responsibility/backup/recovery) + vendor-customized board warning + FLASH_GUIDE.md link. |
| PR #124 merged | ✅ done 2026-04-30 morning | Audio mute lifted to shared store. |
| PR #122 merged | ✅ done | Sound categories expansion landed during 2026-04-29 session. |
| PR #118 merged | ✅ done 2026-04-30 morning | Brave warning copy. |
| Smoke test (clean machine) | ⏭️ pending | Next-session task. See `NEXT_SESSION_HANDOFF.md` for the walkthrough checklist. |
| Launch announcement drafted | ⏭️ pending | Reuses `docs/LAUNCH_ASSETS.md`. Task for launch-go session. |
| Pushed v0.16.0 release | ⏭️ pending | Tag cut is the launch trigger. |
| **Hardware-side outstanding** | | |
| Saber recovery from fault loop | ⏭️ blocked | Path A: 89sabers email response. Path B: ST-Link arrives + STM32CubeProgrammer Option Byte reset. |
| KyberStation WebUSB FlashPanel bug | ⏭️ post-launch | Reports success but doesn't transition manifest. Shipped behind EXPERIMENTAL gate per PR #145; root-cause fix in v0.16+. |
