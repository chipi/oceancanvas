/**
 * OceanCanvas — field render type.
 *
 * Renders gridded data (e.g., SST) as a coloured heatmap.
 * Reads window.OCEAN_PAYLOAD for data and recipe parameters.
 *
 * Rules (ADR-021):
 *   - Always call randomSeed() in setup
 *   - Never use Date.now(), millis(), or clock-dependent APIs
 *   - Signal completion via window.__RENDER_COMPLETE = true
 */

function setup() {
  const payload = window.OCEAN_PAYLOAD || {};
  const w = payload.output?.width || 1920;
  const h = payload.output?.height || 1080;
  const seed = payload.recipe?.render?.seed || 42;

  createCanvas(w, h);
  randomSeed(seed);
  noLoop();

  // Placeholder: dark ocean canvas
  background(3, 11, 16);

  // TODO: read payload.data.primary array, apply colormap, render heatmap

  // Signal completion
  window.__RENDER_COMPLETE = true;
}
