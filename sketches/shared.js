/**
 * OceanCanvas — shared sketch constants and helpers.
 *
 * Loaded before any render-type sketch. Provides:
 *   - Colormaps (thermal, argo)
 *   - Canvas background colour
 *   - Attribution rendering
 *   - Payload reading helpers
 *
 * All sketches depend on these. Changes here propagate to all render types.
 */

// Canvas background — matches --canvas token #030B10 from IA §shared-tokens
const CANVAS_BG = [3, 11, 16];

// NaN placeholder value — convention documented in RFC-002 v0.2
const NAN_VALUE = -999.0;

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

// Argo palette — dark blue → teal → lavender → purple (from OC-05)
const ARGO_STOPS = [
  [4, 44, 83],
  [29, 158, 117],
  [175, 169, 236],
  [120, 80, 180],
];

/**
 * Interpolate between colormap stops.
 * @param {number[][]} stops - Array of [r, g, b] stops
 * @param {number} t - Normalised value 0..1
 * @returns {number[]} [r, g, b]
 */
function colorFromStops(stops, t) {
  t = constrain(t, 0, 1);
  const n = stops.length - 1;
  const idx = t * n;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, n);
  const frac = idx - lo;
  return [
    lerp(stops[lo][0], stops[hi][0], frac),
    lerp(stops[lo][1], stops[hi][1], frac),
    lerp(stops[lo][2], stops[hi][2], frac),
  ];
}

/** Shorthand for thermal colormap. */
function thermalColor(t) {
  return colorFromStops(THERMAL_STOPS, t);
}

/**
 * Draw source attribution text at the bottom-left of the canvas.
 * Baked into every render per TA §constraints/attribution-baked-in.
 */
function drawAttribution(payload, w, h) {
  const primary = payload.data?.primary || {};
  const sourceId = (primary.source_id || 'unknown').toUpperCase();
  const renderDate = payload.recipe?.render_date || '';
  const recipeName = payload.recipe?.name || '';

  push();
  fill(255, 255, 255, 120);
  noStroke();
  textSize(Math.max(10, Math.floor(h * 0.012)));
  textAlign(LEFT, BOTTOM);
  text(
    `${sourceId} · ${recipeName} · ${renderDate} · OceanCanvas`,
    Math.floor(w * 0.02),
    h - Math.floor(h * 0.02)
  );
  pop();
}
