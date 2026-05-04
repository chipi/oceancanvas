/**
 * Video export server — HTTP endpoint for timelapse MP4 generation.
 *
 * POST /api/export/{recipe} with JSON body { fps, dates }
 *   → spawns `oceancanvas export-video` subprocess
 *   → returns { ok, path, size, duration }
 *
 * GET /api/export/{recipe}/status → { ready, path } (check if MP4 exists)
 * GET /api/export/{recipe}/download → stream MP4 file
 *
 * Run alongside save-recipe server or as a separate process.
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, statSync, createReadStream, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RENDERS_DIR = process.env.RENDERS_DIR || '/renders';
const RECIPES_DIR = process.env.RECIPES_DIR || '/recipes';
const DATA_DIR = process.env.DATA_DIR || '/data';
const PORT = parseInt(process.env.EXPORT_PORT || '3002', 10);
// In dev, use uv run from pipeline dir; in Docker, oceancanvas is in PATH
const PIPELINE_DIR = process.env.PIPELINE_DIR || join(import.meta.dirname, '..', '..', 'pipeline');

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /api/export/{recipe} — trigger export
  const postMatch = req.url?.match(/^\/api\/export\/([a-z0-9-]+)$/);
  if (postMatch && req.method === 'POST') {
    const recipe = postMatch[1];
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      let opts = {};
      try { opts = JSON.parse(body || '{}'); } catch {}

      const fps = opts.fps || 12;
      const silent = opts.silent === true;
      const overrides = opts.overrides && typeof opts.overrides === 'object' ? opts.overrides : null;
      const outputPath = join(RENDERS_DIR, `${recipe}.mp4`);

      // Sidebar overrides — write to a temp JSON file the CLI reads via --overrides.
      // The temp file lives in the OS tmpdir and is cleaned up after the spawn closes
      // (success and failure paths both unlink). Skipping writes when there are no
      // overrides keeps the no-sync export path identical to today.
      let overridesPath = null;
      if (overrides && Object.keys(overrides).length > 0) {
        overridesPath = join(tmpdir(), `oc-overrides-${recipe}-${Date.now()}.json`);
        writeFileSync(overridesPath, JSON.stringify(overrides));
      }

      // Spawn the CLI command — use uv run in dev, oceancanvas directly in Docker
      const useUv = !process.env.DOCKER;
      const cmd = useUv ? 'uv' : 'oceancanvas';
      const baseArgs = ['export-video', '--recipe', recipe, '--fps', String(fps), '--output', outputPath];
      if (silent) baseArgs.push('--silent');
      if (overridesPath) baseArgs.push('--overrides', overridesPath);
      const args = useUv ? ['run', 'oceancanvas', ...baseArgs] : baseArgs;

      const proc = spawn(cmd, args, {
        cwd: useUv ? PIPELINE_DIR : undefined,
        env: {
          ...process.env,
          RENDERS_DIR,
          RECIPES_DIR,
          DATA_DIR,
        },
      });

      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        if (overridesPath) {
          try { unlinkSync(overridesPath); } catch {}
        }
        if (code !== 0) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: stderr.slice(-500) }));
          return;
        }

        const stat = statSync(outputPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          recipe,
          path: outputPath,
          size: stat.size,
          duration: `${(stat.size / 1024 / 1024).toFixed(1)} MB`,
        }));
      });
    });
    return;
  }

  // GET /api/export/{recipe}/status — check if MP4 exists
  const statusMatch = req.url?.match(/^\/api\/export\/([a-z0-9-]+)\/status$/);
  if (statusMatch && req.method === 'GET') {
    const recipe = statusMatch[1];
    const mp4Path = join(RENDERS_DIR, `${recipe}.mp4`);
    const exists = existsSync(mp4Path);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ready: exists,
      recipe,
      path: exists ? mp4Path : null,
      size: exists ? statSync(mp4Path).size : 0,
    }));
    return;
  }

  // GET /api/export/{recipe}/download — stream MP4
  const dlMatch = req.url?.match(/^\/api\/export\/([a-z0-9-]+)\/download$/);
  if (dlMatch && req.method === 'GET') {
    const recipe = dlMatch[1];
    const mp4Path = join(RENDERS_DIR, `${recipe}.mp4`);
    if (!existsSync(mp4Path)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'MP4 not found. Export first.' }));
      return;
    }
    const stat = statSync(mp4Path);
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${recipe}_oceancanvas.mp4"`,
    });
    createReadStream(mp4Path).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Video export server listening on port ${PORT}`);
});
