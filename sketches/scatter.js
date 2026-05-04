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
  // Context layer: 'coastline' (default), 'bathymetry', 'none'
  const contextLayer = payload.recipe?.render?.context_layer || 'coastline';

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

  // Draw context layer
  const ctx = payload.data?.context;
  if (contextLayer === 'bathymetry' && ctx && ctx.data && ctx.shape && ctx.shape.length === 2) {
    drawBathymetryToBuffer(img, ctx, w, h, latMin, latMax, lonMin, lonMax);
  }

  // Coastline overlay — drawn after bathymetry, before points
  const coastline = payload.data?.coastline;
  if (contextLayer !== 'none' && coastline) {
    drawCoastlineToBuffer(img, coastline, w, h, latMin, latMax, lonMin, lonMax);
  }

  if (Array.isArray(primary.data) && primary.data.length > 0 &&
      typeof primary.data[0] === 'object' && 'lat' in primary.data[0]) {
    const colorBy = payload.recipe?.render?.color_by || 'value';
    drawPointsToBuffer(img, primary.data, w, h, latMin, latMax, lonMin, lonMax,
                       primary.min, primary.max, stops, markerSize, markerOpacity, colorBy);
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
                            vmin, vmax, stops, size, opacity, colorBy) {
  const radius = size / 2;
  const mode = colorBy || 'value';
  for (const pt of points) {
    const sx = (pt.lon - lonMin) / (lonMax - lonMin) * w;
    const sy = (latMax - pt.lat) / (latMax - latMin) * h;

    // Colour assignment depends on color_by mode:
    //   value (default) — point.value mapped to colormap
    //   month          — month-of-year of point.date → 0..1 (Jan..Dec)
    //   year           — year of point.date over the dataset's year span
    //   lat            — latitude (legacy fallback when no value)
    let t;
    if (mode === 'month' && pt.date) {
      const m = parseInt(pt.date.slice(5, 7), 10);
      t = Number.isFinite(m) ? (m - 1) / 11 : 0.5;
    } else if (mode === 'year' && pt.date) {
      const y = parseInt(pt.date.slice(0, 4), 10);
      const yMin = vmin || 1970;
      const yMax = vmax || new Date().getFullYear();
      t = yMax !== yMin ? (y - yMin) / (yMax - yMin) : 0.5;
    } else {
      const val = pt.value !== undefined ? pt.value : pt.lat;
      const tMin = vmin !== undefined ? vmin : latMin;
      const tMax = vmax !== undefined ? vmax : latMax;
      t = tMax !== tMin ? (val - tMin) / (tMax - tMin) : 0.5;
    }
    const [cr, cg, cb] = colorFromStops(stops, t);
    stampDot(img, w, h, Math.round(sx), Math.round(sy), radius, cr, cg, cb, opacity);
  }
}

/**
 * Draw GEBCO bathymetry as subtle depth shading behind scatter points.
 * Deep ocean = slightly lighter navy, land = dark. Gives spatial context
 * without overwhelming the scatter data.
 */
function drawBathymetryToBuffer(img, ctx, w, h, latMin, latMax, lonMin, lonMax) {
  const dataArr = ctx.data;
  const [rows, cols] = ctx.shape;
  const vmin = ctx.min;
  const vmax = ctx.max;
  const dataLatMin = ctx.lat_range?.[0] ?? latMin;
  const dataLatMax = ctx.lat_range?.[1] ?? latMax;
  const dataLonMin = ctx.lon_range?.[0] ?? lonMin;
  const dataLonMax = ctx.lon_range?.[1] ?? lonMax;

  // Depth palette: land (>0) = dark, shallow = mid blue, deep = navy
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const lat = latMax - (py / h) * (latMax - latMin);
      const lon = lonMin + (px / w) * (lonMax - lonMin);

      // Map pixel to data grid
      const gr = (lat - dataLatMin) / (dataLatMax - dataLatMin) * (rows - 1);
      const gc = (lon - dataLonMin) / (dataLonMax - dataLonMin) * (cols - 1);
      const r = Math.round(gr);
      const c = Math.round(gc);
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;

      const val = dataArr[r * cols + c];
      if (val === NAN_VALUE) continue;

      const pi = (py * w + px) * 4;

      if (val >= 0) {
        // Land — dark brown/grey
        img.pixels[pi] = 12;
        img.pixels[pi + 1] = 14;
        img.pixels[pi + 2] = 16;
      } else {
        // Ocean — depth-shaded blue, subtle
        const depth = Math.min(1, Math.abs(val) / 6000);
        const t = Math.sqrt(depth); // compress deep end
        img.pixels[pi] = Math.round(3 + t * 8);
        img.pixels[pi + 1] = Math.round(11 + t * 25);
        img.pixels[pi + 2] = Math.round(16 + t * 40);
      }
    }
  }
}

/**
 * Draw coastline outlines from GeoJSON features into the pixel buffer.
 * Uses Bresenham-style line drawing between consecutive coordinates.
 */
function drawCoastlineToBuffer(img, features, w, h, latMin, latMax, lonMin, lonMax) {
  const cr = 40, cg = 70, cb = 85; // visible teal-grey coastline
  const alpha = 0.8;

  for (const feat of features) {
    const geom = feat.geometry;
    if (!geom) continue;
    const coordSets = geom.type === 'MultiLineString' ? geom.coordinates : [geom.coordinates];

    for (const coords of coordSets) {
      for (let i = 1; i < coords.length; i++) {
        const [lon0, lat0] = coords[i - 1];
        const [lon1, lat1] = coords[i];

        const x0 = Math.round((lon0 - lonMin) / (lonMax - lonMin) * w);
        const y0 = Math.round((latMax - lat0) / (latMax - latMin) * h);
        const x1 = Math.round((lon1 - lonMin) / (lonMax - lonMin) * w);
        const y1 = Math.round((latMax - lat1) / (latMax - latMin) * h);

        // Simple line rasterization
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const px = Math.round(x0 + (x1 - x0) * t);
          const py = Math.round(y0 + (y1 - y0) * t);
          if (px < 0 || px >= w || py < 0 || py >= h) continue;
          const pi = (py * w + px) * 4;
          img.pixels[pi] = img.pixels[pi] * (1 - alpha) + cr * alpha;
          img.pixels[pi + 1] = img.pixels[pi + 1] * (1 - alpha) + cg * alpha;
          img.pixels[pi + 2] = img.pixels[pi + 2] * (1 - alpha) + cb * alpha;
        }
      }
    }
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
