#!/usr/bin/env node
/**
 * Preflight check for CTV Test Kit (humans and AI agents).
 * Usage: npm run doctor
 * Exit code 0 = ready to run `npm run dev`, non-zero = something is missing.
 */
import { execFileSync } from 'node:child_process';
import net from 'node:net';

const IMAGES = [
  { tag: 'ctv-test-kit-browser:latest', hint: 'Chromium 57+' },
  { tag: 'ctv-test-kit-browser:legacy', hint: 'Chromium 53-56' },
];
const UI_PORT = 5173;

let failed = false;
const ok = (msg) => console.log(`  [ok]   ${msg}`);
const warn = (msg) => console.log(`  [warn] ${msg}`);
const fail = (msg, fix) => {
  failed = true;
  console.log(`  [FAIL] ${msg}`);
  if (fix) console.log(`         -> ${fix}`);
};

function run(cmd, args) {
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

console.log('CTV Test Kit - preflight\n');

// Node
const major = Number(process.versions.node.split('.')[0]);
if (major >= 18) ok(`Node ${process.versions.node}`);
else fail(`Node ${process.versions.node} (need 18+, 20 recommended)`, 'Install Node 18 or newer');

// Dependencies installed
try {
  run('node', ['-e', "require.resolve('vite')"]);
  ok('npm dependencies installed');
} catch {
  fail('npm dependencies missing', 'Run: npm install');
}

// Docker CLI + daemon
let dockerUp = false;
try {
  run('docker', ['--version']);
  try {
    run('docker', ['info']);
    dockerUp = true;
    ok('Docker daemon is running');
  } catch {
    fail('Docker is installed but the daemon is not running', 'Start Docker Desktop and wait until it is ready');
  }
} catch {
  fail('Docker not found', 'Install Docker Desktop: https://www.docker.com/products/docker-desktop/');
}

// Images
if (dockerUp) {
  for (const { tag, hint } of IMAGES) {
    try {
      const out = run('docker', ['images', '-q', tag]).trim();
      if (out) ok(`Docker image ${tag} (${hint})`);
      else fail(`Docker image ${tag} missing (${hint})`, 'Run: npm run docker:build (takes ~3-5 min)');
    } catch {
      fail(`Could not check image ${tag}`, 'Run: npm run docker:build');
    }
  }
}

// UI port (informational)
if (await portInUse(UI_PORT)) {
  warn(`Port ${UI_PORT} is already in use (UI may already be running, or free it with: lsof -ti :${UI_PORT} | xargs kill)`);
} else {
  ok(`Port ${UI_PORT} is free`);
}

console.log('');
if (failed) {
  console.log('Not ready. Fix the [FAIL] items above, then run `npm run doctor` again.');
  process.exit(1);
}
console.log('Ready. Run `npm run dev` and open http://localhost:5173');
