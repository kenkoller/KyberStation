import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@kyberstation/codegen': path.resolve(__dirname, '../codegen/src'),
      '@kyberstation/engine': path.resolve(__dirname, '../engine/src'),
    },
  },
});
