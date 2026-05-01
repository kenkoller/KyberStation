import { defineConfig } from 'vitest/config';
import path from 'path';

// ─── Platform-aware snapshot routing for cardSnapshotGoldenHash ──────
//
// The card-snapshot matrix (5 layouts × 5 themes = 25 combos) hashes
// rendered card bytes which include text — Cairo (Linux CI) and Core
// Graphics (macOS) rasterize text differently, so the hash diverges
// per-platform. Per `docs/research/CARD_SNAPSHOT_V2_PERCEPTUAL_DIFF.md`
// the recommended fix is platform-specific golden files: each platform
// gets its own snapshot file, both committed to the repo. CI splits
// into Linux + macOS jobs and asserts against the matching file.
//
// This callback is invoked by vitest for EVERY test file. We branch on
// the file path: only the cardSnapshot test gets a platform suffix.
// Every other test file uses the standard
// `<dir>/__snapshots__/<file>.snap` layout (same as upstream default).
//
// Path shape:
//   apps/web/tests/cardSnapshotGoldenHash/cardSnapshot.test.ts
//     → __snapshots__/cardSnapshot.<platform>.test.ts.snap
//
// `process.platform` values: 'darwin' (macOS), 'linux', 'win32', etc.
// We commit `darwin` + `linux`. If a contributor on win32 runs tests,
// vitest writes `cardSnapshot.win32.test.ts.snap` — which gets ignored
// by `.gitignore`-style hygiene below (we only check in darwin + linux).
function resolveSnapshotPath(
  testPath: string,
  snapExtension: string,
): string {
  const dir = path.dirname(testPath);
  const file = path.basename(testPath);

  // Match cardSnapshot.test.ts under cardSnapshotGoldenHash/.
  // Use endsWith on a normalized relative path so both Mac (/) and
  // Windows (\) work — vitest passes absolute paths.
  const isCardSnapshotTest =
    dir.endsWith(path.join('cardSnapshotGoldenHash')) &&
    file === 'cardSnapshot.test.ts';

  if (isCardSnapshotTest) {
    // cardSnapshot.test.ts → __snapshots__/cardSnapshot.<platform>.test.ts.snap
    const base = file.replace(/\.test\.ts$/, '');
    return path.join(
      dir,
      '__snapshots__',
      `${base}.${process.platform}.test.ts${snapExtension}`,
    );
  }

  // Default: <dir>/__snapshots__/<file>.snap (vitest upstream behavior).
  return path.join(dir, '__snapshots__', `${file}${snapExtension}`);
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    resolveSnapshotPath,
  },
  // Use the automatic JSX runtime in the test transformer so `.tsx`
  // components whose source omits `import React` (the Next.js default)
  // can still be rendered via `renderToStaticMarkup` inside tests.
  // Matches the runtime Next.js uses at build time.
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@kyberstation/engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@kyberstation/codegen': path.resolve(__dirname, '../../packages/codegen/src'),
      '@kyberstation/presets': path.resolve(__dirname, '../../packages/presets/src'),
      '@kyberstation/sound': path.resolve(__dirname, '../../packages/sound/src'),
    },
  },
});
