import { test, expect } from '@playwright/test';

// Smoke test: the app loads and renders without JavaScript errors.
// `npm run screenshot` also saves the preview image used for link previews
// and on https://corey.sciu.to/projects/.
const APP = '/';
const PREVIEW = 'preview.png';
const READY = '.keyboard';

test('app loads without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(APP);
  await page.waitForLoadState('networkidle');
  await expect(page.locator(READY).first()).toBeVisible();
  expect(errors).toEqual([]);
});

// The preview: the whole synth, keyboard included. At 1200 px the panels wrap, so the page is laid out wider
// (same 1200:630 shape) and scaled down to 1200 x 630.
test('preview image', async ({ browser }) => {
  test.skip(!process.env.UPDATE_PREVIEW, 'npm run screenshot');
  const ctx = await browser.newContext({ viewport: { width: 1520, height: 798 }, deviceScaleFactor: 1200 / 1520 });
  const page = await ctx.newPage();
  await page.goto(APP);
  await expect(page.locator(READY).first()).toBeVisible();
  await page.waitForTimeout(750);
  await page.screenshot({ path: PREVIEW });
  await ctx.close();
});

test('contact and a link back to the projects page', async ({ page }) => {
  for (const p of [APP]) {
    await page.goto(p);
    await expect(page.getByText(/corey\.sciuto\+\w+@gmail\.com/).first()).toBeAttached();
    await expect(page.locator('a[href="https://corey.sciu.to/projects/"]').first()).toBeAttached();
  }
});
