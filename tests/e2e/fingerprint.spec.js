import { test } from '@playwright/test';
import fs from 'fs';
import { PRESETS } from '../../js/presets.js';
/**
 * A sound regression check, run by hand around engine changes (not in CI: it plays in real time and
 * takes about 35 s). For every preset at two notes, the loudness in octave bands over half a second,
 * with the mod wheel down so the LFO doesn't vary the result. Compare two runs with
 * `node tools/fingerprint-compare.mjs before.json after.json`; two runs of the same code differ by up to
 * about 5 dB in a band (more for 3 Saws, whose LFO is audio-rate).
 *
 *   FP_OUT=/tmp/before.json npx playwright test fingerprint --project desktop
 */
test('fingerprint @desktop', async ({ page }) => {
  test.skip(!process.env.FP_OUT, 'run by hand: set FP_OUT to the file to write');
  test.setTimeout(300000);
  await page.goto('/'); await page.locator('.title-goob').click();
  await page.waitForFunction(() => !!window.__synth);
  const out = {};
  for (const p of PRESETS) {
    await page.selectOption('#preset-select', p.name);
    await page.evaluate(() => window.__synth.controls.modWheel.set(0));
    await page.waitForTimeout(150);
    for (const n of [45, 57]) {
      out[`${p.name} ${n}`] = await page.evaluate(async n => {
        const { engine } = window.__synth, ctx = engine.ctx, an = ctx.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0;
        engine.limiter.connect(an); engine.noteOn(n, 0.8);
        const acc = new Float64Array(an.frequencyBinCount), f = new Float32Array(an.frequencyBinCount);
        await new Promise(r => setTimeout(r, 60));
        for (let k = 0; k < 12; k++) { await new Promise(r => setTimeout(r, 40)); an.getFloatFrequencyData(f); for (let i = 0; i < f.length; i++) acc[i] += 10 ** (f[i] / 10); }
        engine.noteOff(n); engine.limiter.disconnect(an); await new Promise(r => setTimeout(r, 500));
        const hz = i => i * ctx.sampleRate / an.fftSize, bands = [];
        for (let lo = 44; lo < 12000; lo *= 2) { let s = 0; for (let i = 1; i < acc.length; i++) if (hz(i) >= lo && hz(i) < lo * 2) s += acc[i]; bands.push(Math.round(10 * Math.log10(s / 12 + 1e-12))); }
        return bands;
      }, n);
    }
  }
  fs.writeFileSync(process.env.FP_OUT, JSON.stringify(out));
});
