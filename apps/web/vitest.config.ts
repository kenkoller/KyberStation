import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    // Default vitest timeout is 5000ms. Several SSR-render-heavy tests
    // (`hardwarePanel.test.tsx`, `webusb/DfuSeFlasher.test.ts`) flake
    // on CI under parallel-CPU pressure even though they pass quickly
    // when re-run in isolation. Bumping global to 15s gives those
    // tests headroom without affecting the well-behaved suites — the
    // overhead is bounded by actual test runtime, not the limit.
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@kyberstation/boards': path.resolve(__dirname, '../../packages/boards/src'),
      '@kyberstation/engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@kyberstation/codegen': path.resolve(__dirname, '../../packages/codegen/src'),
      '@kyberstation/hardware-profiles': path.resolve(__dirname, '../../packages/hardware-profiles/src'),
      '@kyberstation/presets': path.resolve(__dirname, '../../packages/presets/src'),
      '@kyberstation/sound': path.resolve(__dirname, '../../packages/sound/src'),
      '@kyberstation/template-eval': path.resolve(__dirname, '../../packages/template-eval/src'),
    },
  },
});
