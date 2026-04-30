# Next session — 2026-05-01 launch decision day

> **Paste this entire prompt verbatim to start the new session.** The fresh session has zero memory of prior work — everything it needs is here or in linked files.

---

## Context (read this in order)

You are continuing KyberStation launch prep. **Hard launch deadline: Friday May 1, 2026.** Prior sessions completed all P0 docket items. This session is for **visual inspection + tweaks + the final launch-go decision**.

Read these in order before doing anything:

1. **`CLAUDE.md`** — particularly the three "Current State (2026-04-30 …)" entries (PM → evening → morning, in that order)
2. **`docs/SESSION_2026-04-30_PM_LAUNCH_PREP.md`** — what shipped in the prior session (FLASH_GUIDE + README + FlashPanel disclaimer)
3. **`docs/SESSION_2026-04-30_LAUNCH_DAY.md`** — the strategic posture pivot that drove the prior session
4. **`docs/LAUNCH_PLAN.md`** — vision + humble-tone guidance
5. **`docs/LAUNCH_48H_CHECKLIST.md`** — full 48-hour checklist

Then run these to see current state:

```bash
git fetch origin --prune
git status
git log --oneline -10
gh pr list --state open
```

Email check: look for a reply from `pang89sabers@outlook.com` or `my89sabers@hotmail.com` re: factory firmware for V3.9 recovery.

Hardware check: did the HiLetgo ST-Link V2 arrive from Amazon Prime?

---

## Primary task: visual inspection walkthrough

Spin up the dev server and walk through the UX systematically. There's a lot of recently-merged work that hasn't been browser-verified by Ken yet.

```bash
cd /Users/KK/Development/KyberStation
pnpm dev
# Open http://localhost:3000
```

### A. Brand-new launch posture (PR #145 — Ken hasn't seen yet)

**Test path:** Editor → OUTPUT panel (sidebar or `⌘4`) → click **FLASH** in the Delivery rail at the bottom (or scroll the panel into the OUTPUT body).

Verify:

- [ ] Panel header reads "Flash to Saber" with an **EXPERIMENTAL** orange/amber badge next to it
- [ ] Panel description ends with **"For v1.0 the recommended path is the dfu-util CLI workflow"** + a hyperlinked **FLASH_GUIDE** that opens [the GitHub doc](https://github.com/kenkoller/KyberStation/blob/main/docs/FLASH_GUIDE.md) in a new tab
- [ ] Disclaimer card title reads **"Experimental — read before proceeding"** (was previously "Use at your own risk")
- [ ] Disclaimer body has 3 paragraphs (design-tool-first / manifest-phase known issue / DFU recovery instructions)
- [ ] **Vendor-customized board warning** sub-section visible inside the disclaimer (calls out 89sabers / KR Sabers / Saberbay / Vader's Vault and BFB2=1)
- [ ] **Three checkboxes** (responsibility / backup / recovery) all unchecked by default
- [ ] **Proceed button is disabled** when zero checkboxes are checked
- [ ] Proceed stays disabled when 1 of 3 is checked
- [ ] Proceed stays disabled when 2 of 3 are checked
- [ ] Proceed only enables when **all 3** are checked
- [ ] After clicking Proceed, the panel transitions to the firmware-selection state (the rest of the existing FlashPanel UX)

### B. Morning-wave PRs (#130/#131/#132/#133/#134/#135/#136/#137 — Ken's field-test critical bugs)

These shipped 2026-04-30 morning. Quick verification path for each:

- [ ] **PR #132 (retraction bug)** — Ignite blade → trigger retraction → confirm blade retracts (was previously rendering as ignition)
- [ ] **PR #133 (alignment / tip / emitter glow)** — Verify (a) blade and analysis rail line up Point A → Point B for multiple LED counts, (b) tip is rounded (not pointed), (c) emitter doesn't glow when blade is OFF
- [ ] **PR #130 (pause pauses audio)** — Ignite, hit Space (or pause button) → audio should suspend; resume → audio resumes
- [ ] **PR #131 (header standardization)** — All header buttons should be consistent height/radius/focus ring
- [ ] **PR #134 (save state v1)** — Click "⭐ Save" in the action bar → preset should appear under "My Presets" in the gallery sidebar; click to load; delete works
- [ ] **PR #135 (Surprise Me extension)** — Click 🎲 → confirm output uses new ignition/retraction styles, modulation bindings, theme-aware HSL colors
- [ ] **PR #136 (queue button)** — Click "📌 Queue" → toast confirms; preset added to active saber profile's card queue
- [ ] **PR #137 (wizard polish)** — Open the launch wizard → confirm 144 LED default (not 132), step counts correct, color/vibe buttons have aria labels

### C. Evening-wave PRs (#139/#140/#141/#142/#143 — overnight refinement)

These shipped 2026-04-30 evening per PR #144's session-wrap entry. Quick verification:

- [ ] **PR #140 (audio waveform layer)** — In the Analysis Rail, find the new "audio-waveform" layer toggle. Enable it. Ignite blade with a font loaded. Verify a time-domain waveform paints along the blade. Mute audio → waveform should also go silent (this is the AnalyserNode-after-masterGain UX choice).
- [ ] **PR #141 (palette commands)** — Press `⌘K` to open command palette. Verify NAVIGATE has 9 new section commands (my-saber, hardware, ignition-retraction, combat-effects, layer-compositor, routing, motion-simulation, gesture-controls, my-crystal). EDIT has Save Preset / Add to Queue / Surprise Me. TOGGLE has Pause / Reduce Bloom / Reduce Motion.
- [ ] **PR #143 (light-theme card export)** — In My Crystal panel, change theme to LIGHT. Click "Save share card" → blade should render correctly on the paper-white background (not over-saturated from `lighter` composite).
- [ ] **PR #139 (twist ignition docs)** — Open `docs/user-guide/ignitions.md` — verify all 18 ignitions documented + "About `twist`" section explains it shifts spiral phase, not direction.
- [ ] **PR #142 (backlog audit)** — Open `docs/POST_LAUNCH_BACKLOG.md` — verify "Last audited: 2026-04-30" header note + 5 stale entries cleared.

---

## Hardware path (if 89sabers email arrived OR ST-Link arrived)

### If 89sabers replied with factory firmware:

Walk through `docs/FLASH_GUIDE.md` end-to-end on the test saber:

1. `brew install dfu-util` (already installed per prior session)
2. Enter DFU mode (POWER + AUX + plug USB)
3. **Backup current state** (the saber in fault state) — `dfu-util ... -U fault-state-backup.bin`
4. Restore 89sabers factory firmware — `dfu-util ... -D factory-firmware.bin`
5. Saber should boot to vendor splash
6. Then design a saber in KyberStation, export config.h, compile, flash, ignite

If this works end-to-end, **launch confidence is much higher** — update FLASH_GUIDE.md with a "verified end-to-end on 89sabers V3.9 / macOS" note.

### If ST-Link V2 arrived but 89sabers hasn't replied:

**Set ST-Link aside for post-launch.** Don't disassemble the saber today under launch pressure to access SWD pads. The launch-day doc is explicit on this: ST-Link is the canonical SMD recovery setup but it requires PCBite + soldering / clip-on adapter for production sabers, which is a multi-hour operation. Better to ship the launch with the recovery path documented and exercise ST-Link calmly post-launch.

### If neither arrived:

Launch decision is purely a docs + UX call. The codegen + compile pipeline was validated 2026-04-29 (213 KB binary builds clean). The remaining gap is "did this user run dfu-util successfully?" which the FLASH_GUIDE walks them through. Acceptable launch state.

---

## Launch-go decision tree

Per `docs/SESSION_2026-04-30_LAUNCH_DAY.md`'s end-of-day tree:

| Outcome | Action |
|---|---|
| Visual smoke test green + recovery state OK or clean fault | ✅ **Launch today Friday May 1.** See "Launch checklist" below. |
| 89sabers reply lands → recovery succeeds → end-to-end flash works | ✅ **Launch today with much higher confidence.** Add the verification note to FLASH_GUIDE. |
| Visual smoke test surfaces 1-2 small bugs that can be fixed in <1 hour | 🟡 Fix → re-verify → launch today |
| Visual smoke test surfaces something serious | ❌ **Slip 1-2 days, ship Saturday or Sunday.** May 4 runway still gives 5-6 days for amplification. Better to ship clean than ship broken. |
| Hardware path goes badly | ❌ Slip — at minimum ship "WebUSB experimental, dfu-util workflow not yet hardware-validated." |

---

## Launch checklist (if launching today)

1. **Cut `v0.16.0` git tag**
   ```bash
   git tag -a v0.16.0 -m "KyberStation v0.16.0 — public launch (beta posture)"
   git push origin v0.16.0
   ```
   This triggers `release.yml` workflow → GitHub Release goes live.

2. **Verify GitHub Pages deploy is live**
   ```bash
   gh workflow list
   # Watch ci.yml + deploy if separate
   ```
   Open the deployed URL on a fresh browser, confirm landing page renders.

3. **Update CHANGELOG.md** — replace the `[Unreleased]` section with a `[0.16.0] — 2026-05-01` entry. Source the content from CLAUDE.md's three 2026-04-30 Current State entries (PM + evening + morning) — they collectively summarize ~17 PRs since v0.15.0:
   - PRs #115 / #118 / #122 / #124 / #127 / #128 (audio engine)
   - PRs #126 / #144 / #146 / #149 (docs / session archive)
   - PRs #130 / #131 / #132 / #133 (Wave 1 critical bug fixes)
   - PRs #134 / #135 / #136 / #137 (v1 launch features: save state, surprise-me, queue, wizard polish)
   - PRs #139 / #140 / #141 / #142 / #143 (overnight refinement: docs, audio waveform, palette, backlog audit, card theme)
   - PRs #145 / #146 / #149 (launch posture: FLASH_GUIDE, session archive, CLAUDE.md update)

4. **Post launch announcement** per `docs/LAUNCH_ASSETS.md`:
   - Reddit post (r/lightsabers, r/proffie, r/sabers — pick the post variant in LAUNCH_ASSETS)
   - Twitter / Bluesky if applicable
   - Discord servers (lightsaber dueling, neopixel building communities)
   - Email any YouTubers from the LAUNCH_ASSETS outreach list

5. **Watch GitHub Issues** — respond fast to first-day reports. Patient, humble responses per LAUNCH_PLAN tone guidance.

---

## Things to NOT do today

- ❌ **Don't touch Option Bytes** on the test saber unless ST-Link is connected with STM32CubeProgrammer ready as recovery
- ❌ **Don't keep flashing custom configs** to the fault-state saber hoping they'll boot
- ❌ **Don't rebuild WebUSB FlashPanel** — the manifest-phase bug is well-understood enough to ship behind the experimental gate; root-cause fix is post-launch v0.16+
- ❌ **Don't disassemble the saber** under launch pressure to access SWD pads — multi-hour operation, defer to calm post-launch session
- ❌ **Don't push the launch deadline past Sunday May 3** — May 4 amplification needs at least a 1-day runway for users to install + design + flash before Star Wars Day

---

## Files / paths to know

| Path | Purpose |
|---|---|
| `~/SaberFonts/` | 32-font live library (Kyberphonic + ProffieOS classics + JS Vader) |
| `~/SaberSFX/` | Wilhelm screams + voice packs + Kyberphonic bonus content |
| `~/Downloads/Proffie7.12_V3_89Sabers/` | Official 89sabers OS pack (extracted) — for reference |
| `~/Development/KyberStation/ProffieOS/` | Primary ProffieOS source clone |
| `~/Development/KyberStation/firmware-configs/v3-standard.h` | Validated V3 reference config |
| `docs/FLASH_GUIDE.md` | Canonical end-user flash guide (PR #145, this week) |
| `docs/LAUNCH_PLAN.md` | Vision + posture + humble-tone guidance |
| `docs/LAUNCH_ASSETS.md` | Reddit drafts, YouTube outreach, screenshot shot list |
| `docs/LAUNCH_48H_CHECKLIST.md` | The pre-launch punch list |
| `apps/web/components/editor/FlashPanel.tsx` | The strengthened-disclaimer FlashPanel |
| `apps/web/components/editor/CrystalPanel.tsx` | "My Crystal" — Save share card / Save share GIF |

---

## Open PRs at session start (none of mine, all pre-existing)

- **PR #147** — `test(renderer): renderer-level golden-hash harness for blade + card pipelines`. Post-launch test infrastructure. Don't merge today unless you've reviewed.
- **PR #83** — old session-archive PR from 2026-04-27. Likely has merge conflicts; defer.
- **PR #32** — marketing site expansion, open since 2026-04-18. Likely has merge conflicts; defer to post-launch sprint.

---

## Memory entries to maintain

If you ship the launch today, add a new memory entry:

- `project_v016_launched_2026-05-01.md` — "v0.16.0 shipped 2026-05-01 with launch posture: design tool first, dfu-util workflow validated, WebUSB FlashPanel experimental. See CHANGELOG and LAUNCH_PLAN for details."

If you slip:

- Update `project_launch_deadline_2026-05-01.md` with the new target date and rationale.

---

## At session end

Either:
- **Launched today** — write a brief `docs/SESSION_2026-05-01_LAUNCH.md` archiving what shipped, the launch announcement results, and any first-day issues filed.
- **Slipped** — write `docs/SESSION_2026-05-01_LAUNCH_SLIP.md` with the reason for slip + the new target date + what remains.

Either way, update `CLAUDE.md` with a new "Current State (2026-05-01, …)" entry above the existing 2026-04-30 PM entry.
