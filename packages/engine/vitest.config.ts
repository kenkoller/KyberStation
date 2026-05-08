import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@kyberstation/template-eval': path.resolve(__dirname, '../template-eval/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
