/**
 * Convert MIDI note number to frequency in Hz.
 * A4 = MIDI 69 = 440Hz
 */
export function midiToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Convert frequency in Hz to MIDI note number.
 */
export function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

/**
 * Convert a 1V/oct voltage to frequency ratio.
 * 0V = 1x, 1V = 2x, -1V = 0.5x
 */
export function voltageToFrequencyRatio(voltage) {
  return Math.pow(2, voltage);
}

/**
 * Linear interpolation between a and b by t (0-1).
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Map a normalized value (0-1) to a logarithmic range.
 * Useful for frequency knobs, time knobs.
 */
export function mapToLogRange(normalized, min, max) {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return Math.exp(minLog + normalized * (maxLog - minLog));
}

/**
 * Map a value from logarithmic range back to normalized (0-1).
 */
export function mapFromLogRange(value, min, max) {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return (Math.log(value) - minLog) / (maxLog - minLog);
}

/**
 * Convert knob position (0-10) to normalized (0-1).
 */
export function knobToNormalized(knobValue) {
  return knobValue / 10;
}

/**
 * Convert a bipolar knob (-5 to +5) to normalized (-1 to +1).
 */
export function bipolarKnobToNormalized(knobValue) {
  return knobValue / 5;
}

/**
 * Convert envelope time knob (0-10) to milliseconds.
 * Range: 1ms to 10000ms (10s), logarithmic.
 */
export function envTimeKnobToMs(knobValue) {
  if (knobValue === 0) return 1;
  return mapToLogRange(knobValue / 10, 1, 10000);
}

/**
 * Convert envelope time in ms to seconds for Web Audio.
 */
export function msToSeconds(ms) {
  return ms / 1000;
}

/**
 * Calculate detuned frequency.
 * semitones can be fractional.
 */
export function detuneFrequency(baseFreq, semitones) {
  return baseFreq * Math.pow(2, semitones / 12);
}

/**
 * Octave multiplier from foot setting.
 * 32' = lowest, 2' = highest
 */
export function footToOctaveMultiplier(foot) {
  const map = { 32: 0.25, 16: 0.5, 8: 1, 4: 2, 2: 4 };
  return map[foot] || 1;
}
