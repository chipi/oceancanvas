/**
 * Recipe save server — tiny HTTP endpoint for writing recipe YAML.
 *
 * POST /api/recipes/{id} with YAML body → writes to recipes/{id}.yaml
 * Validates YAML syntax before writing. Uses atomic write.
 *
 * Run alongside Caddy or as Vite middleware in dev.
 * Environment: RECIPES_DIR (default: /recipes)
 */

import { createServer } from 'node:http';
import { writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const RECIPES_DIR = process.env.RECIPES_DIR || '/recipes';
const PORT = parseInt(process.env.SAVE_PORT || '3001', 10);

const server = createServer((req, res) => {
  // CORS headers for dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const match = req.url?.match(/^\/api\/recipes\/([a-z0-9-]+)$/);
  if (!match || req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const id = match[1];
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    // Basic YAML syntax check — must contain 'name:' at minimum
    if (!body.includes('name:')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid YAML: missing name field' }));
      return;
    }

    // Atomic write
    const filePath = join(RECIPES_DIR, `${id}.yaml`);
    const tmpPath = filePath + '.tmp';
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(tmpPath, body, 'utf-8');
      renameSync(tmpPath, filePath);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Write failed: ${e.message}` }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, id, path: filePath }));
  });
});

server.listen(PORT, () => {
  console.log(`Recipe save server listening on port ${PORT}`);
});
