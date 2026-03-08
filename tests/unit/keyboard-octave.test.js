import { describe, it, expect } from 'vitest';

/**
 * Test keyboard octave shift logic in isolation.
 * The keyboard has visual keys for MIDI 41-72 (F2-C5).
 * _noteOffset shifts what MIDI notes all keys produce.
 * _baseOctave (48, C3) stays fixed — it maps QWERTY keys to visual positions.
 */

// QWERTY key offsets (from keyboard.js)
const LOWER_ROW = {
  'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4,
  'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9,
  'j': 10, 'm': 11, ',': 12, 'l': 13, '.': 14,
  ';': 15,
};

function makeKeyboard() {
  return {
    _baseOctave: 48, // C3 — fixed
    _noteOffset: 0,
    KEYBOARD_START: 41,
    KEYBOARD_END: 72,

    qwertyToMidi(key) {
      const offset = LOWER_ROW[key] ?? null;
      if (offset === null) return null;
      const midi = this._baseOctave + offset + this._noteOffset;
      if (midi < 0 || midi > 127) return null;
      return midi;
    },

    visualClickToMidi(visualNote) {
      return visualNote + this._noteOffset;
    },

    midiToVisualKey(midiNote) {
      return midiNote - this._noteOffset;
    },

    shiftOctave(dir) {
      const newOffset = this._noteOffset + dir * 12;
      if (this.KEYBOARD_START + newOffset < 0) return;
      if (this.KEYBOARD_END + newOffset > 127) return;
      this._noteOffset = newOffset;
    },
  };
}

describe('Keyboard octave shift', () => {
  it('default offset is 0', () => {
    const kb = makeKeyboard();
    expect(kb._noteOffset).toBe(0);
  });

  it('Z key produces C3 (48) at default', () => {
    const kb = makeKeyboard();
    expect(kb.qwertyToMidi('z')).toBe(48);
  });

  it('clicking visual key F2 (41) produces F2 at default', () => {
    const kb = makeKeyboard();
    expect(kb.visualClickToMidi(41)).toBe(41);
  });

  it('shift up one octave: Z produces C4 (60)', () => {
    const kb = makeKeyboard();
    kb.shiftOctave(1);
    expect(kb._noteOffset).toBe(12);
    expect(kb.qwertyToMidi('z')).toBe(60);
  });

  it('shift up: visual key F2 (41) produces F3 (53)', () => {
    const kb = makeKeyboard();
    kb.shiftOctave(1);
    expect(kb.visualClickToMidi(41)).toBe(53);
  });

  it('shift down one octave: Z produces C2 (36)', () => {
    const kb = makeKeyboard();
    kb.shiftOctave(-1);
    expect(kb._noteOffset).toBe(-12);
    expect(kb.qwertyToMidi('z')).toBe(36);
  });

  it('shift down: visual key C5 (72) produces C4 (60)', () => {
    const kb = makeKeyboard();
    kb.shiftOctave(-1);
    expect(kb.visualClickToMidi(72)).toBe(60);
  });

  it('visual key highlighting maps back correctly', () => {
    const kb = makeKeyboard();
    kb.shiftOctave(1);
    // Playing MIDI 60 (C4) should highlight visual key 48 (C3 position)
    expect(kb.midiToVisualKey(60)).toBe(48);
  });

  it('clamps so lowest key stays >= 0', () => {
    const kb = makeKeyboard();
    // Shift down 4 octaves: 41 + (-48) = -7 → should be blocked
    kb.shiftOctave(-1);
    kb.shiftOctave(-1);
    kb.shiftOctave(-1);
    kb.shiftOctave(-1); // would put lowest at 41-48 = -7, blocked
    expect(kb._noteOffset).toBe(-36); // only 3 shifts applied
    expect(kb.visualClickToMidi(41)).toBe(5); // F-1
  });

  it('clamps so highest key stays <= 127', () => {
    const kb = makeKeyboard();
    // Shift up 5 octaves: 72 + 60 = 132 → should be blocked
    kb.shiftOctave(1);
    kb.shiftOctave(1);
    kb.shiftOctave(1);
    kb.shiftOctave(1);
    kb.shiftOctave(1); // would put highest at 72+60=132, blocked
    expect(kb._noteOffset).toBe(48); // only 4 shifts
    expect(kb.visualClickToMidi(72)).toBe(120);
  });

  it('QWERTY keys still work after shift', () => {
    const kb = makeKeyboard();
    kb.shiftOctave(2); // +24
    // Z = 48 + 0 + 24 = 72 (C5)
    expect(kb.qwertyToMidi('z')).toBe(72);
    // M = 48 + 11 + 24 = 83
    expect(kb.qwertyToMidi('m')).toBe(83);
  });

  it('multiple shifts accumulate', () => {
    const kb = makeKeyboard();
    kb.shiftOctave(1);
    kb.shiftOctave(1);
    expect(kb._noteOffset).toBe(24);
    kb.shiftOctave(-1);
    expect(kb._noteOffset).toBe(12);
  });
});
