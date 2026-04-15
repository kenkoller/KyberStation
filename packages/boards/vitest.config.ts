import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@bladeforge/codegen': path.resolve(__dirname, '../codegen/src'),
      '@bladeforge/engine': path.resolve(__dirname, '../engine/src'),
    },
  },
});
