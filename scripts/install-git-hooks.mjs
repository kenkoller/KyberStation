#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// install-git-hooks — points git at the committed .githooks/ directory
//
// GitHub's server-side branch protection (classic rules and the newer
// Rulesets) is paywalled on private repositories. KyberStation is private
// on GitHub's free tier, so the only protection against force-push /
// delete of `main` is client-side.
//
// This script sets `core.hooksPath = .githooks`, activating the committed
// hooks for this clone. Idempotent — safe to run any number of times.
//
// Usage:
//   node scripts/install-git-hooks.mjs
//   pnpm run hooks:install          # (defined in package.json)
//
// The hooks are in-repo under `.githooks/` so every contributor gets the
// same safeguards. To bypass a hook intentionally, use `git push --no-verify`.
// ─────────────────────────────────────────────────────────────────────────────

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Skip cleanly if the current working directory isn't a git repository.
// This keeps CI / sandboxed environments from crashing on this script.
try {
  execSync('git rev-parse --git-dir', { stdio: 'pipe' });
} catch {
  console.log('[hooks] Not inside a git repository — skipping hook install.');
  process.exit(0);
}

if (!existsSync('.githooks')) {
  console.error(
    '[hooks] Expected .githooks/ in the current directory.\n' +
      '[hooks] Run this from the repo root: `node scripts/install-git-hooks.mjs`',
  );
  process.exit(1);
}

try {
  const currentPath = execSync('git config --get core.hooksPath', {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
    .toString()
    .trim();
  if (currentPath === '.githooks') {
    console.log('[hooks] core.hooksPath already set to .githooks — nothing to do.');
    process.exit(0);
  }
} catch {
  // Not set yet — fall through to set it.
}

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'inherit' });
  console.log('[hooks] ✓ core.hooksPath set to .githooks');
  console.log(
    '[hooks]   Active safeguards:\n' +
      '[hooks]     • pre-push: blocks force-push or delete of main',
  );
  console.log(
    '[hooks]   To bypass a hook on a specific push (rare): git push --no-verify',
  );
} catch (err) {
  console.error('[hooks] Failed to configure hooksPath:', err.message);
  process.exit(1);
}
