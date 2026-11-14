import { test } from '@playwright/test';
import fs from 'fs';
/**
 * Records a preset to a WAV, by hand, to listen to or measure: A3, a pause, then E4, D4, A4.
 *   PRESET='Bag Pipes' WAV_OUT=~/Desktop/bag-pipes.wav npx playwright test record --project desktop
 * WHEEL=0..1 sets the mod wheel after the preset loads.
 */
test('record @desktop', async ({ page }) => {
  test.skip(!process.env.WAV_OUT, 'run by hand: set WAV_OUT to the file to write');
  test.setTimeout(120000);
  await page.goto('/'); await page.locator('.title-goob').click();
  await page.waitForFunction(() => !!window.__synth);
  await page.selectOption('#preset-select', process.env.PRESET || 'Bag Pipes');
  if (process.env.WHEEL) await page.evaluate(w => window.__synth.controls.modWheel.set(+w), process.env.WHEEL);
  await page.waitForTimeout(300);
  const data = await page.evaluate(async () => {
    const { engine } = window.__synth, ctx = engine.ctx;
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([`registerProcessor('rec', class extends AudioWorkletProcessor { process(i) { if (i[0][0]) this.port.postMessage(i[0][0].slice()); return true; } });`], { type: 'text/javascript' })));
    const rec = new AudioWorkletNode(ctx, 'rec'), chunks = [];
    rec.port.onmessage = e => chunks.push(e.data);
    engine.limiter.connect(rec);
    const play = (n, t) => new Promise(r => { engine.noteOn(n, 0.8); setTimeout(() => { engine.noteOff(n); r(); }, t); });
    const wait = t => new Promise(r => setTimeout(r, t));
    await wait(200); await play(57, 1200); await wait(500); await play(64, 800); await play(62, 800); await play(69, 1200); await wait(1200);
    engine.limiter.disconnect(rec);
    const n = chunks.reduce((s, c) => s + c.length, 0), out = new Float32Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
    return { sr: ctx.sampleRate, samples: Array.from(out) };
  });
  const { sr, samples } = data, b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
  fs.writeFileSync(process.env.WAV_OUT, b);
});
