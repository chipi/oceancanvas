/**
 * OceanCanvas — particles render type.
 *
 * Renders flow field data as particle trails.
 * Flow vectors derived from SST spatial gradient
 * (gradient-perpendicular, a visual heuristic for ocean currents).
 * Depends on shared.js (loaded first by the renderer).
 *
 * Determinism rules (TA §constraints/deterministic-rendering):
 *   - Always call randomSeed() in setup
 *   - Never use Date.now(), millis(), or clock-dependent APIs
 *   - Signal completion via window.__RENDER_COMPLETE = true
 */

const STEPS_PER_TAIL = 4;  // simulation steps per tail pixel
const DT_BASE = 0.3;       // grid units per simulation step

/**
 * Compute gradient-perpendicular flow at a grid position.
 * Not a physical geostrophic model — a visual heuristic that
 * produces current-like flow patterns from temperature gradients.
 */
function flowAt(dataArr, rows, cols, r, c) {
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

  if (v === NAN_VALUE || vr === NAN_VALUE || vl === NAN_VALUE ||
      vu === NAN_VALUE || vd === NAN_VALUE) {
    return [0, 0];
  }

  const dTdy = (vr - vl) / 2;
  const dTdx = (vu - vd) / 2;
  return [-dTdy, dTdx];
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
  const colormapName = payload.recipe?.render?.colormap || 'thermal';
  const stops = getColormap(colormapName);

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

  // Initialise particles at random grid positions
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({ x: random(0, cols - 1), y: random(0, rows - 1), trail: [] });
  }

  // Simulate particle advection
  const steps = tailLength * STEPS_PER_TAIL;
  const dt = DT_BASE * speedScale;

  for (let step = 0; step < steps; step++) {
    for (const p of particles) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > tailLength) p.trail.shift();

      const [vx, vy] = flowAt(dataArr, rows, cols, p.y, p.x);
      p.x += vx * dt;
      p.y += vy * dt;

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

    const ri = constrain(Math.floor(p.y), 0, rows - 1);
    const ci = constrain(Math.floor(p.x), 0, cols - 1);
    const val = dataArr[ri * cols + ci];
    if (val === NAN_VALUE) continue;

    const t = vmax !== vmin ? (val - vmin) / (vmax - vmin) : 0.5;
    const [cr, cg, cb] = colorFromStops(stops, t);

    beginShape();
    for (let i = 0; i < p.trail.length; i++) {
      const age = i / p.trail.length;
      stroke(cr, cg, cb, age * opacity);
      strokeWeight(lerp(0.5, 2.0, age));
      const sx = (p.trail[i].x / (cols - 1)) * w;
      const sy = (1 - p.trail[i].y / (rows - 1)) * h;
      vertex(sx, sy);
    }
    endShape();
  }

  drawAttribution(payload, w, h);
  window.__RENDER_COMPLETE = true;
}
