import { test, expect } from '@playwright/test';

test('gallery loads and shows scaffold page', async ({ page }) => {
  await page.goto('/');
  // Scaffold: just verify the page loads
  await expect(page.locator('body')).toContainText('OceanCanvas');
});

test('dashboard route loads', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('body')).toContainText('Dashboard');
});
