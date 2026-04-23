import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
