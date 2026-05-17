# Hardware Compatibility Matrix

> **Status (2026-05-17):** KyberStation's compile-flash path has been confirmed to boot on a small number of chassis. The **majority of community installs** — vendor-built sabers from 89sabers, Sabertrio, KR Sabers, Saberbay, Vader's Vault, Electrum, and others — need either a **vendor chassis profile** (so codegen targets their pin map / blade count / prop defines) or a **factory config import** (so KyberStation preserves the vendor's `config.h` and only swaps the `presets[]` array).
>
> For the **runtime presets** path (drop `presets.ini` on the SD card, no firmware flash), compatibility is far broader — any ProffieOS 7.x chassis that ships with `SAVE_PRESET` and stock parser styles will accept KyberStation-emitted preset lists. Empirically validated on 89sabers V3.9-BT (2026-05-16, PR #325 + #331).
>
> Architectural plan for closing the compile-flash gap is in [`docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md`](research/HARDWARE_COMPATIBILITY_STRATEGY.md). Test plan for runtime presets is in [`docs/research/RUNTIME_PRESETS_HARDWARE_TEST_PLAN.md`](research/RUNTIME_PRESETS_HARDWARE_TEST_PLAN.md).

This page is the **public compatibility matrix**: which vendor chassis have been tested, by which path, and what's known to work or not. The matrix is **community-PR-able** — see [§How to add a chassis](#how-to-add-a-chassis) below.

---

## What "works" actually means here

KyberStation has four delivery paths to a real saber. A chassis can be "supported" via any combination of them; the matrix below makes that explicit:

| Path | What it produces | When to use |
|---|---|---|
| **Compile + flash (default)** | Full `config.h` → `arduino-cli` → `dfu-util` to Bank 1 | Stock Proffieboard from Hubbe, or DIY builds where you know the pin map. **Requires a vendor profile** for vendor chassis. |
| **Vendor profile + compile + flash** | Same as above, but with chassis-specific `BladeConfig`, prop defines, pin map baked in | Vendor sabers we've profiled (currently very few — 89sabers V3.9, Sabertrio Standard, both experimental). |
| **Custom-paste + compile + flash** | User pastes their factory `config.h` once; KyberStation preserves `CONFIG_TOP` + `BladeConfig` + prop defines verbatim and emits only the `presets[]` array | Any vendor we haven't profiled. Safe-by-default — only touches what's known safe to touch. |
| **Runtime presets (SD card)** | `presets.ini` written to SD card; firmware unchanged | **Modern vendor sabers (89sabers, Sabertrio, KR v3+)** that ship `SAVE_PRESET`. Sidesteps the flash workflow entirely. The recommended path for design-to-saber today. |

The "Recommended path" column in the matrix below picks the safest known-working option per chassis.

---

## Compatibility matrix

> **Reading the matrix.** ✅ = bench-confirmed boot or runtime accept. ❌ = empirically known to fail. ⚠ = partial (works with documented caveat). **TBD** = no test board yet; please contribute if you have one. Dates reference session recaps in [`docs/archive/`](archive/) or PRs in the [GitHub history](https://github.com/kenkoller/KyberStation/pulls?q=is%3Apr+is%3Aclosed).

| Vendor / Chassis | ProffieOS version | KyberStation default config works? | Known config delta | Recommended path | Last tested | Notes |
|---|---|---|---|---|---|---|
| **89sabers V3.9-BT (Feasycom BT module)** | 7.12 (factory firmware) | ✅ via vendor profile (this PR — emitted `config.h` matches factory chassis shape; real-hardware boot pending Ken's next bench session), ✅ runtime presets (PR #325 + #331, bench-validated 2026-05-16) | `NUM_BLADES=2`, 128 LED main blade on `bladePin`, 30 LED crystal chamber on `blade2Pin`, `ORIENTATION USB_TOWARDS_BLADE`, `ENABLE_SERIAL` (BT module on Serial3), Fett263 gesture defines (`FETT263_TWIST_ON`, `FETT263_STAB_ON`, `FETT263_SWING_ON_NO_BM`, `MOTION_TIMEOUT`), plus likely-required BT defines (`BLE_PASSWORD`, `BLE_NAME`, `BLE_SHORTNAME`) not in the public CCSabers V3.9 config pack (intentionally NOT in the chassis profile — those belong at the post-launch v0.17+ Bluetooth-feature UI layer to avoid PIN/identity collisions across users) | **Vendor profile** (`89sabers-v3.9-bt`) — emit config.h tailored to the chassis. Also **Runtime presets (SD card)** ✅ for users who want to skip the flash workflow entirely. | 2026-05-16 ([PR #325](https://github.com/kenkoller/KyberStation/pull/325) + [PR #331](https://github.com/kenkoller/KyberStation/pull/331)) | Vendor profile shipped via this PR — chassis topology + Fett263 gesture suite + `ENABLE_SERIAL` baked in. The emitted `config.h` matches the factory chassis shape per the 2026-05-14 bench recap, but **bench validation on real hardware is still pending Ken's next bench session** (two prior compile+flash attempts 2026-05-14/15 boot-looped — see [`SESSION_2026-05-14_V39BT_BENCH.md`](archive/SESSION_2026-05-14_V39BT_BENCH.md) + [`SESSION_2026-05-15_V39BT_BENCH.md`](archive/SESSION_2026-05-15_V39BT_BENCH.md) — and the residual delta from vendor `89sabers-config.h` is unresolved). Runtime presets path works end-to-end: 15 curated Phase C presets loaded, ignited, hilt-mounted A/B validated. Recovery via `dfu-util` from factory backup is reliable (~30 s, validated twice). Phase C custom colors render at full brightness after the 16-bit RGB encoding fix shipped in PR #325 commit `45737f2` — see [`HARDWARE_FIDELITY_PRINCIPLE.md`](HARDWARE_FIDELITY_PRINCIPLE.md) audit-history entry for the saga. |
| **Sabertrio Standard (V2)** | 7.x (`s3button_config.h`) | ⚠ partial — profile exists as `experimental` stub but emits only the primary 115-LED blade. Sabertrio chassis also wire 2 side blades (Krosgaard variants) + a CreeXPE2 activation-switch LED that KyberStation Phase 1 cannot emit. Vendor-specific prop file `s3button_config.h` is NOT in stock ProffieOS. | `NUM_BLADES=4` actual (KyberStation emits 1), `BLADE_DETECT_PIN 17` (KyberStation doesn't model blade-detect), `SHARED_POWER_PINS`, custom prop file | **Custom-paste** for full chassis fidelity. Vendor profile is a starting reference only. | Not bench-tested (profile shipped 2026-05-07, [PR #321](https://github.com/kenkoller/KyberStation/pull/321)) | Sourced from Ricapar's third-party [`sabertrio-proffie`](https://github.com/Ricapar/sabertrio-proffie) repo — the only public precedent for Sabertrio-aware Proffie tooling. Sabertrio doesn't publish factory configs themselves. Profile shipped as experimental; users with real Sabertrio sabers should switch to **Custom · Paste your config.h** instead. |
| **89sabers V3.9 (non-BT, stock)** | 7.12 (CCSabers `89V3_allfont.h`) | TBD — no test board yet. Profile exists at `packages/hardware-profiles/src/profiles/89sabers-v3.9.ts` with values sourced verbatim from CCSabers' published OS 7.12 config pack. | `NUM_BLADES=2`, 128 LED main + 30 LED crystal chamber, `ORIENTATION USB_TOWARDS_BLADE`, full Fett263 gesture suite (14 `#define`s) | **Vendor profile + compile + flash** (once boot-confirmed), or **runtime presets (SD card)** as the lower-risk option | Not tested on real hardware (community-validated config; KyberStation has not boot-confirmed) | This profile is the non-BT V3.9 variant. The CCSabers pack covers 11 colorways (`89V3_OBI.h`, `89V3_Purple.h`, `89V3_Green.h`, etc.) — all share the same dual-blade declaration. The BT-variant chassis (above) uses a different `89sabers-config.h` not in this pack. If you own a non-BT V3.9 and have flashed it successfully with KyberStation, please file a hardware report (see [§How to add a chassis](#how-to-add-a-chassis)) so we can flip this row to ✅. |
| **Stock Proffieboard V3.9 (Hubbe direct)** | Any 7.x | TBD — no test board yet. KyberStation defaults assume stock single-blade Proffieboard topology (`NUM_BLADES=1`, 144 LED, pins 2+3, stock Fett263 prop). | None expected (this is what KyberStation defaults target) | **Compile + flash (default)** | Not bench-tested as of 2026-05-17 | This is the "happy path" chassis KyberStation's defaults are designed for. If you have a stock board from [fredrik.hubbe.net](https://fredrik.hubbe.net/lightsaber/v3/) or assembled your own and have flashed a KyberStation export successfully, please file a hardware report — confirming this row to ✅ is the single most impactful matrix update we can land. |
| **Stock Proffieboard V2.2 (Hubbe direct)** | Any 7.x | TBD — no test board yet. Same KyberStation defaults; fqbn flips to `ProffieboardV2-L433CC`. | Flash workflow swaps fqbn to `proffieboard:stm32l4:ProffieboardV2-L433CC:dosfs=sdmmc1,usb=cdc_msc` and backs up 262144 bytes (vs 524288 on V3). See [FLASH_GUIDE.md §7](FLASH_GUIDE.md#7--mandatory-back-up-your-existing-firmware). | **Compile + flash (default)** | Not bench-tested | V2 boards have 256 KiB flash vs V3's 512 KiB; otherwise the workflow is identical. |
| **89sabers Kylo crossguard** | 7.x | TBD — no test board, no profile yet | `NUM_BLADES=3`, 144 + 26 + 26 LED layout, pins 2+3, 1, 4 (three blades total) | Once profile lands: **vendor profile + compile + flash** | Not tested | Documented in [`HARDWARE_COMPATIBILITY_STRATEGY.md`](research/HARDWARE_COMPATIBILITY_STRATEGY.md) §1 as a target for the v0.18+ profile expansion. |
| **KR Sabers V3** | 7.x | TBD — no test board, no profile yet | Vendor-specific (similar customization pattern to 89sabers per [`FLASH_GUIDE.md §10`](FLASH_GUIDE.md#10-vendor-customized-boards)) | **Custom-paste** (until profile lands) | Not tested | Same warning as 89sabers — don't touch Option Bytes; flash Bank 1 only. |
| **Saberbay V3** | 7.x | TBD — no test board, no profile yet | Vendor-specific (similar customization pattern to 89sabers) | **Custom-paste** (until profile lands) | Not tested | Same warning as 89sabers — don't touch Option Bytes; flash Bank 1 only. |
| **Vader's Vault / Goth-3** | 7.x | TBD — no test board, no profile yet | Vendor-specific. DFU entry combo: hold **AUX** while plugging USB (vs POWER + AUX on most other vendors) — see [`FLASH_GUIDE.md §6`](FLASH_GUIDE.md#6-enter-dfu-mode). | **Custom-paste** (until profile lands) | Not tested | |
| **Other vendor chassis (Electrum, SaberMach, etc.)** | varies | TBD — likely won't boot with KyberStation defaults; chassis customizations vary widely | Vendor-specific | **Custom-paste** until profile lands, or **runtime presets** if the chassis ships `SAVE_PRESET` | Not tested | |

### A note on the original 89sabers V3.9 (non-BT) bench board

The original 89sabers V3.9 (non-BT) board used for early hardware validation was **bricked beyond Tier 1+2 recovery** on 2026-04-29 during an Option Byte write experiment. It was retired 2026-05-01 and replaced with the V3.9-BT board (above). Don't read the V3.9-BT row as a statement about the non-BT V3.9 — they're distinct chassis with distinct firmware. The non-BT V3.9 row is "TBD" specifically because we don't have a working test board for it. Forensic backups from the bricked board live in `backups/89sabers-firmware-recovery-2026-04-30/` outside the repo.

---

## How to add a chassis

If you've tested KyberStation against a chassis that isn't in the matrix above — or you want to flip a TBD row to ✅ / ❌ — please open a PR adding or updating the row. The matrix is intentionally community-PR-able.

**What to include in your PR:**

1. **A new row (or edit) in the matrix above** with all columns filled in. Use the existing rows as a shape reference.
2. **The boot log from your saber.** Capture per the [`FLASH_GUIDE.md` boot-diagnostic workflow](FLASH_GUIDE.md#if-the-flash-fails--capture-boot-logs) — attach `screen /dev/cu.usbmodem* 115200` to the chip, reset the board, and capture the first ~5 seconds of init output. If the flash succeeded, paste the `version` / `pli` output instead.
3. **The diff against KyberStation defaults** (or the matrix's listed config delta). For a vendor chassis, this is usually `NUM_BLADES`, blade pin assignments, prop defines, orientation, BT-related defines. If you used **Custom · Paste your config.h**, attach a sanitized version of your factory config (strip out anything identifying like personal preset names if you prefer).
4. **Which path you used** — `compile + flash` (default), vendor profile, custom-paste, or runtime presets.
5. **Your environment** — OS (macOS / Linux / Windows + WSL or native), browser (if you used the runtime presets export), `arduino-cli version`, ProffieOS git tag.

**For a quick non-PR report** (you don't want to write the matrix row yourself), file a [hardware report issue](https://github.com/kenkoller/KyberStation/issues/new?template=hardware_report.md) with the same info. We'll PR the matrix row on your behalf.

**For a brand-new vendor profile** (you want to land a YAML/TS profile that other users can pick from the chassis picker, not just a matrix row), see [`HARDWARE_COMPATIBILITY_STRATEGY.md` §4](research/HARDWARE_COMPATIBILITY_STRATEGY.md#4-the-architecture--hardware-profiles-as-first-class-data) for the data shape and [`packages/hardware-profiles/src/profiles/`](../packages/hardware-profiles/src/profiles/) for the seed profiles to copy.

---

## Honesty layer

A few realities to set expectations:

- **The runtime presets path is the path that works today** for most modern vendor sabers. It sidesteps the compile-flash gap entirely and ships designs to the saber by writing `presets.ini` to the SD card. If you have a vendor chassis with `SAVE_PRESET` in its firmware (89sabers V3.9-BT confirmed; Sabertrio, KR v3+ likely), use this path unless you have a specific reason to flash full firmware.
- **The compile-flash path is the long-running gap.** Zero KyberStation-emitted full configs have been bench-confirmed to boot on a vendor chassis as of 2026-05-17. The one successful real-hardware boot (2026-04-27 modulation test on 89sabers V3.9) required hand-patching the emitted C++. Hardware Profiles MVP work (v0.17 target) is the structural fix; see [`POST_LAUNCH_BACKLOG.md`](POST_LAUNCH_BACKLOG.md) "Recommended next sequence" item 5.
- **Recovery is reliable.** Every chassis tested so far has restored cleanly from a `dfu-util` Bank 1 backup taken before the failed flash. The mandatory backup step in [`FLASH_GUIDE.md §7`](FLASH_GUIDE.md#7--mandatory-back-up-your-existing-firmware) is the safety net that turns "I bricked my saber" into "I lost 30 seconds." Do not skip it.
- **This is a hobby project, not a Tier-1 product.** Compatibility data is added as the community contributes it. If your chassis isn't covered, that's a gap in our test coverage, not a statement that KyberStation can't support it — it just hasn't been tested yet.

---

## See also

- [`POST_LAUNCH_BACKLOG.md`](POST_LAUNCH_BACKLOG.md) — overall roadmap; Hardware Profiles MVP is item 5 in the "Recommended next sequence."
- [`docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md`](research/HARDWARE_COMPATIBILITY_STRATEGY.md) — architectural plan for Hardware Profiles v0.17 / Factory Config Import v0.18 / Diagnostic workflow v0.19.
- [`docs/research/RUNTIME_PRESETS_HARDWARE_TEST_PLAN.md`](research/RUNTIME_PRESETS_HARDWARE_TEST_PLAN.md) — the bench test plan you can follow on your own saber to validate Phase A + Phase C runtime presets.
- [`FLASH_GUIDE.md`](FLASH_GUIDE.md) — end-to-end compile-flash workflow with mandatory backup + recovery.
- [`HARDWARE_FIDELITY_PRINCIPLE.md`](HARDWARE_FIDELITY_PRINCIPLE.md) — the north star for engine + codegen architectural decisions and the 16-bit RGB smoking-gun audit history.
- [`BOARD_COMPATIBILITY_ROADMAP.md`](BOARD_COMPATIBILITY_ROADMAP.md) — board-family (Proffieboard / CFX / GHv3 / Xenopixel / Verso) export-format roadmap. This page is the chassis-level (vendor / model) compatibility matrix; that page is the board-family-level export-path roadmap. They complement each other.
- [`docs/archive/SESSION_2026-05-14_V39BT_BENCH.md`](archive/SESSION_2026-05-14_V39BT_BENCH.md) — the 89sabers V3.9-BT compile+flash failure analysis that motivated this matrix.
