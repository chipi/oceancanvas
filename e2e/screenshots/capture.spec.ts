/**
 * Screenshot capture — regenerates docs/concept/images/*.png from the
 * running stack. Each test navigates to a surface, waits for content to
 * settle, and writes a deterministic 2× PNG.
 *
 * Prerequisites:
 *   - `docker compose up` running with rendered data in renders/
 *   - At least one recipe with multiple dates (for Video Editor capture)
 *   - At least one recipe with audio + tension_arc blocks (most recipes
 *     will have these after the v0.5.0 migration)
 *
 * Re-run after any UI change. The PNGs are committed; treat them as
 * part of the documentation artefact.
 */

import { test, expect, Page } from '@playwright/test';
import { join } from 'node:path';

// Resolved relative to the e2e/ working directory at test time
const IMAGES_DIR = join('..', 'docs', 'concept', 'images');

/**
 * A representative recipe slug for the capture sequence. Picked because:
 *   - has many dates (good for Video Editor scrubbing)
 *   - uses the `field` render type (the most common visual)
 *   - migrated to audio + tension_arc blocks
 */
const HERO_RECIPE = 'north-atlantic-sst';

/**
 * Wait for the page to settle: every <img> on the page has either loaded or
 * errored, AND no new images have appeared for a quiet window. The gallery
 * front page is image-heavy (today's renders + 14-day strip + recipe grid),
 * and capturing while images are still streaming in produces fragmented PNGs.
 */
async function waitForGalleryRenders(page: Page) {
  // First: at least one image present and loaded — guards against capturing
  // an empty shell before React has mounted the grid.
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.length > 0 && imgs.some((img) => img.complete && img.naturalWidth > 0);
  }, null, { timeout: 15_000 });

  // Then: every image is settled (loaded or errored — `complete` covers both).
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.every((img) => img.complete);
  }, null, { timeout: 20_000 });

  // Network quiet — catches any tail-end fetches (manifest hydration, etc.)
  await page.waitForLoadState('networkidle');

  // Final settle for any layout shifts after image loads
  await page.waitForTimeout(600);
}

async function shoot(page: Page, filename: string) {
  await page.screenshot({
    path: join(IMAGES_DIR, filename),
    fullPage: false,
  });
}

test.describe('OceanCanvas screenshots', () => {
  test('gallery_front_page', async ({ page }) => {
    await page.goto('/');
    await waitForGalleryRenders(page);
    await shoot(page, 'gallery_front_page.png');
  });

  test('gallery_detail', async ({ page }) => {
    await page.goto(`/gallery/${HERO_RECIPE}`);
    await waitForGalleryRenders(page);
    await shoot(page, 'gallery_detail.png');
  });

  test('dashboard_overview', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGalleryRenders(page);
    await shoot(page, 'dashboard_overview.png');
  });

  test('editor_creative_mode', async ({ page }) => {
    await page.goto(`/recipes/${HERO_RECIPE}`);
    // Recipe Editor lands in creative mode by default; wait for the live
    // preview canvas to populate.
    await page.waitForLoadState('networkidle');
    await waitForGalleryRenders(page);
    await shoot(page, 'editor_creative_mode.png');
  });

  test('editor_yaml_mode', async ({ page }) => {
    await page.goto(`/recipes/${HERO_RECIPE}`);
    await page.waitForLoadState('networkidle');
    // Click the YAML pill in the flip bar
    await page.getByRole('button', { name: /yaml/i }).click();
    await page.waitForTimeout(300);
    await shoot(page, 'editor_yaml_mode.png');
  });

  test('video_editor', async ({ page }) => {
    await page.goto(`/timelapse/${HERO_RECIPE}`);
    // Wait for the recipe metadata + preview frame to render
    await page.waitForLoadState('networkidle');
    await waitForGalleryRenders(page);
    // Settle the frame ribbon + audio sidebar
    await page.waitForTimeout(800);
    await shoot(page, 'video_editor.png');
  });

  test('video_editor_audio_panel', async ({ page }) => {
    // Same surface, framed on the audio sidebar with mixer + EQ + arc editor.
    // We capture the full page; readers can crop in their head.
    await page.goto(`/timelapse/${HERO_RECIPE}`);
    await page.waitForLoadState('networkidle');
    await waitForGalleryRenders(page);
    await page.waitForTimeout(800);
    // Element-clip the right-hand controls panel
    const panel = page.locator('aside').first();
    await expect(panel).toBeVisible();
    await panel.screenshot({ path: join(IMAGES_DIR, 'video_editor_audio_panel.png') });
  });
});
