# ProffieOS Runtime Preset File Format

**Status:** Reference. Verified against ProffieOS v7.12 source on 2026-05-15.
**Companion code:** [`packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`](../../packages/codegen/src/emitters/ProffieRuntimeEmitter.ts) + tests.

This doc captures the on-disk format ProffieOS firmware uses for runtime-loaded presets (the `SAVE_PRESET` / Workbench feature). KyberStation emits this file directly so users can change presets without re-flashing firmware. The doc exists so future contributors can reason about the format without re-reading ProffieOS C++ source line by line.

## Why this matters

Modern vendor lightsabers (89sabers V3.9-BT, Sabertrio with `SAVE_PRESET`, KR Sabers v3+, anything compiled with the Fett263 prop's runtime-preset mode) load preset data from an SD-card file at runtime instead of from compiled `config.h`. This means:

- **Changing presets does not require flashing firmware.** The user drops a file on the SD card and the firmware reads it.
- **KyberStation can deliver "design preset → put it on saber" without owning the firmware-flash pipeline** for that chassis. That sidesteps the V3.9-BT factory-config knowledge gap discovered in [`docs/archive/SESSION_2026-05-15_V39BT_BENCH.md`](../archive/SESSION_2026-05-15_V39BT_BENCH.md).

## File location

- **Path:** SD card root, filename `presets.ini`.
- ProffieOS also writes `presets.tmp` as a double-buffer for atomic saves. KyberStation only writes `presets.ini`; ProffieOS will handle subsequent swaps if the user uses the saber's on-device edit menu.
- Source: [`/Users/KK/ProffieOS/common/current_preset.h`](/Users/KK/ProffieOS/common/current_preset.h) — `CreateINI()` (L298), `SaveAtLocked()` (L347).

## Schema

```
installed=<install_time_string>
new_preset
font=<font_folder>
track=<track_file>
style=<style_string_blade_1>
style=<style_string_blade_2>
...
name=<preset_name>
variation=<int>
new_preset
font=...
...
end
```

**Critical invariants:**

1. **First line MUST be `installed=`** and the value MUST byte-match the firmware's compile-time `install_time` constant (typically `__DATE__ " " __TIME__` at build, e.g. `Apr 21 2026 08:44:54`). If not, ProffieOS's `ValidatePresets()` rejects the file silently and falls back to compiled-in presets. See `current_preset.h:231-254` for the validator.
2. **Each preset block opens with `new_preset`** on its own line (L131).
3. **One `style=` line per blade.** ProffieOS's `NUM_BLADES` is compile-time, so KyberStation must know how many blades the user's firmware was built for. The runtime emitter duplicates the same style string across all blades to keep secondary blades predictable.
4. **File terminates with `end`** (case-insensitive on read, lowercase on write — L142, L311).
5. **Keys on disk are lowercase:** `font`, `track`, `style`, `name`, `variation`. The `Print()` method that displays presets over USB CDC uses UPPERCASE — that's display-only, not the disk format.
6. **Comments starting with `#`** are skipped (L123). Unknown variables are silently ignored — the parser is lenient.
7. **No checksums on the plain-text format.** ProffieOS also supports a `SafeFileHeader` checksummed variant, but the plain-text path is sufficient and used by the on-device save logic.

## Style strings

Each `style=` value must pass `IsValidStyleString()` (L38):

```cpp
static bool IsValidStyleString(const char* s) {
  if (strlen(s) < 5) return false;
  for (; *s != ' '; s++) {
    if (*s >= 'a' && *s <= 'z') continue;
    return false;
  }
  for (; *s; s++) {
    if (*s >= '0' && *s <= '9') continue;
    if (*s == ' ') continue;
    if (*s == ',') continue;
    return false;
  }
  return true;
}
```

Format: **lowercase verb + space + digits/spaces/commas only.** The parser ([`styles/style_parser.h`](/Users/KK/ProffieOS/styles/style_parser.h)) dispatches on the verb. Recognized verbs are registered in `named_styles[]`:

| Verb | Description | Args |
|------|-------------|------|
| `builtin` | Reference compiled preset bank | `presetIndex bladeNumber [overrides...]` |
| `standard` | Standard parameterized blade | color, clash color, extension time, retraction time |
| `advanced` | 11-slot fully-parameterized blade | colors, blast, lockup, clash, timing, spark tip |
| `fire` | Fire blade | warm color, hot color |
| `unstable` | Unstable blade | warm/warmer/hot/sparks/timing |
| `strobe` | Strobe blade | standby/flash colors, frequency, timing |
| `cycle` | Color-cycle blade | start/base/flicker/blast/lockup colors |
| `rainbow` | Rainbow blade | extension + retraction time |
| `charging` | Charging mode | none |

The non-`builtin` verbs are compiled in by default and elided only when `DISABLE_BASIC_PARSER_STYLES` is set (rare in Fett263 prop builds).

### `builtin N M` semantics

`BuiltinPresetAllocator::make()` ([`style_parser.h:15-41`](/Users/KK/ProffieOS/styles/style_parser.h:15)):

```cpp
IntArg<1, 0> preset_arg;     // N — 0-based index into current_config->presets[]
IntArg<2, 1> style_arg;      // M — 1-based blade number
int preset = preset_arg.getInteger(0);
int style = style_arg.getInteger(0);
Preset* p = current_config->presets + preset;
// Returns p->style_allocator##M, then Shift(2) so remaining args go to underlying style.
```

KyberStation Phase A only uses two-arg form: `builtin N M`. Additional args (`builtin N M R,G,B ...`) can override `RgbArg<N>` / `IntArg<N>` slots in the underlying compiled style, but the slot-to-meaning mapping is firmware-schema-dependent and not in scope for Phase A.

### Empirical reference

From the live 89sabers V3.9-BT firmware's `list_presets` USB CDC output (2026-05-15 bench session):

```
v7.12
config/89sabers-config.h
prop: SaberFett263Buttons
buttons: 2
installed: Apr 21 2026 08:44:54
FONT=Graflex;common
TRACK=tracks/Graflex.wav
STYLE1=builtin 0 1
STYLE2=builtin 0 2
NAME=Graflex
VARIATION=0
...
```

That's the in-memory representation displayed over serial. The on-disk format is the same data, lowercased keys, with `new_preset` markers between entries instead of newlines.

## Read/write lifecycle

- **First boot:** If `presets.ini` doesn't exist, `CreateINI()` writes one populated from the compiled-in preset bank (L298). So a freshly-flashed saber always has a `presets.ini` on its SD card after one power-on.
- **Save (button menu):** `SaveAtLocked()` (L347) uses the `.ini` / `.tmp` double-buffer with an incrementing `iteration_` counter to handle power loss mid-write.
- **Load:** `Load(int preset)` (L318) reads the active file via `OpenPresets()` which picks the valid copy with the higher iteration. `SetPreset()` (L413) is called on button cycle or boot.
- **When changes are picked up:** at next reboot, or sooner if the prop file calls `SetPreset()` after the user triggers a preset-change button combo. KyberStation users should expect to power-cycle.

## KyberStation emitter

[`buildRuntimePresetsFile`](../../packages/codegen/src/emitters/ProffieRuntimeEmitter.ts) is a pure function that takes a list of preset inputs + `installTime` + `numBlades` and returns the literal file content. Platform-side I/O for discovering `installTime` lives in `apps/web/lib/runtimePresetIO.ts` so the codegen package stays pure.

Tests in [`packages/codegen/tests/proffieRuntimeEmitter.test.ts`](../../packages/codegen/tests/proffieRuntimeEmitter.test.ts) byte-pin the format. If you change the wire format, those tests must change with it — be explicit about it in the PR.

## Out of scope (Phase A)

- **Color override** via additional `builtin N M R,G,B ...` args. v0.18 work; needs per-chassis `RgbArg<N>` schema knowledge.
- **`standard` / `advanced` / `fire` verbs** to build presets independent of the compiled-in bank. Later.
- **Importing existing `presets.ini`** back into KyberStation's editor for round-trip editing. Separate feature.
- **Checksummed `SafeFileHeader` format.** Plain text is sufficient.

## References

- ProffieOS source: [`/Users/KK/ProffieOS/common/current_preset.h`](/Users/KK/ProffieOS/common/current_preset.h)
- Style parser: [`/Users/KK/ProffieOS/styles/style_parser.h`](/Users/KK/ProffieOS/styles/style_parser.h)
- File reader: `/Users/KK/ProffieOS/common/file_reader.h`
- Bench session log: [`docs/archive/SESSION_2026-05-15_V39BT_BENCH.md`](../archive/SESSION_2026-05-15_V39BT_BENCH.md)
- Handoff prompt: [`docs/archive/NEXT_SESSION_RUNTIME_PRESETS_2026-05-15.md`](../archive/NEXT_SESSION_RUNTIME_PRESETS_2026-05-15.md)
- Hubbe Crucible — Workbench / Static Configs: https://crucible.hubbe.net/t/presets-ini-edit-mode-proffieos-workbench-and-static-configs/2526
- POD wiki — changing preset on startup: https://pod.hubbe.net/sound/changing-preset-on-startup.html
