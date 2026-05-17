// ─── Workspace import resolver ───
//
// Maps `@kyberstation/<pkg>` bare specifiers to the workspace's
// `packages/<pkg>/dist/index.js` so the bench can `import` from the
// compiled engine without relying on pnpm having symlinked workspace
// packages into node_modules (which it doesn't, given
// `node-linker=hoisted` + `symlink=false` in this repo's `.npmrc`).
//
// Wired in by `perf/registerLoader.mjs` via Node's modern
// `module.register()` API (Node 20.6+). The bench's `--import` flag
// pre-loads the registration before the entry script's first import.

import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve as pathResolve, dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(__dirname, '../../..');

const WORKSPACE_PREFIX = '@kyberstation/';

// Cache to avoid re-resolving the same specifier on every import.
const cache = new Map();

function resolveWorkspaceSpecifier(specifier) {
  if (!specifier.startsWith(WORKSPACE_PREFIX)) return null;
  if (cache.has(specifier)) return cache.get(specifier);

  // Strip the prefix and any subpath. Specifiers are typically bare
  // (e.g. `@kyberstation/template-eval`), but be defensive.
  const rest = specifier.slice(WORKSPACE_PREFIX.length);
  const slashIdx = rest.indexOf('/');
  const pkgName = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
  const subpath = slashIdx === -1 ? '' : rest.slice(slashIdx);

  const distEntry = join(REPO_ROOT, 'packages', pkgName, 'dist', 'index.js');
  const target = subpath
    ? join(REPO_ROOT, 'packages', pkgName, 'dist', subpath.slice(1))
    : distEntry;

  if (!existsSync(target)) {
    // Fall through to default resolution so Node surfaces a clear error.
    cache.set(specifier, null);
    return null;
  }

  const url = pathToFileURL(target).href;
  cache.set(specifier, url);
  return url;
}

export async function resolve(specifier, context, defaultResolve) {
  const url = resolveWorkspaceSpecifier(specifier);
  if (url) {
    return { url, format: 'module', shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}
