/**
 * OceanCanvas — scatter render type.
 *
 * Renders point data (e.g., Argo floats) as positioned markers.
 * Supports both point-array format [{lat, lon, value}]
 * and gridded format (renders grid cells as dots).
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
  const markerSize = payload.recipe?.render?.marker_size || 4;
  const markerOpacity = (payload.recipe?.render?.marker_opacity ?? 0.75) * 255;
  const colormapName = payload.recipe?.render?.colormap || 'thermal';

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

  const stops = colormapName === 'argo' ? ARGO_STOPS : THERMAL_STOPS;

  if (Array.isArray(primary.data) && primary.data.length > 0 &&
      typeof primary.data[0] === 'object' && 'lat' in primary.data[0]) {
    drawPointData(primary.data, w, h, latMin, latMax, lonMin, lonMax,
                  primary.min, primary.max, stops, markerSize, markerOpacity);
  } else if (primary.shape) {
    drawGridAsScatter(primary, w, h, latMin, latMax, lonMin, lonMax,
                      stops, markerSize, markerOpacity);
  }

  drawAttribution(payload, w, h);
  window.__RENDER_COMPLETE = true;
}

function drawPointData(points, w, h, latMin, latMax, lonMin, lonMax,
                       vmin, vmax, stops, size, opacity) {
  noStroke();
  for (const pt of points) {
    const sx = map(pt.lon, lonMin, lonMax, 0, w);
    const sy = map(pt.lat, latMax, latMin, 0, h);
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
  const dataLatMin = primary.lat_range?.[0] ?? latMin;
  const dataLatMax = primary.lat_range?.[1] ?? latMax;
  const dataLonMin = primary.lon_range?.[0] ?? lonMin;
  const dataLonMax = primary.lon_range?.[1] ?? lonMax;

  noStroke();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = dataArr[r * cols + c];
      if (val === NAN_VALUE) continue;

      const lat = lerp(dataLatMin, dataLatMax, r / (rows - 1));
      const lon = lerp(dataLonMin, dataLonMax, c / (cols - 1));
      const sx = map(lon, lonMin, lonMax, 0, w);
      const sy = map(lat, latMax, latMin, 0, h);
      const t = vmax !== vmin ? (val - vmin) / (vmax - vmin) : 0.5;
      const [cr, cg, cb] = colorFromStops(stops, t);
      fill(cr, cg, cb, opacity);
      circle(sx, sy, size);
    }
  }
}
