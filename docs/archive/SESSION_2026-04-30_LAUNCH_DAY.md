# Session 2026-04-30 (launch day prep) — kickoff state

> Continuation of `SESSION_2026-04-29_LAUNCH_POSTURE.md`. Previous session hit context limit. This doc captures the state as the new session opens.

## Current state at session start

**Date**: April 30, 2026 (~24-30 hours to launch deadline May 1)

**Hardware test saber**: Still stuck in fault state from last night. Recoverable but not recovered. Two paths in flight:
- Path A — 89sabers email response: **No reply yet** (sent ~03:00 last night). They may respond later today (China timezone).
- Path B — ST-Link delivery: HiLetgo V2 ordered Amazon Prime, expected today. PCBite kit deferred (decided to wait).

**Key insight from CCSabers article (read by user this morning)**: The four 89V3 config files (`89V3_OBI.h`, `89V3_Purple.h`, `89V3_green.h`, `89V3_allfont.h`) are **functionally identical**, differ only in first preset's blade color. So compiling `89V3_OBI.h` last night was a fine choice — none of the alternatives would have booted differently. The article does NOT include a pre-compiled firmware binary, only configs.

## Today's strategic decision (locked at session start)

**Launch posture pivot**: KyberStation v1.0 ships as a **design tool first**. WebUSB FlashPanel is **feature-flagged off** OR labeled **EXPERIMENTAL** with prominent dfu-util fallback. Pitch:

> "KyberStation is a visual blade design tool. Generate your ProffieOS config, compile it with arduino-cli or Arduino IDE, flash it with dfu-util. Web-based flashing is experimental and coming in v0.16+."

**Rationale**:
- Audience is Proffieboard hobbyists who already own arduino-cli (per `project_audience_proffieboard_hobbyist` memory)
- Codegen + compile pipeline is validated end-to-end
- WebUSB FlashPanel has unfixed manifest-phase bug
- Honest "tool we shipped" beats "tool we claim works but doesn't"
- Maintains product safety — users follow documented dfu-util workflow with mandatory backup

## P0 items for today (must ship for launch)

### 1. `docs/FLASH_GUIDE.md` (highest priority)

Must include:
- `brew install dfu-util` step
- DFU mode entry (vendor button combo on saber, OR SW1+SW2 on board)
- **MANDATORY pre-flash backup**:
  ```
  dfu-util -d 0x0483:0xdf11 -a 0 -U my-saber-backup.bin -s 0x08000000:524288
  ```
- arduino-cli compile command (V3 fqbn)
- Strip `.iap` DFU suffix step
- dfu-util flash command with `:leave`
- **Vendor-customized board warning** (89sabers BFB2=1, KR/Saberbay similar)
- **Recovery instructions** — restore from backup if custom flash fails
- Brave flag note (`brave://flags/#file-system-access-api`)
- WebUSB FlashPanel disclaimer (experimental, use dfu-util as fallback)

The mandatory backup workflow is the single most important user-protection step. It turns "potentially bricked saber" into "30-second recovery." See `reference_dfu_util_flash_workflow` memory for full details.

### 2. README.md update
- Launch-ready language (humble, beta posture per `LAUNCH_PLAN.md`)
- Beta disclaimer with link to FLASH_GUIDE.md
- "What it does / does not do" framing
- Credit Fett263, ProffieOS / Fredrik Hubbe, the saber community
- GitHub Issues link for bug reports

### 3. FlashPanel disclaimer strengthening
File: `apps/web/components/editor/FlashPanel.tsx`

Add to the existing disclaimer modal:
- Beta software warning
- Vendor-customized board callout (89sabers/KR/Saberbay BFB2 quirks)
- Mandatory checkbox: "I have backed up my original firmware"
- Mandatory checkbox: "I understand my saber may need recovery if my custom config has issues"
- Link to FLASH_GUIDE.md

### 4. WebUSB FlashPanel fate decision
**Recommended option**: Feature-flag the FlashPanel off for launch.

```ts
const SHOW_WEBUSB_FLASH = false; // re-enable in v0.16+ after manifest-phase bug fix
```

OR ship with "EXPERIMENTAL" banner across the panel + prominent "Use dfu-util CLI workflow if this fails" link.

The first option is safer. Pick this if you don't have time to add a robust EXPERIMENTAL banner today.

## P1 items (in scope if time permits)

- Merge PR #124 (audio mute fix) — done per body, just needs CI green
- Merge PR #118 (Brave warning copy) — small Brave-user UX win
- Smoke test on a clean machine if available
- Run `pnpm typecheck && pnpm test` to confirm green tree

## P2 — Out of scope (post-launch issues to file)

- KyberStation WebUSB FlashPanel manifest-phase bug fix
- Ignition/retraction sound swap fix
- SmoothSwing + hot-swap audio fixes
- Electron flash companion (v0.16+ planned)
- KyberStation OUTPUT panel single-preset mode generates style-only (multi-preset for full config)

## End-of-day decision tree

### If all P0 items done + docs polished:
- ✅ **Launch tomorrow Friday May 1**
- Push v0.16.0 git tag
- Post launch announcement (Reddit + community channels per `LAUNCH_ASSETS.md`)
- Watch GitHub Issues, respond fast

### If significant P0 work remains:
- ❌ **Delay 1-2 days, ship Saturday or Sunday**
- May 4 runway still gives 5-6 days for amplification — viable
- Better to ship clean than ship broken

### If 89sabers email arrives:
- Attempt saber recovery via dfu-util with their factory firmware
- If recovery succeeds: validate one full design → compile → flash → ignite cycle
- If validated: launch confidence is much higher
- Update FLASH_GUIDE with confirmation that the workflow works on real hardware

### If ST-Link arrives:
- Set aside for post-launch (don't disassemble saber today under pressure)
- Note: ST-Link + PCBite combination is the canonical SMD board recovery setup, worth owning for future hobby work

## Files / locations to know (from yesterday)

- `~/SaberFonts/` — 32-font live library
- `~/SaberSFX/` — wilhelm + voice packs + Kyberphonic bonus
- `~/Downloads/Proffie7.12_V3_89Sabers/` — official 89sabers OS pack (extracted)
- `~/Development/KyberStation/ProffieOS/` — primary ProffieOS source clone
- `~/Development/KyberStation/firmware-configs/v3-standard.h` — validated V3 reference

## Things to NOT do today

- ❌ **Don't touch Option Bytes again** unless ST-Link is connected with STM32CubeProgrammer ready as recovery
- ❌ **Don't keep flashing custom configs to the test saber** at the CLI hoping they'll boot
- ❌ **Don't rebuild WebUSB FlashPanel today** — it's broken in a way we don't fully understand
- ❌ **Don't disassemble the saber** under launch pressure to access SWD pads
- ❌ **Don't try to push the launch deadline today** — focus on docs, declare ready or delay at end of day

## Session opens here

When you start the new session, do these in order:

1. Read this doc end to end (already there if you're reading this)
2. Read `docs/SESSION_2026-04-29_LAUNCH_POSTURE.md` for the full backstory of last night
3. `git status && git log --oneline -5` to see current branch state
4. Check email for 89sabers response
5. `gh pr list --state open` to see in-flight PRs
6. Begin with FLASH_GUIDE.md writing (P0 #1)

Spawn parallel work as needed — one session writes FLASH_GUIDE while another updates README, etc.
