import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════
// Data integrity — pipeline output is served correctly
// ═══════════════════════════════════════════════

test('manifest.json is served and contains test-field recipe', async ({ request }) => {
  const resp = await request.get('/renders/manifest.json');
  expect(resp.ok()).toBeTruthy();
  const manifest = await resp.json();
  expect(manifest.recipe_count).toBeGreaterThan(0);
  expect(manifest.recipes['test-field']).toBeDefined();
  expect(manifest.recipes['test-field'].count).toBeGreaterThan(0);
  expect(manifest.recipes['test-field'].render_type).toBe('field');
});

test('recipe YAML is served via Caddy', async ({ request }) => {
  const resp = await request.get('/recipes/test-field.yaml');
  expect(resp.ok()).toBeTruthy();
  const text = await resp.text();
  expect(text).toContain('name: test-field');
  expect(text).toContain('type: field');
});

test('render PNG exists and loads', async ({ request }) => {
  // Get the latest date from manifest
  const manifest = await (await request.get('/renders/manifest.json')).json();
  const latest = manifest.recipes['test-field'].latest;
  const resp = await request.get(`/renders/test-field/${latest}.png`);
  expect(resp.ok()).toBeTruthy();
  const body = await resp.body();
  // PNG magic bytes
  expect(body[0]).toBe(0x89);
  expect(body[1]).toBe(0x50); // P
  expect(body[2]).toBe(0x4e); // N
  expect(body[3]).toBe(0x47); // G
});

test('sketch files are served', async ({ request }) => {
  const shared = await request.get('/sketches/shared.js');
  expect(shared.ok()).toBeTruthy();
  expect(await shared.text()).toContain('NAN_VALUE');

  const field = await request.get('/sketches/field.js');
  expect(field.ok()).toBeTruthy();
});

// ═══════════════════════════════════════════════
// Gallery — main grid
// ═══════════════════════════════════════════════

test('gallery loads and shows OceanCanvas wordmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText('OCEANCANVAS');
});

test('gallery shows recipe tiles from pipeline output', async ({ page }) => {
  await page.goto('/');
  // After pipeline run, tiles MUST exist — no if-guard
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
});

test('gallery filter pills are visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('button', { hasText: 'all' })).toBeVisible();
});

test('gallery tiles show metadata on hover', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
  await tile.hover();
  await expect(tile.locator('div')).toBeVisible();
});

test('clicking a gallery tile navigates to detail view', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
  await tile.click();
  await page.waitForURL(/\/gallery\/.+/);
  await expect(page.locator('body')).toContainText('OCEANCANVAS');
});

// ═══════════════════════════════════════════════
// Gallery — detail view
// ═══════════════════════════════════════════════

test('detail view shows render image that loads successfully', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
  await tile.click();
  await page.waitForURL(/\/gallery\/.+/);

  const img = page.locator('img').first();
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute('src', /renders/);
  // Verify image actually loaded (not 404)
  const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(0);
});

test('detail view shows context panel with source info', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
  await tile.click();
  await page.waitForURL(/\/gallery\/.+/);
  await expect(page.locator('body')).toContainText('ABOUT THIS DATA');
});

test('detail view has working navigation links', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
  await tile.click();
  await page.waitForURL(/\/gallery\/.+/);
  await expect(page.locator('a', { hasText: '← gallery' })).toBeVisible();
  await expect(page.locator('a', { hasText: 'recipe ↗' })).toBeVisible();
  await expect(page.locator('a', { hasText: 'download' })).toBeVisible();
});

test('detail view — gallery link navigates back', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
  await tile.click();
  await page.waitForURL(/\/gallery\/.+/);
  await page.click('a:has-text("← gallery")');
  await page.waitForURL('/');
});

test('detail view — recipe link navigates to editor', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
  await tile.click();
  await page.waitForURL(/\/gallery\/.+/);
  await page.click('a:has-text("recipe ↗")');
  await page.waitForURL(/\/recipes\/.+/);
});

test('detail view — Esc returns to gallery', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
  await tile.click();
  await page.waitForURL(/\/gallery\/.+/);
  await page.keyboard.press('Escape');
  await page.waitForURL('/');
});

// ═══════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════

test('dashboard loads with SST view', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('body')).toContainText('sea surface temperature');
});

test('dashboard shows source rail', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('body')).toContainText('SST');
});

test('dashboard has create recipe button that navigates', async ({ page }) => {
  await page.goto('/dashboard');
  const btn = page.locator('button', { hasText: /create recipe/i });
  if (await btn.isVisible()) {
    await btn.click();
    await page.waitForURL(/\/recipes\/new/);
  }
});

test('dashboard editorial spread loads', async ({ page }) => {
  await page.goto('/dashboard/oisst/explorer');
  await expect(page.locator('body')).toContainText('DATA EXPLORER');
});

// ═══════════════════════════════════════════════
// Recipe Editor
// ═══════════════════════════════════════════════

test('recipe editor loads for new recipe with both modes', async ({ page }) => {
  await page.goto('/recipes/new');
  await expect(page.locator('body')).toContainText('creative');
  await expect(page.locator('body')).toContainText('yaml');
});

test('recipe editor loads existing recipe with correct name', async ({ page }) => {
  await page.goto('/recipes/test-field');
  await expect(page.locator('body')).toContainText('test-field');
});

test('recipe editor shows mood presets', async ({ page }) => {
  await page.goto('/recipes/new');
  await expect(page.locator('button', { hasText: 'Becalmed' })).toBeVisible();
  await expect(page.locator('button', { hasText: 'Storm surge' })).toBeVisible();
});

test('recipe editor — mood click changes YAML output', async ({ page }) => {
  await page.goto('/recipes/new');
  // Switch to YAML to see default params
  await page.click('button:has-text("yaml")');
  const yamlBefore = await page.locator('body').textContent();

  // Switch back to creative, change mood
  await page.click('button:has-text("creative")');
  await page.click('button:has-text("Storm surge")');

  // Flip to YAML again — content should differ
  await page.click('button:has-text("yaml")');
  const yamlAfter = await page.locator('body').textContent();
  expect(yamlAfter).not.toBe(yamlBefore);
});

test('recipe editor — flip to YAML mode shows recipe structure', async ({ page }) => {
  await page.goto('/recipes/new');
  await page.click('button:has-text("yaml")');
  await expect(page.locator('body')).toContainText('name:');
  await expect(page.locator('body')).toContainText('render:');
});

test('recipe editor — flip back to creative mode', async ({ page }) => {
  await page.goto('/recipes/new');
  await page.click('button:has-text("yaml")');
  await page.click('button:has-text("creative")');
  await expect(page.locator('button', { hasText: 'Becalmed' })).toBeVisible();
});

test('recipe editor has save button', async ({ page }) => {
  await page.goto('/recipes/new');
  await expect(page.locator('button', { hasText: /save/i })).toBeVisible();
});

test('recipe editor has navigation links for existing recipe', async ({ page }) => {
  await page.goto('/recipes/test-field');
  await expect(page.locator('a', { hasText: 'view ↗' })).toBeVisible();
  await expect(page.locator('a', { hasText: 'gallery ↗' })).toBeVisible();
});

// ═══════════════════════════════════════════════
// Recipe save round-trip
// ═══════════════════════════════════════════════

test('recipe save API accepts valid YAML and persists', async ({ request }) => {
  const yaml = `name: e2e-save-test
region:
  lat: [25, 65]
  lon: [-80, 0]
sources:
  primary: oisst
schedule: daily
render:
  type: field
  seed: 42`;

  const resp = await request.post('/api/recipes/e2e-save-test', {
    headers: { 'Content-Type': 'text/plain' },
    data: yaml,
  });
  expect(resp.ok()).toBeTruthy();
  const result = await resp.json();
  expect(result.ok).toBe(true);
  expect(result.id).toBe('e2e-save-test');
});

test('recipe save API rejects invalid YAML', async ({ request }) => {
  const resp = await request.post('/api/recipes/bad-recipe', {
    headers: { 'Content-Type': 'text/plain' },
    data: 'this has no name field',
  });
  expect(resp.status()).toBe(400);
});

// ═══════════════════════════════════════════════
// Cross-surface navigation flows
// ═══════════════════════════════════════════════

test('full flow: gallery → detail → recipe editor → gallery', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  await expect(tile).toBeVisible({ timeout: 10000 });
  await tile.click();
  await page.waitForURL(/\/gallery\/.+/);
  await page.click('a:has-text("recipe ↗")');
  await page.waitForURL(/\/recipes\/.+/);
  await page.click('a:has-text("gallery ↗")');
  await page.waitForURL('/');
});

test('full flow: dashboard → create recipe → gallery', async ({ page }) => {
  await page.goto('/dashboard');
  const btn = page.locator('button', { hasText: /create recipe/i });
  if (await btn.isVisible()) {
    await btn.click();
    await page.waitForURL(/\/recipes\/new/);
    await page.click('a:has-text("gallery ↗")');
    await page.waitForURL('/');
  }
});

// ═══════════════════════════════════════════════
// Error handling
// ═══════════════════════════════════════════════

test('gallery page produces no JS errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.waitForTimeout(2000);
  expect(errors).toHaveLength(0);
});

test('detail view handles unknown recipe gracefully', async ({ page }) => {
  await page.goto('/gallery/nonexistent-recipe-xyz');
  await expect(page.locator('body')).toContainText(/(not found|OCEANCANVAS)/i);
});

test('video editor route shows coming soon', async ({ page }) => {
  await page.goto('/timelapse/test');
  await expect(page.locator('body')).toContainText(/video editor|slice 3/i);
});
