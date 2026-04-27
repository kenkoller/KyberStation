# Hardware-test config build scripts

One-off scripts used by Claude Code agents to drive hardware-validation
flash tests on real Proffieboard hardware. Lives outside the workspace
package graph so it doesn't ship to users — it's tooling for the
maintainer's V3.9 validation runs.

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
