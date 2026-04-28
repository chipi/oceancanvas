/**
 * OceanCanvas renderer — CLI entry point.
 *
 * Contract (ADR-030):
 *   stdin  → JSON payload (recipe + data + output dimensions)
 *   stdout → raw PNG bytes
 *   stderr → log messages / errors
 *   exit 0 = success, exit 1 = failure
 *
 * Usage:
 *   cat payload.json | node render.js > output.png
 */

import { launch } from 'puppeteer';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  // Read payload from stdin
  const input = readFileSync('/dev/stdin', 'utf-8');
  const payload = JSON.parse(input);

  const width = payload.output?.width ?? 1920;
  const height = payload.output?.height ?? 1080;
  const renderType = payload.recipe?.render?.type ?? 'field';

  // Resolve sketch path — sketches live at repo root
  const sketchPath = resolve(__dirname, '..', '..', '..', '..', '..', 'sketches', `${renderType}.js`);

  const browser = await launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    // Build a minimal HTML page with p5.js + payload + sketch
    const html = `<!DOCTYPE html>
<html><head><script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script></head>
<body style="margin:0;overflow:hidden">
<script>window.OCEAN_PAYLOAD = ${JSON.stringify(payload)};</script>
<script src="file://${sketchPath}"></script>
</body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for the sketch to signal completion
    await page.waitForFunction(() => window.__RENDER_COMPLETE === true, { timeout: 30000 });

    // Screenshot the canvas
    const canvas = await page.$('canvas');
    if (!canvas) {
      throw new Error('No canvas element found after render');
    }

    const pngBuffer = await canvas.screenshot({ type: 'png' });

    // Write PNG to stdout
    process.stdout.write(pngBuffer);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  process.stderr.write(`Render error: ${err.message}\n`);
  process.exit(1);
});
