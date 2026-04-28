/**
 * OceanCanvas — field render type.
 *
 * Renders gridded data (e.g., SST) as a coloured heatmap.
 * Reads window.OCEAN_PAYLOAD for data and recipe parameters.
 *
 * Determinism rules (TA §constraints/deterministic-rendering):
 *   - Always call randomSeed() in setup
 *   - Never use Date.now(), millis(), or clock-dependent APIs
 *   - Signal completion via window.__RENDER_COMPLETE = true
 */

// Thermal colormap stops — matches domain-sst-* tokens from UXS-001
// and pipeline/src/oceancanvas/tasks/process.py THERMAL_STOPS
const THERMAL_STOPS = [
  [4, 44, 83],     // domain-sst-cold   #042C53
  [15, 110, 86],   // domain-sst-mid-low #0F6E56
  [99, 153, 34],   // domain-sst-mid    #639922
  [186, 117, 23],  // domain-sst-mid-high #BA7517
  [216, 90, 48],   // domain-sst-warm   #D85A30
  [121, 31, 31],   // domain-sst-hot    #791F1F
];

const CANVAS_BG = [3, 11, 16]; // #030B10

/**
 * Interpolate between colormap stops.
 * t is 0..1, returns [r, g, b].
 */
function thermalColor(t) {
  t = constrain(t, 0, 1);
  const n = THERMAL_STOPS.length - 1;
  const idx = t * n;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, n);
  const frac = idx - lo;
  return [
    lerp(THERMAL_STOPS[lo][0], THERMAL_STOPS[hi][0], frac),
    lerp(THERMAL_STOPS[lo][1], THERMAL_STOPS[hi][1], frac),
    lerp(THERMAL_STOPS[lo][2], THERMAL_STOPS[hi][2], frac),
  ];
}

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

  // Dark ocean canvas background
  background(...CANVAS_BG);

  // Read the primary data array
  const primary = payload.data?.primary;
  if (!primary || !primary.data || !primary.shape) {
    // No data — leave the dark canvas
    window.__RENDER_COMPLETE = true;
    return;
  }

  const dataArr = primary.data;
  const [rows, cols] = primary.shape;
  const vmin = primary.min;
  const vmax = primary.max;
  const nanValue = -999.0;

  // Pixel dimensions per data cell
  const cellW = w / cols;
  const cellH = h / rows;

  // Build the image into a pixel buffer for performance
  const img = createImage(cols, rows);
  img.loadPixels();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Data is stored row-major; row 0 = southernmost latitude
      // We flip vertically: screen row 0 = northernmost = data row (rows-1)
      const dataRow = rows - 1 - r;
      const val = dataArr[dataRow * cols + c];
      const pi = (r * cols + c) * 4;

      if (val === nanValue || val === null || val === undefined) {
        // NaN / missing → canvas background
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

  // Draw the data image scaled to the full canvas
  if (doSmooth) {
    // Smooth interpolation (bilinear by default in p5)
    image(img, 0, 0, w, h);
  } else {
    // Nearest-neighbor for crisp pixels
    noSmooth();
    image(img, 0, 0, w, h);
  }

  // Source attribution — baked into every render (TA §constraints/attribution-baked-in)
  const sourceId = primary.source_id || 'unknown';
  const renderDate = payload.recipe?.render_date || '';
  const recipeName = payload.recipe?.name || '';

  push();
  fill(255, 255, 255, 120);
  noStroke();
  textSize(Math.max(10, Math.floor(h * 0.012)));
  textAlign(LEFT, BOTTOM);
  text(
    `${sourceId.toUpperCase()} · ${recipeName} · ${renderDate} · OceanCanvas`,
    Math.floor(w * 0.02),
    h - Math.floor(h * 0.02)
  );
  pop();

  // Signal completion
  window.__RENDER_COMPLETE = true;
}
