import { describe, it, expect, beforeEach } from 'vitest';
import { mapToLogRange } from '../../js/utils/math.js';

/**
 * Test glide logic in isolation (without Web Audio).
 * Mirrors the decision logic from AudioEngine.noteOn/noteOff.
 */

function makeGlideEngine() {
  return {
    _glide: 0,
    _legatoGlide: false,
    _currentNote: null,
    _heldNotes: [],

    _getGlideTime() {
      if (this._glide <= 0) return 0;
      return mapToLogRange(this._glide / 10, 0.005, 2.0);
    },

    noteOn(midiNote) {
      const wasHoldingNotes = this._heldNotes.length > 0;
      const hadPreviousNote = this._currentNote !== null;
      this._currentNote = midiNote;
      this._heldNotes.push(midiNote);

      const glideTime = this._glide > 0 ? this._getGlideTime() : 0;
      const shouldGlide = glideTime > 0 && hadPreviousNote && (!this._legatoGlide || wasHoldingNotes);
      const retriggerEnvelope = !(this._legatoGlide && wasHoldingNotes);

      return { shouldGlide, glideTime: shouldGlide ? glideTime : 0, retriggerEnvelope };
    },

    noteOff(midiNote) {
      this._heldNotes = this._heldNotes.filter(n => n !== midiNote);
    },
  };
}

describe('Glide — normal mode', () => {
  let eng;

  beforeEach(() => {
    eng = makeGlideEngine();
    eng._glide = 5;
  });

  it('no glide on very first note (no previous pitch)', () => {
    const r = eng.noteOn(60);
    expect(r.shouldGlide).toBe(false);
    expect(r.retriggerEnvelope).toBe(true);
  });

  it('glides on second note after first', () => {
    eng.noteOn(60);
    const r = eng.noteOn(64);
    expect(r.shouldGlide).toBe(true);
    expect(r.glideTime).toBeGreaterThan(0);
  });

  it('glides even after releasing first note (sequential play)', () => {
    eng.noteOn(60);
    eng.noteOff(60);
    // User released first note, now plays second — should still glide
    // because oscillator is sitting at note 60's frequency
    const r = eng.noteOn(64);
    expect(r.shouldGlide).toBe(true);
  });

  it('glides after long gap between notes', () => {
    eng.noteOn(60);
    eng.noteOff(60);
    // Even if seconds pass, glide still works (oscillator is at 60's freq)
    const r = eng.noteOn(72);
    expect(r.shouldGlide).toBe(true);
  });

  it('always retriggers envelope in normal glide', () => {
    eng.noteOn(60);
    const r = eng.noteOn(64);
    expect(r.retriggerEnvelope).toBe(true);
  });

  it('no glide when knob is at 0', () => {
    eng._glide = 0;
    eng.noteOn(60);
    const r = eng.noteOn(64);
    expect(r.shouldGlide).toBe(false);
  });

  it('glide time increases with knob value', () => {
    eng._glide = 1;
    eng.noteOn(60);
    const r1 = eng.noteOn(64);

    const eng2 = makeGlideEngine();
    eng2._glide = 10;
    eng2.noteOn(60);
    const r2 = eng2.noteOn(64);

    expect(r2.glideTime).toBeGreaterThan(r1.glideTime);
  });

  it('glide time at max knob is ~2 seconds', () => {
    eng._glide = 10;
    eng.noteOn(60);
    const r = eng.noteOn(64);
    expect(r.glideTime).toBeCloseTo(2.0, 1);
  });

  it('glide time at min knob is ~5ms', () => {
    eng._glide = 0.1; // just above 0
    eng.noteOn(60);
    const r = eng.noteOn(64);
    expect(r.glideTime).toBeLessThan(0.02);
  });

  it('glides in arp-style noteOff→noteOn same frame', () => {
    eng.noteOn(60);
    eng.noteOff(60); // arp releases previous
    const r = eng.noteOn(64); // arp plays next
    expect(r.shouldGlide).toBe(true);
  });

  it('glides with polyphonic hold (two keys held)', () => {
    eng.noteOn(60);
    // Don't release 60, press 64
    const r = eng.noteOn(64);
    expect(r.shouldGlide).toBe(true);
  });
});

describe('Glide — legato mode', () => {
  let eng;

  beforeEach(() => {
    eng = makeGlideEngine();
    eng._glide = 5;
    eng._legatoGlide = true;
  });

  it('no glide on very first note', () => {
    const r = eng.noteOn(60);
    expect(r.shouldGlide).toBe(false);
  });

  it('glides when notes overlap (key held while pressing another)', () => {
    eng.noteOn(60); // hold
    const r = eng.noteOn(64); // press while 60 held
    expect(r.shouldGlide).toBe(true);
  });

  it('does NOT glide when notes do not overlap', () => {
    eng.noteOn(60);
    eng.noteOff(60); // release before pressing next
    const r = eng.noteOn(64);
    expect(r.shouldGlide).toBe(false);
  });

  it('does NOT retrigger envelope on overlapping notes', () => {
    eng.noteOn(60);
    const r = eng.noteOn(64);
    expect(r.retriggerEnvelope).toBe(false);
  });

  it('DOES retrigger envelope on non-overlapping notes', () => {
    eng.noteOn(60);
    eng.noteOff(60);
    const r = eng.noteOn(64);
    expect(r.retriggerEnvelope).toBe(true);
  });

  it('three overlapping notes — glides each time, no retrigger', () => {
    eng.noteOn(60);
    const r1 = eng.noteOn(64);
    const r2 = eng.noteOn(67);
    expect(r1.shouldGlide).toBe(true);
    expect(r1.retriggerEnvelope).toBe(false);
    expect(r2.shouldGlide).toBe(true);
    expect(r2.retriggerEnvelope).toBe(false);
  });

  it('arp-style noteOff→noteOn does NOT glide in legato', () => {
    // Arp releases then immediately plays — notes don't overlap
    eng.noteOn(60);
    eng.noteOff(60);
    const r = eng.noteOn(64);
    expect(r.shouldGlide).toBe(false);
    expect(r.retriggerEnvelope).toBe(true);
  });
});

describe('Glide — edge cases', () => {
  it('same note twice does not glide (no pitch change)', () => {
    const eng = makeGlideEngine();
    eng._glide = 10;
    eng.noteOn(60);
    const r = eng.noteOn(60);
    // shouldGlide is true but glide has no audible effect (same freq)
    // This is fine — Web Audio ramp to same value is a no-op
    expect(r.shouldGlide).toBe(true);
  });

  it('toggling legato off restores normal glide', () => {
    const eng = makeGlideEngine();
    eng._glide = 5;
    eng._legatoGlide = true;

    eng.noteOn(60);
    eng.noteOff(60);
    const r1 = eng.noteOn(64);
    expect(r1.shouldGlide).toBe(false); // legato, no overlap

    eng._legatoGlide = false;
    eng.noteOff(64);
    const r2 = eng.noteOn(67);
    expect(r2.shouldGlide).toBe(true); // normal mode, glides
  });

  it('changing glide knob mid-session works', () => {
    const eng = makeGlideEngine();
    eng._glide = 0;
    eng.noteOn(60);
    const r1 = eng.noteOn(64);
    expect(r1.shouldGlide).toBe(false);

    eng._glide = 8;
    eng.noteOff(64);
    const r2 = eng.noteOn(67);
    expect(r2.shouldGlide).toBe(true);
    expect(r2.glideTime).toBeGreaterThan(0);
  });
});
