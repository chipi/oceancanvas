/**
 * OceanCanvas server-side renderer.
 *
 * Two modes:
 *
 * **Single mode (default):**
 *   payload via stdin → PNG bytes via stdout → exit
 *
 * **Worker mode (--worker):**
 *   Persistent Chromium instance. Reads NDJSON payloads from stdin,
 *   writes length-prefixed PNG responses to stdout. Stays alive until
 *   a {"__done":true} sentinel or stdin closes.
 *
 * All scripts (p5.js, shared.js, sketches) are loaded from the local
 * SKETCHES_DIR — no CDN dependency. p5.min.js must be present in
 * the sketches directory.
 */

import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const SKETCHES_DIR = resolve(process.env.SKETCHES_DIR || '/sketches');

// Pre-read ALL scripts at startup — no I/O or network during rendering.
const P5_CODE = readFileSync(join(SKETCHES_DIR, 'p5.min.js'), 'utf-8');
const SHARED_CODE = readFileSync(join(SKETCHES_DIR, 'shared.js'), 'utf-8');

const sketchCache = {};
function getSketchCode(sketchType) {
  if (!sketchCache[sketchType]) {
    sketchCache[sketchType] = readFileSync(
      join(SKETCHES_DIR, `${sketchType}.js`), 'utf-8'
    );
  }
  return sketchCache[sketchType];
}

async function renderPayload(browser, payload) {
  const sketchType = payload.recipe?.render?.type || 'field';
  const sketchCode = getSketchCode(sketchType);

  const width = payload.output?.width || 1920;
  const height = payload.output?.height || 1080;

  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height });

    // No CDN — all scripts bundled locally.
    // Write a temp HTML file with everything inlined (payload, p5, shared, sketch).
    // Navigate via file:// to get proper window lifecycle (load event fires naturally).
    // p5.js in <head> so it parses first; setup()/draw() in body so they're
    // available when p5 triggers on load.

    const { writeFileSync, unlinkSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const tmpFile = join(tmpdir(), `oc-render-${Date.now()}.html`);

    const htmlContent = `<!DOCTYPE html>
<html><head>
<script>${P5_CODE}</script>
</head><body style="margin:0">
<script>window.OCEAN_PAYLOAD = ${JSON.stringify(payload)};</script>
<script>${SHARED_CODE}</script>
<script>${sketchCode}</script>
</body></html>`;

    writeFileSync(tmpFile, htmlContent);
    try {
      await page.goto(`file://${tmpFile}`, { waitUntil: 'load' });
    } finally {
      try { unlinkSync(tmpFile); } catch {}
    }

    // Wait for sketch to signal completion
    await page.waitForFunction(
      () => window.__RENDER_COMPLETE === true,
      { timeout: 60000 },
    );

    const canvas = await page.$('canvas');
    return await canvas.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

// ─── Single mode (default) ───────────────────────────────────────────

async function singleMode() {
  const MAX_STDIN = 10 * 1024 * 1024;
  let input = '';
  process.stdin.setEncoding('utf-8');

  await new Promise((resolve, reject) => {
    process.stdin.on('data', (chunk) => {
      input += chunk;
      if (input.length > MAX_STDIN) {
        process.stderr.write('Render error: payload too large\n');
        process.exit(1);
      }
    });
    process.stdin.on('end', resolve);
    process.stdin.on('error', reject);
  });

  const payload = JSON.parse(input);

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const png = await renderPayload(browser, payload);
    process.stdout.write(png);
  } finally {
    await browser.close();
  }
}

// ─── Worker mode (--worker) ──────────────────────────────────────────

async function workerMode() {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Signal ready
  process.stderr.write('worker:ready\n');

  const rl = createInterface({ input: process.stdin });

  try {
    for await (const line of rl) {
      if (!line.trim()) continue;

      const msg = JSON.parse(line);
      if (msg.__done) break;

      const png = await renderPayload(browser, msg);

      // Write 4-byte big-endian length prefix + PNG bytes
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(png.length, 0);
      process.stdout.write(lenBuf);
      process.stdout.write(png);
    }
  } catch (err) {
    process.stderr.write(`Worker error: ${err.message}\n`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// ─── Entry point ─────────────────────────────────────────────────────

const isWorker = process.argv.includes('--worker');

try {
  if (isWorker) {
    await workerMode();
  } else {
    await singleMode();
  }
} catch (err) {
  process.stderr.write(`Render error: ${err.message}\n`);
  process.exit(1);
}
