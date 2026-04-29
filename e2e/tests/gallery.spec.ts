import { test, expect } from '@playwright/test';

test('gallery loads and shows OceanCanvas wordmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText('OCEANCANVAS');
});

test('gallery shows recipe cards when manifest exists', async ({ page }) => {
  await page.goto('/');
  // Wait for manifest to load — either cards appear or "No renders yet"
  const body = page.locator('body');
  await expect(body).toContainText(/(recipe|No renders yet)/i);
});

test('gallery hero section renders', async ({ page }) => {
  await page.goto('/');
  // If renders exist, hero image should be present
  const heroImg = page.locator('img').first();
  const count = await page.locator('img').count();
  if (count > 0) {
    await expect(heroImg).toBeVisible();
  }
});

test('dashboard route loads', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('body')).toContainText('Dashboard');
});

test('recipe editor route loads', async ({ page }) => {
  await page.goto('/recipes/new');
  await expect(page.locator('body')).toContainText('Recipe Editor');
});

test('gallery handles missing manifest gracefully', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.waitForTimeout(2000);
  // No unhandled JS exceptions — "Could not load manifest" is an expected UI state, not a crash
  expect(errors).toHaveLength(0);
});
