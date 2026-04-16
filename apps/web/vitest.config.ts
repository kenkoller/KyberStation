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
      '@bladeforge/engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@bladeforge/codegen': path.resolve(__dirname, '../../packages/codegen/src'),
      '@bladeforge/presets': path.resolve(__dirname, '../../packages/presets/src'),
      '@bladeforge/sound': path.resolve(__dirname, '../../packages/sound/src'),
      '@bladeforge/boards': path.resolve(__dirname, '../../packages/boards/src'),
    },
  },
});
