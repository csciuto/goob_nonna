import { FILTER_FREQ_MIN, FILTER_FREQ_MAX, KB_TRACK } from '../../utils/constants.js';
import { mapToLogRange } from '../../utils/math.js';
import { OCTAVES_PER_UNIT } from './oscillator.js';

/** Octaves the cutoff moves for a full envelope with ENVELOPE AMT at either end. Model value. */
export const ENV_AMT_OCTAVES = 8;
/** ENV AMT IN is summed with the knob; +8 V (1.6 units) equals the knob's full travel. */
const ENV_AMT_IN_GAIN = 1 / 1.6;
const SMOOTH = 0.012;

/**
 * Low-pass ladder filter: the `gn-ladder` worklet plus its jacks.
 * Everything that moves the cutoff is summed, in octaves, on the worklet's `cv` parameter:
 * the envelope through ENVELOPE AMT, keyboard tracking, modulation and the CUTOFF IN jack.
 */
export class FilterModule {
  constructor(audioContext) {
    this.ctx = audioContext;
    this._cutoffNormalized = 0.7;
    this._kbTrack = KB_TRACK.FULL;

    this.node = new AudioWorkletNode(this.ctx, 'gn-ladder', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    this.cv = this.node.parameters.get('cv');

    this.input = this.ctx.createGain();
    this.output = this.ctx.createGain();
    this.input.connect(this.node);
    this.node.connect(this.output);

    // CUTOFF IN: summed with everything else, 1 V per octave
    this.cutoffInput = this.ctx.createGain();
    this.cutoffInput.gain.value = OCTAVES_PER_UNIT;
    this.cutoffInput.connect(this.cv);

    // Envelope -> ENVELOPE AMT -> cutoff. The engine connects the envelope (0 to 1) to envInput.
    this.envInput = this.ctx.createGain();
    this.envInput.gain.value = ENV_AMT_OCTAVES;
    this.envAmount = this.ctx.createGain();
    this.envAmount.gain.value = 0;
    this.envInput.connect(this.envAmount);
    this.envAmount.connect(this.cv);

    // ENV AMT IN: a control signal summed with the ENVELOPE AMT knob
    this.envAmtInput = this.ctx.createGain();
    this.envAmtInput.gain.value = ENV_AMT_IN_GAIN;
    this.envAmtInput.connect(this.envAmount.gain);

    // Keyboard tracking. The engine connects the keyboard's pitch (octaves from C4) to kbInput.
    this.kbInput = this.ctx.createGain();
    this.kbInput.gain.value = this._kbTrack;
    this.kbInput.connect(this.cv);

    this._updateCutoff(true);
  }

  setCutoff(normalized) { this._cutoffNormalized = normalized; this._updateCutoff(); }

  /** Which ladder model runs: LADDER.CLASSIC (one saturation) or LADDER.TRANSISTOR (four, oversampled). */
  setModel(model) { this.node.parameters.get('model').setValueAtTime(model, this.ctx.currentTime); this._model = model; }
  getModel() { return this._model || 0; }

  /** Knob value, 0 to 4. The top of the knob self-oscillates. */
  setResonance(value) {
    this.node.parameters.get('res').setTargetAtTime(value, this.ctx.currentTime, SMOOTH);
  }

  setKbTrack(mode) {
    this._kbTrack = mode;
    this.kbInput.gain.setTargetAtTime(mode, this.ctx.currentTime, SMOOTH);
  }

  /** ENVELOPE AMT, -1 to +1. */
  setEnvAmount(bipolarValue) {
    this.envAmount.gain.setTargetAtTime(bipolarValue, this.ctx.currentTime, SMOOTH);
  }

  _updateCutoff(now = false) {
    const hz = mapToLogRange(this._cutoffNormalized, FILTER_FREQ_MIN, FILTER_FREQ_MAX);
    const p = this.node.parameters.get('cutoff');
    if (now) p.value = hz; else p.setTargetAtTime(hz, this.ctx.currentTime, SMOOTH);
  }

  getCutoffFrequency() {
    return mapToLogRange(this._cutoffNormalized, FILTER_FREQ_MIN, FILTER_FREQ_MAX);
  }

  destroy() {
    for (const n of [this.node, this.input, this.output, this.cutoffInput, this.envInput, this.envAmount, this.envAmtInput, this.kbInput]) n.disconnect();
  }
}
