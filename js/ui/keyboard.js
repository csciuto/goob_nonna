import { KEYBOARD_START_NOTE, KEYBOARD_END_NOTE, NOTE_NAMES } from '../utils/constants.js';

/**
 * 32-note visual keyboard (F2 to C5).
 * Mouse click to play notes.
 */
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
    this._mouseDown = false;
    this._keys = new Map(); // midiNote → element

    this.element = this._create();
  }

  _isBlackKey(midiNote) {
    const n = midiNote % 12;
    return [1, 3, 6, 8, 10].includes(n);
  }

  _getNoteName(midiNote) {
    const name = NOTE_NAMES[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${name}${octave}`;
  }

  _create() {
    const container = document.createElement('div');
    container.className = 'keyboard';

    // Prevent context menu
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Create keys
    for (let note = KEYBOARD_START_NOTE; note <= KEYBOARD_END_NOTE; note++) {
      const isBlack = this._isBlackKey(note);
      const key = document.createElement('div');
      key.className = `key ${isBlack ? 'black-key' : 'white-key'}`;
      key.dataset.note = note;

      // Note name on white keys
      if (!isBlack) {
        const label = document.createElement('span');
        label.className = 'key-label';
        label.textContent = this._getNoteName(note);
        key.appendChild(label);
      }

      this._keys.set(note, key);
      container.appendChild(key);
    }

    // Mouse interaction
    container.addEventListener('mousedown', (e) => {
      this._mouseDown = true;
      const note = this._getNoteFromEvent(e);
      if (note !== null) this._pressKey(note);
      e.preventDefault();
    });

    container.addEventListener('mousemove', (e) => {
      if (!this._mouseDown) return;
      const note = this._getNoteFromEvent(e);
      if (note !== null && note !== this._activeNote) {
        if (this._activeNote !== null) this._releaseKey(this._activeNote);
        this._pressKey(note);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this._mouseDown) {
        this._mouseDown = false;
        if (this._activeNote !== null) {
          this._releaseKey(this._activeNote);
        }
      }
    });

    return container;
  }

  _getNoteFromEvent(e) {
    const target = e.target.closest('.key');
    if (!target) return null;
    return parseInt(target.dataset.note, 10);
  }

  _pressKey(midiNote) {
    this._activeNote = midiNote;
    const keyEl = this._keys.get(midiNote);
    if (keyEl) keyEl.classList.add('active');
    if (this.onNoteOn) this.onNoteOn(midiNote, 1.0);
  }

  _releaseKey(midiNote) {
    const keyEl = this._keys.get(midiNote);
    if (keyEl) keyEl.classList.remove('active');
    if (this.onNoteOff) this.onNoteOff(midiNote);
    if (this._activeNote === midiNote) this._activeNote = null;
  }

  getElement() {
    return this.element;
  }
}
