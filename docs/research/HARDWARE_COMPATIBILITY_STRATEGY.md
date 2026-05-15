# Hardware Compatibility Strategy

**Date:** 2026-05-15
**Author:** session-end synthesis after 2026-05-14/15 V3.9-BT bench
**Status:** Strategic recommendation — not yet ratified by Ken; v0.17 sprint candidate

---

## Executive summary

**KyberStation's flash-to-real-saber path is currently unproven.** Across the entire project history, **zero KyberStation-emitted config.h files have been confirmed to boot on real Proffieboard hardware in production form.** The one successful real-hardware boot (2026-04-27 modulation test) required hand-patching the emitted C++ to remove an `AudioFlicker` wrapper and rewrite a `Mix` slot — bypassing production codegen entirely.

This is a real product gap, not a small bug. Users who download a KyberStation ZIP and follow [`FLASH_GUIDE.md`](../FLASH_GUIDE.md) on a vendor chassis (89sabers, Sabertrio, KR Sabers, Saberbay, etc. — the majority of community installs) will brick their saber and need to restore from DFU backup.

**The good news:** the ecosystem hasn't solved this well either. There is a clear, defensible product opportunity — **be the first Proffieboard tool with vendor-aware hardware profiles** — that maps to a ~6-8 week v0.17–v0.19 roadmap. The fix is well-scoped and uses architectural patterns that already exist in the codebase (Zustand stores, package-level data manifests, codegen AST).

---

## 1. The evidence — what we now know

### KyberStation hardware-validation history

Honest audit from internal investigation:

- **2026-04-20 (WebUSB DFU validation)** — Phase A/B/C tested the WebUSB flash *protocol* against a Proffieboard. The test flashed **factory firmware** to confirm DFU enumeration + dry-run + real flash + recovery re-flash. **The firmware tested was not KyberStation-emitted.** ([`docs/HARDWARE_VALIDATION_TODO.md`](../HARDWARE_VALIDATION_TODO.md))
- **2026-04-27 (v0.15.0 hardware-validated modulation)** — One hand-patched preset successfully ran on a 89sabers V3.9 board. The patch script ([`scripts/hardware-test/build-modulation-test-config.mjs`](../../scripts/hardware-test/build-modulation-test-config.mjs)) explicitly post-processes the codegen output: "v1.1 Core's codegen doesn't natively emit this shape." Required removing `AudioFlicker` because audio gating masked the modulation when no SD card was loaded.
- **2026-04-29 (launch eve hardware flash)** — Attempted full flash, V3.9 board entered DFU mid-flow, was eventually bricked beyond Tier 1+2 recovery. Hardware validation was *deferred* in [`docs/archive/LAUNCH_48H_CHECKLIST_2026-04-29.md`](../archive/LAUNCH_48H_CHECKLIST_2026-04-29.md). v0.16.0 / v1.0 launched without confirmed user-facing flash.
- **2026-05-14/15 (this session)** — Two KyberStation flash attempts on the new V3.9-BT board:
  1. Default config (`NUM_BLADES=1`, 144 LED, pins 2+3): boot-loops.
  2. Factory-matched config (sourced from CCSabers' published V3.9 pack: `NUM_BLADES=2`, 128+30 LEDs, dual blade declaration, `ORIENTATION_USB_TOWARDS_BLADE`, `ENABLE_SERIAL`): chip auto-falls back to DFU mode within milliseconds of `:leave`.

Recovery from factory backup works reliably (validated twice). Hardware backup + DFU workflow is solid. **The codegen output is the failure point.**

### Codegen audit — what KyberStation actually emits

From [`packages/codegen/src/ConfigBuilder.ts`](../../packages/codegen/src/ConfigBuilder.ts) and [`apps/web/lib/zipExporter.ts`](../../apps/web/lib/zipExporter.ts):

```typescript
const options: ConfigOptions = {
  boardType: 'proffieboard_v3',
  propFile: 'saber_fett263_buttons.h',
  numBlades: 1,                          // hardcoded
  numButtons: 2,
  volume: 2000,
  bladeConfig: [
    { type: 'ws281x',
      ledCount: presets[0]?.config.ledCount ?? 144,
      pin: 'bladePin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin2', 'bladePowerPin3']  // stock pinout assumption
    },
  ],
};
```

Every assumption here matches a **stock Proffieboard V3 dev board from Hubbe**. None match the chassis most users actually own:

| Vendor | `NUM_BLADES` | Main blade LED count | Pins | Notes |
|---|---|---|---|---|
| Stock Proffieboard V3 (Hubbe) | 1 | varies | 2+3 | KyberStation's assumed default ✓ |
| 89sabers V3.9 (non-BT) | **2** | **128** | 2+3 (main), 4+5 (crystal) | 30 LED crystal chamber |
| 89sabers V3.9 BT | **2** | **128** | 2+3 (main), 4+5 (crystal) + BT module on Serial3 |
| 89sabers Kylo crossguard | 3 | 144 + 26 + 26 | 2+3, 1, 4 | Three blades total |
| Sabertrio Proffie BT Power Core | varies | varies | varies | Vendor-specific |

Source: 11 published 89sabers V3.9 configs from [CCSabers tutorial pack](https://www.ccsabers.com/blogs/tutorials/ccsabers-89sabers-proffieboard-v3-9-config-files-full-os-7-12-pack). Sabertrio + KR + Saberbay configs are not publicly distributed — users must request from vendor support.

### Where KyberStation actually stands

| Component | Status |
|---|---|
| Editor + visualizer + preset library + style engine | ✅ Solid |
| Codegen → compiles cleanly via arduino-cli | ✅ Validated |
| WebUSB DFU flashing protocol (enumerate/erase/write/verify) | ✅ Validated (factory firmware only) |
| Codegen output **boots** on real hardware | ❌ Never confirmed for user-facing exports |
| Vendor chassis compatibility | ❌ Zero coverage (defaults assume stock Proffieboard) |
| Factory config import path | ❌ Doesn't exist |
| End-user boot diagnostic workflow | ❌ Doesn't exist |
| Public hardware compatibility matrix | ❌ Doesn't exist |

---

## 2. The systemic issue

KyberStation's codegen layer has one structural assumption baked in everywhere: **"the user has a stock Proffieboard V3, single-blade, 144 LEDs, stock Fett263 prop file."** That assumption was reasonable for a hobby project written by a stock-Proffieboard owner, but it does not match the user base.

**Real users have vendor chassis.** The Proffieboard community's purchasing pattern strongly favors pre-built sabers from vendors (89sabers, Sabertrio, Vader's Vault, Electrum Sabercrafts, KR Sabers, SaberMach, Saberbay) over DIY builds. These vendor sabers ship with custom-wired chassis that differ from the stock Proffieboard in non-obvious ways:

- Multiple blades (main + crystal chamber + pommel/accent)
- Non-stock power pin assignments
- Specific prop-file gesture defines (twist-on, stab-on, swing-on speeds, motion timeout)
- Sometimes external BT modules on Serial3 with `ENABLE_SERIAL` requirements
- Sometimes board-orientation flags (`ORIENTATION_USB_TOWARDS_BLADE`)

These details aren't optional — they're the contract between firmware and physical hardware. ProffieOS panics or hangs in early init if any are wrong, before USB CDC can open and log what's failing. That's exactly what tonight's bench session demonstrated.

---

## 3. The ecosystem reality — nobody has solved this

Cross-tool research (in [agent 2 findings](#sources) below) reveals an interesting gap. Every adjacent tool **deliberately punts on hardware/blade-array generation**:

| Tool | Scope | Hardware config |
|---|---|---|
| Fett263 OS7 Config Helper | Full config.h | **User manually pastes BladeConfig**; no vendor selector |
| Fredrik's Style Editor | Style strings only | Doesn't touch hardware section |
| Fredrik's V5 Configurator | Hardware sub-section | Generic dropdowns (LED type, button, OLED) — **no vendor selector** |
| ProffieOS Workbench | `presets.ini` at runtime | Doesn't touch config.h or hardware layout |
| KyberStation (today) | Full config.h | Hardcoded stock-Proffieboard assumption |

ProffieOS itself has `BladeID` (resistor-detection) as the only built-in abstraction. Vendors don't publish their factory configs publicly — the workflow is "email vendor support, get a Google Drive link." The only public precedent for vendor-aware config tooling is [`github.com/Ricapar/sabertrio-proffie`](https://github.com/Ricapar/sabertrio-proffie) — a one-person repo of hand-curated config files, not a tool.

**This is the strategic opening.** Be the first tool in the ecosystem with vendor hardware knowledge baked in. Competitors have explicitly kept their scope at "style strings only" for years because writing hardware-aware codegen is genuinely harder than style codegen. KyberStation already does the hard part (full config.h codegen, AST templates, preset library, codegen unit tests). It just needs the hardware-profile abstraction layered on top.

---

## 4. The architecture — Hardware Profiles as first-class data

### Data model

```typescript
// packages/hardware-profiles/src/types.ts
export interface HardwareProfile {
  // Identity
  id: string;                          // e.g. "89sabers-v3.9-bt"
  vendor: string;                      // "89sabers"
  model: string;                       // "V3.9 BT"
  boardRevision: string;               // "Proffieboard V3 (STM32L452RE)"

  // CONFIG_TOP block
  numBlades: 1 | 2 | 3 | 4;
  numButtons: 1 | 2 | 3;
  defaultVolume: number;               // typical 1500-2000
  clashThresholdG: number;             // typical 2.0-4.5
  orientation: 'USB_TOWARDS_BLADE' | 'USB_TOWARDS_POMMEL' | 'USB_PORT_TOWARDS_BLADE' | undefined;
  enableSerial: boolean;               // true for BT-equipped chassis
  propFile: string;                    // "saber_fett263_buttons.h"
  propDefines: string[];               // ['FETT263_MULTI_PHASE', 'FETT263_TWIST_ON', ...]
  motionTimeoutMs: number;             // typical 180000

  // BladeConfig block
  blades: BladeSpec[];                 // 1-4 entries
  bladeIdSupport?: BladeIdSpec[];      // optional: multi-hilt resistor detection

  // Provenance + trust
  source: 'vendor-confirmed' | 'community-validated' | 'community-submitted' | 'experimental';
  validatedBy?: string[];              // GitHub handles who confirmed boot
  notes?: string;                      // "BT module on UART3 (Feasycom FSC-BT909); pins 4+5 are crystal chamber"
}

export interface BladeSpec {
  type: 'ws281x' | 'simple-pwm' | 'cree-xpe2';
  ledCount: number;                    // for WS281X
  dataPin: 'bladePin' | 'blade2Pin' | 'blade3Pin';
  colorOrder?: string;                 // "Color8::GRB"
  powerPins: string[];                 // ['bladePowerPin2', 'bladePowerPin3']
  role: 'main' | 'crystal' | 'accent' | 'pommel';
}
```

### Package layout

```
packages/hardware-profiles/
├── src/
│   ├── types.ts                     # interfaces above
│   ├── index.ts                     # PROFILES = [...all profiles], byVendor(), byId()
│   ├── codegen-adapter.ts           # HardwareProfile → ConfigOptions for ConfigBuilder
│   └── validators.ts                # ensure required fields, consistency checks
├── profiles/
│   ├── stock-proffieboard-v3.yaml
│   ├── 89sabers-v3.9.yaml
│   ├── 89sabers-v3.9-bt.yaml        # populated once we get factory config
│   ├── 89sabers-kylo.yaml
│   ├── sabertrio-bt-power-core.yaml
│   ├── kr-sabers-v3.yaml
│   ├── saberbay-v3.yaml
│   ├── vaders-vault-v3.yaml
│   └── custom-paste.yaml            # passthrough profile for user-pasted configs
├── tests/
│   ├── all-profiles-compile.test.ts # compile each profile through ConfigBuilder
│   └── golden-hashes.test.ts        # SHA each profile's emitted config.h
└── package.json
```

YAML profiles let the community PR new vendors without code review on every change.

### Codegen integration

In [`apps/web/lib/zipExporter.ts`](../../apps/web/lib/zipExporter.ts):

```typescript
import { byId, codegenAdapter } from '@kyberstation/hardware-profiles';

const profile = byId(saberProfile.hardwareProfileId ?? 'stock-proffieboard-v3');
const options = codegenAdapter(profile, presets);  // profile drives ConfigOptions, not hardcoded defaults
```

`saberProfile.hardwareProfileId` is a new field on the existing `SaberProfile` Zustand state (defaults to a "Chassis not selected" placeholder that produces a config marked `// WARNING: chassis not selected — do not flash`).

### UI surface

- **First-run modal** when the user opens KyberStation: "What chassis is your saber? You can change this later." Picker shows `[Stock Proffieboard V3] [89sabers V3.9] [89sabers V3.9 BT] [Sabertrio BT Power Core] [Custom (paste your config.h)] [I'll set this up later]`.
- **Chassis chip in StatusBar** showing current profile. Click → reopen picker.
- **Export-time guard**: if profile is "not selected" and user clicks Export, modal blocks with "Pick your chassis first — config emitted without one is unlikely to boot."

---

## 5. Phased rollout

### v0.17 — Hardware Profiles MVP (~3 weeks)

- New package `packages/hardware-profiles/` with types + 5 seed profiles (stock V3, 89sabers V3.9, 89sabers V3.9-BT placeholder, Sabertrio, custom-paste).
- Wire `byId(...)` into `zipExporter` to replace hardcoded `ConfigOptions`.
- First-run chassis picker + StatusBar chip + export-time guard.
- 89sabers V3.9 (non-BT) becomes the **first profile validated on real hardware** — use the new bench board, the 11 CCSabers configs as ground truth, and FLASH_GUIDE.md's recovery flow as safety net.

### v0.18 — Factory config import (~2 weeks)

- New "Custom" profile path: user pastes their factory `config.h` once. KyberStation preserves their `CONFIG_TOP`, `BladeConfig blades[]`, and prop defines verbatim. KyberStation only emits the `presets[]` array.
- This is the safe-by-default path for any vendor we don't profile yet.
- Parses the pasted config.h, validates it round-trips through ConfigBuilder, surfaces a diff if KyberStation would have changed anything.

### v0.19 — Diagnostic workflow + compatibility matrix (~1 week)

- New `docs/HARDWARE_COMPATIBILITY.md` table: vendor + model + profile id + validation status + community contact for missing entries.
- FLASH_GUIDE.md addendum: "If your flash doesn't boot, capture the boot log via `scripts/hardware-test/proffie-serial.sh` and paste into a GitHub issue."
- GitHub issue template for "my chassis doesn't have a profile yet" with prompts that gather the right info to make a community PR feasible.

### v0.20 — BladeID multi-config (stretch)

- Support `BladeConfig blades[]` with multiple entries selected by `BladeID` resistor detection.
- Useful for vendors who sell "one board, multiple hilts" — 89sabers' multi-hilt customers especially.
- Requires UI for "this profile has multiple variants, which one is your current build?"

### v0.21+ — CI hardware-in-the-loop

- One stock Proffieboard V3 wired to a CI host (Ken's bench, or a Mac mini in a closet).
- Each release tag triggers a flash of the stock-V3 profile + recovery cycle.
- Catches build-environment regressions (toolchain drift) early.

---

## 6. Risk + mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| **Vendor configs go stale** as vendors update firmware | M | Community PR model; mark profiles with the validated date + ProffieOS version; surface in UI when out-of-date |
| **BT-variant configs unobtainable** from vendor | M | Factory config import (v0.18) covers this case |
| **Codegen has correctness gaps even with right profile** | **H** | This is the lurking concern from the 2026-04-27 modulation test (`AudioFlicker` masking). Plan a focused codegen audit alongside Hardware Profiles work — compile each style + effect against every profile, golden-hash the emitted config, identify any patterns that need post-processing |
| **Profile count grows beyond maintainable** | L | Out-of-tree profiles via plugin loader (low priority post-v0.20) |
| **Test bench cost (one Proffieboard per vendor)** | M | Community-driven (PR validators on Discord/Crucible); start with one stock V3 in CI + one 89sabers V3.9-BT on Ken's bench, expand as donations / PRs arrive |
| **User downloads ZIP without picking chassis, bricks saber, blames KyberStation** | **H** | Hard export-time guard; large red "DO NOT FLASH" banner in generated config.h header when no profile selected; one-time warning at first flash |

---

## 7. What to do this week

**Highest leverage immediate actions** (none of these require the V3.9-BT bench):

1. **Email 89sabers support** for the BT-variant `89sabers-config.h`. Subject line: "Requesting factory config.h for V3.9-BT board for use with open-source preset-design tool." Cite serial number `2068308F3830` from this session. They typically share via Google Drive link within a business day.
2. **Stub the package**: create `packages/hardware-profiles/` with the types from §4, one validated profile (stock Proffieboard V3 — easy, KyberStation's current defaults), one placeholder (89sabers V3.9 from CCSabers). Land as a no-op PR (doesn't wire into codegen yet); commits the data shape.
3. **Audit codegen correctness alongside the profile work**. Tonight proved that factory-matched defines + factory-matched BladeConfig still didn't boot — implying the codegen has at least one issue beyond CONFIG_TOP / topology. Spend a focused half-day diffing KyberStation's emitted preset bodies against the published 89sabers presets. Look for: `AudioFlicker` over `Black`, `Stripes<>` argument ordering, `TrConcat<>` nesting, `Layers<>` slot count limits.
4. **Update [`CLAUDE.md`](../../CLAUDE.md) and [`POST_LAUNCH_BACKLOG.md`](../POST_LAUNCH_BACKLOG.md)** to reflect the new top-of-list priority: "Hardware Profiles MVP" supersedes Visualizer Phase 2C and Crystal Vault on the v0.17 sprint plan.

**Communications:**

- v1.0 README and FLASH_GUIDE: add an honest caveat — "KyberStation's flash-to-saber path is currently best-effort. We are working toward full vendor compatibility in v0.17+. If you have an 89sabers, Sabertrio, KR Sabers, Saberbay, or other vendor chassis, please confirm compatibility before flashing or use the recovery flow if needed."
- Don't pretend the gap doesn't exist. The community will respect honesty about hobby-tier maturity — they're all hobbyists.

---

## 8. The strategic case

KyberStation's "DAW for lightsabers" thesis is differentiated from the existing tools precisely because it tries to integrate the full pipeline (design → preset → flash → live edit) rather than focusing on one slice. Tonight's session exposed that one segment of that pipeline (flash → real hardware) is the weakest link. **That weakness is the opportunity.**

Fett263, Fredrik, and ProffieOS Workbench have stayed in their lane because hardware-aware codegen is harder than style-string editing. The communities each tool serves have learned to live with "paste your BladeConfig manually" workflows. **Nobody is competing for "I plug in my saber, the editor knows it's a 89sabers V3.9-BT, generates working firmware, and flashes it" because nobody has tried.**

This is the right product position to claim. The investment (6-8 weeks of v0.17-v0.19 work) is well-scoped, the architecture is conservative (data manifests + Zustand state + existing codegen + existing flash pipeline — no new technology), and the user-facing payoff is large (the difference between "I love this visualizer" and "this is the tool I actually use to configure my saber").

---

## Sources

### Internal (this codebase)

- [`scripts/hardware-test/README.md`](../../scripts/hardware-test/README.md) — v0.15.0 modulation validation
- [`scripts/hardware-test/build-modulation-test-config.mjs`](../../scripts/hardware-test/build-modulation-test-config.mjs) — hand-patched test, codegen post-processing
- [`apps/web/lib/zipExporter.ts`](../../apps/web/lib/zipExporter.ts) — hardcoded ConfigOptions
- [`packages/codegen/src/ConfigBuilder.ts`](../../packages/codegen/src/ConfigBuilder.ts) — single-blade assumption
- [`docs/HARDWARE_VALIDATION_TODO.md`](../HARDWARE_VALIDATION_TODO.md) — WebUSB DFU validation (factory firmware only)
- [`docs/HARDWARE_FIDELITY_PRINCIPLE.md`](../HARDWARE_FIDELITY_PRINCIPLE.md) — visualizer ↔ hardware parity, audit queue
- [`docs/archive/SESSION_2026-05-14_V39BT_BENCH.md`](../archive/SESSION_2026-05-14_V39BT_BENCH.md) — this session's failure analysis
- [`docs/archive/LAUNCH_48H_CHECKLIST_2026-04-29.md`](../archive/LAUNCH_48H_CHECKLIST_2026-04-29.md) — hardware validation deferred at launch

### External

- [CCSabers — 89Sabers V3.9 Config Files (OS 7.12 pack)](https://www.ccsabers.com/blogs/tutorials/ccsabers-89sabers-proffieboard-v3-9-config-files-full-os-7-12-pack)
- [Fett263 — OS7 Config Helper](https://www.fett263.com/fett263-os7-config-helper.html)
- [Fredrik Hubinette — V5 Configurator](https://fredrik.hubbe.net/lightsaber/v5/)
- [Fredrik Hubinette — Style Editor](https://fredrik.hubbe.net/lightsaber/style_editor.html)
- [ProffieOS Wiki — Blade Configuration](https://github.com/profezzorn/ProffieOS/wiki/Blade-Configuration)
- [Crucible — presets.ini / Workbench / Static Configs](https://crucible.hubbe.net/t/presets-ini-edit-mode-proffieos-workbench-and-static-configs/2526)
- [Crucible — Need .h file for 89Sabers Quantum](https://crucible.hubbe.net/t/need-h-file-for-89sabers-quantum-saber/6912)
- [Sabertrio — Bluetooth Power Core guide](https://sabertrio.com/pages/using-bluetooth)
- [Ricapar/sabertrio-proffie — ad-hoc vendor config repo (precedent)](https://github.com/Ricapar/sabertrio-proffie)
