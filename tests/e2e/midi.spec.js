// @ts-check
import { test, expect } from '@playwright/test';

/** A MIDI keyboard, simulated by feeding the bytes it would send. @desktop: nothing here depends on screen size. */
test.describe('MIDI keyboard @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.title-goob').click();
    await expect.poll(() => page.evaluate(() => !!window.__synth)).toBe(true);
  });
  const send = (page, ...bytes) => page.evaluate(b => window.__midiIn(b), bytes);
  const signal = (page, source) => page.evaluate(async name => {
    const e = window.__synth.engine, an = e.ctx.createAnalyser();
    e[name].connect(an);
    await new Promise(r => setTimeout(r, 80));
    const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d);
    e[name].disconnect(an);
    return d[d.length - 1];
  }, source);

  test('a note lights its key, opens the gate, and sends its velocity', async ({ page }) => {
    await send(page, 0x90, 60, 64);
    await expect(page.locator('.key[data-note="60"]')).toHaveClass(/active/);
    await expect.poll(() => signal(page, '_kbGateOutput')).toBeCloseTo(1.6, 2);   // +8 V, once the audio has caught up
    expect(await signal(page, '_kbVelOutput')).toBeCloseTo(64 / 127, 2);
    expect(await signal(page, '_kbPitchOutput')).toBeCloseTo((60 - 41) / 12 / 5, 3);   // 1 V per octave from the lowest key
    await send(page, 0x80, 60, 0);
    await expect(page.locator('.key[data-note="60"]')).not.toHaveClass(/active/);
    await expect.poll(() => signal(page, '_kbGateOutput')).toBe(0);
  });

  test('notes beyond the on-screen keys still play', async ({ page }) => {
    await send(page, 0x90, 96, 100);
    await expect.poll(() => signal(page, '_kbGateOutput')).toBeCloseTo(1.6, 2);
    expect(await signal(page, '_kbPitchOutput')).toBeCloseTo((96 - 41) / 12 / 5, 3);
    await send(page, 0x80, 96, 0);
  });

  test('the pitch and mod wheels move the panel wheels', async ({ page }) => {
    await send(page, 0xe0, 127, 127);
    await send(page, 0xb0, 1, 127);
    const wheels = () => page.evaluate(() => { const c = window.__synth.layout.panels.controller; return [c.pitchWheel.value, c.modWheel.value]; });
    expect(await wheels()).toEqual([1, 1]);
    await send(page, 0xe0, 0, 64);
    expect((await wheels())[0]).toBe(0);
  });

  test('MIDI clock steps the arpeggiator at the note value the RATE knob picks', async ({ page }) => {
    const steps = await page.evaluate(async () => {
      const { engine, controls } = window.__synth, arp = engine.getArpSeq();
      let n = 0; arp.onStep = () => n++;
      controls.arpRate.set(7.5);                                    // 16th notes: 6 ticks per step
      window.__midiIn([0x90, 60, 100]); window.__midiIn([0x90, 64, 100]);
      arp.pressPlay();
      window.__midiIn([0xfa]);
      for (let i = 0; i < 48; i++) window.__midiIn([0xf8]);       // two quarter notes
      const external = arp.clock.isExternal();
      arp.stop();
      return { n, external };
    });
    expect(steps).toEqual({ n: 8, external: true });
  });

  test('the MIDI IN button is a labeled toggle', async ({ page }) => {
    const b = page.locator('#midi-btn');
    await expect(b).toHaveText('MIDI IN');
    await expect(b).toHaveAttribute('aria-pressed', 'false');
  });
});
