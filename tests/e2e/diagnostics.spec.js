// @ts-check
import { test, expect } from '@playwright/test';

/** The on-page sound check (js/ui/diagnostics.js), for phones without a console. */
test.describe('sound check', () => {
  test('with ?debug it shows whether the audio is running and the engine built', async ({ page }) => {
    await page.goto('/?debug');
    await page.waitForSelector('.keyboard');
    await expect(page.locator('.diag')).toContainText('not created yet');
    await page.locator('.title-goob').click();
    await expect(page.locator('.diag')).toContainText('running');
    await expect(page.locator('.diag')).toContainText('engine: yes');
  });

  test('without it, nothing shows when all is well', async ({ page }) => {
    await page.goto('/');
    await page.locator('.title-goob').click();
    await expect.poll(() => page.evaluate(() => !!window.__synth)).toBe(true);
    await expect(page.locator('.diag')).toBeHidden();
  });

  test('if the sound can\'t start, the page says why', async ({ page }) => {
    await page.addInitScript(() => { AudioWorklet.prototype.addModule = () => Promise.reject(new Error('worklet blocked')); });
    await page.goto('/');
    await page.locator('.title-goob').click();
    await expect(page.locator('.diag')).toContainText("Sound couldn't start (building the engine): worklet blocked");
  });
});
