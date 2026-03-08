import { ARP_MODES } from '../utils/constants.js';

/**
 * Arpeggiator - cycles through held notes in various patterns.
 */
export class Arpeggiator {
  constructor() {
    this._mode = ARP_MODES.ORDER;
    this._octaveRange = 1;
    this._heldNotes = [];
    this._pattern = [];
    this._stepIndex = 0;
    this._direction = 1; // 1 = forward, -1 = backward
    this._hold = false;
    this._lockedNotes = [];
  }

  setMode(mode) {
    this._mode = mode;
    this._rebuildPattern();
  }

  setOctaveRange(range) {
    this._octaveRange = range;
    this._rebuildPattern();
  }

  setHold(hold) {
    this._hold = hold;
    if (hold && this._heldNotes.length > 0) {
      this._lockedNotes = [...this._heldNotes];
    }
  }

  addNote(midiNote) {
    if (!this._heldNotes.includes(midiNote)) {
      this._heldNotes.push(midiNote);
      if (!this._hold) {
        this._rebuildPattern();
      } else {
        // In hold mode, add to locked notes too
        if (!this._lockedNotes.includes(midiNote)) {
          this._lockedNotes.push(midiNote);
          this._rebuildPattern();
        }
      }
    }
  }

  removeNote(midiNote) {
    this._heldNotes = this._heldNotes.filter(n => n !== midiNote);
    if (!this._hold) {
      this._rebuildPattern();
    }
  }

  /**
   * Get the next note in the arpeggio pattern.
   * Returns MIDI note number or null if no notes.
   */
  nextNote() {
    if (this._pattern.length === 0) return null;

    const note = this._pattern[this._stepIndex];

    // Advance step
    if (this._mode === ARP_MODES.FORWARD_BACKWARD) {
      this._stepIndex += this._direction;
      if (this._stepIndex >= this._pattern.length) {
        this._direction = -1;
        this._stepIndex = Math.max(0, this._pattern.length - 2);
      } else if (this._stepIndex < 0) {
        this._direction = 1;
        this._stepIndex = Math.min(1, this._pattern.length - 1);
      }
    } else {
      this._stepIndex = (this._stepIndex + 1) % this._pattern.length;
    }

    return note;
  }

  hasNotes() {
    return this._pattern.length > 0;
  }

  reset() {
    this._stepIndex = 0;
    this._direction = 1;
  }

  _rebuildPattern() {
    const notes = this._hold ? [...this._lockedNotes] : [...this._heldNotes];

    if (notes.length === 0) {
      this._pattern = [];
      this._stepIndex = 0;
      return;
    }

    // Sort for forward/backward modes
    const sorted = [...notes].sort((a, b) => a - b);

    // Build base pattern based on mode
    let basePattern;
    switch (this._mode) {
      case ARP_MODES.ORDER:
        basePattern = [...notes]; // As played
        break;
      case ARP_MODES.FORWARD:
        basePattern = sorted;
        break;
      case ARP_MODES.BACKWARD:
        basePattern = [...sorted].reverse();
        break;
      case ARP_MODES.FORWARD_BACKWARD:
        basePattern = sorted; // Direction handled in nextNote
        break;
      case ARP_MODES.RANDOM:
        basePattern = sorted; // Randomization in nextNote
        break;
      default:
        basePattern = sorted;
    }

    // Expand across octave range
    this._pattern = [];
    for (let oct = 0; oct < this._octaveRange; oct++) {
      for (const note of basePattern) {
        this._pattern.push(note + oct * 12);
      }
    }

    // For random mode, shuffle
    if (this._mode === ARP_MODES.RANDOM) {
      this._shufflePattern();
    }

    // Reset step if out of bounds
    if (this._stepIndex >= this._pattern.length) {
      this._stepIndex = 0;
    }
  }

  _shufflePattern() {
    for (let i = this._pattern.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._pattern[i], this._pattern[j]] = [this._pattern[j], this._pattern[i]];
    }
  }
}
