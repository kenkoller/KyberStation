#!/usr/bin/env node
/**
 * local-build.mjs — Builds all packages in dependency order without Turbo.
 * Use this on environments where Turbo fails (e.g. Windows UNC/network paths).
 *
 * Usage: node scripts/local-build.mjs
 *   or:  pnpm build:local
 */

import { execFileSync, execFile } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Resolve a binary, trying .bin symlink first, then direct path fallback
function findBin(name, fallbackPath) {
  const binDir = resolve(ROOT, 'node_modules', '.bin');
  // On Windows, check for .cmd shim
  for (const ext of ['.cmd', '.ps1', '']) {
    const candidate = resolve(binDir, name + ext);
    if (existsSync(candidate)) return { file: candidate, viaNode: false };
  }
  // Fallback: invoke via node directly
  const direct = resolve(ROOT, fallbackPath);
  if (existsSync(direct)) return { file: direct, viaNode: true };
  throw new Error(`Cannot find binary "${name}" at .bin or ${fallbackPath}`);
}

const TSC = findBin('tsc', 'node_modules/typescript/bin/tsc');
const NEXT = findBin('next', 'node_modules/next/dist/bin/next');

function run(label, bin, args, cwd) {
  const cmdArgs = bin.viaNode ? [bin.file, ...args] : args;
  const cmd = bin.viaNode ? process.execPath : bin.file;
  console.log(`\n  [${label}] ${bin.viaNode ? 'node ' : ''}${bin.file} ${args.join(' ')}`);
  execFileSync(cmd, cmdArgs, { cwd, stdio: 'inherit', env: { ...process.env } });
}

function runAsync(label, bin, args, cwd) {
  const cmdArgs = bin.viaNode ? [bin.file, ...args] : args;
  const cmd = bin.viaNode ? process.execPath : bin.file;
  console.log(`  [${label}] ${bin.viaNode ? 'node ' : ''}${bin.file} ${args.join(' ')}`);
  return new Promise((res, rej) => {
    const child = execFile(cmd, cmdArgs, { cwd, env: { ...process.env } }, (err) => {
      if (err) rej(new Error(`${label} failed with code ${err.code}`));
      else res();
    });
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
  });
}

const pkg = (name) => resolve(ROOT, 'packages', name);
const web = resolve(ROOT, 'apps', 'web');

async function main() {
  const start = Date.now();
  console.log('BladeForge local build (no Turbo)\n');

  // Step 1: Build engine first (everything depends on it)
  console.log('Step 1/3: Building engine...');
  run('engine', TSC, ['--project', 'tsconfig.json'], pkg('engine'));

  // Step 2: Build remaining packages in parallel
  console.log('\nStep 2/3: Building packages (parallel)...');
  await Promise.all([
    runAsync('codegen', TSC, ['--project', 'tsconfig.json'], pkg('codegen')),
    runAsync('presets', TSC, ['--project', 'tsconfig.json'], pkg('presets')),
    runAsync('sound',   TSC, ['--project', 'tsconfig.json'], pkg('sound')),
    runAsync('boards',  TSC, ['--project', 'tsconfig.json'], pkg('boards')),
  ]);

  // Step 3: Build web app
  console.log('\nStep 3/3: Building web app...');
  run('web', NEXT, ['build'], web);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nBuild complete in ${elapsed}s`);
}

main().catch((err) => {
  console.error('\nBuild failed:', err.message);
  process.exit(1);
});
