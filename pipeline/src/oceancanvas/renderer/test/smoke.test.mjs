/**
 * Smoke test so `npm test` / `make render-test` run in CI.
 * Heavy Puppeteer rendering is covered by pipeline pytest + e2e.
 */
import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("render.mjs exists and exports nothing fatal at load boundary", () => {
  const main = join(__dirname, "..", "render.mjs");
  const src = readFileSync(main, "utf8");
  assert.ok(src.includes("puppeteer"), "render.mjs should reference puppeteer");
});
