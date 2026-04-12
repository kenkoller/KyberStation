#!/usr/bin/env node
/**
 * local-serve.mjs — Builds and serves the production app with HTTPS.
 * Pages load instantly (no on-demand compilation).
 * HTTPS enables DeviceMotion API on iOS for gyro-driven effects.
 *
 * Usage: node scripts/local-serve.mjs
 *   or:  pnpm serve
 */

import { execFileSync, spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createServer as createHttpsServer } from 'node:https';
import { request as httpRequest } from 'node:http';
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

function runSync(label, bin, args, cwd) {
  const cmdArgs = bin.viaNode ? [bin.file, ...args] : args;
  const cmd = bin.viaNode ? process.execPath : bin.file;
  console.log(`  [${label}] ${bin.viaNode ? 'node ' : ''}${bin.file} ${args.join(' ')}`);
  execFileSync(cmd, cmdArgs, { cwd, stdio: 'inherit', env: { ...process.env } });
}

const TSC = findBin('tsc', 'node_modules/typescript/bin/tsc');
const NEXT = findBin('next', 'node_modules/next/dist/bin/next');
const pkg = (name) => resolve(ROOT, 'packages', name);
const web = resolve(ROOT, 'apps', 'web');

const nextBuildDir = resolve(web, '.next');
const needsBuild = !existsSync(nextBuildDir);

async function main() {
  console.log('BladeForge Production Server (HTTPS)\n');

  if (needsBuild) {
    console.log('No build found — building all packages...\n');
    console.log('Step 1/3: Building engine...');
    runSync('engine', TSC, ['--project', 'tsconfig.json'], pkg('engine'));

    console.log('\nStep 2/3: Building packages...');
    for (const name of ['codegen', 'presets', 'sound', 'boards']) {
      runSync(name, TSC, ['--project', 'tsconfig.json'], pkg(name));
    }

    console.log('\nStep 3/3: Building web app...');
    runSync('web', NEXT, ['build'], web);
    console.log('\nBuild complete.\n');
  } else {
    console.log('Using existing build (.next found)\n');
  }

  const certDir = resolve(ROOT, 'certs');
  const hasCerts = existsSync(resolve(certDir, 'localhost.pem'));

  const port = 3000;
  const httpsPort = 3443;

  // Start Next.js on HTTP
  console.log(`Starting Next.js production server on port ${port}...`);
  const nextArgs = NEXT.viaNode
    ? [NEXT.file, 'start', '--hostname', '0.0.0.0', '--port', String(port)]
    : ['start', '--hostname', '0.0.0.0', '--port', String(port)];
  const nextCmd = NEXT.viaNode ? process.execPath : NEXT.file;
  const nextChild = spawn(nextCmd, nextArgs, {
    cwd: web,
    stdio: 'inherit',
    env: { ...process.env },
  });

  nextChild.on('error', (err) => {
    console.error('Failed to start Next.js:', err.message);
    process.exit(1);
  });

  // HTTPS reverse proxy using Node http.request (proper streaming)
  if (hasCerts) {
    const key = readFileSync(resolve(certDir, 'localhost-key.pem'));
    const cert = readFileSync(resolve(certDir, 'localhost.pem'));

    // Wait for Next.js to start
    await new Promise((r) => setTimeout(r, 3000));

    const httpsServer = createHttpsServer({ key, cert }, (clientReq, clientRes) => {
      const proxyOpts = {
        hostname: '127.0.0.1',
        port: port,
        path: clientReq.url,
        method: clientReq.method,
        headers: {
          ...clientReq.headers,
          host: `127.0.0.1:${port}`,
        },
      };

      const proxyReq = httpRequest(proxyOpts, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        proxyRes.pipe(clientRes, { end: true });
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy error:', err.message);
        if (!clientRes.headersSent) {
          clientRes.writeHead(502);
          clientRes.end('Proxy error — Next.js may still be starting. Refresh in a moment.');
        }
      });

      // Pipe request body for POST/PUT
      clientReq.pipe(proxyReq, { end: true });
    });

    httpsServer.listen(httpsPort, '0.0.0.0', () => {
      console.log(`\n  HTTPS proxy running on port ${httpsPort}`);
      console.log(`\n  ========================================`);
      console.log(`   BladeForge is ready!`);
      console.log(`  ========================================`);
      console.log(`\n   PC (HTTP):    http://localhost:${port}`);
      console.log(`   PC (HTTPS):   https://localhost:${httpsPort}`);
      console.log(`   Phone:        https://192.168.1.172:${httpsPort}`);
      console.log(`   Phone (alt):  https://192.168.1.213:${httpsPort}`);
      console.log(`\n   Your phone will show a certificate`);
      console.log(`   warning — tap "Advanced" > "Proceed".`);
      console.log(`   This is safe on your local network.`);
      console.log(`\n   HTTPS is needed for gyro/motion sensors.`);
      console.log(`\n   Press Ctrl+C to stop.`);
      console.log(`  ========================================\n`);
    });
  } else {
    console.log(`\n   No certs found — HTTPS disabled.`);
    console.log(`   HTTP only: http://localhost:${port}\n`);
  }

  process.on('SIGINT', () => { nextChild.kill(); process.exit(0); });
  process.on('SIGTERM', () => { nextChild.kill(); process.exit(0); });
  nextChild.on('exit', (code) => { process.exit(code ?? 0); });
}

main().catch((err) => {
  console.error('Server failed:', err.message);
  process.exit(1);
});
