// @ts-check
import { test, expect } from '@playwright/test';

/**
 * A phone, by touch: real touch events (through the DevTools protocol), not the mouse clicks Playwright's
 * click() sends even on a touch device. Runs on the phone project only.
 */
/**
 * Phones' autoplay rule, which the test browser doesn't enforce: audio starts suspended and resume() only
 * works while a gesture that counts is being handled (for touch, the finger lifting, not landing); otherwise its
 * promise never settles, as on a phone.
 */
const PHONE_AUTOPLAY_RULE = () => {
  let gesture = false, moved = false;
  addEventListener('touchstart', () => { moved = false; }, true);
  addEventListener('touchmove', () => { moved = true; }, true);           // a drag is a scroll, not a tap
  for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) {
    addEventListener(ev, () => {
      if (moved && (ev === 'pointerup' || ev === 'touchend')) return;
      gesture = true; queueMicrotask(() => setTimeout(() => { gesture = false; }));
    }, true);
  }
  // as seen on Android: audio created outside a gesture (say, as a scroll began) never starts
  const resume = AudioContext.prototype.resume;
  AudioContext.prototype.resume = function () { return gesture && this.bornInGesture ? resume.call(this) : new Promise(() => {}); };
  const Real = AudioContext;
  window.AudioContext = class extends Real { constructor(...a) { super(...a); this.bornInGesture = gesture; if (!gesture) this.suspend(); } };
};

test.describe('touch', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'touch screens only');
    await page.addInitScript(PHONE_AUTOPLAY_RULE);
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

  test('the first tap starts the sound (as the finger lifts); then a key holds its note until the finger lifts', async ({ page }) => {
    (await touch(page, page.locator('.key[data-note="64"]')))();
    await expect.poll(() => page.evaluate(() => window.__synth?.engine?.ctx.state)).toBe('running');
    const release = await touch(page, page.locator('.key[data-note="60"]'));
    await expect.poll(() => gate(page)).toBeCloseTo(1.6, 2);
    await expect(page.locator('.key[data-note="60"]')).toHaveClass(/active/);
    await release();
    await expect.poll(() => gate(page)).toBe(0);
  });

  test('scrolling down to the keys first, then tapping one, starts the sound', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    const drag = async (x, y0, y1) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / 8 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await drag(200, 600, 100);                                   // a scroll, landing on the panels
    (await touch(page, page.locator('.key[data-note="64"]')))();
    await expect.poll(() => page.evaluate(() => window.__synth?.engine?.ctx.state)).toBe('running');
    const release = await touch(page, page.locator('.key[data-note="60"]'));
    await expect.poll(() => gate(page)).toBeCloseTo(1.6, 2);
    await release();
  });

  test('a button over the keys turns the sound on; after it, the very first key plays', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Tap for sound' });
    await expect(button).toBeVisible();
    (await touch(page, button))();
    await expect(button).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__synth?.engine?.ctx.state)).toBe('running');
    const release = await touch(page, page.locator('.key[data-note="60"]'));
    await expect.poll(() => gate(page)).toBeCloseTo(1.6, 2);
    await release();
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
