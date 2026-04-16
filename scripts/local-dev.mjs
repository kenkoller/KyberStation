#!/usr/bin/env node
/**
 * local-dev.mjs — Starts the dev environment without Turbo.
 * Use this on environments where Turbo fails (e.g. Windows UNC/network paths).
 *
 * 1. Finds a free port (default 3000, auto-increments if busy)
 * 2. Builds engine once (synchronous — other packages depend on it)
 * 3. Starts tsc --watch for all packages in parallel (background)
 * 4. Starts next dev on the free port (foreground, inherits stdio)
 * 5. Opens the browser automatically
 *
 * Usage: node scripts/local-dev.mjs
 *   or:  pnpm dev:local
 *
 * Options:
 *   --port <number>    Preferred starting port (default: 3000)
 *   --no-open          Don't open the browser automatically
 */

import { execFileSync, spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Parse CLI args ───
const args = process.argv.slice(2);
const portFlagIdx = args.indexOf('--port');
const preferredPort = portFlagIdx !== -1 ? parseInt(args[portFlagIdx + 1], 10) : 3000;
const autoOpen = !args.includes('--no-open');

/** Try to bind a port; resolves with the port number or rejects. */
function tryPort(port) {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => {
      srv.close(() => resolve(port));
    });
  });
}

/** Find the first available port starting from `start`. */
async function findFreePort(start, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await tryPort(start + i);
    } catch {
      // port in use, try next
    }
  }
  throw new Error(`No free port found in range ${start}-${start + maxAttempts - 1}`);
}

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

async function main() {
  // Step 0: Find a free port
  const port = await findFreePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`⚡ Port ${preferredPort} is busy — using port ${port}\n`);
  }

  console.log(`KyberStation local dev (no Turbo) — port ${port}\n`);

  // Step 1: Build engine once so dependents can resolve types
  console.log('Building engine...');
  runSync('engine', TSC, ['--project', 'tsconfig.json'], pkg('engine'));

  // Step 2: Start tsc --watch for all packages (background)
  console.log('\nStarting package watchers...');
  const watchPkgs = ['engine', 'codegen', 'presets', 'sound', 'boards'];
  for (const name of watchPkgs) {
    children.push(spawnBg(name, TSC, ['--watch', '--project', 'tsconfig.json', '--preserveWatchOutput'], pkg(name)));
  }

  // Step 3: Start Next.js dev server
  console.log('\nStarting Next.js dev server...\n');
  const portArgs = ['dev', '--hostname', '0.0.0.0', '--port', String(port)];
  const nextArgs = NEXT.viaNode ? [NEXT.file, ...portArgs] : portArgs;
  const nextCmd = NEXT.viaNode ? process.execPath : NEXT.file;

  let browserOpened = false;
  const url = `http://localhost:${port}/editor`;

  function openBrowser() {
    if (browserOpened || !autoOpen) return;
    browserOpened = true;
    console.log(`\n  Opening ${url} ...\n`);
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
  }

  // Pipe stdout so we can detect "Ready" while still showing output
  const nextChild = spawn(nextCmd, nextArgs, {
    cwd: web,
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env },
  });
  children.push(nextChild);

  nextChild.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
    // Next.js prints "✓ Ready in Xms" when the server is accepting connections
    if (text.includes('Ready in') || text.includes('✓ Ready')) {
      // Small delay to let the first compile finish, then open browser
      setTimeout(openBrowser, 800);
    }
  });

  // Fallback: if stdout detection misses it, poll with HTTP
  if (autoOpen) {
    const http = await import('node:http');
    const pollOpen = async () => {
      // Wait a few seconds for server to start before polling
      await new Promise(r => setTimeout(r, 4000));
      for (let i = 0; i < 40; i++) {
        if (browserOpened) return;
        try {
          await new Promise((resolve, reject) => {
            const req = http.get(`http://localhost:${port}/editor`, (res) => {
              res.resume();
              if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 302) {
                resolve();
              } else {
                reject();
              }
            });
            req.on('error', reject);
            req.setTimeout(2000, () => { req.destroy(); reject(); });
          });
          openBrowser();
          return;
        } catch {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    };
    pollOpen();
  }

  nextChild.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  cleanup();
  process.exit(1);
});
