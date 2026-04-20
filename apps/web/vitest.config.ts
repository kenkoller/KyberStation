import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
