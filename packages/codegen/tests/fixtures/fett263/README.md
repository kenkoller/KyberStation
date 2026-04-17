# Fett263 Sample Fixtures

Real-world configs from the ProffieOS / Fett263 community, used to verify
round-trip against the configs users actually paste in.

## License

**ProffieOS is licensed under GNU GPL-3.0.** The full license text lives at
`LICENSES/ProffieOS-GPL-3.0.txt` in the repository root.

Community style configs (Fett263's library, the ProffieOS examples folder,
and derivatives of either) are typically GPL-3.0 as well. Any `.cpp` file
committed to this directory therefore:

1. Must include a **source attribution comment** at the top of the file
   (original author, URL, and the date/commit it was captured from).
2. Inherits GPL-3.0 obligations on redistribution — anyone cloning this
   repo receives those files under GPL-3.0.
3. **Does not change the repo's MIT license** for everything outside this
   directory. The rest of KyberStation remains MIT; this subdirectory is
   a GPL-3.0 "aggregate" within the broader MIT project (allowed by
   GPL-3.0 §5).

## How to add a sample

1. Copy the style snippet into a new `.cpp` file here.
2. Add an attribution comment like:
   ```cpp
   // Source: https://fett263.com/style-library/<path>
   // Author: Fett263
   // Captured: 2026-04-16
   // Licensed under GNU GPL-3.0 (see LICENSES/ProffieOS-GPL-3.0.txt)
   ```
3. Run the round-trip suite:
   ```bash
   pnpm --filter @kyberstation/codegen test
   ```
4. If any round-trip assertion fails, that's a real gap to track — prefer
   widening the reconstructor over skipping the fixture.

## Out of scope for this sprint

This directory is intentionally empty at the end of v0.2.2. It is wired
into the round-trip test discovery so future contributions are picked up
automatically. Community samples will be added by PR with attribution.
