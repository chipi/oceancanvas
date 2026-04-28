/**
 * OceanCanvas — particles render type.
 *
 * Renders flow field data (e.g., currents) as animated particles.
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

  // TODO: read flow field data, simulate particle advection, render trails

  window.__RENDER_COMPLETE = true;
}
