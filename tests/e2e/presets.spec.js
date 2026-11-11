// @ts-check
import { test, expect } from '@playwright/test';
import { PRESETS } from '../../js/presets.js';

/** Presets and share links, through the real page. @desktop: the panel logic doesn't depend on screen size. */
test.describe('presets and links @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.title-goob').click();                 // the first click starts the audio
    await expect.poll(() => page.evaluate(() => !!window.__synth)).toBe(true);
  });

  const state = page => page.evaluate(() => Object.fromEntries(Object.entries(window.__synth.controls).map(([k, c]) => [k, c.get()])));
  const cablesOf = page => page.evaluate(() => window.__synth.engine.getPatches().map(p => [p.sourceId, p.destId]));
  /** Listen to the synth's output for a moment: loudness and peak. */
  const listen = page => page.evaluate(async () => {
    const { engine } = window.__synth, an = engine.ctx.createAnalyser();
    an.fftSize = 8192; engine.limiter.connect(an);
    await new Promise(r => setTimeout(r, 350));
    const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d);
    engine.limiter.disconnect(an);
    return { rms: Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length), peak: d.reduce((m, v) => Math.max(m, Math.abs(v)), 0), bad: d.some(v => !Number.isFinite(v)) };
  });

  test('every preset sets the whole panel, the same way whatever was loaded before', async ({ page }) => {
    const defaults = await state(page);
    for (const order of [PRESETS, [...PRESETS].reverse()]) {
      for (const preset of order) {
        await page.selectOption('#preset-select', preset.name);
        const got = await state(page);
        for (const [key, value] of Object.entries(defaults)) {
          const want = key in preset.settings ? preset.settings[key] : value;
          expect(got[key], `${preset.name}: ${key}`).toBe(want);
        }
        for (const key of Object.keys(preset.settings)) expect(Object.keys(defaults), `${preset.name} uses an unknown setting`).toContain(key);
        expect(await cablesOf(page), `${preset.name}: cables`).toEqual(preset.patches.map(p => [p.source, p.dest]));
      }
    }
  });

  test('the switches on the panel show what the preset set', async ({ page }) => {
    await page.selectOption('#preset-select', 'Bag Pipes');
    const lit = await page.evaluate(() => {
      const c = window.__synth.layout.panels;
      const shown = sw => sw.getElement().querySelector('.active')?.textContent;
      return { osc1: shown(c.oscillators.osc1Waveform), osc2Octave: shown(c.oscillators.osc2Octave), sync: c.oscillators.syncButton.classList.contains('active') };
    });
    expect(lit).toEqual({ osc1: '⊔', osc2Octave: "4'", sync: true });
    await page.selectOption('#preset-select', 'Default');
    expect(await page.evaluate(() => window.__synth.layout.panels.oscillators.syncButton.classList.contains('active'))).toBe(false);
  });

  test('every preset makes a sound that stays within the output', async ({ page }) => {
    for (const preset of PRESETS) {
      await page.selectOption('#preset-select', preset.name);
      await page.keyboard.down('KeyZ');
      const heard = await listen(page);
      await page.keyboard.up('KeyZ');
      expect(heard.bad, preset.name).toBe(false);
      expect(heard.rms, `${preset.name} is audible`).toBeGreaterThan(0.002);
      expect(heard.peak, `${preset.name} doesn't clip`).toBeLessThanOrEqual(1);
      await page.waitForTimeout(60);
    }
  });

  test('the address follows the panel, and opening it restores knobs, switches and cables', async ({ page, context }) => {
    await page.selectOption('#preset-select', 'Auto Zap Bass');
    await expect.poll(() => page.url()).toContain('#patch=');
    const presetOnly = page.url();
    await page.evaluate(() => window.__synth.controls.modWheel.set(0.4));
    await page.locator('.title-goob').click();
    await expect.poll(() => page.url()).not.toBe(presetOnly);
    const before = await state(page), cables = await cablesOf(page);
    expect(cables).toEqual([['lfo-sh-out', 'cutoff-in']]);

    const other = await context.newPage();
    await other.goto(page.url());
    await expect(other.locator('.patch-cable:not(.pending)')).toHaveCount(1);     // drawn before any click
    expect(await other.evaluate(() => window.__synth)).toBeUndefined();
    await other.locator('.title-goob').click();
    await expect.poll(() => other.evaluate(() => !!window.__synth)).toBe(true);
    expect(await state(other)).toEqual(before);
    expect(await cablesOf(other)).toEqual(cables);

    // back to the default patch: a clean address
    await page.selectOption('#preset-select', 'Default');
    await expect.poll(() => page.url()).not.toContain('#');
  });

  test('a damaged or hostile link is ignored, not obeyed', async ({ page }) => {
    const bad = Buffer.from(JSON.stringify({ v: 1, k: { cutoff: 'high', volume: 1e9, nonsense: 3, osc1Waveform: '<img>', resonance: 2 }, c: [['lfo-sh-out', 'no-such-jack'], 'x', ['filter-out', 'reverb-in']] })).toString('base64url');
    await page.goto('/#patch=' + bad);
    await page.reload();
    await page.locator('.title-goob').click();
    await expect.poll(() => page.evaluate(() => !!window.__synth)).toBe(true);
    const got = await state(page);
    expect(got.cutoff).toBe(7);                   // not a number: left at the default
    expect(got.volume).toBe(10);                  // out of range: limited to the knob's travel
    expect(got.osc1Waveform).toBe('sawtooth');    // not one of the switch's positions
    expect(got.resonance).toBe(2);
    expect(await cablesOf(page)).toEqual([['filter-out', 'reverb-in']]);
    await page.goto('/#patch=%%%');
    await page.reload();
    await expect(page.locator('.keyboard')).toBeVisible();
  });
});
