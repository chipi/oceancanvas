/**
 * OceanCanvas — scatter render type.
 *
 * Renders point data (e.g., Argo floats) as positioned markers.
 * Uses pixel buffer approach for performance — handles thousands
 * of points without Puppeteer timeout.
 *
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

  const stops = getColormap(colormapName);

  // Build pixel buffer — much faster than individual circle() calls
  const img = createImage(w, h);
  img.loadPixels();

  // Fill with canvas background
  for (let i = 0; i < w * h * 4; i += 4) {
    img.pixels[i] = CANVAS_BG[0];
    img.pixels[i + 1] = CANVAS_BG[1];
    img.pixels[i + 2] = CANVAS_BG[2];
    img.pixels[i + 3] = 255;
  }

  if (Array.isArray(primary.data) && primary.data.length > 0 &&
      typeof primary.data[0] === 'object' && 'lat' in primary.data[0]) {
    drawPointsToBuffer(img, primary.data, w, h, latMin, latMax, lonMin, lonMax,
                       primary.min, primary.max, stops, markerSize, markerOpacity);
  } else if (primary.shape) {
    drawGridToBuffer(img, primary, w, h, latMin, latMax, lonMin, lonMax,
                     stops, markerSize, markerOpacity);
  }

  img.updatePixels();
  image(img, 0, 0);

  drawAttribution(payload, w, h);
  window.__RENDER_COMPLETE = true;
}

/**
 * Draw a filled circle into a pixel buffer at (cx, cy) with given radius and colour.
 * No p5 draw calls — pure array manipulation.
 */
function stampDot(img, w, h, cx, cy, radius, cr, cg, cb, alpha) {
  // Draw with soft glow: outer ring fades, inner core is solid
  const glowRadius = radius * 2;
  const gr2 = glowRadius * glowRadius;
  const x0 = Math.max(0, Math.floor(cx - glowRadius));
  const x1 = Math.min(w - 1, Math.ceil(cx + glowRadius));
  const y0 = Math.max(0, Math.floor(cy - glowRadius));
  const y1 = Math.min(h - 1, Math.ceil(cy + glowRadius));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > gr2) continue;

      const dist = Math.sqrt(dist2);
      // Fade: 1.0 at center, 0.0 at glowRadius
      const fade = 1 - (dist / glowRadius);
      const a = (alpha / 255) * fade * fade; // quadratic falloff

      const pi = (y * w + x) * 4;
      img.pixels[pi] = img.pixels[pi] * (1 - a) + cr * a;
      img.pixels[pi + 1] = img.pixels[pi + 1] * (1 - a) + cg * a;
      img.pixels[pi + 2] = img.pixels[pi + 2] * (1 - a) + cb * a;
    }
  }
}

function drawPointsToBuffer(img, points, w, h, latMin, latMax, lonMin, lonMax,
                            vmin, vmax, stops, size, opacity) {
  const radius = size / 2;
  for (const pt of points) {
    const sx = (pt.lon - lonMin) / (lonMax - lonMin) * w;
    const sy = (latMax - pt.lat) / (latMax - latMin) * h;

    // Use lat as value for colouring if no explicit value
    const val = pt.value !== undefined ? pt.value : pt.lat;
    const tMin = vmin !== undefined ? vmin : latMin;
    const tMax = vmax !== undefined ? vmax : latMax;
    const t = tMax !== tMin ? (val - tMin) / (tMax - tMin) : 0.5;
    const [cr, cg, cb] = colorFromStops(stops, t);
    stampDot(img, w, h, Math.round(sx), Math.round(sy), radius, cr, cg, cb, opacity);
  }
}

function drawGridToBuffer(img, primary, w, h, latMin, latMax, lonMin, lonMax,
                          stops, size, opacity) {
  const dataArr = primary.data;
  const [rows, cols] = primary.shape;
  const vmin = primary.min;
  const vmax = primary.max;
  const dataLatMin = primary.lat_range?.[0] ?? latMin;
  const dataLatMax = primary.lat_range?.[1] ?? latMax;
  const dataLonMin = primary.lon_range?.[0] ?? lonMin;
  const dataLonMax = primary.lon_range?.[1] ?? lonMax;
  const radius = size / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = dataArr[r * cols + c];
      if (val === NAN_VALUE) continue;

      const lat = dataLatMin + (dataLatMax - dataLatMin) * r / (rows - 1);
      const lon = dataLonMin + (dataLonMax - dataLonMin) * c / (cols - 1);
      const sx = (lon - lonMin) / (lonMax - lonMin) * w;
      const sy = (latMax - lat) / (latMax - latMin) * h;
      const t = vmax !== vmin ? (val - vmin) / (vmax - vmin) : 0.5;
      const [cr, cg, cb] = colorFromStops(stops, t);
      stampDot(img, w, h, Math.round(sx), Math.round(sy), radius, cr, cg, cb, opacity);
    }
  }
}
