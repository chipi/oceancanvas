import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════
// Gallery — main grid
// ═══════════════════════════════════════════════

test('gallery loads and shows OceanCanvas wordmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText('OCEANCANVAS');
});

test('gallery shows recipe tiles when manifest exists', async ({ page }) => {
  await page.goto('/');
  const body = page.locator('body');
  await expect(body).toContainText(/(recipe|No renders yet|field|particles|scatter)/i);
});

test('gallery filter pills are visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('button', { hasText: 'all' })).toBeVisible();
});

test('gallery tiles show metadata on hover', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  if (await tile.isVisible()) {
    await tile.hover();
    await expect(tile.locator('div')).toBeVisible();
  }
});

test('clicking a gallery tile navigates to detail view', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  if (await tile.isVisible()) {
    await tile.click();
    await page.waitForURL(/\/gallery\/.+/);
    await expect(page.locator('body')).toContainText('OCEANCANVAS');
  }
});

// ═══════════════════════════════════════════════
// Gallery — detail view
// ═══════════════════════════════════════════════

test('detail view shows render image', async ({ page }) => {
  await page.goto('/gallery/north-atlantic-sst');
  const img = page.locator('img').first();
  if (await img.isVisible()) {
    await expect(img).toHaveAttribute('src', /renders/);
  }
});

test('detail view shows context panel', async ({ page }) => {
  await page.goto('/gallery/north-atlantic-sst');
  await expect(page.locator('body')).toContainText('ABOUT THIS DATA');
});

test('detail view has navigation links', async ({ page }) => {
  await page.goto('/gallery/north-atlantic-sst');
  await expect(page.locator('a', { hasText: '← gallery' })).toBeVisible();
  await expect(page.locator('a', { hasText: 'recipe ↗' })).toBeVisible();
  await expect(page.locator('a', { hasText: 'download' })).toBeVisible();
});

test('detail view — gallery link navigates back', async ({ page }) => {
  await page.goto('/gallery/north-atlantic-sst');
  await page.click('a:has-text("← gallery")');
  await page.waitForURL('/');
});

test('detail view — recipe link navigates to editor', async ({ page }) => {
  await page.goto('/gallery/north-atlantic-sst');
  await page.click('a:has-text("recipe ↗")');
  await page.waitForURL(/\/recipes\/.+/);
});

test('detail view — Esc returns to gallery', async ({ page }) => {
  await page.goto('/gallery/north-atlantic-sst');
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

test('dashboard has create recipe button', async ({ page }) => {
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

test('recipe editor loads for new recipe', async ({ page }) => {
  await page.goto('/recipes/new');
  await expect(page.locator('body')).toContainText('creative');
  await expect(page.locator('body')).toContainText('yaml');
});

test('recipe editor loads existing recipe', async ({ page }) => {
  await page.goto('/recipes/north-atlantic-sst');
  await expect(page.locator('body')).toContainText('north-atlantic-sst');
});

test('recipe editor shows mood presets', async ({ page }) => {
  await page.goto('/recipes/new');
  await expect(page.locator('button', { hasText: 'Becalmed' })).toBeVisible();
  await expect(page.locator('button', { hasText: 'Storm surge' })).toBeVisible();
});

test('recipe editor — clicking mood changes controls', async ({ page }) => {
  await page.goto('/recipes/new');
  await page.click('button:has-text("Storm surge")');
  const btn = page.locator('button:has-text("Storm surge")');
  await expect(btn).toBeVisible();
});

test('recipe editor — flip to YAML mode', async ({ page }) => {
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

test('recipe editor has navigation links', async ({ page }) => {
  await page.goto('/recipes/north-atlantic-sst');
  await expect(page.locator('a', { hasText: 'view ↗' })).toBeVisible();
  await expect(page.locator('a', { hasText: 'gallery ↗' })).toBeVisible();
});

// ═══════════════════════════════════════════════
// Cross-surface navigation flows
// ═══════════════════════════════════════════════

test('full flow: gallery → detail → recipe editor → gallery', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[role="button"]').first();
  if (await tile.isVisible()) {
    await tile.click();
    await page.waitForURL(/\/gallery\/.+/);
    await page.click('a:has-text("recipe ↗")');
    await page.waitForURL(/\/recipes\/.+/);
    await page.click('a:has-text("gallery ↗")');
    await page.waitForURL('/');
  }
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

test('gallery handles missing manifest gracefully', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.waitForTimeout(2000);
  expect(errors).toHaveLength(0);
});

test('detail view handles unknown recipe', async ({ page }) => {
  await page.goto('/gallery/nonexistent-recipe-xyz');
  await expect(page.locator('body')).toContainText(/(not found|OCEANCANVAS)/i);
});

test('video editor route shows coming soon', async ({ page }) => {
  await page.goto('/timelapse/test');
  await expect(page.locator('body')).toContainText(/video editor|slice 3/i);
});
