import { Arpeggiator } from './arpeggiator.js';
import { Sequencer } from './sequencer.js';
import { Clock } from './clock.js';

/**
 * ArpSeqController — coordinates the arpeggiator, sequencer, clock,
 * and the three dual-function buttons (PLAY/HOLD/TAP).
 *
 * Button functions depend on the MODE switch:
 *   ARP mode:  PLAY = start/stop arp, HOLD = latch notes, TAP = tap tempo
 *   SEQ mode:  PLAY = start/stop seq, HOLD = (unused),    TAP = tap tempo
 *   REC mode:  PLAY = TIE (extend),   HOLD = REST,        TAP = ACCENT
 *
 * Above-labels (< KB, SHIFT, KB >) are keyboard octave shift — always active.
 */
export class ArpSeqController {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.arp = new Arpeggiator();
    this.seq = new Sequencer();
    this.clock = new Clock(audioContext);

    this._mode = 'arp'; // 'arp' | 'seq' | 'rec'
    this._playing = false;
    this._holding = false;
    this._octSeqValue = 1;
    this._tieNext = false;
    this._restNext = false;
    this._accentNext = false;

    // Callbacks set by wiring
    this.onNoteOn = null;  // (midiNote, velocity) => {}
    this.onNoteOff = null; // (midiNote) => {}
    this.onStep = null;    // () => {} — for LED blink
    this.onOctaveShift = null; // (direction) => {} — -1 or +1
    this.onTapTempoChange = null; // (active) => {} — TAP LED

    this._lastNote = null;
  }

  setMode(mode) {
    const wasPlaying = this._playing;
    if (wasPlaying) this.stop();
    this._mode = mode;
    if (mode === 'rec') {
      this.seq.startRecording();
    } else {
      this.seq.stopRecording();
    }
    // Re-apply OCT/SEQ value for new mode context
    this.setOctSeq(this._octSeqValue);
  }

  setDirection(direction) {
    this.arp.setMode(direction);
  }

  /** OCT/SEQ switch — sets arp octave range OR seq slot depending on mode */
  setOctSeq(value) {
    this._octSeqValue = value;
    if (this._mode === 'arp') {
      this.arp.setOctaveRange(value);
    } else {
      this.seq.setSlot(value - 1); // UI is 1-indexed
    }
  }

  setRate(knobValue) {
    this.clock.setRate(knobValue);
  }

  // --- Note input from keyboard ---

  noteOn(midiNote, velocity) {
    if (this._mode === 'arp') {
      this.arp.addNote(midiNote);
    }
    if (this._mode === 'seq' && this._playing) {
      // Live transposition: pressed note transposes sequence relative to first note
      this.seq.setTranspose(midiNote);
    }
    if (this._mode === 'rec' && this.seq.isRecording()) {
      this.seq.recordStep(midiNote, {
        tie: this._tieNext,
        rest: this._restNext,
        accent: this._accentNext,
      });
      this._tieNext = false;
      this._restNext = false;
      this._accentNext = false;
    }
  }

  noteOff(midiNote) {
    if (this._mode === 'arp') {
      this.arp.removeNote(midiNote);
    }
  }

  // --- Button actions ---

  /** PLAY button pressed */
  pressPlay() {
    if (this._mode === 'rec') {
      // TIE function
      this._tieNext = true;
      return;
    }
    // Toggle play/stop
    if (this._playing) {
      this.stop();
    } else {
      this.start();
    }
  }

  isPlaying() {
    return this._playing;
  }

  /** HOLD button pressed */
  pressHold() {
    if (this._mode === 'rec') {
      // REST function
      this._restNext = true;
      if (this.seq.isRecording()) {
        this.seq.recordStep(0, { rest: true });
      }
      return;
    }
    // Toggle hold
    this._holding = !this._holding;
    this.arp.setHold(this._holding);
    return this._holding;
  }

  isHolding() {
    return this._holding;
  }

  /** TAP button pressed */
  pressTap() {
    if (this._mode === 'rec') {
      // ACCENT function
      this._accentNext = true;
      return;
    }
    // Tap tempo
    this._tapPressTime = performance.now();
    const wasTapActive = this.clock.isTapOverride();
    this.clock.tap();
    if (!wasTapActive && this.clock.isTapOverride()) {
      if (this.onTapTempoChange) this.onTapTempoChange(true);
    }
  }

  isTapTempoActive() {
    return this.clock.isTapOverride();
  }

  /** TAP button released — hold for 1s to exit tap tempo */
  releaseTap() {
    if (this._tapPressTime && performance.now() - this._tapPressTime > 1000) {
      this.clock.clearTapOverride();
      if (this.onTapTempoChange) this.onTapTempoChange(false);
    }
    this._tapPressTime = null;
  }

  /** Keyboard shift left (< KB) */
  shiftKeyboardDown() {
    if (this.onOctaveShift) this.onOctaveShift(-1);
  }

  /** Keyboard shift right (KB >) */
  shiftKeyboardUp() {
    if (this.onOctaveShift) this.onOctaveShift(1);
  }

  // --- Internal ---

  start() {
    this._playing = true;
    this.arp.reset();
    this.seq.reset();
    this.seq.clearTranspose();

    this.clock.start((step, time) => {
      this._onClockStep(step, time);
    });
  }

  stop() {
    this._playing = false;
    this.clock.stop();
    if (this._lastNote !== null) {
      if (this.onNoteOff) this.onNoteOff(this._lastNote);
      this._lastNote = null;
    }
  }

  _onClockStep(step, time) {
    if (this.onStep) this.onStep();

    // Release previous note
    if (this._lastNote !== null) {
      if (this.onNoteOff) this.onNoteOff(this._lastNote);
      this._lastNote = null;
    }

    if (this._mode === 'arp') {
      const note = this.arp.nextNote();
      if (note !== null) {
        this._lastNote = note;
        if (this.onNoteOn) this.onNoteOn(note, 1.0);
      }
    } else if (this._mode === 'seq') {
      const stepData = this.seq.nextStep();
      if (stepData && !stepData.rest) {
        const vel = stepData.accent ? 1.0 : 0.8;
        this._lastNote = stepData.note;
        if (this.onNoteOn) this.onNoteOn(stepData.note, vel);
      }
    }

  }

  destroy() {
    this.stop();
    this.clock.destroy();
  }
}
