import { describe, it, expect } from 'vitest';
import {
  midiToFrequency,
  frequencyToMidi,
  voltageToFrequencyRatio,
  lerp,
  clamp,
  mapToLogRange,
  mapFromLogRange,
  knobToNormalized,
  bipolarKnobToNormalized,
  envTimeKnobToMs,
  detuneFrequency,
  footToOctaveMultiplier,
} from '../../js/utils/math.js';

describe('midiToFrequency', () => {
  it('converts A4 (MIDI 69) to 440Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440);
  });

  it('converts C4 (MIDI 60) to ~261.63Hz', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.626, 2);
  });

  it('converts A3 (MIDI 57) to 220Hz', () => {
    expect(midiToFrequency(57)).toBeCloseTo(220);
  });

  it('each octave doubles frequency', () => {
    const f1 = midiToFrequency(60);
    const f2 = midiToFrequency(72);
    expect(f2).toBeCloseTo(f1 * 2);
  });
});

describe('frequencyToMidi', () => {
  it('converts 440Hz to MIDI 69', () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69);
  });

  it('is inverse of midiToFrequency', () => {
    for (let note = 21; note <= 108; note++) {
      const freq = midiToFrequency(note);
      expect(frequencyToMidi(freq)).toBeCloseTo(note);
    }
  });
});

describe('voltageToFrequencyRatio', () => {
  it('0V = 1x (no change)', () => {
    expect(voltageToFrequencyRatio(0)).toBe(1);
  });

  it('1V = 2x (one octave up)', () => {
    expect(voltageToFrequencyRatio(1)).toBe(2);
  });

  it('-1V = 0.5x (one octave down)', () => {
    expect(voltageToFrequencyRatio(-1)).toBe(0.5);
  });
});

describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });
});

describe('clamp', () => {
  it('clamps below minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps above maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('passes through values in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('mapToLogRange', () => {
  it('maps 0 to min', () => {
    expect(mapToLogRange(0, 20, 20000)).toBeCloseTo(20);
  });

  it('maps 1 to max', () => {
    expect(mapToLogRange(1, 20, 20000)).toBeCloseTo(20000);
  });

  it('maps 0.5 to geometric midpoint', () => {
    const mid = mapToLogRange(0.5, 20, 20000);
    expect(mid).toBeCloseTo(Math.sqrt(20 * 20000), 0);
  });
});

describe('mapFromLogRange', () => {
  it('is inverse of mapToLogRange', () => {
    const min = 20, max = 20000;
    for (const norm of [0, 0.25, 0.5, 0.75, 1]) {
      const value = mapToLogRange(norm, min, max);
      expect(mapFromLogRange(value, min, max)).toBeCloseTo(norm);
    }
  });
});

describe('knobToNormalized', () => {
  it('maps 0 to 0', () => {
    expect(knobToNormalized(0)).toBe(0);
  });

  it('maps 10 to 1', () => {
    expect(knobToNormalized(10)).toBe(1);
  });

  it('maps 5 to 0.5', () => {
    expect(knobToNormalized(5)).toBe(0.5);
  });
});

describe('bipolarKnobToNormalized', () => {
  it('maps 0 to 0', () => {
    expect(bipolarKnobToNormalized(0)).toBe(0);
  });

  it('maps 5 to 1', () => {
    expect(bipolarKnobToNormalized(5)).toBe(1);
  });

  it('maps -5 to -1', () => {
    expect(bipolarKnobToNormalized(-5)).toBe(-1);
  });
});

describe('envTimeKnobToMs', () => {
  it('maps 0 to 1ms', () => {
    expect(envTimeKnobToMs(0)).toBe(1);
  });

  it('maps 10 to 10000ms', () => {
    expect(envTimeKnobToMs(10)).toBeCloseTo(10000);
  });

  it('increases monotonically', () => {
    let prev = 0;
    for (let i = 0; i <= 10; i++) {
      const val = envTimeKnobToMs(i);
      expect(val).toBeGreaterThan(prev);
      prev = val;
    }
  });
});

describe('detuneFrequency', () => {
  it('0 semitones returns same frequency', () => {
    expect(detuneFrequency(440, 0)).toBe(440);
  });

  it('12 semitones doubles frequency', () => {
    expect(detuneFrequency(440, 12)).toBeCloseTo(880);
  });

  it('-12 semitones halves frequency', () => {
    expect(detuneFrequency(440, -12)).toBeCloseTo(220);
  });
});

describe('footToOctaveMultiplier', () => {
  it('8 foot = 1x (reference)', () => {
    expect(footToOctaveMultiplier(8)).toBe(1);
  });

  it('16 foot = 0.5x (one octave down)', () => {
    expect(footToOctaveMultiplier(16)).toBe(0.5);
  });

  it('4 foot = 2x (one octave up)', () => {
    expect(footToOctaveMultiplier(4)).toBe(2);
  });

  it('32 foot = 0.25x (two octaves down)', () => {
    expect(footToOctaveMultiplier(32)).toBe(0.25);
  });

  it('2 foot = 4x (two octaves up)', () => {
    expect(footToOctaveMultiplier(2)).toBe(4);
  });
});
