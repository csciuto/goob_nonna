import { describe, it, expect, beforeEach } from 'vitest';
import { mapToLogRange } from '../../js/utils/math.js';

/**
 * Test that glide works for sequential notes (release first, press second)
 * without ever needing to hold two notes simultaneously.
 * This mirrors the real Moog Grandmother behavior.
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
      const fallback = this._heldNotes.length > 0
        ? this._heldNotes[this._heldNotes.length - 1]
        : null;
      return { remainingNotes: this._heldNotes.length, fallbackNote: fallback };
    },
  };
}

describe('Glide — sequential play (no overlap)', () => {
  let eng;

  beforeEach(() => {
    eng = makeGlideEngine();
    eng._glide = 10; // max glide
  });

  it('first note: no glide (no previous pitch)', () => {
    const r = eng.noteOn(48);
    expect(r.shouldGlide).toBe(false);
  });

  it('second note after releasing first: GLIDES', () => {
    eng.noteOn(48);
    eng.noteOff(48);
    const r = eng.noteOn(50);
    expect(r.shouldGlide).toBe(true);
    expect(r.glideTime).toBeGreaterThan(0);
  });

  it('third note after releasing second: still glides', () => {
    eng.noteOn(48);
    eng.noteOff(48);
    eng.noteOn(50);
    eng.noteOff(50);
    const r = eng.noteOn(53);
    expect(r.shouldGlide).toBe(true);
  });

  it('long sequence of non-overlapping notes all glide', () => {
    const notes = [48, 50, 53, 55, 60, 64, 67, 72];
    eng.noteOn(notes[0]);
    eng.noteOff(notes[0]);

    for (let i = 1; i < notes.length; i++) {
      const r = eng.noteOn(notes[i]);
      expect(r.shouldGlide).toBe(true);
      expect(r.glideTime).toBeGreaterThan(0);
      eng.noteOff(notes[i]);
    }
  });

  it('_currentNote persists after noteOff (oscillator stays at last freq)', () => {
    eng.noteOn(48);
    eng.noteOff(48);
    expect(eng._currentNote).toBe(48);
  });

  it('_heldNotes is empty after noteOff', () => {
    eng.noteOn(48);
    eng.noteOff(48);
    expect(eng._heldNotes).toEqual([]);
  });

  it('no ghost notes: noteOff clears only the released note', () => {
    eng.noteOn(48);
    eng.noteOff(48);
    eng.noteOn(50);
    eng.noteOff(50);
    expect(eng._heldNotes).toEqual([]);
    expect(eng._currentNote).toBe(50);
  });

  it('envelope retriggers on every non-overlapping note', () => {
    eng.noteOn(48);
    eng.noteOff(48);
    const r = eng.noteOn(50);
    expect(r.retriggerEnvelope).toBe(true);
  });
});

describe('Glide — ghost note prevention', () => {
  it('dropped noteOff creates ghost that breaks subsequent glide', () => {
    const eng = makeGlideEngine();
    eng._glide = 10;

    // Simulate the race condition: noteOn fires but noteOff is dropped
    eng.noteOn(48);
    // noteOff(48) is MISSING — simulates engine not existing when noteOff fires

    // Now play another note — ghost 48 is still in _heldNotes
    const r = eng.noteOn(50);

    // _heldNotes = [48, 50] — ghost 48 makes wasHoldingNotes = true
    expect(eng._heldNotes).toEqual([48, 50]);

    // When user releases 50, engine falls back to ghost note 48
    const off = eng.noteOff(50);
    expect(off.remainingNotes).toBe(1); // ghost still there!
    expect(off.fallbackNote).toBe(48); // glides back to ghost = broken behavior

    // This test documents the bug: the ghost note causes the oscillator
    // to slide back to note 48 every time a note is released, instead
    // of releasing the envelope. The fix is ensuring noteOff always
    // reaches the engine (not dropped due to async init race).
  });
});
