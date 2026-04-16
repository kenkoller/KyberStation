import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // The workspace uses node-linker=hoisted with symlink=false, so
      // workspace packages aren't linked into node_modules. Alias the
      // engine source directly so tests/helpers/ and tests/typeIdentity.test.ts
      // can `import { ... } from '@kyberstation/engine'`.
      '@kyberstation/engine': path.resolve(thisDir, '../engine/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
