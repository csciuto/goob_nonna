// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Sound tests. Each one builds the real engine in the browser on an OfflineAudioContext, plays it,
 * and checks numbers measured from the audio: pitch, level, filter response, envelope timing.
 * They run once (desktop); the audio doesn't depend on screen size.
 */
test.describe('sound @desktop', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  /** Run `fn` in the page with the sound kit as its argument. */
  const inPage = (page, fn) => page.evaluate(`(async () => { const kit = await import('/tests/sound-kit.js'); return (${fn})(kit); })()`);

  test('a note plays at its pitch, and silence before and after', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, rms, cents, midi }) => {
      const y = await render({ seconds: 1.5, setup: e => { e.setEnvRelease(0.53); }, events: [[0.2, e => e.noteOn(69)], [0.8, e => e.noteOff(69)]] });
      return { before: rms(slice(y, 0, 0.19)), during: rms(slice(y, 0.4, 0.8)), after: rms(slice(y, 1.3, 1.5)), off: cents(pitch(slice(y, 0.4, 0.8)), midi(69)) };
    });
    expect(r.before).toBeLessThan(1e-4);
    expect(r.during).toBeGreaterThan(0.05);
    expect(r.after).toBeLessThan(r.during / 50);
    expect(Math.abs(r.off)).toBeLessThan(3);
  });

  test('octave switches, the FREQUENCY knob and the pitch wheel move pitch by the right amounts', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, midi }) => {
      const at = async setup => pitch(slice(await render({ seconds: 0.6, setup, events: [[0.05, e => e.noteOn(57)]] }), 0.3, 0.6));
      const ref = midi(57);
      return {
        low: cents(await at(e => e.setOsc1Octave(16)), ref),
        high: cents(await at(e => e.setOsc1Octave(4)), ref),
        osc2: cents(await at(e => { e.setMixerOsc1Level(0); e.setMixerOsc2Level(8); e.setOsc2Detune(7); }), ref),
        bend: cents(await at(e => e.setPitchWheel(1)), ref),
      };
    });
    expect(r.low).toBeCloseTo(-1200, -1);
    expect(r.high).toBeCloseTo(1200, -1);
    expect(r.osc2).toBeCloseTo(700, -1);
    expect(r.bend).toBeCloseTo(200, -1);
  });

  test('the four waveforms have their own harmonics', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, level, midi }) => {
      const f = midi(45), out = {};
      for (const w of ['triangle', 'sawtooth', 'square', 'narrow-pulse']) {
        const y = slice(await render({ seconds: 0.7, setup: e => { e.setOsc1Waveform(w); e.setFilterCutoff(1); e.setMixerOsc1Level(4); }, events: [[0.05, e => e.noteOn(45)]] }), 0.3, 0.7);
        out[w] = { second: level(y, 2 * f) / level(y, f), third: level(y, 3 * f) / level(y, f) };
      }
      return out;
    });
    expect(r.triangle.second).toBeLessThan(0.03);
    expect(r.triangle.third).toBeCloseTo(1 / 9, 1);
    expect(r.sawtooth.second).toBeCloseTo(1 / 2, 1);
    expect(r.square.second).toBeLessThan(0.05);
    expect(r.square.third).toBeCloseTo(1 / 3, 1);
    expect(r['narrow-pulse'].second).toBeGreaterThan(0.5);     // even harmonics: the nasal tone
  });

  test('SYNC locks oscillator 2 to oscillator 1', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, midi }) => {
      const at = async sync => pitch(slice(await render({ seconds: 0.6, setup: e => { e.setMixerOsc1Level(0); e.setMixerOsc2Level(8); e.setOsc2Detune(5); e.setOsc2Sync(sync); e.setFilterCutoff(1); }, events: [[0.05, e => e.noteOn(57)]] }), 0.3, 0.6));
      return { free: cents(await at(false), midi(57)), synced: cents(await at(true), midi(57)) };
    });
    expect(r.free).toBeCloseTo(500, -1);
    expect(Math.abs(r.synced)).toBeLessThan(5);
  });

  test('the filter cuts 24 dB per octave and the CUTOFF knob spans 10 Hz to 20 kHz', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, level, dB, midi }) => {
      // noise through the filter: compare bands one and two octaves above the cutoff with the passband
      const y = slice(await render({ seconds: 3, setup: e => { e.setMixerOsc1Level(0); e.setMixerNoiseLevel(3); e.setVCAMode('drone'); e.setFilterKbTrack(0); e.setFilterCutoff(0.5); } }), 0.5, 3);
      const band = f => { let s = 0; for (let k = -6; k <= 6; k++) s += level(y, f * 2 ** (k / 40)) ** 2; return Math.sqrt(s / 13); };
      const fc = 10 * 2000 ** 0.5;
      return { oneUp: dB(band(fc * 2) / band(fc / 4)), twoUp: dB(band(fc * 4) / band(fc / 4)) };
    });
    expect(r.twoUp - r.oneUp).toBeLessThan(-19);
    expect(r.twoUp - r.oneUp).toBeGreaterThan(-29);
    expect(r.twoUp).toBeLessThan(-40);
  });

  test('full resonance self-oscillates at the cutoff, and KBD TRACK plays it from the keys', async ({ page }) => {
    const r = await inPage(page, `async ({ render, slice, pitch, cents, rms }) => {
      const at = async (track, note, res = 4) => {
        const y = slice(await render({ seconds: 1.2, setup: e => { e.setMixerOsc1Level(0); e.setVCAMode('drone'); e.setFilterResonance(res); e.setFilterCutoff(0.5); e.setFilterKbTrack(track); }, events: [[0.05, e => e.noteOn(note)]] }), 0.7, 1.2);
        return { hz: pitch(y), rms: rms(y) };
      };
      const fc = 10 * 2000 ** 0.5, base = await at(1, 60);
      return {
        base: cents(base.hz, fc), level: base.rms,
        full: cents((await at(1, 72)).hz, base.hz), half: cents((await at(0.5, 72)).hz, base.hz), off: cents((await at(0, 72)).hz, base.hz),
        quiet: (await at(1, 60, 3)).rms,
      };
    }`);
    expect(Math.abs(r.base)).toBeLessThan(30);
    expect(r.level).toBeGreaterThan(0.02);
    expect(r.full).toBeCloseTo(1200, -1.5);
    expect(r.half).toBeCloseTo(600, -1.5);
    expect(Math.abs(r.off)).toBeLessThan(20);
    expect(r.quiet).toBeLessThan(0.001);       // below the top of the knob it rings but doesn't sing
  });

  test('resonance thins the bass', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, level, dB, midi }) => {
      const bass = async res => level(slice(await render({ seconds: 0.8, setup: e => { e.setOsc1Waveform('triangle'); e.setMixerOsc1Level(3); e.setFilterResonance(res); e.setFilterKbTrack(0); }, events: [[0.05, e => e.noteOn(33)]] }), 0.4, 0.8), midi(33));
      return dB(await bass(3) / await bass(0));
    });
    expect(r).toBeLessThan(-8);
    expect(r).toBeGreaterThan(-16);
  });

  test('the output never clips, even with everything turned up', async ({ page }) => {
    const r = await inPage(page, async ({ render, peak }) => peak(await render({
      seconds: 1.5, reverb: 5,
      setup: e => { e.setMixerOsc1Level(10); e.setMixerOsc2Level(10); e.setMixerNoiseLevel(10); e.setOsc2Detune(0.2); e.setFilterResonance(4); e.setFilterCutoff(0.6); e.setOutputLevel(10); e.setFilterEnvAmount(1); },
      events: [[0.05, e => e.noteOn(40)], [0.5, e => e.noteOn(64)], [0.9, e => e.noteOff(40)]],
    })));
    expect(r).toBeLessThanOrEqual(1);
    expect(r).toBeGreaterThan(0.5);
  });

  test('the envelope takes its attack and release times', async ({ page }) => {
    const r = await inPage(page, async ({ render, envelope }) => {
      // ATTACK and RELEASE at 5 are 100 ms each; full sustain
      const env = envelope(await render({ seconds: 1, setup: e => { e.setEnvAttack(2.15); e.setEnvRelease(2.15); e.setEnvSustain(10); e.setOsc1Waveform('triangle'); }, events: [[0.1, e => e.noteOn(69)], [0.6, e => e.noteOff(69)]] }), 10);
      const full = env[50];
      return { early: env[12] / full, half: env[15] / full, up: env[22] / full, release: env[63] / full, gone: env[85] / full };
    });
    expect(r.early).toBeLessThan(0.4);
    expect(r.half).toBeGreaterThan(0.35);
    expect(r.half).toBeLessThan(0.7);
    expect(r.up).toBeGreaterThan(0.95);
    expect(r.release).toBeGreaterThan(0.25);       // 35 ms into a 100 ms release
    expect(r.release).toBeLessThan(0.5);
    expect(r.gone).toBeLessThan(0.02);
  });

  test('a note played while the last one fades starts from that level, with no drop to silence', async ({ page }) => {
    const r = await inPage(page, async ({ render, envelope }) => {
      const env = envelope(await render({ seconds: 1, setup: e => { e.setEnvAttack(2.92); e.setEnvRelease(3.98); e.setEnvSustain(10); e.setOsc1Waveform('triangle'); }, events: [[0.05, e => e.noteOn(69)], [0.5, e => e.noteOff(69)], [0.6, e => e.noteOn(69)]] }), 5);
      return { before: env[118], lowest: Math.min(...env.slice(119, 130)), later: env[150] };
    });
    expect(r.lowest).toBeGreaterThan(r.before * 0.8);
    expect(r.later).toBeGreaterThan(r.before);
  });

  test('two notes in a row both sound: the gate drops between them', async ({ page }) => {
    const r = await inPage(page, async ({ render, envelope }) => {
      // long decay to zero sustain: the second note is only heard if the envelope starts again
      const env = envelope(await render({ seconds: 1, setup: e => { e.setEnvDecay(1.84); e.setEnvSustain(0); }, events: [[0.05, e => e.noteOn(60)], [0.5, e => { e.noteOff(60); e.noteOn(64); }]] }), 10);
      return { faded: env[48], second: env[52] };
    });
    expect(r.second).toBeGreaterThan(r.faded * 5);
  });

  test('ENVELOPE AMT sweeps the filter, up or down', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, level, midi, dB }) => {
      const bright = async amt => {
        const y = await render({ seconds: 0.9, setup: e => { e.setFilterCutoff(0.45); e.setFilterKbTrack(0); e.setEnvAttack(0.0); e.setEnvDecay(2.92); e.setEnvSustain(0); e.setFilterEnvAmount(amt); e.setVCAMode('drone'); }, events: [[0.05, e => e.noteOn(45)]] });
        const h = sig => level(sig, 8 * midi(45));
        return dB(h(slice(y, 0.06, 0.16)) / h(slice(y, 0.75, 0.85)));      // windows of whole cycles
      };
      return { up: await bright(0.5), none: await bright(0), down: await bright(-0.5) };
    });
    expect(r.up).toBeGreaterThan(15);
    expect(Math.abs(r.none)).toBeLessThan(3);
    expect(r.down).toBeLessThan(-10);
  });

  test('VCA modes: DRONE sounds with no key, KB RLS starts at once, ENV follows the attack', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, rms }) => {
      const run = async mode => {
        const y = await render({ seconds: 0.5, setup: e => { e.setVCAMode(mode); e.setEnvAttack(3.98); }, events: [[0.2, e => e.noteOn(57)]] });
        return { idle: rms(slice(y, 0.05, 0.19)), start: rms(slice(y, 0.21, 0.26)) };
      };
      return { env: await run('env'), kb: await run('kb-release'), drone: await run('drone') };
    });
    expect(r.env.idle).toBeLessThan(1e-4);
    expect(r.kb.idle).toBeLessThan(1e-4);
    expect(r.drone.idle).toBeGreaterThan(0.05);
    expect(r.kb.start).toBeGreaterThan(0.05);
    expect(r.env.start).toBeLessThan(r.kb.start / 5);
  });

  test('glide slides evenly between notes', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, midi }) => {
      const y = await render({ seconds: 2.2, setup: e => { e.setGlide(8.5); e.setOsc1Waveform('triangle'); }, events: [[0.05, e => e.noteOn(48)], [0.5, e => { e.noteOff(48); e.noteOn(60); }]] });
      const glide = 0.005 * 400 ** 0.85;      // the GLIDE knob at 8.5, in seconds
      return { mid: cents(pitch(slice(y, 0.5 + glide / 2 - 0.03, 0.5 + glide / 2 + 0.03)), midi(48)), end: cents(pitch(slice(y, 0.5 + glide + 0.1, 2.2)), midi(60)) };
    });
    expect(r.mid).toBeGreaterThan(500);
    expect(r.mid).toBeLessThan(700);
    expect(Math.abs(r.end)).toBeLessThan(5);
  });

  test('the mod wheel sends the LFO to pitch, by PITCH AMT', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, midi }) => {
      const spread = async (wheel, amt) => {
        const y = await render({ seconds: 2.2, setup: e => { e.setLFOWaveform('square'); e.setLFORate(3.4); e.setPitchAmount(amt); e.setModWheel(wheel); e.setOsc1Waveform('triangle'); }, events: [[0.05, e => e.noteOn(69)]] });
        const c = []; for (let t = 0.3; t < 2.1; t += 0.05) c.push(cents(pitch(slice(y, t, t + 0.04)), midi(69)));
        return Math.max(...c) - Math.min(...c);
      };
      return { off: await spread(0, 1), half: await spread(1, 0.5), full: await spread(1, 1) };
    });
    expect(r.off).toBeLessThan(5);
    expect(r.half).toBeCloseTo(1200, -2);        // a square LFO at half amount: half an octave each way
    expect(r.full).toBeCloseTo(2400, -2);
  });

  // ── The patch bay: one test per jack that can change the sound ────────────────────────────────

  test('PITCH IN is 1 volt per octave and adds to the keyboard', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, midi }) => {
      // the attenuator with nothing plugged in is a voltage source: 1/8 of its +8 V is 1 volt
      const at = async (amount, dest, note) => cents(pitch(slice(await render({ seconds: 0.6, setup: e => { e.setOsc1Waveform('triangle'); e.setOsc2Waveform('triangle'); e.setAttenuatorAmount(amount); e.createPatch('atten-out', dest); if (dest === 'osc2-pitch-in') { e.setMixerOsc1Level(0); e.setMixerOsc2Level(8); } }, events: [[0.05, e => e.noteOn(note)]] }), 0.3, 0.6)), midi(note));
      return { up: await at(0.125, 'osc1-pitch-in', 57), down: await at(-0.125, 'osc1-pitch-in', 57), higherKey: await at(0.125, 'osc1-pitch-in', 64), osc2: await at(0.25, 'osc2-pitch-in', 45) };
    });
    expect(r.up).toBeCloseTo(1200, -1);
    expect(r.down).toBeCloseTo(-1200, -1);
    expect(r.higherKey).toBeCloseTo(1200, -1);
    expect(r.osc2).toBeCloseTo(2400, -1);
  });

  test('PWM IN changes the pulse width', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, level, midi }) => {
      const second = async amount => { const y = slice(await render({ seconds: 0.7, setup: e => { e.setOsc1Waveform('square'); e.setFilterCutoff(1); e.setMixerOsc1Level(4); e.setAttenuatorAmount(amount); e.createPatch('atten-out', 'osc1-pwm-in'); }, events: [[0.05, e => e.noteOn(45)]] }), 0.3, 0.7); return level(y, 2 * midi(45)) / level(y, midi(45)); };
      return { square: await second(0), narrower: await second(0.3) };
    });
    expect(r.square).toBeLessThan(0.05);
    expect(r.narrower).toBeGreaterThan(0.3);
  });

  test('LIN FM IN shifts oscillator 2 by Hz', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, midi }) => {
      const at = async (amount, note) => pitch(slice(await render({ seconds: 0.6, setup: e => { e.setOsc2Waveform('triangle'); e.setMixerOsc1Level(0); e.setMixerOsc2Level(8); e.setAttenuatorAmount(amount); e.createPatch('atten-out', 'osc2-lin-fm-in'); }, events: [[0.05, e => e.noteOn(note)]] }), 0.3, 0.6)) - midi(note);
      return { low: await at(0.05, 45), high: await at(0.05, 69) };
    });
    expect(r.low).toBeCloseTo(160, -1);       // 0.4 V at 400 Hz per volt
    expect(r.high).toBeCloseTo(160, -1);      // the same number of Hz an octave or two up
  });

  test('CUTOFF IN is 1 volt per octave; ENV AMT IN adds to the ENVELOPE AMT knob', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, level, midi, dB }) => {
      const selfOsc = async amount => pitch(slice(await render({ seconds: 1.2, setup: e => { e.setMixerOsc1Level(0); e.setVCAMode('drone'); e.setFilterResonance(4); e.setFilterCutoff(0.45); e.setAttenuatorAmount(amount); e.createPatch('atten-out', 'cutoff-in'); } }), 0.7, 1.2));
      const sweep = async amount => {
        const y = await render({ seconds: 0.9, setup: e => { e.setFilterCutoff(0.45); e.setFilterKbTrack(0); e.setEnvAttack(0.0); e.setEnvDecay(2.92); e.setEnvSustain(0); e.setVCAMode('drone'); e.setAttenuatorAmount(amount); e.createPatch('atten-out', 'env-amt-in'); }, events: [[0.05, e => e.noteOn(45)]] });
        const h = sig => level(sig, 8 * midi(45));
        return dB(h(slice(y, 0.06, 0.16)) / h(slice(y, 0.75, 0.85)));
      };
      return { octave: cents(await selfOsc(0.125), await selfOsc(0)), noCv: await sweep(0), cv: await sweep(0.5) };
    });
    expect(r.octave).toBeCloseTo(1200, -1.5);
    expect(Math.abs(r.noCv)).toBeLessThan(3);
    expect(r.cv).toBeGreaterThan(15);          // +4 V there is half the knob's travel
  });

  test('TRIGGER IN starts the envelope from any signal over 1.2 volts', async ({ page }) => {
    const r = await inPage(page, async ({ render, envelope }) => {
      const bursts = async patch => {
        const env = envelope(await render({ seconds: 2, setup: e => { e.setLFOWaveform('square'); e.setLFORate(3.4); e.setEnvDecay(1.14); e.setEnvSustain(0); if (patch) e.createPatch('lfo-wave-out', 'env-gate-in'); } }), 10);
        const top = Math.max(...env); let n = 0;
        for (let i = 1; i < env.length; i++) if (env[i - 1] < top / 4 && env[i] >= top / 4) n++;
        return top > 0.01 ? n : 0;
      };
      return { patched: await bursts(true), unpatched: await bursts(false) };
    });
    expect(r.unpatched).toBe(0);
    expect(r.patched).toBeGreaterThanOrEqual(3);     // the LFO, with no key pressed
  });

  test('+ENV OUT and -ENV OUT carry the envelope, right way up and inverted', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, midi }) => {
      const at = async jack => { const y = await render({ seconds: 0.8, setup: e => { e.setOsc1Waveform('triangle'); e.setEnvAttack(0.0); e.setEnvSustain(1.25); e.setEnvDecay(1.57); e.setVCAMode('drone'); e.createPatch(jack, 'osc1-pitch-in'); }, events: [[0.05, e => e.noteOn(57)]] }); return cents(pitch(slice(y, 0.6, 0.8)), midi(57)); };
      return { plus: await at('env-out'), minus: await at('env-neg-out') };
    });
    expect(r.plus).toBeCloseTo(1200, -1.5);       // sustain at 1/8 of +8 V is 1 volt
    expect(r.minus).toBeCloseTo(-1200, -1.5);
  });

  test('VCA AMT IN: adds in ENV mode, takes over in DRONE', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, rms }) => {
      const run = async (mode, amount) => rms(slice(await render({ seconds: 0.5, setup: e => { e.setVCAMode(mode); e.setAttenuatorAmount(amount); e.createPatch('atten-out', 'vca-cv-in'); } }), 0.2, 0.5));
      return { droneZero: await run('drone', 0), droneHalf: await run('drone', 0.5), droneFull: await run('drone', 1), droneNeg: await run('drone', -1), envOpen: await run('env', 1) };
    });
    expect(r.droneZero).toBeLessThan(1e-4);
    expect(r.droneFull).toBeGreaterThan(0.05);
    expect(r.droneHalf / r.droneFull).toBeCloseTo(0.5, 1);
    expect(r.droneNeg).toBeLessThan(1e-4);         // a negative voltage is silence, never an inverted signal
    expect(r.envOpen).toBeGreaterThan(0.05);       // no key held: the voltage alone opens the VCA
  });

  test('RATE IN is 1 volt per octave; S/H OUT steps once per LFO cycle', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, midi }) => {
      const steps = async amount => {
        const y = await render({ seconds: 8, setup: e => { e.setOsc1Waveform('triangle'); e.setVCAMode('drone'); e.setLFORate(4.3); e.setAttenuatorAmount(amount); e.createPatch('atten-out', 'lfo-rate-in'); e.createPatch('lfo-sh-out', 'osc1-pitch-in'); } });
        // a step counts once the pitch settles (two windows in a row agree), so a window across a step isn't one
        let n = 0, held = null, prev = null;
        for (let t = 0.2; t < 7.95; t += 0.01) {
          const c = cents(pitch(slice(y, t, t + 0.01), 40, 12000), midi(60));
          if (prev !== null && Math.abs(c - prev) < 20) { if (held !== null && Math.abs(c - held) > 60) n++; held = c; }
          prev = c;
        }
        return n;
      };
      return { base: await steps(0), octaveUp: await steps(0.125) };
    });
    expect(r.base).toBeGreaterThan(8);
    expect(r.octaveUp / r.base).toBeGreaterThan(1.6);
    expect(r.octaveUp / r.base).toBeLessThan(2.5);
  });

  test('KB OUT, GATE OUT and KB VEL OUT send the note being played', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, rms, midi }) => {
      // KB OUT into PITCH IN doubles the keyboard: an octave of keys becomes two
      const kb = async note => pitch(slice(await render({ seconds: 0.6, setup: e => { e.setOsc1Waveform('triangle'); e.createPatch('kb-pitch-cv', 'osc1-pitch-in'); }, events: [[0.05, e => e.noteOn(note)]] }), 0.3, 0.6));
      // GATE OUT into VCA AMT IN in DRONE: sound only while a key is down
      const g = await render({ seconds: 0.8, setup: e => { e.setVCAMode('drone'); e.createPatch('kb-gate', 'vca-cv-in'); }, events: [[0.2, e => e.noteOn(57)], [0.5, e => e.noteOff(57)]] });
      // KB VEL OUT into VCA AMT IN in DRONE: harder is louder
      const vel = async v => rms(slice(await render({ seconds: 0.5, setup: e => { e.setVCAMode('drone'); e.createPatch('kb-vel', 'vca-cv-in'); }, events: [[0.1, e => e.noteOn(57, v)]] }), 0.2, 0.5));
      return { octave: cents(await kb(53), await kb(41)), gate: [rms(slice(g, 0.05, 0.19)), rms(slice(g, 0.3, 0.5)), rms(slice(g, 0.6, 0.8))], soft: await vel(0.25), hard: await vel(1) };
    });
    expect(r.octave).toBeCloseTo(2400, -1.5);
    expect(r.gate[0]).toBeLessThan(1e-4);
    expect(r.gate[1]).toBeGreaterThan(0.05);
    expect(r.gate[2]).toBeLessThan(1e-4);
    expect(r.hard / r.soft).toBeGreaterThan(2);
  });

  test('MULT, the mixer inputs, FILTER and VCA jacks, and the high-pass filter route audio', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, rms, level, dB, midi }) => {
      const run = async (setup, note = 57) => slice(await render({ seconds: 0.6, setup, events: [[0.05, e => e.noteOn(note)]] }), 0.3, 0.6);
      const closed = e => { e.setFilterCutoff(0); e.setFilterKbTrack(0); };
      const bass = y => level(y, midi(33));
      const hp = async knob => bass(await run(e => { e.setOsc1Waveform('triangle'); e.setHPFCutoff(knob); e.createPatch('osc1-wave-out', 'hpf-in'); e.createPatch('hpf-out', 'mixer-osc1-in'); }, 33));
      return {
        filterShut: rms(await run(closed)),
        aroundFilter: rms(await run(e => { closed(e); e.createPatch('osc1-wave-out', 'mult-1'); e.createPatch('mult-3', 'vca-in'); })),
        multBackwards: rms(await run(e => { closed(e); e.createPatch('osc1-wave-out', 'mult-4'); e.createPatch('mult-2', 'vca-in'); })),
        replaced: rms(await run(e => { e.setMixerOsc1Level(0); e.setMixerNoiseLevel(8); e.createPatch('osc1-wave-out', 'mixer-noise-in'); })),
        noNoise: rms(await run(e => { e.setMixerOsc1Level(0); e.setMixerNoiseLevel(0); })),
        filterOut: rms(await run(e => { e.createPatch('filter-out', 'reverb-in'); e.setVCAMode('env'); })),
        highPass: dB(await hp(0.8) / await hp(0)),
      };
    });
    expect(r.filterShut).toBeLessThan(0.005);
    expect(r.aroundFilter).toBeGreaterThan(0.1);
    expect(r.multBackwards).toBeGreaterThan(0.1);      // any MULT jack in, any other out
    expect(r.replaced).toBeGreaterThan(0.1);           // the NOISE knob now sets oscillator 1's level
    expect(r.noNoise).toBeLessThan(1e-4);
    expect(r.filterOut).toBeGreaterThan(0.1);
    expect(r.highPass).toBeLessThan(-20);
  });

  test('the attenuator: a voltage source alone, a level control with a cable in', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, pitch, cents, midi }) => {
      // the LFO through the attenuator into PITCH IN: vibrato whose depth the knob sets; the +8 V normal must be gone
      const run = async amount => {
        const y = await render({ seconds: 2.2, setup: e => { e.setOsc1Waveform('triangle'); e.setLFOWaveform('square'); e.setLFORate(3.4); e.setAttenuatorAmount(amount); e.createPatch('lfo-wave-out', 'atten-in'); e.createPatch('atten-out', 'osc1-pitch-in'); }, events: [[0.05, e => e.noteOn(69)]] });
        const c = []; for (let t = 0.3; t < 2.1; t += 0.05) c.push(cents(pitch(slice(y, t, t + 0.04)), midi(69)));
        return { spread: Math.max(...c) - Math.min(...c), middle: (Math.max(...c) + Math.min(...c)) / 2 };
      };
      return { tenth: await run(0.1), zero: await run(0) };
    });
    expect(r.tenth.spread).toBeCloseTo(1200, -2);        // a tenth of +/-5 V: half an octave each way
    expect(Math.abs(r.tenth.middle)).toBeLessThan(40);   // centered on the note: no leftover +8 V
    expect(r.zero.spread).toBeLessThan(5);
  });

  test('the spring reverb rings on after the note, the same way every time', async ({ page }) => {
    const r = await inPage(page, async ({ render, slice, rms }) => {
      const run = mix => render({ seconds: 2, reverb: mix, setup: e => { e.setEnvRelease(0.0); }, events: [[0.05, e => e.noteOn(57)], [0.3, e => e.noteOff(57)]] });
      const dry = await run(0), wet = await run(10), again = await run(10);
      return { dryTail: rms(slice(dry, 0.5, 1)), wetTail: rms(slice(wet, 0.5, 1)), wetLate: rms(slice(wet, 1.6, 2)), wetNote: rms(slice(wet, 0.1, 0.3)), same: wet.every((v, i) => v === again[i]) };
    });
    expect(r.dryTail).toBeLessThan(1e-4);
    expect(r.wetTail).toBeGreaterThan(0.003);
    expect(r.wetLate).toBeLessThan(r.wetTail / 3);
    expect(r.wetNote).toBeGreaterThan(0.02);
    expect(r.same).toBe(true);
  });

  test('every jack on the panel is wired to something', async ({ page }) => {
    await page.locator('.title-goob').click();
    await expect.poll(() => page.evaluate(() => !!window.__synth?.engine)).toBe(true);
    const missing = await page.evaluate(() => {
      const bus = window.__synth.engine.signalBus;
      return [...document.querySelectorAll('[data-jack-id]')].map(el => el.dataset.jackId).filter(id => !bus.get(id));
    });
    expect(missing).toEqual([]);
  });
});
