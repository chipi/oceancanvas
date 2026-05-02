/**
 * OceanCanvas — field render type.
 *
 * Renders gridded data (e.g., SST) as a coloured heatmap.
 * Depends on shared.js (loaded first by the renderer).
 *
 * Responds to:
 *   - colormap: palette selection (thermal/arctic/otherworldly)
 *   - opacity: transparency (0.3–1.0)
 *   - smooth: bilinear vs nearest-neighbor interpolation
 *   - tail_length: controls contrast curve (higher = more contrast)
 *   - speed_scale: controls brightness shift (higher = brighter)
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
  const colormapName = payload.recipe?.render?.colormap || 'thermal';
  const tailLength = payload.recipe?.render?.tail_length || 12;
  const speedScale = payload.recipe?.render?.speed_scale || 1.0;

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
  const stops = getColormap(colormapName);

  // Contrast curve: tail_length drives gamma (higher = more contrast)
  // Range: tail_length 3→24 maps to gamma 0.6→1.8
  const gamma = lerp(0.6, 1.8, constrain((tailLength - 3) / 21, 0, 1));

  // Brightness: speed_scale drives a brightness multiplier
  // Range: 0.2→2.0 maps to 0.7→1.3
  const brightness = lerp(0.7, 1.3, constrain((speedScale - 0.2) / 1.8, 0, 1));

  const img = createImage(cols, rows);
  img.loadPixels();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dataRow = rows - 1 - r;
      const val = dataArr[dataRow * cols + c];
      const pi = (r * cols + c) * 4;

      if (val === NAN_VALUE || val === null || val === undefined) {
        img.pixels[pi] = CANVAS_BG[0];
        img.pixels[pi + 1] = CANVAS_BG[1];
        img.pixels[pi + 2] = CANVAS_BG[2];
        img.pixels[pi + 3] = 255;
      } else {
        // Normalise and apply gamma for contrast.
        // Clamp before pow — float precision can produce tiny negatives.
        let t = vmax !== vmin ? (val - vmin) / (vmax - vmin) : 0.5;
        t = constrain(t, 0, 1);
        t = Math.pow(t, gamma);
        const [cr, cg, cb] = colorFromStops(stops, t);
        // Apply brightness
        img.pixels[pi] = constrain(cr * brightness, 0, 255);
        img.pixels[pi + 1] = constrain(cg * brightness, 0, 255);
        img.pixels[pi + 2] = constrain(cb * brightness, 0, 255);
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
