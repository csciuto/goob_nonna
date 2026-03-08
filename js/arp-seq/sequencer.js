/**
 * Step Sequencer - records and plays back note sequences.
 * Supports up to 256 steps, 3 sequence slots.
 * Each step: { note, tie, rest, accent }
 */
export class Sequencer {
  constructor() {
    this._slots = [[], [], []]; // 3 sequence slots
    this._currentSlot = 0;
    this._stepIndex = 0;
    this._recording = false;
    this._playing = false;
    this._transpose = 0; // semitones offset for live transposition
  }

  /**
   * Get current sequence.
   */
  get sequence() {
    return this._slots[this._currentSlot];
  }

  setSlot(index) {
    this._currentSlot = Math.max(0, Math.min(2, index));
    this._stepIndex = 0;
  }

  startRecording() {
    this._recording = true;
    this._slots[this._currentSlot] = [];
  }

  stopRecording() {
    this._recording = false;
  }

  isRecording() {
    return this._recording;
  }

  /**
   * Record a step.
   */
  recordStep(midiNote, { tie = false, rest = false, accent = false } = {}) {
    if (!this._recording) return;
    if (this.sequence.length >= 256) return;

    this.sequence.push({ note: midiNote, tie, rest, accent });
  }

  /**
   * Transpose the sequence relative to its first note.
   * Called when a key is pressed during SEQ playback.
   */
  setTranspose(midiNote) {
    const firstNote = this._getBaseNote();
    if (firstNote !== null) {
      this._transpose = midiNote - firstNote;
    }
  }

  clearTranspose() {
    this._transpose = 0;
  }

  _getBaseNote() {
    const seq = this.sequence;
    for (const step of seq) {
      if (!step.rest) return step.note;
    }
    return null;
  }

  /**
   * Get the next step in the sequence.
   * Returns step object or null if empty.
   */
  nextStep() {
    if (this.sequence.length === 0) return null;

    const step = this.sequence[this._stepIndex];
    this._stepIndex = (this._stepIndex + 1) % this.sequence.length;
    // Apply transposition
    if (step.rest) return step;
    return { ...step, note: step.note + this._transpose };
  }

  /**
   * Get current step index.
   */
  getCurrentStep() {
    return this._stepIndex;
  }

  /**
   * Get total steps in current sequence.
   */
  getLength() {
    return this.sequence.length;
  }

  reset() {
    this._stepIndex = 0;
  }

  clear() {
    this._slots[this._currentSlot] = [];
    this._stepIndex = 0;
  }

  hasSteps() {
    return this.sequence.length > 0;
  }
}
