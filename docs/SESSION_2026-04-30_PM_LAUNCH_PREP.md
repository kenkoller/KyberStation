# Session 2026-04-30 PM — Launch Posture Lock + FLASH_GUIDE

**Branch state at close:** `main` at `32e5987` plus three merged launch-prep PRs.

**Headline outcome:** Locked the v1.0 launch posture (KyberStation ships as a design tool first; `dfu-util` CLI is the canonical flash workflow; WebUSB FlashPanel is shipped behind an EXPERIMENTAL gate). Authored the canonical user flash guide. Strengthened the FlashPanel disclaimer with mandatory backup acknowledgement. Three PRs merged this session, all CI-green.

This session continued from `docs/SESSION_2026-04-30_LAUNCH_DAY.md`. Hard launch deadline remains **Friday May 1, 2026**. As of session close: P0 docket complete; awaiting your visual smoke test + launch-go decision.

---

## What shipped

### PR [#145](https://github.com/kenkoller/KyberStation/pull/145) — `feat(launch): FLASH_GUIDE + README beta posture + FlashPanel experimental gate`

Three coordinated changes that lock the v1.0 launch posture.

#### `docs/FLASH_GUIDE.md` (new, ~290 lines)

Canonical end-user flash guide. TL;DR block at the top + 13 detailed sections:

1. Prerequisites
2. Install `dfu-util` and `arduino-cli` (macOS / Linux / Windows including Zadig + udev rule notes)
3. Get the ProffieOS source
4. Generate config from KyberStation (with single-preset-mode limitation note)
5. Compile (V3 + V2 fqbns)
6. Enter DFU mode (vendor button combos for 89sabers / Saberbay / KR / Goth-3 / Vader's Vault + on-board BOOT/RESET sequence)
7. **Mandatory firmware backup** — the user-protection step that turns "I just bricked my saber" into "I just lost 30 seconds"
8. Flash with dfu-util
9. WebUSB FlashPanel is experimental (explanation + recommendation to use dfu-util)
10. Vendor-customized boards (89sabers BFB2=1, KR Sabers, Saberbay, Vader's Vault, stock Proffieboards from Fredrik)
11. Recovery from backup (the safety net step-by-step)
12. Troubleshooting (dfu-util errors, compile errors, audio/SD issues, manifest-phase stuck-in-DFU)
13. FAQ (Arduino IDE alternative, why-not-WebUSB, backup frequency, worst-case scenarios, Verso/CFX/Golden Harvest/Xenopixel scope)

The mandatory backup step is the single most important user-protection feature in the guide. It's documented twice (TL;DR + §7) with explicit "DO NOT SKIP THIS STEP" callouts.

#### `README.md` rewrite of the Flash section

Replaced the misleading "✅ validated WebUSB" hardware table with an honest "dfu-util first, WebUSB experimental" framing. Added "Beta" tag to the project description + posture callout linking to `FLASH_GUIDE.md`. Rewrote the Credits section to thank Fredrik Hübinette, Fett263, the Crucible community, saber vendors (89sabers / KR / Saberbay / Vader's Vault), and font makers (Kyberphonic, Greyscale) per `LAUNCH_PLAN.md` humble-tone guidance.

#### `apps/web/components/editor/FlashPanel.tsx` disclaimer rebuild

Substantive UX changes:

- **EXPERIMENTAL badge** in the panel header next to "Flash to Saber"
- **Inline FLASH_GUIDE.md pointer** in the panel description
- **Disclaimer state refactored** from a single boolean (`disclaimerChecked`) to a 3-key object (`{ responsibility, backup, recovery }`)
- **Three mandatory acknowledgement checkboxes** in the DisclaimerCard:
  1. "I understand the WebUSB FlashPanel is experimental and I accept responsibility for the flash operation."
  2. "I have backed up my saber's existing firmware to a file (`dfu-util ... -U backup.bin` per FLASH_GUIDE §7)."
  3. "I understand my saber may need recovery via the dfu-util CLI workflow if my custom config has issues, and I know how to re-enter DFU mode."
- **Vendor-customized board warning** section (89sabers/KR/Saberbay/Vader's Vault, BFB2=1 caveat, no Option Bytes without ST-Link)
- **Manifest-phase known-issue callout** ("can leave the chip stuck in DFU mode after a successful write — particularly on vendor-customized boards")
- **Proceed button gated on `allChecked`** — disabled until all three checkboxes are checked. Defense in depth: `handleAckDisclaimer` early-returns when not all are checked.
- **Link to FLASH_GUIDE.md** inside the disclaimer card body

### PR [#146](https://github.com/kenkoller/KyberStation/pull/146) — `docs(session): archive 2026-04-29 + 2026-04-30 session notes`

Pure archive commit. Landed four session-tracking docs that had been on disk untracked across the launch-prep window:

- `docs/LAUNCH_48H_CHECKLIST.md`
- `docs/SESSION_2026-04-29_LAUNCH_POSTURE.md`
- `docs/SESSION_2026-04-30_LAUNCH_DAY.md`
- `docs/NEXT_SESSION_2026-04-30_HANDOFF.md`

### PR [#149](https://github.com/kenkoller/KyberStation/pull/149) — `docs(claude-md): launch posture lock + FLASH_GUIDE current-state entry`

Inserted a new "Current State (2026-04-30 PM, launch posture lock + FLASH_GUIDE)" section in `CLAUDE.md` above the existing entries. Renamed the morning entry from `(2026-04-30, ...)` to `(2026-04-30 morning, ...)` for chronological clarity. The three 2026-04-30 entries are now in reverse-chronological order: PM → evening → morning.

---

## Architectural decisions worth carrying forward

### 1. Strengthened-disclaimer over feature-flag-off for the WebUSB FlashPanel

The launch-day session doc offered two options for the WebUSB FlashPanel: (a) hide it behind `const SHOW_WEBUSB_FLASH = false`, or (b) ship with a strengthened disclaimer. Picked **(b)**.

- The mandatory-backup checkbox is a **stronger gate** than hiding the panel — anyone proceeding has acknowledged they have a backup, so worst case is a 30-second recovery via FLASH_GUIDE.
- Hiding the panel discards a feature that took weeks to build and works fine on stock boards.
- Honest "this is experimental, here's the reliable path" beats either "broken but hidden" or "broken but no warning."
- The 3-key disclaimer state (`responsibility / backup / recovery`) is the **choke-point for any future tightening** — adding a 4th ack key is one line in the type + one checkbox in the JSX.

### 2. The mandatory backup step is the single most important user-protection feature

Documented this in `FLASH_GUIDE.md` §7 with explicit "DO NOT SKIP THIS STEP" callouts AND surfaced it as a checkbox in the FlashPanel disclaimer. It's the load-bearing step that lets us ship the WebUSB experiment honestly: anyone who proceeds has a recovery path.

### 3. Parallel-session conflict resolution pattern

Mid-session, PR #144 (an evening-wave session-wrap from another session/agent) landed on main while my CLAUDE.md update was in flight. The conflict was in CLAUDE.md, line ~545.

Resolution that worked: instead of fighting the rebase conflict's interleaved structure, I aborted the rebase, deleted the original branch (local + remote), branched fresh off updated main, and re-applied my changes by inserting my section ABOVE the new evening section. Cleaner than hand-merging two side-by-side conflict regions. Pattern worth keeping for future similar collisions.

### 4. Vendor-customized board reality codified

The 89sabers BFB2=1 gotcha (boot from Bank 2, custom bootloader stage at 0x08000000) discovered during 2026-04-29 hardware testing now lives in three places: `FLASH_GUIDE.md` §10, the FlashPanel disclaimer's vendor-warning section, and the `reference_dfu_util_flash_workflow` memory. The doctrine: **don't touch Option Bytes (alt=1) without ST-Link recovery ready**.

---

## Verification status

| Gate | Status |
|---|---|
| `pnpm typecheck` workspace-wide | ✅ 10/10 packages clean |
| `pnpm --filter @kyberstation/web test` | ✅ 1875/1875 passing (no regression from disclaimer state refactor) |
| FlashPanel disclaimer logic code-walked | ✅ State init / spread updates / Proceed gate / handleAck early-return all correct |
| Manual smoke test of FlashPanel UX | ⏳ Pending — your task in next session |
| Hardware flash validation on real Proffieboard | ⏳ Pending — depends on 89sabers email or ST-Link arrival |

---

## What's intentionally NOT in this session's work

These were considered and consciously deferred:

- **No new tests for the DisclaimerCard refactor.** Single-boolean → 3-key object refactor doesn't have existing test coverage to break, and adding RTL tests for a UI-state gate is post-launch polish work, not P0.
- **No `SHOW_WEBUSB_FLASH = false` feature flag.** Strengthened disclaimer covers the same risk surface; flag would discard a feature that works on stock boards.
- **No CHANGELOG entry for v0.16.0.** Will be authored at tag-cut time (when launching), not now. CLAUDE.md current-state entries serve as the source for that draft.
- **No marketing site PR (#32) merge.** Open since 2026-04-18, likely has merge conflicts, not launch-blocking. Post-launch evaluation.
- **No twist-ignition docs PR review.** Per PR #144's evening-wave entry, that work shipped as PR #139.
- **No browser-verification of the morning-wave / overnight-wave PRs.** That's the next session's primary task.

---

## Files / locations to know (carried from prior session)

- `~/SaberFonts/` — 32-font live library
- `~/SaberSFX/` — wilhelm + voice packs + Kyberphonic bonus
- `~/Downloads/Proffie7.12_V3_89Sabers/` — official 89sabers OS pack (extracted)
- `~/Development/KyberStation/ProffieOS/` — primary ProffieOS source clone
- `~/Development/KyberStation/firmware-configs/v3-standard.h` — validated V3 reference
- `docs/FLASH_GUIDE.md` (new this session) — canonical end-user flash guide
- `docs/LAUNCH_PLAN.md` — vision + posture, humble tone guidance
- `docs/LAUNCH_ASSETS.md` — Reddit posts + YouTube outreach + screenshot shot list
- `docs/LAUNCH_48H_CHECKLIST.md` — 48-hour pre-launch checklist

---

## Test count summary

No test deltas this session. Workspace remains at:

- **web**: 1875 tests
- **engine**: 796 tests
- **codegen**: 1859 tests
- **boards**: 260 tests
- **presets**: 47 tests
- **sound**: 62 tests

Workspace typecheck clean across all 10 packages.

---

## End-of-session state

| Surface | State |
|---|---|
| Local main | `32e5987` (matches origin/main) |
| Working tree | Clean except this doc + the next-session handoff (both staged for the wrap PR) |
| Open PRs | None of mine. #147 (golden-hash harness) and #83 (old session archive) and #32 (marketing) are pre-existing from other sessions. |
| In-flight branches | `docs/session-wrap-2026-04-30-pm` (this PR) |

Next session focus: visual inspection + launch decision. See [`NEXT_SESSION_2026-05-01_LAUNCH_DECISION.md`](NEXT_SESSION_2026-05-01_LAUNCH_DECISION.md).
