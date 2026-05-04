/**
 * OceanCanvas — composite render type.
 *
 * Layers a gridded primary source (e.g., OISST sea-surface temperature) as
 * a field underneath, then stamps scatter dots from foreground source(s)
 * (e.g., obis-whale-shark observations) on top. The story this enables is
 * "the species reading the ocean": SST background tells where the warm and
 * cold water is; the dots tell where the animals chose to be.
 *
 * Depends on shared.js (loaded first by the renderer).
 *
 * Reads:
 *   - payload.data.primary  — gridded source (drawn as field)
 *   - payload.data.foreground — single object or array of point sources
 *   - payload.data.coastline — optional vector overlay
 *
 * Recipe controls:
 *   - colormap, opacity, smooth — apply to the field background
 *   - foreground_marker_size, foreground_marker_opacity — apply to overlay
 *   - foreground_colormap — separate colormap for the overlay (default arctic)
 *   - context_layer — coastline (default), none
 *
 * Determinism rules (TA §constraints):
 *   - randomSeed() in setup
 *   - no clock-dependent APIs
 *   - window.__RENDER_COMPLETE = true on finish
 */

function setup() {
  const payload = window.OCEAN_PAYLOAD || {};
  const w = payload.output?.width || 1920;
  const h = payload.output?.height || 1080;
  const seed = payload.recipe?.render?.seed || 42;

  const colormapName = payload.recipe?.render?.colormap || 'thermal';
  const opacity = (payload.recipe?.render?.opacity ?? 1.0) * 255;
  const fgColormap = payload.recipe?.render?.foreground_colormap || 'arctic';
  const fgMarkerSize = payload.recipe?.render?.foreground_marker_size || 4;
  const fgMarkerOpacity = (payload.recipe?.render?.foreground_marker_opacity ?? 0.85) * 255;
  const fgColorBy = payload.recipe?.render?.foreground_color_by || 'value';
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
  const latMin = region.lat_min ?? -90;
  const latMax = region.lat_max ?? 90;
  const lonMin = region.lon_min ?? -180;
  const lonMax = region.lon_max ?? 180;

  // Step 1 — render primary as a field at data resolution, scaled into canvas.
  if (primary.data && primary.shape) {
    const dataArr = primary.data;
    const [rows, cols] = primary.shape;
    const vmin = primary.min;
    const vmax = primary.max;
    const stops = getColormap(colormapName);
    const fieldImg = createImage(cols, rows);
    fieldImg.loadPixels();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dataRow = rows - 1 - r;
        const val = dataArr[dataRow * cols + c];
        const pi = (r * cols + c) * 4;
        if (val === NAN_VALUE || val === null || val === undefined) {
          fieldImg.pixels[pi] = CANVAS_BG[0];
          fieldImg.pixels[pi + 1] = CANVAS_BG[1];
          fieldImg.pixels[pi + 2] = CANVAS_BG[2];
          fieldImg.pixels[pi + 3] = 255;
        } else {
          let t = vmax !== vmin ? (val - vmin) / (vmax - vmin) : 0.5;
          t = constrain(t, 0, 1);
          const [cr, cg, cb] = colorFromStops(stops, t);
          fieldImg.pixels[pi] = cr;
          fieldImg.pixels[pi + 1] = cg;
          fieldImg.pixels[pi + 2] = cb;
          fieldImg.pixels[pi + 3] = opacity;
        }
      }
    }
    fieldImg.updatePixels();
    image(fieldImg, 0, 0, w, h);
  }

  // Step 2 — overlay buffer for coastline + foreground dots.
  const overlay = createImage(w, h);
  overlay.loadPixels();
  // Start fully transparent so the field shows through where we don't paint.
  for (let i = 0; i < w * h * 4; i += 4) overlay.pixels[i + 3] = 0;

  const coastline = payload.data?.coastline;
  if (contextLayer !== 'none' && coastline) {
    drawCoastlineToBuffer(overlay, coastline, w, h, latMin, latMax, lonMin, lonMax);
  }

  // Step 3 — foreground dots. Accept either a single object or an array of
  // layers (the three-species recipe uses multiple).
  const fg = payload.data?.foreground;
  const layers = Array.isArray(fg) ? fg : (fg ? [fg] : []);
  const fgStops = getColormap(fgColormap);
  for (const layer of layers) {
    if (Array.isArray(layer.data) && layer.data.length > 0 &&
        typeof layer.data[0] === 'object' && 'lat' in layer.data[0]) {
      drawPointsToBuffer(overlay, layer.data, w, h, latMin, latMax, lonMin, lonMax,
                         layer.min, layer.max, fgStops, fgMarkerSize, fgMarkerOpacity, fgColorBy);
    }
  }

  overlay.updatePixels();
  image(overlay, 0, 0);

  drawAttribution(payload, w, h);
  window.__RENDER_COMPLETE = true;
}

// ── Helpers (mirrors of scatter.js — kept inline because the renderer
// loads only one sketch file at a time, no cross-sketch imports).

function stampDot(img, w, h, cx, cy, radius, cr, cg, cb, alpha) {
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
      const fade = 1 - (dist / glowRadius);
      const a = (alpha / 255) * fade * fade;
      const pi = (y * w + x) * 4;
      img.pixels[pi] = img.pixels[pi] * (1 - a) + cr * a;
      img.pixels[pi + 1] = img.pixels[pi + 1] * (1 - a) + cg * a;
      img.pixels[pi + 2] = img.pixels[pi + 2] * (1 - a) + cb * a;
      // Lift alpha so the overlay shows the dot over the field underneath.
      img.pixels[pi + 3] = Math.min(255, img.pixels[pi + 3] + a * 255);
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

function drawCoastlineToBuffer(img, features, w, h, latMin, latMax, lonMin, lonMax) {
  const cr = 40, cg = 70, cb = 85;
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
          img.pixels[pi + 3] = Math.min(255, img.pixels[pi + 3] + alpha * 255);
        }
      }
    }
  }
}
