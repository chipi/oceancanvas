/**
 * OceanCanvas — particles render type.
 *
 * Renders flow field data as animated particle trails.
 * For Slice 1, flow vectors are derived from the SST spatial gradient
 * (warm→cold direction approximates geostrophic flow).
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

const CANVAS_BG = [3, 11, 16];

function thermalColor(t) {
  t = constrain(t, 0, 1);
  const n = THERMAL_STOPS.length - 1;
  const idx = t * n;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, n);
  const frac = idx - lo;
  return [
    lerp(THERMAL_STOPS[lo][0], THERMAL_STOPS[hi][0], frac),
    lerp(THERMAL_STOPS[lo][1], THERMAL_STOPS[hi][1], frac),
    lerp(THERMAL_STOPS[lo][2], THERMAL_STOPS[hi][2], frac),
  ];
}

/**
 * Compute spatial gradient (dT/dx, dT/dy) at a grid position.
 * Returns a [vx, vy] flow vector derived from the SST gradient.
 */
function flowAt(dataArr, rows, cols, r, c, nanValue) {
  const ri = constrain(Math.floor(r), 0, rows - 1);
  const ci = constrain(Math.floor(c), 0, cols - 1);

  const ri1 = Math.min(ri + 1, rows - 1);
  const ri0 = Math.max(ri - 1, 0);
  const ci1 = Math.min(ci + 1, cols - 1);
  const ci0 = Math.max(ci - 1, 0);

  const v = dataArr[ri * cols + ci];
  const vr = dataArr[ri1 * cols + ci];
  const vl = dataArr[ri0 * cols + ci];
  const vu = dataArr[ri * cols + ci1];
  const vd = dataArr[ri * cols + ci0];

  if (v === nanValue || vr === nanValue || vl === nanValue ||
      vu === nanValue || vd === nanValue) {
    return [0, 0];
  }

  // Gradient → perpendicular flow (geostrophic approximation)
  const dTdy = (vr - vl) / 2;
  const dTdx = (vu - vd) / 2;
  return [-dTdy, dTdx]; // perpendicular to gradient
}

function setup() {
  const payload = window.OCEAN_PAYLOAD || {};
  const w = payload.output?.width || 1920;
  const h = payload.output?.height || 1080;
  const seed = payload.recipe?.render?.seed || 42;
  const opacity = (payload.recipe?.render?.opacity ?? 0.85) * 255;
  const particleCount = payload.recipe?.render?.particle_count || 3000;
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
  const nanValue = -999.0;

  // Initialise particles at random grid positions
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: random(0, cols - 1),
      y: random(0, rows - 1),
      trail: [],
    });
  }

  // Simulate particle advection for tailLength steps
  const steps = tailLength * 4; // more steps = smoother trails
  const dt = 0.3 * speedScale;

  for (let step = 0; step < steps; step++) {
    for (const p of particles) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > tailLength) p.trail.shift();

      const [vx, vy] = flowAt(dataArr, rows, cols, p.y, p.x, nanValue);
      p.x += vx * dt;
      p.y += vy * dt;

      // Wrap around grid edges
      if (p.x < 0) p.x += cols;
      if (p.x >= cols) p.x -= cols;
      if (p.y < 0) p.y += rows;
      if (p.y >= rows) p.y -= rows;
    }
  }

  // Draw trails
  noFill();
  for (const p of particles) {
    if (p.trail.length < 2) continue;

    // Colour based on SST at current position
    const ri = constrain(Math.floor(p.y), 0, rows - 1);
    const ci = constrain(Math.floor(p.x), 0, cols - 1);
    const val = dataArr[ri * cols + ci];
    if (val === nanValue) continue;

    const t = vmax !== vmin ? (val - vmin) / (vmax - vmin) : 0.5;
    const [cr, cg, cb] = thermalColor(t);

    beginShape();
    for (let i = 0; i < p.trail.length; i++) {
      const age = i / p.trail.length; // 0=old, 1=recent
      const alpha = age * opacity;
      stroke(cr, cg, cb, alpha);
      strokeWeight(lerp(0.5, 2.0, age));

      // Map grid coords to canvas
      const sx = (p.trail[i].x / (cols - 1)) * w;
      // Flip Y: row 0 = south → bottom of canvas
      const sy = (1 - p.trail[i].y / (rows - 1)) * h;
      vertex(sx, sy);
    }
    endShape();
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
