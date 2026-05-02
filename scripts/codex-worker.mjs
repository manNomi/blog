#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const LOVE_SERVICE_MODULE_URL = pathToFileURL(
  path.join(ROOT_DIR, 'src/lib/saju/server/love-job-service.ts'),
).href;

const DEFAULT_MAX = 5;
const DEFAULT_LOOP_INTERVAL_SEC = 45;

function nowIso() {
  return new Date().toISOString();
}

function log(level, event, detail = {}) {
  console.log(
    JSON.stringify({
      level,
      event,
      detail,
      ts: nowIso(),
    }),
  );
}

function parseArgs(argv) {
  const args = {
    once: false,
    loop: false,
    max: DEFAULT_MAX,
    intervalSec: DEFAULT_LOOP_INTERVAL_SEC,
  };

  for (const raw of argv) {
    if (raw === '--once') args.once = true;
    if (raw === '--loop') args.loop = true;

    if (raw.startsWith('--max=')) {
      const next = Number(raw.split('=')[1]);
      if (Number.isFinite(next) && next > 0) {
        args.max = Math.floor(next);
      }
    }

    if (raw.startsWith('--interval=')) {
      const next = Number(raw.split('=')[1]);
      if (Number.isFinite(next) && next >= 5) {
        args.intervalSec = Math.floor(next);
      }
    }
  }

  if (!args.once && !args.loop) {
    args.once = true;
  }

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBatch(max) {
  const script = [
    `import { processLoveJobsBatch } from ${JSON.stringify(LOVE_SERVICE_MODULE_URL)};`,
    `const processed = await processLoveJobsBatch(${max}, 'worker');`,
    "process.stdout.write(JSON.stringify({ processed }));",
  ].join('\n');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--eval', script], {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk ?? '');
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk ?? '');
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `worker_batch_failed:${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        const processed = Number(parsed?.processed ?? 0);
        resolve({
          processed: Number.isFinite(processed) ? processed : 0,
        });
      } catch {
        reject(new Error('worker_batch_output_invalid'));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  log('info', 'worker_start', {
    mode: args.loop ? 'loop' : 'once',
    max: args.max,
    intervalSec: args.intervalSec,
    pipeline: 'shared_service',
  });

  if (args.once) {
    const batch = await runBatch(args.max);
    log('info', 'worker_batch_done', batch);
    return;
  }

  while (true) {
    const batch = await runBatch(args.max);
    log('info', 'worker_batch_done', batch);
    await sleep(args.intervalSec * 1000);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  log('error', 'worker_crash', { message });
  process.exit(1);
});
