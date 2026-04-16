# Fett263 Sample Fixtures

Real-world configs from the ProffieOS / Fett263 community, used to verify
round-trip against the configs users actually paste in.

**Important — licensing:** Fett263's style library and individual community
configs have varying licenses. **Do not commit files directly from external
sources into this folder until provenance and license terms are verified.**

## How to add samples

1. Copy a known-public style snippet into a new `.cpp` file here.
2. Record its provenance in the top-of-file comment: source URL or name, and
   the license or permission under which it is included.
3. Run the round-trip suite:
   ```bash
   pnpm --filter @kyberstation/codegen test
   ```
4. If any round-trip assertion fails, that's a real gap to track — prefer
   widening the reconstructor over skipping the fixture.

## Suggested public sources

- The ProffieOS repository's example styles (Apache 2.0)
- Fett263's published library (check Discord / GitHub for license)
- Community-contributed configs with explicit permission

## Out of scope for this sprint

This directory is intentionally empty at the end of Phase 0. It is wired into
the round-trip test discovery so future contributions are picked up
automatically.
