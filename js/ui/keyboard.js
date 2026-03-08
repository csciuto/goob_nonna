import { KEYBOARD_START_NOTE, KEYBOARD_END_NOTE, NOTE_NAMES } from '../utils/constants.js';

/**
 * 32-note visual keyboard (F2 to C5).
 * Monophonic with last-note priority (like the Grandmother).
 * Supports mouse and QWERTY input. Two rows:
 *   Bottom: Z S X D C V G B H N J M , L . ;
 *   Top:    Q 2 W 3 E R 5 T 6 Y 7 U I 9 O 0 P
 * Octave shift: - / = keys. Tab toggles labels between shortcuts and note names.
 */

// QWERTY key → semitone offset from base octave
const LOWER_ROW = {
  'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4,
  'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9,
  'j': 10, 'm': 11, ',': 12, 'l': 13, '.': 14,
  ';': 15,
};
// Upper row: one octave above lower row
const UPPER_ROW = {
  'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16,
  'r': 17, '5': 18, 't': 19, '6': 20, 'y': 21,
  '7': 22, 'u': 23, 'i': 24, '9': 25, 'o': 26,
  '0': 27, 'p': 28,
};

// Build reverse map: offset → display key (prefer lower row, show uppercase)
function buildOffsetToLabel() {
  const map = {};
  for (const [key, offset] of Object.entries(LOWER_ROW)) {
    if (!(offset in map)) map[offset] = key.toUpperCase();
  }
  for (const [key, offset] of Object.entries(UPPER_ROW)) {
    if (!(offset in map)) map[offset] = key.toUpperCase();
  }
  return map;
}
const OFFSET_TO_LABEL = buildOffsetToLabel();

export class Keyboard {
  /**
   * @param {object} options
   * @param {function} options.onNoteOn - Callback(midiNote, velocity)
   * @param {function} options.onNoteOff - Callback(midiNote)
   */
  constructor({ onNoteOn = null, onNoteOff = null } = {}) {
    this.onNoteOn = onNoteOn;
    this.onNoteOff = onNoteOff;
    this._activeNote = null;
    this._noteSource = null; // 'mouse' | 'kb'
    this._mouseDown = false;
    this._keys = new Map(); // visualNote (41-72) → element
    this._labels = new Map(); // visualNote (41-72) → label element
    this._heldKeys = new Set(); // currently held QWERTY keys
    this._heldMidiNotes = new Set(); // all currently held MIDI notes (for polyphonic arp)
    this._baseOctave = 48; // C3 — default QWERTY base (fixed, never changes)
    this._noteOffset = 0; // semitone offset applied to all output notes
    this._labelMode = 'key'; // 'none' | 'key' | 'note'

    this.element = this._create();
    this._bindQwerty();
    this._updateLabels();
  }

  _isBlackKey(midiNote) {
    const n = midiNote % 12;
    return [1, 3, 6, 8, 10].includes(n);
  }

  _getNoteName(visualNote) {
    const midiNote = visualNote + this._noteOffset;
    const name = NOTE_NAMES[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${name}${octave}`;
  }

  _getShortcutLabel(visualNote) {
    const offset = visualNote - this._baseOctave;
    return OFFSET_TO_LABEL[offset] || '';
  }

  _create() {
    const container = document.createElement('div');
    container.className = 'keyboard';

    container.addEventListener('contextmenu', (e) => e.preventDefault());

    for (let note = KEYBOARD_START_NOTE; note <= KEYBOARD_END_NOTE; note++) {
      const isBlack = this._isBlackKey(note);
      const key = document.createElement('div');
      key.className = `key ${isBlack ? 'black-key' : 'white-key'}`;
      key.dataset.note = note;

      const label = document.createElement('span');
      label.className = 'key-label';
      key.appendChild(label);
      this._labels.set(note, label);

      this._keys.set(note, key);
      container.appendChild(key);
    }

    // Mouse interaction
    container.addEventListener('mousedown', (e) => {
      this._mouseDown = true;
      const visualNote = this._getNoteFromEvent(e);
      if (visualNote !== null) this._pressNote(visualNote + this._noteOffset, 'mouse');
      e.preventDefault();
    });

    container.addEventListener('mousemove', (e) => {
      if (!this._mouseDown) return;
      const visualNote = this._getNoteFromEvent(e);
      if (visualNote !== null) {
        const midiNote = visualNote + this._noteOffset;
        if (midiNote !== this._activeNote) {
          this._releaseNote();
          this._pressNote(midiNote, 'mouse');
        }
      }
    });

    document.addEventListener('mouseup', () => {
      if (this._mouseDown) {
        this._mouseDown = false;
        if (this._noteSource === 'mouse') this._releaseNote();
      }
    });

    return container;
  }

  setLabelMode(mode) {
    this._labelMode = mode;
    this._updateLabels();
  }

  /**
   * Shift all output notes by the given number of semitones.
   * Updates labels to reflect the new pitch range.
   * @param {number} offset - semitones (multiple of 12 for octave shift)
   */
  setNoteOffset(offset) {
    this._noteOffset = offset;
    this._updateLabels();
  }

  getNoteOffset() {
    return this._noteOffset;
  }

  _updateLabels() {
    for (let note = KEYBOARD_START_NOTE; note <= KEYBOARD_END_NOTE; note++) {
      const label = this._labels.get(note);
      if (!label) continue;
      if (this._labelMode === 'none') {
        label.textContent = '';
      } else if (this._labelMode === 'note') {
        label.textContent = this._getNoteName(note);
      } else {
        label.textContent = this._getShortcutLabel(note);
      }
    }
  }

  _bindQwerty() {
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();

      const offset = LOWER_ROW[key] ?? UPPER_ROW[key] ?? null;
      if (offset === null) return;

      const midiNote = this._baseOctave + offset + this._noteOffset;
      if (midiNote < 0 || midiNote > 127) return;

      this._heldKeys.add(key);
      this._pressNote(midiNote, 'kb');
    });

    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (!this._heldKeys.has(key)) return;
      this._heldKeys.delete(key);

      const offset = LOWER_ROW[key] ?? UPPER_ROW[key] ?? null;
      if (offset === null) return;

      const midiNote = this._baseOctave + offset + this._noteOffset;

      // Always send noteOff for released keys (polyphonic tracking for arp)
      if (this._heldMidiNotes.has(midiNote)) {
        this._heldMidiNotes.delete(midiNote);
        if (this.onNoteOff) this.onNoteOff(midiNote);
      }

      // Update visual active key
      if (midiNote === this._activeNote && this._noteSource === 'kb') {
        const visualNote = midiNote - this._noteOffset;
        const keyEl = this._keys.get(visualNote);
        if (keyEl) keyEl.classList.remove('active');
        const fallback = this._getFallbackNote();
        if (fallback !== null) {
          this._activeNote = fallback;
          const fallbackVisual = fallback - this._noteOffset;
          const fallbackEl = this._keys.get(fallbackVisual);
          if (fallbackEl) fallbackEl.classList.add('active');
        } else {
          this._activeNote = null;
          this._noteSource = null;
        }
      }
    });
  }

  _getFallbackNote() {
    let last = null;
    for (const key of this._heldKeys) {
      const offset = LOWER_ROW[key] ?? UPPER_ROW[key] ?? null;
      if (offset === null) continue;
      const note = this._baseOctave + offset + this._noteOffset;
      if (note >= 0 && note <= 127) {
        last = note;
      }
    }
    return last;
  }

  _getNoteFromEvent(e) {
    const target = e.target.closest('.key');
    if (!target) return null;
    return parseInt(target.dataset.note, 10);
  }

  _pressNote(midiNote, source) {
    if (this._activeNote !== null && this._activeNote !== midiNote) {
      const prevVisual = this._activeNote - this._noteOffset;
      const prevEl = this._keys.get(prevVisual);
      if (prevEl) prevEl.classList.remove('active');
      // For mouse input, release previous note (monophonic drag).
      // For QWERTY, DON'T release — the key is still physically held.
      // This lets the arpeggiator accumulate multiple held notes.
      if (source === 'mouse') {
        if (this.onNoteOff) this.onNoteOff(this._activeNote);
        this._heldMidiNotes.delete(this._activeNote);
      }
    }
    this._activeNote = midiNote;
    this._noteSource = source;
    this._heldMidiNotes.add(midiNote);
    const visualNote = midiNote - this._noteOffset;
    const keyEl = this._keys.get(visualNote);
    if (keyEl) keyEl.classList.add('active');
    if (this.onNoteOn) this.onNoteOn(midiNote, 1.0);
  }

  _releaseNote() {
    if (this._activeNote === null) return;
    const visualNote = this._activeNote - this._noteOffset;
    const keyEl = this._keys.get(visualNote);
    if (keyEl) keyEl.classList.remove('active');
    this._heldMidiNotes.delete(this._activeNote);
    if (this.onNoteOff) this.onNoteOff(this._activeNote);
    this._activeNote = null;
    this._noteSource = null;
  }

  getElement() {
    return this.element;
  }
}
