# Board Compatibility Roadmap

Living document. Last updated: **2026-05-03**.

KyberStation was originally designed as a Proffieboard tool — the only
saber platform with full programmatic control via ProffieOS. Around v1.0
the editor + visualizer were extended to every major saber board, but
the **export** path stayed Proffieboard-shaped. This roadmap tracks the
work to make non-Proffie support genuinely useful.

## Current status (post-2026-05-03)

| Board | Editor | Visualizer | Export | Flash | Status |
|---|---|---|---|---|---|
| **Proffieboard V3** | ✅ full | ✅ full | ✅ flashable `config.h` | ✅ verified on hardware | **TIER 1** |
| **Proffieboard V2** | ✅ full | ✅ full | ✅ flashable `config.h` | 🟡 untested on hardware | TIER 1 (pending validation) |
| **Golden Harvest V3/V4** | ✅ full | ✅ full | 🟡 design-reference `config.ini` | ❌ requires Proffie | TIER 2 |
| **CFX (Crystal Focus X)** | ✅ full | ✅ full | 🟡 design-reference `config.txt` | ❌ requires Proffie | TIER 2 |
| **Xenopixel V3** | ✅ full | ✅ full | 🟡 design-reference `config.json` (PR #283) | ❌ preloaded effects | TIER 2 |
| **Xenopixel V2** | ✅ full | ✅ full | 🟡 design-reference `config.json` | ❌ preloaded effects | TIER 2 |
| **Verso** | ✅ preview | ✅ full | ❌ none | ❌ requires Proffie | TIER 3 |
| **Asteria / SN-Pixel V4 / S-RGB / LGT Baselit** | ✅ preview | ✅ partial | ❌ none | ❌ different ecosystem | TIER 3 |

**Status legend:**
- ✅ full = honest end-to-end support
- 🟡 partial = present but with caveats (e.g. design-reference vs flashable)
- ❌ none = not supported

## Honesty layer (shipped 2026-05-03 in PR #283)

The Xenopixel ZIP export now includes:
1. `_kyberstation_note` field at the top of `config.json` flagging the
   design-reference contract in-band
2. `KYBERSTATION_README.txt` at the ZIP root explaining what the export
   is, what it isn't, and how to actually use it on Xenopixel hardware
3. Updated copy in `CodeOutput` + `CompatibilityPanel` distinguishing
   flashable vs design-reference exports

This is the **seam** for future work. When real Xenopixel SD-card
format support lands, the JSON's `exportType` field swaps from
`'design-reference'` to `'flashable'` and the README content changes.

## Roadmap

### Phase 1: Audit + honesty extension (next 1-2 sessions)

**Goal:** Apply the design-reference honesty pattern to CFX + Golden
Harvest if their existing exports are also invented.

- [ ] **CFX format research.** `apps/web/lib/zipExporter.ts:98-144`
  generates `config.txt` with `[profile1]` / `font=font1` /
  `name=...` / `color=...` blocks. Verify against actual CFX
  community-documented format. If invented, apply the same
  `_kyberstation_note` + ZIP README treatment as Xenopixel.
- [ ] **Golden Harvest format research.** `zipExporter.ts:148-173`
  generates `config.ini` with `[board]` + `[profile1]` blocks. Verify
  vs real GH firmware. If invented, apply honesty layer.
- [ ] **CompatibilityPanel** `customStyles` cells for non-Proffie
  boards (currently `'partial'`) should be re-audited and downgraded
  to `'none'` if the export isn't actually flashable.

### Phase 2: Real Xenopixel SD-card format (3-5 sessions)

**Goal:** Generate a Xenopixel SD-card layout that genuinely improves
the user's setup workflow even if KyberStation can't flash firmware
directly.

The Xenopixel SD card structure (from community docs, requires
verification):
- `audio/` or `bank1/`, `bank2/`, ...`bank16/` — preset banks
- `tracks.txt` per bank — track index and looping behavior
- Audio files: `.wav` or vendor-specific format
- Per-bank color config in `config.txt` or `colors.txt` (varies by
  firmware variant — Greyscale Fighter, Polaris, etc.)

Sub-tasks:
- [ ] **Community format research.** Document at least 3 popular
  Xenopixel firmware variants (Greyscale Fighter, Polaris, generic
  Xenopixel). Source: vendor docs (89sabers, KR Sabers, Saberbay,
  Vader's Vault), Reddit r/lightsabers, ProffieOS Discord.
- [ ] **SD card layout schema.** Pick the most common variant first.
  Schema lives in `apps/web/lib/xenopixel/` with format
  documentation alongside the implementation.
- [ ] **Bank-folder generation.** Replace generic `font1/`, `font2/`
  with `bank1/`, `bank2/` and emit `tracks.txt` correctly.
- [ ] **Color config emission.** Per-bank color settings in the
  variant's expected format.
- [ ] **Firmware-variant picker.** UI selection so users pick their
  Xenopixel firmware variant, exports adapt accordingly.
- [ ] **Hardware validation.** Test the generated SD card on a real
  Xenopixel saber. Multiple variants if possible.

### Phase 3: Per-board tier metadata + UI (1-2 sessions)

- [ ] Add `exportType: 'flashable' | 'design-reference' | 'none'` to
  `BoardProfile` so the picker / Output panel / status bar can
  programmatically distinguish.
- [ ] Visual indicator on the board picker when the user selects a
  design-reference board (small chip: "DESIGN REFERENCE").
- [ ] Pre-export confirmation modal for design-reference boards on
  first export per session: "This is a design reference, not
  flashable firmware — read the included README for usage. [OK]
  [Don't show again]"

### Phase 4: CFX + Golden Harvest real-format support (2-3 sessions each)

After Xenopixel pattern is proven, replicate for CFX + GH if their
firmware actually accepts user-authored configs (research-pending).

### Phase 5: Cross-board feature mapping (ongoing)

- [ ] When a user designs with a Proffie-only feature (modulation,
  spatial effects, Mix templates) selected, surface a "this won't
  carry over to {board}" warning if a non-Proffie board is the
  active profile.
- [ ] **Closest-equivalent suggestion.** "Your design uses
  `style: 'unstable'` — the closest Xenopixel preset slot is
  approximately #14 (default red unstable). Set your saber's
  bank #14 base color to RGB(255, 14, 0)."

### Phase 6: Web Bluetooth path (post-v0.17)

For boards with Bluetooth (incl. Xenopixel BT variants, recent GH BT,
Verso), explore Web Bluetooth direct config push. Per CLAUDE.md
v0.17 plan + `docs/research/BLUETOOTH_FEASIBILITY.md`.

## Why this matters

KyberStation is the most polished saber-design tool in the hobby. Most
hobbyists don't run Proffieboard — Xenopixel is genuinely the most
common board for first-time builders due to its budget price point.
**Right now, those users can use the editor but can't take their
design anywhere useful.** Even a design-reference workflow that
demonstrates the colors + timings they should configure manually is a
huge upgrade over "guess from the visualizer."

The honest ground truth: KyberStation will probably never *flash*
Xenopixel boards directly (the firmware architecture precludes it
without reverse-engineering work that's likely also a license
violation). But we can ship the **best possible design + reference
workflow** for those users, and for many that will be enough.

## Out of scope (forever)

- Reverse-engineering Xenopixel / CFX / GH firmware to enable direct
  flashing. License + ethics + hardware-bricking risk all preclude.
- Generating board-specific binary firmware from the visualizer.
- Pretending the visualizer's output 1:1 matches what a non-Proffie
  board will produce — the board profile in `boardProfiles.ts`
  declares supported features per board explicitly.
