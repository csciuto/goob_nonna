import { WAVEFORMS } from '../../utils/constants.js';

const SHAPES = { [WAVEFORMS.TRIANGLE]: 0, [WAVEFORMS.SAW]: 1, [WAVEFORMS.SQUARE]: 2, [WAVEFORMS.NARROW_PULSE]: 3 };
const FOOT_OCTAVES = { 32: -2, 16: -1, 8: 0, 4: 1, 2: 2 };

/** One volt per octave: a full-scale signal (5 V) at a pitch input is five octaves. */
export const OCTAVES_PER_UNIT = 5;
/** PWM IN takes 0 to +5 V; full scale moves the pulse width by 45% of the cycle. Model value. */
export const PW_PER_UNIT = 0.45;
/** LIN FM IN: Hz of deviation for a full-scale signal. Model value. */
export const LIN_FM_HZ_PER_UNIT = 2000;
const SMOOTH = 0.008;

/**
 * Oscillator module (OSC 1 or OSC 2): the `gn-osc` worklet plus its jacks.
 * Pitch arrives as signals summed on the worklet's `pitch` parameter, in octaves above C4: the
 * keyboard (wired in by the engine), the pitch wheel, modulation, and the PITCH IN jack.
 */
export class OscillatorModule {
  constructor(audioContext, id = 'osc1', { driftCents = 0, seed = 1 } = {}) {
    this.ctx = audioContext;
    this.id = id;
    this._waveform = WAVEFORMS.SAW;
    this._octaveFoot = 8;
    this._detuneSemitones = 0;

    this.node = new AudioWorkletNode(this.ctx, 'gn-osc', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
      processorOptions: { driftCents, seed },
    });
    this.pitch = this.node.parameters.get('pitch');
    this.pw = this.node.parameters.get('pw');

    this.output = this.ctx.createGain();
    this.node.connect(this.output);

    // PITCH IN: summed with the keyboard's pitch, 1 V per octave
    this.pitchInput = this.ctx.createGain();
    this.pitchInput.gain.value = OCTAVES_PER_UNIT;
    this.pitchInput.connect(this.pitch);

    // PWM IN
    this.pwmInput = this.ctx.createGain();
    this.pwmInput.gain.value = PW_PER_UNIT;
    this.pwmInput.connect(this.pw);

    // LIN FM IN (the panel has this jack on oscillator 2)
    this.linFmInput = this.ctx.createGain();
    this.linFmInput.gain.value = LIN_FM_HZ_PER_UNIT;
    this.linFmInput.connect(this.node.parameters.get('linFm'));

    // Sync source: the engine feeds oscillator 1's wave here; the SYNC button enables it
    this.syncInput = this.ctx.createGain();
    this.syncInput.connect(this.node, 0, 0);
  }

  setWaveform(waveform) {
    this._waveform = waveform;
    this.node.parameters.get('shape').setValueAtTime(SHAPES[waveform] ?? 1, this.ctx.currentTime);
  }

  setOctave(foot) { this._octaveFoot = foot; this._updateTune(); }
  setDetune(semitones) { this._detuneSemitones = semitones; this._updateTune(); }
  setSync(enabled) { this.node.parameters.get('sync').setValueAtTime(enabled ? 1 : 0, this.ctx.currentTime); }

  /** Pitch wheel, in semitones. */
  setPitchBend(semitones) {
    this.pitch.setTargetAtTime(semitones / 12, this.ctx.currentTime, SMOOTH);
  }

  _updateTune() {
    const octaves = (FOOT_OCTAVES[this._octaveFoot] ?? 0) + this._detuneSemitones / 12;
    this.node.parameters.get('tune').setTargetAtTime(octaves, this.ctx.currentTime, SMOOTH);
  }

  destroy() {
    for (const n of [this.node, this.output, this.pitchInput, this.pwmInput, this.linFmInput, this.syncInput]) n.disconnect();
  }
}
