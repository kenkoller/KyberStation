#!/usr/bin/env node
/**
 * local-dev.mjs — Starts the dev environment without Turbo.
 * Use this on environments where Turbo fails (e.g. Windows UNC/network paths).
 *
 * 1. Builds engine once (synchronous — other packages depend on it)
 * 2. Starts tsc --watch for all packages in parallel (background)
 * 3. Starts next dev (foreground, inherits stdio)
 *
 * Usage: node scripts/local-dev.mjs
 *   or:  pnpm dev:local
 */

import { execFileSync, spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function findBin(name, fallbackPath) {
  const binDir = resolve(ROOT, 'node_modules', '.bin');
  for (const ext of ['.cmd', '.ps1', '']) {
    const candidate = resolve(binDir, name + ext);
    if (existsSync(candidate)) return { file: candidate, viaNode: false };
  }
  const direct = resolve(ROOT, fallbackPath);
  if (existsSync(direct)) return { file: direct, viaNode: true };
  throw new Error(`Cannot find binary "${name}" at .bin or ${fallbackPath}`);
}

const TSC = findBin('tsc', 'node_modules/typescript/bin/tsc');
const NEXT = findBin('next', 'node_modules/next/dist/bin/next');

function runSync(label, bin, args, cwd) {
  const cmdArgs = bin.viaNode ? [bin.file, ...args] : args;
  const cmd = bin.viaNode ? process.execPath : bin.file;
  console.log(`  [${label}] ${bin.viaNode ? 'node ' : ''}${bin.file} ${args.join(' ')}`);
  execFileSync(cmd, cmdArgs, { cwd, stdio: 'inherit', env: { ...process.env } });
}

function spawnBg(label, bin, args, cwd) {
  const cmdArgs = bin.viaNode ? [bin.file, ...args] : args;
  const cmd = bin.viaNode ? process.execPath : bin.file;
  const child = spawn(cmd, cmdArgs, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  child.stdout.on('data', (d) => {
    const line = d.toString().trim();
    if (line) console.log(`  [${label}] ${line}`);
  });
  child.stderr.on('data', (d) => {
    const line = d.toString().trim();
    if (line) console.error(`  [${label}] ${line}`);
  });
  return child;
}

const pkg = (name) => resolve(ROOT, 'packages', name);
const web = resolve(ROOT, 'apps', 'web');
const children = [];

function cleanup() {
  for (const child of children) {
    try { child.kill(); } catch {}
  }
}

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

console.log('BladeForge local dev (no Turbo)\n');

// Step 1: Build engine once so dependents can resolve types
console.log('Building engine...');
runSync('engine', TSC, ['--project', 'tsconfig.json'], pkg('engine'));

// Step 2: Start tsc --watch for all packages (background)
console.log('\nStarting package watchers...');
const watchPkgs = ['engine', 'codegen', 'presets', 'sound', 'boards'];
for (const name of watchPkgs) {
  children.push(spawnBg(name, TSC, ['--watch', '--project', 'tsconfig.json', '--preserveWatchOutput'], pkg(name)));
}

// Step 3: Start Next.js dev server (foreground)
console.log('\nStarting Next.js dev server...\n');
const nextArgs = NEXT.viaNode ? [NEXT.file, 'dev', '--hostname', '0.0.0.0'] : ['dev', '--hostname', '0.0.0.0'];
const nextCmd = NEXT.viaNode ? process.execPath : NEXT.file;
const nextChild = spawn(nextCmd, nextArgs, {
  cwd: web,
  stdio: 'inherit',
  env: { ...process.env },
});
children.push(nextChild);

nextChild.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 0);
});
