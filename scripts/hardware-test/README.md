# Hardware-test config build scripts

One-off scripts used by Claude Code agents to drive hardware-validation
flash tests on real Proffieboard hardware. Lives outside the workspace
package graph so it doesn't ship to users — it's tooling for the
maintainer's V3.9 validation runs.

## Full bench session — three scripts

For the **smoking-gun verification workflow** (validate the 16-bit RGB scaling
fix on hardware end-to-end), run all three in sequence:

```bash
# 1. Generate the curated 15 presets.ini for the runtime-preset path
node scripts/hardware-test/build-bench-validation-presets.mjs \
  --install-time '<paste from `pli` over serial>' --num-blades 2 --phase c

# 2. Generate 16 voice-callout font.wav files so cycling presets is
#    audibly distinct
scripts/hardware-test/generate-tts-prompts.sh

# 3. With the saber's SD mounted on the Mac via USB SD reader, deploy
#    both: backup + font-content upgrades (where ~/SaberFonts has KP
#    matches) + TTS overlay.
scripts/hardware-test/deploy-sd-bench-setup.sh /Volumes/<SD_NAME>
```

For preset-only loading via serial (no SD pull), step 1 + `load-runtime-presets.sh`
is enough — see that script's header for the serial-command pattern.

## `generate-tts-prompts.sh`

macOS-only. Uses `say` + `afconvert` to produce one `font.wav` per
saber-side font folder. The voice prompt plays when ProffieOS loads
a preset's font, so cycling presets has an audible distinction even
when fonts share a similar hum.

Override the voice with `TTS_VOICE=Samantha scripts/.../generate-tts-prompts.sh`.

## `deploy-sd-bench-setup.sh`

macOS-only. With the saber's SD mounted via USB SD reader, performs:

1. **Backup** — `ditto` snapshot of the entire SD to `backups/89sabers-v39bt-<date>/sdcard/`.
   (Note: must use `ditto` not `rsync --info=progress2` because macOS
   ships rsync 2.x which silently fails on the 3.x flag.)
2. **Font content upgrades** — `rsync -a --delete` overlays high-quality
   Kyberphonic fonts from `~/SaberFonts/` onto saber-side folder names
   where a match exists (Vader_KP_R1 → Vader, Ben_KP → Ben, etc.).
3. **TTS overlay** — copies each `font.wav` from the TTS bundle.
4. **Verification** — counts + sizes.

Idempotent. Re-running creates a fresh dated backup each time.

## `build-bench-validation-presets.mjs`

Used 2026-05-16 to validate the **smoking-gun fix** (PR #325 commit
`45737f2`) end-to-end on real hardware: 15 curated presets emitted via
the `proffie_runtime` Phase C path, dropped on the saber's SD card,
brightness verified blade-by-blade.

**What it does**: imports `buildRuntimePresetsFile` from
`@kyberstation/codegen` and `ALL_PRESETS` from `@kyberstation/presets`,
picks 15 iconic canon presets spanning the color wheel (red / orange /
yellow / green / blue / purple / magenta / white) and the style mix
(stable / rotoscope / unstable), and emits a `presets.ini` that
exercises the 16-bit RGB scaling fix on every preset.

```bash
# Default: Phase C (advanced verb), 2 blades, placeholder install_time
node scripts/hardware-test/build-bench-validation-presets.mjs
# → scripts/hardware-test/bench-output/curated-15.ini
```

```bash
# With real install_time from your saber (run `pli` over serial first):
node scripts/hardware-test/build-bench-validation-presets.mjs \
  --install-time '2026-05-16T12:34:56' \
  --num-blades 2 --phase c
```

**Bench workflow** (89sabers V3.9-BT or compatible SAVE_PRESET firmware):

```bash
# 1. Capture your firmware's install_time
scripts/hardware-test/proffie-serial.sh
# At the > prompt, type: pli
# Note the `installed=...` value.

# 2. Generate presets.ini matching your firmware
node scripts/hardware-test/build-bench-validation-presets.mjs \
  --install-time '<paste>' --num-blades 2 --phase c

# 3a. SD-card path (preferred — closer to user flow):
#     Switch saber to USB MSC mode, drop curated-15.ini at SD root,
#     safely eject, reboot saber.

# 3b. Serial path (no install_time match required):
scripts/hardware-test/load-runtime-presets.sh \
  scripts/hardware-test/bench-output/curated-15.ini

# 4. Verify: cycle through all 15 presets via main button.
#    Each blade should render at FULL brightness. If any preset is dim,
#    that's a smoking-gun regression — investigate the emit-to-parser
#    encoding first per docs/research/EMIT_PARSER_AUDIT.md.
```

**Phase A vs Phase C**:
- `--phase a` → `style=builtin N M` (factory-bank references). Validates
  preset ordering / font assignment / install_time matching. Does NOT
  exercise the smoking-gun fix path.
- `--phase c` → `style=advanced R,G,B …` (16-bit-scaled custom colors).
  EXERCISES the smoking-gun fix. Use for brightness validation.

Output dir `scripts/hardware-test/bench-output/` is gitignored so each
bench run produces a fresh artifact tied to the user's install_time.

## `build-modulation-test-config.mjs`

Used 2026-04-27 evening to validate v1.1 Core's live AST-level modulation
binding pipeline on a real Proffieboard V3.9 (89sabers, macOS, Brave).

**What it does**: imports `generateStyleCode` + `buildConfigFile` from
`@kyberstation/codegen`, constructs a BladeConfig with a swing→shimmer
modulation binding, emits the full `config.h`, and post-processes the
shimmer-Mix slot to demonstrate v1.2-style hue mixing (blue↔red) ahead
of the architectural lift. Writes to
`ProffieOS/config/v3-modulation-test.h`.

**Output AST shape** (after post-processing):
```cpp
Mix<
  Scale<SwingSpeed<400>, Int<0>, Int<32768>>,
  Rgb<0,140,255>,
  Rgb<255,40,40>
>
```

— blade primary color is the live driver, no AudioFlicker audio-gate.

## Prerequisites

```bash
pnpm install
pnpm --filter=@kyberstation/codegen build   # populates dist/
```

The script imports built artifacts via relative path (`../../packages/codegen/dist/index.js`)
because pnpm's `node-linker=hoisted + symlink=false` config (per CLAUDE.md
arch decision #1) prevents a top-of-repo workspace import.

## Full hardware-test workflow

```bash
# 1. Build the config
node scripts/hardware-test/build-modulation-test-config.mjs

# 2. Point ProffieOS.ino at it (one-time)
sed -i.bak 's|"config/config.h"|"config/v3-modulation-test.h"|' ProffieOS/ProffieOS.ino

# 3. Compile
arduino-cli compile \
  --fqbn 'proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,usb=cdc_msc' \
  --output-dir /tmp/proffie-build \
  ProffieOS/ProffieOS.ino

# 4. Put board in DFU mode (hold BOOT, tap RESET, release BOOT) then flash
~/Library/Arduino15/packages/proffieboard/hardware/stm32l4/4.6/tools/macosx/stm32l4-upload \
  0x1209 0x6668 /tmp/proffie-build/ProffieOS.ino.dfu

# 5. Restore ProffieOS.ino afterward
mv ProffieOS/ProffieOS.ino.bak ProffieOS/ProffieOS.ino
```

## Adding new test variants

Edit the `modulation` constant in `build-modulation-test-config.mjs`. The
binding shape must match what the codegen consumes — see
`packages/engine/src/modulation/types.ts` for `SerializedBinding` and
`packages/codegen/src/proffieOSEmitter/mapBindings.ts` for the
mappable-source heuristics. Note especially the canonical expression AST
format (`{ kind: 'literal' | 'var' | 'binary' | 'call' }`, NOT
`{ type: 'BinaryOp' | 'Number' | 'Variable' }` — the latter looks correct
but silently snapshots).
