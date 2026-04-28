/**
 * OceanCanvas — scatter render type.
 *
 * Renders point data (e.g., Argo floats) as positioned markers.
 * Reads window.OCEAN_PAYLOAD for data and recipe parameters.
 */

function setup() {
  const payload = window.OCEAN_PAYLOAD || {};
  const w = payload.output?.width || 1920;
  const h = payload.output?.height || 1080;
  const seed = payload.recipe?.render?.seed || 42;

  createCanvas(w, h);
  randomSeed(seed);
  noLoop();

  background(3, 11, 16);

  // TODO: read point positions from payload, map lat/lon to canvas, draw markers

  window.__RENDER_COMPLETE = true;
}
