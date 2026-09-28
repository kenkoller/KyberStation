# Synthetic golden fixtures

Byte-exact expected output for every built-in preset, checked by
`packages/codegen/tests/synthetic.test.ts`.

Each preset has a pair:

- `<preset-id>.cpp` — `generateStyleCode(preset.config)` exactly as the
  editor shows it (modulation comment block included), plus a trailing
  newline.
- `<preset-id>.json` — the preset's `BladeConfig` that produced it, keys
  sorted.

The test fails when either file differs from what the current code
produces, when a preset has no fixture, or when a fixture's preset no
longer exists.

## Regenerating

Don't hand-edit these files. After an intentional change to codegen or to a
preset, run:

```bash
KYBERSTATION_WRITE_FIXTURES=1 pnpm --filter @kyberstation/codegen test
```

That rewrites every pair and deletes fixtures for removed presets. Review
`git diff packages/codegen/tests/fixtures/synthetic/` before committing:
the `.cpp` diff is the change to the ProffieOS code users get. A `.json`
change with no matching `.cpp` change means a preset edit didn't reach the
generated code, which is worth a second look.
