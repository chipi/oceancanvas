/**
 * OceanCanvas — field render type.
 *
 * Renders gridded data (e.g., SST) as a coloured heatmap.
 * Depends on shared.js (loaded first by the renderer).
 *
 * Determinism rules (TA §constraints/deterministic-rendering):
 *   - Always call randomSeed() in setup
 *   - Never use Date.now(), millis(), or clock-dependent APIs
 *   - Signal completion via window.__RENDER_COMPLETE = true
 */

function setup() {
  const payload = window.OCEAN_PAYLOAD || {};
  const w = payload.output?.width || 1920;
  const h = payload.output?.height || 1080;
  const seed = payload.recipe?.render?.seed || 42;
  const opacity = (payload.recipe?.render?.opacity ?? 1.0) * 255;
  const doSmooth = payload.recipe?.render?.smooth ?? true;

  createCanvas(w, h);
  randomSeed(seed);
  noLoop();

  background(...CANVAS_BG);

  const primary = payload.data?.primary;
  if (!primary || !primary.data || !primary.shape) {
    window.__RENDER_COMPLETE = true;
    return;
  }

  const dataArr = primary.data;
  const [rows, cols] = primary.shape;
  const vmin = primary.min;
  const vmax = primary.max;

  const img = createImage(cols, rows);
  img.loadPixels();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Data row 0 = southernmost; screen row 0 = northernmost
      const dataRow = rows - 1 - r;
      const val = dataArr[dataRow * cols + c];
      const pi = (r * cols + c) * 4;

      if (val === NAN_VALUE || val === null || val === undefined) {
        img.pixels[pi] = CANVAS_BG[0];
        img.pixels[pi + 1] = CANVAS_BG[1];
        img.pixels[pi + 2] = CANVAS_BG[2];
        img.pixels[pi + 3] = 255;
      } else {
        const t = vmax !== vmin ? (val - vmin) / (vmax - vmin) : 0.5;
        const [cr, cg, cb] = thermalColor(t);
        img.pixels[pi] = cr;
        img.pixels[pi + 1] = cg;
        img.pixels[pi + 2] = cb;
        img.pixels[pi + 3] = opacity;
      }
    }
  }

  img.updatePixels();

  if (doSmooth) {
    image(img, 0, 0, w, h);
  } else {
    noSmooth();
    image(img, 0, 0, w, h);
  }

  drawAttribution(payload, w, h);
  window.__RENDER_COMPLETE = true;
}
