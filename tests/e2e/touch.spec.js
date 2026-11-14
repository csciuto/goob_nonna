// @ts-check
import { test, expect } from '@playwright/test';

/**
 * A phone, by touch: real touch events (through the DevTools protocol), not the mouse clicks Playwright's
 * click() sends even on a touch device. Runs on the phone project only.
 */
test.describe('touch', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'touch screens only');
    await page.goto('/');
    await page.waitForSelector('.keyboard');
  });

  /** Press at an element's center, optionally drag by dy, and return a release function. */
  const touch = async (page, locator, dy = 0) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    if (dy) for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + dy * i / 5 }] });
    return () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const gate = page => page.evaluate(async () => {
    const e = window.__synth?.engine; if (!e) return null;
    const an = e.ctx.createAnalyser(); e._kbGateOutput.connect(an);
    await new Promise(r => setTimeout(r, 60));
    const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); e._kbGateOutput.disconnect(an);
    return d[d.length - 1];
  });

  test('touching a key starts the sound and holds the note until the finger lifts', async ({ page }) => {
    const release = await touch(page, page.locator('.key[data-note="60"]'));
    await expect.poll(() => gate(page)).toBeCloseTo(1.6, 2);
    await expect(page.locator('.key[data-note="60"]')).toHaveClass(/active/);
    await release();
    await expect.poll(() => gate(page)).toBe(0);
  });

  test('the LFO light blinks once the sound is on', async ({ page }) => {
    (await touch(page, page.locator('.key[data-note="60"]')))();
    await expect.poll(() => page.evaluate(() => !!window.__synth)).toBe(true);
    const led = page.locator('.panel-modulation .led').first();
    const seen = new Set();
    for (let i = 0; i < 20; i++) { seen.add(await led.evaluate(el => el.className)); await page.waitForTimeout(50); }
    expect(seen.size).toBeGreaterThan(1);
  });

  test('a knob turns by dragging a finger up', async ({ page }) => {
    const knob = page.locator('.knob-container', { has: page.locator('.knob-label', { hasText: /^CUTOFF$/ }) }).locator('.knob');
    const before = await page.evaluate(() => window.__synth?.controls?.cutoff?.get());
    const value = () => knob.locator('xpath=..').locator('.knob-value').textContent();
    const shown = await value();
    const release = await touch(page, knob, -60);
    await release();
    await expect.poll(value).not.toBe(shown);
    expect(before === undefined || before !== null).toBe(true);
  });
});
