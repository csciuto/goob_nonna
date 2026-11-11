/**
 * Following MIDI clock. A sending device ticks 24 times per quarter note; while it does, the
 * arpeggiator and sequencer step on those ticks and the RATE knob picks the note value instead of
 * a tempo.
 */

/** Ticks per step across the RATE knob's travel: half notes at the bottom to 32nd notes at the top. */
export const MIDI_DIVISIONS = [48, 24, 16, 12, 8, 6, 4, 3];

/** RATE knob (0 to 10) to ticks per step. */
export function ticksPerStep(rateKnob) {
  const i = Math.round(Math.max(0, Math.min(10, rateKnob)) / 10 * (MIDI_DIVISIONS.length - 1));
  return MIDI_DIVISIONS[i];
}

export class MidiClockFollower {
  constructor() { this.count = 0; }

  /** MIDI Start: the next tick is a step. */
  start() { this.count = 0; }

  /** One MIDI clock tick. @returns true when a step is due */
  tick(perStep) {
    const due = this.count % perStep === 0;
    this.count = (this.count + 1) % 96;      // every division divides 96, so the count can wrap there
    return due;
  }
}
