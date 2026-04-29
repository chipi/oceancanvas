/**
 * OceanCanvas server-side renderer.
 *
 * Launches headless Chromium via Puppeteer, loads a p5.js sketch,
 * injects the render payload via window.OCEAN_PAYLOAD, waits for
 * window.__RENDER_COMPLETE, and screenshots the canvas.
 *
 * Invoked by the Python render task as a subprocess:
 *   payload via stdin → PNG bytes via stdout → errors via stderr
 */

import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const SKETCHES_DIR = process.env.SKETCHES_DIR || '/sketches';

async function render(payload) {
  const sketchType = payload.recipe?.render?.type || 'field';
  const sharedPath = join(SKETCHES_DIR, 'shared.js');
  const sketchPath = join(SKETCHES_DIR, `${sketchType}.js`);
  const sharedCode = readFileSync(sharedPath, 'utf-8');
  const sketchCode = readFileSync(sketchPath, 'utf-8');

  const width = payload.output?.width || 1920;
  const height = payload.output?.height || 1080;

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    const html = `<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
</head><body style="margin:0">
<script>window.OCEAN_PAYLOAD = ${JSON.stringify(payload)};</script>
<script>${sharedCode}</script>
<script>${sketchCode}</script>
</body></html>`;

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__RENDER_COMPLETE === true, { timeout: 60000 });

    const canvas = await page.$('canvas');
    const png = await canvas.screenshot({ type: 'png' });

    process.stdout.write(png);
  } finally {
    await browser.close();
  }
}

// Read payload from stdin
let input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', async () => {
  try {
    const payload = JSON.parse(input);
    await render(payload);
  } catch (err) {
    process.stderr.write(`Render error: ${err.message}\n`);
    process.exit(1);
  }
});
