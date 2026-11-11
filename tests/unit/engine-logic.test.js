import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GlideTracker } from '../../js/audio/glide.js';
import { MidiClockFollower, ticksPerStep, MIDI_DIVISIONS } from '../../js/arp-seq/midi-clock.js';
import { ArpSeqController } from '../../js/arp-seq/arp-seq-controller.js';
import { springImpulse } from '../../js/audio/modules/reverb.js';
import { MixerModule } from '../../js/audio/modules/mixer.js';
import { VERSION } from '../../js/vendor/midi-in.js';

describe('glide', () => {
  it('slides in a straight line (in octaves) and arrives on time', () => {
    const g = new GlideTracker(0);
    g.moveTo(1, 10, 2);
    expect(g.valueAt(10)).toBe(0);
    expect(g.valueAt(11)).toBeCloseTo(0.5);
    expect(g.valueAt(12)).toBe(1);
    expect(g.valueAt(99)).toBe(1);
  });

  it('a new note partway through starts from the pitch that is sounding', () => {
    const g = new GlideTracker(0);
    g.moveTo(1, 0, 2);
    expect(g.moveTo(-1, 1, 2)).toBeCloseTo(0.5);     // halfway there, not at the old target
    expect(g.valueAt(1)).toBeCloseTo(0.5);
    expect(g.valueAt(2)).toBeCloseTo(-0.25);
  });

  it('with no glide the pitch jumps', () => {
    const g = new GlideTracker(0);
    expect(g.moveTo(2, 5, 0)).toBe(2);
    expect(g.valueAt(5)).toBe(2);
  });

  it('schedules the same move on the audio parameter', () => {
    const param = { cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
    const g = new GlideTracker(0);
    g.moveTo(1, 3, 0.5, param);
    expect(param.cancelScheduledValues).toHaveBeenCalledWith(3);
    expect(param.setValueAtTime).toHaveBeenCalledWith(0, 3);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(1, 3.5);
    g.moveTo(0, 9, 0, param);
    expect(param.setValueAtTime).toHaveBeenLastCalledWith(0, 9);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledTimes(1);
  });
});

describe('MIDI clock', () => {
  it('the RATE knob picks a note value, half notes to 32nds', () => {
    expect(ticksPerStep(0)).toBe(48);
    expect(ticksPerStep(10)).toBe(3);
    expect(MIDI_DIVISIONS).toContain(ticksPerStep(5));
    for (const d of MIDI_DIVISIONS) expect(96 % d).toBe(0);
  });

  it('steps once per division, starting on the first tick after Start', () => {
    const f = new MidiClockFollower();
    const steps = n => { let c = 0; for (let i = 0; i < n; i++) if (f.tick(6)) c++; return c; };
    expect(f.tick(6)).toBe(true);
    expect(steps(23)).toBe(3);        // 24 ticks, one quarter note: four 16ths
    expect(steps(24 * 10)).toBe(40);
    f.tick(6); f.tick(6);
    f.start();
    expect(f.tick(6)).toBe(true);
  });
});

describe('arpeggiator and sequencer under outside control', () => {
  const make = () => {
    vi.useFakeTimers();
    const c = new ArpSeqController({ currentTime: 0 });
    const notes = [];
    c.onNoteOn = n => notes.push(n);
    c.noteOn(60); c.noteOn(64); c.noteOn(67);
    return { c, notes };
  };

  it('with an outside clock, steps follow its ticks and the RATE knob is ignored', () => {
    const { c, notes } = make();
    c.setExternalClock(true);
    c.pressPlay();
    vi.advanceTimersByTime(5000);
    expect(notes).toEqual([]);
    c.externalClockTick(); c.externalClockTick();
    expect(notes).toEqual([60, 64]);
    c.setExternalClock(false);            // cable pulled: the internal clock takes over again
    vi.advanceTimersByTime(60000 / c.clock.getBPM() + 5);
    expect(notes.length).toBe(3);
    c.stop(); vi.useRealTimers();
  });

  it('a cable and MIDI clock can both drive; the internal clock returns when both are gone', () => {
    const { c } = make();
    c.setExternalClock(true, 'jack'); c.setExternalClock(true, 'midi');
    c.setExternalClock(false, 'jack');
    expect(c.clock.isExternal()).toBe(true);
    c.setExternalClock(false, 'midi');
    expect(c.clock.isExternal()).toBe(false);
    vi.useRealTimers();
  });

  it('ON/OFF IN starts and stops it, RESET IN goes back to the first note, and each step pulses CLOCK OUT', () => {
    const { c, notes } = make();
    const seen = []; let pulses = 0;
    c.onPlayChange = p => seen.push(p);
    c.onClock = () => pulses++;
    c.setExternalClock(true);
    c.externalRun(true);
    expect(c.isPlaying()).toBe(true);
    c.externalRun(true);                   // already running: nothing new
    c.externalClockTick(); c.externalClockTick();
    c.externalReset();
    c.externalClockTick();
    expect(notes).toEqual([60, 64, 60]);
    expect(pulses).toBe(3);
    c.externalRun(false);
    expect(c.isPlaying()).toBe(false);
    expect(seen).toEqual([true, false]);
    vi.useRealTimers();
  });
});

describe('spring reverb', () => {
  const ir = springImpulse(48000);
  const energy = (from, to) => { let e = 0; for (let i = Math.round(from * 48000); i < Math.round(to * 48000); i++) e += ir[i] * ir[i]; return e; };

  it('is the same every time, and no louder than the dry sound', () => {
    expect(Array.from(springImpulse(48000))).toEqual(Array.from(ir));
    expect(energy(0, 2.4)).toBeCloseTo(1, 3);
  });

  it('starts after the spring\'s travel time and decays over about two seconds', () => {
    expect(energy(0, 0.03)).toBeLessThan(1e-6);
    expect(energy(0.03, 0.3)).toBeGreaterThan(0.3);
    const drop = 10 * Math.log10(energy(1.0, 1.2) / energy(0.2, 0.4));
    expect(drop).toBeLessThan(-18);
    expect(drop).toBeGreaterThan(-40);
  });

  it('keeps to the spring\'s range: almost nothing above 8 kHz', () => {
    let hi = 0, prev = 0;
    for (let i = 0; i < ir.length; i++) { const d = ir[i] - prev; prev = ir[i]; hi += d * d; }   // a crude treble measure
    expect(hi).toBeLessThan(0.2);
  });
});

describe('mixer overdrive', () => {
  it('is nearly clean at moderate levels and compresses as levels rise', () => {
    expect(MixerModule.saturate(0.3) / 0.3).toBeGreaterThan(0.98);
    expect(MixerModule.saturate(0.65) / 0.65).toBeGreaterThan(0.9);      // about 1 o'clock: gentle
    expect(MixerModule.saturate(0.65) / 0.65).toBeLessThan(0.97);
    expect(MixerModule.saturate(2) / 2).toBeLessThan(0.7);               // two sources full up: overdriven
    expect(MixerModule.saturate(-1)).toBe(-MixerModule.saturate(1));
  });
});

describe('shared MIDI module', () => {
  it('the copy in js/vendor is the version package.json pins', () => {
    const pin = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url))).vendored['midi-in'];
    expect(VERSION).toBe(pin);
  });
});
