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
 * Invoked by the Python render task as a subprocess.
 */

import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const SKETCHES_DIR = process.env.SKETCHES_DIR || '/sketches';

// Cache sketch code to avoid re-reading files per render
const sketchCache = {};
function getSketchCode(sketchType) {
  if (!sketchCache[sketchType]) {
    const sharedPath = join(SKETCHES_DIR, 'shared.js');
    const sketchPath = join(SKETCHES_DIR, `${sketchType}.js`);
    sketchCache[sketchType] = {
      shared: readFileSync(sharedPath, 'utf-8'),
      sketch: readFileSync(sketchPath, 'utf-8'),
    };
  }
  return sketchCache[sketchType];
}

async function renderPayload(browser, payload) {
  const sketchType = payload.recipe?.render?.type || 'field';
  const { shared, sketch } = getSketchCode(sketchType);

  const width = payload.output?.width || 1920;
  const height = payload.output?.height || 1080;

  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height });

    const html = `<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
</head><body style="margin:0">
<script>window.OCEAN_PAYLOAD = ${JSON.stringify(payload)};</script>
<script>${shared}</script>
<script>${sketch}</script>
</body></html>`;

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
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
