/**
 * OceanCanvas — scatter render type.
 *
 * Renders point data (e.g., Argo floats) as positioned markers.
 * Supports both point-array format [{lat, lon, value}]
 * and gridded format (renders grid cells as dots).
 *
 * Determinism rules (TA §constraints/deterministic-rendering):
 *   - Always call randomSeed() in setup
 *   - Never use Date.now(), millis(), or clock-dependent APIs
 *   - Signal completion via window.__RENDER_COMPLETE = true
 */

const THERMAL_STOPS = [
  [4, 44, 83],
  [15, 110, 86],
  [99, 153, 34],
  [186, 117, 23],
  [216, 90, 48],
  [121, 31, 31],
];

// Argo palette — dark blue → teal → lavender → purple (from OC-05)
const ARGO_STOPS = [
  [4, 44, 83],      // deep navy
  [29, 158, 117],   // teal
  [175, 169, 236],  // lavender
  [120, 80, 180],   // purple
];

const CANVAS_BG = [3, 11, 16];

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

function setup() {
  const payload = window.OCEAN_PAYLOAD || {};
  const w = payload.output?.width || 1920;
  const h = payload.output?.height || 1080;
  const seed = payload.recipe?.render?.seed || 42;
  const markerSize = payload.recipe?.render?.marker_size || 4;
  const markerOpacity = (payload.recipe?.render?.marker_opacity ?? 0.75) * 255;
  const colormap = payload.recipe?.render?.colormap || 'thermal';

  createCanvas(w, h);
  randomSeed(seed);
  noLoop();

  background(...CANVAS_BG);

  const primary = payload.data?.primary;
  if (!primary) {
    window.__RENDER_COMPLETE = true;
    return;
  }

  const region = payload.region || {};
  const latMin = region.lat_min ?? 0;
  const latMax = region.lat_max ?? 90;
  const lonMin = region.lon_min ?? -180;
  const lonMax = region.lon_max ?? 180;

  const stops = colormap === 'argo' ? ARGO_STOPS : THERMAL_STOPS;

  // Determine data format: point array or gridded
  if (Array.isArray(primary.data) && primary.data.length > 0 &&
      typeof primary.data[0] === 'object' && primary.data[0].lat !== undefined) {
    // Point data format: [{lat, lon, value, id}, ...]
    drawPointData(primary.data, w, h, latMin, latMax, lonMin, lonMax,
                  primary.min, primary.max, stops, markerSize, markerOpacity);
  } else if (primary.shape) {
    // Gridded format — render as scatter dots at grid centres
    drawGridAsScatter(primary, w, h, latMin, latMax, lonMin, lonMax,
                      stops, markerSize, markerOpacity);
  }

  // Attribution
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

  window.__RENDER_COMPLETE = true;
}

function drawPointData(points, w, h, latMin, latMax, lonMin, lonMax,
                       vmin, vmax, stops, size, opacity) {
  noStroke();
  for (const pt of points) {
    const sx = map(pt.lon, lonMin, lonMax, 0, w);
    const sy = map(pt.lat, latMax, latMin, 0, h); // flip Y: north at top

    const t = vmax !== vmin ? (pt.value - vmin) / (vmax - vmin) : 0.5;
    const [cr, cg, cb] = colorFromStops(stops, t);

    fill(cr, cg, cb, opacity);
    circle(sx, sy, size);
  }
}

function drawGridAsScatter(primary, w, h, latMin, latMax, lonMin, lonMax,
                           stops, size, opacity) {
  const dataArr = primary.data;
  const [rows, cols] = primary.shape;
  const vmin = primary.min;
  const vmax = primary.max;
  const nanValue = -999.0;

  const dataLatMin = primary.lat_range?.[0] ?? latMin;
  const dataLatMax = primary.lat_range?.[1] ?? latMax;
  const dataLonMin = primary.lon_range?.[0] ?? lonMin;
  const dataLonMax = primary.lon_range?.[1] ?? lonMax;

  noStroke();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = dataArr[r * cols + c];
      if (val === nanValue) continue;

      const lat = lerp(dataLatMin, dataLatMax, r / (rows - 1));
      const lon = lerp(dataLonMin, dataLonMax, c / (cols - 1));

      const sx = map(lon, lonMin, lonMax, 0, w);
      const sy = map(lat, latMax, latMin, 0, h);

      const t = vmax !== vmin ? (val - vmin) / (vmax - vmin) : 0.5;
      const [cr, cg, cb] = colorFromStops(stops, t);

      fill(cr, cg, cb, opacity);
      circle(sx, sy, size + random(-1, 1)); // slight size jitter for organic feel
    }
  }
}
