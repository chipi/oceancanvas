import { defineConfig, devices } from '@playwright/test';

/**
 * Screenshot capture config — separate from e2e/playwright.config.ts so it
 * doesn't run in CI alongside the integration tests. Output goes directly
 * to ../docs/concept/images/ as committed PNGs (the spec writes them there).
 *
 * Run with:
 *   make screenshots                         (from repo root, with the stack up)
 *   cd e2e && BASE_URL=http://localhost:8080 npm run screenshots
 */
export default defineConfig({
  testDir: './screenshots',
  timeout: 60_000,
  // No retries — screenshots should be deterministic; a flaky run is a bug.
  retries: 0,
  // Single worker so the screenshots are taken in a known sequence and
  // the same browser instance is reused (cheaper, also avoids interleaved
  // file writes if two tests target the same path).
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    // 1440×900 viewport at 2× device pixel ratio = retina-friendly 2880×1800
    // PNGs that look sharp on the README at half-size.
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    actionTimeout: 10_000,
    screenshot: 'off', // we take them explicitly, not on test failure
  },
  projects: [
    {
      name: 'chromium-screenshots',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: './.tmp',
});
